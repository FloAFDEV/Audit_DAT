// tests/implantationLabels.test.ts
// Libellés d'implantation de l'arbre canonique (ImplantationsTree) :
// numéro ECA transmis par l'index, zone ZH/ZB, autres familles inchangées.
import { describe, it, expect } from 'vitest';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildPatrimoineIndex, ImplantationRef } from '../utils/cockpit/patrimoineIndex';
import { implantationEquipmentLabel, implantationZoneLabel } from '../components/cockpit/labels';
import { EcaEquipmentType } from '../types';

const label = (imp: ImplantationRef) =>
    [implantationEquipmentLabel(imp), implantationZoneLabel(imp.zone)].filter(Boolean).join(' — ');

describe('libellés d\'implantation', async () => {
    const index = buildPatrimoineIndex(await generateInitialLieuxDataAsync(), buildSignageReferencesSeed());
    const jol = (refId: string, equipment: string) =>
        index.implantations.filter(i => i.referenceId === refId && i.lieuName === 'Jolimont' && i.equipmentLabel === equipment);

    it('ECA d\'entrée standard (eca-1) : numéro, type, ZH', () => {
        expect(jol('eca-1', 'Valideur 9').map(label)).toEqual(["ECA n°09 · Tripode d'entrée — ZH"]);
    });

    it('ECA PMR (eca-1) : deux implantations, ZH et ZB (PMR)', () => {
        expect(jol('eca-1', 'PMR 8').map(label)).toEqual([
            'ECA n°08 · PMR à vantaux — ZH',
            'ECA n°08 · PMR à vantaux — ZB (PMR)',
        ]);
    });

    it('autre référence ECA, sans zone', () => {
        const other = index.implantations.find(i =>
            i.referenceId !== 'eca-1' && i.lieuName === 'Jolimont' && i.equipmentLabel === 'Valideur 9');
        expect(other).toBeDefined();
        expect(label(other!)).toBe("ECA n°09 · Tripode d'entrée");
    });

    it('ECA de sortie : numéro et type, jamais de zone (pas d\'eca-1)', () => {
        const exits = index.implantations.filter(i => i.equipmentType === EcaEquipmentType.TripodeSortie);
        expect(exits.length).toBeGreaterThan(0);
        expect(exits.some(i => i.referenceId === 'eca-1')).toBe(false);
        const valideur2 = exits.find(i => i.lieuName === 'Jolimont' && i.equipmentLabel === 'Valideur 2 (Sortie)')!;
        expect(label(valideur2)).toBe('ECA n°02 · Tripode de sortie');
    });

    it('référence non-ECA : libellé d\'équipement inchangé, sans numéro ni zone', () => {
        const dat = index.implantations.find(i => i.moduleName.includes('DAT') || i.equipmentLabel.startsWith('DAT '))!;
        expect(dat.equipmentNumber).toBeUndefined();
        expect(label(dat)).toBe(dat.equipmentLabel);
    });
});
