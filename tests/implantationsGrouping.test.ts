// tests/implantationsGrouping.test.ts
// Regroupement d'affichage (Ligne → Station → Accès → Équipement) d'une
// liste d'implantations déjà calculées — aucun second calcul, fonction pure.
import { describe, it, expect } from 'vitest';
import { groupImplantationsByLocation } from '../utils/cockpit/implantationsGrouping';
import { ImplantationRef } from '../utils/cockpit/patrimoineIndex';
import { AdhesiveStatus } from '../types';

const imp = (over: Partial<ImplantationRef>): ImplantationRef => ({
    referenceId: 'eca-1', lieuId: 'l1', lieuName: 'Jean-Jaurès', line: 'B',
    moduleId: 'm1', moduleName: 'ECA', context: 'Liaison A→B', equipmentLabel: 'PMR 17',
    status: AdhesiveStatus.OK, ...over,
});

describe('groupImplantationsByLocation', () => {
    it('regroupe en Ligne → Station → Accès → Équipement, une implantation = une occurrence physique (jamais fusionnée)', () => {
        const items: ImplantationRef[] = [
            imp({ zone: 'ZH', zoneLabel: 'Zone de validation haute (ZH)' }),
            imp({ zone: 'ZB', zoneLabel: 'Zone de validation basse (ZB) — PMR' }),
        ];
        const result = groupImplantationsByLocation(items);

        expect(result).toHaveLength(1);
        expect(result[0].line).toBe('B');
        expect(result[0].total).toBe(2);
        expect(result[0].stations).toHaveLength(1);
        expect(result[0].stations[0].stationName).toBe('Jean-Jaurès');
        expect(result[0].stations[0].contexts).toHaveLength(1);
        expect(result[0].stations[0].contexts[0].context).toBe('Liaison A→B');
        expect(result[0].stations[0].contexts[0].equipments).toHaveLength(1);
        // Jamais fusionné : 2 items distincts sous le même équipement, chacun avec sa zone.
        const equip = result[0].stations[0].contexts[0].equipments[0];
        expect(equip.total).toBe(2);
        expect(equip.items.map(i => i.zone).sort()).toEqual(['ZB', 'ZH']);
    });

    it('sépare correctement plusieurs lignes, stations, accès et équipements', () => {
        const items: ImplantationRef[] = [
            imp({ line: 'A', lieuName: 'Esquirol', context: 'Accès Bas (ASC)', equipmentLabel: 'PMR 4', zone: 'ZH' }),
            imp({ line: 'A', lieuName: 'Esquirol', context: 'Accès Haut (PRI)', equipmentLabel: 'Valideur 4' }),
            imp({ line: 'B', lieuName: 'Jean-Jaurès', context: 'Liaison B→A', equipmentLabel: 'PMR 8', zone: 'ZB' }),
        ];
        const result = groupImplantationsByLocation(items);
        expect(result.map(l => l.line).sort()).toEqual(['A', 'B']);
        const ligneA = result.find(l => l.line === 'A')!;
        expect(ligneA.total).toBe(2);
        expect(ligneA.stations[0].contexts).toHaveLength(2); // deux accès distincts à Esquirol
    });

    it('liste vide → aucune ligne', () => {
        expect(groupImplantationsByLocation([])).toEqual([]);
    });
});
