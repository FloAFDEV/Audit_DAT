// utils/pwa/pwaState.ts
// =================================================================
// ÉTAT PWA — service worker, disponibilité hors connexion, mises à jour,
// connexions IndexedDB concurrentes. Aucune logique métier.
//
// Hors connexion : l'installation Workbox est atomique (toute ressource
// du précache doit être téléchargée). Un service worker ACTIF qui contrôle
// la page = toutes les ressources sont sur l'appareil → 'ready'. Une
// installation qui échoue (worker « redundant » sans activation) →
// 'error' : l'app le dit clairement, elle n'est pas prête hors connexion.
//
// Mise à jour : téléchargée en arrière-plan, jamais appliquée seule.
// applyUpdate() n'est appelé qu'après confirmation de l'utilisateur et
// les gardes de components/PwaStatus.tsx (saisie en cours, écritures,
// sauvegarde vérifiée).
//
// IndexedDB : le service worker n'y touche jamais. Ici, seulement la
// gestion des connexions lors d'une montée de version Dexie :
//  - 'versionchange' (un autre onglet ouvre une version plus récente) :
//    Dexie ferme la base de CET onglet (comportement par défaut) → on le
//    signale et on propose de recharger ; aucune écriture silencieuse.
//  - 'blocked' (CET onglet monte de version mais un autre onglet garde
//    l'ancienne ouverte) : on demande de fermer les autres onglets.
// =================================================================
import { useSyncExternalStore } from 'react';

export type OfflineStatus = 'unsupported' | 'installing' | 'ready' | 'error';

export interface PwaState {
    offline: OfflineStatus;
    offlineError?: string;
    updateAvailable: boolean;
    /** Base fermée par une version plus récente ouverte ailleurs. */
    dbClosedByNewerVersion: boolean;
    /** Montée de version de la base en attente d'autres onglets. */
    dbUpgradeBlocked: boolean;
}

let state: PwaState = {
    offline: 'unsupported',
    updateAvailable: false,
    dbClosedByNewerVersion: false,
    dbUpgradeBlocked: false,
};
const listeners = new Set<() => void>();

export const getPwaState = (): PwaState => state;
export const setPwaState = (patch: Partial<PwaState>): void => {
    state = { ...state, ...patch };
    listeners.forEach(l => l());
};
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const usePwaState = (): PwaState => useSyncExternalStore(subscribe, getPwaState, getPwaState);

/** Suit l'installation d'un worker : activé → prêt ; redondant sans
 *  activation → installation échouée (une ressource n'a pas pu être mise
 *  en cache). Une MISE À JOUR échouée laisse l'ancienne version active :
 *  l'app reste prête hors connexion. */
export const trackInstallingWorker = (worker: Pick<ServiceWorker, 'state' | 'addEventListener'> | null | undefined): void => {
    if (!worker) return;
    const onState = () => {
        if (worker.state === 'activated') {
            if (state.offline !== 'ready') setPwaState({ offline: 'ready', offlineError: undefined });
        } else if (worker.state === 'redundant' && state.offline !== 'ready') {
            setPwaState({ offline: 'error', offlineError: "certaines ressources n'ont pas pu être enregistrées sur cet appareil" });
        }
    };
    worker.addEventListener('statechange', onState);
    onState();
};

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;

/** Applique la mise à jour téléchargée (active le nouveau service worker
 *  puis recharge). À n'appeler qu'après confirmation et gardes. */
export const applyUpdate = async (): Promise<void> => {
    if (!updateServiceWorker) return;
    await updateServiceWorker(true);
};

/** Enregistrement du service worker (production uniquement). */
export const initPwa = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || import.meta.env.DEV) return;
    setPwaState({ offline: navigator.serviceWorker.controller ? 'ready' : 'installing' });
    try {
        const { registerSW } = await import('virtual:pwa-register');
        updateServiceWorker = registerSW({
            immediate: true,
            onNeedRefresh: () => setPwaState({ updateAvailable: true }),
            onOfflineReady: () => setPwaState({ offline: 'ready', offlineError: undefined }),
            onRegisteredSW: (_url, registration) => {
                if (!registration) return;
                if (registration.active && navigator.serviceWorker.controller) setPwaState({ offline: 'ready', offlineError: undefined });
                trackInstallingWorker(registration.installing);
                registration.addEventListener('updatefound', () => trackInstallingWorker(registration.installing));
            },
            onRegisterError: (error: unknown) => {
                console.error("Service worker : échec de l'enregistrement", error);
                setPwaState({ offline: 'error', offlineError: "le service worker n'a pas pu être enregistré" });
            },
        });
    } catch (error) {
        console.error('Service worker : initialisation impossible', error);
        setPwaState({ offline: 'error', offlineError: "le service worker n'a pas pu être enregistré" });
    }
};

/** Connexions IndexedDB concurrentes lors d'une montée de version Dexie. */
export const watchDatabaseVersions = (database: { on: (event: 'versionchange' | 'blocked', fn: () => unknown) => unknown }): void => {
    database.on('versionchange', () => {
        setPwaState({ dbClosedByNewerVersion: true });
        // Valeur non retournée : Dexie applique son comportement par défaut
        // (fermeture de la base dans cet onglet) — l'autre onglet peut migrer.
    });
    database.on('blocked', () => setPwaState({ dbUpgradeBlocked: true }));
};
