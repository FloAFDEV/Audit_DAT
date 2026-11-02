// tests/csvCatalogue.test.ts
// CSV global : libellés DAT / P+R / ECA issus du catalogue IndexedDB
// (signageReferences) ; colonnes, identifiants, quantités et ordre
// inchangés ; référence introuvable signalée explicitement.
import { describe, it, expect, beforeAll } from 'vitest';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { ADHESIVES, getEcaAdhesiveOccurrences, getPrAdhesives } from '../data/adhesives';
import { buildExportCatalogue } from '../utils/effectiveAdhesives';
import { buildLieuxCsvContent, missingReferenceLabel } from '../utils/csvExporter';
import { AdhesiveStatus, AuditModuleType, EcaEquipmentType, EquipmentType, Lieu, ModeData, SignageReference } from '../types';

let lieux: Lieu[];
let references: SignageReference[];
beforeAll(async () => {
    lieux = await generateInitialLieuxDataAsync();
    references = buildSignageReferencesSeed();
    const dat = (lieux.find(l => l.name === 'Capitole')!.modules.find(m => m.type === AuditModuleType.DAT)!.data as ModeData)
        .stations.flatMap(s => s.directions.flatMap(d => d.dats))[0];
    dat.adhesives.ad1 = AdhesiveStatus.Absent;
});

const HEADER = "Date de l'export,Date de Réalisation,Lieu,Type d'Audit,Ligne,Mode,Direction/Équipement/Accès,Élément,Statut,Repère,Description Adhésif,Localisation Adhésif,Photo Jointe,Note Photo,Commentaire";
const lines = (content: string | null) => content!.split('\n');

describe('buildExportCatalogue', () => {
    it('seed : DAT, P+R et ECA identiques au catalogue historique, provenance « catalogue »', () => {
        const catalogue = buildExportCatalogue(references);
        for (const ad of ADHESIVES) expect(catalogue.datAdhesive(ad.id)).toMatchObject({ name: ad.name, description: ad.description, source: 'catalogue' });
        for (const type of Object.values(EquipmentType)) {
            for (const ad of getPrAdhesives(type)) {
                expect(catalogue.prAdhesive(type, ad.id)).toMatchObject({ name: ad.name, description: ad.description, location: ad.location, source: 'catalogue' });
            }
        }
        for (const type of Object.values(EcaEquipmentType)) {
            const legacy = getEcaAdhesiveOccurrences(type);
            const occurrences = catalogue.ecaOccurrences(type);
            expect(occurrences.map(o => o.statusKey)).toEqual(legacy.map(o => o.statusKey));
            occurrences.forEach((o, i) => expect(o).toMatchObject({ name: legacy[i].name, description: legacy[i].description, source: 'catalogue' }));
        }
    });

    it('référence absente du catalogue : repli explicite sur le catalogue historique', () => {
        const catalogue = buildExportCatalogue(references.filter(r => r.id !== 'ad1'));
        expect(catalogue.datAdhesive('ad1')).toMatchObject({ name: ADHESIVES[0].name, source: 'legacy' });
    });

    it('référence introuvable partout : aucun libellé (l\'appelant le signale)', () => {
        expect(buildExportCatalogue(references).datAdhesive('inconnue')).toBeUndefined();
    });
});

describe('CSV global', () => {
    it('colonnes inchangées', () => {
        expect(lines(buildLieuxCsvContent(lieux, references))[0]).toBe('﻿' + HEADER);
    });

    it('le libellé suit le catalogue IndexedDB (référence renommée)', () => {
        const renamed = references.map(r => r.id === 'ad1' ? { ...r, name: 'Repère 1 - Adhésif « Libellé du catalogue »' } : r);
        const content = buildLieuxCsvContent(lieux, renamed)!;
        expect(content).toContain('Libellé du catalogue');
        expect(lines(content)).toHaveLength(lines(buildLieuxCsvContent(lieux, references)).length);
    });

    it('identifiants, quantités et ordre : même nombre de lignes et mêmes colonnes hors libellés', () => {
        const a = lines(buildLieuxCsvContent(lieux, references));
        const b = lines(buildLieuxCsvContent(lieux, references.map(r => ({ ...r, name: `${r.name} *` }))));
        expect(b).toHaveLength(a.length);
        // Lieu, ligne, élément et statut identiques ligne à ligne.
        const key = (line: string) => line.split(',').slice(2, 9).join(',');
        expect(b.map(key)).toEqual(a.map(key));
    });

    it('statut sur une référence introuvable : ligne conservée, libellé explicite', () => {
        const dat = (lieux.find(l => l.name === 'Capitole')!.modules.find(m => m.type === AuditModuleType.DAT)!.data as ModeData)
            .stations.flatMap(s => s.directions.flatMap(d => d.dats))[0];
        (dat.adhesives as Record<string, AdhesiveStatus>)['ref-inconnue'] = AdhesiveStatus.Absent;
        expect(buildLieuxCsvContent(lieux, references)).toContain(missingReferenceLabel('ref-inconnue'));
        delete (dat.adhesives as Record<string, AdhesiveStatus>)['ref-inconnue'];
    });

    it('aucune ligne : rien à exporter', () => {
        expect(buildLieuxCsvContent([], references)).toBeNull();
    });
});
