// utils/cockpit/lieuMap.ts
// Localisation d'un lieu sur Google Maps, pour se projeter sur le terrain.
// Aucune coordonnée n'existe dans les données : la recherche est construite
// à partir du nom du lieu et de son mode (déduit de ses modules), jamais
// d'une position inventée.
import { AuditModuleType, Lieu } from '../../types';

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

/** Carte intégrée (sans clé d'API). */
export const lieuMapEmbedUrl = (lieu: Lieu): string =>
    `https://maps.google.com/maps?q=${encodeURIComponent(lieuMapQuery(lieu))}&z=16&output=embed`;

/** Ouverture dans Google Maps (site ou application). */
export const lieuMapOpenUrl = (lieu: Lieu): string =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lieuMapQuery(lieu))}`;
