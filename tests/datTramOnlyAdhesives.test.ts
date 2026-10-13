// tests/datTramOnlyAdhesives.test.ts
// =================================================================
// ad10 (« Validation avec carte bancaire » + QR code) et ad11 (cadre
// « Appel d'urgence ») n'existent que sur les DAT du tram (Aéroport Express :
// mêmes DAT). Métro et Téléo : hors périmètre — ni à auditer, ni dans
// l'inventaire, ni dans l'avancement.
// =================================================================
import { describe, it, expect } from 'vitest';
import { isDatAdhesiveInScope, getDatAdhesivesForLine, ADHESIVES } from '../data/adhesives';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { migrateDatTramOnlyAdhesives } from '../store';
import { getDatProgress } from '../utils/progressCalculators';
import { AdhesiveStatus, AuditModuleType, DAT, Lieu, ModeData } from '../types';

const datsOf = (lieux: Lieu[], line: string): DAT[] => lieux.flatMap(l => l.modules)
    .filter(m => m.type === AuditModuleType.DAT && m.line === line)
    .flatMap(m => (m.data as ModeData).stations.flatMap(s => s.directions.flatMap(d => d.dats)));

describe('Périmètre DAT — ad10 / ad11 réservés au tram', () => {
    it('règle : tram et Aéroport Express les portent, métro et Téléo non ; les autres adhésifs partout', () => {
        for (const id of ['ad10', 'ad11']) {
            expect(isDatAdhesiveInScope(id, 'TRAM')).toBe(true);
            expect(isDatAdhesiveInScope(id, 'AEROPORT')).toBe(true);
            expect(isDatAdhesiveInScope(id, 'A')).toBe(false);
            expect(isDatAdhesiveInScope(id, 'B')).toBe(false);
            expect(isDatAdhesiveInScope(id, 'TELEO')).toBe(false);
        }
        expect(isDatAdhesiveInScope('ad12', 'A')).toBe(true);
        expect(getDatAdhesivesForLine(ADHESIVES, 'A')).toHaveLength(10);
        expect(getDatAdhesivesForLine(ADHESIVES, 'TRAM')).toHaveLength(12);
    });

    it('base neuve : un DAT métro attend 10 adhésifs, un DAT tram 12', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const metro = datsOf(lieux, 'A')[0];
        const tram = datsOf(lieux, 'TRAM')[0];
        expect(Object.keys(metro.adhesives)).toHaveLength(10);
        expect(metro.adhesives).not.toHaveProperty('ad10');
        expect(getDatProgress(metro).total).toBe(10);
        expect(Object.keys(tram.adhesives)).toHaveLength(12);
    });

    it('base existante : retire ad10 / ad11 jamais contrôlés des DAT métro, garde un constat saisi, idempotente', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const [m1, m2] = datsOf(lieux, 'B');
        const tram = datsOf(lieux, 'TRAM')[0];
        // Simule une base d'avant : les 12 clés partout, un constat saisi sur m2.
        for (const dat of [m1, m2]) { dat.adhesives.ad10 = AdhesiveStatus.NotChecked; dat.adhesives.ad11 = AdhesiveStatus.NotChecked; }
        m2.adhesives.ad11 = AdhesiveStatus.OK;

        expect(migrateDatTramOnlyAdhesives(lieux)).toBe(true);
        expect(m1.adhesives).not.toHaveProperty('ad10');
        expect(m1.adhesives).not.toHaveProperty('ad11');
        expect(m2.adhesives).not.toHaveProperty('ad10');
        expect(m2.adhesives.ad11).toBe(AdhesiveStatus.OK);
        expect(Object.keys(tram.adhesives)).toHaveLength(12);

        expect(migrateDatTramOnlyAdhesives(lieux)).toBe(false);
    });
});
