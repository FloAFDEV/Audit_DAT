// utils/exchange/observationLog.ts
// =================================================================
// JOURNAL D'OBSERVATIONS + ÉCHANGE MULTI-AGENTS — accès Dexie
// -----------------------------------------------------------------
// Couche fine au-dessus de la logique pure (consolidate.ts) : identité de
// l'agent sur cet appareil, enregistrement des changements de statut,
// export d'un fichier d'échange, consolidation de N fichiers.
// =================================================================

import { v4 as uuidv4 } from 'uuid';
import { Lieu } from '../../types';
import { db } from '../../db';
import { NETWORK, REFERENTIEL } from '../../data/referentiel';
import { APP_VERSION } from '../../data/appInfo';
import { AuditExchangeFile } from './format';
import {
    AgentIdentity, ApplyResult, ConsolidationPlan, StoredObservation,
    applyCurrentState, buildBaselineObservations, buildExchangeFile, diffObservations, planConsolidation,
} from './consolidate';

const AGENT_STORAGE_KEY = 'auditref-agent';

let memoryAgent: AgentIdentity | null = null;

/** Agent de cet appareil : identifiant stable créé au premier usage, nom
 *  saisi à l'export. localStorage indisponible : identité de session. */
export const getLocalAgent = (): AgentIdentity => {
    try {
        const raw = localStorage.getItem(AGENT_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') return parsed;
    } catch { /* identité de session ci-dessous */ }
    if (!memoryAgent) memoryAgent = { id: `agent-${uuidv4()}`, name: '' };
    try { localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(memoryAgent)); } catch { /* best-effort */ }
    return memoryAgent;
};

export const setLocalAgentName = (name: string): AgentIdentity => {
    const agent = { ...getLocalAgent(), name: name.trim() };
    memoryAgent = agent;
    try { localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(agent)); } catch { /* best-effort */ }
    return agent;
};

const local = () => ({ networkId: NETWORK.id, referentielId: REFERENTIEL.id, referentielVersion: REFERENTIEL.version });

/** Constats de l'arbre encore absents du journal (voir buildBaselineObservations). */
const baselineFor = async (lieux: Lieu[], onlyKeys?: ReadonlySet<string>): Promise<StoredObservation[]> => {
    const known = new Set<string>(
        onlyKeys
            ? (await db.observations.where('control').anyOf([...onlyKeys]).toArray()).map(o => o.control)
            : (await db.observations.orderBy('control').uniqueKeys()) as string[],
    );
    return buildBaselineObservations(lieux, known, getLocalAgent(), REFERENTIEL.version, onlyKeys);
};

/**
 * Journalise les changements de statut entre deux états des mêmes lieux.
 * Le constat remplacé, s'il n'était pas encore journalisé, l'est d'abord :
 * l'historique ne perd jamais l'état antérieur.
 */
export const recordLocalChanges = async (before: Lieu[], after: Lieu[], now = new Date().toISOString()): Promise<number> => {
    const records = diffObservations(before, after, getLocalAgent(), REFERENTIEL.version, now, uuidv4);
    if (records.length === 0) return 0;
    const previous = await baselineFor(before, new Set(records.map(r => r.control)));
    await db.observations.bulkPut([...previous, ...records]);
    return records.length;
};

/** Construit le fichier d'échange de cet appareil (toutes ses observations
 *  connues, y compris celles déjà consolidées depuis d'autres agents). */
export const buildLocalExchangeFile = async (lieux: Lieu[], dataVersion: string): Promise<AuditExchangeFile> => {
    const baseline = await baselineFor(lieux);
    if (baseline.length) await db.observations.bulkPut(baseline);
    return buildExchangeFile({
        observations: await db.observations.toArray(),
        exportId: uuidv4(),
        exportedAt: new Date().toISOString(),
        exporter: getLocalAgent(),
        app: { name: 'auditref-tisseo', version: APP_VERSION, dataVersion },
        network: { ...NETWORK },
        referentiel: { ...REFERENTIEL },
    });
};

/** Prévisualisation : lecture seule, rien n'est écrit. */
export const previewExchangeFiles = async (files: { name: string; content: string }[]): Promise<ConsolidationPlan> =>
    planConsolidation({ existing: await db.observations.toArray(), files, local: local(), importedAt: new Date().toISOString() });

export interface ConsolidationOutcome {
    plan: ConsolidationPlan;
    apply: ApplyResult;
    lieux: Lieu[];
}

/**
 * Consolide N fichiers : ajoute les observations nouvelles à l'historique,
 * puis recalcule l'état courant des contrôles concernés. Historique et
 * arbre d'audit sont écrits dans une seule transaction.
 */
export const consolidateExchangeFiles = async (lieux: Lieu[], files: { name: string; content: string }[]): Promise<ConsolidationOutcome> => {
    const working: Lieu[] = JSON.parse(JSON.stringify(lieux));
    let outcome: ConsolidationOutcome | undefined;
    await db.transaction('rw', [db.observations, db.lieux], async () => {
        // Constats locaux non journalisés : ils participent à l'arbitrage
        // temporel au même titre que les observations importées.
        const baseline = await baselineFor(working);
        if (baseline.length) await db.observations.bulkPut(baseline);

        const existing = await db.observations.toArray();
        const plan = planConsolidation({ existing, files, local: local(), importedAt: new Date().toISOString() });
        if (plan.added.length) await db.observations.bulkAdd(plan.added);

        const touched = new Set(plan.added.map(o => o.control));
        const apply = applyCurrentState(working, [...existing, ...plan.added], touched);
        const changed = working.filter(l => apply.changedLieuIds.has(l.id));
        if (changed.length) await db.lieux.bulkPut(changed);
        outcome = { plan, apply, lieux: working };
    });
    return outcome!;
};

/** Historique d'un contrôle, du plus récent au plus ancien. */
export const getControlHistory = async (controlKey: string): Promise<StoredObservation[]> =>
    (await db.observations.where('control').equals(controlKey).toArray())
        .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));

