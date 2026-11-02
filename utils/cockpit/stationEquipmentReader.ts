// utils/cockpit/stationEquipmentReader.ts
// =================================================================
// ÉQUIPEMENTS DE STATION — LE parcours unique des données (référentiel
// autonome, règle 7 de patrimoineIndex.ts). Lit un module SIGNALETIQUE
// et restitue, station par station, chaque équipement DÉCRIT dans les
// données (totem, bandeau, BIV, plan réseau, plan de quartier, HAP), dans
// l'ordre du formulaire, sans aucune règle métier :
//   - extrémités physiques (direction1 / direction2) : totem, bandeau ;
//   - directions réelles (meett / pdj) : BIV, plans réseau, plans de
//     quartier, HAP (plusieurs exemplaires possibles, rang 1…n).
// Les projections métier dérivent de ce parcours, chacune avec ses règles
// documentées :
//   - stationEquipment.ts          : emplacements (Référentiel, fiches,
//                                    patrimoine d'une station, inventaire) ;
//   - signaletiqueStationIndex.ts  : points de contrôle (anomalies) ;
//   - signaletiquePlansQuartier.ts : plans de quartier (Synthèse).
// =================================================================
import { AuditModule, AuditModuleType, Lieu, ModeData, Station } from '../../types';
import { isModuleInCurrentScope } from '../moduleScope';

export type StationEquipmentDataKind = 'totem' | 'bandeau' | 'biv' | 'planReseau' | 'planQuartier' | 'hap';
export type StationEquipmentEnd = 'direction1' | 'direction2';
export type StationEquipmentDirection = 'meett' | 'pdj';

/** Champs lus sur un équipement (statut, dimensions, sous-statuts…). */
export type StationEquipmentHolder = { status?: string; dimensions?: string; comment?: string } & Record<string, unknown>;

export interface DescribedStationEquipment {
    lieu: Lieu;
    module: AuditModule;
    station: Station;
    /** Station en exploitation (isModuleInCurrentScope sur la station). */
    stationInService: boolean;
    kind: StationEquipmentDataKind;
    /** Extrémité (totem, bandeau) ou direction réelle (autres types). */
    position: StationEquipmentEnd | StationEquipmentDirection;
    /** Rang 1…n dans sa direction, et nombre d'exemplaires de la direction. */
    rank: number;
    count: number;
    holder: StationEquipmentHolder;
}

const ENDS: readonly StationEquipmentEnd[] = ['direction1', 'direction2'];
const DIRECTIONS: readonly StationEquipmentDirection[] = ['meett', 'pdj'];

/** Équipements décrits dans UN module Équipements de station — aucun
 *  filtre de périmètre ni de statut (l'appelant décide). */
export const readStationEquipmentModule = (lieu: Lieu, module: AuditModule): DescribedStationEquipment[] => {
    if (module.type !== AuditModuleType.SIGNALETIQUE) return [];
    const out: DescribedStationEquipment[] = [];
    for (const station of (module.data as ModeData).stations ?? []) {
        const sig = station.signaletique;
        if (!sig) continue;
        const base = { lieu, module, station, stationInService: isModuleInCurrentScope(station) };
        const push = (kind: StationEquipmentDataKind, position: DescribedStationEquipment['position'], holder: unknown, rank = 1, count = 1) => {
            if (holder) out.push({ ...base, kind, position, rank, count, holder: holder as StationEquipmentHolder });
        };
        for (const end of ENDS) {
            push('totem', end, sig.totem?.[end]);
            push('bandeau', end, sig.bandeauStation?.[end]);
        }
        for (const dir of DIRECTIONS) {
            const each = (kind: StationEquipmentDataKind, list: unknown[] | undefined) =>
                (list ?? []).forEach((holder, i, all) => push(kind, dir, holder, i + 1, all.length));
            each('biv', sig.biv?.[dir]);
            each('planReseau', sig.planReseau?.[dir]);
            each('planQuartier', sig.planQuartier?.[dir]);
            each('hap', sig.hap?.[dir]);
        }
    }
    return out;
};
