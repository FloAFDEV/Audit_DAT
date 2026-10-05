// tests/futureScope.test.ts
// =================================================================
// Données de PRÉPARATION sur une station future (Ligne C) : conservées et
// modifiables, mais jamais comptées dans l'exploitation actuelle —
// statistiques (useStats), nomenclature, patrimoine, anomalies,
// progression, conformité. Contre-épreuve : la même saisie sur un module
// en service, elle, change bien les calculs.
// =================================================================
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { REGISTRY_LINE_B, REGISTRY_LINE_C } from '../data/stationRegistry';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS } from '../data/stations';
import { useStats } from '../hooks/useStats';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { buildSignaletiqueStationIndex } from '../utils/cockpit/signaletiqueStationIndex';
import { getLieuProgress, getModuleProgress } from '../utils/progressCalculators';
import { calculateComplianceScore } from '../utils/historyHelpers';
import { isModuleEditable, isModuleInCurrentScope } from '../utils/moduleScope';
import {
    AdhesiveStatus, AuditModule, AuditModuleType, EcaData, EcaEquipmentType, Lieu, PlanQuartierData,
} from '../types';

const refs = buildSignageReferencesSeed();

/** useStats est un hook : rendu serveur minimal pour en lire le résultat. */
const runStats = (lieux: Lieu[]) => {
    let result: ReturnType<typeof useStats> | undefined;
    const Probe = () => { result = useStats(lieux, refs); return null; };
    renderToString(React.createElement(Probe));
    return result!;
};

/** Tout ce que l'exploitation actuelle calcule à partir des lieux. */
const exploitation = (lieux: Lieu[]) => {
    const stats = runStats(lieux);
    const patrimoine = buildPatrimoineIndex(lieux, refs);
    return {
        globalCounts: stats.globalCounts,
        ecaBreakdown: stats.ecaBreakdown,
        maintenance: stats.maintenanceSummary,
        nomenclature: stats.adhesiveInventory.map(i => [i.id, i.quantity]),
        patrimoine: { totals: patrimoine.totals, implantations: patrimoine.implantations.length },
        anomalies: buildSignaletiqueStationIndex(lieux).totals,
        progression: lieux.map(l => getLieuProgress(l)),
        conformite: calculateComplianceScore(lieux, 'GLOBAL'),
    };
};

const PREPARED_ECA = {
    id: 'test-prepared-eca', name: 'Valideur 1', accessPoint: 'Accès Principal',
    type: EcaEquipmentType.TripodeEntree, number: 1, comment: '',
    adhesives: { 'eca-1@ZH': AdhesiveStatus.Absent, 'eca-2': AdhesiveStatus.ToBeReplaced },
};
const PREPARED_PDQ = {
    id: 'test-prepared-pdq', modelId: 'pdq-78x120', status: AdhesiveStatus.Absent, location: 'Sortie',
    constatedAt: '2026-10-01T00:00:00.000Z', discoveredAt: '2026-10-01T00:00:00.000Z',
};

const futureCModule = (lieux: Lieu[], type: AuditModuleType): { lieu: Lieu; module: AuditModule } => {
    for (const lieu of lieux) {
        const module = lieu.modules.find(m => m.line === 'C' && m.type === type && m.isFuture);
        if (module) return { lieu, module };
    }
    throw new Error(`aucun module ${type} futur sur la Ligne C`);
};

describe('station future de la Ligne C — préparation sans effet sur l\'exploitation', () => {
    it('cas 1 — future vide : dans le registre, préparable, hors exploitation, aucun comptage', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const { lieu, module } = futureCModule(lieux, AuditModuleType.ECA);

        expect(REGISTRY_LINE_C.some(s => s.isFuture && (s.name === lieu.name || s.lieuName === lieu.name))).toBe(true);
        expect(isModuleEditable(module)).toBe(true);
        expect(isModuleInCurrentScope(module)).toBe(false);
        expect(getModuleProgress(module).label).toBe('Bientôt disponible');

        // Les stations C restent listées depuis le registre, mais aucune n'est
        // une station exploitée (toutes futures aujourd'hui).
        expect(LINE_C_STATIONS.length).toBeGreaterThan(0);
        expect(runStats(lieux).globalCounts.stationCountC).toBe(LINE_C_STATIONS.filter(s => !s.isFuture).length);
        expect(runStats(lieux).globalCounts.stationCountC).toBe(0);

        // Clé (module, ligne) : le hub Blagnac réutilise le même id de module
        // pour sa Ligne C (future) et son Aéroport (en service).
        const futureKeys = new Set(lieux.flatMap(l => l.modules).filter(m => m.isFuture).map(m => `${m.id}|${m.line}`));
        expect(buildPatrimoineIndex(lieux, refs).implantations.some(i => futureKeys.has(`${i.moduleId}|${i.line}`))).toBe(false);
        expect(buildSignaletiqueStationIndex(lieux).items.some(i => futureKeys.has(`${i.moduleId}|${i.line}`))).toBe(false);
    });

    it('cas 2 — future avec données préparées : conservées, modifiables, et AUCUN calcul d\'exploitation ne change', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const before = exploitation(lieux);

        const { module: eca } = futureCModule(lieux, AuditModuleType.ECA);
        const { module: pdq } = futureCModule(lieux, AuditModuleType.PLAN_QUARTIER);
        (eca.data as EcaData).ecas.push(structuredClone(PREPARED_ECA));
        (pdq.data as PlanQuartierData).occurrences = [...((pdq.data as PlanQuartierData).occurrences ?? []), { ...PREPARED_PDQ }];

        // Données conservées, module toujours ouvert à la saisie.
        expect((eca.data as EcaData).ecas.map(e => e.id)).toContain('test-prepared-eca');
        expect((pdq.data as PlanQuartierData).occurrences.map(o => o.id)).toContain('test-prepared-pdq');
        expect(isModuleEditable(eca) && isModuleEditable(pdq)).toBe(true);

        // Modification de la donnée préparée : toujours sans effet.
        (eca.data as EcaData).ecas[0].adhesives['eca-2'] = AdhesiveStatus.OK;

        expect(exploitation(lieux)).toEqual(before);
    });

    it('contre-épreuve — la même saisie sur un module en service change bien l\'exploitation', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const before = exploitation(lieux);
        const ecaA = lieux.flatMap(l => l.modules).find(m => m.line === 'A' && m.type === AuditModuleType.ECA && !m.isFuture)!;
        (ecaA.data as EcaData).ecas.push(structuredClone(PREPARED_ECA));

        const after = exploitation(lieux);
        expect(after.globalCounts.ecaCount).toBe(before.globalCounts.ecaCount + 1);
        expect(after.patrimoine.implantations).toBeGreaterThan(before.patrimoine.implantations);
        expect(after.patrimoine.totals.defectCount).toBeGreaterThan(before.patrimoine.totals.defectCount);
    });
});

describe('station en service', () => {
    it('cas 3 — sans données saisies : exploitée, comptée comme station, progression 0 %, aucun équipement inventé', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const datA = lieux.flatMap(l => l.modules).find(m => m.line === 'A' && m.type === AuditModuleType.DAT && !m.isFuture)!;
        expect(isModuleInCurrentScope(datA)).toBe(true);
        expect(getModuleProgress(datA).percentage).toBe(0);
        expect(runStats(lieux).globalCounts.stationCountA).toBe(LINE_A_STATIONS.filter(s => !s.isFuture).length);

        // Une station C en service compterait (règle portée par le registre) :
        // le décompte suit !isFuture, sans liste en dur.
        const stats = runStats(lieux).globalCounts;
        expect(stats.stationCountB).toBe(LINE_B_STATIONS.filter(s => !s.isFuture).length);
    });

    it('cas 7 — Parc Technologique du Canal et Labège Madron : en service, comptées, leurs données dans les calculs', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const stats = runStats(lieux).globalCounts;
        const bIds = REGISTRY_LINE_B.filter(s => !s.isFuture).map(s => s.id);
        expect(bIds).toEqual(expect.arrayContaining(['sta-b-21', 'sta-b-22']));
        expect(stats.stationCountB).toBe(LINE_B_STATIONS.filter(s => !s.isFuture).length);

        const patrimoine = buildPatrimoineIndex(lieux, refs);
        for (const name of ['Parc Technologique du Canal', 'Labège Madron']) {
            expect(patrimoine.implantations.some(i => i.lieuName === name && i.line === 'B')).toBe(true);
        }
    });
});
