// utils/cockpit/poseExport.ts
// =================================================================
// CSV de pose (référentiel opérationnel transmis au SAE) : une ligne par
// exemplaire à poser, quantité 1, sans statut d'audit. Module PUR : il
// sérialise des lignes déjà résolues par l'appelant (implantations du
// moteur d'index, pictogrammes cognitifs du module dédié) — aucun calcul
// métier ici, aucune dépendance vers components/.
//
// Format : séparateur « ; », UTF-8 avec BOM (lecture directe par Excel
// FR), fins de ligne CRLF. L'échappement suit RFC 4180 adapté au « ; »
// (utils/csvExporter.ts::escapeCsv reste dédié aux exports « , »
// existants, inchangés).
// =================================================================

export interface PoseRow {
    line: string;
    station: string;
    family: string;
    equipment: string;
    /** Direction DAT, zone P+R, accès ECA, accès du pictogramme. */
    location: string;
    /** Zone de validation ECA (ZH/ZB) quand elle est utile, vide sinon. */
    zone: string;
    /** Identifiant du référentiel ; vide pour une famille sans catalogue
     *  (pictogrammes cognitifs : aucune référence fictive). */
    reference: string;
    designation: string;
    dimensions: string;
    /** Toujours 1 : une ligne = un exemplaire à poser. */
    quantity: 1;
    /** Chemin du visuel servi par l'application, vide si aucun. */
    visual: string;
}

export const POSE_CSV_COLUMNS: Array<{ header: string; key: keyof PoseRow }> = [
    { header: 'Ligne', key: 'line' },
    { header: 'Station', key: 'station' },
    { header: 'Famille', key: 'family' },
    { header: 'Équipement', key: 'equipment' },
    { header: 'Emplacement / direction', key: 'location' },
    { header: 'Zone', key: 'zone' },
    { header: 'Référence', key: 'reference' },
    { header: 'Désignation', key: 'designation' },
    { header: 'Dimensions', key: 'dimensions' },
    { header: 'Quantité', key: 'quantity' },
    { header: 'Visuel', key: 'visual' },
];

const SEPARATOR = ';';
const BOM = '﻿';

/** Valeur CSV : entre guillemets dès qu'elle contient le séparateur, un
 *  guillemet ou un retour à la ligne ; guillemets internes doublés. */
export const escapePoseCsvValue = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return /[;"\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/** Contenu complet du fichier (BOM inclus). Sélection vide → en-tête seul. */
export const buildPoseCsv = (rows: PoseRow[]): string =>
    BOM + [
        POSE_CSV_COLUMNS.map(c => escapePoseCsvValue(c.header)).join(SEPARATOR),
        ...rows.map(row => POSE_CSV_COLUMNS.map(c => escapePoseCsvValue(row[c.key])).join(SEPARATOR)),
    ].join('\r\n');

/** Chemin de visuel exporté (sans « / » initial) à partir de l'URL servie. */
export const poseVisualPath = (url: string | undefined): string => (url ? url.replace(/^\//, '') : '');
