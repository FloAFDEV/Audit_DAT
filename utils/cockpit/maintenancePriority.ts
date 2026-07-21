// utils/cockpit/maintenancePriority.ts
// =================================================================
// PRIORISATION MAINTENANCE — facteurs transparents, PAS de score opaque.
// -----------------------------------------------------------------
// Règle métier : tant que les pondérations n'ont pas été validées par
// un exploitant (« un défaut station centrale compte 3 fois plus qu'un
// défaut dépôt »), AUCUN score agrégé n'est calculé ni affiché.
// Le modèle expose les FACTEURS, tous normalisés [0..1] et explicables ;
// `score` reste absent par défaut. computePriorityScore existe comme
// brique, prête pour le jour où des poids métier seront actés — il n'est
// appelé nulle part par défaut.
//
// Rien de tout ceci n'est persisté dans Dexie : tout est dérivé de
// l'index du patrimoine à la lecture (règle 1 du contrat de plateforme).
// =================================================================

import { AdhesiveStatus } from '../../types';
import { ImplantationRef, ReferenceUsage } from './patrimoineIndex';

export interface MaintenancePriority {
    /** Gravité du défaut : 1 = tout est « Absent », 0.6 = tout « À remplacer ». */
    severity: number;
    /** Ampleur : nombre de défauts, saturé à OCCURRENCE_SATURATION. */
    occurrence: number;
    /** Visibilité voyageur — neutre (0.5) tant qu'aucune donnée d'exposition
     *  n'existe sur la référence ou la zone. */
    passengerVisibility: number;
    /** Localisation stratégique (hub, terminus...) — neutre (0.5) tant que
     *  les lieux ne portent pas cette donnée. */
    strategicLocation: number;
    /** Ancienneté du dernier contrôle — neutre (0.5) tant que les dates de
     *  constat ne remontent pas dans l'index. */
    age: number;
    /** Score agrégé 0..100 — ABSENT tant que les pondérations métier ne sont
     *  pas validées. Ne jamais l'afficher comme une vérité s'il est absent. */
    score?: number;
}

/** Au-delà de ce nombre de défauts, le facteur « occurrence » sature à 1. */
export const OCCURRENCE_SATURATION = 20;

const NEUTRAL = 0.5;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const severityOf = (absent: number, toReplace: number): number => {
    const total = absent + toReplace;
    return total > 0 ? clamp01((absent * 1 + toReplace * 0.6) / total) : 0;
};

/** Facteurs pour une référence, dérivés de son usage indexé (source unique). */
export const calculatePriorityFactors = (usage: ReferenceUsage): MaintenancePriority => ({
    severity: severityOf(usage.absentCount, usage.toReplaceCount),
    occurrence: clamp01(usage.defectCount / OCCURRENCE_SATURATION),
    passengerVisibility: NEUTRAL,
    strategicLocation: NEUTRAL,
    age: NEUTRAL,
});

/** Facteurs pour un groupe arbitraire d'implantations (site, ligne...). */
export const calculatePriorityFactorsFromItems = (items: ImplantationRef[]): MaintenancePriority => {
    const absent = items.filter(i => i.status === AdhesiveStatus.Absent).length;
    return {
        severity: severityOf(absent, items.length - absent),
        occurrence: clamp01(items.length / OCCURRENCE_SATURATION),
        passengerVisibility: NEUTRAL,
        strategicLocation: NEUTRAL,
        age: NEUTRAL,
    };
};

/**
 * Tri par urgence TRANSPARENT (sans score agrégé) :
 * gravité décroissante, puis ampleur décroissante.
 * C'est l'ordre utilisé par les vues tant que les poids ne sont pas validés.
 */
export const comparePriority = (a: MaintenancePriority, b: MaintenancePriority): number =>
    b.severity - a.severity || b.occurrence - a.occurrence;

// -----------------------------------------------------------------
// Brique en attente de validation métier — NON utilisée par défaut.
// -----------------------------------------------------------------

export type PriorityWeights = Record<Exclude<keyof MaintenancePriority, 'score'>, number>;

/**
 * Combinaison pondérée 0..100. À n'appeler que lorsque des pondérations
 * auront été validées par l'exploitant (réglage administrable futur) —
 * jamais avec des poids inventés.
 */
export const computePriorityScore = (factors: MaintenancePriority, weights: PriorityWeights): number => {
    let weighted = 0;
    let totalWeight = 0;
    (Object.keys(weights) as (keyof PriorityWeights)[]).forEach(key => {
        weighted += clamp01(factors[key]) * weights[key];
        totalWeight += weights[key];
    });
    return totalWeight === 0 ? 0 : Math.round((weighted / totalWeight) * 100);
};
