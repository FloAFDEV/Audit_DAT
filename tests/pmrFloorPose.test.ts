// tests/pmrFloorPose.test.ts
// Référentiel → « + Adhésifs PMR au sol » : mêmes exemplaires que
// l'inventaire (périmètre, modules « sans objet » exclus, matière attribuée),
// restitués dans le CSV de pose après les implantations de chaque ligne.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { pmrFloorPoseItems, PMR_FLOOR_DIMENSIONS } from '../utils/cockpit/pmrFloorPose';
import { buildPoseRows, PMR_FLOOR_POSE_FAMILY } from '../components/cockpit/implantationsExportRows';
import { getReferenceVisualUrl } from '../data/referenceVisuals';
import { Lieu } from '../types';

let lieux: Lieu[];
beforeAll(async () => { lieux = await generateInitialLieuxDataAsync(); });

describe('Adhésifs PMR au sol dans la sélection du Référentiel', () => {
    it('autant d\'exemplaires que l\'inventaire, matière par matière', () => {
        const items = pmrFloorPoseItems(lieux);
        expect(items.length).toBeGreaterThan(0);
        const inventory = computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).filter(i => i.id.startsWith('pmr-sol-'));
        expect(items.length).toBe(inventory.reduce((sum, i) => sum + i.quantity, 0));
        for (const row of inventory) {
            const count = items.filter(i => (i.material ?? row.material) === row.material && (i.material !== null || row.id === 'pmr-sol-matiere-non-renseignee')).length;
            expect(count, row.material).toBe(row.quantity);
        }
    });

    it('le module « sans objet » de Jean-Jaurès (accès historique) n\'apporte aucun exemplaire', () => {
        const jj = pmrFloorPoseItems(lieux).filter(i => i.lieuName === 'Jean-Jaurès');
        expect(jj.length).toBeGreaterThan(0);
        expect(jj.some(i => /historique/i.test(i.accessLabel))).toBe(false);
    });

    it('filtre par ligne et lignes de pose sans référence fictive', () => {
        const lineA = pmrFloorPoseItems(lieux, new Set(['A']));
        expect(lineA.length).toBeGreaterThan(0);
        expect(lineA.every(i => i.line === 'A')).toBe(true);
        const rows = buildPoseRows([], new Map(), [], lineA);
        expect(rows).toHaveLength(lineA.length);
        expect(rows.every(r => r.family === PMR_FLOOR_POSE_FAMILY && r.reference === '' && r.dimensions === PMR_FLOOR_DIMENSIONS && r.quantity === 1)).toBe(true);
        const capitole = rows.filter(r => r.station === 'Capitole');
        expect(capitole.map(r => r.location)).toEqual(['']); // un seul accès : module générique
        expect(capitole[0].designation).toContain('Ultra Protect');
        expect(rows[0].visual).toContain(getReferenceVisualUrl('pmr-sol')!.split('/').pop()!);
    });
});
