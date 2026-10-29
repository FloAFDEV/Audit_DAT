// utils/exchange/consolidate.ts
// =================================================================
// CONSOLIDATION MULTI-AGENTS — logique pure (aucun accès Dexie)
// -----------------------------------------------------------------
// Règles (docs/MULTI_AGENT.md) :
//   1. Une observation n'est jamais détruite : l'import AJOUTE à l'historique.
//   2. Idempotence : une observation déjà connue (même id, ou même contrôle +
//      horodatage + agent + statut) n'est jamais ajoutée deux fois.
//   3. État courant d'un contrôle = son observation la plus récente. Le temps
//      est l'arbitre — aucune résolution manuelle. Égalité stricte
//      d'horodatage : départage déterministe (agent, puis id), signalé.
//   4. Une remise à zéro locale (« reset ») compte comme un événement daté :
//      une observation importée plus ancienne ne ressuscite pas un statut
//      effacé après elle. Les resets ne sont jamais exportés.
// =================================================================

import { Lieu, AuditModuleType, PlanQuartierData, PlanQuartierOccurrence, AdhesiveStatus } from '../../types';
import { ControlRef, NOT_CHECKED, walkControls, indexControls, findAudit, isAnomalyStatus } from './controls';
import {
    AuditExchangeFile, ExchangeAgent, ExchangeObservation, EXCHANGE_SCHEMA, EXCHANGE_SCHEMA_VERSION,
    UNKNOWN_TIME, parseExchangeFile,
} from './format';

/** Ligne de la table Dexie `observations` : observation + provenance locale. */
export interface StoredObservation extends ExchangeObservation {
    agentName: string;
    /** 'reset' : retour à « non contrôlé » sur cet appareil (jamais exporté). */
    kind: 'observation' | 'reset';
    origin: 'local' | 'import';
    sourceExportId?: string;
    sourceFile?: string;
    importedAt?: string;
}

export interface LocalContext {
    networkId: string;
    referentielId: string;
    referentielVersion: string;
}

export interface AgentIdentity { id: string; name: string }

/** Empreinte d'un véritable doublon : même contrôle, même instant, même agent, même résultat. */
export const observationFingerprint = (o: Pick<ExchangeObservation, 'control' | 'observedAt' | 'agent' | 'result'>): string =>
    `${o.control}|${new Date(o.observedAt).toISOString()}|${o.agent}|${o.result.status}`;

/** Hash 53 bits (cyrb53) — identifiants déterministes, sans dépendance. */
const hash = (input: string): string => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < input.length; i++) {
        const ch = input.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
};

/** > 0 : `a` est plus récente que `b` (et devient l'état courant). */
export const compareObservations = (a: StoredObservation, b: StoredObservation): number => {
    const dt = Date.parse(a.observedAt) - Date.parse(b.observedAt);
    if (dt !== 0) return dt;
    if (a.agent !== b.agent) return a.agent < b.agent ? 1 : -1;
    return a.id === b.id ? 0 : (a.id < b.id ? 1 : -1);
};

/** Observation la plus récente par contrôle. */
export const latestByControl = (observations: StoredObservation[]): Map<string, StoredObservation> => {
    const latest = new Map<string, StoredObservation>();
    for (const o of observations) {
        const current = latest.get(o.control);
        if (!current || compareObservations(o, current) > 0) latest.set(o.control, o);
    }
    return latest;
};

const toObservation = (
    control: ControlRef, status: string, at: string, timeSource: ExchangeObservation['timeSource'],
    agent: AgentIdentity, referentielVersion: string, id: string,
): StoredObservation => ({
    id,
    control: control.key,
    observedAt: at,
    timeSource,
    agent: agent.id,
    agentName: agent.name,
    referentielVersion,
    result: { status, anomaly: isAnomalyStatus(status), ...(control.comment ? { comment: control.comment } : {}) },
    site: control.site,
    audit: control.audit,
    object: control.object,
    item: control.item,
    ...(control.media ? { media: control.media } : {}),
    ...(control.occurrence ? { occurrence: control.occurrence } : {}),
    kind: status === NOT_CHECKED ? 'reset' : 'observation',
    origin: 'local',
});

/**
 * Constats présents dans l'arbre mais absents du journal (saisis avant le
 * journal d'observations, ou restaurés depuis une sauvegarde) : convertis en
 * observations datées au mieux (`inferred`) ou à l'horodatage sentinelle
 * (`unknown`). Identifiant déterministe et indépendant de l'appareil :
 * réexporter, ou recevoir le même état de plusieurs appareils, ne duplique rien.
 */
export const buildBaselineObservations = (
    lieux: Lieu[], knownControls: ReadonlySet<string>, agent: AgentIdentity, referentielVersion: string,
    onlyKeys?: ReadonlySet<string>,
): StoredObservation[] => {
    const baseline: StoredObservation[] = [];
    walkControls(lieux, control => {
        if (control.status === NOT_CHECKED || knownControls.has(control.key)) return;
        if (onlyKeys && !onlyKeys.has(control.key)) return;
        const at = control.knownDate ? new Date(control.knownDate).toISOString() : UNKNOWN_TIME;
        // Sans l'agent : l'appareil qui exporte n'est pas forcément l'auteur du
        // constat, et un même état (ex. « non applicable » posé par le seed)
        // présent sur plusieurs appareils doit se dédoublonner.
        const fingerprint = `${control.key}|${at}|${control.status}`;
        baseline.push(toObservation(control, control.status, at, control.knownDate ? 'inferred' : 'unknown', agent, referentielVersion, `inf-${hash(fingerprint)}`));
    });
    return baseline;
};

/**
 * Observations issues d'une modification locale : un contrôle dont le statut
 * change devient une observation horodatée `now` ; un contrôle qui disparaît
 * ou revient à « non contrôlé » devient un reset.
 */
export const diffObservations = (
    before: Lieu[], after: Lieu[], agent: AgentIdentity, referentielVersion: string, now: string, newId: () => string,
): StoredObservation[] => {
    const previous = indexControls(before);
    const records: StoredObservation[] = [];
    const seen = new Set<string>();
    walkControls(after, control => {
        seen.add(control.key);
        const old = previous.get(control.key);
        const oldStatus = old?.status ?? NOT_CHECKED;
        if (oldStatus === control.status) return;
        records.push(toObservation(control, control.status, now, 'recorded', agent, referentielVersion, newId()));
    });
    for (const [key, old] of previous) {
        if (seen.has(key) || old.status === NOT_CHECKED) continue;
        records.push(toObservation(old, NOT_CHECKED, now, 'recorded', agent, referentielVersion, newId()));
    }
    return records;
};

/** Fichier d'échange : uniquement des observations (jamais de reset). */
export const buildExchangeFile = (input: {
    observations: StoredObservation[];
    exportId: string;
    exportedAt: string;
    exporter: AgentIdentity;
    app: AuditExchangeFile['app'];
    network: AuditExchangeFile['network'];
    referentiel: AuditExchangeFile['referentiel'];
}): AuditExchangeFile => {
    const agents = new Map<string, ExchangeAgent>([[input.exporter.id, { id: input.exporter.id, name: input.exporter.name }]]);
    const observations = input.observations
        .filter(o => o.kind === 'observation')
        .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.control.localeCompare(b.control))
        .map(({ agentName, kind, origin, sourceExportId, sourceFile, importedAt, ...observation }) => {
            if (!agents.has(observation.agent)) agents.set(observation.agent, { id: observation.agent, name: agentName });
            return observation;
        });
    return {
        schema: EXCHANGE_SCHEMA,
        schemaVersion: EXCHANGE_SCHEMA_VERSION,
        exportId: input.exportId,
        exportedAt: input.exportedAt,
        app: input.app,
        network: input.network,
        referentiel: input.referentiel,
        agents: [...agents.values()],
        observations,
    };
};

// -----------------------------------------------------------------
// Préparation d'une consolidation (prévisualisation + dédoublonnage)
// -----------------------------------------------------------------

export interface FilePreview {
    name: string;
    ok: boolean;
    error?: string;
    exportId?: string;
    exportedAt?: string;
    agents: string[];
    observationCount: number;
    referentielVersion?: string;
}

export interface ImportProblem {
    level: 'error' | 'warning';
    file?: string;
    control?: string;
    message: string;
}

export interface ConsolidationPlan {
    previews: FilePreview[];
    /** Observations nouvelles à ajouter à l'historique. */
    added: StoredObservation[];
    /** Observations déjà connues (même id ou véritable doublon). */
    alreadyKnown: number;
    problems: ImportProblem[];
}

export const planConsolidation = (input: {
    existing: StoredObservation[];
    files: { name: string; content: string }[];
    local: LocalContext;
    importedAt: string;
}): ConsolidationPlan => {
    const knownIds = new Set(input.existing.map(o => o.id));
    const knownFingerprints = new Set(input.existing.filter(o => o.kind === 'observation').map(observationFingerprint));
    const previews: FilePreview[] = [];
    const problems: ImportProblem[] = [];
    const added: StoredObservation[] = [];
    let alreadyKnown = 0;

    for (const { name, content } of input.files) {
        const parsed = parseExchangeFile(content);
        if (parsed.ok === false) {
            previews.push({ name, ok: false, error: parsed.error, agents: [], observationCount: 0 });
            problems.push({ level: 'error', file: name, message: parsed.error });
            continue;
        }
        const { file } = parsed;
        const agentNames = new Map(file.agents.map(a => [a.id, a.name]));
        const preview: FilePreview = {
            name, ok: true, exportId: file.exportId, exportedAt: file.exportedAt,
            agents: [...new Set(file.observations.map(o => agentNames.get(o.agent) || o.agent))],
            observationCount: file.observations.length, referentielVersion: file.referentiel.version,
        };
        if (file.network.id !== input.local.networkId) {
            preview.ok = false;
            preview.error = `Réseau « ${file.network.id} » différent du réseau local « ${input.local.networkId} ».`;
        } else if (file.referentiel.id !== input.local.referentielId) {
            preview.ok = false;
            preview.error = `Référentiel « ${file.referentiel.id} » inconnu de cette instance.`;
        }
        previews.push(preview);
        if (!preview.ok) {
            problems.push({ level: 'error', file: name, message: preview.error! });
            continue;
        }
        parsed.warnings.forEach(message => problems.push({ level: 'warning', file: name, message }));
        if (file.referentiel.version !== input.local.referentielVersion) {
            problems.push({ level: 'warning', file: name, message: `Référentiel ${file.referentiel.version} (local : ${input.local.referentielVersion}) — observations conservées avec leur version d'origine.` });
        }

        for (const observation of file.observations) {
            const fingerprint = observationFingerprint(observation);
            if (knownIds.has(observation.id) || knownFingerprints.has(fingerprint)) {
                alreadyKnown++;
                continue;
            }
            knownIds.add(observation.id);
            knownFingerprints.add(fingerprint);
            added.push({
                ...observation,
                agentName: agentNames.get(observation.agent) || observation.agent,
                kind: 'observation',
                origin: 'import',
                sourceExportId: file.exportId,
                sourceFile: name,
                importedAt: input.importedAt,
            });
        }
    }
    return { previews, added, alreadyKnown, problems };
};

// -----------------------------------------------------------------
// Application de l'état courant sur l'arbre d'audit
// -----------------------------------------------------------------

export interface ApplyResult {
    /** Contrôles dont l'état courant a changé. */
    updated: number;
    /** Contrôles touchés par l'import dont l'état local reste le plus récent. */
    unchanged: number;
    /** Exemplaires de plan de quartier recréés depuis un autre appareil. */
    created: number;
    changedLieuIds: Set<string>;
    problems: ImportProblem[];
}

/**
 * Pour chaque contrôle concerné par les nouvelles observations : l'état
 * courant devient celui de l'observation la plus récente de tout
 * l'historique (local + importé). Mute `lieux` (copie de travail).
 */
export const applyCurrentState = (
    lieux: Lieu[], allObservations: StoredObservation[], touchedControls: ReadonlySet<string>,
): ApplyResult => {
    const result: ApplyResult = { updated: 0, unchanged: 0, created: 0, changedLieuIds: new Set(), problems: [] };
    const byControl = new Map<string, StoredObservation[]>();
    for (const o of allObservations) {
        if (!touchedControls.has(o.control)) continue;
        const list = byControl.get(o.control);
        if (list) list.push(o); else byControl.set(o.control, [o]);
    }

    let controls = indexControls(lieux);
    for (const [key, observations] of byControl) {
        observations.sort((a, b) => compareObservations(b, a));
        const [winner, runnerUp] = observations;
        if (runnerUp && Date.parse(runnerUp.observedAt) === Date.parse(winner.observedAt)
            && runnerUp.result.status !== winner.result.status && runnerUp.kind === 'observation') {
            result.problems.push({ level: 'warning', control: key, message: `${winner.object.label} — ${winner.item.label} : deux constats différents au même instant (${winner.agentName} / ${runnerUp.agentName}) ; « ${winner.result.status} » retenu (départage déterministe).` });
        }
        if (winner.kind === 'reset') { result.unchanged++; continue; }

        let control = controls.get(key);
        if (!control && winner.audit.type === AuditModuleType.PLAN_QUARTIER && winner.occurrence) {
            const target = findAudit(lieux, winner.audit.id);
            if (target) {
                const occurrence: PlanQuartierOccurrence = { ...winner.occurrence, status: AdhesiveStatus.NotChecked, constatedAt: winner.observedAt };
                (target.module.data as PlanQuartierData).occurrences.push(occurrence);
                result.created++;
                result.changedLieuIds.add(target.lieu.id);
                controls = indexControls(lieux);
                control = controls.get(key);
            }
        }
        if (!control) {
            result.problems.push({ level: 'warning', control: key, message: `${winner.site.name} · ${winner.object.label} — ${winner.item.label} : contrôle absent de cette instance ; observation conservée dans l'historique.` });
            continue;
        }
        if (!control.allowedStatuses.includes(winner.result.status)) {
            result.problems.push({ level: 'warning', control: key, message: `${control.object.label} — ${control.item.label} : statut « ${winner.result.status} » inconnu ; état local conservé.` });
            continue;
        }
        if (control.status === winner.result.status) { result.unchanged++; continue; }
        control.write(winner.result.status, winner.observedAt);
        result.updated++;
        result.changedLieuIds.add(control.site.id);
    }
    return result;
};
