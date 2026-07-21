
export enum AuditModuleType {
    DAT = 'DAT',
    PR = 'PR',
    ECA = 'ECA',
    PMR_FLOOR_ADHESIVE = 'PMR_FLOOR_ADHESIVE',
    COGNITIVE_PICTOGRAMS = 'COGNITIVE_PICTOGRAMS',
    SIGNALETIQUE = 'SIGNALETIQUE',
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
    dimensions?: string; // "80 x 100 cm"
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
    data: ModeData | Pr | EcaData | PMRFloorAdhesiveData | CognitivePictogramData;
    isFuture?: boolean;
    line?: MetroLine | 'TRAM' | 'TELEO' | 'AEROPORT' | '';
}

export interface Lieu {
    id: string;
    name: string;
    modules: AuditModule[];
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
    | { auditType: 'ECA'; equipmentTypes?: EcaEquipmentType[] };

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

/** Snapshot d'une version physique antérieure (R2 : le versioning ne
 *  concerne que l'objet posé — jamais le marché, le prix ou le prestataire). */
export interface SignageReferenceVersion {
    version: number;
    support: SignageSupport;
    material?: string;
    dimensions?: SignageDimensions;
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
    auditType: 'DAT' | 'PR' | 'ECA';
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
    legacyDescription?: string; // texte d'origine intégral — filet de sécurité
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
