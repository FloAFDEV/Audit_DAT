// utils/cockpit/inventoryFocus.ts
// =================================================================
// Filtre « depuis un compteur » de l'Inventaire détaillé : un clic sur un
// compteur du cockpit (ligne, type d'ECA, type de borne P+R…) restreint
// l'inventaire aux équipements concernés. Les quantités affichées sont
// RECALCULÉES par la même fonction que l'inventaire complet
// (computeAdhesiveInventory) sur le seul sous-ensemble choisi — jamais un
// filtrage de lignes réseau qui afficherait des totaux d'autres types,
// jamais un second calcul parallèle. Lecture seule : rien n'est modifié.
// =================================================================
import { AdhesiveInventoryItem, AuditModule, AuditModuleType, EcaData, EcaEquipmentType, EquipmentType, Lieu, Pr, SignageReference } from '../../types';
import { computeAdhesiveInventory } from '../../hooks/useStats';

export interface InventoryFocus {
    /** Identifiant stable : sélection active et bascule (re-clic = retrait). */
    key: string;
    /** Libellé affiché dans le bandeau de filtre actif. */
    label: string;
    moduleType: AuditModuleType;
    /** Ligne de transport (module.line) ; absent = toutes. */
    line?: string;
    /** ECA : types retenus ; absent = tous. */
    ecaTypes?: EcaEquipmentType[];
    /** P+R : type d'équipement retenu ; absent = tous. */
    prEquipmentType?: EquipmentType;
}

const narrowModule = (module: AuditModule, focus: InventoryFocus): AuditModule => {
    if (module.type === AuditModuleType.ECA && focus.ecaTypes) {
        const data = module.data as EcaData;
        return { ...module, data: { ...data, ecas: (data.ecas ?? []).filter(e => focus.ecaTypes!.includes(e.type)) } };
    }
    if (module.type === AuditModuleType.PR && focus.prEquipmentType) {
        const data = module.data as Pr;
        return { ...module, data: { ...data, zones: data.zones.map(z => ({ ...z, equipments: z.equipments.filter(e => e.type === focus.prEquipmentType) })) } };
    }
    return module;
};

/** Lieux réduits aux modules (et équipements) visés par le filtre — copies
 *  superficielles, les données d'origine ne sont jamais modifiées. */
export const scopeLieuxForFocus = (lieux: Lieu[], focus: InventoryFocus): Lieu[] =>
    lieux.map(lieu => ({
        ...lieu,
        modules: lieu.modules
            .filter(m => m.type === focus.moduleType && (!focus.line || m.line === focus.line))
            .map(m => narrowModule(m, focus)),
    }));

/** Lignes d'inventaire du filtre : références réellement présentes
 *  (quantité > 0) sur le sous-ensemble, avec leur quantité exacte. */
export const computeFocusedInventory = (
    lieux: Lieu[], references: SignageReference[], focus: InventoryFocus,
): AdhesiveInventoryItem[] =>
    computeAdhesiveInventory(scopeLieuxForFocus(lieux, focus), references).filter(item => item.quantity > 0);
