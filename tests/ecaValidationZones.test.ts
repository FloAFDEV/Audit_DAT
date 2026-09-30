// tests/ecaValidationZones.test.ts
// =================================================================
// Règle métier validée : un ECA PMR d'entrée porte l'adhésif cible eca-1
// en DEUX exemplaires (zone de validation haute ZH + zone de validation
// basse PMR ZB), un ECA d'entrée standard en porte UN (ZH), un ECA de
// sortie n'en porte aucun. Une seule référence catalogue (eca-1) dans
// tous les cas — cf. data/adhesives.ts::getEcaAdhesiveOccurrences.
//
// Couvre les vérifications obligatoires demandées avant implémentation :
// comptage par catégorie, cas PMRVantauxReversible, progression par
// occurrence, nomenclature/quantité totale, et compatibilité de lecture
// avec un audit déjà réalisé avant l'introduction des zones (clé bare
// 'eca-1', sans suffixe).
// =================================================================
import { describe, it, expect } from 'vitest';
import { getEcaAdhesiveOccurrences, readEcaAdhesiveStatus, ECA_VALIDATION_ZONE_LABELS } from '../data/adhesives';
import { getEcaProgress } from '../utils/progressCalculators';
import { computeAdhesiveInventory } from '../hooks/useStats';
import { buildSignageReferencesSeed } from '../data/signage_seed';
import { AdhesiveStatus, AuditModuleType, EcaData, EcaEquipmentType, ECA, Lieu } from '../types';

const makeEca = (type: EcaEquipmentType, adhesives: { [key: string]: AdhesiveStatus } = {}): ECA => ({
    id: 'test-eca', name: 'Test ECA', accessPoint: 'Accès Test', type, number: 1, adhesives, comment: '',
});

describe('getEcaAdhesiveOccurrences — quantité de eca-1 par catégorie', () => {
    it('ECA entrée standard (TripodeEntree/VantauxEntree) → 1 occurrence eca-1, zone ZH, avec repli legacy', () => {
        for (const type of [EcaEquipmentType.TripodeEntree, EcaEquipmentType.VantauxEntree]) {
            const cibles = getEcaAdhesiveOccurrences(type).filter(o => o.id === 'eca-1');
            expect(cibles).toHaveLength(1);
            expect(cibles[0].zone).toBe('ZH');
            expect(cibles[0].statusKey).toBe('eca-1@ZH');
            expect(cibles[0].zoneLabel).toBe(ECA_VALIDATION_ZONE_LABELS.ZH);
            expect(cibles[0].legacyStatusKey).toBe('eca-1');
        }
    });

    it('ECA PMR d\'entrée (PMRBras/PMRVantaux) → 2 occurrences eca-1, zones ZH + ZB, sans repli legacy (ambigu)', () => {
        for (const type of [EcaEquipmentType.PMRBras, EcaEquipmentType.PMRVantaux]) {
            const cibles = getEcaAdhesiveOccurrences(type).filter(o => o.id === 'eca-1');
            expect(cibles).toHaveLength(2);
            expect(cibles.map(c => c.zone).sort()).toEqual(['ZB', 'ZH']);
            expect(cibles.map(c => c.statusKey).sort()).toEqual(['eca-1@ZB', 'eca-1@ZH']);
            expect(cibles.every(c => c.legacyStatusKey === undefined)).toBe(true);
            expect(cibles.find(c => c.zone === 'ZB')!.zoneLabel).toBe(ECA_VALIDATION_ZONE_LABELS.ZB);
        }
    });

    it('ECA de sortie (TripodeSortie/VantauxSortie) → aucune occurrence eca-1', () => {
        for (const type of [EcaEquipmentType.TripodeSortie, EcaEquipmentType.VantauxSortie]) {
            const cibles = getEcaAdhesiveOccurrences(type).filter(o => o.id === 'eca-1');
            expect(cibles).toHaveLength(0);
        }
    });

    it("n'affecte aucun autre adhésif ECA : ils restent à 1 seule occurrence, statusKey = id, sans zone", () => {
        const autresIds = getEcaAdhesiveOccurrences(EcaEquipmentType.PMRVantaux).filter(o => o.id !== 'eca-1');
        expect(autresIds.length).toBeGreaterThan(0);
        autresIds.forEach(occ => {
            expect(occ.statusKey).toBe(occ.id);
            expect(occ.zone).toBeUndefined();
        });
    });
});

describe('PMRVantauxReversible (Jean-Jaurès) — traitement correct', () => {
    it('reçoit exactement le même jeu d\'adhésifs que PMRVantaux (bug de switch corrigé), y compris eca-1 × 2', () => {
        const reversible = getEcaAdhesiveOccurrences(EcaEquipmentType.PMRVantauxReversible);
        const vantaux = getEcaAdhesiveOccurrences(EcaEquipmentType.PMRVantaux);
        expect(reversible.map(o => o.statusKey).sort()).toEqual(vantaux.map(o => o.statusKey).sort());

        const cibles = reversible.filter(o => o.id === 'eca-1');
        expect(cibles).toHaveLength(2);
        expect(cibles.map(c => c.zone).sort()).toEqual(['ZB', 'ZH']);
    });
});

describe('readEcaAdhesiveStatus — compatibilité de lecture avec un audit déjà réalisé', () => {
    it("ECA d'entrée standard : une ancienne clé bare 'eca-1' est relue pour la zone ZH (jamais ambigu, une seule zone a toujours existé)", () => {
        const occZH = getEcaAdhesiveOccurrences(EcaEquipmentType.VantauxEntree).find(o => o.id === 'eca-1')!;
        const ancienAudit = makeEca(EcaEquipmentType.VantauxEntree, { 'eca-1': AdhesiveStatus.OK });
        expect(readEcaAdhesiveStatus(ancienAudit, occZH)).toBe(AdhesiveStatus.OK);
    });

    it("ECA PMR d'entrée : une ancienne clé bare 'eca-1' N'EST PAS devinée pour ZH ni ZB (ambigu) — les deux restent NotChecked tant que non re-vérifiées", () => {
        const occurrences = getEcaAdhesiveOccurrences(EcaEquipmentType.PMRVantaux).filter(o => o.id === 'eca-1');
        const ancienAudit = makeEca(EcaEquipmentType.PMRVantaux, { 'eca-1': AdhesiveStatus.OK });
        occurrences.forEach(occ => {
            expect(readEcaAdhesiveStatus(ancienAudit, occ)).toBe(AdhesiveStatus.NotChecked);
        });
        // La clé historique reste présente telle quelle dans les données (pas de migration
        // destructive) — seule sa RELECTURE change pour les types PMR.
        expect(ancienAudit.adhesives['eca-1']).toBe(AdhesiveStatus.OK);
    });

    it('une clé déjà zonée (audit réalisé après cette évolution) est lue directement, sans repli', () => {
        const occZB = getEcaAdhesiveOccurrences(EcaEquipmentType.PMRBras).find(o => o.zone === 'ZB')!;
        const audit = makeEca(EcaEquipmentType.PMRBras, { 'eca-1@ZB': AdhesiveStatus.Absent });
        expect(readEcaAdhesiveStatus(audit, occZB)).toBe(AdhesiveStatus.Absent);
    });
});

describe('getEcaProgress — progression basée sur les occurrences', () => {
    it("ECA d'entrée standard entièrement vérifié (ZH incluse) → 100%", () => {
        const occurrences = getEcaAdhesiveOccurrences(EcaEquipmentType.VantauxEntree);
        const adhesives = Object.fromEntries(occurrences.map(o => [o.statusKey, AdhesiveStatus.OK]));
        const eca = makeEca(EcaEquipmentType.VantauxEntree, adhesives);
        expect(getEcaProgress(eca).percentage).toBe(100);
        expect(getEcaProgress(eca).isComplete).toBe(true);
    });

    it("ECA PMR d'entrée : vérifier UNIQUEMENT la zone haute (ZH) ne complète pas la progression — la zone basse (ZB) compte séparément", () => {
        const occurrences = getEcaAdhesiveOccurrences(EcaEquipmentType.PMRVantaux);
        const zh = occurrences.find(o => o.zone === 'ZH')!;
        const adhesives = Object.fromEntries(
            occurrences.filter(o => o.id !== 'eca-1').map(o => [o.statusKey, AdhesiveStatus.OK])
        );
        adhesives[zh.statusKey] = AdhesiveStatus.OK; // ZH seule
        const eca = makeEca(EcaEquipmentType.PMRVantaux, adhesives);
        const progress = getEcaProgress(eca);
        expect(progress.isComplete).toBe(false);
        expect(progress.percentage).toBeLessThan(100);
    });

    it("ECA PMR d'entrée : vérifier les deux zones (ZH + ZB) complète la progression à 100%", () => {
        const occurrences = getEcaAdhesiveOccurrences(EcaEquipmentType.PMRVantaux);
        const adhesives = Object.fromEntries(occurrences.map(o => [o.statusKey, AdhesiveStatus.OK]));
        const eca = makeEca(EcaEquipmentType.PMRVantaux, adhesives);
        expect(getEcaProgress(eca).percentage).toBe(100);
    });
});

describe('computeAdhesiveInventory — nomenclature regroupée par référence catalogue, quantité correcte', () => {
    const references = buildSignageReferencesSeed();

    const buildLieu = (ecas: ECA[]): Lieu => {
        const data: EcaData = { id: 'test-eca-data', stationName: 'Station Test', stationCode: 'TST', ecas };
        return {
            id: 'test-lieu', name: 'Lieu Test',
            modules: [{ id: 'test-module', type: AuditModuleType.ECA, name: 'ECA (Valideurs)', data }],
        };
    };

    it('un ECA de sortie ne contribue pas à la quantité de eca-1', () => {
        const lieux = [buildLieu([makeEca(EcaEquipmentType.TripodeSortie)])];
        const inventory = computeAdhesiveInventory(lieux, references);
        expect(inventory.find(i => i.id === 'eca-1')?.quantity ?? 0).toBe(0);
    });

    it("un ECA d'entrée standard contribue pour 1 à la quantité de eca-1, un ECA PMR d'entrée pour 2 — regroupés sous la même référence", () => {
        const lieux = [buildLieu([
            makeEca(EcaEquipmentType.VantauxEntree),
            makeEca(EcaEquipmentType.PMRVantaux),
            makeEca(EcaEquipmentType.TripodeSortie),
        ])];
        const inventory = computeAdhesiveInventory(lieux, references);
        const row = inventory.find(i => i.id === 'eca-1');
        expect(row).toBeDefined();
        expect(row!.quantity).toBe(3); // 1 (standard) + 2 (PMR) + 0 (sortie)
        // Une seule ligne de nomenclature pour eca-1 (jamais deux lignes ZH/ZB distinctes).
        expect(inventory.filter(i => i.id === 'eca-1')).toHaveLength(1);
    });

    it('un ECA PMRVantauxReversible contribue pour 2 à la quantité de eca-1, comme tout ECA PMR d\'entrée', () => {
        const lieux = [buildLieu([makeEca(EcaEquipmentType.PMRVantauxReversible)])];
        const inventory = computeAdhesiveInventory(lieux, references);
        expect(inventory.find(i => i.id === 'eca-1')?.quantity).toBe(2);
    });
});
