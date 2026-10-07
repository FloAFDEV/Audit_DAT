
import { EquipmentType } from '../types';

type EquipmentTemplate = {
    name: string;
    type: EquipmentType;
    // Surcharge optionnelle des adhésifs de cette borne (ids issus de data/adhesives.ts).
    // Absent = liste complète standard dérivée du `type`.
    adhesiveIds?: string[];
};

type ZoneTemplate = {
    name: string;
    // Adresse postale de la zone (information affichée, aucun calcul).
    address?: string;
    equipments: EquipmentTemplate[];
};

type PrStructureTemplate = {
    name: string;
    zones: ZoneTemplate[];
};

export const PR_STRUCTURES: Record<string, PrStructureTemplate> = {
    'pr-arenes': {
        name: 'Arènes',
        zones: [
            {
                name: 'Arènes Est – Parking isolé',
                address: "Rue du 11 Novembre, Toulouse",
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BE02', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                ]
            },
            {
                name: 'Arènes Ouest – Tram + Agence',
                address: "Place Emile Male, Toulouse",
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BE02', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                    { name: 'CA01', type: EquipmentType.CA },
                ]
            }
        ]
    },
    'pr-argoulets': {
        name: 'Argoulets',
        zones: [
            {
                name: 'Argoulets',
                address: "Chemin du Verdon, Toulouse",
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BE02', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                    { name: 'CA01', type: EquipmentType.CA },
                ]
            }
        ]
    },
    'pr-balma': {
        name: 'Balma-Gramont',
        zones: [
            {
                name: 'BGR Nord',
                address: "Route d'Agde, Balma",
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BE02', type: EquipmentType.BE },
                    { name: 'BE03', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                    { name: 'BS03', type: EquipmentType.BS },
                    { name: 'CA01', type: EquipmentType.CA },
                ]
            },
            {
                name: 'BGR Sud',
                address: "Route d'Agde, Balma",
                equipments: [
                    { name: 'BE11', type: EquipmentType.BE },
                    { name: 'BS11', type: EquipmentType.BS },
                    { name: 'BS12', type: EquipmentType.BS },
                ]
            }
        ]
    },
    'pr-basso': {
        name: 'Basso Cambo',
        zones: [
            {
                name: 'MBC – Côté Silo',
                address: "Avenue Louis Bazerque, Toulouse",
                equipments: [
                    // BE11 ne porte qu'un seul adhésif : « Tarifs + coordonnées » (adbe3).
                    { name: 'BE11', type: EquipmentType.BE, adhesiveIds: ['adbe3'] },
                    { name: 'BE12', type: EquipmentType.BE },
                    { name: 'BE13', type: EquipmentType.BE },
                    { name: 'BS11', type: EquipmentType.BS },
                    { name: 'BS12', type: EquipmentType.BS },
                ]
            },
            {
                name: 'MBC – Côté Ouest (Quick)',
                address: "Allée Marc Saint-Saëns, Toulouse",
                equipments: [
                    { name: 'BE21', type: EquipmentType.BE },
                    { name: 'BE22', type: EquipmentType.BE },
                    { name: 'BS21', type: EquipmentType.BS },
                    { name: 'BS22', type: EquipmentType.BS },
                ]
            },
            {
                name: 'MBC – Côté Covoiturage / Bornes électriques',
                address: "Avenue du Mirail, Toulouse",
                equipments: [
                    { name: 'BE31', type: EquipmentType.BE },
                    { name: 'BE32', type: EquipmentType.BE },
                    { name: 'BS31', type: EquipmentType.BS },
                    { name: 'BS32', type: EquipmentType.BS },
                    { name: 'CA01', type: EquipmentType.CA },
                ]
            }
        ]
    },
    'pr-borderouge': {
        name: 'Borderouge',
        zones: [
            {
                name: 'Parking du fond (Bord 2)',
                address: "Rue Durand, Toulouse",
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                ]
            },
            {
                name: 'Parking Principal - Accès Est (Métronum)',
                address: "Rue Françoise d'Eaubonne, Toulouse",
                equipments: [
                    { name: 'BE11', type: EquipmentType.BE },
                    { name: 'BE12', type: EquipmentType.BE },
                    { name: 'BS11', type: EquipmentType.BS },
                    { name: 'BS12', type: EquipmentType.BS },
                ]
            },
            {
                name: 'Parking Principal - Accès Covoiturage / VL Électrique',
                address: "Rue Françoise d'Eaubonne, Toulouse",
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'CA02', type: EquipmentType.CA },
                ]
            },
            {
                name: 'Parking Principal - Accès Nord-Est (Garage Atelier)',
                address: "Rue Françoise d'Eaubonne, Toulouse",
                equipments: [
                    { name: 'BE21', type: EquipmentType.BE },
                    { name: 'BE22', type: EquipmentType.BE },
                    { name: 'BS21', type: EquipmentType.BS },
                ]
            },
            {
                name: 'Parking Principal - Accès Sud-Ouest (Bd Netwiller)',
                address: "Rue Françoise d'Eaubonne, Toulouse",
                equipments: [
                    { name: 'BE31', type: EquipmentType.BE },
                    { name: 'BE32', type: EquipmentType.BE },
                    { name: 'BS31', type: EquipmentType.BS },
                    { name: 'BS32', type: EquipmentType.BS },
                    { name: 'CA01', type: EquipmentType.CA },
                ]
            },
        ]
    },
    'pr-ramonville': {
        name: 'Ramonville',
        zones: [
            {
                name: 'Ramonville Nord (côté TCSP)',
                address: "Avenue Flora Tristan, Ramonville St-Agne",
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BE02', type: EquipmentType.BE },
                    { name: 'BE03', type: EquipmentType.BE },
                    { name: 'BE04', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                    { name: 'BS03', type: EquipmentType.BS },
                    { name: 'BS04', type: EquipmentType.BS },
                    { name: 'CA02', type: EquipmentType.CA },
                ]
            },
            {
                name: 'Ramonville Sud (côté Avenue Latécoère)',
                address: "Avenue Flora Tristan, Ramonville St-Agne",
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BE02', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                    { name: 'CA01', type: EquipmentType.CA },
                ]
            }
        ]
    },
    'pr-oncopole': {
        name: 'Oncopole-Lise Enjalbert',
        zones: [
            {
                name: 'Oncopole',
                address: "Avenue Irène Joliot-Curie, 31100 Toulouse",
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BE02', type: EquipmentType.BE },
                    { name: 'BE03', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                    { name: 'BS03', type: EquipmentType.BS },
                    { name: 'CA01', type: EquipmentType.CA },
                    { name: 'CA02', type: EquipmentType.CA },
                ]
            }
        ]
    },
};

/** Adresse d'une zone de P+R (par identifiant de P+R et nom de zone), ou undefined. */
export const getPrZoneAddress = (prId: string, zoneName: string): string | undefined =>
    PR_STRUCTURES[prId]?.zones.find(z => z.name === zoneName)?.address;
