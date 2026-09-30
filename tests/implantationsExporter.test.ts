// tests/implantationsExporter.test.ts
// Vérifie le classeur RÉELLEMENT produit (round-trip buffer → relecture
// ExcelJS), pas seulement les données intermédiaires avant sérialisation —
// aucun accès DOM nécessaire ici (buildImplantationsWorkbook n'en a pas).
import { describe, it, expect } from 'vitest';
import { buildImplantationsWorkbook, ImplantationExportRow, SyntheseExportRow } from '../utils/cockpit/implantationsExporter';
import ExcelJS from 'exceljs';

const syntheseRows: SyntheseExportRow[] = [
    { reference: 'eca-1', designation: 'Repère 1 — Adhésif valideur-billetterie-métro-cible', line: 'A', count: 92 },
    { reference: 'eca-1', designation: 'Repère 1 — Adhésif valideur-billetterie-métro-cible', line: 'B', count: 155 },
    { reference: 'eca-1', designation: 'Repère 1 — Adhésif valideur-billetterie-métro-cible', line: 'C', count: 4 },
];

const ligneARows: ImplantationExportRow[] = [
    {
        station: 'Jean-Jaurès', context: 'Accès Historique', equipment: 'Valideur 1',
        reference: 'eca-1', designation: 'Repère 1 — Adhésif valideur-billetterie-métro-cible',
        zoneLabel: 'Zone de validation haute (ZH)', dimensions: '59 × 59 mm', quantity: 1,
    },
];
const ligneBRows: ImplantationExportRow[] = [
    {
        station: 'Jean-Jaurès', context: 'Liaison A→B', equipment: 'PMR 17',
        reference: 'eca-1', designation: 'Repère 1 — Adhésif valideur-billetterie-métro-cible',
        zoneLabel: 'Zone de validation haute (ZH)', dimensions: '59 × 59 mm', quantity: 1,
    },
    {
        station: 'Jean-Jaurès', context: 'Liaison A→B', equipment: 'PMR 17',
        reference: 'eca-1', designation: 'Repère 1 — Adhésif valideur-billetterie-métro-cible',
        zoneLabel: 'Zone de validation basse (ZB) — PMR', dimensions: '59 × 59 mm', quantity: 1,
    },
];

describe('buildImplantationsWorkbook — contenu réel du classeur produit', () => {
    it('produit un onglet Synthèse + un onglet par ligne, dans l\'ordre fourni par l\'appelant', async () => {
        const workbook = await buildImplantationsWorkbook(syntheseRows, [
            { line: 'A', sheetName: 'Ligne A', rows: ligneARows },
            { line: 'B', sheetName: 'Ligne B', rows: ligneBRows },
        ]);

        const buffer = await workbook.xlsx.writeBuffer();
        const reloaded = new ExcelJS.Workbook();
        await reloaded.xlsx.load(buffer as any);

        expect(reloaded.worksheets.map(ws => ws.name)).toEqual(['Synthèse', 'Ligne A', 'Ligne B']);
    });

    it('Synthèse : en-têtes, lignes et total général corrects', async () => {
        const workbook = await buildImplantationsWorkbook(syntheseRows, []);
        const buffer = await workbook.xlsx.writeBuffer();
        const reloaded = new ExcelJS.Workbook();
        await reloaded.xlsx.load(buffer as any);

        const sheet = reloaded.getWorksheet('Synthèse')!;
        expect(sheet.getRow(1).getCell(1).value).toBe('Référence');
        expect(sheet.getRow(1).getCell(4).value).toBe("Nombre d'implantations");
        // Ligne d'en-tête figée + filtre automatique.
        expect(sheet.views?.[0]?.state).toBe('frozen');
        expect(sheet.autoFilter).toBeDefined();

        expect(sheet.getRow(2).getCell(3).value).toBe('A');
        expect(sheet.getRow(2).getCell(4).value).toBe(92);
        expect(sheet.getRow(4).getCell(3).value).toBe('C');

        const totalRow = sheet.getRow(5);
        expect(totalRow.getCell(3).value).toBe('TOTAL GÉNÉRAL');
        expect(totalRow.getCell(4).value).toBe(92 + 155 + 4);
    });

    it("onglet de ligne : une ligne = une occurrence physique — ZH et ZB de eca-1 jamais fusionnées en quantité 2", async () => {
        const workbook = await buildImplantationsWorkbook([], [
            { line: 'B', sheetName: 'Ligne B', rows: ligneBRows },
        ]);
        const buffer = await workbook.xlsx.writeBuffer();
        const reloaded = new ExcelJS.Workbook();
        await reloaded.xlsx.load(buffer as any);

        const sheet = reloaded.getWorksheet('Ligne B')!;
        expect(sheet.getRow(1).values).toEqual([
            undefined, 'Station', 'Accès / liaison', 'Équipement', 'Référence', 'Désignation', 'Zone / emplacement', 'Dimensions', 'Quantité',
        ]);
        // 2 lignes de détail (pas 1 fusionnée) : ZH puis ZB, quantité 1 chacune.
        expect(sheet.rowCount).toBe(3);
        expect(sheet.getRow(2).getCell(6).value).toBe('Zone de validation haute (ZH)');
        expect(sheet.getRow(2).getCell(8).value).toBe(1);
        expect(sheet.getRow(3).getCell(6).value).toBe('Zone de validation basse (ZB) — PMR');
        expect(sheet.getRow(3).getCell(8).value).toBe(1);
    });
});
