export enum AuditModuleType {
    DAT = 'DAT',
    PR = 'PR',
    ECA = 'ECA',
    PMR_FLOOR_ADHESIVE = 'PMR_FLOOR_ADHESIVE',
    COGNITIVE_PICTOGRAMS = 'COGNITIVE_PICTOGRAMS',
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

export interface Station {
    id: string;
    name: string;
    code?: string;
    isFuture?: boolean;
    directions: Direction[];
    lieuName?: string;
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