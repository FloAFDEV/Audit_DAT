import { EcaEquipmentType, ECA } from '../types';

export const isPmrEcaType = (type: EcaEquipmentType): boolean => {
    return [
        EcaEquipmentType.PMR,
        EcaEquipmentType.PMRVantaux,
        EcaEquipmentType.PMRVantauxReversible,
    ].includes(type);
};

// Base template for a standard station's ECA setup
const defaultEcaTemplates = [
    {
        name: 'ECA Accès Principal 1',
        accessPoint: 'Accès Principal',
        type: EcaEquipmentType.TripodeEntree,
        number: 1,
    },
    {
        name: 'ECA PMR Accès Principal 1',
        accessPoint: 'Accès Principal',
        type: EcaEquipmentType.PMRVantaux,
        number: 1,
    }
];

type EcaTemplate = Omit<ECA, 'id' | 'adhesives' | 'comment'>;

// This structure defines the ECA setup for each station.
// We can add specific station codes for custom setups.
// 'DEFAULT' is used for any station not explicitly listed.
export const ECA_DEFINITIONS: { [stationCode: string]: EcaTemplate[] } = {
    'DEFAULT': defaultEcaTemplates,
    'CAP': [ // Capitole
        ...defaultEcaTemplates,
        {
            name: 'ECA PMR Accès Ascenseur',
            accessPoint: 'Accès Ascenseur (Niveau inférieur)',
            type: EcaEquipmentType.PMRVantaux,
            number: 2,
        },
    ],
    'JJA': [ // Jean-Jaurès Ligne A
        ...defaultEcaTemplates,
        {
            name: 'ECA Accès Sortie 1',
            accessPoint: 'Accès Sortie',
            type: EcaEquipmentType.TripodeEntree,
            number: 2,
        },
        {
            name: 'ECA Correspondance A->B',
            accessPoint: 'Correspondance vers Ligne B',
            type: EcaEquipmentType.PMRVantauxReversible,
            number: 2,
        },
    ],
    'JJB': [ // Jean-Jaurès Ligne B
         ...defaultEcaTemplates,
        {
            name: 'ECA Correspondance B->A',
            accessPoint: 'Correspondance vers Ligne A',
            type: EcaEquipmentType.PMRVantauxReversible,
            number: 2,
        },
    ]
};