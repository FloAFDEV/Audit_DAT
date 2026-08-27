// tests/signageReferenceEditor.test.ts
// Fonctions pures (utils/cockpit/signageReferenceEditor.ts) — pas d'IndexedDB.
// Vérifie R1 (id technique), R6/R7 (modification ≠ archivage, versioning
// FIFO court uniquement sur changement physique réel), et l'absence de
// cascade sur archivage/restauration.
import { describe, it, expect } from 'vitest';
import {
    MAX_PREVIOUS_VERSIONS, createSignageReference, applyReferenceEdit, referenceToEditableFields,
    withArchived, withRestored, SignageReferenceEditableFields,
} from '../utils/cockpit/signageReferenceEditor';
import { SignageReference } from '../types';

const baseFields: SignageReferenceEditableFields = {
    name: 'Repère Test', scope: { auditType: 'DAT' }, support: 'adhesif', placement: { zone: 'Quai' },
};

describe('createSignageReference', () => {
    it('génère un id technique (uuid), jamais dérivé du nom', () => {
        const a = createSignageReference(baseFields);
        const b = createSignageReference(baseFields);
        expect(a.id).not.toBe(b.id);
        expect(a.id).not.toContain('Repère');
    });

    it("dérive auditType de scope.auditType (R11), démarre en version 1", () => {
        const ref = createSignageReference({ ...baseFields, scope: { auditType: 'PR', equipmentTypes: undefined } });
        expect(ref.auditType).toBe('PR');
        expect(ref.version).toBe(1);
    });

    it('rejette un nom vide', () => {
        expect(() => createSignageReference({ ...baseFields, name: '  ' })).toThrow();
    });
});

describe('applyReferenceEdit — R7 : une modification n\'est jamais un archivage', () => {
    const reference: SignageReference = {
        id: 'ref-1', name: 'Original', auditType: 'DAT', scope: { auditType: 'DAT' },
        version: 1, support: 'adhesif', material: 'PVC', placement: { zone: 'Quai' },
    };

    it("aucun changement réel → retourne EXACTEMENT le même objet (pas de bruit)", () => {
        const result = applyReferenceEdit(reference, referenceToEditableFields(reference));
        expect(result).toBe(reference);
    });

    it("changement de nom/code/scope SEUL (non physique) → pas de versioning, previousVersions absent", () => {
        const updated = applyReferenceEdit(reference, { ...baseFields, name: 'Nouveau nom', support: 'adhesif', material: 'PVC', placement: { zone: 'Quai' } });
        expect(updated.name).toBe('Nouveau nom');
        expect(updated.version).toBe(1);
        expect(updated.previousVersions).toBeUndefined();
    });

    it("changement PHYSIQUE (support) → version+1, ancien état archivé dans previousVersions", () => {
        const updated = applyReferenceEdit(reference, { ...baseFields, name: reference.name, support: 'dibond', material: 'PVC', placement: { zone: 'Quai' } }, 'passage au dibond', '2026-01-01T00:00:00.000Z');
        expect(updated.version).toBe(2);
        expect(updated.support).toBe('dibond');
        expect(updated.previousVersions).toHaveLength(1);
        expect(updated.previousVersions![0]).toMatchObject({ version: 1, support: 'adhesif', changeReason: 'passage au dibond', effectiveTo: '2026-01-01T00:00:00.000Z' });
    });

    it("historique borné à MAX_PREVIOUS_VERSIONS (FIFO court, pas un jalon réglementaire)", () => {
        let current = reference;
        for (let i = 0; i < MAX_PREVIOUS_VERSIONS + 2; i++) {
            current = applyReferenceEdit(current, { ...baseFields, name: reference.name, support: i % 2 === 0 ? 'dibond' : 'adhesif', placement: { zone: 'Quai' } }, `changement ${i}`);
        }
        expect(current.previousVersions).toHaveLength(MAX_PREVIOUS_VERSIONS);
    });

    it('ne mute jamais la référence originale', () => {
        applyReferenceEdit(reference, { ...baseFields, name: reference.name, support: 'dibond', placement: { zone: 'Quai' } });
        expect(reference.support).toBe('adhesif');
        expect(reference.version).toBe(1);
    });

    it('rejette un nom vide', () => {
        expect(() => applyReferenceEdit(reference, { ...baseFields, name: '  ' })).toThrow();
    });
});

describe('withArchived / withRestored — aucune cascade sur version/scope', () => {
    const reference: SignageReference = {
        id: 'ref-1', name: 'Original', auditType: 'DAT', scope: { auditType: 'DAT' },
        version: 3, support: 'adhesif', placement: {}, previousVersions: [{ version: 1, support: 'adhesif', effectiveTo: '2025-01-01T00:00:00.000Z' }],
    };

    it('archive : pose uniquement archivedAt — version/previousVersions/scope inchangés', () => {
        const archived = withArchived(reference, '2026-01-01T00:00:00.000Z');
        expect(archived.archivedAt).toBe('2026-01-01T00:00:00.000Z');
        expect(archived.version).toBe(3);
        expect(archived.previousVersions).toBe(reference.previousVersions);
        expect(archived.scope).toBe(reference.scope);
    });

    it('restaure : retire archivedAt, id/version/historique inchangés', () => {
        const archived = withArchived(reference);
        const restored = withRestored(archived);
        expect(restored.archivedAt).toBeUndefined();
        expect(restored.id).toBe(reference.id);
        expect(restored.version).toBe(3);
        expect(restored.previousVersions).toBe(reference.previousVersions);
    });
});

describe('referenceToEditableFields', () => {
    it('produit des champs ré-injectables tel quel dans applyReferenceEdit (round-trip sans changement)', () => {
        const reference: SignageReference = {
            id: 'ref-1', name: 'Original', code: 'C1', auditType: 'DAT', scope: { auditType: 'DAT' },
            version: 1, support: 'adhesif', material: 'PVC', dimensions: { width: 10, height: 5, unit: 'cm' }, placement: { zone: 'Quai' },
        };
        const fields = referenceToEditableFields(reference);
        expect(applyReferenceEdit(reference, fields)).toBe(reference);
    });
});
