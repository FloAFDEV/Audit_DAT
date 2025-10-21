import { EcaEquipmentType, ECA } from '../types';

// Type alias for ECA templates used in definitions.
// Note: name and number are often combined to generate a final name.
type EcaTemplate = Omit<ECA, 'id' | 'adhesives' | 'comment' | 'isNotApplicable' | 'completionDate'>;

/**
 * Checks if a given ECA equipment type is a PMR (Personnes à Mobilité Réduite) type.
 * @param type The ECA equipment type to check.
 * @returns True if the type is for PMR access, false otherwise.
 */
export const isPmrEcaType = (type: EcaEquipmentType): boolean => {
    return type === EcaEquipmentType.PMRBras || type === EcaEquipmentType.PMRVantaux;
};

/**
 * Checks if a given ECA equipment type can be marked as "Not Applicable".
 * This is typically for exit-only equipment that may not have adhesives.
 * @param type The ECA equipment type to check.
 * @returns True if the type can be not applicable, false otherwise.
 */
export const canEcaBeNotApplicable = (type: EcaEquipmentType): boolean => {
    return type === EcaEquipmentType.TripodeSortie || type === EcaEquipmentType.VantauxSortie;
};


// =================================================================
// ECA DEFINITIONS FOR JEAN-JAURÈS (SPECIAL CASE)
// =================================================================

export const ECA_DEFINITIONS_JJA_A_TO_B: EcaTemplate[] = [
    { name: 'Liaison A→B - PMR', accessPoint: 'Liaison A→B', type: EcaEquipmentType.PMRVantaux, number: 1 },
    { name: 'Liaison A→B - Valideur 1', accessPoint: 'Liaison A→B', type: EcaEquipmentType.VantauxEntree, number: 2 },
    { name: 'Liaison A→B - Valideur 2', accessPoint: 'Liaison A→B', type: EcaEquipmentType.VantauxEntree, number: 3 },
];

export const ECA_DEFINITIONS_JJA_B_TO_A: EcaTemplate[] = [
    { name: 'Liaison B→A - PMR', accessPoint: 'Liaison B→A', type: EcaEquipmentType.PMRVantaux, number: 1 },
    { name: 'Liaison B→A - Valideur 1', accessPoint: 'Liaison B→A', type: EcaEquipmentType.VantauxEntree, number: 2 },
    { name: 'Liaison B→A - Valideur 2', accessPoint: 'Liaison B→A', type: EcaEquipmentType.VantauxEntree, number: 3 },
    { name: 'Liaison B→A - Valideur 3', accessPoint: 'Liaison B→A', type: EcaEquipmentType.VantauxEntree, number: 4 },
];

export const ECA_DEFINITIONS_JJA_A_HISTORIQUE: EcaTemplate[] = [
    { name: 'Accès Historique - PMR', accessPoint: 'Accès Historique', type: EcaEquipmentType.PMRVantaux, number: 1 },
    { name: 'Accès Historique - Valideur 1', accessPoint: 'Accès Historique', type: EcaEquipmentType.VantauxEntree, number: 2 },
    { name: 'Accès Historique - Valideur 2', accessPoint: 'Accès Historique', type: EcaEquipmentType.VantauxEntree, number: 3 },
    { name: 'Accès Historique - Valideur 3', accessPoint: 'Accès Historique', type: EcaEquipmentType.VantauxSortie, number: 4 },
];

export const ECA_DEFINITIONS_JJA_A_PRINCIPAL: EcaTemplate[] = [
    { name: 'Accès Principal - PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
    { name: 'Accès Principal - Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 2 },
    { name: 'Accès Principal - Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 3 },
    { name: 'Accès Principal - Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxSortie, number: 4 },
];

// =================================================================
// ECA DEFINITIONS FOR ALL OTHER STATIONS
// =================================================================

export const ECA_DEFINITIONS: Record<string, EcaTemplate[]> = {
    // Ligne A
    'BGR': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxSortie, number: 4 },
    ],
    'ARG': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'ROS': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'JOL': [ // JOL HAUT (PRI)
        { name: 'PMR', accessPoint: 'Accès Haut', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Haut', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Haut', type: EcaEquipmentType.TripodeSortie, number: 3 },
        // JOL BAS (ASC)
        { name: 'PMR', accessPoint: 'Accès Bas', type: EcaEquipmentType.PMRVantaux, number: 4 },
        { name: 'Valideur 3', accessPoint: 'Accès Bas', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 4', accessPoint: 'Accès Bas', type: EcaEquipmentType.TripodeSortie, number: 6 },
    ],
    'MAR': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxSortie, number: 4 },
    ],
    'CAP': [ // CAP HAUT (PRI)
        { name: 'PMR', accessPoint: 'Accès Haut', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Haut', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Haut', type: EcaEquipmentType.TripodeSortie, number: 3 },
        // CAP BAS (ASC)
        { name: 'PMR', accessPoint: 'Accès Bas', type: EcaEquipmentType.PMRVantaux, number: 4 },
        { name: 'Valideur 3', accessPoint: 'Accès Bas', type: EcaEquipmentType.TripodeEntree, number: 5 },
    ],
    'ESQ': [ // ESQ HAUT (PRI)
        { name: 'PMR', accessPoint: 'Accès Haut', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Haut', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Haut', type: EcaEquipmentType.TripodeSortie, number: 3 },
        // ESQ BAS (ASC)
        { name: 'PMR', accessPoint: 'Accès Bas', type: EcaEquipmentType.PMRVantaux, number: 4 },
        { name: 'Valideur 3', accessPoint: 'Accès Bas', type: EcaEquipmentType.TripodeEntree, number: 5 },
    ],
    'SCY': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'POI': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'ARE': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
    ],
    'FLE': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'MER': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'BAG': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'MUN': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'REY': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'BEL': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'MBC': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
    ],

    // Ligne B
    'BOR': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
    ],
    'TCO': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'LVA': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
    ],
    'BPA': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'MIN': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'CAN': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'CCA': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
    ],
    'JJB': [ // Jean Jaurès Ligne B
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxSortie, number: 4 },
    ],
    'FVE': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
    ],
    'CAR': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'PDJ': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
    ],
    'SMI': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'EMP': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'SAG': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'SAO': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'RAN': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
    'PHA': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
    ],
    'UPS': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
    ],
    'RAM': [ // RAM SQUARE (SQU)
        { name: 'PMR', accessPoint: 'Accès Square', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Square', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Square', type: EcaEquipmentType.TripodeSortie, number: 3 },
        // RAM BUS
        { name: 'PMR', accessPoint: 'Accès Bus', type: EcaEquipmentType.PMRVantaux, number: 4 },
        { name: 'Valideur 3', accessPoint: 'Accès Bus', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 4', accessPoint: 'Accès Bus', type: EcaEquipmentType.TripodeSortie, number: 6 },
    ],
    
    // Default fallback configuration
    'DEFAULT': [
        { name: 'PMR', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
};
