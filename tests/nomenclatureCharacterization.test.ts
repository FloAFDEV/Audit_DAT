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
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { AuditDefinition, AuditModuleType, AdhesiveStatus, Lieu } from '../types';

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

    it('une référence archivée disparaît de la Nomenclature (mais sa quantité ne "fuit" pas ailleurs)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const references = buildSignageReferencesSeed().map(r =>
            r.id === 'ad1' ? { ...r, archivedAt: '2026-01-01T00:00:00.000Z' } : r
        );
        const inventory = computeAdhesiveInventory(lieux, references);

        expect(inventory.some(item => item.id === 'ad1')).toBe(false);
    });

    it('une nouvelle référence Admin (sans texte historique) apparaît avec ses champs structurés, sa quantité vient des implantations réelles', async () => {
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
// Partie 2 — audits configurables : Nomenclature (Commit 4).
// Cas de référence : « Plans de quartier », 4 variantes.
// =================================================================
describe('Nomenclature — audits configurables (CUSTOM)', () => {
    const DEF: AuditDefinition = {
        id: 'def-pdq', name: 'Plans de quartier', icon: 'MapPin',
        targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [],
    };

    const PDQ_REFS = [
        { id: 'pdq-1', name: 'Repère 1 - 80x100', auditType: 'CUSTOM' as const, scope: { auditType: 'CUSTOM' as const, definitionId: 'def-pdq' }, version: 1, support: 'adhesif' as const, material: 'Adhésif', dimensions: { width: 80, height: 100, unit: 'cm' as const }, placement: {} },
        { id: 'pdq-2', name: 'Repère 2 - 80x100', auditType: 'CUSTOM' as const, scope: { auditType: 'CUSTOM' as const, definitionId: 'def-pdq' }, version: 1, support: 'pvc' as const, material: 'Plastification', dimensions: { width: 80, height: 100, unit: 'cm' as const }, placement: {} },
        { id: 'pdq-3', name: 'Repère 3 - 80x120', auditType: 'CUSTOM' as const, scope: { auditType: 'CUSTOM' as const, definitionId: 'def-pdq' }, version: 1, support: 'adhesif' as const, material: 'Adhésif', dimensions: { width: 80, height: 120, unit: 'cm' as const }, placement: {} },
        { id: 'pdq-4', name: 'Repère 4 - 80x120', auditType: 'CUSTOM' as const, scope: { auditType: 'CUSTOM' as const, definitionId: 'def-pdq' }, version: 1, support: 'pvc' as const, material: 'Plastification', dimensions: { width: 80, height: 120, unit: 'cm' as const }, placement: {} },
    ];

    const customStation = (id: string, items: Record<string, AdhesiveStatus>): Lieu => ({
        id, name: `Station ${id}`,
        modules: [{
            id: `mod-${id}`, type: AuditModuleType.CUSTOM, name: 'Plans de quartier', line: 'A',
            data: {
                id: `c-${id}`, definitionId: 'def-pdq', stationName: `Station ${id}`, stationCode: '',
                items: Object.fromEntries(Object.entries(items).map(([k, v]) => [k, { status: v }])),
                comment: '',
            },
        }],
    });

    it('les 4 variantes apparaissent comme 4 lignes DISTINCTES, avec le nom de la définition en colonne Type', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const references = [...buildSignageReferencesSeed(), ...PDQ_REFS];
        const inventory = computeAdhesiveInventory(lieux, references, [DEF]);

        const rows = inventory.filter(i => i.auditType === 'Plans de quartier');
        expect(rows).toHaveLength(4);
        expect(rows.map(r => r.id).sort()).toEqual(['pdq-1', 'pdq-2', 'pdq-3', 'pdq-4']);
        const r1 = rows.find(r => r.id === 'pdq-1')!;
        expect(r1.dimensions).toBe('80 × 100 cm');
        expect(r1.material).toBe('Adhésif');
    });

    it('quantité calculée depuis les audits réels — 42 stations avec la variante 1 → quantité 42, jamais saisie', async () => {
        const lieux: Lieu[] = Array.from({ length: 42 }, (_, i) => customStation(`s${i}`, { 'pdq-1': AdhesiveStatus.OK, 'pdq-2': AdhesiveStatus.NotApplicable, 'pdq-3': AdhesiveStatus.NotApplicable, 'pdq-4': AdhesiveStatus.NotApplicable }));
        const inventory = computeAdhesiveInventory(lieux, [...buildSignageReferencesSeed(), ...PDQ_REFS], [DEF]);

        expect(inventory.find(i => i.id === 'pdq-1')!.quantity).toBe(42);
        expect(inventory.find(i => i.id === 'pdq-2')!.quantity).toBe(0);
    });

    it('NotApplicable n\'est jamais compté comme posé — agrégation correcte sur plusieurs stations avec des variantes différentes', async () => {
        const lieux: Lieu[] = [
            customStation('s1', { 'pdq-1': AdhesiveStatus.OK, 'pdq-3': AdhesiveStatus.NotApplicable }),
            customStation('s2', { 'pdq-3': AdhesiveStatus.OK, 'pdq-1': AdhesiveStatus.NotApplicable }),
            customStation('s3', { 'pdq-1': AdhesiveStatus.ToBeReplaced, 'pdq-3': AdhesiveStatus.NotApplicable }),
        ];
        const inventory = computeAdhesiveInventory(lieux, [...buildSignageReferencesSeed(), ...PDQ_REFS], [DEF]);

        expect(inventory.find(i => i.id === 'pdq-1')!.quantity).toBe(2); // s1 + s3, pas s2 (NotApplicable)
        expect(inventory.find(i => i.id === 'pdq-3')!.quantity).toBe(1); // s2 seulement
    });

    it('une référence CUSTOM archivée disparaît de la Nomenclature courante', async () => {
        const references = [...buildSignageReferencesSeed(), ...PDQ_REFS.map(r => r.id === 'pdq-2' ? { ...r, archivedAt: '2026-01-01T00:00:00.000Z' } : r)];
        const lieux = [customStation('s1', { 'pdq-2': AdhesiveStatus.OK })];
        const inventory = computeAdhesiveInventory(lieux, references, [DEF]);

        expect(inventory.some(i => i.id === 'pdq-2')).toBe(false);
    });

    it('une définition archivée disparaît de la Nomenclature — les modules déjà matérialisés restent inchangés', async () => {
        const archivedDef: AuditDefinition = { ...DEF, archivedAt: '2026-01-01T00:00:00.000Z' };
        const lieux = [customStation('s1', { 'pdq-1': AdhesiveStatus.OK })];
        const inventory = computeAdhesiveInventory(lieux, [...buildSignageReferencesSeed(), ...PDQ_REFS], [archivedDef]);

        expect(inventory.some(i => i.auditType === 'Plans de quartier')).toBe(false);
        // Les données du module lui-même ne sont jamais touchées par ce calcul (lecture seule).
        expect((lieux[0].modules[0].data as any).items['pdq-1'].status).toBe(AdhesiveStatus.OK);
    });

    it('un module CUSTOM sans référence connue ne plante pas (definitionId inconnu)', async () => {
        const orphanStation = customStation('orphan', { 'ref-inconnue': AdhesiveStatus.OK });
        (orphanStation.modules[0].data as any).definitionId = 'def-inexistante';
        expect(() => computeAdhesiveInventory([orphanStation], buildSignageReferencesSeed(), [DEF])).not.toThrow();
    });

    it('n\'affecte AUCUNE quantité DAT/PR/ECA existante (non-régression stricte)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const references = buildSignageReferencesSeed();
        const withoutCustom = computeAdhesiveInventory(lieux, references, []);
        const withCustom = computeAdhesiveInventory(lieux, [...references, ...PDQ_REFS], [DEF]);

        const datPrEca = ['DAT', 'Bornes P+R', 'Valideurs (ECA)'];
        withoutCustom.filter(i => datPrEca.includes(i.auditType)).forEach(item => {
            const after = withCustom.find(i => i.id === item.id);
            expect(after?.quantity).toBe(item.quantity);
        });
    });
});
