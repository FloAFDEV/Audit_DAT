// tests/ecaDirection.test.ts — sens de passage ECA déduit du seul type
// technique (components/EcaUiHelpers.tsx) : aucun sens inventé pour les PMR
// dont le type ne le précise pas, ordre d'affichage PMR → entrées → sorties
// → double sens.
import { describe, it, expect } from 'vitest';
import { getEcaCardTitle, getEcaDirection, summarizeEcaDirections } from '../components/EcaUiHelpers';
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

    it('titre de carte : sens systématique (lu sur le type) pour entrées et sorties, nom inchangé pour PMR et réversibles', () => {
        const eca = (name: string, type: EcaEquipmentType): ECA => ({ id: 'x', name, accessPoint: 'A', number: 1, type, adhesives: {}, comment: '' });
        expect(getEcaCardTitle(eca('Valideur 4', EcaEquipmentType.TripodeEntree))).toEqual({ name: 'Valideur 4', direction: 'Entrée' });
        expect(getEcaCardTitle(eca('Valideur 2 (Sortie)', EcaEquipmentType.TripodeSortie))).toEqual({ name: 'Valideur 2', direction: 'Sortie' });
        expect(getEcaCardTitle(eca('Valideur 6 (Sortie)', EcaEquipmentType.VantauxSortie))).toEqual({ name: 'Valideur 6', direction: 'Sortie' });
        expect(getEcaCardTitle(eca('Accès Historique - Valideur 2', EcaEquipmentType.VantauxEntree))).toEqual({ name: 'Accès Historique - Valideur 2', direction: 'Entrée' });
        // Le sens affiché suit le type enregistré, jamais le nom (ni le numéro).
        expect(getEcaCardTitle(eca('Valideur 5 (Sortie)', EcaEquipmentType.TripodeEntree))).toEqual({ name: 'Valideur 5', direction: 'Entrée' });
        expect(getEcaCardTitle(eca('PMR 1', EcaEquipmentType.PMRVantaux))).toEqual({ name: 'PMR 1', direction: null });
        expect(getEcaCardTitle(eca('Liaison A→B - PMR 17', EcaEquipmentType.PMRVantauxReversible))).toEqual({ name: 'Liaison A→B - PMR 17', direction: null });
        expect(getEcaCardTitle(eca('Liaison A→B - Valideur 13', EcaEquipmentType.VantauxReversible))).toEqual({ name: 'Liaison A→B - Valideur 13', direction: null });
    });

    it('titres cohérents avec le récapitulatif d\'accès sur tout le réseau source', () => {
        for (const ecas of Object.values(ECA_DEFINITIONS) as unknown as ECA[][]) {
            for (const e of ecas) {
                const { name, direction } = getEcaCardTitle(e);
                const d = getEcaDirection(e.type);
                if (d === 'in' || d === 'out') expect(direction).toBe(d === 'in' ? 'Entrée' : 'Sortie');
                else expect(direction).toBeNull();
                expect(name).not.toMatch(/\((Sortie|Entrée)\)/);
            }
        }
    });
});
