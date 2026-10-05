// tests/moduleScope.test.ts
// =================================================================
// Deux périmètres distincts (utils/moduleScope.ts) :
// - exploitation actuelle (isModuleInCurrentScope) : tout module en
//   service, aucun module futur, quelle que soit la ligne ;
// - saisie / préparation (isModuleEditable) : en service, ou futur sur
//   les lignes C et AEROPORT uniquement.
// Remplace l'ancienne règle unique qui gardait les modules futurs B/C/
// AEROPORT dans tous les calculs : la ligne B n'est plus une exception
// (Parc Technologique du Canal et Labège Madron sont en service).
// =================================================================
import { describe, it, expect } from 'vitest';
import { isModuleInCurrentScope, isModuleEditable } from '../utils/moduleScope';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { REGISTRY_LINE_B } from '../data/stationRegistry';
import { AuditModuleType, ModeData } from '../types';

const scopes = (isFuture: boolean | undefined, line: any) => [
    isModuleInCurrentScope({ isFuture }),
    isModuleEditable({ isFuture, line }),
];

describe('périmètres d\'un module (exploitation / saisie)', () => {
    it.each([
        ['A en service', false, 'A', [true, true]],
        ['B en service', false, 'B', [true, true]],
        ['C en service', false, 'C', [true, true]],
        ['Tram en service', false, 'TRAM', [true, true]],
        ['Téléo en service', false, 'TELEO', [true, true]],
        ['C futur', true, 'C', [false, true]],
        ['Aéroport futur', true, 'AEROPORT', [false, true]],
        ['A futur', true, 'A', [false, false]],
        ['B futur', true, 'B', [false, false]],
        ['Tram futur', true, 'TRAM', [false, false]],
    ] as const)('%s → exploitation / saisie', (_label, isFuture, line, expected) => {
        expect(scopes(isFuture, line)).toEqual(expected);
    });

    it('isFuture absent des données = en service', () => {
        expect(scopes(undefined, 'B')).toEqual([true, true]);
    });

    it('module futur avec une ligne absente ou vide (donnée ambiguë) : ni exploité ni préparable', () => {
        expect(scopes(true, undefined)).toEqual([false, false]);
        expect(scopes(true, '')).toEqual([false, false]);
    });
});

describe('périmètres sur les données réelles (data/builder.ts)', () => {
    it('stations futures de la Ligne C : préparables (DatGroupSelector) mais hors exploitation', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const datC = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.DAT && m.line === 'C')!;
        const station = (datC.data as ModeData).stations[0];
        expect(station.isFuture).toBe(true);
        expect(isModuleEditable({ isFuture: station.isFuture, line: datC.line })).toBe(true);
        expect(isModuleInCurrentScope(datC)).toBe(false);
    });

    it('Aéroport : station future au registre, sélectionnable pour la saisie (DatGroupSelector lit Station.isFuture)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const datAero = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.DAT && m.line === 'AEROPORT')!;
        const station = (datAero.data as ModeData).stations[0];
        expect(isModuleEditable({ isFuture: station.isFuture, line: datAero.line })).toBe(true);
    });

    it('Parc Technologique du Canal et Labège Madron : en service, exploités et éditables, données présentes', async () => {
        for (const id of ['sta-b-21', 'sta-b-22']) {
            const def = REGISTRY_LINE_B.find(s => s.id === id)!;
            expect(def.isFuture).toBe(false);
            expect(def.isActive).toBe(true);
        }
        const lieux = await generateInitialLieuxDataAsync();
        for (const name of ['Parc Technologique du Canal', 'Labège Madron']) {
            const modulesB = lieux.find(l => l.name === name)!.modules.filter(m => m.line === 'B');
            expect(modulesB.length).toBeGreaterThan(0);
            expect(modulesB.every(m => isModuleInCurrentScope(m) && isModuleEditable(m))).toBe(true);
        }
    });
});
