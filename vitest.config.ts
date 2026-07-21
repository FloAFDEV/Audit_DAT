import { defineConfig } from 'vitest/config';
import path from 'path';

// Config dédiée aux tests : environnement Node pur (pas de plugin React/Tailwind,
// inutiles ici et coûteux au démarrage). IndexedDB est fourni par fake-indexeddb
// via le setupFile, AVANT tout import de db.ts.
export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
    test: {
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts'],
    },
});
