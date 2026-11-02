// utils/cockpit/viewScope.ts
// =================================================================
// Périmètre du bouton « Voir les implantations » (Référentiel → Références).
// Règle stable, toujours la même vue (Implantations sélectionnées) :
//  - sélection explicite non vide → exactement la sélection ;
//  - sinon → les lignes affichées par le filtre de consultation
//    (références + éléments sélectionnables ; jamais les équipements
//    station, consultation seule) ;
//  - liste vide → aucun périmètre (bouton désactivé).
// Lecture seule : ouvrir la vue depuis le filtre NE modifie JAMAIS la
// sélection explicite (indépendante du filtre, destinée aux exports).
// =================================================================

export type ViewScopeSource = 'selection' | 'visible';

export interface ViewScope {
    source: ViewScopeSource;
    /** Identifiants des lignes du périmètre (références et éléments). */
    ids: string[];
}

export const resolveViewScope = (
    selectedIds: ReadonlySet<string>, visibleSelectableIds: readonly string[],
): ViewScope | null => {
    if (selectedIds.size > 0) return { source: 'selection', ids: [...selectedIds] };
    if (visibleSelectableIds.length > 0) return { source: 'visible', ids: [...visibleSelectableIds] };
    return null;
};

/** Libellé du bouton : nombre de LIGNES (références ou éléments), jamais un
 *  nombre d'implantations. */
export const viewScopeButtonLabel = (scope: ViewScope | null): string => {
    if (!scope) return 'Voir les implantations';
    const n = scope.ids.length;
    return scope.source === 'selection'
        ? `Voir les implantations · sélection (${n})`
        : `Voir les implantations · liste affichée (${n})`;
};
