// tests/signaletiqueDirections.test.ts
// Équipements Station : directions de l'ARRÊT (ses deux extrémités), jamais
// la répartition des DAT. Régression #142/#143 : Arènes, Aéroconstellation et
// MEETT n'avaient plus qu'une direction côté signalétique, rendant les
// équipements de l'autre sens inaccessibles au formulaire.
import { describe, it, expect } from 'vitest';
import { generateInitialLieuxDataAsync, TRAM_DIRECTION_MEETT, TRAM_DIRECTION_PDJ, TRAM_SINGLE_DIRECTION_DATS } from '../data/builder';
import { migrateTramSingleDirectionDats } from '../store';
import { AuditModuleType, Lieu, ModeData, Station } from '../types';

const stationsOf = (lieux: Lieu[], type: AuditModuleType, line: string): Station[] =>
    lieux.flatMap(l => l.modules).filter(m => m.type === type && m.line === line)
        .flatMap(m => (m.data as ModeData).stations);
const byCode = (stations: Station[], code: string) => stations.find(s => s.code === code)!;
/** Même règle que SignaletiqueAuditForm::dirKeyOf : emplacement de stockage d'une direction. */
const slotOf = (name: string) => (/meett|aéroport/i.test(name) ? 'meett' : 'pdj');

describe('Équipements Station — directions de l\'arrêt', () => {
    it('chaque arrêt T1 a ses deux directions, y compris là où les DAT sont tous du même côté', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const sig = stationsOf(lieux, AuditModuleType.SIGNALETIQUE, 'TRAM');
        expect(sig.length).toBeGreaterThan(20);
        for (const s of sig) {
            expect(s.directions.map(d => [d.id, d.name]), s.name)
                .toEqual([[`${s.id}-dir-1`, TRAM_DIRECTION_MEETT], [`${s.id}-dir-2`, TRAM_DIRECTION_PDJ]]);
        }
        // La répartition des DAT (#142/#143) reste, elle, sur une seule direction.
        const dat = stationsOf(lieux, AuditModuleType.DAT, 'TRAM');
        for (const code of Object.keys(TRAM_SINGLE_DIRECTION_DATS)) {
            expect(byCode(dat, code).directions).toHaveLength(1);
            expect(byCode(sig, code).directions).toHaveLength(2);
        }
    });

    it.each(['ARE', 'GAS', 'MET'])('%s : chaque équipement directionnel a une direction pour l\'atteindre', async (code) => {
        const station = byCode(stationsOf(await generateInitialLieuxDataAsync(), AuditModuleType.SIGNALETIQUE, 'TRAM'), code);
        const reachable = new Set(station.directions.map(d => slotOf(d.name)));
        const sig = station.signaletique!;
        for (const category of ['biv', 'planReseau', 'planQuartier', 'hap'] as const) {
            for (const slot of ['meett', 'pdj'] as const) {
                if (((sig[category] as any)[slot] ?? []).length > 0) expect(reachable.has(slot), `${category}.${slot}`).toBe(true);
            }
        }
    });

    it('MEETT garde ses 4 plans de quartier : 3 côté MEETT + 1 côté Palais de Justice, tous atteignables', async () => {
        const meett = byCode(stationsOf(await generateInitialLieuxDataAsync(), AuditModuleType.SIGNALETIQUE, 'TRAM'), 'MET');
        expect(meett.signaletique!.planQuartier.meett).toHaveLength(3);
        expect(meett.signaletique!.planQuartier.pdj).toHaveLength(1);
        expect(new Set(meett.directions.map(d => slotOf(d.name)))).toEqual(new Set(['meett', 'pdj']));
    });

    it('Aéroport Express inchangé : directions de ses DAT (terminus à sens unique)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const dat = stationsOf(lieux, AuditModuleType.DAT, 'AEROPORT');
        for (const s of stationsOf(lieux, AuditModuleType.SIGNALETIQUE, 'AEROPORT')) {
            const datStation = dat.find(d => d.id === s.id)!;
            expect(s.directions.map(d => d.name)).toEqual(datStation.directions.map(d => d.name));
        }
    });

    it('aucune donnée existante réécrite : la mise à niveau au démarrage ne touche pas Équipements Station', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        // Base existante provisionnée avec la régression : une seule direction.
        const meett = byCode(stationsOf(lieux, AuditModuleType.SIGNALETIQUE, 'TRAM'), 'MET');
        meett.directions = [meett.directions[1]];
        const snapshot = JSON.stringify(stationsOf(lieux, AuditModuleType.SIGNALETIQUE, 'TRAM'));
        migrateTramSingleDirectionDats(lieux);
        expect(JSON.stringify(stationsOf(lieux, AuditModuleType.SIGNALETIQUE, 'TRAM'))).toBe(snapshot);
    });
});
