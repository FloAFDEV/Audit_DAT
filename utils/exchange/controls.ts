// utils/exchange/controls.ts
// =================================================================
// CONTRÔLES — vue à plat de l'arbre d'audit Tisséo
// -----------------------------------------------------------------
// Un « contrôle » est le plus petit élément dont un agent constate l'état :
// un repère d'adhésif sur un DAT, une borne P+R ou un valideur ECA, un
// adhésif PMR au sol, un pictogramme cognitif, un champ d'un équipement de
// station, une occurrence de plan de quartier.
//
// Chaque contrôle reçoit une CLÉ NATURELLE STABLE, identique d'un appareil
// à l'autre. Les identifiants techniques de l'arbre n'y suffisent pas : le
// seed génère des UUID par appareil pour les DAT, les zones/bornes P+R, les
// ECA, les modules PMR au sol et les pictogrammes — deux tablettes n'ont
// donc jamais le même id pour le même objet physique. La clé repose sur des
// attributs métier stables (id de module déterministe, id de station,
// direction, nom du DAT, accès + numéro ECA, id de repère...).
//
// Lecture ET écriture passent par ce seul parcours : l'export et
// l'application d'une consolidation ne peuvent pas diverger.
// =================================================================

import {
    Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData,
    CognitivePictogramData, PlanQuartierData, PlanQuartierOccurrence, SignaletiqueData,
    AdhesiveStatus, FloorAdhesiveStatus, EquipmentStatusType,
} from '../../types';
import { ADHESIVES, PR_ADHESIVES_BE, PR_ADHESIVES_BS, PR_ADHESIVES_CA, getEcaAdhesiveOccurrences } from '../../data/adhesives';

export const NOT_CHECKED = 'NotChecked';

const ADHESIVE_STATUSES: readonly string[] = Object.values(AdhesiveStatus);
const FLOOR_STATUSES: readonly string[] = Object.values(FloorAdhesiveStatus);
const EQUIPMENT_STATUSES: readonly string[] = [...Object.values(EquipmentStatusType), NOT_CHECKED];

/** Constat nécessitant une intervention — même lecture que l'analyse des
 *  anomalies (utils/anomalyDetector.ts), étendue aux équipements de station. */
const ANOMALY_STATUSES: ReadonlySet<string> = new Set([
    AdhesiveStatus.Absent, AdhesiveStatus.ToBeReplaced,
    FloorAdhesiveStatus.ToBeReplaced,
    EquipmentStatusType.ABSENT, EquipmentStatusType.DEGRADED, EquipmentStatusType.TO_REPLACE, EquipmentStatusType.HS,
]);
export const isAnomalyStatus = (status: string): boolean => ANOMALY_STATUSES.has(status);

/** Description figée d'une occurrence de plan de quartier : permet de la
 *  recréer sur l'instance de consolidation (objet découvert au terrain). */
export type PdqOccurrenceSnapshot = Omit<PlanQuartierOccurrence, 'status' | 'comment' | 'photos' | 'constatedAt' | 'previousConstats'>;

export interface ControlMedia {
    photoId: string;
    takenAt?: string;
}

export interface ControlRef {
    /** Clé naturelle stable : `${audit.id}/${object.id}/${item.id}`. */
    key: string;
    audit: { type: AuditModuleType; id: string; name: string };
    site: { id: string; name: string; code?: string };
    object: { id: string; label: string };
    item: { id: string; label: string };
    status: string;
    /** Commentaire du support le plus proche (DAT, borne, équipement...). */
    comment?: string;
    media?: ControlMedia[];
    occurrence?: PdqOccurrenceSnapshot;
    /** Meilleure date connue du constat dans l'arbre (jamais l'heure courante). */
    knownDate?: string;
    allowedStatuses: readonly string[];
    /** Écrit l'état courant ; `at` = horodatage de l'observation retenue. */
    write: (status: string, at: string) => void;
}

/** Identifiant d'audit stable entre appareils. Les modules PMR au sol ont un
 *  id UUID par appareil : la station et le nom du module (accès) les identifient. */
export const auditKeyOf = (module: AuditModule): string =>
    module.type === AuditModuleType.PMR_FLOOR_ADHESIVE
        ? `pmr-${(module.data as PMRFloorAdhesiveData).stationCode}-${module.name}`
        : module.id;

const validDate = (...candidates: (string | undefined | null)[]): string | undefined =>
    candidates.find(d => !!d && !Number.isNaN(Date.parse(d))) ?? undefined;

const ADHESIVE_NAMES = new Map<string, string>(
    [...ADHESIVES, ...PR_ADHESIVES_BE, ...PR_ADHESIVES_BS, ...PR_ADHESIVES_CA].map(a => [a.id, a.name]),
);

const SIGNALETIQUE_LABELS: Record<keyof SignaletiqueData, string> = {
    totem: 'Totem', biv: 'BIV', planReseau: 'Plan réseau', planQuartier: 'Plan de quartier',
    hap: 'HAP', bandeauStation: 'Bandeau station',
};

/** Champs d'un équipement de station portant un statut (status + sous-éléments). */
const NON_STATUS_FIELDS = new Set(['comment', 'photo_base64', 'photo_note', 'photo_rotation', 'photo_id', 'photo_taken_at', 'dimensions']);

const photoOf = (holder: { photo_id?: string; photo_taken_at?: string }): ControlMedia[] | undefined =>
    holder.photo_id ? [{ photoId: holder.photo_id, ...(holder.photo_taken_at ? { takenAt: holder.photo_taken_at } : {}) }] : undefined;

/**
 * Parcourt tous les contrôles des lieux donnés. Une clé déjà rencontrée
 * (nom de DAT ou d'accès en double) reçoit un suffixe `#n` déterministe.
 */
export const walkControls = (lieux: Lieu[], visit: (control: ControlRef) => void): void => {
    for (const lieu of lieux) {
        const seen = new Map<string, number>();
        const emit = (module: AuditModule, siteCode: string | undefined, c: Omit<ControlRef, 'key' | 'audit' | 'site'>) => {
            const audit = { type: module.type, id: auditKeyOf(module), name: module.name };
            const base = `${audit.id}/${c.object.id}/${c.item.id}`;
            const n = (seen.get(base) ?? 0) + 1;
            seen.set(base, n);
            visit({
                ...c,
                key: n === 1 ? base : `${base}#${n}`,
                audit,
                site: { id: lieu.id, name: lieu.name, ...(siteCode ? { code: siteCode } : {}) },
            });
        };

        for (const module of lieu.modules) {
            switch (module.type) {
                case AuditModuleType.DAT: {
                    for (const station of (module.data as ModeData).stations ?? []) {
                        for (const direction of station.directions ?? []) {
                            for (const dat of direction.dats ?? []) {
                                for (const adhesiveId of Object.keys(dat.adhesives ?? {})) {
                                    emit(module, station.code, {
                                        object: { id: `${station.id}/${direction.id}/${dat.name}`, label: `${station.name} · ${direction.name} · ${dat.name}` },
                                        item: { id: adhesiveId, label: ADHESIVE_NAMES.get(adhesiveId) ?? adhesiveId },
                                        status: dat.adhesives[adhesiveId],
                                        comment: dat.comment || undefined,
                                        knownDate: validDate(dat.completionDate),
                                        allowedStatuses: ADHESIVE_STATUSES,
                                        write: s => { dat.adhesives[adhesiveId] = s as AdhesiveStatus; },
                                    });
                                }
                            }
                        }
                    }
                    break;
                }
                case AuditModuleType.SIGNALETIQUE: {
                    for (const station of (module.data as ModeData).stations ?? []) {
                        const sig = station.signaletique;
                        if (!sig) continue;
                        for (const equipmentType of Object.keys(sig) as (keyof SignaletiqueData)[]) {
                            const group = sig[equipmentType] as unknown as Record<string, Record<string, unknown> | Record<string, unknown>[]>;
                            for (const direction of Object.keys(group ?? {})) {
                                const entry = group[direction];
                                const holders = Array.isArray(entry) ? entry : [entry];
                                holders.forEach((holder, index) => {
                                    if (!holder) return;
                                    for (const field of Object.keys(holder)) {
                                        if (NON_STATUS_FIELDS.has(field)) continue;
                                        const value = holder[field];
                                        if (typeof value !== 'string' || !EQUIPMENT_STATUSES.includes(value)) continue;
                                        const label = `${SIGNALETIQUE_LABELS[equipmentType] ?? equipmentType} ${direction}${holders.length > 1 ? ` n°${index + 1}` : ''}`;
                                        emit(module, station.code, {
                                            object: { id: `${station.id}/${equipmentType}/${direction}/${index}`, label: `${station.name} · ${label}` },
                                            item: { id: field, label: field === 'status' ? 'État général' : field },
                                            status: value,
                                            comment: (holder.comment as string) || undefined,
                                            media: photoOf(holder as { photo_id?: string; photo_taken_at?: string }),
                                            knownDate: validDate(holder.photo_taken_at as string, station.signaletiqueCompletionDate),
                                            allowedStatuses: EQUIPMENT_STATUSES,
                                            write: s => { holder[field] = s; },
                                        });
                                    }
                                });
                            }
                        }
                    }
                    break;
                }
                case AuditModuleType.PR: {
                    for (const zone of (module.data as Pr).zones ?? []) {
                        for (const equipment of zone.equipments ?? []) {
                            for (const adhesiveId of Object.keys(equipment.adhesives ?? {})) {
                                emit(module, undefined, {
                                    object: { id: `${zone.name}/${equipment.name}`, label: `${zone.name} · ${equipment.name}` },
                                    item: { id: adhesiveId, label: ADHESIVE_NAMES.get(adhesiveId) ?? adhesiveId },
                                    status: equipment.adhesives[adhesiveId],
                                    comment: equipment.comment || undefined,
                                    knownDate: validDate(equipment.completionDate),
                                    allowedStatuses: ADHESIVE_STATUSES,
                                    write: s => { equipment.adhesives[adhesiveId] = s as AdhesiveStatus; },
                                });
                            }
                        }
                    }
                    break;
                }
                case AuditModuleType.ECA: {
                    const data = module.data as EcaData;
                    for (const eca of data.ecas ?? []) {
                        // Position source figée à la première trace terrain : la clé
                        // tient même si l'accès ou le numéro est corrigé ensuite.
                        const source = eca.sourceRef ?? { accessPoint: eca.accessPoint, number: eca.number };
                        const names = new Map(getEcaAdhesiveOccurrences(eca.type).map(o => [o.statusKey, o.zoneLabel ? `${o.name} (${o.zoneLabel})` : o.name]));
                        for (const statusKey of Object.keys(eca.adhesives ?? {})) {
                            emit(module, data.stationCode, {
                                object: { id: `${source.accessPoint}/${source.number}`, label: `${eca.accessPoint} · ${eca.name}` },
                                item: { id: statusKey, label: names.get(statusKey) ?? statusKey },
                                status: eca.adhesives[statusKey],
                                comment: eca.comment || undefined,
                                knownDate: validDate(eca.completionDate),
                                allowedStatuses: ADHESIVE_STATUSES,
                                write: s => { eca.adhesives[statusKey] = s as AdhesiveStatus; },
                            });
                        }
                    }
                    break;
                }
                case AuditModuleType.PMR_FLOOR_ADHESIVE: {
                    const data = module.data as PMRFloorAdhesiveData;
                    for (const adhesive of data.adhesives ?? []) {
                        emit(module, data.stationCode, {
                            object: { id: 'sol', label: `${data.stationName} · ${module.name}` },
                            item: { id: adhesive.name, label: adhesive.name },
                            status: adhesive.status,
                            comment: data.comment || undefined,
                            media: photoOf(adhesive),
                            knownDate: validDate(adhesive.photo_taken_at, data.completionDate),
                            allowedStatuses: FLOOR_STATUSES,
                            write: s => { adhesive.status = s as FloorAdhesiveStatus; },
                        });
                    }
                    break;
                }
                case AuditModuleType.COGNITIVE_PICTOGRAMS: {
                    const data = module.data as CognitivePictogramData;
                    for (const pictogram of data.pictograms ?? []) {
                        emit(module, data.stationCode, {
                            object: { id: pictogram.accessPointName, label: `${data.stationName} · ${pictogram.accessPointName}` },
                            item: { id: 'pictogramme', label: 'Pictogramme cognitif' },
                            status: pictogram.status,
                            comment: data.comment || undefined,
                            knownDate: validDate(data.completionDate),
                            allowedStatuses: FLOOR_STATUSES,
                            write: s => { pictogram.status = s as FloorAdhesiveStatus; },
                        });
                    }
                    break;
                }
                case AuditModuleType.PLAN_QUARTIER: {
                    const data = module.data as PlanQuartierData;
                    for (const occurrence of data.occurrences ?? []) {
                        const { status, comment, photos, constatedAt, previousConstats, ...snapshot } = occurrence;
                        emit(module, data.stationCode, {
                            object: { id: occurrence.id, label: `${data.stationName} · ${occurrence.location || occurrence.adHocLabel || occurrence.modelId || 'Plan de quartier'}` },
                            item: { id: 'exemplaire', label: 'Exemplaire' },
                            status,
                            comment: comment || undefined,
                            occurrence: snapshot,
                            knownDate: validDate(constatedAt),
                            allowedStatuses: ADHESIVE_STATUSES,
                            // Même écriture qu'un changement de statut terrain : previousConstats
                            // reste réservé au « Nouveau constat » (l'historique de consolidation
                            // vit dans la table observations).
                            write: (s, at) => {
                                occurrence.status = s as AdhesiveStatus;
                                occurrence.constatedAt = at;
                                data.lastCheckedAt = at;
                            },
                        });
                    }
                    break;
                }
            }
        }
    }
};

/** Index clé → contrôle (lecture/écriture) sur les lieux donnés. */
export const indexControls = (lieux: Lieu[]): Map<string, ControlRef> => {
    const index = new Map<string, ControlRef>();
    walkControls(lieux, c => index.set(c.key, c));
    return index;
};

/** Retrouve un module d'audit par son identifiant stable. */
export const findAudit = (lieux: Lieu[], auditId: string): { lieu: Lieu; module: AuditModule } | undefined => {
    for (const lieu of lieux) {
        const module = lieu.modules.find(m => auditKeyOf(m) === auditId);
        if (module) return { lieu, module };
    }
    return undefined;
};
