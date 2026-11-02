// hooks/useSignageReferences.ts
// Référentiel signalétique du cockpit — lu dans le store, UNE seule source
// en mémoire pour toute l'application (formulaires terrain et cockpit).
// Le store charge la table Dexie `signageReferences` au démarrage et la
// remplace à chaque import / restauration : les vues sont donc à jour sans
// relecture propre et partagent le même tableau (index mémoïsé commun, cf.
// usePatrimoineIndex).
// `reload()` relit la table Dexie et publie le résultat dans le store : à
// appeler après toute écriture directe dans la table (ex. arbitrage).
import { useCallback } from 'react';
import useAuditStore from '../store';
import { db } from '../db';

export const useSignageReferences = () => {
    const references = useAuditStore(state => state.signageReferences);
    // Le store est chargé avant l'affichage du cockpit ; isLoading reste vrai
    // tant que l'initialisation (lieux + référentiel) n'est pas terminée.
    const isLoading = useAuditStore(state => state.isLoading);

    const reload = useCallback(() => db.signageReferences.toArray()
        .then(signageReferences => useAuditStore.setState({ signageReferences }))
        .catch(err => console.error('Échec de lecture du référentiel signalétique :', err)), []);

    return { references, isLoading, reload };
};
