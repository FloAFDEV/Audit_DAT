// utils/cockpit/moduleAdmin.ts
// =================================================================
// ADMIN — attacher un module (DAT/ECA/P+R) à une station, et gérer les
// zones/bornes d'un module P+R (Lot 2c).
// -----------------------------------------------------------------
// Fonctions pures : ne touchent pas Dexie, même patron que
// utils/cockpit/stationAdmin.ts et signageReferenceEditor.ts.
//
// Pourquoi pas createDatModule/createEcaModule (data/builder.ts) ? Ces
// fonctions sont couplées au registre historique du réseau réel (lignes
// fixes LINE_A_STATIONS/..., codes de station, config PMR par station) —
// elles ne peuvent pas produire un module pour une station Admin
// arbitraire. Les constructeurs ci-dessous produisent la forme MINIMALE
// valide de chaque type de module (même structure de données, aucun
// champ historique), pour que les mécanismes terrain déjà existants
// (Ajouter un DAT, Ajouter un ECA...) fonctionnent immédiatement dessus.
//
// R1 : tous les ids générés ici (module, station interne, direction,
// zone, équipement) sont des uuid techniques, jamais dérivés d'un nom.
//
// P+R : les zones/équipements n'ont aucun mécanisme de CRUD ailleurs
// dans l'application (contrairement aux DAT/ECA) — ce module comble
// exactement ce manque, en miroir du patron déjà utilisé pour les DAT
// (utils/cockpit/stationAdmin.ts) : créer/renommer/supprimer une zone,
// créer/renommer/supprimer une borne.
// =================================================================
import { v4 as uuidv4 } from 'uuid';
import {
    AuditModule, AuditModuleType, TransportMode, MetroLine, ModeData, Pr, PrZone, Equipment,
    EcaData, EquipmentType, SignageReference, PMRFloorAdhesiveData, PMRFloorAdhesive, FloorAdhesiveStatus,
    CognitivePictogramData,
} from '../../types';
import { getEffectiveEquipmentAdhesives } from '../effectiveAdhesives';
import { createInitialAdhesiveStatus } from '../../data/builder';
import { getInitialSignaletiqueData } from '../../data/signaletique_config';

export type ModuleLine = MetroLine | 'TRAM' | 'TELEO' | 'AEROPORT';
export type AttachableModuleType = 'DAT' | 'ECA' | 'PR' | 'PMR_FLOOR_ADHESIVE' | 'COGNITIVE_PICTOGRAMS' | 'SIGNALETIQUE';

export const MODULE_LINES: ModuleLine[] = ['A', 'B', 'C', 'TRAM', 'TELEO', 'AEROPORT'];

/** Lignes réellement admissibles par type, telles qu'observées dans le
 *  générateur historique (data/builder.ts) — on n'étend RIEN au-delà de ce
 *  qui existe déjà (R : « exposer, ne pas inventer »). DAT/ECA gardent le
 *  choix complet déjà en place avant ce lot (comportement inchangé). */
export const ATTACHABLE_MODULE_LINES: Record<AttachableModuleType, ModuleLine[]> = {
    DAT: MODULE_LINES,
    ECA: MODULE_LINES,
    PR: [],
    // builder.ts : allStationsForPmr = LIGNE A + B + C uniquement.
    PMR_FLOOR_ADHESIVE: ['A', 'B', 'C'],
    // builder.ts : généré uniquement pour LINE_A_STATIONS et LINE_B_STATIONS.
    COGNITIVE_PICTOGRAMS: ['A', 'B'],
    // builder.ts : createSignaletiqueModule appelé uniquement pour TRAM_STATIONS et AEROPORT_EXPRESS_STATIONS.
    SIGNALETIQUE: ['TRAM', 'AEROPORT'],
};

/** Types dont AU PLUS UN module peut exister par station — reflète les ids
 *  déterministes du générateur historique (`module-dat-${station.id}`,
 *  `module-sig-${station.id}`...) qui rendent un doublon structurellement
 *  impossible pour ces types-là. ECA et PMR au sol en sont volontairement
 *  absents : le générateur crée légitimement plusieurs modules de ces types
 *  quand une station a plusieurs points d'accès physiques distincts
 *  (cf. Jean-Jaurès). */
const UNIQUE_PER_STATION: ReadonlySet<AuditModuleType> = new Set([
    AuditModuleType.DAT, AuditModuleType.PR, AuditModuleType.COGNITIVE_PICTOGRAMS, AuditModuleType.SIGNALETIQUE,
]);

/** Un type unique déjà présent sur la station ne doit plus être proposé à
 *  l'ajout (Admin). ECA/PMR au sol restent toujours proposables — c'est à
 *  l'utilisateur de nommer le point d'accès pour les distinguer. */
export const isModuleTypeAttachable = (existingModules: AuditModule[], type: AuditModuleType): boolean => {
    if (!UNIQUE_PER_STATION.has(type)) return true;
    return !existingModules.some(m => m.type === type);
};

/** Même correspondance que data/builder.ts (ex. AEROPORT_EXPRESS_STATIONS
 *  est généré avec TransportMode.TRAM, pas METRO) — reprise ici pour
 *  qu'un module créé en Admin ait un `type` cohérent avec l'existant. */
const lineToTransportMode = (line: ModuleLine): TransportMode => {
    if (line === 'TRAM' || line === 'AEROPORT') return TransportMode.TRAM;
    if (line === 'TELEO') return TransportMode.TELEO;
    return TransportMode.METRO;
};

const assertNonEmpty = (value: string, label: string) => {
    if (!value.trim()) throw new Error(`${label} est obligatoire.`);
};

/** DAT — une station et une direction par défaut ("Accès"), sans DAT :
 *  le mécanisme terrain existant (Ajouter un DAT) prend le relais. Aucun
 *  CRUD de direction n'existe ailleurs dans l'app — une seule direction
 *  par défaut reste dans la portée minimale de ce lot (R4). */
export const createBlankDatModule = (stationName: string, line: ModuleLine): AuditModule => {
    assertNonEmpty(stationName, 'Le nom de la station');
    const stationId = uuidv4();
    const modeData: ModeData = {
        id: `mode-${stationId}`,
        name: stationName,
        type: lineToTransportMode(line),
        line,
        stations: [{
            id: stationId,
            name: stationName,
            directions: [{ id: uuidv4(), name: 'Accès', dats: [] }],
        }],
    };
    return {
        id: uuidv4(),
        type: AuditModuleType.DAT,
        name: 'DAT',
        data: modeData,
        isFuture: false,
        line,
    };
};

/** ECA — aucun valideur initial : le mécanisme terrain existant
 *  (Ajouter un ECA, déjà non gated Admin) prend le relais immédiatement.
 *  `accessPointLabel` optionnel : une station peut légitimement avoir
 *  plusieurs modules ECA (plusieurs points d'accès physiques distincts,
 *  cf. Jean-Jaurès) — ce libellé les distingue dans les listes au lieu de
 *  répéter « ECA (Valideurs) » sans pouvoir les différencier. */
export const createBlankEcaModule = (stationName: string, line: ModuleLine, accessPointLabel?: string): AuditModule => {
    assertNonEmpty(stationName, 'Le nom de la station');
    const ecaData: EcaData = {
        id: uuidv4(),
        stationName,
        stationCode: '',
        ecas: [],
    };
    return {
        id: uuidv4(),
        type: AuditModuleType.ECA,
        name: accessPointLabel?.trim() ? `ECA (${accessPointLabel.trim()})` : 'ECA (Valideurs)',
        data: ecaData,
        isFuture: false,
        line, // dénormalisé pour AUDIT_CATEGORIES — cohérent avec createDatModule.
    };
};

/** P+R — aucune zone initiale : reprend exactement la forme du repli
 *  « pas de structure connue » déjà présent dans createPrModule
 *  (data/builder.ts) pour un P+R sans PR_STRUCTURES correspondant. */
export const createBlankPrModule = (stationName: string): AuditModule => {
    assertNonEmpty(stationName, 'Le nom de la station');
    const pr: Pr = { id: uuidv4(), name: stationName, zones: [] };
    return {
        id: uuidv4(),
        type: AuditModuleType.PR,
        name: 'Audit Bornes P+R',
        data: pr,
    };
};

/** PMR au sol — un seul item fixe (« présence et état de l'adhésif de
 *  signalisation au sol »), exactement la forme produite par
 *  createSpecificPmrFloorAdhesiveModule (data/builder.ts) pour un point
 *  d'accès réel : aucun mécanisme terrain n'ajoute d'autres items à ce
 *  module (contrairement à DAT/ECA/Pictogrammes), donc pas de liste vide
 *  à remplir ensuite — la forme minimale valide EST la forme finale.
 *  `accessPointLabel` optionnel, même rôle que pour ECA (plusieurs points
 *  d'accès PMR distincts sur une même station, cf. Jean-Jaurès). */
export const createBlankPmrFloorModule = (stationName: string, line: ModuleLine, accessPointLabel?: string): AuditModule => {
    assertNonEmpty(stationName, 'Le nom de la station');
    const adhesives: PMRFloorAdhesive[] = [{
        id: uuidv4(),
        name: `Présence et état de l'adhésif de signalisation au sol`,
        status: FloorAdhesiveStatus.NotChecked,
    }];
    const data: PMRFloorAdhesiveData = {
        id: uuidv4(),
        stationName,
        stationCode: '',
        adhesives,
        comment: '',
    };
    return {
        id: uuidv4(),
        type: AuditModuleType.PMR_FLOOR_ADHESIVE,
        name: accessPointLabel?.trim() ? `Adhésifs PMR au Sol (${accessPointLabel.trim()})` : 'Adhésifs PMR au Sol',
        data,
        isFuture: false,
        line,
    };
};

/** Pictogrammes cognitifs — aucun pictogramme initial : le mécanisme
 *  terrain existant (handleAddCognitivePictogramAccessPoint, déjà non
 *  gated Admin) prend le relais immédiatement, même patron que ECA. */
export const createBlankCognitivePictogramModule = (stationName: string, line: ModuleLine): AuditModule => {
    assertNonEmpty(stationName, 'Le nom de la station');
    const data: CognitivePictogramData = {
        id: uuidv4(),
        stationName,
        stationCode: '',
        pictograms: [],
        comment: '',
    };
    return {
        id: uuidv4(),
        type: AuditModuleType.COGNITIVE_PICTOGRAMS,
        name: 'Pictogrammes Cognitifs',
        data,
        isFuture: false,
        line,
    };
};

/** Signalétique (« Équipements Station ») — même forme que
 *  createSignaletiqueModule (data/builder.ts), avec des directions vides
 *  (pas de DAT ici) : getInitialSignaletiqueData est déjà générique (ne
 *  dépend que du nom de station), directement réutilisable pour une
 *  station Admin arbitraire. Restreint à TRAM/AEROPORT (cf.
 *  ATTACHABLE_MODULE_LINES) — même périmètre que le générateur, jamais
 *  étendu au Métro par ce lot. */
export const createBlankSignaletiqueModule = (stationName: string, line: 'TRAM' | 'AEROPORT'): AuditModule => {
    assertNonEmpty(stationName, 'Le nom de la station');
    const stationId = uuidv4();
    const modeData: ModeData = {
        id: `mode-sig-${stationId}`,
        name: stationName,
        type: TransportMode.TRAM,
        line,
        stations: [{
            id: stationId,
            name: stationName,
            directions: [{ id: uuidv4(), name: 'Accès', dats: [] }],
            signaletique: getInitialSignaletiqueData(stationName),
        }],
    };
    return {
        id: uuidv4(),
        type: AuditModuleType.SIGNALETIQUE,
        name: 'Équipements Station',
        data: modeData,
        isFuture: false,
        line,
    };
};

// -----------------------------------------------------------------
// P+R — zones et bornes (BE/BS/CA) — CRUD absent ailleurs dans l'app.
// -----------------------------------------------------------------

export const createPrZone = (name: string): PrZone => {
    assertNonEmpty(name, 'Le nom de la zone');
    return { id: uuidv4(), name: name.trim(), equipments: [] };
};

export const withZoneRenamed = (zone: PrZone, newName: string): PrZone => {
    assertNonEmpty(newName, 'Le nom de la zone');
    return { ...zone, name: newName.trim() };
};

/** Statuts initiaux dérivés du référentiel EFFECTIF (Lot 1 : historique +
 *  additions Admin), jamais de la seule constante statique — une borne
 *  créée aujourd'hui doit voir toute référence déjà administrée. */
export const createPrEquipment = (name: string, type: EquipmentType, references: SignageReference[]): Equipment => {
    assertNonEmpty(name, "Le nom de l'équipement");
    const adhesives = createInitialAdhesiveStatus(getEffectiveEquipmentAdhesives(references, type));
    return { id: uuidv4(), name: name.trim(), type, adhesives, comment: '' };
};

export const withEquipmentRenamed = (equipment: Equipment, newName: string): Equipment => {
    assertNonEmpty(newName, "Le nom de l'équipement");
    return { ...equipment, name: newName.trim() };
};

/**
 * Lot 2d — définit ou retire une surcharge de périmètre (adhesiveIds) sur
 * une borne existante. Fonction pure et STRICTEMENT limitée à ce seul
 * champ : `equipment.adhesives` (les statuts déjà saisis) n'est jamais
 * touché — une référence qui sort temporairement du périmètre actif
 * garde son statut en mémoire, prêt à réapparaître si le périmètre est
 * élargi à nouveau (aucune perte silencieuse de donnée d'audit).
 * `undefined`/tableau vide = retour au périmètre standard du type de
 * borne (on supprime le champ plutôt que de stocker un tableau vide, pour
 * éviter un état ambigu « 0 référence sélectionnée »).
 */
export const withEquipmentScopeOverride = (equipment: Equipment, adhesiveIds: string[] | undefined): Equipment => {
    if (!adhesiveIds || adhesiveIds.length === 0) {
        const { adhesiveIds: _drop, ...rest } = equipment;
        return rest;
    }
    return { ...equipment, adhesiveIds };
};
