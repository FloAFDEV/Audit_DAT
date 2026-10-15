// tests/referenceVisuals.test.ts — visuels de référence (data/referenceVisuals.ts) :
// chaque id déclaré a son fichier dans public/references, et une référence
// sans visuel (eca-11) n'en affiche aucun.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getReferenceVisualUrl } from '../data/referenceVisuals';

describe('Visuels de référence', () => {
    it('chaque visuel déclaré existe dans public/references', () => {
        for (const id of ['adbe10', 'adbs11', 'adbe3', 'ad1', 'ad2', 'ad3', 'ad4', 'ad5', 'ad6', 'ad7', 'ad8', 'ad10', 'ad11', 'eca-1', 'eca-2', 'eca-3', 'eca-4', 'eca-5', 'eca-6', 'eca-7', 'eca-8', 'eca-9', 'eca-10', 'pmr-sol',
            'pdq-78x100', 'pdq-78x120', 'pem3d-120x80', 'sign-plan-quartier-tram']) {
            const url = getReferenceVisualUrl(id);
            expect(url).toBe(`/references/${id}.webp`);
            expect(existsSync(join(__dirname, '..', 'public', url!))).toBe(true);
        }
    });

    it('P+R : le bandeau tarifs de la borne de sortie reprend celui de l\'entrée ; plans de repérage BE / BS', () => {
        expect(getReferenceVisualUrl('adbs3')).toBe('/references/adbe3.webp');
        expect(getReferenceVisualUrl('plan-pr-BE')).toBe('/references/plan-pr-be.webp');
        expect(getReferenceVisualUrl('plan-pr-BS')).toBe('/references/plan-pr-bs.webp');
        expect(getReferenceVisualUrl('plan-pr-CA')).toBe('/references/plan-pr-ca.webp');
    });

    it('le 78×120 adhésif et dibond partagent la face imprimée du 78×120', () => {
        expect(getReferenceVisualUrl('pdq-adhesif')).toBe('/references/pdq-78x120.webp');
        expect(getReferenceVisualUrl('pdq-78x120-dibond')).toBe('/references/pdq-78x120.webp');
    });

    it('aucun visuel pour une référence non illustrée ou en attente', () => {
        expect(getReferenceVisualUrl('eca-11')).toBeUndefined();
        expect(getReferenceVisualUrl(undefined)).toBeUndefined();
    });
});
