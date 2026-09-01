// hooks/useAdminReferences.ts
// =================================================================
// ADMIN — écriture des SignageReference (Lot 2a/2b).
// -----------------------------------------------------------------
// Miroir volontaire de hooks/useArbitrage.ts : fonctions pures exportées
// (testables sans harnais React), + hook useCallback pour les composants.
// Le Cockpit lit le référentiel via useSignageReferences() (rechargé au
// montage) — ici on écrit Dexie ET on synchronise useAuditStore.setState
// directement, pour que les formulaires terrain (qui lisent
// store.signageReferences) voient le changement sans reload complet.
// =================================================================
import { useCallback } from 'react';
import { SignageReference } from '../types';
import { db } from '../db';
import useAuditStore from '../store';
import { logEvent } from '../utils/eventLog';
import { isLegacyCatalogId } from '../utils/effectiveAdhesives';
import {
    SignageReferenceEditableFields, createSignageReference, applyReferenceEdit, withArchived, withRestored,
    isReferenceEverUsed,
} from '../utils/cockpit/signageReferenceEditor';

const assertUnlocked = () => {
    if (!useAuditStore.getState().isAdminUnlocked) {
        throw new Error('Action Admin refusée : accès non déverrouillé.');
    }
};

const upsertInStore = (reference: SignageReference) => {
    useAuditStore.setState(state => ({
        signageReferences: [...state.signageReferences.filter(r => r.id !== reference.id), reference],
    }));
};

const removeFromStore = (id: string) => {
    useAuditStore.setState(state => ({
        signageReferences: state.signageReferences.filter(r => r.id !== id),
    }));
};

export const createReference = async (fields: SignageReferenceEditableFields): Promise<SignageReference> => {
    assertUnlocked();
    const reference = createSignageReference(fields);
    await db.signageReferences.add(reference);
    upsertInStore(reference);
    await logEvent({
        type: 'REFERENCE_CREATED', entityType: 'reference', entityId: reference.id, entityLabel: reference.name,
        summary: `Référence « ${reference.name} » créée`,
    });
    return reference;
};

export const updateReference = async (
    reference: SignageReference,
    fields: SignageReferenceEditableFields,
    changeReason?: string,
): Promise<SignageReference> => {
    assertUnlocked();
    const updated = applyReferenceEdit(reference, fields, changeReason);
    if (updated === reference) return reference; // aucun changement réel
    await db.signageReferences.put(updated);
    upsertInStore(updated);
    await logEvent({
        type: 'REFERENCE_UPDATED', entityType: 'reference', entityId: updated.id, entityLabel: updated.name,
        summary: `Référence « ${updated.name} » modifiée`,
    });
    return updated;
};

export const archiveReference = async (reference: SignageReference): Promise<SignageReference> => {
    assertUnlocked();
    const updated = withArchived(reference);
    await db.signageReferences.put(updated);
    upsertInStore(updated);
    await logEvent({
        type: 'REFERENCE_ARCHIVED', entityType: 'reference', entityId: updated.id, entityLabel: updated.name,
        summary: `Référence « ${updated.name} » archivée`,
    });
    return updated;
};

export const restoreReference = async (reference: SignageReference): Promise<SignageReference> => {
    assertUnlocked();
    const updated = withRestored(reference);
    await db.signageReferences.put(updated);
    upsertInStore(updated);
    await logEvent({
        type: 'REFERENCE_RESTORED', entityType: 'reference', entityId: updated.id, entityLabel: updated.name,
        summary: `Référence « ${updated.name} » restaurée`,
    });
    return updated;
};

/**
 * Suppression définitive — garde-fous : la référence ne doit pas faire
 * partie du catalogue historique (isLegacyCatalogId — sinon resolve()
 * planterait pour tout DAT/ECA/équipement qui la référence encore dans
 * ses données d'audit existantes), et ne doit avoir JAMAIS été
 * utilisée/auditée sur le terrain (isReferenceEverUsed — pas une règle
 * basée sur archivedAt : une référence jamais utilisée doit rester
 * supprimable même non archivée, et une référence déjà utilisée/auditée
 * doit rester protégée même archivée, pour conserver l'historique réel
 * du patrimoine).
 */
export const deleteReferenceForever = async (reference: SignageReference): Promise<void> => {
    assertUnlocked();
    if (isLegacyCatalogId(reference.id)) {
        throw new Error('Cette référence fait partie du catalogue historique et ne peut pas être supprimée définitivement.');
    }
    if (isReferenceEverUsed(reference.id, useAuditStore.getState().lieux)) {
        throw new Error('Cette référence a déjà été utilisée/auditée sur le terrain : elle doit rester archivée pour conserver son historique, pas supprimée.');
    }
    const assets = await db.signageAssets.where('referenceId').equals(reference.id).toArray();
    await db.signageAssets.bulkDelete(assets.map(a => a.id));
    await db.signageReferences.delete(reference.id);
    removeFromStore(reference.id);
    await logEvent({
        type: 'REFERENCE_DELETED', entityType: 'reference', entityId: reference.id, entityLabel: reference.name,
        summary: `Référence « ${reference.name} » supprimée définitivement`,
    });
};

export const useAdminReferences = () => {
    const create = useCallback(createReference, []);
    const update = useCallback(updateReference, []);
    const archive = useCallback(archiveReference, []);
    const restore = useCallback(restoreReference, []);
    const deleteForever = useCallback(deleteReferenceForever, []);
    return { create, update, archive, restore, deleteForever };
};
