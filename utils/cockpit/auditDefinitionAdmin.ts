// utils/cockpit/auditDefinitionAdmin.ts
// =================================================================
// ADMIN — cycle de vie d'une AuditDefinition (Partie 2 : audits
// configurables) + calcul PUR du ciblage réseau.
// -----------------------------------------------------------------
// Fonctions pures, aucune dépendance Dexie : même patron que
// utils/cockpit/signageReferenceEditor.ts (l'écriture est la
// responsabilité de hooks/useAdminAuditDefinitions.ts).
//
// R1 (identique au référentiel) : l'id d'une définition ne change jamais
// après création (uuidv4, jamais dérivé du nom).
//
// Ciblage — délibérément PLAT et sans moteur de règles : trois listes
// (lignes ciblées, exclusions, inclusions) lues une seule fois au moment
// où l'admin déclenche « Appliquer au réseau ». Ce ne sont jamais des
// règles réévaluées en continu ni une source de suppression automatique —
// computeTargetLieuIds répond uniquement à « où proposer l'audit
// aujourd'hui ? », jamais à « que faut-il retirer ? ».
//
// Appartenance à une ligne : réutilise EXACTEMENT la convention déjà en
// place partout dans l'app (data/config.ts::AUDIT_CATEGORIES, prédicat
// `m.line === 'A'`) plutôt que d'inventer un second registre réseau — une
// station appartient à une ligne si elle y a déjà au moins un module
// existant (DAT, ECA...). Fonctionne aussi bien pour le réseau historique
// que pour une station créée en Admin, sans liste statique dupliquée.
// =================================================================
import { v4 as uuidv4 } from 'uuid';
import { AuditDefinition, AuditModuleType, Lieu } from '../../types';
import { ModuleLine } from './moduleAdmin';

export interface AuditDefinitionEditableFields {
    name: string;
    icon: string;
    targetLines: ModuleLine[];
    excludedLieuIds: string[];
    includedLieuIds: string[];
}

const assertValidFields = (fields: AuditDefinitionEditableFields) => {
    if (!fields.name.trim()) throw new Error("Le nom de l'audit configurable est obligatoire.");
    if (!fields.icon.trim()) throw new Error("Une icône est obligatoire.");
};

/** Nouvelle définition — id purement technique (uuid), jamais saisi (R1). */
export const createAuditDefinition = (fields: AuditDefinitionEditableFields): AuditDefinition => {
    assertValidFields(fields);
    return {
        id: uuidv4(),
        name: fields.name.trim(),
        icon: fields.icon,
        targetLines: [...fields.targetLines],
        excludedLieuIds: [...fields.excludedLieuIds],
        includedLieuIds: [...fields.includedLieuIds],
    };
};

/** Modification courante — id/archivedAt jamais touchés ici (deux
 *  responsabilités distinctes, cf. withArchived/withRestored). */
export const applyDefinitionEdit = (
    definition: AuditDefinition,
    fields: AuditDefinitionEditableFields,
): AuditDefinition => {
    assertValidFields(fields);
    return {
        ...definition,
        name: fields.name.trim(),
        icon: fields.icon,
        targetLines: [...fields.targetLines],
        excludedLieuIds: [...fields.excludedLieuIds],
        includedLieuIds: [...fields.includedLieuIds],
    };
};

export const definitionToEditableFields = (definition: AuditDefinition): AuditDefinitionEditableFields => ({
    name: definition.name,
    icon: definition.icon,
    targetLines: definition.targetLines,
    excludedLieuIds: definition.excludedLieuIds,
    includedLieuIds: definition.includedLieuIds,
});

/** Archive une définition — AUCUNE cascade : ne touche que archivedAt.
 *  Une définition archivée n'est plus proposée pour de nouveaux
 *  déploiements (computeTargetLieuIds n'est jamais appelée pour elle côté
 *  UI) mais les modules déjà matérialisés restent strictement intacts. */
export const withDefinitionArchived = (definition: AuditDefinition, now: string = new Date().toISOString()): AuditDefinition => ({
    ...definition,
    archivedAt: now,
});

export const withDefinitionRestored = (definition: AuditDefinition): AuditDefinition => {
    const { archivedAt, ...rest } = definition;
    return rest;
};

// -----------------------------------------------------------------
// Ciblage réseau — fonctions PURES, aucune dépendance Dexie/store.
// -----------------------------------------------------------------

/** Une station appartient à une ligne si elle y possède déjà au moins un
 *  module (n'importe quel type NON CUSTOM — le module CUSTOM lui-même ne
 *  compte jamais comme preuve d'appartenance, pour éviter qu'une
 *  définition ne s'auto-alimente). Stations archivées toujours exclues. */
const lieuBelongsToLine = (lieu: Lieu, line: ModuleLine): boolean =>
    lieu.modules.some(m => m.type !== AuditModuleType.CUSTOM && m.line === line);

/**
 * Calcule l'ensemble des stations ciblées par une définition, à l'instant
 * présent — fonction pure, testable sans IndexedDB. Ne matérialise rien :
 * sert uniquement à savoir OÙ proposer/ajouter l'audit (jamais à décider
 * quoi retirer — cf. en-tête).
 *
 * Règle : (stations sur au moins une des targetLines, non archivées)
 *         moins excludedLieuIds
 *         plus includedLieuIds (stations valides, non archivées)
 */
export const computeTargetLieuIds = (definition: AuditDefinition, lieux: Lieu[]): string[] => {
    const activeLieux = lieux.filter(l => !l.archivedAt);
    const byLine = activeLieux.filter(l => definition.targetLines.some(line => lieuBelongsToLine(l, line)));
    const excluded = new Set(definition.excludedLieuIds);

    const result = new Set(byLine.filter(l => !excluded.has(l.id)).map(l => l.id));

    const validIds = new Set(activeLieux.map(l => l.id));
    for (const id of definition.includedLieuIds) {
        if (validIds.has(id)) result.add(id);
    }

    return Array.from(result);
};

/** Nombre de modules CUSTOM déjà matérialisés pour cette définition,
 *  tous statuts confondus (vide ou non) — sert uniquement à l'affichage
 *  Admin (« N modules déjà déployés »), jamais à une décision de calcul. */
export const computeDeployedCount = (definition: AuditDefinition, lieux: Lieu[]): number => {
    let count = 0;
    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            if (module.type === AuditModuleType.CUSTOM && (module.data as { definitionId: string }).definitionId === definition.id) {
                count++;
            }
        }
    }
    return count;
};

/** Sous-ensemble de computeTargetLieuIds qui n'a pas encore de module —
 *  c'est exactement ce que « Appliquer au réseau » doit matérialiser.
 *  Idempotence par construction : ré-appeler après matérialisation renvoie []. */
export const computeMissingLieuIds = (definition: AuditDefinition, lieux: Lieu[]): string[] => {
    const target = new Set(computeTargetLieuIds(definition, lieux));
    const already = new Set<string>();
    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            if (module.type === AuditModuleType.CUSTOM && (module.data as { definitionId: string }).definitionId === definition.id) {
                already.add(lieu.id);
            }
        }
    }
    return Array.from(target).filter(id => !already.has(id));
};
