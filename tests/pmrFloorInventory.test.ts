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
import { AuditModuleType, Lieu, PMRFloorAdhesiveData } from '../types';

const pmrRows = (lieux: Lieu[]) =>
    computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).filter(i => i.id.startsWith('pmr-sol-'));
const qtyOf = (rows: ReturnType<typeof pmrRows>, materialStart: string) =>
    rows.find(r => r.material.startsWith(materialStart))?.quantity;
const pmrModules = (lieux: Lieu[]) =>
    lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE);

describe('Inventaire détaillé — PMR au sol', () => {
    it('45 modules, 1 sans objet (Jean-Jaurès) → 44 adhésifs au total, et non 45 × 3', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const modules = pmrModules(lieux);
        expect(modules).toHaveLength(45);
        const notApplicable = modules.filter(m => (m.data as PMRFloorAdhesiveData).isNotApplicable);
        expect(notApplicable.map(m => [(m.data as PMRFloorAdhesiveData).stationName, m.name]))
            .toEqual([['Jean-Jaurès', 'Adhésifs PMR au Sol (Accès Historique)']]);

        const rows = pmrRows(lieux);
        expect(rows.reduce((sum, r) => sum + r.quantity, 0)).toBe(44);
    });

    it('répartition par matière réelle : 9 / 24 / 4 / 7 matière non renseignée', async () => {
        const rows = pmrRows(await generateInitialLieuxDataAsync());
        expect(qtyOf(rows, 'Vinyle WALL colle renforcée + plastification sol Ultra Protect')).toBe(9);
        expect(qtyOf(rows, 'Vinyle WALL colle renforcée + plastification sol traditionnelle')).toBe(24);
        expect(qtyOf(rows, 'Adhésif renforcé bitume')).toBe(4);
        expect(qtyOf(rows, PMR_UNKNOWN_MATERIAL_LABEL)).toBe(7);
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

    it('matière inconnue : reste « Matière non renseignée » (Capitole), jamais déduite', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const capitole = lieux.filter(l => l.modules.some(m =>
            m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && (m.data as PMRFloorAdhesiveData).stationName === 'Capitole'));
        const rows = pmrRows(capitole).filter(r => r.quantity > 0);
        expect(rows).toEqual([expect.objectContaining({ material: PMR_UNKNOWN_MATERIAL_LABEL, quantity: 1 })]);
    });

    it('un module passé « sans objet » sort du total ; aucune ligne « non renseignée » quand toutes les matières sont connues', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const basso = pmrModules(lieux).find(m => (m.data as PMRFloorAdhesiveData).stationName === 'Basso Cambo')!;
        (basso.data as PMRFloorAdhesiveData).isNotApplicable = true;
        const rows = pmrRows(lieux);
        expect(rows.reduce((sum, r) => sum + r.quantity, 0)).toBe(43);
        expect(qtyOf(rows, 'Vinyle WALL colle renforcée + plastification sol Ultra Protect')).toBe(8);

        const known = lieux.filter(l => l.name === 'Arènes');
        expect(pmrRows(known).some(r => r.material === PMR_UNKNOWN_MATERIAL_LABEL)).toBe(false);
    });
});
