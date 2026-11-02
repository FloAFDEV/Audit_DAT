// tests/sharedPatrimoineIndex.test.ts
// Index du patrimoine partagé entre les vues du cockpit : construit une
// fois par (lieux, référentiel), reconstruit dès qu'une source change.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { sharedPatrimoineIndex } from '../hooks/usePatrimoineIndex';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { AdhesiveStatus, Lieu, ModeData, SignageReference } from '../types';

let lieux: Lieu[];
let references: SignageReference[];
beforeAll(async () => {
    lieux = await generateInitialLieuxDataAsync();
    references = buildSignageReferencesSeed();
});

describe('sharedPatrimoineIndex', () => {
    it('mêmes tableaux : même index (aucune reconstruction au changement de section)', () => {
        expect(sharedPatrimoineIndex(lieux, references)).toBe(sharedPatrimoineIndex(lieux, references));
    });

    it('résultat identique au moteur', () => {
        expect(sharedPatrimoineIndex(lieux, references).totals).toEqual(buildPatrimoineIndex(lieux, references).totals);
    });

    it('saisie terrain (nouveau tableau de lieux, comme le store) : nouvel index à jour', () => {
        const before = sharedPatrimoineIndex(lieux, references);
        const updated: Lieu[] = JSON.parse(JSON.stringify(lieux));
        const dat = (updated.find(l => l.name === 'Capitole')!.modules.find(m => m.type === 'DAT')!.data as ModeData)
            .stations.flatMap(s => s.directions.flatMap(d => d.dats))[0];
        dat.adhesives.ad1 = AdhesiveStatus.Absent;
        const after = sharedPatrimoineIndex(updated, references);
        expect(after).not.toBe(before);
        expect(after.totals.absentCount).toBe(before.totals.absentCount + 1);
    });

    it('import / restauration du référentiel (nouveau tableau) : nouvel index', () => {
        const imported = references.filter(r => r.id !== 'ad1');
        const index = sharedPatrimoineIndex(lieux, imported);
        expect(index).not.toBe(sharedPatrimoineIndex(lieux, references));
        expect(index.byReference.has('ad1')).toBe(false);
    });
});
