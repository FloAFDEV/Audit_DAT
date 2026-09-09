// tests/effectiveAdhesives.test.ts
// =================================================================
// Pont catalogue historique (ordre/appartenance figés) ↔ référentiel
// Dexie signageReferences (contenu). Fonction pure : pas d'IndexedDB.
// Vérifie : l'ordre historique n'est jamais régressé, le garde-fou
// resolve() sur id historique manquant, le comportement de la surcharge
// locale adhesiveIds — résolution individuelle, jamais equipment.adhesives
// touché, isDisabled reste visible.
// =================================================================
import { describe, it, expect } from 'vitest';
import {
    PR_LOCATION_SEPARATOR, splitLegacyPrDescription, buildLegacyPrDescription, isLegacyCatalogId,
    getEffectiveAdhesives, getEffectiveEcaAdhesives, getEffectiveEquipmentAdhesives,
} from '../utils/effectiveAdhesives';
import { ADHESIVES, getPrAdhesives, getEcaAdhesives } from '../data/adhesives';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { EquipmentType, EcaEquipmentType, SignageReference } from '../types';

const SEED = buildSignageReferencesSeed();

describe('PR_LOCATION_SEPARATOR / splitLegacyPrDescription / buildLegacyPrDescription — round-trip', () => {
    it('round-trip exact : build puis split restitue description et localisation', () => {
        const legacyDescription = buildLegacyPrDescription('Adhésif « X » // 10x10cm', 'Sur la casquette');
        const { description, location } = splitLegacyPrDescription(legacyDescription, 'fallback desc', 'fallback loc');
        expect(description).toBe('Adhésif « X » // 10x10cm');
        expect(location).toBe('Sur la casquette');
    });

    it('localisation vide : build ne pose pas le séparateur', () => {
        const built = buildLegacyPrDescription('Description seule', '');
        expect(built).toBe('Description seule');
        expect(built).not.toContain(PR_LOCATION_SEPARATOR);
    });

    it('legacyDescription absent : split retombe sur les fallbacks fournis', () => {
        const { description, location } = splitLegacyPrDescription(undefined, 'fallback desc', 'fallback loc');
        expect(description).toBe('fallback desc');
        expect(location).toBe('fallback loc');
    });

    it('legacyDescription sans séparateur : tout le texte devient la description, localisation = fallback', () => {
        const { description, location } = splitLegacyPrDescription('Texte libre sans séparateur', 'x', 'fallback loc');
        expect(description).toBe('Texte libre sans séparateur');
        expect(location).toBe('fallback loc');
    });
});

describe('isLegacyCatalogId', () => {
    it('reconnaît un id du catalogue historique DAT', () => {
        expect(isLegacyCatalogId('ad1')).toBe(true);
    });

    it('reconnaît un id du catalogue historique P+R', () => {
        expect(isLegacyCatalogId('adbe1')).toBe(true);
    });

    it("rejette un id qui n'appartient à aucun catalogue historique", () => {
        expect(isLegacyCatalogId('id-invente')).toBe(false);
    });
});

describe('getEffectiveAdhesives — DAT', () => {
    it("préserve EXACTEMENT l'ordre et le nombre du catalogue historique (12 repères)", () => {
        const result = getEffectiveAdhesives(SEED);
        expect(result.map(a => a.id)).toEqual(ADHESIVES.map(a => a.id));
    });

    it('résout le CONTENU (nom) depuis signageReferences, pas depuis le catalogue statique', () => {
        const renamed = SEED.map(r => r.id === 'ad1' ? { ...r, name: 'Nom modifié' } : r);
        const result = getEffectiveAdhesives(renamed);
        expect(result.find(a => a.id === 'ad1')?.name).toBe('Nom modifié');
    });

    it('lève une erreur explicite si un id historique manque du référentiel (garde-fou anti-troncature silencieuse)', () => {
        const truncated = SEED.filter(r => r.id !== 'ad1');
        expect(() => getEffectiveAdhesives(truncated)).toThrow(/ad1/);
    });

    it('une addition hors catalogue historique (scope DAT) apparaît APRÈS la liste historique, jamais insérée au milieu', () => {
        const addition: SignageReference = {
            id: 'extra-dat', name: 'Extra DAT', auditType: 'DAT', scope: { auditType: 'DAT' },
            version: 1, support: 'adhesif', placement: {},
        };
        const result = getEffectiveAdhesives([...SEED, addition]);
        expect(result[result.length - 1].id).toBe('extra-dat');
        expect(result.slice(0, ADHESIVES.length).map(a => a.id)).toEqual(ADHESIVES.map(a => a.id));
    });

    it('isDisabled reste VISIBLE dans la liste (jamais filtré)', () => {
        const withDisabled = SEED.map(r => r.id === 'ad2' ? { ...r, isDisabled: true } : r);
        const result = getEffectiveAdhesives(withDisabled);
        expect(result.find(a => a.id === 'ad2')?.isDisabled).toBe(true);
    });
});

describe('getEffectiveEcaAdhesives', () => {
    const type = EcaEquipmentType.TripodeSortie;

    it("préserve l'ordre et le nombre du catalogue historique du type", () => {
        const legacy = getEcaAdhesives(type);
        const result = getEffectiveEcaAdhesives(SEED, type);
        expect(result.map(a => a.id)).toEqual(legacy.map(a => a.id));
    });

    it("une addition hors catalogue historique dans le scope du type ECA apparaît après l'historique", () => {
        const addition: SignageReference = {
            id: 'extra-eca', name: 'Extra ECA', auditType: 'ECA', scope: { auditType: 'ECA', equipmentTypes: [type] },
            version: 1, support: 'adhesif', placement: {},
        };
        const result = getEffectiveEcaAdhesives([...SEED, addition], type);
        expect(result[result.length - 1].id).toBe('extra-eca');
    });
});

describe('getEffectiveEquipmentAdhesives — P+R, sans surcharge (périmètre standard)', () => {
    it("préserve l'ordre et le nombre du catalogue historique du type de borne", () => {
        const legacy = getPrAdhesives(EquipmentType.BE);
        const result = getEffectiveEquipmentAdhesives(SEED, EquipmentType.BE);
        expect(result.map(a => a.id)).toEqual(legacy.map(a => a.id));
    });

    it('une addition hors catalogue historique dans le scope BE apparaît après le périmètre historique', () => {
        const addition: SignageReference = {
            id: 'extra-be', name: 'Extra BE', auditType: 'PR', scope: { auditType: 'PR', equipmentTypes: [EquipmentType.BE] },
            version: 1, support: 'adhesif', placement: {},
        };
        const result = getEffectiveEquipmentAdhesives([...SEED, addition], EquipmentType.BE);
        expect(result[result.length - 1].id).toBe('extra-be');
    });

    it("une addition hors scope (type CA uniquement) n'apparaît pas pour BE", () => {
        const addition: SignageReference = {
            id: 'extra-ca-only', name: 'Extra CA', auditType: 'PR', scope: { auditType: 'PR', equipmentTypes: [EquipmentType.CA] },
            version: 1, support: 'adhesif', placement: {},
        };
        const result = getEffectiveEquipmentAdhesives([...SEED, addition], EquipmentType.BE);
        expect(result.some(a => a.id === 'extra-ca-only')).toBe(false);
    });
});

describe('getEffectiveEquipmentAdhesives — P+R, avec surcharge adhesiveIds (surcharge locale)', () => {
    it("une surcharge restreint STRICTEMENT à la liste blanche fournie, dans son propre ordre (pas l'ordre catalogue)", () => {
        const result = getEffectiveEquipmentAdhesives(SEED, EquipmentType.BE, ['adbe3', 'adbe1']);
        expect(result.map(a => a.id)).toEqual(['adbe3', 'adbe1']);
    });

    it('une addition hors catalogue historique PEUT être désignée dans une surcharge, même si elle est hors du catalogue papier du type', () => {
        const addition: SignageReference = {
            id: 'surcharge-only', name: 'Ajout ciblé', auditType: 'PR', scope: { auditType: 'PR' },
            version: 1, support: 'adhesif', placement: {},
        };
        const result = getEffectiveEquipmentAdhesives([...SEED, addition], EquipmentType.BE, ['surcharge-only']);
        expect(result.map(a => a.id)).toEqual(['surcharge-only']);
    });

    it("un id de surcharge introuvable dans le référentiel (référence supprimée) disparaît SANS lever d'exception", () => {
        expect(() => getEffectiveEquipmentAdhesives(SEED, EquipmentType.BE, ['id-inexistant', 'adbe3'])).not.toThrow();
        const result = getEffectiveEquipmentAdhesives(SEED, EquipmentType.BE, ['id-inexistant', 'adbe3']);
        expect(result.map(a => a.id)).toEqual(['adbe3']);
    });

    it('un id isDisabled dans la surcharge reste VISIBLE (grisé côté UI), jamais silencieusement retiré', () => {
        const withDisabled = SEED.map(r => r.id === 'adbe3' ? { ...r, isDisabled: true } : r);
        const result = getEffectiveEquipmentAdhesives(withDisabled, EquipmentType.BE, ['adbe3']);
        expect(result).toHaveLength(1);
        expect(result[0].isDisabled).toBe(true);
    });

    it('une surcharge vide ([]) est une liste blanche STRICTE — aucune référence affichée', () => {
        const result = getEffectiveEquipmentAdhesives(SEED, EquipmentType.BE, []);
        expect(result).toEqual([]);
    });
});
