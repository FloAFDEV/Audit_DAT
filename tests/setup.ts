// tests/setup.ts
// fake-indexeddb doit être chargé avant tout import de db.ts (Dexie capture
// indexedDB au moment de son instanciation). L'import '/auto' installe
// indexedDB + IDBKeyRange sur le scope global Node.
import 'fake-indexeddb/auto';

// Polyfill minimal de localStorage — absent de l'environnement Node des
// tests (vitest: environment 'node'), mais utilisé abondamment par store.ts
// (authentification, thème, filtres, backups, reprise de navigation). Sans
// lui, `localStorage.getItem(...)` lève une ReferenceError avant même
// d'atteindre le code testé.
class MemoryStorage implements Storage {
    private store = new Map<string, string>();
    get length() { return this.store.size; }
    clear() { this.store.clear(); }
    getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
    key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
    removeItem(key: string) { this.store.delete(key); }
    setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

if (typeof globalThis.localStorage === 'undefined') {
    (globalThis as any).localStorage = new MemoryStorage();
}

// Stub minimal de document.documentElement.classList — store.ts::applyTheme
// (appelée depuis init()) l'utilise pour appliquer le thème clair/sombre.
// Rien d'autre du DOM n'est requis par le code testé ici.
if (typeof globalThis.document === 'undefined') {
    (globalThis as any).document = {
        documentElement: { classList: { add: () => {}, remove: () => {} } },
    };
}
