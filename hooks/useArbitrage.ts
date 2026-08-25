// hooks/useArbitrage.ts
// Écriture ciblée de la décision d'arbitrage sur une référence.
// Seule mutation de signageReferences de tout le commit — le reste du
// cockpit reste strictement lecture seule (contrat "fiche de vie" en
// lecture jusqu'à l'administration complète).
import { useCallback } from 'react';
import { ArbitrageStatus, SignageReference } from '../types';
import { db } from '../db';
import { withArbitrageDecision } from '../utils/cockpit/arbitrage';
import { logEvent } from '../utils/eventLog';

const ARBITRAGE_LABELS: Record<ArbitrageStatus, string> = {
    keep: 'conservée', remove: 'à retirer', to_document: 'à documenter',
};

/** Logique pure, séparée du hook React (useCallback) uniquement pour rester
 *  testable sans harnais de rendu — ce projet n'a pas de dépendance
 *  jsdom/testing-library, et cette fonction ne dépend d'aucun état React. */
export const decideArbitrage = async (
    reference: SignageReference,
    status: ArbitrageStatus,
    reason: string | undefined,
): Promise<SignageReference> => {
    const updated = withArbitrageDecision(reference, status, reason);
    await db.signageReferences.put(updated);
    await logEvent({
        type: 'REFERENCE_ARBITRAGE', entityType: 'reference', entityId: reference.id, entityLabel: reference.name,
        summary: `Référence « ${reference.name} » marquée ${ARBITRAGE_LABELS[status]}`,
    });
    return updated;
};

export const useArbitrage = () => {
    const decide = useCallback(decideArbitrage, []);
    return { decide };
};
