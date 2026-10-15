// tests/arenesT1PlanQuartier.test.ts
// =================================================================
// Arènes (T1) : un seul plan de quartier, direction MEETT. Génération,
// attendu de l'audit T1 et migration des données existantes (plan
// « Palais de Justice » retiré s'il est vierge, conservé et signalé sinon).
// Plusieurs DAT dans un même sens n'entraînent jamais plusieurs plans.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore, { migrateArenesT1PlanQuartier } from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { getInitialSignaletiqueData } from '../data/signaletique_config';
import { summarizeT1PlanQuartier, t1PlanQuartierOccurrences } from '../utils/t1PlanQuartierAudit';
import { AuditModuleType, EquipmentStatusType, Lieu, ModeData, PlanQuartierStatus, Station } from '../types';

const t1Station = (lieux: Lieu[], name: string): Station =>
    (lieux.find(l => l.name === name)!.modules
        .find(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM')!.data as ModeData).stations[0];

/** Base « d'avant » : Arènes avec un plan Palais de Justice vierge. */
const withLegacyArenes = (lieux: Lieu[]): Lieu[] => {
    const sig = t1Station(lieux, 'Arènes').signaletique!;
    sig.planQuartier.pdj = getInitialSignaletiqueData('Palais de Justice', 'TRAM').planQuartier.pdj;
    return lieux;
};
const arenesPdj = (lieux: Lieu[]) => t1Station(lieux, 'Arènes').signaletique!.planQuartier.pdj;

describe('Arènes T1 — génération et audit', () => {
    it('nouvelles données : 1 plan côté MEETT, aucun côté Palais de Justice', () => {
        const pq = getInitialSignaletiqueData('Arènes', 'TRAM').planQuartier;
        expect(pq.meett).toHaveLength(1);
        expect(pq.pdj).toHaveLength(0);
    });

    it('plan réseau, BIV et fiches horaires d\'Arènes inchangés (deux sens)', () => {
        const sig = getInitialSignaletiqueData('Arènes', 'TRAM');
        for (const cat of ['planReseau', 'biv', 'hap'] as const) {
            expect(sig[cat].meett).toHaveLength(1);
            expect(sig[cat].pdj).toHaveLength(1);
        }
    });

    it('les 2 DAT d\'Arènes restent côté MEETT, sans créer de second plan', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const dat = lieux.find(l => l.name === 'Arènes')!.modules.find(m => m.type === AuditModuleType.DAT && m.line === 'TRAM')!;
        const dirs = (dat.data as ModeData).stations[0].directions;
        expect(dirs).toHaveLength(1);
        expect(dirs[0].dats).toHaveLength(2);
        expect(t1Station(lieux, 'Arènes').signaletique!.planQuartier.meett).toHaveLength(1);
    });

    it('audit T1 : Arènes attend 1 plan, les autres stations 2', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const arenes = t1PlanQuartierOccurrences(t1Station(lieux, 'Arènes'));
        expect(arenes.map(o => o.dirKey)).toEqual(['meett']);
        expect(summarizeT1PlanQuartier(arenes)).toMatchObject({ expected: 1, recensed: 1, toTreat: 0 });
        for (const name of ['Hippodrome', 'Aéroconstellation', 'MEETT', 'Palais de Justice']) {
            expect(summarizeT1PlanQuartier(t1PlanQuartierOccurrences(t1Station(lieux, name))).expected).toBe(2);
        }
    });
});

describe('migrateArenesT1PlanQuartier — données existantes', () => {
    it('plan Palais de Justice vierge : retiré ; idempotente ; rien d\'autre ne bouge', async () => {
        const lieux = withLegacyArenes(await generateInitialLieuxDataAsync());
        const others = JSON.stringify(lieux.filter(l => l.name !== 'Arènes'));
        const arenesMeett = JSON.stringify(t1Station(lieux, 'Arènes').signaletique!.planQuartier.meett);
        expect(migrateArenesT1PlanQuartier(lieux)).toEqual({ changed: true, removed: 1, keptAudited: 0 });
        expect(arenesPdj(lieux)).toEqual([]);
        expect(JSON.stringify(t1Station(lieux, 'Arènes').signaletique!.planQuartier.meett)).toBe(arenesMeett);
        expect(JSON.stringify(lieux.filter(l => l.name !== 'Arènes'))).toBe(others);
        expect(migrateArenesT1PlanQuartier(lieux)).toEqual({ changed: false, removed: 0, keptAudited: 0 });
    });

    const auditedVariants: [string, (p: PlanQuartierStatus) => void][] = [
        ['statut', p => { p.status = EquipmentStatusType.OK; }],
        ['commentaire', p => { p.comment = 'vu sur place'; }],
        ['photo', p => { p.photo_base64 = 'data:image/png;base64,AAA'; }],
        ['note de photo', p => { p.photo_note = 'note'; }],
        ['rotation de photo', p => { p.photo_rotation = 90; }],
        ['bandeau', p => { p.bannerDirection = EquipmentStatusType.ABSENT; }],
        ['fiche horaire', p => { p.hap = EquipmentStatusType.OK; }],
    ];
    for (const [label, mutate] of auditedVariants) {
        it(`plan Palais de Justice audité (${label}) : conservé tel quel et signalé`, async () => {
            const lieux = withLegacyArenes(await generateInitialLieuxDataAsync());
            mutate(arenesPdj(lieux)[0]);
            const before = JSON.stringify(arenesPdj(lieux));
            expect(migrateArenesT1PlanQuartier(lieux)).toEqual({ changed: false, removed: 0, keptAudited: 1 });
            expect(JSON.stringify(arenesPdj(lieux))).toBe(before);
        });
    }

    it('une cote seule (copie de la configuration) n\'est pas une donnée d\'audit', async () => {
        const lieux = withLegacyArenes(await generateInitialLieuxDataAsync());
        arenesPdj(lieux)[0].dimensions = '83 x 100 cm';
        expect(migrateArenesT1PlanQuartier(lieux).removed).toBe(1);
    });
});

describe('migration Arènes au démarrage (base de test isolée)', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.events.clear();
        useAuditStore.setState({ lieux: [], isLoading: true, isAuthenticated: false, initError: null, selectedLieuId: null, selectedModuleId: null });
    });

    it('plan vierge retiré et persisté, une trace dans le journal', async () => {
        await db.lieux.bulkPut(withLegacyArenes(await generateInitialLieuxDataAsync()));
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        await useAuditStore.getState().init();
        expect(arenesPdj(await db.lieux.toArray())).toEqual([]);
        expect((await db.events.toArray()).filter(e => e.entityId === 'arenes-t1-pdj')).toHaveLength(1);
    });

    it('plan audité conservé, signalé une seule fois même après plusieurs démarrages', async () => {
        const lieux = withLegacyArenes(await generateInitialLieuxDataAsync());
        arenesPdj(lieux)[0].comment = 'plan présent';
        await db.lieux.bulkPut(lieux);
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        await useAuditStore.getState().init();
        await useAuditStore.getState().init();
        expect(arenesPdj(await db.lieux.toArray())).toHaveLength(1);
        expect((await db.events.toArray()).filter(e => e.entityId === 'arenes-t1-pdj-audite')).toHaveLength(1);
    });
});
