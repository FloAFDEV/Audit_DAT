// tests/detailCounts.test.ts
// Arbres ligne → station → détail : les compteurs sont des agrégations
// hiérarchiques (jamais des doublons). Un compteur détaillé n'est masqué que
// lorsqu'il est le seul de sa station (il répète alors le compteur station).
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { pmrFloorPoseItems } from '../utils/cockpit/pmrFloorPose';
import { cognitivePictogramPoseItems } from '../utils/cockpit/cognitivePictogramSummary';
import { buildPoseRows } from '../components/cockpit/implantationsExportRows';
import { groupAccesses } from '../components/cockpit/PoseRowsTree';
import { groupImplantationsByLocation, isDetailCountRedundant } from '../utils/cockpit/implantationsGrouping';
import { PoseRow } from '../utils/cockpit/poseExport';
import { Lieu } from '../types';

let lieux: Lieu[];
let pmrRows: PoseRow[];
let cogRows: PoseRow[];
beforeAll(async () => {
    lieux = await generateInitialLieuxDataAsync();
    pmrRows = buildPoseRows([], new Map(), [], pmrFloorPoseItems(lieux));
    cogRows = buildPoseRows([], new Map(), cognitivePictogramPoseItems(lieux), []);
});

const byStation = (rows: PoseRow[]) => {
    const map = new Map<string, PoseRow[]>();
    for (const r of rows) map.set(`${r.line}|${r.station}`, [...(map.get(`${r.line}|${r.station}`) ?? []), r]);
    return map;
};

describe('isDetailCountRedundant', () => {
    it('redondant seulement pour un détail unique', () => {
        expect(isDetailCountRedundant(0)).toBe(true);
        expect(isDetailCountRedundant(1)).toBe(true);
        expect(isDetailCountRedundant(2)).toBe(false);
    });
});

describe('PMR au sol et pictogrammes : agrégation par accès', () => {
    it('la somme des accès d\'une station est exactement son compteur (aucun doublon)', () => {
        for (const rows of [pmrRows, cogRows]) {
            for (const [key, stationRows] of byStation(rows)) {
                const groups = groupAccesses(stationRows);
                expect(groups.reduce((s, g) => s + g.count, 0), key).toBe(stationRows.length);
            }
        }
    });

    it('Basso Cambo (ligne A) : un seul emplacement, son compteur est masqué', () => {
        const groups = groupAccesses(byStation(pmrRows).get('A|Basso Cambo')!);
        expect(groups).toHaveLength(1);
        expect(groups[0].count).toBe(1);
        expect(isDetailCountRedundant(groups.length)).toBe(true);
    });

    it('station à plusieurs accès : chaque compteur est conservé', () => {
        const capitole = groupAccesses(byStation(cogRows).get('A|Capitole')!);
        expect(capitole.map(g => g.location)).toEqual(['Accès Capitole - Petit Modèle', 'Accès Capitole - Grand Modèle']);
        expect(isDetailCountRedundant(capitole.length)).toBe(false);
        const multi = [...byStation(pmrRows).values()].map(groupAccesses).find(g => g.length > 1);
        expect(multi, 'au moins une station PMR à plusieurs accès').toBeDefined();
        expect(isDetailCountRedundant(multi!.length)).toBe(false);
    });
});

describe('Implantations catalogue : agrégation par accès / liaison', () => {
    it('la somme des accès d\'une station est son compteur ; accès unique masqué, plusieurs conservés', () => {
        const index = buildPatrimoineIndex(lieux, buildSignageReferencesSeed());
        let single = 0;
        let multiple = 0;
        for (const line of groupImplantationsByLocation(index.implantations)) {
            for (const station of line.stations) {
                expect(station.contexts.reduce((s, c) => s + c.total, 0), station.stationName).toBe(station.total);
                if (isDetailCountRedundant(station.contexts.length)) {
                    single++;
                    expect(station.contexts[0].total).toBe(station.total);
                } else multiple++;
            }
        }
        expect(single).toBeGreaterThan(0);
        expect(multiple).toBeGreaterThan(0);
    });
});
