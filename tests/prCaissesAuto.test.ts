// tests/prCaissesAuto.test.ts
// Caisses automatiques P+R : nombre théorique modifiable, plan de quartier
// (repère 12) tenu à jour, aucune donnée terrain supprimée.
import { describe, it, expect } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { addPrCaisseAuto, getPrCaisseRemovalBlocker, migratePrCaisseAutoPlansDeQuartier, removePrCaisseAuto } from '../store';
import { AdhesiveStatus, AuditModuleType, EquipmentType, Lieu, PlanQuartierData, Pr } from '../types';

const setup = async () => {
    const lieux = await generateInitialLieuxDataAsync();
    migratePrCaisseAutoPlansDeQuartier(lieux); // état d'une base démarrée
    const lieu = lieux.find(l => l.name === 'Argoulets' && l.modules.some(m => m.type === AuditModuleType.PR))!;
    const pr = lieu.modules.find(m => m.type === AuditModuleType.PR)!;
    const zone = (pr.data as Pr).zones[0];
    return { lieux, lieu, moduleId: pr.id, zone };
};
const qty = (lieux: Lieu[], id: string) => computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).find(i => i.id === id)?.quantity ?? 0;
const caOccurrences = (lieu: Lieu) => lieu.modules.filter(m => m.type === AuditModuleType.PLAN_QUARTIER)
    .flatMap(m => (m.data as PlanQuartierData).occurrences).filter(o => o.id.startsWith('pdq-ca-'));

describe('Caisses automatiques P+R', () => {
    it('quantités initiales préservées : 10 caisses, 10 plans repère 12', async () => {
        const { lieux } = await setup();
        const cas = lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.PR)
            .flatMap(m => (m.data as Pr).zones.flatMap(z => z.equipments)).filter(e => e.type === EquipmentType.CA);
        expect(cas).toHaveLength(10);
        expect(qty(lieux, 'adca6')).toBe(10);
        expect(qty(lieux, 'pdq-adhesif')).toBe(10);
    });

    it('ajout : caisse CA suivante, adhésifs et plan repère 12 recalculés, sans doublon', async () => {
        const { lieux, lieu, moduleId, zone } = await setup();
        const added = addPrCaisseAuto(lieu, moduleId, zone.id)!;
        expect(added.name).toBe('CA02');
        expect(Object.values(added.adhesives).every(s => s === AdhesiveStatus.NotChecked)).toBe(true);
        expect(qty(lieux, 'adca6')).toBe(11);
        expect(qty(lieux, 'pdq-adhesif')).toBe(11);
        expect(caOccurrences(lieu).filter(o => o.id === `pdq-ca-${added.id}`)).toHaveLength(1);
        migratePrCaisseAutoPlansDeQuartier(lieux); // relance au démarrage : rien de plus
        expect(qty(lieux, 'pdq-adhesif')).toBe(11);
    });

    it('retrait d\'une caisse jamais auditée : caisse et plan retirés, retour aux quantités initiales', async () => {
        const { lieux, lieu, moduleId, zone } = await setup();
        const added = addPrCaisseAuto(lieu, moduleId, zone.id)!;
        expect(getPrCaisseRemovalBlocker(lieu, moduleId, zone.id, added.id)).toBeNull();
        expect(removePrCaisseAuto(lieu, moduleId, zone.id, added.id)).toBe(true);
        expect(qty(lieux, 'adca6')).toBe(10);
        expect(qty(lieux, 'pdq-adhesif')).toBe(10);
        expect(caOccurrences(lieu).some(o => o.id === `pdq-ca-${added.id}`)).toBe(false);
    });

    it('une caisse auditée (statut, commentaire) ou dont le plan est constaté n\'est jamais retirée', async () => {
        const { lieu, moduleId, zone } = await setup();
        const ca = zone.equipments.find(e => e.type === EquipmentType.CA)!;
        ca.adhesives.adca6 = AdhesiveStatus.OK;
        expect(getPrCaisseRemovalBlocker(lieu, moduleId, zone.id, ca.id)).toMatch(/auditée/);
        expect(removePrCaisseAuto(lieu, moduleId, zone.id, ca.id)).toBe(false);
        expect(zone.equipments.some(e => e.id === ca.id)).toBe(true);

        const added = addPrCaisseAuto(lieu, moduleId, zone.id)!;
        added.comment = 'vitre rayée';
        expect(removePrCaisseAuto(lieu, moduleId, zone.id, added.id)).toBe(false);
        added.comment = '';
        caOccurrences(lieu).find(o => o.id === `pdq-ca-${added.id}`)!.status = AdhesiveStatus.OK;
        expect(getPrCaisseRemovalBlocker(lieu, moduleId, zone.id, added.id)).toMatch(/constaté/);
        expect(removePrCaisseAuto(lieu, moduleId, zone.id, added.id)).toBe(false);
    });

    it('les bornes ne sont pas concernées et le nombre ne devient jamais négatif', async () => {
        const { lieu, moduleId, zone } = await setup();
        const borne = zone.equipments.find(e => e.type !== EquipmentType.CA)!;
        expect(removePrCaisseAuto(lieu, moduleId, zone.id, borne.id)).toBe(false);
        for (const ca of zone.equipments.filter(e => e.type === EquipmentType.CA)) removePrCaisseAuto(lieu, moduleId, zone.id, ca.id);
        expect(zone.equipments.filter(e => e.type === EquipmentType.CA)).toHaveLength(0);
        expect(removePrCaisseAuto(lieu, moduleId, zone.id, 'inexistante')).toBe(false);
        expect(addPrCaisseAuto(lieu, moduleId, zone.id)!.name).toBe('CA01');
    });
});
