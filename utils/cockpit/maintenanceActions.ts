// utils/cockpit/maintenanceActions.ts
// =================================================================
// ACTIONS D'INTERVENTION — « ordres de travail patrimoine ».
// -----------------------------------------------------------------
// Généalogie respectée : Audit (observation) → Existant (référentiel
// normalisé + implantations) → Anomalies (ce module : préparation
// d'action) → SAE (résumé de pose).
//
// L'entité centrale n'est pas « le défaut » mais l'OBJET POSÉ (la
// référence) : chaque action répond à « que faut-il faire de cette
// référence, où, en quelle quantité » — pas à une ligne de tableau.
// Le regroupement par défaut est donc « par référence ».
//
// Transforme les implantations en défaut de l'index du patrimoine
// (jamais recalculées ici, règle 1 du contrat) en actions regroupées,
// bandées par des RÈGLES EXPLICITES (pas un score opaque — cf.
// maintenancePriority.ts) et triées par urgence transparente.
//
// Chaque action EST une Selection à part entière (id, source, createdAt —
// cf. selection.ts) : la prise sur laquelle se brancheront demain
// campagnes, lots d'intervention et exports chantier/pose — sans
// redessiner les vues. Anomalies ne possède pas la notion de
// sélection, elle la consomme comme n'importe quel autre module.
// =================================================================

import { AdhesiveStatus, SignageReference } from '../../types';
import { ImplantationRef, PatrimoineIndex } from './patrimoineIndex';
import { Selection, SelectionSource, createSelection } from './selection';
import {
    MaintenancePriority, calculatePriorityFactors, calculatePriorityFactorsFromItems, comparePriority,
} from './maintenancePriority';

export type MaintenanceGroupMode = 'reference' | 'site' | 'line';

export const MAINTENANCE_GROUP_MODES: { key: MaintenanceGroupMode; label: string }[] = [
    { key: 'reference', label: 'Par référence' }, // défaut : l'objet posé, entité centrale
    { key: 'site',      label: 'Par site' },
    { key: 'line',      label: 'Par ligne' },
];

/** Bandes d'urgence — règles EXPLICITES sur les facteurs, jamais un score
 *  agrégé opaque. Seuils arbitraires documentés, à recalibrer avec le
 *  métier (c'est exactement ce que la brique de pondération attend). */
export type UrgencyBand = 'urgent' | 'a_planifier' | 'surveillance';

export const URGENCY_BAND_LABELS: Record<UrgencyBand, string> = {
    urgent: 'Urgent',
    a_planifier: 'À planifier',
    surveillance: 'Surveillance',
};

export const bandOf = (p: MaintenancePriority): UrgencyBand => {
    if (p.severity >= 0.8 || p.occurrence >= 0.75) return 'urgent';
    if (p.severity >= 0.4 || p.occurrence >= 0.25) return 'a_planifier';
    return 'surveillance';
};

/** Une action d'intervention = une sélection de défauts sur un objet posé. */
export interface MaintenanceAction extends Selection {
    key: string;
    /** Sous-titre contextuel ("REP-DAT-003 · 12 lieux", "4 références concernées"...). */
    subtitle?: string;
    absentCount: number;
    toReplaceCount: number;
    lieuCount: number;
    referenceCount: number;
    /** Facteurs de priorisation transparents — score absent par défaut. */
    priority: MaintenancePriority;
    band: UrgencyBand;
}

const isDefect = (s: AdhesiveStatus) => s === AdhesiveStatus.Absent || s === AdhesiveStatus.ToBeReplaced;

/** mode de regroupement → source de la Selection (contrat transversal). */
const SOURCE_BY_MODE: Record<MaintenanceGroupMode, SelectionSource> = {
    reference: 'reference',
    site: 'site',
    line: 'line',
};

const makeAction = (
    mode: MaintenanceGroupMode,
    key: string,
    label: string,
    subtitle: string | undefined,
    items: ImplantationRef[],
    priority: MaintenancePriority,
): MaintenanceAction => {
    const absentCount = items.filter(i => i.status === AdhesiveStatus.Absent).length;
    // Chaque action EST construite via le constructeur transversal — pas
    // un objet ad hoc qui ressemblerait à une Selection sans en être une.
    const selection = createSelection(SOURCE_BY_MODE[mode], label, items);
    return {
        ...selection,
        key, subtitle,
        absentCount,
        toReplaceCount: items.length - absentCount,
        lieuCount: new Set(items.map(i => i.lieuId)).size,
        referenceCount: new Set(items.map(i => i.referenceId)).size,
        priority,
        band: bandOf(priority),
    };
};

/**
 * Construit les actions d'intervention depuis les défauts de l'index,
 * regroupées selon le mode choisi, triées par urgence transparente
 * (gravité puis ampleur — comparePriority, aucun score agrégé).
 */
export const buildMaintenanceActions = (
    index: PatrimoineIndex,
    references: SignageReference[],
    mode: MaintenanceGroupMode,
): MaintenanceAction[] => {
    const defects = index.implantations.filter(i => isDefect(i.status));
    if (defects.length === 0) return [];

    const refById = new Map(references.map(r => [r.id, r]));

    const collectBy = (keyOf: (imp: ImplantationRef) => string) => {
        const buckets = new Map<string, ImplantationRef[]>();
        for (const imp of defects) {
            const key = keyOf(imp);
            const bucket = buckets.get(key);
            if (bucket) bucket.push(imp);
            else buckets.set(key, [imp]);
        }
        return buckets;
    };

    const actions: MaintenanceAction[] = [];

    switch (mode) {
        case 'reference': {
            for (const [refId, items] of collectBy(i => i.referenceId)) {
                const ref = refById.get(refId);
                const usage = index.byReference.get(refId);
                // Facteurs dérivés de l'usage indexé (source unique) — pas du
                // sous-ensemble local, pour rester cohérent avec les autres vues.
                const priority = usage ? calculatePriorityFactors(usage) : calculatePriorityFactorsFromItems(items);
                const lieuCount = new Set(items.map(i => i.lieuId)).size;
                actions.push(makeAction(
                    mode,
                    refId,
                    ref?.name ?? refId,
                    `${ref?.code ? `${ref.code} · ` : ''}${lieuCount} lieu${lieuCount > 1 ? 'x' : ''}`,
                    items,
                    priority,
                ));
            }
            break;
        }
        case 'site': {
            for (const [lieuId, items] of collectBy(i => i.lieuId)) {
                const refCount = new Set(items.map(i => i.referenceId)).size;
                actions.push(makeAction(
                    mode,
                    lieuId,
                    items[0].lieuName,
                    `${refCount} référence${refCount > 1 ? 's' : ''} concernée${refCount > 1 ? 's' : ''}`,
                    items,
                    calculatePriorityFactorsFromItems(items),
                ));
            }
            break;
        }
        case 'line': {
            for (const [line, items] of collectBy(i => i.line)) {
                const lieuCount = new Set(items.map(i => i.lieuId)).size;
                actions.push(makeAction(
                    mode,
                    line,
                    line === 'P+R' ? 'Parkings Relais' : `Ligne ${line}`,
                    `${lieuCount} lieu${lieuCount > 1 ? 'x' : ''}`,
                    items,
                    calculatePriorityFactorsFromItems(items),
                ));
            }
            break;
        }
    }

    return actions.sort((a, b) => comparePriority(a.priority, b.priority) || b.items.length - a.items.length);
};
