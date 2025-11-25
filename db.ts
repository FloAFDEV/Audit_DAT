
import Dexie, { type EntityTable } from 'dexie';
import { Lieu, HistoryEntry } from './types';

// FIX: Switched from a subclassing pattern to a typed Dexie instance.
// The previous approach caused a persistent TypeScript error where the 'version' method
// was not recognized on the subclass. This alternative pattern, also supported by Dexie,
// avoids the inheritance issue and provides a correctly typed database instance for the application.
export const db = new Dexie('TisseoAuditDB') as Dexie & {
    lieux: EntityTable<Lieu, 'id'>;
    history: EntityTable<HistoryEntry, 'id'>;
};

db.version(2).stores({ // Bump version to 2
    lieux: 'id, name',
    history: '++id, date, type, categoryKey', // Add history table
});
