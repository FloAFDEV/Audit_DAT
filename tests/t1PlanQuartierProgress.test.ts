// tests/t1PlanQuartierProgress.test.ts
// Progression du filtre « Plans de quartier → Tram T1 » : audit T1
// (Équipements Station), 2 attendus par station en service, contrôlé = état
// du plan ≠ Non contrôlé. Les autres filtres restent inchangés (valeurs de
// référence relevées sur main avant ce correctif, même scénario).
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { getCategoryProgress, getLieuProgress } from '../utils/progressCalculators';
import { collectSignaletiquePlansQuartier } from '../utils/cockpit/signaletiquePlansQuartier';
import { AdhesiveStatus, AuditModuleType as T, EquipmentStatusType, Lieu, ModeData, PlanQuartierData } from '../types';

const PDQ = [T.PLAN_QUARTIER];
let lieux: Lieu[];

const lieu = (name: string) => lieux.find(l => l.name === name)!;
const t1Plans = (name: string) =>
    (lieu(name).modules.find(m => m.type === T.SIGNALETIQUE && m.line === 'TRAM')!.data as ModeData).stations[0].signaletique!.planQuartier;
const card = (name: string) => getLieuProgress(lieu(name), PDQ, 'TRAM');
const t1Chip = () => getCategoryProgress(lieux, 'TRAM', PDQ);

describe('progression « Plans de quartier → Tram T1 »', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        useAuditStore.setState({ lieux: [], isLoading: true, isAuthenticated: false, initError: null, selectedLieuId: null, selectedModuleId: null });
        await db.lieux.bulkPut(await generateInitialLieuxDataAsync());
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        await useAuditStore.getState().init();
        lieux = structuredClone(useAuditStore.getState().lieux);
    });

    it('station T1 : 0/2 → 0 % (plus de faux 100 % sur un module vide), 1/2 → 50 %, 2/2 → 100 %', () => {
        expect(lieux.filter(l => l.modules.some(m => m.line === 'TRAM')).map(l => card(l.name)).every(p => p === 0)).toBe(true);
        t1Plans('Hippodrome').meett[0].status = EquipmentStatusType.OK;
        expect(card('Hippodrome')).toBe(50);
        t1Plans('Hippodrome').pdj[0].status = EquipmentStatusType.OK;
        expect(card('Hippodrome')).toBe(100);
    });

    it('Absent et À remplacer comptent comme contrôlés, Non contrôlé non ; bandeau exclu', () => {
        t1Plans('Hippodrome').meett[0].status = EquipmentStatusType.ABSENT;
        t1Plans('Hippodrome').pdj[0].status = EquipmentStatusType.TO_REPLACE;
        expect(card('Hippodrome')).toBe(100);
        t1Plans('Hippodrome').pdj[0].status = 'NotChecked';
        t1Plans('Hippodrome').pdj[0].bannerDirection = EquipmentStatusType.OK;
        expect(card('Hippodrome')).toBe(50);
    });

    it('pastille T1 : dénominateur 50 (25 stations en service × 2) — Blagnac futur exclu, extras MEETT sans effet', () => {
        expect(t1Chip()).toBe(0);
        t1Plans('Hippodrome').meett[0].status = EquipmentStatusType.OK;
        expect(t1Chip()).toBeCloseTo(100 / 50); // 1 / 50 = 2 %
        // Les 2 emplacements supplémentaires de MEETT ne comptent pas.
        t1Plans('MEETT').meett[1].status = EquipmentStatusType.OK;
        t1Plans('MEETT').meett[2].status = EquipmentStatusType.OK;
        expect(t1Chip()).toBeCloseTo(100 / 50);
        expect(card('MEETT')).toBe(0);
        // Blagnac (futur) : hors dénominateur, carte jamais à 100 %.
        expect(card('Blagnac')).toBe(0);
        // Toutes les stations en service contrôlées → 100 %.
        for (const l of lieux) {
            const sig = l.modules.find(m => m.type === T.SIGNALETIQUE && m.line === 'TRAM');
            const st = (sig?.data as ModeData | undefined)?.stations[0];
            if (!st?.signaletique || st.isFuture) continue;
            st.signaletique.planQuartier.meett[0].status = EquipmentStatusType.OK;
            st.signaletique.planQuartier.pdj[0].status = EquipmentStatusType.ABSENT;
        }
        expect(t1Chip()).toBe(100);
        // Données T1 inchangées : toujours 52 emplacements.
        expect(collectSignaletiquePlansQuartier(lieux)).toHaveLength(52);
    });

    it('stations partagées : seuls les plans T1 comptent (pas les PDQ A/B du lieu)', () => {
        const occ = (name: string, line: string) => (lieu(name).modules.find(m => m.type === T.PLAN_QUARTIER && m.line === line)!.data as PlanQuartierData).occurrences;
        occ('Arènes', 'A').forEach(o => { o.status = AdhesiveStatus.OK; });
        expect(card('Arènes')).toBe(0);
        t1Plans('Arènes').meett[0].status = EquipmentStatusType.OK;
        expect(card('Arènes')).toBe(50);
    });

    it('autres filtres inchangés : PDQ A / B / Téléo / LAE / Tout, Équipements Station', () => {
        // Même scénario que la référence relevée sur main.
        const occ = (name: string, line: string) => (lieu(name).modules.find(m => m.type === T.PLAN_QUARTIER && m.line === line)!.data as PlanQuartierData).occurrences;
        occ('Arènes', 'A')[0].status = AdhesiveStatus.OK;
        occ('Arènes', 'A')[1].status = AdhesiveStatus.Absent;
        occ('Palais de Justice', 'B')[0].status = AdhesiveStatus.OK;
        t1Plans('Hippodrome').meett[0].status = EquipmentStatusType.OK;

        expect(getCategoryProgress(lieux, 'METRO_A', PDQ)).toBeCloseTo(4.761905, 5);
        expect(getCategoryProgress(lieux, 'METRO_B', PDQ)).toBeCloseTo(1.923077, 5);
        expect(getCategoryProgress(lieux, 'TELEO', PDQ)).toBe(0);
        expect(getCategoryProgress(lieux, 'LAE', PDQ)).toBe(0);
        expect(getCategoryProgress(lieux, 'ALL', PDQ)).toBeCloseTo(3.333333, 5); // 3 / 90
        expect(getLieuProgress(lieu('Arènes'), PDQ, 'METRO_A')).toBeCloseTo(33.333333, 5);
        expect(getLieuProgress(lieu('Palais de Justice'), PDQ, 'METRO_B')).toBe(50);
        // Équipements Station : logique actuelle, plans T1 inclus.
        expect(getCategoryProgress(lieux, 'TRAM', [T.SIGNALETIQUE])).toBeCloseTo(0.151976, 5);
        expect(getLieuProgress(lieu('Hippodrome'), [T.SIGNALETIQUE], 'TRAM')).toBeCloseTo(3.846154, 5);
        // Vue « Tout » de la catégorie T1 : inchangée.
        expect(getCategoryProgress(lieux, 'TRAM', [])).toBeCloseTo(0.079491, 5);
    });
});
