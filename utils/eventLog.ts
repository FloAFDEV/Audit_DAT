// utils/eventLog.ts
// =================================================================
// JOURNAL D'ÉVÉNEMENTS (Lot 3) — trace chronologique et lisible des
// opérations métier importantes (import/export, réinitialisations,
// ajout/suppression d'éléments d'audit, décisions d'arbitrage sur le
// référentiel, migrations de données, échecs critiques de persistance).
// -----------------------------------------------------------------
// Ce n'est PAS de la télémétrie : rien ne quitte l'appareil, aucun
// identifiant utilisateur/session — c'est un journal métier local,
// cohérent avec le reste d'AuditRef (100 % local, IndexedDB via Dexie).
// Ce n'est PAS non plus un instantané complet (cf. types.ts::AppEvent
// pour la distinction avec HistoryEntry).
//
// Règle stricte respectée par TOUS les appelants (store.ts, useAppHandlers.ts,
// useArbitrage.ts) : un événement n'est écrit qu'APRÈS confirmation que
// l'opération qu'il décrit a réellement été persistée — jamais avant, jamais
// en cas d'échec (seule exception : PERSISTENCE_ERROR, qui documente
// justement un échec réel, écrit depuis le bloc catch qui vient de le
// constater).
// =================================================================
import { db } from '../db';
import { AppEvent, AppEventType } from '../types';

export interface NewAppEvent {
    type: AppEventType;
    /** Résumé prêt à afficher tel quel — la phrase que l'UI montre. */
    summary: string;
    entityType?: string;
    entityId?: string;
    entityLabel?: string;
    metadata?: Record<string, string | number | boolean>;
}

/**
 * Écrit un événement dans le journal. Best-effort et silencieux en cas
 * d'échec : le journal est un SECOND EFFET, jamais une condition de succès
 * de l'opération métier qu'il documente — un import déjà réussi ne doit
 * jamais se retrouver signalé en erreur simplement parce que la seule
 * écriture du journal qui le documente aurait échoué juste après.
 */
export const logEvent = async (event: NewAppEvent): Promise<void> => {
    try {
        const entry: AppEvent = { date: new Date().toISOString(), ...event };
        await db.events.add(entry);
    } catch (error) {
        console.error("Échec de l'écriture du journal d'événements (non bloquant) :", error);
    }
};
