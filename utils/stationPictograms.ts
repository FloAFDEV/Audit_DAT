// utils/stationPictograms.ts
// =================================================================
// PICTOGRAMME COGNITIF D'UNE STATION — repère visuel patrimonial (jamais
// un statut). Source unique : le code station enregistré dans le module
// Pictogrammes cognitifs de chaque ligne (CognitivePictogramData.stationCode),
// relié au visuel officiel par getCognitivePictogramVisualUrl. Rien n'est
// jamais déduit du nom de la station : sans module, sans code ou sans
// visuel connu, aucun pictogramme n'est affiché.
//  - lignes futures / en préparation : non affichées (périmètre actuel) ;
//  - station multiligne : un pictogramme par ligne, dans l'ordre des
//    modules ; un même code n'est affiché qu'une fois ;
//  - « Accès à définir » : sans effet — le visuel est celui de la station,
//    pas d'un accès.
// =================================================================
import { AuditModuleType, CognitivePictogramData, Lieu } from '../types';
import { getCognitivePictogramVisualUrl } from '../data/cognitivePictogramVisuals';
import { isModuleInCurrentScope } from './moduleScope';

export interface StationPictogram {
    line: string;
    stationCode: string;
    url: string;
}

/** Pictogrammes cognitifs d'un lieu (toutes lignes, ou la seule `line`). */
export const getStationPictograms = (lieu: (Pick<Lieu, 'modules'> & { name?: string }) | undefined, line?: string): StationPictogram[] => {
    const out: StationPictogram[] = [];
    for (const module of lieu?.modules ?? []) {
        if (module.type !== AuditModuleType.COGNITIVE_PICTOGRAMS || !isModuleInCurrentScope(module)) continue;
        if (line !== undefined && module.line !== line) continue;
        const stationCode = (module.data as CognitivePictogramData | undefined)?.stationCode;
        const url = getCognitivePictogramVisualUrl(stationCode);
        if (!stationCode || !url || out.some(p => p.stationCode === stationCode)) continue;
        out.push({ line: module.line ?? '', stationCode, url });
    }
    return out;
};
