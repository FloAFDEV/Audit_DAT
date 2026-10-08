
import { Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData, PlanQuartierData, AdhesiveStatus, FloorAdhesiveStatus, MaintenanceItem, AuditCategory } from '../types';
import { ADHESIVES, getEcaAdhesiveOccurrences, getPrAdhesives } from '../data/adhesives';
import { getEcaProgress } from './progressCalculators';

/** Description courte des 4 modèles figés (data/signage_seed.ts) — même
 *  liste que csvExporter.ts, chacun avec sa propre présentation locale
 *  (précédent déjà suivi pour PMR/Pictogrammes cognitifs dans ces 2 fichiers). */
const PDQ_MODEL_NAMES: Record<string, string> = {
    'pdq-78x100': 'Plan de quartier 78×100',
    'pdq-78x120': 'Plan de quartier 78×120',
    'pdq-78x120-dibond': 'Plan de quartier 78×120 (dibond)',
    'pdq-adhesif': 'Plan de quartier 78×120 (adhésif)',
    'pem3d-120x80': 'PEM 3D 120×80',
};

const getCategoryForModule = (module: AuditModule): AuditCategory | undefined => {
    if (module.type === AuditModuleType.PR) return 'PR';
    if (module.line === 'A') return 'METRO_A';
    if (module.line === 'B') return 'METRO_B';
    if (module.line === 'C') return 'METRO_C';
    if (module.line === 'AEROPORT') return 'LAE';
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
                    ((module.data as ModeData).stations || []).forEach(s => (s.directions || []).forEach(d => (d.dats || []).forEach(dat => {
                        Object.entries(dat.adhesives || {}).forEach(([adhesiveId, status]) => {
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
                    ((module.data as Pr).zones || []).forEach(z => (z.equipments || []).forEach(eq => {
                        const allPrAdhesives = getPrAdhesives(eq.type);
                        Object.entries(eq.adhesives || {}).forEach(([adhesiveId, status]) => {
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
                    ((module.data as EcaData).ecas || []).forEach(eca => {
                        // Recherche par statusKey (id, ou id@ZH/id@ZB pour eca-1 sur
                        // un ECA d'entrée), avec repli sur legacyStatusKey pour relire
                        // un audit réalisé avant l'introduction des zones (bare
                        // 'eca-1' sur un ECA d'entrée standard — jamais pour un type
                        // PMR, ambigu : cf. getEcaAdhesiveOccurrences /
                        // readEcaAdhesiveStatus pour la même règle côté formulaire).
                        const occurrences = getEcaAdhesiveOccurrences(eca.type);
                        Object.entries(eca.adhesives || {}).forEach(([statusKey, status]) => {
                            const occurrence = occurrences.find(
                                occ => occ.statusKey === statusKey || occ.legacyStatusKey === statusKey
                            );
                            if (!occurrence) return;

                            const item: MaintenanceItem = {
                                ...baseItem,
                                elementName: eca.name,
                                context: eca.accessPoint,
                                adhesiveName: occurrence.zoneLabel ? `${occurrence.name} — ${occurrence.zoneLabel}` : occurrence.name,
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

                    ((module.data as PMRFloorAdhesiveData).adhesives || []).forEach(ad => {
                        const item: MaintenanceItem = {
                            ...baseItem,
                            elementName: "Adhésif au sol",
                            context: pmrContext,
                            adhesiveName: ad.name,
                            status: ad.status as string,
                            photo_base64: ad.photo_base64,
                            photo_rotation: ad.photo_rotation,
                        };
                        if (ad.status === FloorAdhesiveStatus.ToBeReplaced) toBeReplaced.push(item);
                        if (ad.status === FloorAdhesiveStatus.OK) okCount++;
                    });
                    break;
                case AuditModuleType.COGNITIVE_PICTOGRAMS:
                        ((module.data as CognitivePictogramData).pictograms || []).forEach(p => {
                        const item: MaintenanceItem = {
                            ...baseItem,
                            elementName: "Pictogramme cognitif",
                            context: p.accessPointName,
                            stationCode: (module.data as CognitivePictogramData).stationCode,
                            adhesiveName: "Pictogramme",
                            status: p.status as string,
                        };
                        if (p.status === FloorAdhesiveStatus.ToBeReplaced) toBeReplaced.push(item);
                        if (p.status === FloorAdhesiveStatus.OK) okCount++;
                    });
                    break;
                case AuditModuleType.PLAN_QUARTIER: {
                    const data = module.data as PlanQuartierData;
                    (data.occurrences || []).forEach(occ => {
                        // Cataloguée → nom figé du modèle ; découverte non
                        // cataloguée → décrite telle quelle (jamais rattachée
                        // à un modèle qu'elle n'est pas).
                        const elementName = occ.modelId
                            ? (PDQ_MODEL_NAMES[occ.modelId] ?? occ.modelId)
                            : `Découverte non cataloguée : ${occ.adHocLabel ?? '?'}`;
                        const item: MaintenanceItem = {
                            ...baseItem,
                            elementName,
                            context: occ.location || data.stationName,
                            adhesiveName: elementName,
                            status: occ.status as string,
                        };
                        if (occ.status === AdhesiveStatus.ToBeReplaced) toBeReplaced.push(item);
                        if (occ.status === AdhesiveStatus.Absent) absent.push(item);
                        if (occ.status === AdhesiveStatus.OK) okCount++;
                    });
                    break;
                }
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
