// tests/adminReferenceCrud.test.ts
// =================================================================
// Intégration hooks/useAdminReferences.ts — écriture Dexie RÉELLE +
// synchronisation immédiate de useAuditStore.signageReferences (sans
// passer par le reload de useSignageReferences, propre au Cockpit).
// Vérifie le garde-fou isAdminUnlocked, et les garde-fous de
// deleteReferenceForever (réservée à une référence archivée, jamais un
// id du catalogue historique — sinon resolve() planterait au terrain).
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import {
    createReference, updateReference, archiveReference, restoreReference, deleteReferenceForever,
} from '../hooks/useAdminReferences';
import { referenceToEditableFields } from '../utils/cockpit/signageReferenceEditor';
import { SignageReference } from '../types';

const baseFields = {
    name: 'Repère Test Admin', scope: { auditType: 'DAT' as const }, support: 'adhesif' as const, placement: { zone: 'Quai' },
};

beforeEach(async () => {
    await db.signageReferences.clear();
    await db.signageAssets.clear();
    await db.events.clear();
    useAuditStore.setState({ signageReferences: [], lieux: [], isAdminUnlocked: false });
});

describe('Garde-fou isAdminUnlocked', () => {
    it('createReference / updateReference / archiveReference / restoreReference / deleteReferenceForever refusent si non déverrouillé', async () => {
        const ref: SignageReference = { id: 'ref-1', name: 'X', auditType: 'DAT', scope: { auditType: 'DAT' }, version: 1, support: 'adhesif', placement: {} };
        await expect(createReference(baseFields)).rejects.toThrow(/Admin refusée/);
        await expect(updateReference(ref, baseFields)).rejects.toThrow(/Admin refusée/);
        await expect(archiveReference(ref)).rejects.toThrow(/Admin refusée/);
        await expect(restoreReference(ref)).rejects.toThrow(/Admin refusée/);
        await expect(deleteReferenceForever(ref)).rejects.toThrow(/Admin refusée/);
    });
});

describe('createReference', () => {
    it('crée réellement en base ET synchronise store.signageReferences immédiatement', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createReference(baseFields);

        expect(await db.signageReferences.get(created.id)).toBeTruthy();
        expect(useAuditStore.getState().signageReferences.some(r => r.id === created.id)).toBe(true);

        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'REFERENCE_CREATED')).toBe(true);
    });
});

describe('updateReference', () => {
    it('applique la modification, persiste en base, synchronise le store', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createReference(baseFields);

        const updated = await updateReference(created, { ...baseFields, name: 'Nom modifié' });

        expect(updated.name).toBe('Nom modifié');
        expect((await db.signageReferences.get(created.id))!.name).toBe('Nom modifié');
        expect(useAuditStore.getState().signageReferences.find(r => r.id === created.id)!.name).toBe('Nom modifié');
    });

    it("aucun changement réel → ne réécrit rien, ne journalise rien (pas de bruit)", async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createReference(baseFields);
        await db.events.clear();

        await updateReference(created, referenceToEditableFields(created));

        expect(await db.events.count()).toBe(0);
    });
});

describe('archiveReference / restoreReference', () => {
    it('archive : persiste archivedAt en base et dans le store', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createReference(baseFields);

        await archiveReference(created);

        expect((await db.signageReferences.get(created.id))!.archivedAt).toBeTruthy();
        expect(useAuditStore.getState().signageReferences.find(r => r.id === created.id)!.archivedAt).toBeTruthy();
    });

    it('restaure : retire archivedAt en base et dans le store', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createReference(baseFields);
        const archived = await archiveReference(created);

        await restoreReference(archived);

        expect((await db.signageReferences.get(created.id))!.archivedAt).toBeUndefined();
        expect(useAuditStore.getState().signageReferences.find(r => r.id === created.id)!.archivedAt).toBeUndefined();
    });
});

describe('deleteReferenceForever — garde-fous', () => {
    it('autorise la suppression d\'une référence jamais utilisée/auditée, même non archivée', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createReference(baseFields);

        await expect(deleteReferenceForever(created)).resolves.toBeUndefined();
        expect(await db.signageReferences.get(created.id)).toBeUndefined();
    });

    it('refuse de supprimer une référence déjà utilisée/auditée sur le terrain, même archivée (l\'archivage ne suffit pas)', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createReference(baseFields);
        const archived = await archiveReference(created);
        const lieuWithUsage = {
            id: 'lieu-1', name: 'Station Test',
            modules: [{
                id: 'mod-1', type: 'DAT', name: 'DAT', line: 'A',
                data: {
                    id: 'mode-1', name: 'Station Test', type: 'METRO', line: 'A',
                    stations: [{
                        id: 'station-1', name: 'Station Test',
                        directions: [{
                            id: 'dir-1', name: 'Accès',
                            dats: [{ id: 'dat-1', name: 'DAT', adhesives: { [created.id]: 'OK' }, comment: '' }],
                        }],
                    }],
                },
            }],
        } as any;
        useAuditStore.setState({ lieux: [lieuWithUsage] });

        await expect(deleteReferenceForever(archived)).rejects.toThrow(/utilisée|auditée/);
        expect(await db.signageReferences.get(created.id)).toBeTruthy();
    });

    it('refuse de supprimer un id du catalogue historique, même archivé (le terrain en dépend — resolve() planterait)', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const legacyRef: SignageReference = {
            id: 'ad1', name: 'Repère historique', auditType: 'DAT', scope: { auditType: 'DAT' },
            version: 1, support: 'adhesif', placement: {}, archivedAt: '2026-01-01T00:00:00.000Z',
        };
        await db.signageReferences.put(legacyRef);
        useAuditStore.setState({ signageReferences: [legacyRef] });

        await expect(deleteReferenceForever(legacyRef)).rejects.toThrow(/historique/);
        expect(await db.signageReferences.get('ad1')).toBeTruthy();
    });

    it('supprime définitivement une addition Admin archivée, en base, dans le store, et ses assets associés', async () => {
        useAuditStore.setState({ isAdminUnlocked: true });
        const created = await createReference(baseFields);
        const archived = await archiveReference(created);
        await db.signageAssets.add({ id: 'asset-1', referenceId: created.id, blob: new Blob(['x']), createdAt: new Date().toISOString() } as any);

        await deleteReferenceForever(archived);

        expect(await db.signageReferences.get(created.id)).toBeUndefined();
        expect(useAuditStore.getState().signageReferences.some(r => r.id === created.id)).toBe(false);
        expect(await db.signageAssets.where('referenceId').equals(created.id).count()).toBe(0);

        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'REFERENCE_DELETED')).toBe(true);
    });
});
