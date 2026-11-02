// utils/cockpit/stationPatrimoine.ts
// =================================================================
// PATRIMOINE COMPLET D'UNE STATION (Référentiel → Implantations → Ligne →
// Station) — restitution du relevé initial, consultation seule.
// -----------------------------------------------------------------
// Aucun calcul patrimonial nouveau : ce module FILTRE, pour une station
// (lieu + ligne), des résultats déjà produits par chaque référentiel
// autonome (règle 7 de patrimoineIndex.ts), sans jamais les fusionner :
//  - Signalétique IV (DAT, ECA, plans de quartier) : implantations du
//    moteur d'index, réparties par type de module d'origine ;
//  - P+R associé : implantations P+R du MÊME lieu (module rangé dans la
//    station), présentées à part et jamais comptées dans la ligne ;
//  - PMR au sol, pictogrammes cognitifs : éléments de pose existants ;
//    pictogrammes non comptés (emplacement à définir, ligne non comptée)
//    listés à part, identifiés comme tels ;
//  - équipements de station : éléments existants (actuels et futurs) ;
//  - bâches : recensement statique existant.
// Les résumés ne font que dénombrer ces listes, chaque famille dans sa
// propre unité (appareils ≠ références ≠ repères ≠ adhésifs).
// =================================================================
import { AuditModuleType, FloorAdhesiveStatus, Lieu } from '../../types';
import { ImplantationRef } from './patrimoineIndex';
import { PmrFloorPoseItem } from './pmrFloorPose';
import { CognitivePictogramPoseItem, collectCognitivePictograms } from './cognitivePictogramSummary';
import { StationEquipmentItem, StationEquipmentKind } from './stationEquipment';
import { BacheRow, getBachesForLieu } from './baches';

export interface StationKey { lieuId: string; line: string }

export type StationFamily = 'DAT' | 'ECA' | 'PDQ' | 'PMR' | 'COG' | 'SIG' | 'BACHE' | 'PR';

/** Ordre d'affichage des familles d'une station. */
export const STATION_FAMILIES: readonly StationFamily[] = ['DAT', 'ECA', 'PDQ', 'PMR', 'COG', 'SIG', 'BACHE', 'PR'];

export const STATION_FAMILY_LABELS: Record<StationFamily, string> = {
    DAT: 'DAT',
    ECA: 'ECA (valideurs)',
    PDQ: 'Plans de quartier',
    PMR: 'Adhésifs PMR au sol',
    COG: 'Pictogrammes cognitifs',
    SIG: 'Équipements de station',
    BACHE: 'Bâches',
    PR: 'P+R associé',
};

/** Pictogramme présent dans les données mais exclu des quantités. */
export interface UncountedCognitivePictogram {
    line: string;
    lieuName: string;
    stationCode: string;
    accessPointName: string;
    status?: FloorAdhesiveStatus;
    reason: 'provisional' | 'inactiveLine';
}

export interface StationPatrimoineSources {
    lieux: Lieu[];
    implantations: ImplantationRef[];
    pmrFloor: PmrFloorPoseItem[];
    cognitive: CognitivePictogramPoseItem[];
    stationEquipment: StationEquipmentItem[];
    futureStationEquipment: StationEquipmentItem[];
    /** Injectable pour les tests ; recensement statique par défaut. */
    bachesForLieu?: (lieuName: string) => BacheRow[];
}

export interface StationPatrimoine {
    lieuId: string;
    lieuName: string;
    line: string;
    /** Lignes de la station (lieu) desservies — repère multiligne. */
    otherLines: string[];
    dat: ImplantationRef[];
    eca: ImplantationRef[];
    pdq: ImplantationRef[];
    /** Rattaché au lieu, hors ligne : jamais compté dans la ligne. */
    prAssociated: ImplantationRef[];
    pmrFloor: PmrFloorPoseItem[];
    cognitive: CognitivePictogramPoseItem[];
    cognitiveUncounted: UncountedCognitivePictogram[];
    stationEquipment: StationEquipmentItem[];
    futureStationEquipment: StationEquipmentItem[];
    baches: BacheRow[];
}

const CATALOGUE_TYPES = new Map<AuditModuleType, 'dat' | 'eca' | 'pdq'>([
    [AuditModuleType.DAT, 'dat'],
    [AuditModuleType.ECA, 'eca'],
    [AuditModuleType.PLAN_QUARTIER, 'pdq'],
]);

/** Pictogrammes d'une station non comptés par la règle unique de
 *  comptage (parcours unique, même périmètre d'exploitation). */
const uncountedCognitive = (lieu: Lieu, line: string): UncountedCognitivePictogram[] =>
    collectCognitivePictograms([lieu], { lines: new Set([line]), includeUncounted: true })
        .filter(p => !p.counted)
        .map(p => ({
            line, lieuName: p.lieuName, stationCode: p.stationCode, accessPointName: p.accessPointName,
            status: p.status, reason: p.uncountedReason ?? 'provisional',
        }));

/** Lignes desservies par un lieu (modules de ligne, P+R exclu). */
export const linesOfLieu = (lieu: Lieu): string[] =>
    [...new Set(lieu.modules.flatMap(m => (m.line ? [m.line as string] : [])))];

export const buildStationPatrimoine = (sources: StationPatrimoineSources, key: StationKey): StationPatrimoine | null => {
    const lieu = sources.lieux.find(l => l.id === key.lieuId);
    if (!lieu) return null;
    const typeByModuleId = new Map(lieu.modules.map(m => [m.id, m.type]));
    const result: StationPatrimoine = {
        lieuId: lieu.id, lieuName: lieu.name, line: key.line,
        otherLines: linesOfLieu(lieu).filter(l => l !== key.line),
        dat: [], eca: [], pdq: [], prAssociated: [],
        pmrFloor: sources.pmrFloor.filter(i => i.lieuId === lieu.id && i.line === key.line),
        cognitive: sources.cognitive.filter(i => i.lieuId === lieu.id && i.line === key.line),
        cognitiveUncounted: uncountedCognitive(lieu, key.line),
        stationEquipment: sources.stationEquipment.filter(i => i.lieuName === lieu.name && i.line === key.line),
        futureStationEquipment: sources.futureStationEquipment.filter(i => i.lieuName === lieu.name && i.line === key.line),
        baches: (sources.bachesForLieu ?? getBachesForLieu)(lieu.name).filter(b => b.line === key.line),
    };
    for (const imp of sources.implantations) {
        if (imp.lieuId !== lieu.id) continue;
        if (imp.line === 'P+R') { result.prAssociated.push(imp); continue; }
        if (imp.line !== key.line) continue;
        const bucket = CATALOGUE_TYPES.get(typeByModuleId.get(imp.moduleId) as AuditModuleType);
        if (bucket) result[bucket].push(imp);
    }
    return result;
};

// ----------------------------------------------------------------- résumé

export interface FamilyCount { value: number; unit: string }
export interface FamilySummary { family: StationFamily; counts: FamilyCount[]; uncounted?: FamilyCount }

const plural = (n: number, singular: string, pluralForm = `${singular}s`): FamilyCount =>
    ({ value: n, unit: n > 1 ? pluralForm : singular });
const distinct = <T>(items: T[], keyOf: (item: T) => string) => new Set(items.map(keyOf)).size;
const equipmentKey = (i: ImplantationRef) => `${i.moduleId}|${i.context}|${i.equipmentLabel}`;

/** Résumé par famille présente : chaque famille dans ses propres unités,
 *  jamais un total commun. */
export const summarizeStationPatrimoine = (p: StationPatrimoine): FamilySummary[] => {
    const out: FamilySummary[] = [];
    const catalogue = (family: StationFamily, items: ImplantationRef[], device: [string, string?]) => {
        if (items.length === 0) return;
        out.push({ family, counts: [
            plural(distinct(items, equipmentKey), ...device),
            plural(distinct(items, i => i.referenceId), 'référence'),
            plural(items.length, 'repère'),
        ] });
    };
    catalogue('DAT', p.dat, ['appareil']);
    catalogue('ECA', p.eca, ['valideur']);
    if (p.pdq.length > 0) out.push({ family: 'PDQ', counts: [plural(p.pdq.length, 'exemplaire')] });
    if (p.pmrFloor.length > 0) out.push({ family: 'PMR', counts: [plural(p.pmrFloor.length, 'adhésif')] });
    if (p.cognitive.length > 0 || p.cognitiveUncounted.length > 0) {
        out.push({
            family: 'COG', counts: [plural(p.cognitive.length, 'pictogramme compté', 'pictogrammes comptés')],
            ...(p.cognitiveUncounted.length > 0 ? { uncounted: plural(p.cognitiveUncounted.length, 'non compté', 'non comptés') } : {}),
        });
    }
    if (p.stationEquipment.length > 0 || p.futureStationEquipment.length > 0) {
        out.push({
            family: 'SIG', counts: [plural(p.stationEquipment.length, 'emplacement')],
            ...(p.futureStationEquipment.length > 0 ? { uncounted: plural(p.futureStationEquipment.length, 'futur', 'futurs') } : {}),
        });
    }
    if (p.baches.length > 0) out.push({ family: 'BACHE', counts: [plural(p.baches.reduce((s, b) => s + b.count, 0), 'bâche')] });
    if (p.prAssociated.length > 0) {
        out.push({ family: 'PR', counts: [
            plural(distinct(p.prAssociated, equipmentKey), 'équipement'),
            plural(p.prAssociated.length, 'repère'),
        ] });
    }
    return out;
};

/** Équipements de station regroupés par type, dans l'ordre de l'inventaire. */
export const groupStationEquipmentByKind = (items: StationEquipmentItem[], order: readonly StationEquipmentKind[]) =>
    order.map(kind => ({ kind, items: items.filter(i => i.kind === kind) })).filter(g => g.items.length > 0);
