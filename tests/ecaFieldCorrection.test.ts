// tests/ecaFieldCorrection.test.ts
// =================================================================
// Fiabilisation des ECA : source corrigée (relevés terrain), identité
// module + accès + numéro, corrections terrain tracées et persistantes,
// archivage des adhésifs devenus inapplicables, report lors des
// réinitialisations, alignement prudent des valideurs confirmés.
// =================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { getEcaAdhesiveOccurrences } from '../data/adhesives';
import { ECA_FIELD_VERIFICATION } from '../data/ecaFieldVerification';
import { AdhesiveStatus, AuditModuleType, ECA, EcaData, EcaEquipmentType, Lieu } from '../types';
import {
    applyEcaEdit, carryOverEcaFieldTraces, CONFIRMED_ECA_SOURCE_CORRECTIONS, ecaIdentityKey, ecaSourceKey,
    getEcaFieldStatuses, planEcaSourceAlignment,
} from '../utils/ecaFieldCorrection';
import { getEcaProgress } from '../utils/progressCalculators';
import { getLieuDefectCount } from '../utils/anomalyDetector';
import { generateMaintenanceSummary } from '../utils/maintenanceGenerator';
import { parseImportPayload, applyImportPayload } from '../utils/signageSerializer';

const { TripodeEntree: TE, TripodeSortie: TS, VantauxEntree: VE, VantauxReversible: VR, PMRVantaux } = EcaEquipmentType;
const NOW = '2026-10-22T08:00:00.000Z';

const ecaModules = (lieux: Lieu[]) => lieux.flatMap(l => l.modules.filter(m => m.type === AuditModuleType.ECA));
const moduleById = (lieux: Lieu[], id: string) => ecaModules(lieux).find(m => m.id === id)!;
const ecaAt = (lieux: Lieu[], moduleId: string, number: number, accessPoint = 'Accès Principal') =>
    (moduleById(lieux, moduleId).data as EcaData).ecas.find(e => e.accessPoint === accessPoint && e.number === number)!;
const lieuOf = (lieux: Lieu[], moduleId: string) => lieux.find(l => l.modules.some(m => m.id === moduleId))!;
const mod = (code: string) => `module-eca-${code}-${code === 'ARG' ? 'A' : 'B'}-ECA-(Valideurs)`;

const makeEca = (type: EcaEquipmentType, adhesives: ECA['adhesives'], extra: Partial<ECA> = {}): ECA => ({
    id: 'eca-x', name: 'Valideur 5', accessPoint: 'Accès Principal', type, number: 5, adhesives, comment: 'vitre rayée', ...extra,
});

// -----------------------------------------------------------------
describe('source corrigée — configurations terrain confirmées', () => {
    const expected: Record<string, { entrees: number[]; sorties: number[] }> = {
        EMP: { entrees: [1, 2, 3, 4], sorties: [5] },
        RAN: { entrees: [4, 5], sorties: [2, 3] },
        PHA: { entrees: [3, 4, 5, 6], sorties: [2] },
        UPS: { entrees: [1, 2, 3, 4, 5, 6], sorties: [7] },
    };
    it.each(Object.keys(expected))('%s : entrées et sorties conformes au relevé', async code => {
        const lieux = await generateInitialLieuxDataAsync();
        const ecas = (moduleById(lieux, mod(code)).data as EcaData).ecas;
        const numbers = (t: EcaEquipmentType) => ecas.filter(e => e.type === t).map(e => e.number).sort((a, b) => a - b);
        expect(numbers(TE)).toEqual(expected[code].entrees);
        expect(numbers(TS)).toEqual(expected[code].sorties);
    });

    it('303 valideurs, clé module + accès + numéro unique ; mêmes numéros sur accès différents distincts', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const keys = ecaModules(lieux).flatMap(m => (m.data as EcaData).ecas.map(e => ecaIdentityKey(m.id, ecaSourceKey(e))));
        expect(keys).toHaveLength(303);
        expect(new Set(keys).size).toBe(303);
        const hist = ecaAt(lieux, 'module-eca-JJA-A-ECA-(Accès-Historique)', 1, 'Accès Historique');
        const princ = ecaAt(lieux, 'module-eca-JJA-A-ECA-(Accès-Principal)', 1, 'Accès Principal');
        expect(hist).toBeDefined();
        expect(princ).toBeDefined();
        expect(ecaIdentityKey('module-eca-JJA-A-ECA-(Accès-Historique)', ecaSourceKey(hist)))
            .not.toBe(ecaIdentityKey('module-eca-JJA-A-ECA-(Accès-Principal)', ecaSourceKey(princ)));
    });

    it('ligne B : 59 tripodes d\'entrée, 47 de sortie ; les 7 vantaux réversibles inchangés et comptés à part', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const all = ecaModules(lieux).flatMap(m => (m.data as EcaData).ecas.map(e => ({ line: m.line, e })));
        const lineB = all.filter(x => x.line === 'B').map(x => x.e);
        expect(lineB.filter(e => e.type === TE)).toHaveLength(59);
        expect(lineB.filter(e => e.type === TS)).toHaveLength(47);
        const reversibles = all.map(x => x.e).filter(e => e.type === VR);
        expect(reversibles.map(e => `${e.accessPoint} ${e.number}`).sort()).toEqual([
            'Liaison A→B 13', 'Liaison A→B 14', 'Liaison A→B 15', 'Liaison A→B 16',
            'Liaison B→A 10', 'Liaison B→A 11', 'Liaison B→A 9',
        ]);
    });

    it('les 8 corrections confirmées pointent sur un module existant et la source porte le nouveau sens', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        expect(CONFIRMED_ECA_SOURCE_CORRECTIONS).toHaveLength(8);
        for (const c of CONFIRMED_ECA_SOURCE_CORRECTIONS) {
            const eca = ecaAt(lieux, c.moduleId, c.number, c.accessPoint);
            expect(eca.type).not.toBe(c.previousType);
        }
        // Données neuves : rien à aligner, aucun conflit.
        expect(planEcaSourceAlignment(lieux).every(e => e.outcome === 'already-aligned')).toBe(true);
    });

    it('liste de vérification : aucun PMR, aucune des 4 stations confirmées', () => {
        expect(ECA_FIELD_VERIFICATION.length).toBeGreaterThan(0);
        for (const v of ECA_FIELD_VERIFICATION) {
            expect(['EMP', 'RAN', 'PHA', 'UPS']).not.toContain(v.stationCode);
            for (const t of [v.october2025, v.current]) {
                if (t) expect(t.startsWith('PMR')).toBe(false);
            }
        }
    });
});

// -----------------------------------------------------------------
describe('changement de type sur le terrain (règle pure)', () => {
    const entreeAudited = () => makeEca(TE, {
        'eca-1@ZH': AdhesiveStatus.OK, 'eca-2': AdhesiveStatus.ToBeReplaced, 'eca-3': AdhesiveStatus.OK, 'eca-11': AdhesiveStatus.Absent,
    }, { completionDate: '2026-01-01T00:00:00.000Z' });

    it('entrée → sortie : eca-11 conservé, eca-1/2/3 archivés, commentaire intact, correction tracée', () => {
        const { eca, typeChange } = applyEcaEdit(entreeAudited(), { id: 'eca-x', type: TS }, NOW);
        expect(eca.adhesives).toEqual({ 'eca-11': AdhesiveStatus.Absent });
        expect(eca.archivedAdhesives).toEqual({ 'eca-1@ZH': AdhesiveStatus.OK, 'eca-2': AdhesiveStatus.ToBeReplaced, 'eca-3': AdhesiveStatus.OK });
        expect(eca.comment).toBe('vitre rayée');
        expect(eca.fieldTypeCorrection).toEqual({ initialType: TE, correctedAt: NOW });
        expect(eca.sourceRef).toEqual({ accessPoint: 'Accès Principal', number: 5 });
        expect(typeChange!.archived.sort()).toEqual(['eca-1@ZH', 'eca-2', 'eca-3']);
        // Toutes les occurrences du type sortie sont renseignées → achevé, date conservée.
        expect(getEcaProgress(eca).isComplete).toBe(true);
        expect(eca.completionDate).toBe('2026-01-01T00:00:00.000Z');
    });

    it('retour au sens précédent : statuts archivés restaurés, correction retirée', () => {
        const toSortie = applyEcaEdit(entreeAudited(), { id: 'eca-x', type: TS }, NOW).eca;
        const { eca, typeChange } = applyEcaEdit(toSortie, { id: 'eca-x', type: TE }, NOW);
        expect(eca.adhesives).toEqual(entreeAudited().adhesives);
        expect(eca.archivedAdhesives).toBeUndefined();
        expect(eca.fieldTypeCorrection).toBeUndefined();
        expect(typeChange!.restored.sort()).toEqual(['eca-1@ZH', 'eca-2', 'eca-3']);
    });

    it('sortie → entrée sans archive : nouvelles occurrences « non contrôlé », achèvement retiré', () => {
        const sortie = makeEca(TS, { 'eca-11': AdhesiveStatus.OK }, { completionDate: '2026-01-01T00:00:00.000Z' });
        const { eca } = applyEcaEdit(sortie, { id: 'eca-x', type: TE }, NOW);
        expect(eca.adhesives).toEqual({
            'eca-1@ZH': AdhesiveStatus.NotChecked, 'eca-2': AdhesiveStatus.NotChecked, 'eca-3': AdhesiveStatus.NotChecked, 'eca-11': AdhesiveStatus.OK,
        });
        expect(eca.completionDate).toBeUndefined();
    });

    it('ancienne clé eca-1 (audit antérieur aux zones) archivée puis relue en eca-1@ZH', () => {
        const legacy = makeEca(TE, { 'eca-1': AdhesiveStatus.Absent, 'eca-2': AdhesiveStatus.OK, 'eca-3': AdhesiveStatus.OK, 'eca-11': AdhesiveStatus.OK });
        const sortie = applyEcaEdit(legacy, { id: 'eca-x', type: TS }, NOW).eca;
        expect(sortie.archivedAdhesives!['eca-1']).toBe(AdhesiveStatus.Absent);
        const back = applyEcaEdit(sortie, { id: 'eca-x', type: TE }, NOW).eca;
        expect(back.adhesives['eca-1@ZH']).toBe(AdhesiveStatus.Absent);
    });

    it('tripode ↔ vantaux, même sens : occurrences identiques, donc statuts conservés', () => {
        expect(getEcaAdhesiveOccurrences(VE).map(o => [o.statusKey, o.id])).toEqual(getEcaAdhesiveOccurrences(TE).map(o => [o.statusKey, o.id]));
        const { eca } = applyEcaEdit(entreeAudited(), { id: 'eca-x', type: VE }, NOW);
        expect(eca.adhesives).toEqual(entreeAudited().adhesives);
        expect(eca.archivedAdhesives).toBeUndefined();
        expect(eca.fieldTypeCorrection).toEqual({ initialType: TE, correctedAt: NOW });
    });

    it('type PMR en jeu : comportement historique (réinitialisation, aucune trace)', () => {
        const { eca, typeChange } = applyEcaEdit(entreeAudited(), { id: 'eca-x', type: PMRVantaux }, NOW);
        expect(typeChange).toBeUndefined();
        expect(Object.values(eca.adhesives).every(s => s === AdhesiveStatus.NotChecked)).toBe(true);
        expect(eca.completionDate).toBeUndefined();
        expect(eca.fieldTypeCorrection).toBeUndefined();
        expect(eca.archivedAdhesives).toBeUndefined();
    });

    it('sens vérifié : indépendant du type, retiré quand décoché', () => {
        const verified = applyEcaEdit(entreeAudited(), { id: 'eca-x', fieldVerifiedAt: NOW }, NOW).eca;
        expect(verified.type).toBe(TE);
        expect(verified.adhesives).toEqual(entreeAudited().adhesives);
        expect(verified.fieldVerifiedAt).toBe(NOW);
        const unverified = applyEcaEdit(verified, { id: 'eca-x', fieldVerifiedAt: undefined }, NOW).eca;
        expect('fieldVerifiedAt' in unverified).toBe(false);
    });

    it('adhésifs archivés exclus de l\'avancement, des anomalies et de la maintenance', () => {
        const sortie = applyEcaEdit(entreeAudited(), { id: 'eca-x', type: TS }, NOW).eca;
        const lieu: Lieu = {
            id: 'l', name: 'L', modules: [{ id: 'm', type: AuditModuleType.ECA, name: 'ECA', line: 'B',
                data: { id: 'd', stationName: 'L', stationCode: 'TST', ecas: [sortie] } as EcaData }],
        } as Lieu;
        expect(getEcaAdhesiveOccurrences(TS)).toHaveLength(1);
        expect(getEcaProgress(sortie).isComplete).toBe(true);
        expect(getLieuDefectCount(lieu)).toBe(1); // eca-11 Absent, pas eca-2 archivé
        const summary = generateMaintenanceSummary([lieu]);
        expect(summary.toBeReplaced.count).toBe(0);
        expect(summary.absent.count).toBe(1);
    });

    it('statuts affichés : réversible et liste de vérification « à contrôler », corrigé/vérifié prioritaires, PMR sans badge', () => {
        const rev = makeEca(VR, {}, { accessPoint: 'Liaison A→B', number: 13 });
        expect(getEcaFieldStatuses(rev, 'JJA', 'module-eca-JJA-B-ECA-Liaison-A→B')).toEqual(['to_check']);
        expect(getEcaFieldStatuses({ ...rev, fieldVerifiedAt: NOW }, 'JJA', 'x')).toEqual(['verified']);
        const arg2 = makeEca(TS, {}, { number: 2 });
        expect(getEcaFieldStatuses(arg2, 'ARG', mod('ARG'))).toEqual(['to_check']);
        expect(getEcaFieldStatuses({ ...arg2, fieldTypeCorrection: { initialType: TS, correctedAt: NOW } }, 'ARG', mod('ARG'))).toEqual(['corrected']);
        expect(getEcaFieldStatuses(makeEca(PMRVantaux, {}), 'ARG', mod('ARG'))).toEqual([]);
        // Valideur confirmé déjà conforme : aucun badge ; divergent : à contrôler.
        expect(getEcaFieldStatuses(makeEca(TS, {}), 'EMP', mod('EMP'))).toEqual([]);
        expect(getEcaFieldStatuses(makeEca(TE, {}), 'EMP', mod('EMP'))).toEqual(['to_check']);
    });
});

// -----------------------------------------------------------------
describe('report des traces terrain sur des modules reconstruits (règle pure)', () => {
    it('correction reportée par module + position source, même si accès/numéro ont été modifiés ; avancement remis à zéro', async () => {
        const previous = await generateInitialLieuxDataAsync();
        const fresh = await generateInitialLieuxDataAsync();
        const m = mod('ARG');
        const arg2 = ecaAt(previous, m, 2);
        const edited = applyEcaEdit(arg2, { id: arg2.id, type: TE, number: 22, name: 'Valideur 2 (corrigé)' }, NOW).eca;
        edited.adhesives['eca-11'] = AdhesiveStatus.OK;
        Object.assign(arg2, edited);
        const r = carryOverEcaFieldTraces(lieuOf(previous, m).modules, lieuOf(fresh, m).modules);
        expect(r).toEqual({ carried: 1, unmatched: [] });
        const target = ecaAt(fresh, m, 2);
        expect(target.type).toBe(TE);
        expect(target.name).toBe('Valideur 2 (corrigé)');
        expect(target.fieldTypeCorrection).toEqual({ initialType: TS, correctedAt: NOW });
        expect(Object.values(target.adhesives).every(s => s === AdhesiveStatus.NotChecked)).toBe(true);
        expect(target.archivedAdhesives).toBeUndefined();
    });

    it('source devenue conforme à la correction : correction retirée, vérification conservée', async () => {
        const previous = await generateInitialLieuxDataAsync();
        const fresh = await generateInitialLieuxDataAsync();
        const m = mod('EMP');
        const emp5 = ecaAt(previous, m, 5);
        Object.assign(emp5, { fieldTypeCorrection: { initialType: TE, correctedAt: NOW }, fieldVerifiedAt: NOW, sourceRef: { accessPoint: 'Accès Principal', number: 5 } });
        carryOverEcaFieldTraces(lieuOf(previous, m).modules, lieuOf(fresh, m).modules);
        const target = ecaAt(fresh, m, 5);
        expect(target.type).toBe(TS);
        expect(target.fieldTypeCorrection).toBeUndefined();
        expect(target.fieldVerifiedAt).toBe(NOW);
    });

    it('correspondance absente : trace signalée, jamais appliquée à un autre équipement', async () => {
        const previous = await generateInitialLieuxDataAsync();
        const fresh = await generateInitialLieuxDataAsync();
        const m = mod('ARG');
        const arg2 = ecaAt(previous, m, 2);
        Object.assign(arg2, { type: TE, fieldTypeCorrection: { initialType: TS, correctedAt: NOW }, sourceRef: { accessPoint: 'Accès Principal', number: 99 } });
        const r = carryOverEcaFieldTraces(lieuOf(previous, m).modules, lieuOf(fresh, m).modules);
        expect(r.carried).toBe(0);
        expect(r.unmatched).toHaveLength(1);
        expect((moduleById(fresh, m).data as EcaData).ecas.some(e => e.fieldTypeCorrection)).toBe(false);
    });
});

// -----------------------------------------------------------------
// Store + Dexie : persistance, rechargement, réinitialisations, alignement
// -----------------------------------------------------------------
const resetState = () => useAuditStore.setState({
    lieux: [], isLoading: true, initError: null,
    selectedLieuId: null, selectedModuleId: null, selectedStationId: null, selectedDirectionId: null,
    selectedDatId: null, selectedPrZoneId: null, selectedEquipmentId: null, selectedEcaId: null,
});

const reload = async () => {
    resetState();
    await useAuditStore.getState().init();
    return useAuditStore.getState().lieux;
};

/** Seed + correction terrain ARG n°2 (sortie → entrée) avec un audit en cours. */
const seedWithCorrection = async () => {
    const lieux = await reload();
    const m = mod('ARG');
    const lieu = lieuOf(lieux, m);
    const arg2 = ecaAt(lieux, m, 2);
    useAuditStore.setState({ selectedLieuId: lieu.id, selectedModuleId: m });
    await useAuditStore.getState().handleUpdateEca({ id: arg2.id, type: TE, fieldVerifiedAt: NOW });
    return { m, lieuId: lieu.id };
};

const expectCorrectionKeptAndAuditReset = (lieux: Lieu[], m: string) => {
    const arg2 = ecaAt(lieux, m, 2);
    expect(arg2.type).toBe(TE);
    expect(arg2.fieldTypeCorrection?.initialType).toBe(TS);
    expect(arg2.fieldVerifiedAt).toBe(NOW);
    expect(Object.values(arg2.adhesives).every(s => s === AdhesiveStatus.NotChecked)).toBe(true);
    expect(arg2.archivedAdhesives).toBeUndefined();
};

beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await db.lieux.clear();
    await db.history.clear();
    await db.events.clear();
    resetState();
});

describe('store — persistance des corrections terrain', () => {
    it('correction persistée dans Dexie, relue après rechargement, journalisée', async () => {
        const { m } = await seedWithCorrection();
        const stored = await db.lieux.toArray();
        expect(ecaAt(stored, m, 2).fieldTypeCorrection?.initialType).toBe(TS);
        const lieux = await reload();
        const arg2 = ecaAt(lieux, m, 2);
        expect(arg2.type).toBe(TE);
        expect(arg2.fieldVerifiedAt).toBe(NOW);
        // L'alignement au démarrage ne touche jamais une autre station.
        expect(arg2.fieldTypeCorrection).toEqual({ initialType: TS, correctedAt: expect.any(String) });
        const events = await db.events.toArray();
        expect(events.filter(e => e.type === 'AUDIT_ITEM_UPDATED')).toHaveLength(1);
    }, 30000);

    it.each([
        ['type d\'audit ECA', () => useAuditStore.getState().handleResetByModuleType(AuditModuleType.ECA)],
        ['catégorie Métro A', () => useAuditStore.getState().handleResetCategory('METRO_A' as any)],
        ['réseau complet', () => useAuditStore.getState().handleResetAll()],
    ])('réinitialisation (%s) : correction conservée, avancement remis à zéro, puis rechargement', async (_label, reset) => {
        const { m } = await seedWithCorrection();
        // Avancement saisi après la correction.
        const before = useAuditStore.getState().lieux;
        useAuditStore.setState({ selectedEcaId: ecaAt(before, m, 2).id });
        await useAuditStore.getState().handleEcaAdhesiveStatusChange('eca-2', AdhesiveStatus.OK);
        expect(ecaAt(useAuditStore.getState().lieux, m, 2).adhesives['eca-2']).toBe(AdhesiveStatus.OK);

        await reset();
        expectCorrectionKeptAndAuditReset(useAuditStore.getState().lieux, m);
        expectCorrectionKeptAndAuditReset(await db.lieux.toArray(), m);
        expectCorrectionKeptAndAuditReset(await reload(), m);
        const events = await db.events.toArray();
        expect(events.some(e => e.entityId?.startsWith('eca-field-carry-over:') && e.metadata?.carried === 1)).toBe(true);
    }, 60000);

    it('réinitialisation complète : la sauvegarde contient la correction et l\'avancement, restauration fidèle', async () => {
        const { m } = await seedWithCorrection();
        const before = useAuditStore.getState().lieux;
        useAuditStore.setState({ selectedEcaId: ecaAt(before, m, 2).id });
        await useAuditStore.getState().handleEcaAdhesiveStatusChange('eca-2', AdhesiveStatus.ToBeReplaced);

        await useAuditStore.getState().handleResetAll();
        const backupKey = localStorage.getItem('tisseo-audit-last-backup-key')!;
        const payload = parseImportPayload(localStorage.getItem(backupKey)!);
        const backedUp = ecaAt(payload.lieux, m, 2);
        expect(backedUp.fieldTypeCorrection?.initialType).toBe(TS);
        expect(backedUp.adhesives['eca-2']).toBe(AdhesiveStatus.ToBeReplaced);

        await applyImportPayload(payload);
        const restored = ecaAt(await reload(), m, 2);
        expect(restored.type).toBe(TE);
        expect(restored.fieldTypeCorrection?.initialType).toBe(TS);
        expect(restored.adhesives['eca-2']).toBe(AdhesiveStatus.ToBeReplaced);
    }, 60000);
});

describe('store — alignement prudent des valideurs confirmés au démarrage', () => {
    /** Base « ancienne source » : les 8 valideurs confirmés reprennent leur ancien type. */
    const seedOldSource = async (customize: (lieux: Lieu[]) => void = () => {}) => {
        const lieux = await generateInitialLieuxDataAsync();
        for (const c of CONFIRMED_ECA_SOURCE_CORRECTIONS) {
            const eca = ecaAt(lieux, c.moduleId, c.number, c.accessPoint);
            eca.type = c.previousType;
            eca.name = c.previousName;
            eca.adhesives = Object.fromEntries(getEcaAdhesiveOccurrences(c.previousType).map(o => [o.statusKey, AdhesiveStatus.NotChecked]));
        }
        customize(lieux);
        await db.lieux.bulkPut(lieux);
        return lieux;
    };

    it('aligne les non audités, signale les autres, sauvegarde d\'abord, idempotent', async () => {
        await seedOldSource(lieux => {
            ecaAt(lieux, mod('PHA'), 3).adhesives['eca-11'] = AdhesiveStatus.OK;          // audité
            ecaAt(lieux, mod('PHA'), 4).comment = 'observation';                          // observation saisie
            const ran4 = ecaAt(lieux, mod('RAN'), 4);                                     // corrigé terrain
            Object.assign(ran4, { fieldTypeCorrection: { initialType: TE, correctedAt: NOW } });
            ecaAt(lieux, mod('UPS'), 7).type = VE;                                        // type inattendu
            ecaAt(lieux, mod('ARG'), 2).type = TE;                                        // autre station
        });

        const lieux = await reload();
        expect(ecaAt(lieux, mod('EMP'), 5)).toMatchObject({ type: TS, name: 'Valideur 5 (Sortie)' });
        expect(ecaAt(lieux, mod('RAN'), 5)).toMatchObject({ type: TE, name: 'Valideur 5' });
        for (const n of [5, 6]) expect(ecaAt(lieux, mod('PHA'), n).type).toBe(TE);
        // Jamais touchés :
        expect(ecaAt(lieux, mod('PHA'), 3)).toMatchObject({ type: TS });
        expect(ecaAt(lieux, mod('PHA'), 3).adhesives['eca-11']).toBe(AdhesiveStatus.OK);
        expect(ecaAt(lieux, mod('PHA'), 4)).toMatchObject({ type: TS, comment: 'observation' });
        expect(ecaAt(lieux, mod('RAN'), 4)).toMatchObject({ type: TS, fieldTypeCorrection: { initialType: TE } });
        expect(ecaAt(lieux, mod('UPS'), 7).type).toBe(VE);
        expect(ecaAt(lieux, mod('ARG'), 2).type).toBe(TE);

        // Sauvegarde préalable : contient l'état d'avant alignement.
        const backup = parseImportPayload(localStorage.getItem(localStorage.getItem('tisseo-audit-last-backup-key')!)!);
        expect(ecaAt(backup.lieux, mod('EMP'), 5).type).toBe(TE);

        const summarize = async () => {
            const events = await db.events.toArray();
            return {
                aligned: events.filter(e => e.entityId?.startsWith('eca-source-alignment:')).length,
                conflicts: events.filter(e => e.entityId?.startsWith('eca-source-conflict:')).length,
            };
        };
        expect(await summarize()).toEqual({ aligned: 4, conflicts: 4 });

        // Persisté, et un second démarrage ne refait rien.
        expect(ecaAt(await db.lieux.toArray(), mod('EMP'), 5).type).toBe(TS);
        const backupKey = localStorage.getItem('tisseo-audit-last-backup-key');
        await reload();
        expect(await summarize()).toEqual({ aligned: 4, conflicts: 4 });
        expect(localStorage.getItem('tisseo-audit-last-backup-key')).toBe(backupKey);
    }, 60000);

    it('sauvegarde impossible : aucun alignement', async () => {
        await seedOldSource();
        vi.spyOn(db.signageReferences, 'toArray').mockRejectedValueOnce(new Error('lecture impossible'));
        const lieux = await reload();
        expect(useAuditStore.getState().initError).toBeNull();
        expect(ecaAt(lieux, mod('EMP'), 5).type).toBe(TE);
        expect(ecaAt(await db.lieux.toArray(), mod('EMP'), 5).type).toBe(TE);
        expect((await db.events.toArray()).some(e => e.entityId?.startsWith('eca-source-alignment:'))).toBe(false);
    }, 60000);
});
