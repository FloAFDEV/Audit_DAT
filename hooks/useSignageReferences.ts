// hooks/useSignageReferences.ts
// Lecture (seule) du référentiel signalétique pour le cockpit.
// Re-lecture à chaque montage : après un import/restauration (qui remplace
// la table), la vue qui se ré-affiche repart des données fraîches.
import { useEffect, useState, useCallback } from 'react';
import { SignageReference } from '../types';
import { db } from '../db';

export const useSignageReferences = () => {
    const [references, setReferences] = useState<SignageReference[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const reload = useCallback(() => {
        setIsLoading(true);
        db.signageReferences.toArray()
            .then(setReferences)
            .catch(err => {
                console.error('Échec de lecture du référentiel signalétique :', err);
                setReferences([]);
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { references, isLoading, reload };
};
