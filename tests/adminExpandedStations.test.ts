// tests/adminExpandedStations.test.ts
// =================================================================
// Admin > Stations — les panneaux « Modules » dépliés (StationRow)
// doivent survivre à un changement d'onglet Admin ou de section du
// cockpit (StatsPage/AdminView démontent leurs panneaux par condition),
// sans jamais devenir une préférence permanente écrite dans
// localStorage. Cf. adminExpandedStationIds / toggleAdminExpandedStation
// dans store.ts.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import useAuditStore from '../store';
import { NAV_KEYS, NAV_STORAGE_KEY } from '../utils/navigationPersistence';

beforeEach(() => {
    useAuditStore.setState({ adminExpandedStationIds: [] });
    localStorage.clear();
});

describe('toggleAdminExpandedStation — mémorisation des panneaux dépliés', () => {
    it('déplie une station', () => {
        useAuditStore.getState().toggleAdminExpandedStation('lieu-1');
        expect(useAuditStore.getState().adminExpandedStationIds).toContain('lieu-1');
    });

    it('replier une station déjà dépliée la retire de la liste', () => {
        useAuditStore.getState().toggleAdminExpandedStation('lieu-1');
        useAuditStore.getState().toggleAdminExpandedStation('lieu-1');
        expect(useAuditStore.getState().adminExpandedStationIds).not.toContain('lieu-1');
    });

    it('plusieurs stations peuvent être dépliées simultanément', () => {
        useAuditStore.getState().toggleAdminExpandedStation('lieu-1');
        useAuditStore.getState().toggleAdminExpandedStation('lieu-2');
        useAuditStore.getState().toggleAdminExpandedStation('lieu-3');
        expect(useAuditStore.getState().adminExpandedStationIds).toEqual(['lieu-1', 'lieu-2', 'lieu-3']);
    });

    it('replier une seule station parmi plusieurs dépliées laisse les autres ouvertes', () => {
        useAuditStore.getState().toggleAdminExpandedStation('lieu-1');
        useAuditStore.getState().toggleAdminExpandedStation('lieu-2');
        useAuditStore.getState().toggleAdminExpandedStation('lieu-1'); // referme lieu-1
        expect(useAuditStore.getState().adminExpandedStationIds).toEqual(['lieu-2']);
    });

    it('survit à un changement d\'onglet simulé (le champ store n\'est jamais touché par une navigation)', () => {
        useAuditStore.getState().toggleAdminExpandedStation('lieu-1');
        // Changer d'onglet Admin/cockpit ne touche à aucun champ du store —
        // seul le démontage React (hors du champ Zustand) se produit ici.
        expect(useAuditStore.getState().adminExpandedStationIds).toContain('lieu-1');
    });

    it('une station supprimée/absente dans l\'id ne provoque aucune erreur : le champ reste un simple tableau d\'ids', () => {
        expect(() => useAuditStore.getState().toggleAdminExpandedStation('lieu-inexistant')).not.toThrow();
        expect(useAuditStore.getState().adminExpandedStationIds).toContain('lieu-inexistant');
    });

    it('logout réinitialise les panneaux dépliés (nouvelle session)', () => {
        useAuditStore.getState().toggleAdminExpandedStation('lieu-1');
        useAuditStore.getState().logout();
        expect(useAuditStore.getState().adminExpandedStationIds).toEqual([]);
    });
});

describe('Mémoire de session uniquement — jamais persistée dans localStorage', () => {
    it('adminExpandedStationIds n\'est écrit dans aucune entrée localStorage', () => {
        useAuditStore.getState().toggleAdminExpandedStation('lieu-1');

        expect(NAV_KEYS).not.toContain('adminExpandedStationIds');

        const raw = localStorage.getItem(NAV_STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            expect(saved).not.toHaveProperty('adminExpandedStationIds');
        }
    });
});
