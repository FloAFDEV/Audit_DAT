/**
 * stationRegistry.ts — v5
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCE DE VÉRITÉ CENTRALE du réseau Tisséo.
 *
 * CODES SI T1 — VALIDÉS v7 (ordre officiel SI) :
 *   PSM LDD FAC MRO CDP ACO ARE HIP ZTH RAP
 *   PUR ARO ANC SER GUY PAS REL ODY PTN
 *   GNO GBR LYC BEA GAS MET
 *
 * CORRECTION v7 (vs v6) :
 *   CCH (Casselardit) SUPPRIMÉ — absent du référentiel SI officiel
 *   NAD DAU ATB : lines corrigé → ['T1', 'AEROPORT'] (branche T1)
 *
 * CORRECTIONS v6 (vs v5) :
 *   ACO   ← Déodat de Séverac        (était DSV en v5 — code SI officiel confirmé)
 *   ARE   ← Arènes T1                (était ARO en v5 ; partage lieuName avec Métro A ARE)
 *   ARO   ← Arènes Romaines          (était ARR en v5)
 *
 * CORRECTIONS v5 (vs v4) :
 *   MRO   ← Avenue de Muret - MC     (retour code v3 ; était ODY en v4)
 *   ODY   ← Odyssud - Ritouret       (retour code v3 ; était MRO en v4)
 *   GAS   ← Aéroconstellation        (nom raccourci : était Garossos-Aéroconstellation)
 *
 * CODES TÉLÉO — provisoires (en attente de validation SI) :
 *   OLE  Oncopole-Lise Enjalbert
 *   HRG  Hôpital Rangueil-Louis Lareng
 *   UPT  Université Paul-Sabatier Téléo  (UPS = Métro B, usage distinct)
 *
 * TOPOLOGIE AÉROPORT EXPRESS (LAE) :
 *   T1 : … CDP → ACO → ARE → HIP → … → ANC → BLA ──[bifurcation]──► NAD → DAU → ATB
 *                                                         └──► SER → GUY → PAS → REL → ODY → … → GAS → MET
 *
 * ACTIVATION LIGNES FUTURES :
 *   ACTIVE_LINES.AEROPORT = true  → antenne LAE active
 *   ACTIVE_LINES.C        = true  → Ligne C active
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type NetworkLine = 'A' | 'B' | 'C' | 'T1' | 'AEROPORT' | 'TELEO';

export interface StationDef {
    id:               string;
    /** Nom interne technique (référence stable). */
    name:             string;
    /** Nom affiché aux usagers, si différent du nom interne. */
    publicName?:      string;
    /**
     * Trigramme SI officiel (3 lettres majuscules).
     * Absent uniquement sur les stations dont le code n'est pas encore validé.
     * ⚠️ NE JAMAIS modifier les codes validés historiques.
     */
    code?:            string;
    lines:            NetworkLine[];
    /** Nœud d'échange multi-lignes. Obligatoire si lines.length > 1. */
    isHub?:           boolean;
    isActive:         boolean;
    isFuture:         boolean;
    /** Station sur une antenne (branche), pas sur le tronc principal. */
    isBranch?:        boolean;
    /** Clé de regroupement physique inter-lignes (pour builder.ts). */
    lieuName?:        string;
    /** Codes des correspondances inter-lignes disponibles à cette station. */
    connections?:     string[];
    /** Codes des prochaines stations dans le sens de parcours. */
    adjacentStations?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS
// ─────────────────────────────────────────────────────────────────────────────

export const ACTIVE_LINES: Record<NetworkLine, boolean> = {
    A:        true,
    B:        true,
    C:        false, // ← passer à true pour activer la Ligne C
    T1:       true,
    AEROPORT: false, // ← passer à true pour activer l'antenne Aéroport Express
    TELEO:    true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// MÉTRO A — 18 stations en service
// ─────────────────────────────────────────────────────────────────────────────

export const REGISTRY_LINE_A: StationDef[] = [
    { id: 'sta-a-1',  name: 'Basso Cambo',               code: 'MBC', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-2',  name: 'Bellefontaine',              code: 'BEL', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-3',  name: 'Reynerie',                   code: 'REY', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-4',  name: 'Mirail-Université',          code: 'MUN', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-5',  name: 'Bagatelle',                  code: 'BAG', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-6',  name: 'Mermoz',                     code: 'MER', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-7',  name: 'Fontaine-Lestang',           code: 'FLE', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-8',  name: 'Arènes',                     code: 'ARE', lines: ['A'], isActive: true,  isFuture: false, lieuName: 'Arènes' },
    { id: 'sta-a-9',  name: 'Patte d\'Oie',               code: 'POI', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-10', name: 'Saint-Cyprien - République', code: 'SCY', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-11', name: 'Esquirol',                   code: 'ESQ', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-12', name: 'Capitole',                   code: 'CAP', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-13', name: 'Jean-Jaurès',                code: 'JJA', lines: ['A'], isActive: true,  isFuture: false, lieuName: 'Jean-Jaurès' },
    { id: 'sta-a-14', name: 'Marengo-SNCF',               code: 'MAR', lines: ['A'], isActive: true,  isFuture: false, lieuName: 'Marengo-SNCF' },
    { id: 'sta-a-15', name: 'Jolimont',                   code: 'JOL', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-16', name: 'Roseraie',                   code: 'ROS', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-17', name: 'Argoulets',                  code: 'ARG', lines: ['A'], isActive: true,  isFuture: false },
    { id: 'sta-a-18', name: 'Balma-Gramont',              code: 'BGR', lines: ['A'], isActive: true,  isFuture: false },
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
    { id: 'sta-b-21', name: 'Parc du Canal',                lines: ['B'], isActive: false, isFuture: true },
    { id: 'sta-b-22', name: 'Labège Madron',                lines: ['B'], isActive: false, isFuture: true, lieuName: 'Labège Madron' },
];

// ─────────────────────────────────────────────────────────────────────────────
// LIGNE C — 20 stations futures (BLA → REGISTRY_INTERCHANGE_HUBS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Chaîne adjacentStations C :
 *   COG → FLU → SMA → [BLA] → SDN → PJU → FON → LVH → TLA → RAI
 *       → BON → MAT → FVD → CPA → LIM → ORM → MOG → AEC → LMA → DIA → LAG
 *
 * MAT (Matabiau) : nœud stratégique futur — connections[] à enrichir.
 */
export const REGISTRY_LINE_C: StationDef[] = [
    { id: 'sta-c-1',  name: 'Colomiers Gare',               code: 'COG', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['FLU'] },
    { id: 'sta-c-3',  name: 'Fontaine Lumineuse',            code: 'FLU', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['SMA'] },
    { id: 'sta-c-4',  name: 'Saint-Martin-du-Touch',         code: 'SMA', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['BLA'] },
    // BLA est dans REGISTRY_INTERCHANGE_HUBS — la chaîne C continue à SDN depuis BLA
    { id: 'sta-c-6',  name: 'Sept Deniers – Stade Toulousain', code: 'SDN', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['PJU'] },
    { id: 'sta-c-7',  name: 'Ponts-Jumeaux',                 code: 'PJU', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['FON'] },
    { id: 'sta-c-8',  name: 'Fondeyre',                      code: 'FON', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['LVH'] },
    { id: 'sta-c-9',  name: 'La Vache',                      code: 'LVH', lines: ['C'], isActive: false, isFuture: true, lieuName: 'La Vache',     adjacentStations: ['TLA'] },
    { id: 'sta-c-10', name: 'Lycée Toulouse-Lautrec',        code: 'TLA', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['RAI'] },
    { id: 'sta-c-11', name: 'Raisin',                        code: 'RAI', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['BON'] },
    { id: 'sta-c-12', name: 'Bonnefoy',                      code: 'BON', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['MAT'] },
    {
        id: 'sta-c-13', name: 'Matabiau Gare', code: 'MAT', lines: ['C'],
        isActive: false, isFuture: true, lieuName: 'Marengo-SNCF',
        adjacentStations: ['FVD'],
        connections: [], // à enrichir : pôle d'échange SNCF + futures lignes
    },
    { id: 'sta-c-14', name: 'François-Verdier',              code: 'FVD', lines: ['C'], isActive: false, isFuture: true, lieuName: 'François Verdier', adjacentStations: ['CPA'] },
    { id: 'sta-c-15', name: 'Côte Pavée',                    code: 'CPA', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['LIM'] },
    { id: 'sta-c-16', name: 'Limayrac – Cité de l\'Espace',  code: 'LIM', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['ORM'] },
    { id: 'sta-c-17', name: 'Ormeau',                        code: 'ORM', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['MOG'] },
    { id: 'sta-c-18', name: 'Montaudran Gare',               code: 'MOG', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['AEC'] },
    { id: 'sta-c-19', name: 'Aerospace Campus',              code: 'AEC', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['LMA'] },
    { id: 'sta-c-20', name: 'Labège Madron',                 code: 'LMA', lines: ['C'], isActive: false, isFuture: true, lieuName: 'Labège Madron', adjacentStations: ['DIA'] },
    { id: 'sta-c-21', name: 'Diagora',                       code: 'DIA', lines: ['C'], isActive: false, isFuture: true, adjacentStations: ['LAG'] },
    { id: 'sta-c-22', name: 'Labège Gare',                   code: 'LAG', lines: ['C'], isActive: false, isFuture: true, adjacentStations: [] },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRAM T1 — 26 stations en service (tronc principal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TABLE DES CODES SI (v5) :
 *
 *  Pos  Code  Station
 *  ───  ────  ──────────────────────────────────────
 *   1   PSM   Palais de Justice  (≠ PDJ Métro B, même lieuName)
 *   2   LDD   Île du Ramier
 *   3   FAC   Fer à Cheval
 *   4   MRO   Avenue de Muret – Marcel Cavaillé     ← retour v3 (était ODY en v4)
 *   5   CDP   Croix de Pierre
 *   6   ACO   Déodat de Séverac                     ← code SI officiel validé v6
 *   7   ARE   Arènes T1  (= ARE Métro A, même lieuName — même lieu physique)
 *   8   HIP   Hippodrome                            ← NOUVELLE station v5
 *   9   ZTH   Zénith
 *  10   RAP   Cartoucherie                          (SI [60033])
 *  11   PUR   Purpan                                (SI [60041])
 *  12   ARO   Arènes Romaines                       (SI [60051]) ← NOUVELLE station v5
 *  13   ANC   Ancely                                (SI [60061])
 * [BLA]        Blagnac / Jean Maga [BIFURCATION T1/LAE/C] → REGISTRY_INTERCHANGE_HUBS
 *  15   SER   Servanty – Airbus
 *  16   GUY   Guyenne – Berry
 *  17   PAS   Pasteur – Mairie de Blagnac
 *  18   REL   Place du Relais
 *  19   ODY   Odyssud – Ritouret                    ← retour v3 (était MRO en v4)
 *  20   PTN   Patinoire – Barradels
 *  21   GNO   Grand Noble
 *  22   GBR   Place Georges Brassens
 *  23   LYC   Andromède – Lycée
 *  24   BEA   Beauzelle – Aéroscopia
 *  25   GAS   Aéroconstellation                     ← nom raccourci (était Garossos-)
 *  26   MET   MEETT
 *
 * BIFURCATION (depuis BLA, intercalé entre ANC et SER) :
 *   BLA.adjacentStations = ['SER', 'NAD', 'SDN']
 *   → SER : tronc T1 principal (vers MEETT)
 *   → NAD : antenne LAE (Aéroport Express)
 *   → SDN : Ligne C (sens Labège)
 */
export const REGISTRY_TRAM_T1: StationDef[] = [
    { id: 'sta-t1-1',  name: 'Palais de Justice',              code: 'PSM',  lines: ['T1'], isActive: true, isFuture: false, lieuName: 'Palais de Justice', adjacentStations: ['LDD'] },
    { id: 'sta-t1-2',  name: 'Île du Ramier',                  code: 'LDD',  lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['FAC'] },
    { id: 'sta-t1-3',  name: 'Fer à Cheval',                   code: 'FAC',  lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['MRO'] },
    { id: 'sta-t1-4',  name: 'Avenue de Muret – Marcel Cavaillé', code: 'MRO', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['CDP'] },
    { id: 'sta-t1-5',  name: 'Croix de Pierre',                  code: 'CDP', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ACO'] },
    { id: 'sta-t1-6',  name: 'Déodat de Séverac',                code: 'ACO', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ARE'] },
    // ARE partagé avec Métro A sta-a-8 (même lieu physique — voir assertNoDuplicateCodes pour exception lieuName)
    { id: 'sta-t1-7',  name: 'Arènes',                         code: 'ARE',  lines: ['T1'], isActive: true, isFuture: false, lieuName: 'Arènes', adjacentStations: ['HIP'] },
    // ← NOUVELLE station v5
    { id: 'sta-t1-8',  name: 'Hippodrome',                     code: 'HIP',  lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ZTH'] },
    { id: 'sta-t1-9',  name: 'Zénith',                         code: 'ZTH',  lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['RAP'] },
    { id: 'sta-t1-10', name: 'Cartoucherie',                   code: 'RAP',  lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['PUR'] },
    { id: 'sta-t1-12', name: 'Purpan',                           code: 'PUR', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ARO'] },
    // ← NOUVELLE station v5 (remplace Hôpital Purpan)
    { id: 'sta-t1-13', name: 'Arènes Romaines',                  code: 'ARO', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ANC'] },
    { id: 'sta-t1-14', name: 'Ancely',                         code: 'ANC',  lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['BLA'] },
    // ── BIFURCATION ───────────────────────────────────────────────────────────
    // BLA → SER  : tronc T1 (sens MEETT)   [BLA est entre ANC et SER]
    // BLA → NAD  : antenne LAE Aéroport Express
    // BLA → SDN  : Ligne C (sens Labège)
    { id: 'sta-t1-15', name: 'Servanty – Airbus',                code: 'SER', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['GUY'] },
    // ── Tronc T1 principal (suite) ────────────────────────────────────────────
    { id: 'sta-t1-16', name: 'Guyenne – Berry',                  code: 'GUY', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['PAS'] },
    { id: 'sta-t1-17', name: 'Pasteur – Mairie de Blagnac',      code: 'PAS', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['REL'] },
    { id: 'sta-t1-18', name: 'Place du Relais',                  code: 'REL', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['ODY'] },
    { id: 'sta-t1-19', name: 'Odyssud – Ritouret',               code: 'ODY', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['PTN'] },
    { id: 'sta-t1-20', name: 'Patinoire – Barradels',            code: 'PTN', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['GNO'] },
    { id: 'sta-t1-21', name: 'Grand Noble',                      code: 'GNO', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['GBR'] },
    { id: 'sta-t1-22', name: 'Place Georges Brassens',           code: 'GBR', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['LYC'] },
    { id: 'sta-t1-23', name: 'Andromède – Lycée',                code: 'LYC', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['BEA'] },
    { id: 'sta-t1-24', name: 'Beauzelle – Aéroscopia',           code: 'BEA', lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['GAS'] },
    { id: 'sta-t1-25', name: 'Aéroconstellation',              code: 'GAS',  lines: ['T1'], isActive: true, isFuture: false, adjacentStations: ['MET'] },
    { id: 'sta-t1-26', name: 'MEETT',                          code: 'MET',  lines: ['T1'], isActive: true, isFuture: false, adjacentStations: [] },
];

// ─────────────────────────────────────────────────────────────────────────────
// AÉROPORT EXPRESS — antenne T1, 3 stations (BLA → REGISTRY_INTERCHANGE_HUBS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Topologie :  ANC ──► BLA (HUB) ──► NAD ──► DAU ──► ATB
 * Activation : ACTIVE_LINES.AEROPORT = true + logique builder.ts
 */
export const REGISTRY_AEROPORT_EXPRESS: StationDef[] = [
    {
        id: 'sta-aero-nad', name: 'Nadot', code: 'NAD',
        lines: ['T1', 'AEROPORT'], isActive: false, isFuture: true, isBranch: true,
        adjacentStations: ['DAU'],
        connections:      ['BLA'],
    },
    {
        id: 'sta-aero-dau', name: 'Daurat', code: 'DAU',
        lines: ['T1', 'AEROPORT'], isActive: false, isFuture: true, isBranch: true,
        adjacentStations: ['ATB'],
    },
    {
        id: 'sta-aero-atb', name: 'Aéroport Toulouse Blagnac', code: 'ATB',
        lines: ['T1', 'AEROPORT'], isActive: false, isFuture: true, isBranch: true,
        adjacentStations: [],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// TÉLÉO — 3 stations en service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Codes provisoires (en attente de validation SI officielle) :
 *   OLE  Oncopole-Lise Enjalbert
 *   HRG  Hôpital Rangueil-Louis Lareng
 *   UPT  Université Paul-Sabatier Téléo  (UPS est réservé au Métro B)
 */
export const REGISTRY_TELEO: StationDef[] = [
    { id: 'sta-tel-1', name: 'Oncopole-Lise Enjalbert',       code: 'OLE', lines: ['TELEO'], isActive: true, isFuture: false },
    { id: 'sta-tel-2', name: 'Hôpital Rangueil-Louis Lareng', code: 'HRG', lines: ['TELEO'], isActive: true, isFuture: false },
    { id: 'sta-tel-3', name: 'Université Paul-Sabatier',       code: 'UPT', lines: ['TELEO'], isActive: true, isFuture: false, lieuName: 'Université Paul-Sabatier' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HUBs D'INTERCONNEXION — stations multi-lignes (lines.length > 1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BLA — Blagnac / Jean Maga
 * ─────────────────────────
 *   HUB d'échange sur le tronc T1, entre ANC et SER. Point de bifurcation
 *   vers l'antenne AEROPORT Express et la Ligne C.
 *
 *   Topologie :
 *     T1          … ANC ──► BLA ──► SER ──► GUY ──► … ──► MET
 *     AEROPORT Express       BLA ──► NAD ──► DAU ──► ATB
 *     Ligne C        SMA ──► BLA ──► SDN ──► PJU ──► …
 *
 *   adjacentStations: ['SER', 'NAD', 'SDN']
 *     • SER — suite du tronc T1 principal (vers MEETT)
 *     • NAD — prochaine station AEROPORT Express
 *     • SDN — prochaine station Ligne C (sens Labège)
 *
 *   connections: ['NAD', 'SDN']
 *     • NAD — correspondance AEROPORT Express
 *     • SDN — correspondance Ligne C
 *
 *   publicName: "Jean Maga" — nom public en cours de validation.
 *   ⚠️ Modifier UNIQUEMENT publicName si le nom change, jamais `name`.
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
        isBranch:         false,
        connections:      ['NAD', 'SDN'],
        adjacentStations: ['SER', 'NAD', 'SDN'],
    },
    // Ajouter ici les futurs HUBs confirmés (isHub: true obligatoire)
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
 * Retourne les stations actives (isActive + au moins une ligne activée).
 * @param line - Filtre optionnel par ligne.
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
 * Retourne TOUTES les stations d'une ligne (actives, futures, branches, hubs).
 */
export function getStationsByLine(line: NetworkLine): StationDef[] {
    return ALL_STATION_DEFS.filter(s => s.lines.includes(line));
}

/**
 * Retourne les stations listées dans connections[] de la station identifiée par code.
 * @example getStationConnections('BLA') → [StationDef(SER), StationDef(NAD)]
 */
export function getStationConnections(code: string): StationDef[] {
    const src = ALL_STATION_DEFS.find(s => s.code === code);
    if (!src?.connections?.length) return [];
    return src.connections
        .map(c => ALL_STATION_DEFS.find(s => s.code === c))
        .filter((s): s is StationDef => s !== undefined);
}

/**
 * Retourne les stations suivantes dans le parcours (adjacentStations[]).
 * @example getAdjacentStations('SER') → [StationDef(GUY), StationDef(BLA)]
 */
export function getAdjacentStations(code: string): StationDef[] {
    const src = ALL_STATION_DEFS.find(s => s.code === code);
    if (!src?.adjacentStations?.length) return [];
    return src.adjacentStations
        .map(c => ALL_STATION_DEFS.find(s => s.code === c))
        .filter((s): s is StationDef => s !== undefined);
}

/** Retourne tous les nœuds d'échange multi-lignes (isHub === true). */
export function getHubs(): StationDef[] {
    return ALL_STATION_DEFS.filter(s => s.isHub === true);
}

/**
 * Retourne toutes les stations futures.
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
 * @param options.includeInactive - Inclure les stations inactives (défaut: false).
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
// UI — AFFICHAGE AUDIT / FRONT
// ─────────────────────────────────────────────────────────────────────────────

/** Couleurs officielles par ligne (hex). */
export const LINE_COLORS: Record<NetworkLine, string> = {
    A:        '#FF0000', // rouge
    B:        '#005BAC', // bleu
    C:        '#F07800', // orange  (Ligne C / M3)
    T1:       '#00843D', // vert
    AEROPORT: '#007BC0', // bleu ciel  (Aéroport Express)
    TELEO:    '#8B008B', // violet
} as const;

/** Statut affiché d'une station pour l'interface d'audit. */
export type StationStatus = 'active' | 'future' | 'branch' | 'hub';

/** Retourne le statut d'affichage d'une station (priorité : hub > branch > future > active). */
export function getStationStatus(station: StationDef): StationStatus {
    if (station.isHub)    return 'hub';
    if (station.isBranch) return 'branch';
    if (station.isFuture) return 'future';
    return 'active';
}

/** Données d'affichage prêtes à l'emploi pour un composant badge/pastille. */
export interface StationBadge {
    code:   string;
    label:  string;   // nom affiché (publicName ?? name)
    lines:  NetworkLine[];
    colors: string[]; // une couleur par ligne
    status: StationStatus;
}

/**
 * Génère les données d'affichage pour une station (pastille + trigramme).
 * @example
 *   const badge = getStationBadge(station);
 *   // badge.code   → 'BLA'
 *   // badge.label  → 'Jean Maga'
 *   // badge.colors → ['#00843D', '#007BC0', '#F07800']
 *   // badge.status → 'hub'
 */
export function getStationBadge(station: StationDef): StationBadge {
    return {
        code:   station.code ?? station.id,
        label:  station.publicName ?? station.name,
        lines:  station.lines,
        colors: station.lines.map(l => LINE_COLORS[l]),
        status: getStationStatus(station),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSERTIONS D'INTÉGRITÉ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @throws si un trigramme est dupliqué globalement.
 * Exception : deux stations peuvent partager le même code si elles ont le même lieuName
 * (même lieu physique sur deux lignes différentes, ex: Arènes T1 et Métro A, code ARE).
 */
export function assertNoDuplicateCodes(): void {
    // seen: code → { name, lieuName }
    const seen = new Map<string, { name: string; lieuName?: string }>();
    for (const s of ALL_STATION_DEFS) {
        if (!s.code) continue;
        if (seen.has(s.code)) {
            const prev = seen.get(s.code)!;
            // Allow shared code only if both stations share the same non-empty lieuName
            if (s.lieuName && prev.lieuName && s.lieuName === prev.lieuName) continue;
            throw new Error(
                `[stationRegistry] Trigramme dupliqué : "${s.code}" — ` +
                `"${prev.name}" ET "${s.name}". ` +
                `(Pour autoriser un partage de code, les deux stations doivent avoir le même lieuName.)`,
            );
        }
        seen.set(s.code, { name: s.name, lieuName: s.lieuName });
    }
}

/** @throws si un id est dupliqué. */
export function assertNoDuplicateIds(): void {
    const seen = new Map<string, string>();
    for (const s of ALL_STATION_DEFS) {
        if (seen.has(s.id)) {
            throw new Error(
                `[stationRegistry] ID dupliqué : "${s.id}" — ` +
                `"${seen.get(s.id)}" ET "${s.name}".`,
            );
        }
        seen.set(s.id, s.name);
    }
}

/**
 * @throws si un code référencé dans connections[] ou adjacentStations[]
 * est introuvable dans ALL_STATION_DEFS.
 */
export function assertReferencedCodesExist(): void {
    const allCodes = new Set(ALL_STATION_DEFS.map(s => s.code).filter(Boolean));
    for (const s of ALL_STATION_DEFS) {
        const refs = [...(s.connections ?? []), ...(s.adjacentStations ?? [])];
        for (const ref of refs) {
            if (!allCodes.has(ref)) {
                throw new Error(
                    `[stationRegistry] Code introuvable : "${s.name}" (${s.code ?? s.id}) ` +
                    `→ "${ref}" absent de ALL_STATION_DEFS.`,
                );
            }
        }
    }
}

/**
 * @throws si isHub et lines.length sont incohérents.
 * Règle : isHub:true ↔ lines.length > 1 ET isBranch !== true.
 * Exception : les stations de branche (isBranch:true) peuvent appartenir à plusieurs lignes
 * sans être un hub d'échange (ex: NAD/DAU/ATB sur T1+AEROPORT — même service, pas une correspondance).
 */
export function assertHubsConsistency(): void {
    for (const s of ALL_STATION_DEFS) {
        if (s.isHub && s.lines.length <= 1) {
            throw new Error(
                `[stationRegistry] "${s.name}" : isHub:true mais lines.length=${s.lines.length}.`,
            );
        }
        // isBranch stations are exempt: being on multiple lines is expected for branch stations
        if (!s.isHub && !s.isBranch && s.lines.length > 1) {
            throw new Error(
                `[stationRegistry] "${s.name}" : ${s.lines.length} lignes mais isHub manquant. ` +
                `Ajouter isHub:true ou déplacer dans REGISTRY_INTERCHANGE_HUBS (ou isBranch:true si antenne).`,
            );
        }
    }
}

/**
 * Exécute toutes les assertions d'intégrité du registre.
 * Appeler dans les tests ou au démarrage en dev.
 */
export function assertRegistryIntegrity(): void {
    assertNoDuplicateIds();
    assertNoDuplicateCodes();
    assertReferencedCodesExist();
    assertHubsConsistency();
}
