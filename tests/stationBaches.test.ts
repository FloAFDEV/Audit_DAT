// tests/stationBaches.test.ts
// Recensement des bâches de stations : données, totaux, ordre physique,
// ligne non recensée — référentiel indépendant de l'audit.
import { describe, it, expect } from 'vitest';
import { STATION_BACHES } from '../data/stationBaches';
import { getBachesForLine, getBacheTotal, isLineRecensee } from '../utils/cockpit/baches';
import { ALL_STATION_DEFS, REGISTRY_LINE_A, REGISTRY_LINE_B } from '../data/stationRegistry';

describe('recensement des bâches de stations', () => {
    it('totaux : ligne A = 23, ligne B = 56 (26 sens Ramonville + 30 sens Borderouge), ligne C non recensée', () => {
        expect(getBacheTotal('A')).toBe(23);
        expect(getBacheTotal('B')).toBe(56);
        expect(isLineRecensee('C')).toBe(false);
        expect(getBacheTotal('C')).toBe(0);
        expect(getBachesForLine('C')).toEqual([]);
    });

    it('chaque bâche référence une station existante de sa ligne, ids uniques', () => {
        const ids = new Set(STATION_BACHES.map(b => b.id));
        expect(ids.size).toBe(STATION_BACHES.length);
        for (const b of STATION_BACHES) {
            const station = ALL_STATION_DEFS.find(s => s.id === b.stationId);
            expect(station, b.id).toBeDefined();
            expect(station!.id.startsWith(`sta-${b.line.toLowerCase()}-`)).toBe(true);
        }
    });

    it('double-sens : sans direction, 1 support ; standard : toujours une direction', () => {
        for (const b of STATION_BACHES) {
            if (b.type === 'double-sens') {
                expect(b.direction).toBeUndefined();
                expect(b.count).toBe(1);
            } else {
                expect(b.direction).toBeTruthy();
            }
        }
    });

    it('Jean-Jaurès : identifiants distincts ligne A (JJA) et ligne B (JJB)', () => {
        const a = getBachesForLine('A').filter(b => b.stationCode === 'JJA');
        const b = getBachesForLine('B').filter(r => r.stationCode === 'JJB');
        expect(a.map(r => [r.stationId, r.type, r.direction, r.count])).toEqual([
            ['sta-a-13', 'standard', 'Balma-Gramont', 0], // 0 relevé explicitement
            ['sta-a-13', 'double-sens', undefined, 1],
        ]);
        expect(b.map(r => [r.stationId, r.type, r.direction, r.count])).toEqual([
            ['sta-b-9', 'standard', 'Ramonville', 1],
            ['sta-b-9', 'standard', 'Borderouge', 1],
            ['sta-b-9', 'double-sens', undefined, 1], // une seule fois malgré les deux sens du relevé
        ]);
    });

    it('Jolimont : une bâche par sens et une double-sens', () => {
        const jol = getBachesForLine('A').filter(b => b.stationCode === 'JOL');
        expect(jol.map(r => [r.type, r.direction, r.count])).toEqual([
            ['standard', 'Balma-Gramont', 1],
            ['standard', 'Basso Cambo', 1],
            ['double-sens', undefined, 1],
        ]);
    });

    it('ligne B sens retour (Borderouge) : 20 stations, 30 bâches, relevé du fichier', () => {
        const ret = getBachesForLine('B').filter(b => b.direction === 'Borderouge');
        expect(ret).toHaveLength(20);
        expect(ret.reduce((n, b) => n + b.count, 0)).toBe(30);
        const byCode = Object.fromEntries(ret.map(b => [b.stationCode, b.count]));
        expect(byCode).toMatchObject({ RAM: 2, FVE: 2, JAR: 4, CCA: 4, LVA: 2, TCO: 2, JJB: 1, BOR: 1 });
    });

    it('ordre physique du registre', () => {
        const order = (line: 'A' | 'B', registry: typeof REGISTRY_LINE_A) => {
            const seen = [...new Set(getBachesForLine(line).map(b => b.stationId))];
            const expected = registry.map(s => s.id).filter(id => seen.includes(id));
            expect(seen).toEqual(expected);
        };
        order('A', REGISTRY_LINE_A);
        order('B', REGISTRY_LINE_B);
    });

    it('stations hors recensement (Parc du Canal, Labège Madron) : aucune entrée, jamais un 0 inventé', () => {
        expect(STATION_BACHES.some(b => b.stationId === 'sta-b-21' || b.stationId === 'sta-b-22')).toBe(false);
    });
});
