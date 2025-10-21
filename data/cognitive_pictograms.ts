import { v4 as uuidv4 } from 'uuid';
import { CognitivePictogram, FloorAdhesiveStatus } from '../types';

// The dimensions can now be a string for simple cases, or an object for stations with multiple models.
// The keys in the object (e.g., 'Petit Modèle') will be matched against the access point name.
export const COGNITIVE_PICTOGRAM_DIMENSIONS: Record<string, string | Record<string, string>> = {
  // Default dimension (most common value)
  'DEFAULT': '74.5x97cm',
  // Ligne A
  'CAP': {
    'Petit Modèle': '74.5x67.5cm',
    'Grand Modèle': '74.5x71cm',
  },
  'BGR': '74.5x74cm',
  'ROS': '74.5x74cm',
  'BAG': '74.5x97cm',
  'ESQ': '74.5x97cm',
  'JJA': '74.5x97cm',
  'MAR': '74.5x97cm',
  'MER': '74.5x97cm',
  'POI': '74.5x97cm',
  'REY': '74.5x97cm',
  'SCY': '74.5x97cm',
  'MUN': '80x80cm (Totem)',
  // Ligne B
  'BPA': '74.5x97cm',
  'BOR': '74.5x97cm',
  'CAN': '74.5x97cm',
  'CAR': '74.5x97cm',
  'CCA': '74.5x97cm',
  'FVE': '74.5x97cm',
  'JAR': '74.5x97cm',
  'LVA': '74.5x97cm',
  'MIN': '74.5x97cm',
  'PDJ': '74.5x97cm',
  'RAM': '74.5x97cm',
  'RAN': '74.5x97cm',
  'SAG': '74.5x97cm',
  'SMI': '74.5x97cm',
  'SAO': '74.5x97cm',
  'TCO': '74.5x97cm',
  'UPS': '74.5x97cm',
  'JJB': '74.5x97cm',
};

/**
 * Retrieves the specific dimension for a cognitive pictogram based on its station and access point name.
 * @param stationCode The code of the station (e.g., 'CAP').
 * @param accessPointName The name of the access point (e.g., 'Accès Capitole - Petit Modèle').
 * @returns The dimension string for the pictogram.
 */
export const getCognitivePictogramDimension = (stationCode: string, accessPointName: string): string => {
    const stationDimensions = COGNITIVE_PICTOGRAM_DIMENSIONS[stationCode];

    if (typeof stationDimensions === 'object' && stationDimensions !== null) {
        // Check for keywords in the access point name for specific models
        for (const key in stationDimensions) {
            if (accessPointName.includes(key)) {
                return stationDimensions[key];
            }
        }
    }
    
    // Fallback to a single string dimension for the station if it exists
    if (typeof stationDimensions === 'string') {
        return stationDimensions;
    }

    // Final fallback to the default dimension
    return COGNITIVE_PICTOGRAM_DIMENSIONS['DEFAULT'] as string;
};

// This list contains stations whose pictogram count is defined by specific logic or user input,
// rather than being handled by a special case in the generation function.
const initialCounts: Record<string, number> = {
    // Line B
    'BOR': 2,
    // 'TCO': 2 (default)
    // 'LVA': 2 (default)
    // 'BPA': 2 (default)
    // 'MIN': 2 (default)
    // 'CAN': 2 (default)
    'CCA': 3,
    'JAR': 2,
    'JJB': 0, // Special case for Jean-Jaurès, user can add accesses if needed
    'FVE': 2,
    'CAR': 2,
    'PDJ': 2,
    'SMI': 2,
    'EMP': 1,
    'SAG': 2,
    'SAO': 2,
    'RAN': 1,
    'PHA': 2,
    'UPS': 2,
    // 'RAM' is a special case
    
    // Line A
    'BGR': 2,
    'ARG': 1,
    'ROS': 1,
    // 'JOL' is a special case
    'MAR': 1,
    'JJA': 1,
    // 'CAP' is a special case
    // 'ESQ' is a special case
    'ARE': 2,
    'MUN': 2,
    'BEL': 2,
    'MBC': 2,
};


export const generateInitialCognitivePictogramsForStation = (stationCode: string): CognitivePictogram[] => {
    const pictos: CognitivePictogram[] = [];

    // Special cases based on station configuration
    switch (stationCode) {
        // --- Ligne A ---
        case 'FLE': // Fontaine-Lestang
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Mur derrière station (côté Rue de la Moselle)',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'REY':
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Principal',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'BAG':
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Rue',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'MER':
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Principal',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'POI':
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Principal',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'SCY':
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Allées Charles de Fitte',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès direction Esquirol',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès direction Patte d\'Oie',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'ESQ':
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Rue Saint-Rome',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Rue des Changes',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'JJA': // Ligne A - Jean Jaurès
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès direction Place Wilson',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès direction Médiathèque/Marengo',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'JOL': // Ligne A: JOL ASC (1) + JOL PRI (1)
             pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Jolimont ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Jolimont Principal',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'MBC': // Ligne A - Basso Cambo
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Gare Bus (sur mur)',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès à définir',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'CAP': // Ligne A: CAP PRI (2) + CAP ASC (0)
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Capitole - Petit Modèle',
                status: FloorAdhesiveStatus.NotChecked,
            });
             pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Capitole - Grand Modèle',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
            
        // --- Ligne B ---
        case 'SMI': // Saint-Michel Marcel Langer
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Prison',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'SAO': // Saouzelong
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté rue',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté metro',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'UPS': // Université Paul Sabatier
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Forum',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Lycée',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'RAM':
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès RAM BOR',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès RAM BUS',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'PDJ': // Palais de Justice
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Grande Rue Saint-Michel',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'CAR': // Carmes
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès direction Esquirol',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès direction Palais de Justice',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'CCA': // Compans-Caffarelli
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Rue Lascrosses',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès ascenseur (direction Ponts Jumeaux)',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès ascenseur (côté Centre Commercial)',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'JAR': // Jeanne d'Arc
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté rue',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'MIN': // Minimes - Claude Nougaro
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté rue (Avenue des Minimes)',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'LVA': // La Vache
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté bus',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté square',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'BPA': // Barrière de Paris
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Avenue des Minimes',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Rue Pierre et Marie Curie',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'TCO': // Trois Cocus
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté préau',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
        case 'BOR': // Borderouge
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté Place de la Maourine',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès côté bus',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
    }

    // Default to 2 if not specified, as per user request for a minimum
    const count = initialCounts[stationCode] ?? 2;

    for (let i = 1; i <= count; i++) {
        pictos.push({
            id: uuidv4(),
            accessPointName: `Accès à définir ${i}`,
            status: FloorAdhesiveStatus.NotChecked,
        });
    }

    return pictos;
};
