// utils/cockpit/lieuMap.ts
// Localisation d'un lieu sur Google Maps, pour se projeter sur le terrain.
// Point exact quand une station du lieu a des coordonnées connues
// (data/stationCoordinates.ts, rattachées au registre) ; sinon recherche
// construite à partir du nom du lieu et de son mode — jamais une position
// inventée.
import { AuditModuleType, Lieu } from '../../types';
import { ALL_STATION_DEFS } from '../../data/stationRegistry';
import { STATION_COORDINATES, StationCoordinates } from '../../data/stationCoordinates';

/** Mode du lieu par ordre de priorité : métro, tram, Aéroport Express, Téléo, P+R. */
const placeKind = (lieu: Lieu): string => {
    const lines = new Set(lieu.modules.map(m => m.line ?? ''));
    if (lines.has('A') || lines.has('B') || lines.has('C')) return 'Station de métro';
    if (lines.has('TRAM')) return 'Arrêt de tram';
    if (lines.has('AEROPORT')) return 'Arrêt Aéroport Express';
    if (lines.has('TELEO')) return 'Station Téléo';
    if (lieu.modules.some(m => m.type === AuditModuleType.PR)) return 'Parc relais';
    return '';
};

export const lieuMapQuery = (lieu: Lieu): string =>
    `${[placeKind(lieu), lieu.name].filter(Boolean).join(' ')}, Toulouse`;

/** Coordonnées du lieu : stations du registre rattachées au lieu (clé
 *  lieuName || name, comme l'ordre réseau), stations en service d'abord. */
export const lieuCoordinates = (lieu: Lieu): StationCoordinates | undefined =>
    ALL_STATION_DEFS
        .filter(s => (s.lieuName || s.name) === lieu.name)
        .sort((a, b) => Number(a.isFuture) - Number(b.isFuture))
        .map(s => STATION_COORDINATES[s.id])
        .find(Boolean);

/** Cible de la carte : coordonnées exactes, sinon la recherche par nom. */
const mapTarget = (lieu: Lieu): string => {
    const coords = lieuCoordinates(lieu);
    return coords ? `${coords.lat},${coords.lng}` : lieuMapQuery(lieu);
};

/** Carte intégrée (sans clé d'API). */
export const lieuMapEmbedUrl = (lieu: Lieu): string =>
    `https://maps.google.com/maps?q=${encodeURIComponent(mapTarget(lieu))}&z=17&output=embed`;

/** Ouverture dans Google Maps (site ou application). */
export const lieuMapOpenUrl = (lieu: Lieu): string =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapTarget(lieu))}`;
