// tests/moduleAdmin.test.ts
// Fonctions pures (utils/cockpit/moduleAdmin.ts) — pas d'IndexedDB.
// Vérifie R1 (ids techniques), la forme minimale valide de chaque module
// attachable, le CRUD zones/bornes P+R (absent ailleurs dans l'app), et
// (Lot 2d) withEquipmentScopeOverride — strictement limité au champ
// adhesiveIds, ne touche JAMAIS equipment.adhesives.
import { describe, it, expect } from 'vitest';
import {
    createBlankDatModule, createBlankEcaModule, createBlankPrModule,
    createPrZone, withZoneRenamed, createPrEquipment, withEquipmentRenamed, withEquipmentScopeOverride,
} from '../utils/cockpit/moduleAdmin';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { AuditModuleType, EquipmentType, ModeData, EcaData, Pr, Equipment, AdhesiveStatus } from '../types';

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
