// tests/pwaOffline.test.ts
// =================================================================
// PWA — garanties côté application (le service worker lui-même est testé
// dans un vrai navigateur : scripts/pwa-e2e.cjs).
//  - état hors connexion : installation réussie / échouée / mise à jour ;
//  - saisie non enregistrée : bloque une mise à jour ;
//  - sauvegarde avant mise à jour : jamais réussie sans relecture, ne
//    libère l'ancienne qu'après succès ;
//  - montée de version Dexie avec une connexion ouverte : l'ancienne est
//    fermée et signalée, aucune donnée perdue, aucune suppression.
// =================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { db, createAuditDb } from '../db';
import useAuditStore from '../store';
import { getPwaState, setPwaState, trackInstallingWorker, watchDatabaseVersions } from '../utils/pwa/pwaState';
import { unsavedInputReason } from '../utils/pwa/unsavedInput';

const resetState = () => setPwaState({ offline: 'installing', offlineError: undefined, updateAvailable: false, dbClosedByNewerVersion: false, dbUpgradeBlocked: false });

const fakeWorker = (initial: ServiceWorkerState) => {
    let onChange: (() => void) | undefined;
    const worker = {
        state: initial,
        addEventListener: (_: string, fn: () => void) => { onChange = fn; },
    };
    return { worker: worker as unknown as ServiceWorker, set: (s: ServiceWorkerState) => { worker.state = s; onChange?.(); } };
};

describe('état hors connexion', () => {
    beforeEach(resetState);

    it('installation complète (worker activé) : prêt', () => {
        const w = fakeWorker('installing');
        trackInstallingWorker(w.worker);
        expect(getPwaState().offline).toBe('installing');
        w.set('installed'); w.set('activating'); w.set('activated');
        expect(getPwaState().offline).toBe('ready');
    });

    it('ressource non mise en cache (worker redondant sans activation) : signalé, pas prêt', () => {
        const w = fakeWorker('installing');
        trackInstallingWorker(w.worker);
        w.set('redundant');
        expect(getPwaState().offline).toBe('error');
        expect(getPwaState().offlineError).toMatch(/ressources/);
    });

    it('mise à jour échouée alors que la version actuelle est prête : reste prêt', () => {
        setPwaState({ offline: 'ready' });
        const w = fakeWorker('installing');
        trackInstallingWorker(w.worker);
        w.set('redundant');
        expect(getPwaState().offline).toBe('ready');
    });
});

describe('saisie non enregistrée', () => {
    const doc = (opts: { unsaved?: boolean; dialogs?: { inBanner: boolean }[]; active?: { editable: boolean; inBanner?: boolean } }) => ({
        querySelector: (sel: string) => (sel === '[data-unsaved="true"]' && opts.unsaved ? {} : null),
        querySelectorAll: () => (opts.dialogs ?? []).map(d => ({ closest: () => (d.inBanner ? {} : null) })),
        activeElement: opts.active ? { matches: () => opts.active!.editable, closest: () => (opts.active!.inBanner ? {} : null) } : null,
    }) as unknown as Document;

    it('rien en cours : mise à jour possible', () => {
        expect(unsavedInputReason(doc({}))).toBeNull();
        expect(unsavedInputReason(doc({ active: { editable: false } }))).toBeNull();
    });
    it('brouillon marqué, fenêtre ouverte, champ en édition : bloque', () => {
        expect(unsavedInputReason(doc({ unsaved: true }))).toMatch(/ajout/);
        expect(unsavedInputReason(doc({ dialogs: [{ inBanner: false }] }))).toMatch(/fenêtre/);
        expect(unsavedInputReason(doc({ active: { editable: true } }))).toMatch(/champ/);
    });
    it('les bandeaux PWA eux-mêmes ne bloquent pas', () => {
        expect(unsavedInputReason(doc({ dialogs: [{ inBanner: true }], active: { editable: true, inBanner: true } }))).toBeNull();
    });
});

describe('sauvegarde avant mise à jour', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.lieux.put({ id: 'lieu-bk', name: 'Station Sauvegarde', modules: [] });
    });

    it('copie relue ; la précédente sauvegarde de mise à jour n’est libérée qu’après succès', async () => {
        const first = await useAuditStore.getState().backupBeforeUpdate();
        expect(first).not.toBe('');
        expect(JSON.parse(localStorage.getItem(first)!).data.map((l: { id: string }) => l.id)).toEqual(['lieu-bk']);
        await new Promise(r => setTimeout(r, 2));
        const second = await useAuditStore.getState().backupBeforeUpdate();
        expect(second).not.toBe(first);
        expect(localStorage.getItem(first)).toBeNull();
        expect(localStorage.getItem(second)).not.toBeNull();
    });

    it('stockage plein : échec explicite (\'\'), ancienne sauvegarde conservée, données intactes', async () => {
        const kept = await useAuditStore.getState().backupBeforeUpdate();
        const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
        const result = await useAuditStore.getState().backupBeforeUpdate();
        spy.mockRestore();
        expect(result).toBe('');
        expect(localStorage.getItem(kept)).not.toBeNull();
        expect((await db.lieux.get('lieu-bk'))?.name).toBe('Station Sauvegarde');
    });
});

const ALL_TABLES = ['lieux', 'history', 'signageReferences', 'events', 'photos', 'observations'];

describe('montée de version IndexedDB avec une connexion ouverte', () => {
    it('ancienne connexion fermée et signalée ; données conservées ; aucune suppression', async () => {
        resetState();
        const name = `PwaUpgradeTest-${Date.now()}`;
        const current = createAuditDb(name);
        watchDatabaseVersions(current);
        await current.lieux.put({ id: 'lieu-up', name: 'Station Relevée', modules: [] });
        await current.photos.put({ id: 'photo-up', lieuId: 'lieu-up', moduleId: 'm', itemId: 'i', createdAt: '2026-11-03' } as never);
        const verno = current.verno;

        // Version suivante de l'application, telle que db.ts doit la déclarer :
        // TOUTES les versions précédentes dans la même instance (schéma
        // cumulatif) + l'ajout. Jamais de table à null.
        const next = createAuditDb(name);
        next.version(verno + 1).stores({ pwaProbe: 'id' });
        await next.open();

        expect(getPwaState().dbClosedByNewerVersion).toBe(true);
        expect(current.isOpen()).toBe(false);
        expect((await next.table('lieux').get('lieu-up'))?.name).toBe('Station Relevée');
        expect(await next.table('photos').get('photo-up')).toBeDefined();
        expect(Array.from(next.backendDB().objectStoreNames)).toEqual(expect.arrayContaining([...ALL_TABLES, 'pwaProbe']));
        next.close();
        await Dexie.delete(name);
    });

    it('garde-fou : le schéma courant déclare toujours toutes les tables (une version isolée les supprimerait)', async () => {
        // Constat (Dexie) : une version déclarée SANS les précédentes supprime
        // les tables absentes de son schéma. db.ts doit rester cumulatif.
        expect(db.tables.map(t => t.name)).toEqual(expect.arrayContaining(ALL_TABLES));
        const name = `PwaDestructiveProbe-${Date.now()}`;
        const current = createAuditDb(name);
        await current.open();
        const verno = current.verno;
        current.close();
        const isolated = new Dexie(name);
        isolated.version(verno + 1).stores({ lieux: 'id, name' });
        await isolated.open();
        expect(Array.from(isolated.backendDB().objectStoreNames)).toEqual(['lieux']); // ⚠ tables perdues
        isolated.close();
        await Dexie.delete(name);
    });
});
