import { Station } from '../types';
import {
    REGISTRY_AEROPORT_EXPRESS,
    REGISTRY_INTERCHANGE_HUBS,
    ACTIVE_LINES,
} from './stationRegistry';

/**
 * 🔥 HUB CENTRAL MULTI-LIGNES
 * Blagnac = T1 + C + LAE
 * → UNE SEULE définition logique
 * → injectée dans chaque ligne pour la topologie
 * → fusionnée via lieuName côté UI
 */
const HUB_BLAGNAC: Partial<Station> = {
    id: 'sta-hub-bla',
    name: 'Blagnac',
    code: 'BLA',
    lieuName: 'Blagnac',
    isFuture: true,
    lines: ['T1', 'C', 'LAE'],
};

/* =========================
   LIGNE C
========================= */
export const LINE_C_STATIONS: Partial<Station>[] = [
    { id: 'sta-c-1', name: 'Colomiers Gare', code: 'COG', isFuture: true },
    { id: 'sta-c-3', name: 'Fontaine Lumineuse', code: 'FLU', isFuture: true },
    { id: 'sta-c-4', name: 'Saint-Martin-du-Touch', code: 'SMA', isFuture: true },

    // ✅ POSITION RÉELLE DU HUB
    { ...HUB_BLAGNAC },

    { id: 'sta-c-6', name: 'Sept Deniers – Stade Toulousain', code: 'SDN', isFuture: true },
    { id: 'sta-c-7', name: 'Ponts-Jumeaux', code: 'PJU', isFuture: true },
    { id: 'sta-c-8', name: 'Fondeyre', code: 'FON', isFuture: true },
    { id: 'sta-c-9', name: 'La Vache', code: 'LVH', isFuture: true, lieuName: 'La Vache' },
    { id: 'sta-c-10', name: 'Lycée Toulouse-Lautrec', code: 'TLA', isFuture: true },
    { id: 'sta-c-11', name: 'Raisin', code: 'RAI', isFuture: true },
    { id: 'sta-c-12', name: 'Bonnefoy', code: 'BON', isFuture: true },
    { id: 'sta-c-13', name: 'Matabiau Gare', code: 'MAT', isFuture: true, lieuName: 'Marengo-SNCF' },
    { id: 'sta-c-14', name: 'François-Verdier', code: 'FVD', isFuture: true, lieuName: 'François Verdier' },
    { id: 'sta-c-15', name: 'Côte Pavée', code: 'CPA', isFuture: true },
    { id: 'sta-c-16', name: 'Limayrac – Cité de l’Espace', code: 'LIM', isFuture: true },
    { id: 'sta-c-17', name: 'Ormeau', code: 'ORM', isFuture: true },
    { id: 'sta-c-18', name: 'Montaudran Gare', code: 'MOG', isFuture: true },
    { id: 'sta-c-19', name: 'Aerospace Campus', code: 'AEC', isFuture: true },
    { id: 'sta-c-20', name: 'Labège Madron', code: 'LMA', isFuture: true, lieuName: 'Labège Madron' },
    { id: 'sta-c-21', name: 'Diagora', code: 'DIA', isFuture: true },
    { id: 'sta-c-22', name: 'Labège Gare', code: 'LAG', isFuture: true },
];

/* =========================
   TRAM T1
========================= */
export const TRAM_STATIONS: Partial<Station>[] = [
    { id: 'sta-t1-1',  name: 'Palais de Justice', code: 'PDJ', lieuName: 'Palais de Justice' },
    { id: 'sta-t1-2',  name: 'Île du Ramier', code: 'PSM' },
    { id: 'sta-t1-3',  name: 'Fer à Cheval', code: 'FAC' },
    { id: 'sta-t1-4',  name: 'Avenue de Muret – Marcel Cavaillé', code: 'RAP' },
    { id: 'sta-t1-5',  name: 'Croix de Pierre', code: 'CDP' },
    { id: 'sta-t1-6',  name: 'Déodat de Séverac', code: 'LDD' },

    { id: 'sta-t1-7',  name: 'Arènes', code: 'ARE', lieuName: 'Arènes' },
    { id: 'sta-t1-8',  name: 'Hippodrome', code: 'HIP' },
    { id: 'sta-t1-9',  name: 'Zénith', code: 'ZTH' },

    { id: 'sta-t1-10', name: 'Cartoucherie', code: 'CCH' },
    { id: 'sta-t1-11', name: 'Purpan', code: 'PUR' },
    { id: 'sta-t1-12', name: 'Arènes Romaines', code: 'ARO' },

    { id: 'sta-t1-13', name: 'Ancely', code: 'ANC' },

    // ✅ UTILISATION DU HUB (PAS DE DUPLICATION)
    { ...HUB_BLAGNAC },

    { id: 'sta-t1-14', name: 'Servanty – Airbus', code: 'SER' },
    { id: 'sta-t1-15', name: 'Guyenne – Berry', code: 'GUY' },
    { id: 'sta-t1-16', name: 'Pasteur – Mairie de Blagnac', code: 'PAS' },
    { id: 'sta-t1-17', name: 'Place du Relais', code: 'REL' },
    { id: 'sta-t1-18', name: 'Odyssud – Ritouret', code: 'MRO' },
    { id: 'sta-t1-19', name: 'Patinoire – Barradels', code: 'PTN' },
    { id: 'sta-t1-20', name: 'Grand Noble', code: 'GNO' },
    { id: 'sta-t1-21', name: 'Place Georges Brassens', code: 'GBR' },
    { id: 'sta-t1-22', name: 'Andromède – Lycée', code: 'LYC' },
    { id: 'sta-t1-23', name: 'Beauzelle – Aéroscopia', code: 'BEA' },
    { id: 'sta-t1-24', name: 'Aéroconstellation', code: 'GAS' },
];

/* =========================
   AEROPORT EXPRESS (LAE)
========================= */
export const AEROPORT_EXPRESS_STATIONS: Partial<Station>[] = ACTIVE_LINES.AEROPORT
    ? [
        // ✅ HUB EN TÊTE DE BRANCHE
        { ...HUB_BLAGNAC },

        ...REGISTRY_AEROPORT_EXPRESS.map(def => ({
            id:       def.id,
            name:     def.name,          // 🔥 IMPORTANT (plus de publicName)
            code:     def.code,
            isFuture: def.isFuture,
            lieuName: def.lieuName ?? def.name,
        })),
    ]
    : [];
