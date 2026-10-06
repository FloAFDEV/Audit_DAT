// tests/arenesT1Dat.test.ts
// Arènes T1 : deux DAT du même côté (direction MEETT), aucun DAT direction
// Palais de Justice — base neuve, base existante (migration), idempotence.
import { describe, it, expect } from 'vitest';
import { migrateArenesT1DatDirections } from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { AuditModuleType, Lieu, ModeData, Station } from '../types';

const arenesT1 = (lieux: Lieu[]): Station =>
    (lieux.find(l => l.name === 'Arènes')!.modules
        .find(m => m.type === AuditModuleType.DAT && m.line === 'TRAM')!.data as ModeData).stations[0];

describe('Arènes T1 — DAT', () => {
    it('base neuve : une seule direction (MEETT) avec DAT 01 et DAT 02', async () => {
        const station = arenesT1(await generateInitialLieuxDataAsync());
        expect(station.directions.map(d => [d.name, d.dats.map(x => x.name)])).toEqual([
            ['Direction MEETT / Aéroport', ['DAT 01', 'DAT 02']],
        ]);
    });

    it('autres stations T1 inchangées : un DAT par direction', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const tram = lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.DAT && m.line === 'TRAM')
            .flatMap(m => (m.data as ModeData).stations).filter(s => s.code !== 'ARE' && !s.isFuture);
        expect(tram.length).toBeGreaterThan(0);
        for (const s of tram) expect(s.directions.map(d => d.dats.length)).toEqual([1, 1]);
    });

    it('base existante : DAT 02 rejoint la direction MEETT avec son état, direction PdJ retirée', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const station = arenesT1(lieux);
        const [dat1, dat2] = station.directions[0].dats;
        dat2.comment = 'constat terrain';
        station.directions = [
            { id: `${station.id}-dir-1`, name: 'Direction MEETT / Aéroport', dats: [dat1] },
            { id: `${station.id}-dir-2`, name: 'Direction Palais de Justice', dats: [dat2] },
        ];
        const others = JSON.stringify(lieux.filter(l => l.name !== 'Arènes'));

        expect(migrateArenesT1DatDirections(lieux)).toBe(true);
        expect(station.directions).toEqual([{ id: `${station.id}-dir-1`, name: 'Direction MEETT / Aéroport', dats: [dat1, dat2] }]);
        expect(station.directions[0].dats[1].comment).toBe('constat terrain');
        expect(JSON.stringify(lieux.filter(l => l.name !== 'Arènes'))).toBe(others);

        // Idempotente.
        const snapshot = JSON.stringify(lieux);
        expect(migrateArenesT1DatDirections(lieux)).toBe(false);
        expect(JSON.stringify(lieux)).toBe(snapshot);
    });
});
