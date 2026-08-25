// tests/storeInit.test.ts
// =================================================================
// Vérifie store.ts::init() — chargement initial (Lot 2.2) :
//   - base vide → génération + persistance des données initiales ;
//   - base existante → chargement direct ;
//   - échec de lecture/écriture → erreur EXPOSÉE (initError), plus
//     jamais une exception non gérée invisible pour l'utilisateur
//     (avant le correctif Lot 2, l'appelant — App.tsx — ne capturait
//     jamais le rejet de cette promesse : l'utilisateur atterrissait
//     silencieusement sur un tableau de bord vide).
// =================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';

beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await db.lieux.clear();
    useAuditStore.setState({
        lieux: [], isLoading: true, isAuthenticated: false, initError: null,
        selectedLieuId: null, selectedModuleId: null, selectedStationId: null,
        selectedDirectionId: null, selectedDatId: null, selectedPrZoneId: null,
        selectedEquipmentId: null, selectedEcaId: null,
    });
});

describe('init() — base vide', () => {
    it('génère et persiste les données initiales du réseau', async () => {
        await useAuditStore.getState().init();

        const state = useAuditStore.getState();
        expect(state.isLoading).toBe(false);
        expect(state.initError).toBeNull();
        expect(state.lieux.length).toBeGreaterThan(0);
        expect(await db.lieux.count()).toBe(state.lieux.length);
    }, 15000);
});

describe('init() — base existante', () => {
    it('charge les lieux déjà persistés sans les régénérer', async () => {
        await useAuditStore.getState().init(); // premier appel : seed la base
        const seededCount = await db.lieux.count();

        // Second démarrage « à froid » (nouvel état mémoire, base déjà peuplée).
        useAuditStore.setState({ lieux: [], isLoading: true, initError: null });
        await useAuditStore.getState().init();

        expect(useAuditStore.getState().lieux).toHaveLength(seededCount);
        expect(await db.lieux.count()).toBe(seededCount); // pas de doublon
    }, 15000);
});

describe('init() — échec de chargement', () => {
    it('expose une erreur claire (initError) au lieu de la laisser invisible', async () => {
        vi.spyOn(db.lieux, 'count').mockRejectedValueOnce(new Error('IndexedDB indisponible'));

        // init() ne relance plus (cf. correctif Lot 2) : la promesse résout,
        // l'erreur est portée par l'état, pas par une exception non gérée.
        await expect(useAuditStore.getState().init()).resolves.toBeUndefined();

        const state = useAuditStore.getState();
        expect(state.isLoading).toBe(false);
        expect(state.initError).toBeTruthy();
        expect(state.initError).toMatch(/impossible/i);
        // Le dashboard ne doit pas être confondu avec un « réseau vide » : on
        // ne veut surtout pas que lieux soit resté [] silencieusement — c'est
        // justement le cas qu'initError distingue explicitement.
        expect(state.lieux).toEqual([]);
    });
});
