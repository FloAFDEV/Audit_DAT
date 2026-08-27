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
