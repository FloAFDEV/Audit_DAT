// tests/poseExport.test.ts
// CSV de pose (SAE) : mêmes implantations, même ordre et mêmes quantités
// que l'export Excel (source commune), pictogrammes cognitifs inclus,
// échappement « ; » / UTF-8 avec BOM.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { buildPatrimoineIndex, ImplantationRef, PatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { selectionFromReferences } from '../utils/cockpit/selection';
import { buildPoseCsv, PoseRow, POSE_CSV_COLUMNS } from '../utils/cockpit/poseExport';
import { cognitivePictogramPoseItems } from '../utils/cockpit/cognitivePictogramSummary';
import { buildImplantationLineSheets, buildImplantationSyntheseRows, buildPoseRows, COGNITIVE_POSE_FAMILY } from '../components/cockpit/implantationsExportRows';
import { compareLines, displayReferenceName, exportZoneLabel, fieldDesignation, formatDimensions, validatorTypeLabel } from '../components/cockpit/labels';
import { sortByPhysicalStationOrder } from '../utils/cockpit/exportStationOrder';
import { getReferenceVisualUrl } from '../data/referenceVisuals';
import { AdhesiveStatus, AuditModuleType, Lieu, ModeData, SignageReference } from '../types';

let lieux: Lieu[];
let refs: SignageReference[];
let refById: Map<string, SignageReference>;
let index: PatrimoineIndex;

beforeAll(async () => {
    lieux = await generateInitialLieuxDataAsync();
    refs = buildSignageReferencesSeed();
    refById = new Map(refs.map(r => [r.id, r]));
    index = buildPatrimoineIndex(lieux, refs);
});

/** Sélection : références choisies puis lignes cochées (même filtre que la vue). */
const select = (ids: string[], lines?: string[]): ImplantationRef[] =>
    selectionFromReferences(index, ids, 'test').items.filter(i => !lines || lines.includes(i.line));
const poseRows = (items: ImplantationRef[], cognitive = [] as ReturnType<typeof cognitivePictogramPoseItems>) =>
    buildPoseRows(buildImplantationLineSheets(items, refById), refById, cognitive);
const parse = (csv: string) => csv.replace(/^﻿/, '').split('\r\n');

/** Construction des onglets Excel telle qu'écrite avant l'extraction
 *  (référence de non-régression). */
const legacyLineSheets = (items: ImplantationRef[]) => {
    const lines = [...new Set(items.map(i => i.line))].sort(compareLines);
    return lines.map(line => ({
        line,
        sheetName: line === 'P+R' ? 'P+R' : `Ligne ${line}`,
        rows: sortByPhysicalStationOrder(line, items.filter(i => i.line === line), i => i.lieuName).map(imp => {
            const ref = refById.get(imp.referenceId);
            return {
                station: imp.lieuName, context: imp.context, equipment: imp.equipmentLabel,
                validatorType: validatorTypeLabel(imp.equipmentType), reference: imp.referenceId,
                designation: ref ? fieldDesignation(ref) : imp.referenceId,
                catalogDesignation: ref ? displayReferenceName(ref) : imp.referenceId,
                zoneLabel: exportZoneLabel(imp.equipmentType, imp.zone),
                dimensions: ref ? formatDimensions(ref.dimensions) : '', quantity: 1,
            };
        }),
    }));
};

describe('CSV de pose — sélection', () => {
    it('1. une ligne + une référence', () => {
        const rows = poseRows(select(['ad1'], ['A']));
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every(r => r.line === 'A' && r.reference === 'ad1' && r.quantity === 1)).toBe(true);
        expect(rows.length).toBe(index.byReference.get('ad1')!.byLine.find(l => l.line === 'A')!.installed);
    });

    it('2. plusieurs lignes + une référence', () => {
        const rows = poseRows(select(['ad1'], ['A', 'B']));
        expect(new Set(rows.map(r => r.line))).toEqual(new Set(['A', 'B']));
        expect(rows.findIndex(r => r.line === 'B')).toBe(rows.filter(r => r.line === 'A').length);
    });

    it('3. plusieurs lignes + plusieurs références', () => {
        const rows = poseRows(select(['ad1', 'eca-1', 'adbe1'], ['A', 'B', 'P+R']));
        expect(new Set(rows.map(r => r.reference))).toEqual(new Set(['ad1', 'eca-1', 'adbe1']));
        expect(rows.every(r => ['A', 'B', 'P+R'].includes(r.line))).toBe(true);
    });

    it('4. sélection vide : en-tête seul', () => {
        const csv = buildPoseCsv(poseRows(select([])));
        expect(parse(csv)).toEqual([POSE_CSV_COLUMNS.map(c => c.header).join(';')]);
    });
});

describe('CSV de pose — cohérence avec l\'export Excel', () => {
    const ids = ['ad1', 'ad5', 'eca-1', 'adbe1', 'pdq-78x100'];

    it('5-6. mêmes lignes et même ordre que les onglets Excel', () => {
        const items = select(ids);
        const sheets = buildImplantationLineSheets(items, refById);
        const excelRows = sheets.flatMap(s => s.rows);
        const rows = poseRows(items);
        expect(rows.map(r => [r.station, r.location, r.equipment, r.reference, r.designation, r.dimensions, r.zone]))
            .toEqual(excelRows.map(r => [r.station, r.context, r.equipment, r.reference, r.designation, r.dimensions, r.zoneLabel]));
    });

    it('export Excel inchangé : onglets identiques à la construction d\'origine, Synthèse limitée aux lignes exportées', () => {
        const items = select(ids);
        expect(buildImplantationLineSheets(items, refById).map(({ line, sheetName, rows }) => ({ line, sheetName, rows })))
            .toEqual(legacyLineSheets(items));
        const synthese = buildImplantationSyntheseRows(items, index, refById);
        const expectedCount = ids.reduce((s, id) => s + (index.byReference.get(id)?.byLine.length ?? 0), 0);
        expect(synthese).toHaveLength(expectedCount); // sélection complète : toutes les lignes, comme avant
        const onlyA = buildImplantationSyntheseRows(select(ids, ['A']), index, refById);
        expect(onlyA.every(r => r.line === 'A')).toBe(true);
    });

    it('7. quantité totale = nombre d\'implantations sélectionnées', () => {
        const items = select(ids, ['A', 'B']);
        expect(poseRows(items).reduce((s, r) => s + r.quantity, 0)).toBe(items.length);
    });
});

describe('CSV de pose — format', () => {
    const row = (over: Partial<PoseRow>): PoseRow => ({
        line: 'A', station: 'Jean-Jaurès', family: 'f', equipment: 'e', location: 'l', zone: '', reference: 'r',
        designation: 'd', dimensions: '1 × 1 cm', quantity: 1, visual: '', ...over,
    });

    it('8. caractères accentués conservés', () => {
        expect(buildPoseCsv([row({ station: 'Arènes', location: 'Côté église' })])).toContain('Arènes;f;e;Côté église');
    });
    it('9. point-virgule dans une donnée', () => {
        expect(parse(buildPoseCsv([row({ designation: 'A;B' })]))[1]).toContain(';"A;B";');
    });
    it('10. guillemets doublés', () => {
        expect(parse(buildPoseCsv([row({ designation: 'Adhésif "Bulle"' })]))[1]).toContain(';"Adhésif ""Bulle""";');
    });
    it('11. retour à la ligne dans une donnée', () => {
        expect(buildPoseCsv([row({ location: 'ligne 1\nligne 2' })])).toContain('"ligne 1\nligne 2"');
    });
    it('12. BOM UTF-8 et séparateur « ; »', () => {
        const csv = buildPoseCsv([]);
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(parse(csv)[0]).toBe('Ligne;Station;Famille;Équipement;Emplacement / direction;Zone;Référence;Désignation;Dimensions;Quantité;Visuel');
    });
});

describe('CSV de pose — périmètre', () => {
    it('13. référence désactivée et élément non applicable exclus', () => {
        const disabledRefs = refs.map(r => (r.id === 'ad1' ? { ...r, isDisabled: true } : r));
        const disabledIndex = buildPatrimoineIndex(lieux, disabledRefs);
        expect(selectionFromReferences(disabledIndex, ['ad1'], 't').items).toHaveLength(0);

        const before = select(['ad1']).length;
        const copy: Lieu[] = structuredClone(lieux);
        const dat = copy.flatMap(l => l.modules).find(m => m.type === AuditModuleType.DAT && !m.isFuture)!;
        const firstDat = (dat.data as ModeData).stations[0].directions[0].dats[0];
        firstDat.adhesives = { ...firstDat.adhesives, ad1: AdhesiveStatus.NotApplicable };
        const naIndex = buildPatrimoineIndex(copy, refs);
        expect(selectionFromReferences(naIndex, ['ad1'], 't').items).toHaveLength(before - 1);
    });

    it('14. pictogrammes cognitifs : comptés, sans « Accès à définir », sans référence, lignes filtrées', () => {
        const all = cognitivePictogramPoseItems(lieux);
        expect(all).toHaveLength(65);
        expect(all.some(c => /^Accès à définir/.test(c.accessPointName))).toBe(false);
        const onlyA = cognitivePictogramPoseItems(lieux, new Set(['A']));
        const rows = poseRows(select(['ad1'], ['A']), onlyA);
        const pictos = rows.filter(r => r.family === COGNITIVE_POSE_FAMILY);
        expect(pictos).toHaveLength(onlyA.length);
        expect(pictos.every(r => r.line === 'A' && r.reference === '' && r.quantity === 1)).toBe(true);
        expect(pictos).toContainEqual(expect.objectContaining({ station: 'Arènes', dimensions: '82x75.5cm', location: 'Escalier gauche (côté agence)' }));
        // Après les implantations de la ligne, dans l'ordre physique des stations.
        expect(rows.findIndex(r => r.family === COGNITIVE_POSE_FAMILY)).toBe(rows.length - pictos.length);
    });

    it('15. visuels : chemin du fichier quand il existe, vide sinon', () => {
        const withoutVisual = [...index.byReference.keys()].find(id => !getReferenceVisualUrl(id))!;
        expect(withoutVisual).toBeDefined();
        const rows = poseRows(select(['adbs5', withoutVisual]), cognitivePictogramPoseItems(lieux, new Set(['B'])));
        expect(rows.find(r => r.reference === 'adbs5')!.visual).toBe('references/adbs5.webp');
        expect(rows.find(r => r.station === 'Palais de Justice' && r.family === COGNITIVE_POSE_FAMILY)!.visual).toBe('pictos-cognitifs/PDJ.png');
        expect(rows.filter(r => r.reference === withoutVisual).every(r => r.visual === '')).toBe(true);
    });
});

describe('CSV de pose — fidèle au tableau de la sélection', () => {
    it('chaque implantation une seule fois (identité métier), même ordre que l\'arbre affiché', async () => {
        const { groupImplantationsByLocation } = await import('../utils/cockpit/implantationsGrouping');
        for (const ids of [['ad1'], ['ad1', 'eca-1', 'adbe1', 'pdq-78x100'], [...index.byReference.keys()]]) {
            const items = select(ids);
            const key = (i: ImplantationRef) => [i.lieuId, i.moduleId, i.context, i.equipmentLabel, i.referenceId, i.zone ?? ''].join('|');
            expect(new Set(items.map(key)).size).toBe(items.length);
            const tree = groupImplantationsByLocation(items).sort((a, b) => compareLines(a.line, b.line))
                .map(l => ({ ...l, stations: sortByPhysicalStationOrder(l.line, l.stations, s => s.stationName) }))
                .flatMap(l => l.stations.flatMap(s => s.contexts.flatMap(c => c.equipments.flatMap(e => e.items))));
            expect(buildImplantationLineSheets(items, refById).flatMap(s => s.items)).toEqual(tree);
        }
    });

    it('pictogrammes : chaque emplacement une seule fois, aucun filtre propre à l\'export', () => {
        const all = cognitivePictogramPoseItems(lieux);
        const rows = poseRows([], all);
        expect(rows).toHaveLength(all.length);
        expect(new Set(rows.map(r => `${r.line}|${r.station}|${r.location}`)).size).toBe(rows.length);
    });
});
