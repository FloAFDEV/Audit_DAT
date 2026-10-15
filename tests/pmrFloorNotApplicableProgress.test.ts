// tests/pmrFloorNotApplicableProgress.test.ts
// Adhésif PMR au sol déclaré non applicable (Jean-Jaurès, accès historique) :
// rien à contrôler, donc jamais « Audit terminé » ni 100 %.
import { describe, it, expect } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { getLieuProgress, getModuleProgress } from '../utils/progressCalculators';
import { AuditModuleType, PMRFloorAdhesiveData } from '../types';

describe('Progression d\'un audit PMR au sol non applicable', () => {
    it('module : « Non applicable », 0 %, jamais terminé ; lieu filtré PMR : plus 100 %', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const lieu = lieux.find(l => l.modules.some(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && (m.data as PMRFloorAdhesiveData).isNotApplicable));
        expect(lieu).toBeDefined();
        const pmrModules = lieu!.modules.filter(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE);
        for (const m of pmrModules.filter(m => (m.data as PMRFloorAdhesiveData).isNotApplicable)) {
            const p = getModuleProgress(m);
            expect(p.isComplete).toBe(false);
            expect(p.percentage).toBe(0);
            expect(p.statusText).toBe('Audit non applicable');
        }
        if (pmrModules.every(m => (m.data as PMRFloorAdhesiveData).isNotApplicable)) {
            expect(getLieuProgress(lieu!, [AuditModuleType.PMR_FLOOR_ADHESIVE])).toBe(0);
        }
    });
});
