// tests/datCataloguePendingProgress.test.ts
// DAT de l'Aéroport Express (référentiel d'adhésifs en attente) : rien à
// contrôler, donc jamais « Audit terminé » ni 100 % — faux positif constaté
// à Blagnac. Les autres DAT gardent leur progression.
import { describe, it, expect } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { getCategoryProgress, getLieuProgress, getModuleProgress } from '../utils/progressCalculators';
import { AdhesiveStatus, AuditModuleType, ModeData } from '../types';

describe('Progression des DAT à référentiel en attente (Aéroport Express)', () => {
    it('Blagnac, aucun audit rempli : 0 %, plus 100 %', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const blagnac = lieux.find(l => l.name === 'Blagnac')!;
        expect(getLieuProgress(blagnac)).toBe(0);
        expect(getLieuProgress(blagnac, [AuditModuleType.DAT])).toBe(0);
    });

    it('module DAT Aéroport Express : « Référentiel en attente », jamais terminé', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const laeDats = lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.DAT && m.line === 'AEROPORT' && !m.isFuture);
        expect(laeDats.length).toBeGreaterThan(0);
        for (const m of laeDats) {
            const p = getModuleProgress(m);
            expect(p.isComplete).toBe(false);
            expect(p.percentage).toBe(0);
            expect(p.statusText).toBe('Référentiel en attente');
        }
        const aeroport = lieux.find(l => l.name === 'Aéroport Toulouse Blagnac')!;
        expect(getLieuProgress(aeroport, [AuditModuleType.DAT])).toBe(0);
        expect(getCategoryProgress(lieux, 'LAE' as any, [AuditModuleType.DAT])).toBe(0);
    });

    it('les DAT des autres lignes gardent leur progression', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const module = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.DAT && m.line === 'A')!;
        const dat = (module.data as ModeData).stations[0].directions[0].dats[0];
        Object.keys(dat.adhesives).forEach(k => { dat.adhesives[k] = AdhesiveStatus.OK; });
        const p = getModuleProgress(module);
        expect(p.percentage).toBeGreaterThan(0);
        expect(p.statusText).toBe('Audit en cours');
    });

    it('un module Plans de quartier encore vierge ne rend pas le lieu « terminé »', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const pasteur = lieux.find(l => l.name === 'Pasteur – Mairie de Blagnac')!;
        expect(getLieuProgress(pasteur, [AuditModuleType.PLAN_QUARTIER])).toBe(0);
        const data = pasteur.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER)!.data as any;
        data.lastCheckedAt = '2026-10-15T00:00:00.000Z'; // confirmé vide sur le terrain
        expect(getLieuProgress(pasteur, [AuditModuleType.PLAN_QUARTIER])).toBe(100);
    });
});
