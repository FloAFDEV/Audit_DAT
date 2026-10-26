// tests/referenceLabels.test.ts — dimensions et libellés des références :
// un seul format entre Inventaire détaillé et Référentiel, nom enregistré
// jamais réécrit (components/cockpit/labels.ts).
import { describe, it, expect } from 'vitest';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { ADHESIVES } from '../data/adhesives';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { displayReferenceName, formatDimensionText, formatDimensions, shortReferenceName } from '../components/cockpit/labels';

const REFS = buildSignageReferencesSeed();
const ref = (id: string) => REFS.find(r => r.id === id)!;

describe('R2 — dimensions', () => {
    it('cote textuelle : même présentation que formatDimensions, texte non dimensionnel inchangé', () => {
        expect(formatDimensionText('80 x 100 cm')).toBe('80 × 100 cm');
        expect(formatDimensionText('74.5x97cm')).toBe('74,5 × 97 cm');
        expect(formatDimensionText('80x80cm (Totem)')).toBe('80 × 80 cm (Totem)');
        expect(formatDimensionText('920x370mm')).toBe('920 × 370 mm');
        expect(formatDimensionText('78 × 120 cm')).toBe('78 × 120 cm');
        expect(formatDimensionText('Variable')).toBe('Variable');
        expect(formatDimensionText('Flèche verte / Croix rouge lumineuse')).toBe('Flèche verte / Croix rouge lumineuse');
        expect(formatDimensionText(undefined)).toBe('');
        expect(formatDimensionText('95 × 5,8 cm')).toBe(formatDimensions({ width: 95, height: 5.8, unit: 'cm' }));
    });

    it('Inventaire : cote du catalogue au format du Référentiel ; aucune description libre en guise de cote', () => {
        const inventory = new Map(computeAdhesiveInventory([], REFS).map(i => [i.id, i]));
        for (const r of REFS) {
            expect([r.id, inventory.get(r.id)!.dimensions]).toEqual([r.id, r.dimensions ? formatDimensions(r.dimensions) : '']);
        }
        expect(inventory.get('eca-11')!.dimensions).toBe('');
        expect(inventory.get('eca-r-1')!.dimensions).toBe('');
        expect(inventory.get('ad9')!.dimensions).toBe('');
        expect(inventory.get('ad1')!.dimensions).toBe('95 × 5,8 cm');
        // Matière / localisation historiques inchangées.
        expect(inventory.get('eca-r-1')!.material).toBe('Sur les deux faces du vantail');
    });
});

describe('R3 — libellés', () => {
    it('nom enregistré jamais modifié ; affichage corrigé (accent) ; préfixe Repère retiré pour l\'Inventaire', () => {
        expect(ref('eca-2').name).toBe('Repère 2 - Adhesif gris valideur-billetique-metro-pastel');
        expect(displayReferenceName(ref('eca-2'))).toBe('Repère 2 - Adhésif gris valideur-billetique-metro-pastel');
        expect(shortReferenceName(ref('eca-2'))).toBe('Adhésif gris valideur-billetique-metro-pastel');
        // Surcharge existante (tiret long) : préfixe retiré aussi.
        expect(shortReferenceName(ref('eca-1'))).toBe('Adhésif valideur-billetterie-métro-cible');
        expect(shortReferenceName(ref('eca-r-1'))).toBe('Signalisation dynamique');
        expect(shortReferenceName(ref('pdq-78x100'))).toBe('Plan de quartier 78×100 (sans header ni footer)');
    });

    it('DAT / P+R déjà accentués : nom d\'affichage = nom catalogue', () => {
        for (const ad of ADHESIVES) expect(displayReferenceName(ad)).toBe(ad.name);
        expect(displayReferenceName(ref('adbe1'))).toBe(ref('adbe1').name);
    });

    it('Inventaire : repère lu sur le nom métier, nom = nom d\'affichage court', () => {
        const inventory = new Map(computeAdhesiveInventory([], REFS).map(i => [i.id, i]));
        expect(inventory.get('eca-3')).toMatchObject({ repere: '3', name: 'Adhésif valideur-openpayment-metro' });
        expect(inventory.get('eca-r-1')).toMatchObject({ repere: 'R1', name: 'Signalisation dynamique' });
        expect(inventory.get('ad1')).toMatchObject({ repere: '1', name: 'Adhésif « Achat et rechargement »' });
    });
});
