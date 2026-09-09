// utils/signageSerializer.ts
// =================================================================
// SÉRIALISATION EXPORT/IMPORT/BACKUP DU RÉFÉRENTIEL SIGNALÉTIQUE
// -----------------------------------------------------------------
// Ce module centralise :
//   - la construction du payload d'export complet (lieux + référentiel) ;
//   - le parsing/validation d'un import (ancien ou nouveau format) ;
//   - l'application d'un import en base.
//
// Compatibilité des formats :
//   - Ancien export (v1) : { exportDate, data: Lieu[] } ou Lieu[] brut.
//     → l'import ne touche JAMAIS signageReferences : le référentiel local
//       survit à la restauration d'un vieux backup d'audits (aucune
//       régénération, aucun écrasement).
//   - Nouveau format (v2) : ajoute formatVersion, signageReferences.
//     → restauration complète de cette table.
// =================================================================

import { Lieu, SignageReference } from '../types';
import { db } from '../db';

export interface FullExportPayload {
    exportDate: string;
    formatVersion: 2;
    /** Clé 'data' conservée à l'identique du format v1 (compat restauration). */
    data: Lieu[];
    signageReferences: SignageReference[];
}

/** Résultat du parsing d'un import, quel que soit son format d'origine. */
export interface ParsedImportPayload {
    lieux: Lieu[];
    /** undefined = format ancien → ne pas toucher à la table du référentiel. */
    signageReferences?: SignageReference[];
}

// -----------------------------------------------------------------
// Validation
// -----------------------------------------------------------------

/** Valide CHAQUE lieu du tableau, pas seulement le premier — un fichier
 *  partiellement corrompu (un lieu valide en tête, un autre altéré plus
 *  loin) ne doit jamais passer la validation puis remplacer silencieusement
 *  toute la table lieux (db.lieux.clear() + bulkPut dans applyImportPayload). */
export const validateLieuxData = (data: any): data is Lieu[] => {
    if (!Array.isArray(data)) return false;
    return data.every(lieu =>
        lieu && typeof lieu === 'object' &&
        typeof lieu.id === 'string' && lieu.id.length > 0 &&
        typeof lieu.name === 'string' &&
        Array.isArray(lieu.modules)
    );
};

const AUDIT_TYPES = ['DAT', 'PR', 'ECA', 'PDQ'];

export const validateSignageReferences = (data: any): data is SignageReference[] => {
    if (!Array.isArray(data)) return false;
    return data.every(ref =>
        ref && typeof ref === 'object' &&
        typeof ref.id === 'string' && ref.id.length > 0 &&
        typeof ref.name === 'string' &&
        typeof ref.version === 'number' &&
        typeof ref.support === 'string' &&
        ref.scope && typeof ref.scope === 'object' &&
        AUDIT_TYPES.includes(ref.scope.auditType) &&
        ref.auditType === ref.scope.auditType // R11 : cohérence dérivée exigée à l'import
    );
};

// -----------------------------------------------------------------
// Construction du payload d'export complet (lit toutes les tables)
// -----------------------------------------------------------------

export const buildFullExportPayload = async (): Promise<FullExportPayload> => {
    const [lieux, references] = await Promise.all([
        db.lieux.toArray(),
        db.signageReferences.toArray(),
    ]);

    return {
        exportDate: new Date().toISOString(),
        formatVersion: 2,
        data: lieux,
        signageReferences: references,
    };
};

// -----------------------------------------------------------------
// Parsing + application d'un import
// -----------------------------------------------------------------

/**
 * Parse et valide une chaîne JSON d'import (formats v1 et v2).
 * @throws Error avec message utilisateur si le contenu est invalide.
 */
export const parseImportPayload = (jsonString: string): ParsedImportPayload => {
    let raw: any;
    try {
        raw = JSON.parse(jsonString);
    } catch {
        throw new Error('Format de fichier invalide.');
    }

    const lieux = (raw && raw.data && Array.isArray(raw.data)) ? raw.data : raw;
    if (!validateLieuxData(lieux)) throw new Error('Données invalides.');

    // Format ancien (v1) : pas de clé signageReferences → le référentiel
    // local est laissé strictement intact (ni écrasé, ni régénéré).
    if (!raw || typeof raw !== 'object' || raw.signageReferences === undefined) {
        return { lieux };
    }

    // Format v2 : le référentiel présent doit être valide, sinon on refuse
    // tout l'import (pas de restauration partielle silencieuse).
    if (!validateSignageReferences(raw.signageReferences)) {
        throw new Error('Référentiel signalétique invalide dans le fichier.');
    }

    return { lieux, signageReferences: raw.signageReferences };
};

/**
 * Applique un import parsé en base, dans une transaction unique.
 * - lieux : toujours remplacés (comportement historique inchangé) ;
 * - signageReferences : remplacé UNIQUEMENT si présent dans le payload
 *   (format v2) — un vieux backup n'y touche jamais.
 */
export const applyImportPayload = async (payload: ParsedImportPayload): Promise<void> => {
    await db.transaction('rw', [db.lieux, db.signageReferences], async () => {
        await db.lieux.clear();
        await db.lieux.bulkPut(payload.lieux);

        if (payload.signageReferences !== undefined) {
            await db.signageReferences.clear();
            await db.signageReferences.bulkPut(payload.signageReferences);
        }
    });
};
