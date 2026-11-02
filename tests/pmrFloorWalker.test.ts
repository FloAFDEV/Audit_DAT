// tests/pmrFloorWalker.test.ts
// Parcours unique PMR au sol : un module lu une fois, règles de comptage
// appliquées par les consommateurs (Synthèse, inventaire, pose, maintenance).
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { collectPmrFloorAdhesives, isCountedPmrFloorAdhesive, pmrFloorPoseItems, readPmrFloorModule } from '../utils/cockpit/pmrFloorPose';
import { generateMaintenanceSummary } from '../utils/maintenanceGenerator';
import { AuditModuleType, FloorAdhesiveStatus, Lieu, PMRFloorAdhesiveData } from '../types';
import { isModuleInCurrentScope } from '../utils/moduleScope';

let lieux: Lieu[];
beforeAll(async () => { lieux = await generateInitialLieuxDataAsync(); });

const naModule = () => {
    const lieu = lieux.find(l => l.name === 'Jean-Jaurès')!;
    return { lieu, module: lieu.modules.find(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && (m.data as PMRFloorAdhesiveData).isNotApplicable)! };
};

describe('readPmrFloorModule', () => {
    it('un enregistrement par adhésif, identité du module conservée', () => {
        const lieu = lieux.find(l => l.name === 'Capitole')!;
        const module = lieu.modules.find(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE)!;
        const records = readPmrFloorModule(lieu, module);
        expect(records).toHaveLength((module.data as PMRFloorAdhesiveData).adhesives.length);
        expect(records[0]).toMatchObject({ lieuId: lieu.id, moduleId: module.id, line: 'A', notApplicable: false });
        expect(records[0].material).toMatch(/Vinyle/);
    });

    it('module « sans objet » : lu et signalé, jamais compté', () => {
        const { lieu, module } = naModule();
        const records = readPmrFloorModule(lieu, module);
        expect(records.length).toBeGreaterThan(0);
        expect(records.every(r => r.notApplicable && !isCountedPmrFloorAdhesive(r))).toBe(true);
        expect(collectPmrFloorAdhesives(lieux).some(r => r.moduleId === module.id)).toBe(false);
    });

    it('autre type de module : aucun enregistrement', () => {
        const lieu = lieux[0];
        const other = lieu.modules.find(m => m.type !== AuditModuleType.PMR_FLOOR_ADHESIVE)!;
        expect(readPmrFloorModule(lieu, other)).toEqual([]);
    });
});

describe('collectPmrFloorAdhesives', () => {
    it('= adhésifs des modules du périmètre, hors « sans objet » ; filtre de lignes', () => {
        const expected = lieux.flatMap(l => l.modules
            .filter(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && isModuleInCurrentScope(m) && !(m.data as PMRFloorAdhesiveData).isNotApplicable)
            .flatMap(m => (m.data as PMRFloorAdhesiveData).adhesives));
        expect(collectPmrFloorAdhesives(lieux)).toHaveLength(expected.length);
        expect(pmrFloorPoseItems(lieux, new Set(['B'])).every(i => i.line === 'B')).toBe(true);
    });
});

describe('maintenance', () => {
    it('lit les adhésifs via le parcours unique, même contexte et même statut', () => {
        const lieu = lieux.find(l => l.name === 'Capitole')!;
        const module = lieu.modules.find(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE)!;
        (module.data as PMRFloorAdhesiveData).adhesives[0].status = FloorAdhesiveStatus.ToBeReplaced;
        const items = generateMaintenanceSummary([lieu]).allDefects.items.filter(i => i.auditType === AuditModuleType.PMR_FLOOR_ADHESIVE);
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({ lieuName: 'Capitole', elementName: 'Adhésif au sol', context: 'Zone générale', status: FloorAdhesiveStatus.ToBeReplaced });
        (module.data as PMRFloorAdhesiveData).adhesives[0].status = FloorAdhesiveStatus.NotChecked;
    });
});
