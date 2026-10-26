// tests/catalogueCounts.test.ts
// =================================================================
// Référence désactivée (eca-r-1, « non auditable ») et moteur de comptage
// unique du catalogue (utils/cockpit/patrimoineIndex.ts::
// collectCatalogueImplantations), partagé par l'index du patrimoine et la
// Nomenclature (hooks/useStats.ts::computeAdhesiveInventory).
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { db } from '../db';
import useAuditStore from '../store';
import { buildSignageReferencesSeed, REFERENCES_MIGRATED_TO_PLAN_QUARTIER } from '../data/signage_seed';
import { getEcaAdhesiveOccurrences } from '../data/adhesives';
import { getEffectiveEcaAdhesiveOccurrences } from '../utils/effectiveAdhesives';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { buildPatrimoineIndex, collectCatalogueImplantations } from '../utils/cockpit/patrimoineIndex';
import { getEcaProgress, getLieuProgress } from '../utils/progressCalculators';
import EcaAdhesiveAuditForm from '../components/EcaAdhesiveAuditForm';
import { AdhesiveStatus, AuditModule, AuditModuleType, ECA, EcaData, EcaEquipmentType, Lieu } from '../types';

const REFS = buildSignageReferencesSeed();
const reversible = (adhesives: ECA['adhesives']): ECA => ({
    id: 'jj-13', name: 'Liaison A→B - Valideur 13', accessPoint: 'Liaison A→B', number: 13,
    type: EcaEquipmentType.VantauxReversible, adhesives, comment: 'observation terrain',
});
const allActiveOk = () => Object.fromEntries(getEcaAdhesiveOccurrences(EcaEquipmentType.VantauxReversible)
    .filter(o => !o.isDisabled).map(o => [o.statusKey, AdhesiveStatus.OK]));

describe('A1 — référence désactivée eca-r-1 : progression et formulaire', () => {
    it('le catalogue la déclare désactivée, sur les seuls vantaux réversibles', () => {
        const ref = REFS.find(r => r.id === 'eca-r-1')!;
        expect(ref.isDisabled).toBe(true);
        expect(ref.arbitrage?.status).toBe('remove');
        expect(getEcaAdhesiveOccurrences(EcaEquipmentType.VantauxReversible).some(o => o.id === 'eca-r-1' && o.isDisabled)).toBe(true);
    });

    it('100 % sans saisie de eca-r-1 ; un statut déjà saisi reste enregistré et sans effet', () => {
        const done = reversible(allActiveOk());
        expect(done.adhesives['eca-r-1']).toBeUndefined();
        expect(getEcaProgress(done)).toMatchObject({ percentage: 100, isComplete: true });
        const historical = reversible({ ...allActiveOk(), 'eca-r-1': AdhesiveStatus.ToBeReplaced });
        expect(getEcaProgress(historical).isComplete).toBe(true);
        expect(historical.adhesives['eca-r-1']).toBe(AdhesiveStatus.ToBeReplaced);
        const partial = reversible({ ...allActiveOk(), 'eca-2': AdhesiveStatus.NotChecked });
        expect(getEcaProgress(partial).isComplete).toBe(false);
    });

    it('progression du module : eca-r-1 ne compte plus parmi les éléments à contrôler', () => {
        const module = { id: 'm', type: AuditModuleType.ECA, name: 'ECA', line: 'B', data: { id: 'd', stationName: 'S', stationCode: 'JJB', ecas: [reversible(allActiveOk())] } as EcaData } as AuditModule;
        expect(getLieuProgress({ id: 'l', name: 'L', modules: [module] } as Lieu)).toBe(100);
    });

    it('formulaire : eca-r-1 suspendue, boutons désactivés ; les autres adhésifs restent saisissables', () => {
        const occurrences = getEffectiveEcaAdhesiveOccurrences(REFS, EcaEquipmentType.VantauxReversible);
        expect(occurrences.find(o => o.id === 'eca-r-1')?.isDisabled).toBe(true);
        expect(occurrences.filter(o => o.id !== 'eca-r-1').every(o => !o.isDisabled)).toBe(true);
        const module = { id: 'm', type: AuditModuleType.ECA, name: 'ECA Liaison A→B', line: 'B', data: {} } as AuditModule;
        const html = renderToStaticMarkup(React.createElement(EcaAdhesiveAuditForm, {
            module, eca: reversible({}), stationName: 'Jean-Jaurès', signageReferences: REFS,
            onStatusChange: () => {}, onBack: () => {}, onCommentChange: () => {}, onReset: () => {},
        }));
        expect(html.match(/Suspendu/g)).toHaveLength(1);
        // 3 boutons (OK / Absent / À remplacer) désactivés, uniquement pour eca-r-1.
        expect(html.match(/<button[^>]*disabled=""/g)).toHaveLength(3);
    });
});

beforeEach(async () => {
    localStorage.clear();
    await db.lieux.clear();
    useAuditStore.setState({ lieux: [], isLoading: true, initError: null });
});

describe('R1 / A2 — un seul parcours du catalogue pour la Nomenclature et le patrimoine', () => {
    const seeded = async (): Promise<Lieu[]> => {
        await useAuditStore.getState().init();
        return useAuditStore.getState().lieux;
    };

    it('mêmes quantités pour toutes les références actives ; règles documentées pour désactivées et migrées', async () => {
        const lieux = await seeded();
        const inventory = new Map(computeAdhesiveInventory(lieux, REFS).map(i => [i.id, i.quantity]));
        const index = buildPatrimoineIndex(lieux, REFS);
        for (const ref of REFS) {
            const installed = index.byReference.get(ref.id)?.installedCount ?? 0;
            if (!ref.isDisabled) expect([ref.id, inventory.get(ref.id)]).toEqual([ref.id, installed]);
            else expect(installed).toBe(0); // patrimoine actuel : désactivée exclue
        }
        // Désactivée simple : comptage historique conservé dans la Nomenclature.
        expect(inventory.get('eca-r-1')).toBe(7);
        // Patrimoine repris par les Plans de quartier : compté là-bas seulement.
        expect(REFERENCES_MIGRATED_TO_PLAN_QUARTIER.has('adca12')).toBe(true);
        expect(inventory.get('adca12')).toBe(0);
        // Références actives clés, inchangées.
        expect(inventory.get('eca-1')).toBe(255);
        expect(inventory.get('eca-11')).toBe(303);
        expect(inventory.get('pdq-78x100')).toBe(52);
    }, 60000);

    it('le parcours avec désactivées ne diffère du parcours actif que par les références désactivées', async () => {
        const lieux = await seeded();
        const active = collectCatalogueImplantations(lieux, REFS);
        const all = collectCatalogueImplantations(lieux, REFS, { includeDisabled: true });
        const disabledIds = new Set(REFS.filter(r => r.isDisabled).map(r => r.id));
        expect(all.filter(i => !disabledIds.has(i.referenceId))).toEqual(active);
        const disabledCounts = all.filter(i => disabledIds.has(i.referenceId))
            .reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.referenceId]: (acc[i.referenceId] ?? 0) + 1 }), {});
        // adca12 : 10 caisses (exclu ensuite de la Nomenclature : patrimoine migré).
        expect(disabledCounts).toEqual({ 'eca-r-1': 7, adca12: 10 });
    }, 60000);

    it('les 7 vantaux réversibles de Jean-Jaurès restent tels quels (type, numéro, accès)', async () => {
        const lieux = await seeded();
        const reversibles = lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.ECA)
            .flatMap(m => (m.data as EcaData).ecas).filter(e => e.type === EcaEquipmentType.VantauxReversible);
        expect(reversibles.map(e => `${e.accessPoint} ${e.number}`).sort()).toEqual([
            'Liaison A→B 13', 'Liaison A→B 14', 'Liaison A→B 15', 'Liaison A→B 16',
            'Liaison B→A 10', 'Liaison B→A 11', 'Liaison B→A 9',
        ]);
        expect(reversibles.every(e => 'eca-r-1' in e.adhesives)).toBe(true); // clé historique conservée
    }, 60000);
});
