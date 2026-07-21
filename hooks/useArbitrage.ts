// hooks/useArbitrage.ts
// Écriture ciblée de la décision d'arbitrage sur une référence.
// Seule mutation de signageReferences de tout le commit — le reste du
// cockpit reste strictement lecture seule (contrat "fiche de vie" en
// lecture jusqu'à l'administration complète).
import { useCallback } from 'react';
import { ArbitrageStatus, SignageReference } from '../types';
import { db } from '../db';
import { withArbitrageDecision } from '../utils/cockpit/arbitrage';

export const useArbitrage = () => {
    const decide = useCallback(async (
        reference: SignageReference,
        status: ArbitrageStatus,
        reason: string | undefined,
    ): Promise<SignageReference> => {
        const updated = withArbitrageDecision(reference, status, reason);
        await db.signageReferences.put(updated);
        return updated;
    }, []);

    return { decide };
};
