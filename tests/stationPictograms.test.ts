// tests/stationPictograms.test.ts
// Pictogramme cognitif affiché à côté du nom d'une station : données du
// module Pictogrammes cognitifs uniquement, jamais déduites du nom.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { getStationPictograms } from '../utils/stationPictograms';
import { getCognitivePictogramVisualUrl } from '../data/cognitivePictogramVisuals';
import { AuditModuleType, CognitivePictogramData, Lieu } from '../types';

let lieux: Lieu[];
beforeAll(async () => { lieux = await generateInitialLieuxDataAsync(); }, 30000);
const byName = (name: string) => lieux.find(l => l.name === name)!;
const cogModule = (line: string, stationCode: string | undefined, extra: Partial<Lieu['modules'][number]> = {}) => ({
    id: `cog-${line}-${stationCode}`, type: AuditModuleType.COGNITIVE_PICTOGRAMS, name: 'Pictogrammes Cognitifs', line,
    data: { id: 'd', stationName: 'X', stationCode, pictograms: [], comment: '' } as unknown as CognitivePictogramData,
    ...extra,
}) as Lieu['modules'][number];

describe('getStationPictograms', () => {
    it('station d’une ligne : son pictogramme, depuis le code du module', () => {
        expect(getStationPictograms(byName('Basso Cambo'))).toEqual([{ line: 'A', stationCode: 'MBC', url: '/pictos-cognitifs/MBC.png' }]);
    });

    it('station commune A/B (Jean-Jaurès) : un seul pictogramme ; filtre par ligne', () => {
        const jj = byName('Jean-Jaurès');
        expect(getStationPictograms(jj).map(p => `${p.line}:${p.stationCode}`)).toEqual(['A:JJA']);
        expect(getStationPictograms(jj, 'A').map(p => p.stationCode)).toEqual(['JJA']);
        expect(getStationPictograms(jj, 'B').map(p => p.stationCode)).toEqual(['JJB']);
        expect(getStationPictograms(jj, 'TRAM')).toEqual([]);
    });

    it('le relevé : chaque pictogramme affiché provient d’un module en exploitation et d’un visuel officiel', () => {
        const shown = new Set<string>();
        for (const lieu of lieux) {
            const modules = lieu.modules.filter(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS && !m.isFuture);
            expect(getStationPictograms(lieu).length).toBeLessThanOrEqual(1);
            for (const line of new Set(modules.map(m => m.line ?? ''))) for (const p of getStationPictograms(lieu, line)) {
                shown.add(p.stationCode);
                expect(modules.some(m => m.line === p.line && (m.data as CognitivePictogramData).stationCode === p.stationCode)).toBe(true);
                expect(p.url).toBe(getCognitivePictogramVisualUrl(p.stationCode));
            }
        }
        // 38 visuels officiels (lignes A et B), tous rattachés à une station.
        expect(shown.size).toBe(38);
    });

    it('lignes sans visuel (Tram, Téléo…) : rien', () => {
        const tramOnly = lieux.filter(l => l.modules.every(m => !m.line || !['A', 'B'].includes(m.line)));
        expect(tramOnly.length).toBeGreaterThan(0);
        expect(tramOnly.every(l => getStationPictograms(l).length === 0)).toBe(true);
    });

    it('jamais déduit du nom ; données manquantes ou futures : rien', () => {
        const named = { name: 'Basso Cambo', modules: [cogModule('A', 'ZZZ')] };
        expect(getStationPictograms(named)).toEqual([]);
        expect(getStationPictograms({ name: 'Nom quelconque', modules: [cogModule('A', 'MBC')] }).map(p => p.stationCode)).toEqual(['MBC']);
        expect(getStationPictograms({ name: 'X', modules: [cogModule('A', undefined)] })).toEqual([]);
        expect(getStationPictograms({ name: 'X', modules: [cogModule('A', 'MBC', { isFuture: true })] })).toEqual([]);
        expect(getStationPictograms({ name: 'X', modules: [] })).toEqual([]);
        expect(getStationPictograms(undefined)).toEqual([]);
    });

    it('même code sur deux modules : affiché une seule fois', () => {
        expect(getStationPictograms({ name: 'X', modules: [cogModule('A', 'MBC'), { ...cogModule('A', 'MBC'), id: 'autre' }] })).toHaveLength(1);
    });
});
