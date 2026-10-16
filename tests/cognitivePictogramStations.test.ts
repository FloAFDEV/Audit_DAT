// tests/cognitivePictogramStations.test.ts
// Stations derrière chaque ligne « Pictogramme cognitif » de l'Inventaire
// détaillé : la somme par station égale exactement la quantité de la ligne.
import { describe, it, expect } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { cognitivePictogramStationsByInventoryRow } from '../utils/cockpit/cognitivePictogramSummary';

describe('Pictogrammes cognitifs : stations par ligne d\'inventaire', () => {
    it('somme des stations = quantité de chaque ligne ; Mirail-Université seule en 80x80 (Totem)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const rows = computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).filter(i => i.id.startsWith('cog-picto-') && i.quantity > 0);
        const stations = cognitivePictogramStationsByInventoryRow(lieux);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect((stations.get(row.id) ?? []).reduce((s, e) => s + e.count, 0)).toBe(row.quantity);
        }
        expect([...stations.keys()].sort()).toEqual(rows.map(r => r.id).sort());
        expect(stations.get('cog-picto-80x80cm (Totem)')?.map(e => e.lieuName)).toEqual(['Mirail-Université']);
    });
});
