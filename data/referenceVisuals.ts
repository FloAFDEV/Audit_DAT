// data/referenceVisuals.ts
// =================================================================
// Visuel de référence d'un adhésif / pictogramme du catalogue : aide à
// reconnaître sur le terrain l'objet physique attendu. Fichiers statiques
// (public/references/<id>.webp, recadrés depuis les visuels d'impression),
// distribués avec le build — jamais en base : ce sont des données de
// catalogue, identiques pour tous, pas des données d'audit.
// Information affichée uniquement : aucun statut, aucun calcul.
// Référence sans visuel connu : undefined, rien n'est affiché.
// eca-4 / eca-5 (platines PMR à bras / à vantaux) : en attente du relevé
// terrain qui attribue chaque visuel à son type.
// =================================================================

const REFERENCE_IDS_WITH_VISUAL: ReadonlySet<string> = new Set([
    'eca-1', 'eca-2', 'eca-3',
    'eca-6', 'eca-7',
    'eca-8', 'eca-9', 'eca-10',
]);

/** URL du visuel de référence d'un id catalogue, ou undefined. */
export const getReferenceVisualUrl = (referenceId?: string): string | undefined =>
    referenceId && REFERENCE_IDS_WITH_VISUAL.has(referenceId)
        ? `/references/${referenceId}.webp`
        : undefined;
