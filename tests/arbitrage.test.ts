// tests/arbitrage.test.ts
// Fonction pure — pas d'IndexedDB. Vérifie : R1 (remove n'efface jamais
// la référence), historique jamais écrasé, sous-objet unique.
import { describe, it, expect } from 'vitest';
import { applyArbitrageDecision, withArbitrageDecision } from '../utils/cockpit/arbitrage';
import { SignageReference } from '../types';

const baseRef: SignageReference = {
    id: 'ad3', name: 'Test', auditType: 'DAT', scope: { auditType: 'DAT' },
    version: 1, support: 'adhesif', placement: {},
};

describe('applyArbitrageDecision', () => {
    it('première décision : createdAt = updatedAt, historique vide', () => {
        const state = applyArbitrageDecision(undefined, 'keep', 'ancienne génération compatible', '2026-07-21T00:00:00.000Z');
        expect(state.status).toBe('keep');
        expect(state.reason).toBe('ancienne génération compatible');
        expect(state.createdAt).toBe('2026-07-21T00:00:00.000Z');
        expect(state.updatedAt).toBe('2026-07-21T00:00:00.000Z');
        expect(state.history).toEqual([]);
    });

    it('décision suivante : la précédente part en historique, jamais effacée', () => {
        const first = applyArbitrageDecision(undefined, 'keep', 'motif 1', '2026-01-01T00:00:00.000Z');
        const second = applyArbitrageDecision(first, 'to_replace', 'motif 2', '2026-02-01T00:00:00.000Z');

        expect(second.status).toBe('to_replace');
        expect(second.reason).toBe('motif 2');
        expect(second.createdAt).toBe('2026-01-01T00:00:00.000Z'); // conservée
        expect(second.updatedAt).toBe('2026-02-01T00:00:00.000Z');
        expect(second.history).toHaveLength(1);
        expect(second.history![0]).toEqual({ status: 'keep', reason: 'motif 1', date: '2026-01-01T00:00:00.000Z' });
    });

    it("'remove' produit une décision comme les autres — pas un effet de suppression (R1)", () => {
        const state = applyArbitrageDecision(undefined, 'remove', 'obsolète', '2026-07-21T00:00:00.000Z');
        expect(state.status).toBe('remove');
        // C'est une décision enregistrée, rien de plus — aucune structure de suppression.
        expect(Object.keys(state).sort()).toEqual(['createdAt', 'history', 'reason', 'status', 'updatedAt']);
    });

    it('trois décisions successives conservent tout l\'historique (jamais tronqué)', () => {
        let state = applyArbitrageDecision(undefined, 'to_document', 'a', '2026-01-01T00:00:00.000Z');
        state = applyArbitrageDecision(state, 'keep', 'b', '2026-02-01T00:00:00.000Z');
        state = applyArbitrageDecision(state, 'to_replace', 'c', '2026-03-01T00:00:00.000Z');
        expect(state.history).toHaveLength(2);
        expect(state.history!.map(h => h.status)).toEqual(['to_document', 'keep']);
    });
});

describe('withArbitrageDecision — sous-objet unique, référence non mutée en place', () => {
    it("ajoute uniquement le champ 'arbitrage', aucun champ plat", () => {
        const updated = withArbitrageDecision(baseRef, 'to_replace', 'test', '2026-07-21T00:00:00.000Z');
        const newKeys = Object.keys(updated).filter(k => !(k in baseRef));
        expect(newKeys).toEqual(['arbitrage']);
    });

    it("ne mute pas l'objet original (immutabilité)", () => {
        const updated = withArbitrageDecision(baseRef, 'keep', undefined, '2026-07-21T00:00:00.000Z');
        expect(baseRef.arbitrage).toBeUndefined();
        expect(updated.arbitrage?.status).toBe('keep');
        expect(updated).not.toBe(baseRef);
    });

    it('reason optionnel accepté', () => {
        const updated = withArbitrageDecision(baseRef, 'keep', undefined, '2026-07-21T00:00:00.000Z');
        expect(updated.arbitrage?.reason).toBeUndefined();
    });
});
