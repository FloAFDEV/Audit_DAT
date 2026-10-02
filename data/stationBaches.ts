// data/stationBaches.ts
// =================================================================
// Recensement des BÂCHES de stations (représentations verticales des
// stations d'une ligne) — référentiel patrimonial indépendant : pas
// d'audit, pas de statut, pas d'implantation, pas de nomenclature.
// Une bâche est un support physique ; seul compte :
//   station + sens + type + nombre de bâches.
// Donnée statique distribuée avec le build (comme stationRegistry) :
// aucune table Dexie, aucune migration, aucun import (export CSV seul).
//
// Source : tableaux métier du recensement (lignes A et B, dans les deux
// sens). Les stations pas encore relevées (prolongement ligne B, ligne C)
// ont une entrée par sens à 0 marquée `pending` ; sans `pending`, un 0 a
// été explicitement relevé.
// =================================================================

export type BacheType = 'standard' | 'double-sens';
export type BacheLine = 'A' | 'B' | 'C';

export interface StationBache {
    id: string;
    line: BacheLine;
    /** Identifiant de station du registre (data/stationRegistry.ts). */
    stationId: string;
    /** Terminus du sens ; absent pour une bâche double-sens. */
    direction?: string;
    type: BacheType;
    count: number;
    /** Quantité pas encore relevée : count vaut 0 en attendant le relevé
     *  (≠ un 0 relevé explicitement, ex. Jean Jaurès ligne A). */
    pending?: true;
    /** Trigramme à afficher quand le registre n'en porte pas pour cette
     *  ligne (Labège Madron ligne B). */
    stationCode?: string;
}

const std = (line: BacheLine, stationId: string, code: string, direction: string, dirCode: string, count: number): StationBache => ({
    id: `bache-${line.toLowerCase()}-${code.toLowerCase()}-${dirCode.toLowerCase()}`,
    line, stationId, direction, type: 'standard', count,
});
/** Station sans relevé à ce jour : une entrée par sens, quantité 0 à relever. */
const todo = (line: BacheLine, stationId: string, code: string, direction: string, dirCode: string, stationCode?: string): StationBache => ({
    ...std(line, stationId, code, direction, dirCode, 0),
    pending: true,
    ...(stationCode ? { stationCode } : {}),
});
const todoBothWays = (line: BacheLine, stationId: string, code: string, ends: [string, string, string, string], stationCode?: string) => [
    todo(line, stationId, code, ends[0], ends[1], stationCode),
    todo(line, stationId, code, ends[2], ends[3], stationCode),
];

const ds = (line: BacheLine, stationId: string, code: string): StationBache => ({
    id: `bache-${line.toLowerCase()}-${code.toLowerCase()}-ds`,
    line, stationId, type: 'double-sens', count: 1,
});

/** Terminus des sens pour les stations sans relevé. */
const B_EXT_ENDS: [string, string, string, string] = ['Labège Madron', 'LMA', 'Borderouge', 'BOR'];
const C_ENDS: [string, string, string, string] = ['Labège Gare', 'LAG', 'Colomiers Gare', 'COG'];

export const STATION_BACHES: readonly StationBache[] = [
    // ----- Ligne A -----
    std('A', 'sta-a-1', 'MBC', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-2', 'BEL', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-3', 'REY', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-4', 'MUN', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-5', 'BAG', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-6', 'MER', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-7', 'FLE', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-8', 'ARE', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-9', 'POI', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-10', 'SCY', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-11', 'ESQ', 'Balma-Gramont', 'BGR', 2),
    std('A', 'sta-a-12', 'CAP', 'Balma-Gramont', 'BGR', 2),
    std('A', 'sta-a-13', 'JJA', 'Balma-Gramont', 'BGR', 0), // relevé explicite : aucune bâche standard
    std('A', 'sta-a-14', 'MAR', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-15', 'JOL', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-16', 'ROS', 'Balma-Gramont', 'BGR', 1),
    std('A', 'sta-a-17', 'ARG', 'Balma-Gramont', 'BGR', 2),
    std('A', 'sta-a-18', 'BGR', 'Balma-Gramont', 'BGR', 1),
    // Sens retour (direction Basso Cambo). Doubles-sens de Jolimont et Jean
    // Jaurès, listées dans les deux sens du relevé : comptées une seule fois.
    std('A', 'sta-a-18', 'BGR', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-17', 'ARG', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-16', 'ROS', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-15', 'JOL', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-14', 'MAR', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-13', 'JJA', 'Basso Cambo', 'MBC', 0), // relevé explicite : aucune bâche standard
    std('A', 'sta-a-12', 'CAP', 'Basso Cambo', 'MBC', 2),
    std('A', 'sta-a-11', 'ESQ', 'Basso Cambo', 'MBC', 4),
    std('A', 'sta-a-10', 'SCY', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-9', 'POI', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-8', 'ARE', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-7', 'FLE', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-6', 'MER', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-5', 'BAG', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-4', 'MUN', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-3', 'REY', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-2', 'BEL', 'Basso Cambo', 'MBC', 1),
    std('A', 'sta-a-1', 'MBC', 'Basso Cambo', 'MBC', 1),
    ds('A', 'sta-a-15', 'JOL'),
    ds('A', 'sta-a-13', 'JJA'),

    // ----- Ligne B -----
    std('B', 'sta-b-1', 'BOR', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-2', 'TCO', 'Ramonville', 'RAM', 2),
    std('B', 'sta-b-3', 'LVA', 'Ramonville', 'RAM', 2),
    std('B', 'sta-b-4', 'BPA', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-5', 'MIN', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-6', 'CAN', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-7', 'CCA', 'Ramonville', 'RAM', 2),
    std('B', 'sta-b-8', 'JAR', 'Ramonville', 'RAM', 2),
    std('B', 'sta-b-9', 'JJB', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-10', 'FVE', 'Ramonville', 'RAM', 2),
    std('B', 'sta-b-11', 'CAR', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-12', 'PDJ', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-13', 'SMI', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-14', 'EMP', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-15', 'SAG', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-16', 'SAO', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-17', 'RAN', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-18', 'PHA', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-19', 'UPS', 'Ramonville', 'RAM', 1),
    std('B', 'sta-b-20', 'RAM', 'Ramonville', 'RAM', 1),
    ds('B', 'sta-b-9', 'JJB'),
    // Sens retour (direction Borderouge). La double-sens de Jean Jaurès,
    // listée dans les deux sens du relevé, n'est comptée qu'une fois (ci-dessus).
    std('B', 'sta-b-20', 'RAM', 'Borderouge', 'BOR', 2),
    std('B', 'sta-b-19', 'UPS', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-18', 'PHA', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-17', 'RAN', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-16', 'SAO', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-15', 'SAG', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-14', 'EMP', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-13', 'SMI', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-12', 'PDJ', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-11', 'CAR', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-10', 'FVE', 'Borderouge', 'BOR', 2),
    std('B', 'sta-b-9', 'JJB', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-8', 'JAR', 'Borderouge', 'BOR', 4),
    std('B', 'sta-b-7', 'CCA', 'Borderouge', 'BOR', 4),
    std('B', 'sta-b-6', 'CAN', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-5', 'MIN', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-4', 'BPA', 'Borderouge', 'BOR', 1),
    std('B', 'sta-b-3', 'LVA', 'Borderouge', 'BOR', 2),
    std('B', 'sta-b-2', 'TCO', 'Borderouge', 'BOR', 2),
    std('B', 'sta-b-1', 'BOR', 'Borderouge', 'BOR', 1),
    // Prolongement (ouverture prochaine) : quantités à relever.
    ...todoBothWays('B', 'sta-b-21', 'PTC', B_EXT_ENDS),
    ...todoBothWays('B', 'sta-b-22', 'LMA', B_EXT_ENDS, 'LMA'),

    // ----- Ligne C : stations connues, quantités à relever -----
    ...todoBothWays('C', 'sta-c-1', 'COG', C_ENDS),
    ...todoBothWays('C', 'sta-c-3', 'FLU', C_ENDS),
    ...todoBothWays('C', 'sta-c-4', 'SMA', C_ENDS),
    ...todoBothWays('C', 'sta-hub-bla', 'BLA', C_ENDS),
    ...todoBothWays('C', 'sta-c-6', 'SDN', C_ENDS),
    ...todoBothWays('C', 'sta-c-7', 'PJU', C_ENDS),
    ...todoBothWays('C', 'sta-c-8', 'FON', C_ENDS),
    ...todoBothWays('C', 'sta-c-9', 'LVH', C_ENDS),
    ...todoBothWays('C', 'sta-c-10', 'TLA', C_ENDS),
    ...todoBothWays('C', 'sta-c-11', 'RAI', C_ENDS),
    ...todoBothWays('C', 'sta-c-12', 'BON', C_ENDS),
    ...todoBothWays('C', 'sta-c-13', 'MAT', C_ENDS),
    ...todoBothWays('C', 'sta-c-14', 'FVD', C_ENDS),
    ...todoBothWays('C', 'sta-c-15', 'CPA', C_ENDS),
    ...todoBothWays('C', 'sta-c-16', 'LIM', C_ENDS),
    ...todoBothWays('C', 'sta-c-17', 'ORM', C_ENDS),
    ...todoBothWays('C', 'sta-c-18', 'MOG', C_ENDS),
    ...todoBothWays('C', 'sta-c-19', 'AEC', C_ENDS),
    ...todoBothWays('C', 'sta-c-20', 'LMA', C_ENDS),
    ...todoBothWays('C', 'sta-c-21', 'DIA', C_ENDS),
    ...todoBothWays('C', 'sta-c-22', 'LAG', C_ENDS),
];
