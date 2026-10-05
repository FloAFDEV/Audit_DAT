// utils/cockpit/baches.ts
// Lecture du recensement des bâches (data/stationBaches.ts) : lignes
// triées dans l'ordre physique du registre, totaux par ligne. Aucun lien
// avec lieux, patrimoineIndex, useStats ni le workflow d'audit.
import { REGISTRY_LINE_A, REGISTRY_LINE_B, REGISTRY_LINE_C, REGISTRY_INTERCHANGE_HUBS, StationDef } from '../../data/stationRegistry';
import { BacheLine, STATION_BACHES, StationBache } from '../../data/stationBaches';

export const BACHE_LINES: readonly BacheLine[] = ['A', 'B', 'C'];

/** Ligne C : Blagnac (hub, hors REGISTRY_LINE_C) s'insère entre
 *  Saint-Martin-du-Touch et Sept Deniers (chaîne adjacentStations). */
const LINE_C_WITH_HUBS: StationDef[] = REGISTRY_LINE_C.flatMap(s =>
    s.code === 'SMA' ? [s, ...REGISTRY_INTERCHANGE_HUBS.filter(h => h.code === 'BLA')] : [s]);

const REGISTRY_BY_LINE: Record<BacheLine, StationDef[]> = {
    A: REGISTRY_LINE_A,
    B: REGISTRY_LINE_B,
    C: LINE_C_WITH_HUBS,
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
                row: { ...b, stationName: station?.name ?? b.stationId, stationCode: b.stationCode ?? station?.code ?? '' },
                order: position.get(b.stationId) ?? Number.MAX_SAFE_INTEGER,
                typeOrder: b.type === 'double-sens' ? 1 : 0,
                i,
            };
        })
        .sort((a, b) => a.order - b.order || a.typeOrder - b.typeOrder || a.i - b.i)
        .map(x => x.row);
};

/** Bâches d'un lieu, toutes lignes confondues : une station appartient au
 *  lieu dont le nom est sa clé de regroupement du registre (lieuName || name,
 *  la même clé que l'ordre réseau) — Jean-Jaurès réunit ainsi JJA et JJB.
 *  Un lieu sans station de métro recensée (Tram, Téléo, P+R...) n'en a aucune. */
export const getBachesForLieu = (lieuName: string, baches: readonly StationBache[] = STATION_BACHES): BacheRow[] =>
    BACHE_LINES.flatMap(line => {
        const keyById = new Map(REGISTRY_BY_LINE[line].map(s => [s.id, s.lieuName || s.name]));
        return getBachesForLine(line, baches).filter(r => keyById.get(r.stationId) === lieuName);
    });

/** Nombre total de bâches physiques d'une ligne. */
export const getBacheTotal = (line: BacheLine, baches: readonly StationBache[] = STATION_BACHES): number =>
    baches.filter(b => b.line === line).reduce((sum, b) => sum + b.count, 0);

/** Une ligne est recensée dès qu'elle a au moins une quantité relevée
 *  (les entrées `pending` seules ne suffisent pas). */
export const isLineRecensee = (line: BacheLine, baches: readonly StationBache[] = STATION_BACHES): boolean =>
    baches.some(b => b.line === line && !b.pending);

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Filtre par station : nom ou trigramme, sans accents ni casse. */
export const filterBacheRows = (rows: BacheRow[], query: string): BacheRow[] => {
    const q = normalize(query.trim());
    if (!q) return rows;
    return rows.filter(r => normalize(r.stationName).includes(q) || normalize(r.stationCode).includes(q));
};

export const BACHE_TYPE_LABELS: Record<StationBache['type'], string> = { standard: 'Standard', 'double-sens': 'Double-sens' };

/** CSV (séparateur « ; », BOM UTF-8 pour Excel) des lignes affichées. */
export const buildBachesCsv = (rows: BacheRow[]): string => {
    const cell = (v: string | number) => {
        const s = String(v);
        return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Ligne', 'Station', 'Code', 'Direction', 'Type', 'Nb bâches', 'Statut'];
    const lines = rows.map(r => [
        r.line, r.stationName, r.stationCode, r.direction ?? '', BACHE_TYPE_LABELS[r.type], r.count,
        r.pending ? 'À relever' : 'Relevé',
    ].map(cell).join(';'));
    return '\uFEFF' + [header.join(';'), ...lines].join('\r\n');
};
