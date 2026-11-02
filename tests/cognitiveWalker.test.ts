// tests/cognitiveWalker.test.ts
// Parcours unique des pictogrammes cognitifs : un module lu une fois,
// chaque pictogramme qualifié compté / non compté par la règle unique.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import {
    collectCognitivePictograms, cognitivePictogramPoseItems, readCognitivePictogramModule, summarizeCognitivePictograms,
} from '../utils/cockpit/cognitivePictogramSummary';
import { getCountedCognitivePictograms, isProvisionalCognitivePictogram } from '../data/cognitive_pictograms';
import { generateMaintenanceSummary } from '../utils/maintenanceGenerator';
import { AuditModuleType, CognitivePictogramData, FloorAdhesiveStatus, Lieu } from '../types';

let lieux: Lieu[];
beforeAll(async () => { lieux = await generateInitialLieuxDataAsync(); });
const cogModule = (name: string) => {
    const lieu = lieux.find(l => l.name === name)!;
    return { lieu, module: lieu.modules.find(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS)! };
};

describe('readCognitivePictogramModule', () => {
    it('Basso Cambo : un compté (dimension, emplacement), un « à définir » non compté', () => {
        const { lieu, module } = cogModule('Basso Cambo');
        const records = readCognitivePictogramModule(lieu, module);
        expect(records.map(r => [r.accessPointName, r.counted, r.uncountedReason ?? null])).toEqual([
            ['Accès Gare Bus (sur mur)', true, null],
            ['Accès à définir', false, 'provisional'],
        ]);
        expect(records[0]).toMatchObject({ dimensions: '74.5x97cm', stationCode: 'MBC', lieuId: lieu.id, moduleId: module.id });
    });

    it('« compté » = règle getCountedCognitivePictograms, module par module', () => {
        for (const lieu of lieux) for (const module of lieu.modules.filter(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS)) {
            const counted = readCognitivePictogramModule(lieu, module).filter(r => r.counted).map(r => r.pictogram);
            expect(counted).toEqual(getCountedCognitivePictograms(module));
        }
    });

    it('ligne non comptée : motif « inactiveLine »', () => {
        const { lieu, module } = cogModule('Capitole');
        const records = readCognitivePictogramModule(lieu, { ...module, line: 'AEROPORT' });
        expect(records.every(r => !r.counted && r.uncountedReason === 'inactiveLine')).toBe(true);
    });
});

describe('collectCognitivePictograms et dérivés', () => {
    it('comptés par défaut ; non comptés sur demande ; éléments de pose = comptés', () => {
        const counted = collectCognitivePictograms(lieux);
        const all = collectCognitivePictograms(lieux, { includeUncounted: true });
        expect(counted.every(r => r.counted)).toBe(true);
        expect(all.length).toBeGreaterThan(counted.length);
        expect(all.filter(r => !r.counted).every(r => isProvisionalCognitivePictogram(r))).toBe(true);
        expect(cognitivePictogramPoseItems(lieux)).toHaveLength(counted.length);
    });

    it('résumés des cards : somme = pictogrammes comptés ; « à remplacer » lu sur le pictogramme', () => {
        const { module } = cogModule('Capitole');
        (module.data as CognitivePictogramData).pictograms[0].status = FloorAdhesiveStatus.ToBeReplaced;
        const summary = summarizeCognitivePictograms(lieux).get('A|Capitole')!;
        expect(summary).toMatchObject({ accessCount: 2, toReplaceCount: 1, stationCode: 'CAP' });
        expect([...summarizeCognitivePictograms(lieux).values()].reduce((s, v) => s + v.accessCount, 0)).toBe(collectCognitivePictograms(lieux).length);
        (module.data as CognitivePictogramData).pictograms[0].status = FloorAdhesiveStatus.NotChecked;
    });

    it('maintenance (comportement inchangé à cette étape) : lue via le parcours unique', () => {
        const { lieu, module } = cogModule('Capitole');
        (module.data as CognitivePictogramData).pictograms[1].status = FloorAdhesiveStatus.ToBeReplaced;
        const items = generateMaintenanceSummary([lieu]).allDefects.items.filter(i => i.auditType === AuditModuleType.COGNITIVE_PICTOGRAMS);
        expect(items).toEqual([expect.objectContaining({ context: 'Accès Capitole - Grand Modèle', stationCode: 'CAP', elementName: 'Pictogramme cognitif' })]);
        (module.data as CognitivePictogramData).pictograms[1].status = FloorAdhesiveStatus.NotChecked;
    });
});
