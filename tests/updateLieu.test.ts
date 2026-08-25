// tests/updateLieu.test.ts
// =================================================================
// Vérifie le correctif P0.1 (Lot 1 — sécurisation immédiate) :
// _updateLieu (store.ts) ne doit JAMAIS mettre à jour l'état local si
// l'écriture IndexedDB sous-jacente échoue — sinon l'écran afficherait
// une modification que la base n'a en réalité pas enregistrée.
// Périmètre volontairement restreint à ce seul comportement (pas une
// campagne de tests du store) : un chemin de mutation représentatif
// (handleDatStatusChange), succès puis échec.
// =================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';
import { db } from '../db';
import useAuditStore from '../store';
import { AuditModuleType, AdhesiveStatus, Lieu, TransportMode } from '../types';

const ADHESIVE_ID = 'ad-test-1';

const buildLieu = (): Lieu => ({
    id: 'lieu-updatelieu-test',
    name: 'Lieu Test _updateLieu',
    modules: [{
        id: 'module-dat-test',
        type: AuditModuleType.DAT,
        name: 'DAT Test',
        line: 'A',
        data: {
            id: 'mode-test', name: 'Lieu Test _updateLieu', type: TransportMode.METRO, line: 'A',
            stations: [{
                id: 'station-test', name: 'Station Test', directions: [{
                    id: 'direction-test', name: 'Direction Test', dats: [{
                        id: 'dat-test', name: 'DAT 01',
                        adhesives: { [ADHESIVE_ID]: AdhesiveStatus.NotChecked },
                        comment: '',
                    }],
                }],
            }],
        },
    }],
});

/** Repositionne le store sur un lieu fraîchement seedé, sélectionné
 *  jusqu'au DAT — condition requise pour que handleDatStatusChange
 *  (donc _updateLieu) trouve sa cible. */
const seedAndSelect = async (): Promise<Lieu> => {
    const lieu = buildLieu();
    await db.lieux.clear();
    await db.lieux.put(lieu);
    useAuditStore.setState({
        lieux: [lieu],
        selectedLieuId: lieu.id,
        selectedModuleId: 'module-dat-test',
        selectedStationId: 'station-test',
        selectedDirectionId: 'direction-test',
        selectedDatId: 'dat-test',
    });
    return lieu;
};

const getDatAdhesiveInState = () =>
    (useAuditStore.getState().lieux[0].modules[0].data as any).stations[0].directions[0].dats[0].adhesives[ADHESIVE_ID];

const getDatAdhesiveInDb = async () => {
    const stored = await db.lieux.get('lieu-updatelieu-test');
    return (stored!.modules[0].data as any).stations[0].directions[0].dats[0].adhesives[ADHESIVE_ID];
};

beforeEach(async () => {
    vi.restoreAllMocks();
    await seedAndSelect();
});

describe('_updateLieu — écriture IndexedDB réussie', () => {
    it('met à jour l\'état local ET persiste réellement en base', async () => {
        await useAuditStore.getState().handleDatStatusChange(ADHESIVE_ID, AdhesiveStatus.OK);

        expect(getDatAdhesiveInState()).toBe(AdhesiveStatus.OK);
        expect(await getDatAdhesiveInDb()).toBe(AdhesiveStatus.OK);
    });
});

describe('_updateLieu — échec d\'écriture IndexedDB (ex. quota dépassé)', () => {
    it('ne met JAMAIS à jour l\'état local sur un échec, prévient explicitement l\'utilisateur, ET rejette (Lot 2 : plus d\'échec avalé silencieusement)', async () => {
        const putSpy = vi.spyOn(db.lieux, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'));
        const toastErrorSpy = vi.spyOn(toast, 'error');

        // Depuis le correctif Lot 2, _updateLieu relance l'erreur après avoir
        // affiché son toast — nécessaire pour que les flux de reset construits
        // sur _updateLieu (Pictogrammes, etc.) ne remontent pas un faux succès
        // à showPromiseToast (cf. store.ts).
        await expect(useAuditStore.getState().handleDatStatusChange(ADHESIVE_ID, AdhesiveStatus.OK)).rejects.toThrow();

        // L'état affiché reste celui d'AVANT la tentative — jamais une
        // modification fantôme que la base n'a pas acceptée.
        expect(getDatAdhesiveInState()).toBe(AdhesiveStatus.NotChecked);
        // La base, elle non plus, n'a pas bougé.
        expect(await getDatAdhesiveInDb()).toBe(AdhesiveStatus.NotChecked);
        // L'agent terrain est prévenu explicitement, pas un échec silencieux.
        expect(toastErrorSpy).toHaveBeenCalledTimes(1);

        putSpy.mockRestore();
    });

    it('reste utilisable juste après l\'échec : une nouvelle modification réussie s\'applique normalement', async () => {
        vi.spyOn(db.lieux, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'));
        await expect(useAuditStore.getState().handleDatStatusChange(ADHESIVE_ID, AdhesiveStatus.OK)).rejects.toThrow();
        expect(getDatAdhesiveInState()).toBe(AdhesiveStatus.NotChecked); // toujours bloqué par l'échec précédent

        // db.lieux.put n'est plus mocké en échec (mockRejectedValueOnce consommé) : l'écriture suivante doit réussir.
        await useAuditStore.getState().handleDatStatusChange(ADHESIVE_ID, AdhesiveStatus.Absent);

        expect(getDatAdhesiveInState()).toBe(AdhesiveStatus.Absent);
        expect(await getDatAdhesiveInDb()).toBe(AdhesiveStatus.Absent);
    });

    it('n\'écrase aucune autre donnée valide déjà présente sur le lieu', async () => {
        // Un second module (comment déjà rempli) sert de témoin : il ne doit
        // jamais être touché par une tentative d'écriture ratée sur le DAT.
        const lieu = useAuditStore.getState().lieux[0];
        (lieu.modules[0].data as any).stations[0].comment = 'témoin intact';
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu] });

        vi.spyOn(db.lieux, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'));
        await expect(useAuditStore.getState().handleDatStatusChange(ADHESIVE_ID, AdhesiveStatus.OK)).rejects.toThrow();

        const stationComment = (useAuditStore.getState().lieux[0].modules[0].data as any).stations[0].comment;
        expect(stationComment).toBe('témoin intact');
        const storedComment = ((await db.lieux.get('lieu-updatelieu-test'))!.modules[0].data as any).stations[0].comment;
        expect(storedComment).toBe('témoin intact');
    });
});
