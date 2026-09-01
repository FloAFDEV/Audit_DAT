
export enum AuditModuleType {
    DAT = 'DAT',
    PR = 'PR',
    ECA = 'ECA',
    PMR_FLOOR_ADHESIVE = 'PMR_FLOOR_ADHESIVE',
    COGNITIVE_PICTOGRAMS = 'COGNITIVE_PICTOGRAMS',
    SIGNALETIQUE = 'SIGNALETIQUE',
    /** Audit configurable (Partie 2) — brique générique pour tout audit
     *  défini en Admin (ex. Plans de quartier), à côté des types métier
     *  fixes ci-dessus, jamais à leur place. */
    CUSTOM = 'CUSTOM',
}

export enum TransportMode {
    METRO = 'METRO',
    TRAM = 'TRAM',
    TELEO = 'TELEO',
}

export type MetroLine = 'A' | 'B' | 'C';

export enum AdhesiveStatus {
    NotChecked = 'NotChecked',
    OK = 'OK',
    Absent = 'Absent',
    ToBeReplaced = 'ToBeReplaced',
    NotApplicable = 'NotApplicable',
}

export enum FloorAdhesiveStatus {
    NotChecked = 'NotChecked',
    OK = 'OK',
    ToBeReplaced = 'ToBeReplaced',
    ToPlan = 'ToPlan',
}

export enum EquipmentType {
    BE = 'BE', // Borne Entrée
    BS = 'BS', // Borne Sortie
    CA = 'CA', // Caisse Auto
}

export enum EcaEquipmentType {
    TripodeEntree = "Tripode d'entrée",
    TripodeSortie = "Tripode de sortie",
    VantauxEntree = "Vantaux d'entrée",
    VantauxSortie = "Vantaux de sortie",
    VantauxReversible = "Vantaux réversible",
    PMRBras = "PMR à bras",
    PMRVantaux = "PMR à vantaux",
    PMRVantauxReversible = "PMR à vantaux réversible",
}

export type AuditCategory = 'METRO_A' | 'METRO_B' | 'METRO_C' | 'TRAM' | 'TELEO' | 'PR' | 'AEROPORT' | 'LAE';

// =================================================================
// DATA STRUCTURES
// =================================================================

export interface Adhesive {
    id: string;
    name: string;
    description: string;
    referentiel: string;
    groupId?: string;
    groupName?: string;
    isDisabled?: boolean;
}

export interface PrAdhesive extends Adhesive {
    location: string;
}

export interface DAT {
    id: string;
    name: string;
    adhesives: { [key: string]: AdhesiveStatus };
    comment: string;
    completionDate?: string;
}

export interface Direction {
    id: string;
    name: string;
    dats: DAT[];
}

export enum EquipmentStatusType {
    OK = 'OK',
    DEGRADED = 'DEGRADED',
    ABSENT = 'ABSENT',
    TO_REPLACE = 'TO_REPLACE',
    HS = 'HS',
    NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export interface EquipmentStatus {
    status: EquipmentStatusType | 'NotChecked';
    comment?: string;
    photo_base64?: string | null;
    photo_note?: string;
    photo_rotation?: number;
}

export interface TotemStatus extends EquipmentStatus {
    dimensions?: string; // "61,6 x 91,6 cm"
}

export interface BivStatus extends EquipmentStatus {
    screenFunctioning: EquipmentStatusType | 'NotChecked';
    whiteTextAdhesives: EquipmentStatusType | 'NotChecked';
    // Adhésifs IV sur le caisson
    ligneCaisson: EquipmentStatusType | 'NotChecked';        // 6,7x2cm
    destinationCaisson: EquipmentStatusType | 'NotChecked';  // 15,2x2cm
    attenteMinCaisson: EquipmentStatusType | 'NotChecked';   // 18,2x2cm
    dureeApproxCaisson: EquipmentStatusType | 'NotChecked';  // 22,4x1,5cm
    quaiCaisson: EquipmentStatusType | 'NotChecked';         // 6x2cm - multi-quais seulement (Arènes, Odyssud)
}

export interface PlanReseauStatus extends EquipmentStatus {
    dimensions?: string; // "80 x 100 cm"
    bannerStationName: EquipmentStatusType | 'NotChecked';
    hap: EquipmentStatusType | 'NotChecked';
}

export interface PlanQuartierStatus extends EquipmentStatus {
    dimensions?: string; // "78 x 100 cm"
    bannerDirection: EquipmentStatusType | 'NotChecked';
    hap: EquipmentStatusType | 'NotChecked';
}

export interface HapStatus extends EquipmentStatus {
    // Fiche horaire (HAP) - présence et état
}

export interface BandeauStationStatus extends EquipmentStatus {
    readonly dimensions: '80x29 cm';
    directionContent: EquipmentStatusType | 'NotChecked';
    stationNameContent: EquipmentStatusType | 'NotChecked';
}

export interface SignaletiqueData {
    totem: {
        direction1: TotemStatus;
        direction2: TotemStatus;
    };
    biv: {
        meett: BivStatus[];
        pdj: BivStatus[];
    };
    planReseau: {
        meett: PlanReseauStatus[];
        pdj: PlanReseauStatus[];
    };
    planQuartier: {
        meett: PlanQuartierStatus[];
        pdj: PlanQuartierStatus[];
    };
    hap: {
        meett: HapStatus[];
        pdj: HapStatus[];
    };
    bandeauStation: {
        direction1: BandeauStationStatus;
        direction2: BandeauStationStatus;
    };
}

export interface Station {
    id: string;
    name: string;
    code?: string;
    isFuture?: boolean;
    /** Lignes desservant cette station (métadonnée multi-ligne pour les hubs). */
    lines?: string[];
    directions: Direction[];
    lieuName?: string;
    signaletique?: SignaletiqueData;
    signaletiqueCompletionDate?: string;
    comment?: string;
}

export interface Equipment {
    id: string;
    name: string;
    type: EquipmentType;
    adhesives: { [key: string]: AdhesiveStatus };
    comment: string;
    completionDate?: string;
    // Surcharge optionnelle : restreint les adhésifs de CETTE borne à cette liste d'ids,
    // au lieu de la liste complète dérivée du `type`. Utilisé pour les cas particuliers
    // terrain (ex : borne ne portant qu'un seul adhésif). Absent = comportement standard.
    adhesiveIds?: string[];
}

export interface PrZone {
    id: string;
    name: string;
    equipments: Equipment[];
}

export interface Pr {
    id: string;
    name: string;
    zones: PrZone[];
}

export interface ECA {
    id: string;
    name: string;
    accessPoint: string;
    type: EcaEquipmentType;
    number: number;
    adhesives: { [key: string]: AdhesiveStatus };
    comment: string;
    isNotApplicable?: boolean;
    completionDate?: string;
}

export interface EcaData {
    id: string;
    stationName: string;
    stationCode: string;
    ecas: ECA[];
}

export interface PMRFloorAdhesive {
    id: string;
    name: string;
    status: FloorAdhesiveStatus;
    photo_base64?: string;
    photo_note?: string;
    photo_rotation?: number;
}

export interface PMRFloorAdhesiveData {
    id: string;
    stationName: string;
    stationCode: string;
    adhesives: PMRFloorAdhesive[];
    comment: string;
    completionDate?: string;
    isNotApplicable?: boolean;
    notApplicableReason?: string;
}

export interface CognitivePictogram {
    id: string;
    accessPointName: string;
    status: FloorAdhesiveStatus;
}

export interface CognitivePictogramData {
    id: string;
    stationName: string;
    stationCode: string;
    pictograms: CognitivePictogram[];
    comment: string;
    completionDate?: string;
}

// =================================================================
// AUDITS CONFIGURABLES (Partie 2) — brique générique à côté des types
// métier fixes ci-dessus, jamais à leur place (R : ne pas refactoriser
// DAT/ECA/P+R/PMR/Signalétique/Pictogrammes pour les rendre génériques).
// -----------------------------------------------------------------
// Trois niveaux strictement séparés :
//   AuditDefinition   — le PROJET d'audit : nom, icône, ciblage réseau.
//   SignageReference  — les objets contrôlés (scope.auditType === 'CUSTOM'),
//                        même table, même CRUD, même versioning/archivage
//                        que le reste du référentiel — AUCUNE donnée
//                        physique (dimensions/matière) dupliquée ici.
//   AuditModule (type CUSTOM) — l'existence de l'audit sur une station +
//                        les statuts RÉELLEMENT saisis, rien d'autre.
// =================================================================

/** Ciblage réseau d'un audit configurable — délibérément plat et lisible :
 *  lignes ciblées + exceptions. Pas de moteur de règles : la propagation
 *  (« Appliquer au réseau ») lit ces trois listes une fois, au moment où
 *  l'admin déclenche l'action — ce ne sont pas des règles réévaluées en
 *  permanence, jamais une source de suppression automatique. */
export interface AuditDefinition {
    id: string;                 // uuid technique (R1, comme SignageReference.id)
    name: string;                // "Plans de quartier"
    icon: string;                 // clé d'icône (data/customAuditIcons.ts, lucide-react)
    targetLines: (MetroLine | 'TRAM' | 'TELEO' | 'AEROPORT')[];
    excludedLieuIds: string[];   // stations explicitement exclues du ciblage par ligne
    includedLieuIds: string[];   // stations explicitement ajoutées hors ciblage par ligne
    /** Retirée des futurs déploiements et de la Nomenclature courante —
     *  JAMAIS des modules déjà matérialisés (aucune cascade, R8). */
    archivedAt?: string; // ISO
}

/** Un constat ARCHIVÉ d'une occurrence — ce qu'elle était lors d'un relevé
 *  antérieur. Créé UNIQUEMENT par l'action explicite « Nouveau constat »
 *  (jamais par une correction du constat courant) : previousConstats
 *  représente des relevés passés, pas les actions de saisie de
 *  l'utilisateur. Pas de photo conservée ici (même principe que
 *  SignageReferenceVersion : le contenu volumineux ne se duplique pas à
 *  chaque version — seul le constat courant garde une photo vivante). */
export interface CustomAuditConstat {
    status: AdhesiveStatus;
    comment?: string;
    constatedAt: string; // ISO
}

/** UN objet physique réellement recensé sur le terrain — son identité
 *  (`id`) est celle de L'OBJET, distincte de `referenceId` (le TYPE,
 *  cf. SignageReference). Plusieurs occurrences peuvent partager la même
 *  référence sur une même station (ex. 4 Plans de quartier 80×100
 *  adhésifs à Jean-Jaurès, chacun son emplacement). status/comment/
 *  photo/constatedAt forment le constat COURANT ; previousConstats
 *  l'historique des constats antérieurs (jamais des corrections en
 *  cours de saisie — cf. CustomAuditConstat). */
export interface CustomAuditOccurrence {
    id: string;
    referenceId: string;
    /** Emplacement précis, texte libre (« Entrée rue X », « Quai 1 »). */
    location?: string;
    status: AdhesiveStatus;
    comment?: string;
    photo_base64?: string | null;
    photo_note?: string;
    photo_rotation?: number;
    constatedAt: string; // ISO — date du constat COURANT
    previousConstats?: CustomAuditConstat[];
}

/** Données d'un module CUSTOM — aucune donnée physique (dimensions,
 *  matière...) : uniquement le lien vers la définition, l'identité de la
 *  station (dénormalisée, même convention que EcaData/PMRFloorAdhesiveData),
 *  les objets physiques réellement recensés (`occurrences`, jamais
 *  pré-remplis — un module fraîchement propagé démarre à `[]`) et l'état
 *  de vérification du module lui-même. Trois états distincts, jamais
 *  confondus :
 *    - occurrences: [] et lastCheckedAt absent   → jamais vérifié
 *    - occurrences: [...]                        → objet(s) constaté(s)
 *    - occurrences: [] et lastCheckedAt présent   → vérifié, rien trouvé
 *  `lastCheckedAt` est indépendant des occurrences : jamais un objet
 *  fictif pour représenter « rien trouvé ». */
export interface CustomAuditData {
    id: string;
    definitionId: string;   // AuditDefinition.id — jamais copié au-delà de cet id
    stationName: string;
    stationCode: string;
    occurrences: CustomAuditOccurrence[];
    /** Dernière visite de vérification de ce module, avec ou sans objet
     *  trouvé — mise à jour à chaque écriture terrain (ajout d'occurrence,
     *  constat) ET par l'action explicite « Aucun objet trouvé ». */
    lastCheckedAt?: string; // ISO
    comment: string;
}

// =================================================================
// MODULES & ROOT STRUCTURE
// =================================================================

export interface ModeData {
    id: string;
    name: string;
    type: TransportMode;
    line: MetroLine | 'TRAM' | 'TELEO' | 'AEROPORT';
    stations: Station[];
}

export interface AuditModule {
    id: string;
    type: AuditModuleType;
    name: string;
    data: ModeData | Pr | EcaData | PMRFloorAdhesiveData | CognitivePictogramData | CustomAuditData;
    isFuture?: boolean;
    line?: MetroLine | 'TRAM' | 'TELEO' | 'AEROPORT' | '';
}

export interface Lieu {
    id: string;
    name: string;
    modules: AuditModule[];
    /** Lot 2b : archivage Admin d'une station — réservé aux stations
     *  réellement abandonnées (rare). AUCUNE cascade : `modules` reste
     *  strictement inchangé (équipements et données d'audit déjà saisies
     *  intacts). Une station archivée disparaît du tableau de bord terrain
     *  (LieuSelector) mais reste consultable/restaurable depuis Admin —
     *  jamais supprimée tant qu'elle n'est pas explicitement effacée
     *  définitivement (garde-fou séparé). */
    archivedAt?: string; // ISO
}

export interface AuditCategoryConfig {
    key: AuditCategory;
    label: string;
    shortLabel: string;
    predicate: (module: AuditModule) => boolean;
    colors: {
        primary: string;
        text: string;
        badgeBg: string;
        badgeText: string;
        hoverPrimary?: string;
    };
}

// =================================================================
// STATS-SPECIFIC TYPES
// =================================================================
export interface AdhesiveInventoryItem {
    id: string;
    auditType: string;
    repere: string;
    name: string;
    dimensions: string;
    material: string;
    quantity: number;
}

export interface MaintenanceItem {
  lieuName: string;
  moduleName: string;
  elementName: string;
  context: string;
  adhesiveName: string;
  status: string;
  category?: AuditCategory;
  auditType?: AuditModuleType;
  /** Photo du relevé terrain, si l'audit source en capture une (PMR sol,
   *  Équipements Station) — absente sinon (ex. Pictogrammes cognitifs,
   *  DAT/PR/ECA, qui ne capturent pas de photo). */
  photo_base64?: string | null;
  photo_rotation?: number;
}

// =================================================================
// HISTORY TYPES
// =================================================================
export interface HistoryEntry {
    id?: number; // Auto-incremented by Dexie
    date: string; // ISO Date
    title: string;
    type: 'GLOBAL' | 'CATEGORY' | 'MODULE_TYPE' | 'SINGLE_AUDIT';
    score: number; // Percentage 0-100
    details: string; // JSON stringified data (lightweight, no photos)
    categoryKey?: string; // For filtering
}

// =================================================================
// JOURNAL D'ÉVÉNEMENTS (Lot 3) — trace chronologique et lisible des
// opérations métier importantes. Volontairement distinct de HistoryEntry
// ci-dessus : HistoryEntry est un INSTANTANÉ COMPLET (details = arbre de
// données) pris uniquement aux réinitialisations ; AppEvent est un
// événement LÉGER (résumé + quelques métadonnées, jamais de copie de
// données métier), couvrant un périmètre plus large (import/export,
// ajout/suppression d'éléments d'audit, arbitrage du référentiel,
// migrations, échecs de persistance). Les deux mécanismes coexistent
// dans l'onglet Archives, chacun répondant à une question différente :
// « à quoi ressemblaient les données ? » (HistoryEntry) vs.
// « que s'est-il passé, et quand ? » (AppEvent).
// =================================================================
export type AppEventType =
    | 'RESET_GLOBAL' | 'RESET_CATEGORY' | 'RESET_MODULE_TYPE' | 'RESET_AUDIT'
    | 'IMPORT' | 'EXPORT'
    | 'AUDIT_ITEM_ADDED' | 'AUDIT_ITEM_REMOVED'
    | 'REFERENCE_ARBITRAGE'
    // Lot 2a : CRUD Admin du référentiel signalétique (source unique, R1).
    | 'REFERENCE_CREATED' | 'REFERENCE_UPDATED' | 'REFERENCE_ARCHIVED' | 'REFERENCE_RESTORED' | 'REFERENCE_DELETED'
    // Lot 2b : CRUD Admin des stations (Lieu) — jamais de cascade sur modules.
    | 'STATION_CREATED' | 'STATION_RENAMED' | 'STATION_ARCHIVED' | 'STATION_RESTORED' | 'STATION_DELETED'
    // Partie 2 : CRUD Admin des audits configurables (AuditDefinition),
    // même famille que REFERENCE_* ci-dessus. APPLIED = un seul événement
    // consolidé par exécution de « Appliquer au réseau » (jamais un par
    // station créée, pour ne pas noyer le journal à l'échelle du réseau).
    | 'AUDIT_DEFINITION_CREATED' | 'AUDIT_DEFINITION_UPDATED' | 'AUDIT_DEFINITION_ARCHIVED'
    | 'AUDIT_DEFINITION_RESTORED' | 'AUDIT_DEFINITION_DELETED' | 'AUDIT_DEFINITION_APPLIED'
    | 'DATA_MIGRATION'
    | 'PERSISTENCE_ERROR';

export interface AppEvent {
    id?: number; // Auto-incremented by Dexie
    date: string; // ISO Date
    type: AppEventType;
    /** Catégorie de l'entité concernée (ex. 'lieu', 'reference', 'dat', 'eca',
     *  'pictogram', 'category', 'moduleType') — texte libre, pas une liste
     *  fermée : ce journal ne doit pas être un nouveau point de couplage
     *  rigide à chaque type d'audit existant ou futur. */
    entityType?: string;
    /** Identifiant de l'entité si disponible (id du lieu, id de la référence...). */
    entityId?: string;
    /** Libellé lisible de l'entité (nom du lieu, nom de la référence...). */
    entityLabel?: string;
    /** Résumé prêt à afficher tel quel — la phrase que l'UI montre. */
    summary: string;
    /** Métadonnées légères optionnelles (ex. { count: 12 }) — jamais une
     *  copie de données métier. */
    metadata?: Record<string, string | number | boolean>;
}

// =================================================================
// RÉFÉRENTIEL SIGNALÉTIQUE (signageReferences) — spécification commit 1
// -----------------------------------------------------------------
// Règle absolue : ce modèle décrit l'objet tel que l'agent terrain
// l'identifie — jamais son processus de fabrication (pas d'impression,
// de finition, de colle, de recto-verso, de prix, ni de ligne BPU
// structurante). Les détails fournisseur passent par ExternalDocumentRef.
// L'arbre d'audit Lieu → Module → Équipement → adhesives{} reste la
// source de vérité des statuts terrain ; ce référentiel n'en stocke aucun.
// =================================================================

/** Liste fermée assumée : vocabulaire structurel stable.
 *  'vitrophanie' = support signalétique destiné à une pose sur vitrage.
 *  'autre' = support physique réellement rencontré mais non encore
 *  catégorisé → needsReview obligatoire jusqu'à qualification. */
export type SignageSupport = 'adhesif' | 'dibond' | 'pvc' | 'vitrophanie' | 'autre';

/** width/height individuellement optionnelles (lettrage, découpe,
 *  largeur variable — cf. BPU PICTO ligne 40). */
export interface SignageDimensions {
    width?: number;
    height?: number;
    unit: 'cm' | 'mm';
}

/** Règle d'implantation (liste blanche, sans moteur de règles).
 *  equipmentTypes absent = tous les équipements de la famille.
 *  Les dérogations locales passent par equipment.adhesiveIds (inchangé). */
export type SignageScope =
    | { auditType: 'DAT' }
    | { auditType: 'PR'; equipmentTypes?: EquipmentType[] }
    | { auditType: 'ECA'; equipmentTypes?: EcaEquipmentType[] }
    /** Audit configurable (Partie 2) : la référence appartient à UNE
     *  définition précise (AuditDefinition.id) — jamais résolue par famille
     *  d'équipement comme PR/ECA, une définition n'a pas de sous-familles. */
    | { auditType: 'CUSTOM'; definitionId: string };

/** Localisation recommandée + consignes. `zone` est un texte court
 *  administrable (suggestions issues des valeurs existantes), pas une
 *  liste fermée. Aucun ordre de pose : fiche de référence, pas un workflow. */
export interface SignagePlacement {
    zone?: string;
    position?: string;
    alignmentMark?: string;
    installationGuidance?: string;
}

/** Référence documentaire externe (BPU, fichier imprimeur, annexe marché).
 *  Texte uniquement — les fichiers réels restent hors application (R5).
 *  `provider` est libre : PICTO n'est qu'une valeur possible. */
export interface ExternalDocumentRef {
    provider: string;
    fileReference: string;
    docVersion?: string;
    forVersion?: number;
    note?: string;
}

/** Qualification du référentiel (onglet « Qualification du référentiel »
 *  de Référentiel) — SOUS-OBJET UNIQUE, jamais de champs plats éparpillés.
 *  Portée volontairement restreinte au CATALOGUE (la fiche référence
 *  elle-même est-elle correcte/complète ?) — ne concerne jamais un
 *  constat terrain : un item absent/dégradé/non conforme est une
 *  anomalie (section Analyse des anomalies), traitée automatiquement,
 *  sans décision humaine. « to_replace » a donc été retiré de cet ensemble :
 *  le remplacement est une conséquence opérationnelle d'une anomalie,
 *  jamais une qualification de catalogue.
 *  Enregistre la décision humaine — ne l'applique jamais automatiquement :
 *  « remove » ne supprime rien (R1), l'application effective
 *  (désactivation, changement de version...) reste un acte d'administration. */
export type ArbitrageStatus = 'keep' | 'remove' | 'to_document';

export interface ArbitrageHistoryEntry {
    status: ArbitrageStatus;
    reason?: string;
    date: string;   // ISO
    author?: string;
}

export interface ArbitrageState {
    status: ArbitrageStatus;
    reason?: string;
    createdAt?: string;  // ISO — première décision
    updatedAt?: string;  // ISO — dernière modification
    history?: ArbitrageHistoryEntry[]; // décisions remplacées — jamais effacées
}

/** Snapshot d'une version physique antérieure (R2 : le versioning ne
 *  concerne que l'objet posé — jamais le marché, le prix ou le prestataire). */
export interface SignageReferenceVersion {
    version: number;
    /** Nom au moment de cette version — Lot 2a : un renommage fait aussi
     *  partie de « ce qui était posé », pas seulement le support/dimensions. */
    name?: string;
    support: SignageSupport;
    material?: string;
    dimensions?: SignageDimensions;
    /** Pose recommandée au moment de cette version — Lot 2a. */
    placement?: SignagePlacement;
    /** Description d'origine (texte libre) au moment de cette version — Lot 2a. */
    legacyDescription?: string;
    label?: string;
    effectiveTo: string; // ISO date de fin de validité
    changeReason?: string;
}

export interface SignageReference {
    // --- Identité — immuable (R1 : jamais de renommage d'id, fusion ou suppression) ---
    id: string;   // ids historiques conservés : ad1, adbe1, eca-11...
    code?: string; // future nomenclature Tisséo (colonne « Référence Tisseo » du BPU)
    name: string;

    // --- Implantation ---
    /** R11 : dérivé de scope.auditType (dénormalisé pour index Dexie).
     *  Jamais édité indépendamment du scope. */
    auditType: 'DAT' | 'PR' | 'ECA' | 'CUSTOM';
    scope: SignageScope;

    // --- Caractéristiques physiques ACTIVES (à plat — la lecture courante ne
    //     résout jamais un tableau de versions) ---
    version: number; // défaut 1
    support: SignageSupport;
    material?: string; // libellé matière administrable (absorbe les vocabulaires prestataires)
    dimensions?: SignageDimensions;
    placement: SignagePlacement;

    // --- Historique physique ---
    previousVersions?: SignageReferenceVersion[];

    // --- Documentation externe (texte uniquement, jamais de fichier) ---
    externalDocuments?: ExternalDocumentRef[];

    // --- Liens et drapeaux ---
    sameAs?: string[];   // équivalences métier (comptage commun) — jamais de fusion
    pairedWith?: string; // association physique (ex. recto/verso adca12/adca13)
    isDisabled?: boolean;
    needsReview?: boolean; // tâche d'administration en attente (divergence, qualification)
    /** Arbitrage métier — sous-objet unique (statut, motif, historique). */
    arbitrage?: ArbitrageState;
    legacyDescription?: string; // texte d'origine intégral — filet de sécurité
    /** Lot 2a : archivage Admin — DISTINCT d'isDisabled (qui exclut des
     *  calculs mais reste visible/grisée au terrain). Une référence
     *  archivée est un objet abandonné, réservé aux cas rares (R8) ; elle
     *  disparaît des listes actives et du résolveur d'implantation
     *  (resolveReferencesForEquipment), mais reste consultable dans les
     *  Archives Admin — jamais supprimée tant qu'elle n'est pas
     *  explicitement effacée définitivement (garde-fou séparé, R1). */
    archivedAt?: string; // ISO
}

/** Assets terrain légers uniquement (R6) : image compressée, jamais un
 *  document de production. Les PDF imprimeur restent hors application. */
export type SignageAssetKind = 'poseExample' | 'schema' | 'illustration';

export interface SignageAsset {
    id: string;
    referenceId: string; // SignageReference.id
    kind: SignageAssetKind;
    blob: Blob;
    mimeType: string;
    label?: string;
    forVersion?: number;
    addedAt: string; // ISO date
}
