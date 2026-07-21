// hooks/usePatrimoineIndex.ts
// Mémoïsation du moteur d'index du patrimoine (contrat de plateforme,
// règle 1 : une donnée n'est calculée qu'une seule fois — toutes les vues
// du cockpit consomment ce hook, jamais un parcours d'arbre local).
import { useMemo } from 'react';
import { Lieu, SignageReference } from '../types';
import { buildPatrimoineIndex, PatrimoineIndex } from '../utils/cockpit/patrimoineIndex';

export const usePatrimoineIndex = (lieux: Lieu[], references: SignageReference[]): PatrimoineIndex =>
    useMemo(() => buildPatrimoineIndex(lieux, references), [lieux, references]);
