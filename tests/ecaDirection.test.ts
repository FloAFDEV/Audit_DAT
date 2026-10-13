// tests/ecaDirection.test.ts — sens de passage ECA déduit du seul type
// technique (components/EcaUiHelpers.tsx) : aucun sens inventé pour les PMR
// dont le type ne le précise pas, ordre d'affichage PMR → entrées → sorties
// → double sens.
import { describe, it, expect } from 'vitest';
import { getEcaDirection, summarizeEcaDirections } from '../components/EcaUiHelpers';
import { ECA, EcaEquipmentType } from '../types';
import { ECA_DEFINITIONS } from '../data/eca_data';

describe('ECA — sens de passage', () => {
    it('déduit entrée / sortie / double sens du type, rien pour PMR à bras / PMR à vantaux', () => {
        expect(getEcaDirection(EcaEquipmentType.TripodeEntree)).toBe('in');
        expect(getEcaDirection(EcaEquipmentType.VantauxEntree)).toBe('in');
        expect(getEcaDirection(EcaEquipmentType.TripodeSortie)).toBe('out');
        expect(getEcaDirection(EcaEquipmentType.VantauxSortie)).toBe('out');
        expect(getEcaDirection(EcaEquipmentType.VantauxReversible)).toBe('both');
        expect(getEcaDirection(EcaEquipmentType.PMRVantauxReversible)).toBe('both');
        expect(getEcaDirection(EcaEquipmentType.PMRBras)).toBeNull();
        expect(getEcaDirection(EcaEquipmentType.PMRVantaux)).toBeNull();
    });

    it('résume un accès (Capitole) sans recompter les PMR dans les entrées', () => {
        const ecas = ECA_DEFINITIONS['CAP'] as unknown as ECA[];
        expect(summarizeEcaDirections(ecas.filter(e => e.accessPoint === 'Accès Bas (ASC)'))).toBe('1 PMR · 2 entrées · 2 sorties');
        expect(summarizeEcaDirections(ecas.filter(e => e.accessPoint === 'Accès Haut (PRI)'))).toBe('7 entrées · 2 sorties');
    });
});
