// tests/navigationPersistence.test.ts
// =================================================================
// Vérifie le correctif Lot 2.4 — reprise de navigation après
// interruption (rechargement, crash, fermeture accidentelle). Avant ce
// correctif, la position de navigation (lieu → module → station →
// direction → DAT, ou zone/équipement P+R, ou ECA) ne vivait qu'en
// mémoire (Zustand) : un simple rechargement de page renvoyait
// systématiquement à l'accueil, même si les données déjà saisies
// étaient (elles) intactes en base.
// =================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveRestoredNavigation, saveNavigationSelection, NAV_STORAGE_KEY } from '../utils/navigationPersistence';
import { db } from '../db';
import useAuditStore from '../store';
import { AuditModuleType, Lieu, TransportMode } from '../types';

const datLieu = (): Lieu => ({
    id: 'lieu-nav-dat', name: 'Lieu Nav DAT',
    modules: [{
        id: 'module-nav-dat', type: AuditModuleType.DAT, name: 'DAT', line: 'A',
        data: {
            id: 'mode-nav', name: 'Lieu Nav DAT', type: TransportMode.METRO, line: 'A',
            stations: [{
                id: 'station-nav', name: 'Station Nav', directions: [{
                    id: 'direction-nav', name: 'Direction Nav', dats: [
                        { id: 'dat-nav', name: 'DAT 01', adhesives: {}, comment: '' },
                    ],
                }],
            }],
        },
    }],
});

const prLieu = (): Lieu => ({
    id: 'lieu-nav-pr', name: 'Lieu Nav PR',
    modules: [{
        id: 'module-nav-pr', type: AuditModuleType.PR, name: 'P+R', line: 'PR' as any,
        data: {
            id: 'pr-nav', name: 'Lieu Nav PR',
            zones: [{ id: 'zone-nav', name: 'Zone Nav', equipments: [{ id: 'equip-nav', name: 'BE1', type: 'BE' as any, adhesives: {}, comment: '' }] }],
        } as any,
    }],
});

describe('resolveRestoredNavigation — résolution stricte contre les données réelles', () => {
    it('rien de sauvegardé → {}', () => {
        expect(resolveRestoredNavigation([datLieu()])).toEqual({});
    });

    it('entrée corrompue (JSON invalide) → {} sans exception', () => {
        localStorage.setItem(NAV_STORAGE_KEY, '{ pas du json valide');
        expect(resolveRestoredNavigation([datLieu()])).toEqual({});
    });

    it('chaîne DAT complète et valide → restaure tous les maillons', () => {
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({
            selectedLieuId: 'lieu-nav-dat', selectedModuleId: 'module-nav-dat',
            selectedStationId: 'station-nav', selectedDirectionId: 'direction-nav', selectedDatId: 'dat-nav',
        }));
        expect(resolveRestoredNavigation([datLieu()])).toEqual({
            selectedLieuId: 'lieu-nav-dat', selectedModuleId: 'module-nav-dat',
            selectedStationId: 'station-nav', selectedDirectionId: 'direction-nav', selectedDatId: 'dat-nav',
        });
    });

    it('chaîne P+R valide → restaure zone et équipement', () => {
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({
            selectedLieuId: 'lieu-nav-pr', selectedModuleId: 'module-nav-pr',
            selectedPrZoneId: 'zone-nav', selectedEquipmentId: 'equip-nav',
        }));
        expect(resolveRestoredNavigation([prLieu()])).toEqual({
            selectedLieuId: 'lieu-nav-pr', selectedModuleId: 'module-nav-pr',
            selectedPrZoneId: 'zone-nav', selectedEquipmentId: 'equip-nav',
        });
    });

    it('lieu orphelin (supprimé par un import entre-temps) → {}', () => {
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({ selectedLieuId: 'lieu-disparu' }));
        expect(resolveRestoredNavigation([datLieu()])).toEqual({});
    });

    it('module orphelin → s\'arrête au lieu, jamais un identifiant fantôme', () => {
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({
            selectedLieuId: 'lieu-nav-dat', selectedModuleId: 'module-disparu',
        }));
        expect(resolveRestoredNavigation([datLieu()])).toEqual({ selectedLieuId: 'lieu-nav-dat' });
    });

    it('direction orpheline (station valide) → s\'arrête à la station', () => {
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({
            selectedLieuId: 'lieu-nav-dat', selectedModuleId: 'module-nav-dat',
            selectedStationId: 'station-nav', selectedDirectionId: 'direction-disparue', selectedDatId: 'dat-nav',
        }));
        expect(resolveRestoredNavigation([datLieu()])).toEqual({
            selectedLieuId: 'lieu-nav-dat', selectedModuleId: 'module-nav-dat', selectedStationId: 'station-nav',
        });
    });
});

describe('saveNavigationSelection', () => {
    it('écrit la sélection quand un lieu est sélectionné', () => {
        saveNavigationSelection({
            selectedLieuId: 'lieu-x', selectedModuleId: null, selectedStationId: null,
            selectedDirectionId: null, selectedDatId: null, selectedPrZoneId: null,
            selectedEquipmentId: null, selectedEcaId: null,
        });
        expect(JSON.parse(localStorage.getItem(NAV_STORAGE_KEY)!).selectedLieuId).toBe('lieu-x');
    });

    it('efface l\'entrée quand aucun lieu n\'est sélectionné (accueil / déconnexion)', () => {
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({ selectedLieuId: 'lieu-x' }));
        saveNavigationSelection({
            selectedLieuId: null, selectedModuleId: null, selectedStationId: null,
            selectedDirectionId: null, selectedDatId: null, selectedPrZoneId: null,
            selectedEquipmentId: null, selectedEcaId: null,
        });
        expect(localStorage.getItem(NAV_STORAGE_KEY)).toBeNull();
    });
});

describe('Intégration store — la navigation est réellement restaurée au démarrage', () => {
    beforeEach(async () => {
        vi.restoreAllMocks();
        localStorage.clear();
        await db.lieux.clear();
        useAuditStore.setState({
            lieux: [], isLoading: true, initError: null,
            selectedLieuId: null, selectedModuleId: null, selectedStationId: null,
            selectedDirectionId: null, selectedDatId: null,
        });
    });

    it('un rechargement (nouvel init()) retombe exactement sur l\'écran quitté', async () => {
        const lieu = datLieu();
        await db.lieux.put(lieu);
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify({
            selectedLieuId: 'lieu-nav-dat', selectedModuleId: 'module-nav-dat',
            selectedStationId: 'station-nav', selectedDirectionId: 'direction-nav', selectedDatId: 'dat-nav',
        }));

        await useAuditStore.getState().init();

        const state = useAuditStore.getState();
        expect(state.selectedLieuId).toBe('lieu-nav-dat');
        expect(state.selectedModuleId).toBe('module-nav-dat');
        expect(state.selectedStationId).toBe('station-nav');
        expect(state.selectedDirectionId).toBe('direction-nav');
        expect(state.selectedDatId).toBe('dat-nav');
    });

    it('naviguer vers l\'accueil efface la reprise (rien à restaurer au prochain démarrage)', async () => {
        const lieu = datLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu] });
        useAuditStore.getState().selectLieu('lieu-nav-dat');
        expect(localStorage.getItem(NAV_STORAGE_KEY)).not.toBeNull();

        useAuditStore.getState().selectLieu(null); // "navigate('home')" passe par là
        expect(localStorage.getItem(NAV_STORAGE_KEY)).toBeNull();
    });
});
