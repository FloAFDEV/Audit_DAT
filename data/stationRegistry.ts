/**
 * stationRegistry.ts
 * ──────────────────────────────────────────────────────────────────────────
 * SOURCE DE VÉRITÉ CENTRALE pour toutes les stations du réseau Tisséo.
 *
 * Ce fichier est le seul endroit où :
 *   • les métadonnées des stations (code, ligne, statut) sont définies
 *   • l'activation / désactivation des lignes est pilotée (ACTIVE_LINES)
 *   • les contraintes d'intégrité (unicité des trigrammes) sont vérifiées
 *
 * CONVENTION D'ACTIVATION
 * ───────────────────────
 *   Pour activer une ligne future :
 *     1. Passer le flag correspondant dans ACTIVE_LINES à `true`.
 *     2. Ajouter la logique builder dans builder.ts si nécessaire.
 *     3. Committer et déployer.
 *
 *   ⚠️  Ne JAMAIS exposer ces flags en UI ou en state utilisateur.
 *       L'activation est uniquement côté code.
 *
 * TRIGRAMMES
 * ──────────
 *   • Uniques au sein de chaque ligne.
 *   • Exception documentée : BLA est partagé entre 'C' et 'AEROPORT'
 *     car Blagnac est un nœud géographique commun aux deux tracés.
 *   • assertNoDuplicateCodes() garantit l'intégrité à l'exécution.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Identifiant de toutes les lignes du réseau (existantes et futures). */
export type NetworkLine = 'A' | 'B' | 'C' | 'T1' | 'AEROPORT' | 'TELEO';

/**
 * Définition riche d'une station, utilisée dans le registre central.
 * Distincte de l'interface `Station` (types.ts) qui est la structure de
 * données runtime portant les audits (directions, DATs, adhésifs…).
 */
export interface StationDef {
    /** Identifiant stable – clé primaire en base de données et dans le store. */
    id: string;

    /** Nom interne canonique (référence technique, ne pas afficher tel quel). */
    name: string;

    /**
     * Nom public affiché aux usagers (si différent du nom interne).
     * Ex : "Jean Maga" pour la station BLA dont le nom officiel n'est pas encore
     * arrêté (variante "Blagnac" également possible).
     */
    publicName?: string;

    /**
     * Trigramme 3 lettres MAJUSCULES – unique au sein d'une ligne.
     * Absent sur les stations Tram T1 existantes (identification par nom).
     */
    code?: string;

    /** Ligne d'appartenance. */
    line: NetworkLine;

    /**
     * La station est-elle actuellement active dans l'application d'audit ?
     * Piloté uniquement via `ACTIVE_LINES` – ne jamais modifier côté UI.
     */
    isActive: boolean;

    /** Vrai si la station n'est pas encore en service réel (en projet / travaux). */
    isFuture: boolean;

    /**
     * Vrai si la station appartient à une antenne (branche) et non au
     * tronc principal de la ligne.
     */
    isBranch?: boolean;

    /**
     * Clé de regroupement physique pour les stations partagées entre lignes.
     * Ex : "Jean-Jaurès" (Métro A + B), "Arènes" (Métro A + Tram T1).
     * Utilisé par le builder pour fusionner les Lieux.
     */
    lieuName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE FLAGS — SEUL POINT DE CONTRÔLE DE L'ACTIVATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Activation des lignes du réseau.
 *
 * `true`  → La ligne est incluse dans l'application d'audit.
 * `false` → Les stations de la ligne sont présentes dans les données
 *           mais FILTRÉES automatiquement (aucun impact sur l'UI existante).
 *
 * Pour activer une ligne :
 *   1. Passer le flag à `true` ici.
 *   2. Ajouter la logique nécessaire dans builder.ts.
 *   3. Vérifier que les ECA_DEFINITIONS / PMR_PICTOGRAM_CONFIG sont à jour.
 *   4. Committer et déployer.
 */
export const ACTIVE_LINES: Record<NetworkLine, boolean> = {
    A:        true,  // Métro A         — en service, pleinement audité
    B:        true,  // Métro B         — en service, pleinement audité
    C:        false, // Ligne C         — future, stations non actives
    T1:       true,  // Tram T1         — en service, pleinement audité
    AEROPORT: false, // Aéroport Express (antenne T1) — future, non active
    TELEO:    true,  // Téléo           — en service, pleinement audité
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// MÉTRO A — 18 stations en service
// ─────────────────────────────────────────────────────────────────────────────

export const REGISTRY_LINE_A: StationDef[] = [
    { id: 'sta-a-1',  name: 'Basso Cambo',               code: 'MBC', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-2',  name: 'Bellefontaine',              code: 'BEL', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-3',  name: 'Reynerie',                   code: 'REY', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-4',  name: 'Mirail-Université',          code: 'MUN', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-5',  name: 'Bagatelle',                  code: 'BAG', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-6',  name: 'Mermoz',                     code: 'MER', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-7',  name: 'Fontaine-Lestang',           code: 'FLE', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-8',  name: 'Arènes',                     code: 'ARE', line: 'A', isActive: true, isFuture: false, lieuName: 'Arènes' },
    { id: 'sta-a-9',  name: 'Patte d\'Oie',               code: 'POI', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-10', name: 'Saint-Cyprien - République', code: 'SCY', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-11', name: 'Esquirol',                   code: 'ESQ', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-12', name: 'Capitole',                   code: 'CAP', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-13', name: 'Jean-Jaurès',                code: 'JJA', line: 'A', isActive: true, isFuture: false, lieuName: 'Jean-Jaurès' },
    { id: 'sta-a-14', name: 'Marengo-SNCF',               code: 'MAR', line: 'A', isActive: true, isFuture: false, lieuName: 'Marengo-SNCF' },
    { id: 'sta-a-15', name: 'Jolimont',                   code: 'JOL', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-16', name: 'Roseraie',                   code: 'ROS', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-17', name: 'Argoulets',                  code: 'ARG', line: 'A', isActive: true, isFuture: false },
    { id: 'sta-a-18', name: 'Balma-Gramont',              code: 'BGR', line: 'A', isActive: true, isFuture: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// MÉTRO B — 20 stations en service + 2 futures
// ─────────────────────────────────────────────────────────────────────────────

export const REGISTRY_LINE_B: StationDef[] = [
    { id: 'sta-b-1',  name: 'Borderouge',                 code: 'BOR', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-2',  name: 'Trois Cocus',                code: 'TCO', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-3',  name: 'La Vache',                   code: 'LVA', line: 'B', isActive: true,  isFuture: false, lieuName: 'La Vache' },
    { id: 'sta-b-4',  name: 'Barrière de Paris',          code: 'BPA', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-5',  name: 'Minimes - Claude Nougaro',   code: 'MIN', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-6',  name: 'Canal du Midi',              code: 'CAN', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-7',  name: 'Compans-Caffarelli',         code: 'CCA', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-8',  name: 'Jeanne d\'Arc',              code: 'JAR', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-9',  name: 'Jean-Jaurès',                code: 'JJB', line: 'B', isActive: true,  isFuture: false, lieuName: 'Jean-Jaurès' },
    { id: 'sta-b-10', name: 'François Verdier',           code: 'FVE', line: 'B', isActive: true,  isFuture: false, lieuName: 'François Verdier' },
    { id: 'sta-b-11', name: 'Carmes',                     code: 'CAR', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-12', name: 'Palais de Justice',          code: 'PDJ', line: 'B', isActive: true,  isFuture: false, lieuName: 'Palais de Justice' },
    { id: 'sta-b-13', name: 'Saint-Michel - Marcel Langer', code: 'SMI', line: 'B', isActive: true, isFuture: false },
    { id: 'sta-b-14', name: 'Empalot',                    code: 'EMP', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-15', name: 'Saint-Agne - SNCF',          code: 'SAG', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-16', name: 'Saouzelong',                 code: 'SAO', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-17', name: 'Rangueil',                   code: 'RAN', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-18', name: 'Faculté de Pharmacie',       code: 'PHA', line: 'B', isActive: true,  isFuture: false },
    { id: 'sta-b-19', name: 'Université Paul Sabatier',   code: 'UPS', line: 'B', isActive: true,  isFuture: false, lieuName: 'Université Paul-Sabatier' },
    { id: 'sta-b-20', name: 'Ramonville',                 code: 'RAM', line: 'B', isActive: true,  isFuture: false },
    // ── Futures (extension en cours) ──────────────────────────────────────────
    { id: 'sta-b-21', name: 'Parc du Canal',              line: 'B', isActive: false, isFuture: true },
    { id: 'sta-b-22', name: 'Labège Madron',              line: 'B', isActive: false, isFuture: true, lieuName: 'Labège Madron' },
];

// ─────────────────────────────────────────────────────────────────────────────
// LIGNE C — 21 stations, toutes futures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Activation : passer `ACTIVE_LINES.C` à `true`.
 *
 * Note BLA (Blagnac) :
 *   Ce trigramme est partagé avec l'antenne Aéroport Express (ligne AEROPORT).
 *   Blagnac est un nœud géographique commun aux deux tracés.
 *   Les entités d'audit sont distinctes (id: 'sta-c-5' vs 'sta-aero-bla').
 *
 *   ⚠️  Ne pas ajouter BLA dans ECA_DEFINITIONS / PMR_PICTOGRAM_CONFIG
 *       avant confirmation du type d'équipement définitif sur chaque ligne.
 */
export const REGISTRY_LINE_C: StationDef[] = [
    { id: 'sta-c-1',  name: 'Colomiers Gare',               code: 'COG', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-3',  name: 'Fontaine Lumineuse',            code: 'FLU', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-4',  name: 'Saint-Martin-du-Touch',         code: 'SMA', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-5',  name: 'Blagnac',                       code: 'BLA', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-6',  name: 'Sept Deniers – Stade Toulousain', code: 'SDN', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-7',  name: 'Ponts-Jumeaux',                 code: 'PJU', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-8',  name: 'Fondeyre',                      code: 'FON', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-9',  name: 'La Vache',                      code: 'LVH', line: 'C', isActive: false, isFuture: true, lieuName: 'La Vache' },
    { id: 'sta-c-10', name: 'Lycée Toulouse-Lautrec',        code: 'TLA', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-11', name: 'Raisin',                        code: 'RAI', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-12', name: 'Bonnefoy',                      code: 'BON', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-13', name: 'Matabiau Gare',                 code: 'MAT', line: 'C', isActive: false, isFuture: true, lieuName: 'Marengo-SNCF' },
    { id: 'sta-c-14', name: 'François-Verdier',              code: 'FVD', line: 'C', isActive: false, isFuture: true, lieuName: 'François Verdier' },
    { id: 'sta-c-15', name: 'Côte Pavée',                    code: 'CPA', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-16', name: 'Limayrac – Cité de l\'Espace',  code: 'LIM', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-17', name: 'Ormeau',                        code: 'ORM', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-18', name: 'Montaudran Gare',               code: 'MOG', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-19', name: 'Aerospace Campus',              code: 'AEC', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-20', name: 'Labège Madron',                 code: 'LMA', line: 'C', isActive: false, isFuture: true, lieuName: 'Labège Madron' },
    { id: 'sta-c-21', name: 'Diagora',                       code: 'DIA', line: 'C', isActive: false, isFuture: true },
    { id: 'sta-c-22', name: 'Labège Gare',                   code: 'LAG', line: 'C', isActive: false, isFuture: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRAM T1 — 25 stations en service (tronc principal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Le Tram T1 n'utilise pas de trigrammes dans la version actuelle de l'app.
 * Les directions et DATs sont générés par nom de station dans builder.ts.
 *
 * La bifurcation vers l'antenne Aéroport Express se situe entre :
 *   Servanty - Airbus (sta-t1-14) → antenne AEROPORT (BLA → NAD → DAU → ATB)
 * Le tronc principal T1 continue en direction de MEETT.
 */
export const REGISTRY_TRAM_T1: StationDef[] = [
    { id: 'sta-t1-1',  name: 'Palais de Justice',              line: 'T1', isActive: true, isFuture: false, lieuName: 'Palais de Justice' },
    { id: 'sta-t1-2',  name: 'Île du Ramier',                  line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-3',  name: 'Fer à Cheval',                   line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-4',  name: 'Avenue de Muret - Marcel Cavaillé', line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-5',  name: 'Croix de Pierre',                line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-6',  name: 'Déodat de Séverac',              line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-7',  name: 'Arènes',                         line: 'T1', isActive: true, isFuture: false, lieuName: 'Arènes' },
    { id: 'sta-t1-8',  name: 'Zénith',                         line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-9',  name: 'Cartoucherie',                   line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-10', name: 'Casselardit',                    line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-11', name: 'Purpan',                         line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-12', name: 'Hôpital Purpan',                 line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-13', name: 'Ancely',                         line: 'T1', isActive: true, isFuture: false },
    // ── Point de bifurcation T1 / Aéroport Express ─────────────────────────
    { id: 'sta-t1-14', name: 'Servanty - Airbus',              line: 'T1', isActive: true, isFuture: false },
    // ── Tronc principal T1 (suite vers MEETT) ──────────────────────────────
    { id: 'sta-t1-15', name: 'Guyenne - Berry',                line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-16', name: 'Pasteur - Mairie de Blagnac',    line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-17', name: 'Place du Relais',                line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-18', name: 'Odyssud - Ritouret',             line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-19', name: 'Patinoire - Barradels',          line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-20', name: 'Grand Noble',                    line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-21', name: 'Place Georges Brassens',         line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-22', name: 'Andromède - Lycée',              line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-23', name: 'Beauzelle - Aéroscopia',         line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-24', name: 'Aéroconstellation',              line: 'T1', isActive: true, isFuture: false },
    { id: 'sta-t1-25', name: 'MEETT',                          line: 'T1', isActive: true, isFuture: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// AÉROPORT EXPRESS — antenne T1, 4 stations futures
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Antenne Aéroport Express — branche du Tram T1 depuis Servanty - Airbus.
 *
 * Ordre logique (direction Palais de Justice → Aéroport) :
 *   … Ancely → Servanty - Airbus ──[bifurcation]──► BLA → NAD → DAU → ATB
 *
 * Toutes les stations sont futures et non actives.
 * Activation : passer `ACTIVE_LINES.AEROPORT` à `true`
 *              + ajouter la logique builder dans builder.ts.
 *
 * Note BLA (Blagnac / Jean Maga) :
 *   Le trigramme BLA est intentionnellement partagé avec la Ligne C
 *   (même nœud géographique — éventuel pôle d'échange).
 *   L'ID `sta-aero-bla` (distinct de `sta-c-5`) garantit des entités
 *   d'audit séparées.
 *   Le nom public "Jean Maga" est en cours de validation officielle ;
 *   le nom interne "Blagnac" reste la référence technique stable.
 *
 * Codes vérifiés sans collision sur la ligne AEROPORT :
 *   BLA ✓  NAD ✓  DAU ✓  ATB ✓
 */
export const REGISTRY_AEROPORT_EXPRESS: StationDef[] = [
    {
        id:         'sta-aero-bla',
        name:       'Blagnac',
        publicName: 'Jean Maga',   // nom public en attente de validation officielle
        code:       'BLA',
        line:       'AEROPORT',
        isActive:   false,
        isFuture:   true,
        isBranch:   true,
    },
    {
        id:       'sta-aero-nad',
        name:     'Nadot',
        code:     'NAD',
        line:     'AEROPORT',
        isActive: false,
        isFuture: true,
        isBranch: true,
    },
    {
        id:       'sta-aero-dau',
        name:     'Daurat',
        code:     'DAU',
        line:     'AEROPORT',
        isActive: false,
        isFuture: true,
        isBranch: true,
    },
    {
        id:       'sta-aero-atb',
        name:     'Aéroport Toulouse Blagnac',
        code:     'ATB',
        line:     'AEROPORT',
        isActive: false,
        isFuture: true,
        isBranch: true,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// TÉLÉO — 3 stations en service
// ─────────────────────────────────────────────────────────────────────────────

export const REGISTRY_TELEO: StationDef[] = [
    { id: 'sta-tel-1', name: 'Oncopole-Lise Enjalbert',       line: 'TELEO', isActive: true, isFuture: false },
    { id: 'sta-tel-2', name: 'Hôpital Rangueil-Louis Lareng', line: 'TELEO', isActive: true, isFuture: false },
    { id: 'sta-tel-3', name: 'Université Paul-Sabatier',       line: 'TELEO', isActive: true, isFuture: false, lieuName: 'Université Paul-Sabatier' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CATALOGUE GLOBAL — toutes lignes confondues
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tableau complet de toutes les stations du réseau, toutes lignes confondues.
 * Utiliser les fonctions utilitaires ci-dessous plutôt que de filtrer
 * ce tableau manuellement.
 */
export const ALL_STATION_DEFS: StationDef[] = [
    ...REGISTRY_LINE_A,
    ...REGISTRY_LINE_B,
    ...REGISTRY_LINE_C,
    ...REGISTRY_TRAM_T1,
    ...REGISTRY_AEROPORT_EXPRESS,
    ...REGISTRY_TELEO,
];

// ─────────────────────────────────────────────────────────────────────────────
// FONCTIONS UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne les stations actives pour une ligne donnée (ou toutes les lignes).
 *
 * Une station est "active" si :
 *   • sa ligne est activée dans ACTIVE_LINES, ET
 *   • son flag `isActive` est `true`.
 *
 * @param line - Filtre optionnel par ligne. Si omis, toutes les lignes actives.
 *
 * @example
 *   // Toutes les stations actuellement dans l'app
 *   const active = getActiveStations();
 *
 *   // Uniquement les stations du Tram T1 actives
 *   const tram = getActiveStations('T1');
 */
export function getActiveStations(line?: NetworkLine): StationDef[] {
    return ALL_STATION_DEFS.filter(s => {
        const lineIsEnabled   = ACTIVE_LINES[s.line];
        const stationIsActive = s.isActive;
        const matchesLine     = line === undefined || s.line === line;
        return lineIsEnabled && stationIsActive && matchesLine;
    });
}

/**
 * Retourne TOUTES les stations d'une ligne, qu'elles soient actives ou non.
 * Utile pour les vues de préparation, les exports ou les audits d'inventaire.
 *
 * @param line - La ligne à interroger.
 */
export function getStationsByLine(line: NetworkLine): StationDef[] {
    return ALL_STATION_DEFS.filter(s => s.line === line);
}

/**
 * Retourne les stations d'antenne (isBranch = true) dont la ligne est active.
 * Si ACTIVE_LINES.AEROPORT = false, retourne un tableau vide.
 */
export function getActiveBranchStations(): StationDef[] {
    return ALL_STATION_DEFS.filter(
        s => s.isBranch === true && ACTIVE_LINES[s.line] && s.isActive,
    );
}

/**
 * Retourne toutes les stations futures, actives ou non.
 * Pratique pour générer des états de préparation avant mise en service.
 *
 * @param line - Filtre optionnel par ligne.
 */
export function getFutureStations(line?: NetworkLine): StationDef[] {
    return ALL_STATION_DEFS.filter(s => {
        const matchesLine = line === undefined || s.line === line;
        return s.isFuture && matchesLine;
    });
}

/**
 * Recherche une station par son trigramme.
 *
 * @param code             - Trigramme à rechercher (ex : 'BGR', 'ATB').
 * @param options.line     - Restreindre la recherche à une ligne spécifique.
 *                           Utile si BLA est ambigu (C ou AEROPORT).
 * @param options.includeInactive - Si true, inclut les stations des lignes
 *                           désactivées. Par défaut : false.
 *
 * @returns La définition de station, ou undefined si non trouvée / inactive.
 *
 * @example
 *   // Avec la ligne pour lever l'ambiguïté sur BLA
 *   const blagnacC    = getStationByCode('BLA', { line: 'C' });
 *   const blagnacAero = getStationByCode('BLA', { line: 'AEROPORT', includeInactive: true });
 */
export function getStationByCode(
    code: string,
    options: { line?: NetworkLine; includeInactive?: boolean } = {},
): StationDef | undefined {
    return ALL_STATION_DEFS.find(s => {
        if (s.code !== code) return false;
        if (options.line && s.line !== options.line) return false;
        if (!options.includeInactive && (!ACTIVE_LINES[s.line] || !s.isActive)) return false;
        return true;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSERTIONS D'INTÉGRITÉ — à appeler en environnement de développement / test
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie qu'aucun trigramme n'est dupliqué AU SEIN D'UNE MÊME LIGNE.
 * Les doublons cross-lignes intentionnels (BLA sur C et AEROPORT) sont exemptés.
 *
 * À appeler dans un test unitaire ou une assertion de démarrage :
 *   import { assertNoDuplicateCodes } from './stationRegistry';
 *   assertNoDuplicateCodes(); // lève si collision non prévue
 *
 * @throws Error si un trigramme est dupliqué sur la même ligne.
 */
export function assertNoDuplicateCodes(): void {
    /**
     * Paires "ligne:code" intentionnellement partagées (nœuds géographiques
     * communs à deux lignes — même lieu physique, audits distincts).
     * Ajouter ici si d'autres cas apparaissent à l'avenir.
     */
    const ALLOWED_SHARED: ReadonlySet<string> = new Set([
        'C:BLA',        // Blagnac — Ligne C
        'AEROPORT:BLA', // Blagnac / Jean Maga — Aéroport Express
    ]);

    // Clé = "ligne:code" → valeur = nom de la première station vue
    const seen = new Map<string, string>();

    for (const station of ALL_STATION_DEFS) {
        if (!station.code) continue;

        const key = `${station.line}:${station.code}`;

        if (seen.has(key) && !ALLOWED_SHARED.has(key)) {
            throw new Error(
                `[stationRegistry] Trigramme dupliqué sur la ligne ${station.line} : ` +
                `"${station.code}" utilisé par "${seen.get(key)}" ET "${station.name}". ` +
                `Choisir un trigramme alternatif ou ajouter à ALLOWED_SHARED si intentionnel.`,
            );
        }

        seen.set(key, station.name);
    }
}

/**
 * Vérifie qu'aucun identifiant (id) n'est dupliqué dans le catalogue global.
 *
 * @throws Error si un id est utilisé deux fois.
 */
export function assertNoDuplicateIds(): void {
    const seen = new Map<string, string>(); // id → name

    for (const station of ALL_STATION_DEFS) {
        if (seen.has(station.id)) {
            throw new Error(
                `[stationRegistry] ID dupliqué : "${station.id}" utilisé par ` +
                `"${seen.get(station.id)}" ET "${station.name}". ` +
                `Chaque station doit avoir un identifiant unique.`,
            );
        }
        seen.set(station.id, station.name);
    }
}

/**
 * Exécute toutes les assertions d'intégrité du registre.
 * Pratique pour un appel unique dans les tests ou au démarrage en dev.
 */
export function assertRegistryIntegrity(): void {
    assertNoDuplicateIds();
    assertNoDuplicateCodes();
}
