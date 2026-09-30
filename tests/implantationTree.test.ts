// tests/implantationTree.test.ts
// =================================================================
// Référentiel → Implantations : arbre Ligne → Station → Accès →
// Équipement → Référence (→ Zone) et filtre par matière (cards).
// Vérifié sur le réseau réellement seedé par le store (données de
// démarrage + migrations), pas sur une fixture : c'est le parc complet
// qui doit rester intégralement accessible et cohérent entre vues.
// =================================================================
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { buildPatrimoineIndex, PatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { buildImplantationTree, filterImplantationsBySupports, orderLines } from '../utils/cockpit/implantationTree';
import { selectionFromReference } from '../utils/cockpit/selection';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { getEcaAdhesiveOccurrences } from '../data/adhesives';
import { isModuleInAuditScope } from '../utils/moduleScope';
import { AuditModuleType, EcaData, Lieu, SignageReference, SignageSupport } from '../types';

let lieux: Lieu[];
let references: SignageReference[];
let index: PatrimoineIndex;
let refById: Map<string, SignageReference>;

beforeAll(async () => {
    await useAuditStore.getState().init();
    lieux = useAuditStore.getState().lieux;
    references = await db.signageReferences.toArray();
    index = buildPatrimoineIndex(lieux, references);
    refById = new Map(references.map(r => [r.id, r]));
});

const flatten = (items: ReturnType<typeof buildImplantationTree>) =>
    items.flatMap(l => l.stations.flatMap(s => s.accesses.flatMap(a => a.equipments.flatMap(e => e.items))));

describe('eca-1 : occurrences physiques ZH/ZB', () => {
    it('251 occurrences, identiques au décompte des occurrences terrain', () => {
        let expected = 0;
        for (const lieu of lieux) for (const m of lieu.modules) {
            if (m.type !== AuditModuleType.ECA || !isModuleInAuditScope(m)) continue;
            for (const eca of (m.data as EcaData).ecas) {
                if (eca.isNotApplicable) continue;
                expected += getEcaAdhesiveOccurrences(eca.type).filter(o => o.id === 'eca-1').length;
            }
        }
        expect(expected).toBe(251);
        expect(index.byReference.get('eca-1')!.installedCount).toBe(251);
        // Sélection par référence : mêmes implantations.
        expect(selectionFromReference(index, 'eca-1', 'eca-1').items).toHaveLength(251);
    });

    it('ZH et ZB restent deux implantations distinctes', () => {
        const eca1 = index.implantations.filter(i => i.referenceId === 'eca-1');
        expect(eca1.every(i => i.zone === 'ZH' || i.zone === 'ZB')).toBe(true);
        const zb = eca1.filter(i => i.zone === 'ZB');
        expect(zb.length).toBe(251 - 205);
        for (const imp of zb) {
            expect(eca1.some(i => i.moduleId === imp.moduleId && i.equipmentLabel === imp.equipmentLabel && i.zone === 'ZH')).toBe(true);
        }
    });

    it('Nomenclature (useStats) cohérente avec l\'index', () => {
        const inventory = computeAdhesiveInventory(lieux, references);
        expect(inventory.find(i => i.id === 'eca-1')?.quantity).toBe(251);
    });
});

describe('arbre des implantations', () => {
    it('toutes les implantations (> 500) sont accessibles, chacune une seule fois', () => {
        expect(index.implantations.length).toBeGreaterThan(500);
        const tree = buildImplantationTree(index.implantations);
        const all = flatten(tree);
        expect(all).toHaveLength(index.implantations.length);
        expect(new Set(all).size).toBe(index.implantations.length);
        expect(tree.reduce((s, l) => s + l.installed, 0)).toBe(index.totals.implantationCount);
        // Tous les lieux indexés sont atteignables.
        const lieuxInTree = new Set(tree.flatMap(l => l.stations.map(s => s.lieuId)));
        expect(lieuxInTree).toEqual(new Set(index.implantations.map(i => i.lieuId)));
    });

    it('ordre des lignes : A → B → C → autres', () => {
        const tree = buildImplantationTree(index.implantations);
        const order = tree.map(l => l.line);
        expect(order.slice(0, 2)).toEqual(['A', 'B']);
        expect(orderLines(['TRAM', 'C', 'P+R', 'B', 'A'])).toEqual(['A', 'B', 'C', 'TRAM', 'P+R']);
        expect(order).toEqual(orderLines(index.byLine.keys()));
    });
});

describe('filtre matière (cards)', () => {
    const supportOf = (id: string) => refById.get(id)?.support;

    it('sélection vide = toutes les matières', () => {
        expect(filterImplantationsBySupports(index.implantations, refById, new Set())).toBe(index.implantations);
    });

    it('chaque card sélectionne exactement son compteur bySupport', () => {
        let sum = 0;
        for (const [support, counts] of index.bySupport) {
            const items = filterImplantationsBySupports(index.implantations, refById, new Set([support]));
            expect(items).toHaveLength(counts.installed);
            expect(items.every(i => supportOf(i.referenceId) === support)).toBe(true);
            sum += counts.installed;
        }
        expect(sum).toBe(index.totals.implantationCount);
    });

    it('Adhésif : uniquement des implantations adhésives, eca-1 ZH/ZB inclus', () => {
        const items = filterImplantationsBySupports(index.implantations, refById, new Set<SignageSupport>(['adhesif']));
        expect(items.length).toBe(index.bySupport.get('adhesif')!.installed);
        expect(items.every(i => supportOf(i.referenceId) === 'adhesif')).toBe(true);
        expect(items.filter(i => i.referenceId === 'eca-1')).toHaveLength(251);
        expect(flatten(buildImplantationTree(items))).toHaveLength(items.length);
    });

    it('sélection multiple : Adhésif + Dibond = union des deux', () => {
        const both = filterImplantationsBySupports(index.implantations, refById, new Set<SignageSupport>(['adhesif', 'dibond']));
        expect(both.length).toBe(index.bySupport.get('adhesif')!.installed + index.bySupport.get('dibond')!.installed);
        expect(new Set(both.map(i => supportOf(i.referenceId)))).toEqual(new Set(['adhesif', 'dibond']));
    });
});
