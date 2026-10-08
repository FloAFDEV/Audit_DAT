// tests/t1PlanQuartierAudit.test.ts
// Audit T1 des plans de quartier : 2 attendus par station (1 par sens),
// lus sur les emplacements Équipements Station existants ; écriture via les
// actions signalétique du store avec cible explicite (module Plans de
// quartier sélectionné), photo par occurrence.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { collectSignaletiquePlansQuartier } from '../utils/cockpit/signaletiquePlansQuartier';
import { summarizeT1PlanQuartier, t1PlanQuartierOccurrences } from '../utils/t1PlanQuartierAudit';
import { AuditModuleType, EquipmentStatusType, Lieu, ModeData } from '../types';

const MEETT = 'Direction MEETT / Aéroport';
const PDJ = 'Direction Palais de Justice';

const t1 = (lieux: Lieu[], name: string) => {
    const lieu = lieux.find(l => l.name === name)!;
    const sig = lieu.modules.find(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM')!;
    const pdq = lieu.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER && m.line === 'TRAM')!;
    return { lieu, sig, pdq, station: (sig.data as ModeData).stations[0] };
};

describe('audit T1 — référentiel 2 plans par station (1 par sens)', () => {
    it('Hippodrome : 2 occurrences, directions réelles dans leur ordre, non contrôlées', async () => {
        const { station } = t1(await generateInitialLieuxDataAsync(), 'Hippodrome');
        const occ = t1PlanQuartierOccurrences(station);
        expect(occ.map(o => o.direction)).toEqual([MEETT, PDJ]);
        expect(occ.every(o => o.item)).toBe(true);
        expect(summarizeT1PlanQuartier(occ)).toEqual({ expected: 2, recensed: 2, conformes: 0, toTreat: 0, unchecked: 2 });
    });

    it('2/2, 1/2 avec 1 à traiter, 0/2', async () => {
        const { station } = t1(await generateInitialLieuxDataAsync(), 'Hippodrome');
        const [a, b] = t1PlanQuartierOccurrences(station);
        a.item!.status = EquipmentStatusType.OK;
        b.item!.status = EquipmentStatusType.OK;
        expect(summarizeT1PlanQuartier([a, b])).toMatchObject({ conformes: 2, toTreat: 0, unchecked: 0 });
        b.item!.status = EquipmentStatusType.ABSENT;
        expect(summarizeT1PlanQuartier([a, b])).toMatchObject({ conformes: 1, toTreat: 1 });
        a.item!.status = EquipmentStatusType.TO_REPLACE;
        expect(summarizeT1PlanQuartier([a, b])).toMatchObject({ conformes: 0, toTreat: 2 });
    });

    it('MEETT : 2 attendus (pas d\'exception), emplacements supplémentaires intacts', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const { station } = t1(lieux, 'MEETT');
        const occ = t1PlanQuartierOccurrences(station);
        expect(occ).toHaveLength(2);
        expect(summarizeT1PlanQuartier(occ).expected).toBe(2);
        expect(station.signaletique!.planQuartier.meett).toHaveLength(3);
        expect(collectSignaletiquePlansQuartier(lieux)).toHaveLength(52);
    });

    it('sens sans emplacement : non recensé et à traiter, rien de créé', async () => {
        const { station } = t1(await generateInitialLieuxDataAsync(), 'Hippodrome');
        station.signaletique!.planQuartier.pdj = [];
        const snapshot = JSON.stringify(station);
        const occ = t1PlanQuartierOccurrences(station);
        expect(occ.map(o => !!o.item)).toEqual([true, false]);
        expect(summarizeT1PlanQuartier(occ)).toMatchObject({ recensed: 1, toTreat: 1 });
        expect(JSON.stringify(station)).toBe(snapshot);
    });
});

describe('audit T1 — écriture sur les emplacements Équipements Station', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        useAuditStore.setState({ lieux: [], isLoading: true, isAuthenticated: false, initError: null, selectedLieuId: null, selectedModuleId: null });
        await db.lieux.bulkPut(await generateInitialLieuxDataAsync());
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        await useAuditStore.getState().init();
    });

    it('état, bandeau et photo par occurrence (ajout, rotation, remplacement, suppression), persistés', async () => {
        const store = useAuditStore.getState();
        const { lieu, sig, pdq, station } = t1(store.lieux, 'Hippodrome');
        // Contexte réel : module Plans de quartier T1 sélectionné.
        useAuditStore.setState({ selectedLieuId: lieu.id, selectedModuleId: pdq.id, selectedStationId: null });
        const target = { moduleId: sig.id, stationId: station.id };
        const s = useAuditStore.getState();

        await s.handleSignaletiqueStatusChange('planQuartier', 'meett', 0, EquipmentStatusType.OK, target);
        await s.handleSignaletiqueStatusChange('planQuartier', 'pdj', 0, EquipmentStatusType.ABSENT, target);
        await s.handleSignaletiqueFieldChange('planQuartier', 'meett', 0, 'bannerDirection', EquipmentStatusType.OK, target);
        await s.handleSignaletiquePhotoChange('planQuartier', 'meett', 0, 'data:image/jpeg;base64,AAA', target);
        await s.handleSignaletiquePhotoRotationChange('planQuartier', 'meett', 0, 90, target);
        await s.handleSignaletiquePhotoChange('planQuartier', 'pdj', 0, 'data:image/jpeg;base64,BBB', target);
        await s.handleSignaletiquePhotoChange('planQuartier', 'meett', 0, 'data:image/jpeg;base64,CCC', target); // remplacement

        // Rechargement : relu depuis IndexedDB.
        await useAuditStore.getState().init();
        const reloaded = t1(useAuditStore.getState().lieux, 'Hippodrome').station.signaletique!.planQuartier;
        expect(reloaded.meett[0]).toMatchObject({ status: 'OK', bannerDirection: 'OK', photo_base64: 'data:image/jpeg;base64,CCC', photo_rotation: 90 });
        expect(reloaded.pdj[0]).toMatchObject({ status: 'ABSENT', photo_base64: 'data:image/jpeg;base64,BBB' });
        expect(reloaded.pdj[0].photo_rotation).toBeUndefined(); // photos indépendantes

        // Suppression : uniquement la photo visée.
        await useAuditStore.getState().handleSignaletiquePhotoChange('planQuartier', 'meett', 0, null, target);
        const after = t1(useAuditStore.getState().lieux, 'Hippodrome').station.signaletique!.planQuartier;
        expect(after.meett[0].photo_base64).toBeUndefined();
        expect(after.meett[0].photo_rotation).toBeUndefined();
        expect(after.pdj[0].photo_base64).toBe('data:image/jpeg;base64,BBB');

        // Module Plans de quartier T1 non touché.
        const pdqAfter = t1(useAuditStore.getState().lieux, 'Hippodrome').pdq;
        expect(pdqAfter.data).toEqual(pdq.data);
    });

    it('sans cible : comportement inchangé (sélection courante)', async () => {
        const { lieu, sig, station } = t1(useAuditStore.getState().lieux, 'Hippodrome');
        useAuditStore.setState({ selectedLieuId: lieu.id, selectedModuleId: sig.id, selectedStationId: station.id });
        await useAuditStore.getState().handleSignaletiqueStatusChange('planQuartier', 'pdj', 0, EquipmentStatusType.TO_REPLACE);
        expect(t1(useAuditStore.getState().lieux, 'Hippodrome').station.signaletique!.planQuartier.pdj[0].status).toBe('TO_REPLACE');
    });
});
