// components/cockpit/labels.ts
// Libellés partagés du cockpit — un seul vocabulaire pour toutes les sections.
import { AdhesiveStatus, ArbitrageStatus, EcaEquipmentType, SignageDimensions, SignageScope, SignageSupport } from '../../types';
import { isPmrEcaType } from '../../data/eca_data';

/** Ordre de lecture métier des lignes — Ligne A, puis B, puis C, puis les
 *  autres familles (P+R, TRAM, TELEO, AEROPORT) par ordre alphabétique.
 *  Remplace un tri par volume (ligne la plus fournie en premier), peu
 *  prévisible pour l'utilisateur et incohérent d'une référence à l'autre. */
const LINE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };
export const compareLines = (a: string, b: string): number => {
    const orderA = LINE_ORDER[a] ?? 99;
    const orderB = LINE_ORDER[b] ?? 99;
    return orderA !== orderB ? orderA - orderB : a.localeCompare(b);
};

export const SUPPORT_LABELS: Record<SignageSupport, string> = {
    adhesif: 'Adhésif',
    dibond: 'Dibond',
    pvc: 'PVC',
    vitrophanie: 'Vitrophanie',
    plastifie: 'Plastifié',
    autre: 'Autre',
};

export const AUDIT_TYPE_LABELS: Record<'DAT' | 'PR' | 'ECA' | 'PDQ', string> = {
    DAT: 'DAT',
    PR: 'P+R',
    ECA: 'ECA',
    PDQ: 'Plans de quartier',
};

export const ARBITRAGE_LABELS: Record<ArbitrageStatus, string> = {
    keep: 'À conserver',
    remove: 'À supprimer',
    to_document: 'À documenter',
};

export const STATUS_LABELS: Record<string, string> = {
    [AdhesiveStatus.OK]: 'OK',
    [AdhesiveStatus.Absent]: 'Absent',
    [AdhesiveStatus.ToBeReplaced]: 'À remplacer',
    [AdhesiveStatus.NotChecked]: 'Non contrôlé',
    [AdhesiveStatus.NotApplicable]: 'Non applicable',
};

export const formatDimensions = (d?: SignageDimensions): string => {
    if (!d || (d.width === undefined && d.height === undefined)) return '—';
    const w = d.width !== undefined ? String(d.width).replace('.', ',') : '?';
    const h = d.height !== undefined ? String(d.height).replace('.', ',') : '?';
    return `${w} × ${h} ${d.unit}`;
};

/** Correction de PRÉSENTATION uniquement, jamais dans le catalogue lui-même
 *  (data/adhesives.ts reste inchangé, aucune deuxième référence créée) —
 *  désignation demandée à l'identique dans la vue Implantations et son
 *  export .xlsx, pour eca-1 à ce jour. Toute autre référence garde son
 *  nom catalogue tel quel. */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
    'eca-1': 'Repère 1 — Adhésif valideur-billetterie-métro-cible',
};
export const displayReferenceName = (ref: { id: string; name: string }): string =>
    DISPLAY_NAME_OVERRIDES[ref.id] ?? ref.name;

// -----------------------------------------------------------------
// Export Excel des implantations — présentation terrain uniquement.
// Ni le catalogue ni les références ne changent : la référence exacte et
// le nom catalogue restent exportés dans leurs propres colonnes.
// -----------------------------------------------------------------

/** Désignations terrain validées (ECA uniquement à ce jour). Toute autre
 *  référence garde son nom catalogue dans l'export. */
const FIELD_DESIGNATIONS: Record<string, string> = {
    'eca-1': 'Cible sur zone validation',
    'eca-2': 'Cadre gris autour du valideur',
    'eca-3': 'OpenPayment sous vitre',
    'eca-4': 'Cible sur zone validation PMR à bras',
    'eca-5': 'Cible sur zone validation PMR à vantaux',
    'eca-6': 'Pictogramme portillon PMR (bras)',
    'eca-7': 'Pictogramme portillon PMR (vantaux)',
    'eca-8': 'Pictogramme Bagages',
    'eca-9': 'Pictogramme Poussette',
    'eca-10': 'Pictogramme fauteuil roulant (UFR)',
    'eca-11': 'Numéro du valideur',
};
export const fieldDesignation = (ref: { id: string; name: string }): string =>
    FIELD_DESIGNATIONS[ref.id] ?? displayReferenceName(ref);

const EXIT_ECA_TYPES: ReadonlySet<string> = new Set([EcaEquipmentType.TripodeSortie, EcaEquipmentType.VantauxSortie]);
const ECA_TYPES: ReadonlySet<string> = new Set(Object.values(EcaEquipmentType));

/** Type de valideur pour une implantation ECA ; vide pour les autres familles. */
export const validatorTypeLabel = (equipmentType?: string): string => {
    if (!equipmentType || !ECA_TYPES.has(equipmentType)) return '';
    if (isPmrEcaType(equipmentType as EcaEquipmentType)) return 'Valideur PMR';
    if (EXIT_ECA_TYPES.has(equipmentType)) return 'Valideur de sortie';
    return 'Valideur standard';
};

/** Zone affichée dans l'export : uniquement sur un valideur PMR (seul cas
 *  où deux zones coexistent). Un valideur standard n'affiche rien, même si
 *  son occurrence interne est eca-1@ZH. */
export const exportZoneLabel = (equipmentType: string | undefined, zone: 'ZH' | 'ZB' | undefined): string => {
    if (!zone || !equipmentType || !isPmrEcaType(equipmentType as EcaEquipmentType)) return '';
    return zone === 'ZH' ? 'ZH — Zone de validation haute' : 'ZB — Zone de validation basse (PMR)';
};

/** Décrit le scope d'implantation en clair pour la fiche et les listes. */
export const formatScope = (scope: SignageScope): string => {
    if (scope.auditType === 'DAT') return 'Tous les DAT';
    if (scope.auditType === 'PDQ') return 'Plans de quartier';
    const family = AUDIT_TYPE_LABELS[scope.auditType];
    if (!scope.equipmentTypes || scope.equipmentTypes.length === 0) {
        return scope.auditType === 'PR' ? 'Toutes les bornes P+R' : 'Tous les ECA';
    }
    return `${family} — ${scope.equipmentTypes.join(', ')}`;
};
