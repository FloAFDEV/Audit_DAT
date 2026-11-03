// tests/deleteConfirmation.test.ts
// =================================================================
// Suppressions confirmées : la fenêtre commune (ConfirmDeleteModal)
// n'exécute la suppression qu'au clic « Supprimer », ignore les doubles
// clics pendant l'écriture, conserve l'erreur (jamais d'annonce de
// réussite sur un échec). Cas de référence : ajout manuel puis
// suppression d'un plan de quartier.
// =================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { runGuardedConfirm } from '../components/ConfirmationModal';
import { deleteConfirmationMessage } from '../components/ConfirmDeleteModal';
import { AuditModuleType, AdhesiveStatus, Lieu, PlanQuartierData } from '../types';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';

const ui = () => {
    const state = { busy: false, error: null as string | null, busyHistory: [] as boolean[] };
    return {
        state,
        busyRef: { current: false },
        ui: {
            setBusy: (b: boolean) => { state.busy = b; state.busyHistory.push(b); },
            setError: (e: string | null) => { state.error = e; },
        },
    };
};

describe('deleteConfirmationMessage', () => {
    it('un élément : nommé, caractère définitif annoncé', () => {
        expect(deleteConfirmationMessage(['Plan de quartier — Quai A'], true))
            .toBe('Élément : Plan de quartier — Quai A\n\nCette suppression est définitive.');
    });
    it('plusieurs éléments : nombre exact et liste complète', () => {
        const msg = deleteConfirmationMessage(['A', 'B', 'C'], true);
        expect(msg.startsWith('3 éléments seront supprimés :')).toBe(true);
        expect(msg).toContain('• A\n• B\n• C');
    });
    it('non définitif : jamais annoncé comme définitif, précision conservée', () => {
        const msg = deleteConfirmationMessage(['Photo — X'], false, "L'original reste conservé.");
        expect(msg).not.toContain('définitive');
        expect(msg).toContain("L'original reste conservé.");
    });
});

describe('runGuardedConfirm', () => {
    it('succès synchrone : true, aucune erreur', async () => {
        const h = ui();
        await expect(runGuardedConfirm(() => undefined, h.busyRef, h.ui)).resolves.toBe(true);
        expect(h.state.error).toBeNull();
    });
    it('échec synchrone : false, erreur affichée', async () => {
        const h = ui();
        await expect(runGuardedConfirm(() => { throw new Error('boom'); }, h.busyRef, h.ui)).resolves.toBe(false);
        expect(h.state.error).toBe('boom');
    });
    it('échec asynchrone : false, erreur affichée, verrou relâché', async () => {
        const h = ui();
        await expect(runGuardedConfirm(() => Promise.reject(new Error('disque plein')), h.busyRef, h.ui)).resolves.toBe(false);
        expect(h.state.error).toBe('disque plein');
        expect(h.busyRef.current).toBe(false);
        expect(h.state.busyHistory).toEqual([true, false]);
    });
    it('double clic pendant l’écriture : une seule exécution', async () => {
        const h = ui();
        let resolve!: () => void;
        const onConfirm = vi.fn(() => new Promise<void>(r => { resolve = r; }));
        const first = runGuardedConfirm(onConfirm, h.busyRef, h.ui);
        const second = runGuardedConfirm(onConfirm, h.busyRef, h.ui);
        await expect(second).resolves.toBe(false);
        resolve();
        await expect(first).resolves.toBe(true);
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});

describe('Plan de quartier ajouté manuellement puis supprimé', () => {
    const LIEU_ID = 'lieu-test-del';
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        const lieu: Lieu = {
            id: LIEU_ID, name: 'Station Test',
            modules: [{
                id: 'module-pdq-del', type: AuditModuleType.PLAN_QUARTIER, name: 'Plans de quartier', line: 'A',
                data: { id: 'pdq-data-del', stationName: 'Station Test', stationCode: 'TST', occurrences: [], comment: '' },
            }],
        } as Lieu;
        await db.lieux.put(lieu);
        useAuditStore.setState({ isLoading: false, isAuthenticated: true, initError: null, lieux: [lieu], selectedLieuId: LIEU_ID, selectedModuleId: 'module-pdq-del' });
    });

    const occurrencesInDb = async () => ((await db.lieux.get(LIEU_ID))!.modules[0].data as PlanQuartierData).occurrences;
    const add = () => useAuditStore.getState().handleAddPlanQuartierOccurrence({ adHocLabel: 'Plan ajouté à la main', adHocSupport: 'plastifie', location: 'Entrée nord' });
    const remove = (id: string) => () => useAuditStore.getState().handleRemovePlanQuartierOccurrence(id);

    it('annulée : la donnée est conservée (aucun appel, compteurs inchangés)', async () => {
        const created = await add();
        const refs = buildSignageReferencesSeed();
        const before = buildPatrimoineIndex(useAuditStore.getState().lieux, refs).totals;
        // « Annuler » / Échap / clic hors fenêtre : la fenêtre se ferme sans appeler onConfirm.
        expect((await occurrencesInDb()).map(o => o.id)).toEqual([created.id]);
        expect(buildPatrimoineIndex(useAuditStore.getState().lieux, refs).totals).toEqual(before);
    });

    it('confirmée : supprimée du store et de IndexedDB', async () => {
        const created = await add();
        const h = ui();
        await expect(runGuardedConfirm(remove(created.id), h.busyRef, h.ui)).resolves.toBe(true);
        expect(h.state.error).toBeNull();
        expect(await occurrencesInDb()).toEqual([]);
        expect((useAuditStore.getState().lieux[0].modules[0].data as PlanQuartierData).occurrences).toEqual([]);
    });

    it('refusée (constat déjà saisi) : erreur affichée, donnée conservée', async () => {
        const created = await add();
        await useAuditStore.getState().handlePlanQuartierOccurrenceStatusChange(created.id, AdhesiveStatus.OK);
        const h = ui();
        await expect(runGuardedConfirm(remove(created.id), h.busyRef, h.ui)).resolves.toBe(false);
        expect(h.state.error).toMatch(/Impossible de retirer/);
        expect((await occurrencesInDb()).map(o => o.id)).toEqual([created.id]);
    });

    it('échec d’enregistrement : erreur affichée, donnée conservée', async () => {
        const created = await add();
        const put = vi.spyOn(db.lieux, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'));
        const h = ui();
        await expect(runGuardedConfirm(remove(created.id), h.busyRef, h.ui)).resolves.toBe(false);
        put.mockRestore();
        expect(h.state.error).toBeTruthy();
        expect((await occurrencesInDb()).map(o => o.id)).toEqual([created.id]);
        expect((useAuditStore.getState().lieux[0].modules[0].data as PlanQuartierData).occurrences.map(o => o.id)).toEqual([created.id]);
    });
});
