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
    EcaData, EquipmentType, SignageReference,
} from '../../types';
import { getEffectiveEquipmentAdhesives } from '../effectiveAdhesives';
import { createInitialAdhesiveStatus } from '../../data/builder';

export type ModuleLine = MetroLine | 'TRAM' | 'TELEO' | 'AEROPORT';
export type AttachableModuleType = 'DAT' | 'ECA' | 'PR';

export const MODULE_LINES: ModuleLine[] = ['A', 'B', 'C', 'TRAM', 'TELEO', 'AEROPORT'];

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
 *  (Ajouter un ECA, déjà non gated Admin) prend le relais immédiatement. */
export const createBlankEcaModule = (stationName: string, line: ModuleLine): AuditModule => {
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
        name: 'ECA (Valideurs)',
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
