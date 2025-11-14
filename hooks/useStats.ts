import { useMemo } from 'react';
import { 
    Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData, AdhesiveStatus, FloorAdhesiveStatus,
    EquipmentType, EcaEquipmentType, AdhesiveInventoryItem
} from '../types';
import { isPmrEcaType } from '../data/eca_data';
import { getEcaAdhesives, getPrAdhesives, ADHESIVES } from '../data/adhesives';
import { getCognitivePictogramDimension } from '../data/cognitive_pictograms';
import { getPmrMaterial, getAllPmrMaterials } from '../data/pmr_materials';
import { AUDIT_MODULES_CONFIG } from '../data/config';
// FIX: Import station data for all lines to calculate stats correctly.
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

export const useStats = (lieux: Lieu[]) => {

    // FIX: Expanded globalCounts to include missing stats properties.
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
        let toBeReplaced = 0;
        let absent = 0;
        let toPlan = 0;
        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                if (module.isFuture) continue;
                switch (module.type) {
                    case AuditModuleType.DAT:
                        (module.data as ModeData).stations.forEach(s => s.directions.forEach(d => d.dats.forEach(dat => {
                            Object.values(dat.adhesives).forEach(status => {
                                if (status === AdhesiveStatus.ToBeReplaced) toBeReplaced++;
                                if (status === AdhesiveStatus.Absent) absent++;
                            });
                        })));
                        break;
                    case AuditModuleType.PR:
                        (module.data as Pr).zones.forEach(z => z.equipments.forEach(eq => {
                            Object.values(eq.adhesives).forEach(status => {
                                if (status === AdhesiveStatus.ToBeReplaced) toBeReplaced++;
                                if (status === AdhesiveStatus.Absent) absent++;
                            });
                        }));
                        break;
                    case AuditModuleType.ECA:
                        (module.data as EcaData).ecas.forEach(eca => {
                            Object.values(eca.adhesives).forEach(status => {
                                if (status === AdhesiveStatus.ToBeReplaced) toBeReplaced++;
                                if (status === AdhesiveStatus.Absent) absent++;
                            });
                        });
                        break;
                    case AuditModuleType.PMR_FLOOR_ADHESIVE:
                        (module.data as PMRFloorAdhesiveData).adhesives.forEach(ad => {
                            if (ad.status === FloorAdhesiveStatus.ToBeReplaced) toBeReplaced++;
                            if (ad.status === FloorAdhesiveStatus.ToPlan) toPlan++;
                        });
                        break;
                    case AuditModuleType.COGNITIVE_PICTOGRAMS:
                         (module.data as CognitivePictogramData).pictograms.forEach(p => {
                            if (p.status === FloorAdhesiveStatus.ToBeReplaced) toBeReplaced++;
                            if (p.status === FloorAdhesiveStatus.ToPlan) toPlan++;
                        });
                        break;
                }
            }
        }
        return { toBeReplaced, absent, toPlan };
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
                inventoryMap.set(ad.id, { id: ad.id, auditType, repere, name, dimensions, material, quantity: 0 });
            });
        };
        
        processAdhesiveList(ADHESIVES, auditModules.find(c=>c.type === AuditModuleType.DAT)!.shortLabel);
        processAdhesiveList(getPrAdhesives(EquipmentType.BE), auditModules.find(c=>c.type === AuditModuleType.PR)!.shortLabel);
        processAdhesiveList(getPrAdhesives(EquipmentType.BS), auditModules.find(c=>c.type === AuditModuleType.PR)!.shortLabel);
        processAdhesiveList(getPrAdhesives(EquipmentType.CA), auditModules.find(c=>c.type === AuditModuleType.PR)!.shortLabel);
        
        Object.values(EcaEquipmentType).forEach(type => {
            processAdhesiveList(getEcaAdhesives(type), auditModules.find(c=>c.type === AuditModuleType.ECA)!.shortLabel);
        });

        // Tally quantities from actual audit data
        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                 if (module.isFuture) continue;
                 switch(module.type) {
                     case AuditModuleType.DAT:
                         (module.data as ModeData).stations.forEach(s => s.directions.forEach(d => d.dats.forEach(dat => {
                            Object.entries(dat.adhesives).forEach(([id, status]) => {
                                if ((status === AdhesiveStatus.OK || status === AdhesiveStatus.ToBeReplaced) && inventoryMap.has(id)) {
                                    inventoryMap.get(id)!.quantity++;
                                }
                            });
                         })));
                         break;
                    case AuditModuleType.PR:
                        (module.data as Pr).zones.forEach(z => z.equipments.forEach(eq => {
                             Object.entries(eq.adhesives).forEach(([id, status]) => {
                                if ((status === AdhesiveStatus.OK || status === AdhesiveStatus.ToBeReplaced) && inventoryMap.has(id)) {
                                    inventoryMap.get(id)!.quantity++;
                                }
                            });
                        }));
                        break;
                    case AuditModuleType.ECA:
                        (module.data as EcaData).ecas.forEach(eca => {
                             Object.entries(eca.adhesives).forEach(([id, status]) => {
                                if ((status === AdhesiveStatus.OK || status === AdhesiveStatus.ToBeReplaced) && inventoryMap.has(id)) {
                                    inventoryMap.get(id)!.quantity++;
                                }
                            });
                        });
                        break;
                 }
            }
        }
        
        const pmrModule = auditModules.find(c=>c.type === AuditModuleType.PMR_FLOOR_ADHESIVE)!;
        const allPmrMaterials = getAllPmrMaterials();
        const pmrByMaterial: Record<string, { quantity: number }> = Object.fromEntries(
            allPmrMaterials.map(material => [material, { quantity: 0 }])
        );

        const cogPictoModule = auditModules.find(c=>c.type === AuditModuleType.COGNITIVE_PICTOGRAMS)!;
        const cogPictoCounts: Record<string, number> = {};

        lieux.forEach(lieu => lieu.modules.forEach(module => {
            if (module.type === AuditModuleType.PMR_FLOOR_ADHESIVE && !module.isFuture) {
                const data = module.data as PMRFloorAdhesiveData;
                const material = getPmrMaterial(data.stationName, module.name);
                if (material && pmrByMaterial[material]) {
                    data.adhesives.forEach(ad => {
                        if(ad.status === FloorAdhesiveStatus.OK || ad.status === FloorAdhesiveStatus.ToBeReplaced) {
                            pmrByMaterial[material].quantity++;
                        }
                    });
                }
            } else if (module.type === AuditModuleType.COGNITIVE_PICTOGRAMS && !module.isFuture) {
                const data = module.data as CognitivePictogramData;
                data.pictograms.forEach(p => {
                    if (p.status === FloorAdhesiveStatus.OK || p.status === FloorAdhesiveStatus.ToBeReplaced) {
                        const dims = getCognitivePictogramDimension(data.stationCode, p.accessPointName);
                        cogPictoCounts[dims] = (cogPictoCounts[dims] || 0) + 1;
                    }
                })
            }
        }));

        Object.entries(pmrByMaterial).forEach(([material, data]) => {
            const id = `pmr-sol-${material.replace(/[^a-zA-Z0-9]/g, '-')}`;
            inventoryMap.set(id, {
                id: id,
                auditType: pmrModule.shortLabel,
                repere: '-',
                name: "Adhésif de signalisation au sol",
                dimensions: "920x370mm",
                material: material,
                quantity: data.quantity
            });
        });
        
        Object.entries(cogPictoCounts).forEach(([dims, quantity]) => {
            inventoryMap.set(`cog-picto-${dims}`, {
                id: `cog-picto-${dims}`, auditType: cogPictoModule.shortLabel, repere: '-', name: "Pictogramme cognitif",
                dimensions: dims, material: 'Vinyle + Plastification', quantity
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

    }, [lieux]);

    return { globalCounts, ecaBreakdown, maintenanceSummary, adhesiveInventory };
};
