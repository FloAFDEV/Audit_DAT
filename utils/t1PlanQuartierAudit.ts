// utils/t1PlanQuartierAudit.ts
// =================================================================
// Audit T1 des plans de quartier : référentiel métier = au plus 1 plan
// par sens — 2 par station en règle générale, 1 seul à Arènes (direction
// MEETT). Le nombre de DAT n'intervient jamais. Les occurrences recensées restent les
// emplacements Équipements Station existants (signaletique.planQuartier,
// data/signaletique_config.ts) — rien n'est créé ni copié : un sens sans
// emplacement reste « non recensé », jamais une implantation simulée.
// Pour chaque sens, l'occurrence auditée est le premier emplacement de ce
// sens ; les éventuels emplacements supplémentaires (MEETT) restent
// intacts dans Équipements Station, hors de ce référentiel.
// =================================================================
import { AuditModuleType, EquipmentStatusType, Lieu, ModeData, PlanQuartierStatus, Station } from '../types';
import { isModuleInCurrentScope } from './moduleScope';
import { STATION_EQUIPMENT_DIMENSIONS } from '../data/signaletique_config';
import { dirKeyOf } from './signaletiqueDirections';
import { isDefect } from './cockpit/signaletiqueStationIndex';

/** Dimension du référentiel T1 (affichage de l'audit, données inchangées). */
export const T1_PLAN_QUARTIER_DIMENSIONS = STATION_EQUIPMENT_DIMENSIONS.planQuartierTram.replace(' x ', ' × ');

/** Arrêts T1 n'ayant qu'un plan de quartier attendu (règle patrimoine,
 *  indépendante du nombre de DAT) : Arènes → direction MEETT seulement. */
export const T1_PLAN_QUARTIER_SINGLE_DIRECTION: Readonly<Record<string, 'meett' | 'pdj'>> = {
    'Arènes': 'meett',
};

export interface T1PlanQuartierOccurrence {
    dirKey: 'meett' | 'pdj';
    /** Direction réelle de la station ; undefined si absente des données. */
    direction?: string;
    index: 0;
    /** Emplacement recensé ; undefined = sens non recensé. */
    item?: PlanQuartierStatus;
}

/** Les sens attendus (2, ou 1 pour un arrêt à sens unique comme Arènes),
 *  dans l'ordre des directions réelles de la station. */
export const t1PlanQuartierOccurrences = (station: Station): T1PlanQuartierOccurrence[] => {
    const keys: ('meett' | 'pdj')[] = [];
    for (const d of station.directions ?? []) {
        const k = dirKeyOf(d.name);
        if (!keys.includes(k)) keys.push(k);
    }
    for (const k of ['meett', 'pdj'] as const) if (!keys.includes(k)) keys.push(k);
    const single = T1_PLAN_QUARTIER_SINGLE_DIRECTION[station.name];
    return keys.filter(k => !single || k === single).map(dirKey => ({
        dirKey,
        direction: station.directions?.find(d => dirKeyOf(d.name) === dirKey)?.name,
        index: 0,
        item: station.signaletique?.planQuartier?.[dirKey]?.[0],
    }));
};

export interface T1PlanQuartierSummary {
    expected: number;
    recensed: number;
    conformes: number;
    /** Absent / à remplacer, plus les sens non recensés. */
    toTreat: number;
    unchecked: number;
}

export const summarizeT1PlanQuartier = (occurrences: T1PlanQuartierOccurrence[]): T1PlanQuartierSummary => {
    const summary = { expected: occurrences.length, recensed: 0, conformes: 0, toTreat: 0, unchecked: 0 };
    for (const occ of occurrences) {
        if (!occ.item) { summary.toTreat++; continue; }
        summary.recensed++;
        const status = occ.item.status ?? 'NotChecked';
        if (status === EquipmentStatusType.OK) summary.conformes++;
        else if (status === 'NotChecked') summary.unchecked++;
        else if (isDefect(status)) summary.toTreat++;
    }
    return summary;
};

/** Progression T1 d'un lieu (filtre Plans de quartier → Tram T1) : 2 sens
 *  attendus, contrôlé = état du plan autre que « Non contrôlé » (bandeau
 *  exclu). Lecture des emplacements Équipements Station, rien de copié ;
 *  null si le lieu n'a pas de station T1 en service. */
export const getT1PlanQuartierProgressCounts = (lieu: Lieu): { applicable: number; checked: number } | null => {
    const signaletique = lieu.modules.find(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM');
    const station = (signaletique?.data as ModeData | undefined)?.stations?.[0];
    if (!signaletique || !station || !isModuleInCurrentScope(signaletique) || !isModuleInCurrentScope(station)) return null;
    const occurrences = t1PlanQuartierOccurrences(station);
    return {
        applicable: occurrences.length,
        checked: occurrences.filter(o => o.item && (o.item.status ?? 'NotChecked') !== 'NotChecked').length,
    };
};
