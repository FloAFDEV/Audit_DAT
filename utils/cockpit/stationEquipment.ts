// utils/cockpit/stationEquipment.ts
// =================================================================
// ÉQUIPEMENTS STATION dans le Référentiel — consultation seule.
// -----------------------------------------------------------------
// Référentiel autonome (règle 7 de patrimoineIndex.ts) : lu directement dans
// SignaletiqueData, jamais fusionné avec la Signalétique IV, le PMR sol ou
// les pictogrammes. Aucun calcul nouveau :
//  - quantité d'un type = sa ligne de l'Inventaire détaillé ;
//  - emplacements = MÊME périmètre que cette ligne (computeAdhesiveInventory
//    / collectSignaletiquePlansQuartier), vérifié par test ;
//  - une quantité d'inventaire est une quantité PRÉVUE (emplacements
//    déclarés). La présence physique ne se lit que dans les constats :
//    conforme / dégradé / à remplacer / HS = présent ; absent = emplacement
//    sans objet ; non contrôlé = inconnu ; non installé = exclu.
//  - Aéroport Express : stations en préparation (ligne pas en service) —
//    comptées par l'inventaire, signalées comme telles, jamais « posées ».
//  - modules futurs (ex. Blagnac côté T1) : hors périmètre d'exploitation,
//    donc hors quantités ; restent CONSULTABLES via
//    futureStationEquipmentItems, jamais additionnés aux quantités.
// Hors exports CSV / Excel (validation exploitant).
// =================================================================
import { AuditModuleType, EquipmentStatusType, Lieu } from '../../types';
import { readStationEquipmentModule } from './stationEquipmentReader';
import { isModuleInCurrentScope } from '../moduleScope';
import { dirKeyOf } from '../signaletiqueDirections';
import { MULTI_QUAI_STATIONS, STATION_EQUIPMENT_DIMENSIONS } from '../../data/signaletique_config';

export type StationEquipmentKind = 'totem' | 'biv' | 'planReseau' | 'planQuartierTram' | 'planQuartierAeroport' | 'hap' | 'bandeau';

/** Ligne de l'Inventaire détaillé de chaque type (hooks/useStats.ts). */
export const STATION_EQUIPMENT_ROW_IDS: Record<StationEquipmentKind, string> = {
    totem: 'sign-totem',
    biv: 'sign-biv',
    planReseau: 'sign-plan-reseau',
    planQuartierTram: 'sign-plan-quartier-tram',
    planQuartierAeroport: 'sign-plan-quartier-aeroport',
    hap: 'sign-hap',
    bandeau: 'sign-bandeau',
};

export type EquipmentStatus = EquipmentStatusType | 'NotChecked';

export interface StationEquipmentSubElement { label: string; dimensions?: string; status: EquipmentStatus }

export interface StationEquipmentItem {
    kind: StationEquipmentKind;
    line: string;
    lieuName: string;
    stationName: string;
    /** Extrémité (totem, bandeau) ou direction réelle de la station. */
    direction?: string;
    /** Rang dans la direction (1, 2…), quand plusieurs exemplaires. */
    rank?: number;
    dimensions?: string;
    status: EquipmentStatus;
    subElements: StationEquipmentSubElement[];
    /** Station en exploitation (registre) ; false = ligne en préparation. */
    inService: boolean;
    comment?: string;
}

type Holder = { status?: EquipmentStatus; dimensions?: string; comment?: string } & Record<string, unknown>;

const sub = (holder: Holder, defs: [string, string, string?][]): StationEquipmentSubElement[] =>
    defs.flatMap(([field, label, dimensions]) => holder[field] === undefined ? [] : [{
        label, ...(dimensions ? { dimensions } : {}), status: (holder[field] as EquipmentStatus) ?? 'NotChecked',
    }]);

const stripDirectionPrefix = (name: string) => name.replace(/^Direction\s+/i, '');

const BIV_SUB_ELEMENTS: [string, string, string?][] = [
    ['screenFunctioning', 'Fonctionnement écran'],
    ['whiteTextAdhesives', 'Adhésifs blancs'],
    ['ligneCaisson', 'Caisson — ligne', '6,7 × 2 cm'],
    ['destinationCaisson', 'Caisson — destination', '15,2 × 2 cm'],
    ['attenteMinCaisson', 'Caisson — attente en min', '18,2 × 2 cm'],
    ['dureeApproxCaisson', 'Caisson — durée approximative', '22,4 × 1,5 cm'],
];
const QUAI_SUB_ELEMENT: [string, string, string] = ['quaiCaisson', 'Caisson — quai', '6 × 2 cm'];

/** Projection « emplacements » du parcours unique
 *  (utils/cockpit/stationEquipmentReader.ts) ; `future` choisit les modules
 *  hors exploitation actuelle (consultation seule) au lieu des modules
 *  comptés. Règles propres à cette projection : sous-éléments décrits
 *  seulement, quai pour les stations multi-quais, plans T1 d'une station en
 *  exploitation hors « non installé ». */
const collectStationEquipment = (lieux: Lieu[], future: boolean): StationEquipmentItem[] => {
    const items: StationEquipmentItem[] = [];
    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            if (module.type !== AuditModuleType.SIGNALETIQUE || isModuleInCurrentScope(module) === future) continue;
            const line = module.line || '?';
            for (const described of readStationEquipmentModule(lieu, module)) {
                const { station, stationInService: inService, position, rank, count } = described;
                const h = described.holder as Holder;
                // Extrémités physiques (totem, bandeau) : libellés du formulaire ;
                // autres types : direction réelle de la station.
                const end = position === 'direction1' ? 0 : position === 'direction2' ? 1 : -1;
                const direction = end >= 0
                    ? (station.directions[end]?.name ? stripDirectionPrefix(station.directions[end].name) : (end === 0 ? 'Extrémité A' : 'Extrémité B'))
                    : station.directions.find(d => dirKeyOf(d.name) === position)?.name;
                const push = (kind: StationEquipmentKind, subElements: StationEquipmentSubElement[]) => {
                    items.push({
                        line, lieuName: lieu.name, stationName: station.name, inService,
                        kind, direction, ...(count > 1 && rank ? { rank } : {}),
                        dimensions: h.dimensions, status: h.status ?? 'NotChecked', subElements,
                        ...(h.comment ? { comment: h.comment } : {}),
                    });
                };
                switch (described.kind) {
                    case 'totem': push('totem', []); break;
                    case 'bandeau': push('bandeau', sub(h, [['directionContent', 'Contenu direction'], ['stationNameContent', 'Nom de station']])); break;
                    case 'biv': push('biv', sub(h, MULTI_QUAI_STATIONS.includes(station.name) ? [...BIV_SUB_ELEMENTS, QUAI_SUB_ELEMENT] : BIV_SUB_ELEMENTS)); break;
                    case 'planReseau': push('planReseau', sub(h, [['bannerStationName', 'Bannière nom de station'], ['hap', 'HAP']])); break;
                    case 'planQuartier': {
                        const subElements = sub(h, [['bannerDirection', 'Bandeau direction'], ['hap', 'HAP']]);
                        if (line === 'AEROPORT') { push('planQuartierAeroport', subElements); break; }
                        // Plans T1 : même règle que collectSignaletiquePlansQuartier
                        // (station en exploitation, « non installé » exclu) ;
                        // station future : consultée telle quelle.
                        if (!future && (!inService || (h.status ?? 'NotChecked') === EquipmentStatusType.NOT_APPLICABLE)) break;
                        push('planQuartierTram', subElements);
                        break;
                    }
                    case 'hap': push('hap', []); break;
                }
            }
        }
    }
    return items;
};

/** Emplacements comptés par l'inventaire (périmètre d'exploitation). */
export const stationEquipmentItems = (lieux: Lieu[]): StationEquipmentItem[] => collectStationEquipment(lieux, false);

/** Emplacements des modules futurs : consultables, jamais comptés. */
export const futureStationEquipmentItems = (lieux: Lieu[]): StationEquipmentItem[] => collectStationEquipment(lieux, true);

export interface StationEquipmentPresence {
    /** Emplacements déclarés (= quantité d'inventaire). */
    declared: number;
    /** Objet constaté sur place (conforme, dégradé, à remplacer, HS). */
    present: number;
    absent: number;
    unchecked: number;
    notInstalled: number;
    /** Dont stations en préparation (ligne pas en service). */
    inPreparation: number;
}

export const stationEquipmentPresence = (items: StationEquipmentItem[]): StationEquipmentPresence => {
    const p: StationEquipmentPresence = { declared: items.length, present: 0, absent: 0, unchecked: 0, notInstalled: 0, inPreparation: 0 };
    for (const item of items) {
        if (!item.inService) p.inPreparation++;
        switch (item.status) {
            case 'NotChecked': p.unchecked++; break;
            case EquipmentStatusType.ABSENT: p.absent++; break;
            case EquipmentStatusType.NOT_APPLICABLE: p.notInstalled++; break;
            default: p.present++;
        }
    }
    return p;
};

/** Quantité THÉORIQUE de la règle historique de l'inventaire : une par
 *  extrémité de station (2 totems, 2 bandeaux), que l'équipement soit
 *  décrit ou non dans les données. Conservée et documentée séparément :
 *  l'inventaire et les vues comptent les emplacements DÉCRITS, jamais
 *  cette quantité théorique. */
export const STATION_EQUIPMENT_THEORETICAL_PER_STATION: Partial<Record<StationEquipmentKind, number>> = { totem: 2, bandeau: 2 };

/** Quantité théorique par type pour les stations décrites du périmètre
 *  d'exploitation (stations portant des données d'équipements). */
export const theoreticalStationEquipment = (lieux: Lieu[]): Partial<Record<StationEquipmentKind, number>> => {
    const stations = lieux.flatMap(lieu => lieu.modules
        .filter(m => m.type === AuditModuleType.SIGNALETIQUE && isModuleInCurrentScope(m))
        .flatMap(m => (m.data as { stations?: { signaletique?: unknown }[] }).stations ?? []))
        .filter(st => st.signaletique).length;
    return Object.fromEntries(Object.entries(STATION_EQUIPMENT_THEORETICAL_PER_STATION).map(([kind, n]) => [kind, n * stations]));
};

/** Dimension affichée d'un type quand l'exemplaire n'en porte pas. */
export const STATION_EQUIPMENT_DEFAULT_DIMENSIONS: Partial<Record<StationEquipmentKind, string>> = {
    totem: STATION_EQUIPMENT_DIMENSIONS.totem,
    bandeau: STATION_EQUIPMENT_DIMENSIONS.bandeau,
    planReseau: STATION_EQUIPMENT_DIMENSIONS.planReseau,
};
