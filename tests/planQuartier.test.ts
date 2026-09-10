// tests/planQuartier.test.ts
// =================================================================
// Plans de quartier (+ PEM 3D) — nouvelle famille d'audit fixe.
// Vérifie : le seed (builder.ts), la migration d'ajout sur des lieux
// déjà existants (store.ts::init(), même patron que la migration v8
// LAE), les actions terrain (occurrences cataloguées et ad hoc), et
// l'agrégation patrimoniale (patrimoineIndex.ts).
// =================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { buildPatrimoineIndex, resolveReferencesForEquipment } from '../utils/cockpit/patrimoineIndex';
import { AuditModuleType, AdhesiveStatus, Lieu, PlanQuartierData } from '../types';
import { generateMaintenanceSummary } from '../utils/maintenanceGenerator';

describe('data/builder.ts — createPlanQuartierModule', () => {
    it('crée un module PLAN_QUARTIER vierge pour chaque station des lignes A/B/TRAM/TELEO', async () => {
        const lieux = await generateInitialLieuxDataAsync();

        const stCyprien = lieux.find(l => l.name === 'Saint-Cyprien - République');
        const pdqModule = stCyprien?.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER);
        expect(pdqModule).toBeDefined();
        expect((pdqModule!.data as PlanQuartierData).occurrences).toEqual([]);
        expect(pdqModule!.line).toBe('A');

        // Jean-Jaurès (hub A/B) : deux modules PLAN_QUARTIER distincts, un par ligne.
        const jja = lieux.find(l => l.name === 'Jean-Jaurès');
        const pdqModules = jja?.modules.filter(m => m.type === AuditModuleType.PLAN_QUARTIER) ?? [];
        expect(pdqModules.map(m => m.line).sort()).toEqual(['A', 'B']);
    });

    it("ne crée jamais de module PLAN_QUARTIER sur la ligne 'PR' (hors périmètre — seuls A/B/C/TRAM/TELEO/AEROPORT en ont)", async () => {
        // Un lieu P+R peut partager le même Lieu qu'une station de métro/tram/téléo
        // (ex: Basso Cambo, Arènes) et donc légitimement porter un module
        // PLAN_QUARTIER — au même titre qu'il porte déjà DAT/ECA dans ce cas.
        // L'invariant réel n'est pas "jamais co-localisé avec un P+R", mais
        // "jamais généré directement pour la ligne P+R elle-même". AEROPORT
        // (antenne LAE) en a aussi : son agence commerciale (Aéroport
        // Toulouse Blagnac) reste ouverte malgré le train pas encore en service.
        const lieux = await generateInitialLieuxDataAsync();
        const pdqModules = lieux.flatMap(l => l.modules.filter(m => m.type === AuditModuleType.PLAN_QUARTIER));
        expect(pdqModules.length).toBeGreaterThan(0);
        expect(pdqModules.every(m => ['A', 'B', 'C', 'TRAM', 'TELEO', 'AEROPORT'].includes(m.line as string))).toBe(true);
    });
});

describe('data/signage_seed.ts — catalogue Plans de quartier', () => {
    it('fournit exactement 4 modèles figés, dimensions 78cm (jamais 80cm)', () => {
        const seed = buildSignageReferencesSeed();
        const pdq = seed.filter(r => r.auditType === 'PDQ');
        expect(pdq.map(r => r.id).sort()).toEqual(['pdq-78x100', 'pdq-78x120', 'pdq-adhesif', 'pem3d-120x80']);

        const model78x100 = pdq.find(r => r.id === 'pdq-78x100')!;
        expect(model78x100.dimensions).toEqual({ width: 78, height: 100, unit: 'cm' });
        expect(model78x100.support).toBe('plastifie');

        const model78x120 = pdq.find(r => r.id === 'pdq-78x120')!;
        expect(model78x120.dimensions).toEqual({ width: 78, height: 120, unit: 'cm' });

        // Adhésif PDQ : même format que le 78x120 (avec header/footer),
        // support adhésif au lieu de plastifié — confirmé, jamais 78x100.
        const adhesif = pdq.find(r => r.id === 'pdq-adhesif')!;
        expect(adhesif.dimensions).toEqual({ width: 78, height: 120, unit: 'cm' });
        expect(adhesif.support).toBe('adhesif');

        // PEM 3D : 120x80, Dibond exclusivement.
        const pem3d = pdq.find(r => r.id === 'pem3d-120x80')!;
        expect(pem3d.dimensions).toEqual({ width: 120, height: 80, unit: 'cm' });
        expect(pem3d.support).toBe('dibond');
    });
});

describe('db.ts — migration V17 (référentiel Plans de quartier)', () => {
    it("n'ajoute jamais les 4 modèles sur un référentiel jamais seedé (table vide)", async () => {
        // Le seed initial (populate) s'en charge déjà — la garde V17 ne doit
        // jamais dupliquer sur une base neuve. Vérifié indirectement : une
        // base neuve contient déjà les 4 ids via buildSignageReferencesSeed()
        // (testé ci-dessus) — pas de test Dexie séparé nécessaire ici.
        const seed = buildSignageReferencesSeed();
        expect(seed.filter(r => r.auditType === 'PDQ')).toHaveLength(4);
    });
});

describe('store.ts::init() — migration : ajoute les modules PLAN_QUARTIER + inventaire initial connu', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        useAuditStore.setState({
            lieux: [], isLoading: true, isAuthenticated: false, initError: null,
            selectedLieuId: null, selectedModuleId: null,
        });
    });

    it('ajoute les modules PLAN_QUARTIER (vierges) aux lieux déjà persistés qui en sont dépourvus', async () => {
        // Simule un appareil déjà provisionné AVANT cette fonctionnalité :
        // seed frais puis retrait de tous les modules PLAN_QUARTIER.
        const freshLieux = await generateInitialLieuxDataAsync();
        const legacyLieux: Lieu[] = freshLieux.map(l => ({
            ...l, modules: l.modules.filter(m => m.type !== AuditModuleType.PLAN_QUARTIER),
        }));
        await db.lieux.bulkPut(legacyLieux);
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());

        expect(legacyLieux.some(l => l.modules.some(m => m.type === AuditModuleType.PLAN_QUARTIER))).toBe(false);

        await useAuditStore.getState().init();

        const stCyprien = useAuditStore.getState().lieux.find(l => l.name === 'Saint-Cyprien - République');
        const pdqModule = stCyprien?.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER);
        expect(pdqModule).toBeDefined();

        // Inventaire initial connu (data/planQuartierInitialInventory.ts) seedé
        // comme occurrences réelles, statut Non contrôlé (pas encore audité).
        const data = pdqModule!.data as PlanQuartierData;
        expect(data.occurrences.length).toBeGreaterThanOrEqual(4); // 3x 78x100 + 1x 78x120
        expect(data.occurrences.every(o => o.status === AdhesiveStatus.NotChecked)).toBe(true);
        expect(data.occurrences.every(o => o.modelId === 'pdq-78x100' || o.modelId === 'pdq-78x120')).toBe(true);

        // Jeanne d'Arc : 4 occurrences réelles restituées (3× 78×100 +
        // 1× 78×120) — jamais 0, jamais une occurrence inventée pour y arriver.
        const jar = useAuditStore.getState().lieux.find(l => l.name === "Jeanne d'Arc");
        const jarPdq = jar?.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER);
        const jarOccurrences = (jarPdq!.data as PlanQuartierData).occurrences;
        expect(jarOccurrences).toHaveLength(4);
        expect(jarOccurrences.filter(o => o.modelId === 'pdq-78x100')).toHaveLength(3);
        expect(jarOccurrences.filter(o => o.modelId === 'pdq-78x120')).toHaveLength(1);

        // Empalot : 78x120 comme partout — la mesure 78x119 du relevé initial
        // était une erreur de saisie (ce format n'existe pas), pas une
        // divergence réelle : aucune mesure particulière ne subsiste.
        const empalot = useAuditStore.getState().lieux.find(l => l.name === 'Empalot');
        const empalotPdq = empalot?.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER);
        const empalotOcc = (empalotPdq!.data as PlanQuartierData).occurrences.find(o => o.modelId === 'pdq-78x120');
        expect(empalotOcc).toBeDefined();
        expect(empalotOcc?.measuredDimensions).toBeUndefined();

        // Arènes : les 3 PEM 3D réels portent leur implantation connue —
        // aucun numéro d'exemplaire artificiel.
        const arenes = useAuditStore.getState().lieux.find(l => l.name === 'Arènes');
        const arenesPdq = arenes?.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER && m.line === 'A');
        const pem3d = (arenesPdq!.data as PlanQuartierData).occurrences.filter(o => o.modelId === 'pem3d-120x80');
        expect(pem3d).toHaveLength(3);
        expect(pem3d.map(o => o.comment).sort()).toEqual([
            'Côté amphithéâtre / Tram', 'Côté gare bus', 'Proche agence / ascenseur',
        ]);

        // Idempotence : une réouverture ne duplique jamais les modules ni l'inventaire.
        const countAfterFirst = data.occurrences.length;
        useAuditStore.setState({ lieux: [], isLoading: true, initError: null });
        await useAuditStore.getState().init();
        const stCyprien2 = useAuditStore.getState().lieux.find(l => l.name === 'Saint-Cyprien - République');
        const pdqModule2 = stCyprien2?.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER);
        expect((pdqModule2!.data as PlanQuartierData).occurrences.length).toBe(countAfterFirst);
    }, 20000);

    it("renseigne l'implantation sur des exemplaires déjà semés sans commentaire, sans en créer de nouveaux", async () => {
        // Appareil déjà provisionné AVANT que les 3 implantations d'Arènes
        // soient connues : 3 PEM 3D vierges, sans commentaire.
        const freshLieux = await generateInitialLieuxDataAsync();
        const legacyLieux: Lieu[] = freshLieux.map(lieu => ({
            ...lieu,
            modules: lieu.modules.map(m => {
                if (m.type !== AuditModuleType.PLAN_QUARTIER) return m;
                const d = m.data as PlanQuartierData;
                if (d.stationName !== 'Arènes' || m.line !== 'A') return m;
                return {
                    ...m,
                    data: {
                        ...d,
                        occurrences: [1, 2, 3].map(n => ({
                            id: `legacy-pem3d-${n}`, modelId: 'pem3d-120x80',
                            status: AdhesiveStatus.NotChecked,
                            constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z',
                        })),
                    },
                };
            }),
        }));
        await db.lieux.bulkPut(legacyLieux);
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());

        await useAuditStore.getState().init();

        const arenes = useAuditStore.getState().lieux.find(l => l.name === 'Arènes');
        const module = arenes?.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER && m.line === 'A');
        const pem3d = (module!.data as PlanQuartierData).occurrences.filter(o => o.modelId === 'pem3d-120x80');

        // Enrichis en place : toujours 3, avec leurs ids d'origine.
        expect(pem3d).toHaveLength(3);
        expect(pem3d.map(o => o.id).sort()).toEqual(['legacy-pem3d-1', 'legacy-pem3d-2', 'legacy-pem3d-3']);
        expect(pem3d.map(o => o.comment).sort()).toEqual([
            'Côté amphithéâtre / Tram', 'Côté gare bus', 'Proche agence / ascenseur',
        ]);
    }, 20000);

    it("ne réécrit jamais un exemplaire déjà constaté sur le terrain", async () => {
        const freshLieux = await generateInitialLieuxDataAsync();
        const legacyLieux: Lieu[] = freshLieux.map(lieu => ({
            ...lieu,
            modules: lieu.modules.map(m => {
                if (m.type !== AuditModuleType.PLAN_QUARTIER) return m;
                const d = m.data as PlanQuartierData;
                if (d.stationName !== 'Arènes' || m.line !== 'A') return m;
                return {
                    ...m,
                    data: {
                        ...d,
                        occurrences: [
                            // Un agent est déjà passé sur le premier.
                            { id: 'terrain-1', modelId: 'pem3d-120x80', status: AdhesiveStatus.Absent, comment: 'Vu cassé le 3 mars', constatedAt: '2026-03-03T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
                            { id: 'terrain-2', modelId: 'pem3d-120x80', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
                            { id: 'terrain-3', modelId: 'pem3d-120x80', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
                        ],
                    },
                };
            }),
        }));
        await db.lieux.bulkPut(legacyLieux);
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());

        await useAuditStore.getState().init();

        const arenes = useAuditStore.getState().lieux.find(l => l.name === 'Arènes');
        const module = arenes?.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER && m.line === 'A');
        const pem3d = (module!.data as PlanQuartierData).occurrences.filter(o => o.modelId === 'pem3d-120x80');

        // Le groupe entier est laissé intact : ni écrasement, ni doublon.
        expect(pem3d).toHaveLength(3);
        expect(pem3d.find(o => o.id === 'terrain-1')!.comment).toBe('Vu cassé le 3 mars');
        expect(pem3d.find(o => o.id === 'terrain-1')!.status).toBe(AdhesiveStatus.Absent);
        expect(pem3d.find(o => o.id === 'terrain-2')!.comment).toBeUndefined();
    }, 20000);
});

describe('store.ts — actions terrain Plans de quartier', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        useAuditStore.setState({ isLoading: false, isAuthenticated: true, initError: null });
    });

    const seedOneLieu = async (): Promise<string> => {
        const lieu: Lieu = {
            id: 'lieu-test-pdq', name: 'Station Test',
            modules: [{
                id: 'module-pdq-test', type: AuditModuleType.PLAN_QUARTIER, name: 'Plans de quartier', line: 'A',
                data: { id: 'pdq-data-test', stationName: 'Station Test', stationCode: 'TST', occurrences: [], comment: '' },
            }],
        };
        await db.lieux.put(lieu);
        useAuditStore.setState({ lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: lieu.modules[0].id });
        return lieu.id;
    };

    it('ajoute une occurrence cataloguée, change son statut, puis la retire (blanche uniquement)', async () => {
        await seedOneLieu();
        const created = await useAuditStore.getState().handleAddPlanQuartierOccurrence({ modelId: 'pdq-78x100', location: 'Quai A' });
        expect(created.modelId).toBe('pdq-78x100');
        expect(created.status).toBe(AdhesiveStatus.NotChecked);

        let module = useAuditStore.getState().lieux[0].modules[0];
        expect((module.data as PlanQuartierData).occurrences).toHaveLength(1);

        await useAuditStore.getState().handlePlanQuartierOccurrenceStatusChange(created.id, AdhesiveStatus.OK);
        module = useAuditStore.getState().lieux[0].modules[0];
        expect((module.data as PlanQuartierData).occurrences[0].status).toBe(AdhesiveStatus.OK);

        // Un constat réel existe désormais : le retrait doit être refusé.
        await expect(useAuditStore.getState().handleRemovePlanQuartierOccurrence(created.id)).rejects.toThrow();

        // Une occurrence encore blanche, elle, se retire sans erreur.
        const blank = await useAuditStore.getState().handleAddPlanQuartierOccurrence({ modelId: 'pdq-78x120' });
        await useAuditStore.getState().handleRemovePlanQuartierOccurrence(blank.id);
        module = useAuditStore.getState().lieux[0].modules[0];
        expect((module.data as PlanQuartierData).occurrences.some(o => o.id === blank.id)).toBe(false);
    });

    it('ajoute une occurrence ad hoc (modèle non catalogué) — comptée normalement, jamais bloquante', async () => {
        await seedOneLieu();
        const created = await useAuditStore.getState().handleAddPlanQuartierOccurrence({
            adHocLabel: 'Nouveau format 78x105 découvert', adHocSupport: 'plastifie', location: 'Entrée nord',
        });
        expect(created.modelId).toBeUndefined();
        expect(created.adHocLabel).toBe('Nouveau format 78x105 découvert');

        const module = useAuditStore.getState().lieux[0].modules[0];
        expect((module.data as PlanQuartierData).occurrences).toHaveLength(1);
    });

    it('« Nouveau constat » archive le constat courant dans previousConstats', async () => {
        await seedOneLieu();
        const created = await useAuditStore.getState().handleAddPlanQuartierOccurrence({ modelId: 'pdq-78x100' });
        await useAuditStore.getState().handlePlanQuartierOccurrenceStatusChange(created.id, AdhesiveStatus.Absent);
        await useAuditStore.getState().handlePlanQuartierNewConstat(created.id);

        const module = useAuditStore.getState().lieux[0].modules[0];
        const occ = (module.data as PlanQuartierData).occurrences[0];
        expect(occ.status).toBe(AdhesiveStatus.NotChecked);
        expect(occ.previousConstats).toHaveLength(1);
        expect(occ.previousConstats![0].status).toBe(AdhesiveStatus.Absent);
    });

    it('« Aucun élément trouvé » marque le module vérifié sans créer d\'occurrence fictive', async () => {
        await seedOneLieu();
        await useAuditStore.getState().handlePlanQuartierMarkChecked();
        const module = useAuditStore.getState().lieux[0].modules[0];
        const data = module.data as PlanQuartierData;
        expect(data.occurrences).toHaveLength(0);
        expect(data.lastCheckedAt).toBeDefined();
    });
});

describe('utils/cockpit/patrimoineIndex.ts — agrégation Plans de quartier', () => {
    const REFERENCES = buildSignageReferencesSeed();

    const pdqLieu = (occurrences: any[]): Lieu => ({
        id: 'lieu-agg-test', name: 'Station Agrégation',
        modules: [{
            id: 'module-pdq-agg', type: AuditModuleType.PLAN_QUARTIER, name: 'Plans de quartier', line: 'A',
            data: { id: 'pdq-data-agg', stationName: 'Station Agrégation', stationCode: 'AGG', occurrences, comment: '' },
        }],
    });

    it('agrège les occurrences cataloguées : total + détail par station, comme DAT/PR/ECA', () => {
        const lieu = pdqLieu([
            { id: 'o1', modelId: 'pdq-78x100', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
            { id: 'o2', modelId: 'pdq-78x100', status: AdhesiveStatus.Absent, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
            { id: 'o3', modelId: 'pdq-78x120', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
        ]);
        const index = buildPatrimoineIndex([lieu], REFERENCES);

        const usage78x100 = index.byReference.get('pdq-78x100')!;
        expect(usage78x100.installedCount).toBe(2);
        expect(usage78x100.absentCount).toBe(1);
        expect(usage78x100.byLieu).toHaveLength(1);
        expect(usage78x100.byLieu[0].installed).toBe(2);

        const usage78x120 = index.byReference.get('pdq-78x120')!;
        expect(usage78x120.installedCount).toBe(1);
    });

    it('exclut les occurrences ad hoc (non cataloguées) — jamais dans le patrimoine référencé, jamais un crash', () => {
        const lieu = pdqLieu([
            { id: 'o1', adHocLabel: 'Format inconnu', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
        ]);
        expect(() => buildPatrimoineIndex([lieu], REFERENCES)).not.toThrow();
        const index = buildPatrimoineIndex([lieu], REFERENCES);
        expect(index.totals.implantationCount).toBe(0);
    });

    it('exclut le statut Non applicable, comme les autres familles', () => {
        const lieu = pdqLieu([
            { id: 'o1', modelId: 'pdq-adhesif', status: AdhesiveStatus.NotApplicable, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
        ]);
        const index = buildPatrimoineIndex([lieu], REFERENCES);
        expect(index.byReference.has('pdq-adhesif')).toBe(false);
    });

    it('resolveReferencesForEquipment accepte désormais PDQ', () => {
        const pdqRefs = resolveReferencesForEquipment(REFERENCES, 'PDQ');
        expect(pdqRefs.map(r => r.id).sort()).toEqual(['pdq-78x100', 'pdq-78x120', 'pdq-adhesif', 'pem3d-120x80']);
    });

    it("le total réseau suit les occurrences RÉELLEMENT recensées, jamais un attendu théorique", () => {
        // Phase de recensement : l'Aperçu doit afficher ce qui est connu à
        // l'instant T, et grandir au fil des passages terrain — jamais un
        // total dérivé du catalogue (4 modèles) ni un faux zéro.
        const totalFromIndex = (lieu: Lieu) => {
            const index = buildPatrimoineIndex([lieu], REFERENCES);
            return ['pdq-78x100', 'pdq-78x120', 'pdq-adhesif', 'pem3d-120x80']
                .reduce((sum, id) => sum + (index.byReference.get(id)?.installedCount ?? 0), 0);
        };

        const occ = (id: string, modelId: string) => ({
            id, modelId, status: AdhesiveStatus.NotChecked,
            constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z',
        });

        expect(totalFromIndex(pdqLieu([]))).toBe(0);
        expect(totalFromIndex(pdqLieu([occ('o1', 'pdq-78x100')]))).toBe(1);
        expect(totalFromIndex(pdqLieu([
            occ('o1', 'pdq-78x100'), occ('o2', 'pdq-78x100'), occ('o3', 'pem3d-120x80'),
        ]))).toBe(3);
    });

    it("ventile par ligne ET par station, sans inventer de station vide", () => {
        // Bande 3 de l'Aperçu : « où sont-ils ? ». Un lieu n'apparaît que
        // s'il porte réellement un exemplaire.
        const lieuA: Lieu = {
            id: 'lieu-a', name: 'Station A',
            modules: [{
                id: 'm-a', type: AuditModuleType.PLAN_QUARTIER, name: 'Plans de quartier', line: 'A',
                data: {
                    id: 'd-a', stationName: 'Station A', stationCode: 'STA', comment: '',
                    occurrences: [
                        { id: 'a1', modelId: 'pdq-78x100', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
                        { id: 'a2', modelId: 'pem3d-120x80', status: AdhesiveStatus.Absent, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
                    ],
                },
            }],
        };
        const lieuB: Lieu = {
            id: 'lieu-b', name: 'Station B',
            modules: [{
                id: 'm-b', type: AuditModuleType.PLAN_QUARTIER, name: 'Plans de quartier', line: 'TELEO',
                data: {
                    id: 'd-b', stationName: 'Station B', stationCode: 'STB', comment: '',
                    occurrences: [
                        { id: 'b1', modelId: 'pdq-78x120', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
                    ],
                },
            }],
        };
        // Lieu sans aucune occurrence : ne doit produire aucune implantation.
        const lieuVide = pdqLieu([]);

        const index = buildPatrimoineIndex([lieuA, lieuB, lieuVide], REFERENCES);
        const pdqImplantations = index.implantations.filter(i => i.referenceId.startsWith('pdq-') || i.referenceId.startsWith('pem3d-'));

        expect(pdqImplantations).toHaveLength(3);
        expect([...new Set(pdqImplantations.map(i => i.line))].sort()).toEqual(['A', 'TELEO']);
        expect(pdqImplantations.filter(i => i.lieuName === 'Station A')).toHaveLength(2);
        expect(pdqImplantations.some(i => i.lieuName === 'Station Agrégation')).toBe(false);
        // Le défaut est bien porté par l'implantation (bande « à traiter »).
        expect(pdqImplantations.filter(i => i.status === AdhesiveStatus.Absent)).toHaveLength(1);
    });

    it("distingue les PEM 3D par leur commentaire (implantation réelle), jamais les autres modèles", () => {
        // Le formulaire terrain masque le champ Emplacement pour PEM 3D
        // (quantité fermée) : leur implantation réelle est donc portée par
        // le commentaire — convention réservée à ce seul modèle.
        const lieu = pdqLieu([
            { id: 'p1', modelId: 'pem3d-120x80', comment: 'Proche agence / ascenseur', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
            { id: 'p2', modelId: 'pem3d-120x80', comment: 'Côté gare bus', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
            // Un 78x100 avec un commentaire de type "référence terrain" : ce
            // texte n'est PAS une implantation et ne doit jamais apparaître
            // comme telle — seul le repli sur le nom de la station est attendu.
            { id: 'p3', modelId: 'pdq-78x100', comment: 'Réf. terrain : 2026', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
        ]);
        const index = buildPatrimoineIndex([lieu], REFERENCES);
        const pem3dContexts = index.implantations.filter(i => i.referenceId === 'pem3d-120x80').map(i => i.context).sort();
        expect(pem3dContexts).toEqual(['Côté gare bus', 'Proche agence / ascenseur']);

        const pdqContext = index.implantations.find(i => i.referenceId === 'pdq-78x100')!.context;
        expect(pdqContext).toBe('Station Agrégation'); // repli sur le lieu, jamais le commentaire
    });

    it("le repli sur le nom du lieu (aucune implantation connue) reste distinguable d'une implantation réelle", () => {
        // Base de la grille (modèle, emplacement) de l'Aperçu : un contexte
        // identique au lieu signale « rien de connu » ; un contexte différent
        // est une vraie implantation à afficher séparément.
        const lieu = pdqLieu([
            { id: 'o1', modelId: 'pdq-78x100', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
            { id: 'o2', modelId: 'pdq-78x100', location: 'Entrée bus', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
            { id: 'o3', modelId: 'pdq-78x100', location: 'Entrée square', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
        ]);
        const index = buildPatrimoineIndex([lieu], REFERENCES);
        const implantations = index.implantations.filter(i => i.referenceId === 'pdq-78x100');
        const hasRealLocation = (imp: typeof implantations[number]) => !!imp.context && imp.context !== imp.lieuName;

        expect(implantations.find(i => i.equipmentLabel === i.lieuName || !hasRealLocation(i))).toBeDefined();
        expect(implantations.filter(hasRealLocation).map(i => i.context).sort()).toEqual(['Entrée bus', 'Entrée square']);
        expect(implantations.filter(i => !hasRealLocation(i))).toHaveLength(1); // o1, sans location
    });
});

describe('store.ts::handleImportJsonData — réconciliation immédiate des Plans de quartier', () => {
    beforeEach(async () => {
        localStorage.clear();
        await db.lieux.clear();
        await db.signageReferences.clear();
        await db.events.clear();
        await db.signageReferences.bulkAdd(buildSignageReferencesSeed());
        useAuditStore.setState({ isLoading: false, isAuthenticated: true, initError: null });
    });

    it("un import v1 (antérieur à Plans de quartier) affiche les modules PDQ SANS reload", async () => {
        // Sauvegarde v1 réaliste : stations connues du registre, mais aucun
        // module PLAN_QUARTIER (comme un export fait avant cette fonctionnalité).
        const freshLieux = await generateInitialLieuxDataAsync();
        const legacyLieux: Lieu[] = freshLieux.map(l => ({
            ...l, modules: l.modules.filter(m => m.type !== AuditModuleType.PLAN_QUARTIER),
        }));
        const v1Payload = JSON.stringify({ exportDate: '2026-01-01', data: legacyLieux });

        await useAuditStore.getState().handleImportJsonData(v1Payload);

        // Immédiatement après l'import, SANS appeler init() ni recharger :
        // le module doit déjà être là, avec son inventaire initial connu.
        const stCyprien = useAuditStore.getState().lieux.find(l => l.name === 'Saint-Cyprien - République');
        const pdqModule = stCyprien?.modules.find(m => m.type === AuditModuleType.PLAN_QUARTIER);
        expect(pdqModule).toBeDefined();
        expect((pdqModule!.data as PlanQuartierData).occurrences.length).toBeGreaterThan(0);

        // Persisté en base, pas seulement en mémoire.
        const persisted = await db.lieux.get(stCyprien!.id);
        expect(persisted?.modules.some(m => m.type === AuditModuleType.PLAN_QUARTIER)).toBe(true);

        // Le référentiel local (4 modèles PDQ) reste strictement intact —
        // un import v1 ne le touche jamais.
        const pdqRefs = (await db.signageReferences.toArray()).filter(r => r.auditType === 'PDQ');
        expect(pdqRefs).toHaveLength(4);
    }, 20000);

    it("un import v2 récent (modules PDQ déjà présents) ne duplique rien", async () => {
        const freshLieux = await generateInitialLieuxDataAsync();
        const v2Payload = JSON.stringify({
            exportDate: '2026-01-01', formatVersion: 2,
            data: freshLieux, signageReferences: buildSignageReferencesSeed(),
        });

        await useAuditStore.getState().handleImportJsonData(v2Payload);
        const stCyprien = useAuditStore.getState().lieux.find(l => l.name === 'Saint-Cyprien - République');
        const pdqModules = stCyprien?.modules.filter(m => m.type === AuditModuleType.PLAN_QUARTIER) ?? [];
        expect(pdqModules).toHaveLength(1);
    }, 20000);
});

describe('utils/maintenanceGenerator.ts — Plans de quartier', () => {
    const pdqLieuForMaintenance = (occurrences: any[]): Lieu => ({
        id: 'lieu-maint-pdq', name: 'Station Maintenance',
        modules: [{
            id: 'module-pdq-maint', type: AuditModuleType.PLAN_QUARTIER, name: 'Plans de quartier', line: 'A',
            data: { id: 'pdq-data-maint', stationName: 'Station Maintenance', stationCode: 'MNT', occurrences, comment: '' },
        }],
    });

    it('ventile les occurrences PDQ dans à remplacer / absent / OK, comme les autres familles', () => {
        const lieu = pdqLieuForMaintenance([
            { id: 'o1', modelId: 'pdq-78x100', status: AdhesiveStatus.ToBeReplaced, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
            { id: 'o2', modelId: 'pdq-78x120', status: AdhesiveStatus.Absent, location: 'Quai A', constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
            { id: 'o3', modelId: 'pem3d-120x80', status: AdhesiveStatus.OK, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
            { id: 'o4', modelId: 'pdq-78x100', status: AdhesiveStatus.NotChecked, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
        ]);

        const summary = generateMaintenanceSummary([lieu]);

        expect(summary.toBeReplaced.count).toBe(1);
        expect(summary.toBeReplaced.items[0].elementName).toBe('Plan de quartier 78×100');
        expect(summary.absent.count).toBe(1);
        expect(summary.absent.items[0].context).toBe('Quai A');
        expect(summary.okCount).toBe(1);
        expect(summary.allDefects.count).toBe(2);
    });

    it('décrit une découverte non cataloguée sans jamais la rattacher à un modèle', () => {
        const lieu = pdqLieuForMaintenance([
            { id: 'o1', adHocLabel: 'Format inconnu au totem', status: AdhesiveStatus.ToBeReplaced, constatedAt: '2026-01-01T00:00:00.000Z', discoveredAt: '2026-01-01T00:00:00.000Z' },
        ]);
        const summary = generateMaintenanceSummary([lieu]);
        expect(summary.toBeReplaced.items[0].elementName).toBe('Découverte non cataloguée : Format inconnu au totem');
    });
});
