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
    'JJA': [ // Jean-Jaurès Ligne A
        ...defaultEcaTemplates,
        {
            name: 'ECA Accès Sortie 1',
            accessPoint: 'Accès Sortie',
            type: EcaEquipmentType.TripodeEntree,
            number: 2,
        },
    ],
    'JJB': [ // Jean-Jaurès Ligne B
         ...defaultEcaTemplates,
        {
            name: 'ECA Accès Correspondance 1',
            accessPoint: 'Accès Correspondance',
            type: EcaEquipmentType.PMRVantauxReversible,
            number: 2,
        },
    ]
};