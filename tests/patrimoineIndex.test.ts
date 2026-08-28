// tests/patrimoineIndex.test.ts
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
    buildPatrimoineIndex, resolveReferencesForEquipment,
} from '../utils/cockpit/patrimoineIndex';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import {
    Lieu, AuditModuleType, AdhesiveStatus, EquipmentType, EcaEquipmentType,
    TransportMode, CustomAuditOccurrence,
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
        id: 'module-dat-futur', type: AuditModuleType.DAT, name: 'DAT', line: 'A', isFuture: true,
        data: {
            id: 'mode-futur', name: 'Station Future', type: TransportMode.METRO, line: 'A',
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

describe('buildPatrimoineIndex', () => {
    it('DAT : 12 implantations par DAT, clé absente = Non contrôlé (R10)', () => {
        const lieux = [datLieu('l1', 'Station Un', { ad1: AdhesiveStatus.OK, ad3: AdhesiveStatus.ToBeReplaced })];
        const index = buildPatrimoineIndex(lieux, REFERENCES);

        expect(index.totals.implantationCount).toBe(12);
        expect(index.totals.okCount).toBe(1);
        expect(index.totals.toReplaceCount).toBe(1);
        expect(index.totals.uncheckedCount).toBe(10); // 10 clés absentes → NotChecked
        expect(index.totals.defectCount).toBe(1);
    });

    it('P+R : surcharge locale respectée + isDisabled exclu', () => {
        const index = buildPatrimoineIndex([prLieu()], REFERENCES);

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
        const index = buildPatrimoineIndex([ecaLieu()], REFERENCES);

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

    it('module isFuture (hors B/C/AEROPORT) ignoré', () => {
        const index = buildPatrimoineIndex([futureLieu()], REFERENCES);
        expect(index.totals.implantationCount).toBe(0);
    });

    it('Lot 0 : module isFuture sur la Ligne B reste dans le périmètre (extension de l\'exception C/AEROPORT)', () => {
        const futureLieuB: Lieu = {
            ...futureLieu(),
            modules: [{ ...futureLieu().modules[0], line: 'B' }],
        };
        const index = buildPatrimoineIndex([futureLieuB], REFERENCES);
        expect(index.totals.implantationCount).toBeGreaterThan(0);
    });

    it("Lot 2a : resolveReferencesForEquipment exclut une référence archivée (archivedAt), même si elle est dans le scope", () => {
        const baseline = resolveReferencesForEquipment(REFERENCES, 'PR', EquipmentType.BE);
        expect(baseline.length).toBeGreaterThan(0);
        const target = baseline[0];
        const withArchived = REFERENCES.map(r => r.id === target.id ? { ...r, archivedAt: '2026-01-01T00:00:00.000Z' } : r);
        const resolved = resolveReferencesForEquipment(withArchived, 'PR', EquipmentType.BE);
        expect(resolved.some(r => r.id === target.id)).toBe(false);
        expect(resolved.length).toBe(baseline.length - 1);
    });

    it("« où cette référence est-elle utilisée ? » : agrégats par référence", () => {
        const lieux = [
            datLieu('l1', 'Jean-Jaurès', { ad3: AdhesiveStatus.ToBeReplaced }),
            datLieu('l2', 'Capitole', { ad3: AdhesiveStatus.OK }),
            prLieu(),
        ];
        const index = buildPatrimoineIndex(lieux, REFERENCES);

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
        // byLine : les deux DAT sont sur la ligne A (fixture datLieu).
        expect(ad3.byLine).toEqual([{ line: 'A', installed: 2, defects: 1 }]);

        const adbe3 = index.byReference.get('adbe3')!;
        expect(adbe3.installedCount).toBe(2);     // BE01 (standard) + BE11 (surcharge)
        expect(adbe3.equipmentTypes).toEqual(['BE']);
        expect(adbe3.lines).toEqual(['P+R']);

        expect(index.totals.referencesInstalledCount).toBe(index.byReference.size);
    });

    it('réseau vide → index vide cohérent', () => {
        const index = buildPatrimoineIndex([], REFERENCES);
        expect(index.implantations).toHaveLength(0);
        expect(index.totals.implantationCount).toBe(0);
        expect(index.byReference.size).toBe(0);
        expect(index.bySupport.size).toBe(0);
        expect(index.byLine.size).toBe(0);
    });

    it('dimensions patrimoine : « combien par support ? »', () => {
        // Un DAT (12 refs adhésif, dont ad8 reclassé adhésif) + un ECA PMRVantaux
        // (contient eca-3 → vitrophanie).
        const lieux = [
            datLieu('l1', 'Station Un', {}),
            ecaLieu(),
        ];
        const index = buildPatrimoineIndex(lieux, REFERENCES);

        const adhesif = index.bySupport.get('adhesif')!;
        const vitro = index.bySupport.get('vitrophanie');
        // eca-3 est dans le scope PMRVantaux → 1 vitrophanie implantée.
        expect(vitro?.installed).toBe(1);
        expect(adhesif.installed).toBeGreaterThan(12); // 12 DAT + refs ECA adhésif
        // Cohérence globale : la somme des supports = total des implantations.
        let sum = 0;
        index.bySupport.forEach(c => { sum += c.installed; });
        expect(sum).toBe(index.totals.implantationCount);
    });

    it('dimensions patrimoine : « combien par ligne ? »', () => {
        const lieux = [
            datLieu('l1', 'Station Un', { ad1: AdhesiveStatus.ToBeReplaced }),   // ligne A
            prLieu(),                                                            // P+R
            ecaLieu(),                                                           // ligne B
        ];
        const index = buildPatrimoineIndex(lieux, REFERENCES);

        expect(index.byLine.get('A')?.installed).toBe(12);
        expect(index.byLine.get('A')?.defects).toBe(1);
        expect(index.byLine.get('P+R')?.installed).toBe(4 + 1 + 5); // BE01 + BE11 + CA01
        expect(index.byLine.get('B')?.installed).toBeGreaterThan(0);
        // Cohérence : somme des lignes = total.
        let sum = 0;
        index.byLine.forEach(c => { sum += c.installed; });
        expect(sum).toBe(index.totals.implantationCount);
    });
});

// ------------------------------------------------------------------
// Partie 2 — audits configurables (type CUSTOM)
// ------------------------------------------------------------------
describe('buildPatrimoineIndex — module CUSTOM (audits configurables)', () => {
    const DEF_ID = 'def-pdq';
    const CUSTOM_REFS = [
        { id: 'pdq-100-adh', name: 'PdQ 80x100 adhésif', auditType: 'CUSTOM' as const, scope: { auditType: 'CUSTOM' as const, definitionId: DEF_ID }, version: 1, support: 'adhesif' as const, placement: {} },
        { id: 'pdq-100-pla', name: 'PdQ 80x100 plastifié', auditType: 'CUSTOM' as const, scope: { auditType: 'CUSTOM' as const, definitionId: DEF_ID }, version: 1, support: 'pvc' as const, placement: {} },
        // Référence d'une AUTRE définition — ne doit jamais se mélanger.
        { id: 'other-def-ref', name: 'Autre audit', auditType: 'CUSTOM' as const, scope: { auditType: 'CUSTOM' as const, definitionId: 'def-autre' }, version: 1, support: 'adhesif' as const, placement: {} },
        // Référence archivée — ne doit jamais apparaître.
        { id: 'pdq-archived', name: 'PdQ archivée', auditType: 'CUSTOM' as const, scope: { auditType: 'CUSTOM' as const, definitionId: DEF_ID }, version: 1, support: 'adhesif' as const, placement: {}, archivedAt: '2026-01-01T00:00:00.000Z' },
    ];

    let occCounter = 0;
    const occ = (referenceId: string, status: AdhesiveStatus, location?: string): CustomAuditOccurrence => ({
        id: `occ-${++occCounter}`, referenceId, status, location, constatedAt: '2026-01-01T00:00:00.000Z',
    });

    const customLieu = (id: string, occurrences: CustomAuditOccurrence[]): Lieu => ({
        id, name: `Station ${id}`,
        modules: [{
            id: `module-custom-${id}`,
            type: AuditModuleType.CUSTOM,
            name: 'Plans de quartier',
            line: 'A',
            data: {
                id: `custom-${id}`, definitionId: DEF_ID, stationName: `Station ${id}`, stationCode: '',
                occurrences, comment: '',
            },
        }],
    });

    it('une occurrence marquée OK est comptée, une occurrence NotApplicable ne l\'est pas', () => {
        const lieux = [customLieu('c1', [occ('pdq-100-adh', AdhesiveStatus.OK), occ('pdq-100-pla', AdhesiveStatus.NotApplicable)])];
        const index = buildPatrimoineIndex(lieux, REFERENCES.concat(CUSTOM_REFS));

        expect(index.byReference.get('pdq-100-adh')?.installedCount).toBe(1);
        expect(index.byReference.get('pdq-100-pla')).toBeUndefined(); // NotApplicable → jamais une implantation
    });

    it('une référence CUSTOM archivée n\'est jamais résolue, même avec une occurrence recensée', () => {
        const lieux = [customLieu('c1', [occ('pdq-archived', AdhesiveStatus.OK)])];
        const index = buildPatrimoineIndex(lieux, REFERENCES.concat(CUSTOM_REFS));
        expect(index.byReference.get('pdq-archived')).toBeUndefined();
        // L'occurrence reste intacte dans la donnée source (jamais supprimée) —
        // seule sa résolution dans le patrimoine disparaît.
        expect((lieux[0].modules[0].data as any).occurrences[0].status).toBe(AdhesiveStatus.OK);
    });

    it('les références de DEUX définitions différentes ne se mélangent jamais', () => {
        const lieux = [customLieu('c1', [occ('pdq-100-adh', AdhesiveStatus.OK), occ('other-def-ref', AdhesiveStatus.OK)])];
        const index = buildPatrimoineIndex(lieux, REFERENCES.concat(CUSTOM_REFS));

        // other-def-ref n'appartient pas à DEF_ID : le module ne peut pas le
        // faire apparaître même si une occurrence existe sous cet id.
        expect(index.byReference.get('pdq-100-adh')?.installedCount).toBe(1);
        expect(index.byReference.get('other-def-ref')).toBeUndefined();
    });

    it('agrège correctement sur plusieurs stations (chaque occurrence explicitement constatée, cas terrain réel)', () => {
        const lieux = [
            customLieu('c1', [occ('pdq-100-adh', AdhesiveStatus.OK), occ('pdq-100-pla', AdhesiveStatus.NotApplicable)]),
            customLieu('c2', [occ('pdq-100-adh', AdhesiveStatus.ToBeReplaced), occ('pdq-100-pla', AdhesiveStatus.NotApplicable)]),
            customLieu('c3', [occ('pdq-100-adh', AdhesiveStatus.NotApplicable), occ('pdq-100-pla', AdhesiveStatus.OK)]),
        ];
        const index = buildPatrimoineIndex(lieux, REFERENCES.concat(CUSTOM_REFS));

        expect(index.byReference.get('pdq-100-adh')?.installedCount).toBe(2); // c1 + c2, pas c3 (NotApplicable)
        expect(index.byReference.get('pdq-100-adh')?.defectCount).toBe(1);
        expect(index.byReference.get('pdq-100-pla')?.installedCount).toBe(1); // c3 seulement
    });

    it('plusieurs occurrences de la même référence sur la même station comptent chacune comme une implantation distincte, avec leur propre emplacement', () => {
        const lieux = [customLieu('jean-jaures', [
            occ('pdq-100-adh', AdhesiveStatus.OK, 'Entrée rue X'),
            occ('pdq-100-adh', AdhesiveStatus.ToBeReplaced, 'Quai 1'),
        ])];
        const index = buildPatrimoineIndex(lieux, REFERENCES.concat(CUSTOM_REFS));

        expect(index.byReference.get('pdq-100-adh')?.installedCount).toBe(2);
        expect(index.byReference.get('pdq-100-adh')?.defectCount).toBe(1);
        const implantations = index.implantations.filter(i => i.referenceId === 'pdq-100-adh');
        expect(implantations.map(i => i.context).sort()).toEqual(['Entrée rue X', 'Quai 1']);
    });

    it('un module fraîchement propagé (occurrences: [], rien recensé) ne produit AUCUNE implantation — contrairement à DAT/PR/ECA, aucun nombre d\'occurrences n\'est présupposé par référence', () => {
        // Différence assumée avec DAT/PR/ECA (R10, cf. en-tête de ce fichier) :
        // ceux-ci ont un nombre de slots structurellement connu par
        // équipement (donc « Non contrôlé » tant que non audité). Un audit
        // configurable n'a AUCUN nombre d'occurrences présupposé par
        // référence — c'est justement ce que le relevé terrain découvre —
        // donc 0 occurrence = 0 implantation, jamais une implantation
        // fantôme « Non contrôlé » par référence résolvable.
        const lieux = [customLieu('c1', [])];
        const index = buildPatrimoineIndex(lieux, REFERENCES.concat(CUSTOM_REFS));
        expect(index.totals.implantationCount).toBe(0);
        expect(index.byReference.get('pdq-100-adh')).toBeUndefined();
        expect(index.byReference.get('pdq-100-pla')).toBeUndefined();
    });

    it('n\'affecte STRICTEMENT AUCUNE implantation DAT/PR/ECA existante (non-régression)', () => {
        const lieux = [
            datLieu('l1', 'Station Un', { ad1: AdhesiveStatus.OK }),
            customLieu('c1', [occ('pdq-100-adh', AdhesiveStatus.OK), occ('pdq-100-pla', AdhesiveStatus.NotApplicable)]),
        ];
        const withoutCustom = buildPatrimoineIndex([datLieu('l1', 'Station Un', { ad1: AdhesiveStatus.OK })], REFERENCES);
        const withCustom = buildPatrimoineIndex(lieux, REFERENCES.concat(CUSTOM_REFS));

        expect(withCustom.byReference.get('ad1')?.installedCount).toBe(withoutCustom.byReference.get('ad1')?.installedCount);
        expect(withCustom.totals.implantationCount).toBe(withoutCustom.totals.implantationCount + 1); // + pdq-100-adh (pla est NotApplicable)
    });
});
