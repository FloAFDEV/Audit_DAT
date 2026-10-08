// tests/sharedLieuCarrier.test.ts
// Ligne porteuse du mobilier des lieux desservis par plusieurs lignes, et
// pictogrammes cognitifs présentés en lecture seule dans les cards.
import { describe, it, expect } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { ALL_STATION_DEFS } from '../data/stationRegistry';
import { PLAN_QUARTIER_INITIAL_INVENTORY } from '../data/planQuartierInitialInventory';
import { SHARED_LIEU_CARRIER_LINES, findCarrierLineViolations } from '../utils/sharedLieuCarrier';
import { cognitiveSummaryKey, summarizeCognitivePictograms } from '../utils/cockpit/cognitivePictogramSummary';
import { AuditModuleType, CognitivePictogramData, FloorAdhesiveStatus, Lieu, PlanQuartierData } from '../types';

/** Station.name → lieu (clé lieuName || name, comme le builder). */
const LIEU_OF = new Map(ALL_STATION_DEFS.map(s => [s.name, s.lieuName || s.name]));
const LINE_OF_REGISTRY: Record<string, string> = { T1: 'TRAM', LAE: 'AEROPORT' };

const pdqModule = (lieux: Lieu[], lieuName: string, line: string) =>
    lieux.find(l => l.name === lieuName)!.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER && m.line === line)!;

describe('lieux multi-lignes — recensement', () => {
    it('lieux desservis par plusieurs lignes en service, et seule ligne porteuse déclarée', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const multi = lieux
            .map(l => ({ name: l.name, lines: [...new Set(l.modules.filter(m => m.line && !m.isFuture).map(m => m.line!))].sort() }))
            .filter(l => l.lines.length > 1)
            .map(l => `${l.name}:${l.lines.join('+')}`)
            .sort();
        expect(multi).toEqual([
            'Arènes:A+TRAM',
            'Jean-Jaurès:A+B',
            'Palais de Justice:B+TRAM',
            'Université Paul-Sabatier:B+TELEO',
        ]);
        // Une seule station physique partagée : Jean-Jaurès (A/B). Les autres
        // sont des stations distinctes (métro / tram / Téléo).
        expect(SHARED_LIEU_CARRIER_LINES).toEqual({ 'Jean-Jaurès': 'A' });
    });
});

describe('ligne porteuse du mobilier', () => {
    it("l'inventaire de départ ne renseigne jamais un lieu partagé hors de sa ligne porteuse", () => {
        for (const entry of PLAN_QUARTIER_INITIAL_INVENTORY) {
            const carrier = SHARED_LIEU_CARRIER_LINES[LIEU_OF.get(entry.stationName) ?? entry.stationName];
            if (carrier) expect(entry.line, `${entry.stationName} ${entry.modelId}`).toBe(carrier);
        }
    });

    it('données générées : aucun mobilier hors ligne porteuse (Jean-Jaurès B : 0 picto, aucun plan)', async () => {
        expect(findCarrierLineViolations(await generateInitialLieuxDataAsync())).toEqual([]);
    });

    it('détecte un plan ou un picto renseigné par erreur sur la ligne non porteuse', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        (pdqModule(lieux, 'Jean-Jaurès', 'B').data as PlanQuartierData).occurrences.push({
            id: 'x', modelId: 'pdq-78x100', status: 'NotChecked' as any, location: 'Totem',
            constatedAt: '2026-10-01T00:00:00.000Z', discoveredAt: '2026-10-01T00:00:00.000Z',
        });
        const jjbPicto = lieux.find(l => l.name === 'Jean-Jaurès')!.modules
            .find(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS && m.line === 'B')!;
        (jjbPicto.data as CognitivePictogramData).pictograms.push({ id: 'p', accessPointName: 'Accès', status: FloorAdhesiveStatus.NotChecked });

        expect(findCarrierLineViolations(lieux)).toEqual([
            { lieuName: 'Jean-Jaurès', line: 'B', moduleType: AuditModuleType.PLAN_QUARTIER, count: 1 },
            { lieuName: 'Jean-Jaurès', line: 'B', moduleType: AuditModuleType.COGNITIVE_PICTOGRAMS, count: 1 },
        ]);
    });

    it("emplacements identiques sur deux lignes d'un même lieu : seul le cas connu d'Université Paul-Sabatier", () => {
        const lines = new Map<string, Set<string>>();
        for (const e of PLAN_QUARTIER_INITIAL_INVENTORY) {
            const key = `${LIEU_OF.get(e.stationName) ?? e.stationName}|${e.modelId}|${e.location ?? ''}`;
            lines.set(key, (lines.get(key) ?? new Set()).add(LINE_OF_REGISTRY[e.line] ?? e.line));
        }
        const duplicated = [...lines.entries()].filter(([, l]) => l.size > 1).map(([k, l]) => `${k}|${[...l].sort().join('+')}`);
        // Libellé générique « Cadre aluminium » : un 78×120 en station de
        // métro (B) et un autre en station Téléo — deux stations physiques.
        expect(duplicated).toEqual(['Université Paul-Sabatier|pdq-78x120|Cadre aluminium|B+TELEO']);
    });
});

describe('pictogrammes cognitifs dans les cards — lecture seule', () => {
    it('résumé par (ligne, lieu), sans rien modifier ni créer', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const jja = lieux.find(l => l.name === 'Jean-Jaurès')!.modules
            .find(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS && m.line === 'A')!.data as CognitivePictogramData;
        jja.pictograms[0].status = FloorAdhesiveStatus.ToBeReplaced;
        const snapshot = JSON.stringify(lieux);

        const summary = summarizeCognitivePictograms(lieux);
        expect(summary.get(cognitiveSummaryKey('A', 'Jean-Jaurès'))).toEqual({ stationCode: 'JJA', accessCount: 2, toReplaceCount: 1 });
        // Jamais sur la card d'une autre ligne du même lieu.
        expect(summary.get(cognitiveSummaryKey('B', 'Jean-Jaurès'))).toBeUndefined();
        expect(summary.get(cognitiveSummaryKey('TRAM', 'Arènes'))).toBeUndefined();
        expect(summary.get(cognitiveSummaryKey('A', 'Arènes'))?.accessCount).toBe(1);
        // Aucune ligne C (stations futures) : hors exploitation.
        expect([...summary.keys()].some(k => k.startsWith('C|'))).toBe(false);
        expect(JSON.stringify(lieux)).toBe(snapshot);
    });
});
