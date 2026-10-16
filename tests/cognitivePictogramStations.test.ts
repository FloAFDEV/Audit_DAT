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

describe('Mirail-Université et Arènes : libellé et dimension terrain', () => {
    it('Mirail : ancien accès renommé (statut conservé), idempotent ; Arènes : 2 pictos en 82x75.5cm', async () => {
        const { migrateCognitivePictogramAccessNames } = await import('../store');
        const { MIRAIL_COGNITIVE_ACCESS_NAME, MIRAIL_LEGACY_COGNITIVE_ACCESS_NAME } = await import('../data/cognitive_pictograms');
        const { AuditModuleType, FloorAdhesiveStatus } = await import('../types');
        const lieux = await generateInitialLieuxDataAsync();
        const mun = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS && (m.data as any).stationCode === 'MUN')!;
        const picto = (mun.data as any).pictograms[0];
        expect(picto.accessPointName).toBe(MIRAIL_COGNITIVE_ACCESS_NAME);
        picto.accessPointName = MIRAIL_LEGACY_COGNITIVE_ACCESS_NAME;
        picto.status = FloorAdhesiveStatus.OK;
        expect(migrateCognitivePictogramAccessNames(lieux)).toBe(true);
        expect(picto.accessPointName).toBe(MIRAIL_COGNITIVE_ACCESS_NAME);
        expect(picto.status).toBe(FloorAdhesiveStatus.OK);
        expect(migrateCognitivePictogramAccessNames(lieux)).toBe(false);
        const stations = cognitivePictogramStationsByInventoryRow(lieux);
        expect(stations.get('cog-picto-82x75.5cm')).toEqual([expect.objectContaining({ lieuName: 'Arènes', count: 2 })]);
    });
});

describe('François Verdier : pictos nommés de part et d\'autre de l\'avenue', () => {
    it('générés nommés et comptés ; anciens « Accès à définir » renommés (statut conservé)', async () => {
        const { migrateCognitivePictogramAccessNames } = await import('../store');
        const { FVE_COGNITIVE_ACCESS_NAMES } = await import('../data/cognitive_pictograms');
        const { AuditModuleType, FloorAdhesiveStatus } = await import('../types');
        const lieux = await generateInitialLieuxDataAsync();
        const fve = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS && (m.data as any).stationCode === 'FVE')!;
        const pictos = (fve.data as any).pictograms;
        expect(pictos.map((p: any) => p.accessPointName)).toEqual([...FVE_COGNITIVE_ACCESS_NAMES]);
        expect(cognitivePictogramStationsByInventoryRow(lieux).get('cog-picto-74.5x97cm')).toContainEqual(expect.objectContaining({ lieuName: 'François Verdier', count: 2 }));
        pictos[0].accessPointName = 'Accès à définir 1'; pictos[0].status = FloorAdhesiveStatus.ToBeReplaced;
        pictos[1].accessPointName = 'Accès à définir 2';
        expect(migrateCognitivePictogramAccessNames(lieux)).toBe(true);
        expect(pictos.map((p: any) => p.accessPointName)).toEqual([...FVE_COGNITIVE_ACCESS_NAMES]);
        expect(pictos[0].status).toBe(FloorAdhesiveStatus.ToBeReplaced);
    });
});
