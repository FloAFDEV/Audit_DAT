// tests/stationRename.test.ts
// Renommage « Parc du Canal » → « Parc Technologique du Canal » (PTC) :
// base neuve, base existante (mise à niveau au démarrage), idempotence.
// Les identifiants (sta-b-21, lieu-parc-du-canal, modules) ne changent pas.
import { describe, it, expect } from 'vitest';
import { db } from '../db';
import useAuditStore, { migrateStationRenames } from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { ALL_STATION_DEFS } from '../data/stationRegistry';
import { Lieu } from '../types';

const OLD = 'Parc du Canal';
const NEW = 'Parc Technologique du Canal';
const LIEU_ID = 'lieu-parc-du-canal';

/** Base « existante » : la base neuve, avec l'ancien nom partout où il était enregistré. */
const withOldName = (lieux: Lieu[]): Lieu[] => JSON.parse(JSON.stringify(lieux).split(NEW).join(OLD));

describe('renommage PTC — base neuve', () => {
    it('registre et données initialisées utilisent le nouveau nom, identifiants inchangés', async () => {
        const ptc = ALL_STATION_DEFS.find(s => s.id === 'sta-b-21')!;
        expect(ptc.name).toBe(NEW);
        expect(ptc.code).toBe('PTC');

        const lieux = await generateInitialLieuxDataAsync();
        const lieu = lieux.find(l => l.id === LIEU_ID)!;
        expect(lieu).toBeDefined();
        expect(lieu.name).toBe(NEW);
        expect(JSON.stringify(lieux)).not.toContain(OLD);
        expect(lieux.some(l => l.id === 'lieu-parc-technologique-du-canal')).toBe(false);
    });
});

describe('renommage PTC — base existante', () => {
    it('renomme le lieu et les noms de station de ses modules, rien d\'autre', async () => {
        const fresh = await generateInitialLieuxDataAsync();
        const old = withOldName(fresh);
        const before = JSON.parse(JSON.stringify(old)) as Lieu[];

        expect(migrateStationRenames(old)).toBe(true);

        const lieu = old.find(l => l.id === LIEU_ID)!;
        expect(lieu.name).toBe(NEW);
        // Le lieu renommé redevient identique à celui d'une base neuve (hors uuid
        // générés à chaque construction : on compare la structure renommée à
        // l'ancienne avec le seul libellé changé).
        expect(lieu).toEqual(JSON.parse(JSON.stringify(before.find(l => l.id === LIEU_ID)).split(OLD).join(NEW)));
        // Tous les autres lieux strictement inchangés.
        expect(old.filter(l => l.id !== LIEU_ID)).toEqual(before.filter(l => l.id !== LIEU_ID));
        expect(JSON.stringify(old)).not.toContain(OLD);
        // Mêmes identifiants qu'avant.
        expect(old.map(l => l.id)).toEqual(before.map(l => l.id));
        expect(lieu.modules.map(m => m.id)).toEqual(before.find(l => l.id === LIEU_ID)!.modules.map(m => m.id));
    });

    it('idempotente : une base déjà corrigée n\'est pas modifiée', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const snapshot = JSON.stringify(lieux);
        expect(migrateStationRenames(lieux)).toBe(false);
        expect(JSON.stringify(lieux)).toBe(snapshot);

        const old = withOldName(lieux);
        expect(migrateStationRenames(old)).toBe(true);
        const once = JSON.stringify(old);
        expect(migrateStationRenames(old)).toBe(false);
        expect(JSON.stringify(old)).toBe(once);
    });

    it('au démarrage (store.init) : la base enregistrée est renommée et réécrite, lieu-parc-du-canal conservé', async () => {
        const old = withOldName(await generateInitialLieuxDataAsync());
        await db.lieux.clear();
        await db.lieux.bulkPut(old);

        await useAuditStore.getState().init();

        const stored = await db.lieux.get(LIEU_ID);
        expect(stored?.name).toBe(NEW);
        expect(JSON.stringify(stored)).not.toContain(OLD);
        expect(useAuditStore.getState().lieux.find(l => l.id === LIEU_ID)?.name).toBe(NEW);

        // Second démarrage : plus rien à renommer.
        const afterFirst = JSON.stringify(await db.lieux.get(LIEU_ID));
        await useAuditStore.getState().init();
        expect(JSON.stringify(await db.lieux.get(LIEU_ID))).toBe(afterFirst);
    });
});
