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

// Data parsed from the user's images for both lines
const initialCounts: Record<string, number> = {
    // Line B
    'BOR': 2,
    'TCO': 1,
    'LVA': 1,
    'BPA': 3,
    'MIN': 3,
    // 'CAN': 2 (default)
    'CCA': 3,
    'JAR': 3,
    'JJB': 0, // Special case for Jean-Jaurès, user can add accesses if needed
    'FVE': 2,
    'CAR': 2,
    'PDJ': 2,
    'SMI': 2,
    'EMP': 1,
    'SAG': 1,
    'SAO': 2,
    'RAN': 2,
    'PHA': 2,
    'UPS': 2,
    // 'RAM' is a special case
    
    // Line A
    'BGR': 1,
    'ARG': 1,
    'ROS': 1,
    // 'JOL' is a special case
    'MAR': 2,
    // 'JJA' is a special case
    // 'CAP' is a special case
    // 'ESQ' is a special case
    'SCY': 3,
    'POI': 2,
    'ARE': 2,
    'FLE': 1,
    'MER': 1,
    'BAG': 2,
    'MUN': 2,
    'REY': 2,
    'BEL': 2,
    'MBC': 2,
};


export const generateInitialCognitivePictogramsForStation = (stationCode: string): CognitivePictogram[] => {
    const pictos: CognitivePictogram[] = [];

    // Special cases based on station configuration
    switch (stationCode) {
        case 'RAM': // Ligne B
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
        
        case 'JJA': // Ligne A - Jean Jaurès
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès 1',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès 2',
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
        
        case 'ESQ': // Ligne A: ESQ ASC (1) + ESQ PRI (1)
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Esquirol Ascenseur',
                status: FloorAdhesiveStatus.NotChecked,
            });
            pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Esquirol Principale',
                status: FloorAdhesiveStatus.NotChecked,
            });
            return pictos;
    }

    // Default to 2 if not specified, as per user request for a minimum
    const count = initialCounts[stationCode] ?? 2;

    for (let i = 1; i <= count; i++) {
        pictos.push({
            id: uuidv4(),
            accessPointName: `Accès ${i}`,
            status: FloorAdhesiveStatus.NotChecked,
        });
    }

    return pictos;
};