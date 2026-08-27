// tests/stationAdmin.test.ts
// Fonctions pures (utils/cockpit/stationAdmin.ts) — pas d'IndexedDB.
// Vérifie R1 (id technique, jamais dérivé du nom) et l'absence de
// cascade sur archivage/restauration (modules strictement inchangés).
import { describe, it, expect } from 'vitest';
import { createStation, withStationRenamed, withStationArchived, withStationRestored } from '../utils/cockpit/stationAdmin';
import { AuditModule, AuditModuleType } from '../types';

const dummyModule: AuditModule = {
    id: 'module-1', type: AuditModuleType.PR, name: 'Audit Bornes P+R',
    data: { id: 'pr-1', name: 'Station Test', zones: [] },
};

describe('createStation', () => {
    it('génère un id technique (uuid), jamais dérivé du nom', () => {
        const a = createStation('Basso Cambo');
        const b = createStation('Basso Cambo');
        expect(a.id).not.toBe(b.id);
        expect(a.id).not.toContain('Basso');
    });

    it('démarre sans module (portée minimale, pas de génération automatique)', () => {
        const station = createStation('Nouvelle Station');
        expect(station.modules).toEqual([]);
    });

    it('rejette un nom vide ou uniquement des espaces', () => {
        expect(() => createStation('')).toThrow();
        expect(() => createStation('   ')).toThrow();
    });

    it('trim le nom saisi', () => {
        const station = createStation('  Jean-Jaurès  ');
        expect(station.name).toBe('Jean-Jaurès');
    });
});

describe('withStationRenamed', () => {
    it('conserve strictement le même id et les mêmes modules', () => {
        const station = { id: 'sta-1', name: 'Ancien nom', modules: [dummyModule] };
        const renamed = withStationRenamed(station, 'Nouveau nom');
        expect(renamed.id).toBe(station.id);
        expect(renamed.modules).toBe(station.modules);
        expect(renamed.name).toBe('Nouveau nom');
    });

    it('ne mute pas la station originale', () => {
        const station = { id: 'sta-1', name: 'Ancien nom', modules: [] };
        withStationRenamed(station, 'Nouveau nom');
        expect(station.name).toBe('Ancien nom');
    });

    it('rejette un nouveau nom vide', () => {
        const station = { id: 'sta-1', name: 'X', modules: [] };
        expect(() => withStationRenamed(station, '  ')).toThrow();
    });
});

describe('withStationArchived / withStationRestored — aucune cascade', () => {
    it('archive : pose uniquement archivedAt, modules strictement inchangé', () => {
        const station = { id: 'sta-1', name: 'Station X', modules: [dummyModule] };
        const archived = withStationArchived(station, '2026-01-01T00:00:00.000Z');
        expect(archived.archivedAt).toBe('2026-01-01T00:00:00.000Z');
        expect(archived.modules).toBe(station.modules); // même référence, aucun retraitement
        expect(archived.id).toBe(station.id);
        expect(archived.name).toBe(station.name);
    });

    it('restaure : retire archivedAt, id/modules inchangés, aucun nouvel id', () => {
        const archived = { id: 'sta-1', name: 'Station X', modules: [dummyModule], archivedAt: '2026-01-01T00:00:00.000Z' };
        const restored = withStationRestored(archived);
        expect(restored.archivedAt).toBeUndefined();
        expect(restored.id).toBe('sta-1');
        expect(restored.modules).toBe(archived.modules);
    });

    it('un cycle archiver puis restaurer restitue exactement le même id et les mêmes modules', () => {
        const station = { id: 'sta-1', name: 'Station X', modules: [dummyModule] };
        const cycled = withStationRestored(withStationArchived(station));
        expect(cycled.id).toBe(station.id);
        expect(cycled.modules).toBe(station.modules);
        expect('archivedAt' in cycled).toBe(false);
    });
});
