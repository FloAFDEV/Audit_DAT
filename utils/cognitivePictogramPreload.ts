// utils/cognitivePictogramPreload.ts
// =================================================================
// PICTOGRAMMES COGNITIFS HORS CONNEXION (sans service worker).
// Au démarrage en ligne, les visuels locaux connus sont lus une fois et
// conservés en mémoire (URL d'objet) pour toute la durée de la session :
// une carte ou un en-tête affiché plus tard, réseau coupé, trouve son
// visuel sans requête. Limite : la mémoire disparaît au rechargement de
// la page ou à la fermeture de l'onglet (l'application elle-même n'est
// alors plus disponible hors connexion sans service worker).
// Affichage uniquement : l'URL publique (/pictos-cognitifs/<CODE>.png)
// reste celle des exports.
// =================================================================
import { ALL_COGNITIVE_PICTOGRAM_VISUAL_URLS } from '../data/cognitivePictogramVisuals';

const objectUrls = new Map<string, string>();
let inFlight: Promise<number> | null = null;

/** URL à afficher. Page servie par le service worker : l'URL publique,
 *  précachée (disponible hors connexion) et chargée comme tous les autres
 *  visuels — l'adresse temporaire en mémoire (blob:) n'est plus utile et
 *  reste le seul cas d'image propre au pictogramme. Sans service worker :
 *  copie en mémoire si disponible. */
export const displayPictogramUrl = (url: string): string => {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) return url;
    return objectUrls.get(url) ?? url;
};

export interface PreloadDeps {
    fetch: (url: string) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>;
    createObjectURL: (blob: Blob) => string;
}
const defaultDeps = (): PreloadDeps => ({
    fetch: url => fetch(url),
    createObjectURL: blob => URL.createObjectURL(blob),
});

/** Lit les visuels manquants (un échec n'interrompt pas les autres).
 *  Renvoie le nombre de visuels disponibles en mémoire. Appels
 *  concurrents regroupés ; un nouvel appel complète un préchargement
 *  partiel (ex. retour du réseau). */
export const preloadCognitivePictograms = (deps: PreloadDeps = defaultDeps()): Promise<number> => {
    if (inFlight) return inFlight;
    const missing = ALL_COGNITIVE_PICTOGRAM_VISUAL_URLS.filter(url => !objectUrls.has(url));
    inFlight = Promise.all(missing.map(async url => {
        try {
            const response = await deps.fetch(url);
            if (!response.ok) return;
            objectUrls.set(url, deps.createObjectURL(await response.blob()));
        } catch { /* hors connexion ou erreur : nouvel essai au retour du réseau */ }
    })).then(() => objectUrls.size).finally(() => { inFlight = null; });
    return inFlight;
};

/** Tests uniquement. */
export const resetCognitivePictogramPreload = (): void => { objectUrls.clear(); inFlight = null; };
