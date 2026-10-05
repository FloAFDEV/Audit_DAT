// data/stationCoordinates.ts
// =================================================================
// Coordonnées (WGS84) des stations du registre (data/stationRegistry.ts),
// indexées par identifiant de station — compagnon du registre, qui reste
// la source unique des noms, codes, lignes, statuts et de l'ordre réseau.
// Utilisées uniquement pour situer un lieu sur une carte (Synthèse).
//   gtfs      : zone d'arrêt du GTFS Tisséo (stops.txt, export du 21/09/2026),
//               stations en service (métro A/B, tram T1, Téléo).
//   chantier  : coordonnées fournies pour les stations sans entrée GTFS
//               (ligne C, Aéroport Express, prolongement B) — emprises de
//               chantier, précision ~10 m.
// Une station absente n'a pas de coordonnées connues : la carte retombe
// alors sur une recherche par nom (utils/cockpit/lieuMap.ts).
// =================================================================

export interface StationCoordinates {
    lat: number;
    lng: number;
    source: 'gtfs' | 'chantier';
}

export const STATION_COORDINATES: Readonly<Record<string, StationCoordinates>> = {
    'sta-a-1': { lat: 43.570006, lng: 1.392273, source: 'gtfs' }, // Basso Cambo
    'sta-a-2': { lat: 43.56603, lng: 1.399139, source: 'gtfs' }, // Bellefontaine
    'sta-a-3': { lat: 43.570224, lng: 1.401934, source: 'gtfs' }, // Reynerie
    'sta-a-4': { lat: 43.57453, lng: 1.402097, source: 'gtfs' }, // Mirail-Université
    'sta-a-5': { lat: 43.57992, lng: 1.412075, source: 'gtfs' }, // Bagatelle
    'sta-a-6': { lat: 43.583446, lng: 1.415423, source: 'gtfs' }, // Mermoz
    'sta-a-7': { lat: 43.587281, lng: 1.41887, source: 'gtfs' }, // Fontaine-Lestang
    'sta-a-8': { lat: 43.593409, lng: 1.418536, source: 'gtfs' }, // Arènes
    'sta-a-9': { lat: 43.596275, lng: 1.423384, source: 'gtfs' }, // Patte d'Oie
    'sta-a-10': { lat: 43.597894, lng: 1.431028, source: 'gtfs' }, // Saint-Cyprien - République
    'sta-a-11': { lat: 43.600409, lng: 1.444105, source: 'gtfs' }, // Esquirol
    'sta-a-12': { lat: 43.604465, lng: 1.445537, source: 'gtfs' }, // Capitole
    'sta-a-13': { lat: 43.605923, lng: 1.449083, source: 'gtfs' }, // Jean-Jaurès
    'sta-a-14': { lat: 43.610308, lng: 1.455582, source: 'gtfs' }, // Marengo-SNCF
    'sta-a-15': { lat: 43.615366, lng: 1.463667, source: 'gtfs' }, // Jolimont
    'sta-a-16': { lat: 43.619713, lng: 1.469531, source: 'gtfs' }, // Roseraie
    'sta-a-17': { lat: 43.624505, lng: 1.477086, source: 'gtfs' }, // Argoulets
    'sta-a-18': { lat: 43.628521, lng: 1.482417, source: 'gtfs' }, // Balma-Gramont
    'sta-b-1': { lat: 43.64133, lng: 1.452591, source: 'gtfs' }, // Borderouge
    'sta-b-2': { lat: 43.638349, lng: 1.444129, source: 'gtfs' }, // Trois Cocus
    'sta-b-3': { lat: 43.633617, lng: 1.434951, source: 'gtfs' }, // La Vache
    'sta-b-4': { lat: 43.626623, lng: 1.433786, source: 'gtfs' }, // Barrière de Paris
    'sta-b-5': { lat: 43.620555, lng: 1.435845, source: 'gtfs' }, // Minimes - Claude Nougaro
    'sta-b-6': { lat: 43.615222, lng: 1.433719, source: 'gtfs' }, // Canal du Midi
    'sta-b-7': { lat: 43.610484, lng: 1.435362, source: 'gtfs' }, // Compans-Caffarelli
    'sta-b-8': { lat: 43.609095, lng: 1.446081, source: 'gtfs' }, // Jeanne d'Arc
    'sta-b-9': { lat: 43.605923, lng: 1.449083, source: 'gtfs' }, // Jean-Jaurès
    'sta-b-10': { lat: 43.601065, lng: 1.452285, source: 'gtfs' }, // François Verdier
    'sta-b-11': { lat: 43.598108, lng: 1.445532, source: 'gtfs' }, // Carmes
    'sta-b-12': { lat: 43.592854, lng: 1.444234, source: 'gtfs' }, // Palais de Justice
    'sta-b-13': { lat: 43.586099, lng: 1.446903, source: 'gtfs' }, // Saint-Michel - Marcel Langer
    'sta-b-14': { lat: 43.579922, lng: 1.441945, source: 'gtfs' }, // Empalot
    'sta-b-15': { lat: 43.580275, lng: 1.449481, source: 'gtfs' }, // Saint-Agne - SNCF
    'sta-b-16': { lat: 43.579463, lng: 1.459327, source: 'gtfs' }, // Saouzelong
    'sta-b-17': { lat: 43.574483, lng: 1.462373, source: 'gtfs' }, // Rangueil
    'sta-b-18': { lat: 43.567892, lng: 1.464487, source: 'gtfs' }, // Faculté de Pharmacie
    'sta-b-19': { lat: 43.560645, lng: 1.463553, source: 'gtfs' }, // Université Paul Sabatier
    'sta-b-20': { lat: 43.555901, lng: 1.477149, source: 'gtfs' }, // Ramonville
    'sta-t1-1': { lat: 43.592854, lng: 1.444234, source: 'gtfs' }, // Palais de Justice
    'sta-t1-2': { lat: 43.59219, lng: 1.440443, source: 'gtfs' }, // Île du Ramier
    'sta-t1-3': { lat: 43.593216, lng: 1.434615, source: 'gtfs' }, // Fer à Cheval
    'sta-t1-4': { lat: 43.589286, lng: 1.431785, source: 'gtfs' }, // Avenue de Muret – Marcel Cavaillé
    'sta-t1-5': { lat: 43.585224, lng: 1.427767, source: 'gtfs' }, // Croix de Pierre
    'sta-t1-6': { lat: 43.589654, lng: 1.422028, source: 'gtfs' }, // Déodat de Séverac
    'sta-t1-7': { lat: 43.593409, lng: 1.418536, source: 'gtfs' }, // Arènes
    'sta-t1-8': { lat: 43.594239, lng: 1.40857, source: 'gtfs' }, // Hippodrome
    'sta-t1-9': { lat: 43.601207, lng: 1.411468, source: 'gtfs' }, // Zénith
    'sta-t1-10': { lat: 43.603586, lng: 1.406872, source: 'gtfs' }, // Cartoucherie
    'sta-t1-12': { lat: 43.609089, lng: 1.402011, source: 'gtfs' }, // Purpan
    'sta-t1-13': { lat: 43.613878, lng: 1.397777, source: 'gtfs' }, // Arènes Romaines
    'sta-t1-14': { lat: 43.618146, lng: 1.397072, source: 'gtfs' }, // Ancely
    'sta-t1-15': { lat: 43.62547, lng: 1.393484, source: 'gtfs' }, // Servanty – Airbus
    'sta-t1-16': { lat: 43.63097, lng: 1.391533, source: 'gtfs' }, // Guyenne – Berry
    'sta-t1-17': { lat: 43.634268, lng: 1.391205, source: 'gtfs' }, // Pasteur – Mairie de Blagnac
    'sta-t1-18': { lat: 43.637137, lng: 1.390268, source: 'gtfs' }, // Place du Relais
    'sta-t1-19': { lat: 43.636249, lng: 1.385321, source: 'gtfs' }, // Odyssud – Ritouret
    'sta-t1-20': { lat: 43.640398, lng: 1.382381, source: 'gtfs' }, // Patinoire – Barradels
    'sta-t1-21': { lat: 43.644743, lng: 1.377467, source: 'gtfs' }, // Grand Noble
    'sta-t1-22': { lat: 43.648537, lng: 1.376072, source: 'gtfs' }, // Place Georges Brassens
    'sta-t1-23': { lat: 43.65459, lng: 1.374471, source: 'gtfs' }, // Andromède – Lycée
    'sta-t1-24': { lat: 43.660209, lng: 1.369466, source: 'gtfs' }, // Beauzelle – Aéroscopia
    'sta-t1-25': { lat: 43.663265, lng: 1.362763, source: 'gtfs' }, // Aéroconstellation
    'sta-t1-26': { lat: 43.667588, lng: 1.359708, source: 'gtfs' }, // MEETT
    'sta-tel-1': { lat: 43.554698, lng: 1.428278, source: 'gtfs' }, // Oncopole-Lise Enjalbert
    'sta-tel-2': { lat: 43.558294, lng: 1.452852, source: 'gtfs' }, // Hôpital Rangueil-Louis Lareng
    'sta-tel-3': { lat: 43.560645, lng: 1.463553, source: 'gtfs' }, // Université Paul-Sabatier
    'sta-b-21': { lat: 43.55166, lng: 1.48600, source: 'chantier' }, // Parc Technologique du Canal (Place du Canal / Rue Hermès, Ramonville-Saint-Agne)
    'sta-c-1': { lat: 43.6044, lng: 1.3353, source: 'chantier' }, // Colomiers Gare
    'sta-c-3': { lat: 43.6086, lng: 1.3542, source: 'chantier' }, // Fontaine Lumineuse
    'sta-c-4': { lat: 43.6103, lng: 1.3717, source: 'chantier' }, // Saint-Martin-du-Touch (fourni : Saint-Martin du Touch)
    'sta-hub-bla': { lat: 43.6214, lng: 1.3958, source: 'chantier' }, // Blagnac (fourni : Blagnac (Interconnexion LAE))
    'sta-c-6': { lat: 43.6158, lng: 1.4089, source: 'chantier' }, // Sept Deniers – Stade Toulousain (fourni : Sept Deniers - Stade Toulousain)
    'sta-c-7': { lat: 43.6142, lng: 1.4192, source: 'chantier' }, // Ponts-Jumeaux
    'sta-c-8': { lat: 43.6256, lng: 1.4303, source: 'chantier' }, // Fondeyre
    'sta-c-9': { lat: 43.6342, lng: 1.4372, source: 'chantier' }, // La Vache (fourni : La Vache - Le Grand Marché)
    'sta-c-10': { lat: 43.6272, lng: 1.4489, source: 'chantier' }, // Lycée Toulouse-Lautrec (fourni : Lycée Toulouse Lautrec)
    'sta-c-11': { lat: 43.6186, lng: 1.4497, source: 'chantier' }, // Raisin
    'sta-c-12': { lat: 43.6178, lng: 1.4589, source: 'chantier' }, // Bonnefoy
    'sta-c-13': { lat: 43.6111, lng: 1.4542, source: 'chantier' }, // Matabiau Gare (fourni : Marengo - SNCF)
    'sta-c-14': { lat: 43.6011, lng: 1.4514, source: 'chantier' }, // François-Verdier (fourni : François Verdier)
    'sta-c-17': { lat: 43.5828, lng: 1.4794, source: 'chantier' }, // Ormeau (fourni : L'Ormeau)
    'sta-c-18': { lat: 43.5739, lng: 1.4789, source: 'chantier' }, // Montaudran Gare (fourni : Montaudran Gare - Piste des Géants)
    'sta-c-15': { lat: 43.5950, lng: 1.4628, source: 'chantier' }, // Côte Pavée (nom d'étude : Jean Rieux)
    'sta-c-16': { lat: 43.5911, lng: 1.4744, source: 'chantier' }, // Limayrac – Cité de l'Espace (nom d'étude : Côte Pavée - Limayrac)
    'sta-c-19': { lat: 43.5658, lng: 1.4886, source: 'chantier' }, // Aerospace Campus (nom d'étude : Montaudran Innovation Campus)
    'sta-c-20': { lat: 43.5539, lng: 1.5036, source: 'chantier' }, // Labège Madron (nom d'étude : Institut Polytechnique de Toulouse)
    'sta-c-21': { lat: 43.5436, lng: 1.5094, source: 'chantier' }, // Diagora (nom d'étude : Labège Enova)
    'sta-c-22': { lat: 43.5358, lng: 1.5175, source: 'chantier' }, // Labège Gare
    'sta-aero-nad': { lat: 43.6247, lng: 1.3831, source: 'chantier' }, // Nadot
    'sta-aero-dau': { lat: 43.6292, lng: 1.3736, source: 'chantier' }, // Daurat
    'sta-aero-atb': { lat: 43.6306, lng: 1.3656, source: 'chantier' }, // Aéroport Toulouse Blagnac (fourni : Aéroport)
};
