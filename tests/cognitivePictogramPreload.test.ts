// tests/cognitivePictogramPreload.test.ts
// Préchargement en mémoire des 38 pictogrammes cognitifs (hors connexion
// pendant la session, sans service worker).
import { describe, it, expect, beforeEach } from 'vitest';
import { ALL_COGNITIVE_PICTOGRAM_VISUAL_URLS, getCognitivePictogramVisualUrl } from '../data/cognitivePictogramVisuals';
import { displayPictogramUrl, preloadCognitivePictograms, resetCognitivePictogramPreload, PreloadDeps } from '../utils/cognitivePictogramPreload';
import fs from 'node:fs';

const deps = (fail: (url: string) => boolean = () => false) => {
    const calls: string[] = [];
    const d: PreloadDeps = {
        fetch: async url => { calls.push(url); if (fail(url)) throw new Error('offline'); return { ok: true, blob: async () => new Blob([url]) }; },
        createObjectURL: () => `blob:${calls.length}`,
    };
    return { d, calls };
};

beforeEach(() => resetCognitivePictogramPreload());

describe('preloadCognitivePictograms', () => {
    it('38 visuels, tous présents dans public/ (aucune requête externe)', () => {
        expect(ALL_COGNITIVE_PICTOGRAM_VISUAL_URLS).toHaveLength(38);
        for (const url of ALL_COGNITIVE_PICTOGRAM_VISUAL_URLS) expect(fs.existsSync(`public${url}`), url).toBe(true);
    });

    it('avant préchargement : URL publique ; après : copie en mémoire', async () => {
        const url = getCognitivePictogramVisualUrl('JJB')!;
        expect(displayPictogramUrl(url)).toBe(url);
        const { d } = deps();
        await expect(preloadCognitivePictograms(d)).resolves.toBe(38);
        expect(displayPictogramUrl(url)).toMatch(/^blob:/);
    });

    it('échecs partiels (réseau coupé) : les autres restent ; un nouvel appel ne relit que les manquants', async () => {
        const first = deps(url => url.endsWith('JJA.png') || url.endsWith('MBC.png'));
        await expect(preloadCognitivePictograms(first.d)).resolves.toBe(36);
        expect(displayPictogramUrl('/pictos-cognitifs/JJA.png')).toBe('/pictos-cognitifs/JJA.png');
        const retry = deps();
        await expect(preloadCognitivePictograms(retry.d)).resolves.toBe(38);
        expect(retry.calls.sort()).toEqual(['/pictos-cognitifs/JJA.png', '/pictos-cognitifs/MBC.png']);
    });

    it('appels simultanés regroupés : une seule lecture par visuel', async () => {
        const { d, calls } = deps();
        await Promise.all([preloadCognitivePictograms(d), preloadCognitivePictograms(d)]);
        expect(calls).toHaveLength(38);
    });
});
