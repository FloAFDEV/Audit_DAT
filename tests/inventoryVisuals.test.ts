// tests/inventoryVisuals.test.ts
// Aperçus de l'Inventaire détaillé : uniquement les visuels réellement
// présents dans public/references, jamais un chemin inventé.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { getInventoryVisualReferenceId, getReferenceVisualUrl } from '../data/referenceVisuals';

describe('Aperçus visuels de l\'Inventaire détaillé', () => {
    it('chaque ligne avec aperçu pointe vers un fichier existant ; liste attendue exacte', async () => {
        const inventory = computeAdhesiveInventory(await generateInitialLieuxDataAsync(), buildSignageReferencesSeed());
        const withVisual = inventory.filter(i => getReferenceVisualUrl(getInventoryVisualReferenceId(i.id)));
        for (const item of withVisual) {
            const url = getReferenceVisualUrl(getInventoryVisualReferenceId(item.id))!;
            expect(existsSync(join(__dirname, '..', 'public', url))).toBe(true);
        }
        const ids = new Set(withVisual.map(i => i.id));
        for (const id of ['ad1', 'ad2', 'ad3', 'ad4', 'ad5', 'ad6', 'ad7', 'ad8', 'ad10', 'ad11',
            'eca-1', 'eca-2', 'eca-3', 'eca-4', 'eca-5', 'eca-6', 'eca-7', 'eca-8', 'eca-9', 'eca-10',
            'adbe1', 'adbe2', 'adbs2', 'adbe3', 'adbs3', 'adbs4', 'adbs5', 'adbe10', 'adbs11', 'adca6', 'adca7', 'adca8', 'adca9',
            'pdq-78x100', 'pdq-78x120', 'pdq-adhesif', 'pdq-78x120-dibond', 'pem3d-120x80', 'sign-plan-quartier-tram']) {
            expect(ids.has(id)).toBe(true);
        }
        expect(inventory.filter(i => i.id.startsWith('pmr-sol-')).every(i => ids.has(i.id))).toBe(true);
        for (const item of inventory.filter(i => /^(adca(?![6789]$)|cog-picto-|sign-(?!plan-quartier-tram))/.test(i.id) || ['ad9', 'ad12'].includes(i.id))) {
            expect(ids.has(item.id)).toBe(false);
        }
    });
});
