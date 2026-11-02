// utils/cockpit/pmrFloorPose.ts
// Lecture seule des adhésifs PMR au sol pour la sélection du Référentiel —
// famille sans référence catalogue, servie par son propre module (comme les
// pictogrammes cognitifs). Mêmes règles que l'inventaire (hooks/useStats.ts) :
// périmètre d'exploitation, module « sans objet » exclu, un élément par
// adhésif, matière attribuée par getPmrMaterial (jamais déduite).
import { AuditModuleType, FloorAdhesiveStatus, Lieu, PMRFloorAdhesiveData } from '../../types';
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

export const pmrFloorPoseItems = (lieux: Lieu[], lines?: ReadonlySet<string>): PmrFloorPoseItem[] => {
    const items: PmrFloorPoseItem[] = [];
    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            if (module.type !== AuditModuleType.PMR_FLOOR_ADHESIVE || !isModuleInCurrentScope(module)) continue;
            const data = module.data as PMRFloorAdhesiveData;
            if (data.isNotApplicable) continue;
            const line = module.line ?? '';
            if (lines && !lines.has(line)) continue;
            const material = getPmrMaterial(data.stationName, module.name);
            // Un élément par adhésif, lu sur l'adhésif lui-même : le statut
            // correspond toujours au constat de cet exemplaire.
            for (const adhesive of data.adhesives ?? []) {
                items.push({
                    line, lieuId: lieu.id, lieuName: lieu.name, accessLabel: pmrAccessLabel(module.name), material,
                    status: readFloorAdhesiveStatus(adhesive?.status),
                });
            }
        }
    }
    return items;
};
