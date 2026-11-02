// tests/referentielFamilies.test.ts
// Référentiel — familles hors catalogue (PMR au sol par matière,
// pictogrammes cognitifs par dimension) : quantités = Inventaire détaillé,
// sélection globale / unitaire / multiple / mixte, CSV de pose inchangé.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { pmrFloorPoseItems } from '../utils/cockpit/pmrFloorPose';
import { cognitivePictogramPoseItems } from '../utils/cockpit/cognitivePictogramSummary';
import {
    buildFamilyElements, splitSelection, selectFamilyPose, selectionLabel, elementFamilyOf, FamilyElement,
} from '../utils/cockpit/familyElements';
import { buildPoseRows } from '../components/cockpit/implantationsExportRows';
import { buildPoseCsv, POSE_CSV_COLUMNS } from '../utils/cockpit/poseExport';
import { Lieu, SignageReference } from '../types';

let lieux: Lieu[];
let refs: SignageReference[];
let elements: FamilyElement[];
const pmrAll = () => pmrFloorPoseItems(lieux);
const cogAll = () => cognitivePictogramPoseItems(lieux);

beforeAll(async () => {
    lieux = await generateInitialLieuxDataAsync();
    refs = buildSignageReferencesSeed();
    elements = buildFamilyElements(computeAdhesiveInventory(lieux, refs), pmrAll(), cogAll());
});

describe('Quantités des éléments hors catalogue', () => {
    it('un élément par ligne d\'inventaire PMR / pictogramme, même quantité que l\'Inventaire détaillé', () => {
        const inventory = computeAdhesiveInventory(lieux, refs).filter(r => ['PMR', 'COG'].includes(elementFamilyOf(r.id) ?? ''));
        expect(elements.map(e => [e.id, e.quantity])).toEqual(inventory.map(r => [r.id, r.quantity]));
        expect(elements.some(e => e.family === 'PMR')).toBe(true);
        expect(elements.some(e => e.family === 'COG')).toBe(true);
    });

    it('les implantations d\'un élément sont exactement ses exemplaires (somme = total de la famille)', () => {
        for (const element of elements) {
            const pose = selectFamilyPose(new Set([element.id]), pmrAll(), cogAll());
            expect(pose.pmrFloor.length + pose.cognitive.length, element.id).toBe(element.quantity);
        }
        const sum = (f: string) => elements.filter(e => e.family === f).reduce((s, e) => s + e.quantity, 0);
        expect(sum('PMR')).toBe(pmrAll().length);
        expect(sum('COG')).toBe(cogAll().length);
    });

    it('stations et lignes d\'un élément PMR', () => {
        const ultra = elements.find(e => e.material?.includes('Ultra Protect'))!;
        expect(ultra.lieuCount).toBeGreaterThan(0);
        expect(ultra.lines.every(l => ['A', 'B', 'C', 'AEROPORT'].includes(l))).toBe(true);
    });
});

describe('Sélection', () => {
    const idsOf = (family: string) => elements.filter(e => e.family === family && e.quantity > 0).map(e => e.id);

    it('toute une famille = tous ses exemplaires, dans l\'ordre de la fonction de lecture', () => {
        const pose = selectFamilyPose(new Set(idsOf('PMR')), pmrAll(), cogAll());
        expect(pose.pmrFloor).toEqual(pmrAll());
        expect(pose.cognitive).toEqual([]);
        expect(selectionLabel(new Set(idsOf('PMR')), elements)).toBe('Adhésifs PMR au sol');
    });

    it('un seul élément, puis plusieurs', () => {
        const [first, second] = idsOf('COG');
        const one = selectFamilyPose(new Set([first]), pmrAll(), cogAll());
        expect(one.cognitive.length).toBe(elements.find(e => e.id === first)!.quantity);
        expect(selectionLabel(new Set([first]), elements)).toBe('1 dimension de pictogramme cognitif');
        const two = selectFamilyPose(new Set([first, second]), pmrAll(), cogAll());
        expect(two.cognitive.length).toBe(one.cognitive.length + elements.find(e => e.id === second)!.quantity);
    });

    it('familles mélangées et références catalogue dans une même sélection', () => {
        const ids = new Set(['ad1', 'adbe1', idsOf('PMR')[0], ...idsOf('COG')]);
        expect(splitSelection(ids)).toEqual({ referenceIds: ['ad1', 'adbe1'], elementIds: [idsOf('PMR')[0], ...idsOf('COG')] });
        expect(selectionLabel(ids, elements)).toBe('2 références + 1 matière d\'adhésif PMR au sol + pictogrammes cognitifs');
        const pose = selectFamilyPose(ids, pmrAll(), cogAll());
        expect(pose.pmrFloor.length).toBeGreaterThan(0);
        expect(pose.cognitive).toEqual(cogAll());
    });
});

describe('CSV de pose — format inchangé', () => {
    it('colonnes identiques ; famille entière sélectionnée = mêmes lignes qu\'avec l\'ancienne option globale', () => {
        expect(POSE_CSV_COLUMNS.map(c => c.header)).toEqual([
            'Ligne', 'Station', 'Famille', 'Équipement', 'Emplacement / direction', 'Zone', 'Référence', 'Désignation', 'Dimensions', 'Quantité', 'Visuel',
        ]);
        const all = new Set([...elements.map(e => e.id)]);
        const pose = selectFamilyPose(all, pmrAll(), cogAll());
        const refById = new Map(refs.map(r => [r.id, r]));
        expect(buildPoseCsv(buildPoseRows([], refById, pose.cognitive, pose.pmrFloor)))
            .toBe(buildPoseCsv(buildPoseRows([], refById, cogAll(), pmrAll())));
    });
});
