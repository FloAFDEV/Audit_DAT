import { v4 as uuidv4 } from 'uuid';
import { CognitivePictogram, FloorAdhesiveStatus } from '../types';

// Data parsed from the user's images for both lines
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
    'SCY': 3,
    'POI': 2,
    'ARE': 2,
    'FLE': 1,
    'MER': 2,
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
                accessPointName: 'Accès Capitole Principale 1',
                status: FloorAdhesiveStatus.NotChecked,
            });
             pictos.push({
                id: uuidv4(),
                accessPointName: 'Accès Capitole Principale 2',
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
