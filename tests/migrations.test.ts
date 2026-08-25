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
