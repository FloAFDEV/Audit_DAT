// tests/ecaEditTypes.test.ts — types proposés dans la fenêtre d'édition ECA.
import { describe, it, expect } from 'vitest';
import { EDITABLE_ECA_TYPES, getSelectableEcaTypes } from '../components/EcaEditModal';
import { EcaEquipmentType } from '../types';

describe('fenêtre d\'édition ECA — types proposés', () => {
    it('tripode d\'entrée / de sortie, PMR à bras / à vantaux uniquement', () => {
        expect(EDITABLE_ECA_TYPES).toEqual([
            EcaEquipmentType.TripodeEntree, EcaEquipmentType.TripodeSortie,
            EcaEquipmentType.PMRBras, EcaEquipmentType.PMRVantaux,
        ]);
        expect(getSelectableEcaTypes()).toEqual(EDITABLE_ECA_TYPES);
        expect(getSelectableEcaTypes(EcaEquipmentType.TripodeSortie)).toEqual(EDITABLE_ECA_TYPES);
    });

    it('le type actuel d\'un ECA existant hors liste reste proposé (jamais changé à l\'insu)', () => {
        for (const t of [EcaEquipmentType.VantauxEntree, EcaEquipmentType.VantauxSortie, EcaEquipmentType.VantauxReversible, EcaEquipmentType.PMRVantauxReversible]) {
            expect(getSelectableEcaTypes(t)).toEqual([...EDITABLE_ECA_TYPES, t]);
        }
    });
});
