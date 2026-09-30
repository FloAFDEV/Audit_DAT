// utils/cockpit/implantationTree.ts
// =================================================================
// Présentation hiérarchique des implantations du Référentiel :
// Ligne → Station → Accès / liaison → Équipement → Référence (→ Zone).
// -----------------------------------------------------------------
// Aucun calcul patrimonial ici (règle 1) : ces fonctions ne font que
// FILTRER et REGROUPER les implantations déjà produites par
// buildPatrimoineIndex — chaque implantation de l'entrée se retrouve
// exactement une fois dans l'arbre, rien n'est créé, rien n'est masqué.
// L'ordre d'insertion suit celui de l'index (ordre physique du terrain) ;
// seules les lignes sont ordonnées A → B → C → autres.
// =================================================================
import { AdhesiveStatus, SignageReference, SignageSupport } from '../../types';
import { ImplantationRef } from './patrimoineIndex';

/** Lignes affichées en tête, dans cet ordre ; les autres suivent dans
 *  l'ordre où l'index les a rencontrées. */
const LEADING_LINES = ['A', 'B', 'C'];

export const orderLines = (lines: Iterable<string>): string[] => {
    const all = Array.from(lines);
    return [
        ...LEADING_LINES.filter(l => all.includes(l)),
        ...all.filter(l => !LEADING_LINES.includes(l)),
    ];
};

/** Filtre matière : sélection vide = toutes les matières. La matière d'une
 *  implantation est le support de sa référence (source : signageReferences,
 *  la même que index.bySupport). */
export const filterImplantationsBySupports = (
    implantations: ImplantationRef[],
    refById: Map<string, SignageReference>,
    supports: ReadonlySet<SignageSupport>,
): ImplantationRef[] => {
    if (supports.size === 0) return implantations;
    return implantations.filter(imp => {
        const support = refById.get(imp.referenceId)?.support;
        return !!support && supports.has(support);
    });
};

export interface EquipmentNode {
    key: string;
    label: string;
    items: ImplantationRef[];
}

export interface AccessNode {
    key: string;
    context: string;
    moduleName: string;
    installed: number;
    defects: number;
    equipments: EquipmentNode[];
}

export interface StationNode {
    key: string;
    lieuId: string;
    lieuName: string;
    installed: number;
    defects: number;
    accesses: AccessNode[];
}

export interface LineNode {
    key: string;
    line: string;
    installed: number;
    defects: number;
    stations: StationNode[];
}

const isDefect = (s: AdhesiveStatus) => s === AdhesiveStatus.Absent || s === AdhesiveStatus.ToBeReplaced;

export const buildImplantationTree = (implantations: ImplantationRef[]): LineNode[] => {
    type Acc = AccessNode & { eqMap: Map<string, EquipmentNode> };
    type Sta = StationNode & { accMap: Map<string, Acc> };
    type Lin = LineNode & { staMap: Map<string, Sta> };
    const lines = new Map<string, Lin>();

    for (const imp of implantations) {
        const defect = isDefect(imp.status) ? 1 : 0;

        const lineKey = imp.line;
        let line = lines.get(lineKey);
        if (!line) {
            line = { key: lineKey, line: imp.line, installed: 0, defects: 0, stations: [], staMap: new Map() };
            lines.set(lineKey, line);
        }
        line.installed++; line.defects += defect;

        const staKey = `${lineKey}|${imp.lieuId}`;
        let sta = line.staMap.get(staKey);
        if (!sta) {
            sta = { key: staKey, lieuId: imp.lieuId, lieuName: imp.lieuName, installed: 0, defects: 0, accesses: [], accMap: new Map() };
            line.staMap.set(staKey, sta);
        }
        sta.installed++; sta.defects += defect;

        const accKey = `${staKey}|${imp.moduleId}|${imp.context}`;
        let acc = sta.accMap.get(accKey);
        if (!acc) {
            acc = { key: accKey, context: imp.context, moduleName: imp.moduleName, installed: 0, defects: 0, equipments: [], eqMap: new Map() };
            sta.accMap.set(accKey, acc);
        }
        acc.installed++; acc.defects += defect;

        const eqKey = `${accKey}|${imp.equipmentLabel}`;
        let eq = acc.eqMap.get(eqKey);
        if (!eq) {
            eq = { key: eqKey, label: imp.equipmentLabel, items: [] };
            acc.eqMap.set(eqKey, eq);
        }
        eq.items.push(imp);
    }

    return orderLines(lines.keys()).map(key => {
        const { staMap, ...line } = lines.get(key)!;
        return {
            ...line,
            stations: Array.from(staMap.values()).map(({ accMap, ...sta }) => ({
                ...sta,
                accesses: Array.from(accMap.values()).map(({ eqMap, ...acc }) => ({
                    ...acc,
                    equipments: Array.from(eqMap.values()),
                })),
            })),
        };
    });
};
