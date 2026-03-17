
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

export type AuditCategory = 'METRO_A' | 'METRO_B' | 'METRO_C' | 'TRAM' | 'TELEO' | 'PR';

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
}

export interface PlanReseauStatus extends EquipmentStatus {
    dimensions?: string; // "80 x 100 cm"
    bannerStationName: EquipmentStatusType | 'NotChecked';
    hap: EquipmentStatusType | 'NotChecked';
}

export interface PlanQuartierStatus extends EquipmentStatus {
    dimensions?: string; // "80 x 100 cm"
    bannerDirection: EquipmentStatusType | 'NotChecked';
    relayInfo: EquipmentStatusType | 'NotChecked';
    terminusCase: EquipmentStatusType | 'NotChecked';
    hap: EquipmentStatusType | 'NotChecked';
}

export interface HapStatus extends EquipmentStatus {
    // Fiche horaire (HAP) - présence et état
}

export interface SignaletiqueData {
    totem: {
        meett: TotemStatus[];
        pdj: TotemStatus[];
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
}

export interface Station {
    id: string;
    name: string;
    code?: string;
    isFuture?: boolean;
    directions: Direction[];
    lieuName?: string;
    signaletique?: SignaletiqueData;
    comment?: string;
}

export interface Equipment {
    id: string;
    name: string;
    type: EquipmentType;
    adhesives: { [key: string]: AdhesiveStatus };
    comment: string;
    completionDate?: string;
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
    line: MetroLine | 'TRAM' | 'TELEO';
    stations: Station[];
}

export interface AuditModule {
    id: string;
    type: AuditModuleType;
    name: string;
    data: ModeData | Pr | EcaData | PMRFloorAdhesiveData | CognitivePictogramData;
    isFuture?: boolean;
    line?: MetroLine | 'TRAM' | 'TELEO' | '';
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
