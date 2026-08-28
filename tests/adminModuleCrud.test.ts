// tests/adminModuleCrud.test.ts
// =================================================================
// Intégration store.ts — attacher un module, CRUD zones/bornes P+R
// (Lot 2c), et surcharge de périmètre adhesiveIds d'une borne existante
// (Lot 2d). Vérifie le garde-fou isAdminUnlocked, la persistance Dexie
// réelle, et — point crucial du Lot 2d — que setPrEquipmentScopeAdmin
// ne touche JAMAIS equipment.adhesives (aucune perte silencieuse de
// statut d'audit déjà saisi).
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { AuditModuleType, AdhesiveStatus, EquipmentType, Lieu, Pr } from '../types';

const SEED = buildSignageReferencesSeed();

const seededStation = (): Lieu => ({ id: 'lieu-module-crud', name: 'Station Module CRUD', modules: [] });

const seededPrStation = (): Lieu => ({
    id: 'lieu-pr-crud', name: 'Station P+R CRUD',
    modules: [{
        id: 'module-pr-1', type: AuditModuleType.PR, name: 'Audit Bornes P+R',
        data: {
            id: 'pr-1', name: 'Station P+R CRUD',
            zones: [{
                id: 'zone-1', name: 'Zone Est',
                equipments: [{
                    id: 'eq-1', name: 'BE01', type: EquipmentType.BE,
                    adhesives: { adbe1: AdhesiveStatus.OK, adbe3: AdhesiveStatus.ToBeReplaced },
                    comment: '',
                }],
            }],
        } as Pr,
    }],
});

beforeEach(async () => {
    await db.lieux.clear();
    await db.events.clear();
    useAuditStore.setState({ lieux: [], signageReferences: SEED, isAdminUnlocked: false });
});

describe('Garde-fou isAdminUnlocked', () => {
    it('attachModuleAdmin / createPrZoneAdmin / setPrEquipmentScopeAdmin refusent si non déverrouillé', async () => {
        const lieu = seededPrStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu] });

        await expect(useAuditStore.getState().attachModuleAdmin(lieu.id, 'DAT', 'A')).rejects.toThrow(/Admin refusée/);
        await expect(useAuditStore.getState().createPrZoneAdmin(lieu.id, 'module-pr-1', 'Zone Ouest')).rejects.toThrow(/Admin refusée/);
        await expect(useAuditStore.getState().setPrEquipmentScopeAdmin(lieu.id, 'module-pr-1', 'zone-1', 'eq-1', ['adbe1'])).rejects.toThrow(/Admin refusée/);
    });
});

describe('attachModuleAdmin', () => {
    it('attache un module DAT minimal (station+direction, sans DAT), persiste en base', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const created = await useAuditStore.getState().attachModuleAdmin(lieu.id, 'DAT', 'A');

        expect(created.type).toBe(AuditModuleType.DAT);
        const stored = await db.lieux.get(lieu.id);
        expect(stored!.modules).toHaveLength(1);
        expect(stored!.modules[0].id).toBe(created.id);
    });

    it('attache un module P+R sans ligne requise, sans zone initiale', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const created = await useAuditStore.getState().attachModuleAdmin(lieu.id, 'PR');
        expect((created.data as Pr).zones).toEqual([]);
    });

    it('exige une ligne pour DAT/ECA', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await expect(useAuditStore.getState().attachModuleAdmin(lieu.id, 'DAT')).rejects.toThrow(/ligne/);
    });
});

describe('createPrZoneAdmin / renamePrZoneAdmin / removePrZoneAdmin', () => {
    it('ajoute une zone, persistée en base', async () => {
        const lieu = seededPrStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const zone = await useAuditStore.getState().createPrZoneAdmin(lieu.id, 'module-pr-1', 'Zone Ouest');

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as Pr).zones.map(z => z.id)).toContain(zone.id);
    });

    it('renomme une zone existante sans toucher aux autres', async () => {
        const lieu = seededPrStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().renamePrZoneAdmin(lieu.id, 'module-pr-1', 'zone-1', 'Zone Renommée');

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as Pr).zones[0].name).toBe('Zone Renommée');
        expect((stored!.modules[0].data as Pr).zones[0].equipments).toHaveLength(1);
    });

    it('supprime une zone (et ses équipements avec elle)', async () => {
        const lieu = seededPrStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().removePrZoneAdmin(lieu.id, 'module-pr-1', 'zone-1');

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as Pr).zones).toEqual([]);
    });
});

describe('createPrEquipmentAdmin / renamePrEquipmentAdmin / removePrEquipmentAdmin', () => {
    it('ajoute une borne avec des statuts initiaux dérivés du référentiel effectif', async () => {
        const lieu = seededPrStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const equipment = await useAuditStore.getState().createPrEquipmentAdmin(lieu.id, 'module-pr-1', 'zone-1', 'BE02', EquipmentType.BE);

        expect(Object.keys(equipment.adhesives).length).toBeGreaterThan(0);
        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as Pr).zones[0].equipments).toHaveLength(2);
    });

    it('renomme une borne sans toucher ses statuts', async () => {
        const lieu = seededPrStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().renamePrEquipmentAdmin(lieu.id, 'module-pr-1', 'zone-1', 'eq-1', 'BE01 bis');

        const stored = await db.lieux.get(lieu.id);
        const eq = (stored!.modules[0].data as Pr).zones[0].equipments[0];
        expect(eq.name).toBe('BE01 bis');
        expect(eq.adhesives).toEqual({ adbe1: AdhesiveStatus.OK, adbe3: AdhesiveStatus.ToBeReplaced });
    });

    it('supprime une borne', async () => {
        const lieu = seededPrStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().removePrEquipmentAdmin(lieu.id, 'module-pr-1', 'zone-1', 'eq-1');

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as Pr).zones[0].equipments).toEqual([]);
    });
});

describe('setPrEquipmentScopeAdmin — Lot 2d : ne touche JAMAIS les statuts déjà saisis', () => {
    it('pose une surcharge adhesiveIds, persistée en base, SANS modifier equipment.adhesives', async () => {
        const lieu = seededPrStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().setPrEquipmentScopeAdmin(lieu.id, 'module-pr-1', 'zone-1', 'eq-1', ['adbe3']);

        const stored = await db.lieux.get(lieu.id);
        const eq = (stored!.modules[0].data as Pr).zones[0].equipments[0];
        expect(eq.adhesiveIds).toEqual(['adbe3']);
        // Les statuts déjà saisis (y compris pour adbe1, qui sort du périmètre) sont intacts.
        expect(eq.adhesives).toEqual({ adbe1: AdhesiveStatus.OK, adbe3: AdhesiveStatus.ToBeReplaced });

        const inState = (useAuditStore.getState().lieux[0].modules[0].data as Pr).zones[0].equipments[0];
        expect(inState.adhesiveIds).toEqual(['adbe3']);
    });

    it('adhesiveIds undefined retire le champ en base (retour au périmètre standard), sans toucher adhesives', async () => {
        const lieu = seededPrStation();
        (lieu.modules[0].data as Pr).zones[0].equipments[0].adhesiveIds = ['adbe3'];
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().setPrEquipmentScopeAdmin(lieu.id, 'module-pr-1', 'zone-1', 'eq-1', undefined);

        const stored = await db.lieux.get(lieu.id);
        const eq = (stored!.modules[0].data as Pr).zones[0].equipments[0];
        expect('adhesiveIds' in eq).toBe(false);
        expect(eq.adhesives).toEqual({ adbe1: AdhesiveStatus.OK, adbe3: AdhesiveStatus.ToBeReplaced });
    });

    it('adhesiveIds vide ([]) est aussi normalisé en retrait du champ', async () => {
        const lieu = seededPrStation();
        (lieu.modules[0].data as Pr).zones[0].equipments[0].adhesiveIds = ['adbe3'];
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().setPrEquipmentScopeAdmin(lieu.id, 'module-pr-1', 'zone-1', 'eq-1', []);

        const stored = await db.lieux.get(lieu.id);
        expect('adhesiveIds' in (stored!.modules[0].data as Pr).zones[0].equipments[0]).toBe(false);
    });

    it('lève une erreur explicite si la borne est introuvable', async () => {
        const lieu = seededPrStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await expect(
            useAuditStore.getState().setPrEquipmentScopeAdmin(lieu.id, 'module-pr-1', 'zone-1', 'id-inexistant', ['adbe1'])
        ).rejects.toThrow(/introuvable/);
    });
});

describe('attachModuleAdmin — CUSTOM (Partie 2 : audits configurables)', () => {
    it('attache un module CUSTOM minimal, persiste en base', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const created = await useAuditStore.getState().attachModuleAdmin(
            lieu.id, 'CUSTOM', 'A', undefined, { definitionId: 'def-pdq', definitionName: 'Plans de quartier' }
        );

        expect(created.type).toBe(AuditModuleType.CUSTOM);
        expect(created.name).toBe('Plans de quartier');
        const stored = await db.lieux.get(lieu.id);
        expect(stored!.modules).toHaveLength(1);
        expect((stored!.modules[0].data as any).definitionId).toBe('def-pdq');
    });

    it('refuse un second module CUSTOM de la MÊME définition sur la même station (idempotence à l\'attache)', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().attachModuleAdmin(lieu.id, 'CUSTOM', 'A', undefined, { definitionId: 'def-pdq', definitionName: 'Plans de quartier' });
        const reloaded = (await db.lieux.get(lieu.id))!;
        useAuditStore.setState({ lieux: [reloaded] });

        await expect(
            useAuditStore.getState().attachModuleAdmin(lieu.id, 'CUSTOM', 'A', undefined, { definitionId: 'def-pdq', definitionName: 'Plans de quartier' })
        ).rejects.toThrow(/déjà présent/);
        expect((await db.lieux.get(lieu.id))!.modules).toHaveLength(1); // aucun doublon créé
    });

    it('accepte une définition DIFFÉRENTE sur la même station (deux audits configurables coexistent)', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await useAuditStore.getState().attachModuleAdmin(lieu.id, 'CUSTOM', 'A', undefined, { definitionId: 'def-pdq', definitionName: 'Plans de quartier' });
        const reloaded = (await db.lieux.get(lieu.id))!;
        useAuditStore.setState({ lieux: [reloaded] });
        await useAuditStore.getState().attachModuleAdmin(lieu.id, 'CUSTOM', 'A', undefined, { definitionId: 'def-autre', definitionName: 'Autre audit' });

        expect((await db.lieux.get(lieu.id))!.modules).toHaveLength(2);
    });

    it('exige line et une définition', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await expect(useAuditStore.getState().attachModuleAdmin(lieu.id, 'CUSTOM', undefined, undefined, { definitionId: 'd', definitionName: 'X' }))
            .rejects.toThrow(/ligne/);
        await expect(useAuditStore.getState().attachModuleAdmin(lieu.id, 'CUSTOM', 'A'))
            .rejects.toThrow(/définition/);
    });
});

describe('detachModuleAdmin — détacher ≠ supprimer des données', () => {
    it('refuse si non déverrouillé', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: false });
        await expect(useAuditStore.getState().detachModuleAdmin(lieu.id, 'mod-x')).rejects.toThrow(/Admin refusée/);
    });

    it('détache un module strictement vide (DAT fraîchement créé)', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const created = await useAuditStore.getState().attachModuleAdmin(lieu.id, 'DAT', 'A');
        const reloaded = (await db.lieux.get(lieu.id))!;
        useAuditStore.setState({ lieux: [reloaded] });

        await useAuditStore.getState().detachModuleAdmin(lieu.id, created.id);

        expect((await db.lieux.get(lieu.id))!.modules).toHaveLength(0);
    });

    it('refuse de détacher un module CUSTOM qui contient déjà un statut saisi — aucune suppression, message explicite', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        const created = await useAuditStore.getState().attachModuleAdmin(lieu.id, 'CUSTOM', 'A', undefined, { definitionId: 'def-pdq', definitionName: 'Plans de quartier' });
        let reloaded = (await db.lieux.get(lieu.id))!;
        // Simule un recensement terrain réel (une occurrence constatée).
        (reloaded.modules[0].data as any).occurrences.push({ id: 'occ-1', referenceId: 'ref-1', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z' });
        await db.lieux.put(reloaded);
        useAuditStore.setState({ lieux: [reloaded] });

        await expect(useAuditStore.getState().detachModuleAdmin(lieu.id, created.id)).rejects.toThrow(/données d'audit/);
        expect((await db.lieux.get(lieu.id))!.modules).toHaveLength(1); // rien supprimé
    });

    it('refuse de détacher un module P+R qui a déjà une zone créée', async () => {
        const lieu = seededPrStation(); // possède déjà zone-1 avec un équipement
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });

        await expect(useAuditStore.getState().detachModuleAdmin(lieu.id, 'module-pr-1')).rejects.toThrow(/données d'audit/);
    });

    it('lève une erreur explicite si le module est introuvable', async () => {
        const lieu = seededStation();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], isAdminUnlocked: true });
        await expect(useAuditStore.getState().detachModuleAdmin(lieu.id, 'id-inexistant')).rejects.toThrow(/introuvable/);
    });
});
