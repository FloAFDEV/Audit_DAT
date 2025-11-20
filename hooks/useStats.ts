import { useMemo } from 'react';
import { 
    Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData, AdhesiveStatus, FloorAdhesiveStatus,
    EquipmentType, EcaEquipmentType, AdhesiveInventoryItem, MaintenanceItem, AuditCategory
} from '../types';
import { isPmrEcaType } from '../data/eca_data';
import { getEcaAdhesives, getPrAdhesives, ADHESIVES } from '../data/adhesives';
import { getCognitivePictogramDimension, COGNITIVE_PICTOGRAM_DIMENSIONS } from '../data/cognitive_pictograms';
import { getPmrMaterial, getAllPmrMaterials } from '../data/pmr_materials';
import { AUDIT_MODULES_CONFIG } from '../data/config';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import { PR_DATA } from '../data/pr_data';

const parseAdhesiveName = (name: string | undefined): { repere: string; name: string } => {
    if (!name) return { repere: '', name: '' };
    const repereMatch = name.match(/^Repère\s+([\w\d]+)\s*-\s*(.*)$/);
    if (repereMatch) {
        return { repere: repereMatch[1], name: repereMatch[2].trim() };
    }
    return { repere: '', name: name };
};

const getCategoryForModule = (module: AuditModule): AuditCategory | undefined => {
    if (module.type === AuditModuleType.PR) return 'PR';
    if (module.line === 'A') return 'METRO_A';
    if (module.line === 'B') return 'METRO_B';
    if (module.line === 'C') return 'METRO_C';
    if (module.line === 'TRAM') return 'TRAM';
    if (module.line === 'TELEO') return 'TELEO';
    return undefined;
};

export const useStats = (lieux: Lieu[]) => {

    const globalCounts = useMemo(() => {
        let datCount = 0;
        let datCountA = 0;
        let datCountB = 0;
        let datCountTram = 0;
        let datCountTeleo = 0;
        let beCount = 0;
        let bsCount = 0;
        let caCount = 0;
        let ecaCount = 0;
        let ecaPmrCount = 0;
        let cogPictoCount = 0;
        let cogPictoCountA = 0;
        let cogPictoCountB = 0;
        let pmrFloorAdhesiveCount = 0;
        let pmrFloorAdhesiveCountA = 0;
        let pmrFloorAdhesiveCountB = 0;
        const prCount = PR_DATA.length;

        const stationCountA = LINE_A_STATIONS.filter(s => !s.isFuture).length;
        const stationCountB = LINE_B_STATIONS.filter(s => !s.isFuture).length;
        const stationCountC = LINE_C_STATIONS.filter(s => !s.isFuture).length;
        const stationCountTram = TRAM_STATIONS.filter(s => !s.isFuture).length;
        const stationCountTeleo = TELEO_STATIONS.filter(s => !s.isFuture).length;
        const stationCountTotal = stationCountA + stationCountB + stationCountC + stationCountTram + stationCountTeleo;

        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                if (module.isFuture) continue;
                switch (module.type) {
                    case AuditModuleType.DAT:
                        const datsInModule = (module.data as ModeData).stations.reduce((sum, s) => sum + s.directions.reduce((dSum, d) => dSum + d.dats.length, 0), 0);
                        datCount += datsInModule;
                        if (module.line === 'A') datCountA += datsInModule;
                        else if (module.line === 'B') datCountB += datsInModule;
                        else if (module.line === 'TRAM') datCountTram += datsInModule;
                        else if (module.line === 'TELEO') datCountTeleo += datsInModule;
                        break;
                    case AuditModuleType.PR:
                        for (const zone of (module.data as Pr).zones) {
                            for (const equip of zone.equipments) {
                                if (equip.type === EquipmentType.BE) beCount++;
                                if (equip.type === EquipmentType.BS) bsCount++;
                                if (equip.type === EquipmentType.CA) caCount++;
                            }
                        }
                        break;
                    case AuditModuleType.ECA:
                        const ecas = (module.data as EcaData).ecas;
                        ecaCount += ecas.length;
                        ecaPmrCount += ecas.filter(e => isPmrEcaType(e.type)).length;
                        break;
                    case AuditModuleType.COGNITIVE_PICTOGRAMS:
                        cogPictoCount++;
                        if (module.line === 'A') {
                            cogPictoCountA++;
                        } else if (module.line === 'B') {
                            cogPictoCountB++;
                        }
                        break;
                    case AuditModuleType.PMR_FLOOR_ADHESIVE:
                        pmrFloorAdhesiveCount++;
                        if (module.line === 'A') {
                            pmrFloorAdhesiveCountA++;
                        } else if (module.line === 'B') {
                            pmrFloorAdhesiveCountB++;
                        }
                        break;
                }
            }
        }
        return { 
            datCount, datCountA, datCountB, datCountTram, datCountTeleo,
            beCount, bsCount, caCount, prCount,
            ecaCount, ecaPmrCount,
            cogPictoCount, cogPictoCountA, cogPictoCountB,
            pmrFloorAdhesiveCount, pmrFloorAdhesiveCountA, pmrFloorAdhesiveCountB,
            stationCountTotal, stationCountA, stationCountB,
            stationCountC, stationCountTram, stationCountTeleo
        };
    }, [lieux]);

    const ecaBreakdown = useMemo(() => {
        const byLine = {
            A: { total: 0, pmr: 0 },
            B: { total: 0, pmr: 0 },
            C: { total: 0, pmr: 0 },
            total: 0
        };
        
        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                if (module.type === AuditModuleType.ECA && !module.isFuture) {
                    const data = module.data as EcaData;
                    const count = data.ecas.length;
                    const pmrInModule = data.ecas.filter(e => isPmrEcaType(e.type)).length;
                    
                    if (module.line === 'A') {
                        byLine.A.total += count;
                        byLine.A.pmr += pmrInModule;
                    } else if (module.line === 'B') {
                        byLine.B.total += count;
                        byLine.B.pmr += pmrInModule;
                    } else if (module.line === 'C') {
                        byLine.C.total += count;
                        byLine.C.pmr += pmrInModule;
                    }
                }
            }
        }
        byLine.total = byLine.A.total + byLine.B.total + byLine.C.total;
        
        return { byLine };
    }, [lieux]);

    const maintenanceSummary = useMemo(() => {
        const toBeReplaced: MaintenanceItem[] = [];
        const absent: MaintenanceItem[] = [];
        let okCount = 0;

        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                if (module.isFuture) continue;
                
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
                                    context: `Station: ${s.name} > ${d.name}`,
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
                                    context: `Zone: ${z.name}`,
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
                                    context: `Accès : ${eca.accessPoint}`,
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
                        (module.data as PMRFloorAdhesiveData).adhesives.forEach(ad => {
                            const item: MaintenanceItem = {
                                ...baseItem,
                                elementName: "Adhésif au sol",
                                context: `Station: ${(module.data as PMRFloorAdhesiveData).stationName}`,
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
                                context: `Accès : ${p.accessPointName}`,
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
        return { 
            toBeReplaced: { count: toBeReplaced.length, items: toBeReplaced },
            absent: { count: absent.length, items: absent },
            okCount 
        };
    }, [lieux]);

    const adhesiveInventory = useMemo(() => {
        const inventoryMap = new Map<string, AdhesiveInventoryItem>();
        const auditModules = AUDIT_MODULES_CONFIG;
        
        const processAdhesiveList = (adList: any[], auditType: string) => {
            adList.forEach(ad => {
                const { repere, name } = parseAdhesiveName(ad.name);
                let dimensions = '';
                let material = ad.description || '';
                if(material.includes('|')) {
                    [dimensions, material] = material.split('|').map(s => s.trim());
                } else if (material.includes('//')) {
                     [material, dimensions] = material.split('//').map(s => s.trim());
                }
                inventoryMap.set(ad.id, { id: ad.id, auditType, repere, name, dimensions, material });
            });
        };
        
        processAdhesiveList(ADHESIVES, auditModules.find(c=>c.type === AuditModuleType.DAT)!.shortLabel);
        processAdhesiveList(getPrAdhesives(EquipmentType.BE), auditModules.find(c=>c.type === AuditModuleType.PR)!.shortLabel);
        processAdhesiveList(getPrAdhesives(EquipmentType.BS), auditModules.find(c=>c.type === AuditModuleType.PR)!.shortLabel);
        processAdhesiveList(getPrAdhesives(EquipmentType.CA), auditModules.find(c=>c.type === AuditModuleType.PR)!.shortLabel);
        
        Object.values(EcaEquipmentType).forEach(type => {
            processAdhesiveList(getEcaAdhesives(type), auditModules.find(c=>c.type === AuditModuleType.ECA)!.shortLabel);
        });
        
        const pmrModule = auditModules.find(c=>c.type === AuditModuleType.PMR_FLOOR_ADHESIVE)!;
        const allPmrMaterials = getAllPmrMaterials();
        allPmrMaterials.forEach(material => {
            const id = `pmr-sol-${material.replace(/[^a-zA-Z0-9]/g, '-')}`;
            inventoryMap.set(id, {
                id: id,
                auditType: pmrModule.shortLabel,
                repere: '-',
                name: "Adhésif de signalisation au sol",
                dimensions: "920x370mm",
                material: material,
            });
        });

        const cogPictoModule = auditModules.find(c=>c.type === AuditModuleType.COGNITIVE_PICTOGRAMS)!;
        const allCogPictoDims = new Set<string>();
        Object.values(COGNITIVE_PICTOGRAM_DIMENSIONS).forEach(dim => {
            if(typeof dim === 'string') allCogPictoDims.add(dim);
            else if(typeof dim === 'object' && dim !== null) {
                Object.values(dim).forEach(d => allCogPictoDims.add(d));
            }
        });
        allCogPictoDims.forEach(dims => {
            inventoryMap.set(`cog-picto-${dims}`, {
                id: `cog-picto-${dims}`, auditType: cogPictoModule.shortLabel, repere: '-', name: "Pictogramme cognitif",
                dimensions: dims, material: 'Vinyle + Plastification'
            });
        });
        
        return Array.from(inventoryMap.values()).sort((a, b) => {
            const typeCompare = a.auditType.localeCompare(b.auditType);
            if (typeCompare !== 0) {
                return typeCompare;
            }

            const repA = parseInt(a.repere, 10);
            const repB = parseInt(b.repere, 10);

            const isRepANumeric = !isNaN(repA);
            const isRepBNumeric = !isNaN(repB);

            if (isRepANumeric && isRepBNumeric) {
                if (repA !== repB) {
                    return repA - repB;
                }
            } else if (isRepANumeric) {
                return -1; // Numeric reperes first
            } else if (isRepBNumeric) {
                return 1;
            }
            
            // Fallback to name if reperes are equal, non-numeric, or not present
            return a.name.localeCompare(b.name);
        });

    }, []);

    return { globalCounts, ecaBreakdown, maintenanceSummary, adhesiveInventory };
};