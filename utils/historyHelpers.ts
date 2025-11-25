
import { AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData, AdhesiveStatus, FloorAdhesiveStatus } from '../types';
import { getPrAdhesives, getEcaAdhesives } from '../data/adhesives';

/**
 * Deeply clones an object and removes photo data to save space.
 */
export const sanitizeDataForHistory = (data: any): any => {
    const cloned = JSON.parse(JSON.stringify(data));

    // Recursive function to find and delete photo_base64
    const stripPhotos = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        
        if (Array.isArray(obj)) {
            obj.forEach(item => stripPhotos(item));
        } else {
            if ('photo_base64' in obj) {
                delete obj.photo_base64;
            }
            // Traverse children
            Object.keys(obj).forEach(key => {
                stripPhotos(obj[key]);
            });
        }
    };

    stripPhotos(cloned);
    return cloned;
};

/**
 * Calculates a compliance score (0-100) based on the data provided.
 */
export const calculateComplianceScore = (data: any, type: 'SINGLE_AUDIT' | 'GLOBAL' | 'CATEGORY' | 'MODULE_TYPE'): number => {
    let totalApplicable = 0;
    let totalOk = 0;

    const processModule = (module: AuditModule) => {
        if (module.isFuture) return;

        switch (module.type) {
            case AuditModuleType.DAT:
                const stations = (module.data as ModeData).stations;
                stations.forEach(s => s.directions.forEach(d => d.dats.forEach(dat => {
                    Object.values(dat.adhesives).forEach(status => {
                        if (status !== AdhesiveStatus.NotApplicable && status !== AdhesiveStatus.NotChecked) {
                            totalApplicable++;
                            if (status === AdhesiveStatus.OK) totalOk++;
                        }
                    });
                })));
                break;
            case AuditModuleType.PR:
                const zones = (module.data as Pr).zones;
                zones.forEach(z => z.equipments.forEach(eq => {
                    // We need to check against definitions to know what is "applicable" if not checked
                    // But for history score, we usually count what HAS been audited or what IS applicable.
                    // Let's count all defined adhesives for the equipment type minus isDisabled
                    const defs = getPrAdhesives(eq.type).filter(a => !a.isDisabled);
                    defs.forEach(def => {
                        const status = eq.adhesives[def.id] || AdhesiveStatus.NotChecked;
                        if(status !== AdhesiveStatus.NotApplicable && status !== AdhesiveStatus.NotChecked) {
                             totalApplicable++;
                             if (status === AdhesiveStatus.OK) totalOk++;
                        }
                    });
                }));
                break;
            case AuditModuleType.ECA:
                const ecas = (module.data as EcaData).ecas;
                ecas.forEach(eca => {
                    if (eca.isNotApplicable) return; // Skip N/A ECAs
                    const defs = getEcaAdhesives(eca.type);
                    defs.forEach(def => {
                        const status = eca.adhesives[def.id] || AdhesiveStatus.NotChecked;
                        if(status !== AdhesiveStatus.NotApplicable && status !== AdhesiveStatus.NotChecked) {
                             totalApplicable++;
                             if (status === AdhesiveStatus.OK) totalOk++;
                        }
                    });
                });
                break;
            case AuditModuleType.PMR_FLOOR_ADHESIVE:
                const pmrData = module.data as PMRFloorAdhesiveData;
                if (pmrData.isNotApplicable) return;
                pmrData.adhesives.forEach(ad => {
                    if(ad.status !== FloorAdhesiveStatus.NotChecked) {
                        totalApplicable++;
                        if (ad.status === FloorAdhesiveStatus.OK) totalOk++;
                    }
                });
                break;
            case AuditModuleType.COGNITIVE_PICTOGRAMS:
                const cogData = module.data as CognitivePictogramData;
                cogData.pictograms.forEach(picto => {
                    if(picto.status !== FloorAdhesiveStatus.NotChecked) {
                        totalApplicable++;
                        if (picto.status === FloorAdhesiveStatus.OK) totalOk++;
                    }
                });
                break;
        }
    };

    // If data is a list of Lieux (Global/Category export)
    if (Array.isArray(data) && data.length > 0 && 'modules' in data[0]) {
        data.forEach((lieu: any) => {
            lieu.modules.forEach((m: any) => processModule(m));
        });
    } 
    // If data is a single Lieu
    else if ('modules' in data) {
        data.modules.forEach((m: any) => processModule(m));
    }
    
    // Correction stricte : Si aucun élément n'a été vérifié (totalApplicable === 0),
    // le score est de 0% (vide), et non 100% (parfait).
    if (totalApplicable === 0) return 0;

    return Math.round((totalOk / totalApplicable) * 100);
};
