// utils/sharedLieuCarrier.ts
// =================================================================
// LIGNE PORTEUSE DU MOBILIER d'un lieu desservi par plusieurs lignes.
// -----------------------------------------------------------------
// Un lieu partagé (même lieuName au registre) regroupe les modules de
// chaque ligne. Quand ces lignes partagent UNE SEULE station physique,
// son mobilier (Plans de quartier, pictogrammes cognitifs…) n'est
// inventorié qu'une fois, sur la ligne porteuse — jamais une fois par
// ligne. Les autres lieux multi-lignes (Arènes A/T1, Palais de Justice
// B/T1, Université Paul-Sabatier B/Téléo, pôles futurs de la ligne C…)
// sont des stations physiquement distinctes : chaque ligne y garde son
// propre mobilier, sans ligne porteuse.
// Règle d'inventaire seulement : aucun calcul, aucun comptage de
// stations (« Total Stations ») ni périmètre d'audit n'en dépend.
// =================================================================
import { AuditModuleType, CognitivePictogramData, Lieu, PlanQuartierData } from '../types';

/** Lieu (lieuName du registre) → ligne qui porte son mobilier physique. */
export const SHARED_LIEU_CARRIER_LINES: Readonly<Record<string, string>> = {
    'Jean-Jaurès': 'A',
};

export const getCarrierLine = (lieuName: string): string | undefined => SHARED_LIEU_CARRIER_LINES[lieuName];

/** Modules d'inventaire physique soumis à la règle (DAT, ECA, PMR sol :
 *  équipements propres à chaque ligne, hors règle). */
const PHYSICAL_INVENTORY_TYPES: ReadonlySet<AuditModuleType> = new Set([
    AuditModuleType.PLAN_QUARTIER,
    AuditModuleType.COGNITIVE_PICTOGRAMS,
]);

const inventoryCount = (moduleType: AuditModuleType, data: unknown): number =>
    moduleType === AuditModuleType.PLAN_QUARTIER
        ? ((data as PlanQuartierData).occurrences ?? []).length
        : ((data as CognitivePictogramData).pictograms ?? []).length;

/** Mobilier renseigné hors de la ligne porteuse d'un lieu partagé. */
export const findCarrierLineViolations = (lieux: Lieu[]): { lieuName: string; line: string; moduleType: AuditModuleType; count: number }[] =>
    lieux.flatMap(lieu => {
        const carrier = getCarrierLine(lieu.name);
        if (!carrier) return [];
        return lieu.modules
            .filter(m => PHYSICAL_INVENTORY_TYPES.has(m.type) && m.line !== carrier)
            .map(m => ({ lieuName: lieu.name, line: m.line ?? '?', moduleType: m.type, count: inventoryCount(m.type, m.data) }))
            .filter(v => v.count > 0);
    });
