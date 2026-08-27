// tests/auditDefinitionAdmin.test.ts
// =================================================================
// Partie 2 — audits configurables : moteur pur (Commit 2).
// Aucune dépendance Dexie/store : create/edit/archive/restore + calcul de
// ciblage réseau (computeTargetLieuIds/computeMissingLieuIds/computeDeployedCount).
// =================================================================
import { describe, it, expect } from 'vitest';
import {
    createAuditDefinition, applyDefinitionEdit, withDefinitionArchived, withDefinitionRestored,
    definitionToEditableFields, computeTargetLieuIds, computeDeployedCount, computeMissingLieuIds,
    AuditDefinitionEditableFields,
} from '../utils/cockpit/auditDefinitionAdmin';
import { AuditDefinition, AuditModuleType, Lieu, TransportMode } from '../types';

const FIELDS: AuditDefinitionEditableFields = {
    name: 'Plans de quartier', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [],
};

describe('createAuditDefinition / applyDefinitionEdit', () => {
    it('crée une définition avec un id technique, jamais dérivé du nom', () => {
        const def = createAuditDefinition(FIELDS);
        expect(def.id).toBeTruthy();
        expect(def.id).not.toBe('Plans de quartier');
        expect(def.name).toBe('Plans de quartier');
        expect(def.targetLines).toEqual(['A']);
        expect(def.archivedAt).toBeUndefined();
    });

    it('deux créations successives produisent des ids distincts', () => {
        expect(createAuditDefinition(FIELDS).id).not.toBe(createAuditDefinition(FIELDS).id);
    });

    it('rejette un nom vide', () => {
        expect(() => createAuditDefinition({ ...FIELDS, name: '  ' })).toThrow('nom');
    });

    it('rejette une icône vide', () => {
        expect(() => createAuditDefinition({ ...FIELDS, icon: '' })).toThrow('icône');
    });

    it('applyDefinitionEdit modifie les champs sans changer l\'id', () => {
        const def = createAuditDefinition(FIELDS);
        const edited = applyDefinitionEdit(def, { ...FIELDS, name: 'Plans de quartier v2', targetLines: ['A', 'B'] });
        expect(edited.id).toBe(def.id);
        expect(edited.name).toBe('Plans de quartier v2');
        expect(edited.targetLines).toEqual(['A', 'B']);
    });

    it('definitionToEditableFields fait l\'aller-retour', () => {
        const def = createAuditDefinition(FIELDS);
        expect(definitionToEditableFields(def)).toEqual(FIELDS);
    });
});

describe('withDefinitionArchived / withDefinitionRestored', () => {
    it('archive sans toucher aux autres champs', () => {
        const def = createAuditDefinition(FIELDS);
        const archived = withDefinitionArchived(def, '2026-01-01T00:00:00.000Z');
        expect(archived.archivedAt).toBe('2026-01-01T00:00:00.000Z');
        expect(archived.name).toBe(def.name);
        expect(archived.id).toBe(def.id);
    });

    it('restaure en retirant strictement archivedAt', () => {
        const def = withDefinitionArchived(createAuditDefinition(FIELDS));
        const restored = withDefinitionRestored(def);
        expect(restored.archivedAt).toBeUndefined();
        expect('archivedAt' in restored).toBe(false);
    });
});

// ------------------------------------------------------------------
// Ciblage réseau
// ------------------------------------------------------------------
const moduleOnLine = (type: AuditModuleType, line: string): Lieu['modules'][number] => ({
    id: `mod-${type}-${line}-${Math.random()}`, type, name: type, line: line as any,
    data: type === AuditModuleType.DAT
        ? { id: 'm', name: 'S', type: TransportMode.METRO, line: line as any, stations: [] }
        : { id: 'm', stationName: 'S', stationCode: '', ecas: [] } as any,
});

const lieu = (id: string, lines: string[], opts: { archived?: boolean } = {}): Lieu => ({
    id, name: id,
    modules: lines.map(l => moduleOnLine(AuditModuleType.DAT, l)),
    ...(opts.archived ? { archivedAt: '2026-01-01T00:00:00.000Z' } : {}),
});

describe('computeTargetLieuIds — fonction pure, testable sans persistance', () => {
    const lieux: Lieu[] = [
        lieu('sta-a1', ['A']),
        lieu('sta-a2', ['A']),
        lieu('sta-b1', ['B']),
        lieu('sta-ab', ['A', 'B']), // hub
        lieu('sta-archived', ['A'], { archived: true }),
    ];

    it('cible les stations qui ont un module sur la ligne visée', () => {
        const def: AuditDefinition = { id: 'd', name: 'X', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [] };
        expect(computeTargetLieuIds(def, lieux).sort()).toEqual(['sta-a1', 'sta-a2', 'sta-ab']);
    });

    it('une station archivée n\'est jamais ciblée, même sur la bonne ligne', () => {
        const def: AuditDefinition = { id: 'd', name: 'X', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [] };
        expect(computeTargetLieuIds(def, lieux)).not.toContain('sta-archived');
    });

    it('une station explicitement exclue disparaît du ciblage', () => {
        const def: AuditDefinition = { id: 'd', name: 'X', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: ['sta-a1'], includedLieuIds: [] };
        expect(computeTargetLieuIds(def, lieux).sort()).toEqual(['sta-a2', 'sta-ab']);
    });

    it('une station explicitement incluse apparaît même hors ligne ciblée', () => {
        const def: AuditDefinition = { id: 'd', name: 'X', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: [], includedLieuIds: ['sta-b1'] };
        expect(computeTargetLieuIds(def, lieux).sort()).toEqual(['sta-a1', 'sta-a2', 'sta-ab', 'sta-b1']);
    });

    it('une station hors cible (aucune ligne visée, jamais incluse) n\'apparaît jamais', () => {
        const def: AuditDefinition = { id: 'd', name: 'X', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [] };
        expect(computeTargetLieuIds(def, lieux)).not.toContain('sta-b1');
    });

    it('inclusion d\'un id de station archivée ou inexistant est ignorée', () => {
        const def: AuditDefinition = { id: 'd', name: 'X', icon: 'MapPin', targetLines: [], excludedLieuIds: [], includedLieuIds: ['sta-archived', 'inexistant'] };
        expect(computeTargetLieuIds(def, lieux)).toEqual([]);
    });

    it('un module CUSTOM existant ne compte jamais comme preuve d\'appartenance à une ligne', () => {
        const custom = { id: 'm', type: AuditModuleType.CUSTOM, name: 'X', line: 'A' as any, data: { id: 'm', definitionId: 'other', stationName: 'S', stationCode: '', items: {}, comment: '' } };
        const onlyCustom: Lieu = { id: 'sta-only-custom', name: 'S', modules: [custom] };
        const def: AuditDefinition = { id: 'd', name: 'X', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [] };
        expect(computeTargetLieuIds(def, [onlyCustom])).toEqual([]);
    });

    it('idempotence du calcul lui-même : deux appels identiques produisent le même résultat', () => {
        const def: AuditDefinition = { id: 'd', name: 'X', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [] };
        expect(computeTargetLieuIds(def, lieux).sort()).toEqual(computeTargetLieuIds(def, lieux).sort());
    });
});

describe('computeDeployedCount / computeMissingLieuIds', () => {
    const customModule = (definitionId: string): Lieu['modules'][number] => ({
        id: `mod-${Math.random()}`, type: AuditModuleType.CUSTOM, name: 'Plans de quartier', line: 'A' as any,
        data: { id: 'c', definitionId, stationName: 'S', stationCode: '', items: {}, comment: '' },
    });

    it('compte les modules déjà déployés pour cette définition, ignore les autres définitions', () => {
        const lieux: Lieu[] = [
            { id: 'l1', name: 'l1', modules: [customModule('def-pdq')] },
            { id: 'l2', name: 'l2', modules: [customModule('def-autre')] },
        ];
        const def: AuditDefinition = { id: 'def-pdq', name: 'X', icon: 'MapPin', targetLines: [], excludedLieuIds: [], includedLieuIds: [] };
        expect(computeDeployedCount(def, lieux)).toBe(1);
    });

    it('computeMissingLieuIds exclut les stations qui ont déjà un module — 1er passage crée, 2e passage ne crée rien', () => {
        const def: AuditDefinition = { id: 'def-pdq', name: 'X', icon: 'MapPin', targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [] };
        const lieux: Lieu[] = [lieu('sta-a1', ['A']), lieu('sta-a2', ['A'])];

        const firstPass = computeMissingLieuIds(def, lieux);
        expect(firstPass.sort()).toEqual(['sta-a1', 'sta-a2']);

        // Simule la matérialisation du premier passage.
        const afterFirstPass = lieux.map(l => l.id === 'sta-a1' ? { ...l, modules: [...l.modules, customModule('def-pdq')] } : l);
        expect(computeMissingLieuIds(def, afterFirstPass)).toEqual(['sta-a2']);

        const afterSecondPass = afterFirstPass.map(l => l.id === 'sta-a2' ? { ...l, modules: [...l.modules, customModule('def-pdq')] } : l);
        expect(computeMissingLieuIds(def, afterSecondPass)).toEqual([]); // idempotent : plus rien à créer
    });
});
