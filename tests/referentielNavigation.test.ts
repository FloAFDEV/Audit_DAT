// tests/referentielNavigation.test.ts
// Référentiel — bouton « Voir les implantations » : périmètre stable
// (sélection, sinon lignes affichées, sinon désactivé), sélection explicite
// jamais modifiée, exports = périmètre affiché, visuels non répétés.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { resolveViewScope, viewScopeButtonLabel } from '../utils/cockpit/viewScope';
import { buildFamilyElements, selectFamilyPose, isSelectableFamily, FamilyElement } from '../utils/cockpit/familyElements';
import { pmrFloorPoseItems } from '../utils/cockpit/pmrFloorPose';
import { cognitivePictogramPoseItems } from '../utils/cockpit/cognitivePictogramSummary';
import { buildPoseRows } from '../components/cockpit/implantationsExportRows';
import { buildPoseCsv, PoseRow } from '../utils/cockpit/poseExport';
import { sharedVisualKey } from '../components/cockpit/PoseRowsTree';
import { Lieu } from '../types';

let lieux: Lieu[];
let elements: FamilyElement[];
beforeAll(async () => {
    lieux = await generateInitialLieuxDataAsync();
    elements = buildFamilyElements(computeAdhesiveInventory(lieux, buildSignageReferencesSeed()), pmrFloorPoseItems(lieux), cognitivePictogramPoseItems(lieux));
});

describe('Périmètre du bouton', () => {
    it('sélection explicite prioritaire, sinon lignes affichées, sinon aucun (bouton désactivé)', () => {
        expect(resolveViewScope(new Set(['ad1']), ['ad1', 'ad2'])).toEqual({ source: 'selection', ids: ['ad1'] });
        expect(resolveViewScope(new Set(), ['ad1', 'ad2'])).toEqual({ source: 'visible', ids: ['ad1', 'ad2'] });
        expect(resolveViewScope(new Set(), [])).toBeNull();
    });

    it('un seul élément sélectionné : même vue (périmètre « sélection »), jamais un cas à part', () => {
        expect(resolveViewScope(new Set(['ad1']), [])).toEqual({ source: 'selection', ids: ['ad1'] });
    });

    it('libellé : lignes (références ou éléments), jamais un nombre d\'implantations', () => {
        expect(viewScopeButtonLabel({ source: 'selection', ids: ['a', 'b'] })).toBe('Voir les implantations · sélection (2)');
        expect(viewScopeButtonLabel({ source: 'visible', ids: ['a', 'b', 'c'] })).toBe('Voir les implantations · liste affichée (3)');
        expect(viewScopeButtonLabel(null)).toBe('Voir les implantations');
    });

    it('ouvrir depuis le filtre ne modifie jamais la sélection explicite', () => {
        const selected = new Set<string>();
        const visible = ['ad1', 'ad2'];
        const scope = resolveViewScope(selected, visible)!;
        scope.ids.push('autre');
        expect(selected.size).toBe(0);
        expect(visible).toEqual(['ad1', 'ad2']);
        const explicit = new Set(['ad1']);
        resolveViewScope(explicit, ['ad1', 'ad2'])!.ids.push('x');
        expect([...explicit]).toEqual(['ad1']);
    });
});

describe('Exports = périmètre affiché', () => {
    it('filtre « Pictogrammes cognitifs » sans sélection : mêmes exemplaires et même CSV que l\'ancienne option globale', () => {
        const visible = elements.filter(e => e.family === 'COG' && isSelectableFamily(e.family)).map(e => e.id);
        const scope = resolveViewScope(new Set(), visible)!;
        const pose = selectFamilyPose(new Set(scope.ids), pmrFloorPoseItems(lieux), cognitivePictogramPoseItems(lieux));
        expect(pose.cognitive).toEqual(cognitivePictogramPoseItems(lieux));
        expect(pose.pmrFloor).toEqual([]);
        expect(buildPoseCsv(buildPoseRows([], new Map(), pose.cognitive, pose.pmrFloor)))
            .toBe(buildPoseCsv(buildPoseRows([], new Map(), cognitivePictogramPoseItems(lieux), [])));
    });

    it('sélection existante puis changement de filtre : le périmètre reste la sélection', () => {
        const pmrIds = elements.filter(e => e.family === 'PMR').map(e => e.id);
        const selected = new Set([pmrIds[0]]);
        const visibleCognitive = elements.filter(e => e.family === 'COG').map(e => e.id);
        const scope = resolveViewScope(selected, visibleCognitive)!;
        expect(scope).toEqual({ source: 'selection', ids: [pmrIds[0]] });
        const pose = selectFamilyPose(new Set(scope.ids), pmrFloorPoseItems(lieux), cognitivePictogramPoseItems(lieux));
        expect(pose.cognitive).toEqual([]);
        expect(pose.pmrFloor.length).toBe(elements.find(e => e.id === pmrIds[0])!.quantity);
    });

    it('équipements station jamais dans un périmètre d\'export', () => {
        expect(isSelectableFamily('SIG')).toBe(false);
    });
});

describe('Visuels non répétés', () => {
    const row = (station: string, location: string): PoseRow => ({
        line: 'A', station, family: 'Pictogramme cognitif', equipment: '', location, zone: '', reference: '',
        designation: 'Pictogramme cognitif', dimensions: '20 × 20 cm', quantity: 1, visual: '',
    });
    const codes: Record<string, string | undefined> = { Capitole: 'CAP', Jolimont: undefined };
    const key = (r: PoseRow) => codes[r.station];

    it('visuel partagé par tous les accès d\'une station : affiché une seule fois, au niveau station', () => {
        expect(sharedVisualKey([row('Capitole', 'Accès 1'), row('Capitole', 'Accès 2')], key)).toBe('CAP');
    });
    it('aucun visuel connu ou visuels différents : rien au niveau station', () => {
        expect(sharedVisualKey([row('Jolimont', 'Accès 1')], key)).toBeNull();
        expect(sharedVisualKey([row('Capitole', 'A'), { ...row('Capitole', 'B'), station: 'Jolimont' }], key)).toBeNull();
    });
});
