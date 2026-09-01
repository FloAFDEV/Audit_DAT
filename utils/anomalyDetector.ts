import {
    Lieu, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData,
    CognitivePictogramData, AdhesiveStatus, FloorAdhesiveStatus,
} from '../types';

/**
 * Compte léger des anomalies (à remplacer / absent) d'un lieu, sans dépendre des
 * référentiels d'adhésifs. Utilisé par le mode audit pour décider quelles cards
 * mettre en surbrillance. Volontairement O(n) sur les statuts uniquement.
 */
export const getLieuDefectCount = (lieu: Lieu): number => {
    let count = 0;
    const isDefect = (s: string) => s === AdhesiveStatus.ToBeReplaced || s === AdhesiveStatus.Absent;
    const isFloorDefect = (s: string) => s === FloorAdhesiveStatus.ToBeReplaced;

    for (const module of lieu.modules) {
        switch (module.type) {
            case AuditModuleType.DAT:
                (module.data as ModeData).stations?.forEach(s =>
                    s.directions?.forEach(d =>
                        d.dats?.filter(dat => !dat.archivedAt).forEach(dat =>
                            Object.values(dat.adhesives || {}).forEach(st => { if (isDefect(st)) count++; }))));
                break;
            case AuditModuleType.PR:
                (module.data as Pr).zones?.forEach(z =>
                    z.equipments?.forEach(eq =>
                        Object.values(eq.adhesives || {}).forEach(st => { if (isDefect(st)) count++; })));
                break;
            case AuditModuleType.ECA:
                (module.data as EcaData).ecas?.filter(eca => !eca.archivedAt).forEach(eca =>
                    Object.values(eca.adhesives || {}).forEach(st => { if (isDefect(st)) count++; }));
                break;
            case AuditModuleType.PMR_FLOOR_ADHESIVE:
                (module.data as PMRFloorAdhesiveData).adhesives?.forEach(ad => { if (isFloorDefect(ad.status)) count++; });
                break;
            case AuditModuleType.COGNITIVE_PICTOGRAMS:
                (module.data as CognitivePictogramData).pictograms?.forEach(p => { if (isFloorDefect(p.status)) count++; });
                break;
        }
    }
    return count;
};
