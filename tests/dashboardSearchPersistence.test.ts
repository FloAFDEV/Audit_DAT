// tests/dashboardSearchPersistence.test.ts
// =================================================================
// Recherche du tableau de bord (LieuSelector) — vérifie que
// dashboardSearchQuery (store.ts) survit au démontage/remontage du
// composant (provoqué par la navigation vers un lieu puis le retour,
// App.tsx clé son arbre sur selectedLieuId) sans jamais devenir une
// préférence permanente écrite dans localStorage.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import useAuditStore from '../store';
import { NAV_KEYS, NAV_STORAGE_KEY } from '../utils/navigationPersistence';

beforeEach(() => {
    useAuditStore.setState({ dashboardSearchQuery: '', selectedLieuId: null });
    localStorage.clear();
});

describe('setDashboardSearchQuery — mémorisation de la recherche du tableau de bord', () => {
    it('mémorise une recherche', () => {
        useAuditStore.getState().setDashboardSearchQuery('Basso');
        expect(useAuditStore.getState().dashboardSearchQuery).toBe('Basso');
    });

    it('survit à une navigation vers un lieu puis un retour (le champ store n\'est jamais touché par selectLieu)', () => {
        useAuditStore.getState().setDashboardSearchQuery('Basso');
        useAuditStore.setState({ selectedLieuId: 'lieu-basso-cambo' }); // navigation
        expect(useAuditStore.getState().dashboardSearchQuery).toBe('Basso');

        useAuditStore.setState({ selectedLieuId: null }); // retour au tableau de bord
        expect(useAuditStore.getState().dashboardSearchQuery).toBe('Basso');
    });

    it('une recherche volontairement effacée reste vide après une navigation', () => {
        useAuditStore.getState().setDashboardSearchQuery('Basso');
        useAuditStore.getState().setDashboardSearchQuery(''); // l'utilisateur efface le champ
        useAuditStore.setState({ selectedLieuId: 'lieu-basso-cambo' });
        useAuditStore.setState({ selectedLieuId: null });
        expect(useAuditStore.getState().dashboardSearchQuery).toBe('');
    });

    it('plusieurs navigations successives conservent la DERNIÈRE recherche saisie', () => {
        useAuditStore.getState().setDashboardSearchQuery('Basso');
        useAuditStore.setState({ selectedLieuId: 'lieu-1' });
        useAuditStore.setState({ selectedLieuId: null });

        useAuditStore.getState().setDashboardSearchQuery('Jean Jaurès');
        useAuditStore.setState({ selectedLieuId: 'lieu-2' });
        useAuditStore.setState({ selectedLieuId: null });

        expect(useAuditStore.getState().dashboardSearchQuery).toBe('Jean Jaurès');
    });

    it('logout réinitialise la recherche (nouvelle session)', () => {
        useAuditStore.getState().setDashboardSearchQuery('Basso');
        useAuditStore.getState().logout();
        expect(useAuditStore.getState().dashboardSearchQuery).toBe('');
    });
});

describe('Mémoire de session uniquement — jamais persistée dans localStorage', () => {
    it('dashboardSearchQuery n\'est écrit dans aucune entrée localStorage', () => {
        useAuditStore.getState().setDashboardSearchQuery('Basso');

        expect(NAV_KEYS).not.toContain('dashboardSearchQuery');

        const raw = localStorage.getItem(NAV_STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            expect(saved).not.toHaveProperty('dashboardSearchQuery');
        }
        // Vérification directe : aucune clé localStorage ne contient la valeur saisie.
        const allValues = Object.keys(localStorage).map(k => localStorage.getItem(k));
        expect(allValues).not.toContain('Basso');
    });
});
