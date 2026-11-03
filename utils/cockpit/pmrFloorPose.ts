// utils/cockpit/pmrFloorPose.ts
// =================================================================
// PMR AU SOL — LE parcours unique des adhésifs (référentiel autonome,
// règle 7 de patrimoineIndex.ts). Toute vue qui compte, liste ou
// qualifie des adhésifs PMR au sol part d'ici :
//  - readPmrFloorModule        : lecture d'UN module (aucun filtre) ;
//  - isCountedPmrFloorAdhesive : règle de comptage (« sans objet » exclu) ;
//  - collectPmrFloorAdhesives  : adhésifs comptés du périmètre
//                                d'exploitation (isModuleInCurrentScope).
// Consommateurs : useStats (Synthèse, inventaire détaillé), Référentiel
// (éléments de pose, sélection, CSV de pose), Patrimoine d'une station,
// maintenance (generateMaintenanceSummary).
// Un élément par adhésif, matière attribuée par getPmrMaterial (jamais
// déduite), statut lu sur l'adhésif lui-même.
// =================================================================
import { AuditModule, AuditModuleType, FloorAdhesiveStatus, Lieu, PMRFloorAdhesive, PMRFloorAdhesiveData } from '../../types';
import { readFloorAdhesiveStatus } from './floorAdhesiveStatus';
import { isModuleInCurrentScope } from '../moduleScope';
import { getPmrMaterial } from '../../data/pmr_materials';
import { pmrAccessLabel } from '../fieldPhotos';

export const PMR_FLOOR_DIMENSIONS = '920x370mm';

export interface PmrFloorPoseItem {
    line: string;
    lieuId: string;
    lieuName: string;
    /** Accès porté par le nom du module (« Accès Haut (PRI) »), vide sinon. */
    accessLabel: string;
    material: string | null;
    /** Statut constaté sur CET adhésif (lecture seule) ; absent = statut
     *  indisponible, jamais « Non contrôlé » par défaut. N'intervient ni
     *  dans les quantités ni dans les exports. */
    status?: FloorAdhesiveStatus;
}

/** Un adhésif PMR au sol tel que lu dans son module. */
export interface PmrFloorAdhesiveRecord extends PmrFloorPoseItem {
    moduleId: string;
    moduleName: string;
    adhesive: PMRFloorAdhesive;
    /** Module déclaré « sans objet » : adhésif jamais compté. */
    notApplicable: boolean;
}

/** Matière d'un module PMR au sol (attribuée, jamais déduite). */
export const pmrFloorModuleMaterial = (module: AuditModule): string | null =>
    getPmrMaterial((module.data as PMRFloorAdhesiveData).stationName, module.name);

/** Règle de périmètre et de comptage au niveau du MODULE : module PMR au
 *  sol de l'exploitation actuelle, non déclaré « sans objet ». Même règle
 *  que collectPmrFloorAdhesives (Synthèse : liste des matières). */
export const isCountedPmrFloorModule = (module: AuditModule): boolean =>
    module.type === AuditModuleType.PMR_FLOOR_ADHESIVE && isModuleInCurrentScope(module)
    && !(module.data as PMRFloorAdhesiveData).isNotApplicable;

/** Lecture d'UN module PMR au sol — aucun filtre de périmètre ni de
 *  comptage (l'appelant décide). */
export const readPmrFloorModule = (lieu: Pick<Lieu, 'id' | 'name'>, module: AuditModule): PmrFloorAdhesiveRecord[] => {
    if (module.type !== AuditModuleType.PMR_FLOOR_ADHESIVE) return [];
    const data = module.data as PMRFloorAdhesiveData;
    const base = {
        line: module.line ?? '', lieuId: lieu.id, lieuName: lieu.name,
        moduleId: module.id, moduleName: module.name,
        accessLabel: pmrAccessLabel(module.name),
        material: pmrFloorModuleMaterial(module),
        notApplicable: !!data.isNotApplicable,
    };
    return (data.adhesives ?? []).map(adhesive => ({ ...base, adhesive, status: readFloorAdhesiveStatus(adhesive?.status) }));
};

/** Règle de comptage : un module « sans objet » n'apporte aucun adhésif. */
export const isCountedPmrFloorAdhesive = (record: PmrFloorAdhesiveRecord): boolean => !record.notApplicable;

/** Adhésifs comptés du périmètre d'exploitation, filtrés sur les lignes
 *  demandées. Ordre : celui des lieux et des adhésifs du module. */
export const collectPmrFloorAdhesives = (lieux: Lieu[], lines?: ReadonlySet<string>): PmrFloorAdhesiveRecord[] =>
    lieux.flatMap(lieu => lieu.modules
        .filter(module => isCountedPmrFloorModule(module) && (!lines || lines.has(module.line ?? '')))
        .flatMap(module => readPmrFloorModule(lieu, module)));

/** Éléments de pose (Référentiel, CSV de pose, patrimoine d'une station). */
export const pmrFloorPoseItems = (lieux: Lieu[], lines?: ReadonlySet<string>): PmrFloorPoseItem[] =>
    collectPmrFloorAdhesives(lieux, lines);
