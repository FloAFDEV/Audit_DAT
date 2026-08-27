// tests/customAuditExportImport.test.ts
// =================================================================
// Partie 2 — audits configurables : test d'intégration bout-en-bout
// export/import (Commit 6). Aucun code produit modifié dans ce commit —
// uniquement ce test, sur une base Dexie réelle (fake-indexeddb, comme
// le reste de la suite).
//
// Scénario complet exigé : création → propagation → saisie de données
// (statuts, commentaire, photo) → versioning d'une référence → archivage
// (d'une référence ET de la définition elle-même) → export JSON → base
// vidée intégralement (équivalent fonctionnel d'une base Dexie vierge :
// mêmes tables, zéro donnée) → import → comparaison stricte.
//
// Comparé explicitement : définition (nom/icône/ciblage/exclusions/
// inclusions/archivage), références (dimensions/matière/version/
// previousVersions/archivage), modules (statuts/commentaires/photos),
// station, et non-régression du référentiel historique (38 refs) déjà
// couvert par signageSerializer.test.ts — non dupliqué ici.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { buildFullExportPayload, parseImportPayload, applyImportPayload } from '../utils/signageSerializer';
import { createAuditDefinition, withDefinitionArchived, computeMissingLieuIds } from '../utils/cockpit/auditDefinitionAdmin';
import { createSignageReference, applyReferenceEdit, withArchived } from '../utils/cockpit/signageReferenceEditor';
import { createBlankCustomModule } from '../utils/cockpit/moduleAdmin';
import { AuditDefinition, AuditModuleType, AdhesiveStatus, Lieu, CustomAuditData } from '../types';

const resetDb = async () => {
    await db.transaction('rw', [db.lieux, db.signageReferences, db.signageAssets, db.auditDefinitions, db.events], async () => {
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.signageAssets.clear();
        await db.auditDefinitions.clear();
        await db.events.clear();
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
    });
    useAuditStore.setState({ lieux: [], isAdminUnlocked: true });
};

beforeEach(resetDb);

describe('Export/import bout-en-bout — audits configurables (Partie 2)', () => {
    it('création → propagation → saisie → versioning → archivage → export → base vidée intégralement → import → comparaison stricte', async () => {
        // --- 1. Création de la définition « Plans de quartier » ---
        const definition = createAuditDefinition({
            name: 'Plans de quartier', icon: 'MapPin',
            targetLines: ['A'], excludedLieuIds: ['lieu-excluded'], includedLieuIds: ['lieu-included'],
        });
        await db.auditDefinitions.add(definition);

        // --- 2. Création des 4 références (variantes) ---
        const ref80x100Adh = createSignageReference({
            name: 'Repère 1 - 80x100 adhésif',
            scope: { auditType: 'CUSTOM', definitionId: definition.id },
            support: 'adhesif', material: 'Adhésif', dimensions: { width: 80, height: 100, unit: 'cm' },
            placement: { zone: 'Abords station' },
        });
        const ref80x120Pla = createSignageReference({
            name: 'Repère 2 - 80x120 plastifié',
            scope: { auditType: 'CUSTOM', definitionId: definition.id },
            support: 'pvc', material: 'Plastification', dimensions: { width: 80, height: 120, unit: 'cm' },
            placement: {},
        });
        await db.signageReferences.bulkAdd([ref80x100Adh, ref80x120Pla]);

        // --- 3. Versioning d'une référence (dimension corrigée) — previousVersions doit survivre ---
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

        // --- 4. Archivage de la 2e référence (reste exportable/consultable, disparaît des listes actives) ---
        const archivedRef = withArchived(ref80x120Pla, '2026-06-15T00:00:00.000Z');
        await db.signageReferences.put(archivedRef);

        // --- 5. Deux stations réelles (une ciblée par la ligne A, une exclue explicitement) ---
        const stationCible: Lieu = {
            id: 'lieu-a-1', name: 'Station Cible',
            modules: [{ id: 'mod-dat-a1', type: AuditModuleType.DAT, name: 'DAT', line: 'A', data: { id: 'm', name: 'Station Cible', type: 'METRO' as any, line: 'A', stations: [] } }],
        };
        const stationExclue: Lieu = {
            id: 'lieu-excluded', name: 'Station Exclue',
            modules: [{ id: 'mod-dat-ex', type: AuditModuleType.DAT, name: 'DAT', line: 'A', data: { id: 'm', name: 'Station Exclue', type: 'METRO' as any, line: 'A', stations: [] } }],
        };
        await db.lieux.bulkPut([stationCible, stationExclue]);
        useAuditStore.setState({ lieux: [stationCible, stationExclue] });

        // --- 6. Propagation (idempotente) : seule la station ciblée reçoit le module (l'exclue jamais) ---
        const missing = computeMissingLieuIds(definition, useAuditStore.getState().lieux);
        expect(missing).toEqual(['lieu-a-1']); // exclue absente, incluse absente (n'existe pas dans lieux → ignorée)

        const customModule = createBlankCustomModule(stationCible.name, 'A', definition.id, definition.name);
        stationCible.modules.push(customModule);
        await db.lieux.put(stationCible);

        // --- 7. Saisie terrain réelle : statut + commentaire + photo (base64) sur une référence, l'autre NotApplicable ---
        const photoBase64 = 'ZmFrZS1qcGVnLWJ5dGVzLXBvdXItbGUtdGVzdA=='; // "fake-jpeg-bytes-pour-le-test" en base64
        (customModule.data as CustomAuditData).items = {
            [ref80x100Adh.id]: { status: AdhesiveStatus.OK, comment: 'Panneau neuf, bon état', photo_base64: photoBase64, photo_rotation: 90 },
            [ref80x120Pla.id]: { status: AdhesiveStatus.NotApplicable },
        };
        await db.lieux.put(stationCible);

        // --- 8. Archivage de la DÉFINITION elle-même (le module matérialisé doit rester intact) ---
        const archivedDefinition = withDefinitionArchived(definition, '2026-07-01T00:00:00.000Z');
        await db.auditDefinitions.put(archivedDefinition);

        // ================================================================
        // EXPORT
        // ================================================================
        const payload = await buildFullExportPayload();
        const backupJson = JSON.stringify(payload);

        expect(payload.customAuditDefinitions).toHaveLength(1);
        expect(payload.signageReferences.filter(r => r.scope.auditType === 'CUSTOM')).toHaveLength(2);

        // ================================================================
        // BASE VIDÉE INTÉGRALEMENT (équivalent fonctionnel d'une base neuve :
        // mêmes tables Dexie, zéro donnée — le point qu'un import doit
        // pouvoir reconstruire entièrement à partir du seul fichier JSON)
        // ================================================================
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.signageAssets.clear();
        await db.auditDefinitions.clear();
        expect(await db.auditDefinitions.count()).toBe(0);
        expect(await db.lieux.count()).toBe(0);
        expect(await db.signageReferences.count()).toBe(0);

        // ================================================================
        // IMPORT
        // ================================================================
        await applyImportPayload(parseImportPayload(backupJson));

        // --- Comparaison stricte : DÉFINITION (nom, icône, ciblage, exclusions, inclusions, archivage) ---
        const restoredDef = await db.auditDefinitions.get(definition.id);
        expect(restoredDef).toEqual(archivedDefinition);
        expect(restoredDef!.name).toBe('Plans de quartier');
        expect(restoredDef!.icon).toBe('MapPin');
        expect(restoredDef!.targetLines).toEqual(['A']);
        expect(restoredDef!.excludedLieuIds).toEqual(['lieu-excluded']);
        expect(restoredDef!.includedLieuIds).toEqual(['lieu-included']);
        expect(restoredDef!.archivedAt).toBe('2026-07-01T00:00:00.000Z');

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
        expect(restoredModule.name).toBe('Plans de quartier'); // dénormalisé à la création, conservé tel quel
        const restoredData = restoredModule.data as CustomAuditData;
        expect(restoredData.definitionId).toBe(definition.id);
        expect(restoredData.items[ref80x100Adh.id]).toEqual({
            status: AdhesiveStatus.OK, comment: 'Panneau neuf, bon état', photo_base64: photoBase64, photo_rotation: 90,
        });
        expect(restoredData.items[ref80x120Pla.id]).toEqual({ status: AdhesiveStatus.NotApplicable });

        // --- La station EXCLUE n'a reçu aucun module CUSTOM, avant comme après restauration ---
        const restoredExcluded = await db.lieux.get('lieu-excluded');
        expect(restoredExcluded!.modules.every(m => m.type !== AuditModuleType.CUSTOM)).toBe(true);

        // --- Non-régression : le référentiel historique (38 refs) est intact ---
        expect(await db.signageReferences.count()).toBe(40); // 38 historiques + 2 CUSTOM
    });

    it('un import v1 (ancien format, sans customAuditDefinitions) laisse la table auditDefinitions locale strictement intacte', async () => {
        const definition = createAuditDefinition({ name: 'Plans de quartier', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [] });
        await db.auditDefinitions.add(definition);

        const oldFormat = JSON.stringify({ exportDate: '2020-01-01', data: [{ id: 'lieu-x', name: 'X', modules: [] }] });
        await applyImportPayload(parseImportPayload(oldFormat));

        expect(await db.auditDefinitions.get(definition.id)).toEqual(definition);
    });

    it('un import v2 dont customAuditDefinitions est invalide refuse tout l\'import (aucune restauration partielle)', async () => {
        const payload: any = await buildFullExportPayload();
        payload.customAuditDefinitions = [{ id: '', broken: true }];
        expect(() => parseImportPayload(JSON.stringify(payload))).toThrow(/Définitions d'audits configurables invalides/);
    });
});
