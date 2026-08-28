
import { useMemo } from 'react';
import {
    Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, AdhesiveInventoryItem, CognitivePictogramData,
    SignageReference, CustomAuditData, AdhesiveStatus,
} from '../types';
import { isPmrEcaType } from '../data/eca_data';
import { getCognitivePictogramDimension, COGNITIVE_PICTOGRAM_DIMENSIONS } from '../data/cognitive_pictograms';
import { getAllPmrMaterials } from '../data/pmr_materials';
import { AUDIT_MODULES_CONFIG } from '../data/config';
import { CUSTOM_AUDIT_TYPES } from '../data/customAudits';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import { PR_DATA } from '../data/pr_data';
import { EquipmentType, EcaEquipmentType } from '../types';
import { generateMaintenanceSummary } from '../utils/maintenanceGenerator';
import { isModuleInAuditScope } from '../utils/moduleScope';
import { getEffectiveAdhesives, getEffectiveEcaAdhesives, getEffectiveEquipmentAdhesives, splitLegacyPrDescription } from '../utils/effectiveAdhesives';
import { formatDimensions } from '../components/cockpit/labels';

const parseAdhesiveName = (name: string | undefined): { repere: string; name: string } => {
    if (!name) return { repere: '', name: '' };
    const repereMatch = name.match(/^Repère\s+([\w\d]+)\s*-\s*(.*)$/);
    if (repereMatch) {
        return { repere: repereMatch[1], name: repereMatch[2].trim() };
    }
    return { repere: '', name: name };
};

export const useStats = (lieux: Lieu[], signageReferences: SignageReference[]) => {

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
                if (!isModuleInAuditScope(module)) continue;

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
            // moduleCount : nombre de modules d'audit ECA rattachés à la ligne.
            // Sert uniquement à distinguer une ligne DANS le périmètre ECA mais
            // pas encore équipée (modules présents, total à 0 — ligne C
            // aujourd'hui) d'une ligne HORS périmètre, qui n'a aucun module ECA
            // (validation ouverte). Compteur additionnel : aucun total, aucun
            // agrégat existant n'est modifié.
            moduleCount: 0,
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
                if (module.type === AuditModuleType.ECA && isModuleInAuditScope(module)) {
                    const data = module.data as EcaData;
                    const ecas = data.ecas || [];

                    const lineKey = module.line === 'A' ? 'A'
                        : module.line === 'B' ? 'B'
                        : module.line === 'C' ? 'C'
                        : module.line === 'AEROPORT' ? 'AEROPORT'
                        : null;

                    if (lineKey) byLine[lineKey].moduleCount++;

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
            modules: lieu.modules.filter(isModuleInAuditScope)
        }));
        return generateMaintenanceSummary(activeLieux);
    }, [lieux]);

    const adhesiveInventory = useMemo(
        () => computeAdhesiveInventory(lieux, signageReferences),
        [lieux, signageReferences]
    );

    return { globalCounts, ecaBreakdown, maintenanceSummary, adhesiveInventory };
};

/**
 * Extrait de useStats (useMemo) en fonction pure exportée — même patron
 * que utils/cockpit/moduleAdmin.ts / stationAdmin.ts : testable sans
 * harnais de rendu (ce projet n'a pas de dépendance jsdom/testing-library).
 *
 * Source des lignes DAT/P+R/ECA : signageReferences (référentiel
 * administrable), pas les catalogues statiques — une référence créée,
 * renommée ou dont les dimensions/matière ont été corrigées en Admin
 * apparaît donc automatiquement ici ; une référence archivée disparaît.
 * PMR au sol / Pictogrammes cognitifs / Signalétique restent sur leurs
 * catalogues statiques existants (hors périmètre du référentiel
 * administrable — inchangé, aucune régression possible sur ces trois-là).
 *
 * Contenu (dimensions/matière) : pour une référence qui porte encore son
 * texte historique (legacyDescription), on réutilise EXACTEMENT l'ancien
 * découpage (« | » pour DAT, « // » pour P+R/ECA) — comportement identique
 * aux 38 références historiques, garanti par le test de caractérisation.
 * Une référence Admin sans texte historique (nouvelle création) utilise
 * directement ses champs structurés (dimensions/material) — c'est la
 * seule situation nouvelle, qui n'existait simplement pas avant.
 *
 * Quantités : dérivées de getEffective*Adhesives (utils/effectiveAdhesives.ts,
 * déjà utilisé par les formulaires terrain) au lieu des listes statiques —
 * une référence Admin ajoutée au périmètre DAT/P+R/ECA compte donc aussi
 * dans la quantité réseau, sans code spécifique par référence.
 *
 * Audits configurables (`data/customAudits.ts`, registre en dur) : chaque
 * audit du registre produit une ligne par référence CUSTOM lui appartenant
 * — le nom de l'audit sert de colonne « Type » (pas un shortLabel figé :
 * plusieurs audits coexistent). Retirer un audit du registre le fait
 * disparaître de la Nomenclature courante SANS toucher aux modules déjà
 * matérialisés — leurs statuts restent en base, simplement non agrégés
 * ici. Quantité : compte chaque occurrence dont le statut n'est PAS
 * NotApplicable (CUSTOM n'a pas de catalogue historique — referenceId
 * désigne directement un id de signageReferences).
 */
export const computeAdhesiveInventory = (
    lieux: Lieu[], references: SignageReference[],
): AdhesiveInventoryItem[] => {
        const inventoryMap = new Map<string, AdhesiveInventoryItem>();
        const quantityMap = new Map<string, number>();
        const auditModules = AUDIT_MODULES_CONFIG;

        const addQty = (id: string, n: number) => quantityMap.set(id, (quantityMap.get(id) || 0) + n);

        /** Découpe legacyDescription EXACTEMENT comme l'ancien code découpait
         *  ad.description — zéro écart pour les références historiques.
         *  Cas P+R : legacyDescription porte AUSSI la localisation, ajoutée
         *  au seed via PR_LOCATION_SEPARATOR (splitLegacyPrDescription) —
         *  il faut la retirer d'abord pour retrouver le texte original
         *  (ad.description) que l'ancien code découpait réellement. */
        const buildRowsFromReferences = (refs: SignageReference[], auditType: string, isPr: boolean) => {
            refs.filter(ref => !ref.archivedAt).forEach(ref => {
                if (inventoryMap.has(ref.id)) return;
                const { repere, name } = parseAdhesiveName(ref.name);
                const legacyText = isPr
                    ? splitLegacyPrDescription(ref.legacyDescription, '', '').description
                    : (ref.legacyDescription ?? '');
                let dimensions = '';
                let material = legacyText;
                if (legacyText.includes('|')) {
                    [dimensions, material] = legacyText.split('|').map(s => s.trim());
                } else if (legacyText.includes('//')) {
                    [material, dimensions] = legacyText.split('//').map(s => s.trim());
                }
                if (!dimensions && !material) {
                    // Aucun texte historique (référence créée en Admin) :
                    // les champs structurés réels du référentiel.
                    dimensions = formatDimensions(ref.dimensions);
                    material = ref.material ?? '';
                }
                inventoryMap.set(ref.id, { id: ref.id, auditType, repere, name, dimensions, material, quantity: 0 });
            });
        };

        // signageReferences peut être momentanément vide pendant le chargement
        // asynchrone du hook appelant (ex. useSignageReferences dans
        // SyntheseView, avant sa première résolution Dexie) — jamais en usage
        // normal (le seed garantit toujours les ids historiques). Dans cette
        // fenêtre transitoire, on n'appelle pas getEffective*Adhesives (qui
        // lèverait sur un id historique manquant, garde-fou volontaire) et on
        // laisse simplement la Nomenclature se compléter au rendu suivant,
        // quand useMemo recalcule avec les références réellement chargées.
        const referencesReady = references.length > 0;

        const datConfig = auditModules.find(c=>c.type === AuditModuleType.DAT);
        if (datConfig && referencesReady) buildRowsFromReferences(references.filter(r => r.auditType === 'DAT'), datConfig.shortLabel, false);

        const prConfig = auditModules.find(c=>c.type === AuditModuleType.PR);
        if (prConfig && referencesReady) buildRowsFromReferences(references.filter(r => r.auditType === 'PR'), prConfig.shortLabel, true);

        const ecaConfig = auditModules.find(c=>c.type === AuditModuleType.ECA);
        if (ecaConfig && referencesReady) buildRowsFromReferences(references.filter(r => r.auditType === 'ECA'), ecaConfig.shortLabel, false);

        // Audits configurables — une ligne par audit du registre en dur,
        // jamais un libellé générique : chaque audit garde son identité
        // dans la colonne « Type ».
        if (referencesReady) {
            CUSTOM_AUDIT_TYPES.forEach(def => {
                const defRefs = references.filter(
                    r => r.scope.auditType === 'CUSTOM' && r.scope.definitionId === def.id
                );
                buildRowsFromReferences(defRefs, def.name, false);
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
                if (!isModuleInAuditScope(module)) continue;

                if (module.type === AuditModuleType.DAT && referencesReady) {
                    const datsCount = (module.data as ModeData).stations?.reduce((sum, s) =>
                        sum + (s.directions?.reduce((dSum, d) => dSum + (d.dats?.length || 0), 0) || 0), 0) || 0;
                    getEffectiveAdhesives(references).forEach(ad => addQty(ad.id, datsCount));
                }

                if (module.type === AuditModuleType.PR && referencesReady) {
                    for (const zone of (module.data as Pr).zones) {
                        for (const equip of zone.equipments) {
                            getEffectiveEquipmentAdhesives(references, equip.type, equip.adhesiveIds).forEach(ad => addQty(ad.id, 1));
                        }
                    }
                }

                if (module.type === AuditModuleType.ECA && referencesReady) {
                    for (const eca of ((module.data as EcaData).ecas || [])) {
                        getEffectiveEcaAdhesives(references, eca.type).forEach(ad => addQty(ad.id, 1));
                    }
                }

                if (module.type === AuditModuleType.CUSTOM && referencesReady) {
                    // Quantité RECENSÉE = nombre d'objets physiques réellement
                    // suivis (occurrences) pour cette référence — PAS une
                    // notion de « posé »/« conforme ». Un objet constaté
                    // Absent lors du dernier passage reste un élément du
                    // patrimoine suivi (son historique, son emplacement, son
                    // format restent exploitables) : il continue de compter
                    // ici. Contrairement à DAT/PR/ECA ci-dessus (comptage
                    // STRUCTUREL : un équipement physique porte par
                    // construction tous ses adhésifs effectifs), un audit
                    // configurable ne présume RIEN sur ce qu'une station
                    // porte — c'est justement ce que le relevé terrain
                    // découvre : la quantité est donc le nombre d'occurrences
                    // réellement recensées, ni plus ni moins. Seul un statut
                    // Non applicable (variante non concernée) exclut
                    // l'occurrence, par cohérence avec le reste du fichier.
                    const data = module.data as CustomAuditData;
                    const defRefIds = new Set(
                        references
                            .filter(r => r.scope.auditType === 'CUSTOM' && r.scope.definitionId === data.definitionId && !r.archivedAt)
                            .map(r => r.id)
                    );
                    for (const occ of data.occurrences ?? []) {
                        if (!defRefIds.has(occ.referenceId)) continue; // référence depuis archivée : sort de l'inventaire courant
                        if (occ.status === AdhesiveStatus.NotApplicable) continue;
                        addQty(occ.referenceId, 1);
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
};
