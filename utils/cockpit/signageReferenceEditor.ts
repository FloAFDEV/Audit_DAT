// utils/cockpit/signageReferenceEditor.ts
// =================================================================
// ADMIN — création, modification courante, archivage/restauration d'une
// SignageReference (Lot 2a).
// -----------------------------------------------------------------
// Fonctions pures : ne touchent pas Dexie (même raison que
// utils/cockpit/arbitrage.ts — testables sans IndexedDB, l'écriture est
// la responsabilité de hooks/useAdminReferences.ts).
//
// R1 respecté : l'id d'une référence ne change JAMAIS après création
// (uuidv4, aucune dérivation du nom/code — un id n'est qu'un identifiant
// technique, pas le référentiel métier de l'utilisateur).
//
// R6/R7 : une MODIFICATION courante n'est pas un archivage — elle avance
// la version physique active et range l'ancienne dans previousVersions,
// borné à MAX_PREVIOUS_VERSIONS (historique COURT, FIFO — les versions
// plus anciennes que ça ne sont pas conservées : ce n'est pas un jalon
// réglementaire, seulement un repère « qu'est-ce qui a changé récemment »).
// Aucune version n'est ajoutée si rien n'a réellement changé (une
// modification est un événement réel, jamais du bruit).
//
// L'archivage (withArchived/withRestored) ne touche STRICTEMENT que le
// champ archivedAt — jamais version/previousVersions/scope : ce n'est pas
// une modification, c'est un changement de statut du cycle de vie.
// =================================================================
import { v4 as uuidv4 } from 'uuid';
import {
    SignageReference, SignageReferenceVersion, SignageScope, SignageSupport, SignageDimensions, SignagePlacement,
} from '../../types';

export const MAX_PREVIOUS_VERSIONS = 2;

export interface SignageReferenceEditableFields {
    name: string;
    code?: string;
    scope: SignageScope;
    support: SignageSupport;
    material?: string;
    dimensions?: SignageDimensions;
    placement: SignagePlacement;
    legacyDescription?: string;
}

const assertValidFields = (fields: SignageReferenceEditableFields) => {
    if (!fields.name.trim()) throw new Error('Le nom de la référence est obligatoire.');
};

/** Nouvelle référence — id purement technique (uuid), jamais saisi (R1). */
export const createSignageReference = (fields: SignageReferenceEditableFields): SignageReference => {
    assertValidFields(fields);
    return {
        id: uuidv4(),
        name: fields.name.trim(),
        code: fields.code,
        auditType: fields.scope.auditType, // R11 : toujours dérivé du scope
        scope: fields.scope,
        version: 1,
        support: fields.support,
        material: fields.material,
        dimensions: fields.dimensions,
        placement: fields.placement,
        legacyDescription: fields.legacyDescription,
    };
};

const fieldsEqualCurrent = (reference: SignageReference, fields: SignageReferenceEditableFields): boolean =>
    reference.name === fields.name.trim() &&
    (reference.code ?? undefined) === (fields.code ?? undefined) &&
    JSON.stringify(reference.scope) === JSON.stringify(fields.scope) &&
    reference.support === fields.support &&
    (reference.material ?? undefined) === (fields.material ?? undefined) &&
    JSON.stringify(reference.dimensions ?? null) === JSON.stringify(fields.dimensions ?? null) &&
    JSON.stringify(reference.placement ?? {}) === JSON.stringify(fields.placement ?? {}) &&
    (reference.legacyDescription ?? undefined) === (fields.legacyDescription ?? undefined);

/**
 * Applique une modification courante (PAS un archivage, R7). Id/famille
 * technique ne changent jamais ; scope/auditType PEUVENT changer (une
 * correction de périmètre d'implantation reste une modification, pas une
 * nouvelle référence). Si le support/matière/dimensions/placement/
 * description physique change, l'état précédent part dans
 * previousVersions (FIFO court) ; un simple changement de nom/code/scope
 * n'est pas versionné (ce n'est pas « ce qui est posé » qui change).
 */
export const applyReferenceEdit = (
    reference: SignageReference,
    fields: SignageReferenceEditableFields,
    changeReason?: string,
    now: string = new Date().toISOString(),
): SignageReference => {
    assertValidFields(fields);
    if (fieldsEqualCurrent(reference, fields)) return reference;

    const physicalChanged =
        reference.support !== fields.support ||
        (reference.material ?? undefined) !== (fields.material ?? undefined) ||
        JSON.stringify(reference.dimensions ?? null) !== JSON.stringify(fields.dimensions ?? null) ||
        JSON.stringify(reference.placement ?? {}) !== JSON.stringify(fields.placement ?? {}) ||
        (reference.legacyDescription ?? undefined) !== (fields.legacyDescription ?? undefined);

    if (!physicalChanged) {
        return {
            ...reference,
            name: fields.name.trim(),
            code: fields.code,
            auditType: fields.scope.auditType,
            scope: fields.scope,
        };
    }

    const snapshot: SignageReferenceVersion = {
        version: reference.version,
        name: reference.name,
        support: reference.support,
        material: reference.material,
        dimensions: reference.dimensions,
        placement: reference.placement,
        legacyDescription: reference.legacyDescription,
        effectiveTo: now,
        changeReason,
    };
    const previousVersions = [...(reference.previousVersions ?? []), snapshot].slice(-MAX_PREVIOUS_VERSIONS);

    return {
        ...reference,
        name: fields.name.trim(),
        code: fields.code,
        auditType: fields.scope.auditType,
        scope: fields.scope,
        version: reference.version + 1,
        support: fields.support,
        material: fields.material,
        dimensions: fields.dimensions,
        placement: fields.placement,
        legacyDescription: fields.legacyDescription,
        previousVersions,
    };
};

export const referenceToEditableFields = (reference: SignageReference): SignageReferenceEditableFields => ({
    name: reference.name,
    code: reference.code,
    scope: reference.scope,
    support: reference.support,
    material: reference.material,
    dimensions: reference.dimensions,
    placement: reference.placement,
    legacyDescription: reference.legacyDescription,
});

/** Archive une référence — AUCUNE cascade : version/previousVersions/scope
 *  strictement inchangés, seul archivedAt est posé. */
export const withArchived = (reference: SignageReference, now: string = new Date().toISOString()): SignageReference => ({
    ...reference,
    archivedAt: now,
});

/** Restaure une référence archivée — id/version/historique inchangés. */
export const withRestored = (reference: SignageReference): SignageReference => {
    const { archivedAt, ...rest } = reference;
    return rest;
};
