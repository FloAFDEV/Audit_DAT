// tests/terrainReadiness.test.ts
// =================================================================
// Harmonisations « prêt pour le terrain » — non-régression.
//  1. Règle de module PMR au sol (périmètre + « sans objet ») : UNE règle
//     (isCountedPmrFloorModule) pour la liste des matières de la Synthèse
//     et pour les adhésifs comptés (quantités, pose, maintenance).
//  2. Libellés des plans de quartier : les trois présentations (catalogue,
//     maintenance, CSV global) désignent le même modèle — mêmes cotes, même
//     support — sans modifier le contenu des exports.
// =================================================================
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { ADHESIVES } from '../data/adhesives';
import { getPmrMaterial } from '../data/pmr_materials';
import { collectPmrFloorAdhesives, isCountedPmrFloorModule, pmrFloorModuleMaterial } from '../utils/cockpit/pmrFloorPose';
import { generateMaintenanceSummary } from '../utils/maintenanceGenerator';
import { buildLieuxCsvContent } from '../utils/csvExporter';
import { isModuleInCurrentScope } from '../utils/moduleScope';
import { AdhesiveStatus, AuditModuleType, Lieu, PMRFloorAdhesiveData, PlanQuartierData } from '../types';

let lieux: Lieu[];
beforeAll(async () => { lieux = await generateInitialLieuxDataAsync(); }, 30000);

const SUPPORT_CSV: Record<string, string> = { plastifie: 'Plastifié', adhesif: 'Adhésif', dibond: 'Dibond' };

describe('PMR au sol — règle de module unique', () => {
    it('équivaut à l’ancienne règle de la Synthèse sur tout le relevé (aucun module gagné ni perdu)', () => {
        const legacy = (m: Lieu['modules'][number]) => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE
            && isModuleInCurrentScope(m) && !(m.data as PMRFloorAdhesiveData).isNotApplicable;
        const all = lieux.flatMap(l => l.modules);
        expect(all.filter(isCountedPmrFloorModule).map(m => m.id)).toEqual(all.filter(legacy).map(m => m.id));
        expect(all.some(isCountedPmrFloorModule)).toBe(true);
    });

    it('exclut un module « sans objet » et un module futur, matière inchangée', () => {
        const base = lieux.flatMap(l => l.modules).find(isCountedPmrFloorModule)!;
        const na = { ...base, data: { ...(base.data as PMRFloorAdhesiveData), isNotApplicable: true } };
        const future = { ...base, isFuture: true };
        expect(isCountedPmrFloorModule(na)).toBe(false);
        expect(isCountedPmrFloorModule(future)).toBe(false);
        expect(pmrFloorModuleMaterial(base)).toBe(getPmrMaterial((base.data as PMRFloorAdhesiveData).stationName, base.name));
    });

    it('matières de la Synthèse = matières des adhésifs comptés ; quantités inchangées', () => {
        const records = collectPmrFloorAdhesives(lieux);
        const countedModules = lieux.flatMap(l => l.modules).filter(isCountedPmrFloorModule);
        const adhesiveCount = countedModules.reduce((n, m) => n + ((m.data as PMRFloorAdhesiveData).adhesives ?? []).length, 0);
        expect(records).toHaveLength(adhesiveCount);
        const materialByModule = new Map(countedModules.map(m => [m.id, pmrFloorModuleMaterial(m)]));
        expect(records.every(r => r.material === materialByModule.get(r.moduleId))).toBe(true);
    });
});

describe('Plans de quartier — trois présentations d’un même modèle', () => {
    const references = buildSignageReferencesSeed();
    const pdqRefs = references.filter(r => r.auditType === 'PDQ');
    const lieuWithAllModels = (): Lieu => ({
        id: 'lieu-pdq-labels', name: 'Station Libellés',
        modules: [{
            id: 'm-pdq', type: AuditModuleType.PLAN_QUARTIER, name: 'Plans de quartier', line: 'A',
            data: {
                id: 'd-pdq', stationName: 'Station Libellés', stationCode: 'LBL', comment: '',
                occurrences: pdqRefs.map(r => ({ id: `o-${r.id}`, modelId: r.id, status: AdhesiveStatus.ToBeReplaced, location: 'Quai' })),
            } as PlanQuartierData,
        }],
    } as Lieu);

    it('maintenance : chaque modèle du catalogue a un libellé propre (jamais l’identifiant brut), cohérent avec ses cotes', () => {
        const items = generateMaintenanceSummary([lieuWithAllModels()]).toBeReplaced.items;
        expect(items).toHaveLength(pdqRefs.length);
        for (const ref of pdqRefs) {
            const item = items.find(i => i.context === 'Quai' && i.elementName.includes(`${ref.dimensions!.width}×${ref.dimensions!.height}`) && i.elementName !== ref.id);
            expect(item, ref.id).toBeDefined();
        }
    });

    it('CSV global : description de chaque modèle = cotes et support du catalogue (contenu inchangé)', () => {
        const csv = buildLieuxCsvContent([lieuWithAllModels()], references)!;
        for (const ref of pdqRefs) {
            const d = ref.dimensions!;
            const line = csv.split('\n').find(l => l.includes(`${d.width}x${d.height}cm | ${SUPPORT_CSV[ref.support!]}`)
                && (ref.id !== 'pdq-78x120' || l.includes('Plastifié')));
            expect(line, ref.id).toBeDefined();
            expect(csv).not.toContain(ref.id);
        }
    });

    it('catalogue historique (maintenance des archives) = noms du référentiel initial (DAT)', () => {
        const seedNames = new Map(references.map(r => [r.id, r.name]));
        for (const a of ADHESIVES) expect(seedNames.get(a.id), a.id).toBe(a.name);
    });
});
