// utils/moduleScope.ts
// =================================================================
// PÉRIMÈTRES D'UN MODULE — deux questions distinctes, une seule source.
// -----------------------------------------------------------------
// 1. Exploitation actuelle (isModuleInCurrentScope) : le module compte-t-il
//    dans les calculs de l'exploitation d'aujourd'hui — statistiques,
//    progression, conformité, nomenclature, patrimoine, anomalies, totaux ?
//    Uniquement s'il n'est pas futur, quelle que soit la ligne.
//
// 2. Saisie / préparation (isModuleEditable) : peut-on ouvrir et renseigner
//    le module à l'avance ? Oui s'il est en service ; pour une station
//    future, uniquement sur les lignes C et AEROPORT (« Audit prévisionnel »).
//    Une donnée saisie sur un module futur est une donnée de PRÉPARATION :
//    conservée et modifiable, mais jamais comptée dans l'exploitation.
//
// Le statut futur d'un module vient du registre des stations (via
// data/builder.ts) : aucune liste de stations ici.
// =================================================================
import { AuditModule } from '../types';

/** Lignes dont les stations futures peuvent être préparées avant ouverture. */
const PREPARABLE_FUTURE_LINES: ReadonlySet<string> = new Set(['C', 'AEROPORT']);

/** Exploitation actuelle : tout module en service, aucun module futur. */
export const isModuleInCurrentScope = (module: Pick<AuditModule, 'isFuture'>): boolean =>
    !module.isFuture;

/** Saisie / préparation : en service, ou futur sur une ligne préparable. */
export const isModuleEditable = (module: Pick<AuditModule, 'isFuture' | 'line'>): boolean =>
    isModuleInCurrentScope(module) || PREPARABLE_FUTURE_LINES.has(module.line ?? '');
