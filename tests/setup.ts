// tests/setup.ts
// fake-indexeddb doit être chargé avant tout import de db.ts (Dexie capture
// indexedDB au moment de son instanciation). L'import '/auto' installe
// indexedDB + IDBKeyRange sur le scope global Node.
import 'fake-indexeddb/auto';
