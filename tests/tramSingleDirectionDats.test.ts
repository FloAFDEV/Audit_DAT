// tests/tramSingleDirectionDats.test.ts
// Stations T1 dont les deux DAT sont du même côté : Arènes (MEETT),
// Aéroconstellation et MEETT (Palais de Justice) — base neuve, base
// existante (migration), idempotence, autres stations inchangées.
import { describe, it, expect } from 'vitest';
import { migrateTramSingleDirectionDats } from '../store';
import { generateInitialLieuxDataAsync, TRAM_SINGLE_DIRECTION_DATS } from '../data/builder';
import { AuditModuleType, Lieu, ModeData, Station } from '../types';

const MEETT = 'Direction MEETT / Aéroport';
const PDJ = 'Direction Palais de Justice';

const tramStations = (lieux: Lieu[]): Station[] =>
    lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.DAT && m.line === 'TRAM')
        .flatMap(m => (m.data as ModeData).stations);
const byCode = (lieux: Lieu[], code: string) => tramStations(lieux).find(s => s.code === code)!;

describe('T1 — DAT dans une seule direction', () => {
    it.each([
        ['ARE', 'Arènes', MEETT],
        ['GAS', 'Aéroconstellation', PDJ],
        ['MET', 'MEETT', PDJ],
    ])('base neuve : %s (%s) → %s, DAT 01 et DAT 02', async (code, name, direction) => {
        const station = byCode(await generateInitialLieuxDataAsync(), code);
        expect(station.name).toBe(name);
        expect(station.directions.map(d => [d.name, d.dats.map(x => x.name)])).toEqual([[direction, ['DAT 01', 'DAT 02']]]);
    });

    it('autres stations T1 inchangées : DAT 01 côté MEETT, DAT 02 côté Palais de Justice', async () => {
        const others = tramStations(await generateInitialLieuxDataAsync()).filter(s => !TRAM_SINGLE_DIRECTION_DATS[s.code ?? ''] && !s.isFuture);
        expect(others.length).toBe(22);
        for (const s of others) {
            expect(s.directions.map(d => [d.name, d.dats.map(x => x.name)])).toEqual([[MEETT, ['DAT 01']], [PDJ, ['DAT 02']]]);
        }
    });

    it.each([
        ['ARE', MEETT],
        ['GAS', PDJ],
        ['MET', PDJ],
    ])('base existante : %s regroupé dans %s, état des DAT conservé, idempotente', async (code, direction) => {
        const lieux = await generateInitialLieuxDataAsync();
        const station = byCode(lieux, code);
        const [dat1, dat2] = station.directions[0].dats;
        dat1.comment = 'constat 1';
        dat2.comment = 'constat 2';
        // Ancien découpage : un DAT par direction.
        station.directions = [
            { id: `${station.id}-dir-1`, name: MEETT, dats: [dat1] },
            { id: `${station.id}-dir-2`, name: PDJ, dats: [dat2] },
        ];
        const othersBefore = JSON.stringify(tramStations(lieux).filter(s => s !== station));

        expect(migrateTramSingleDirectionDats(lieux)).toBe(true);
        expect(station.directions).toHaveLength(1);
        expect(station.directions[0].name).toBe(direction);
        expect(station.directions[0].dats).toEqual([dat1, dat2]);
        expect(station.directions[0].dats.map(d => d.comment)).toEqual(['constat 1', 'constat 2']);
        expect(JSON.stringify(tramStations(lieux).filter(s => s !== station))).toBe(othersBefore);

        const snapshot = JSON.stringify(lieux);
        expect(migrateTramSingleDirectionDats(lieux)).toBe(false);
        expect(JSON.stringify(lieux)).toBe(snapshot);
    });
});
