// tests/referenceVisuals.test.ts — visuels de référence (data/referenceVisuals.ts) :
// chaque id déclaré a son fichier dans public/references, et une référence
// sans visuel (eca-11, platines eca-4/eca-5 en attente) n'en affiche aucun.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getReferenceVisualUrl } from '../data/referenceVisuals';

describe('Visuels de référence', () => {
    it('chaque visuel déclaré existe dans public/references', () => {
        for (const id of ['eca-1', 'eca-2', 'eca-3', 'eca-6', 'eca-7', 'eca-8', 'eca-9', 'eca-10',
            'pdq-78x100', 'pdq-78x120', 'pem3d-120x80', 'sign-plan-quartier-tram']) {
            const url = getReferenceVisualUrl(id);
            expect(url).toBe(`/references/${id}.webp`);
            expect(existsSync(join(__dirname, '..', 'public', url!))).toBe(true);
        }
    });

    it('le 78×120 adhésif et dibond partagent la face imprimée du 78×120', () => {
        expect(getReferenceVisualUrl('pdq-adhesif')).toBe('/references/pdq-78x120.webp');
        expect(getReferenceVisualUrl('pdq-78x120-dibond')).toBe('/references/pdq-78x120.webp');
    });

    it('aucun visuel pour une référence non illustrée ou en attente', () => {
        expect(getReferenceVisualUrl('eca-11')).toBeUndefined();
        expect(getReferenceVisualUrl('eca-4')).toBeUndefined();
        expect(getReferenceVisualUrl('eca-5')).toBeUndefined();
        expect(getReferenceVisualUrl(undefined)).toBeUndefined();
    });
});
