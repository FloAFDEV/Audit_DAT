
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
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BE02', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                ]
            },
            {
                name: 'Arènes Ouest – Tram + Agence',
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
                equipments: [
                    { name: 'BE21', type: EquipmentType.BE },
                    { name: 'BE22', type: EquipmentType.BE },
                    { name: 'BS21', type: EquipmentType.BS },
                    { name: 'BS22', type: EquipmentType.BS },
                ]
            },
            {
                name: 'MBC – Côté Covoiturage / Bornes électriques',
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
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'BS02', type: EquipmentType.BS },
                ]
            },
            {
                name: 'Parking Principal - Accès Est (Métronum)',
                equipments: [
                    { name: 'BE11', type: EquipmentType.BE },
                    { name: 'BE12', type: EquipmentType.BE },
                    { name: 'BS11', type: EquipmentType.BS },
                    { name: 'BS12', type: EquipmentType.BS },
                ]
            },
            {
                name: 'Parking Principal - Accès Covoiturage / VL Électrique',
                equipments: [
                    { name: 'BE01', type: EquipmentType.BE },
                    { name: 'BS01', type: EquipmentType.BS },
                    { name: 'CA02', type: EquipmentType.CA },
                ]
            },
            {
                name: 'Parking Principal - Accès Nord-Est (Garage Atelier)',
                equipments: [
                    { name: 'BE21', type: EquipmentType.BE },
                    { name: 'BE22', type: EquipmentType.BE },
                    { name: 'BS21', type: EquipmentType.BS },
                ]
            },
            {
                name: 'Parking Principal - Accès Sud-Ouest (Bd Netwiller)',
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
