// tests/signageSerializer.test.ts
// =================================================================
// Tests de fiabilité du référentiel signalétique (commit 2).
// Objectif : garantir qu'une base ENRICHIE MANUELLEMENT (corrections
// métier en administration) survit à l'export, à l'import, au backup
// avant reset — et qu'un vieux fichier d'export (format v1, sans
// référentiel) ne détruit jamais le travail administré.
// =================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import {
    buildFullExportPayload,
    parseImportPayload,
    applyImportPayload,
    blobToBase64,
    base64ToBlob,
    validateSignageReferences,
    validateLieuxData,
    validateAuditDefinitions,
} from '../utils/signageSerializer';
import { SignageReference, AuditDefinition } from '../types';

/** Remet la base dans l'état "seed frais" avant chaque test. */
const resetDb = async () => {
    await db.transaction('rw', [db.lieux, db.signageReferences, db.signageAssets, db.auditDefinitions], async () => {
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.signageAssets.clear();
        await db.auditDefinitions.clear();
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        // Un lieu minimal pour vérifier que le flux lieux reste intact.
        await db.lieux.bulkPut([{ id: 'lieu-test', name: 'Lieu Test', modules: [] }]);
    });
};

const SAMPLE_DEFINITION: AuditDefinition = {
    id: 'def-pdq', name: 'Plans de quartier', icon: 'MapPin',
    targetLines: ['A'], excludedLieuIds: ['lieu-x'], includedLieuIds: ['lieu-y'],
};

/**
 * Simule une correction métier faite en administration sur ad3 :
 * tous les champs administrables sensibles sont touchés (externalDocuments,
 * needsReview, previousVersions, sameAs, pairedWith, material, dimensions).
 */
const enrichAd3 = async (): Promise<SignageReference> => {
    const ad3 = (await db.signageReferences.get('ad3'))!;
    const enriched: SignageReference = {
        ...ad3,
        code: 'REP-DAT-003',
        material: 'Vinyle blanc enlevable, refendu',
        version: 2,
        support: 'dibond',
        dimensions: { width: 25.3, height: 22, unit: 'cm' },
        previousVersions: [{
            version: 1,
            support: 'adhesif',
            dimensions: { width: 25.3, height: 22, unit: 'cm' },
            effectiveTo: '2026-07-01T00:00:00.000Z',
            changeReason: 'Passage en Dibond — test',
        }],
        externalDocuments: [
            { provider: 'PICTO', fileReference: 'BPU ligne 45', docVersion: 'marché 2025', forVersion: 2 },
            { provider: 'REPRO', fileReference: 'REF-TEST-01', note: 'Ancien marché' },
        ],
        sameAs: ['ad4'],
        pairedWith: 'ad5',
        needsReview: true,
        placement: { zone: 'face-avant', position: 'haute', alignmentMark: 'butée platine CB', installationGuidance: 'Nettoyer avant pose.' },
    };
    await db.signageReferences.put(enriched);
    return enriched;
};

beforeEach(resetDb);

describe('Seed et validation', () => {
    it('le seed fournit 38 références valides', async () => {
        const refs = await db.signageReferences.toArray();
        expect(refs).toHaveLength(38);
        expect(validateSignageReferences(refs)).toBe(true);
    });

    it('rejette un référentiel où auditType diverge du scope (R11)', () => {
        const bad = [{ id: 'x', name: 'X', version: 1, support: 'adhesif', auditType: 'DAT', scope: { auditType: 'PR' } }];
        expect(validateSignageReferences(bad)).toBe(false);
    });
});

describe('validateLieuxData — chaque lieu du tableau est contrôlé (P0.4)', () => {
    const valid = (id: string): any => ({ id, name: `Lieu ${id}`, modules: [] });
    const invalid: any = { name: 'Sans id', modules: [] }; // id manquant

    it('un fichier entièrement valide passe', () => {
        expect(validateLieuxData([valid('a'), valid('b'), valid('c')])).toBe(true);
    });

    it('un tableau vide est accepté (contrat existant, inchangé)', () => {
        expect(validateLieuxData([])).toBe(true);
    });

    it('rejette si le PREMIER lieu est invalide', () => {
        expect(validateLieuxData([invalid, valid('b'), valid('c')])).toBe(false);
    });

    it('rejette si un lieu AU MILIEU est invalide (c\'était accepté avant le correctif P0.4)', () => {
        expect(validateLieuxData([valid('a'), invalid, valid('c')])).toBe(false);
    });

    it('rejette si le DERNIER lieu est invalide', () => {
        expect(validateLieuxData([valid('a'), valid('b'), invalid])).toBe(false);
    });

    it('rejette si PLUSIEURS lieux sont invalides', () => {
        expect(validateLieuxData([invalid, valid('b'), invalid])).toBe(false);
    });

    it('rejette un id vide ou un modules absent, même avec un id/name présents', () => {
        expect(validateLieuxData([{ id: '', name: 'X', modules: [] }])).toBe(false);
        expect(validateLieuxData([{ id: 'x', name: 'X' }])).toBe(false);
    });

    it('rejette une valeur qui n\'est pas un tableau', () => {
        expect(validateLieuxData({ id: 'x', name: 'X', modules: [] })).toBe(false);
        expect(validateLieuxData(null)).toBe(false);
    });
});

describe('Export complet (format v2)', () => {
    it("exporte une référence modifiée avec TOUS ses champs administrés", async () => {
        const enriched = await enrichAd3();

        const payload = await buildFullExportPayload();

        expect(payload.formatVersion).toBe(2);
        expect(payload.signageReferences).toHaveLength(38);
        const exported = payload.signageReferences.find(r => r.id === 'ad3')!;
        // Conservation exhaustive des champs sensibles du contrat.
        expect(exported.externalDocuments).toEqual(enriched.externalDocuments);
        expect(exported.needsReview).toBe(true);
        expect(exported.previousVersions).toEqual(enriched.previousVersions);
        expect(exported.sameAs).toEqual(['ad4']);
        expect(exported.pairedWith).toBe('ad5');
        expect(exported.material).toBe('Vinyle blanc enlevable, refendu');
        expect(exported.version).toBe(2);
        expect(exported.support).toBe('dibond');
        expect(exported.code).toBe('REP-DAT-003');
        expect(exported.placement.installationGuidance).toBe('Nettoyer avant pose.');
    });

    it('exporte les assets en base64 (jamais de Blob dans le fichier)', async () => {
        const content = new Uint8Array([1, 2, 3, 250, 251, 252]);
        await db.signageAssets.add({
            id: 'asset-1', referenceId: 'ad3', kind: 'poseExample',
            blob: new Blob([content], { type: 'image/jpeg' }),
            mimeType: 'image/jpeg', addedAt: '2026-07-21T00:00:00.000Z',
        });

        const payload = await buildFullExportPayload();

        expect(payload.signageAssets).toHaveLength(1);
        const asset = payload.signageAssets[0];
        expect('blob' in asset).toBe(false);
        expect(typeof asset.blobBase64).toBe('string');
        // Round-trip binaire exact.
        const restored = base64ToBlob(asset.blobBase64, asset.mimeType);
        expect(new Uint8Array(await restored.arrayBuffer())).toEqual(content);
    });
});

describe('Import / restauration (format v2)', () => {
    it('restaure intégralement une base enrichie après effacement total (scénario reset → restauration)', async () => {
        const enriched = await enrichAd3();
        const backup = JSON.stringify(await buildFullExportPayload());

        // Simule le hard reset : tout est perdu puis re-seedé depuis les constantes.
        await db.signageReferences.clear();
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        const reseeded = (await db.signageReferences.get('ad3'))!;
        expect(reseeded.version).toBe(1); // preuve que l'enrichissement a bien été perdu

        // Restauration via le backup.
        await applyImportPayload(parseImportPayload(backup));

        const restored = (await db.signageReferences.get('ad3'))!;
        expect(restored).toEqual(enriched); // conservation champ à champ
        expect(await db.signageReferences.count()).toBe(38);
    });

    it('restaure les assets avec leur contenu binaire', async () => {
        const content = new Uint8Array([9, 8, 7, 6]);
        await db.signageAssets.add({
            id: 'asset-2', referenceId: 'adbe1', kind: 'schema',
            blob: new Blob([content], { type: 'image/png' }),
            mimeType: 'image/png', addedAt: '2026-07-21T00:00:00.000Z',
        });
        const backup = JSON.stringify(await buildFullExportPayload());
        await db.signageAssets.clear();

        await applyImportPayload(parseImportPayload(backup));

        const restored = await db.signageAssets.get('asset-2');
        expect(restored).toBeDefined();
        expect(restored!.blob).toBeInstanceOf(Blob);
        expect(new Uint8Array(await restored!.blob.arrayBuffer())).toEqual(content);
    });

    it('refuse un fichier v2 dont le référentiel est corrompu (pas de restauration partielle)', async () => {
        const payload = await buildFullExportPayload();
        (payload.signageReferences as any)[0] = { id: '', broken: true };
        expect(() => parseImportPayload(JSON.stringify(payload)))
            .toThrow('Référentiel signalétique invalide dans le fichier.');
    });
});

describe("Compatibilité anciens exports (format v1) — protection du travail administré", () => {
    it("un import v1 { exportDate, data } ne touche JAMAIS signageReferences", async () => {
        const enriched = await enrichAd3();
        const oldFormat = JSON.stringify({
            exportDate: '2026-01-01',
            data: [{ id: 'lieu-importe', name: 'Lieu Importé', modules: [] }],
        });

        await applyImportPayload(parseImportPayload(oldFormat));

        // Les lieux sont remplacés (comportement historique)...
        expect((await db.lieux.toArray()).map(l => l.id)).toEqual(['lieu-importe']);
        // ...mais le référentiel administré est strictement intact.
        expect(await db.signageReferences.get('ad3')).toEqual(enriched);
        expect(await db.signageReferences.count()).toBe(38);
    });

    it('un import v1 en tableau brut (Lieu[]) est accepté et préserve aussi le référentiel', async () => {
        const enriched = await enrichAd3();
        const rawArray = JSON.stringify([{ id: 'lieu-brut', name: 'Lieu Brut', modules: [] }]);

        await applyImportPayload(parseImportPayload(rawArray));

        expect(await db.signageReferences.get('ad3')).toEqual(enriched);
    });

    it('un fichier illisible est rejeté avec le message historique', () => {
        expect(() => parseImportPayload('pas du json')).toThrow('Format de fichier invalide.');
        expect(() => parseImportPayload('{"data": 42}')).toThrow('Données invalides.');
    });
});

describe('Partie 2 — audits configurables (customAuditDefinitions)', () => {
    it('validateAuditDefinitions valide la forme minimale et rejette une entrée incomplète', () => {
        expect(validateAuditDefinitions([SAMPLE_DEFINITION])).toBe(true);
        expect(validateAuditDefinitions([{ id: 'x', name: 'X' }])).toBe(false); // icon/targetLines/... manquants
        expect(validateAuditDefinitions('pas un tableau')).toBe(false);
    });

    it('un export inclut toujours customAuditDefinitions (même vide)', async () => {
        const payload = await buildFullExportPayload();
        expect(payload.customAuditDefinitions).toEqual([]);
    });

    it('exporte puis restaure une définition intégralement (ciblage/exclusions/inclusions/icône)', async () => {
        await db.auditDefinitions.add(SAMPLE_DEFINITION);
        const backup = JSON.stringify(await buildFullExportPayload());

        await db.auditDefinitions.clear();
        await applyImportPayload(parseImportPayload(backup));

        const restored = await db.auditDefinitions.get('def-pdq');
        expect(restored).toEqual(SAMPLE_DEFINITION);
    });

    it('un import v1 (ancien format) ne touche JAMAIS auditDefinitions', async () => {
        await db.auditDefinitions.add(SAMPLE_DEFINITION);
        const oldFormat = JSON.stringify({ exportDate: '2026-01-01', data: [] });

        await applyImportPayload(parseImportPayload(oldFormat));

        expect(await db.auditDefinitions.get('def-pdq')).toEqual(SAMPLE_DEFINITION);
    });

    it('un import v2 SANS la clé customAuditDefinitions (export d\'avant la Partie 2) laisse la table locale intacte', async () => {
        await db.auditDefinitions.add(SAMPLE_DEFINITION);
        const payload: any = await buildFullExportPayload();
        delete payload.customAuditDefinitions; // simule un export produit avant cette fonctionnalité

        await applyImportPayload(parseImportPayload(JSON.stringify(payload)));

        expect(await db.auditDefinitions.get('def-pdq')).toEqual(SAMPLE_DEFINITION);
    });

    it('refuse tout l\'import si customAuditDefinitions est présent mais invalide (pas de restauration partielle)', async () => {
        const payload: any = await buildFullExportPayload();
        payload.customAuditDefinitions = [{ id: '', broken: true }];
        expect(() => parseImportPayload(JSON.stringify(payload)))
            .toThrow('Définitions d\'audits configurables invalides dans le fichier.');
    });
});

describe('Conversion Blob ↔ base64', () => {
    it('round-trip exact sur un contenu binaire > 32 Ko (chunking)', async () => {
        const big = new Uint8Array(100_000).map((_, i) => i % 256);
        const b64 = await blobToBase64(new Blob([big], { type: 'application/octet-stream' }));
        const back = base64ToBlob(b64, 'application/octet-stream');
        expect(new Uint8Array(await back.arrayBuffer())).toEqual(big);
    });
});
