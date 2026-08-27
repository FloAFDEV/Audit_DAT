// hooks/useAdminAuditDefinitions.ts
// =================================================================
// ADMIN — écriture des AuditDefinition (Partie 2, audits configurables).
// -----------------------------------------------------------------
// Miroir volontaire de hooks/useAdminReferences.ts : fonctions pures
// exportées (testables sans harnais React), gated isAdminUnlocked, chaque
// écriture Dexie suivie d'un logEvent — même patron, même rigueur.
//
// Contrairement à signageReferences, cette table n'est PAS synchronisée
// dans useAuditStore : aucun formulaire terrain n'en dépend en temps réel
// (seuls Admin et la Nomenclature la lisent, tous deux via
// useAuditDefinitions(), rechargée après chaque écriture) — pas de raison
// d'ajouter un état global supplémentaire pour un besoin qui n'existe pas.
// =================================================================
import { useCallback } from 'react';
import { AuditDefinition } from '../types';
import { db } from '../db';
import useAuditStore from '../store';
import { logEvent } from '../utils/eventLog';
import {
    AuditDefinitionEditableFields, createAuditDefinition, applyDefinitionEdit,
    withDefinitionArchived, withDefinitionRestored,
} from '../utils/cockpit/auditDefinitionAdmin';

const assertUnlocked = () => {
    if (!useAuditStore.getState().isAdminUnlocked) {
        throw new Error('Action Admin refusée : accès non déverrouillé.');
    }
};

export const createDefinition = async (fields: AuditDefinitionEditableFields): Promise<AuditDefinition> => {
    assertUnlocked();
    const definition = createAuditDefinition(fields);
    await db.auditDefinitions.add(definition);
    await logEvent({
        type: 'AUDIT_DEFINITION_CREATED', entityType: 'auditDefinition', entityId: definition.id, entityLabel: definition.name,
        summary: `Audit configurable « ${definition.name} » créé`,
    });
    return definition;
};

export const updateDefinition = async (
    definition: AuditDefinition,
    fields: AuditDefinitionEditableFields,
): Promise<AuditDefinition> => {
    assertUnlocked();
    const updated = applyDefinitionEdit(definition, fields);
    await db.auditDefinitions.put(updated);
    await logEvent({
        type: 'AUDIT_DEFINITION_UPDATED', entityType: 'auditDefinition', entityId: updated.id, entityLabel: updated.name,
        summary: `Audit configurable « ${updated.name} » modifié`,
    });
    return updated;
};

export const archiveDefinition = async (definition: AuditDefinition): Promise<AuditDefinition> => {
    assertUnlocked();
    const updated = withDefinitionArchived(definition);
    await db.auditDefinitions.put(updated);
    await logEvent({
        type: 'AUDIT_DEFINITION_ARCHIVED', entityType: 'auditDefinition', entityId: updated.id, entityLabel: updated.name,
        summary: `Audit configurable « ${updated.name} » archivé`,
    });
    return updated;
};

export const restoreDefinition = async (definition: AuditDefinition): Promise<AuditDefinition> => {
    assertUnlocked();
    const updated = withDefinitionRestored(definition);
    await db.auditDefinitions.put(updated);
    await logEvent({
        type: 'AUDIT_DEFINITION_RESTORED', entityType: 'auditDefinition', entityId: updated.id, entityLabel: updated.name,
        summary: `Audit configurable « ${updated.name} » restauré`,
    });
    return updated;
};

/**
 * Suppression définitive — bloquée tant qu'au moins un module CUSTOM
 * référence encore cette définition, quelle que soit la station (aucune
 * cascade, message explicite nommant le blocage — même philosophie que
 * deleteReferenceForever pour le catalogue historique).
 */
export const deleteDefinitionForever = async (definition: AuditDefinition): Promise<void> => {
    assertUnlocked();
    const lieux = useAuditStore.getState().lieux;
    const stillUsed = lieux.some(l => l.modules.some(
        m => m.type === 'CUSTOM' && (m.data as { definitionId: string }).definitionId === definition.id
    ));
    if (stillUsed) {
        throw new Error(
            `Impossible de supprimer définitivement « ${definition.name} » : `
            + 'au moins une station porte encore un module de cet audit. Détachez-le (s\'il est vide) ou conservez la définition archivée.'
        );
    }
    await db.auditDefinitions.delete(definition.id);
    await logEvent({
        type: 'AUDIT_DEFINITION_DELETED', entityType: 'auditDefinition', entityId: definition.id, entityLabel: definition.name,
        summary: `Audit configurable « ${definition.name} » supprimé définitivement`,
    });
};

export const useAdminAuditDefinitions = () => {
    const create = useCallback(createDefinition, []);
    const update = useCallback(updateDefinition, []);
    const archive = useCallback(archiveDefinition, []);
    const restore = useCallback(restoreDefinition, []);
    const deleteForever = useCallback(deleteDefinitionForever, []);
    return { create, update, archive, restore, deleteForever };
};
