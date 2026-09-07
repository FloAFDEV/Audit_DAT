// tests/lastCompletedItem.test.ts
// =================================================================
// Repositionnement au retour d'un audit DAT/ECA (DATList/EcaSelector) —
// vérifie le mécanisme de mémoire (lastCompletedDatId/lastCompletedEcaId,
// store.ts) séparément du scroll/de la surbrillance (DOM, vérifiés en
// direct dans le navigateur, pas via ces tests store-only).
//
// Point central : cette mémoire ne doit JAMAIS atteindre localStorage —
// contrairement à selectedDatId/selectedEcaId (cf. NAV_KEYS,
// navigationPersistence.ts), c'est une mémoire de session pure, jamais
// une préférence utilisateur durable.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { NAV_KEYS, NAV_STORAGE_KEY } from '../utils/navigationPersistence';
import { AuditModuleType, EcaData, EcaEquipmentType, Lieu, TransportMode } from '../types';

const ecaLieu = (): Lieu => ({
    id: 'lieu-last-completed-eca', name: 'Lieu Last Completed ECA',
    modules: [{
        id: 'module-last-eca', type: AuditModuleType.ECA, name: 'ECA', line: 'A',
        data: {
            id: 'eca-data-last', stationName: 'Lieu Last Completed ECA', stationCode: 'LLC',
            ecas: [{
                id: 'eca-last-1', name: 'Tripode E01', accessPoint: 'Accès Principal',
                type: EcaEquipmentType.TripodeEntree, number: 1, adhesives: {}, comment: '',
            }],
        } as EcaData,
    }],
});

beforeEach(() => {
    useAuditStore.setState({
        selectedDatId: null, selectedEcaId: null,
        lastCompletedDatId: null, lastCompletedEcaId: null,
    });
    localStorage.clear();
});

describe('selectDat — mémorisation du DAT quitté', () => {
    it('retour (id -> null) mémorise le DAT quitté dans lastCompletedDatId', () => {
        useAuditStore.getState().selectDat('dat-42');
        expect(useAuditStore.getState().lastCompletedDatId).toBeNull(); // pas encore de retour

        useAuditStore.getState().selectDat(null);
        expect(useAuditStore.getState().selectedDatId).toBeNull();
        expect(useAuditStore.getState().lastCompletedDatId).toBe('dat-42');
    });

    it('retour sans rien de sélectionné au préalable → lastCompletedDatId reste null', () => {
        useAuditStore.getState().selectDat(null);
        expect(useAuditStore.getState().lastCompletedDatId).toBeNull();
    });

    it('sélectionner un nouveau DAT (null -> id) ne modifie pas lastCompletedDatId', () => {
        useAuditStore.setState({ lastCompletedDatId: 'dat-precedent' });
        useAuditStore.getState().selectDat('dat-nouveau');
        expect(useAuditStore.getState().lastCompletedDatId).toBe('dat-precedent');
    });

    it('clearLastCompletedDat efface la mémorisation', () => {
        useAuditStore.getState().selectDat('dat-1');
        useAuditStore.getState().selectDat(null);
        expect(useAuditStore.getState().lastCompletedDatId).toBe('dat-1');

        useAuditStore.getState().clearLastCompletedDat();
        expect(useAuditStore.getState().lastCompletedDatId).toBeNull();
    });

    it('deux allers-retours successifs mémorisent bien le DERNIER DAT quitté', () => {
        useAuditStore.getState().selectDat('dat-1');
        useAuditStore.getState().selectDat(null);
        useAuditStore.getState().clearLastCompletedDat(); // DATList consomme après le premier retour

        useAuditStore.getState().selectDat('dat-2');
        useAuditStore.getState().selectDat(null);
        expect(useAuditStore.getState().lastCompletedDatId).toBe('dat-2');
    });
});

describe('selectEca — mémorisation de l\'ECA quitté', () => {
    it('retour (id -> null) mémorise l\'ECA quitté dans lastCompletedEcaId', () => {
        useAuditStore.getState().selectEca('eca-7');
        useAuditStore.getState().selectEca(null);
        expect(useAuditStore.getState().selectedEcaId).toBeNull();
        expect(useAuditStore.getState().lastCompletedEcaId).toBe('eca-7');
    });

    it('retour sans rien de sélectionné au préalable → lastCompletedEcaId reste null', () => {
        useAuditStore.getState().selectEca(null);
        expect(useAuditStore.getState().lastCompletedEcaId).toBeNull();
    });

    it('clearLastCompletedEca efface la mémorisation', () => {
        useAuditStore.getState().selectEca('eca-1');
        useAuditStore.getState().selectEca(null);
        useAuditStore.getState().clearLastCompletedEca();
        expect(useAuditStore.getState().lastCompletedEcaId).toBeNull();
    });
});

describe('handleSetEcaNotApplicable(true) — retour direct à la liste sans passer par le formulaire', () => {
    beforeEach(async () => {
        await db.lieux.clear();
        const lieu = ecaLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({
            lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-last-eca',
            selectedEcaId: 'eca-last-1', lastCompletedEcaId: null,
        });
    });

    it('confirmer « Non applicable » mémorise quand même l\'ECA pour le repositionnement au retour', async () => {
        await useAuditStore.getState().handleSetEcaNotApplicable(true);
        expect(useAuditStore.getState().selectedEcaId).toBeNull();
        expect(useAuditStore.getState().lastCompletedEcaId).toBe('eca-last-1');
    });
});

describe('Mémoire de session uniquement — jamais persistée dans localStorage', () => {
    it('un retour DAT/ECA n\'écrit lastCompletedDatId/lastCompletedEcaId dans aucune entrée localStorage', () => {
        useAuditStore.getState().selectDat('dat-1');
        useAuditStore.getState().selectDat(null);
        useAuditStore.getState().selectEca('eca-1');
        useAuditStore.getState().selectEca(null);

        // NAV_KEYS (ce que la reprise de navigation persiste réellement) ne
        // contient pas ces deux champs — la preuve structurelle qu'ils ne
        // peuvent pas fuiter par ce canal.
        expect(NAV_KEYS).not.toContain('lastCompletedDatId');
        expect(NAV_KEYS).not.toContain('lastCompletedEcaId');

        // Et la preuve d'exécution : l'entrée réellement écrite ne les contient pas.
        const raw = localStorage.getItem(NAV_STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            expect(saved).not.toHaveProperty('lastCompletedDatId');
            expect(saved).not.toHaveProperty('lastCompletedEcaId');
        }
    });
});
