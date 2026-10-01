// utils/cockpit/baches.ts
// Lecture du recensement des bâches (data/stationBaches.ts) : lignes
// triées dans l'ordre physique du registre, totaux par ligne. Aucun lien
// avec lieux, patrimoineIndex, useStats ni le workflow d'audit.
import { REGISTRY_LINE_A, REGISTRY_LINE_B, REGISTRY_LINE_C, StationDef } from '../../data/stationRegistry';
import { BacheLine, STATION_BACHES, StationBache } from '../../data/stationBaches';

export const BACHE_LINES: readonly BacheLine[] = ['A', 'B', 'C'];

const REGISTRY_BY_LINE: Record<BacheLine, StationDef[]> = {
    A: REGISTRY_LINE_A,
    B: REGISTRY_LINE_B,
    C: REGISTRY_LINE_C,
};

export interface BacheRow extends StationBache {
    stationName: string;
    stationCode: string;
}

/** Bâches d'une ligne, dans l'ordre physique des stations du registre ;
 *  dans une station : bâches directionnelles puis double-sens. */
export const getBachesForLine = (line: BacheLine, baches: readonly StationBache[] = STATION_BACHES): BacheRow[] => {
    const registry = REGISTRY_BY_LINE[line];
    const position = new Map(registry.map((s, i) => [s.id, i]));
    return baches
        .filter(b => b.line === line)
        .map((b, i) => {
            const station = registry.find(s => s.id === b.stationId);
            return {
                row: { ...b, stationName: station?.name ?? b.stationId, stationCode: station?.code ?? '' },
                order: position.get(b.stationId) ?? Number.MAX_SAFE_INTEGER,
                typeOrder: b.type === 'double-sens' ? 1 : 0,
                i,
            };
        })
        .sort((a, b) => a.order - b.order || a.typeOrder - b.typeOrder || a.i - b.i)
        .map(x => x.row);
};

/** Nombre total de bâches physiques d'une ligne. */
export const getBacheTotal = (line: BacheLine, baches: readonly StationBache[] = STATION_BACHES): number =>
    baches.filter(b => b.line === line).reduce((sum, b) => sum + b.count, 0);

/** Une ligne est recensée dès qu'elle a au moins une entrée. */
export const isLineRecensee = (line: BacheLine, baches: readonly StationBache[] = STATION_BACHES): boolean =>
    baches.some(b => b.line === line);
