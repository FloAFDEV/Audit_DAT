// utils/cockpit/cognitivePictogramSummary.ts
// =================================================================
// PICTOGRAMMES COGNITIFS — LE parcours unique (référentiel autonome,
// règle 7 de patrimoineIndex.ts). Lecture seule : le module Pictogrammes
// cognitifs reste la seule source (statuts gérés par son audit).
//  - readCognitivePictogramModule : lecture d'UN module, chaque
//    pictogramme qualifié « compté » ou non (getCountedCognitivePictograms :
//    lignes comptées, emplacements « Accès à définir » exclus) ;
//  - collectCognitivePictograms   : périmètre d'exploitation.
// Tout le reste (résumés des cards, lignes d'inventaire par dimension,
// éléments de pose, compteurs de la Synthèse, maintenance, patrimoine
// d'une station) dérive de ces enregistrements.
// =================================================================
import { AuditModule, AuditModuleType, CognitivePictogram, CognitivePictogramData, FloorAdhesiveStatus, Lieu } from '../../types';
import { isModuleInCurrentScope } from '../moduleScope';
import { getCognitivePictogramVisualUrl } from '../../data/cognitivePictogramVisuals';
import { COGNITIVE_PICTOGRAM_ACTIVE_LINES, getCognitivePictogramDimension, getCountedCognitivePictograms } from '../../data/cognitive_pictograms';
import { readFloorAdhesiveStatus } from './floorAdhesiveStatus';

export interface CognitivePictogramSummary {
    /** Code station dont le visuel est connu (sinon le premier module). */
    stationCode?: string;
    accessCount: number;
    toReplaceCount: number;
}

/** Clé d'une card de station : ligne + lieu — un picto de la ligne A
 *  n'apparaît jamais sur la card d'une autre ligne du même lieu. */
export const cognitiveSummaryKey = (line: string, lieuName: string): string => `${line}|${lieuName}`;

/** Résumé par (ligne, lieu), modules en exploitation uniquement. */
export const summarizeCognitivePictograms = (lieux: Lieu[]): Map<string, CognitivePictogramSummary> => {
    const byLieu = new Map<string, CognitivePictogramSummary>();
    // Mêmes pictogrammes que les totaux du cockpit et la Nomenclature.
    for (const picto of collectCognitivePictograms(lieux)) {
        const key = cognitiveSummaryKey(picto.line, picto.lieuName);
        const summary = byLieu.get(key) ?? { accessCount: 0, toReplaceCount: 0 };
        summary.accessCount++;
        if (picto.pictogram.status === FloorAdhesiveStatus.ToBeReplaced) summary.toReplaceCount++;
        if (!summary.stationCode || (!getCognitivePictogramVisualUrl(summary.stationCode) && getCognitivePictogramVisualUrl(picto.stationCode))) {
            summary.stationCode = picto.stationCode;
        }
        byLieu.set(key, summary);
    }
    return byLieu;
};

export interface CognitivePictogramStationEntry {
    lieuName: string;
    stationCode: string;
    line: string;
    count: number;
    /** Dimension, renseignée quand la liste mêle plusieurs dimensions. */
    dimensions?: string;
}

/** Ligne d'inventaire « Pictogramme cognitif » (une par dimension) →
 *  stations qui la composent, avec leur nombre de pictogrammes : mêmes
 *  pictogrammes et même dimension que la quantité de la ligne (la somme
 *  des `count` égale la quantité affichée). */
export const cognitivePictogramStationsByInventoryRow = (lieux: Lieu[]): Map<string, CognitivePictogramStationEntry[]> => {
    const rows = new Map<string, Map<string, CognitivePictogramStationEntry>>();
    for (const picto of collectCognitivePictograms(lieux)) {
        const rowId = `cog-picto-${picto.dimensions}`;
        const stations = rows.get(rowId) ?? new Map<string, CognitivePictogramStationEntry>();
        const key = `${picto.line}|${picto.lieuName}`;
        const entry = stations.get(key) ?? { lieuName: picto.lieuName, stationCode: picto.stationCode, line: picto.line, count: 0 };
        entry.count++;
        stations.set(key, entry);
        rows.set(rowId, stations);
    }
    return new Map([...rows].map(([rowId, stations]) => [rowId, [...stations.values()]]));
};

export interface CognitivePictogramPoseItem {
    line: string;
    lieuId: string;
    lieuName: string;
    stationCode: string;
    /** Accès / emplacement du pictogramme (libellé saisi au module). */
    accessPointName: string;
    dimensions: string;
    /** Statut constaté sur CE pictogramme (lecture seule) ; absent = statut
     *  indisponible, jamais « Non contrôlé » par défaut. N'intervient ni
     *  dans les quantités ni dans les exports. */
    status?: FloorAdhesiveStatus;
}

/** Un pictogramme cognitif tel que lu dans son module. */
export interface CognitivePictogramRecord extends CognitivePictogramPoseItem {
    moduleId: string;
    moduleName: string;
    pictogram: CognitivePictogram;
    /** Compté dans les quantités (getCountedCognitivePictograms). */
    counted: boolean;
    /** Motif de non-comptage : emplacement provisoire (« Accès à définir »)
     *  ou ligne dont les pictogrammes ne sont pas comptés. */
    uncountedReason?: 'provisional' | 'inactiveLine';
}

/** Lecture d'UN module Pictogrammes cognitifs — aucun filtre de périmètre ;
 *  chaque pictogramme est qualifié compté ou non par la règle unique. */
export const readCognitivePictogramModule = (lieu: Pick<Lieu, 'id' | 'name'>, module: AuditModule): CognitivePictogramRecord[] => {
    if (module.type !== AuditModuleType.COGNITIVE_PICTOGRAMS) return [];
    const data = module.data as CognitivePictogramData;
    const line = module.line ?? '';
    const counted = new Set(getCountedCognitivePictograms(module));
    const activeLine = COGNITIVE_PICTOGRAM_ACTIVE_LINES.has(line);
    return (data.pictograms ?? []).map(pictogram => ({
        line, lieuId: lieu.id, lieuName: lieu.name, moduleId: module.id, moduleName: module.name,
        stationCode: data.stationCode,
        accessPointName: pictogram.accessPointName,
        dimensions: getCognitivePictogramDimension(data.stationCode, pictogram.accessPointName),
        status: readFloorAdhesiveStatus(pictogram.status),
        pictogram,
        counted: counted.has(pictogram),
        ...(counted.has(pictogram) ? {} : { uncountedReason: activeLine ? 'provisional' as const : 'inactiveLine' as const }),
    }));
};

/** Pictogrammes du périmètre d'exploitation, filtrés sur les lignes
 *  demandées ; comptés seulement, sauf `includeUncounted`. Ordre : celui
 *  des lieux et des pictogrammes du module. */
export const collectCognitivePictograms = (
    lieux: Lieu[], options: { lines?: ReadonlySet<string>; includeUncounted?: boolean } = {},
): CognitivePictogramRecord[] =>
    lieux.flatMap(lieu => lieu.modules
        .filter(module => module.type === AuditModuleType.COGNITIVE_PICTOGRAMS && isModuleInCurrentScope(module)
            && (!options.lines || options.lines.has(module.line ?? '')))
        .flatMap(module => readCognitivePictogramModule(lieu, module).filter(p => options.includeUncounted || p.counted)));

/** Un élément par pictogramme cognitif compté (mêmes règles que les totaux
 *  et l'Inventaire détaillé : périmètre d'exploitation, lignes actives,
 *  emplacements « Accès à définir » exclus), filtré sur les lignes
 *  demandées. Ordre : celui des lieux et des pictogrammes du module. */
export const cognitivePictogramPoseItems = (lieux: Lieu[], lines?: ReadonlySet<string>): CognitivePictogramPoseItem[] =>
    collectCognitivePictograms(lieux, { lines });
