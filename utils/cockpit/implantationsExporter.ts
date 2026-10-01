// utils/cockpit/implantationsExporter.ts
// =================================================================
// Export Excel des implantations d'une SÉLECTION de références
// (Référentiel → Implantations). Fonction de CONSULTATION/EXTRACTION
// du patrimoine — aucune notion de campagne/commande/intervention
// n'est créée ni persistée ici : un simple classeur, à partir des
// implantations déjà calculées par le moteur d'index
// (utils/cockpit/patrimoineIndex.ts), sans second calcul (R1).
//
// Fonctions volontairement PURES et agnostiques du domaine : elles
// reçoivent des lignes déjà résolues (désignation, dimensions, libellé
// de zone) par l'appelant — jamais de dépendance vers components/ (les
// utilitaires de présentation, ex. displayReferenceName/formatDimensions,
// restent dans components/cockpit/labels.ts, hors du périmètre de utils/).
// =================================================================
import type ExcelJS from 'exceljs';

export interface ImplantationExportRow {
    station: string;
    context: string; // Accès / liaison
    equipment: string;
    /** « Valideur standard / PMR / de sortie » pour un ECA, vide sinon. */
    validatorType: string;
    reference: string;
    /** Désignation terrain (lecture par les équipes de pose). */
    designation: string;
    /** Nom catalogue, conservé pour les commandes et la traçabilité. */
    catalogDesignation: string;
    /** Zone de validation, renseignée seulement quand elle est utile
     *  (valideur PMR : ZH ou ZB) — vide sinon. */
    zoneLabel: string;
    dimensions: string;
    /** Toujours 1 : une ligne = une occurrence physique, jamais fusionnée. */
    quantity: 1;
}

export interface SyntheseExportRow {
    reference: string;
    /** Désignation terrain. */
    designation: string;
    /** Nom catalogue. */
    catalogDesignation: string;
    dimensions: string;
    line: string;
    count: number;
}

/** Emplacement prévu pour coller manuellement une petite image dans Excel
 *  (colonne laissée vide : aucun visuel n'est stocké ni généré). */
const VISUEL_COLUMN_WIDTH = 14;
const VISUEL_ROW_HEIGHT = 48;

const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0F766E' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };

const styleHeaderRow = (row: ExcelJS.Row) => {
    row.height = 20;
    row.eachCell(cell => {
        cell.font = HEADER_FONT;
        cell.fill = HEADER_FILL;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
};

const autoWidth = (header: string, values: string[], min: number, max: number): number => {
    const longest = values.reduce((acc, v) => Math.max(acc, (v ?? '').length), header.length);
    return Math.min(max, Math.max(min, longest + 2));
};

const LIGNE_COLUMNS: Array<{ header: string; key: keyof ImplantationExportRow; min: number; max: number }> = [
    { header: 'Station', key: 'station', min: 14, max: 40 },
    { header: 'Accès / liaison', key: 'context', min: 14, max: 34 },
    { header: 'Équipement', key: 'equipment', min: 10, max: 30 },
    { header: 'Type de valideur', key: 'validatorType', min: 12, max: 20 },
    { header: 'Référence', key: 'reference', min: 10, max: 14 },
    { header: 'Désignation terrain', key: 'designation', min: 24, max: 45 },
    { header: 'Désignation catalogue', key: 'catalogDesignation', min: 30, max: 60 },
    { header: 'Zone', key: 'zoneLabel', min: 8, max: 40 },
    { header: 'Dimensions', key: 'dimensions', min: 12, max: 20 },
    { header: 'Quantité', key: 'quantity', min: 10, max: 12 },
];

const addLigneSheet = (workbook: ExcelJS.Workbook, sheetName: string, rows: ImplantationExportRow[]): void => {
    const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = LIGNE_COLUMNS.map(col => ({
        header: col.header,
        key: col.key,
        width: autoWidth(col.header, rows.map(r => String(r[col.key])), col.min, col.max),
    }));
    rows.forEach(r => sheet.addRow(r));
    styleHeaderRow(sheet.getRow(1));
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: LIGNE_COLUMNS.length } };
    sheet.getColumn('quantity').alignment = { horizontal: 'center' };
};

/**
 * Construit le classeur complet (Synthèse + un onglet par ligne, dans
 * l'ordre déjà décidé par l'appelant) en mémoire — aucun accès au DOM ici,
 * cette fonction reste testable telle quelle sous Node (y compris en
 * relisant le classeur produit pour vérifier son contenu réel).
 */
export const buildImplantationsWorkbook = async (
    syntheseRows: SyntheseExportRow[],
    ligneSheets: Array<{ line: string; sheetName: string; rows: ImplantationExportRow[] }>,
): Promise<ExcelJS.Workbook> => {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    workbook.creator = 'AuditRef';
    workbook.created = new Date();

    const syntheseSheet = workbook.addWorksheet('Synthèse', { views: [{ state: 'frozen', ySplit: 1 }] });
    syntheseSheet.columns = [
        { header: 'Visuel', key: 'visuel', width: VISUEL_COLUMN_WIDTH },
        { header: 'Référence', key: 'reference', width: autoWidth('Référence', syntheseRows.map(r => r.reference), 10, 16) },
        { header: 'Désignation terrain', key: 'designation', width: autoWidth('Désignation terrain', syntheseRows.map(r => r.designation), 24, 45) },
        { header: 'Désignation catalogue', key: 'catalogDesignation', width: autoWidth('Désignation catalogue', syntheseRows.map(r => r.catalogDesignation), 30, 60) },
        { header: 'Dimensions', key: 'dimensions', width: autoWidth('Dimensions', syntheseRows.map(r => r.dimensions), 12, 20) },
        { header: 'Ligne', key: 'line', width: 14 },
        { header: 'Quantité', key: 'count', width: 12 },
    ];
    syntheseRows.forEach(r => {
        const row = syntheseSheet.addRow(r); // Visuel laissé vide
        row.height = VISUEL_ROW_HEIGHT;
        row.alignment = { vertical: 'middle' };
    });
    const totalGeneral = syntheseRows.reduce((sum, r) => sum + r.count, 0);
    const totalRow = syntheseSheet.addRow({ line: 'TOTAL GÉNÉRAL', count: totalGeneral });
    totalRow.eachCell(cell => { cell.font = { bold: true }; });
    styleHeaderRow(syntheseSheet.getRow(1));
    syntheseSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } };
    syntheseSheet.getColumn('count').alignment = { horizontal: 'center' };

    ligneSheets.forEach(({ sheetName, rows }) => addLigneSheet(workbook, sheetName, rows));

    return workbook;
};

/**
 * Génère et télécharge le classeur (Blob + lien de téléchargement, même
 * patron que utils/csvExporter.ts::downloadFile et
 * utils/eca1CampaignExporter.ts) — seule fonction de ce module à toucher
 * le DOM ; tout le reste est pur et réutilisable/testable indépendamment.
 */
export const downloadImplantationsWorkbook = async (
    syntheseRows: SyntheseExportRow[],
    ligneSheets: Array<{ line: string; sheetName: string; rows: ImplantationExportRow[] }>,
    fileName: string,
): Promise<{ success: boolean; error?: string }> => {
    try {
        const workbook = await buildImplantationsWorkbook(syntheseRows, ligneSheets);
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        return { success: true };
    } catch (err) {
        console.error('Failed to export implantations to xlsx:', err);
        return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue.' };
    }
};
