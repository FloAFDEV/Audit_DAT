// tests/maintenancePriority.test.ts
// Vérifie : facteurs transparents [0..1], AUCUN score par défaut (pas de
// "fausse IA"), tri par urgence sans agrégat opaque.
import { describe, it, expect } from 'vitest';
import {
    calculatePriorityFactors, calculatePriorityFactorsFromItems, comparePriority,
    computePriorityScore, OCCURRENCE_SATURATION, PriorityWeights,
} from '../utils/cockpit/maintenancePriority';
import { AdhesiveStatus } from '../types';
import { ImplantationRef, ReferenceUsage } from '../utils/cockpit/patrimoineIndex';

const usage = (absent: number, toReplace: number): ReferenceUsage => ({
    referenceId: 'x', installedCount: absent + toReplace, okCount: 0,
    absentCount: absent, toReplaceCount: toReplace, uncheckedCount: 0,
    defectCount: absent + toReplace, lieuCount: 1, lines: [], equipmentTypes: [], byLieu: [], byLine: [],
});

const imp = (status: AdhesiveStatus): ImplantationRef => ({
    referenceId: 'x', lieuId: 'l', lieuName: 'L', line: 'A', moduleId: 'm', moduleName: 'M',
    context: 'c', equipmentLabel: 'e', status,
});

describe('calculatePriorityFactors — pas de score par défaut', () => {
    it("score est ABSENT par défaut (pas de fausse IA)", () => {
        const factors = calculatePriorityFactors(usage(2, 0));
        expect(factors.score).toBeUndefined();
    });

    it('gravité maximale si tous les défauts sont "Absent"', () => {
        expect(calculatePriorityFactors(usage(5, 0)).severity).toBe(1);
    });

    it('gravité pondérée si mélange Absent / À remplacer', () => {
        const f = calculatePriorityFactors(usage(1, 1));
        expect(f.severity).toBeCloseTo((1 + 0.6) / 2, 5);
    });

    it('occurrence sature à 1 au-delà du seuil', () => {
        expect(calculatePriorityFactors(usage(OCCURRENCE_SATURATION * 2, 0)).occurrence).toBe(1);
        expect(calculatePriorityFactors(usage(0, 0)).occurrence).toBe(0);
    });

    it('facteurs sans source de données restent neutres (0.5)', () => {
        const f = calculatePriorityFactors(usage(3, 0));
        expect(f.passengerVisibility).toBe(0.5);
        expect(f.strategicLocation).toBe(0.5);
        expect(f.age).toBe(0.5);
    });

    it('calculatePriorityFactorsFromItems cohérent avec calculatePriorityFactors', () => {
        const items = [imp(AdhesiveStatus.Absent), imp(AdhesiveStatus.ToBeReplaced)];
        const fromItems = calculatePriorityFactorsFromItems(items);
        const fromUsage = calculatePriorityFactors(usage(1, 1));
        expect(fromItems.severity).toBeCloseTo(fromUsage.severity, 5);
    });
});

describe('comparePriority — tri transparent sans score', () => {
    it('gravité décroissante prioritaire sur ampleur', () => {
        const highSeverityLowVolume = calculatePriorityFactors(usage(1, 0));   // severity 1, occurrence faible
        const lowSeverityHighVolume = calculatePriorityFactors(usage(0, 10));  // severity 0.6, occurrence plus haute
        expect(comparePriority(highSeverityLowVolume, lowSeverityHighVolume)).toBeLessThan(0);
    });

    it('à gravité égale, ampleur décroissante', () => {
        const small = calculatePriorityFactors(usage(1, 0));
        const large = calculatePriorityFactors(usage(10, 0));
        expect(comparePriority(large, small)).toBeLessThan(0);
    });
});

describe('computePriorityScore — brique en attente, jamais appelée par défaut', () => {
    it('produit un score 0..100 seulement si explicitement invoqué avec des poids', () => {
        const factors = calculatePriorityFactors(usage(5, 0));
        const weights: PriorityWeights = { severity: 50, occurrence: 20, passengerVisibility: 10, strategicLocation: 10, age: 10 };
        const score = computePriorityScore(factors, weights);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
    });
});
