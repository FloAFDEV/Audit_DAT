// hooks/usePatrimoineIndex.ts
// Mémoïsation du moteur d'index du patrimoine (contrat de plateforme,
// règle 1 : une donnée n'est calculée qu'une seule fois — toutes les vues
// du cockpit consomment ce hook, jamais un parcours d'arbre local).
// L'index est partagé entre les vues : pour un même tableau de lieux et un
// même référentiel (mêmes références, celles du store), il est construit
// une fois et réutilisé au changement de section. Toute modification
// (saisie, import, restauration) produit de nouveaux tableaux dans le
// store, donc un nouvel index — jamais de résultat périmé.
import { useMemo } from 'react';
import { Lieu, SignageReference } from '../types';
import { buildPatrimoineIndex, PatrimoineIndex } from '../utils/cockpit/patrimoineIndex';

const cache = new WeakMap<Lieu[], WeakMap<SignageReference[], PatrimoineIndex>>();

/** Index partagé, clé = identité des tableaux (aucune fuite : WeakMap). */
export const sharedPatrimoineIndex = (lieux: Lieu[], references: SignageReference[]): PatrimoineIndex => {
    let byReferences = cache.get(lieux);
    if (!byReferences) { byReferences = new WeakMap(); cache.set(lieux, byReferences); }
    let index = byReferences.get(references);
    if (!index) { index = buildPatrimoineIndex(lieux, references); byReferences.set(references, index); }
    return index;
};

export const usePatrimoineIndex = (lieux: Lieu[], references: SignageReference[]): PatrimoineIndex =>
    useMemo(() => sharedPatrimoineIndex(lieux, references), [lieux, references]);
