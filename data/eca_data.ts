
import { EcaEquipmentType, ECA } from '../types';

// Type alias for ECA templates used in definitions.
type EcaTemplate = Omit<ECA, 'id' | 'adhesives' | 'comment' | 'isNotApplicable' | 'completionDate'>;

/**
 * Checks if a given ECA equipment type is a PMR (Personnes à Mobilité Réduite) type.
 */
export const isPmrEcaType = (type: EcaEquipmentType): boolean => {
    return type === EcaEquipmentType.PMRBras || 
           type === EcaEquipmentType.PMRVantaux || 
           type === EcaEquipmentType.PMRVantauxReversible;
};

/**
 * Checks if a given ECA equipment type can be marked as "Not Applicable".
 */
export const canEcaBeNotApplicable = (type: EcaEquipmentType): boolean => {
    return type === EcaEquipmentType.TripodeSortie || type === EcaEquipmentType.VantauxSortie;
};


// =================================================================
// ECA DEFINITIONS FOR JEAN-JAURÈS (SPECIAL CASE)
// =================================================================

export const ECA_DEFINITIONS_JJA_A_TO_B: EcaTemplate[] = [
    { name: 'Liaison A→B - PMR 17', accessPoint: 'Liaison A→B', type: EcaEquipmentType.PMRVantauxReversible, number: 17 },
    { name: 'Liaison A→B - Valideur 13', accessPoint: 'Liaison A→B', type: EcaEquipmentType.VantauxReversible, number: 13 },
    { name: 'Liaison A→B - Valideur 14', accessPoint: 'Liaison A→B', type: EcaEquipmentType.VantauxReversible, number: 14 },
    { name: 'Liaison A→B - Valideur 15', accessPoint: 'Liaison A→B', type: EcaEquipmentType.VantauxReversible, number: 15 },
    { name: 'Liaison A→B - Valideur 16', accessPoint: 'Liaison A→B', type: EcaEquipmentType.VantauxReversible, number: 16 },
];

export const ECA_DEFINITIONS_JJA_B_TO_A: EcaTemplate[] = [
    { name: 'Liaison B→A - PMR 8', accessPoint: 'Liaison B→A', type: EcaEquipmentType.PMRVantauxReversible, number: 8 },
    { name: 'Liaison B→A - Valideur 9', accessPoint: 'Liaison B→A', type: EcaEquipmentType.VantauxReversible, number: 9 },
    { name: 'Liaison B→A - Valideur 10', accessPoint: 'Liaison B→A', type: EcaEquipmentType.VantauxReversible, number: 10 },
    { name: 'Liaison B→A - Valideur 11', accessPoint: 'Liaison B→A', type: EcaEquipmentType.VantauxReversible, number: 11 },
];

export const ECA_DEFINITIONS_JJA_A_HISTORIQUE: EcaTemplate[] = [
    { name: 'Accès Historique - Valideur 1', accessPoint: 'Accès Historique', type: EcaEquipmentType.VantauxEntree, number: 1 },
    { name: 'Accès Historique - Valideur 2', accessPoint: 'Accès Historique', type: EcaEquipmentType.VantauxEntree, number: 2 },
    { name: 'Accès Historique - Valideur 3', accessPoint: 'Accès Historique', type: EcaEquipmentType.VantauxEntree, number: 3 },
    { name: 'Accès Historique - PMR 4', accessPoint: 'Accès Historique', type: EcaEquipmentType.PMRVantaux, number: 4 },
];

export const ECA_DEFINITIONS_JJA_A_PRINCIPAL: EcaTemplate[] = [
    { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 1 },
    { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 2 },
    { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 3 },
    // PMR supprimé ici pour éviter le doublon avec l'accès historique sur la Ligne A
];

// =================================================================
// ECA DEFINITIONS FOR ALL OTHER STATIONS
// =================================================================

export const ECA_DEFINITIONS: Record<string, EcaTemplate[]> = {
    // --- LIGNE A ---
    'BGR': [
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'PMR 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 8 },
    ],
    'ARG': [
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'PMR 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 8 },
    ],
    'ROS': [
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'PMR 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
    ],
    'JOL': [ 
        // JOL ASC (Accès Bas)
        { name: 'PMR 8', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.PMRVantaux, number: 8 },
        { name: 'Valideur 9', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeEntree, number: 9 },
        { name: 'Valideur 10', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeEntree, number: 10 },
        { name: 'Valideur 11 (Sortie)', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeSortie, number: 11 },
        { name: 'Valideur 12 (Sortie)', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeSortie, number: 12 },
        // JOL PRI (Accès Haut)
        { name: 'PMR 1', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 7 },
    ],
    'MAR': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxSortie, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 8 },
    ],
    'CAP': [
        // CAP ASC
        { name: 'Valideur 10', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeEntree, number: 10 },
        { name: 'Valideur 11', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeEntree, number: 11 },
        { name: 'Valideur 12 (Sortie)', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeSortie, number: 12 },
        { name: 'Valideur 13 (Sortie)', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeSortie, number: 13 },
        { name: 'PMR 14', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.PMRVantaux, number: 14 },
        // CAP PRI
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.VantauxSortie, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.VantauxSortie, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.VantauxEntree, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.VantauxEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.VantauxEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.VantauxEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.VantauxEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.VantauxEntree, number: 8 },
        { name: 'Valideur 9', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.VantauxEntree, number: 9 },
    ],
    'ESQ': [
        // ESQ ASC
        { name: 'Valideur 12 (Sortie)', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeSortie, number: 12 },
        { name: 'Valideur 13 (Sortie)', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeSortie, number: 13 },
        { name: 'PMR 14', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.PMRVantaux, number: 14 },
        { name: 'Valideur 15', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeEntree, number: 15 },
        { name: 'Valideur 16', accessPoint: 'Accès Bas (ASC)', type: EcaEquipmentType.TripodeEntree, number: 16 },
        // ESQ PRI
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeSortie, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 8 },
        { name: 'Valideur 9', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 9 },
        { name: 'Valideur 10', accessPoint: 'Accès Haut (PRI)', type: EcaEquipmentType.TripodeEntree, number: 10 },
    ],
    'SCY': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
    ],
    'POI': [
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'PMR 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
    ],
    'ARE': [
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 5 },
        { name: 'PMR 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 8 },
        { name: 'Valideur 9', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 9 },
        { name: 'Valideur 10', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 10 },
        { name: 'Valideur 11', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 11 },
        { name: 'Valideur 12', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 12 },
    ],
    'FLE': [
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'PMR 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
    ],
    'MER': [
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'PMR 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 5 },
    ],
    'BAG': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
    ],
    'MUN': [
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 1 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'PMR 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
    ],
    'REY': [
        { name: 'Valideur 1 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'PMR 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
    ],
    'BEL': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
    ],
    'MBC': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 8 },
    ],

    // --- LIGNE B ---
    'BOR': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
    ],
    'TCO': [
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 1 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'PMR 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 5 },
        { name: 'PMR 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 7 },
    ],
    'LVA': [
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 1 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 5 },
        { name: 'Valideur 6 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 6 },
        { name: 'PMR 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 7 },
    ],
    'BPA': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRBras, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
    ],
    'MIN': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
    ],
    'CAN': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
    ],
    'CCA': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 8 },
    ],
    'JAR': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxSortie, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 8 },
        { name: 'Valideur 9', accessPoint: 'Accès Principal', type: EcaEquipmentType.VantauxEntree, number: 9 },
    ],
    'JJB': [
        // Jaurès B - Côté B (JJB B)
        { name: 'PMR 1', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 6 },
        // Jaurès B - Côté A (JJB A)
        { name: 'PMR 7', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.PMRVantaux, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.VantauxEntree, number: 8 },
        { name: 'Valideur 9', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.VantauxEntree, number: 9 },
        { name: 'Valideur 10', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.VantauxEntree, number: 10 },
        { name: 'Valideur 11', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.VantauxEntree, number: 11 },
    ],
    'FVE': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 8 },
    ],
    'CAR': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 8 },
    ],
    'PDJ': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'Valideur 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 8 },
    ],
    'SMI': [
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 1 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 5 },
        { name: 'Valideur 6 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 6 },
        { name: 'PMR 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 7 },
    ],
    'EMP': [
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 1 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'PMR 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 6 },
    ],
    'SAG': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
    ],
    'SAO': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
    ],
    'RAN': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 5 },
    ],
    'PHA': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'Valideur 5 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 5 },
        { name: 'Valideur 6 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 6 },
    ],
    'UPS': [
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 1 },
        { name: 'Valideur 2', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 3', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
        { name: 'Valideur 7', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 7 },
        { name: 'PMR 8', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 8 },
    ],
    'RAM': [ 
        // RAM Square (RAM BOR)
        { name: 'Valideur 1', accessPoint: 'Accès Square', type: EcaEquipmentType.TripodeEntree, number: 1 },
        { name: 'Valideur 2', accessPoint: 'Accès Square', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Square', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4 (Sortie)', accessPoint: 'Accès Square', type: EcaEquipmentType.TripodeSortie, number: 4 },
        { name: 'PMR 5', accessPoint: 'Accès Square', type: EcaEquipmentType.PMRVantaux, number: 5 },
        // RAM Bus
        { name: 'PMR 6', accessPoint: 'Accès Bus', type: EcaEquipmentType.PMRVantaux, number: 6 },
        { name: 'Valideur 7 (Sortie)', accessPoint: 'Accès Bus', type: EcaEquipmentType.TripodeSortie, number: 7 },
        { name: 'Valideur 8 (Sortie)', accessPoint: 'Accès Bus', type: EcaEquipmentType.TripodeSortie, number: 8 },
        { name: 'Valideur 9 (Sortie)', accessPoint: 'Accès Bus', type: EcaEquipmentType.TripodeSortie, number: 9 },
        { name: 'Valideur 10', accessPoint: 'Accès Bus', type: EcaEquipmentType.TripodeEntree, number: 10 },
        { name: 'Valideur 11', accessPoint: 'Accès Bus', type: EcaEquipmentType.TripodeEntree, number: 11 },
    ],
    'BLA': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 2 },
        { name: 'Valideur 3 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
        { name: 'Valideur 4', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 4 },
        { name: 'Valideur 5', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 5 },
        { name: 'Valideur 6', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 6 },
    ],
    
    // Default fallback configuration
    'DEFAULT': [
        { name: 'PMR 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.PMRVantaux, number: 1 },
        { name: 'Valideur 1', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeEntree, number: 2 },
        { name: 'Valideur 2 (Sortie)', accessPoint: 'Accès Principal', type: EcaEquipmentType.TripodeSortie, number: 3 },
    ],
};
