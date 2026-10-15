// tests/t1PlanQuartierDimensions.test.ts
// =================================================================
// Cote des plans de quartier : Tram T1 = 80 x 100 cm (configuration,
// audit T1, inventaire, export), anciennes données 83 x 100 migrées ;
// Aéroport Express (78 x 100) et formats Métro inchangés.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { getInitialSignaletiqueData } from '../data/signaletique_config';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { migrateT1PlanQuartierDimensions } from '../store';
import { T1_PLAN_QUARTIER_DIMENSIONS } from '../utils/t1PlanQuartierAudit';
import { collectSignaletiquePlansQuartier } from '../utils/cockpit/signaletiquePlansQuartier';
import { exportLieuxToCsv } from '../utils/csvExporter';
import { AuditModuleType, EquipmentStatusType, Lieu, ModeData, PlanQuartierStatus } from '../types';

const planItems = (lieux: Lieu[], line: 'TRAM' | 'AEROPORT'): PlanQuartierStatus[] =>
    lieux.flatMap(l => l.modules)
        .filter(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === line)
        .flatMap(m => (m.data as ModeData).stations)
        .flatMap(s => s.signaletique ? [...s.signaletique.planQuartier.meett, ...s.signaletique.planQuartier.pdj] : []);

/** Données « d'avant » : plans T1 enregistrés avec l'ancienne cote. */
const withLegacyT1 = (lieux: Lieu[]) => {
    planItems(lieux, 'TRAM').forEach(p => { p.dimensions = '83 x 100 cm'; });
    return lieux;
};

/** Capture le contenu CSV produit par exportLieuxToCsv (environnement node). */
const captureCsv = async (lieux: Lieu[]): Promise<string> => {
    let blob: Blob | undefined;
    const g = globalThis as any;
    const previousDocument = g.document;
    g.document = { ...previousDocument, createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } };
    const createObjectURL = URL.createObjectURL;
    const revokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = (b: Blob) => { blob = b; return 'blob:test'; };
    URL.revokeObjectURL = () => {};
    try {
        expect(exportLieuxToCsv(lieux, 'test.csv').success).toBe(true);
    } finally {
        g.document = previousDocument;
        URL.createObjectURL = createObjectURL;
        URL.revokeObjectURL = revokeObjectURL;
    }
    return blob!.text();
};

describe('Cote des plans de quartier', () => {
    it('Tram T1 = 80 x 100 : configuration, nouveaux plans, audit T1, cockpit, inventaire', async () => {
        expect(T1_PLAN_QUARTIER_DIMENSIONS).toBe('80 × 100 cm');
        const fresh = getInitialSignaletiqueData('MEETT', 'TRAM').planQuartier;
        expect([...fresh.meett, ...fresh.pdj].every(p => p.dimensions === '80 x 100 cm')).toBe(true);

        const lieux = await generateInitialLieuxDataAsync();
        expect(planItems(lieux, 'TRAM').every(p => p.dimensions === '80 x 100 cm')).toBe(true);
        expect(collectSignaletiquePlansQuartier(lieux).every(p => p.dimensions === '80 x 100 cm')).toBe(true);
        const row = computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).find(i => i.id === 'sign-plan-quartier-tram')!;
        expect(row.dimensions).toBe('80 x 100 cm');
    });

    it('Aéroport Express inchangé à 78 x 100 (configuration et inventaire)', async () => {
        const fresh = getInitialSignaletiqueData('Aéroport', 'AEROPORT').planQuartier;
        expect([...fresh.meett, ...fresh.pdj].every(p => p.dimensions === '78 x 100 cm')).toBe(true);
        const lieux = await generateInitialLieuxDataAsync();
        expect(planItems(lieux, 'AEROPORT').every(p => p.dimensions === '78 x 100 cm')).toBe(true);
        const row = computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).find(i => i.id === 'sign-plan-quartier-aeroport')!;
        expect(row.dimensions).toBe('78 x 100 cm');
    });

    it('formats Métro du catalogue inchangés (78x100, 78x120, PEM 3D 120x80)', () => {
        const dims = Object.fromEntries(buildSignageReferencesSeed().filter(r => r.auditType === 'PDQ').map(r => [r.id, r.dimensions]));
        expect(dims['pdq-78x100']).toEqual({ width: 78, height: 100, unit: 'cm' });
        expect(dims['pdq-78x120']).toMatchObject({ width: 78, height: 120 });
        expect(dims['pdq-adhesif']).toMatchObject({ width: 78, height: 120 });
        expect(dims['pdq-78x120-dibond']).toMatchObject({ width: 78, height: 120 });
        expect(dims['pem3d-120x80']).toMatchObject({ width: 120, height: 80 });
    });
});

describe('migrateT1PlanQuartierDimensions', () => {
    it('83 x 100 → 80 x 100 sur les seuls plans T1, idempotente', async () => {
        const lieux = withLegacyT1(await generateInitialLieuxDataAsync());
        const count = planItems(lieux, 'TRAM').length;
        expect(count).toBeGreaterThan(0);
        expect(migrateT1PlanQuartierDimensions(lieux)).toBe(true);
        expect(planItems(lieux, 'TRAM').every(p => p.dimensions === '80 x 100 cm')).toBe(true);
        expect(planItems(lieux, 'TRAM')).toHaveLength(count);
        const after = JSON.stringify(lieux);
        expect(migrateT1PlanQuartierDimensions(lieux)).toBe(false);
        expect(JSON.stringify(lieux)).toBe(after);
    });

    it('conserve strictement statut, commentaire, photo, bandeau, fiche horaire et ordre', async () => {
        const lieux = withLegacyT1(await generateInitialLieuxDataAsync());
        const items = planItems(lieux, 'TRAM');
        items.forEach((p, i) => {
            p.status = i % 2 ? EquipmentStatusType.OK : EquipmentStatusType.TO_REPLACE;
            p.comment = `commentaire ${i}`;
            p.photo_base64 = `data:image/png;base64,${i}`;
            p.photo_note = `note ${i}`;
            p.bannerDirection = EquipmentStatusType.ABSENT;
            p.hap = EquipmentStatusType.OK;
        });
        const strip = (ps: PlanQuartierStatus[]) => JSON.stringify(ps.map(({ dimensions, ...rest }) => rest));
        const before = strip(items);
        migrateT1PlanQuartierDimensions(lieux);
        expect(strip(planItems(lieux, 'TRAM'))).toBe(before);
    });

    it('ne touche ni un plan T1 à une autre cote, ni l\'Aéroport Express, ni le Métro', async () => {
        const lieux = withLegacyT1(await generateInitialLieuxDataAsync());
        const custom = planItems(lieux, 'TRAM')[0];
        custom.dimensions = '81 x 100 cm';
        planItems(lieux, 'AEROPORT')[0].dimensions = '83 x 100 cm'; // même valeur, autre ligne
        const otherModules = JSON.stringify(lieux.flatMap(l => l.modules).filter(m => !(m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM')));
        migrateT1PlanQuartierDimensions(lieux);
        expect(custom.dimensions).toBe('81 x 100 cm');
        expect(planItems(lieux, 'AEROPORT')[0].dimensions).toBe('83 x 100 cm');
        expect(JSON.stringify(lieux.flatMap(l => l.modules).filter(m => !(m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM')))).toBe(otherModules);
    });

    it('après migration, inventaire et export CSV portent 80 x 100 pour les plans T1', async () => {
        const lieux = withLegacyT1(await generateInitialLieuxDataAsync());
        const legacyCsv = await captureCsv(lieux);
        expect(legacyCsv).toContain('83 x 100 cm');

        migrateT1PlanQuartierDimensions(lieux);
        const csv = await captureCsv(lieux);
        expect(csv).not.toContain('83 x 100 cm');
        const planRows = csv.split('\n').filter(l => l.includes('Plan Quartier'));
        expect(planRows.length).toBeGreaterThan(0);
        expect(planRows.every(l => l.includes('80 x 100 cm') || l.includes('78 x 100 cm'))).toBe(true);
        expect(computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).find(i => i.id === 'sign-plan-quartier-tram')!.dimensions).toBe('80 x 100 cm');
    });
});

describe('migration T1 : démarrage et import JSON (base de test isolée)', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        useAuditStore.setState({
            lieux: [], isLoading: true, isAuthenticated: false, initError: null,
            selectedLieuId: null, selectedModuleId: null,
        });
    });

    it('au démarrage : les plans T1 enregistrés à 83 x 100 sont corrigés et persistés', async () => {
        await db.lieux.bulkPut(withLegacyT1(await generateInitialLieuxDataAsync()));
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        await useAuditStore.getState().init();
        expect(planItems(useAuditStore.getState().lieux, 'TRAM').every(p => p.dimensions === '80 x 100 cm')).toBe(true);
        expect(planItems(await db.lieux.toArray(), 'TRAM').every(p => p.dimensions === '80 x 100 cm')).toBe(true);
        expect(planItems(await db.lieux.toArray(), 'AEROPORT').every(p => p.dimensions === '78 x 100 cm')).toBe(true);
    });

    it('après import d\'un ancien export : corrigé immédiatement, sans attendre le redémarrage', async () => {
        const payload = JSON.stringify({ exportDate: new Date().toISOString(), data: withLegacyT1(await generateInitialLieuxDataAsync()) });
        await useAuditStore.getState().handleImportJsonData(payload);
        expect(planItems(useAuditStore.getState().lieux, 'TRAM').every(p => p.dimensions === '80 x 100 cm')).toBe(true);
        expect(planItems(await db.lieux.toArray(), 'TRAM').every(p => p.dimensions === '80 x 100 cm')).toBe(true);
    });
});

// Règle structurelle T1 (Équipements Station) : au moins un plan dans
// chaque sens, sauf Arènes (un seul plan, direction MEETT) ; les plans
// supplémentaires connus (MEETT) sont conservés. Documentation uniquement :
// la correction des cotes ne crée ni ne supprime aucun plan.
const t1Stations = (lieux: Lieu[]) => lieux.flatMap(l => l.modules)
    .filter(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM' && !m.isFuture)
    .flatMap(m => (m.data as ModeData).stations)
    .filter(s => !s.isFuture && s.signaletique);
const planCounts = (lieux: Lieu[]) => Object.fromEntries(t1Stations(lieux).map(s =>
    [s.name, { meett: s.signaletique!.planQuartier.meett.length, pdj: s.signaletique!.planQuartier.pdj.length }]));

describe('Règle structurelle des plans de quartier T1', () => {
    it('stations T1 (hors Arènes) : au moins un plan dans chaque sens', async () => {
        const counts = planCounts(await generateInitialLieuxDataAsync());
        const normal = Object.entries(counts).filter(([name]) => name !== 'Arènes');
        expect(normal.length).toBeGreaterThan(20);
        for (const [, c] of normal) {
            expect(c.meett).toBeGreaterThanOrEqual(1);
            expect(c.pdj).toBeGreaterThanOrEqual(1);
        }
    });

    it('MEETT : ses plans supplémentaires (3 côté MEETT) sont présents', async () => {
        expect(planCounts(await generateInitialLieuxDataAsync()).MEETT).toEqual({ meett: 3, pdj: 1 });
    });

    // Écart constaté : les données initiales d'Arènes portent aussi un plan
    // direction Palais de Justice. Le retirer est une correction de données
    // hors du périmètre « cotes » — à décider séparément.
    it.todo('Arènes : un seul plan, direction MEETT (données initiales actuelles : 1 MEETT + 1 Palais de Justice)');

    it('la migration des cotes ne crée, ne supprime ni ne réordonne aucun plan (MEETT et Arènes compris)', async () => {
        const lieux = withLegacyT1(await generateInitialLieuxDataAsync());
        const before = planCounts(lieux);
        const refs = t1Stations(lieux).flatMap(s => [...s.signaletique!.planQuartier.meett, ...s.signaletique!.planQuartier.pdj]);
        migrateT1PlanQuartierDimensions(lieux);
        expect(planCounts(lieux)).toEqual(before);
        const after = t1Stations(lieux).flatMap(s => [...s.signaletique!.planQuartier.meett, ...s.signaletique!.planQuartier.pdj]);
        expect(after).toHaveLength(refs.length);
        after.forEach((item, i) => expect(item).toBe(refs[i])); // mêmes objets, même ordre
    });
});
