// tests/adminStationCrud.test.ts
// =================================================================
// Intégration store.ts — CRUD Admin des stations (Lot 2b). Vérifie :
// le garde-fou isAdminUnlocked sur CHAQUE action, la persistance Dexie
// réelle (pas seulement l'état mémoire), l'ABSENCE DE CASCADE sur
// archivage (modules/données d'audit intacts), le journal d'événements,
// et le garde-fou "suppression définitive réservée à une station déjà
// archivée".
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { AuditModuleType, AdhesiveStatus, Lieu, TransportMode } from '../types';

const seededLieu = (): Lieu => ({
    id: 'lieu-admin-crud', name: 'Station Admin Test',
    modules: [{
        id: 'module-1', type: AuditModuleType.DAT, name: 'DAT', line: 'A',
        data: {
            id: 'mode-1', name: 'Station Admin Test', type: TransportMode.METRO, line: 'A',
            stations: [{
                id: 'sta-1', name: 'Station Admin Test', directions: [{
                    id: 'dir-1', name: 'Direction Test',
                    dats: [{ id: 'dat-1', name: 'DAT 01', adhesives: { a1: AdhesiveStatus.OK }, comment: '' }],
                }],
            }],
        },
    }],
});

beforeEach(async () => {
    await db.lieux.clear();
    await db.events.clear();
    useAuditStore.setState({ lieux: [], isAdminUnlocked: false });
});

describe('Garde-fou isAdminUnlocked — refuse toute action Admin verrouillée', () => {
    it('createStationAdmin refuse si non déverrouillé', async () => {
        await expect(useAuditStore.getState().createStationAdmin('Nouvelle Station')).rejects.toThrow(/Admin refusée/);
        expect(await db.lieux.count()).toBe(0);
    });

    it('renameStationAdmin / archiveStationAdmin / restoreStationAdmin / deleteStationForever refusent si non déverrouillé', async () => {
        const lieu = seededLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu] });

        await expect(useAuditStore.getState().renameStationAdmin(lieu.id, 'X')).rejects.toThrow(/Admin refusée/);
        await expect(useAuditStore.getState().archiveStationAdmin(lieu.id)).rejects.toThrow(/Admin refusée/);
        await expect(useAuditStore.getState().restoreStationAdmin(lieu.id)).rejects.toThrow(/Admin refusée/);
        await expect(useAuditStore.getState().deleteStationForever(lieu.id)).rejects.toThrow(/Admin refusée/);
    });
});

describe('createStationAdmin', () => {
    it('crée réellement en base ET synchronise le store dans le même geste', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await useAuditStore.getState().createStationAdmin('Nouvelle Station');

        expect(useAuditStore.getState().lieux.some(l => l.id === created.id)).toBe(true);
        expect(await db.lieux.get(created.id)).toBeTruthy();
        expect(created.modules).toEqual([]);

        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'STATION_CREATED')).toBe(true);
    });
});

describe('renameStationAdmin', () => {
    it('renomme sans changer l\'id ni les modules, persiste en base', async () => {
        const lieu = seededLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const updated = await useAuditStore.getState().renameStationAdmin(lieu.id, 'Nouveau nom');

        expect(updated.id).toBe(lieu.id);
        expect(updated.name).toBe('Nouveau nom');
        expect((await db.lieux.get(lieu.id))!.name).toBe('Nouveau nom');
        expect(useAuditStore.getState().lieux.find(l => l.id === lieu.id)!.modules).toHaveLength(1);
    });
});

describe('archiveStationAdmin / restoreStationAdmin — AUCUNE CASCADE', () => {
    it('archiver ne touche JAMAIS modules ni les données d\'audit déjà saisies', async () => {
        const lieu = seededLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().archiveStationAdmin(lieu.id);

        const stored = await db.lieux.get(lieu.id);
        expect(stored!.archivedAt).toBeTruthy();
        expect(stored!.modules).toEqual(lieu.modules); // équipements et statuts intacts
        const inState = useAuditStore.getState().lieux.find(l => l.id === lieu.id)!;
        expect(inState.archivedAt).toBeTruthy();

        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'STATION_ARCHIVED')).toBe(true);
    });

    it('restaurer retire archivedAt sans toucher aux modules', async () => {
        const lieu = { ...seededLieu(), archivedAt: '2026-01-01T00:00:00.000Z' };
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().restoreStationAdmin(lieu.id);

        const stored = await db.lieux.get(lieu.id);
        expect(stored!.archivedAt).toBeUndefined();
        expect(stored!.modules).toEqual(lieu.modules);

        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'STATION_RESTORED')).toBe(true);
    });
});

describe('deleteStationForever — réservé aux stations déjà archivées', () => {
    it('refuse de supprimer une station encore active (garde-fou politique)', async () => {
        const lieu = seededLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await expect(useAuditStore.getState().deleteStationForever(lieu.id)).rejects.toThrow(/archivée/);
        expect(await db.lieux.get(lieu.id)).toBeTruthy();
    });

    it('supprime définitivement une station archivée, en base ET dans le store', async () => {
        const lieu = { ...seededLieu(), archivedAt: '2026-01-01T00:00:00.000Z' };
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().deleteStationForever(lieu.id);

        expect(await db.lieux.get(lieu.id)).toBeUndefined();
        expect(useAuditStore.getState().lieux.some(l => l.id === lieu.id)).toBe(false);

        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'STATION_DELETED')).toBe(true);
    });

    it('lève une erreur explicite si la station est introuvable', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        await expect(useAuditStore.getState().deleteStationForever('id-inexistant')).rejects.toThrow(/introuvable/);
    });
});
