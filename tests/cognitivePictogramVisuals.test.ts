// tests/cognitivePictogramVisuals.test.ts
// Visuels des pictogrammes cognitifs : un fichier par station des lignes
// A et B, rien pour les autres — information affichée seule, les données
// d'audit ne changent pas.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getCognitivePictogramVisualUrl } from '../data/cognitivePictogramVisuals';
import { REGISTRY_LINE_A, REGISTRY_LINE_B } from '../data/stationRegistry';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { AuditModuleType, CognitivePictogramData } from '../types';

const fileFor = (url: string) => path.join(__dirname, '..', 'public', url);

describe('visuels des pictogrammes cognitifs', () => {
    it('chaque station des lignes A et B de la planche a un visuel présent sur le disque', () => {
        const stations = [...REGISTRY_LINE_A, ...REGISTRY_LINE_B].filter(s => !['sta-b-21', 'sta-b-22'].includes(s.id)); // PTC, Labège Madron : absents de la planche
        expect(stations).toHaveLength(38);
        for (const s of stations) {
            const url = getCognitivePictogramVisualUrl(s.code);
            expect(url, s.name).toBe(`/pictos-cognitifs/${s.code}.png`);
            expect(fs.existsSync(fileFor(url!)), s.name).toBe(true);
        }
    });

    it('aucun visuel inventé : code inconnu ou absent → undefined', () => {
        expect(getCognitivePictogramVisualUrl(undefined)).toBeUndefined();
        expect(getCognitivePictogramVisualUrl('PTC')).toBeUndefined();
        expect(getCognitivePictogramVisualUrl('XXX')).toBeUndefined();
    });

    it('les modules Pictogrammes cognitifs des lignes A et B pointent vers un visuel existant', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const data = lieux.flatMap(l => l.modules)
            .filter(m => m.type === AuditModuleType.COGNITIVE_PICTOGRAMS && (m.line === 'A' || m.line === 'B'))
            .map(m => m.data as CognitivePictogramData);
        expect(data.length).toBeGreaterThan(0);
        for (const d of data) {
            const url = getCognitivePictogramVisualUrl(d.stationCode);
            if (url) expect(fs.existsSync(fileFor(url))).toBe(true);
        }
    });
});
