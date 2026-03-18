/**
 * stationRegistry.ts — v2
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCE DE VÉRITÉ CENTRALE du réseau Tisséo (audit DAT / Tram / Téléo).
 *
 * Changements v2 :
 *   • StationDef.line  →  StationDef.lines: NetworkLine[]
 *     Permet à une même station physique d'appartenir à plusieurs lignes
 *     (ex : BLA est sur T1, AEROPORT et LIGNE_C).
 *   • StationDef.connections?: string[]
 *     Codes des stations directement reliées (correspondances inter-lignes).
 *   • Trigrammes ajoutés sur toutes les stations Tram T1 (25/25).
 *   • BLA (Blagnac / Jean Maga) traité comme HUB → entrée unique dans
 *     REGISTRY_INTERCHANGE_HUBS, retiré de REGISTRY_LINE_C et
 *     REGISTRY_AEROPORT_EXPRESS.
 *   • assertNoDuplicateCodes() simplifié : unicité GLOBALE (plus de
 *     ALLOWED_SHARED, plus besoin avec le modèle multi-lignes).
 *
 * CONVENTION D'ACTIVATION
 * ───────────────────────
 *   Pour activer une ligne future :
 *     1. Passer le flag ACTIVE_LINES à `true`.
 *     2. Ajouter la logique builder dans builder.ts.
 *     3. Compléter ECA_DEFINITIONS / PMR_PICTOGRAM_CONFIG si nécessaire.
 *     4. Committer et déployer.
 *   ⚠️  Ne jamais exposer ACTIVE_LINES en UI ou en state utilisateur.
 *
 * TRIGRAMMES T1 — TABLE DE CORRESPONDANCE
 * ────────────────────────────────────────
 *   Codes validés (liste fournie) :
 *     MET GAS BEA LYC GBR GNO PTN MRO REL PAS GUY SER ANC ARO
 *     PUR CCH ZTH HIP LDD CDP RAP FAC PSM
 *   Codes ajoutés pour couverture totale (non dans la liste initiale) :
 *     ODY  — Odyssud - Ritouret
 *     ACO  — Aéroconstellation
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
     * Ex : "Jean Maga" (variante en cours de validation officielle pour BLA).
     */
    publicName?: string;

    /**
     * Trigramme 3 lettres MAJUSCULES — globalement unique dans ALL_STATION_DEFS.
     * Absent sur quelques stations Téléo (identification par nom).
     */
    code?: string;

    /**
     * Lignes d'appartenance — tableau pour supporter les HUBs multi-lignes.
     * Ex : BLA → ['T1', 'AEROPORT', 'C']
     * La station est "présente" dans getActiveStations(line) si `line` est
     * dans ce tableau ET que ACTIVE_LINES[line] est true.
     */
    lines: NetworkLine[];

    /**
     * La station est-elle active dans l'application d'audit ?
     * Piloté via ACTIVE_LINES — ne jamais modifier côté UI.
     * Note : une station peut avoir isActive: false même si une de ses lignes
     * est active (ex : BLA est sur T1 mais reste future → isActive: false).
     */
    isActive: boolean;

    /** Vrai si la station n'est pas encore en service réel. */
    isFuture: boolean;

    /**
     * Vrai si la station appartient à une antenne (branche) et non au
     * tronc principal de sa ligne principale.
     * Ex : BLA, NAD, DAU, ATB sont sur l'antenne Aéroport Express du T1.
     */
    isBranch?: boolean;

    /**
     * Clé de regroupement physique pour les lieux partagés entre lignes.
     * Ex : "Jean-Jaurès" (Métro A + B), "Arènes" (Métro A + Tram T1).
     * Utilisé par builder.ts pour fusionner les Lieux.
     */
    lieuName?: string;

    /**
     * Codes trigrammes des stations directement connectées (correspondances
     * physiques inter-lignes). Ne pas inclure les stations de même ligne.
     *
     * Ex pour BLA :
     *   SER (T1, avant bifurcation)
     *   NAD (AEROPORT, première station après)
     *   SMA (LIGNE_C, avant BLA)
     *   SDN (LIGNE_C, après BLA)
     */
    connections?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS — SEUL POINT DE CONTRÔLE DE L'ACTIVATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contrôle quelles lignes sont incluses dans l'application d'audit.
 *
 * false → stations présentes dans les données mais filtrées automatiquement.
 *         Aucun impact sur les lignes actives existantes.
 *
 * Pour activer une ligne future :
 *   1. Passer le flag à true.
 *   2. Compléter builder.ts + ECA_DEFINITIONS si nécessaire.
 *   3. Committer et déployer.
 */
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
    { id: 'sta-b-21', name: 'Parc du Canal',                lines: ['B'], isActive: false, isFuture: true },
    { id: 'sta-b-22', name: 'Labège Madron',                lines: ['B'], isActive: false, isFuture: true, lieuName: 'Labège Madron' },
];

// ─────────────────────────────────────────────────────────────────────────────
// LIGNE C — 20 stations futures (BLA retiré → voir REGISTRY_INTERCHANGE_HUBS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Activation : passer ACTIVE_LINES.C à true.
 *
 * BLA (Blagnac) a été déplacé dans REGISTRY_INTERCHANGE_HUBS car c'est un
 * HUB partagé entre Ligne C, T1 et AEROPORT. Il y figure avec
 * lines: ['T1', 'AEROPORT', 'C'].
 *
 * MAT (Matabiau Gare) : station stratégique prévue pour devenir un nœud
 * d'échange (SNCF, autres lignes futures). Le champ connections sera enrichi
 * lors de la confirmation du projet d'interconnexion.
 */
export const REGISTRY_LINE_C: StationDef[] = [
    { id: 'sta-c-1',  name: 'Colomiers Gare',               code: 'COG', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-3',  name: 'Fontaine Lumineuse',            code: 'FLU', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-4',  name: 'Saint-Martin-du-Touch',         code: 'SMA', lines: ['C'], isActive: false, isFuture: true },
    // sta-c-5 (BLA / Blagnac) → voir REGISTRY_INTERCHANGE_HUBS
    { id: 'sta-c-6',  name: 'Sept Deniers – Stade Toulousain', code: 'SDN', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-7',  name: 'Ponts-Jumeaux',                 code: 'PJU', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-8',  name: 'Fondeyre',                      code: 'FON', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-9',  name: 'La Vache',                      code: 'LVH', lines: ['C'], isActive: false, isFuture: true, lieuName: 'La Vache' },
    { id: 'sta-c-10', name: 'Lycée Toulouse-Lautrec',        code: 'TLA', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-11', name: 'Raisin',                        code: 'RAI', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-12', name: 'Bonnefoy',                      code: 'BON', lines: ['C'], isActive: false, isFuture: true },
    {
        id: 'sta-c-13', name: 'Matabiau Gare', code: 'MAT', lines: ['C'],
        isActive: false, isFuture: true, lieuName: 'Marengo-SNCF',
        // Correspondance future avec SNCF Matabiau et lignes à définir.
        // Enrichir connections[] lors de la confirmation du projet.
        connections: [],
    },
    { id: 'sta-c-14', name: 'François-Verdier',              code: 'FVD', lines: ['C'], isActive: false, isFuture: true, lieuName: 'François Verdier' },
    { id: 'sta-c-15', name: 'Côte Pavée',                    code: 'CPA', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-16', name: 'Limayrac – Cité de l\'Espace',  code: 'LIM', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-17', name: 'Ormeau',                        code: 'ORM', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-18', name: 'Montaudran Gare',               code: 'MOG', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-19', name: 'Aerospace Campus',              code: 'AEC', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-20', name: 'Labège Madron',                 code: 'LMA', lines: ['C'], isActive: false, isFuture: true, lieuName: 'Labège Madron' },
    { id: 'sta-c-21', name: 'Diagora',                       code: 'DIA', lines: ['C'], isActive: false, isFuture: true },
    { id: 'sta-c-22', name: 'Labège Gare',                   code: 'LAG', lines: ['C'], isActive: false, isFuture: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRAM T1 — 25 stations en service (tronc principal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigrammes assignés à toutes les stations T1 (v2).
 *
 * Règles d'attribution :
 *   • Unicité globale garantie (aucun chevauchement avec Métro A/B/C ou LAE).
 *   • Arènes T1  → ARO  (ARE est réservé à Métro A Arènes, même lieu physique).
 *   • PDJ T1     → PSM  (PDJ est réservé à Métro B Palais de Justice, même lieu).
 *
 * Le builder.ts utilise actuellement station.name pour les switch T1.
 * Les codes permettront à terme de remplacer cette logique nom-dépendante.
 *
 * Bifurcation vers l'antenne Aéroport Express :
 *   Servanty - Airbus (SER, sta-t1-14) → BLA (HUB) → NAD → DAU → ATB
 *   Le tronc T1 principal continue : SER → GUY → PAS → REL → …
 */
export const REGISTRY_TRAM_T1: StationDef[] = [
    // ── Direction : Palais de Justice → MEETT ─────────────────────────────
    {
        id: 'sta-t1-1',  name: 'Palais de Justice',
        code: 'PSM', // PSM : code T1 distinct de PDJ (Métro B, même lieu)
        lines: ['T1'], isActive: true, isFuture: false, lieuName: 'Palais de Justice',
    },
    { id: 'sta-t1-2',  name: 'Île du Ramier',                  code: 'LDD', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-3',  name: 'Fer à Cheval',                   code: 'FAC', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-4',  name: 'Avenue de Muret - Marcel Cavaillé', code: 'MRO', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-5',  name: 'Croix de Pierre',                code: 'CDP', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-6',  name: 'Déodat de Séverac',              code: 'GAS', lines: ['T1'], isActive: true, isFuture: false },
    {
        id: 'sta-t1-7',  name: 'Arènes',
        code: 'ARO', // ARO : code T1 distinct de ARE (Métro A, même lieu)
        lines: ['T1'], isActive: true, isFuture: false, lieuName: 'Arènes',
    },
    { id: 'sta-t1-8',  name: 'Zénith',                         code: 'ZTH', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-9',  name: 'Cartoucherie',                   code: 'RAP', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-10', name: 'Casselardit',                    code: 'CCH', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-11', name: 'Purpan',                         code: 'PUR', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-12', name: 'Hôpital Purpan',                 code: 'HIP', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-13', name: 'Ancely',                         code: 'ANC', lines: ['T1'], isActive: true, isFuture: false },
    // ── Point de bifurcation T1 / Aéroport Express ────────────────────────
    { id: 'sta-t1-14', name: 'Servanty - Airbus',              code: 'SER', lines: ['T1'], isActive: true, isFuture: false },
    // ── Tronc principal T1 (suite vers MEETT) ─────────────────────────────
    { id: 'sta-t1-15', name: 'Guyenne - Berry',                code: 'GUY', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-16', name: 'Pasteur - Mairie de Blagnac',    code: 'PAS', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-17', name: 'Place du Relais',                code: 'REL', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-18', name: 'Odyssud - Ritouret',             code: 'ODY', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-19', name: 'Patinoire - Barradels',          code: 'PTN', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-20', name: 'Grand Noble',                    code: 'GNO', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-21', name: 'Place Georges Brassens',         code: 'GBR', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-22', name: 'Andromède - Lycée',              code: 'LYC', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-23', name: 'Beauzelle - Aéroscopia',         code: 'BEA', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-24', name: 'Aéroconstellation',              code: 'ACO', lines: ['T1'], isActive: true, isFuture: false },
    { id: 'sta-t1-25', name: 'MEETT',                          code: 'MET', lines: ['T1'], isActive: true, isFuture: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// AÉROPORT EXPRESS — antenne T1, 3 stations (BLA est dans REGISTRY_INTERCHANGE_HUBS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Antenne Aéroport Express — branche du T1 depuis Servanty - Airbus (SER).
 *
 * Ordre logique (sens T1 → Aéroport) :
 *   SER ──[bifurcation]──► BLA (HUB) → NAD → DAU → ATB
 *
 * BLA est dans REGISTRY_INTERCHANGE_HUBS car il est commun à T1, AEROPORT et C.
 * Activation : passer ACTIVE_LINES.AEROPORT à true + compléter builder.ts.
 *
 * ⚠️  Ne pas ajouter NAD/DAU/ATB dans ECA_DEFINITIONS / PMR_PICTOGRAM_CONFIG
 *     avant confirmation du type d'équipement définitif.
 */
export const REGISTRY_AEROPORT_EXPRESS: StationDef[] = [
    {
        id:       'sta-aero-nad',
        name:     'Nadot',
        code:     'NAD',
        lines:    ['AEROPORT'],
        isActive: false,
        isFuture: true,
        isBranch: true,
        connections: ['BLA'], // BLA est la station précédente
    },
    {
        id:       'sta-aero-dau',
        name:     'Daurat',
        code:     'DAU',
        lines:    ['AEROPORT'],
        isActive: false,
        isFuture: true,
        isBranch: true,
    },
    {
        id:       'sta-aero-atb',
        name:     'Aéroport Toulouse Blagnac',
        code:     'ATB',
        lines:    ['AEROPORT'],
        isActive: false,
        isFuture: true,
        isBranch: true,
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
// HUBs D'INTERCONNEXION — stations multi-lignes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stations physiques appartenant à plusieurs lignes simultanément.
 * Chaque entrée est UNIQUE dans ALL_STATION_DEFS (un seul objet, plusieurs lignes).
 *
 * BLA — Blagnac / Jean Maga
 * ─────────────────────────
 *   Nœud d'échange stratégique entre :
 *     • T1        — tronc principal (bifurcation à Servanty)
 *     • AEROPORT  — antenne Aéroport Express (première station de branche)
 *     • C         — Ligne C future (entre SMA et SDN)
 *
 *   isBranch: true car c'est le premier arrêt de l'antenne AEROPORT.
 *   isActive: false car toutes ces lignes sont soit futures (AEROPORT, C),
 *             soit la station elle-même n'est pas encore ouverte sur T1.
 *
 *   publicName: "Jean Maga" — nom public en cours de validation officielle.
 *               Le nom interne "Blagnac" reste la référence technique stable.
 *               ⚠️ Si le nom change définitivement, ne modifier QUE publicName.
 *
 *   connections:
 *     SER  — Servanty - Airbus (T1, station précédente avant bifurcation)
 *     NAD  — Nadot (AEROPORT, station suivante sur l'antenne)
 *     SMA  — Saint-Martin-du-Touch (LIGNE_C, station précédente)
 *     SDN  — Sept Deniers (LIGNE_C, station suivante)
 */
export const REGISTRY_INTERCHANGE_HUBS: StationDef[] = [
    {
        id:         'sta-hub-bla',
        name:       'Blagnac',
        publicName: 'Jean Maga',
        code:       'BLA',
        lines:      ['T1', 'AEROPORT', 'C'],
        isActive:   false,
        isFuture:   true,
        isBranch:   true,
        connections: ['SER', 'NAD', 'SMA', 'SDN'],
    },
    // ── Ajouter ici les futurs nœuds multi-lignes confirmés ──────────────
    // Exemple (ne pas décommenter avant confirmation) :
    // {
    //     id: 'sta-hub-mat',
    //     name: 'Matabiau Gare',
    //     code: 'MAT',       ← ⚠️ collision avec sta-c-13 — à résoudre
    //     lines: ['C', ...], // + futures lignes SNCF / LAE / etc.
    //     ...
    // },
];

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE GLOBAL — toutes lignes confondues
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tableau exhaustif de toutes les stations du réseau.
 * Utiliser les fonctions utilitaires plutôt que filtrer ce tableau directement.
 */
export const ALL_STATION_DEFS: StationDef[] = [
    ...REGISTRY_LINE_A,
    ...REGISTRY_LINE_B,
    ...REGISTRY_LINE_C,
    ...REGISTRY_TRAM_T1,
    ...REGISTRY_AEROPORT_EXPRESS,
    ...REGISTRY_TELEO,
    ...REGISTRY_INTERCHANGE_HUBS, // ← en dernier pour que les HUBs soient toujours trouvés
];

// ─────────────────────────────────────────────────────────────────────────────
// FONCTIONS UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne les stations actives (filtrées par ACTIVE_LINES + isActive).
 *
 * Une station est visible si :
 *   • isActive === true, ET
 *   • au moins une de ses lignes est activée dans ACTIVE_LINES.
 *
 * Pour les HUBs multi-lignes (ex: BLA sur T1 + AEROPORT + C) :
 *   • getActiveStations('T1') retourne BLA si ACTIVE_LINES.T1 = true ET BLA.isActive = true.
 *   • Actuellement BLA.isActive = false → n'apparaît jamais, quelle que soit la ligne.
 *
 * @param line - Filtre optionnel. Si omis : toutes les lignes actives.
 *
 * @example
 *   getActiveStations()       // toutes les stations actives du réseau
 *   getActiveStations('T1')   // uniquement le Tram T1
 *   getActiveStations('C')    // vide tant que ACTIVE_LINES.C = false
 */
export function getActiveStations(line?: NetworkLine): StationDef[] {
    return ALL_STATION_DEFS.filter(s => {
        if (!s.isActive) return false;
        const anyLineEnabled = s.lines.some(l => ACTIVE_LINES[l]);
        if (!anyLineEnabled) return false;
        if (line !== undefined && !s.lines.includes(line)) return false;
        return true;
    });
}

/**
 * Retourne TOUTES les stations d'une ligne (actives ou non).
 * Inclut les stations futures et les HUBs multi-lignes contenant cette ligne.
 *
 * @param line - La ligne à interroger.
 */
export function getStationsByLine(line: NetworkLine): StationDef[] {
    return ALL_STATION_DEFS.filter(s => s.lines.includes(line));
}

/**
 * Retourne les stations directement connectées à une station donnée.
 * Lit le champ `connections` de la station identifiée par `code`.
 *
 * @param code - Trigramme de la station source (ex: 'BLA').
 * @returns Tableau des stations cibles (peut être vide si pas de connexions).
 *
 * @example
 *   getStationConnections('BLA')
 *   // → [StationDef(SER), StationDef(NAD), StationDef(SMA), StationDef(SDN)]
 */
export function getStationConnections(code: string): StationDef[] {
    const source = ALL_STATION_DEFS.find(s => s.code === code);
    if (!source?.connections?.length) return [];
    return source.connections
        .map(targetCode => ALL_STATION_DEFS.find(s => s.code === targetCode))
        .filter((s): s is StationDef => s !== undefined);
}

/**
 * Retourne les stations qui sont des HUBs multi-lignes (lines.length > 1).
 * Equivalent à interroger REGISTRY_INTERCHANGE_HUBS mais via le catalogue global.
 */
export function getHubs(): StationDef[] {
    return ALL_STATION_DEFS.filter(s => s.lines.length > 1);
}

/**
 * Retourne les stations d'antenne actives (isBranch = true + ligne activée).
 * Vide tant que ACTIVE_LINES.AEROPORT = false.
 */
export function getActiveBranchStations(): StationDef[] {
    return ALL_STATION_DEFS.filter(
        s => s.isBranch === true && s.isActive && s.lines.some(l => ACTIVE_LINES[l]),
    );
}

/**
 * Retourne toutes les stations futures (isFuture = true), actives ou non.
 * Pratique pour les inventaires de préparation avant mise en service.
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
 * @param code                   - Trigramme (ex: 'BGR', 'BLA', 'ATB').
 * @param options.line           - Restreindre aux stations contenant cette ligne.
 * @param options.includeInactive - Si true, inclut les stations dont toutes les
 *                                 lignes sont inactives. Par défaut: false.
 *
 * @example
 *   getStationByCode('BLA')                               // undefined (inactif)
 *   getStationByCode('BLA', { includeInactive: true })    // StationDef(BLA)
 *   getStationByCode('BLA', { line: 'C', includeInactive: true }) // StationDef(BLA)
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

/**
 * Vérifie qu'aucun trigramme n'est dupliqué GLOBALEMENT dans ALL_STATION_DEFS.
 * Avec le modèle multi-lignes (lines[]), BLA n'apparaît qu'une seule fois →
 * aucune exception nécessaire.
 *
 * @throws Error si un code est utilisé par deux stations différentes.
 */
export function assertNoDuplicateCodes(): void {
    const seen = new Map<string, string>(); // code → station name

    for (const station of ALL_STATION_DEFS) {
        if (!station.code) continue;

        if (seen.has(station.code)) {
            throw new Error(
                `[stationRegistry] Trigramme dupliqué : "${station.code}" utilisé par ` +
                `"${seen.get(station.code)}" ET "${station.name}". ` +
                `Choisir un trigramme alternatif ou fusionner en HUB multi-lignes.`,
            );
        }
        seen.set(station.code, station.name);
    }
}

/**
 * Vérifie qu'aucun identifiant (id) n'est dupliqué.
 *
 * @throws Error si un id est utilisé deux fois.
 */
export function assertNoDuplicateIds(): void {
    const seen = new Map<string, string>(); // id → name

    for (const station of ALL_STATION_DEFS) {
        if (seen.has(station.id)) {
            throw new Error(
                `[stationRegistry] ID dupliqué : "${station.id}" utilisé par ` +
                `"${seen.get(station.id)}" ET "${station.name}".`,
            );
        }
        seen.set(station.id, station.name);
    }
}

/**
 * Vérifie que toutes les connexions déclarées pointent vers des codes existants.
 *
 * @throws Error si une connexion référence un code introuvable.
 */
export function assertConnectionsExist(): void {
    const allCodes = new Set(ALL_STATION_DEFS.map(s => s.code).filter(Boolean));

    for (const station of ALL_STATION_DEFS) {
        if (!station.connections?.length) continue;

        for (const targetCode of station.connections) {
            if (!allCodes.has(targetCode)) {
                throw new Error(
                    `[stationRegistry] Connexion invalide : "${station.name}" (${station.code}) ` +
                    `référence le code "${targetCode}" qui n'existe pas dans ALL_STATION_DEFS.`,
                );
            }
        }
    }
}

/**
 * Exécute toutes les assertions d'intégrité du registre.
 * À appeler dans un test unitaire ou au démarrage en environnement de dev.
 *
 * @example
 *   import { assertRegistryIntegrity } from './stationRegistry';
 *   assertRegistryIntegrity(); // lève si le registre est incohérent
 */
export function assertRegistryIntegrity(): void {
    assertNoDuplicateIds();
    assertNoDuplicateCodes();
    assertConnectionsExist();
}
