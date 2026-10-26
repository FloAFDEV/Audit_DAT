// tests/sharedHelpers.test.ts — fonctions et constantes mutualisées :
// découpage des noms d'adhésifs, ordre physique des stations, cotes des
// équipements de station.
import { describe, it, expect } from 'vitest';
import { parseAdhesiveName } from '../utils/adhesiveNames';
import { physicalStationIndex, sortByPhysicalStationOrder } from '../utils/cockpit/exportStationOrder';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import { STATION_EQUIPMENT_DIMENSIONS, getInitialSignaletiqueData } from '../data/signaletique_config';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { T1_PLAN_QUARTIER_DIMENSIONS } from '../utils/t1PlanQuartierAudit';

describe('R4 — parseAdhesiveName (Nomenclature et export CSV)', () => {
    it('règles historiques inchangées', () => {
        expect(parseAdhesiveName('Repère 1 - Adhésif « Achat et rechargement »')).toEqual({ repere: '1', name: 'Adhésif « Achat et rechargement »' });
        expect(parseAdhesiveName('Repère R1 - Signalisation dynamique')).toEqual({ repere: 'R1', name: 'Signalisation dynamique' });
        expect(parseAdhesiveName('Repère 12 - Adhésif « Appel d’urgence + braille»')).toEqual({ repere: '12', name: 'Adhésif « Appel d’urgence + braille»' });
        expect(parseAdhesiveName('Repère 3 -  Tarifs  ')).toEqual({ repere: '3', name: 'Tarifs' });
        expect(parseAdhesiveName('Plan de quartier')).toEqual({ repere: '', name: 'Plan de quartier' });
        expect(parseAdhesiveName('Dos gris verso')).toEqual({ repere: '', name: 'Dos gris verso' });
        expect(parseAdhesiveName(undefined)).toEqual({ repere: '', name: '' });
        expect(parseAdhesiveName('')).toEqual({ repere: '', name: '' });
        // Tiret long : non découpé (règle historique conservée).
        expect(parseAdhesiveName('Repère 1 — Adhésif')).toEqual({ repere: '', name: 'Repère 1 — Adhésif' });
    });
});

describe('R5 — ordre physique des stations', () => {
    it('rang = position dans la liste de la ligne, comme les anciennes tables de l\'export CSV et de la galerie', () => {
        const lists = { A: LINE_A_STATIONS, B: LINE_B_STATIONS, C: LINE_C_STATIONS, TRAM: TRAM_STATIONS, TELEO: TELEO_STATIONS };
        for (const [line, stations] of Object.entries(lists)) {
            stations.forEach((s, i) => expect(physicalStationIndex(line, (s.lieuName || s.name)!)).toBe(i));
        }
    });

    it('Jean-Jaurès A et B : deux rangs distincts, jamais fusionnés ; station inconnue : non classée', () => {
        const jjA = LINE_A_STATIONS.findIndex(s => s.code === 'JJA');
        const jjB = LINE_B_STATIONS.findIndex(s => s.code === 'JJB');
        const nameA = (LINE_A_STATIONS[jjA].lieuName || LINE_A_STATIONS[jjA].name)!;
        expect(physicalStationIndex('A', nameA)).toBe(jjA);
        expect(physicalStationIndex('B', nameA)).toBe(jjB);
        expect(physicalStationIndex('A', 'Station inconnue')).toBeUndefined();
        expect(physicalStationIndex('Z', nameA)).toBeUndefined();
        const sorted = sortByPhysicalStationOrder('A', ['Station inconnue', nameA, (LINE_A_STATIONS[0].lieuName || LINE_A_STATIONS[0].name)!], x => x);
        expect(sorted[sorted.length - 1]).toBe('Station inconnue');
    });
});

describe('R6 — cotes des équipements de station', () => {
    it('emplacements créés et Nomenclature lisent la même source', () => {
        const tram = getInitialSignaletiqueData('Arènes', 'TRAM');
        const lae = getInitialSignaletiqueData('Aéroport', 'AEROPORT');
        expect(tram.totem.direction1.dimensions).toBe(STATION_EQUIPMENT_DIMENSIONS.totem);
        expect(tram.bandeauStation.direction1.dimensions).toBe(STATION_EQUIPMENT_DIMENSIONS.bandeau);
        expect(tram.planQuartier.meett[0].dimensions).toBe(STATION_EQUIPMENT_DIMENSIONS.planQuartierTram);
        const laePlans = [...lae.planQuartier.meett, ...lae.planQuartier.pdj];
        expect(laePlans.length).toBeGreaterThan(0);
        expect(laePlans.every(p => p.dimensions === STATION_EQUIPMENT_DIMENSIONS.planQuartierAeroport)).toBe(true);
        const inv = new Map(computeAdhesiveInventory([], buildSignageReferencesSeed()).map(i => [i.id, i.dimensions]));
        expect(inv.get('sign-totem')).toBe(STATION_EQUIPMENT_DIMENSIONS.totem);
        expect(inv.get('sign-bandeau')).toBe(STATION_EQUIPMENT_DIMENSIONS.bandeau);
        expect(inv.get('sign-plan-reseau')).toBe(STATION_EQUIPMENT_DIMENSIONS.planReseau);
        expect(inv.get('sign-plan-quartier-tram')).toBe(STATION_EQUIPMENT_DIMENSIONS.planQuartierTram);
        expect(inv.get('sign-plan-quartier-aeroport')).toBe(STATION_EQUIPMENT_DIMENSIONS.planQuartierAeroport);
        expect(T1_PLAN_QUARTIER_DIMENSIONS).toBe('80 × 100 cm');
        // Valeurs métier inchangées.
        expect(STATION_EQUIPMENT_DIMENSIONS).toEqual({
            totem: '61,6 x 91,6 cm', bandeau: '80x29 cm', planReseau: '80 x 100 cm',
            planQuartierTram: '80 x 100 cm', planQuartierAeroport: '78 x 100 cm',
        });
    });
});
