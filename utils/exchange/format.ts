// utils/exchange/format.ts
// =================================================================
// FORMAT D'ÉCHANGE MULTI-AGENTS — `auditref.exchange`, schemaVersion 1
// -----------------------------------------------------------------
// Fichier produit par un agent (export) et consolidé sur une autre instance
// (import de N fichiers). Distinct de la sauvegarde complète (formatVersion
// 2, utils/signageSerializer.ts) : une sauvegarde REMPLACE la base, un
// échange AJOUTE des observations horodatées et ne détruit jamais rien.
// Spécification lisible : docs/MULTI_AGENT.md.
// =================================================================

import { AuditModuleType } from '../../types';
import { ControlMedia, PdqOccurrenceSnapshot } from './controls';

export const EXCHANGE_SCHEMA = 'auditref.exchange';
export const EXCHANGE_SCHEMA_VERSION = 1;

/** Origine de l'horodatage :
 *  - recorded : heure de saisie du statut sur l'appareil de l'agent ;
 *  - inferred : date déjà présente dans l'audit (date de complétion,
 *    prise de vue...) pour un constat antérieur au journal d'observations ;
 *  - unknown  : aucune date connue — horodatage sentinelle (UNKNOWN_TIME),
 *    toujours battu par une observation datée. */
export type TimeSource = 'recorded' | 'inferred' | 'unknown';
export const UNKNOWN_TIME = '1970-01-01T00:00:00.000Z';

export interface ExchangeObservation {
    /** Identifiant unique et stable de l'observation (idempotence). */
    id: string;
    /** Clé naturelle du contrôle (utils/exchange/controls.ts). */
    control: string;
    observedAt: string;
    timeSource: TimeSource;
    /** Identifiant d'agent — nom lisible dans `agents`. */
    agent: string;
    referentielVersion: string;
    result: { status: string; anomaly: boolean; comment?: string };
    site: { id: string; name: string; code?: string };
    audit: { type: AuditModuleType; id: string; name: string };
    object: { id: string; label: string };
    item: { id: string; label: string };
    /** Références aux photos (les fichiers restent sur l'appareil de prise de vue). */
    media?: ControlMedia[];
    /** Plans de quartier : description de l'exemplaire, pour le recréer. */
    occurrence?: PdqOccurrenceSnapshot;
}

export interface ExchangeAgent { id: string; name: string }

export interface AuditExchangeFile {
    schema: typeof EXCHANGE_SCHEMA;
    schemaVersion: typeof EXCHANGE_SCHEMA_VERSION;
    exportId: string;
    exportedAt: string;
    app: { name: string; version: string; dataVersion: string };
    network: { id: string; name: string };
    referentiel: { id: string; version: string };
    agents: ExchangeAgent[];
    observations: ExchangeObservation[];
}

export type ParseResult =
    | { ok: true; file: AuditExchangeFile; warnings: string[] }
    | { ok: false; error: string };

const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isIsoDate = (v: unknown): v is string => isString(v) && !Number.isNaN(Date.parse(v));

const observationError = (o: unknown): string | null => {
    if (!isObject(o)) return 'observation non structurée';
    if (!isString(o.id)) return 'identifiant manquant';
    if (!isString(o.control)) return 'clé de contrôle manquante';
    if (!isIsoDate(o.observedAt)) return 'horodatage invalide';
    if (!['recorded', 'inferred', 'unknown'].includes(o.timeSource as string)) return 'origine d\'horodatage invalide';
    if (!isString(o.agent)) return 'agent manquant';
    if (!isString(o.referentielVersion)) return 'version de référentiel manquante';
    if (!isObject(o.result) || !isString(o.result.status)) return 'résultat manquant';
    if (!isObject(o.site) || !isString(o.site.id)) return 'site manquant';
    if (!isObject(o.audit) || !isString(o.audit.id) || !isString(o.audit.type)) return 'audit manquant';
    if (!isObject(o.object) || !isString(o.object.id)) return 'objet manquant';
    if (!isObject(o.item) || !isString(o.item.id)) return 'item manquant';
    return null;
};

/**
 * Parse et valide un fichier d'échange. Un fichier mal formé est rejeté en
 * entier ; une observation mal formée est écartée et signalée (warnings),
 * sans bloquer les autres.
 */
export const parseExchangeFile = (content: string): ParseResult => {
    let raw: unknown;
    try {
        raw = JSON.parse(content);
    } catch {
        return { ok: false, error: 'Fichier JSON illisible.' };
    }
    if (!isObject(raw) || raw.schema !== EXCHANGE_SCHEMA) {
        return { ok: false, error: isObject(raw) && (raw.formatVersion !== undefined || raw.data !== undefined)
            ? 'Sauvegarde complète, pas un export de relevés : utiliser « Restaurer une sauvegarde ».'
            : 'Format non reconnu (export de relevés AuditRef attendu).' };
    }
    if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion > EXCHANGE_SCHEMA_VERSION) {
        return { ok: false, error: `Version de format ${String(raw.schemaVersion)} non prise en charge (max ${EXCHANGE_SCHEMA_VERSION}).` };
    }
    if (!isString(raw.exportId) || !isIsoDate(raw.exportedAt)) return { ok: false, error: 'En-tête d\'export incomplet.' };
    if (!isObject(raw.network) || !isString(raw.network.id)) return { ok: false, error: 'Réseau non renseigné.' };
    if (!isObject(raw.referentiel) || !isString(raw.referentiel.id) || !isString(raw.referentiel.version)) {
        return { ok: false, error: 'Référentiel non renseigné.' };
    }
    if (!Array.isArray(raw.agents) || !Array.isArray(raw.observations)) return { ok: false, error: 'Agents ou observations manquants.' };

    const warnings: string[] = [];
    const agents = raw.agents.filter((a): a is ExchangeAgent => isObject(a) && isString(a.id) && typeof a.name === 'string');
    const observations: ExchangeObservation[] = [];
    raw.observations.forEach((o, index) => {
        const error = observationError(o);
        if (error) warnings.push(`Observation n°${index + 1} ignorée : ${error}.`);
        else observations.push(o as unknown as ExchangeObservation);
    });

    return { ok: true, warnings, file: { ...(raw as unknown as AuditExchangeFile), agents, observations } };
};
