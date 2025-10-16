import { Lieu, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, Adhesive, PrAdhesive, CognitivePictogramData, FloorAdhesiveStatus } from '../types';
import { ADHESIVES, PR_ADHESIVES_BE, PR_ADHESIVES_BS, PR_ADHESIVES_CA, ECA_ADHESIVES_STD, ECA_ADHESIVES_PMR } from '../data/adhesives';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import { PR_DATA } from '../data/pr_data';

interface CsvRow {
    date_export: string;
    ligne_transport: string;
    station_nom?: string;
    station_code?: string;
    direction?: string;
    equipement_type?: string;
    equipement_numero?: number;
    repere?: string;
    adhesif_nom: string;
    adhesif_dimensions?: string;
    adhesif_description: string;
    statut: string;
    equipement_commentaire?: string;
}

const CSV_COLUMN_ORDER: (keyof CsvRow)[] = [
    'date_export',
    'ligne_transport',
    'station_nom',
    'station_code',
    'direction',
    'equipement_type',
    'equipement_numero',
    'repere',
    'adhesif_nom',
    'adhesif_dimensions',
    'adhesif_description',
    'statut',
    'equipement_commentaire',
];

const CSV_HEADERS: Record<keyof CsvRow, string> = {
    date_export: "Date de l'export",
    ligne_transport: "Ligne",
    station_nom: "Station",
    station_code: "Code Station",
    direction: "Point d'accès",
    equipement_type: "Type d'équipement",
    equipement_numero: "Numéro",
    repere: "Repère",
    adhesif_nom: "Nom de l'adhésif",
    adhesif_dimensions: "Dimensions",
    adhesif_description: "Description / Localisation",
    statut: "Statut",
    equipement_commentaire: "Commentaire sur l'équipement",
};

const ALL_ADHESIVES_MAP = new Map<string, Adhesive | PrAdhesive>();
// Correctly populate the map from all exported adhesive arrays.
[
    ...ADHESIVES,
    ...PR_ADHESIVES_BE,
    ...PR_ADHESIVES_BS,
    ...PR_ADHESIVES_CA,
    ...ECA_ADHESIVES_STD,
    ...ECA_ADHESIVES_PMR,
].forEach(ad => ALL_ADHESIVES_MAP.set(ad.id, ad));


const parseAdhesiveInfo = (adhesive: Adhesive | PrAdhesive) => {
    const name = adhesive.name || '';
    const description = adhesive.description || '';

    let repere = '';
    let cleanedName = name;
    const repereMatch = name.match(/^(Repère\s+\d+)\s*-\s*(.*)$/);
    if (repereMatch) {
        repere = repereMatch[1];
        cleanedName = repereMatch[2].trim();
    }

    let dimensions = '';
    let cleanedDescription = description;
    // Pattern for `59x59mm | ...` or `... // 11x12,5cm` or `Dimensions: 95x5,8cm | ...`
    const dimensionMatch = description.match(/(\d+([,.]\d+)?x\d+([,.]\d+)?(mm|cm))/);
    if (dimensionMatch) {
        dimensions = dimensionMatch[0];
        // Clean the description by removing the dimension and any separator/prefix around it.
        cleanedDescription = description.replace(dimensions, '')
                                     .replace(/Dimensions:\s*/, '')
                                     .replace(/(\|\s*|\s*\/\/\s*)/, '')
                                     .trim();
    }

    // Special handling for PrAdhesive location
    if ('location' in adhesive) {
        cleanedDescription = (adhesive as PrAdhesive).location;
    }


    return {
        repere,
        name: cleanedName,
        dimensions,
        description: cleanedDescription,
    };
};


const convertToCsvString = (rows: CsvRow[]): string => {
    if (rows.length === 0) {
        return '\uFEFF'; // Return only BOM for empty file
    }

    const headers = CSV_COLUMN_ORDER;
    const userFriendlyHeaders = headers.map(h => `"${CSV_HEADERS[h]}"`).join(';');

    const dataRows = rows.map(row =>
        headers.map(header => {
            const value = (row as any)[header];
            const stringValue = value === null || value === undefined ? '' : String(value);
            // Échapper les guillemets doubles en les doublant et entourer la valeur de guillemets
            return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(';')
    );

    // Concaténer les en-têtes et les données.
    const csvContent = [userFriendlyHeaders, ...dataRows].join('\n');

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

    // Format JJ/MM/AAAA for the column in the CSV.
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateOnlyString = `${day}/${month}/${year}`;
    
    // Prepending a zero-width space to force Excel and other spreadsheet software
    // to treat the date as a literal string, preventing auto-formatting that adds a time part.
    const exportDateColumnString = `\u200B${dateOnlyString}`;

    // Format AAAA-MM-JJ for the filename, ignoring time.
    const exportDateFilenameString = now.toISOString().split('T')[0];


    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            const baseRow = {
                date_export: exportDateColumnString,
                ligne_transport: module.line || (module.type === AuditModuleType.PR ? 'P+R' : ''),
            };

            switch (module.type) {
                case AuditModuleType.DAT: {
                    const modeData = module.data as ModeData;
                    for (const station of modeData.stations) {
                        for (const direction of station.directions) {
                            for (const dat of direction.dats) {
                                const datNumberMatch = dat.name.match(/\d+/);
                                for (const [adhesiveId, status] of Object.entries(dat.adhesives)) {
                                    const adhesiveInfo = ALL_ADHESIVES_MAP.get(adhesiveId);
                                    const parsedInfo = adhesiveInfo ? parseAdhesiveInfo(adhesiveInfo) : { repere: '', name: 'N/A', dimensions: '', description: 'N/A' };

                                    rows.push({
                                        ...baseRow,
                                        station_nom: station.name,
                                        station_code: station.code,
                                        direction: direction.name,
                                        equipement_type: 'DAT',
                                        equipement_numero: datNumberMatch ? parseInt(datNumberMatch[0], 10) : undefined,
                                        repere: parsedInfo.repere,
                                        adhesif_nom: parsedInfo.name,
                                        adhesif_dimensions: parsedInfo.dimensions,
                                        adhesif_description: parsedInfo.description,
                                        statut: status,
                                        equipement_commentaire: dat.comment,
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
                        const equipmentNumberMatch = equipment.name.match(/\d+/);
                        for (const [adhesiveId, status] of Object.entries(equipment.adhesives)) {
                            const adhesiveInfo = ALL_ADHESIVES_MAP.get(adhesiveId);
                            const parsedInfo = adhesiveInfo ? parseAdhesiveInfo(adhesiveInfo) : { repere: '', name: 'N/A', dimensions: '', description: 'N/A' };

                            rows.push({
                                ...baseRow,
                                station_nom: prData.name, // Using station_nom for PR name for consistency
                                station_code: '',
                                direction: '',
                                equipement_type: equipment.type,
                                equipement_numero: equipmentNumberMatch ? parseInt(equipmentNumberMatch[0], 10) : undefined,
                                repere: parsedInfo.repere,
                                adhesif_nom: parsedInfo.name,
                                adhesif_dimensions: parsedInfo.dimensions,
                                adhesif_description: parsedInfo.description,
                                statut: status,
                                equipement_commentaire: equipment.comment,
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
                                equipement_type: eca.type,
                                equipement_numero: eca.number,
                                repere: 'N/A',
                                adhesif_nom: 'N/A',
                                adhesif_dimensions: '',
                                adhesif_description: 'Aucun adhésif applicable',
                                statut: 'Non Applicable',
                                equipement_commentaire: eca.comment || 'Validé sans adhésifs',
                            });
                         } else {
                            for (const [adhesiveId, status] of Object.entries(eca.adhesives)) {
                                const adhesiveInfo = ALL_ADHESIVES_MAP.get(adhesiveId);
                                const parsedInfo = adhesiveInfo ? parseAdhesiveInfo(adhesiveInfo) : { repere: '', name: 'N/A', dimensions: '', description: 'N/A' };
                                
                                rows.push({
                                    ...baseRow,
                                    station_nom: ecaData.stationName,
                                    station_code: ecaData.stationCode,
                                    direction: eca.accessPoint,
                                    equipement_type: eca.type,
                                    equipement_numero: eca.number,
                                    repere: parsedInfo.repere,
                                    adhesif_nom: parsedInfo.name,
                                    adhesif_dimensions: parsedInfo.dimensions,
                                    adhesif_description: parsedInfo.description,
                                    statut: status,
                                    equipement_commentaire: eca.comment,
                                });
                            }
                         }
                    }
                    break;
                }
                case AuditModuleType.PMR_FLOOR_ADHESIVE: {
                     const pmrData = module.data as PMRFloorAdhesiveData;
                     for (const adhesive of pmrData.adhesives) {
                        const pmrFloorNumberMatch = adhesive.name.match(/\d+/);
                         rows.push({
                             ...baseRow,
                             station_nom: pmrData.stationName,
                             station_code: pmrData.stationCode,
                             direction: '',
                             equipement_type: 'Adhésif Sol PMR',
                             equipement_numero: pmrFloorNumberMatch ? parseInt(pmrFloorNumberMatch[0], 10) : undefined,
                             repere: '',
                             adhesif_nom: adhesive.name,
                             adhesif_dimensions: '',
                             adhesif_description: 'Adhésif de signalisation au sol pour passage PMR',
                             statut: adhesive.status,
                             equipement_commentaire: '',
                         });
                     }
                    break;
                }
                 case AuditModuleType.COGNITIVE_PICTOGRAMS: {
                    const cogData = module.data as CognitivePictogramData;
                    for (const pictogram of cogData.pictograms) {
                        // Skip export if status is "Non vérifié"
                        if (pictogram.status === FloorAdhesiveStatus.NotChecked) continue;

                        rows.push({
                            ...baseRow,
                            station_nom: cogData.stationName,
                            station_code: cogData.stationCode,
                            direction: pictogram.accessPointName,
                            equipement_type: 'Pictogramme Cognitif',
                            equipement_numero: undefined,
                            repere: '',
                            adhesif_nom: 'Pictogramme de sortie',
                            adhesif_dimensions: '',
                            adhesif_description: 'Signalétique directionnelle vers la sortie',
                            statut: pictogram.status,
                            equipement_commentaire: '',
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