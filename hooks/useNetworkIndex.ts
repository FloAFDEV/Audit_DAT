// hooks/useNetworkIndex.ts
// Mémoïsation du moteur d'index réseau (contrat de plateforme, règle 1 :
// une donnée n'est calculée qu'une seule fois — toutes les vues du cockpit
// consomment ce hook, jamais un parcours d'arbre local).
import { useMemo } from 'react';
import { Lieu, SignageReference } from '../types';
import { buildNetworkIndex, NetworkIndex } from '../utils/cockpit/networkIndex';

export const useNetworkIndex = (lieux: Lieu[], references: SignageReference[]): NetworkIndex =>
    useMemo(() => buildNetworkIndex(lieux, references), [lieux, references]);
