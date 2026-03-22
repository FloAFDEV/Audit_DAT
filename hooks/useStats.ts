
import { useMemo } from 'react';
import { 
    Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, AdhesiveInventoryItem
} from '../types';
import { isPmrEcaType } from '../data/eca_data';
import { getEcaAdhesives, getPrAdhesives, ADHESIVES } from '../data/adhesives';
import { getCognitivePictogramDimension, COGNITIVE_PICTOGRAM_DIMENSIONS } from '../data/cognitive_pictograms';
import { getAllPmrMaterials } from '../data/pmr_materials';
import { AUDIT_MODULES_CONFIG } from '../data/config';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import { PR_DATA } from '../data/pr_data';
import { EquipmentType, EcaEquipmentType } from '../types';
import { generateMaintenanceSummary } from '../utils/maintenanceGenerator';

const parseAdhesiveName = (name: string | undefined): { repere: string; name: string } => {
    if (!name) return { repere: '', name: '' };
    const repereMatch = name.match(/^Repère\s+([\w\d]+)\s*-\s*(.*)$/);
    if (repereMatch) {
        return { repere: repereMatch[1], name: repereMatch[2].trim() };
    }
    return { repere: '', name: name };
};

export const useStats = (lieux: Lieu[]) => {

    const globalCounts = useMemo(() => {
        let datCount = 0;
        let datCountA = 0;
        let datCountB = 0;
        let datCountC = 0;
        let datCountAero = 0;
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
        let cogPictoCountC = 0;
        let cogPictoCountAero = 0;
        let pmrFloorAdhesiveCount = 0;
        let pmrFloorAdhesiveCountA = 0;
        let pmrFloorAdhesiveCountB = 0;
        let pmrFloorAdhesiveCountC = 0;
        let pmrFloorAdhesiveCountAero = 0;
        let signaletiqueCount = 0;
        let signaletiqueCountTram = 0;
        let signaletiqueCountAero = 0;
        const prCount = PR_DATA.length;

        const stationCountA = LINE_A_STATIONS.filter(s => !s.isFuture).length;
        const stationCountB = LINE_B_STATIONS.filter(s => !s.isFuture).length;
        const stationCountC = LINE_C_STATIONS.length; // Count all for C as it's future but we audit it
        const stationCountAero = (TRAM_STATIONS.filter(s => s.lines.includes('AEROPORT')).length || 0);
        const stationCountTram = TRAM_STATIONS.filter(s => !s.isFuture).length;
        const stationCountTeleo = TELEO_STATIONS.filter(s => !s.isFuture).length;
        const stationCountTotal = stationCountA + stationCountB + stationCountC + stationCountAero + stationCountTram + stationCountTeleo;

        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                // For C and AEROPORT, we want to see stats even if isFuture is true
                if (module.isFuture && module.line !== 'C' && module.line !== 'AEROPORT') continue;
                
                switch (module.type) {
                    case AuditModuleType.DAT:
                        const datsInModule = (module.data as ModeData).stations?.reduce((sum, s) => 
                            sum + (s.directions?.reduce((dSum, d) => dSum + (d.dats?.length || 0), 0) || 0), 0) || 0;
                        datCount += datsInModule;
                        if (module.line === 'A') datCountA += datsInModule;
                        else if (module.line === 'B') datCountB += datsInModule;
                        else if (module.line === 'C') datCountC += datsInModule;
                        else if (module.line === 'AEROPORT') datCountAero += datsInModule;
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
                        const ecas = (module.data as EcaData).ecas || [];
                        ecaCount += ecas.length;
                        ecaPmrCount += ecas.filter(e => isPmrEcaType(e.type)).length;
                        break;
                    case AuditModuleType.COGNITIVE_PICTOGRAMS:
                        cogPictoCount++;
                        if (module.line === 'A') {
                            cogPictoCountA++;
                        } else if (module.line === 'B') {
                            cogPictoCountB++;
                        } else if (module.line === 'C') {
                            cogPictoCountC++;
                        } else if (module.line === 'AEROPORT') {
                            cogPictoCountAero++;
                        }
                        break;
                    case AuditModuleType.PMR_FLOOR_ADHESIVE:
                        pmrFloorAdhesiveCount++;
                        if (module.line === 'A') {
                            pmrFloorAdhesiveCountA++;
                        } else if (module.line === 'B') {
                            pmrFloorAdhesiveCountB++;
                        } else if (module.line === 'C') {
                            pmrFloorAdhesiveCountC++;
                        } else if (module.line === 'AEROPORT') {
                            pmrFloorAdhesiveCountAero++;
                        }
                        break;
                    case AuditModuleType.SIGNALETIQUE:
                        signaletiqueCount++;
                        if (module.line === 'TRAM') signaletiqueCountTram++;
                        else if (module.line === 'AEROPORT') signaletiqueCountAero++;
                        break;
                }
            }
        }
        return { 
            datCount, datCountA, datCountB, datCountC, datCountAero, datCountTram, datCountTeleo,
            beCount, bsCount, caCount, prCount,
            ecaCount, ecaPmrCount,
            cogPictoCount, cogPictoCountA, cogPictoCountB, cogPictoCountC, cogPictoCountAero,
            pmrFloorAdhesiveCount, pmrFloorAdhesiveCountA, pmrFloorAdhesiveCountB, pmrFloorAdhesiveCountC, pmrFloorAdhesiveCountAero,
            signaletiqueCount, signaletiqueCountTram, signaletiqueCountAero,
            stationCountTotal, stationCountA, stationCountB,
            stationCountC, stationCountAero, stationCountTram, stationCountTeleo
        };
    }, [lieux]);

    const ecaBreakdown = useMemo(() => {
        const byLine = {
            A: { total: 0, pmr: 0 },
            B: { total: 0, pmr: 0 },
            C: { total: 0, pmr: 0 },
            AEROPORT: { total: 0, pmr: 0 },
            total: 0
        };
        
        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                if (module.type === AuditModuleType.ECA && (!module.isFuture || module.line === 'C' || module.line === 'AEROPORT')) {
                    const data = module.data as EcaData;
                    const ecas = data.ecas || [];
                    const count = ecas.length;
                    const pmrInModule = ecas.filter(e => isPmrEcaType(e.type)).length;
                    
                    if (module.line === 'A') {
                        byLine.A.total += count;
                        byLine.A.pmr += pmrInModule;
                    } else if (module.line === 'B') {
                        byLine.B.total += count;
                        byLine.B.pmr += pmrInModule;
                    } else if (module.line === 'C') {
                        byLine.C.total += count;
                        byLine.C.pmr += pmrInModule;
                    } else if (module.line === 'AEROPORT') {
                        byLine.AEROPORT.total += count;
                        byLine.AEROPORT.pmr += pmrInModule;
                    }
                }
            }
        }
        byLine.total = byLine.A.total + byLine.B.total + byLine.C.total + byLine.AEROPORT.total;
        
        return { byLine };
    }, [lieux]);

    const maintenanceSummary = useMemo(() => {
        // Filter out future modules before passing to generator for live stats
        const activeLieux = lieux.map(lieu => ({
            ...lieu,
            modules: lieu.modules.filter(m => !m.isFuture)
        }));
        return generateMaintenanceSummary(activeLieux);
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
        
        const datConfig = auditModules.find(c=>c.type === AuditModuleType.DAT);
        if (datConfig) processAdhesiveList(ADHESIVES, datConfig.shortLabel);

        const prConfig = auditModules.find(c=>c.type === AuditModuleType.PR);
        if (prConfig) {
            processAdhesiveList(getPrAdhesives(EquipmentType.BE), prConfig.shortLabel);
            processAdhesiveList(getPrAdhesives(EquipmentType.BS), prConfig.shortLabel);
            processAdhesiveList(getPrAdhesives(EquipmentType.CA), prConfig.shortLabel);
        }
        
        const ecaConfig = auditModules.find(c=>c.type === AuditModuleType.ECA);
        if (ecaConfig) {
            Object.values(EcaEquipmentType).forEach(type => {
                processAdhesiveList(getEcaAdhesives(type), ecaConfig.shortLabel);
            });
        }
        
        const pmrModule = auditModules.find(c=>c.type === AuditModuleType.PMR_FLOOR_ADHESIVE);
        if (pmrModule) {
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
        }

        const cogPictoModule = auditModules.find(c=>c.type === AuditModuleType.COGNITIVE_PICTOGRAMS);
        if (cogPictoModule) {
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
        }
        
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
