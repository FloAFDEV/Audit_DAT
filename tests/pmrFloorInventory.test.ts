// tests/pmrFloorInventory.test.ts
// =================================================================
// PMR au sol — Qté réseau de l'Inventaire détaillé.
// Les matières sont des variantes du MÊME adhésif : chaque implantation
// compte une seule fois, sous la matière qui lui est attribuée
// (getPmrMaterial) ; matière introuvable → « Matière non renseignée »,
// jamais une matière déduite ; module « sans objet » → rien à compter.
// =================================================================
import { describe, it, expect } from 'vitest';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { PMR_UNKNOWN_MATERIAL_LABEL } from '../data/pmr_materials';
import { AuditModuleType, FloorAdhesiveStatus, Lieu, PMRFloorAdhesiveData } from '../types';
import { migratePmrFloorExtraAccessPoints } from '../store';

const pmrRows = (lieux: Lieu[]) =>
    computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).filter(i => i.id.startsWith('pmr-sol-'));
const qtyOf = (rows: ReturnType<typeof pmrRows>, materialStart: string) =>
    rows.find(r => r.material.startsWith(materialStart))?.quantity;
const pmrModules = (lieux: Lieu[]) =>
    lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE);

describe('Inventaire détaillé — PMR au sol', () => {
    it('47 modules, 1 sans objet (Jean-Jaurès) → 46 adhésifs au total, une seule fois chacun', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const modules = pmrModules(lieux);
        expect(modules).toHaveLength(47);
        const notApplicable = modules.filter(m => (m.data as PMRFloorAdhesiveData).isNotApplicable);
        expect(notApplicable.map(m => [(m.data as PMRFloorAdhesiveData).stationName, m.name]))
            .toEqual([['Jean-Jaurès', 'Adhésifs PMR au Sol (Accès Historique)']]);

        const rows = pmrRows(lieux);
        expect(rows.reduce((sum, r) => sum + r.quantity, 0)).toBe(46);
    });

    it('répartition par matière réelle (relevé terrain) : 13 / 27 / 4 / 2 matière non renseignée (PTC, Labège)', async () => {
        const rows = pmrRows(await generateInitialLieuxDataAsync());
        expect(qtyOf(rows, 'Vinyle WALL colle renforcée + plastification sol Ultra Protect')).toBe(13);
        expect(qtyOf(rows, 'Vinyle WALL colle renforcée + plastification sol traditionnelle')).toBe(27);
        expect(qtyOf(rows, 'Adhésif renforcé bitume')).toBe(4);
        expect(qtyOf(rows, PMR_UNKNOWN_MATERIAL_LABEL)).toBe(2);
        expect(rows).toHaveLength(4);
    });

    it('une implantation n\'apparaît que sur UNE ligne (vue station : Arènes = 1 adhésif, une seule matière)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const arenes = lieux.filter(l => l.modules.some(m =>
            m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && (m.data as PMRFloorAdhesiveData).stationName === 'Arènes'));
        const rows = pmrRows(arenes).filter(r => r.quantity > 0);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ material: 'Vinyle WALL colle renforcée + plastification sol Ultra Protect', quantity: 1 });
    });

    it('matière inconnue : reste « Matière non renseignée » (Labège Madron), jamais déduite', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const labege = lieux.filter(l => l.modules.some(m =>
            m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && (m.data as PMRFloorAdhesiveData).stationName === 'Labège Madron'));
        const rows = pmrRows(labege).filter(r => r.quantity > 0);
        expect(rows).toEqual([expect.objectContaining({ material: PMR_UNKNOWN_MATERIAL_LABEL, quantity: 1 })]);
    });

    it('un module passé « sans objet » sort du total ; aucune ligne « non renseignée » quand toutes les matières sont connues', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const basso = pmrModules(lieux).find(m => (m.data as PMRFloorAdhesiveData).stationName === 'Basso Cambo')!;
        (basso.data as PMRFloorAdhesiveData).isNotApplicable = true;
        const rows = pmrRows(lieux);
        expect(rows.reduce((sum, r) => sum + r.quantity, 0)).toBe(45);
        expect(qtyOf(rows, 'Vinyle WALL colle renforcée + plastification sol Ultra Protect')).toBe(12);

        const known = lieux.filter(l => l.name === 'Arènes');
        expect(pmrRows(known).some(r => r.material === PMR_UNKNOWN_MATERIAL_LABEL)).toBe(false);
    });

    it('Esquirol et Capitole : entrée ascenseur (ASC) + accès principal (PRI), toutes deux en Ultra Protect', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        for (const station of ['Esquirol', 'Capitole']) {
            const names = pmrModules(lieux).filter(m => (m.data as PMRFloorAdhesiveData).stationName === station).map(m => m.name);
            expect(names).toEqual(['Adhésifs PMR au Sol (Accès Bas (ASC))', 'Adhésifs PMR au Sol (Accès Haut (PRI))']);
            const rows = pmrRows(lieux.filter(l => l.modules.some(m => (m.data as PMRFloorAdhesiveData)?.stationName === station
                && m.type === AuditModuleType.PMR_FLOOR_ADHESIVE))).filter(r => r.quantity > 0);
            expect(rows).toEqual([expect.objectContaining({ material: 'Vinyle WALL colle renforcée + plastification sol Ultra Protect', quantity: 2 })]);
        }
    });
});

describe('migratePmrFloorExtraAccessPoints — base existante', () => {
    it('renomme le module générique (statut conservé), ajoute l\'accès principal, idempotente', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        // Simule une base d'avant : un seul module générique à Esquirol, déjà audité.
        for (const lieu of lieux) {
            lieu.modules = lieu.modules.filter(m => !(m.type === AuditModuleType.PMR_FLOOR_ADHESIVE
                && (m.data as PMRFloorAdhesiveData).stationCode === 'ESQ' && m.name.includes('PRI')));
        }
        const esq = pmrModules(lieux).find(m => (m.data as PMRFloorAdhesiveData).stationCode === 'ESQ')!;
        esq.name = 'Adhésifs PMR au Sol';
        (esq.data as PMRFloorAdhesiveData).adhesives[0].status = FloorAdhesiveStatus.OK;
        const id = esq.id;

        expect(migratePmrFloorExtraAccessPoints(lieux)).toBe(true);
        const after = pmrModules(lieux).filter(m => (m.data as PMRFloorAdhesiveData).stationCode === 'ESQ');
        expect(after.map(m => m.name)).toEqual(['Adhésifs PMR au Sol (Accès Bas (ASC))', 'Adhésifs PMR au Sol (Accès Haut (PRI))']);
        expect(after[0].id).toBe(id);
        expect((after[0].data as PMRFloorAdhesiveData).adhesives[0].status).toBe(FloorAdhesiveStatus.OK);
        expect((after[1].data as PMRFloorAdhesiveData).adhesives[0].status).toBe(FloorAdhesiveStatus.NotChecked);

        expect(migratePmrFloorExtraAccessPoints(lieux)).toBe(false);
        expect(pmrModules(lieux).filter(m => (m.data as PMRFloorAdhesiveData).stationCode === 'ESQ')).toHaveLength(2);
    });
});
