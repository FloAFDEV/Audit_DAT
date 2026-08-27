// tests/signaletiqueStationIndex.test.ts
// =================================================================
// Tests du moteur d'index Équipements Station — vérifie que les
// statuts EquipmentStatusType saisis dans SignaletiqueData (totem,
// BIV, plan réseau, plan quartier, HAP, bandeau station) remontent
// bien dans les totaux du Cockpit, avec le mapping validé :
//  - OK -> conforme, 'NotChecked' -> non contrôlé, NOT_APPLICABLE -> exclu
//  - ABSENT -> Absent, TO_REPLACE -> À remplacer
//  - DEGRADED -> À remplacer (pas de palier intermédiaire)
//  - HS -> compteur distinct, jamais réinterprété
// Fonction pure : aucun IndexedDB nécessaire.
// =================================================================
import { describe, it, expect } from 'vitest';
import {
    buildSignaletiqueStationIndex, signaletiqueStationDefectsToMaintenanceItems,
} from '../utils/cockpit/signaletiqueStationIndex';
import { Lieu, AuditModuleType, EquipmentStatusType, TransportMode } from '../types';

const stationLieu = (): Lieu => ({
    id: 'lieu-station', name: 'Jean-Jaurès',
    modules: [{
        id: 'module-signaletique-test',
        type: AuditModuleType.SIGNALETIQUE,
        name: 'Équipements Station',
        line: 'A',
        data: {
            id: 'mode-station', name: 'Jean-Jaurès', type: TransportMode.METRO, line: 'A',
            stations: [{
                id: 'sta-1', name: 'Jean-Jaurès', directions: [],
                signaletique: {
                    totem: {
                        direction1: { status: EquipmentStatusType.OK },
                        direction2: { status: EquipmentStatusType.DEGRADED },
                    },
                    biv: {
                        meett: [{
                            status: EquipmentStatusType.HS,
                            screenFunctioning: EquipmentStatusType.OK,
                            whiteTextAdhesives: 'NotChecked',
                            ligneCaisson: EquipmentStatusType.OK,
                            destinationCaisson: EquipmentStatusType.OK,
                            attenteMinCaisson: EquipmentStatusType.OK,
                            dureeApproxCaisson: EquipmentStatusType.OK,
                            quaiCaisson: EquipmentStatusType.OK,
                        }],
                        pdj: [],
                    },
                    planReseau: {
                        meett: [{ status: EquipmentStatusType.ABSENT, bannerStationName: EquipmentStatusType.OK, hap: EquipmentStatusType.OK }],
                        pdj: [],
                    },
                    planQuartier: {
                        meett: [{ status: EquipmentStatusType.TO_REPLACE, bannerDirection: EquipmentStatusType.OK, hap: EquipmentStatusType.OK }],
                        pdj: [],
                    },
                    hap: { meett: [{ status: EquipmentStatusType.OK }], pdj: [] },
                    bandeauStation: {
                        direction1: { dimensions: '80x29 cm', status: EquipmentStatusType.OK, directionContent: EquipmentStatusType.OK, stationNameContent: EquipmentStatusType.NOT_APPLICABLE },
                        direction2: { dimensions: '80x29 cm', status: 'NotChecked', directionContent: 'NotChecked', stationNameContent: 'NotChecked' },
                    },
                },
            }],
        },
    }],
});

const futureLieu = (): Lieu => ({
    id: 'lieu-futur', name: 'Station Future',
    modules: [{
        id: 'module-signaletique-futur', type: AuditModuleType.SIGNALETIQUE, name: 'Équipements Station', line: 'A', isFuture: true,
        data: {
            id: 'mode-futur', name: 'Station Future', type: TransportMode.METRO, line: 'A',
            stations: [{
                id: 'sta-futur', name: 'Station Future', directions: [],
                signaletique: {
                    totem: { direction1: { status: EquipmentStatusType.ABSENT }, direction2: { status: EquipmentStatusType.OK } },
                    biv: { meett: [], pdj: [] }, planReseau: { meett: [], pdj: [] }, planQuartier: { meett: [], pdj: [] },
                    hap: { meett: [], pdj: [] },
                    bandeauStation: {
                        direction1: { dimensions: '80x29 cm', status: EquipmentStatusType.OK, directionContent: EquipmentStatusType.OK, stationNameContent: EquipmentStatusType.OK },
                        direction2: { dimensions: '80x29 cm', status: EquipmentStatusType.OK, directionContent: EquipmentStatusType.OK, stationNameContent: EquipmentStatusType.OK },
                    },
                },
            }],
        },
    }],
});

describe('buildSignaletiqueStationIndex', () => {
    it('mapping des statuts : OK, Absent, À remplacer (TO_REPLACE et DEGRADED), HS distinct, non contrôlé, NOT_APPLICABLE exclu', () => {
        const index = buildSignaletiqueStationIndex([stationLieu()]);

        // OK : totem.direction1, biv.screenFunctioning/ligneCaisson/destinationCaisson/
        // attenteMinCaisson/dureeApproxCaisson/quaiCaisson, planReseau.bannerStationName/hap,
        // planQuartier.bannerDirection/hap, hap.status, bandeauStation.direction1.status/directionContent.
        expect(index.totals.okCount).toBeGreaterThan(0);

        // DEGRADED (totem.direction2) + TO_REPLACE (planQuartier.status) -> tous deux À remplacer.
        expect(index.totals.toReplaceCount).toBe(2);

        // ABSENT (planReseau.status) -> Absent.
        expect(index.totals.absentCount).toBe(1);

        // HS (biv.status) -> compteur distinct, jamais fondu dans Absent/À remplacer.
        expect(index.totals.hsCount).toBe(1);

        // defectCount = absent + à remplacer + HS.
        expect(index.totals.defectCount).toBe(index.totals.absentCount + index.totals.toReplaceCount + index.totals.hsCount);
        expect(index.totals.defectCount).toBe(4);

        // 'NotChecked' (biv.whiteTextAdhesives + bandeauStation.direction2, 3 champs) -> non contrôlé.
        expect(index.totals.uncheckedCount).toBe(4);

        // NOT_APPLICABLE (bandeauStation.direction1.stationNameContent) -> exclu du décompte.
        expect(index.totals.implantationCount).toBe(
            index.totals.okCount + index.totals.absentCount + index.totals.toReplaceCount
            + index.totals.hsCount + index.totals.uncheckedCount
        );
    });

    it('module isFuture sur une ligne normale (hors B/C/AEROPORT) ignoré', () => {
        const index = buildSignaletiqueStationIndex([futureLieu()]);
        expect(index.items).toHaveLength(0);
        expect(index.totals.implantationCount).toBe(0);
    });

    it("Lot 0 : module isFuture sur la Ligne B reste dans le périmètre (extension de l'exception C/AEROPORT)", () => {
        const futureLieuB: Lieu = {
            ...futureLieu(),
            modules: [{ ...futureLieu().modules[0], line: 'B' }],
        };
        const index = buildSignaletiqueStationIndex([futureLieuB]);
        expect(index.items.length).toBeGreaterThan(0);
    });

    it('réseau vide -> index vide cohérent', () => {
        const index = buildSignaletiqueStationIndex([]);
        expect(index.items).toHaveLength(0);
        expect(index.totals.defectCount).toBe(0);
    });

    it("ignore les modules d'un autre type (DAT/PR/ECA/PMR sol/pictogrammes) — aucune fusion", () => {
        const lieu: Lieu = {
            id: 'lieu-autre', name: 'Autre',
            modules: [{ id: 'm1', type: AuditModuleType.DAT, name: 'DAT', line: 'A', data: { id: 'd1', name: 'Autre', type: TransportMode.METRO, line: 'A', stations: [] } }],
        };
        const index = buildSignaletiqueStationIndex([lieu]);
        expect(index.items).toHaveLength(0);
    });
});

describe('signaletiqueStationDefectsToMaintenanceItems', () => {
    it('ne conserve que les anomalies (Absent/À remplacer/Dégradé/HS), jamais les conformes ni non contrôlés', () => {
        const index = buildSignaletiqueStationIndex([stationLieu()]);
        const maintenanceItems = signaletiqueStationDefectsToMaintenanceItems(index.items);

        expect(maintenanceItems).toHaveLength(index.totals.defectCount);
        expect(maintenanceItems.every(i => i.auditType === AuditModuleType.SIGNALETIQUE)).toBe(true);
        expect(maintenanceItems.some(i => i.status === 'Absent')).toBe(true);
        expect(maintenanceItems.some(i => i.status === 'ToBeReplaced')).toBe(true);
        expect(maintenanceItems.some(i => i.status === 'HS')).toBe(true);
    });
});
