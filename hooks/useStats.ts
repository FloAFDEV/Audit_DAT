
import { useMemo } from 'react';
import {
    Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, AdhesiveInventoryItem, CognitivePictogramData
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
                    case AuditModuleType.COGNITIVE_PICTOGRAMS: {
                        const pictoCount = ((module.data as CognitivePictogramData).pictograms ?? []).length;
                        cogPictoCount += pictoCount;
                        if (module.line === 'A') cogPictoCountA += pictoCount;
                        else if (module.line === 'B') cogPictoCountB += pictoCount;
                        else if (module.line === 'C') cogPictoCountC += pictoCount;
                        else if (module.line === 'AEROPORT') cogPictoCountAero += pictoCount;
                        break;
                    }
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
        const makeLineEntry = () => ({
            total: 0, pmr: 0,
            byType: {
                [EcaEquipmentType.TripodeEntree]: 0,
                [EcaEquipmentType.TripodeSortie]: 0,
                [EcaEquipmentType.VantauxEntree]: 0,
                [EcaEquipmentType.VantauxSortie]: 0,
                [EcaEquipmentType.VantauxReversible]: 0,
                [EcaEquipmentType.PMRBras]: 0,
                [EcaEquipmentType.PMRVantaux]: 0,
                [EcaEquipmentType.PMRVantauxReversible]: 0,
            } as Record<string, number>,
        });

        const byLine = {
            A: makeLineEntry(),
            B: makeLineEntry(),
            C: makeLineEntry(),
            AEROPORT: makeLineEntry(),
            total: 0,
        };
        const byType: Record<string, number> = {
            [EcaEquipmentType.TripodeEntree]: 0,
            [EcaEquipmentType.TripodeSortie]: 0,
            [EcaEquipmentType.VantauxEntree]: 0,
            [EcaEquipmentType.VantauxSortie]: 0,
            [EcaEquipmentType.VantauxReversible]: 0,
            [EcaEquipmentType.PMRBras]: 0,
            [EcaEquipmentType.PMRVantaux]: 0,
            [EcaEquipmentType.PMRVantauxReversible]: 0,
        };

        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                if (module.type === AuditModuleType.ECA && (!module.isFuture || module.line === 'C' || module.line === 'AEROPORT')) {
                    const data = module.data as EcaData;
                    const ecas = data.ecas || [];

                    const lineKey = module.line === 'A' ? 'A'
                        : module.line === 'B' ? 'B'
                        : module.line === 'C' ? 'C'
                        : module.line === 'AEROPORT' ? 'AEROPORT'
                        : null;

                    for (const eca of ecas) {
                        if (lineKey) {
                            byLine[lineKey].total++;
                            if (isPmrEcaType(eca.type)) byLine[lineKey].pmr++;
                            if (eca.type in byLine[lineKey].byType) byLine[lineKey].byType[eca.type]++;
                        }
                        if (eca.type in byType) byType[eca.type]++;
                    }
                }
            }
        }
        byLine.total = byLine.A.total + byLine.B.total + byLine.C.total + byLine.AEROPORT.total;

        return { byLine, byType };
    }, [lieux]);

    const maintenanceSummary = useMemo(() => {
        // Filter out future modules before passing to generator for live stats,
        // but keep auditable future modules (Line C and AEROPORT).
        const activeLieux = lieux.map(lieu => ({
            ...lieu,
            modules: lieu.modules.filter(m => {
                const isAuditableFuture = m.isFuture && (m.line === 'C' || m.line === 'AEROPORT');
                return !m.isFuture || isAuditableFuture;
            })
        }));
        return generateMaintenanceSummary(activeLieux);
    }, [lieux]);

    const adhesiveInventory = useMemo(() => {
        const inventoryMap = new Map<string, AdhesiveInventoryItem>();
        const quantityMap = new Map<string, number>();
        const auditModules = AUDIT_MODULES_CONFIG;

        const addQty = (id: string, n: number) => quantityMap.set(id, (quantityMap.get(id) || 0) + n);

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
                if (!inventoryMap.has(ad.id)) {
                    inventoryMap.set(ad.id, { id: ad.id, auditType, repere, name, dimensions, material, quantity: 0 });
                }
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
                if (!inventoryMap.has(id)) {
                    inventoryMap.set(id, {
                        id, auditType: pmrModule.shortLabel, repere: '-',
                        name: "Adhésif de signalisation au sol", dimensions: "920x370mm", material, quantity: 0,
                    });
                }
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
                const id = `cog-picto-${dims}`;
                if (!inventoryMap.has(id)) {
                    inventoryMap.set(id, {
                        id, auditType: cogPictoModule.shortLabel, repere: '-', name: "Pictogramme cognitif",
                        dimensions: dims, material: 'Vinyle + Plastification', quantity: 0,
                    });
                }
            });
        }

        const signConfig = auditModules.find(c => c.type === AuditModuleType.SIGNALETIQUE);
        if (signConfig) {
            const signItems = [
                { id: 'sign-totem',         name: 'Totem',                    dimensions: '61,6 x 91,6 cm', material: 'Aluminium + façade' },
                { id: 'sign-biv',           name: 'BIV (écran dynamique)',     dimensions: 'Variable',        material: 'Écran dynamique' },
                { id: 'sign-plan-reseau',   name: 'Plan du réseau',            dimensions: '80 x 100 cm',     material: 'Vinyle' },
                { id: 'sign-plan-quartier', name: 'Plan de quartier',          dimensions: '80 x 100 cm',     material: 'Vinyle' },
                { id: 'sign-hap',           name: 'HAP (fiche horaire)',        dimensions: 'Variable',        material: 'Papier' },
                { id: 'sign-bandeau',       name: 'Bandeau de station',        dimensions: '80 x 29 cm',      material: 'Aluminium + façade' },
            ];
            signItems.forEach(item => {
                if (!inventoryMap.has(item.id)) {
                    inventoryMap.set(item.id, {
                        id: item.id, auditType: signConfig.shortLabel,
                        repere: '-', name: item.name,
                        dimensions: item.dimensions, material: item.material, quantity: 0,
                    });
                }
            });
        }

        // --- Compute quantities from lieux ---
        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                if (module.isFuture && module.line !== 'C' && module.line !== 'AEROPORT') continue;

                if (module.type === AuditModuleType.DAT) {
                    const datsCount = (module.data as ModeData).stations?.reduce((sum, s) =>
                        sum + (s.directions?.reduce((dSum, d) => dSum + (d.dats?.length || 0), 0) || 0), 0) || 0;
                    ADHESIVES.forEach(ad => addQty(ad.id, datsCount));
                }

                if (module.type === AuditModuleType.PR) {
                    for (const zone of (module.data as Pr).zones) {
                        for (const equip of zone.equipments) {
                            getPrAdhesives(equip.type).forEach(ad => addQty(ad.id, 1));
                        }
                    }
                }

                if (module.type === AuditModuleType.ECA) {
                    for (const eca of ((module.data as EcaData).ecas || [])) {
                        getEcaAdhesives(eca.type).forEach(ad => addQty(ad.id, 1));
                    }
                }

                if (module.type === AuditModuleType.PMR_FLOOR_ADHESIVE) {
                    getAllPmrMaterials().forEach(material => {
                        addQty(`pmr-sol-${material.replace(/[^a-zA-Z0-9]/g, '-')}`, 1);
                    });
                }

                if (module.type === AuditModuleType.COGNITIVE_PICTOGRAMS) {
                    const cogData = module.data as CognitivePictogramData;
                    for (const picto of (cogData.pictograms || [])) {
                        const dim = getCognitivePictogramDimension(cogData.stationCode, picto.accessPointName);
                        addQty(`cog-picto-${dim}`, 1);
                    }
                }

                if (module.type === AuditModuleType.SIGNALETIQUE) {
                    for (const station of (module.data as ModeData).stations) {
                        const sig = station.signaletique;
                        if (!sig) continue;
                        addQty('sign-totem', 2); // direction1 + direction2
                        addQty('sign-biv', (sig.biv?.meett?.length || 0) + (sig.biv?.pdj?.length || 0));
                        addQty('sign-plan-reseau', (sig.planReseau?.meett?.length || 0) + (sig.planReseau?.pdj?.length || 0));
                        addQty('sign-plan-quartier', (sig.planQuartier?.meett?.length || 0) + (sig.planQuartier?.pdj?.length || 0));
                        addQty('sign-hap', (sig.hap?.meett?.length || 0) + (sig.hap?.pdj?.length || 0));
                        addQty('sign-bandeau', 2); // direction1 + direction2
                    }
                }
            }
        }

        // Merge quantities into inventory items
        inventoryMap.forEach((item, id) => {
            item.quantity = quantityMap.get(id) || 0;
        });

        return Array.from(inventoryMap.values()).sort((a, b) => {
            const typeCompare = a.auditType.localeCompare(b.auditType);
            if (typeCompare !== 0) return typeCompare;

            const repA = parseInt(a.repere, 10);
            const repB = parseInt(b.repere, 10);
            const isRepANumeric = !isNaN(repA);
            const isRepBNumeric = !isNaN(repB);

            if (isRepANumeric && isRepBNumeric) {
                if (repA !== repB) return repA - repB;
            } else if (isRepANumeric) {
                return -1;
            } else if (isRepBNumeric) {
                return 1;
            }
            return a.name.localeCompare(b.name);
        });

    }, [lieux]);

    return { globalCounts, ecaBreakdown, maintenanceSummary, adhesiveInventory };
};
