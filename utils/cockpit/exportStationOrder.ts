// utils/cockpit/exportStationOrder.ts
// =================================================================
// Ordre PHYSIQUE des stations dans les feuilles de l'export Excel des
// implantations — uniquement pour l'export, l'ordre de l'application est
// inchangé. Source canonique : les listes ordonnées de data/stations.ts
// (déjà utilisées par hooks/useLieuList et utils/csvExporter), clé
// lieuName || name ; P+R : l'ordre de data/pr_data.ts.
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

/**
 * Trie (sans muter) les éléments d'UNE ligne dans l'ordre physique de ses
 * stations. Tri stable : à l'intérieur d'une station, l'ordre reçu (celui
 * de l'index : accès → équipement → référence) est conservé. Une station
 * absente du registre est placée en fin de feuille.
 */
export const sortByPhysicalStationOrder = <T>(line: string, items: T[], stationOf: (item: T) => string): T[] => {
    const order = STATION_ORDER[line];
    const rank = (item: T) => order?.get(stationOf(item)) ?? Number.MAX_SAFE_INTEGER;
    return items
        .map((item, i) => ({ item, i, r: rank(item) }))
        .sort((a, b) => a.r - b.r || a.i - b.i)
        .map(x => x.item);
};
