import Dexie, { type EntityTable } from 'dexie';
import { Lieu } from './types';

// FIX: Switched from a subclassing pattern to a typed Dexie instance.
// The previous approach caused a persistent TypeScript error where the 'version' method
// was not recognized on the subclass. This alternative pattern, also supported by Dexie,
// avoids the inheritance issue and provides a correctly typed database instance for the application.
export const db = new Dexie('TisseoAuditDB') as Dexie & {
    lieux: EntityTable<Lieu, 'id'>;
};

db.version(1).stores({
    lieux: 'id, name', // Primary key and indexed properties
});
