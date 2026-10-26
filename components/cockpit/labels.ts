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

/** Même présentation que formatDimensions pour une cote déjà écrite en texte
 *  (« 80 x 100 cm », « 74.5x97cm », « 80x80cm (Totem) » → « 80 × 80 cm
 *  (Totem) »). Un texte qui n'est pas une cote (« Variable », description
 *  libre) est rendu tel quel, jamais interprété comme une dimension. */
export const formatDimensionText = (text?: string): string => {
    if (!text) return '';
    const m = text.match(/^(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b(.*)$/);
    if (!m) return text;
    return `${m[1].replace('.', ',')} × ${m[2].replace('.', ',')} ${m[3]}${m[4]}`;
};

// -----------------------------------------------------------------
// Libellés d'une référence — quatre niveaux, jamais confondus :
//  1. ref.name — nom métier enregistré (data/adhesives.ts → signage_seed →
//     Dexie), lu tel quel par les formulaires terrain et l'export CSV
//     d'audit. Jamais réécrit pour une raison d'affichage.
//  2. displayReferenceName(ref) — nom d'affichage des vues cockpit
//     (Référentiel, fiche, Inventaire détaillé, Implantations) et de leurs
//     exports : nom métier + corrections de présentation ci-dessous.
//  3. shortReferenceName(ref) — le même, sans le préfixe « Repère N - »
//     (porté par une colonne Repère séparée dans l'Inventaire détaillé).
//  4. fieldDesignation(ref) — désignation terrain des exports Excel / pose.
// L'identifiant (ref.id) ne change jamais.
// -----------------------------------------------------------------

/** Correction de PRÉSENTATION uniquement, jamais dans le catalogue lui-même
 *  (data/adhesives.ts reste inchangé, aucune deuxième référence créée) —
 *  désignation demandée à l'identique dans la vue Implantations et son
 *  export .xlsx, pour eca-1 à ce jour. Toute autre référence garde son
 *  nom catalogue, à la seule correction d'accent près (fixAccents). */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
    'eca-1': 'Repère 1 — Adhésif valideur-billetterie-métro-cible',
};
// Accent manquant dans certains noms catalogue ECA (« Adhesif ») —
// présentation seulement, le nom enregistré reste inchangé.
const fixAccents = (name: string): string => name.replace(/\bAdhesif\b/g, 'Adhésif');

export const displayReferenceName = (ref: { id: string; name: string }): string =>
    DISPLAY_NAME_OVERRIDES[ref.id] ?? fixAccents(ref.name);

/** Nom d'affichage sans le préfixe « Repère N - » / « Repère N — ». */
export const shortReferenceName = (ref: { id: string; name: string }): string =>
    displayReferenceName(ref).replace(/^Repère\s+[\w\d]+\s*[-—]\s*/, '');

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

/** Équipement d'une implantation tel qu'affiché : un ECA est désigné par son
 *  numéro et son type (« ECA n°08 · PMR à vantaux »), les autres familles
 *  gardent leur libellé (« DAT 02 », « BS01 »...). */
export const implantationEquipmentLabel = (imp: { equipmentLabel: string; equipmentType?: string; equipmentNumber?: number }): string =>
    imp.equipmentType && ECA_TYPES.has(imp.equipmentType) && imp.equipmentNumber !== undefined
        ? `ECA n°${String(imp.equipmentNumber).padStart(2, '0')} · ${imp.equipmentType}`
        : imp.equipmentLabel;

/** Zone de validation affichée sous une implantation : « ZH », « ZB (PMR) » ;
 *  vide quand l'implantation n'a pas de zone. */
export const implantationZoneLabel = (zone?: 'ZH' | 'ZB'): string =>
    zone === 'ZB' ? 'ZB (PMR)' : zone ?? '';

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
