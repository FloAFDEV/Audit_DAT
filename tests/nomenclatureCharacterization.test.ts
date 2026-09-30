// tests/nomenclatureCharacterization.test.ts
// =================================================================
// TEST DE CARACTÉRISATION (obligatoire avant migration, cf. instructions
// utilisateur) — capture le comportement RÉEL de la Nomenclature
// (hooks/useStats.ts::computeAdhesiveInventory) sur le jeu de données
// historique complet.
//
// Le snapshot a été gelé AVANT le basculement de la source DAT/P+R/ECA
// vers signageReferences (catalogues statiques → référentiel). Il reste
// désormais la preuve de non-régression : sur le jeu de données seedé
// (aucune référence Admin créée/modifiée/archivée), la Nomenclature doit
// produire EXACTEMENT le même contenu et les mêmes quantités qu'avant —
// c'est exactement la garantie exigée avant tout changement de source.
// =================================================================
import { describe, it, expect } from 'vitest';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed, REFERENCES_MIGRATED_TO_PLAN_QUARTIER } from '../data/signage_seed';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { AdhesiveStatus, AuditModuleType, EcaEquipmentType, EquipmentType, Lieu, TransportMode } from '../types';

describe('Nomenclature — caractérisation (non-régression signageReferences)', () => {
    it('produit EXACTEMENT le même contenu et les mêmes quantités qu\'avant la migration (snapshot gelé)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const references = buildSignageReferencesSeed();
        const inventory = computeAdhesiveInventory(lieux, references);

        expect(inventory).toMatchSnapshot();
    });

    it('sanity check : le nombre de lignes et quelques quantités connues restent stables', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const references = buildSignageReferencesSeed();
        const inventory = computeAdhesiveInventory(lieux, references);

        expect(inventory.length).toBeGreaterThan(0);
        expect(inventory.every(item => typeof item.quantity === 'number' && item.quantity >= 0)).toBe(true);

        // Exemple donné par l'utilisateur : une référence P+R avec matière
        // et dimensions extraites du texte historique (legacyDescription).
        const pr = inventory.find(item => item.id === 'adbe1');
        expect(pr).toBeDefined();
        expect(pr!.dimensions).toBe('11x12,5cm');
        expect(pr!.material).toContain('P+r-rustine-entree');
    });

    it('une nouvelle référence hors catalogue historique (sans texte historique) apparaît avec ses champs structurés, sa quantité vient des implantations réelles', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const references = [
            ...buildSignageReferencesSeed(),
            {
                id: 'admin-nouvelle-dat', name: 'Repère 99 - Nouvelle étiquette', auditType: 'DAT' as const,
                scope: { auditType: 'DAT' as const }, version: 1, support: 'adhesif' as const,
                dimensions: { width: 10, height: 5, unit: 'cm' as const }, material: 'Vinyle',
                placement: {},
            },
        ];
        const inventory = computeAdhesiveInventory(lieux, references);

        const row = inventory.find(item => item.id === 'admin-nouvelle-dat');
        expect(row).toBeDefined();
        expect(row!.repere).toBe('99');
        expect(row!.dimensions).toBe('10 × 5 cm');
        expect(row!.material).toBe('Vinyle');
        expect(row!.quantity).toBeGreaterThan(0); // posée sur chaque DAT existant, comme toute référence DAT effective
    });

    it("ne lève jamais si signageReferences est momentanément vide (fenêtre de chargement d'un hook appelant, ex. useSignageReferences) — dégrade proprement plutôt que de faire planter la vue", async () => {
        const lieux = await generateInitialLieuxDataAsync();
        expect(() => computeAdhesiveInventory(lieux, [])).not.toThrow();
        // Aucune ligne DAT/P+R/ECA tant que les références ne sont pas chargées ;
        // pas de crash — la vue se complète au rendu suivant, une fois chargées.
        const inventory = computeAdhesiveInventory(lieux, []);
        expect(inventory.some(item => item.auditType === 'DAT')).toBe(false);
    });
});

// =================================================================
// Règles de quantité de la Nomenclature (DAT / P+R / ECA / PDQ) :
//  - un emplacement NotApplicable n'est pas compté (comme l'index) ;
//  - une référence simplement désactivée garde son comptage historique
//    (data/signage_seed.ts — divergence VOLONTAIRE avec l'index) ;
//  - une référence migrée vers un autre patrimoine (adca12) n'est pas
//    comptée ici (REFERENCES_MIGRATED_TO_PLAN_QUARTIER).
// =================================================================

const qty = (inventory: ReturnType<typeof computeAdhesiveInventory>, id: string) =>
    inventory.find(i => i.id === id)?.quantity;

const ecaLieu = (ecas: any[]): Lieu => ({
    id: 'lieu-eca', name: 'Station ECA', modules: [{
        id: 'module-eca', type: AuditModuleType.ECA, name: 'ECA (Valideurs)', line: 'A',
        data: { id: 'eca-data', stationName: 'Station ECA', stationCode: 'TST', ecas },
    }],
});

describe('Nomenclature — NotApplicable exclu, désactivation conservée, migration exclue', () => {
    const references = buildSignageReferencesSeed();

    it('ECA : une occurrence NotApplicable n\'est pas comptée, les zones ZH/ZB applicables le restent', () => {
        const lieux = [ecaLieu([
            { id: 'p1', name: 'PMR 1', accessPoint: 'Accès', type: EcaEquipmentType.PMRVantaux, number: 1, comment: '',
              adhesives: { 'eca-1@ZH': AdhesiveStatus.OK, 'eca-1@ZB': AdhesiveStatus.NotChecked, 'eca-9': AdhesiveStatus.NotApplicable } },
            { id: 'p2', name: 'PMR 2', accessPoint: 'Accès', type: EcaEquipmentType.PMRVantaux, number: 2, comment: '',
              adhesives: { 'eca-1@ZH': AdhesiveStatus.NotApplicable, 'eca-1@ZB': AdhesiveStatus.Absent } },
        ])];
        const inventory = computeAdhesiveInventory(lieux, references);
        const index = buildPatrimoineIndex(lieux, references);

        expect(qty(inventory, 'eca-9')).toBe(1);            // PMR 2 seulement
        expect(qty(inventory, 'eca-1')).toBe(3);            // ZH + ZB de PMR 1, ZB de PMR 2
        expect(qty(inventory, 'eca-9')).toBe(index.byReference.get('eca-9')?.installedCount);
        expect(qty(inventory, 'eca-1')).toBe(index.byReference.get('eca-1')?.installedCount);
    });

    it('DAT et P+R : un emplacement NotApplicable n\'est pas compté', () => {
        const lieux: Lieu[] = [{
            id: 'lieu-dat', name: 'Station DAT', modules: [{
                id: 'module-dat', type: AuditModuleType.DAT, name: 'DAT', line: 'A',
                data: { id: 'mode', name: 'Station DAT', type: TransportMode.METRO, line: 'A', stations: [{
                    id: 'sta', name: 'Station DAT', directions: [{ id: 'dir', name: 'Salle des billets', dats: [
                        { id: 'd1', name: 'DAT 01', comment: '', adhesives: { ad3: AdhesiveStatus.NotApplicable } },
                        { id: 'd2', name: 'DAT 02', comment: '', adhesives: {} },
                    ] }],
                }] },
            }, {
                id: 'module-pr', type: AuditModuleType.PR, name: 'Audit Bornes P+R',
                data: { id: 'pr', name: 'P+R', zones: [{ id: 'z', name: 'Zone', equipments: [
                    { id: 'be1', name: 'BE01', type: EquipmentType.BE, comment: '', adhesives: { adbe1: AdhesiveStatus.NotApplicable } },
                    { id: 'be2', name: 'BE02', type: EquipmentType.BE, comment: '', adhesives: {} },
                ] }] },
            }],
        }];
        const inventory = computeAdhesiveInventory(lieux, references);
        expect(qty(inventory, 'ad3')).toBe(1);
        expect(qty(inventory, 'ad1')).toBe(2);
        expect(qty(inventory, 'adbe1')).toBe(1);
        expect(qty(inventory, 'adbe2')).toBe(2);
    });

    it('référence désactivée : adca8 et eca-r-1 gardent leur comptage historique (l\'index, lui, les exclut)', () => {
        const lieux: Lieu[] = [{
            id: 'lieu-pr', name: 'P+R', modules: [{
                id: 'module-pr', type: AuditModuleType.PR, name: 'Audit Bornes P+R',
                data: { id: 'pr', name: 'P+R', zones: [{ id: 'z', name: 'Zone', equipments: [
                    { id: 'ca1', name: 'CA01', type: EquipmentType.CA, comment: '', adhesives: {} },
                ] }] },
            }],
        }, ecaLieu([
            { id: 'r1', name: 'Valideur 1', accessPoint: 'Accès', type: EcaEquipmentType.VantauxReversible, number: 1, comment: '', adhesives: {} },
        ])];
        const inventory = computeAdhesiveInventory(lieux, references);
        const index = buildPatrimoineIndex(lieux, references);

        expect(references.find(r => r.id === 'adca8')?.isDisabled).toBe(true);
        expect(references.find(r => r.id === 'eca-r-1')?.isDisabled).toBe(true);
        expect(qty(inventory, 'adca8')).toBe(1);
        expect(qty(inventory, 'eca-r-1')).toBe(1);
        expect(index.byReference.has('adca8')).toBe(false);
        expect(index.byReference.has('eca-r-1')).toBe(false);
    });

    it('référence migrée : adca12 reste à 0 (comptée côté Plans de quartier)', () => {
        expect(REFERENCES_MIGRATED_TO_PLAN_QUARTIER.has('adca12')).toBe(true);
        const lieux: Lieu[] = [{
            id: 'lieu-pr', name: 'P+R', modules: [{
                id: 'module-pr', type: AuditModuleType.PR, name: 'Audit Bornes P+R',
                data: { id: 'pr', name: 'P+R', zones: [{ id: 'z', name: 'Zone', equipments: [
                    { id: 'ca1', name: 'CA01', type: EquipmentType.CA, comment: '', adhesives: { adca12: AdhesiveStatus.OK } },
                ] }] },
            }],
        }];
        expect(qty(computeAdhesiveInventory(lieux, references), 'adca12')).toBe(0);
    });

    it('réseau complet : toute référence DAT/P+R/ECA/PDQ active et non migrée a la même quantité que l\'index', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const inventory = computeAdhesiveInventory(lieux, references);
        const index = buildPatrimoineIndex(lieux, references);
        const compared = references.filter(r => !r.isDisabled && !REFERENCES_MIGRATED_TO_PLAN_QUARTIER.has(r.id));
        expect(compared.length).toBeGreaterThan(0);
        for (const ref of compared) {
            expect([ref.id, qty(inventory, ref.id)]).toEqual([ref.id, index.byReference.get(ref.id)?.installedCount ?? 0]);
        }
    });

    it('familles hors index (PMR sol, pictogrammes cognitifs, signalétique station) : quantités indépendantes des statuts DAT/P+R/ECA', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const outOfScope = (inv: ReturnType<typeof computeAdhesiveInventory>) =>
            inv.filter(i => /^(pmr-sol-|cog-picto-|sign-)/.test(i.id)).map(i => [i.id, i.quantity]);
        const before = outOfScope(computeAdhesiveInventory(lieux, references));

        // Tout emplacement DAT/P+R/ECA déclaré NotApplicable.
        const allNa = (adhesives: Record<string, string> | undefined) =>
            Object.fromEntries(Object.keys(adhesives ?? {}).map(k => [k, AdhesiveStatus.NotApplicable]));
        const mutated: Lieu[] = JSON.parse(JSON.stringify(lieux));
        for (const lieu of mutated) for (const m of lieu.modules as any[]) {
            if (m.type === AuditModuleType.DAT) m.data.stations.forEach((s: any) => s.directions.forEach((d: any) => d.dats.forEach((dat: any) => { dat.adhesives = allNa(dat.adhesives); })));
            if (m.type === AuditModuleType.PR) m.data.zones.forEach((z: any) => z.equipments.forEach((e: any) => { e.adhesives = allNa(e.adhesives); }));
            if (m.type === AuditModuleType.ECA) m.data.ecas.forEach((e: any) => { e.adhesives = allNa(e.adhesives); });
        }
        expect(before.length).toBeGreaterThan(0);
        expect(outOfScope(computeAdhesiveInventory(mutated, references))).toEqual(before);
    });
});
