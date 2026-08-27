// tests/eventLog.test.ts
// =================================================================
// Vérifie le journal d'événements (Lot 3, utils/eventLog.ts) branché
// sur les VRAIES opérations métier — jamais une UI affichant des
// événements fictifs. Règle vérifiée systématiquement : un événement
// n'existe QUE si l'opération qu'il décrit a réellement réussi.
// =================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { decideArbitrage } from '../hooks/useArbitrage';
import { logEvent } from '../utils/eventLog';
import { AuditModuleType, AdhesiveStatus, ArbitrageStatus, Lieu, SignageReference, TransportMode } from '../types';

const datLieu = (): Lieu => ({
    id: 'lieu-evt-dat', name: 'Lieu Evt DAT',
    modules: [{
        id: 'module-evt-dat', type: AuditModuleType.DAT, name: 'DAT', line: 'A',
        data: {
            id: 'mode-evt', name: 'Lieu Evt DAT', type: TransportMode.METRO, line: 'A',
            stations: [{
                id: 'station-evt', name: 'Station Evt', directions: [{
                    id: 'direction-evt', name: 'Direction Evt', dats: [
                        { id: 'dat-evt', name: 'DAT 01', adhesives: { a1: AdhesiveStatus.NotChecked }, comment: '' },
                    ],
                }],
            }],
        },
    }],
});

beforeEach(async () => {
    vi.restoreAllMocks();
    await db.lieux.clear();
    await db.events.clear();
    await db.history.clear();
});

describe('logEvent — brique de base', () => {
    it('écrit un événement horodaté, lisible immédiatement après (persistance réelle)', async () => {
        await logEvent({ type: 'IMPORT', summary: "Test d'écriture" });

        const all = await db.events.toArray();
        expect(all).toHaveLength(1);
        expect(all[0].type).toBe('IMPORT');
        expect(all[0].summary).toBe("Test d'écriture");
        expect(all[0].date).toBeTruthy();
        expect(new Date(all[0].date).toString()).not.toBe('Invalid Date');
    });

    it('un échec d\'écriture du journal ne lève jamais (best-effort, non bloquant)', async () => {
        vi.spyOn(db.events, 'add').mockRejectedValueOnce(new Error('boom'));
        await expect(logEvent({ type: 'IMPORT', summary: 'x' })).resolves.toBeUndefined();
    });
});

describe('Intégration _updateLieu — PERSISTENCE_ERROR', () => {
    it('une modification réussie ne journalise RIEN (pas de bruit à chaque champ modifié)', async () => {
        const lieu = datLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({
            lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-evt-dat',
            selectedStationId: 'station-evt', selectedDirectionId: 'direction-evt', selectedDatId: 'dat-evt',
        });

        await useAuditStore.getState().handleDatStatusChange('a1', AdhesiveStatus.OK);

        expect(await db.events.count()).toBe(0);
    });

    it('un échec de persistance journalise un PERSISTENCE_ERROR associé au bon lieu', async () => {
        const lieu = datLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({
            lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-evt-dat',
            selectedStationId: 'station-evt', selectedDirectionId: 'direction-evt', selectedDatId: 'dat-evt',
        });
        vi.spyOn(db.lieux, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'));

        await expect(useAuditStore.getState().handleDatStatusChange('a1', AdhesiveStatus.OK)).rejects.toThrow();

        const events = await db.events.toArray();
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('PERSISTENCE_ERROR');
        expect(events[0].entityId).toBe('lieu-evt-dat');
        expect(events[0].entityLabel).toBe('Lieu Evt DAT');
    });
});

describe('Intégration handleImportJsonData — IMPORT', () => {
    it('un import réussi journalise IMPORT avec le nombre de lieux', async () => {
        const payload = JSON.stringify({ exportDate: new Date().toISOString(), data: [{ id: 'l1', name: 'L1', modules: [] }, { id: 'l2', name: 'L2', modules: [] }] });

        await useAuditStore.getState().handleImportJsonData(payload);

        const events = await db.events.toArray();
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('IMPORT');
        expect(events[0].metadata?.lieux).toBe(2);
    });

    it('un fichier invalide ne journalise rien (l\'opération n\'a jamais réussi)', async () => {
        await expect(useAuditStore.getState().handleImportJsonData('pas du json')).rejects.toThrow();
        expect(await db.events.count()).toBe(0);
    });

    const staleRef: SignageReference = {
        id: 'stale-ref', name: 'Référence obsolète', auditType: 'DAT', scope: { auditType: 'DAT' },
        version: 1, support: 'adhesif', placement: {},
    };
    const currentRef: SignageReference = {
        id: 'current-ref', name: 'Référence à jour', auditType: 'DAT', scope: { auditType: 'DAT' },
        version: 1, support: 'adhesif', placement: {},
    };

    it('un import v2 (avec signageReferences) synchronise immédiatement store.signageReferences — sans reload complet', async () => {
        useAuditStore.setState({ signageReferences: [staleRef] });
        const payload = JSON.stringify({
            exportDate: new Date().toISOString(),
            formatVersion: 2,
            data: [{ id: 'l1', name: 'L1', modules: [] }],
            signageReferences: [currentRef],
            signageAssets: [],
        });

        await useAuditStore.getState().handleImportJsonData(payload);

        expect(useAuditStore.getState().signageReferences).toEqual([currentRef]);
        expect(await db.signageReferences.toArray()).toEqual([currentRef]);
    });

    it("un import v1 (sans signageReferences) ne touche jamais store.signageReferences — le référentiel administré survit à un vieux backup", async () => {
        useAuditStore.setState({ signageReferences: [staleRef] });
        const payload = JSON.stringify({
            exportDate: new Date().toISOString(),
            data: [{ id: 'l1', name: 'L1', modules: [] }],
        });

        await useAuditStore.getState().handleImportJsonData(payload);

        expect(useAuditStore.getState().signageReferences).toEqual([staleRef]);
    });
});

describe('Intégration resets — RESET_* uniquement sur succès réel', () => {
    it('handleResetAll réussi journalise RESET_GLOBAL', async () => {
        const lieu = datLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu] });

        await useAuditStore.getState().handleResetAll();

        const events = await db.events.toArray();
        expect(events.filter(e => e.type === 'RESET_GLOBAL')).toHaveLength(1);
    }, 15000);

    it('handleResetAll en échec (bulkPut) ne journalise rien', async () => {
        const lieu = datLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu] });
        vi.spyOn(db.lieux, 'bulkPut').mockRejectedValueOnce(new Error('boom'));

        await expect(useAuditStore.getState().handleResetAll()).rejects.toThrow();

        expect(await db.events.count()).toBe(0);
    }, 15000);
});

describe('Intégration ajout/suppression d\'éléments d\'audit — AUDIT_ITEM_*', () => {
    it('ajouter un DAT journalise AUDIT_ITEM_ADDED, correctement associé', async () => {
        const lieu = datLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({
            lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-evt-dat',
            selectedStationId: 'station-evt', selectedDirectionId: 'direction-evt',
        });

        await useAuditStore.getState().handleAddDat();

        const events = await db.events.toArray();
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('AUDIT_ITEM_ADDED');
        expect(events[0].entityType).toBe('dat');
        expect(events[0].entityLabel).toContain('DAT');
    });

    it('supprimer un DAT existant journalise AUDIT_ITEM_REMOVED avec son nom d\'origine', async () => {
        const lieu = datLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({
            lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-evt-dat',
            selectedStationId: 'station-evt', selectedDirectionId: 'direction-evt',
        });

        await useAuditStore.getState().handleRemoveDat('dat-evt');

        const events = await db.events.toArray();
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('AUDIT_ITEM_REMOVED');
        expect(events[0].entityId).toBe('dat-evt');
        expect(events[0].entityLabel).toBe('DAT 01');
    });

    it('supprimer un id inexistant ne journalise rien (rien n\'a réellement été supprimé)', async () => {
        const lieu = datLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({
            lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-evt-dat',
            selectedStationId: 'station-evt', selectedDirectionId: 'direction-evt',
        });

        await useAuditStore.getState().handleRemoveDat('dat-inexistant');

        expect(await db.events.count()).toBe(0);
    });
});

describe('Intégration useArbitrage — REFERENCE_ARBITRAGE', () => {
    it('une décision d\'arbitrage journalise l\'événement, associé à la référence', async () => {
        const reference: SignageReference = {
            id: 'ref-evt-1', name: 'Adhésif Test', auditType: 'DAT', scope: { auditType: 'DAT' },
            version: 1, support: 'adhesif', placement: {},
        };
        await db.signageReferences.put(reference);

        await decideArbitrage(reference, 'remove' as ArbitrageStatus, 'Obsolète');

        const events = await db.events.toArray();
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('REFERENCE_ARBITRAGE');
        expect(events[0].entityId).toBe('ref-evt-1');
        expect(events[0].summary).toContain('Adhésif Test');
    });
});
