// utils/moduleScope.ts
// =================================================================
// PÉRIMÈTRE D'AUDIT — règle de portée partagée par tous les moteurs de
// calcul dérivé (useStats, patrimoineIndex, signaletiqueStationIndex).
// -----------------------------------------------------------------
// Un module marqué "futur" (isFuture) est exclu du périmètre audité
// aujourd'hui — SAUF pour les lignes C et AEROPORT, auditables par
// anticipation avant leur mise en service. C'est une décision métier,
// pas un détail technique : elle était auparavant recopiée à l'identique
// (et sous des formulations différentes) dans six emplacements distincts
// à travers trois fichiers, avec le risque qu'une évolution du périmètre
// (ex. une nouvelle ligne future rendue auditable) ne soit corrigée que
// dans certains d'entre eux. Centralisée ici une fois pour toutes.
// =================================================================
import { AuditModule } from '../types';

export const isModuleInAuditScope = (module: Pick<AuditModule, 'isFuture' | 'line'>): boolean =>
    !module.isFuture || module.line === 'C' || module.line === 'AEROPORT';
