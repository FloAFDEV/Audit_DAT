
import Dexie, { type EntityTable } from 'dexie';
import { Lieu, HistoryEntry } from './types';

// FIX: Switched from a subclassing pattern to a typed Dexie instance.
export const db = new Dexie('TisseoAuditDB') as Dexie & {
    lieux: EntityTable<Lieu, 'id'>;
    history: EntityTable<HistoryEntry, 'id'>;
};

// V5: introduction de la table history.
// NOTE historique : cette version utilisait tx.table('lieux').clear() pour forcer un refresh
// du regroupement des modules Signalétique. Ce comportement destructif est conservé uniquement
// pour les utilisateurs qui migrent encore depuis la v4.
// ⛔ Ne JAMAIS reproduire ce pattern (clear) dans les versions suivantes.
db.version(5).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
}).upgrade(tx => {
    return tx.table('lieux').clear();
});

// V6: schéma identique à V5 — aucune migration destructive.
// Sert de point de départ propre pour toutes les futures migrations.
// Règle pour les versions ≥ 6 : utiliser .upgrade() pour patcher les enregistrements existants
// (ajout de champs manquants, renommages), JAMAIS pour les effacer.
db.version(6).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
});
