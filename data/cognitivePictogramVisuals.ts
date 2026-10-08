// data/cognitivePictogramVisuals.ts
// =================================================================
// Visuel du pictogramme cognitif de chaque station (lignes A et B),
// extrait de la planche officielle — un fichier par code station
// (public/pictos-cognitifs/<CODE>.png, silhouette noire sur fond
// transparent). Information affichée uniquement : aucun statut, aucun
// calcul ; l'audit des pictogrammes reste inchangé.
// Station sans visuel connu (autres lignes, stations ajoutées depuis la
// planche) : undefined, rien n'est affiché.
// =================================================================

const STATION_CODES_WITH_VISUAL: ReadonlySet<string> = new Set([
    // Ligne A
    'MBC', 'BEL', 'REY', 'MUN', 'BAG', 'MER', 'FLE', 'ARE', 'POI', 'SCY',
    'ESQ', 'CAP', 'JJA', 'MAR', 'JOL', 'ROS', 'ARG', 'BGR',
    // Ligne B
    'BOR', 'TCO', 'LVA', 'BPA', 'MIN', 'CAN', 'CCA', 'JAR', 'JJB', 'FVE',
    'CAR', 'PDJ', 'SMI', 'EMP', 'SAG', 'SAO', 'RAN', 'PHA', 'UPS', 'RAM',
]);

/** URL du visuel du pictogramme cognitif d'une station, ou undefined. */
export const getCognitivePictogramVisualUrl = (stationCode?: string): string | undefined =>
    stationCode && STATION_CODES_WITH_VISUAL.has(stationCode)
        ? `/pictos-cognitifs/${stationCode}.png`
        : undefined;
