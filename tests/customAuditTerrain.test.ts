// tests/customAuditTerrain.test.ts
// =================================================================
// Saisie terrain des audits configurables (Partie 2) — la brique
// manquante : jusqu'ici, une définition + son référentiel + sa
// propagation fonctionnaient, mais rien ne permettait de relever
// concrètement un module CUSTOM sur le terrain (aucun cas de routage,
// aucun handler d'écriture — module.data.items ne pouvait jamais être
// rempli). Ce fichier couvre le chemin d'écriture (store.ts) et le
// chemin de lecture (utils/effectiveAdhesives.ts) sur lesquels
// components/CustomAuditForm.tsx s'appuie — pas de rendu React (ce
// projet n'a pas de dépendance jsdom/testing-library, même contrainte
// que le reste de la suite).
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { withArchived } from '../utils/cockpit/signageReferenceEditor';
import { getEffectiveCustomReferences, getCustomAuditProgress } from '../utils/effectiveAdhesives';
import { AuditDefinition, AuditModuleType, AdhesiveStatus, CustomAuditData, Lieu, SignageReference } from '../types';

const SEED = buildSignageReferencesSeed();

const DEF: AuditDefinition = {
    id: 'def-pdq', name: 'Plans de quartier', icon: 'MapPin',
    targetLines: ['A'], excludedLieuIds: [], includedLieuIds: [],
};

// Ids prévisibles (pdq-1..4), même patron que
// tests/nomenclatureCharacterization.test.ts — pas createSignageReference
// (id toujours uuidv4(), non adressable par un id lisible dans un test).
const ref = (id: string, over: Partial<SignageReference> = {}): SignageReference => ({
    id, name: `Plan de quartier ${id}`,
    auditType: 'CUSTOM', scope: { auditType: 'CUSTOM', definitionId: DEF.id },
    version: 1, support: 'adhesif', material: 'Adhésif',
    dimensions: { width: 80, height: 100, unit: 'cm' },
    placement: { zone: 'Abords station' },
    ...over,
});

const PDQ_REFS = [ref('pdq-1'), ref('pdq-2'), ref('pdq-3'), ref('pdq-4')];

const stationWithCustomModule = (items: CustomAuditData['items'] = {}): Lieu => ({
    id: 'lieu-pdq', name: 'Station Test',
    modules: [{
        id: 'mod-pdq', type: AuditModuleType.CUSTOM, name: 'Plans de quartier', line: 'A',
        data: { id: 'c-pdq', definitionId: DEF.id, stationName: 'Station Test', stationCode: '', items, comment: '' } as CustomAuditData,
    }],
});

beforeEach(async () => {
    await db.transaction('rw', [db.lieux, db.signageReferences, db.auditDefinitions, db.history, db.events], async () => {
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.auditDefinitions.clear();
        await db.history.clear();
        await db.events.clear();
        await db.signageReferences.bulkAdd([...SEED, ...PDQ_REFS]);
        await db.auditDefinitions.add(DEF);
    });
    useAuditStore.setState({ lieux: [], signageReferences: [...SEED, ...PDQ_REFS] });
});

// -----------------------------------------------------------------
// RENDU — logique de résolution que CustomAuditForm consomme pour
// construire sa liste de références.
// -----------------------------------------------------------------
describe('getEffectiveCustomReferences — ce que le formulaire terrain doit afficher', () => {
    it('retourne les 4 références actives de la définition, dans le référentiel réel', () => {
        const effective = getEffectiveCustomReferences([...SEED, ...PDQ_REFS], DEF.id);
        expect(effective.map(r => r.id).sort()).toEqual(['pdq-1', 'pdq-2', 'pdq-3', 'pdq-4']);
    });

    it('exclut une référence archivée : elle ne doit plus être proposée pour un nouveau relevé', () => {
        const archived = withArchived(PDQ_REFS[0], '2026-01-01T00:00:00.000Z');
        const references = [...SEED, archived, ...PDQ_REFS.slice(1)];
        const effective = getEffectiveCustomReferences(references, DEF.id);
        expect(effective.map(r => r.id)).not.toContain('pdq-1');
        expect(effective).toHaveLength(3);
    });

    it('une nouvelle référence ajoutée à la définition apparaît immédiatement, sans recréer l\'audit', () => {
        const nouvelleRef = ref('pdq-5');
        const references = [...SEED, ...PDQ_REFS, nouvelleRef];
        const effective = getEffectiveCustomReferences(references, DEF.id);
        expect(effective.map(r => r.id)).toContain('pdq-5');
        expect(effective).toHaveLength(5);
    });

    it('ignore les références d\'une AUTRE définition (même auditType CUSTOM)', () => {
        const autreDef = ref('autre-ref', { scope: { auditType: 'CUSTOM', definitionId: 'def-autre' } });
        const effective = getEffectiveCustomReferences([...SEED, ...PDQ_REFS, autreDef], DEF.id);
        expect(effective.map(r => r.id)).not.toContain('autre-ref');
    });
});

// -----------------------------------------------------------------
// PROGRESSION — partagée entre store.ts (completionDate) et
// CustomAuditForm.tsx (barre affichée) : une seule fonction, testée ici.
// -----------------------------------------------------------------
describe('getCustomAuditProgress', () => {
    it('0% quand items est vide (module fraîchement propagé, aucun relevé)', () => {
        expect(getCustomAuditProgress([...SEED, ...PDQ_REFS], DEF.id, {})).toBe(0);
    });

    it('progression proportionnelle aux références réellement touchées', () => {
        const items = { 'pdq-1': { status: AdhesiveStatus.OK }, 'pdq-2': { status: AdhesiveStatus.ToBeReplaced } };
        expect(getCustomAuditProgress([...SEED, ...PDQ_REFS], DEF.id, items)).toBe(50); // 2/4
    });

    it('100% quand toutes les références effectives ont un statut (y compris Non applicable)', () => {
        const items = {
            'pdq-1': { status: AdhesiveStatus.OK }, 'pdq-2': { status: AdhesiveStatus.NotApplicable },
            'pdq-3': { status: AdhesiveStatus.Absent }, 'pdq-4': { status: AdhesiveStatus.NotApplicable },
        };
        expect(getCustomAuditProgress([...SEED, ...PDQ_REFS], DEF.id, items)).toBe(100);
    });

    it('une clé orpheline (référence depuis archivée) ne gonfle jamais la progression', () => {
        const archived = withArchived(PDQ_REFS[3], '2026-01-01T00:00:00.000Z'); // pdq-4
        const references = [...SEED, ...PDQ_REFS.slice(0, 3), archived];
        // Seul pdq-1 est coché parmi les 3 références encore effectives.
        const items = { 'pdq-1': { status: AdhesiveStatus.OK }, 'pdq-4': { status: AdhesiveStatus.OK } };
        expect(getCustomAuditProgress(references, DEF.id, items)).toBeCloseTo(33.33, 1); // 1/3, pas 2/4
    });
});

// -----------------------------------------------------------------
// ÉCRITURE — store.ts (chemin qui n'existait pas avant cette mission).
// -----------------------------------------------------------------
describe('handleCustomAuditStatusChange', () => {
    it('écrit le statut dans Dexie et crée l\'entrée si elle n\'existait pas (items sparse, jamais pré-rempli)', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditStatusChange('pdq-1', AdhesiveStatus.OK);

        const stored = await db.lieux.get(lieu.id);
        const data = stored!.modules[0].data as CustomAuditData;
        expect(data.items['pdq-1']).toEqual({ status: AdhesiveStatus.OK });
        // Le store en mémoire est aussi synchronisé (persistance visible immédiatement à l'écran).
        expect((useAuditStore.getState().lieux[0].modules[0].data as CustomAuditData).items['pdq-1'].status).toBe(AdhesiveStatus.OK);
    });

    it('re-cliquer le même statut le remet à Non contrôlé (toggle), comme les autres audits', async () => {
        const lieu = stationWithCustomModule({ 'pdq-1': { status: AdhesiveStatus.OK } });
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditStatusChange('pdq-1', AdhesiveStatus.NotChecked);

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).items['pdq-1'].status).toBe(AdhesiveStatus.NotChecked);
    });

    it('marque completionDate quand toutes les références effectives sont couvertes, le retire sinon', async () => {
        const lieu = stationWithCustomModule({
            'pdq-1': { status: AdhesiveStatus.OK }, 'pdq-2': { status: AdhesiveStatus.OK }, 'pdq-3': { status: AdhesiveStatus.NotApplicable },
        });
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditStatusChange('pdq-4', AdhesiveStatus.Absent);
        let stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).completionDate).toBeDefined();

        // Reculer : une référence redevient non contrôlée → completionDate retiré.
        await useAuditStore.getState().handleCustomAuditStatusChange('pdq-4', AdhesiveStatus.NotChecked);
        stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).completionDate).toBeUndefined();
    });

    it('une clé de items pointant vers une référence archivée n\'empêche jamais la complétude des références encore effectives', async () => {
        const archived = withArchived(PDQ_REFS[3], '2026-01-01T00:00:00.000Z');
        useAuditStore.setState({ signageReferences: [...SEED, ...PDQ_REFS.slice(0, 3), archived] });
        const lieu = stationWithCustomModule({ 'pdq-4': { status: AdhesiveStatus.OK } }); // orpheline
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditStatusChange('pdq-1', AdhesiveStatus.OK);
        await useAuditStore.getState().handleCustomAuditStatusChange('pdq-2', AdhesiveStatus.OK);
        await useAuditStore.getState().handleCustomAuditStatusChange('pdq-3', AdhesiveStatus.NotApplicable);

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).completionDate).toBeDefined();
    });
});

describe('handleCustomAuditCommentChange', () => {
    it('écrit le commentaire général du module (niveau audit, pas par référence)', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditCommentChange('Relevé effectué par temps de pluie.');

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).comment).toBe('Relevé effectué par temps de pluie.');
    });
});

describe('Photo — handleCustomAuditPhotoChange / PhotoNoteChange / PhotoRotationChange', () => {
    it('ajoute une photo à une référence jamais touchée (crée l\'entrée, statut Non contrôlé)', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditPhotoChange('pdq-1', 'data:image/jpeg;base64,ZmFrZQ==');

        const stored = await db.lieux.get(lieu.id);
        const item = (stored!.modules[0].data as CustomAuditData).items['pdq-1'];
        expect(item.photo_base64).toBe('data:image/jpeg;base64,ZmFrZQ==');
        expect(item.status).toBe(AdhesiveStatus.NotChecked);
    });

    it('supprimer la photo retire aussi la note et la rotation, jamais le statut', async () => {
        const lieu = stationWithCustomModule({
            'pdq-1': { status: AdhesiveStatus.OK, photo_base64: 'data:image/jpeg;base64,ZmFrZQ==', photo_note: 'Note', photo_rotation: 90 },
        });
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditPhotoChange('pdq-1', null);

        const stored = await db.lieux.get(lieu.id);
        const item = (stored!.modules[0].data as CustomAuditData).items['pdq-1'];
        expect(item.photo_base64).toBeUndefined();
        expect(item.photo_note).toBeUndefined();
        expect(item.photo_rotation).toBeUndefined();
        expect(item.status).toBe(AdhesiveStatus.OK);
    });

    it('note et rotation de photo se persistent indépendamment', async () => {
        const lieu = stationWithCustomModule({ 'pdq-1': { status: AdhesiveStatus.OK, photo_base64: 'data:image/jpeg;base64,ZmFrZQ==' } });
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditPhotoNoteChange('pdq-1', 'Panneau décoloré côté nord');
        await useAuditStore.getState().handleCustomAuditPhotoRotationChange('pdq-1', 270);

        const stored = await db.lieux.get(lieu.id);
        const item = (stored!.modules[0].data as CustomAuditData).items['pdq-1'];
        expect(item.photo_note).toBe('Panneau décoloré côté nord');
        expect(item.photo_rotation).toBe(270);
    });
});

describe('handleResetCustomAudit', () => {
    it('vide items et le commentaire, retire completionDate, archive un instantané dans l\'historique, journalise', async () => {
        const lieu = stationWithCustomModule({
            'pdq-1': { status: AdhesiveStatus.OK, photo_base64: 'data:image/jpeg;base64,ZmFrZQ==' },
            'pdq-2': { status: AdhesiveStatus.Absent },
        });
        (lieu.modules[0].data as CustomAuditData).comment = 'À vérifier';
        (lieu.modules[0].data as CustomAuditData).completionDate = '2026-01-01T00:00:00.000Z';
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleResetCustomAudit();

        const stored = await db.lieux.get(lieu.id);
        const data = stored!.modules[0].data as CustomAuditData;
        expect(data.items).toEqual({});
        expect(data.comment).toBe('');
        expect(data.completionDate).toBeUndefined();

        const history = await db.history.toArray();
        expect(history).toHaveLength(1);
        expect(history[0].type).toBe('SINGLE_AUDIT');

        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'RESET_AUDIT')).toBe(true);
    });
});

// -----------------------------------------------------------------
// NON-RÉGRESSION — DAT/ECA/P+R/PMR/Cognitif/Signalétique n'ont pas de
// handler CUSTOM à proximité : simple garde-fou que le module de test
// n'a pas de fuite d'état entre lieux (chaque test repart d'une base
// vidée, cf. beforeEach) — la suite complète (298+ tests) reste le
// vrai filet de non-régression, exécutée en plus de ce fichier.
// -----------------------------------------------------------------
describe('Non-régression — un module CUSTOM ignoré par un handler d\'un autre type', () => {
    it('handleCustomAuditStatusChange sur un module absent (mauvais selectedModuleId) ne lève pas et ne touche rien', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-inexistant' });

        await expect(useAuditStore.getState().handleCustomAuditStatusChange('pdq-1', AdhesiveStatus.OK)).resolves.not.toThrow();
        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).items).toEqual({});
    });
});
