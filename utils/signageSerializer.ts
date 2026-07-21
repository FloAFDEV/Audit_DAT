// utils/signageSerializer.ts
// =================================================================
// SÉRIALISATION EXPORT/IMPORT/BACKUP DU RÉFÉRENTIEL SIGNALÉTIQUE
// -----------------------------------------------------------------
// Objectif (commit 2) : rendre signageReferences fiable AVANT d'autoriser
// son édition humaine. Ce module centralise :
//   - la construction du payload d'export complet (lieux + référentiel) ;
//   - le parsing/validation d'un import (ancien ou nouveau format) ;
//   - l'application d'un import en base ;
//   - la conversion Blob ↔ base64 des assets (base64 UNIQUEMENT dans le
//     fichier d'export — le stockage IndexedDB reste en Blob, règle R5/R6).
//
// Compatibilité des formats :
//   - Ancien export (v1) : { exportDate, data: Lieu[] } ou Lieu[] brut.
//     → l'import ne touche JAMAIS signageReferences/signageAssets :
//       le référentiel administré survit à la restauration d'un vieux
//       backup d'audits (aucune régénération, aucun écrasement).
//   - Nouveau format (v2) : ajoute formatVersion, signageReferences,
//     signageAssets (base64). → restauration complète des deux tables.
// =================================================================

import { Lieu, SignageReference, SignageAsset } from '../types';
import { db } from '../db';

// -----------------------------------------------------------------
// Blob ↔ base64 (compatible navigateur ET Node/tests : pas de FileReader)
// -----------------------------------------------------------------

export const blobToBase64 = async (blob: Blob): Promise<string> => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // Conversion par blocs pour éviter la limite d'arguments de String.fromCharCode.
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
};

export const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType });
};

// -----------------------------------------------------------------
// Formats de payload
// -----------------------------------------------------------------

/** Asset sérialisé pour le fichier d'export (le champ blob devient base64). */
export interface SerializedSignageAsset extends Omit<SignageAsset, 'blob'> {
    blobBase64: string;
}

export interface FullExportPayload {
    exportDate: string;
    formatVersion: 2;
    /** Clé 'data' conservée à l'identique du format v1 (compat restauration). */
    data: Lieu[];
    signageReferences: SignageReference[];
    signageAssets: SerializedSignageAsset[];
}

/** Résultat du parsing d'un import, quel que soit son format d'origine. */
export interface ParsedImportPayload {
    lieux: Lieu[];
    /** undefined = format ancien → ne pas toucher aux tables du référentiel. */
    signageReferences?: SignageReference[];
    signageAssets?: SignageAsset[];
}

// -----------------------------------------------------------------
// Validation
// -----------------------------------------------------------------

export const validateLieuxData = (data: any): data is Lieu[] => {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true;
    const firstLieu = data[0];
    return 'id' in firstLieu && 'name' in firstLieu && 'modules' in firstLieu && Array.isArray(firstLieu.modules);
};

const AUDIT_TYPES = ['DAT', 'PR', 'ECA'];

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

const validateSerializedAssets = (data: any): data is SerializedSignageAsset[] => {
    if (!Array.isArray(data)) return false;
    return data.every(a =>
        a && typeof a === 'object' &&
        typeof a.id === 'string' &&
        typeof a.referenceId === 'string' &&
        typeof a.blobBase64 === 'string' &&
        typeof a.mimeType === 'string'
    );
};

// -----------------------------------------------------------------
// Construction du payload d'export complet (lit toutes les tables)
// -----------------------------------------------------------------

export const buildFullExportPayload = async (): Promise<FullExportPayload> => {
    const [lieux, references, assets] = await Promise.all([
        db.lieux.toArray(),
        db.signageReferences.toArray(),
        db.signageAssets.toArray(),
    ]);

    const serializedAssets: SerializedSignageAsset[] = await Promise.all(
        assets.map(async ({ blob, ...rest }) => ({
            ...rest,
            blobBase64: await blobToBase64(blob),
        }))
    );

    return {
        exportDate: new Date().toISOString(),
        formatVersion: 2,
        data: lieux,
        signageReferences: references,
        signageAssets: serializedAssets,
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

    let signageAssets: SignageAsset[] | undefined;
    if (raw.signageAssets !== undefined) {
        if (!validateSerializedAssets(raw.signageAssets)) {
            throw new Error('Assets du référentiel invalides dans le fichier.');
        }
        signageAssets = (raw.signageAssets as SerializedSignageAsset[]).map(({ blobBase64, ...rest }) => ({
            ...rest,
            blob: base64ToBlob(blobBase64, rest.mimeType),
        }));
    }

    return { lieux, signageReferences: raw.signageReferences, signageAssets };
};

/**
 * Applique un import parsé en base, dans une transaction unique.
 * - lieux : toujours remplacés (comportement historique inchangé) ;
 * - signageReferences/signageAssets : remplacés UNIQUEMENT si présents
 *   dans le payload (format v2) — un vieux backup n'y touche jamais.
 */
export const applyImportPayload = async (payload: ParsedImportPayload): Promise<void> => {
    await db.transaction('rw', [db.lieux, db.signageReferences, db.signageAssets], async () => {
        await db.lieux.clear();
        await db.lieux.bulkPut(payload.lieux);

        if (payload.signageReferences !== undefined) {
            await db.signageReferences.clear();
            await db.signageReferences.bulkPut(payload.signageReferences);

            await db.signageAssets.clear();
            if (payload.signageAssets && payload.signageAssets.length > 0) {
                await db.signageAssets.bulkPut(payload.signageAssets);
            }
        }
    });
};
