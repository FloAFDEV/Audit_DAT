// tests/floorAdhesiveStatus.test.ts
// Statuts d'audit PMR au sol / pictogrammes cognitifs : lecture seule, sur
// l'objet constaté lui-même ; jamais « Non contrôlé » par défaut ; aucun
// effet sur les quantités ni sur le CSV de pose.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { pmrFloorPoseItems } from '../utils/cockpit/pmrFloorPose';
import { cognitivePictogramPoseItems } from '../utils/cockpit/cognitivePictogramSummary';
import { readFloorAdhesiveStatus } from '../utils/cockpit/floorAdhesiveStatus';
import { buildPoseRows } from '../components/cockpit/implantationsExportRows';
import { buildPoseCsv, POSE_CSV_COLUMNS } from '../utils/cockpit/poseExport';
import { AuditModuleType, CognitivePictogramData, FloorAdhesiveStatus, Lieu, PMRFloorAdhesiveData } from '../types';

let lieux: Lieu[];
beforeAll(async () => { lieux = await generateInitialLieuxDataAsync(); });

const moduleOf = (name: string, type: AuditModuleType) =>
    lieux.find(l => l.name === name)!.modules.find(m => m.type === type)!;

describe('readFloorAdhesiveStatus', () => {
    it('reconnaît les statuts connus, rien d\'autre', () => {
        for (const s of Object.values(FloorAdhesiveStatus)) expect(readFloorAdhesiveStatus(s)).toBe(s);
        expect(readFloorAdhesiveStatus(undefined)).toBeUndefined();
        expect(readFloorAdhesiveStatus(null)).toBeUndefined();
        expect(readFloorAdhesiveStatus('Inconnu')).toBeUndefined();
        expect(readFloorAdhesiveStatus(3)).toBeUndefined();
    });
});

describe('Statuts remontés sur les éléments de pose', () => {
    it('le constat saisi sur un adhésif PMR remonte sur le bon élément', () => {
        const mod = moduleOf('Capitole', AuditModuleType.PMR_FLOOR_ADHESIVE);
        const data = mod.data as PMRFloorAdhesiveData;
        const before = data.adhesives[0].status;
        data.adhesives[0].status = FloorAdhesiveStatus.ToBeReplaced;
        try {
            const items = pmrFloorPoseItems(lieux).filter(i => i.lieuName === 'Capitole');
            expect(items).toHaveLength(data.adhesives.length);
            expect(items[0].status).toBe(FloorAdhesiveStatus.ToBeReplaced);
        } finally { data.adhesives[0].status = before; }
    });

    it('le constat saisi sur un pictogramme remonte sur le bon accès', () => {
        const mod = moduleOf('Capitole', AuditModuleType.COGNITIVE_PICTOGRAMS);
        const picto = (mod.data as CognitivePictogramData).pictograms.find(p => /Grand Mod/.test(p.accessPointName))!;
        const before = picto.status;
        picto.status = FloorAdhesiveStatus.OK;
        try {
            const items = cognitivePictogramPoseItems(lieux).filter(i => i.lieuName === 'Capitole');
            expect(items.find(i => /Grand Mod/.test(i.accessPointName))?.status).toBe(FloorAdhesiveStatus.OK);
            expect(items.find(i => /Petit Mod/.test(i.accessPointName))?.status).toBe(FloorAdhesiveStatus.NotChecked);
        } finally { picto.status = before; }
    });

    it('statut absent = indisponible (undefined), jamais « Non contrôlé »', () => {
        const mod = moduleOf('Capitole', AuditModuleType.PMR_FLOOR_ADHESIVE);
        const adhesive = (mod.data as PMRFloorAdhesiveData).adhesives[0];
        const before = adhesive.status;
        (adhesive as { status?: FloorAdhesiveStatus }).status = undefined;
        try {
            const items = pmrFloorPoseItems(lieux).filter(i => i.lieuName === 'Capitole');
            expect(items[0].status).toBeUndefined();
        } finally { adhesive.status = before; }
    });

    it('identifie le lieu de chaque élément (lieuId)', () => {
        for (const i of [...pmrFloorPoseItems(lieux), ...cognitivePictogramPoseItems(lieux)]) {
            expect(lieux.find(l => l.id === i.lieuId)?.name).toBe(i.lieuName);
        }
    });
});

describe('Non-régression : quantités et exports', () => {
    it('le statut ne change ni les quantités ni les colonnes ni le contenu du CSV de pose', () => {
        const pmr = pmrFloorPoseItems(lieux);
        const cog = cognitivePictogramPoseItems(lieux);
        const strip = <T extends { status?: unknown; lieuId?: unknown }>(items: T[]) =>
            items.map(({ status: _s, lieuId: _l, ...rest }) => rest);
        const csvWith = buildPoseCsv(buildPoseRows([], new Map(), cog, pmr));
        const csvWithout = buildPoseCsv(buildPoseRows([], new Map(), strip(cog) as typeof cog, strip(pmr) as typeof pmr));
        expect(csvWith).toBe(csvWithout);
        expect(POSE_CSV_COLUMNS.map(c => c.header)).toEqual([
            'Ligne', 'Station', 'Famille', 'Équipement', 'Emplacement / direction', 'Zone',
            'Référence', 'Désignation', 'Dimensions', 'Quantité', 'Visuel',
        ]);
        expect(csvWith).not.toMatch(/Statut/);
    });
});
