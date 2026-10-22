// utils/ecaFieldCorrection.ts
// =================================================================
// Corrections terrain des ECA (valideurs) — règles pures, sans accès base.
//
// Identité d'un ECA : id du module + accès + numéro. L'id d'un ECA porte un
// suffixe aléatoire (data/builder.ts) et change à chaque reconstruction ; le
// numéro seul n'est pas unique (Jean-Jaurès : n°1–3 en Accès Historique ET
// Principal, n°8–11 en Liaison B→A ET Accès Jaurès A). La position source
// (accès + numéro) est figée dans `sourceRef` à la première trace terrain.
//
// Périmètre : valideurs hors PMR. Tout changement impliquant un type PMR
// garde le comportement historique (cf. store.ts::handleUpdateEca).
// =================================================================
import { AdhesiveStatus, AuditModule, AuditModuleType, ECA, EcaData, EcaEquipmentType, Lieu } from '../types';
import { getEcaAdhesiveOccurrences } from '../data/adhesives';
import { canEcaBeNotApplicable, ECA_DEFINITIONS, isPmrEcaType } from '../data/eca_data';
import { ECA_FIELD_VERIFICATION } from '../data/ecaFieldVerification';
import { getEcaProgress } from './progressCalculators';

// -----------------------------------------------------------------
// Type physique / sens de fonctionnement (lecture seule, hors PMR)
// -----------------------------------------------------------------
export type EcaPhysicalType = 'tripode' | 'vantaux';
export type EcaOperatingDirection = 'entree' | 'sortie' | 'reversible';

const NON_PMR_TYPES: Record<string, { physical: EcaPhysicalType; direction: EcaOperatingDirection }> = {
    [EcaEquipmentType.TripodeEntree]: { physical: 'tripode', direction: 'entree' },
    [EcaEquipmentType.TripodeSortie]: { physical: 'tripode', direction: 'sortie' },
    [EcaEquipmentType.VantauxEntree]: { physical: 'vantaux', direction: 'entree' },
    [EcaEquipmentType.VantauxSortie]: { physical: 'vantaux', direction: 'sortie' },
    [EcaEquipmentType.VantauxReversible]: { physical: 'vantaux', direction: 'reversible' },
};

/** Type physique d'un valideur hors PMR ; null pour un PMR. */
export const getEcaPhysicalType = (type: EcaEquipmentType): EcaPhysicalType | null => NON_PMR_TYPES[type]?.physical ?? null;

/** Sens de fonctionnement déclaré d'un valideur hors PMR ; null pour un PMR. */
export const getEcaOperatingDirection = (type: EcaEquipmentType): EcaOperatingDirection | null => NON_PMR_TYPES[type]?.direction ?? null;

// -----------------------------------------------------------------
// Identité
// -----------------------------------------------------------------
export interface EcaSourceKey { accessPoint: string; number: number }

/** Position source de l'ECA : `sourceRef` si figée, sinon position courante. */
export const ecaSourceKey = (eca: ECA): EcaSourceKey =>
    eca.sourceRef ?? { accessPoint: eca.accessPoint, number: eca.number };

export const ecaIdentityKey = (moduleId: string, key: EcaSourceKey): string =>
    `${moduleId}|${key.accessPoint}|${key.number}`;

const sameKey = (a: EcaSourceKey, b: EcaSourceKey) => a.accessPoint === b.accessPoint && a.number === b.number;

/** Les ECA d'une liste désignés par cette clé (par position source). */
export const findEcasByKey = (ecas: ECA[], key: EcaSourceKey): ECA[] => ecas.filter(e => sameKey(ecaSourceKey(e), key));

const hasFieldTrace = (eca: ECA) => !!eca.fieldTypeCorrection || !!eca.fieldVerifiedAt;

/** Non audité, au sens strict : aucun statut saisi, aucune date
 *  d'achèvement, pas « non applicable », commentaire vide, aucune trace
 *  terrain ni statut archivé. */
export const isEcaUnaudited = (eca: ECA): boolean =>
    Object.values(eca.adhesives ?? {}).every(s => s === AdhesiveStatus.NotChecked)
    && !eca.completionDate && !eca.isNotApplicable && (eca.comment ?? '') === ''
    && !hasFieldTrace(eca) && Object.keys(eca.archivedAdhesives ?? {}).length === 0;

const initialStatuses = (type: EcaEquipmentType): { [key: string]: AdhesiveStatus } =>
    Object.fromEntries(getEcaAdhesiveOccurrences(type).map(occ => [occ.statusKey, AdhesiveStatus.NotChecked]));

const isNonPmr = (type: EcaEquipmentType) => getEcaPhysicalType(type) !== null;

// -----------------------------------------------------------------
// Changement de type sur le terrain (hors PMR)
// -----------------------------------------------------------------
export interface EcaAdhesiveTransition {
    adhesives: { [key: string]: AdhesiveStatus };
    archivedAdhesives: { [key: string]: AdhesiveStatus };
    /** Clés courantes mises en archive (devenues inapplicables). */
    archived: string[];
    /** Clés reprises de l'archive. */
    restored: string[];
}

/**
 * Statuts d'adhésifs après passage de `eca.type` à `newType`. Un statut
 * n'est conservé que pour une occurrence portée par les deux types (même
 * clé = même adhésif catalogue, même zone). Les autres statuts saisis
 * passent en archive, jamais supprimés ; une occurrence du nouveau type
 * présente en archive y est reprise. Les occurrences restantes démarrent
 * « non contrôlé ».
 */
export const transitionEcaAdhesives = (eca: ECA, newType: EcaEquipmentType): EcaAdhesiveTransition => {
    const current = { ...(eca.adhesives ?? {}) };
    const archive = { ...(eca.archivedAdhesives ?? {}) };
    const adhesives: { [key: string]: AdhesiveStatus } = {};
    const restored: string[] = [];
    for (const occ of getEcaAdhesiveOccurrences(newType)) {
        const keys = [occ.statusKey, ...(occ.legacyStatusKey ? [occ.legacyStatusKey] : [])];
        const fromCurrent = keys.find(k => current[k] !== undefined);
        if (fromCurrent !== undefined) {
            adhesives[occ.statusKey] = current[fromCurrent];
            delete current[fromCurrent];
            continue;
        }
        const fromArchive = keys.find(k => archive[k] !== undefined);
        if (fromArchive !== undefined) {
            adhesives[occ.statusKey] = archive[fromArchive];
            delete archive[fromArchive];
            restored.push(occ.statusKey);
            continue;
        }
        adhesives[occ.statusKey] = AdhesiveStatus.NotChecked;
    }
    const archived = Object.keys(current);
    return { adhesives, archivedAdhesives: { ...archive, ...current }, archived, restored };
};

export type EcaEditPatch = Partial<Omit<ECA, 'adhesives' | 'comment'>> & { id: string };

export interface EcaEditResult {
    eca: ECA;
    /** Présent pour un changement de type hors PMR (tracé). */
    typeChange?: { from: EcaEquipmentType; to: EcaEquipmentType; archived: string[]; restored: string[] };
}

/**
 * Applique une édition de la fenêtre ECA. Hors PMR, un changement de type
 * conserve les statuts compatibles, archive les autres, garde le commentaire
 * et trace la correction (type initial, date). Revenir au type initial
 * retire la correction. Dès qu'un type PMR est en jeu : comportement
 * historique (statuts réinitialisés), sans trace.
 */
export const applyEcaEdit = (original: ECA, patch: EcaEditPatch, nowIso: string): EcaEditResult => {
    const eca: ECA = { ...original, ...patch };
    let typeChange: EcaEditResult['typeChange'];
    const newType = patch.type;
    const typeChanged = newType !== undefined && newType !== original.type;

    if (typeChanged && isNonPmr(original.type) && isNonPmr(newType)) {
        const t = transitionEcaAdhesives(original, newType);
        eca.adhesives = t.adhesives;
        if (Object.keys(t.archivedAdhesives).length > 0) eca.archivedAdhesives = t.archivedAdhesives;
        else delete eca.archivedAdhesives;
        eca.sourceRef = original.sourceRef ?? { accessPoint: original.accessPoint, number: original.number };
        const initialType = original.fieldTypeCorrection?.initialType ?? original.type;
        if (newType === initialType) delete eca.fieldTypeCorrection;
        else eca.fieldTypeCorrection = { initialType, correctedAt: nowIso };
        typeChange = { from: original.type, to: newType, archived: t.archived, restored: t.restored };
    } else if (typeChanged) {
        eca.adhesives = initialStatuses(newType);
        delete eca.completionDate;
    }

    if ('fieldVerifiedAt' in patch && !eca.fieldVerifiedAt) delete eca.fieldVerifiedAt;
    if (eca.fieldVerifiedAt && !eca.sourceRef) eca.sourceRef = { accessPoint: original.accessPoint, number: original.number };

    if (!canEcaBeNotApplicable(eca.type)) delete eca.isNotApplicable;
    if (eca.isNotApplicable) eca.completionDate = nowIso;
    else if (typeChange) {
        const complete = getEcaProgress(eca).isComplete;
        if (!complete) delete eca.completionDate;
        else if (!eca.completionDate) eca.completionDate = nowIso;
    }
    return { eca, typeChange };
};

// -----------------------------------------------------------------
// Report des traces terrain sur des modules reconstruits depuis la source
// -----------------------------------------------------------------
export interface EcaCarryOverResult {
    carried: number;
    /** Traces non reportées faute de correspondance certaine (clé absente
     *  ou ambiguë) — conservées dans l'archive de la réinitialisation. */
    unmatched: Array<{ moduleId: string; eca: ECA }>;
}

/**
 * Reporte corrections et vérifications terrain des ECA de `previous` sur
 * les ECA reconstruits de `fresh` (mutés), par id de module + position
 * source, uniquement si la correspondance est unique des deux côtés.
 * L'avancement n'est jamais reporté : un type corrigé repart de statuts
 * « non contrôlé ». Les valideurs PMR ne sont pas concernés.
 */
export const carryOverEcaFieldTraces = (previous: AuditModule[], fresh: AuditModule[]): EcaCarryOverResult => {
    const result: EcaCarryOverResult = { carried: 0, unmatched: [] };
    const freshById = new Map(fresh.filter(m => m.type === AuditModuleType.ECA).map(m => [m.id, m]));
    for (const prevModule of previous) {
        if (prevModule.type !== AuditModuleType.ECA) continue;
        const prevEcas = (prevModule.data as EcaData).ecas ?? [];
        for (const prev of prevEcas) {
            if (!hasFieldTrace(prev)) continue;
            const key = ecaSourceKey(prev);
            const freshModule = freshById.get(prevModule.id);
            const candidates = freshModule ? findEcasByKey((freshModule.data as EcaData).ecas, key) : [];
            const target = candidates[0];
            if (candidates.length !== 1 || findEcasByKey(prevEcas, key).length !== 1
                || !isNonPmr(prev.type) || !isNonPmr(target.type)) {
                result.unmatched.push({ moduleId: prevModule.id, eca: prev });
                continue;
            }
            target.sourceRef = { accessPoint: target.accessPoint, number: target.number };
            if (prev.fieldVerifiedAt) target.fieldVerifiedAt = prev.fieldVerifiedAt;
            if (prev.fieldTypeCorrection && prev.type !== target.type) {
                target.fieldTypeCorrection = { initialType: target.type, correctedAt: prev.fieldTypeCorrection.correctedAt };
                target.type = prev.type;
                target.name = prev.name;
                target.adhesives = initialStatuses(prev.type);
            }
            result.carried++;
        }
    }
    return result;
};

/** Variante par lieux (rapprochés par nom, comme les réinitialisations). */
export const carryOverEcaFieldTracesForLieux = (previous: Lieu[], fresh: Lieu[]): EcaCarryOverResult => {
    const freshByName = new Map(fresh.map(l => [l.name, l]));
    const total: EcaCarryOverResult = { carried: 0, unmatched: [] };
    for (const lieu of previous) {
        const r = carryOverEcaFieldTraces(lieu.modules, freshByName.get(lieu.name)?.modules ?? []);
        total.carried += r.carried;
        total.unmatched.push(...r.unmatched);
    }
    return total;
};

// -----------------------------------------------------------------
// Alignement prudent des corrections source confirmées sur le terrain
// -----------------------------------------------------------------
export interface ConfirmedEcaSourceCorrection {
    stationCode: string;
    moduleId: string;
    accessPoint: string;
    number: number;
    /** Valeur source avant correction (ca650ce) : seule valeur alignable. */
    previousType: EcaEquipmentType;
    previousName: string;
}

const confirmed = (stationCode: string, number: number, previousType: EcaEquipmentType, previousName: string): ConfirmedEcaSourceCorrection => ({
    stationCode, moduleId: `module-eca-${stationCode}-B-ECA-(Valideurs)`, accessPoint: 'Accès Principal', number, previousType, previousName,
});

/** Les 9 valideurs corrigés dans data/eca_data.ts d'après les relevés terrain
 *  (Empalot, Rangueil, Faculté de Pharmacie, Université Paul-Sabatier). */
export const CONFIRMED_ECA_SOURCE_CORRECTIONS: ConfirmedEcaSourceCorrection[] = [
    confirmed('EMP', 5, EcaEquipmentType.TripodeEntree, 'Valideur 5'),
    confirmed('RAN', 4, EcaEquipmentType.TripodeSortie, 'Valideur 4 (Sortie)'),
    confirmed('RAN', 5, EcaEquipmentType.TripodeSortie, 'Valideur 5 (Sortie)'),
    confirmed('PHA', 3, EcaEquipmentType.TripodeSortie, 'Valideur 3 (Sortie)'),
    confirmed('PHA', 4, EcaEquipmentType.TripodeSortie, 'Valideur 4 (Sortie)'),
    confirmed('PHA', 5, EcaEquipmentType.TripodeSortie, 'Valideur 5 (Sortie)'),
    confirmed('PHA', 6, EcaEquipmentType.TripodeSortie, 'Valideur 6 (Sortie)'),
    confirmed('UPS', 7, EcaEquipmentType.TripodeEntree, 'Valideur 7'),
];

export const confirmedSourceTemplate = (c: ConfirmedEcaSourceCorrection) =>
    ECA_DEFINITIONS[c.stationCode]?.find(t => t.accessPoint === c.accessPoint && t.number === c.number);

export type EcaAlignmentOutcome = 'aligned' | 'already-aligned' | 'conflict' | 'missing';

export interface EcaAlignmentEntry {
    correction: ConfirmedEcaSourceCorrection;
    outcome: EcaAlignmentOutcome;
    /** Raison lisible d'un conflit ou d'une absence. */
    reason?: string;
    eca?: ECA;
}

/**
 * Plan d'alignement (aucune mutation) : un ECA n'est alignable que si la
 * correspondance est unique, que son type est exactement l'ancienne valeur
 * source et qu'il est strictement non audité. Une correction terrain n'est
 * jamais touchée.
 */
export const planEcaSourceAlignment = (lieux: Lieu[]): EcaAlignmentEntry[] =>
    CONFIRMED_ECA_SOURCE_CORRECTIONS.map((correction): EcaAlignmentEntry => {
        const template = confirmedSourceTemplate(correction);
        const modules = lieux.flatMap(l => l.modules.filter(m => m.id === correction.moduleId && m.type === AuditModuleType.ECA));
        if (!template || modules.length !== 1) return { correction, outcome: 'missing', reason: 'module introuvable ou ambigu' };
        const ecas = (modules[0].data as EcaData).ecas ?? [];
        const key = { accessPoint: correction.accessPoint, number: correction.number };
        const matches = ecas.filter(e => sameKey(ecaSourceKey(e), key) || sameKey({ accessPoint: e.accessPoint, number: e.number }, key));
        if (matches.length !== 1) return { correction, outcome: 'missing', reason: matches.length ? 'plusieurs équipements correspondent' : 'équipement introuvable' };
        const eca = matches[0];
        if (eca.type === template.type) return { correction, outcome: 'already-aligned', eca };
        if (eca.fieldTypeCorrection) return { correction, outcome: 'conflict', reason: 'type corrigé sur le terrain', eca };
        if (eca.type !== correction.previousType) return { correction, outcome: 'conflict', reason: 'type enregistré différent de l\'ancienne valeur source', eca };
        if (!isEcaUnaudited(eca)) return { correction, outcome: 'conflict', reason: 'équipement déjà audité', eca };
        return { correction, outcome: 'aligned', eca };
    });

/** Applique les entrées « aligned » d'un plan (mutation des ECA du plan). */
export const applyEcaSourceAlignment = (plan: EcaAlignmentEntry[]): number => {
    let count = 0;
    for (const entry of plan) {
        if (entry.outcome !== 'aligned' || !entry.eca) continue;
        const template = confirmedSourceTemplate(entry.correction)!;
        entry.eca.type = template.type;
        if (entry.eca.name === entry.correction.previousName) entry.eca.name = template.name;
        entry.eca.adhesives = initialStatuses(template.type);
        count++;
    }
    return count;
};

// -----------------------------------------------------------------
// Statut terrain affiché (indépendant des comptages)
// -----------------------------------------------------------------
export type EcaFieldStatus = 'corrected' | 'verified' | 'to_check';

/** Badges d'un valideur hors PMR : corrigé et/ou vérifié ; « à contrôler »
 *  s'il n'a ni l'un ni l'autre et figure dans la liste de vérification, est
 *  réversible, ou diverge d'une correction source confirmée. */
export const getEcaFieldStatuses = (eca: ECA, stationCode: string, moduleId: string): EcaFieldStatus[] => {
    if (!isNonPmr(eca.type)) return [];
    const statuses: EcaFieldStatus[] = [];
    if (eca.fieldTypeCorrection) statuses.push('corrected');
    if (eca.fieldVerifiedAt) statuses.push('verified');
    if (statuses.length > 0) return statuses;
    const key = ecaSourceKey(eca);
    const listed = ECA_FIELD_VERIFICATION.some(v => v.stationCode === stationCode && sameKey(v, key) && v.current !== null);
    const confirmedEntry = CONFIRMED_ECA_SOURCE_CORRECTIONS.find(c => c.moduleId === moduleId && sameKey(c, key));
    const diverges = !!confirmedEntry && confirmedSourceTemplate(confirmedEntry)?.type !== eca.type;
    if (listed || diverges || eca.type === EcaEquipmentType.VantauxReversible) statuses.push('to_check');
    return statuses;
};
