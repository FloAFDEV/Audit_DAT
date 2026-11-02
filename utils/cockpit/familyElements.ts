// utils/cockpit/familyElements.ts
// =================================================================
// Éléments consultables des familles HORS CATALOGUE dans le Référentiel
// (PMR au sol par matière, Pictogrammes cognitifs par dimension).
// Lecture seule, aucun calcul nouveau :
//  - quantité d'un élément = sa ligne de l'Inventaire détaillé
//    (computeAdhesiveInventory), la même que la Synthèse ;
//  - implantations = fonction de lecture du référentiel autonome concerné
//    (pmrFloorPoseItems, cognitivePictogramPoseItems) — règle 7 de
//    patrimoineIndex.ts : chaque référentiel garde son propre parcours,
//    ils ne sont réunis qu'à l'affichage.
// L'identifiant d'un élément est celui de sa ligne d'inventaire
// (« pmr-sol-… », « cog-picto-… ») : jamais en collision avec un id de
// référence catalogue (ad1, adbe1, eca-…, pdq-…).
// =================================================================
import { AdhesiveInventoryItem } from '../../types';
import { pmrInventoryRowId, PMR_UNKNOWN_MATERIAL_ROW_ID } from '../../hooks/useStats';
import { PmrFloorPoseItem } from './pmrFloorPose';
import { CognitivePictogramPoseItem } from './cognitivePictogramSummary';
import { StationEquipmentItem, STATION_EQUIPMENT_ROW_IDS } from './stationEquipment';

/** SIG (Équipements station) : consultation seule, jamais sélectionnable
 *  pour un export (validation exploitant). */
export type ElementFamily = 'PMR' | 'COG' | 'SIG';

export const ELEMENT_FAMILY_LABELS: Record<ElementFamily, string> = {
    PMR: 'PMR au sol',
    COG: 'Pictogrammes cognitifs',
    SIG: 'Équipements station',
};

const PREFIXES: Record<ElementFamily, string> = { PMR: 'pmr-sol-', COG: 'cog-picto-', SIG: 'sign-' };

export const isSelectableFamily = (family: ElementFamily): boolean => family !== 'SIG';

export interface FamilyElement {
    /** Identifiant de la ligne d'inventaire. */
    id: string;
    family: ElementFamily;
    name: string;
    dimensions: string;
    /** Matière de l'inventaire (PMR : matière attribuée ou « Matière non
     *  renseignée » ; équipements station : matière du référentiel). */
    material?: string;
    /** Quantité de l'Inventaire détaillé. */
    quantity: number;
    lieuCount: number;
    lines: string[];
    /** Équipements station : emplacements comptés sur des stations en
     *  préparation (ligne pas encore en service), par ligne (ex. AEROPORT). */
    inPreparationByLine?: Record<string, number>;
    /** Équipements station : emplacements comptés sur des stations en
     *  exploitation. inService + Σ inPreparationByLine = quantity. */
    inService?: number;
    /** Équipements station : emplacements de stations futures, consultables
     *  mais HORS quantité. */
    futureCount?: number;
}

export const elementFamilyOf = (id: string): ElementFamily | null =>
    (Object.keys(PREFIXES) as ElementFamily[]).find(f => id.startsWith(PREFIXES[f])) ?? null;

export const pmrElementIdOf = (item: PmrFloorPoseItem): string =>
    item.material ? pmrInventoryRowId(item.material) : PMR_UNKNOWN_MATERIAL_ROW_ID;

export const cognitiveElementIdOf = (item: CognitivePictogramPoseItem): string => `cog-picto-${item.dimensions}`;

const spread = (items: { lieuName: string; line: string }[]) => ({
    lieuCount: new Set(items.map(i => `${i.line}|${i.lieuName}`)).size,
    lines: [...new Set(items.map(i => i.line))],
});

/** Un élément par ligne d'inventaire PMR / pictogramme, dans l'ordre de l'inventaire. */
export const buildFamilyElements = (
    inventory: AdhesiveInventoryItem[], pmrItems: PmrFloorPoseItem[], cognitiveItems: CognitivePictogramPoseItem[],
): FamilyElement[] => inventory.flatMap((row): FamilyElement[] => {
    const family = elementFamilyOf(row.id);
    if (!family || family === 'SIG') return [];
    const items = family === 'PMR'
        ? pmrItems.filter(i => pmrElementIdOf(i) === row.id)
        : cognitiveItems.filter(i => cognitiveElementIdOf(i) === row.id);
    return [{
        id: row.id, family, name: row.name, dimensions: row.dimensions,
        ...(family === 'PMR' ? { material: row.material } : {}),
        quantity: row.quantity, ...spread(items),
    }];
});

/** Sépare une sélection mixte : références catalogue / éléments hors catalogue. */
export const splitSelection = (ids: Iterable<string>): { referenceIds: string[]; elementIds: string[] } => {
    const referenceIds: string[] = [];
    const elementIds: string[] = [];
    for (const id of ids) (elementFamilyOf(id) ? elementIds : referenceIds).push(id);
    return { referenceIds, elementIds };
};

/** Exemplaires hors catalogue d'une sélection — sous-ensemble exact des
 *  fonctions de lecture, dans leur ordre (même CSV de pose qu'avant). */
export const selectFamilyPose = (
    ids: ReadonlySet<string>, pmrItems: PmrFloorPoseItem[], cognitiveItems: CognitivePictogramPoseItem[],
): { pmrFloor: PmrFloorPoseItem[]; cognitive: CognitivePictogramPoseItem[] } => ({
    pmrFloor: pmrItems.filter(i => ids.has(pmrElementIdOf(i))),
    cognitive: cognitiveItems.filter(i => ids.has(cognitiveElementIdOf(i))),
});

/** Libellé d'un périmètre (sélection ou liste affichée) : « 2 références +
 *  adhésifs PMR au sol + 1 dimension de pictogramme cognitif ». */
export const selectionLabel = (ids: ReadonlySet<string>, elements: FamilyElement[]): string => {
    const { referenceIds } = splitSelection(ids);
    const parts: string[] = [];
    if (referenceIds.length > 0) parts.push(`${referenceIds.length} référence${referenceIds.length > 1 ? 's' : ''}`);
    const describe = (family: ElementFamily, whole: string, unit: (n: number) => string) => {
        const all = elements.filter(e => e.family === family && e.quantity > 0);
        const chosen = all.filter(e => ids.has(e.id));
        if (chosen.length === 0) return;
        parts.push(chosen.length === all.length ? whole : `${chosen.length} ${unit(chosen.length)}`);
    };
    describe('PMR', 'adhésifs PMR au sol', n => `matière${n > 1 ? 's' : ''} d'adhésif PMR au sol`);
    describe('COG', 'pictogrammes cognitifs', n => `dimension${n > 1 ? 's' : ''} de pictogramme cognitif`);
    const label = parts.join(' + ');
    return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Équipements station : un élément par type, dans l'ordre de l'inventaire
 *  (même quantité que la ligne d'inventaire — vérifié par test). */
export const buildStationEquipmentElements = (
    inventory: AdhesiveInventoryItem[], items: StationEquipmentItem[], futureItems: StationEquipmentItem[] = [],
): FamilyElement[] => {
    const kindByRowId = new Map(Object.entries(STATION_EQUIPMENT_ROW_IDS).map(([kind, rowId]) => [rowId, kind]));
    return inventory.flatMap((row): FamilyElement[] => {
        const kind = kindByRowId.get(row.id);
        if (!kind) return [];
        const ofKind = items.filter(i => i.kind === kind);
        return [{
            id: row.id, family: 'SIG', name: row.name, dimensions: row.dimensions, material: row.material,
            quantity: row.quantity, ...spread(ofKind),
            inService: ofKind.filter(i => i.inService).length,
            inPreparationByLine: ofKind.filter(i => !i.inService)
                .reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.line]: (acc[i.line] ?? 0) + 1 }), {}),
            futureCount: futureItems.filter(i => i.kind === kind).length,
        }];
    });
};
