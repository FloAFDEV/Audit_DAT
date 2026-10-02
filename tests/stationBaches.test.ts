// tests/stationBaches.test.ts
// Recensement des bâches de stations : données, totaux, ordre physique,
// ligne non recensée — référentiel indépendant de l'audit.
import { describe, it, expect } from 'vitest';
import { STATION_BACHES } from '../data/stationBaches';
import { buildBachesCsv, filterBacheRows, getBachesForLine, getBacheTotal, isLineRecensee } from '../utils/cockpit/baches';
import { ALL_STATION_DEFS, REGISTRY_LINE_A, REGISTRY_LINE_B, REGISTRY_LINE_C } from '../data/stationRegistry';

describe('recensement des bâches de stations', () => {
    it('totaux : ligne A = 43 (20 sens Balma-Gramont + 21 sens Basso Cambo + 2 doubles-sens), ligne B = 56 (26 sens Ramonville + 30 sens Borderouge), ligne C non recensée', () => {
        expect(getBacheTotal('A')).toBe(43);
        expect(getBacheTotal('B')).toBe(56);
        expect(isLineRecensee('C')).toBe(false); // uniquement des quantités à relever
        expect(getBacheTotal('C')).toBe(0);
    });

    it('chaque bâche référence une station existante de sa ligne, ids uniques', () => {
        const ids = new Set(STATION_BACHES.map(b => b.id));
        expect(ids.size).toBe(STATION_BACHES.length);
        for (const b of STATION_BACHES) {
            const station = ALL_STATION_DEFS.find(s => s.id === b.stationId);
            expect(station, b.id).toBeDefined();
            expect(station!.lines).toContain(b.line);
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
            ['sta-a-13', 'standard', 'Basso Cambo', 0],
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

    it('ligne A sens retour (Basso Cambo) : 18 stations, 21 bâches, relevé du fichier', () => {
        const ret = getBachesForLine('A').filter(b => b.direction === 'Basso Cambo');
        expect(ret).toHaveLength(18);
        expect(ret.reduce((n, b) => n + b.count, 0)).toBe(21);
        const byCode = Object.fromEntries(ret.map(b => [b.stationCode, b.count]));
        expect(byCode).toMatchObject({ BGR: 1, JOL: 1, JJA: 0, CAP: 2, ESQ: 4, MBC: 1 });
    });

    it('ligne B sens retour (Borderouge) : 20 stations, 30 bâches, relevé du fichier', () => {
        const ret = getBachesForLine('B').filter(b => b.direction === 'Borderouge' && !b.pending);
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

    it('prolongement ligne B (PTC, LMA) : un sens chacun vers Labège Madron et Borderouge, 0 à relever', () => {
        const ext = getBachesForLine('B').filter(b => b.stationId === 'sta-b-21' || b.stationId === 'sta-b-22');
        expect(ext.map(r => [r.stationCode, r.direction, r.count, r.pending])).toEqual([
            ['PTC', 'Labège Madron', 0, true],
            ['PTC', 'Borderouge', 0, true],
            ['LMA', 'Labège Madron', 0, true],
            ['LMA', 'Borderouge', 0, true],
        ]);
    });

    it('ligne C : 21 stations (Blagnac inclus) × 2 sens, 0 à relever, ordre de la ligne', () => {
        const rows = getBachesForLine('C');
        expect(rows).toHaveLength(42);
        expect(rows.every(r => r.pending && r.count === 0 && r.type === 'standard')).toBe(true);
        const codes = [...new Set(rows.map(r => r.stationCode))];
        expect(codes).toHaveLength(21);
        expect(codes.slice(0, 5)).toEqual(['COG', 'FLU', 'SMA', 'BLA', 'SDN']);
        expect(codes[codes.length - 1]).toBe('LAG');
        expect(codes.filter(c => c !== 'BLA')).toEqual(REGISTRY_LINE_C.map(s => s.code));
        expect(new Set(rows.map(r => r.direction))).toEqual(new Set(['Labège Gare', 'Colomiers Gare']));
    });

    it('un 0 relevé (Jean Jaurès A) reste distinct d\'un 0 à relever', () => {
        const jja = STATION_BACHES.filter(b => b.stationId === 'sta-a-13' && b.type === 'standard');
        expect(jja.every(b => b.count === 0 && !b.pending)).toBe(true);
        expect(isLineRecensee('A')).toBe(true);
        expect(isLineRecensee('B')).toBe(true);
    });

    it('filtre par station : nom ou trigramme, sans accents ni casse', () => {
        const all = getBachesForLine('B');
        expect(new Set(filterBacheRows(all, 'jeanne d').map(r => r.stationCode))).toEqual(new Set(['JAR']));
        expect(new Set(filterBacheRows(all, 'ptc').map(r => r.stationCode))).toEqual(new Set(['PTC']));
        expect(filterBacheRows(getBachesForLine('C'), 'labege').map(r => r.stationCode)).toEqual(['LMA', 'LMA', 'LAG', 'LAG']);
        expect(filterBacheRows(all, '  ')).toBe(all);
    });

    it('export CSV : en-tête, séparateur « ; », statut relevé / à relever', () => {
        const rows = filterBacheRows(getBachesForLine('B'), 'madron');
        const csv = buildBachesCsv(rows);
        expect(csv.startsWith('\uFEFF')).toBe(true);
        const lines = csv.slice(1).split('\r\n');
        expect(lines[0]).toBe('Ligne;Station;Code;Direction;Type;Nb bâches;Statut');
        expect(lines[1]).toBe('B;Labège Madron;LMA;Labège Madron;Standard;0;À relever');
        expect(lines).toHaveLength(3);
        expect(buildBachesCsv(filterBacheRows(getBachesForLine('A'), 'ESQ')).split('\r\n')[1]).toBe('A;Esquirol;ESQ;Balma-Gramont;Standard;2;Relevé');
    });
});
