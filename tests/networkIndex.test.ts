// tests/networkIndex.test.ts
// =================================================================
// Tests du moteur d'index réseau (commit 3) — le cœur de calcul du
// cockpit. Vérifie le contrat de plateforme :
//  - R10 : la liste des implantations dérive du scope des références
//    (résolveur), jamais des maps de statuts ; clé absente = NotChecked ;
//  - surcharges locales (adhesiveIds), NotApplicable, isDisabled,
//    isFuture, ECA isNotApplicable ;
//  - agrégats « où cette référence est-elle utilisée ? ».
// Fonction pure : aucun IndexedDB nécessaire.
// =================================================================
import { describe, it, expect } from 'vitest';
import {
    buildNetworkIndex, resolveReferencesForEquipment,
} from '../utils/cockpit/networkIndex';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import {
    Lieu, AuditModuleType, AdhesiveStatus, EquipmentType, EcaEquipmentType,
    TransportMode,
} from '../types';

const REFERENCES = buildSignageReferencesSeed();

// ------------------------------------------------------------------
// Fixtures : un mini-réseau représentatif
// ------------------------------------------------------------------

const datLieu = (id: string, name: string, adhesives: { [k: string]: AdhesiveStatus }): Lieu => ({
    id, name,
    modules: [{
        id: `module-dat-${id}`,
        type: AuditModuleType.DAT,
        name: 'DAT',
        line: 'A',
        data: {
            id: `mode-${id}`, name, type: TransportMode.METRO, line: 'A',
            stations: [{
                id: `sta-${id}`, name, directions: [{
                    id: `dir-${id}`, name: 'Salle des billets',
                    dats: [{ id: `dat-${id}`, name: 'DAT 01', adhesives, comment: '' }],
                }],
            }],
        },
    }],
});

const prLieu = (): Lieu => ({
    id: 'lieu-pr', name: 'P+R Test',
    modules: [{
        id: 'module-pr-test',
        type: AuditModuleType.PR,
        name: 'Audit Bornes P+R',
        data: {
            id: 'pr-test', name: 'P+R Test',
            zones: [{
                id: 'zone-1', name: 'Zone Est',
                equipments: [
                    // BE standard : toutes les références BE s'appliquent.
                    { id: 'be01', name: 'BE01', type: EquipmentType.BE, adhesives: { adbe1: AdhesiveStatus.OK }, comment: '' },
                    // BE avec surcharge type Basso Cambo BE11 : adbe3 uniquement.
                    { id: 'be11', name: 'BE11', type: EquipmentType.BE, adhesiveIds: ['adbe3'], adhesives: { adbe3: AdhesiveStatus.ToBeReplaced }, comment: '' },
                    // CA : contient adca8 (isDisabled au référentiel → exclu).
                    { id: 'ca01', name: 'CA01', type: EquipmentType.CA, adhesives: {}, comment: '' },
                ],
            }],
        },
    }],
});

const ecaLieu = (): Lieu => ({
    id: 'lieu-eca', name: 'Station ECA',
    modules: [{
        id: 'module-eca-test',
        type: AuditModuleType.ECA,
        name: 'ECA (Valideurs)',
        line: 'B',
        data: {
            id: 'eca-data-test', stationName: 'Station ECA', stationCode: 'TST',
            ecas: [
                // Sortie : seul eca-11 s'applique (scope sans equipmentTypes).
                { id: 'e1', name: 'Tripode S1', accessPoint: 'Accès Nord', type: EcaEquipmentType.TripodeSortie, number: 1, adhesives: {}, comment: '' },
                // PMR à vantaux : eca-8 (Bagages) est HORS scope ; eca-9 préréglé
                // NotApplicable par la config station → non installé.
                { id: 'e2', name: 'PMR 1', accessPoint: 'Accès Nord', type: EcaEquipmentType.PMRVantaux, number: 2,
                  adhesives: { 'eca-9': AdhesiveStatus.NotApplicable, 'eca-1': AdhesiveStatus.OK }, comment: '' },
                // ECA entier non applicable → ignoré.
                { id: 'e3', name: 'Tripode NA', accessPoint: 'Accès Sud', type: EcaEquipmentType.TripodeSortie, number: 3,
                  isNotApplicable: true, adhesives: {}, comment: '' },
            ],
        },
    }],
});

const futureLieu = (): Lieu => ({
    id: 'lieu-futur', name: 'Station Future',
    modules: [{
        id: 'module-dat-futur', type: AuditModuleType.DAT, name: 'DAT', line: 'B', isFuture: true,
        data: {
            id: 'mode-futur', name: 'Station Future', type: TransportMode.METRO, line: 'B',
            stations: [{
                id: 'sta-futur', name: 'Station Future', directions: [{
                    id: 'dir-futur', name: 'Direction X',
                    dats: [{ id: 'dat-futur', name: 'DAT 01', adhesives: { ad1: AdhesiveStatus.OK }, comment: '' }],
                }],
            }],
        },
    }],
});

// ------------------------------------------------------------------

describe('resolveReferencesForEquipment (R10)', () => {
    it('DAT : les 12 références du scope DAT', () => {
        expect(resolveReferencesForEquipment(REFERENCES, 'DAT')).toHaveLength(12);
    });

    it('P+R BE avec surcharge : liste blanche restrictive', () => {
        const ids = resolveReferencesForEquipment(REFERENCES, 'PR', EquipmentType.BE, ['adbe3']).map(r => r.id);
        expect(ids).toEqual(['adbe3']);
    });

    it('ECA sortie : seul eca-11 (scope famille entière)', () => {
        const ids = resolveReferencesForEquipment(REFERENCES, 'ECA', EcaEquipmentType.TripodeSortie).map(r => r.id);
        expect(ids).toEqual(['eca-11']);
    });

    it('ECA PMR à vantaux : eca-8 (Bagages) exclu par le scope', () => {
        const ids = resolveReferencesForEquipment(REFERENCES, 'ECA', EcaEquipmentType.PMRVantaux).map(r => r.id);
        expect(ids).not.toContain('eca-8');
        expect(ids).toContain('eca-9');
        expect(ids).toContain('eca-5');
    });

    it('isDisabled (adca8) exclu du scope CA', () => {
        const ids = resolveReferencesForEquipment(REFERENCES, 'PR', EquipmentType.CA).map(r => r.id);
        expect(ids).not.toContain('adca8');
        expect(ids).toContain('adca9');
    });
});

describe('buildNetworkIndex', () => {
    it('DAT : 12 implantations par DAT, clé absente = Non contrôlé (R10)', () => {
        const lieux = [datLieu('l1', 'Station Un', { ad1: AdhesiveStatus.OK, ad3: AdhesiveStatus.ToBeReplaced })];
        const index = buildNetworkIndex(lieux, REFERENCES);

        expect(index.totals.implantationCount).toBe(12);
        expect(index.totals.okCount).toBe(1);
        expect(index.totals.toReplaceCount).toBe(1);
        expect(index.totals.uncheckedCount).toBe(10); // 10 clés absentes → NotChecked
        expect(index.totals.defectCount).toBe(1);
    });

    it('P+R : surcharge locale respectée + isDisabled exclu', () => {
        const index = buildNetworkIndex([prLieu()], REFERENCES);

        // BE01 : 4 références BE ; BE11 : 1 seule (surcharge) ; CA01 : 5 (6 CA - adca8 disabled).
        const be01 = index.implantations.filter(i => i.equipmentLabel === 'BE01');
        const be11 = index.implantations.filter(i => i.equipmentLabel === 'BE11');
        const ca01 = index.implantations.filter(i => i.equipmentLabel === 'CA01');
        expect(be01).toHaveLength(4);
        expect(be11).toHaveLength(1);
        expect(be11[0].referenceId).toBe('adbe3');
        expect(be11[0].status).toBe(AdhesiveStatus.ToBeReplaced);
        expect(ca01).toHaveLength(5);
        expect(ca01.map(i => i.referenceId)).not.toContain('adca8');
        // Ligne P+R et contexte zone présents sur chaque implantation.
        expect(be01[0].line).toBe('P+R');
        expect(be01[0].context).toBe('Zone Est');
    });

    it('ECA : scope sortie, NotApplicable non installé, ECA isNotApplicable ignoré', () => {
        const index = buildNetworkIndex([ecaLieu()], REFERENCES);

        const tripode = index.implantations.filter(i => i.equipmentLabel === 'Tripode S1');
        expect(tripode.map(i => i.referenceId)).toEqual(['eca-11']);

        const pmr = index.implantations.filter(i => i.equipmentLabel === 'PMR 1');
        const pmrIds = pmr.map(i => i.referenceId);
        expect(pmrIds).not.toContain('eca-9');  // NotApplicable → non installé ici
        expect(pmrIds).not.toContain('eca-8');  // hors scope PMRVantaux
        expect(pmrIds).toContain('eca-1');       // OK constaté

        // L'ECA entier isNotApplicable ne produit aucune implantation.
        expect(index.implantations.some(i => i.equipmentLabel === 'Tripode NA')).toBe(false);
    });

    it('module isFuture (hors C/AEROPORT) ignoré', () => {
        const index = buildNetworkIndex([futureLieu()], REFERENCES);
        expect(index.totals.implantationCount).toBe(0);
    });

    it("« où cette référence est-elle utilisée ? » : agrégats par référence", () => {
        const lieux = [
            datLieu('l1', 'Jean-Jaurès', { ad3: AdhesiveStatus.ToBeReplaced }),
            datLieu('l2', 'Capitole', { ad3: AdhesiveStatus.OK }),
            prLieu(),
        ];
        const index = buildNetworkIndex(lieux, REFERENCES);

        const ad3 = index.byReference.get('ad3')!;
        expect(ad3.installedCount).toBe(2);       // 1 DAT par lieu
        expect(ad3.okCount).toBe(1);
        expect(ad3.toReplaceCount).toBe(1);
        expect(ad3.defectCount).toBe(1);
        expect(ad3.lieuCount).toBe(2);
        expect(ad3.lines).toEqual(['A']);
        // Tri byLieu : le lieu avec défauts en premier.
        expect(ad3.byLieu[0].lieuName).toBe('Jean-Jaurès');
        expect(ad3.byLieu[0].defects).toBe(1);

        const adbe3 = index.byReference.get('adbe3')!;
        expect(adbe3.installedCount).toBe(2);     // BE01 (standard) + BE11 (surcharge)
        expect(adbe3.equipmentTypes).toEqual(['BE']);
        expect(adbe3.lines).toEqual(['P+R']);

        expect(index.totals.referencesInstalledCount).toBe(index.byReference.size);
    });

    it('réseau vide → index vide cohérent', () => {
        const index = buildNetworkIndex([], REFERENCES);
        expect(index.implantations).toHaveLength(0);
        expect(index.totals.implantationCount).toBe(0);
        expect(index.byReference.size).toBe(0);
    });
});
