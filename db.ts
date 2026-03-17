
import Dexie, { type EntityTable } from 'dexie';
import { Lieu, HistoryEntry } from './types';

// FIX: Switched from a subclassing pattern to a typed Dexie instance.
export const db = new Dexie('TisseoAuditDB') as Dexie & {
    lieux: EntityTable<Lieu, 'id'>;
    history: EntityTable<HistoryEntry, 'id'>;
};

// V5 Update: Force refresh to correctly group Signaletique modules
db.version(5).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
}).upgrade(tx => {
    return tx.table('lieux').clear();
});
