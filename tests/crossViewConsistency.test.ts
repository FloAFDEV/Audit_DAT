// tests/crossViewConsistency.test.ts
// =================================================================
// COHÉRENCE INTER-VUES — filet de sécurité du chantier « Source de vérité
// unique ». Une même donnée métier doit produire les mêmes résultats dans
// la Synthèse (useStats), le Référentiel (éléments de pose, inventaire),
// le Patrimoine d'une station, les Anomalies, les badges des cartes et
// les exports.
//
//  - `it(...)`       : comportement métier attendu, vérifié aujourd'hui.
//  - `it.fails(...)` : comportement ATTENDU (décisions validées) qui n'est
//    pas encore celui du code — écart connu, documenté, jamais figé comme
//    définitif. Le test passe tant que l'écart existe ; il doit être
//    converti en `it(...)` par la PR qui corrige l'écart.
// =================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';

// useStats est un hook (useMemo) : exécuté hors rendu React, chaque
// useMemo calcule immédiatement — mêmes fonctions, même résultat.
vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return { ...actual, useMemo: (factory: () => unknown) => factory() };
});

import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { useStats, computeAdhesiveInventory } from '../hooks/useStats';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { pmrFloorPoseItems } from '../utils/cockpit/pmrFloorPose';
import { cognitivePictogramPoseItems, summarizeCognitivePictograms } from '../utils/cockpit/cognitivePictogramSummary';
import { stationEquipmentItems, futureStationEquipmentItems, STATION_EQUIPMENT_ROW_IDS, StationEquipmentKind } from '../utils/cockpit/stationEquipment';
import { buildSignaletiqueStationIndex, isDefect as isStationEquipmentDefect } from '../utils/cockpit/signaletiqueStationIndex';
import { buildStationPatrimoine, linesOfLieu } from '../utils/cockpit/stationPatrimoine';
import { getLieuDefectCount } from '../utils/anomalyDetector';
import { generateMaintenanceSummary } from '../utils/maintenanceGenerator';
import { buildMaintenanceActions } from '../utils/cockpit/maintenanceActions';
import { buildPoseRows } from '../components/cockpit/implantationsExportRows';
import { buildImplantationLineSheets } from '../components/cockpit/implantationsExportRows';
import { buildPoseCsv, POSE_CSV_COLUMNS } from '../utils/cockpit/poseExport';
import { isModuleInCurrentScope } from '../utils/moduleScope';
import { isProvisionalCognitivePictogram } from '../data/cognitive_pictograms';
import { ADHESIVES, getPrAdhesives } from '../data/adhesives';
import {
    AdhesiveStatus, AuditModuleType, CognitivePictogramData, EquipmentStatusType, EquipmentType, FloorAdhesiveStatus,
    Lieu, ModeData, PMRFloorAdhesiveData, PlanQuartierData, SignageReference,
} from '../types';

let lieux: Lieu[];
let references: SignageReference[];

// Données fraîches à chaque test : les scénarios modifient des statuts.
beforeEach(async () => {
    lieux = await generateInitialLieuxDataAsync();
    references = buildSignageReferencesSeed();
});

const stats = () => useStats(lieux, references);
const lieuNamed = (name: string) => lieux.find(l => l.name === name)!;
const moduleOf = (lieu: Lieu, type: AuditModuleType, line?: string) =>
    lieu.modules.find(m => m.type === type && (line === undefined || m.line === line))!;
/** Premier DAT d'un module (quelle que soit la station / direction porteuse). */
const firstDat = (module: { data: unknown }) =>
    (module.data as ModeData).stations.flatMap(st => st.directions.flatMap(d => d.dats))[0];
/** Constat « absent » saisi sur un module FUTUR (préparation) d'un lieu. */
const addFuturePlanQuartierDefect = (lieu: Lieu) => {
    const future = lieu.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER && !isModuleInCurrentScope(m))!;
    (future.data as PlanQuartierData).occurrences.push({ id: 'futur-1', modelId: 'pdq-adhesif', status: AdhesiveStatus.Absent } as PlanQuartierData['occurrences'][number]);
};
const sumInventory = (prefix: string) =>
    computeAdhesiveInventory(lieux, references).filter(r => r.id.startsWith(prefix)).reduce((s, r) => s + r.quantity, 0);
const byLine = <T extends { line: string }>(items: T[]) =>
    items.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.line]: (acc[i.line] ?? 0) + 1 }), {});
const allStationLines = () => lieux.flatMap(lieu =>
    linesOfLieu(lieu).map(line => buildStationPatrimoine({
        lieux, implantations: buildPatrimoineIndex(lieux, references).implantations,
        pmrFloor: pmrFloorPoseItems(lieux), cognitive: cognitivePictogramPoseItems(lieux),
        stationEquipment: stationEquipmentItems(lieux), futureStationEquipment: futureStationEquipmentItems(lieux),
    }, { lieuId: lieu.id, line })!));

/** Anomalies OPÉRATIONNELLES du cockpit pour un lieu (définition cible,
 *  décisions validées) : Signalétique IV (moteur d'index), équipements de
 *  station (leur index), PMR au sol et pictogrammes COMPTÉS (éléments de
 *  pose : périmètre d'exploitation, « sans objet » et « à définir » exclus). */
const cockpitOperationalAnomalies = (lieu: Lieu): number => {
    const catalogue = buildPatrimoineIndex([lieu], references).totals.defectCount;
    const station = buildSignaletiqueStationIndex([lieu]).totals.defectCount;
    const floor = [...pmrFloorPoseItems([lieu]), ...cognitivePictogramPoseItems([lieu])]
        .filter(i => i.status === FloorAdhesiveStatus.ToBeReplaced).length;
    return catalogue + station + floor;
};
const maintenanceFloorDefects = (type: AuditModuleType) =>
    stats().maintenanceSummary.allDefects.items.filter(i => i.auditType === type);

// =================================================================
describe('PMR au sol — une seule quantité partout', () => {
    it('Synthèse = éléments de pose = inventaire = somme des stations', () => {
        const items = pmrFloorPoseItems(lieux);
        const { globalCounts } = stats();
        expect(items.length).toBeGreaterThan(0);
        expect(globalCounts.pmrFloorAdhesiveCount).toBe(items.length);
        expect(sumInventory('pmr-sol-')).toBe(items.length);
        expect(allStationLines().reduce((s, p) => s + p.pmrFloor.length, 0)).toBe(items.length);
    });

    it('par ligne : Synthèse = éléments de pose', () => {
        const lines = byLine(pmrFloorPoseItems(lieux));
        const { globalCounts } = stats();
        expect(globalCounts.pmrFloorAdhesiveCountA).toBe(lines.A ?? 0);
        expect(globalCounts.pmrFloorAdhesiveCountB).toBe(lines.B ?? 0);
        expect(globalCounts.pmrFloorAdhesiveCountC).toBe(lines.C ?? 0);
        expect(globalCounts.pmrFloorAdhesiveCountAero).toBe(lines.AEROPORT ?? 0);
    });

    it('module « sans objet » (Jean-Jaurès, accès historique) : jamais compté', () => {
        const na = lieuNamed('Jean-Jaurès').modules.find(m =>
            m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && (m.data as PMRFloorAdhesiveData).isNotApplicable)!;
        expect((na.data as PMRFloorAdhesiveData).adhesives.length).toBeGreaterThan(0);
        const before = pmrFloorPoseItems(lieux).length;
        (na.data as PMRFloorAdhesiveData).isNotApplicable = false;
        expect(pmrFloorPoseItems(lieux).length).toBe(before + (na.data as PMRFloorAdhesiveData).adhesives.length);
    });

    it('un constat « à remplacer » apparaît dans la maintenance, l\'élément de pose et le badge', () => {
        const lieu = lieuNamed('Capitole');
        (moduleOf(lieu, AuditModuleType.PMR_FLOOR_ADHESIVE).data as PMRFloorAdhesiveData).adhesives[0].status = FloorAdhesiveStatus.ToBeReplaced;
        expect(maintenanceFloorDefects(AuditModuleType.PMR_FLOOR_ADHESIVE).filter(i => i.lieuName === 'Capitole')).toHaveLength(1);
        expect(pmrFloorPoseItems([lieu])[0].status).toBe(FloorAdhesiveStatus.ToBeReplaced);
        expect(getLieuDefectCount(lieu, references)).toBe(cockpitOperationalAnomalies(lieu));
    });

    it('décision 2 : un module « sans objet » ne génère aucune anomalie de maintenance', () => {
        const na = lieuNamed('Jean-Jaurès').modules.find(m =>
            m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && (m.data as PMRFloorAdhesiveData).isNotApplicable)!;
        (na.data as PMRFloorAdhesiveData).adhesives[0].status = FloorAdhesiveStatus.ToBeReplaced;
        expect(maintenanceFloorDefects(AuditModuleType.PMR_FLOOR_ADHESIVE)).toHaveLength(0);
    });
});

// =================================================================
describe('Pictogrammes cognitifs — une seule quantité partout', () => {
    it('Synthèse = éléments de pose = inventaire = résumés par lieu = somme des stations', () => {
        const items = cognitivePictogramPoseItems(lieux);
        const { globalCounts } = stats();
        expect(items.length).toBeGreaterThan(0);
        expect(globalCounts.cogPictoCount).toBe(items.length);
        expect(sumInventory('cog-picto-')).toBe(items.length);
        expect([...summarizeCognitivePictograms(lieux).values()].reduce((s, v) => s + v.accessCount, 0)).toBe(items.length);
        expect(allStationLines().reduce((s, p) => s + p.cognitive.length, 0)).toBe(items.length);
    });

    it('par ligne : Synthèse = éléments de pose', () => {
        const lines = byLine(cognitivePictogramPoseItems(lieux));
        const { globalCounts } = stats();
        expect(globalCounts.cogPictoCountA).toBe(lines.A ?? 0);
        expect(globalCounts.cogPictoCountB).toBe(lines.B ?? 0);
        expect(globalCounts.cogPictoCountC).toBe(lines.C ?? 0);
        expect(globalCounts.cogPictoCountAero).toBe(lines.AEROPORT ?? 0);
    });

    it('« Accès à définir » : visible dans le patrimoine de la station, jamais compté', () => {
        const basso = allStationLines().find(p => p.lieuName === 'Basso Cambo' && p.line === 'A')!;
        expect(basso.cognitiveUncounted.map(u => u.accessPointName)).toEqual(['Accès à définir']);
        expect(cognitivePictogramPoseItems([lieuNamed('Basso Cambo')]).some(i => isProvisionalCognitivePictogram(i))).toBe(false);
    });

    it('un constat « à remplacer » sur un pictogramme compté : maintenance, élément et badge alignés', () => {
        const lieu = lieuNamed('Capitole');
        (moduleOf(lieu, AuditModuleType.COGNITIVE_PICTOGRAMS).data as CognitivePictogramData).pictograms[0].status = FloorAdhesiveStatus.ToBeReplaced;
        expect(maintenanceFloorDefects(AuditModuleType.COGNITIVE_PICTOGRAMS).filter(i => i.lieuName === 'Capitole')).toHaveLength(1);
        expect(getLieuDefectCount(lieu, references)).toBe(cockpitOperationalAnomalies(lieu));
    });

    it('décision 1 : un pictogramme « Accès à définir » ne génère aucune anomalie de maintenance', () => {
        const picto = (moduleOf(lieuNamed('Basso Cambo'), AuditModuleType.COGNITIVE_PICTOGRAMS).data as CognitivePictogramData)
            .pictograms.find(isProvisionalCognitivePictogram)!;
        picto.status = FloorAdhesiveStatus.ToBeReplaced;
        expect(maintenanceFloorDefects(AuditModuleType.COGNITIVE_PICTOGRAMS)).toHaveLength(0);
    });
});

// =================================================================
describe('Équipements de station — quantités et statuts', () => {
    const kinds = Object.keys(STATION_EQUIPMENT_ROW_IDS) as StationEquipmentKind[];

    it('inventaire = emplacements décrits dans les données, type par type', () => {
        const inventory = computeAdhesiveInventory(lieux, references);
        const items = stationEquipmentItems(lieux);
        for (const kind of kinds) {
            const row = inventory.find(r => r.id === STATION_EQUIPMENT_ROW_IDS[kind]);
            expect(row?.quantity ?? 0, kind).toBe(items.filter(i => i.kind === kind).length);
        }
    });

    it('chaque équipement décrit est un point de contrôle de l\'index des anomalies (même statut)', () => {
        const station = lieuNamed('Arènes');
        const sig = moduleOf(station, AuditModuleType.SIGNALETIQUE);
        const st = (sig.data as ModeData).stations[0];
        st.signaletique!.totem!.direction1.status = EquipmentStatusType.ABSENT;
        const item = stationEquipmentItems([station]).find(i => i.kind === 'totem' && i.status === EquipmentStatusType.ABSENT);
        expect(item).toBeDefined();
        expect(buildSignaletiqueStationIndex([station]).items.filter(i => i.category === 'Totem' && isStationEquipmentDefect(i.status))).toHaveLength(1);
    });

    it('stations futures : consultables, jamais dans les quantités ni les anomalies', () => {
        const future = futureStationEquipmentItems(lieux);
        expect(future.length).toBeGreaterThan(0);
        const current = stationEquipmentItems(lieux);
        expect(current.some(i => future.includes(i))).toBe(false);
        const blagnac = lieuNamed('Blagnac');
        expect(buildSignaletiqueStationIndex([blagnac]).items).toHaveLength(0);
    });

    it('décision 5 : l\'inventaire suit les emplacements décrits, pas « 2 totems par station » d\'office', () => {
        const sig = moduleOf(lieuNamed('Arènes'), AuditModuleType.SIGNALETIQUE);
        delete (sig.data as ModeData).stations[0].signaletique!.totem!.direction2;
        const row = computeAdhesiveInventory(lieux, references).find(r => r.id === STATION_EQUIPMENT_ROW_IDS.totem);
        expect(row?.quantity).toBe(stationEquipmentItems(lieux).filter(i => i.kind === 'totem').length);
    });
});

// =================================================================
describe('Signalétique IV — totaux par station et par ligne', () => {
    it('index : somme des lignes = total ; somme des stations-lignes + P+R = total, sans double comptage', () => {
        const index = buildPatrimoineIndex(lieux, references);
        const lineSum = [...index.byLine.values()].reduce((s, c) => s + c.installed, 0);
        expect(lineSum).toBe(index.totals.implantationCount);
        const stations = allStationLines();
        const catalogue = stations.reduce((s, p) => s + p.dat.length + p.eca.length + p.pdq.length, 0);
        const prByLieu = new Map(stations.map(p => [p.lieuId, p.prAssociated.length]));
        const pr = [...prByLieu.values()].reduce((s, n) => s + n, 0);
        expect(catalogue + pr).toBe(index.implantations.length);
    });

    it('statut « à remplacer » sur un DAT : index, actions de maintenance et badge alignés', () => {
        const lieu = lieuNamed('Capitole');
        const dat = firstDat(moduleOf(lieu, AuditModuleType.DAT));
        dat.adhesives.ad1 = AdhesiveStatus.ToBeReplaced;
        const index = buildPatrimoineIndex(lieux, references);
        expect(index.totals.toReplaceCount).toBe(1);
        expect(buildMaintenanceActions(index, references, 'reference').reduce((s, a) => s + a.absentCount + a.toReplaceCount, 0)).toBe(1);
        expect(getLieuDefectCount(lieu, references)).toBe(cockpitOperationalAnomalies(lieu));
    });
});

// =================================================================
describe('Périmètre d\'exploitation', () => {
    it('un module futur ne modifie aucune quantité ni anomalie du cockpit', () => {
        const blagnac = lieuNamed('Blagnac');
        const before = buildPatrimoineIndex(lieux, references).totals;
        addFuturePlanQuartierDefect(blagnac);
        expect(buildPatrimoineIndex(lieux, references).totals).toEqual(before);
        expect(stats().maintenanceSummary.allDefects.count).toBe(0);
    });

    it('décision 4 : le badge d\'un lieu ignore les modules futurs, comme le cockpit', () => {
        const blagnac = lieuNamed('Blagnac');
        addFuturePlanQuartierDefect(blagnac);
        expect(getLieuDefectCount(blagnac, references)).toBe(cockpitOperationalAnomalies(blagnac));
    });

    it('décision 4 : le badge d\'un lieu inclut les anomalies des équipements de station', () => {
        const arenes = lieuNamed('Arènes');
        const st = (moduleOf(arenes, AuditModuleType.SIGNALETIQUE).data as ModeData).stations[0];
        st.signaletique!.totem!.direction1.status = EquipmentStatusType.ABSENT;
        expect(getLieuDefectCount(arenes, references)).toBe(cockpitOperationalAnomalies(arenes));
    });

    it('décision 4 : le badge ne compte pas un statut hors portée du référentiel (R10)', () => {
        const lieu = lieuNamed('Capitole');
        const dat = firstDat(moduleOf(lieu, AuditModuleType.DAT));
        (dat.adhesives as Record<string, AdhesiveStatus>)['reference-inconnue'] = AdhesiveStatus.Absent;
        expect(getLieuDefectCount(lieu, references)).toBe(cockpitOperationalAnomalies(lieu));
    });
});

// =================================================================
describe('Exports', () => {
    it('CSV de pose : une ligne par implantation, adhésif PMR et pictogramme compté ; colonnes figées', () => {
        const index = buildPatrimoineIndex(lieux, references);
        const refById = new Map(references.map(r => [r.id, r]));
        const rows = buildPoseRows(buildImplantationLineSheets(index.implantations, refById), refById,
            cognitivePictogramPoseItems(lieux), pmrFloorPoseItems(lieux));
        const quantity = rows.reduce((s, r) => s + Number(r.quantity), 0);
        expect(quantity).toBe(index.implantations.length + cognitivePictogramPoseItems(lieux).length + pmrFloorPoseItems(lieux).length);
        expect(buildPoseCsv(rows).split('\r\n')[0]).toBe('\uFEFF' + POSE_CSV_COLUMNS.map(c => c.header).join(';'));
    });

    it('catalogue statique et catalogue IndexedDB (seed) : mêmes identifiants et mêmes libellés', () => {
        const refById = new Map(references.map(r => [r.id, r]));
        const staticAdhesives = [
            ...ADHESIVES,
            ...Object.values(EquipmentType).flatMap(type => getPrAdhesives(type)),
        ];
        for (const ad of staticAdhesives) {
            expect(refById.get(ad.id)?.name, ad.id).toBe(ad.name);
        }
    });
});

// =================================================================
describe('Constats et archives conservés', () => {
    it('les constats exclus des vues opérationnelles restent listés dans l\'analyse d\'une archive', () => {
        const na = lieuNamed('Jean-Jaurès').modules.find(m =>
            m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && (m.data as PMRFloorAdhesiveData).isNotApplicable)!;
        (na.data as PMRFloorAdhesiveData).adhesives[0].status = FloorAdhesiveStatus.ToBeReplaced;
        const picto = (moduleOf(lieuNamed('Basso Cambo'), AuditModuleType.COGNITIVE_PICTOGRAMS).data as CognitivePictogramData)
            .pictograms.find(isProvisionalCognitivePictogram)!;
        picto.status = FloorAdhesiveStatus.ToBeReplaced;
        // Vues opérationnelles : exclus.
        expect(stats().maintenanceSummary.allDefects.count).toBe(0);
        // Archives (HistoriqueView) : tous les constats, tels qu'enregistrés.
        const archive = generateMaintenanceSummary(lieux).allDefects.items;
        expect(archive.filter(i => i.auditType === AuditModuleType.PMR_FLOOR_ADHESIVE)).toHaveLength(1);
        expect(archive.filter(i => i.auditType === AuditModuleType.COGNITIVE_PICTOGRAMS)).toHaveLength(1);
        // Les constats eux-mêmes ne sont jamais modifiés.
        expect(picto.status).toBe(FloorAdhesiveStatus.ToBeReplaced);
    });
});
