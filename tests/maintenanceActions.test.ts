// tests/maintenanceActions.test.ts
// Vérifie le moteur d'ordres de travail : regroupement par référence
// (objet posé, entité centrale par défaut), par site, par ligne ;
// bandes d'urgence par règles explicites ; tri transparent.
import { describe, it, expect } from 'vitest';
import { buildPatrimoineIndex } from '../utils/cockpit/patrimoineIndex';
import { buildMaintenanceActions, bandOf, MAINTENANCE_GROUP_MODES } from '../utils/cockpit/maintenanceActions';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { Lieu, AuditModuleType, AdhesiveStatus, TransportMode } from '../types';

const REFERENCES = buildSignageReferencesSeed();

const datLieu = (id: string, name: string, adhesives: { [k: string]: AdhesiveStatus }): Lieu => ({
    id, name,
    modules: [{
        id: `module-dat-${id}`, type: AuditModuleType.DAT, name: 'DAT', line: 'A',
        data: {
            id: `mode-${id}`, name, type: TransportMode.METRO, line: 'A',
            stations: [{
                id: `sta-${id}`, name, directions: [{
                    id: `dir-${id}`, name: 'Salle des billets',
                    dats: [{ id: `dat-${id}`, name: 'DAT 01', adhesives, comment: '' }],
                }],
            }],
        },
    }],
});

describe('buildMaintenanceActions', () => {
    it('aucune action si aucun défaut', () => {
        const index = buildPatrimoineIndex([datLieu('l1', 'Station Un', { ad1: AdhesiveStatus.OK })], REFERENCES);
        expect(buildMaintenanceActions(index, REFERENCES, 'reference')).toHaveLength(0);
    });

    it('regroupement "par référence" : l\'objet posé, entité centrale', () => {
        const lieux = [
            datLieu('l1', 'Jean-Jaurès', { ad3: AdhesiveStatus.ToBeReplaced }),
            datLieu('l2', 'Capitole', { ad3: AdhesiveStatus.Absent }),
        ];
        const index = buildPatrimoineIndex(lieux, REFERENCES);
        const actions = buildMaintenanceActions(index, REFERENCES, 'reference');

        const ad3Action = actions.find(a => a.key === 'ad3')!;
        expect(ad3Action).toBeDefined();
        expect(ad3Action.items).toHaveLength(2);
        expect(ad3Action.lieuCount).toBe(2);
        expect(ad3Action.absentCount).toBe(1);
        expect(ad3Action.toReplaceCount).toBe(1);
        expect(ad3Action.label).toBe(REFERENCES.find(r => r.id === 'ad3')!.name);
    });

    it('regroupement "par site"', () => {
        const lieux = [datLieu('l1', 'Jean-Jaurès', { ad3: AdhesiveStatus.Absent, ad4: AdhesiveStatus.ToBeReplaced })];
        const index = buildPatrimoineIndex(lieux, REFERENCES);
        const actions = buildMaintenanceActions(index, REFERENCES, 'site');

        expect(actions).toHaveLength(1);
        expect(actions[0].label).toBe('Jean-Jaurès');
        expect(actions[0].referenceCount).toBe(2);
    });

    it('regroupement "par ligne"', () => {
        const lieux = [datLieu('l1', 'Station A', { ad3: AdhesiveStatus.Absent })];
        const index = buildPatrimoineIndex(lieux, REFERENCES);
        const actions = buildMaintenanceActions(index, REFERENCES, 'line');

        expect(actions).toHaveLength(1);
        expect(actions[0].label).toBe('Ligne A');
    });

    it('tri par urgence transparente : gravité décroissante en tête', () => {
        const lieux = [
            datLieu('l1', 'Station Absent', { ad1: AdhesiveStatus.Absent }),       // gravité max
            datLieu('l2', 'Station Replace', { ad2: AdhesiveStatus.ToBeReplaced }), // gravité moindre
        ];
        const index = buildPatrimoineIndex(lieux, REFERENCES);
        const actions = buildMaintenanceActions(index, REFERENCES, 'reference');

        expect(actions[0].key).toBe('ad1'); // le plus grave en premier
    });

    it("les 3 modes de regroupement sont exposés à l'UI", () => {
        expect(MAINTENANCE_GROUP_MODES.map(m => m.key)).toEqual(['reference', 'site', 'line']);
    });
});

describe('bandOf — bandes par règles explicites, pas un score opaque', () => {
    it('urgent si gravité ou ampleur élevées', () => {
        expect(bandOf({ severity: 0.9, occurrence: 0, passengerVisibility: 0.5, strategicLocation: 0.5, age: 0.5 })).toBe('urgent');
        expect(bandOf({ severity: 0, occurrence: 0.8, passengerVisibility: 0.5, strategicLocation: 0.5, age: 0.5 })).toBe('urgent');
    });

    it('à planifier pour les valeurs intermédiaires', () => {
        expect(bandOf({ severity: 0.5, occurrence: 0.1, passengerVisibility: 0.5, strategicLocation: 0.5, age: 0.5 })).toBe('a_planifier');
    });

    it('surveillance pour les valeurs faibles', () => {
        expect(bandOf({ severity: 0.1, occurrence: 0.05, passengerVisibility: 0.5, strategicLocation: 0.5, age: 0.5 })).toBe('surveillance');
    });
});
