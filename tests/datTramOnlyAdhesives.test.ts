// tests/datTramOnlyAdhesives.test.ts
// =================================================================
// ad10 (« Validation avec carte bancaire » + QR code) et ad11 (cadre
// « Appel d'urgence ») n'existent que sur les DAT du tram (Aéroport Express :
// mêmes DAT). Métro et Téléo : hors périmètre — ni à auditer, ni dans
// l'inventaire, ni dans l'avancement.
// =================================================================
import { describe, it, expect } from 'vitest';
import { isDatAdhesiveInScope, getDatAdhesivesForLine, isDatCataloguePending, ADHESIVES } from '../data/adhesives';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { migrateDatAdhesiveScope } from '../store';
import { getDatProgress } from '../utils/progressCalculators';
import { AdhesiveStatus, AuditModuleType, DAT, Lieu, ModeData } from '../types';

const datsOf = (lieux: Lieu[], line: string): DAT[] => lieux.flatMap(l => l.modules)
    .filter(m => m.type === AuditModuleType.DAT && m.line === line)
    .flatMap(m => (m.data as ModeData).stations.flatMap(s => s.directions.flatMap(d => d.dats)));

describe('Périmètre DAT — ad10 / ad11 réservés au tram', () => {
    it('règle : le tram les porte, métro et Téléo non ; les autres adhésifs du réseau sur tous ces DAT', () => {
        for (const id of ['ad10', 'ad11']) {
            expect(isDatAdhesiveInScope(id, 'TRAM')).toBe(true);
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

        expect(migrateDatAdhesiveScope(lieux)).toBe(true);
        expect(m1.adhesives).not.toHaveProperty('ad10');
        expect(m1.adhesives).not.toHaveProperty('ad11');
        expect(m2.adhesives).not.toHaveProperty('ad10');
        expect(m2.adhesives.ad11).toBe(AdhesiveStatus.OK);
        expect(Object.keys(tram.adhesives)).toHaveLength(12);

        expect(migrateDatAdhesiveScope(lieux)).toBe(false);
    });
});

describe('Périmètre DAT — Aéroport Express : adhésifs propres, référentiel en attente', () => {
    it('aucun adhésif du réseau (ad1 à ad12) n\'est attendu sur un DAT LAE', () => {
        expect(isDatCataloguePending('AEROPORT')).toBe(true);
        expect(isDatCataloguePending('TRAM')).toBe(false);
        expect(getDatAdhesivesForLine(ADHESIVES, 'AEROPORT')).toEqual([]);
    });

    it('base neuve : les DAT LAE existent mais n\'attendent encore aucun adhésif', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const lae = datsOf(lieux, 'AEROPORT');
        expect(lae.length).toBeGreaterThan(0);
        for (const dat of lae) expect(dat.adhesives).toEqual({});
    });

    it('base existante : adhésifs du réseau jamais contrôlés retirés des DAT LAE, constat saisi conservé', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const [d1, d2] = datsOf(lieux, 'AEROPORT');
        for (const dat of [d1, d2]) {
            for (const ad of ADHESIVES) dat.adhesives[ad.id] = AdhesiveStatus.NotChecked;
        }
        d2.adhesives.ad3 = AdhesiveStatus.Absent;

        expect(migrateDatAdhesiveScope(lieux)).toBe(true);
        expect(d1.adhesives).toEqual({});
        expect(d2.adhesives).toEqual({ ad3: AdhesiveStatus.Absent });
        expect(migrateDatAdhesiveScope(lieux)).toBe(false);
    });
});
