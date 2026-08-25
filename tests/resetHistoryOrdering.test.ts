// tests/resetHistoryOrdering.test.ts
// =================================================================
// Vérifie le correctif Lot 2.1 : un instantané d'archive (db.history)
// ne doit JAMAIS être écrit avant la confirmation que la réinitialisation
// qu'il décrit a réellement été persistée. Avant ce correctif, plusieurs
// handlers de reset écrivaient l'entrée d'historique AVANT la mutation
// réelle des données — un échec d'écriture ultérieur (ex. quota dépassé)
// laissait alors une archive mensongère affirmant qu'un reset avait eu
// lieu, alors que les données n'avaient pas bougé.
// =================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { AuditModuleType, FloorAdhesiveStatus, Lieu, TransportMode } from '../types';

const buildCognitiveLieu = (): Lieu => ({
    id: 'lieu-cogpicto-test',
    name: 'Lieu Test Pictogrammes',
    modules: [{
        id: 'module-cogpicto-test',
        type: AuditModuleType.COGNITIVE_PICTOGRAMS,
        name: 'Pictogrammes Cognitifs',
        line: 'A',
        data: {
            id: 'cogpicto-data', stationName: 'Lieu Test Pictogrammes', stationCode: 'TST',
            pictograms: [{ id: 'picto-1', accessPointName: 'Accès 1', status: FloorAdhesiveStatus.OK }],
            comment: 'commentaire existant',
        } as any,
    }],
});

beforeEach(async () => {
    vi.restoreAllMocks();
    await db.lieux.clear();
    await db.history.clear();
});

describe('handleResetCognitivePictogram — ordre écriture/archive (via _updateLieu)', () => {
    it('succès : la réinitialisation ET son archive sont bien enregistrées', async () => {
        const lieu = buildCognitiveLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-cogpicto-test' });

        await useAuditStore.getState().handleResetCognitivePictogram();

        const stored = await db.lieux.get('lieu-cogpicto-test');
        expect((stored!.modules[0].data as any).pictograms[0].status).toBe(FloorAdhesiveStatus.NotChecked);
        const history = await db.history.toArray();
        expect(history).toHaveLength(1);
        expect(history[0].title).toContain('Pictogrammes');
    });

    it('échec de persistance : AUCUNE archive n\'est créée, et l\'appelant est informé de l\'échec', async () => {
        const lieu = buildCognitiveLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-cogpicto-test' });

        vi.spyOn(db.lieux, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'));

        await expect(useAuditStore.getState().handleResetCognitivePictogram()).rejects.toThrow();

        // Pas de reset réel...
        const stored = await db.lieux.get('lieu-cogpicto-test');
        expect((stored!.modules[0].data as any).pictograms[0].status).toBe(FloorAdhesiveStatus.OK);
        // ...donc pas d'archive mensongère.
        expect(await db.history.count()).toBe(0);
    });
});

describe('handleResetAll — ordre écriture/archive', () => {
    it('échec de persistance (bulkPut) : AUCUNE archive « Historique Complet Réseau » n\'est créée', async () => {
        const lieu = buildCognitiveLieu();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu] });

        vi.spyOn(db.lieux, 'bulkPut').mockRejectedValueOnce(new Error('QuotaExceededError'));

        await expect(useAuditStore.getState().handleResetAll()).rejects.toThrow();

        expect(await db.history.count()).toBe(0);
        // L'état local n'a pas basculé sur des données fraîches puisque l'écriture a échoué.
        expect(useAuditStore.getState().lieux).toHaveLength(1);
        expect(useAuditStore.getState().lieux[0].id).toBe('lieu-cogpicto-test');
    }, 15000);
});
