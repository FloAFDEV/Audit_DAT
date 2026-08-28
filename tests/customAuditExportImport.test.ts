// tests/customAuditExportImport.test.ts
// =================================================================
// Audits configurables (registre en dur, data/customAudits.ts) : test
// d'intégration bout-en-bout export/import, sur une base Dexie réelle
// (fake-indexeddb, comme le reste de la suite).
//
// Scénario complet : références créées → versioning d'une référence →
// archivage d'une référence → module CUSTOM attaché à une station →
// saisie terrain réelle (occurrences, historique de constats, photo) →
// export JSON → base vidée intégralement (équivalent fonctionnel d'une
// base Dexie vierge : mêmes tables, zéro donnée) → import → comparaison
// stricte.
//
// Comparé explicitement : références (dimensions/matière/version/
// previousVersions/archivage), module (statuts/commentaires/photos),
// station. Non-régression du référentiel historique (38 refs) déjà
// couvert par signageSerializer.test.ts — non dupliqué ici.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { buildFullExportPayload, parseImportPayload, applyImportPayload } from '../utils/signageSerializer';
import { createSignageReference, applyReferenceEdit, withArchived } from '../utils/cockpit/signageReferenceEditor';
import { createBlankCustomModule } from '../utils/cockpit/moduleAdmin';
import { CUSTOM_AUDIT_TYPES } from '../data/customAudits';
import { AuditModuleType, AdhesiveStatus, Lieu, CustomAuditData } from '../types';

const PDQ_ID = CUSTOM_AUDIT_TYPES.find(a => a.name === 'Plans de quartier')!.id;
const PDQ_NAME = 'Plans de quartier';

const resetDb = async () => {
    await db.transaction('rw', [db.lieux, db.signageReferences, db.signageAssets, db.events], async () => {
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.signageAssets.clear();
        await db.events.clear();
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
    });
    useAuditStore.setState({ lieux: [], isAdminUnlocked: true });
};

beforeEach(resetDb);

describe('Export/import bout-en-bout — audits configurables (registre en dur)', () => {
    it('création de références → versioning → archivage → module attaché → saisie → export → base vidée intégralement → import → comparaison stricte', async () => {
        // --- 1. Création des 2 références (variantes) ---
        const ref80x100Adh = createSignageReference({
            name: 'Repère 1 - 80x100 adhésif',
            scope: { auditType: 'CUSTOM', definitionId: PDQ_ID },
            support: 'adhesif', material: 'Adhésif', dimensions: { width: 80, height: 100, unit: 'cm' },
            placement: { zone: 'Abords station' },
        });
        const ref80x120Pla = createSignageReference({
            name: 'Repère 2 - 80x120 plastifié',
            scope: { auditType: 'CUSTOM', definitionId: PDQ_ID },
            support: 'pvc', material: 'Plastification', dimensions: { width: 80, height: 120, unit: 'cm' },
            placement: {},
        });
        await db.signageReferences.bulkAdd([ref80x100Adh, ref80x120Pla]);

        // --- 2. Versioning d'une référence (dimension corrigée) — previousVersions doit survivre ---
        const editedRef = applyReferenceEdit(
            ref80x100Adh,
            {
                name: ref80x100Adh.name, scope: ref80x100Adh.scope, support: 'adhesif',
                material: 'Adhésif renforcé', dimensions: { width: 80, height: 100, unit: 'cm' }, placement: { zone: 'Abords station' },
            },
            'Correction matière — retour terrain',
            '2026-06-01T00:00:00.000Z',
        );
        await db.signageReferences.put(editedRef);
        expect(editedRef.version).toBe(2);
        expect(editedRef.previousVersions).toHaveLength(1);

        // --- 3. Archivage de la 2e référence (reste exportable/consultable, disparaît des listes actives) ---
        const archivedRef = withArchived(ref80x120Pla, '2026-06-15T00:00:00.000Z');
        await db.signageReferences.put(archivedRef);

        // --- 4. Une station réelle, avec le module CUSTOM attaché à la main
        // (pas de propagation réseau : un audit s'attache station par
        // station, comme n'importe quel autre module). ---
        const stationCible: Lieu = {
            id: 'lieu-a-1', name: 'Station Cible',
            modules: [{ id: 'mod-dat-a1', type: AuditModuleType.DAT, name: 'DAT', line: 'A', data: { id: 'm', name: 'Station Cible', type: 'METRO' as any, line: 'A', stations: [] } }],
        };
        const customModule = createBlankCustomModule(stationCible.name, 'A', PDQ_ID, PDQ_NAME);
        stationCible.modules.push(customModule);
        await db.lieux.put(stationCible);
        useAuditStore.setState({ lieux: [stationCible] });

        // --- 5. Saisie terrain réelle : DEUX occurrences de la même référence
        // (patrimoine, pas une checklist), l'une avec un historique de
        // constats (« Nouveau constat » déjà utilisé une fois), photo sur
        // l'occurrence courante, une troisième occurrence Non applicable. ---
        const photoBase64 = 'ZmFrZS1qcGVnLWJ5dGVzLXBvdXItbGUtdGVzdA=='; // "fake-jpeg-bytes-pour-le-test" en base64
        (customModule.data as CustomAuditData).occurrences = [
            {
                id: 'occ-entree', referenceId: ref80x100Adh.id, location: 'Entrée rue X',
                status: AdhesiveStatus.ToBeReplaced, comment: 'Dégradé depuis le dernier passage',
                photo_base64: photoBase64, photo_rotation: 90, constatedAt: '2027-02-15T00:00:00.000Z',
                previousConstats: [{ status: AdhesiveStatus.OK, constatedAt: '2026-08-28T00:00:00.000Z' }],
            },
            {
                id: 'occ-quai1', referenceId: ref80x100Adh.id, location: 'Quai 1',
                status: AdhesiveStatus.OK, constatedAt: '2027-02-15T00:00:00.000Z',
            },
            {
                id: 'occ-na', referenceId: ref80x120Pla.id,
                status: AdhesiveStatus.NotApplicable, constatedAt: '2027-02-15T00:00:00.000Z',
            },
        ];
        (customModule.data as CustomAuditData).lastCheckedAt = '2027-02-15T00:00:00.000Z';
        await db.lieux.put(stationCible);

        // ================================================================
        // EXPORT
        // ================================================================
        const payload = await buildFullExportPayload();
        const backupJson = JSON.stringify(payload);

        expect(payload.signageReferences.filter(r => r.scope.auditType === 'CUSTOM')).toHaveLength(2);

        // ================================================================
        // BASE VIDÉE INTÉGRALEMENT (équivalent fonctionnel d'une base neuve :
        // mêmes tables Dexie, zéro donnée — le point qu'un import doit
        // pouvoir reconstruire entièrement à partir du seul fichier JSON)
        // ================================================================
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.signageAssets.clear();
        expect(await db.lieux.count()).toBe(0);
        expect(await db.signageReferences.count()).toBe(0);

        // ================================================================
        // IMPORT
        // ================================================================
        await applyImportPayload(parseImportPayload(backupJson));

        // --- Comparaison stricte : RÉFÉRENCES (dimensions, matière, VERSIONING, archivage) ---
        const restoredRef1 = await db.signageReferences.get(ref80x100Adh.id);
        expect(restoredRef1).toEqual(editedRef);
        expect(restoredRef1!.version).toBe(2);
        expect(restoredRef1!.material).toBe('Adhésif renforcé');
        expect(restoredRef1!.previousVersions).toHaveLength(1);
        expect(restoredRef1!.previousVersions![0].material).toBe('Adhésif'); // état AVANT la correction, préservé
        expect(restoredRef1!.previousVersions![0].changeReason).toBe('Correction matière — retour terrain');
        expect(restoredRef1!.archivedAt).toBeUndefined();

        const restoredRef2 = await db.signageReferences.get(ref80x120Pla.id);
        expect(restoredRef2).toEqual(archivedRef);
        expect(restoredRef2!.archivedAt).toBe('2026-06-15T00:00:00.000Z');

        // --- Comparaison stricte : MODULE / STATION / STATUTS / COMMENTAIRES / PHOTO ---
        const restoredStation = await db.lieux.get('lieu-a-1');
        expect(restoredStation).toEqual(stationCible);
        expect(restoredStation!.name).toBe('Station Cible');
        const restoredModule = restoredStation!.modules.find(m => m.type === AuditModuleType.CUSTOM)!;
        expect(restoredModule.name).toBe(PDQ_NAME); // dénormalisé à la création, conservé tel quel
        const restoredData = restoredModule.data as CustomAuditData;
        expect(restoredData.definitionId).toBe(PDQ_ID);
        expect(restoredData.lastCheckedAt).toBe('2027-02-15T00:00:00.000Z');
        expect(restoredData.occurrences).toHaveLength(3);

        // Deux occurrences de LA MÊME référence, chacune son identité, son
        // emplacement, son constat courant — jamais fusionnées.
        const entree = restoredData.occurrences.find(o => o.id === 'occ-entree')!;
        expect(entree.referenceId).toBe(ref80x100Adh.id);
        expect(entree.location).toBe('Entrée rue X');
        expect(entree.status).toBe(AdhesiveStatus.ToBeReplaced);
        expect(entree.photo_base64).toBe(photoBase64);
        expect(entree.photo_rotation).toBe(90);
        // L'historique du constat précédent (« Nouveau constat ») survit intact.
        expect(entree.previousConstats).toHaveLength(1);
        expect(entree.previousConstats![0]).toEqual({ status: AdhesiveStatus.OK, constatedAt: '2026-08-28T00:00:00.000Z' });

        const quai1 = restoredData.occurrences.find(o => o.id === 'occ-quai1')!;
        expect(quai1.referenceId).toBe(ref80x100Adh.id); // même référence que « entree », objet distinct
        expect(quai1.location).toBe('Quai 1');
        expect(quai1.status).toBe(AdhesiveStatus.OK);
        expect(quai1.previousConstats ?? []).toHaveLength(0);

        const na = restoredData.occurrences.find(o => o.id === 'occ-na')!;
        expect(na.referenceId).toBe(ref80x120Pla.id);
        expect(na.status).toBe(AdhesiveStatus.NotApplicable);

        // --- Non-régression : le référentiel historique (38 refs) est intact ---
        expect(await db.signageReferences.count()).toBe(40); // 38 historiques + 2 CUSTOM
    });
});
