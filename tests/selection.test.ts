// tests/selection.test.ts
// Vérifie que Selection est un vrai objet métier transversal (commit 6) :
// identité (id unique), provenance (source), horodatage — produit de
// façon identique quelle que soit la vue d'origine (référence, site,
// ligne), sans dépendre d'un module en particulier.
import { describe, it, expect } from 'vitest';
import {
    createSelection, selectionFromReference, selectionFromSite, selectionFromLine, selectionFromImplantations,
} from '../utils/cockpit/selection';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { Lieu, AuditModuleType, AdhesiveStatus, TransportMode } from '../types';

const REFERENCES = buildSignageReferencesSeed();

const datLieu = (id: string, name: string, adhesives: { [k: string]: AdhesiveStatus }, line: 'A' | 'B' = 'A'): Lieu => ({
    id, name,
    modules: [{
        id: `module-dat-${id}`, type: AuditModuleType.DAT, name: 'DAT', line,
        data: {
            id: `mode-${id}`, name, type: TransportMode.METRO, line,
            stations: [{
                id: `sta-${id}`, name, directions: [{
                    id: `dir-${id}`, name: 'Salle des billets',
                    dats: [{ id: `dat-${id}`, name: 'DAT 01', adhesives, comment: '' }],
                }],
            }],
        },
    }],
});

describe('createSelection — identité, provenance, horodatage', () => {
    it('génère un id non vide et un createdAt ISO valide', () => {
        const sel = createSelection('reference', 'Test', []);
        expect(sel.id).toBeTruthy();
        expect(new Date(sel.createdAt).toISOString()).toBe(sel.createdAt);
    });

    it('deux sélections des mêmes items ont des ids distincts (jamais de singleton implicite)', () => {
        const items = [{ referenceId: 'x', lieuId: 'l', lieuName: 'L', line: 'A', moduleId: 'm', moduleName: 'M', context: 'c', equipmentLabel: 'e', status: AdhesiveStatus.OK }];
        const a = createSelection('implantation', 'A', items);
        const b = createSelection('implantation', 'A', items);
        expect(a.id).not.toBe(b.id);
    });

    it('transporte source, label et items tels quels', () => {
        const items = [{ referenceId: 'x', lieuId: 'l', lieuName: 'L', line: 'A', moduleId: 'm', moduleName: 'M', context: 'c', equipmentLabel: 'e', status: AdhesiveStatus.Absent }];
        const sel = createSelection('line', 'Ligne A', items);
        expect(sel.source).toBe('line');
        expect(sel.label).toBe('Ligne A');
        expect(sel.items).toBe(items);
    });
});

describe('Producteurs de Selection — même contrat quelle que soit la vue d\'origine', () => {
    const lieux = [
        datLieu('l1', 'Jean-Jaurès', { ad3: AdhesiveStatus.ToBeReplaced }, 'A'),
        datLieu('l2', 'Capitole', { ad3: AdhesiveStatus.OK }, 'A'),
        datLieu('l3', 'Borderouge', { ad4: AdhesiveStatus.Absent }, 'B'),
    ];
    const index = buildPatrimoineIndex(lieux, REFERENCES);

    it('selectionFromReference : source "reference", items = toutes les implantations de cette référence', () => {
        // ad3 est dans le scope DAT complet : présent sur les 3 lieux DAT,
        // y compris Borderouge (statut NotChecked, clé absente — R10).
        const sel = selectionFromReference(index, 'ad3', 'Rechargement + paiement CB');
        expect(sel.source).toBe('reference');
        expect(sel.items).toHaveLength(3);
        expect(sel.items.every(i => i.referenceId === 'ad3')).toBe(true);
        expect(sel.items.filter(i => i.status === AdhesiveStatus.ToBeReplaced)).toHaveLength(1);
    });

    it('selectionFromSite : source "site", items = toutes les implantations de ce lieu', () => {
        const sel = selectionFromSite(index, 'l1', 'Jean-Jaurès');
        expect(sel.source).toBe('site');
        expect(sel.items.every(i => i.lieuId === 'l1')).toBe(true);
        expect(sel.items.length).toBe(12); // 12 références DAT, toutes déclarées sur ce lieu
    });

    it('selectionFromLine : source "line", items = toutes les implantations de cette ligne', () => {
        const sel = selectionFromLine(index, 'B', 'Ligne B');
        expect(sel.source).toBe('line');
        expect(sel.items.every(i => i.line === 'B')).toBe(true);
    });

    it('selectionFromImplantations : source "implantation", items passés tels quels', () => {
        const filtered = index.implantations.filter(i => i.status === AdhesiveStatus.Absent);
        const sel = selectionFromImplantations(filtered, 'Absents');
        expect(sel.source).toBe('implantation');
        expect(sel.items).toBe(filtered);
    });
});
