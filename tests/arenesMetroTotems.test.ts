// tests/arenesMetroTotems.test.ts
// =================================================================
// Arènes (métro A) : deux totems, chacun avec un plan de quartier 78x100 et
// un pictogramme cognitif — escalier gauche (côté agence) et escalier droit
// (côté entrée métro). Nouvelles bases et appareils déjà installés.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore, { migrateArenesCognitivePictograms } from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { generateInitialCognitivePictogramsForStation } from '../data/cognitive_pictograms';
import { AuditModuleType, CognitivePictogramData, FloorAdhesiveStatus, Lieu, PlanQuartierData } from '../types';

const NAMES = ['Escalier gauche (côté agence)', 'Escalier droit (côté entrée métro)'];
const arenesCog = (lieux: Lieu[]) => lieux.flatMap(l => l.modules)
    .find(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS && (m.data as CognitivePictogramData).stationCode === 'ARE')!.data as CognitivePictogramData;
const arenesPdqA = (lieux: Lieu[]) => lieux.flatMap(l => l.modules)
    .find(m => m.type === AuditModuleType.PLAN_QUARTIER && m.line === 'A' && (m.data as PlanQuartierData).stationName === 'Arènes')!.data as PlanQuartierData;
/** Appareil installé avant : un seul accès cognitif, aucun plan 78x100. */
const legacy = (lieux: Lieu[]) => {
    arenesCog(lieux).pictograms = [{ id: 'picto-ancien', accessPointName: 'Accès côté tram', status: FloorAdhesiveStatus.NotChecked }];
    const pdq = arenesPdqA(lieux);
    pdq.occurrences = pdq.occurrences.filter(o => o.modelId !== 'pdq-78x100');
    return lieux;
};

describe('Arènes métro A — nouvelles données', () => {
    it('deux pictogrammes cognitifs, un par totem', () => {
        expect(generateInitialCognitivePictogramsForStation('ARE').map(p => p.accessPointName)).toEqual(NAMES);
    });
});

describe('migrateArenesCognitivePictograms', () => {
    it('ancien accès unique jamais contrôlé : renommé (même id) + second accès ajouté ; idempotente', async () => {
        const lieux = legacy(await generateInitialLieuxDataAsync());
        expect(migrateArenesCognitivePictograms(lieux)).toEqual({ changed: true, keptAudited: false });
        const pictos = arenesCog(lieux).pictograms;
        expect(pictos.map(p => p.accessPointName)).toEqual(NAMES);
        expect(pictos[0].id).toBe('picto-ancien');
        expect(pictos.every(p => p.status === FloorAdhesiveStatus.NotChecked)).toBe(true);
        expect(migrateArenesCognitivePictograms(lieux)).toEqual({ changed: false, keptAudited: false });
        expect(arenesCog(lieux).pictograms).toHaveLength(2);
    });

    it('ancien accès déjà contrôlé : rien n\'est touché, signalé', async () => {
        const lieux = legacy(await generateInitialLieuxDataAsync());
        arenesCog(lieux).pictograms[0].status = FloorAdhesiveStatus.OK;
        const before = JSON.stringify(arenesCog(lieux));
        expect(migrateArenesCognitivePictograms(lieux)).toEqual({ changed: false, keptAudited: true });
        expect(JSON.stringify(arenesCog(lieux))).toBe(before);
    });

    it('autres stations jamais touchées', async () => {
        const lieux = legacy(await generateInitialLieuxDataAsync());
        const others = JSON.stringify(lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS && (m.data as CognitivePictogramData).stationCode !== 'ARE'));
        migrateArenesCognitivePictograms(lieux);
        expect(JSON.stringify(lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS && (m.data as CognitivePictogramData).stationCode !== 'ARE'))).toBe(others);
    });
});

describe('Arènes métro A — appareil déjà installé (base de test isolée)', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.events.clear();
        useAuditStore.setState({ lieux: [], isLoading: true, isAuthenticated: false, initError: null, selectedLieuId: null, selectedModuleId: null });
    });

    it('au démarrage : 2 plans 78x100 sur totem et 2 pictos, sans toucher aux autres plans d\'Arènes ; pas de doublon', async () => {
        await db.lieux.bulkPut(legacy(await generateInitialLieuxDataAsync()));
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        await useAuditStore.getState().init();
        const otherModelsBefore = arenesPdqA(useAuditStore.getState().lieux).occurrences.filter(o => o.modelId !== 'pdq-78x100').length;

        const pdq = arenesPdqA(await db.lieux.toArray());
        const totems = pdq.occurrences.filter(o => o.modelId === 'pdq-78x100');
        expect(totems.map(o => o.location)).toEqual(['Totem — escalier gauche (côté agence)', 'Totem — escalier droit (côté entrée métro)']);
        expect(totems.every(o => o.implantationContext === 'totem')).toBe(true);
        expect(arenesCog(await db.lieux.toArray()).pictograms.map(p => p.accessPointName)).toEqual(NAMES);

        await useAuditStore.getState().init(); // second démarrage
        const again = arenesPdqA(await db.lieux.toArray());
        expect(again.occurrences.filter(o => o.modelId === 'pdq-78x100')).toHaveLength(2);
        expect(again.occurrences.filter(o => o.modelId !== 'pdq-78x100')).toHaveLength(otherModelsBefore);
        expect(arenesCog(await db.lieux.toArray()).pictograms).toHaveLength(2);
    });
});
