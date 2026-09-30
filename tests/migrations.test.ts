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
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { EcaEquipmentType, SignageReference } from '../types';

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

        expect(await table.count()).toBe(12); // 6 seedées + adbs3 (V15) + 4 modèles PDQ (V17) + le 78x120 dibond (V21)

        upgraded.close();

        // 3) Réouverture — idempotence : ni duplication de adbs3, ni re-patch destructeur.
        const reopened = createAuditDb(name);
        await reopened.open();
        expect(await reopened.table('signageReferences').count()).toBe(12);
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
        expect(await upgraded.table('signageReferences').count()).toBe(44);
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

describe('Migration V20 (plan de quartier des caisses automatiques : un seul patrimoine)', () => {
    it('désactive adca12 sans écraser les modifications locales, laisse adca13 active et ne touche pas aux lieux', async () => {
        const name = uniqueDbName();

        // Base au schéma V19 : adca12 y est encore ACTIVE (elle comptait alors
        // un exemplaire par caisse automatique), et porte une modification
        // locale antérieure que V13 s'engage à ne jamais écraser.
        const v19 = new Dexie(name);
        v19.version(19).stores({
            lieux: 'id, name',
            history: '++id, date, type, categoryKey',
            signageReferences: 'id, auditType',
            events: '++id, date, type, entityType',
        });
        await v19.open();
        const seed = buildSignageReferencesSeed().filter(r => r.id !== 'adca12');
        const localAdca12 = {
            id: 'adca12', name: 'Plan de quartier', auditType: 'PR',
            scope: { auditType: 'PR', equipmentTypes: ['CA'] },
            version: 1, support: 'adhesif', placement: {},
            material: 'Modification locale antérieure',
            dimensions: { width: 78, height: 120, unit: 'cm' },
        };
        await v19.table('signageReferences').bulkAdd([...seed, localAdca12]);
        const lieu = {
            id: 'lieu-pr-1', name: 'Borderouge', modules: [{
                id: 'module-pr-1', type: 'PR', name: 'Audit Bornes P+R',
                data: { id: 'pr-1', name: 'Borderouge', zones: [{
                    id: 'z1', name: 'Zone', equipments: [{
                        id: 'ca01', name: 'CA01', type: 'CA', comment: 'Caisse repeinte',
                        adhesives: { adca12: 'ToBeReplaced', adca13: 'OK' },
                    }],
                }] },
            }],
        };
        await v19.table('lieux').put(lieu);
        v19.close();

        // Réouverture au schéma courant → V20 s'applique.
        const upgraded = createAuditDb(name);
        await upgraded.open();

        const adca12 = await upgraded.table('signageReferences').get('adca12');
        expect(adca12.isDisabled).toBe(true);
        // Le reste de la fiche appartient à l'installation : jamais écrasé.
        expect(adca12.material).toBe('Modification locale antérieure');

        // Le dos gris reste une pièce active de la borne.
        const adca13 = await upgraded.table('signageReferences').get('adca13');
        expect(adca13.isDisabled).toBeUndefined();

        // Aucune donnée terrain touchée : le statut constaté sur la caisse
        // reste disponible pour la reprise par le patrimoine PDQ (store.ts).
        const reloaded = await upgraded.table('lieux').get('lieu-pr-1');
        expect(reloaded).toEqual(lieu);

        upgraded.close();
    });
});

describe('Migration V21 → V22 (PMR à vantaux réversible dans le périmètre des références ECA)', () => {
    const REVERSIBLE = EcaEquipmentType.PMRVantauxReversible;
    const TARGET_IDS = ['eca-1', 'eca-2', 'eca-3', 'eca-5', 'eca-7', 'eca-9', 'eca-10'];
    const V21_STORES = {
        lieux: 'id, name',
        history: '++id, date, type, categoryKey',
        signageReferences: 'id, auditType',
        events: '++id, date, type, entityType',
    };

    /** Référentiel tel que persisté avant #121 : le seed courant, sans
     *  PMR à vantaux réversible dans le périmètre des références ciblées. */
    const staleReferences = (): SignageReference[] => buildSignageReferencesSeed().map(ref => {
        if (!TARGET_IDS.includes(ref.id) || ref.scope.auditType !== 'ECA') return ref;
        return { ...ref, scope: { ...ref.scope, equipmentTypes: ref.scope.equipmentTypes!.filter(t => t !== REVERSIBLE) } };
    });

    /** Jean-Jaurès, Ligne B : les deux ECA PMR réversibles (statuts ZH/ZB
     *  distincts, pour vérifier qu'ils traversent la migration intacts). */
    const jeanJauresLieu = () => ({
        id: 'lieu-jean-jaures', name: 'Jean-Jaurès', modules: [
            {
                id: 'module-eca-jja-ab', type: 'ECA', name: 'ECA Liaison A→B', line: 'B',
                data: { id: 'eca-ab', stationName: 'Jean-Jaurès', stationCode: 'JJA', ecas: [{
                    id: 'pmr17', name: 'Liaison A→B - PMR 17', accessPoint: 'Liaison A→B', type: REVERSIBLE, number: 17,
                    adhesives: { 'eca-1@ZH': 'OK', 'eca-1@ZB': 'Absent', 'eca-11': 'NotChecked', 'eca-10': 'NotApplicable' }, comment: 'témoin',
                }] },
            },
            {
                id: 'module-eca-jjb-ba', type: 'ECA', name: 'ECA Liaison B→A', line: 'B',
                data: { id: 'eca-ba', stationName: 'Jean-Jaurès', stationCode: 'JJB', ecas: [{
                    id: 'pmr8', name: 'Liaison B→A - PMR 8', accessPoint: 'Liaison B→A', type: REVERSIBLE, number: 8,
                    adhesives: { 'eca-1@ZH': 'NotChecked', 'eca-1@ZB': 'ToBeReplaced', 'eca-11': 'NotChecked' }, comment: '',
                }] },
            },
        ],
    });

    const seedV21 = async (name: string, references: SignageReference[], lieux: any[] = []) => {
        const v21 = new Dexie(name);
        v21.version(21).stores(V21_STORES);
        await v21.open();
        if (references.length) await v21.table('signageReferences').bulkAdd(references);
        if (lieux.length) await v21.table('lieux').bulkAdd(lieux);
        v21.close();
    };

    it('complète le périmètre des 7 références sans toucher aux autres champs ni aux lieux', async () => {
        const name = uniqueDbName();
        const before = staleReferences();
        const lieu = jeanJauresLieu();
        await seedV21(name, before, [lieu]);

        const upgraded = createAuditDb(name);
        await upgraded.open();
        const after = await upgraded.table('signageReferences').toArray() as SignageReference[];

        expect(after).toHaveLength(before.length);
        for (const ref of after) {
            const old = before.find(r => r.id === ref.id)!;
            if (!TARGET_IDS.includes(ref.id)) {
                expect(ref).toEqual(old);
                continue;
            }
            const oldTypes = (old.scope as { equipmentTypes: EcaEquipmentType[] }).equipmentTypes;
            expect(ref.scope).toEqual({ ...old.scope, equipmentTypes: [...oldTypes, REVERSIBLE] });
            expect({ ...ref, scope: undefined }).toEqual({ ...old, scope: undefined });
        }
        expect(await upgraded.table('lieux').get('lieu-jean-jaures')).toEqual(lieu);

        upgraded.close();
        await Dexie.delete(name);
    });

    it('est idempotente : une réouverture ne rajoute jamais le type', async () => {
        const name = uniqueDbName();
        await seedV21(name, staleReferences());

        const first = createAuditDb(name);
        await first.open();
        const afterFirst = await first.table('signageReferences').toArray();
        first.close();

        const second = createAuditDb(name);
        await second.open();
        const afterSecond = await second.table('signageReferences').toArray() as SignageReference[];
        expect(afterSecond).toEqual(afterFirst);
        for (const id of TARGET_IDS) {
            const types = (afterSecond.find(r => r.id === id)!.scope as { equipmentTypes: EcaEquipmentType[] }).equipmentTypes;
            expect(types.filter(t => t === REVERSIBLE)).toHaveLength(1);
        }

        second.close();
        await Dexie.delete(name);
    });

    it('ne modifie rien sur un référentiel déjà à jour', async () => {
        const name = uniqueDbName();
        const upToDate = buildSignageReferencesSeed();
        await seedV21(name, upToDate);

        const upgraded = createAuditDb(name);
        await upgraded.open();
        const after = await upgraded.table('signageReferences').toArray() as SignageReference[];
        expect([...after].sort((a, b) => a.id.localeCompare(b.id)))
            .toEqual([...upToDate].sort((a, b) => a.id.localeCompare(b.id)));

        upgraded.close();
        await Dexie.delete(name);
    });

    it("n'écrit rien sur une table jamais seedée", async () => {
        const name = uniqueDbName();
        await seedV21(name, []);

        const upgraded = createAuditDb(name);
        await upgraded.open();
        expect(await upgraded.table('signageReferences').count()).toBe(0);

        upgraded.close();
        await Dexie.delete(name);
    });

    it('conserve un périmètre enrichi localement et ajoute seulement le type manquant', async () => {
        const name = uniqueDbName();
        const references = staleReferences().map(ref => ref.id === 'eca-5' && ref.scope.auditType === 'ECA'
            ? { ...ref, scope: { ...ref.scope, equipmentTypes: [...ref.scope.equipmentTypes!, EcaEquipmentType.PMRBras] } }
            : ref);
        await seedV21(name, references);

        const upgraded = createAuditDb(name);
        await upgraded.open();
        const eca5 = await upgraded.table('signageReferences').get('eca-5') as SignageReference;
        expect(eca5.scope).toEqual({
            auditType: 'ECA',
            equipmentTypes: [EcaEquipmentType.PMRVantaux, EcaEquipmentType.PMRBras, REVERSIBLE],
        });

        upgraded.close();
        await Dexie.delete(name);
    });

    it('index ECA : les deux ECA réversibles de Jean-Jaurès retrouvent eca-1 en ZH + ZB, statuts intacts', async () => {
        const name = uniqueDbName();
        const lieu = jeanJauresLieu();
        const stale = staleReferences();
        await seedV21(name, stale, [lieu]);

        const eca1Of = (refs: SignageReference[], lieux: any[]) => buildPatrimoineIndex(lieux, refs).implantations
            .filter(i => i.referenceId === 'eca-1')
            .map(i => [i.line, i.lieuName, i.context, i.equipmentLabel, i.zone, i.status]);

        // Avant : le périmètre persistant exclut ces ECA — aucune occurrence.
        expect(eca1Of(stale, [lieu])).toEqual([]);

        const upgraded = createAuditDb(name);
        await upgraded.open();
        const refs = await upgraded.table('signageReferences').toArray() as SignageReference[];
        const lieux = await upgraded.table('lieux').toArray();
        expect(lieux).toEqual([lieu]);

        expect(eca1Of(refs, lieux)).toEqual([
            ['B', 'Jean-Jaurès', 'Liaison A→B', 'Liaison A→B - PMR 17', 'ZH', 'OK'],
            ['B', 'Jean-Jaurès', 'Liaison A→B', 'Liaison A→B - PMR 17', 'ZB', 'Absent'],
            ['B', 'Jean-Jaurès', 'Liaison B→A', 'Liaison B→A - PMR 8', 'ZH', 'NotChecked'],
            ['B', 'Jean-Jaurès', 'Liaison B→A', 'Liaison B→A - PMR 8', 'ZB', 'ToBeReplaced'],
        ]);
        // Même résultat que le référentiel d'une base neuve.
        expect(eca1Of(refs, lieux)).toEqual(eca1Of(buildSignageReferencesSeed(), lieux));

        upgraded.close();
        await Dexie.delete(name);
    });
});

describe('Migration V22 → V23 (réparation d\'un référentiel écrasé par un ancien import : V19/V20/V21)', () => {
    const V22_STORES = {
        lieux: 'id, name',
        history: '++id, date, type, categoryKey',
        signageReferences: 'id, auditType',
        events: '++id, date, type, entityType',
    };
    const PDQ_IDS = ['pdq-78x100', 'pdq-78x120', 'pdq-adhesif', 'pem3d-120x80'];
    const byId = (refs: SignageReference[]) => [...refs].sort((a, b) => a.id.localeCompare(b.id));

    /** Référentiel tel que restauré par une sauvegarde antérieure à V19 :
     *  fiches PDQ/PEM 3D d'origine, adca12 active (avec une modification
     *  locale témoin), pas de pdq-78x120-dibond. */
    const oldReferences = (): SignageReference[] => buildSignageReferencesSeed()
        .filter(r => r.id !== 'pdq-78x120-dibond')
        .map(ref => {
            switch (ref.id) {
                case 'pdq-78x100': return { ...ref, legacyDescription: '78 x 100 cm | Métro A/B/C, Tram T1, Téléo — sans header ni footer. Jamais en version adhésive.' };
                case 'pdq-78x120': return { ...ref, legacyDescription: '78 x 120 cm | Métro A/B/C, Tram T1, Téléo — avec header et footer.' };
                case 'pdq-adhesif': {
                    const { dimensions: _d, ...rest } = ref;
                    return { ...rest, name: 'Plan de quartier (adhésif)', legacyDescription: "Version adhésive d'un Plan de quartier — jamais au format 78×100. Dimension précise non encore confirmée." };
                }
                case 'pem3d-120x80': return { ...ref, name: 'PEM 3D 120×80', legacyDescription: "120 x 80 cm | Pôles d'échange multimodaux — support Dibond exclusivement." };
                case 'adca12': {
                    const { isDisabled: _i, ...rest } = ref;
                    return { ...rest, material: 'Modification locale antérieure' };
                }
                default: return ref;
            }
        });

    /** Lieu témoin portant des occurrences des modèles réparés. */
    const terrainLieu = () => ({
        id: 'lieu-borderouge', name: 'Borderouge', modules: [{
            id: 'module-pdq-bor', type: 'PLAN_QUARTIER', name: 'Plans de quartier', line: 'B',
            data: { id: 'pdq-bor', stationName: 'Borderouge', stationCode: 'BOR', comment: '', occurrences: [
                { id: 'occ-dibond', modelId: 'pdq-78x120-dibond', location: 'P+R 2 — fixation sur grillage', status: 'ToBeReplaced', comment: 'témoin', constatedAt: '2026-09-01T00:00:00.000Z', discoveredAt: '2026-09-01T00:00:00.000Z' },
                { id: 'occ-adhesif', modelId: 'pdq-adhesif', location: 'Caisse auto CA01', status: 'OK', constatedAt: '2026-09-01T00:00:00.000Z', discoveredAt: '2026-09-01T00:00:00.000Z' },
            ] },
        }],
    });

    const seedV22 = async (name: string, references: SignageReference[], lieux: any[] = []) => {
        const v22 = new Dexie(name);
        v22.version(22).stores(V22_STORES);
        await v22.open();
        if (references.length) await v22.table('signageReferences').bulkAdd(references);
        if (lieux.length) await v22.table('lieux').bulkAdd(lieux);
        v22.close();
    };

    it('ancien référentiel : fiches PDQ/PEM 3D du seed, adca12 désactivée, pdq-78x120-dibond ajoutée, rien d\'autre modifié', async () => {
        const name = uniqueDbName();
        const before = oldReferences();
        await seedV22(name, before);

        const upgraded = createAuditDb(name);
        await upgraded.open();
        const after = await upgraded.table('signageReferences').toArray() as SignageReference[];
        const seed = new Map(buildSignageReferencesSeed().map(r => [r.id, r]));

        for (const id of PDQ_IDS) expect(after.find(r => r.id === id)).toEqual(seed.get(id));
        const adca12 = after.find(r => r.id === 'adca12')!;
        expect(adca12.isDisabled).toBe(true);
        expect(adca12.material).toBe('Modification locale antérieure'); // seul le drapeau change
        expect(after.filter(r => r.id === 'pdq-78x120-dibond')).toEqual([seed.get('pdq-78x120-dibond')]);

        const touched = new Set([...PDQ_IDS, 'adca12', 'pdq-78x120-dibond']);
        for (const ref of after.filter(r => !touched.has(r.id))) {
            expect(ref).toEqual(before.find(r => r.id === ref.id));
        }
        expect(after).toHaveLength(before.length + 1);

        upgraded.close();
        await Dexie.delete(name);
    });

    it('idempotente : une réouverture ne duplique ni ne modifie plus rien', async () => {
        const name = uniqueDbName();
        await seedV22(name, oldReferences());

        const first = createAuditDb(name);
        await first.open();
        const afterFirst = byId(await first.table('signageReferences').toArray());
        first.close();

        const second = createAuditDb(name);
        await second.open();
        expect(byId(await second.table('signageReferences').toArray())).toEqual(afterFirst);
        expect(await second.table('signageReferences').where('id').equals('pdq-78x120-dibond').count()).toBe(1);

        second.close();
        await Dexie.delete(name);
    });

    it('ne dégrade pas un référentiel déjà conforme', async () => {
        const name = uniqueDbName();
        const upToDate = buildSignageReferencesSeed();
        await seedV22(name, upToDate);

        const upgraded = createAuditDb(name);
        await upgraded.open();
        expect(byId(await upgraded.table('signageReferences').toArray())).toEqual(byId(upToDate));

        upgraded.close();
        await Dexie.delete(name);
    });

    it('table vide : aucune erreur, aucun référentiel reconstruit', async () => {
        const name = uniqueDbName();
        await seedV22(name, [], [terrainLieu()]);

        const upgraded = createAuditDb(name);
        await upgraded.open();
        expect(await upgraded.table('signageReferences').count()).toBe(0);

        upgraded.close();
        await Dexie.delete(name);
    });

    it('données terrain : lieux et occurrences strictement inchangés, désormais rattachés au référentiel', async () => {
        const name = uniqueDbName();
        const lieu = terrainLieu();
        await seedV22(name, oldReferences(), [lieu]);

        const upgraded = createAuditDb(name);
        await upgraded.open();
        expect(await upgraded.table('lieux').toArray()).toEqual([lieu]);

        const refs = await upgraded.table('signageReferences').toArray() as SignageReference[];
        const index = buildPatrimoineIndex([lieu] as any, refs);
        expect(index.byReference.get('pdq-78x120-dibond')?.installedCount).toBe(1);
        expect(index.bySupport.get('dibond')?.installed).toBe(1);

        upgraded.close();
        await Dexie.delete(name);
    });
});
