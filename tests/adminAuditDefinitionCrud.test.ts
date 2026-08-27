// tests/adminAuditDefinitionCrud.test.ts
// =================================================================
// Intégration hooks/useAdminAuditDefinitions.ts (Partie 2) — écriture
// Dexie RÉELLE. Vérifie le garde-fou isAdminUnlocked et surtout le
// garde-fou de deleteDefinitionForever : bloqué tant qu'au moins un
// module CUSTOM référence encore la définition, message explicite,
// aucune cascade.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import {
    createDefinition, updateDefinition, archiveDefinition, restoreDefinition, deleteDefinitionForever,
} from '../hooks/useAdminAuditDefinitions';
import { AuditDefinition, AuditModuleType, Lieu } from '../types';

const baseFields = {
    name: 'Plans de quartier', icon: 'MapPin', targetLines: ['A'] as const, excludedLieuIds: [], includedLieuIds: [],
};

beforeEach(async () => {
    await db.auditDefinitions.clear();
    await db.events.clear();
    useAuditStore.setState({ lieux: [], isAdminUnlocked: false });
});

describe('Garde-fou isAdminUnlocked', () => {
    it('les 5 actions refusent si non déverrouillé', async () => {
        const def: AuditDefinition = { id: 'd1', name: 'X', icon: 'MapPin', targetLines: [], excludedLieuIds: [], includedLieuIds: [] };
        await expect(createDefinition(baseFields as any)).rejects.toThrow(/Admin refusée/);
        await expect(updateDefinition(def, baseFields as any)).rejects.toThrow(/Admin refusée/);
        await expect(archiveDefinition(def)).rejects.toThrow(/Admin refusée/);
        await expect(restoreDefinition(def)).rejects.toThrow(/Admin refusée/);
        await expect(deleteDefinitionForever(def)).rejects.toThrow(/Admin refusée/);
    });
});

describe('createDefinition / updateDefinition', () => {
    it('crée réellement en base et journalise', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createDefinition(baseFields as any);

        expect(await db.auditDefinitions.get(created.id)).toBeTruthy();
        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'AUDIT_DEFINITION_CREATED')).toBe(true);
    });

    it('modifie sans changer l\'id, journalise', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createDefinition(baseFields as any);

        const updated = await updateDefinition(created, { ...baseFields, name: 'Plans de quartier v2', targetLines: ['A', 'B'] } as any);

        expect(updated.id).toBe(created.id);
        expect((await db.auditDefinitions.get(created.id))!.name).toBe('Plans de quartier v2');
        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'AUDIT_DEFINITION_UPDATED')).toBe(true);
    });
});

describe('archiveDefinition / restoreDefinition', () => {
    it('archive puis restaure, sans jamais toucher au reste des champs', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createDefinition(baseFields as any);

        const archived = await archiveDefinition(created);
        expect(archived.archivedAt).toBeTruthy();
        expect((await db.auditDefinitions.get(created.id))!.archivedAt).toBeTruthy();

        const restored = await restoreDefinition(archived);
        expect(restored.archivedAt).toBeUndefined();
        expect((await db.auditDefinitions.get(created.id))!.archivedAt).toBeUndefined();
    });
});

describe('deleteDefinitionForever — protégée tant qu\'un module CUSTOM l\'utilise', () => {
    it('supprime définitivement une définition non utilisée', async () => {
        useAuditStore.setState({ isAdminUnlocked: true, lieux: [] });
        const created = await createDefinition(baseFields as any);

        await deleteDefinitionForever(created);

        expect(await db.auditDefinitions.get(created.id)).toBeUndefined();
        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'AUDIT_DEFINITION_DELETED')).toBe(true);
    });

    it('refuse tant qu\'au moins un module CUSTOM référence encore la définition — message explicite, aucune cascade', async () => {
        const created = await (async () => {
            useAuditStore.setState({ isAdminUnlocked: true, lieux: [] });
            return createDefinition(baseFields as any);
        })();

        const lieuWithModule: Lieu = {
            id: 'l1', name: 'Station Test',
            modules: [{
                id: 'm1', type: AuditModuleType.CUSTOM, name: created.name, line: 'A',
                data: { id: 'c1', definitionId: created.id, stationName: 'Station Test', stationCode: '', items: {}, comment: '' },
            }],
        };
        useAuditStore.setState({ lieux: [lieuWithModule] });

        await expect(deleteDefinitionForever(created)).rejects.toThrow(/encore/);

        // Rien supprimé : la définition existe toujours, aucune cascade sur le module.
        expect(await db.auditDefinitions.get(created.id)).toBeTruthy();
        expect(useAuditStore.getState().lieux[0].modules).toHaveLength(1);
    });

    it('une fois le module détaché, la suppression définitive redevient possible', async () => {
        useAuditStore.setState({ isAdminUnlocked: true, lieux: [] });
        const created = await createDefinition(baseFields as any);

        const lieuWithModule: Lieu = {
            id: 'l1', name: 'Station Test',
            modules: [{
                id: 'm1', type: AuditModuleType.CUSTOM, name: created.name, line: 'A',
                data: { id: 'c1', definitionId: created.id, stationName: 'Station Test', stationCode: '', items: {}, comment: '' },
            }],
        };
        useAuditStore.setState({ lieux: [{ ...lieuWithModule, modules: [] }] }); // module retiré (détaché)

        await deleteDefinitionForever(created);
        expect(await db.auditDefinitions.get(created.id)).toBeUndefined();
    });
});
