// hooks/useAuditDefinitions.ts
// Lecture (seule) des définitions d'audits configurables (Partie 2) pour
// le cockpit. Miroir exact de hooks/useSignageReferences.ts — re-lecture à
// chaque montage : après un import/restauration (qui remplace la table),
// la vue qui se ré-affiche repart des données fraîches.
import { useEffect, useState, useCallback } from 'react';
import { AuditDefinition } from '../types';
import { db } from '../db';

export const useAuditDefinitions = () => {
    const [definitions, setDefinitions] = useState<AuditDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const reload = useCallback(() => {
        setIsLoading(true);
        db.auditDefinitions.toArray()
            .then(setDefinitions)
            .catch(err => {
                console.error('Échec de lecture des audits configurables :', err);
                setDefinitions([]);
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { definitions, isLoading, reload };
};
