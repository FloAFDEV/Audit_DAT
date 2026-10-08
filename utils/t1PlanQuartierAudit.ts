// utils/t1PlanQuartierAudit.ts
// =================================================================
// Audit T1 des plans de quartier : référentiel métier = 2 plans attendus
// par station, 1 par sens. Les occurrences recensées restent les
// emplacements Équipements Station existants (signaletique.planQuartier,
// data/signaletique_config.ts) — rien n'est créé ni copié : un sens sans
// emplacement reste « non recensé », jamais une implantation simulée.
// Pour chaque sens, l'occurrence auditée est le premier emplacement de ce
// sens ; les éventuels emplacements supplémentaires (MEETT) restent
// intacts dans Équipements Station, hors de ce référentiel.
// =================================================================
import { EquipmentStatusType, PlanQuartierStatus, Station } from '../types';
import { dirKeyOf } from './signaletiqueDirections';
import { isDefect } from './cockpit/signaletiqueStationIndex';

/** Dimension du référentiel T1 (affichage de l'audit, données inchangées). */
export const T1_PLAN_QUARTIER_DIMENSIONS = '78 × 100 cm';
export const T1_PLANS_PER_STATION = 2;

export interface T1PlanQuartierOccurrence {
    dirKey: 'meett' | 'pdj';
    /** Direction réelle de la station ; undefined si absente des données. */
    direction?: string;
    index: 0;
    /** Emplacement recensé ; undefined = sens non recensé. */
    item?: PlanQuartierStatus;
}

/** Les 2 sens attendus, dans l'ordre des directions réelles de la station. */
export const t1PlanQuartierOccurrences = (station: Station): T1PlanQuartierOccurrence[] => {
    const keys: ('meett' | 'pdj')[] = [];
    for (const d of station.directions ?? []) {
        const k = dirKeyOf(d.name);
        if (!keys.includes(k)) keys.push(k);
    }
    for (const k of ['meett', 'pdj'] as const) if (!keys.includes(k)) keys.push(k);
    return keys.map(dirKey => ({
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
    const summary = { expected: T1_PLANS_PER_STATION, recensed: 0, conformes: 0, toTreat: 0, unchecked: 0 };
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
