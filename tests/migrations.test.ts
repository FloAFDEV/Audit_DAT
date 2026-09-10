// tests/migrations.test.ts
// =================================================================
// Vérifie la chaîne de migrations Dexie (Lot 2.3, db.ts::createAuditDb).
// Chaque test ouvre une base ISOLÉE (nom unique) pour ne jamais
// interférer avec le singleton `db` partagé par le reste de la suite.
//
// Règle absolue vérifiée ici : une migration ne doit JAMAIS entraîner
// silencieusement une perte de données utilisateur.
// =================================================================
import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { createAuditDb } from '../db';
import { buildSignageReferencesSeed } from '../data/signage_seed';

let dbCounter = 0;
const uniqueDbName = () => `TisseoAuditDB-test-${Date.now()}-${dbCounter++}`;

/** Ouvre une base au schéma v5/v6 (avant la refonte Signalétique de V7),
 *  strictement pour y semer des données à l'ancien format — ne duplique
 *  QUE la déclaration d'index (.stores), jamais de logique métier. */
const openLegacyV6Db = (name: string) => {
    const legacy = new Dexie(name);
    legacy.version(5).stores({ lieux: 'id, name', history: '++id, date, type, categoryKey' }).upgrade(tx => tx.table('lieux').clear());
    legacy.version(6).stores({ lieux: 'id, name', history: '++id, date, type, categoryKey' });
    return legacy;
};

const oldShapedSignaletiqueLieu = () => ({
    id: 'lieu-legacy', name: 'Lieu Legacy',
    modules: [{
        id: 'module-sig-legacy', type: 'SIGNALETIQUE', name: 'Signalétique', line: 'TRAM',
        data: {
            id: 'mode-legacy', name: 'Lieu Legacy', type: 'TRAM', line: 'TRAM',
            stations: [{
                id: 'station-legacy', name: 'Station Legacy', directions: [],
                signaletique: {
                    // Ancien format V6 : totem/bandeau en listes meett/pdj, pas encore
                    // direction1/direction2. Un statut réel (OK) sert de témoin :
                    // il doit survivre intact jusqu'en V12.
                    totem: { meett: [{ status: 'OK', comment: 'déjà audité', dimensions: '61,6 x 91,6 cm' }], pdj: [] },
                    biv: { meett: [], pdj: [] },
                    planReseau: { meett: [], pdj: [] },
                    planQuartier: { meett: [{ status: 'OK', terminusCase: 'à supprimer', relayInfo: 'à supprimer' }], pdj: [] },
                    hap: { meett: [], pdj: [] },
                    // bandeauStation n'existe pas encore en V6 (introduit en V7).
                },
            }],
        },
    }],
});

describe('Migration V6 → V12 (données réelles pré-existantes)', () => {
    it('restructure Signalétique (V7) SANS perdre le statut déjà audité, et applique les migrations suivantes', async () => {
        const name = uniqueDbName();

        // 1) Base "ancienne" : seed au format V6.
        const legacy = openLegacyV6Db(name);
        await legacy.open();
        await legacy.table('lieux').put(oldShapedSignaletiqueLieu());
        legacy.close();

        // 2) Réouverture avec le schéma courant (createAuditDb = même chaîne que `db`) :
        //    Dexie applique automatiquement V7→V12 dans l'ordre.
        const upgraded = createAuditDb(name);
        await upgraded.open();

        const migrated: any = await upgraded.table('lieux').get('lieu-legacy');
        const sig = migrated.modules[0].data.stations[0].signaletique;

        // V7 : totem converti en direction1/direction2, statut préservé (témoin).
        expect(sig.totem.direction1.status).toBe('OK');
        expect(sig.totem.direction1.comment).toBe('déjà audité');
        expect(sig.totem.direction2.status).toBe('NotChecked'); // valeur par défaut, jamais inventée à partir de rien

        // V7 : bandeauStation créé (absent en V6).
        expect(migrated.modules[0].data.stations[0].signaletique.bandeauStation).toBeDefined();
        expect(sig.bandeauStation.direction1.status).toBe('NotChecked');

        // V7 : champs obsolètes retirés de planQuartier, statut préservé.
        expect(sig.planQuartier.meett[0].status).toBe('OK');
        expect(sig.planQuartier.meett[0].terminusCase).toBeUndefined();
        expect(sig.planQuartier.meett[0].relayInfo).toBeUndefined();

        // V12 : le référentiel signalétique existe désormais (seedé une fois, pas dupliqué).
        const refs = await upgraded.table('signageReferences').toArray();
        expect(refs.length).toBe(buildSignageReferencesSeed().length);

        upgraded.close();
        await Dexie.delete(name);
    });
});

describe('Base neuve (jamais ouverte)', () => {
    it('se crée directement en V12 et seed le référentiel via populate (pas de duplication)', async () => {
        const name = uniqueDbName();
        const fresh = createAuditDb(name);
        await fresh.open();

        expect(await fresh.table('lieux').count()).toBe(0);
        const refs = await fresh.table('signageReferences').toArray();
        expect(refs).toHaveLength(buildSignageReferencesSeed().length);

        fresh.close();
        await Dexie.delete(name);
    });
});

describe('Base déjà à jour (V12) — idempotence à la réouverture', () => {
    it('ne rejoue aucune migration ni ne duplique le référentiel', async () => {
        const name = uniqueDbName();

        const first = createAuditDb(name);
        await first.open();
        await first.table('lieux').put({ id: 'lieu-a', name: 'Lieu A', modules: [] });
        const countAfterFirstOpen = await first.table('signageReferences').count();
        first.close();

        const second = createAuditDb(name);
        await second.open();

        expect(await second.table('signageReferences').count()).toBe(countAfterFirstOpen); // pas de doublon
        expect(await second.table('lieux').count()).toBe(1); // la donnée utilisateur est intacte
        expect((await second.table('lieux').get('lieu-a'))?.name).toBe('Lieu A');

        second.close();
        await Dexie.delete(name);
    });
});

describe('Migration V12 → V13 (introduction du journal d\'événements, Lot 3)', () => {
    it('crée la table events vide, SANS toucher aux données existantes (lieux, history, signageReferences)', async () => {
        const name = uniqueDbName();

        // 1) Base au schéma V12 (avant le journal), avec des données réelles.
        const v12 = new Dexie(name);
        v12.version(12).stores({
            lieux: 'id, name',
            history: '++id, date, type, categoryKey',
            signageReferences: 'id, auditType',
            signageAssets: 'id, referenceId',
        });
        await v12.open();
        await v12.table('lieux').put({ id: 'lieu-v12', name: 'Lieu V12', modules: [] });
        await v12.table('history').add({ date: new Date().toISOString(), title: 'Ancien historique', type: 'GLOBAL', score: 80, details: '[]' });
        const refsBefore = await v12.table('signageReferences').toArray();
        v12.close();

        // 2) Réouverture avec le schéma courant (V13 inclus).
        const upgraded = createAuditDb(name);
        await upgraded.open();

        // Données V12 intactes...
        expect(await upgraded.table('lieux').get('lieu-v12')).toMatchObject({ name: 'Lieu V12' });
        expect(await upgraded.table('history').count()).toBe(1);
        expect(await upgraded.table('signageReferences').count()).toBe(refsBefore.length);

        // ...et le journal, nouveau, est vide et immédiatement utilisable.
        expect(await upgraded.table('events').count()).toBe(0);
        await upgraded.table('events').add({ date: new Date().toISOString(), type: 'IMPORT', summary: 'test post-migration' } as any);
        expect(await upgraded.table('events').count()).toBe(1);

        upgraded.close();
        await Dexie.delete(name);
    });
});

describe('Migration V14 → V15 (qualification statique de 8 références + adbs3)', () => {
    it('patche les références déjà présentes SANS écraser un champ modifié localement, ajoute adbs3, et reste idempotente', async () => {
        const name = uniqueDbName();

        // 1) Base au schéma V14 (avant la qualification), avec un référentiel
        //    dans son état PRÉ-qualification (tel qu'un appareil déjà en
        //    usage l'aurait persisté) : ad12 mal orienté, adca12 en 'autre'
        //    + needsReview, eca-r-1 encore actif, pas de adbs3. `material`
        //    sur adca12 simule une modification locale antérieure (Admin,
        //    aujourd'hui retiré) qui ne doit jamais être écrasée.
        const v14 = new Dexie(name);
        v14.version(14).stores({
            lieux: 'id, name',
            history: '++id, date, type, categoryKey',
            signageReferences: 'id, auditType',
            signageAssets: 'id, referenceId',
            events: '++id, date, type, entityType',
            auditDefinitions: 'id',
        });
        await v14.open();
        await v14.table('signageReferences').bulkAdd([
            {
                id: 'ad12', name: 'Repère 12', auditType: 'DAT', scope: { auditType: 'DAT' }, version: 1,
                support: 'adhesif', dimensions: { width: 3.7, height: 5.4, unit: 'cm' },
                placement: {}, legacyDescription: 'Dimensions: 3,7x5,4cm | Localisation: ...',
            },
            {
                id: 'adca12', name: 'Plan de quartier', auditType: 'PR', scope: { auditType: 'PR' }, version: 1,
                support: 'autre', material: 'Modification locale antérieure', needsReview: true,
                placement: {}, legacyDescription: 'Fiche plan de quartier au format 78x120cm',
            },
            {
                id: 'eca-r-1', name: 'Repère R1', auditType: 'ECA', scope: { auditType: 'ECA' }, version: 1,
                support: 'autre', needsReview: true,
                placement: {}, legacyDescription: 'Flèche verte / Croix rouge lumineuse | ...',
            },
            {
                id: 'adbe3', name: 'Repère 3 - Tarifs + coordonnées', auditType: 'PR', scope: { auditType: 'PR', equipmentTypes: ['BE'] }, version: 1,
                support: 'adhesif', sameAs: ['adca9'], needsReview: true,
                placement: {}, legacyDescription: 'Adhésif « Tarifs + coordonnées Parc Relais » ...',
            },
            {
                id: 'ad1', name: 'Repère 1', auditType: 'DAT', scope: { auditType: 'DAT' }, version: 1,
                support: 'adhesif', placement: {}, legacyDescription: 'Dimensions: 95x5,8cm | ...',
                needsReview: true,
            },
            // Référence HORS PÉRIMÈTRE de la qualification — doit rester
            // bit-à-bit intacte (aucun id de ARBITRAGE_DECISIONS ne la vise).
            {
                id: 'ad2', name: 'Repère 2', auditType: 'DAT', scope: { auditType: 'DAT' }, version: 1,
                support: 'adhesif', placement: {}, legacyDescription: 'Dimensions: 2,5x2,5cm | ...',
            },
        ]);
        v14.close();

        // 2) Réouverture avec le schéma courant (V15 inclus).
        const upgraded = createAuditDb(name);
        await upgraded.open();
        const table = upgraded.table('signageReferences');

        const ad12 = await table.get('ad12');
        expect(ad12.dimensions).toEqual({ width: 5.4, height: 3.7, unit: 'cm' });
        expect(ad12.arbitrage.status).toBe('keep');
        expect(ad12.needsReview).toBeUndefined();

        const adca12 = await table.get('adca12');
        expect(adca12.support).toBe('adhesif');
        expect(adca12.material).toBe('Modification locale antérieure'); // jamais écrasé
        expect(adca12.needsReview).toBeUndefined();

        const ecaR1 = await table.get('eca-r-1');
        expect(ecaR1.isDisabled).toBe(true);
        expect(ecaR1.arbitrage.status).toBe('remove');

        const adbe3 = await table.get('adbe3');
        expect(adbe3.sameAs).toEqual(expect.arrayContaining(['adca9', 'adbs3']));

        const adbs3 = await table.get('adbs3');
        expect(adbs3).toBeDefined();
        expect(adbs3.scope).toEqual({ auditType: 'PR', equipmentTypes: ['BS'] });

        // ad1 EST qualifiée (décision 'keep', divergence BPU non significative).
        const ad1 = await table.get('ad1');
        expect(ad1.needsReview).toBeUndefined();
        expect(ad1.arbitrage.status).toBe('keep');

        // ad2 est HORS périmètre de la qualification : strictement intacte.
        const ad2 = await table.get('ad2');
        expect(ad2).toEqual({
            id: 'ad2', name: 'Repère 2', auditType: 'DAT', scope: { auditType: 'DAT' }, version: 1,
            support: 'adhesif', placement: {}, legacyDescription: 'Dimensions: 2,5x2,5cm | ...',
        });

        expect(await table.count()).toBe(11); // 6 seedées + adbs3 (V15) + 4 modèles Plans de quartier (V17)

        upgraded.close();

        // 3) Réouverture — idempotence : ni duplication de adbs3, ni re-patch destructeur.
        const reopened = createAuditDb(name);
        await reopened.open();
        expect(await reopened.table('signageReferences').count()).toBe(11);
        const adca12Again = await reopened.table('signageReferences').get('adca12');
        expect(adca12Again.material).toBe('Modification locale antérieure');
        reopened.close();

        await Dexie.delete(name);
    });

    it("n'ajoute jamais adbs3 sur un référentiel vide (table jamais seedée)", async () => {
        const name = uniqueDbName();
        const v14 = new Dexie(name);
        v14.version(14).stores({
            lieux: 'id, name',
            history: '++id, date, type, categoryKey',
            signageReferences: 'id, auditType',
            signageAssets: 'id, referenceId',
            events: '++id, date, type, entityType',
            auditDefinitions: 'id',
        });
        await v14.open();
        v14.close();

        const upgraded = createAuditDb(name);
        await upgraded.open();
        expect(await upgraded.table('signageReferences').count()).toBe(0);
        upgraded.close();
        await Dexie.delete(name);
    });
});

describe('Migration V15 → V16 (retrait Admin — suppression auditDefinitions/signageAssets)', () => {
    it('supprime réellement les deux tables côté IndexedDB, sans toucher lieux/history/events/signageReferences', async () => {
        const name = uniqueDbName();

        // 1) Base au schéma V15 (avant le retrait de l'Admin), avec du
        //    contenu réel dans les deux tables qui vont disparaître — la
        //    preuve qu'un appareil ayant réellement utilisé l'Admin ne
        //    garde pas de table orpheline après la migration.
        const v15 = new Dexie(name);
        v15.version(15).stores({
            lieux: 'id, name',
            history: '++id, date, type, categoryKey',
            signageReferences: 'id, auditType',
            signageAssets: 'id, referenceId',
            events: '++id, date, type, entityType',
            auditDefinitions: 'id',
        });
        await v15.open();
        await v15.table('lieux').bulkPut([{ id: 'lieu-1', name: 'Lieu 1', modules: [] }]);
        await v15.table('signageReferences').bulkAdd(buildSignageReferencesSeed());
        await v15.table('auditDefinitions').add({ id: 'def-1', name: 'Ancien audit', icon: 'MapPin', targetLines: [], excludedLieuIds: [], includedLieuIds: [] });
        await v15.table('signageAssets').add({ id: 'asset-1', referenceId: 'ad1', kind: 'poseExample', blob: new Blob(['x']), mimeType: 'image/png', addedAt: '2026-01-01T00:00:00.000Z' });
        expect(await v15.table('auditDefinitions').count()).toBe(1);
        expect(await v15.table('signageAssets').count()).toBe(1);
        v15.close();

        // 2) Réouverture avec le schéma courant (V16 inclus).
        const upgraded = createAuditDb(name);
        await upgraded.open();

        expect(upgraded.tables.map(t => t.name)).not.toContain('auditDefinitions');
        expect(upgraded.tables.map(t => t.name)).not.toContain('signageAssets');
        // Le reste des tables et leur contenu restent strictement intacts.
        expect(await upgraded.table('lieux').count()).toBe(1);
        expect(await upgraded.table('signageReferences').count()).toBe(43);
        upgraded.close();

        await Dexie.delete(name);
    });
});

describe('Migration V17 → V19 (rafraîchissement PDQ/PEM3D + purge CUSTOM orpheline)', () => {
    it("rafraîchit les 4 fiches PDQ/PEM3D même si leur id existe déjà, purge les références CUSTOM orphelines, et ne touche JAMAIS lieux/occurrences", async () => {
        const name = uniqueDbName();

        // 1) Base au schéma V17 : la fiche pdq-adhesif y est encore dans son
        //    état D'ORIGINE (sans dimensions confirmées) — exactement ce
        //    qu'un appareil ayant fait V17 puis jamais rouvert depuis
        //    porterait encore, puisque V17 n'ajoute QUE les ids absents.
        //    On y ajoute aussi une référence CUSTOM orpheline (ancien Admin,
        //    cf. V18) et un lieu réel avec une occurrence PDQ déjà constatée
        //    sur le terrain — témoin qui doit ressortir strictement intact.
        const v17 = new Dexie(name);
        v17.version(17).stores({
            lieux: 'id, name',
            history: '++id, date, type, categoryKey',
            signageReferences: 'id, auditType',
            events: '++id, date, type, entityType',
        });
        await v17.open();
        const staleAdhesif = {
            id: 'pdq-adhesif', name: 'Plan de quartier (adhésif)',
            auditType: 'PDQ', scope: { auditType: 'PDQ' },
            version: 1, support: 'adhesif', placement: {},
            legacyDescription: "Version adhésive d'un Plan de quartier — jamais au format 78×100. Dimension précise non encore confirmée.",
        };
        const orphanCustom = {
            id: 'custom-orpheline-1', name: 'PdQ Gd',
            auditType: 'CUSTOM', scope: { auditType: 'CUSTOM', definitionId: 'def-disparue' },
            version: 1, support: 'adhesif', dimensions: { width: 80, height: 120, unit: 'cm' }, placement: {},
        };
        await v17.table('signageReferences').bulkAdd([...buildSignageReferencesSeed().filter(r => r.id !== 'pdq-adhesif'), staleAdhesif, orphanCustom]);
        const terrainOccurrence = {
            id: 'occ-terrain-1', modelId: 'pdq-adhesif', location: 'Agence commerciale',
            status: 'ToBeReplaced', comment: 'Coin abîmé, vu le 3 mars',
            constatedAt: '2026-03-03T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z',
        };
        const lieuAvecConstat = {
            id: 'lieu-1', name: 'Lieu Test', modules: [{
                id: 'module-pdq-1', type: 'PLAN_QUARTIER', name: 'Plans de quartier', line: 'A',
                data: { id: 'pdq-data-1', stationName: 'Lieu Test', stationCode: 'LT', occurrences: [terrainOccurrence], comment: '' },
            }],
        };
        await v17.table('lieux').put(lieuAvecConstat);
        v17.close();

        // 2) Réouverture avec le schéma courant (V18 + V19 inclus).
        const upgraded = createAuditDb(name);
        await upgraded.open();

        const refreshedAdhesif = await upgraded.table('signageReferences').get('pdq-adhesif');
        expect(refreshedAdhesif.dimensions).toEqual({ width: 78, height: 120, unit: 'cm' });
        expect(refreshedAdhesif.legacyDescription).not.toContain('non encore confirmée');

        // La référence CUSTOM orpheline a disparu (V18), jamais régénérée.
        expect(await upgraded.table('signageReferences').get('custom-orpheline-1')).toBeUndefined();
        expect(await upgraded.table('signageReferences').where('auditType').equals('CUSTOM').count()).toBe(0);

        // L'occurrence terrain — constat réel, emplacement, commentaire —
        // ressort caractère pour caractère identique : V19 ne touche QUE
        // signageReferences, jamais lieux.
        const lieuAfter = await upgraded.table('lieux').get('lieu-1');
        expect(lieuAfter.modules[0].data.occurrences).toEqual([terrainOccurrence]);

        upgraded.close();

        // 3) Idempotence : une réouverture ne duplique ni ne modifie plus rien.
        const reopened = createAuditDb(name);
        await reopened.open();
        expect(await reopened.table('signageReferences').where('id').equals('pdq-adhesif').count()).toBe(1);
        const lieuAfterReopen = await reopened.table('lieux').get('lieu-1');
        expect(lieuAfterReopen.modules[0].data.occurrences).toEqual([terrainOccurrence]);
        reopened.close();

        await Dexie.delete(name);
    });
});

describe('Robustesse — transaction de migration atomique (garantie native IndexedDB)', () => {
    it('une exception dans une fonction .upgrade() abandonne toute la transaction (aucune écriture partielle)', async () => {
        const name = uniqueDbName();
        const legacy = openLegacyV6Db(name);
        await legacy.open();
        // Lieu délibérément malformé : `modules` absent → une migration qui fait
        // `lieu.modules.forEach(...)` sans garde lèverait une TypeError.
        await legacy.table('lieux').put({ id: 'lieu-malforme', name: 'Malformé' } as any);
        legacy.close();

        const broken = new Dexie(name);
        broken.version(5).stores({ lieux: 'id, name', history: '++id, date, type, categoryKey' });
        broken.version(6).stores({ lieux: 'id, name', history: '++id, date, type, categoryKey' });
        broken.version(7).stores({ lieux: 'id, name', history: '++id, date, type, categoryKey' }).upgrade(tx =>
            tx.table('lieux').toArray().then(lieux => {
                lieux.forEach((l: any) => l.modules.forEach(() => {})); // lève : modules undefined
                return tx.table('lieux').bulkPut(lieux);
            })
        );

        await expect(broken.open()).rejects.toThrow();
        broken.close();

        // La base reste ouvrable au schéma d'ORIGINE (V6) : la donnée n'a pas
        // été perdue, la migration ratée n'a rien laissé de partiel derrière elle.
        const reopened = openLegacyV6Db(name);
        await reopened.open();
        expect(await reopened.table('lieux').get('lieu-malforme')).toBeDefined();
        reopened.close();

        await Dexie.delete(name);
    });
});
