// utils/cockpit/arbitrage.ts
// =================================================================
// ARBITRAGE — « on décide quoi faire de cet objet posé ».
// -----------------------------------------------------------------
// Séparation stricte avec l'analyse des anomalies (utils/cockpit/maintenanceActions.ts) :
//   Anomalie   = « il y a un problème physique à traiter » (observation).
//   Arbitrage  = « on décide quoi faire de cet élément » (décision).
// Une référence peut avoir 12 implantations non conformes (intervention)
// ET une décision d'arbitrage "keep" (ancienne génération mais compatible) :
// les deux sujets ne se déduisent pas l'un de l'autre.
//
// Fonction pure : ne touche pas Dexie. L'écriture est la responsabilité
// du hook (useArbitrage), pour garder ce module testable sans IndexedDB.
// R1 respecté : « remove » n'efface jamais la référence, seulement la
// décision — l'application effective reste un acte d'administration futur.
// =================================================================

import { ArbitrageState, ArbitrageStatus, SignageReference } from '../../types';

/**
 * Calcule le nouvel état d'arbitrage d'une référence : la décision
 * courante remplacée part dans l'historique (jamais effacée).
 */
export const applyArbitrageDecision = (
    current: ArbitrageState | undefined,
    status: ArbitrageStatus,
    reason: string | undefined,
    now: string,
): ArbitrageState => {
    const history = current
        ? [...(current.history ?? []), { status: current.status, reason: current.reason, date: current.updatedAt ?? current.createdAt ?? now }]
        : [];

    return {
        status,
        reason,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
        history,
    };
};

export const withArbitrageDecision = (
    reference: SignageReference,
    status: ArbitrageStatus,
    reason: string | undefined,
    now: string = new Date().toISOString(),
): SignageReference => ({
    ...reference,
    arbitrage: applyArbitrageDecision(reference.arbitrage, status, reason, now),
});
