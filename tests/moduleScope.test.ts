// tests/moduleScope.test.ts
// =================================================================
// Vérifie le correctif P1.5 (Lot 1) : isModuleInAuditScope centralise
// la règle « un module futur reste dans le périmètre audité uniquement
// pour les lignes C et AEROPORT ». Ce test fige le comportement exact
// qui était auparavant recopié (sous plusieurs formulations) dans
// useStats.ts, patrimoineIndex.ts et signaletiqueStationIndex.ts.
// =================================================================
import { describe, it, expect } from 'vitest';
import { isModuleInAuditScope } from '../utils/moduleScope';

describe('isModuleInAuditScope', () => {
    it('un module non-futur est toujours dans le périmètre, quelle que soit la ligne', () => {
        expect(isModuleInAuditScope({ isFuture: false, line: 'A' })).toBe(true);
        expect(isModuleInAuditScope({ isFuture: undefined, line: 'TRAM' })).toBe(true);
        expect(isModuleInAuditScope({ line: 'B' })).toBe(true); // isFuture absent des données
    });

    it('un module futur sur une ligne normale (A, B, TRAM, TELEO) est hors périmètre', () => {
        expect(isModuleInAuditScope({ isFuture: true, line: 'A' })).toBe(false);
        expect(isModuleInAuditScope({ isFuture: true, line: 'B' })).toBe(false);
        expect(isModuleInAuditScope({ isFuture: true, line: 'TRAM' })).toBe(false);
        expect(isModuleInAuditScope({ isFuture: true, line: 'TELEO' })).toBe(false);
    });

    it('un module futur sur la ligne C reste dans le périmètre (auditable par anticipation)', () => {
        expect(isModuleInAuditScope({ isFuture: true, line: 'C' })).toBe(true);
    });

    it('un module futur sur AEROPORT reste dans le périmètre (auditable par anticipation)', () => {
        expect(isModuleInAuditScope({ isFuture: true, line: 'AEROPORT' })).toBe(true);
    });

    it('un module futur avec une ligne absente ou vide (donnée ambiguë) est hors périmètre par défaut', () => {
        expect(isModuleInAuditScope({ isFuture: true, line: undefined })).toBe(false);
        expect(isModuleInAuditScope({ isFuture: true, line: '' as any })).toBe(false);
    });
});
