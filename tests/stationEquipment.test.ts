// tests/stationEquipment.test.ts
// Référentiel → Équipements station (consultation seule) : emplacements =
// lignes de l'Inventaire détaillé, quantité prévue jamais confondue avec la
// présence constatée, Aéroport Express signalé en préparation, hors exports.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { collectSignaletiquePlansQuartier } from '../utils/cockpit/signaletiquePlansQuartier';
import {
    stationEquipmentItems, stationEquipmentPresence, STATION_EQUIPMENT_ROW_IDS, StationEquipmentKind,
} from '../utils/cockpit/stationEquipment';
import { buildStationEquipmentElements, isSelectableFamily, selectFamilyPose } from '../utils/cockpit/familyElements';
import { pmrFloorPoseItems } from '../utils/cockpit/pmrFloorPose';
import { cognitivePictogramPoseItems } from '../utils/cockpit/cognitivePictogramSummary';
import { AuditModuleType, EquipmentStatusType, Lieu, ModeData } from '../types';

let lieux: Lieu[];
const inventoryQty = (l: Lieu[], rowId: string) =>
    computeAdhesiveInventory(l, buildSignageReferencesSeed()).find(r => r.id === rowId)?.quantity;

beforeAll(async () => { lieux = await generateInitialLieuxDataAsync(); });

describe('Équipements station — quantités', () => {
    it('chaque type compte exactement les emplacements de sa ligne d\'inventaire', () => {
        const items = stationEquipmentItems(lieux);
        for (const [kind, rowId] of Object.entries(STATION_EQUIPMENT_ROW_IDS)) {
            expect(items.filter(i => i.kind === kind).length, kind).toBe(inventoryQty(lieux, rowId));
        }
        const elements = buildStationEquipmentElements(computeAdhesiveInventory(lieux, buildSignageReferencesSeed()), items);
        expect(elements).toHaveLength(Object.keys(STATION_EQUIPMENT_ROW_IDS).length);
        for (const e of elements) expect(e.quantity, e.id).toBe(inventoryQty(lieux, e.id));
    });

    it('plans de quartier T1 : mêmes exemplaires que la collecte du cockpit', () => {
        const t1 = stationEquipmentItems(lieux).filter(i => i.kind === 'planQuartierTram');
        expect(t1.length).toBe(collectSignaletiquePlansQuartier(lieux).filter(p => p.line === 'TRAM').length);
    });

    it('Aéroport Express : emplacements comptés par l\'inventaire mais signalés en préparation', () => {
        const items = stationEquipmentItems(lieux);
        const airport = items.filter(i => i.line === 'AEROPORT');
        expect(airport.length).toBeGreaterThan(0);
        expect(airport.every(i => !i.inService)).toBe(true);
        expect(items.filter(i => i.line === 'TRAM').every(i => i.inService)).toBe(true);
        const totems = stationEquipmentPresence(items.filter(i => i.kind === 'totem'));
        expect(totems.declared).toBe(inventoryQty(lieux, 'sign-totem'));
        expect(totems.inPreparation).toBe(airport.filter(i => i.kind === 'totem').length);
    });
});

describe('Équipements station — présence constatée ≠ quantité prévue', () => {
    it('seed : rien de constaté, tout reste « non contrôlé »', () => {
        const p = stationEquipmentPresence(stationEquipmentItems(lieux));
        expect(p.present).toBe(0);
        expect(p.unchecked).toBe(p.declared);
    });

    it('constats terrain : présent / absent / non installé, inventaire inchangé', async () => {
        const data = await generateInitialLieuxDataAsync();
        const totemsOf = () => data.flatMap(l => l.modules)
            .filter(m => m.type === AuditModuleType.SIGNALETIQUE && m.line === 'TRAM')
            .flatMap(m => (m.data as ModeData).stations).map(s => s.signaletique!).filter(Boolean);
        const [a, b] = totemsOf();
        a.totem.direction1.status = EquipmentStatusType.OK;
        a.totem.direction2.status = EquipmentStatusType.HS;
        b.totem.direction1.status = EquipmentStatusType.ABSENT;
        b.totem.direction2.status = EquipmentStatusType.NOT_APPLICABLE;
        const before = inventoryQty(lieux, 'sign-totem');
        const p = stationEquipmentPresence(stationEquipmentItems(data).filter(i => i.kind === ('totem' as StationEquipmentKind)));
        expect({ present: p.present, absent: p.absent, notInstalled: p.notInstalled }).toEqual({ present: 2, absent: 1, notInstalled: 1 });
        // Règle de calcul de l'inventaire non modifiée : l'emplacement « non installé » reste prévu.
        expect(inventoryQty(data, 'sign-totem')).toBe(before);
        expect(p.declared).toBe(before);
    });

    it('sous-éléments : caisson du BIV, quai uniquement sur les stations multi-quais', () => {
        const bivs = stationEquipmentItems(lieux).filter(i => i.kind === 'biv' && i.line === 'TRAM');
        const labels = (i: typeof bivs[number]) => i.subElements.map(s => s.label);
        expect(labels(bivs.find(i => i.stationName !== 'Arènes' && i.stationName !== 'Odyssud')!)).not.toContain('Caisson — quai');
        expect(labels(bivs.find(i => i.stationName === 'Arènes')!)).toContain('Caisson — quai');
    });
});

describe('Équipements station — hors exports', () => {
    it('jamais sélectionnables, jamais dans le CSV de pose', () => {
        expect(isSelectableFamily('SIG')).toBe(false);
        const pose = selectFamilyPose(new Set(Object.values(STATION_EQUIPMENT_ROW_IDS)), pmrFloorPoseItems(lieux), cognitivePictogramPoseItems(lieux));
        expect(pose).toEqual({ pmrFloor: [], cognitive: [] });
    });
});

describe('Équipements station — stations futures', () => {
    it('modules futurs (Blagnac côté T1) consultables, jamais additionnés aux quantités', async () => {
        const { futureStationEquipmentItems } = await import('../utils/cockpit/stationEquipment');
        const future = futureStationEquipmentItems(lieux);
        expect(future.length).toBeGreaterThan(0);
        expect(future.every(i => !i.inService && i.line === 'TRAM')).toBe(true);
        expect([...new Set(future.map(i => i.stationName))]).toEqual(['Blagnac']);
        expect(new Set(future.map(i => i.kind))).toEqual(new Set(['totem', 'bandeau', 'biv', 'planReseau', 'planQuartierTram', 'hap']));
        const counted = stationEquipmentItems(lieux);
        expect(counted.some(i => i.stationName === 'Blagnac' && i.line === 'TRAM')).toBe(false);
        const elements = buildStationEquipmentElements(computeAdhesiveInventory(lieux, buildSignageReferencesSeed()), counted, future);
        const totem = elements.find(e => e.id === 'sign-totem')!;
        expect(totem.quantity).toBe(inventoryQty(lieux, 'sign-totem'));
        expect(totem.futureCount).toBe(future.filter(i => i.kind === 'totem').length);
        expect(totem.inPreparationByLine).toEqual({ AEROPORT: counted.filter(i => i.kind === 'totem' && !i.inService).length });
        expect(totem.inService! + Object.values(totem.inPreparationByLine!).reduce((a, b) => a + b, 0)).toBe(totem.quantity);
    });
});
