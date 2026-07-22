// hooks/useSignaletiqueStationIndex.ts
// Mémoïsation du moteur d'index Équipements Station (contrat de
// plateforme, règle 1 appliquée à l'intérieur de ce référentiel : une
// donnée n'est calculée qu'une seule fois — toutes les vues du cockpit
// consomment ce hook, jamais un parcours d'arbre local).
import { useMemo } from 'react';
import { Lieu } from '../types';
import { buildSignaletiqueStationIndex, SignaletiqueStationIndex } from '../utils/cockpit/signaletiqueStationIndex';

export const useSignaletiqueStationIndex = (lieux: Lieu[]): SignaletiqueStationIndex =>
    useMemo(() => buildSignaletiqueStationIndex(lieux), [lieux]);
