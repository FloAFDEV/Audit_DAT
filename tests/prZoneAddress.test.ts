// tests/prZoneAddress.test.ts
// Adresses des zones de P+R : information affichée uniquement, lue depuis
// data/pr_structures.ts — jamais copiée dans les données enregistrées.
import { describe, it, expect } from 'vitest';
import { PR_DATA } from '../data/pr_data';
import { PR_STRUCTURES, getPrZoneAddress, getPrZoneAddressByName } from '../data/pr_structures';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { AuditModuleType, Pr } from '../types';

describe('adresses des zones de P+R', () => {
    it('chaque zone de chaque P+R a une adresse', () => {
        for (const pr of PR_DATA) {
            for (const zone of PR_STRUCTURES[pr.id].zones) {
                expect(getPrZoneAddress(pr.id, zone.name), `${pr.name} / ${zone.name}`).toMatch(/\S/);
            }
        }
    });

    it('même adresse par nom de P+R (nom du lieu, cockpit Implantations)', () => {
        for (const pr of PR_DATA) {
            for (const zone of PR_STRUCTURES[pr.id].zones) {
                expect(getPrZoneAddressByName(pr.name, zone.name)).toBe(getPrZoneAddress(pr.id, zone.name));
            }
        }
        expect(getPrZoneAddressByName('Arènes', 'Direction MEETT / Aéroport')).toBeUndefined();
    });

    it('correspondances confirmées', () => {
        expect(getPrZoneAddress('pr-arenes', 'Arènes Ouest – Tram + Agence')).toBe('Place Emile Male, Toulouse');
        expect(getPrZoneAddress('pr-arenes', 'Arènes Est – Parking isolé')).toBe('Rue du 11 Novembre, Toulouse');
        expect(getPrZoneAddress('pr-basso', 'MBC – Côté Silo')).toBe('Avenue Louis Bazerque, Toulouse');
        expect(getPrZoneAddress('pr-basso', 'MBC – Côté Ouest (Quick)')).toBe('Allée Marc Saint-Saëns, Toulouse');
        expect(getPrZoneAddress('pr-basso', 'MBC – Côté Covoiturage / Bornes électriques')).toBe('Avenue du Mirail, Toulouse');
        expect(getPrZoneAddress('pr-borderouge', 'Parking du fond (Bord 2)')).toBe('Rue Durand, Toulouse');
        expect(getPrZoneAddress('pr-oncopole', 'Oncopole')).toBe('Avenue Irène Joliot-Curie, 31100 Toulouse');
        expect(getPrZoneAddress('pr-inconnu', 'x')).toBeUndefined();
    });

    it('données P+R générées inchangées : aucune adresse enregistrée dans les zones', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const zones = lieux.flatMap(l => l.modules).filter(m => m.type === AuditModuleType.PR).flatMap(m => (m.data as Pr).zones);
        expect(zones.length).toBeGreaterThan(0);
        expect(zones.every(z => Object.keys(z).sort().join() === 'equipments,id,name')).toBe(true);
    });
});
