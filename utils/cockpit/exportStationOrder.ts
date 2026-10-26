// utils/cockpit/exportStationOrder.ts
// =================================================================
// Ordre PHYSIQUE (réseau) des stations : feuilles de l'export Excel des
// implantations, arbre des implantations (ImplantationsTree), export CSV
// d'audit et galerie des pictogrammes cognitifs. Source canonique : les
// listes ordonnées de data/stations.ts (déjà utilisées par
// hooks/useLieuList), clé lieuName || name ; P+R : l'ordre de
// data/pr_data.ts.
// =================================================================
import { Station } from '../../types';
import {
    LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS,
    TRAM_STATIONS, TELEO_STATIONS, AEROPORT_EXPRESS_STATIONS,
} from '../../data/stations';
import { PR_DATA } from '../../data/pr_data';

const indexOf = (stations: Partial<Station>[]): Map<string, number> => {
    const map = new Map<string, number>();
    stations.forEach((s, i) => {
        const name = s.lieuName || s.name;
        if (name && !map.has(name)) map.set(name, i);
    });
    return map;
};

const STATION_ORDER: Record<string, Map<string, number>> = {
    A: indexOf(LINE_A_STATIONS),
    B: indexOf(LINE_B_STATIONS),
    C: indexOf(LINE_C_STATIONS),
    TRAM: indexOf(TRAM_STATIONS),
    TELEO: indexOf(TELEO_STATIONS),
    AEROPORT: indexOf(AEROPORT_EXPRESS_STATIONS),
    'P+R': new Map(PR_DATA.map((p, i) => [p.name, i])),
};

/** Rang physique d'une station sur sa ligne (clé lieuName || name), ou
 *  undefined si la ligne ou la station n'est pas au registre. Chaque ligne a
 *  son propre ordre : un même lieu sur deux lignes (Jean-Jaurès A / B) garde
 *  deux rangs distincts. Partagé par l'export CSV d'audit, l'export Excel des
 *  implantations et la galerie des pictogrammes cognitifs. */
export const physicalStationIndex = (line: string, stationName: string): number | undefined =>
    STATION_ORDER[line]?.get(stationName);

/**
 * Trie (sans muter) les éléments d'UNE ligne dans l'ordre physique de ses
 * stations. Tri stable : à l'intérieur d'une station, l'ordre reçu (celui
 * de l'index : accès → équipement → référence) est conservé. Une station
 * absente du registre est placée en fin de feuille.
 */
export const sortByPhysicalStationOrder = <T>(line: string, items: T[], stationOf: (item: T) => string): T[] => {
    const rank = (item: T) => physicalStationIndex(line, stationOf(item)) ?? Number.MAX_SAFE_INTEGER;
    return items
        .map((item, i) => ({ item, i, r: rank(item) }))
        .sort((a, b) => a.r - b.r || a.i - b.i)
        .map(x => x.item);
};
