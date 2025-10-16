// =================================================================
// SECTION: Enums and String Literal Types
// =================================================================

export enum AdhesiveStatus {
    OK = "OK",
    Absent = "Absent",
    ToBeReplaced = "À remplacer",
    NotChecked = "Non vérifié",
    NotApplicable = "Non applicable",
}

export enum FloorAdhesiveStatus {
    OK = "OK",
    ToBeReplaced = "À remplacer",
    NotChecked = "Non vérifié",
}

export enum TransportMode {
    METRO = 'METRO',
    TRAM = 'TRAM',
    TELEO = 'TELEO',
}

export type MetroLine = 'A' | 'B' | 'C';

export enum EquipmentType {
    BE = 'Borne Entrée',
    BS = 'Borne Sortie',
    CA = 'Caisse Auto',
}

export enum EcaEquipmentType {
    TripodeEntree = "Tripode d'entrée",
    TripodeSortie = "Tripode de sortie",
    PMRBras = "PMR à bras",
    PMRVantaux = "PMR à vantaux",
}

export enum AuditModuleType {
    DAT = 'DAT',
    PR = 'P+R',
    ECA = 'ECA',
    PMR_FLOOR_ADHESIVE = 'PMR_FLOOR_ADHESIVE',
    COGNITIVE_PICTOGRAMS = 'COGNITIVE_PICTOGRAMS',
}

export type AuditCategory = 'METRO_A' | 'METRO_B' | 'METRO_C' | 'TRAM' | 'TELEO' | 'PR';

// =================================================================
// SECTION: Core Data Interfaces
// =================================================================

export interface Adhesive {
    id: string;
    name: string;
    description: string;
    referentiel: string;
    groupId?: string;
    groupName?: string;
}

export interface PrAdhesive extends Adhesive {
    location: string;
}

export interface DAT {
    id: string;
    name: string;
    adhesives: { [key: string]: AdhesiveStatus };
    comment: string;
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
    directions: Direction[];
    isFuture?: boolean;
    lieuName?: string;
}

export interface Equipment {
    id: string;
    name: string;
    type: EquipmentType;
    adhesives: { [key: string]: AdhesiveStatus };
    comment: string;
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
}

export interface PMRFloorAdhesive {
    id: string;
    name: string;
    status: FloorAdhesiveStatus;
}

export interface CognitivePictogram {
    id: string;
    accessPointName: string;
    status: FloorAdhesiveStatus;
}

// =================================================================
// SECTION: Module Data Structures
// =================================================================

export interface ModeData {
    id: string;
    name: string;
    type: TransportMode;
    line: MetroLine | 'TRAM' | 'TELEO';
    stations: Station[];
}

export interface Pr {
    id: string;
    name: string;
    equipments: Equipment[];
}

export interface EcaData {
    id: string;
    stationName: string;
    stationCode: string;
    ecas: ECA[];
}

export interface PMRFloorAdhesiveData {
    id: string;
    stationName: string;
    stationCode: string;
    adhesives: PMRFloorAdhesive[];
}

export interface CognitivePictogramData {
    id: string;
    stationName: string;
    stationCode: string;
    pictograms: CognitivePictogram[];
}

// =================================================================
// SECTION: Top-Level Audit Structures
// =================================================================

export interface AuditModule {
    id: string;
    type: AuditModuleType;
    name: string;
    data: ModeData | Pr | EcaData | PMRFloorAdhesiveData | CognitivePictogramData;
    isFuture?: boolean;
    line?: MetroLine | 'TRAM' | 'TELEO';
}

export interface Lieu {
    id: string;
    name: string;
    modules: AuditModule[];
}

// =================================================================
// SECTION: Configuration Interfaces
// =================================================================

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