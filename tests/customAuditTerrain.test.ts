// tests/customAuditTerrain.test.ts
// =================================================================
// Recensement patrimonial dans le temps (audits configurables, Partie 2)
// — pas une checklist par station. Ce fichier couvre les TROIS états que
// le modèle doit représenter séparément (exigence explicite) :
//   1. les occurrences (objets physiques individuels, plusieurs par
//      référence sur une même station, chacune son emplacement) ;
//   2. leur historique de constats (previousConstats, alimenté
//      UNIQUEMENT par l'action explicite « Nouveau constat », jamais par
//      une correction du constat courant) ;
//   3. l'état de vérification du module (lastCheckedAt) quand il
//      n'existe aucune occurrence — sans objet fictif.
// Pas de rendu React (ce projet n'a pas de dépendance jsdom/testing-
// library, même contrainte que le reste de la suite) : on teste le
// chemin d'écriture (store.ts) et le chemin de lecture
// (utils/effectiveAdhesives.ts) sur lesquels CustomAuditForm.tsx s'appuie.
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { withArchived } from '../utils/cockpit/signageReferenceEditor';
import { getEffectiveCustomReferences, getCustomAuditProgress } from '../utils/effectiveAdhesives';
import { AuditDefinition, AuditModuleType, AdhesiveStatus, CustomAuditData, CustomAuditOccurrence, Lieu, SignageReference } from '../types';

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

const stationWithCustomModule = (occurrences: CustomAuditOccurrence[] = [], lastCheckedAt?: string): Lieu => ({
    id: 'lieu-pdq', name: 'Station Test',
    modules: [{
        id: 'mod-pdq', type: AuditModuleType.CUSTOM, name: 'Plans de quartier', line: 'A',
        data: { id: 'c-pdq', definitionId: DEF.id, stationName: 'Station Test', stationCode: '', occurrences, lastCheckedAt, comment: '' } as CustomAuditData,
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
// RENDU — logique de résolution que CustomAuditForm consomme.
// -----------------------------------------------------------------
describe('getEffectiveCustomReferences — ce que le formulaire terrain propose au recensement', () => {
    it('retourne les 4 références actives de la définition, dans le référentiel réel', () => {
        const effective = getEffectiveCustomReferences([...SEED, ...PDQ_REFS], DEF.id);
        expect(effective.map(r => r.id).sort()).toEqual(['pdq-1', 'pdq-2', 'pdq-3', 'pdq-4']);
    });

    it('exclut une référence archivée : elle ne doit plus être proposée pour un nouvel objet', () => {
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
});

// -----------------------------------------------------------------
// PROGRESSION — état de vérification binaire (0/100), pas un
// pourcentage de couverture (aucun nombre d'occurrences n'est
// présupposé par référence).
// -----------------------------------------------------------------
describe('getCustomAuditProgress', () => {
    it('0% si occurrences vide et jamais vérifié', () => {
        expect(getCustomAuditProgress({ occurrences: [], lastCheckedAt: undefined })).toBe(0);
    });
    it('100% dès qu\'au moins une occurrence existe', () => {
        expect(getCustomAuditProgress({ occurrences: [{ id: 'o1' }], lastCheckedAt: undefined })).toBe(100);
    });
    it('100% si vérifié sans occurrence (lastCheckedAt posé)', () => {
        expect(getCustomAuditProgress({ occurrences: [], lastCheckedAt: '2026-08-28T00:00:00.000Z' })).toBe(100);
    });
});

// -----------------------------------------------------------------
// ÉTAT 1 — LES OCCURRENCES : plusieurs objets physiques, chacun son
// identité et son emplacement, même référence ou non.
// -----------------------------------------------------------------
describe('handleAddCustomAuditOccurrence — recensement de plusieurs objets', () => {
    it('crée une occurrence avec son propre id, distinct de la référence, statut Non contrôlé', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        const created = await useAuditStore.getState().handleAddCustomAuditOccurrence('pdq-1', 'Entrée rue X');

        expect(created.id).not.toBe('pdq-1');
        expect(created.referenceId).toBe('pdq-1');
        expect(created.location).toBe('Entrée rue X');
        expect(created.status).toBe(AdhesiveStatus.NotChecked);

        const stored = await db.lieux.get(lieu.id);
        const data = stored!.modules[0].data as CustomAuditData;
        expect(data.occurrences).toHaveLength(1);
        expect(data.lastCheckedAt).toBeDefined(); // ajouter un objet = une vérification
    });

    it('Jean-Jaurès : 2 occurrences de la MÊME référence + 1 d\'une autre, toutes distinctes et conservées séparément', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        const occ1 = await useAuditStore.getState().handleAddCustomAuditOccurrence('pdq-1', 'Entrée rue X');
        const occ2 = await useAuditStore.getState().handleAddCustomAuditOccurrence('pdq-1', 'Quai 1');
        const occ3 = await useAuditStore.getState().handleAddCustomAuditOccurrence('pdq-3', 'Correspondance métro');

        const stored = await db.lieux.get(lieu.id);
        const data = stored!.modules[0].data as CustomAuditData;
        expect(data.occurrences).toHaveLength(3);
        expect(occ1.id).not.toBe(occ2.id);
        const sameRef = data.occurrences.filter(o => o.referenceId === 'pdq-1');
        expect(sameRef).toHaveLength(2);
        expect(sameRef.map(o => o.location).sort()).toEqual(['Entrée rue X', 'Quai 1']);
        expect(data.occurrences.find(o => o.id === occ3.id)?.referenceId).toBe('pdq-3');
    });
});

describe('handleRemoveCustomAuditOccurrence', () => {
    it('retire une occurrence encore vierge (erreur de saisie)', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });
        const created = await useAuditStore.getState().handleAddCustomAuditOccurrence('pdq-1');

        await useAuditStore.getState().handleRemoveCustomAuditOccurrence(created.id);

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).occurrences).toHaveLength(0);
    });

    it('refuse de retirer une occurrence qui a déjà reçu un vrai constat — jamais de perte d\'un objet réellement recensé', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });
        const created = await useAuditStore.getState().handleAddCustomAuditOccurrence('pdq-1');
        await useAuditStore.getState().handleCustomAuditOccurrenceStatusChange(created.id, AdhesiveStatus.OK);

        await expect(useAuditStore.getState().handleRemoveCustomAuditOccurrence(created.id)).rejects.toThrow();
        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).occurrences).toHaveLength(1);
    });
});

// -----------------------------------------------------------------
// ÉTAT 2 — L'HISTORIQUE DE CONSTATS : corriger ≠ historiser.
// -----------------------------------------------------------------
describe('Corriger le constat courant ne crée JAMAIS d\'historique', () => {
    it('changer plusieurs fois le statut de la même occurrence ne produit aucun previousConstats', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });
        const created = await useAuditStore.getState().handleAddCustomAuditOccurrence('pdq-1', 'Entrée rue X');

        await useAuditStore.getState().handleCustomAuditOccurrenceStatusChange(created.id, AdhesiveStatus.OK);
        await useAuditStore.getState().handleCustomAuditOccurrenceStatusChange(created.id, AdhesiveStatus.Absent);
        await useAuditStore.getState().handleCustomAuditOccurrenceStatusChange(created.id, AdhesiveStatus.OK);

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        expect(occ.status).toBe(AdhesiveStatus.OK);
        expect(occ.previousConstats ?? []).toHaveLength(0);
    });

    it('le toggle (même statut → Non contrôlé) est une décision du formulaire, pas du handler — le handler applique fidèlement le statut reçu, sans historiser', async () => {
        // Le formulaire calcule lui-même le statut cible (currentStatus ===
        // status ? NotChecked : status, cf. CustomAuditForm.tsx) avant
        // d'appeler ce handler — même patron que AdhesiveAuditForm/DAT.
        const lieu = stationWithCustomModule([{ id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.OK, constatedAt: '2026-08-28T00:00:00.000Z' }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditOccurrenceStatusChange('occ-1', AdhesiveStatus.NotChecked);

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        expect(occ.status).toBe(AdhesiveStatus.NotChecked);
        expect(occ.previousConstats ?? []).toHaveLength(0);
    });
});

describe('handleCustomAuditNewConstat — le SEUL point d\'écriture de previousConstats', () => {
    it('exemple concret : 28/08/2026 OK, puis « Nouveau constat » le 15/02/2027 → Dégradé — les deux constats coexistent', async () => {
        const lieu = stationWithCustomModule([{
            id: 'occ-entree', referenceId: 'pdq-1', location: 'Entrée rue X',
            status: AdhesiveStatus.OK, constatedAt: '2026-08-28T00:00:00.000Z',
        }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditNewConstat('occ-entree');
        await useAuditStore.getState().handleCustomAuditOccurrenceStatusChange('occ-entree', AdhesiveStatus.ToBeReplaced);

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        // Le constat du 28/08/2026 (OK) est conservé...
        expect(occ.previousConstats).toHaveLength(1);
        expect(occ.previousConstats![0].status).toBe(AdhesiveStatus.OK);
        expect(occ.previousConstats![0].constatedAt).toBe('2026-08-28T00:00:00.000Z');
        // ...le constat courant est le nouveau, l'objet garde la même identité.
        expect(occ.id).toBe('occ-entree');
        expect(occ.status).toBe(AdhesiveStatus.ToBeReplaced);
    });

    it('sans effet si le constat courant est encore Non contrôlé (rien à archiver)', async () => {
        const lieu = stationWithCustomModule([{ id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z' }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditNewConstat('occ-1');

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        expect(occ.previousConstats ?? []).toHaveLength(0);
    });

    it('archive plusieurs constats successifs dans l\'ordre — deuxième relevé ultérieur, l\'ancien n\'est jamais écrasé', async () => {
        const lieu = stationWithCustomModule([{ id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.OK, constatedAt: '2026-08-28T00:00:00.000Z' }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditNewConstat('occ-1');
        await useAuditStore.getState().handleCustomAuditOccurrenceStatusChange('occ-1', AdhesiveStatus.ToBeReplaced);
        await useAuditStore.getState().handleCustomAuditNewConstat('occ-1');
        await useAuditStore.getState().handleCustomAuditOccurrenceStatusChange('occ-1', AdhesiveStatus.OK); // remplacé

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        expect(occ.previousConstats).toHaveLength(2);
        expect(occ.previousConstats!.map(c => c.status)).toEqual([AdhesiveStatus.OK, AdhesiveStatus.ToBeReplaced]);
        expect(occ.status).toBe(AdhesiveStatus.OK);
    });

    it('un objet devenu Absent reste traçable : conservé, jamais supprimé, son ancien constat OK reste dans l\'historique', async () => {
        const lieu = stationWithCustomModule([{
            id: 'occ-1', referenceId: 'pdq-1', location: 'Entrée rue X',
            status: AdhesiveStatus.OK, constatedAt: '2026-08-28T00:00:00.000Z',
        }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditNewConstat('occ-1');
        await useAuditStore.getState().handleCustomAuditOccurrenceStatusChange('occ-1', AdhesiveStatus.Absent);

        const stored = await db.lieux.get(lieu.id);
        const data = stored!.modules[0].data as CustomAuditData;
        expect(data.occurrences).toHaveLength(1); // jamais supprimé
        expect(data.occurrences[0].status).toBe(AdhesiveStatus.Absent);
        expect(data.occurrences[0].previousConstats![0].status).toBe(AdhesiveStatus.OK);
    });

    it('la photo et le commentaire du constat archivé ne persistent pas dans le constat courant repartant à vide', async () => {
        const lieu = stationWithCustomModule([{
            id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.OK, comment: 'Bon état',
            photo_base64: 'data:image/jpeg;base64,ZmFrZQ==', photo_note: 'note', photo_rotation: 90,
            constatedAt: '2026-08-28T00:00:00.000Z',
        }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditNewConstat('occ-1');

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        expect(occ.status).toBe(AdhesiveStatus.NotChecked);
        expect(occ.comment).toBeUndefined();
        expect(occ.photo_base64).toBeUndefined();
        expect(occ.photo_note).toBeUndefined();
        expect(occ.photo_rotation).toBeUndefined();
        // Mais le constat archivé, lui, garde son statut et son commentaire (pas de photo, par conception).
        expect(occ.previousConstats![0]).toEqual({ status: AdhesiveStatus.OK, comment: 'Bon état', constatedAt: '2026-08-28T00:00:00.000Z' });
    });
});

// -----------------------------------------------------------------
// ÉTAT 3 — VÉRIFICATION DU MODULE SANS OCCURRENCE : les trois états
// bien séparés, aucun objet fictif.
// -----------------------------------------------------------------
describe('lastCheckedAt — module vérifié sans occurrence, distinct de "jamais vérifié"', () => {
    it('état 1 : aucune occurrence, jamais vérifié', async () => {
        const lieu = stationWithCustomModule();
        const data = lieu.modules[0].data as CustomAuditData;
        expect(data.occurrences).toHaveLength(0);
        expect(data.lastCheckedAt).toBeUndefined();
    });

    it('état 3 : handleCustomAuditMarkChecked pose lastCheckedAt SANS créer d\'occurrence', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditMarkChecked();

        const stored = await db.lieux.get(lieu.id);
        const data = stored!.modules[0].data as CustomAuditData;
        expect(data.occurrences).toHaveLength(0); // toujours aucun objet fictif
        expect(data.lastCheckedAt).toBeDefined();
    });

    it('état 2 (objet constaté) est bien distinct de l\'état 3 (vérifié, rien trouvé) au niveau des données', async () => {
        const verifiedEmpty = stationWithCustomModule([], '2026-08-28T00:00:00.000Z');
        const withObject = stationWithCustomModule([{ id: 'o1', referenceId: 'pdq-1', status: AdhesiveStatus.OK, constatedAt: '2026-08-28T00:00:00.000Z' }]);
        const neverChecked = stationWithCustomModule();

        const d1 = verifiedEmpty.modules[0].data as CustomAuditData;
        const d2 = withObject.modules[0].data as CustomAuditData;
        const d3 = neverChecked.modules[0].data as CustomAuditData;

        expect(d1.occurrences).toHaveLength(0);
        expect(d1.lastCheckedAt).toBeDefined();
        expect(d2.occurrences).toHaveLength(1);
        expect(d3.occurrences).toHaveLength(0);
        expect(d3.lastCheckedAt).toBeUndefined();
    });

    it('ajouter une occurrence met aussi lastCheckedAt à jour (une vérification a bien eu lieu)', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleAddCustomAuditOccurrence('pdq-1');

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).lastCheckedAt).toBeDefined();
    });
});

describe('handleCustomAuditOccurrenceCommentChange / handleCustomAuditOccurrenceLocationChange', () => {
    it('le commentaire et l\'emplacement d\'une occurrence se modifient indépendamment de son statut', async () => {
        const lieu = stationWithCustomModule([{ id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z' }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditOccurrenceCommentChange('occ-1', 'Vu par temps de pluie');
        await useAuditStore.getState().handleCustomAuditOccurrenceLocationChange('occ-1', 'Entrée rue X, côté gauche');

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        expect(occ.comment).toBe('Vu par temps de pluie');
        expect(occ.location).toBe('Entrée rue X, côté gauche');
        expect(occ.status).toBe(AdhesiveStatus.OK); // inchangé
    });
});

describe('Photo — handleCustomAuditPhotoChange / PhotoNoteChange / PhotoRotationChange', () => {
    it('ajoute une photo à une occurrence existante', async () => {
        const lieu = stationWithCustomModule([{ id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z' }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditPhotoChange('occ-1', 'data:image/jpeg;base64,ZmFrZQ==');

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        expect(occ.photo_base64).toBe('data:image/jpeg;base64,ZmFrZQ==');
    });

    it('supprimer la photo retire aussi la note et la rotation, jamais le statut', async () => {
        const lieu = stationWithCustomModule([{
            id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.OK,
            photo_base64: 'data:image/jpeg;base64,ZmFrZQ==', photo_note: 'Note', photo_rotation: 90,
            constatedAt: '2026-01-01T00:00:00.000Z',
        }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditPhotoChange('occ-1', null);

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        expect(occ.photo_base64).toBeUndefined();
        expect(occ.photo_note).toBeUndefined();
        expect(occ.photo_rotation).toBeUndefined();
        expect(occ.status).toBe(AdhesiveStatus.OK);
    });

    it('note et rotation de photo se persistent indépendamment', async () => {
        const lieu = stationWithCustomModule([{ id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.OK, photo_base64: 'data:image/jpeg;base64,ZmFrZQ==', constatedAt: '2026-01-01T00:00:00.000Z' }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditPhotoNoteChange('occ-1', 'Panneau décoloré côté nord');
        await useAuditStore.getState().handleCustomAuditPhotoRotationChange('occ-1', 270);

        const stored = await db.lieux.get(lieu.id);
        const occ = (stored!.modules[0].data as CustomAuditData).occurrences[0];
        expect(occ.photo_note).toBe('Panneau décoloré côté nord');
        expect(occ.photo_rotation).toBe(270);
    });
});

describe('handleCustomAuditCommentChange (commentaire général du module)', () => {
    it('écrit le commentaire du module, distinct des commentaires par occurrence', async () => {
        const lieu = stationWithCustomModule();
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleCustomAuditCommentChange('Tournée du 28/08/2026, RAS globalement.');

        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).comment).toBe('Tournée du 28/08/2026, RAS globalement.');
    });
});

describe('handleResetCustomAudit', () => {
    it('vide occurrences, comment et lastCheckedAt, archive un instantané dans l\'historique, journalise', async () => {
        const lieu = stationWithCustomModule(
            [{ id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.OK, photo_base64: 'data:image/jpeg;base64,ZmFrZQ==', constatedAt: '2026-01-01T00:00:00.000Z' }],
            '2026-01-01T00:00:00.000Z'
        );
        (lieu.modules[0].data as CustomAuditData).comment = 'À vérifier';
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'mod-pdq' });

        await useAuditStore.getState().handleResetCustomAudit();

        const stored = await db.lieux.get(lieu.id);
        const data = stored!.modules[0].data as CustomAuditData;
        expect(data.occurrences).toEqual([]);
        expect(data.comment).toBe('');
        expect(data.lastCheckedAt).toBeUndefined();

        const history = await db.history.toArray();
        expect(history).toHaveLength(1);
        expect(history[0].type).toBe('SINGLE_AUDIT');

        const events = await db.events.toArray();
        expect(events.some(e => e.type === 'RESET_AUDIT')).toBe(true);
    });
});

// -----------------------------------------------------------------
// NON-RÉGRESSION
// -----------------------------------------------------------------
describe('Non-régression', () => {
    it('handleCustomAuditOccurrenceStatusChange sur un module absent (mauvais selectedModuleId) ne lève pas et ne touche rien', async () => {
        const lieu = stationWithCustomModule([{ id: 'occ-1', referenceId: 'pdq-1', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z' }]);
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-inexistant' });

        await expect(useAuditStore.getState().handleCustomAuditOccurrenceStatusChange('occ-1', AdhesiveStatus.OK)).resolves.not.toThrow();
        const stored = await db.lieux.get(lieu.id);
        expect((stored!.modules[0].data as CustomAuditData).occurrences[0].status).toBe(AdhesiveStatus.NotChecked);
    });
});
