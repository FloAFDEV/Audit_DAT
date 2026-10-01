// tests/implantationsExporter.test.ts
// Vérifie le classeur RÉELLEMENT produit (round-trip buffer → relecture
// ExcelJS), pas seulement les données intermédiaires avant sérialisation —
// aucun accès DOM nécessaire ici (buildImplantationsWorkbook n'en a pas).
// Couvre aussi la présentation terrain de l'export (désignation terrain,
// type de valideur, zone) et l'ordre physique des stations.
import { describe, it, expect } from 'vitest';
import { buildImplantationsWorkbook, ImplantationExportRow, SyntheseExportRow } from '../utils/cockpit/implantationsExporter';
import { sortByPhysicalStationOrder } from '../utils/cockpit/exportStationOrder';
import { fieldDesignation, validatorTypeLabel, exportZoneLabel, displayReferenceName } from '../components/cockpit/labels';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { LINE_B_STATIONS } from '../data/stations';
import { PR_DATA } from '../data/pr_data';
import { EcaEquipmentType, EquipmentType } from '../types';
import ExcelJS from 'exceljs';

const CATALOG_ECA1 = 'Repère 1 — Adhésif valideur-billetterie-métro-cible';

const syntheseRows: SyntheseExportRow[] = [
    { reference: 'eca-1', designation: 'Cible sur zone validation', catalogDesignation: CATALOG_ECA1, dimensions: '59 × 59 mm', line: 'A', count: 92 },
    { reference: 'eca-1', designation: 'Cible sur zone validation', catalogDesignation: CATALOG_ECA1, dimensions: '59 × 59 mm', line: 'B', count: 155 },
    { reference: 'eca-1', designation: 'Cible sur zone validation', catalogDesignation: CATALOG_ECA1, dimensions: '59 × 59 mm', line: 'C', count: 4 },
];

const row = (over: Partial<ImplantationExportRow>): ImplantationExportRow => ({
    station: 'Jean-Jaurès', context: 'Accès Historique', equipment: 'Valideur 1', validatorType: 'Valideur standard',
    reference: 'eca-1', designation: 'Cible sur zone validation', catalogDesignation: CATALOG_ECA1,
    zoneLabel: '', dimensions: '59 × 59 mm', quantity: 1, ...over,
});
const ligneARows: ImplantationExportRow[] = [row({})];
const ligneBRows: ImplantationExportRow[] = [
    row({ context: 'Liaison A→B', equipment: 'PMR 17', validatorType: 'Valideur PMR', zoneLabel: 'ZH — Zone de validation haute' }),
    row({ context: 'Liaison A→B', equipment: 'PMR 17', validatorType: 'Valideur PMR', zoneLabel: 'ZB — Zone de validation basse (PMR)' }),
];

const roundTrip = async (synthese: SyntheseExportRow[], sheets: Array<{ line: string; sheetName: string; rows: ImplantationExportRow[] }>) => {
    const workbook = await buildImplantationsWorkbook(synthese, sheets);
    const buffer = await workbook.xlsx.writeBuffer();
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer as any);
    return reloaded;
};

describe('buildImplantationsWorkbook — contenu réel du classeur produit', () => {
    it('produit un onglet Synthèse + un onglet par ligne, dans l\'ordre fourni par l\'appelant', async () => {
        const reloaded = await roundTrip(syntheseRows, [
            { line: 'A', sheetName: 'Ligne A', rows: ligneARows },
            { line: 'B', sheetName: 'Ligne B', rows: ligneBRows },
        ]);
        expect(reloaded.worksheets.map(ws => ws.name)).toEqual(['Synthèse', 'Ligne A', 'Ligne B']);
    });

    it('Synthèse : colonne Visuel vide, référence, désignations terrain et catalogue, dimensions, total général', async () => {
        const reloaded = await roundTrip(syntheseRows, []);
        const sheet = reloaded.getWorksheet('Synthèse')!;
        expect(sheet.getRow(1).values).toEqual([
            undefined, 'Visuel', 'Référence', 'Désignation terrain', 'Désignation catalogue', 'Dimensions', 'Ligne', 'Quantité',
        ]);
        // Ligne d'en-tête figée + filtre automatique.
        expect(sheet.views?.[0]?.state).toBe('frozen');
        expect(sheet.autoFilter).toBeDefined();

        const first = sheet.getRow(2);
        expect([1, 2, 3, 4, 5, 6, 7].map(c => first.getCell(c).value)).toEqual([
            null, 'eca-1', 'Cible sur zone validation', CATALOG_ECA1, '59 × 59 mm', 'A', 92,
        ]);
        expect(sheet.getRow(4).getCell(6).value).toBe('C');

        // Emplacement prévu pour un visuel ajouté à la main : colonne et lignes dimensionnées.
        expect(sheet.getColumn(1).width).toBeGreaterThanOrEqual(12);
        expect(first.height).toBeGreaterThanOrEqual(40);

        const totalRow = sheet.getRow(5);
        expect(totalRow.getCell(6).value).toBe('TOTAL GÉNÉRAL');
        expect(totalRow.getCell(7).value).toBe(92 + 155 + 4);
    });

    it("onglet de ligne : une ligne = une occurrence physique — ZH et ZB de eca-1 jamais fusionnées en quantité 2", async () => {
        const reloaded = await roundTrip([], [{ line: 'B', sheetName: 'Ligne B', rows: ligneBRows }]);
        const sheet = reloaded.getWorksheet('Ligne B')!;
        expect(sheet.getRow(1).values).toEqual([
            undefined, 'Station', 'Accès / liaison', 'Équipement', 'Type de valideur', 'Référence',
            'Désignation terrain', 'Désignation catalogue', 'Zone', 'Dimensions', 'Quantité',
        ]);
        // 2 lignes de détail (pas 1 fusionnée) : ZH puis ZB, quantité 1 chacune.
        expect(sheet.rowCount).toBe(3);
        expect(sheet.getRow(2).getCell(4).value).toBe('Valideur PMR');
        expect(sheet.getRow(2).getCell(8).value).toBe('ZH — Zone de validation haute');
        expect(sheet.getRow(2).getCell(10).value).toBe(1);
        expect(sheet.getRow(3).getCell(8).value).toBe('ZB — Zone de validation basse (PMR)');
        expect(sheet.getRow(3).getCell(10).value).toBe(1);
    });
});

describe('export Excel — présentation terrain', () => {
    const refs = new Map(buildSignageReferencesSeed().map(r => [r.id, r]));

    it('désignations terrain ECA validées ; la référence et le nom catalogue restent inchangés', () => {
        expect(fieldDesignation(refs.get('eca-1')!)).toBe('Cible sur zone validation');
        expect(fieldDesignation(refs.get('eca-3')!)).toBe('OpenPayment sous vitre');
        expect(fieldDesignation(refs.get('eca-4')!)).toBe('Cible sur zone validation PMR à bras');
        expect(fieldDesignation(refs.get('eca-11')!)).toBe('Numéro du valideur');
        expect(displayReferenceName(refs.get('eca-3')!)).toBe(refs.get('eca-3')!.name);
    });

    it('DAT, P+R et plans de quartier : pas de désignation terrain figée, nom catalogue conservé', () => {
        for (const id of ['ad1', 'adbe1', 'adca13', 'pdq-78x120', 'pem3d-120x80']) {
            expect(fieldDesignation(refs.get(id)!)).toBe(displayReferenceName(refs.get(id)!));
        }
    });

    it('type de valideur : standard, PMR, sortie ; vide hors ECA', () => {
        expect(validatorTypeLabel(EcaEquipmentType.TripodeEntree)).toBe('Valideur standard');
        expect(validatorTypeLabel(EcaEquipmentType.VantauxReversible)).toBe('Valideur standard');
        expect(validatorTypeLabel(EcaEquipmentType.PMRVantauxReversible)).toBe('Valideur PMR');
        expect(validatorTypeLabel(EcaEquipmentType.PMRBras)).toBe('Valideur PMR');
        expect(validatorTypeLabel(EcaEquipmentType.TripodeSortie)).toBe('Valideur de sortie');
        expect(validatorTypeLabel(EquipmentType.BE)).toBe('');
        expect(validatorTypeLabel(undefined)).toBe('');
    });

    it('zone : affichée uniquement sur un valideur PMR, jamais « ZH » sur un valideur standard', () => {
        expect(exportZoneLabel(EcaEquipmentType.TripodeEntree, 'ZH')).toBe('');
        expect(exportZoneLabel(EcaEquipmentType.PMRVantaux, 'ZH')).toBe('ZH — Zone de validation haute');
        expect(exportZoneLabel(EcaEquipmentType.PMRVantaux, 'ZB')).toBe('ZB — Zone de validation basse (PMR)');
        expect(exportZoneLabel(EcaEquipmentType.PMRVantaux, undefined)).toBe('');
    });
});

describe('export Excel — ordre physique des stations', () => {
    const names = (s: Array<{ station: string }>) => s.map(x => x.station);

    it('Ligne B : ordre de data/stations.ts, stable dans une station, station inconnue en fin de feuille', () => {
        const canonical = LINE_B_STATIONS.map(s => s.lieuName || s.name!);
        const items = [
            { station: canonical[5], k: 1 }, { station: 'Station inconnue', k: 2 },
            { station: canonical[0], k: 3 }, { station: canonical[5], k: 4 }, { station: canonical[2], k: 5 },
        ];
        const sorted = sortByPhysicalStationOrder('B', items, i => i.station);
        expect(names(sorted)).toEqual([canonical[0], canonical[2], canonical[5], canonical[5], 'Station inconnue']);
        expect(sorted.filter(i => i.station === canonical[5]).map(i => i.k)).toEqual([1, 4]);
        expect(items[0].k).toBe(1); // entrée non mutée
    });

    it('P+R : ordre de data/pr_data.ts, pas alphabétique', () => {
        const items = [...PR_DATA].reverse().map(p => ({ station: p.name }));
        expect(names(sortByPhysicalStationOrder('P+R', items, i => i.station))).toEqual(PR_DATA.map(p => p.name));
    });
});
