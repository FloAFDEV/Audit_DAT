// tests/inventoryFocus.test.ts
// Filtre de l'Inventaire détaillé depuis un compteur du cockpit : quantités
// exactes du périmètre choisi (même calcul que l'inventaire complet),
// données d'origine intactes.
import { describe, it, expect } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { computeFocusedInventory, InventoryFocus } from '../utils/cockpit/inventoryFocus';
import { AuditModuleType, EcaData, EcaEquipmentType, EquipmentType } from '../types';

const refs = buildSignageReferencesSeed();
const qty = (rows: { id: string; quantity: number }[], id: string) => rows.find(r => r.id === id)?.quantity ?? 0;
const focus = (f: Omit<InventoryFocus, 'key' | 'label'>): InventoryFocus => ({ key: 'k', label: 'l', ...f });

describe('Filtre de l\'inventaire depuis un compteur', () => {
    it('ECA par ligne : A + B = réseau, référence par référence', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const all = computeAdhesiveInventory(lieux, refs).filter(i => i.auditType === 'Valideurs (ECA)');
        const a = computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.ECA, line: 'A' }));
        const b = computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.ECA, line: 'B' }));
        for (const row of all) expect(qty(a, row.id) + qty(b, row.id)).toBe(row.quantity);
        expect(a.every(r => r.auditType === 'Valideurs (ECA)' && r.quantity > 0)).toBe(true);
    });

    it('ECA par type : seuls les adhésifs réellement posés sur ce type, somme des types = réseau', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const all = computeAdhesiveInventory(lieux, refs).filter(i => i.auditType === 'Valideurs (ECA)');
        const byType = Object.values(EcaEquipmentType).map(t => computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.ECA, ecaTypes: [t] })));
        for (const row of all) expect(byType.reduce((s, rows) => s + qty(rows, row.id), 0)).toBe(row.quantity);
        const pmrBras = computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.ECA, ecaTypes: [EcaEquipmentType.PMRBras] }));
        expect(pmrBras.some(r => r.id === 'eca-4')).toBe(true);
    });

    it('ligne + type : cellule de la matrice', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const cell = computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.ECA, line: 'A', ecaTypes: [EcaEquipmentType.TripodeEntree] }));
        const tripodesA = lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.ECA && m.line === 'A')
            .flatMap(m => (m.data as EcaData).ecas).filter(e => e.type === EcaEquipmentType.TripodeEntree && !e.isNotApplicable).length;
        expect(tripodesA).toBeGreaterThan(0);
        expect(Math.max(...cell.map(r => r.quantity))).toBeLessThanOrEqual(tripodesA * 2);
    });

    it('P+R caisses automatiques : uniquement les adhésifs de caisse, 10 exemplaires', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const ca = computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.PR, prEquipmentType: EquipmentType.CA }));
        expect(ca.length).toBeGreaterThan(0);
        expect(ca.every(r => r.id.startsWith('adca'))).toBe(true);
        expect(qty(ca, 'adca6')).toBe(10);
    });

    it('DAT ligne A, pictos ligne C (aucun), PMR ligne B', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const datA = computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.DAT, line: 'A' }));
        expect(qty(datA, 'ad1')).toBe(51);
        expect(computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.COGNITIVE_PICTOGRAMS, line: 'C' }))).toEqual([]);
        const pmrB = computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.PMR_FLOOR_ADHESIVE, line: 'B' }));
        expect(pmrB.reduce((s, r) => s + r.quantity, 0)).toBe(24);
    });

    it('ne modifie jamais les données d\'origine', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const before = JSON.stringify(lieux);
        computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.ECA, line: 'A', ecaTypes: [EcaEquipmentType.PMRBras] }));
        computeFocusedInventory(lieux, refs, focus({ moduleType: AuditModuleType.PR, prEquipmentType: EquipmentType.BE }));
        expect(JSON.stringify(lieux)).toBe(before);
    });
});
