// tests/naturalSort.test.ts
// Tri naturel des libellés de la liste de maintenance (MaintenanceListModal).
import { describe, it, expect } from 'vitest';
import { compareNatural } from '../utils/naturalSort';

describe('compareNatural', () => {
    it('numéros dans l\'ordre numérique : 1, 2, … 9, 10, 11, 12', () => {
        const labels = ['12', '1', '10', '11', '2', '3', '9'];
        expect([...labels].sort(compareNatural)).toEqual(['1', '2', '3', '9', '10', '11', '12']);
    });

    it('libellés terrain : « Valideur 9 » avant « Valideur 10 »', () => {
        const labels = ['Liaison B→A - Valideur 10', 'Liaison B→A - Valideur 9', 'Liaison B→A - Valideur 11'];
        expect([...labels].sort(compareNatural)).toEqual([
            'Liaison B→A - Valideur 9', 'Liaison B→A - Valideur 10', 'Liaison B→A - Valideur 11',
        ]);
    });

    it('codes non numériques et numéros paddés conservent leur ordre habituel', () => {
        expect(['DAT 02', 'DAT 01', 'DAT 10'].sort(compareNatural)).toEqual(['DAT 01', 'DAT 02', 'DAT 10']);
        expect(['BS01', 'BE11', 'BE02', 'CA01'].sort(compareNatural)).toEqual(['BE02', 'BE11', 'BS01', 'CA01']);
        expect(['Adhésif au sol', 'R1', 'Bandeau'].sort(compareNatural)).toEqual(['Adhésif au sol', 'Bandeau', 'R1']);
        expect(compareNatural('Accès Bus', 'Accès Bus')).toBe(0);
    });
});
