// utils/cockpit/implantationsGrouping.ts
// =================================================================
// Regroupement d'affichage d'implantations déjà calculées par le moteur
// d'index (utils/cockpit/patrimoineIndex.ts) — AUCUN second calcul (R1) :
// ce module ne fait que regrouper des ImplantationRef déjà produites,
// dans l'ordre où elles ont été rencontrées lors du parcours de l'arbre
// (donc l'ordre géographique réel du réseau, jamais retrié ici).
// =================================================================
import { ImplantationRef } from './patrimoineIndex';

export interface GroupedEquipment {
    equipmentLabel: string;
    items: ImplantationRef[];
    total: number;
}

export interface GroupedContext {
    /** Direction DAT, point d'accès/liaison ECA, zone P+R — tel quel. */
    context: string;
    equipments: GroupedEquipment[];
    total: number;
}

export interface GroupedStation {
    stationName: string;
    contexts: GroupedContext[];
    total: number;
}

export interface GroupedLine {
    line: string;
    stations: GroupedStation[];
    total: number;
}

/**
 * Regroupe une liste d'implantations (typiquement Selection.items) en
 * Ligne → Station → Accès/liaison → Équipement → [implantations]. Une
 * implantation = une occurrence physique : jamais fusionnée avec une
 * autre (un ECA PMR avec eca-1@ZH et eca-1@ZB produit deux entrées dans
 * `items`, pas une avec quantité 2). L'ordre de ligne n'est pas décidé
 * ici — l'appelant trie le résultat selon l'ordre de lecture voulu.
 */
export const groupImplantationsByLocation = (items: ImplantationRef[]): GroupedLine[] => {
    const lineMap = new Map<string, Map<string, Map<string, Map<string, ImplantationRef[]>>>>();

    for (const imp of items) {
        const stationMap = lineMap.get(imp.line) ?? new Map();
        const contextMap = stationMap.get(imp.lieuName) ?? new Map();
        const equipMap = contextMap.get(imp.context) ?? new Map();
        const list = equipMap.get(imp.equipmentLabel) ?? [];
        list.push(imp);
        equipMap.set(imp.equipmentLabel, list);
        contextMap.set(imp.context, equipMap);
        stationMap.set(imp.lieuName, contextMap);
        lineMap.set(imp.line, stationMap);
    }

    const lines: GroupedLine[] = [];
    for (const [line, stationMap] of lineMap) {
        const stations: GroupedStation[] = [];
        for (const [stationName, contextMap] of stationMap) {
            const contexts: GroupedContext[] = [];
            for (const [context, equipMap] of contextMap) {
                const equipments: GroupedEquipment[] = [];
                for (const [equipmentLabel, list] of equipMap) {
                    equipments.push({ equipmentLabel, items: list, total: list.length });
                }
                contexts.push({ context, equipments, total: equipments.reduce((s, e) => s + e.total, 0) });
            }
            stations.push({ stationName, contexts, total: contexts.reduce((s, c) => s + c.total, 0) });
        }
        lines.push({ line, stations, total: stations.reduce((s, st) => s + st.total, 0) });
    }
    return lines;
};
