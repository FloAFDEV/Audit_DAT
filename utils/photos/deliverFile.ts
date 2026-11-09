// utils/photos/deliverFile.ts
// =================================================================
// Remise d'un fichier à l'utilisateur, sans serveur : feuille de partage
// du système (Web Share API niveau 2, fichiers) quand le navigateur sait
// partager CE fichier, sinon téléchargement.
//
// Une PWA ne peut pas écrire seule dans Photos / la Galerie : c'est
// l'utilisateur qui choisit la destination dans la feuille de partage
// (« Enregistrer l'image », Fichiers, Drive…). Un partage terminé dit
// seulement qu'une application a reçu le fichier — jamais qu'il est
// « enregistré dans la galerie ». Les messages ci-dessous ne disent que
// ce qui est réellement su.
//
// Sur iOS, navigator.share doit être appelé pendant le geste de
// l'utilisateur : le fichier est donc préparé AVANT le clic.
// =================================================================

export type DeliveryOutcome = 'shared' | 'cancelled' | 'download-started';

export interface DeliveryEnv {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string }) => Promise<void>;
    download: (file: File) => void;
}

/** Téléchargement via un lien temporaire. L'URL est libérée plus tard :
 *  Safari iOS lit le fichier après le clic. */
export const downloadViaLink = (file: File): void => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const browserDeliveryEnv = (): DeliveryEnv => {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    return {
        canShare: nav?.canShare ? (data) => nav.canShare!(data) : undefined,
        share: nav?.share ? (data) => nav.share!(data) : undefined,
        download: downloadViaLink,
    };
};

/** Partage si possible ; annulation reconnue ; tout autre échec du partage
 *  (activation perdue, cible indisponible…) → téléchargement de repli. */
export const deliverFile = async (file: File, title: string, env: DeliveryEnv = browserDeliveryEnv()): Promise<DeliveryOutcome> => {
    let shareable = false;
    try { shareable = !!env.share && !!env.canShare?.({ files: [file] }); } catch { shareable = false; }
    if (shareable) {
        try {
            await env.share!({ files: [file], title });
            return 'shared';
        } catch (error) {
            if ((error as { name?: string })?.name === 'AbortError') return 'cancelled';
        }
    }
    env.download(file);
    return 'download-started';
};

/** Messages exacts (aucun succès « dans la galerie » qui ne serait pas su). */
export const deliveryMessage = (outcome: DeliveryOutcome, what: 'photo' | 'zip'): string => {
    switch (outcome) {
        case 'shared':
            return what === 'photo'
                ? "Original transmis à l'application choisie. Il n'est dans Photos que si vous avez choisi « Enregistrer l'image »."
                : "Archive transmise à l'application choisie. Vérifiez qu'elle apparaît bien à l'emplacement choisi (ex. Fichiers).";
        case 'cancelled':
            return 'Partage annulé — rien n’a été enregistré.';
        case 'download-started':
            return what === 'photo'
                ? 'Le téléchargement a été lancé. Selon l’appareil, le fichier arrive dans Fichiers (iPhone) ou Téléchargements (Android), pas directement dans Photos.'
                : 'Le téléchargement a été lancé. Vérifiez sa présence dans Fichiers (iPhone) ou Téléchargements (Android).';
    }
};
