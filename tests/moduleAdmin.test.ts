// tests/moduleAdmin.test.ts
// Fonctions pures (utils/cockpit/moduleAdmin.ts) — pas d'IndexedDB.
// Vérifie R1 (ids techniques), la forme minimale valide de chaque module
// attachable, le CRUD zones/bornes P+R (absent ailleurs dans l'app), et
// (Lot 2d) withEquipmentScopeOverride — strictement limité au champ
// adhesiveIds, ne touche JAMAIS equipment.adhesives.
import { describe, it, expect } from 'vitest';
import {
    createBlankDatModule, createBlankEcaModule, createBlankPrModule,
    createBlankPmrFloorModule, createBlankCognitivePictogramModule, createBlankSignaletiqueModule,
    createBlankCustomModule, isModuleBlank, isCustomAuditAttachable,
    createPrZone, withZoneRenamed, createPrEquipment, withEquipmentRenamed, withEquipmentScopeOverride,
} from '../utils/cockpit/moduleAdmin';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import {
    AuditModuleType, EquipmentType, ModeData, EcaData, Pr, Equipment, AdhesiveStatus,
    PMRFloorAdhesiveData, CognitivePictogramData, CustomAuditData, FloorAdhesiveStatus,
} from '../types';

const REFERENCES = buildSignageReferencesSeed();

describe('createBlankDatModule', () => {
    it('produit un module DAT minimal valide : une station, une direction, aucun DAT', () => {
        const module = createBlankDatModule('Nouvelle Station', 'A');
        expect(module.type).toBe(AuditModuleType.DAT);
        expect(module.line).toBe('A');
        const data = module.data as ModeData;
        expect(data.stations).toHaveLength(1);
        expect(data.stations[0].name).toBe('Nouvelle Station');
        expect(data.stations[0].directions).toHaveLength(1);
        expect(data.stations[0].directions[0].dats).toEqual([]);
    });

    it('génère des ids techniques distincts à chaque appel', () => {
        const a = createBlankDatModule('X', 'A');
        const b = createBlankDatModule('X', 'A');
        expect(a.id).not.toBe(b.id);
        expect((a.data as ModeData).stations[0].id).not.toBe((b.data as ModeData).stations[0].id);
    });

    it('rejette un nom de station vide', () => {
        expect(() => createBlankDatModule('  ', 'A')).toThrow();
    });
});

describe('createBlankEcaModule', () => {
    it('produit un module ECA minimal valide, sans valideur initial', () => {
        const module = createBlankEcaModule('Nouvelle Station', 'B');
        expect(module.type).toBe(AuditModuleType.ECA);
        expect(module.line).toBe('B');
        expect((module.data as EcaData).ecas).toEqual([]);
        expect((module.data as EcaData).stationName).toBe('Nouvelle Station');
    });
});

describe('createBlankPrModule', () => {
    it('produit un module P+R minimal valide, sans zone initiale', () => {
        const module = createBlankPrModule('Nouvelle Station');
        expect(module.type).toBe(AuditModuleType.PR);
        expect((module.data as Pr).zones).toEqual([]);
    });
});

describe('createPrZone / withZoneRenamed', () => {
    it('génère un id technique et démarre sans équipement', () => {
        const zone = createPrZone('Zone Est');
        expect(zone.name).toBe('Zone Est');
        expect(zone.equipments).toEqual([]);
        expect(zone.id).toBeTruthy();
    });

    it('renommer conserve le même id', () => {
        const zone = createPrZone('Zone Est');
        const renamed = withZoneRenamed(zone, 'Zone Ouest');
        expect(renamed.id).toBe(zone.id);
        expect(renamed.name).toBe('Zone Ouest');
    });

    it('rejette un nom vide', () => {
        expect(() => createPrZone('  ')).toThrow();
        const zone = createPrZone('Zone Est');
        expect(() => withZoneRenamed(zone, '')).toThrow();
    });
});

describe('createPrEquipment — statuts initiaux dérivés du référentiel EFFECTIF', () => {
    it('initialise adhesives avec toutes les références effectives du type, à NotChecked', () => {
        const equipment = createPrEquipment('BE01', EquipmentType.BE, REFERENCES);
        expect(Object.keys(equipment.adhesives).length).toBeGreaterThan(0);
        expect(Object.values(equipment.adhesives).every(s => s === AdhesiveStatus.NotChecked)).toBe(true);
    });

    it('une référence Admin ajoutée au référentiel est immédiatement prise en compte (pas seulement le catalogue statique)', () => {
        const extraRef = {
            id: 'admin-extra-be', name: 'Extra BE', auditType: 'PR' as const,
            scope: { auditType: 'PR' as const, equipmentTypes: [EquipmentType.BE] },
            version: 1, support: 'adhesif' as const, placement: {},
        };
        const equipment = createPrEquipment('BE02', EquipmentType.BE, [...REFERENCES, extraRef]);
        expect(equipment.adhesives['admin-extra-be']).toBe(AdhesiveStatus.NotChecked);
    });

    it('rejette un nom vide', () => {
        expect(() => createPrEquipment('  ', EquipmentType.BE, REFERENCES)).toThrow();
    });
});

describe('withEquipmentRenamed', () => {
    it('conserve id/type/adhesives, change uniquement le nom', () => {
        const equipment = createPrEquipment('BE01', EquipmentType.BE, REFERENCES);
        const renamed = withEquipmentRenamed(equipment, 'BE01 bis');
        expect(renamed.id).toBe(equipment.id);
        expect(renamed.adhesives).toBe(equipment.adhesives);
        expect(renamed.name).toBe('BE01 bis');
    });
});

describe('withEquipmentScopeOverride — Lot 2d : ne touche JAMAIS equipment.adhesives', () => {
    const baseEquipment: Equipment = {
        id: 'eq-1', name: 'BE01', type: EquipmentType.BE,
        adhesives: { adbe1: AdhesiveStatus.OK, adbe3: AdhesiveStatus.ToBeReplaced },
        comment: '',
    };

    it('définit une surcharge adhesiveIds sans modifier adhesives (statuts déjà saisis préservés)', () => {
        const updated = withEquipmentScopeOverride(baseEquipment, ['adbe3']);
        expect(updated.adhesiveIds).toEqual(['adbe3']);
        expect(updated.adhesives).toBe(baseEquipment.adhesives);
        expect(updated.adhesives.adbe1).toBe(AdhesiveStatus.OK); // statut conservé même si adbe1 sort du périmètre
    });

    it('adhesiveIds undefined → supprime le champ (retour au périmètre standard), sans toucher adhesives', () => {
        const withOverride = withEquipmentScopeOverride(baseEquipment, ['adbe3']);
        const reverted = withEquipmentScopeOverride(withOverride, undefined);
        expect('adhesiveIds' in reverted).toBe(false);
        expect(reverted.adhesives).toBe(baseEquipment.adhesives);
    });

    it('adhesiveIds vide ([]) est normalisé comme undefined (retour au standard, pas un état "0 référence")', () => {
        const reverted = withEquipmentScopeOverride(baseEquipment, []);
        expect('adhesiveIds' in reverted).toBe(false);
    });

    it('ne mute jamais l\'équipement original', () => {
        withEquipmentScopeOverride(baseEquipment, ['adbe3']);
        expect(baseEquipment.adhesiveIds).toBeUndefined();
    });
});

describe('createBlankCustomModule (Partie 2 — audits configurables)', () => {
    it('produit un module CUSTOM minimal : occurrences vide, jamais vérifié, aucune donnée physique', () => {
        const module = createBlankCustomModule('Nouvelle Station', 'A', 'def-pdq', 'Plans de quartier');
        expect(module.type).toBe(AuditModuleType.CUSTOM);
        expect(module.name).toBe('Plans de quartier'); // dénormalisé au nom de la définition à l'instant T
        expect(module.line).toBe('A');
        const data = module.data as CustomAuditData;
        expect(data.definitionId).toBe('def-pdq');
        expect(data.stationName).toBe('Nouvelle Station');
        expect(data.occurrences).toEqual([]);
        expect(data.lastCheckedAt).toBeUndefined();
    });

    it('rejette un nom de station vide', () => {
        expect(() => createBlankCustomModule('  ', 'A', 'def-pdq', 'X')).toThrow();
    });
});

describe('isCustomAuditAttachable', () => {
    it('vrai si aucun module CUSTOM de cette définition n\'existe déjà sur la station', () => {
        expect(isCustomAuditAttachable([], 'def-pdq')).toBe(true);
    });

    it('faux si un module CUSTOM de la MÊME définition existe déjà', () => {
        const module = createBlankCustomModule('S', 'A', 'def-pdq', 'X');
        expect(isCustomAuditAttachable([module], 'def-pdq')).toBe(false);
    });

    it('vrai pour une définition DIFFÉRENTE — deux audits configurables coexistent sans conflit', () => {
        const module = createBlankCustomModule('S', 'A', 'def-pdq', 'X');
        expect(isCustomAuditAttachable([module], 'def-autre')).toBe(true);
    });
});

describe('isModuleBlank — règle du détachement (Partie 2) : jamais de perte silencieuse', () => {
    it('DAT : vide sans DAT saisi, non vide dès qu\'un DAT existe', () => {
        const blank = createBlankDatModule('S', 'A');
        expect(isModuleBlank(blank)).toBe(true);
        const withDat: typeof blank = { ...blank, data: { ...(blank.data as ModeData), stations: [{ ...(blank.data as ModeData).stations[0], directions: [{ ...(blank.data as ModeData).stations[0].directions[0], dats: [{ id: 'd1', name: 'DAT 01', adhesives: {}, comment: '' }] }] }] } };
        expect(isModuleBlank(withDat)).toBe(false);
    });

    it('ECA : vide sans valideur, non vide dès qu\'un ECA existe', () => {
        const blank = createBlankEcaModule('S', 'A');
        expect(isModuleBlank(blank)).toBe(true);
        const withEca: typeof blank = { ...blank, data: { ...(blank.data as EcaData), ecas: [{ id: 'e1', name: 'V1', accessPoint: 'A', type: 'Tripode d\'entrée' as any, number: 1, adhesives: {}, comment: '' }] } };
        expect(isModuleBlank(withEca)).toBe(false);
    });

    it('P+R : vide sans zone, non vide dès qu\'une zone existe', () => {
        const blank = createBlankPrModule('S');
        expect(isModuleBlank(blank)).toBe(true);
        const withZone: typeof blank = { ...blank, data: { ...(blank.data as Pr), zones: [createPrZone('Zone 1')] } };
        expect(isModuleBlank(withZone)).toBe(false);
    });

    it('PMR au sol : vide tant que NotChecked sans photo/commentaire, non vide dès qu\'un statut est saisi', () => {
        const blank = createBlankPmrFloorModule('S', 'A');
        expect(isModuleBlank(blank)).toBe(true);
        const data = blank.data as PMRFloorAdhesiveData;
        const withStatus = { ...blank, data: { ...data, adhesives: [{ ...data.adhesives[0], status: FloorAdhesiveStatus.OK }] } };
        expect(isModuleBlank(withStatus)).toBe(false);
        const withComment = { ...blank, data: { ...data, comment: 'Vu sur place' } };
        expect(isModuleBlank(withComment)).toBe(false);
    });

    it('Pictogrammes cognitifs : vide sans pictogramme, non vide dès qu\'un pictogramme existe', () => {
        const blank = createBlankCognitivePictogramModule('S', 'A');
        expect(isModuleBlank(blank)).toBe(true);
        const withPicto: typeof blank = { ...blank, data: { ...(blank.data as CognitivePictogramData), pictograms: [{ id: 'p1', accessPointName: 'Accès', status: FloorAdhesiveStatus.NotChecked }] } };
        expect(isModuleBlank(withPicto)).toBe(false);
    });

    it('Signalétique : vide à la création (état identique à getInitialSignaletiqueData), non vide dès qu\'un champ change', () => {
        const blank = createBlankSignaletiqueModule('S', 'TRAM');
        expect(isModuleBlank(blank)).toBe(true);
        const data = blank.data as ModeData;
        const station = data.stations[0];
        const touched = { ...blank, data: { ...data, stations: [{ ...station, signaletique: { ...station.signaletique!, totem: { ...station.signaletique!.totem, direction1: { ...station.signaletique!.totem.direction1, status: 'OK' as any } } } }] } };
        expect(isModuleBlank(touched)).toBe(false);
    });

    it('CUSTOM : vide tant qu\'aucune occurrence, aucun commentaire, jamais vérifié — non vide dès qu\'un de ces trois change', () => {
        const blank = createBlankCustomModule('S', 'A', 'def-pdq', 'X');
        expect(isModuleBlank(blank)).toBe(true);
        const data = blank.data as CustomAuditData;
        const withOccurrence = { ...blank, data: { ...data, occurrences: [{ id: 'occ-1', referenceId: 'ref-1', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z' }] } };
        expect(isModuleBlank(withOccurrence)).toBe(false);
        const withComment = { ...blank, data: { ...data, comment: 'Vu' } };
        expect(isModuleBlank(withComment)).toBe(false);
        // « Vérifié, rien trouvé » EST une donnée réelle — jamais détachable silencieusement.
        const withLastChecked = { ...blank, data: { ...data, lastCheckedAt: '2026-01-01T00:00:00.000Z' } };
        expect(isModuleBlank(withLastChecked)).toBe(false);
    });
});
