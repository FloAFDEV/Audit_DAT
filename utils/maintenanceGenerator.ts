
import { Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData, AdhesiveStatus, FloorAdhesiveStatus, MaintenanceItem, AuditCategory } from '../types';
import { ADHESIVES, getEcaAdhesives, getPrAdhesives } from '../data/adhesives';
import { getEcaProgress } from './progressCalculators';

const getCategoryForModule = (module: AuditModule): AuditCategory | undefined => {
    if (module.type === AuditModuleType.PR) return 'PR';
    if (module.line === 'A') return 'METRO_A';
    if (module.line === 'B') return 'METRO_B';
    if (module.line === 'C') return 'METRO_C';
    if (module.line === 'TRAM') return 'TRAM';
    if (module.line === 'TELEO') return 'TELEO';
    return undefined;
};

export const generateMaintenanceSummary = (lieux: Lieu[]) => {
    const toBeReplaced: MaintenanceItem[] = [];
    const absent: MaintenanceItem[] = [];
    let okCount = 0;

    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            // Pour l'historique, on traite les modules même s'ils sont marqués "future" dans les données archivées 
            // (bien que normalement on n'archive pas le futur, par sécurité on filtre si besoin, mais ici on traite tout le contenu de l'archive).
            // Dans le contexte live, le hook useStats filtre déjà. Ici on traite la donnée fournie.
            
            const category = getCategoryForModule(module);

            const baseItem = {
                lieuName: lieu.name,
                moduleName: module.name,
                category: category,
                auditType: module.type,
            };

            switch (module.type) {
                case AuditModuleType.DAT:
                    (module.data as ModeData).stations.forEach(s => s.directions.forEach(d => d.dats.forEach(dat => {
                        Object.entries(dat.adhesives).forEach(([adhesiveId, status]) => {
                            const adhesive = ADHESIVES.find(a => a.id === adhesiveId);
                            if (!adhesive) return;

                            const item: MaintenanceItem = {
                                ...baseItem,
                                elementName: dat.name,
                                context: d.name,
                                adhesiveName: adhesive.name,
                                status: status as string,
                            };

                            if (status === AdhesiveStatus.ToBeReplaced) toBeReplaced.push(item);
                            if (status === AdhesiveStatus.Absent) absent.push(item);
                            if (status === AdhesiveStatus.OK) okCount++;
                        });
                    })));
                    break;
                case AuditModuleType.PR:
                    (module.data as Pr).zones.forEach(z => z.equipments.forEach(eq => {
                        const allPrAdhesives = getPrAdhesives(eq.type);
                        Object.entries(eq.adhesives).forEach(([adhesiveId, status]) => {
                            const adhesive = allPrAdhesives.find(a => a.id === adhesiveId);
                            if (!adhesive) return;

                            const item: MaintenanceItem = {
                                ...baseItem,
                                elementName: eq.name,
                                context: z.name,
                                adhesiveName: adhesive.name,
                                status: status as string,
                            };

                            if (status === AdhesiveStatus.ToBeReplaced) toBeReplaced.push(item);
                            if (status === AdhesiveStatus.Absent) absent.push(item);
                            if (status === AdhesiveStatus.OK) okCount++;
                        });
                    }));
                    break;
                case AuditModuleType.ECA:
                    (module.data as EcaData).ecas.forEach(eca => {
                        const allEcaAdhesives = getEcaAdhesives(eca.type);
                        Object.entries(eca.adhesives).forEach(([adhesiveId, status]) => {
                            const adhesive = allEcaAdhesives.find(a => a.id === adhesiveId);
                            if (!adhesive) return;

                            const item: MaintenanceItem = {
                                ...baseItem,
                                elementName: eca.name,
                                context: eca.accessPoint,
                                adhesiveName: adhesive.name,
                                status: status as string,
                            };

                            if (status === AdhesiveStatus.ToBeReplaced) toBeReplaced.push(item);
                            if (status === AdhesiveStatus.Absent) absent.push(item);
                            if (status === AdhesiveStatus.OK) okCount++;
                        });
                    });
                    break;
                case AuditModuleType.PMR_FLOOR_ADHESIVE:
                    let pmrContext = "Zone générale";
                    const contextMatch = module.name.match(/\((.*?)\)/);
                    if (contextMatch && contextMatch[1]) {
                        pmrContext = contextMatch[1];
                    }

                    (module.data as PMRFloorAdhesiveData).adhesives.forEach(ad => {
                        const item: MaintenanceItem = {
                            ...baseItem,
                            elementName: "Adhésif au sol",
                            context: pmrContext,
                            adhesiveName: ad.name,
                            status: ad.status as string,
                        };
                        if (ad.status === FloorAdhesiveStatus.ToBeReplaced) toBeReplaced.push(item);
                        if (ad.status === FloorAdhesiveStatus.OK) okCount++;
                    });
                    break;
                case AuditModuleType.COGNITIVE_PICTOGRAMS:
                        (module.data as CognitivePictogramData).pictograms.forEach(p => {
                        const item: MaintenanceItem = {
                            ...baseItem,
                            elementName: "Pictogramme cognitif",
                            context: p.accessPointName,
                            adhesiveName: "Pictogramme",
                            status: p.status as string,
                        };
                        if (p.status === FloorAdhesiveStatus.ToBeReplaced) toBeReplaced.push(item);
                        if (p.status === FloorAdhesiveStatus.OK) okCount++;
                    });
                    break;
            }
        }
    }

    const allDefects = [...toBeReplaced, ...absent];

    return { 
        toBeReplaced: { count: toBeReplaced.length, items: toBeReplaced },
        absent: { count: absent.length, items: absent },
        allDefects: { count: allDefects.length, items: allDefects },
        okCount 
    };
};
