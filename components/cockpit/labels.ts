// components/cockpit/labels.ts
// Libellés partagés du cockpit — un seul vocabulaire pour toutes les sections.
import { AdhesiveStatus, ArbitrageStatus, SignageDimensions, SignageScope, SignageSupport } from '../../types';

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
