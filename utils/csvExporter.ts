import { Lieu, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, Adhesive, PrAdhesive } from '../types';
import { ADHESIVES, PR_ADHESIVES_BE, PR_ADHESIVES_BS, PR_ADHESIVES_CA, ECA_ADHESIVES_STD, ECA_ADHESIVES_PMR } from '../data/adhesives';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import { PR_DATA } from '../data/pr_data';

interface CsvRow {
    date_export: string;
    ligne_transport: string;
    lieu_nom: string;
    station_nom?: string;
    station_code?: string;
    direction?: string;
    equipement_nom: string;
    equipement_commentaire?: string;
    adhesif_nom: string;
    adhesif_description: string;
    statut: string;
}

const ALL_ADHESIVES_MAP = new Map<string, Adhesive | PrAdhesive>();
// Correctly populate the map from all exported adhesive arrays.
// The previous implementation was trying to iterate over functions, which is incorrect.
[
    ...ADHESIVES,
    ...PR_ADHESIVES_BE,
    ...PR_ADHESIVES_BS,
    ...PR_ADHESIVES_CA,
    ...ECA_ADHESIVES_STD,
    ...ECA_ADHESIVES_PMR,
].forEach(ad => ALL_ADHESIVES_MAP.set(ad.id, ad));


const convertToCsvString = (rows: CsvRow[]): string => {
    if (rows.length === 0) {
        return '\uFEFF'; // Return only BOM for empty file
    }

    const headers = Object.keys(rows[0]);
    // S'assurer que les en-têtes sont aussi entre guillemets pour la cohérence
    const headerRow = headers.map(h => `"${h}"`).join(';');
    
    const dataRows = rows.map(row => 
        headers.map(header => {
            const value = (row as any)[header];
            const stringValue = value === null || value === undefined ? '' : String(value);
            // Échapper les guillemets doubles en les doublant et entourer la valeur de guillemets
            return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(';')
    );

    // Concaténer les en-têtes et les données.
    const csvContent = [headerRow, ...dataRows].join('\n');
    
    // Préfixer avec le BOM pour la compatibilité UTF-8 avec Excel
    return '\uFEFF' + csvContent;
};

const downloadCsv = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


const stationOrderList: { lieuName: string }[] = [
    ...LINE_A_STATIONS.map(s => ({ lieuName: s.lieuName || s.name! })),
    ...LINE_B_STATIONS.map(s => ({ lieuName: s.lieuName || s.name! })),
    ...LINE_C_STATIONS.map(s => ({ lieuName: s.lieuName || s.name! })),
    ...TRAM_STATIONS.map(s => ({ lieuName: s.lieuName || s.name! })),
    ...TELEO_STATIONS.map(s => ({ lieuName: s.lieuName || s.name! })),
    ...PR_DATA.map(p => ({ lieuName: p.name })),
];

const physicalOrderMap = new Map<string, number>();
stationOrderList.forEach(({ lieuName }, index) => {
    // For shared stations (e.g., Arènes), only the first occurrence (from line A) will be recorded, which is fine.
    if (lieuName && !physicalOrderMap.has(lieuName)) {
        physicalOrderMap.set(lieuName, index);
    }
});

/**
 * Sorts an array of Lieu objects based on the physical order of transport lines and stations.
 * The order is defined by the sequence of station arrays (LINE_A, LINE_B, etc.).
 * @param lieux The array of Lieu objects to sort.
 * @returns A new array of sorted Lieu objects.
 */
export const sortLieuxByPhysicalOrder = (lieux: Lieu[]): Lieu[] => {
    return [...lieux].sort((a, b) => {
        const orderA = physicalOrderMap.get(a.name);
        const orderB = physicalOrderMap.get(b.name);

        if (orderA !== undefined && orderB !== undefined) {
            return orderA - orderB;
        }
        if (orderA !== undefined) return -1; // A is ordered, B is not
        if (orderB !== undefined) return 1;  // B is ordered, A is not
        return a.name.localeCompare(b.name); // Fallback for any other lieu
    });
};


export const exportLieuxToCsv = (lieux: Lieu[], filename: string) => {
    const rows: CsvRow[] = [];

    const now = new Date();

    // Format JJ/MM/AAAA pour la colonne dans le CSV, en s'assurant que l'heure n'est pas incluse.
    const exportDateColumnString = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // Format AAAA-MM-JJ pour le nom de fichier, en ignorant l'heure.
    const exportDateFilenameString = now.toISOString().split('T')[0];


    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            const baseRow = {
                date_export: exportDateColumnString,
                lieu_nom: lieu.name,
                ligne_transport: module.line || (module.type === AuditModuleType.PR ? 'P+R' : ''),
            };

            switch (module.type) {
                case AuditModuleType.DAT: {
                    const modeData = module.data as ModeData;
                    for (const station of modeData.stations) {
                        for (const direction of station.directions) {
                            for (const dat of direction.dats) {
                                for (const [adhesiveId, status] of Object.entries(dat.adhesives)) {
                                    const adhesiveInfo = ALL_ADHESIVES_MAP.get(adhesiveId);
                                    rows.push({
                                        ...baseRow,
                                        station_nom: station.name,
                                        station_code: station.code,
                                        direction: direction.name,
                                        equipement_nom: dat.name,
                                        equipement_commentaire: dat.comment,
                                        adhesif_nom: adhesiveInfo?.name || 'N/A',
                                        adhesif_description: adhesiveInfo?.description || 'N/A',
                                        statut: status,
                                    });
                                }
                            }
                        }
                    }
                    break;
                }
                case AuditModuleType.PR: {
                    const prData = module.data as Pr;
                    for (const equipment of prData.equipments) {
                        for (const [adhesiveId, status] of Object.entries(equipment.adhesives)) {
                            const adhesiveInfo = ALL_ADHESIVES_MAP.get(adhesiveId);
                            rows.push({
                                ...baseRow,
                                station_nom: prData.name, // Using station_nom for PR name for consistency
                                station_code: '',
                                direction: '',
                                equipement_nom: equipment.name,
                                equipement_commentaire: equipment.comment,
                                adhesif_nom: adhesiveInfo?.name || 'N/A',
                                adhesif_description: adhesiveInfo?.description || 'N/A',
                                statut: status,
                            });
                        }
                    }
                    break;
                }
                case AuditModuleType.ECA: {
                    const ecaData = module.data as EcaData;
                    for (const eca of ecaData.ecas) {
                         if (eca.isNotApplicable) {
                            rows.push({
                                ...baseRow,
                                station_nom: ecaData.stationName,
                                station_code: ecaData.stationCode,
                                direction: eca.accessPoint,
                                equipement_nom: eca.name,
                                equipement_commentaire: eca.comment || 'Validé sans adhésifs',
                                adhesif_nom: 'N/A',
                                adhesif_description: 'Aucun adhésif applicable',
                                statut: 'Non Applicable',
                            });
                         } else {
                            for (const [adhesiveId, status] of Object.entries(eca.adhesives)) {
                                const adhesiveInfo = ALL_ADHESIVES_MAP.get(adhesiveId);
                                rows.push({
                                    ...baseRow,
                                    station_nom: ecaData.stationName,
                                    station_code: ecaData.stationCode,
                                    direction: eca.accessPoint,
                                    equipement_nom: eca.name,
                                    equipement_commentaire: eca.comment,
                                    adhesif_nom: adhesiveInfo?.name || 'N/A',
                                    adhesif_description: adhesiveInfo?.description || 'N/A',
                                    statut: status,
                                });
                            }
                         }
                    }
                    break;
                }
                case AuditModuleType.PMR_FLOOR_ADHESIVE: {
                     const pmrData = module.data as PMRFloorAdhesiveData;
                     for (const adhesive of pmrData.adhesives) {
                         rows.push({
                             ...baseRow,
                             station_nom: pmrData.stationName,
                             station_code: pmrData.stationCode,
                             direction: '',
                             equipement_nom: 'Signalétique au sol',
                             equipement_commentaire: '',
                             adhesif_nom: adhesive.name,
                             adhesif_description: 'Adhésif de signalisation au sol pour passage PMR',
                             statut: adhesive.status,
                         });
                     }
                    break;
                }
            }
        }
    }

    const csvString = convertToCsvString(rows);
    
    const filenameWithoutExtension = filename.slice(0, filename.lastIndexOf('.'));
    const extension = filename.slice(filename.lastIndexOf('.'));
    const newFilename = `${filenameWithoutExtension}_${exportDateFilenameString}${extension}`;
    
    downloadCsv(csvString, newFilename);
};

// =================================================================
// SECTION JSON IMPORT/EXPORT
// =================================================================

const getFormattedDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const downloadJson = (jsonString: string, filename: string) => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportLieuxToJson = (lieux: Lieu[]) => {
    try {
        const jsonString = JSON.stringify(lieux, null, 2);
        const filename = `audit-tisseo-export_${getFormattedDate()}.json`;
        downloadJson(jsonString, filename);
        return { success: true };
    } catch (error) {
        console.error("Failed to export data to JSON:", error);
        return { success: false, error };
    }
};

export const validateImportedData = (data: any): data is Lieu[] => {
    if (!Array.isArray(data)) {
        return false;
    }
    if (data.length === 0) {
        return true; // an empty array is valid
    }
    // Check if the first object has the expected shape of a Lieu
    const firstItem = data[0];
    return (
        typeof firstItem === 'object' &&
        firstItem !== null &&
        'id' in firstItem &&
        'name' in firstItem &&
        'modules' in firstItem &&
        Array.isArray(firstItem.modules)
    );
};