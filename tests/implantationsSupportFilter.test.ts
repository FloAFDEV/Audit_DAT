// tests/implantationsSupportFilter.test.ts
// =================================================================
// Référentiel → Implantations sur le réseau réellement seedé par le
// store : filtre matière (cards, sélection multiple) et regroupement
// Ligne → Station → Accès → Équipement sans aucune troncature.
// =================================================================
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../db';
import useAuditStore from '../store';
import { buildPatrimoineIndex, PatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { groupImplantationsByLocation } from '../utils/cockpit/implantationsGrouping';
import { filterImplantationsBySupports, selectionFromReference } from '../utils/cockpit/selection';
import { SignageReference, SignageSupport } from '../types';

let index: PatrimoineIndex;
let refById: Map<string, SignageReference>;

beforeAll(async () => {
    await useAuditStore.getState().init();
    const references = await db.signageReferences.toArray();
    index = buildPatrimoineIndex(useAuditStore.getState().lieux, references);
    refById = new Map(references.map(r => [r.id, r]));
});

const flatten = (items: ReturnType<typeof groupImplantationsByLocation>) =>
    items.flatMap(l => l.stations.flatMap(s => s.contexts.flatMap(c => c.equipments.flatMap(e => e.items))));

describe('Implantations : accès complet et cohérence des compteurs', () => {
    it('toutes les implantations (> 500) restent accessibles dans le regroupement', () => {
        expect(index.implantations.length).toBeGreaterThan(500);
        const all = flatten(groupImplantationsByLocation(index.implantations));
        expect(all).toHaveLength(index.totals.implantationCount);
        expect(new Set(all).size).toBe(index.implantations.length);
    });

    it('eca-1 = 251 occurrences, ZH et ZB séparées', () => {
        const eca1 = index.implantations.filter(i => i.referenceId === 'eca-1');
        expect(eca1).toHaveLength(251);
        expect(index.byReference.get('eca-1')!.installedCount).toBe(251);
        expect(selectionFromReference(index, 'eca-1', 'eca-1').items).toHaveLength(251);
        expect(eca1.filter(i => i.zone === 'ZH')).toHaveLength(205);
        expect(eca1.filter(i => i.zone === 'ZB')).toHaveLength(46);
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
        expect(items.every(i => supportOf(i.referenceId) === 'adhesif')).toBe(true);
        expect(items.filter(i => i.referenceId === 'eca-1')).toHaveLength(251);
        expect(flatten(groupImplantationsByLocation(items))).toHaveLength(items.length);
    });

    it('sélection multiple : Adhésif + Dibond = union des deux', () => {
        const both = filterImplantationsBySupports(index.implantations, refById, new Set<SignageSupport>(['adhesif', 'dibond']));
        expect(both.length).toBe(index.bySupport.get('adhesif')!.installed + index.bySupport.get('dibond')!.installed);
        expect(new Set(both.map(i => supportOf(i.referenceId)))).toEqual(new Set(['adhesif', 'dibond']));
    });
});
