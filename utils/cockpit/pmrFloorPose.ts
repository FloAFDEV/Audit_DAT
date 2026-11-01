// utils/cockpit/pmrFloorPose.ts
// Lecture seule des adhésifs PMR au sol pour la sélection du Référentiel —
// famille sans référence catalogue, servie par son propre module (comme les
// pictogrammes cognitifs). Mêmes règles que l'inventaire (hooks/useStats.ts) :
// périmètre d'exploitation, module « sans objet » exclu, un élément par
// adhésif, matière attribuée par getPmrMaterial (jamais déduite).
import { AuditModuleType, Lieu, PMRFloorAdhesiveData } from '../../types';
import { isModuleInCurrentScope } from '../moduleScope';
import { getPmrMaterial } from '../../data/pmr_materials';
import { pmrAccessLabel } from '../fieldPhotos';

export const PMR_FLOOR_DIMENSIONS = '920x370mm';

export interface PmrFloorPoseItem {
    line: string;
    lieuName: string;
    /** Accès porté par le nom du module (« Accès Haut (PRI) »), vide sinon. */
    accessLabel: string;
    material: string | null;
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
            for (let i = 0; i < (data.adhesives ?? []).length; i++) {
                items.push({ line, lieuName: lieu.name, accessLabel: pmrAccessLabel(module.name), material });
            }
        }
    }
    return items;
};
