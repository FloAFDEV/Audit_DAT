// utils/cockpit/planQuartierAuditTotals.ts
// Périmètre d'audit du module Plans de quartier : exemplaires indexés sous
// les modèles PDQ du catalogue, et eux seuls. Les plans recensés dans
// Équipements Station (T1) n'en font jamais partie — ils ont leur propre
// recensement (summarizeSignaletiqueCensus) et leur audit reste là-bas.
import { PatrimoineIndex } from './patrimoineIndex';

export const summarizePlanQuartierAudit = (
    patrimoineIndex: Pick<PatrimoineIndex, 'byReference'>,
    modelIds: string[]
): { installed: number; defects: number } => modelIds.reduce((acc, id) => {
    const usage = patrimoineIndex.byReference.get(id);
    acc.installed += usage?.installedCount ?? 0;
    acc.defects += usage?.defectCount ?? 0;
    return acc;
}, { installed: 0, defects: 0 });
