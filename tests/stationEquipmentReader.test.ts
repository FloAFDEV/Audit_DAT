// tests/stationEquipmentReader.test.ts
// Parcours unique des équipements de station : emplacements (Référentiel),
// points de contrôle (anomalies), plans T1 (Synthèse) et inventaire
// dérivent des mêmes équipements décrits.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { readStationEquipmentModule } from '../utils/cockpit/stationEquipmentReader';
import {
    stationEquipmentItems, futureStationEquipmentItems, theoreticalStationEquipment, STATION_EQUIPMENT_THEORETICAL_PER_STATION,
} from '../utils/cockpit/stationEquipment';
import { buildSignaletiqueStationIndex } from '../utils/cockpit/signaletiqueStationIndex';
import { collectSignaletiquePlansQuartier } from '../utils/cockpit/signaletiquePlansQuartier';
import { isModuleInCurrentScope } from '../utils/moduleScope';
import { AuditModuleType, EquipmentStatusType, Lieu, ModeData } from '../types';

let lieux: Lieu[];
beforeAll(async () => { lieux = await generateInitialLieuxDataAsync(); });
const sigModules = () => lieux.flatMap(lieu => lieu.modules
    .filter(m => m.type === AuditModuleType.SIGNALETIQUE).map(module => ({ lieu, module })));

describe('readStationEquipmentModule', () => {
    it('Arènes (T1) : extrémités puis directions, dans l\'ordre du formulaire', () => {
        const { lieu, module } = sigModules().find(x => x.lieu.name === 'Arènes')!;
        const described = readStationEquipmentModule(lieu, module);
        expect(described.slice(0, 4).map(d => `${d.kind}:${d.position}`)).toEqual([
            'totem:direction1', 'bandeau:direction1', 'totem:direction2', 'bandeau:direction2',
        ]);
        expect(described.every(d => d.station.signaletique)).toBe(true);
        expect(new Set(described.map(d => d.kind))).toEqual(new Set(['totem', 'bandeau', 'biv', 'planReseau', 'planQuartier', 'hap']));
    });

    it('autre type de module : rien', () => {
        const lieu = lieux[0];
        expect(readStationEquipmentModule(lieu, lieu.modules.find(m => m.type !== AuditModuleType.SIGNALETIQUE)!)).toEqual([]);
    });

    it('chaque équipement décrit d\'un module en exploitation est un emplacement (hors plans T1 exclus) et un point de contrôle', () => {
        const current = sigModules().filter(x => isModuleInCurrentScope(x.module));
        const described = current.flatMap(x => readStationEquipmentModule(x.lieu, x.module));
        const items = stationEquipmentItems(lieux);
        const excludedT1 = described.filter(d => d.kind === 'planQuartier' && d.module.line !== 'AEROPORT'
            && (!d.stationInService || d.holder.status === EquipmentStatusType.NOT_APPLICABLE)).length;
        expect(items).toHaveLength(described.length - excludedT1);
        const mainControls = buildSignaletiqueStationIndex(lieux).items.filter(i => !i.label.includes(' · '));
        expect(mainControls).toHaveLength(described.filter(d => d.holder.status !== EquipmentStatusType.NOT_APPLICABLE).length);
    });

    it('modules futurs : lus pour la consultation seulement', () => {
        const future = sigModules().filter(x => !isModuleInCurrentScope(x.module));
        const described = future.flatMap(x => readStationEquipmentModule(x.lieu, x.module));
        expect(futureStationEquipmentItems(lieux)).toHaveLength(described.length);
    });
});

describe('Plans de quartier T1 (Synthèse)', () => {
    it('= emplacements « plan de quartier T1 » du Référentiel', () => {
        expect(collectSignaletiquePlansQuartier(lieux).filter(p => p.line === 'TRAM'))
            .toHaveLength(stationEquipmentItems(lieux).filter(i => i.kind === 'planQuartierTram').length);
    });

    it('un plan « non installé » sort du recensement, des emplacements et des points de contrôle', () => {
        const { lieu, module } = sigModules().find(x => x.lieu.name === 'Arènes')!;
        const plan = (module.data as ModeData).stations[0].signaletique!.planQuartier!.meett![0];
        const before = { plans: collectSignaletiquePlansQuartier([lieu]).length, items: stationEquipmentItems([lieu]).length, controls: buildSignaletiqueStationIndex([lieu]).items.length };
        plan.status = EquipmentStatusType.NOT_APPLICABLE;
        expect(collectSignaletiquePlansQuartier([lieu])).toHaveLength(before.plans - 1);
        expect(stationEquipmentItems([lieu])).toHaveLength(before.items - 1);
        expect(buildSignaletiqueStationIndex([lieu]).items).toHaveLength(before.controls - 1);
        plan.status = 'NotChecked' as EquipmentStatusType;
    });
});

describe('Quantité théorique (décision 5)', () => {
    it('documentée à part : 2 totems et 2 bandeaux par station décrite ; égale aux emplacements décrits sur le relevé actuel', () => {
        expect(STATION_EQUIPMENT_THEORETICAL_PER_STATION).toEqual({ totem: 2, bandeau: 2 });
        const theoretical = theoreticalStationEquipment(lieux);
        const items = stationEquipmentItems(lieux);
        expect(theoretical.totem).toBe(items.filter(i => i.kind === 'totem').length);
        expect(theoretical.bandeau).toBe(items.filter(i => i.kind === 'bandeau').length);
    });
});
