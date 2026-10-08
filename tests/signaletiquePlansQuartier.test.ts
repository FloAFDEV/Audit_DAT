// tests/signaletiquePlansQuartier.test.ts
// Plans de quartier audités dans Équipements Station (T1) : agrégés en
// lecture pour le cockpit, sans copie ni modification des modules.
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { summarizePlanQuartierAudit } from '../utils/cockpit/planQuartierAuditTotals';
import { collectSignaletiquePlansQuartier, summarizeSignaletiqueCensus } from '../utils/cockpit/signaletiquePlansQuartier';
import { AuditModuleType, EquipmentStatusType, Lieu, ModeData } from '../types';

const t1Sig = (lieux: Lieu[], lieuName: string) =>
    (lieux.find(l => l.name === lieuName)!.modules
        .find(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM')!.data as ModeData).stations[0].signaletique!;

describe('plans de quartier Équipements Station — lecture seule', () => {
    it('52 plans T1 en service, aucun Aéroport Express ni Blagnac (hors exploitation)', async () => {
        const plans = collectSignaletiquePlansQuartier(await generateInitialLieuxDataAsync());
        expect(plans).toHaveLength(52);
        expect(plans.every(p => p.line === 'TRAM')).toBe(true);
        expect(plans.some(p => p.lieuName === 'Blagnac')).toBe(false);
        expect(plans.every(p => p.dimensions === '83 x 100 cm')).toBe(true);
    });

    it('un exemplaire par plan et par direction (Palais de Justice : 2, MEETT : 4)', async () => {
        const plans = collectSignaletiquePlansQuartier(await generateInitialLieuxDataAsync());
        expect(plans.filter(p => p.lieuName === 'Palais de Justice').map(p => p.direction))
            .toEqual(['Direction MEETT / Aéroport', 'Direction Palais de Justice']);
        expect(plans.filter(p => p.lieuName === 'MEETT')).toHaveLength(4);
        // Arènes, Aéroconstellation : un plan par extrémité ; MEETT : 3 + 1.
        for (const name of ['Arènes', 'Aéroconstellation']) {
            expect(plans.filter(p => p.lieuName === name).map(p => p.direction).sort())
                .toEqual(['Direction MEETT / Aéroport', 'Direction Palais de Justice']);
        }
        const meett = plans.filter(p => p.lieuName === 'MEETT').map(p => p.direction);
        expect(meett.filter(d => d === 'Direction MEETT / Aéroport')).toHaveLength(3);
        expect(meett.filter(d => d === 'Direction Palais de Justice')).toHaveLength(1);
        // Université Paul-Sabatier : aucun plan T1, ses plans B et Téléo
        // restent dans leurs modules Plans de quartier respectifs.
        expect(plans.some(p => p.lieuName === 'Université Paul-Sabatier')).toBe(false);
    });

    it('direction lue dans la station (même règle que le formulaire), jamais inventée', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const station = (lieux.find(l => l.name === 'Arènes')!.modules
            .find(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM')!.data as ModeData).stations[0];
        // Installation de la fenêtre de régression : une seule extrémité.
        station.directions = station.directions.filter(d => /meett/i.test(d.name));
        const arenes = collectSignaletiquePlansQuartier(lieux).filter(p => p.lieuName === 'Arènes');
        expect(arenes).toHaveLength(2); // l'exemplaire reste compté…
        expect(arenes.map(p => p.direction)).toEqual(['Direction MEETT / Aéroport', undefined]); // …sans libellé inventé
    });

    it("défaut selon la même règle que l'index Équipements Station ; « non installé » ignoré ; données intactes", async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const sig = t1Sig(lieux, 'Palais de Justice');
        sig.planQuartier.meett[0].status = EquipmentStatusType.ABSENT;
        sig.planQuartier.pdj[0].status = EquipmentStatusType.NOT_APPLICABLE;
        const snapshot = JSON.stringify(lieux);

        const pdj = collectSignaletiquePlansQuartier(lieux).filter(p => p.lieuName === 'Palais de Justice');
        expect(pdj).toEqual([expect.objectContaining({ direction: 'Direction MEETT / Aéroport', isDefect: true })]);
        expect(JSON.stringify(lieux)).toBe(snapshot);
    });

    // Périmètre « station + module en service » propre à la carte Plans de
    // quartier ; l'index Anomalies Équipements Station, lui, n'est volontairement
    // pas modifié (il raisonne au niveau du module et inclut les modules LAE
    // ouverts à la préparation).
    it('Aéroport Express : hors périmètre tant que ses stations ne sont pas en service, inclus ensuite (78 × 100)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const laeStations = lieux.flatMap(l => l.modules)
            .filter(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === 'AEROPORT')
            .flatMap(m => (m.data as ModeData).stations);
        expect(laeStations.length).toBeGreaterThan(0);
        expect(collectSignaletiquePlansQuartier(lieux).some(p => p.line === 'AEROPORT')).toBe(false);

        laeStations.forEach(s => { s.isFuture = false; });
        const lae = collectSignaletiquePlansQuartier(lieux).filter(p => p.line === 'AEROPORT');
        expect(lae).toHaveLength(6);
        expect(lae.every(p => p.dimensions === '78 x 100 cm')).toBe(true);
    });
});

// Sémantique du cockpit : Plans de quartier = périmètre d'audit du module
// (90 plans) ; Tram T1 = recensement séparé, audité dans Équipements Station.
describe('cockpit Plans de quartier — audit PDQ vs recensement T1', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        useAuditStore.setState({
            lieux: [], isLoading: true, isAuthenticated: false, initError: null,
            selectedLieuId: null, selectedModuleId: null,
        });
        await db.lieux.bulkPut(await generateInitialLieuxDataAsync());
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        await useAuditStore.getState().init();
    });

    const pdqModelIds = async () => (await db.signageReferences.toArray())
        .filter(r => r.auditType === 'PDQ' && !r.isDisabled).map(r => r.id);
    const auditTotals = async (lieux: Lieu[]) =>
        summarizePlanQuartierAudit(buildPatrimoineIndex(lieux, await db.signageReferences.toArray()), await pdqModelIds());

    it('Plans de quartier = 90 ; T1 = 52 recensés à part, jamais dans le total PDQ', async () => {
        const lieux = useAuditStore.getState().lieux;
        expect(await auditTotals(lieux)).toEqual({ installed: 90, defects: 0 });

        const plans = collectSignaletiquePlansQuartier(lieux);
        expect(summarizeSignaletiqueCensus(plans)).toEqual({ total: 52, defects: 0 });
        expect(plans.every(p => p.line === 'TRAM')).toBe(true);
        // Aucun plan Aéroport Express hors service introduit.
        expect(plans.some(p => p.line === 'AEROPORT' || p.lieuName === 'Aéroport Toulouse Blagnac')).toBe(false);
    });

    it("un défaut T1 reste dans le recensement Équipements Station, jamais dans le « à traiter » PDQ", async () => {
        const lieux = structuredClone(useAuditStore.getState().lieux);
        const sig = t1Sig(lieux, 'MEETT');
        sig.planQuartier.meett[0].status = EquipmentStatusType.ABSENT;

        expect(await auditTotals(lieux)).toEqual({ installed: 90, defects: 0 });
        const plans = collectSignaletiquePlansQuartier(lieux);
        expect(summarizeSignaletiqueCensus(plans)).toEqual({ total: 52, defects: 1 });

        // Toujours localisables, directions réelles : MEETT 3 + 1.
        const meett = plans.filter(p => p.lieuName === 'MEETT');
        expect(meett.filter(p => p.direction === 'Direction MEETT / Aéroport')).toHaveLength(3);
        expect(meett.filter(p => p.direction === 'Direction Palais de Justice')).toHaveLength(1);
        expect(meett.filter(p => p.isDefect)).toHaveLength(1);
    });
});
