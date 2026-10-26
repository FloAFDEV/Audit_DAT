// tests/catalogueConsistency.test.ts
// =================================================================
// R7 — cohérence du référentiel entre ses trois couches :
// data/adhesives.ts (catalogue statique : appartenance, ordre, noms) →
// data/signage_seed.ts (enregistrements SignageReference) → table Dexie
// signageReferences (peuplée depuis le seed, corrigée par les migrations de
// db.ts). Aucune donnée utilisateur lue, aucun accès réseau : la base est
// celle, neuve, de l'environnement de test (fake-indexeddb).
// =================================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../db';
import { ADHESIVES, getEcaAdhesives, getPrAdhesives } from '../data/adhesives';
import { buildSignageReferencesSeed, REFERENCES_MIGRATED_TO_PLAN_QUARTIER } from '../data/signage_seed';
import { PLAN_QUARTIER_INITIAL_INVENTORY } from '../data/planQuartierInitialInventory';
import { REFERENCE_VISUAL_IDS } from '../data/referenceVisuals';
import { EcaEquipmentType, EquipmentType } from '../types';

const SEED = buildSignageReferencesSeed();
const byId = new Map(SEED.map(r => [r.id, r]));

/** Catalogue statique : chaque adhésif une seule fois (premier rencontré). */
const staticCatalogue = () => {
    const map = new Map<string, { name: string; isDisabled?: boolean; family: string }>();
    const add = (family: string, list: { id: string; name: string; isDisabled?: boolean }[]) =>
        list.forEach(a => { if (!map.has(a.id)) map.set(a.id, { name: a.name, isDisabled: a.isDisabled, family }); });
    add('DAT', ADHESIVES);
    Object.values(EquipmentType).forEach(t => add('PR', getPrAdhesives(t)));
    Object.values(EcaEquipmentType).forEach(t => add('ECA', getEcaAdhesives(t)));
    return map;
};

describe('catalogue statique ↔ seed', () => {
    it('mêmes identifiants, noms, familles et désactivations ; 39 historiques + 5 plans de quartier = 44', () => {
        const catalogue = staticCatalogue();
        const historical = SEED.filter(r => r.auditType !== 'PDQ');
        expect(catalogue.size).toBe(39);
        expect(historical.map(r => r.id).sort()).toEqual([...catalogue.keys()].sort());
        for (const r of historical) {
            const c = catalogue.get(r.id)!;
            expect([r.id, r.name, r.auditType, !!r.isDisabled]).toEqual([r.id, c.name, c.family, !!c.isDisabled]);
        }
        expect(SEED.filter(r => r.auditType === 'PDQ')).toHaveLength(5);
        expect(SEED).toHaveLength(44);
    });

    it('identifiants uniques ; liens sameAs / pairedWith résolus et réciproques ; règles de désactivation tenues', () => {
        expect(new Set(SEED.map(r => r.id)).size).toBe(SEED.length);
        for (const r of SEED) {
            for (const other of r.sameAs ?? []) {
                expect(byId.has(other)).toBe(true);
                expect(byId.get(other)!.sameAs ?? []).toContain(r.id);
            }
            if (r.pairedWith) expect(byId.get(r.pairedWith)?.pairedWith).toBe(r.id);
            if (r.arbitrage?.status === 'remove') expect(r.isDisabled).toBe(true);
        }
        // Patrimoine migré : référence conservée mais désactivée ici.
        for (const id of REFERENCES_MIGRATED_TO_PLAN_QUARTIER) expect(byId.get(id)?.isDisabled).toBe(true);
    });

    it('plans de quartier initiaux : chaque modèle existe au référentiel', () => {
        for (const e of PLAN_QUARTIER_INITIAL_INVENTORY) expect([e.modelId, byId.get(e.modelId)?.auditType]).toEqual([e.modelId, 'PDQ']);
    });

    it('visuels : tout id illustré est une référence ou un élément hors catalogue connu', () => {
        const NON_CATALOGUE = ['plan-pr-BE', 'plan-pr-BS', 'plan-pr-CA', 'pmr-sol', 'sign-plan-quartier-tram', 'bandeau-t1-meett', 'bandeau-t1-pdj'];
        for (const id of REFERENCE_VISUAL_IDS) expect([id, byId.has(id) || NON_CATALOGUE.includes(id)]).toEqual([id, true]);
    });

    it('migrations db.ts : tout identifiant de référence qu\'elles réécrivent existe au seed', () => {
        const source = readFileSync(join(__dirname, '..', 'db.ts'), 'utf8');
        const ids = new Set([...source.matchAll(/'((?:ad\d+|adb[es]\d+|adca\d+|eca-[\w-]+|pdq-[\w-]+|pem3d-[\w-]+))'/g)].map(m => m[1]));
        expect(ids.size).toBeGreaterThan(10);
        for (const id of ids) expect([id, byId.has(id)]).toEqual([id, true]);
    });
});

describe('seed ↔ Dexie (base neuve)', () => {
    it('la table signageReferences d\'une base neuve est exactement le seed', async () => {
        const stored = await db.signageReferences.toArray();
        const sort = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
        expect(sort(stored)).toEqual(sort(SEED));
    });
});
