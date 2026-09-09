// data/planQuartierInitialInventory.ts
// =================================================================
// Premier jeu de données connu pour l'audit Plans de quartier (+ PEM 3D),
// PAS un inventaire exhaustif (cf. types.ts::PlanQuartierData). Chaque
// entrée décrit un GROUPE d'exemplaires identiques à seeder sur UNE
// station/ligne — jamais une modification du référentiel (les modelId
// utilisés référencent les 4 modèles figés de data/signage_seed.ts).
//
// Nombre et emplacement de chaque exemplaire sont donnés (premier
// recensement) — seul leur état (OK / Absent / À remplacer) reste à
// contrôler sur le terrain, exactement comme pour les autres audits
// visuels. Jean-Jaurès (pôle A/B) et Arènes (pôle A/T1) sont rattachés
// à la Ligne A ci-dessous ; les codes "2026", "2026b", "N2026" ne sont
// pas interprétés (millésime ou lot d'impression inconnu) : conservés
// tels quels dans `comment`, jamais traduits en une donnée devinée.
// =================================================================
import { AdhesiveStatus } from '../types';

export interface PlanQuartierInitialEntry {
    /** Doit correspondre exactement à Station.name (data/stationRegistry.ts). */
    stationName: string;
    line: 'A' | 'B' | 'C' | 'TRAM' | 'TELEO';
    modelId: string;
    quantity: number;
    comment?: string;
    measuredDimensions?: { width: number; height: number; unit: 'cm' | 'mm' };
}

export const PLAN_QUARTIER_INITIAL_INVENTORY: PlanQuartierInitialEntry[] = [
    // --- Plans de quartier plastifiés ---
    { stationName: 'Marengo-SNCF', line: 'A', modelId: 'pdq-78x100', quantity: 1, comment: 'Réf. terrain : 2026b' },
    { stationName: 'Saint-Cyprien - République', line: 'A', modelId: 'pdq-78x100', quantity: 3, comment: 'Réf. terrain : 2026' },
    { stationName: 'Saint-Cyprien - République', line: 'A', modelId: 'pdq-78x120', quantity: 1, comment: 'Réf. terrain : 2026' },
    {
        stationName: 'Empalot', line: 'B', modelId: 'pdq-78x120', quantity: 1,
        comment: 'Réf. terrain : 2026b', measuredDimensions: { width: 78, height: 119, unit: 'cm' },
    },
    { stationName: 'François Verdier', line: 'B', modelId: 'pdq-78x120', quantity: 1, comment: 'Réf. terrain : 2026' },
    { stationName: 'François Verdier', line: 'B', modelId: 'pdq-78x100', quantity: 1, comment: 'Réf. terrain : 2026' },
    {
        stationName: 'Jean-Jaurès', line: 'A', modelId: 'pdq-78x100', quantity: 3,
        comment: 'Réf. terrain : N2026',
    },
    {
        stationName: 'Jean-Jaurès', line: 'A', modelId: 'pdq-78x120', quantity: 3,
        comment: 'Réf. terrain : N2026',
    },
    { stationName: 'Jeanne d\'Arc', line: 'B', modelId: 'pdq-78x100', quantity: 3, comment: 'Réf. terrain : 2026' },
    { stationName: 'Jeanne d\'Arc', line: 'B', modelId: 'pdq-78x120', quantity: 1, comment: 'Réf. terrain : 2026' },
    { stationName: 'Faculté de Pharmacie', line: 'B', modelId: 'pdq-78x120', quantity: 1, comment: 'Réf. terrain : 2026' },
    { stationName: 'Oncopole-Lise Enjalbert', line: 'TELEO', modelId: 'pdq-78x120', quantity: 1, comment: 'Réf. terrain : 2026' },

    // --- Adhésifs PDQ ---
    {
        stationName: 'Jean-Jaurès', line: 'A', modelId: 'pdq-adhesif', quantity: 1,
        comment: 'Réf. terrain : N2026',
    },
    { stationName: 'Marengo-SNCF', line: 'A', modelId: 'pdq-adhesif', quantity: 1, comment: 'Réf. terrain : 78x120 2026b' },

    // --- PEM 3D (120×80, Dibond) ---
    { stationName: 'Jean-Jaurès', line: 'A', modelId: 'pem3d-120x80', quantity: 1, comment: 'JEAN_JAURES_120X80_V05_tisseo_v3_16-06-2026_imp' },
    { stationName: 'Ramonville', line: 'B', modelId: 'pem3d-120x80', quantity: 1, comment: 'RAMONVILLE_120X80_V05_tisseo_v4_01-09-2026_imp' },
    { stationName: 'Borderouge', line: 'B', modelId: 'pem3d-120x80', quantity: 1 },
    { stationName: 'Argoulets', line: 'A', modelId: 'pem3d-120x80', quantity: 1 },
    { stationName: 'Basso Cambo', line: 'A', modelId: 'pem3d-120x80', quantity: 1 },
    { stationName: 'Arènes', line: 'A', modelId: 'pem3d-120x80', quantity: 3 },
];

/** DEFAULT_STATUS : les exemplaires seedés depuis cet inventaire initial
 *  n'ont pas encore de constat réel (premier recensement transcrit, pas
 *  encore un audit terrain) — statut Non contrôlé, jamais un OK inventé. */
export const PLAN_QUARTIER_INITIAL_STATUS = AdhesiveStatus.NotChecked;
