// data/referenceVisuals.ts
// =================================================================
// Visuel de référence d'un adhésif / pictogramme du catalogue : aide à
// reconnaître sur le terrain l'objet physique attendu. Fichiers statiques
// (public/references/<id>.webp, recadrés depuis les visuels d'impression),
// distribués avec le build — jamais en base : ce sont des données de
// catalogue, identiques pour tous, pas des données d'audit.
// Information affichée uniquement : aucun statut, aucun calcul.
// Référence sans visuel connu : undefined, rien n'est affiché.
// Plans de quartier : un exemplaire représentatif du FORMAT (mise en page,
// header / footer), le contenu variant d'une station à l'autre.
// =================================================================

/** Id catalogue → fichier visuel. Plusieurs références de même face
 *  imprimée partagent un fichier (le 78×120 adhésif et dibond ne diffèrent
 *  du 78×120 plastifié que par le support). */
const REFERENCE_VISUAL_FILES: Readonly<Record<string, string>> = {
    // DAT (métro et tram : mêmes adhésifs)
    'ad1': 'ad1', 'ad2': 'ad2', 'ad3': 'ad3', 'ad4': 'ad4', 'ad5': 'ad5', 'ad6': 'ad6', 'ad7': 'ad7',
    'ad8': 'ad8', 'ad10': 'ad10', 'ad11': 'ad11',
    // ECA
    'eca-1': 'eca-1', 'eca-2': 'eca-2', 'eca-3': 'eca-3',
    // Platines jaunes PMR à bras (eca-4) / à vantaux (eca-5)
    'eca-4': 'eca-4', 'eca-5': 'eca-5',
    'eca-6': 'eca-6', 'eca-7': 'eca-7',
    'eca-8': 'eca-8', 'eca-9': 'eca-9', 'eca-10': 'eca-10',
    // Plans de quartier (exemplaire représentatif du format, pas de la station)
    'pdq-78x100': 'pdq-78x100',
    'pdq-78x120': 'pdq-78x120',
    'pdq-adhesif': 'pdq-78x120',
    'pdq-78x120-dibond': 'pdq-78x120',
    'pem3d-120x80': 'pem3d-120x80',
    // Adhésif PMR au sol 920×370 (un seul modèle, quelle que soit la matière)
    'pmr-sol': 'pmr-sol',
    // Plan de quartier T1 (Équipements Station / audit Tram T1)
    'sign-plan-quartier-tram': 'sign-plan-quartier-tram',
};

/** URL du visuel de référence d'un id catalogue, ou undefined. */
export const getReferenceVisualUrl = (referenceId?: string): string | undefined => {
    const file = referenceId ? REFERENCE_VISUAL_FILES[referenceId] : undefined;
    return file ? `/references/${file}.webp` : undefined;
};
