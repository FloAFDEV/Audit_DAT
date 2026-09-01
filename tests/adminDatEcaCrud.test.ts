// tests/adminDatEcaCrud.test.ts
// =================================================================
// Intégration store.ts — parc de référence DAT/ECA (Lot 3), distinct des
// constats terrain (handleAddDat/handleAddEca). Vérifie le garde-fou
// isAdminUnlocked, la persistance Dexie réelle, origin ('reference' vs
// 'terrain'), et le scénario concret qui a motivé ce lot : une ligne sans
// aucune direction (ex. Ligne C, cf. data/builder.ts::isFuture) → l'Admin
// crée une direction, y ajoute un DAT de référence, la donnée persiste.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { AuditModuleType, ModeData, EcaData, Lieu, EcaEquipmentType, AdhesiveStatus } from '../types';

/** Module DAT sans aucune direction — exactement l'état d'une station
 *  Ligne C dans le seed historique (isFuture, cf. data/builder.ts:145). */
const lieuWithEmptyDatModule = (): Lieu => ({
    id: 'lieu-dat-ref-crud', name: 'Aéroconstellation',
    modules: [{
        id: 'module-dat-c', type: AuditModuleType.DAT, name: 'DAT', line: 'C',
        isFuture: true,
        data: {
            id: 'mode-c', name: 'Aéroconstellation', type: 'METRO' as any, line: 'C',
            stations: [{ id: 'station-c', name: 'Aéroconstellation', directions: [] }],
        } as ModeData,
    }],
});

const lieuWithEcaModule = (): Lieu => ({
    id: 'lieu-eca-ref-crud', name: 'Aéroconstellation',
    modules: [{
        id: 'module-eca-c', type: AuditModuleType.ECA, name: 'ECA (Valideurs)', line: 'C',
        data: { id: 'eca-c', stationName: 'Aéroconstellation', stationCode: 'AER', ecas: [] } as EcaData,
    }],
});

beforeEach(async () => {
    await db.lieux.clear();
    await db.events.clear();
    useAuditStore.setState({ lieux: [], isAdminUnlocked: false });
});

describe('Garde-fou isAdminUnlocked', () => {
    it('addDatDirectionAdmin / addDatAdmin / addEcaAdmin refusent si non déverrouillé', async () => {
        const lieu = lieuWithEmptyDatModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu] });

        await expect(useAuditStore.getState().addDatDirectionAdmin(lieu.id, 'module-dat-c', 'Direction Test')).rejects.toThrow(/Admin refusée/);
        await expect(useAuditStore.getState().addDatAdmin(lieu.id, 'module-dat-c', 'direction-x', 'DAT 01')).rejects.toThrow(/Admin refusée/);
        await expect(useAuditStore.getState().addEcaAdmin('lieu-eca-ref-crud', 'module-eca-c', {
            name: 'Tripode E01', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 1,
        })).rejects.toThrow(/Admin refusée/);
    });
});

describe('Scénario concret : ligne C sans aucune direction → parc de référence DAT', () => {
    it('addDatDirectionAdmin crée une direction persistée, puis addDatAdmin y ajoute un DAT de référence, également persisté', async () => {
        const lieu = lieuWithEmptyDatModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const direction = await useAuditStore.getState().addDatDirectionAdmin(lieu.id, 'module-dat-c', 'Direction Aéroconstellation');
        let stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as ModeData).stations[0].directions).toHaveLength(1);
        expect((stored!.modules[0].data as ModeData).stations[0].directions[0].name).toBe('Direction Aéroconstellation');

        useAuditStore.setState({ lieux: [stored!] });
        const dat = await useAuditStore.getState().addDatAdmin(lieu.id, 'module-dat-c', direction.id, 'DAT 01');

        expect(dat.origin).toBe('reference');
        expect(dat.archivedAt).toBeUndefined();

        stored = await db.lieux.get(lieu.id);
        const storedDats = (stored!.modules[0].data as ModeData).stations[0].directions[0].dats;
        expect(storedDats).toHaveLength(1);
        expect(storedDats[0].id).toBe(dat.id);
        expect(storedDats[0].origin).toBe('reference');
        // Le DAT est immédiatement prêt à auditer, comme un DAT terrain.
        expect(Object.values(storedDats[0].adhesives).every(s => s === AdhesiveStatus.NotChecked)).toBe(true);
    });
});

describe('updateDatAdmin / archiveDatAdmin / restoreDatAdmin', () => {
    const seedWithOneDirectionAndDat = async () => {
        const lieu = lieuWithEmptyDatModule();
        (lieu.modules[0].data as ModeData).stations[0].directions = [{
            id: 'direction-1', name: 'Direction Aéroconstellation',
            dats: [{ id: 'dat-1', name: 'DAT 01', adhesives: {}, comment: '', origin: 'reference' }],
        }];
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });
        return lieu;
    };

    it('renomme un DAT de référence, persisté', async () => {
        await seedWithOneDirectionAndDat();
        await useAuditStore.getState().updateDatAdmin('lieu-dat-ref-crud', 'module-dat-c', 'direction-1', 'dat-1', { name: 'ME01' });

        const stored = await db.lieux.get('lieu-dat-ref-crud');
        expect((stored!.modules[0].data as ModeData).stations[0].directions[0].dats[0].name).toBe('ME01');
    });

    it('archive un DAT de référence (archivedAt posé, jamais supprimé du tableau) puis le restaure', async () => {
        await seedWithOneDirectionAndDat();
        await useAuditStore.getState().archiveDatAdmin('lieu-dat-ref-crud', 'module-dat-c', 'direction-1', 'dat-1');

        let stored = await db.lieux.get('lieu-dat-ref-crud');
        let dats = (stored!.modules[0].data as ModeData).stations[0].directions[0].dats;
        expect(dats).toHaveLength(1); // toujours présent, pas supprimé
        expect(dats[0].archivedAt).toBeTruthy();

        useAuditStore.setState({ lieux: [stored!] });
        await useAuditStore.getState().restoreDatAdmin('lieu-dat-ref-crud', 'module-dat-c', 'direction-1', 'dat-1');

        stored = await db.lieux.get('lieu-dat-ref-crud');
        dats = (stored!.modules[0].data as ModeData).stations[0].directions[0].dats;
        expect(dats[0].archivedAt).toBeUndefined();
    });
});

describe('addEcaAdmin / updateEcaAdmin / archiveEcaAdmin / restoreEcaAdmin', () => {
    it('ajoute un ECA de référence, persisté, avec adhésifs initiaux dérivés du type', async () => {
        const lieu = lieuWithEcaModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const eca = await useAuditStore.getState().addEcaAdmin(lieu.id, 'module-eca-c', {
            name: 'Tripode E01', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 1,
        });

        expect(eca.origin).toBe('reference');
        const stored = await db.lieux.get(lieu.id);
        const storedEcas = (stored!.modules[0].data as EcaData).ecas;
        expect(storedEcas).toHaveLength(1);
        expect(storedEcas[0].origin).toBe('reference');
        expect(Object.keys(storedEcas[0].adhesives).length).toBeGreaterThan(0);
    });

    it('modifie un ECA de référence (renumérotation incluse), archive puis restaure', async () => {
        const lieu = lieuWithEcaModule();
        (lieu.modules[0].data as EcaData).ecas = [{
            id: 'eca-1', name: 'Tripode E01', accessPoint: 'Accès Principal',
            type: EcaEquipmentType.TripodeEntree, number: 1, adhesives: {}, comment: '', origin: 'reference',
        }];
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().updateEcaAdmin(lieu.id, 'module-eca-c', 'eca-1', { number: 2 });
        let stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as EcaData).ecas[0].number).toBe(2);

        useAuditStore.setState({ lieux: [stored!] });
        await useAuditStore.getState().archiveEcaAdmin(lieu.id, 'module-eca-c', 'eca-1');
        stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as EcaData).ecas).toHaveLength(1);
        expect((stored!.modules[0].data as EcaData).ecas[0].archivedAt).toBeTruthy();

        useAuditStore.setState({ lieux: [stored!] });
        await useAuditStore.getState().restoreEcaAdmin(lieu.id, 'module-eca-c', 'eca-1');
        stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as EcaData).ecas[0].archivedAt).toBeUndefined();
    });
});

describe('handleAddDat / handleAddEca (terrain) — origin: "terrain", distinct du parc de référence', () => {
    it('handleAddDat pose origin: "terrain" sur le DAT créé', async () => {
        const lieu = lieuWithEmptyDatModule();
        (lieu.modules[0].data as ModeData).stations[0].directions = [{ id: 'direction-1', name: 'Direction Aéroconstellation', dats: [] }];
        await db.lieux.put(lieu);
        useAuditStore.setState({
            lieux: [lieu],
            selectedLieuId: lieu.id, selectedModuleId: 'module-dat-c', selectedStationId: 'station-c', selectedDirectionId: 'direction-1',
        });

        await useAuditStore.getState().handleAddDat();

        const stored = await db.lieux.get(lieu.id);
        const dats = (stored!.modules[0].data as ModeData).stations[0].directions[0].dats;
        expect(dats).toHaveLength(1);
        expect(dats[0].origin).toBe('terrain');
    });

    it('la numérotation suggérée par handleAddDat ignore les DAT archivés', async () => {
        const lieu = lieuWithEmptyDatModule();
        (lieu.modules[0].data as ModeData).stations[0].directions = [{
            id: 'direction-1', name: 'Direction Aéroconstellation',
            dats: [{ id: 'dat-archived', name: 'DAT 01', adhesives: {}, comment: '', origin: 'reference', archivedAt: '2026-01-01T00:00:00.000Z' }],
        }];
        await db.lieux.put(lieu);
        useAuditStore.setState({
            lieux: [lieu],
            selectedLieuId: lieu.id, selectedModuleId: 'module-dat-c', selectedStationId: 'station-c', selectedDirectionId: 'direction-1',
        });

        await useAuditStore.getState().handleAddDat();

        const stored = await db.lieux.get(lieu.id);
        const dats = (stored!.modules[0].data as ModeData).stations[0].directions[0].dats;
        expect(dats).toHaveLength(2);
        // Un seul DAT actif préexistant (0, puisque le seul existant est archivé) : le nouveau doit être "DAT 01", pas "DAT 02".
        expect(dats.find(d => d.origin === 'terrain')!.name).toBe('DAT 01');
    });

    it('handleAddEca pose origin: "terrain" sur l\'ECA créé', async () => {
        const lieu = lieuWithEcaModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-eca-c' });

        await useAuditStore.getState().handleAddEca({ name: 'Tripode E01', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 1 });

        const stored = await db.lieux.get(lieu.id);
        const ecas = (stored!.modules[0].data as EcaData).ecas;
        expect(ecas).toHaveLength(1);
        expect(ecas[0].origin).toBe('terrain');
    });
});
