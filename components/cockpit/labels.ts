// components/cockpit/labels.ts
// Libellés partagés du cockpit — un seul vocabulaire pour toutes les sections.
import { AdhesiveStatus, ArbitrageStatus, SignageDimensions, SignageScope, SignageSupport } from '../../types';

export const SUPPORT_LABELS: Record<SignageSupport, string> = {
    adhesif: 'Adhésif',
    dibond: 'Dibond',
    pvc: 'PVC',
    vitrophanie: 'Vitrophanie',
    autre: 'Autre',
};

export const AUDIT_TYPE_LABELS: Record<'DAT' | 'PR' | 'ECA' | 'CUSTOM', string> = {
    DAT: 'DAT',
    PR: 'P+R',
    ECA: 'ECA',
    // Étiquette générique de secours — les audits configurables affichent
    // en pratique le nom de leur AuditDefinition, pas cette valeur fixe
    // (une seule chaîne ne peut pas nommer plusieurs définitions distinctes).
    CUSTOM: 'Audit configurable',
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

/** Décrit le scope d'implantation en clair pour la fiche et les listes. */
export const formatScope = (scope: SignageScope): string => {
    if (scope.auditType === 'CUSTOM') return 'Audit configurable';
    if (scope.auditType === 'DAT') return 'Tous les DAT';
    const family = AUDIT_TYPE_LABELS[scope.auditType];
    if (!scope.equipmentTypes || scope.equipmentTypes.length === 0) {
        return scope.auditType === 'PR' ? 'Toutes les bornes P+R' : 'Tous les ECA';
    }
    return `${family} — ${scope.equipmentTypes.join(', ')}`;
};
