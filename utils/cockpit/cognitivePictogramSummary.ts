// utils/cockpit/cognitivePictogramSummary.ts
// Lecture seule des pictogrammes cognitifs d'un lieu pour les cards du
// cockpit : rien n'est copié ni créé, le module Pictogrammes cognitifs
// reste la seule source (statuts gérés par son audit).
import { AuditModuleType, CognitivePictogramData, FloorAdhesiveStatus, Lieu } from '../../types';
import { isModuleInCurrentScope } from '../moduleScope';
import { getCognitivePictogramVisualUrl } from '../../data/cognitivePictogramVisuals';

export interface CognitivePictogramSummary {
    /** Code station dont le visuel est connu (sinon le premier module). */
    stationCode?: string;
    accessCount: number;
    toReplaceCount: number;
}

/** Clé d'une card de station : ligne + lieu — un picto de la ligne A
 *  n'apparaît jamais sur la card d'une autre ligne du même lieu. */
export const cognitiveSummaryKey = (line: string, lieuName: string): string => `${line}|${lieuName}`;

/** Résumé par (ligne, lieu), modules en exploitation uniquement. */
export const summarizeCognitivePictograms = (lieux: Lieu[]): Map<string, CognitivePictogramSummary> => {
    const byLieu = new Map<string, CognitivePictogramSummary>();
    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            if (module.type !== AuditModuleType.COGNITIVE_PICTOGRAMS || !isModuleInCurrentScope(module)) continue;
            const data = module.data as CognitivePictogramData;
            const pictograms = data.pictograms ?? [];
            if (pictograms.length === 0) continue;
            const key = cognitiveSummaryKey(module.line ?? '', lieu.name);
            const summary = byLieu.get(key) ?? { accessCount: 0, toReplaceCount: 0 };
            summary.accessCount += pictograms.length;
            summary.toReplaceCount += pictograms.filter(p => p.status === FloorAdhesiveStatus.ToBeReplaced).length;
            if (!summary.stationCode || (!getCognitivePictogramVisualUrl(summary.stationCode) && getCognitivePictogramVisualUrl(data.stationCode))) {
                summary.stationCode = data.stationCode;
            }
            byLieu.set(key, summary);
        }
    }
    return byLieu;
};
