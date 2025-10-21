// data/pmr_materials.ts

// This map uses the official station names from data/stations.ts as keys.
const materialMap: Record<string, string> = {
    // Ligne A
    'Basso Cambo': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Bellefontaine': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Reynerie': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Mirail-Université': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Bagatelle': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Mermoz': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Fontaine-Lestang': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Arènes': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Patte d\'Oie': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Saint-Cyprien - République': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Esquirol|Adhésifs PMR au Sol (Esquirol Principale)': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Esquirol|Adhésifs PMR au Sol (Esquirol Ascenseur)': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Capitole|Adhésifs PMR au Sol (Capitole Principale)': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Capitole|Adhésifs PMR au Sol (Capitole Ascenseur)': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Jean-Jaurès|Adhésifs PMR au Sol (Accès Principal Ligne A)': "Adhésif renforcé bitume dos aluminium + plastification sol Ultra Protect",
    'Jean-Jaurès|Adhésifs PMR au Sol (Accès Principal Ligne B)': "Adhésif renforcé bitume dos aluminium + plastification sol Ultra Protect",
    'Jean-Jaurès|Adhésifs PMR au Sol (Liaison A→B)': "Adhésif renforcé bitume dos aluminium + plastification sol Ultra Protect",
    'Jean-Jaurès|Adhésifs PMR au Sol (Liaison B→A)': "Adhésif renforcé bitume dos aluminium + plastification sol Ultra Protect",
    'Marengo-SNCF': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Jolimont|Adhésifs PMR au Sol (Jolimont Principal)': "Vinyle WALL colle renforcée + plastification sol traditionnelle", // Bas
    'Jolimont|Adhésifs PMR au Sol (Jolimont ascenseur)': "Vinyle WALL colle renforcée + plastification sol traditionnelle", // Haut
    'Roseraie': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Argoulets': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Balma-Gramont': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    // Ligne B
    'Borderouge': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Trois Cocus': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'La Vache': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Barrière de Paris': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Minimes - Claude Nougaro': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Canal du Midi': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Compans-Caffarelli': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Jeanne d\'Arc': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'François Verdier': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Carmes': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Palais de Justice': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Saint-Michel - Marcel Langer': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Empalot': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Saint-Agne - SNCF': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Saouzelong': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Rangueil': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Faculté de Pharmacie': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Université Paul-Sabatier': "Vinyle WALL colle renforcée + plastification sol traditionnelle",
    'Ramonville|Adhésifs PMR au Sol (Accès RAM BUS)': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
    'Ramonville|Adhésifs PMR au Sol (Accès RAM BOR)': "Vinyle WALL colle renforcée + plastification sol Ultra Protect",
};

/**
 * Retrieves the material used for a PMR floor adhesive based on the station and module name.
 * It first checks for a specific key combining station and module name for complex stations,
 * then falls back to checking by station name for simpler cases.
 * @param stationName The name of the station.
 * @param moduleName The name of the audit module.
 * @returns The material string, or null if not found.
 */
export const getPmrMaterial = (stationName: string, moduleName: string): string | null => {
    const specificKey = `${stationName}|${moduleName}`;
    if (materialMap[specificKey]) {
        return materialMap[specificKey];
    }
    // For single-module stations or multi-module lieux where the PMR module is generic,
    // we can fall back to the station name as the key.
    if (materialMap[stationName]) {
        return materialMap[stationName];
    }
    return null;
};