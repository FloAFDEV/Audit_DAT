// tests/stationPatrimoine.test.ts
// Patrimoine complet d'une station : filtrage par lieu + ligne de résultats
// existants, sans double comptage ni fusion des référentiels autonomes.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { buildPatrimoineIndex, PatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { pmrFloorPoseItems } from '../utils/cockpit/pmrFloorPose';
import { cognitivePictogramPoseItems } from '../utils/cockpit/cognitivePictogramSummary';
import { stationEquipmentItems, futureStationEquipmentItems } from '../utils/cockpit/stationEquipment';
import { computeAdhesiveInventory } from '../hooks/useStats';
import {
    buildStationPatrimoine, linesOfLieu, summarizeStationPatrimoine, StationPatrimoineSources,
} from '../utils/cockpit/stationPatrimoine';
import { AdhesiveStatus, AuditModuleType, Lieu, PlanQuartierData } from '../types';

let lieux: Lieu[];
let index: PatrimoineIndex;
let sources: StationPatrimoineSources;
const lieuId = (name: string) => lieux.find(l => l.name === name)!.id;
const station = (name: string, line: string) => buildStationPatrimoine(sources, { lieuId: lieuId(name), line })!;

beforeAll(async () => {
    lieux = await generateInitialLieuxDataAsync();
    // Plans de quartier : semés au démarrage du store (inventaire initial) —
    // reproduits ici pour Basso Cambo.
    const pdq = lieux.find(l => l.name === 'Basso Cambo')!.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER)!;
    (pdq.data as PlanQuartierData).occurrences = [
        { id: 'pdq-1', modelId: 'pem3d-120x80', status: AdhesiveStatus.NotChecked, comment: 'PEM' },
        { id: 'pdq-2', modelId: 'pdq-adhesif', status: AdhesiveStatus.NotChecked, location: 'Agence commerciale' },
    ] as PlanQuartierData['occurrences'];
    index = buildPatrimoineIndex(lieux, buildSignageReferencesSeed());
    sources = {
        lieux, implantations: index.implantations,
        pmrFloor: pmrFloorPoseItems(lieux), cognitive: cognitivePictogramPoseItems(lieux),
        stationEquipment: stationEquipmentItems(lieux), futureStationEquipment: futureStationEquipmentItems(lieux),
    };
});

describe('Basso Cambo, ligne A — cas de référence', () => {
    it('toutes les familles du relevé, chacune dans ses unités', () => {
        const p = station('Basso Cambo', 'A');
        const summary = Object.fromEntries(summarizeStationPatrimoine(p).map(s => [s.family, s]));
        expect(Object.keys(summary)).toEqual(['DAT', 'ECA', 'PDQ', 'PMR', 'COG', 'BACHE', 'PR']);
        expect(summary.DAT.counts.map(c => c.value)).toEqual([3, 10, 30]);
        expect(summary.DAT.counts.map(c => c.unit)).toEqual(['appareils', 'références', 'repères']);
        expect(summary.ECA.counts[2]).toEqual({ value: 28, unit: 'repères' });
        expect(summary.PDQ.counts).toEqual([{ value: 2, unit: 'exemplaires' }]);
        expect(summary.PMR.counts).toEqual([{ value: 1, unit: 'adhésif' }]);
        expect(summary.COG.counts).toEqual([{ value: 1, unit: 'pictogramme compté' }]);
        expect(summary.COG.uncounted).toEqual({ value: 1, unit: 'non compté' });
        expect(summary.BACHE.counts).toEqual([{ value: 2, unit: 'bâches' }]);
        expect(summary.PR.counts[1]).toEqual({ value: 60, unit: 'repères' });
    });

    it('détails conservés : matière PMR, dimension et emplacement des pictogrammes, accès à définir', () => {
        const p = station('Basso Cambo', 'A');
        expect(p.pmrFloor[0].material).toMatch(/Vinyle/);
        expect(p.cognitive).toEqual([expect.objectContaining({ accessPointName: 'Accès Gare Bus (sur mur)', dimensions: '74.5x97cm', stationCode: 'MBC' })]);
        expect(p.cognitiveUncounted).toEqual([expect.objectContaining({ accessPointName: 'Accès à définir', reason: 'provisional' })]);
        expect(p.dat.every(i => i.line === 'A' && i.moduleName === 'DAT')).toBe(true);
        expect(new Set(p.eca.map(i => i.equipmentLabel)).size).toBeGreaterThan(0);
        expect(p.stationEquipment).toEqual([]); // métro : aucun équipement de station relevé
    });
});

describe('Capitole — PMR et pictogrammes', () => {
    it('1 adhésif PMR, 2 pictogrammes avec leurs dimensions, aucun P+R', () => {
        const p = station('Capitole', 'A');
        expect(p.pmrFloor).toHaveLength(1);
        expect(p.cognitive.map(c => [c.accessPointName, c.dimensions])).toEqual([
            ['Accès Capitole - Petit Modèle', '74.5x67.5cm'],
            ['Accès Capitole - Grand Modèle', '74.5x71cm'],
        ]);
        expect(p.prAssociated).toEqual([]);
        expect(summarizeStationPatrimoine(p).some(s => s.family === 'PR')).toBe(false);
    });
});

describe('Arènes — station multiligne', () => {
    it('aucune donnée d\'une ligne sous l\'autre ; équipements de station sous le tram seulement', () => {
        const a = station('Arènes', 'A');
        const t = station('Arènes', 'TRAM');
        for (const p of [a, t]) {
            for (const i of [...p.dat, ...p.eca, ...p.pdq, ...p.pmrFloor, ...p.cognitive, ...p.stationEquipment, ...p.baches]) {
                expect(i.line).toBe(p.line);
            }
        }
        expect(a.stationEquipment).toEqual([]);
        expect(t.stationEquipment.length).toBeGreaterThan(0);
        expect(a.otherLines).toContain('TRAM');
        expect(t.otherLines).toContain('A');
    });

    it('le P+R associé apparaît sous chaque ligne, identique, dans sa section propre', () => {
        const a = station('Arènes', 'A');
        const t = station('Arènes', 'TRAM');
        expect(a.prAssociated.length).toBeGreaterThan(0);
        expect(t.prAssociated).toEqual(a.prAssociated);
        expect([...a.dat, ...a.eca, ...a.pdq].some(i => i.line === 'P+R')).toBe(false);
    });
});

describe('Aucun double comptage', () => {
    it('par lieu : implantations des lignes + P+R (une fois) = moteur d\'index filtré sur le lieu', () => {
        for (const lieu of lieux) {
            const perLine = linesOfLieu(lieu).map(line => buildStationPatrimoine(sources, { lieuId: lieu.id, line })!);
            const lineItems = perLine.flatMap(p => [...p.dat, ...p.eca, ...p.pdq]);
            const pr = perLine[0]?.prAssociated ?? [];
            const engine = index.implantations.filter(i => i.lieuId === lieu.id);
            expect(lineItems.length + pr.length, lieu.name).toBe(engine.length);
            expect(new Set([...lineItems, ...pr]).size, lieu.name).toBe(engine.length);
        }
    });

    it('réseau : somme des stations = éléments de chaque référentiel autonome (inventaire)', () => {
        const all = lieux.flatMap(lieu => linesOfLieu(lieu).map(line => buildStationPatrimoine(sources, { lieuId: lieu.id, line })!));
        expect(all.reduce((s, p) => s + p.pmrFloor.length, 0)).toBe(sources.pmrFloor.length);
        expect(all.reduce((s, p) => s + p.cognitive.length, 0)).toBe(sources.cognitive.length);
        expect(all.reduce((s, p) => s + p.stationEquipment.length, 0)).toBe(sources.stationEquipment.length);
        const inventory = computeAdhesiveInventory(lieux, buildSignageReferencesSeed());
        const qty = (prefix: string) => inventory.filter(r => r.id.startsWith(prefix)).reduce((s, r) => s + r.quantity, 0);
        expect(sources.pmrFloor.length).toBe(qty('pmr-sol-'));
        expect(sources.cognitive.length).toBe(qty('cog-picto-'));
    });

    it('une implantation n\'est jamais rattachée à deux stations-lignes', () => {
        const seen = new Map<object, string>();
        for (const lieu of lieux) for (const line of linesOfLieu(lieu)) {
            const p = buildStationPatrimoine(sources, { lieuId: lieu.id, line })!;
            for (const i of [...p.dat, ...p.eca, ...p.pdq]) {
                expect(seen.has(i), `${lieu.name} ${line}`).toBe(false);
                seen.set(i, `${lieu.name} ${line}`);
            }
        }
    });
});

describe('Stations futures et en préparation', () => {
    it('les équipements futurs restent à part, jamais dans les emplacements comptés', () => {
        const blagnac = station('Blagnac', 'TRAM');
        expect(blagnac.stationEquipment.every(i => !sources.futureStationEquipment.includes(i))).toBe(true);
        const s = summarizeStationPatrimoine(blagnac).find(f => f.family === 'SIG');
        if (blagnac.futureStationEquipment.length > 0) expect(s?.uncounted?.value).toBe(blagnac.futureStationEquipment.length);
    });

    it('Aéroport Express : emplacements en préparation identifiés (inService = false)', () => {
        const lae = lieux.find(l => linesOfLieu(l).includes('AEROPORT') && sources.stationEquipment.some(i => i.lieuName === l.name && i.line === 'AEROPORT'))!;
        const p = buildStationPatrimoine(sources, { lieuId: lae.id, line: 'AEROPORT' })!;
        expect(p.stationEquipment.length).toBeGreaterThan(0);
        expect(p.stationEquipment.every(i => i.inService === false)).toBe(true);
    });

    it('lieu inconnu : aucun résultat', () => {
        expect(buildStationPatrimoine(sources, { lieuId: 'inconnu', line: 'A' })).toBeNull();
    });
});

describe('Unités et fonctionnement hors connexion', () => {
    it('appareils, références et repères ne sont jamais confondus', () => {
        for (const lieu of lieux) for (const line of linesOfLieu(lieu)) {
            const p = buildStationPatrimoine(sources, { lieuId: lieu.id, line })!;
            for (const s of summarizeStationPatrimoine(p)) {
                const units = s.counts.map(c => c.unit);
                expect(new Set(units).size, `${lieu.name} ${line} ${s.family}`).toBe(units.length);
                if (s.family === 'DAT' || s.family === 'ECA') {
                    const [devices, references, marks] = s.counts.map(c => c.value);
                    expect(devices).toBeLessThanOrEqual(marks);
                    expect(references).toBeLessThanOrEqual(marks);
                }
            }
        }
    });

    it('calcul local pur : aucun accès réseau, tout le réseau en moins d\'une seconde', () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = (() => { throw new Error('réseau interdit'); }) as typeof fetch;
        try {
            const t0 = performance.now();
            let stations = 0;
            for (const lieu of lieux) for (const line of linesOfLieu(lieu)) {
                summarizeStationPatrimoine(buildStationPatrimoine(sources, { lieuId: lieu.id, line })!);
                stations++;
            }
            expect(stations).toBeGreaterThan(80);
            expect(performance.now() - t0).toBeLessThan(1000);
        } finally { globalThis.fetch = originalFetch; }
    });
});
