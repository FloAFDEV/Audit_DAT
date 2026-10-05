// tests/lieuMap.test.ts
// Localisation Google Maps d'un lieu (Synthèse filtrée) : coordonnées de la
// station quand elles sont connues (data/stationCoordinates.ts), sinon
// recherche construite à partir du nom et du mode — jamais inventée.
import { describe, it, expect } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { ALL_STATION_DEFS } from '../data/stationRegistry';
import { STATION_COORDINATES } from '../data/stationCoordinates';
import { lieuCoordinates, lieuMapEmbedUrl, lieuMapOpenUrl, lieuMapQuery } from '../utils/cockpit/lieuMap';
import { AuditModuleType } from '../types';

describe('localisation d\'un lieu', async () => {
    const lieux = await generateInitialLieuxDataAsync();
    const byName = (name: string) => lieux.find(l => l.name === name)!;

    it('chaque coordonnée est rattachée à une station du registre, en WGS84 autour de Toulouse', () => {
        const ids = new Set(ALL_STATION_DEFS.map(s => s.id));
        for (const [id, c] of Object.entries(STATION_COORDINATES)) {
            expect(ids.has(id), id).toBe(true);
            expect(c.lat).toBeGreaterThan(43.4);
            expect(c.lat).toBeLessThan(43.8);
            expect(c.lng).toBeGreaterThan(1.2);
            expect(c.lng).toBeLessThan(1.7);
        }
    });

    it('point exact quand la station a des coordonnées (GTFS)', () => {
        const cap = byName('Capitole');
        const c = lieuCoordinates(cap)!;
        expect(c.source).toBe('gtfs');
        expect(lieuMapEmbedUrl(cap)).toBe(`https://maps.google.com/maps?q=${encodeURIComponent(`${c.lat},${c.lng}`)}&z=17&output=embed`);
        expect(lieuMapOpenUrl(cap)).toBe(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.lat},${c.lng}`)}`);
    });

    it('lieu à plusieurs stations : la station en service d\'abord (La Vache : B en service, C future)', () => {
        expect(lieuCoordinates(byName('La Vache'))!.source).toBe('gtfs');
        // Labège Madron : la station B n'a pas de coordonnées propres, celles de la C servent.
        expect(lieuCoordinates(byName('Labège Madron'))).toEqual({ lat: 43.5539, lng: 1.5036, source: 'chantier' });
    });

    it('sans coordonnées connues : recherche par mode et nom', () => {
        const prOnly = { id: 'pr-x', name: 'Exemple', modules: [{ id: 'm', type: AuditModuleType.PR, name: 'P+R', data: {} as any }] };
        expect(lieuMapQuery(prOnly)).toBe('Parc relais Exemple, Toulouse');
        expect(lieuCoordinates(prOnly)).toBeUndefined();
        expect(lieuMapEmbedUrl(prOnly)).toContain(encodeURIComponent('Parc relais Exemple, Toulouse'));
    });

    it('couverture : tous les lieux du réseau sont localisés', () => {
        const missing = lieux.filter(l => !lieuCoordinates(l)).map(l => l.name).sort();
        expect(missing).toEqual([]);
        expect(lieuCoordinates(byName('Parc Technologique du Canal'))).toEqual({ lat: 43.55166, lng: 1.486, source: 'chantier' });
    });
});
