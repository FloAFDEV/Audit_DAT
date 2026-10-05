// tests/lieuMap.test.ts
// Localisation Google Maps d'un lieu (Synthèse filtrée) : recherche construite
// à partir du nom et du mode du lieu, jamais d'une coordonnée inventée.
import { describe, it, expect } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { lieuMapEmbedUrl, lieuMapOpenUrl, lieuMapQuery } from '../utils/cockpit/lieuMap';
import { AuditModuleType } from '../types';

describe('localisation d\'un lieu', async () => {
    const lieux = await generateInitialLieuxDataAsync();
    const byName = (name: string) => lieux.find(l => l.name === name)!;

    it('mode déduit des modules du lieu', () => {
        expect(lieuMapQuery(byName('Capitole'))).toBe('Station de métro Capitole, Toulouse');
        expect(lieuMapQuery(byName('Aéroconstellation'))).toBe('Arrêt de tram Aéroconstellation, Toulouse');
        const prOnly = { id: 'pr-x', name: 'Exemple', modules: [{ id: 'm', type: AuditModuleType.PR, name: 'P+R', data: {} as any }] };
        expect(lieuMapQuery(prOnly)).toBe('Parc relais Exemple, Toulouse');
    });

    it('URLs encodées : carte intégrée sans clé d\'API, ouverture via la recherche Google Maps', () => {
        const cap = byName('Capitole');
        expect(lieuMapEmbedUrl(cap)).toBe('https://maps.google.com/maps?q=Station%20de%20m%C3%A9tro%20Capitole%2C%20Toulouse&z=16&output=embed');
        expect(lieuMapOpenUrl(cap)).toBe('https://www.google.com/maps/search/?api=1&query=Station%20de%20m%C3%A9tro%20Capitole%2C%20Toulouse');
    });
});
