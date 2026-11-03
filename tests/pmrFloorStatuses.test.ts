// tests/pmrFloorStatuses.test.ts
// Statuts PMR au sol : OK, À remplacer, Absent (Non contrôlé = état
// initial). Ancien « À planifier » conservé sans conversion : contrôlé,
// jamais une anomalie. Pictogrammes cognitifs inchangés.
import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return { ...actual, useMemo: (factory: () => unknown) => factory() };
});
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { useStats } from '../hooks/useStats';
import { getLieuDefectCount } from '../utils/anomalyDetector';
import { currentExploitationLieux, floorFamilyDefects, generateMaintenanceSummary } from '../utils/maintenanceGenerator';
import { pmrFloorPoseItems } from '../utils/cockpit/pmrFloorPose';
import { FLOOR_ADHESIVE_STATUS_LABELS, readFloorAdhesiveStatus } from '../utils/cockpit/floorAdhesiveStatus';
import { getModuleProgress } from '../utils/progressCalculators';
import { indexControls, isAnomalyStatus } from '../utils/exchange/controls';
import { buildLieuxCsvContent } from '../utils/csvExporter';
import {
    AuditModuleType, COGNITIVE_PICTOGRAM_STATUSES, FloorAdhesiveStatus, Lieu, PMR_FLOOR_STATUSES, PMRFloorAdhesiveData, SignageReference,
} from '../types';

let lieux: Lieu[];
let references: SignageReference[];
beforeEach(async () => {
    lieux = await generateInitialLieuxDataAsync();
    references = buildSignageReferencesSeed();
});
const capitole = () => lieux.find(l => l.name === 'Capitole')!;
const pmrModule = (lieu: Lieu) => lieu.modules.find(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE)!;
const setPmr = (lieu: Lieu, status: FloorAdhesiveStatus) => {
    (pmrModule(lieu).data as PMRFloorAdhesiveData).adhesives[0].status = status;
};
const operationalPmr = () => floorFamilyDefects(generateMaintenanceSummary(currentExploitationLieux(lieux), { operational: true })).pmrFloor;

describe('Statuts proposés', () => {
    it('PMR au sol : Non contrôlé, OK, À remplacer, Absent — sans « À planifier »', () => {
        expect(PMR_FLOOR_STATUSES).toEqual(['NotChecked', 'OK', 'ToBeReplaced', 'Absent']);
    });
    it('pictogrammes cognitifs : statuts inchangés, jamais « Absent »', () => {
        expect(COGNITIVE_PICTOGRAM_STATUSES).toEqual(['NotChecked', 'OK', 'ToBeReplaced', 'ToPlan']);
    });
    it('libellés : « Absent » et ancien statut signalé', () => {
        expect(FLOOR_ADHESIVE_STATUS_LABELS[FloorAdhesiveStatus.Absent]).toBe('Absent');
        expect(FLOOR_ADHESIVE_STATUS_LABELS[FloorAdhesiveStatus.ToPlan]).toBe('À planifier (ancien statut)');
        expect(readFloorAdhesiveStatus('Absent')).toBe(FloorAdhesiveStatus.Absent);
        expect(readFloorAdhesiveStatus('ToPlan')).toBe(FloorAdhesiveStatus.ToPlan);
    });
});

describe('« Absent » : anomalie opérationnelle partout', () => {
    it('maintenance, Synthèse, Analyse des anomalies et badge alignés', () => {
        setPmr(capitole(), FloorAdhesiveStatus.Absent);
        const stats = useStats(lieux, references);
        const synthese = floorFamilyDefects(stats.maintenanceSummary).pmrFloor;
        expect(synthese).toEqual([expect.objectContaining({ lieuName: 'Capitole', status: 'Absent' })]);
        expect(stats.maintenanceSummary.absent.count).toBe(1);
        expect(operationalPmr()).toEqual(synthese);
        expect(getLieuDefectCount(capitole(), references)).toBe(1);
        expect(pmrFloorPoseItems([capitole()])[0].status).toBe(FloorAdhesiveStatus.Absent);
    });

    it('module « sans objet » : jamais une anomalie, même « Absent »', () => {
        const jj = lieux.find(l => l.name === 'Jean-Jaurès')!;
        const na = jj.modules.find(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && (m.data as PMRFloorAdhesiveData).isNotApplicable)!;
        (na.data as PMRFloorAdhesiveData).adhesives[0].status = FloorAdhesiveStatus.Absent;
        expect(operationalPmr()).toHaveLength(0);
        expect(getLieuDefectCount(jj, references)).toBe(0);
    });

    it('échange multi-agents : accepté pour le PMR, compté comme anomalie', () => {
        setPmr(capitole(), FloorAdhesiveStatus.Absent);
        const control = [...indexControls(lieux).values()].find(c => c.key.startsWith(`pmr-${(pmrModule(capitole()).data as PMRFloorAdhesiveData).stationCode}`))!;
        expect(control.allowedStatuses).toContain('Absent');
        expect(control.allowedStatuses).toContain('ToPlan');
        expect(isAnomalyStatus('Absent')).toBe(true);
        const picto = [...indexControls(lieux).values()].find(c => c.key.startsWith('module-cog-picto-'))!;
        expect(picto.allowedStatuses).not.toContain('Absent');
    });
});

describe('Ancien « À planifier » : conservé, contrôlé, jamais une anomalie', () => {
    it('aucune conversion, aucune anomalie, progression inchangée', () => {
        const module = pmrModule(capitole());
        const before = getModuleProgress(module).percentage;
        setPmr(capitole(), FloorAdhesiveStatus.ToPlan);
        expect((module.data as PMRFloorAdhesiveData).adhesives[0].status).toBe('ToPlan');
        expect(operationalPmr()).toHaveLength(0);
        expect(getLieuDefectCount(capitole(), references)).toBe(0);
        expect(getModuleProgress(module).percentage).toBeGreaterThan(before);
        expect(generateMaintenanceSummary(lieux).allDefects.count).toBe(0);
    });
});

describe('Export CSV global', () => {
    it('même colonnes ; « Absent » et ancien « À planifier » lisibles', () => {
        const header = buildLieuxCsvContent(lieux, references)!.split('\n')[0];
        setPmr(capitole(), FloorAdhesiveStatus.Absent);
        const jj = lieux.find(l => l.name === 'Basso Cambo')!;
        setPmr(jj, FloorAdhesiveStatus.ToPlan);
        const content = buildLieuxCsvContent(lieux, references)!;
        expect(content.split('\n')[0]).toBe(header);
        expect(content).toMatch(/Capitole,Adhésifs PMR au Sol[^\n]*,Absent,/);
        expect(content).toMatch(/Basso Cambo,Adhésifs PMR au Sol[^\n]*,À planifier,/);
    });
});
