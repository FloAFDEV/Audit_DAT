import { useCallback } from 'react';
import { Lieu, AuditCategory, AuditModuleType } from '../types';
import { getLieuProgress } from '../utils/progressCalculators';
import { AUDIT_CATEGORIES } from '../data/config';

const STORAGE_KEY = 'tisseo-audit-recent-lieux';
const MAX_RECENT = 5;

/** Lit les IDs récents depuis localStorage (sans erreur silencieuse). */
const readIds = (): string[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

/** Ajoute un lieu visité en tête de liste (dédupliqué, max MAX_RECENT). */
export const trackRecentLieu = (lieuId: string): void => {
    try {
        const ids = readIds().filter(id => id !== lieuId);
        ids.unshift(lieuId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
    } catch { /* ignore */ }
};

/**
 * Retourne les lieux récemment visités qui sont en cours (0 < progress < 100)
 * et qui correspondent au filtre actif.
 * Exclut automatiquement les lieux terminés, vierges, et hors-filtre.
 */
export const useRecentLieux = (
    lieux: Lieu[],
    activeFilter: AuditCategory | 'ALL',
    activeAuditFilters: AuditModuleType[],
): Lieu[] => {
    const ids = readIds();
    if (ids.length === 0) return [];

    const categoryConfig = activeFilter === 'ALL'
        ? null
        : AUDIT_CATEGORIES.find(c => c.key === activeFilter);

    return ids
        .map(id => lieux.find(l => l.id === id))
        .filter((lieu): lieu is Lieu => {
            if (!lieu) return false;
            // Filtre par ligne active
            if (categoryConfig && !lieu.modules.some(m => categoryConfig.predicate(m))) return false;
            // Garder uniquement les lieux en cours (ni vierges ni terminés)
            const progress = getLieuProgress(lieu, activeAuditFilters);
            return progress > 0 && progress < 100;
        })
        .slice(0, 3); // Afficher max 3 cards
};
