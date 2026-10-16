// tests/countingRules.test.ts
// =================================================================
// Règles de comptage : plans de quartier T1 (un seul exemplaire, deux
// contextes), emplacements cognitifs « Accès à définir », périmètre des
// pictogrammes cognitifs (lignes A et B seulement).
// =================================================================
import { describe, it, expect } from 'vitest';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { getCountedCognitivePictograms, isProvisionalCognitivePictogram } from '../data/cognitive_pictograms';
import { collectSignaletiquePlansQuartier } from '../utils/cockpit/signaletiquePlansQuartier';
import { summarizeCognitivePictograms, cognitiveSummaryKey } from '../utils/cockpit/cognitivePictogramSummary';
import { AuditModuleType, CognitivePictogramData, EquipmentStatusType, Lieu, ModeData, PlanQuartierData } from '../types';

const inventory = (lieux: Lieu[]) => computeAdhesiveInventory(lieux, buildSignageReferencesSeed());
const cogModules = (lieux: Lieu[]) => lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS);
const cogTotal = (lieux: Lieu[]) => inventory(lieux).filter(i => i.id.startsWith('cog-picto-')).reduce((s, i) => s + i.quantity, 0);

describe('Plans de quartier T1 — un exemplaire, deux contextes, un comptage', () => {
    it('rangés dans la famille Plans de quartier, avec exactement les plans du cockpit', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const rows = inventory(lieux).filter(i => i.id === 'sign-plan-quartier-tram');
        expect(rows).toHaveLength(1);
        expect(rows[0].auditType).toBe('Plans de quartier');
        const cockpitT1 = collectSignaletiquePlansQuartier(lieux).filter(p => p.line === 'TRAM').length;
        expect(cockpitT1).toBeGreaterThan(0);
        expect(rows[0].quantity).toBe(cockpitT1);
    });

    it('aucune occurrence Plans de quartier Tram ne duplique un plan T1', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const tramPdq = lieux.flatMap(l => l.modules)
            .filter(m => m.type === AuditModuleType.PLAN_QUARTIER && m.line === 'TRAM')
            .flatMap(m => (m.data as PlanQuartierData).occurrences ?? []);
        expect(tramPdq).toEqual([]);
    });

    it('un plan T1 « non installé » sort à la fois du cockpit et de l\'inventaire', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const before = inventory(lieux).find(i => i.id === 'sign-plan-quartier-tram')!.quantity;
        const sig = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM' && !m.isFuture)!;
        const plan = (sig.data as ModeData).stations.flatMap(s => s.signaletique?.planQuartier?.meett ?? [])[0];
        plan.status = EquipmentStatusType.NOT_APPLICABLE;
        expect(inventory(lieux).find(i => i.id === 'sign-plan-quartier-tram')!.quantity).toBe(before - 1);
        expect(collectSignaletiquePlansQuartier(lieux).filter(p => p.line === 'TRAM')).toHaveLength(before - 1);
    });
});

describe('Pictogrammes cognitifs — emplacements provisoires et périmètre', () => {
    it('« Accès à définir » (numéroté ou non) est provisoire, un accès nommé ne l\'est pas', () => {
        expect(isProvisionalCognitivePictogram({ accessPointName: 'Accès à définir' })).toBe(true);
        expect(isProvisionalCognitivePictogram({ accessPointName: 'Accès à définir 2' })).toBe(true);
        expect(isProvisionalCognitivePictogram({ accessPointName: 'Accès Gare Bus (sur mur)' })).toBe(false);
    });

    // 5 depuis que François Verdier a ses 2 accès nommés (7 auparavant).
    it('les 5 emplacements provisoires restent dans les données mais sortent des totaux', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const all = cogModules(lieux).flatMap(m => (m.data as CognitivePictogramData).pictograms);
        expect(all.filter(isProvisionalCognitivePictogram)).toHaveLength(5);
        expect(cogTotal(lieux)).toBe(all.length - 5);
    });

    it('carte station : Basso Cambo ne compte que ses accès confirmés', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const mbc = cogModules(lieux).find(m => (m.data as CognitivePictogramData).stationCode === 'MBC')!;
        const confirmed = (mbc.data as CognitivePictogramData).pictograms.filter(p => !isProvisionalCognitivePictogram(p)).length;
        const lieu = lieux.find(l => l.modules.includes(mbc))!;
        expect(summarizeCognitivePictograms(lieux).get(cognitiveSummaryKey('A', lieu.name))?.accessCount).toBe(confirmed);
    });

    it('un emplacement renommé en accès réel est compté', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const before = cogTotal(lieux);
        const placeholder = cogModules(lieux).flatMap(m => (m.data as CognitivePictogramData).pictograms).find(isProvisionalCognitivePictogram)!;
        placeholder.accessPointName = 'Accès principal';
        expect(cogTotal(lieux)).toBe(before + 1);
    });

    it('lignes A et B comptées ; une autre ligne (C, Aéroport Express) ne contribue pas', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const modules = cogModules(lieux);
        expect(new Set(modules.map(m => m.line))).toEqual(new Set(['A', 'B']));
        expect(modules.every(m => getCountedCognitivePictograms(m).length === (m.data as CognitivePictogramData).pictograms.filter(p => !isProvisionalCognitivePictogram(p)).length)).toBe(true);
        const before = cogTotal(lieux);
        const moved = modules.find(m => getCountedCognitivePictograms(m).length > 0)!;
        const n = getCountedCognitivePictograms(moved).length;
        moved.line = 'C';
        expect(getCountedCognitivePictograms(moved)).toEqual([]);
        expect(cogTotal(lieux)).toBe(before - n);
        moved.line = 'AEROPORT';
        expect(cogTotal(lieux)).toBe(before - n);
    });
});
