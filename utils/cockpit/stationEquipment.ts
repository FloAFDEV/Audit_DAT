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
// Hors exports CSV / Excel (validation exploitant).
// =================================================================
import { AuditModuleType, EquipmentStatusType, Lieu, ModeData, SignaletiqueData, Station } from '../../types';
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

export const stationEquipmentItems = (lieux: Lieu[]): StationEquipmentItem[] => {
    const items: StationEquipmentItem[] = [];
    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            if (module.type !== AuditModuleType.SIGNALETIQUE || !isModuleInCurrentScope(module)) continue;
            const line = module.line || '?';
            for (const station of (module.data as ModeData).stations ?? []) {
                const sig: SignaletiqueData | undefined = station.signaletique;
                if (!sig) continue;
                const inService = isModuleInCurrentScope(station as Station);
                const base = { line, lieuName: lieu.name, stationName: station.name, inService };
                const push = (kind: StationEquipmentKind, holder: Holder, direction: string | undefined, rank: number | undefined, count: number, subElements: StationEquipmentSubElement[]) => {
                    items.push({
                        ...base, kind, direction, ...(count > 1 && rank ? { rank } : {}),
                        dimensions: holder.dimensions, status: holder.status ?? 'NotChecked', subElements,
                        ...(holder.comment ? { comment: holder.comment } : {}),
                    });
                };

                // Extrémités physiques (totem, bandeau) : libellés du formulaire.
                (['direction1', 'direction2'] as const).forEach((dir, i) => {
                    const endpoint = station.directions[i]?.name ? stripDirectionPrefix(station.directions[i].name) : (i === 0 ? 'Extrémité A' : 'Extrémité B');
                    const totem = sig.totem?.[dir] as unknown as Holder | undefined;
                    if (totem) push('totem', totem, endpoint, undefined, 1, []);
                    const bandeau = sig.bandeauStation?.[dir] as unknown as Holder | undefined;
                    if (bandeau) push('bandeau', bandeau, endpoint, undefined, 1, sub(bandeau, [
                        ['directionContent', 'Contenu direction'], ['stationNameContent', 'Nom de station'],
                    ]));
                });

                (['meett', 'pdj'] as const).forEach(dir => {
                    const direction = station.directions.find(d => dirKeyOf(d.name) === dir)?.name;
                    const each = (list: unknown[] | undefined, fn: (h: Holder, rank: number, count: number) => void) =>
                        (list ?? []).forEach((h, i, all) => fn(h as Holder, i + 1, all.length));
                    each(sig.biv?.[dir], (h, rank, count) => push('biv', h, direction, rank, count, sub(h, [
                        ['screenFunctioning', 'Fonctionnement écran'],
                        ['whiteTextAdhesives', 'Adhésifs blancs'],
                        ['ligneCaisson', 'Caisson — ligne', '6,7 × 2 cm'],
                        ['destinationCaisson', 'Caisson — destination', '15,2 × 2 cm'],
                        ['attenteMinCaisson', 'Caisson — attente en min', '18,2 × 2 cm'],
                        ['dureeApproxCaisson', 'Caisson — durée approximative', '22,4 × 1,5 cm'],
                        ...(MULTI_QUAI_STATIONS.includes(station.name) ? [['quaiCaisson', 'Caisson — quai', '6 × 2 cm'] as [string, string, string]] : []),
                    ])));
                    each(sig.planReseau?.[dir], (h, rank, count) => push('planReseau', h, direction, rank, count, sub(h, [
                        ['bannerStationName', 'Bannière nom de station'], ['hap', 'HAP'],
                    ])));
                    each(sig.planQuartier?.[dir], (h, rank, count) => {
                        const subElements = sub(h, [['bannerDirection', 'Bandeau direction'], ['hap', 'HAP']]);
                        if (line === 'AEROPORT') { push('planQuartierAeroport', h, direction, rank, count, subElements); return; }
                        // Plans T1 : même règle que collectSignaletiquePlansQuartier
                        // (station en exploitation, « non installé » exclu).
                        if (!inService || (h.status ?? 'NotChecked') === EquipmentStatusType.NOT_APPLICABLE) return;
                        push('planQuartierTram', h, direction, rank, count, subElements);
                    });
                    each(sig.hap?.[dir], (h, rank, count) => push('hap', h, direction, rank, count, []));
                });
            }
        }
    }
    return items;
};

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

/** Dimension affichée d'un type quand l'exemplaire n'en porte pas. */
export const STATION_EQUIPMENT_DEFAULT_DIMENSIONS: Partial<Record<StationEquipmentKind, string>> = {
    totem: STATION_EQUIPMENT_DIMENSIONS.totem,
    bandeau: STATION_EQUIPMENT_DIMENSIONS.bandeau,
    planReseau: STATION_EQUIPMENT_DIMENSIONS.planReseau,
};
