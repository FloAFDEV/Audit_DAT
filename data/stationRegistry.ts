/**
 * stationRegistry.ts — v3
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCE DE VÉRITÉ CENTRALE du réseau Tisséo (audit DAT / Tram / Téléo).
 *
 * Changements v3 vs v2 :
 *   • StationDef.isHub?: boolean
 *     Marqueur explicite pour les nœuds d'échange multi-lignes.
 *   • StationDef.adjacentStations?: string[]
 *     Stations suivantes dans le sens de parcours (permet de modéliser
 *     les bifurcations et les terminus).
 *   • BLA : connections réduits à ['SER', 'NAD'] (correspondances T1/AEROPORT),
 *     adjacentStations: ['SDN'] (C → sens Labège), isHub: true.
 *   • SER : adjacentStations: ['GUY', 'BLA'] (bifurcation T1/AEROPORT),
 *     connections: ['BLA'] (accès à la branche AEROPORT).
 *   • adjacentStations ajouté sur toutes les stations T1, LAE et Ligne C.
 *   • getHubs() filtre désormais sur isHub === true.
 *   • assertRegistryIntegrity() inclut la validation des adjacentStations.
 *
 * TRIGRAMMES T1 — TABLE DE CORRESPONDANCE
 * ────────────────────────────────────────
 *   Codes validés (historique SI) — NE JAMAIS MODIFIER :
 *     PSM LDD FAC MRO CDP GAS ARO ZTH RAP CCH PUR HIP ANC SER
 *     GUY PAS REL PTN GNO GBR LYC BEA MET
 *   Codes provisoires (en attente de validation SI) :
 *     ODY  — Odyssud - Ritouret       (requis pour la chaîne adjacentStations)
 *     ACO  — Aéroconstellation        (requis pour la chaîne adjacentStations)
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Identifiant de toutes les lignes du réseau (existantes et futures). */
export type NetworkLine = 'A' | 'B' | 'C' | 'T1' | 'AEROPORT' | 'TELEO';

/**
 * Définition riche d'une station, utilisée dans le registre central.
 * Distincte de `Station` (types.ts) qui porte les données d'audit runtime.
 */
export interface StationDef {
    /** Identifiant stable — clé primaire en base et dans le store. */
    id: string;

    /** Nom interne canonique (référence technique). */
    name: string;

    /**
     * Nom public affiché aux usagers (si différent du nom interne).
     * Ex : "Jean Maga" — variante de "Blagnac" en cours de validation officielle.
     */
    publicName?: string;

    /**
     * Trigramme 3 lettres MAJUSCULES — globalement unique dans ALL_STATION_DEFS.
     * Absent sur quelques stations Téléo (identification par nom).
     * ⚠️  Ne jamais modifier les codes validés (historique SI).
     */
    code?: string;

    /**
     * Lignes d'appartenance.
     * Tableau pour les HUBs multi-lignes (ex : BLA → ['T1', 'AEROPORT', 'C']).
     */
    lines: NetworkLine[];

    /**
     * Vrai si la station est un nœud d'échange physique multi-lignes.
     * Doit être true si lines.length > 1 (cohérence vérifiée par assertRegistryIntegrity).
     */
    isHub?: boolean;

    /**
     * La station est-elle active dans l'application d'audit ?
     * Piloté via ACTIVE_LINES uniquement — ne jamais modifier côté UI.
     */
    isActive: boolean;

    /** Vrai si la station n'est pas encore en service réel. */
    isFuture: boolean;

    /**
     * Vrai si la station appartient à une antenne (branche) et non au
     * tronc principal de sa ligne. Ex : BLA, NAD, DAU, ATB (branche AEROPORT).
     */
    isBranch?: boolean;

    /**
     * Clé de regroupement physique pour les lieux partagés entre lignes.
     * Ex : "Jean-Jaurès" (Métro A + B), "Arènes" (Métro A + Tram T1).
     */
    lieuName?: string;

    /**
     * Codes des stations où une correspondance inter-lignes est possible.
     * Signification : "depuis cette station, on peut rejoindre physiquement
     * une autre ligne via la station dont le code est listé."
     *
     * Ex (BLA) : connections: ['SER', 'NAD']
     *   • SER — point de bifurcation T1 vers la branche AEROPORT
     *   • NAD — prochaine station sur l'antenne AEROPORT
     */
    connections?: string[];

    /**
     * Codes des stations SUIVANTES dans le sens de parcours principal.
     * Peut contenir plusieurs codes en cas de bifurcation.
     *
     * Ex (SER) : adjacentStations: ['GUY', 'BLA']
     *   • GUY — tronc T1 principal (vers MEETT)
     *   • BLA — branche AEROPORT (bifurcation depuis SER)
     */
    adjacentStations?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS — SEUL POINT DE CONTRÔLE DE L'ACTIVATION
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVE_LINES: Record<NetworkLine, boolean> = {
    A:        true,  // Métro A         — en service, pleinement audité
    B:        true,  // Métro B         — en service, pleinement audité
    C:        false, // Ligne C         — future ← passer à true pour activer
    T1:       true,  // Tram T1         — en service, pleinement audité
    AEROPORT: false, // Aéroport Express (antenne T1) — future ← passer à true
    TELEO:    true,  // Téléo           — en service, pleinement audité
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// MÉTRO A — 18 stations en service
// ─────────────────────────────────────────────────────────────────────────────

export const REGISTRY_LINE_A: StationDef[] = [
    { id: 'sta-a-1',  name: 'Basso Cambo',               code: 'MBC', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-2',  name: 'Bellefontaine',              code: 'BEL', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-3',  name: 'Reynerie',                   code: 'REY', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-4',  name: 'Mirail-Université',          code: 'MUN', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-5',  name: 'Bagatelle',                  code: 'BAG', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-6',  name: 'Mermoz',                     code: 'MER', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-7',  name: 'Fontaine-Lestang',           code: 'FLE', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-8',  name: 'Arènes',                     code: 'ARE', lines: ['A'], isActive: true, isFuture: false, lieuName: 'Arènes' },
    { id: 'sta-a-9',  name: 'Patte d\'Oie',               code: 'POI', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-10', name: 'Saint-Cyprien - République', code: 'SCY', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-11', name: 'Esquirol',                   code: 'ESQ', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-12', name: 'Capitole',                   code: 'CAP', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-13', name: 'Jean-Jaurès',                code: 'JJA', lines: ['A'], isActive: true, isFuture: false, lieuName: 'Jean-Jaurès' },
    { id: 'sta-a-14', name: 'Marengo-SNCF',               code: 'MAR', lines: ['A'], isActive: true, isFuture: false, lieuName: 'Marengo-SNCF' },
    { id: 'sta-a-15', name: 'Jolimont',                   code: 'JOL', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-16', name: 'Roseraie',                   code: 'ROS', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-17', name: 'Argoulets',                  code: 'ARG', lines: ['A'], isActive: true, isFuture: false },
    { id: 'sta-a-18', name: 'Balma-Gramont',              code: 'BGR', lines: ['A'], isActive: true, isFuture: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// MÉTRO B — 20 stations en service + 2 futures
// ─────────────────────────────────────────────────────────────────────────────

export const REGISTRY_LINE_B: StationDef[] = [
    { id: 'sta-b-1',  name: 'Borderouge',                   code: 'BOR', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-2',  name: 'Trois Cocus',                  code: 'TCO', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-3',  name: 'La Vache',                     code: 'LVA', lines: ['B'], isActive: true,  isFuture: false, lieuName: 'La Vache' },
    { id: 'sta-b-4',  name: 'Barrière de Paris',            code: 'BPA', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-5',  name: 'Minimes - Claude Nougaro',     code: 'MIN', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-6',  name: 'Canal du Midi',                code: 'CAN', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-7',  name: 'Compans-Caffarelli',           code: 'CCA', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-8',  name: 'Jeanne d\'Arc',                code: 'JAR', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-9',  name: 'Jean-Jaurès',                  code: 'JJB', lines: ['B'], isActive: true,  isFuture: false, lieuName: 'Jean-Jaurès' },
    { id: 'sta-b-10', name: 'François Verdier',             code: 'FVE', lines: ['B'], isActive: true,  isFuture: false, lieuName: 'François Verdier' },
    { id: 'sta-b-11', name: 'Carmes',                       code: 'CAR', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-12', name: 'Palais de Justice',            code: 'PDJ', lines: ['B'], isActive: true,  isFuture: false, lieuName: 'Palais de Justice' },
    { id: 'sta-b-13', name: 'Saint-Michel - Marcel Langer', code: 'SMI', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-14', name: 'Empalot',                      code: 'EMP', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-15', name: 'Saint-Agne - SNCF',            code: 'SAG', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-16', name: 'Saouzelong',                   code: 'SAO', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-17', name: 'Rangueil',                     code: 'RAN', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-18', name: 'Faculté de Pharmacie',         code: 'PHA', lines: ['B'], isActive: true,  isFuture: false },
    { id: 'sta-b-19', name: 'Université Paul Sabatier',     code: 'UPS', lines: ['B'], isActive: true,  isFuture: false, lieuName: 'Université Paul-Sabatier' },
    { id: 'sta-b-20', name: 'Ramonville',                   code: 'RAM', lines: ['B'], isActive: true,  isFuture: false },
    // ── Futures ───────────────────────────────────────────────────────────────
    { id: 'sta-b-21', name: 'Parc du Canal',  lines: ['B'], isActive: false, isFuture: true },
    { id: 'sta-b-22', name: 'Labège Madron',  lines: ['B'], isActive: false, isFuture: true, lieuName: 'Labège Madron' },
];

// ─────────────────────────────────────────────────────────────────────────────
// LIGNE C — 20 stations futures (BLA → REGISTRY_INTERCHANGE_HUBS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Activation : ACTIVE_LINES.C = true.
 *
 * BLA (Blagnac) est dans REGISTRY_INTERCHANGE_HUBS — nœud commun T1/AEROPORT/C.
 * La chaîne adjacentStations C est : COG→FLU→SMA→[BLA]→SDN→PJU→…→LAG
 *
 * MAT (Matabiau Gare) : nœud stratégique futur (SNCF + autres lignes).
 * connections[] sera enrichi lors de la confirmation du projet d'interconnexion.
 */
export const REGISTRY_LINE_C: StationDef[] = [
    { id: 'sta-c-1',  name: 'Colomiers Gare',               code: 'COG', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['FLU'] },
    { id: 'sta-c-3',  name: 'Fontaine Lumineuse',            code: 'FLU', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['SMA'] },
    { id: 'sta-c-4',  name: 'Saint-Martin-du-Touch',         code: 'SMA', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['BLA'] },
    // ── BLA (Blagnac / Jean Maga) → voir REGISTRY_INTERCHANGE_HUBS ─────────
    //    adjacentStations C depuis BLA : ['SDN']
    { id: 'sta-c-6',  name: 'Sept Deniers – Stade Toulousain', code: 'SDN', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['PJU'] },
    { id: 'sta-c-7',  name: 'Ponts-Jumeaux',                 code: 'PJU', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['FON'] },
    { id: 'sta-c-8',  name: 'Fondeyre',                      code: 'FON', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['LVH'] },
    { id: 'sta-c-9',  name: 'La Vache',                      code: 'LVH', lines: ['C'], isActive: false, isFuture: true, lieuName: 'La Vache', adjacentStations: ['TLA'] },
    { id: 'sta-c-10', name: 'Lycée Toulouse-Lautrec',        code: 'TLA', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['RAI'] },
    { id: 'sta-c-11', name: 'Raisin',                        code: 'RAI', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['BON'] },
    { id: 'sta-c-12', name: 'Bonnefoy',                      code: 'BON', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['MAT'] },
    {
        id: 'sta-c-13', name: 'Matabiau Gare', code: 'MAT', lines: ['C'],
        isActive: false, isFuture: true, lieuName: 'Marengo-SNCF',
        adjacentStations: ['FVD'],
        connections: [], // futur pôle d'échange SNCF — à enrichir lors de la confirmation
    },
    { id: 'sta-c-14', name: 'François-Verdier',              code: 'FVD', lines: ['C'], isActive: false, isFuture: true, lieuName: 'François Verdier', adjacentStations: ['CPA'] },
    { id: 'sta-c-15', name: 'Côte Pavée',                    code: 'CPA', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['LIM'] },
    { id: 'sta-c-16', name: 'Limayrac – Cité de l\'Espace',  code: 'LIM', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['ORM'] },
    { id: 'sta-c-17', name: 'Ormeau',                        code: 'ORM', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['MOG'] },
    { id: 'sta-c-18', name: 'Montaudran Gare',               code: 'MOG', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['AEC'] },
    { id: 'sta-c-19', name: 'Aerospace Campus',              code: 'AEC', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['LMA'] },
    { id: 'sta-c-20', name: 'Labège Madron',                 code: 'LMA', lines: ['C'], isActive: false, isFuture: true, lieuName: 'Labège Madron', adjacentStations: ['DIA'] },
    { id: 'sta-c-21', name: 'Diagora',                       code: 'DIA', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['LAG'] },
    { id: 'sta-c-22', name: 'Labège Gare',                   code: 'LAG', lines: ['C'], isActive: false, isFuture: true, adjacentStations: [] /* terminus */ },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRAM T1 — 25 stations en service (tronc principal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TRIGRAMMES — règles d'attribution :
 *   Validés historique SI (23) :
 *     PSM LDD FAC MRO CDP GAS ARO ZTH RAP CCH PUR HIP ANC SER
 *     GUY PAS REL PTN GNO GBR LYC BEA MET
 *   Provisoires — en attente de validation SI (2) :
 *     ODY  (Odyssud - Ritouret)   — nécessaire pour chaîne adjacentStations
 *     ACO  (Aéroconstellation)    — nécessaire pour chaîne adjacentStations
 *   Codes de lieu partagé (mêmes lieux physiques qu'une autre ligne) :
 *     PSM  ≠  PDJ  (Métro B, même lieuName 'Palais de Justice')
 *     ARO  ≠  ARE  (Métro A, même lieuName 'Arènes')
 *
 * BIFURCATION T1 / AÉROPORT EXPRESS :
 *   … ANC → SER ──► GUY → PAS → REL → … (tronc T1 principal)
 *               └──► BLA → NAD → DAU → ATB (antenne AEROPORT)
 */
export const REGISTRY_TRAM_T1: StationDef[] = [
    // ── Sens : Palais de Justice → MEETT ──────────────────────────────────
    { id: 'sta-t1-1',  name: 'Palais de Justice',               code: 'PSM', lines: ['T1'], isActive: true, isFuture: false, lieuName: 'Palais de Justice', adjacentStations: ['LDD'] },
    { id: 'sta-t1-2',  name: 'Île du Ramier',                   code: 'LDD', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['FAC'] },
    { id: 'sta-t1-3',  name: 'Fer à Cheval',                    code: 'FAC', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['MRO'] },
    { id: 'sta-t1-4',  name: 'Avenue de Muret - Marcel Cavaillé', code: 'MRO', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['CDP'] },
    { id: 'sta-t1-5',  name: 'Croix de Pierre',                 code: 'CDP', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['GAS'] },
    { id: 'sta-t1-6',  name: 'Déodat de Séverac',               code: 'GAS', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ARO'] },
    { id: 'sta-t1-7',  name: 'Arènes',                          code: 'ARO', lines: ['T1'], isActive: true, isFuture: false, lieuName: 'Arènes',           adjacentStations: ['ZTH'] },
    { id: 'sta-t1-8',  name: 'Zénith',                          code: 'ZTH', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['RAP'] },
    { id: 'sta-t1-9',  name: 'Cartoucherie',                    code: 'RAP', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['CCH'] },
    { id: 'sta-t1-10', name: 'Casselardit',                     code: 'CCH', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['PUR'] },
    { id: 'sta-t1-11', name: 'Purpan',                          code: 'PUR', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['HIP'] },
    { id: 'sta-t1-12', name: 'Hôpital Purpan',                  code: 'HIP', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ANC'] },
    { id: 'sta-t1-13', name: 'Ancely',                          code: 'ANC', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['SER'] },
    // ── Point de bifurcation ──────────────────────────────────────────────
    // SER → GUY  : tronc T1 principal (sens MEETT)
    // SER → BLA  : antenne AEROPORT Express
    {
        id: 'sta-t1-14', name: 'Servanty - Airbus',
        code: 'SER', lines: ['T1'], isActive: true, isFuture: false,
        adjacentStations: ['GUY', 'BLA'], // bifurcation
        connections:      ['BLA'],        // accès à la branche AEROPORT / HUB BLA
    },
    // ── Tronc principal T1 (suite) ────────────────────────────────────────
    { id: 'sta-t1-15', name: 'Guyenne - Berry',                 code: 'GUY', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['PAS'] },
    { id: 'sta-t1-16', name: 'Pasteur - Mairie de Blagnac',     code: 'PAS', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['REL'] },
    { id: 'sta-t1-17', name: 'Place du Relais',                 code: 'REL', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ODY'] },
    { id: 'sta-t1-18', name: 'Odyssud - Ritouret',              code: 'ODY', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['PTN'] }, // ODY : provisoire
    { id: 'sta-t1-19', name: 'Patinoire - Barradels',           code: 'PTN', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['GNO'] },
    { id: 'sta-t1-20', name: 'Grand Noble',                     code: 'GNO', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['GBR'] },
    { id: 'sta-t1-21', name: 'Place Georges Brassens',          code: 'GBR', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['LYC'] },
    { id: 'sta-t1-22', name: 'Andromède - Lycée',               code: 'LYC', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['BEA'] },
    { id: 'sta-t1-23', name: 'Beauzelle - Aéroscopia',          code: 'BEA', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ACO'] },
    { id: 'sta-t1-24', name: 'Aéroconstellation',               code: 'ACO', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['MET'] }, // ACO : provisoire
    { id: 'sta-t1-25', name: 'MEETT',                           code: 'MET', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: [] /* terminus */ },
];

// ─────────────────────────────────────────────────────────────────────────────
// AÉROPORT EXPRESS — antenne T1, 3 stations (BLA → REGISTRY_INTERCHANGE_HUBS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sens logique (depuis la bifurcation) :
 *   SER ──[bifurcation]──► BLA (HUB) → NAD → DAU → ATB
 *
 * Activation : ACTIVE_LINES.AEROPORT = true + logique builder.ts.
 */
export const REGISTRY_AEROPORT_EXPRESS: StationDef[] = [
    {
        id: 'sta-aero-nad', name: 'Nadot', code: 'NAD',
        lines: ['AEROPORT'], isActive: false, isFuture: true, isBranch: true,
        adjacentStations: ['DAU'],
        connections:      ['BLA'], // BLA est le HUB d'interconnexion T1/C accessible depuis NAD
    },
    {
        id: 'sta-aero-dau', name: 'Daurat', code: 'DAU',
        lines: ['AEROPORT'], isActive: false, isFuture: true, isBranch: true,
        adjacentStations: ['ATB'],
    },
    {
        id: 'sta-aero-atb', name: 'Aéroport Toulouse Blagnac', code: 'ATB',
        lines: ['AEROPORT'], isActive: false, isFuture: true, isBranch: true,
        adjacentStations: [], // terminus
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// TÉLÉO — 3 stations en service
// ─────────────────────────────────────────────────────────────────────────────

export const REGISTRY_TELEO: StationDef[] = [
    { id: 'sta-tel-1', name: 'Oncopole-Lise Enjalbert',       lines: ['TELEO'], isActive: true, isFuture: false },
    { id: 'sta-tel-2', name: 'Hôpital Rangueil-Louis Lareng', lines: ['TELEO'], isActive: true, isFuture: false },
    { id: 'sta-tel-3', name: 'Université Paul-Sabatier',       lines: ['TELEO'], isActive: true, isFuture: false, lieuName: 'Université Paul-Sabatier' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HUBs D'INTERCONNEXION — stations multi-lignes (lines.length > 1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BLA — Blagnac / Jean Maga
 * ─────────────────────────
 *   Nœud d'échange entre T1 (branche AEROPORT), AEROPORT Express et Ligne C.
 *
 *   Topologie :
 *     T1 main ─── SER ──[bifurcation]──► BLA ──► NAD ──► DAU ──► ATB
 *     Ligne C ─── SMA ──────────────────► BLA ──► SDN ──► PJU ──► …
 *
 *   connections: ['SER', 'NAD']
 *     • SER — point de bifurcation T1, accès à la branche AEROPORT depuis le tronc principal
 *     • NAD — prochaine station AEROPORT (correspondance explicitement requise)
 *
 *   adjacentStations: ['SDN']
 *     • SDN — prochaine station sur Ligne C (sens Labège / terminus)
 *     • La direction AEROPORT (vers NAD) est couverte par connections['NAD']
 *
 *   publicName: "Jean Maga" — en cours de validation officielle.
 *   ⚠️  Modifier UNIQUEMENT publicName si le nom change, jamais `name`.
 */
export const REGISTRY_INTERCHANGE_HUBS: StationDef[] = [
    {
        id:               'sta-hub-bla',
        name:             'Blagnac',
        publicName:       'Jean Maga',
        code:             'BLA',
        lines:            ['T1', 'AEROPORT', 'C'],
        isHub:            true,
        isActive:         false,
        isFuture:         true,
        isBranch:         true,
        connections:      ['SER', 'NAD'],
        adjacentStations: ['SDN'],
    },
    // ── Futurs HUBs à déclarer ici ─────────────────────────────────────────
    // Règle : isHub: true OBLIGATOIRE si lines.length > 1
];

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_STATION_DEFS: StationDef[] = [
    ...REGISTRY_LINE_A,
    ...REGISTRY_LINE_B,
    ...REGISTRY_LINE_C,
    ...REGISTRY_TRAM_T1,
    ...REGISTRY_AEROPORT_EXPRESS,
    ...REGISTRY_TELEO,
    ...REGISTRY_INTERCHANGE_HUBS,
];

// ─────────────────────────────────────────────────────────────────────────────
// FONCTIONS UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne les stations actives (isActive ET au moins une ligne activée dans ACTIVE_LINES).
 *
 * @param line - Filtre optionnel par ligne. Si omis : toutes les lignes actives.
 *
 * @example
 *   getActiveStations()        // tout le réseau actif
 *   getActiveStations('T1')    // Tram T1 uniquement
 *   getActiveStations('C')     // [] tant que ACTIVE_LINES.C = false
 */
export function getActiveStations(line?: NetworkLine): StationDef[] {
    return ALL_STATION_DEFS.filter(s => {
        if (!s.isActive) return false;
        if (!s.lines.some(l => ACTIVE_LINES[l])) return false;
        if (line !== undefined && !s.lines.includes(line)) return false;
        return true;
    });
}

/**
 * Retourne TOUTES les stations d'une ligne (actives, futures, branches, HUBs).
 *
 * @param line - La ligne à interroger.
 */
export function getStationsByLine(line: NetworkLine): StationDef[] {
    return ALL_STATION_DEFS.filter(s => s.lines.includes(line));
}

/**
 * Retourne les stations listées dans connections[] d'une station donnée.
 *
 * @param code - Trigramme de la station source.
 * @returns Tableau des StationDef de correspondance (vide si aucune).
 *
 * @example
 *   getStationConnections('BLA')  // → [StationDef(SER), StationDef(NAD)]
 *   getStationConnections('SER')  // → [StationDef(BLA)]
 */
export function getStationConnections(code: string): StationDef[] {
    const source = ALL_STATION_DEFS.find(s => s.code === code);
    if (!source?.connections?.length) return [];
    return source.connections
        .map(c => ALL_STATION_DEFS.find(s => s.code === c))
        .filter((s): s is StationDef => s !== undefined);
}

/**
 * Retourne les stations listées dans adjacentStations[] d'une station donnée.
 *
 * @param code - Trigramme de la station source.
 * @returns Tableau des StationDef suivantes dans le parcours.
 *
 * @example
 *   getAdjacentStations('SER')  // → [StationDef(GUY), StationDef(BLA)]
 */
export function getAdjacentStations(code: string): StationDef[] {
    const source = ALL_STATION_DEFS.find(s => s.code === code);
    if (!source?.adjacentStations?.length) return [];
    return source.adjacentStations
        .map(c => ALL_STATION_DEFS.find(s => s.code === c))
        .filter((s): s is StationDef => s !== undefined);
}

/**
 * Retourne les nœuds d'échange multi-lignes (isHub === true).
 */
export function getHubs(): StationDef[] {
    return ALL_STATION_DEFS.filter(s => s.isHub === true);
}

/**
 * Retourne les stations d'antenne actives (isBranch + isActive + ligne activée).
 * Vide tant que ACTIVE_LINES.AEROPORT = false.
 */
export function getActiveBranchStations(): StationDef[] {
    return ALL_STATION_DEFS.filter(
        s => s.isBranch === true && s.isActive && s.lines.some(l => ACTIVE_LINES[l]),
    );
}

/**
 * Retourne toutes les stations futures, actives ou non.
 *
 * @param line - Filtre optionnel par ligne.
 */
export function getFutureStations(line?: NetworkLine): StationDef[] {
    return ALL_STATION_DEFS.filter(s => {
        if (!s.isFuture) return false;
        if (line !== undefined && !s.lines.includes(line)) return false;
        return true;
    });
}

/**
 * Recherche une station par son trigramme.
 *
 * @param code                    - Trigramme (ex : 'BGR', 'BLA', 'ATB').
 * @param options.line            - Restreindre aux stations contenant cette ligne.
 * @param options.includeInactive - Inclure les stations dont toutes les lignes
 *                                  sont inactives (par défaut : false).
 *
 * @example
 *   getStationByCode('BLA', { includeInactive: true })  // → StationDef(BLA)
 *   getStationByCode('BLA')                             // → undefined (inactif)
 */
export function getStationByCode(
    code: string,
    options: { line?: NetworkLine; includeInactive?: boolean } = {},
): StationDef | undefined {
    return ALL_STATION_DEFS.find(s => {
        if (s.code !== code) return false;
        if (options.line && !s.lines.includes(options.line)) return false;
        if (!options.includeInactive && !s.lines.some(l => ACTIVE_LINES[l])) return false;
        return true;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSERTIONS D'INTÉGRITÉ
// ─────────────────────────────────────────────────────────────────────────────

/** @throws si un trigramme est dupliqué dans ALL_STATION_DEFS. */
export function assertNoDuplicateCodes(): void {
    const seen = new Map<string, string>();
    for (const s of ALL_STATION_DEFS) {
        if (!s.code) continue;
        if (seen.has(s.code)) {
            throw new Error(
                `[stationRegistry] Trigramme dupliqué : "${s.code}" utilisé par ` +
                `"${seen.get(s.code)}" ET "${s.name}".`,
            );
        }
        seen.set(s.code, s.name);
    }
}

/** @throws si un identifiant (id) est dupliqué dans ALL_STATION_DEFS. */
export function assertNoDuplicateIds(): void {
    const seen = new Map<string, string>();
    for (const s of ALL_STATION_DEFS) {
        if (seen.has(s.id)) {
            throw new Error(
                `[stationRegistry] ID dupliqué : "${s.id}" utilisé par ` +
                `"${seen.get(s.id)}" ET "${s.name}".`,
            );
        }
        seen.set(s.id, s.name);
    }
}

/**
 * Vérifie que tous les codes référencés dans connections[] ET adjacentStations[]
 * correspondent à des stations existantes dans ALL_STATION_DEFS.
 *
 * @throws si un code référencé est introuvable.
 */
export function assertReferencedCodesExist(): void {
    const allCodes = new Set(ALL_STATION_DEFS.map(s => s.code).filter(Boolean));

    for (const s of ALL_STATION_DEFS) {
        const refs = [...(s.connections ?? []), ...(s.adjacentStations ?? [])];
        for (const ref of refs) {
            if (!allCodes.has(ref)) {
                throw new Error(
                    `[stationRegistry] Code introuvable : "${s.name}" (${s.code ?? s.id}) ` +
                    `référence "${ref}" (absent de ALL_STATION_DEFS).`,
                );
            }
        }
    }
}

/**
 * Vérifie la cohérence des HUBs :
 *   isHub: true  ⟹  lines.length > 1
 *   lines.length > 1  ⟹  isHub: true
 *
 * @throws si un HUB n'a qu'une ligne, ou si une station multi-lignes n'est pas marquée HUB.
 */
export function assertHubsConsistency(): void {
    for (const s of ALL_STATION_DEFS) {
        if (s.isHub && s.lines.length <= 1) {
            throw new Error(
                `[stationRegistry] "${s.name}" est marqué isHub:true mais n'a qu'une ligne : ${s.lines}.`,
            );
        }
        if (!s.isHub && s.lines.length > 1) {
            throw new Error(
                `[stationRegistry] "${s.name}" a ${s.lines.length} lignes mais isHub n'est pas true. ` +
                `Ajouter isHub: true ou déplacer dans REGISTRY_INTERCHANGE_HUBS.`,
            );
        }
    }
}

/**
 * Exécute toutes les assertions d'intégrité.
 * À appeler dans les tests ou au démarrage en environnement de développement.
 *
 * @example
 *   import { assertRegistryIntegrity } from './stationRegistry';
 *   assertRegistryIntegrity();
 */
export function assertRegistryIntegrity(): void {
    assertNoDuplicateIds();
    assertNoDuplicateCodes();
    assertReferencedCodesExist();
    assertHubsConsistency();
}
