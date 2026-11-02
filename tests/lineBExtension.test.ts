// tests/lineBExtension.test.ts
// Futurs périmètres dans le Référentiel (présentation seule) : extension B
// identifiée sans changer les totaux, LAE décomposée (exploitation +
// préparation = quantité référencée), stations futures consultables hors
// quantités. Aucune règle de calcul ni de périmètre modifiée.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { isLineBExtension, LINE_B_EXTENSION_LIEUX, countLineBExtension } from '../data/lineBExtension';
import { ALL_STATION_DEFS } from '../data/stationRegistry';
import { pmrFloorPoseItems } from '../utils/cockpit/pmrFloorPose';
import { stationEquipmentItems, futureStationEquipmentItems } from '../utils/cockpit/stationEquipment';
import { buildStationEquipmentElements } from '../utils/cockpit/familyElements';
import { Lieu } from '../types';

let lieux: Lieu[];
beforeAll(async () => { lieux = await generateInitialLieuxDataAsync(); });

describe('Extension B — identification', () => {
    it('Parc du Canal et Labège Madron, uniquement sur la ligne B', () => {
        expect([...LINE_B_EXTENSION_LIEUX].sort()).toEqual(['Labège Madron', 'Parc du Canal']);
        expect(isLineBExtension('B', 'Parc du Canal')).toBe(true);
        expect(isLineBExtension('B', 'Labège Madron')).toBe(true);
        expect(isLineBExtension('C', 'Labège Madron')).toBe(false);
        expect(isLineBExtension('B', 'Ramonville')).toBe(false);
    });

    it('registre inchangé : les deux stations restent « en service » (isFuture false)', () => {
        const ext = ALL_STATION_DEFS.filter(s => ['sta-b-21', 'sta-b-22'].includes(s.id));
        expect(ext.map(s => s.isFuture)).toEqual([false, false]);
    });

    it('les totaux existants incluent toujours l\'extension B ; elle n\'est qu\'identifiée', () => {
        const index = buildPatrimoineIndex(lieux, buildSignageReferencesSeed());
        const ext = countLineBExtension(index.implantations);
        expect(ext).toBeGreaterThan(0);
        expect(index.totals.implantationCount).toBe(index.implantations.length);
        expect([...index.byReference.values()].reduce((s, u) => s + u.installedCount, 0)).toBe(index.implantations.length);
        // PMR : les 2 adhésifs de l'extension restent dans l'inventaire (« matière non renseignée »).
        const pmrExt = pmrFloorPoseItems(lieux).filter(i => isLineBExtension(i.line, i.lieuName));
        expect(pmrExt).toHaveLength(2);
        const unknown = computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).find(r => r.id === 'pmr-sol-matiere-non-renseignee');
        expect(unknown?.quantity).toBe(2);
    });
});

describe('Équipements station — LAE et stations futures', () => {
    it('chaque type : exploitation + LAE en préparation = quantité référencée de l\'inventaire', () => {
        const inventory = computeAdhesiveInventory(lieux, buildSignageReferencesSeed());
        const elements = buildStationEquipmentElements(inventory, stationEquipmentItems(lieux), futureStationEquipmentItems(lieux));
        for (const e of elements) {
            const prep = Object.values(e.inPreparationByLine ?? {}).reduce((a, b) => a + b, 0);
            expect(e.inService! + prep, e.id).toBe(inventory.find(r => r.id === e.id)!.quantity);
            expect(Object.keys(e.inPreparationByLine ?? {}).every(l => l === 'AEROPORT'), e.id).toBe(true);
        }
        const totem = elements.find(e => e.id === 'sign-totem')!;
        expect({ inService: totem.inService, prep: totem.inPreparationByLine, quantity: totem.quantity }).toEqual({ inService: 50, prep: { AEROPORT: 6 }, quantity: 56 });
    });

    it('Blagnac (T1, station future) : consultable, jamais dans les quantités', () => {
        const future = futureStationEquipmentItems(lieux);
        expect(future.every(i => i.stationName === 'Blagnac')).toBe(true);
        const before = computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).filter(r => r.id.startsWith('sign-')).map(r => r.quantity);
        expect(stationEquipmentItems(lieux).some(i => i.stationName === 'Blagnac' && i.line === 'TRAM')).toBe(false);
        expect(computeAdhesiveInventory(lieux, buildSignageReferencesSeed()).filter(r => r.id.startsWith('sign-')).map(r => r.quantity)).toEqual(before);
    });
});
