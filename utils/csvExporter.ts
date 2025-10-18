// utils/csvExporter.ts

import {
    Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData,
    AdhesiveStatus, FloorAdhesiveStatus, Station, DAT, Equipment, ECA, PMRFloorAdhesive
} from '../types';
import { ADHESIVES, PR_ADHESIVES_BE, PR_ADHESIVES_BS, PR_ADHESIVES_CA, ECA_ADHESIVES_PMR, ECA_ADHESIVES_STD, getEcaAdhesives, getPrAdhesives } from '../data/adhesives';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import { PR_DATA } from '../data/pr_data';
import { getCognitivePictogramDimension } from '../data/cognitive_pictograms';

/**
 * Converts a string into a URL-friendly slug.
 * @param text The string to convert.
 * @returns The slugified string.
 */
export const slugify = (text: string): string => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // split an accented letter in the base letter and the accent
        .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
        .replace(/[()]/g, '') // remove parentheses
        .replace(/\s+/g, '-') // replace spaces with -
        .replace(/[^\w-]+/g, '') // remove all non-word chars
        .replace(/--+/g, '-') // replace multiple - with single -
        .replace(/^-+/, '') // trim - from start of text
        .replace(/-+$/, ''); // trim - from end of text
};


// Helper to create a download link for a file
const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

// =================================================================
// SECTION: JSON EXPORT/IMPORT
// =================================================================

export const exportLieuxToJson = (lieux: Lieu[]): { success: boolean } => {
    try {
        const exportData = {
            exportDate: new Date().toISOString().slice(0, 10),
            data: lieux,
        };
        const jsonString = JSON.stringify(exportData, null, 2);
        downloadFile(jsonString, `export-auditref-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
        return { success: true };
    } catch (error) {
        console.error("Failed to export to JSON:", error);
        return { success: false };
    }
};

export const validateImportedData = (data: any): data is Lieu[] => {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return true; // Empty array is valid
    const firstLieu = data[0];
    // Basic structural check
    return 'id' in firstLieu && 'name' in firstLieu && 'modules' in firstLieu && Array.isArray(firstLieu.modules);
};

// =================================================================
// SECTION: CALENDAR (.ics) EXPORT
// =================================================================

/**
 * Calcule la date de rappel initiale en ajoutant des mois et en s'assurant qu'elle ne tombe pas un vendredi, samedi ou dimanche.
 * @param monthsToAdd Le nombre de mois à ajouter à la date actuelle.
 * @returns Un objet Date représentant la date de rappel suggérée.
 */
export const calculateInitialReminderDate = (monthsToAdd: number): Date => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthsToAdd);

    const day = date.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

    if (day === 5) { // Friday
        date.setDate(date.getDate() + 3); // Move to Monday
    } else if (day === 6) { // Saturday
        date.setDate(date.getDate() + 2); // Move to Monday
    } else if (day === 0) { // Sunday
        date.setDate(date.getDate() + 1); // Move to Monday
    }

    return date;
};

interface IcsOptions {
    title: string;
    description: string;
    reminderDate: Date;
}

const escapeIcsText = (text: string): string => {
    return text.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
};

export const generateAndDownloadIcsFile = (options: IcsOptions) => {
    const { title, description, reminderDate } = options;
    
    const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const dateString = reminderDate.toISOString().substring(0, 10).replace(/-/g, '');
    
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AuditRef//NONSGML v1.0//EN',
        'BEGIN:VEVENT',
        `UID:${new Date().getTime()}@auditref.app`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART;VALUE=DATE:${dateString}`,
        `SUMMARY:${escapeIcsText(title)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    downloadFile(icsContent, 'rappel_suivi_audits.ics', 'text/calendar');
};


// =================================================================
// SECTION: CSV EXPORT
// =================================================================

// Helper to escape CSV values
const escapeCsv = (value: any): string => {
    if (value === null || value === undefined) {
        return '';
    }
    let str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const parseAdhesiveName = (name: string | undefined): { repere: string; name: string } => {
    if (!name) return { repere: '', name: '' };
    // This regex captures the number (or text like '10') after "Repère" and the rest of the string.
    const repereMatch = name.match(/^Repère\s+([\w\d]+)\s*-\s*(.*)$/);
    if (repereMatch) {
        return {
            repere: repereMatch[1],
            name: repereMatch[2].trim()
        };
    }
    return { repere: '', name: name };
};

const getModeFromLine = (line: string | undefined): string => {
    if (!line) return '';
    if (['A', 'B', 'C'].includes(line)) return 'METRO';
    if (line === 'TRAM') return 'TRAM';
    if (line === 'TELEO') return 'TELEO';
    return '';
};

interface CsvRow {
    'Date de l\'export': string;
    Lieu: string;
    'Type d\'Audit': string;
    Ligne: string;
    Mode: string;
    'Station/P+R': string;
    'Direction/Équipement/Accès': string;
    'Élément': string;
    'Statut': string;
    'Repère': string;
    'ID Adhésif': string;
    'Description Adhésif': string;
    'Localisation Adhésif': string;
    'Photo Jointe': string;
    'Commentaire': string;
    _lieuIndex?: number; // Temporary property for sorting
}


const getAdhesiveDetails = (id: string, moduleType: AuditModuleType, subType: any) => {
    let allAdhesives: any[] = [];
    switch (moduleType) {
        case AuditModuleType.DAT: allAdhesives = ADHESIVES; break;
        case AuditModuleType.PR: allAdhesives = [...PR_ADHESIVES_BE, ...PR_ADHESIVES_BS, ...PR_ADHESIVES_CA]; break;
        case AuditModuleType.ECA: allAdhesives = [...ECA_ADHESIVES_STD, ...ECA_ADHESIVES_PMR]; break;
    }
    const adhesive = allAdhesives.find(a => a.id === id);
    if (!adhesive) return { description: '', location: '' };

    if (moduleType === AuditModuleType.DAT) {
        const parts = adhesive.description.split('|');
        if (parts.length > 1) {
            return {
                description: parts[0].replace('Dimensions:', '').trim(),
                location: parts.slice(1).join('|').replace('Localisation:', '').trim()
            };
        }
        return { description: '', location: adhesive.description };
    }

    return { description: adhesive.description || '', location: adhesive.location || '' };
}

export const exportLieuxToCsv = (lieux: Lieu[], fileName: string): void => {
    const rows: CsvRow[] = [];
    const exportDate = new Date().toLocaleDateString('fr-FR');
    
    for (const [lieuIndex, lieu] of lieux.entries()) {
        for (const module of lieu.modules) {
            const line = module.line || '';
            const mode = getModeFromLine(line);

            const baseRow = {
                'Date de l\'export': exportDate,
                _lieuIndex: lieuIndex,
                Lieu: lieu.name,
                'Type d\'Audit': module.name,
                Ligne: line,
                Mode: mode,
                'Station/P+R': '',
                'Direction/Équipement/Accès': '',
                'Élément': '',
                'Statut': '',
                'Repère': '',
                'ID Adhésif': '',
                'Description Adhésif': '',
                'Localisation Adhésif': '',
                'Photo Jointe': '',
                'Commentaire': '',
            };

            if (module.isFuture) {
                 rows.push({
                    ...baseRow,
                    'Élément': module.name,
                    'Statut': 'N/A',
                });
                continue;
            }

            switch (module.type) {
                case AuditModuleType.DAT: {
                    const data = module.data as ModeData;
                    for (const station of data.stations) {
                        for (const direction of station.directions) {
                            for (const dat of direction.dats) {
                                for (const [adhesiveId, status] of Object.entries(dat.adhesives)) {
                                    const adhesive = ADHESIVES.find(a => a.id === adhesiveId);
                                    const { repere, name: parsedAdhesiveName } = parseAdhesiveName(adhesive?.name);
                                    const { description, location } = getAdhesiveDetails(adhesiveId, module.type, null);
                                    rows.push({
                                        ...baseRow,
                                        'Station/P+R': station.name,
                                        'Direction/Équipement/Accès': direction.name,
                                        'Élément': dat.name,
                                        'Statut': status,
                                        'Repère': repere,
                                        'ID Adhésif': adhesiveId,
                                        'Description Adhésif': `${parsedAdhesiveName} | ${description}`,
                                        'Localisation Adhésif': location,
                                        'Commentaire': dat.comment,
                                    });
                                }
                            }
                        }
                    }
                    break;
                }
                case AuditModuleType.PR: {
                    const data = module.data as Pr;
                    for (const equipment of data.equipments) {
                        const adhesives = getPrAdhesives(equipment.type);
                        for (const [adhesiveId, status] of Object.entries(equipment.adhesives)) {
                             const adhesive = adhesives.find(a => a.id === adhesiveId);
                             const { repere, name: parsedAdhesiveName } = parseAdhesiveName(adhesive?.name);
                             const { description, location } = getAdhesiveDetails(adhesiveId, module.type, equipment.type);
                             rows.push({
                                ...baseRow,
                                'Station/P+R': data.name,
                                'Direction/Équipement/Accès': equipment.name,
                                'Élément': equipment.type,
                                'Statut': status,
                                'Repère': repere,
                                'ID Adhésif': adhesiveId,
                                'Description Adhésif': `${parsedAdhesiveName} | ${description}`,
                                'Localisation Adhésif': location,
                                'Commentaire': equipment.comment,
                            });
                        }
                    }
                    break;
                }
                 case AuditModuleType.ECA: {
                    const data = module.data as EcaData;
                    for (const eca of data.ecas) {
                        if (eca.isNotApplicable) {
                             rows.push({
                                ...baseRow,
                                'Station/P+R': data.stationName,
                                'Direction/Équipement/Accès': eca.accessPoint,
                                'Élément': eca.name,
                                'Statut': 'Non applicable',
                                'Commentaire': eca.comment,
                            });
                            continue;
                        }
                        const adhesives = getEcaAdhesives(eca.type);
                        for (const [adhesiveId, status] of Object.entries(eca.adhesives)) {
                             const adhesive = adhesives.find(a => a.id === adhesiveId);
                             const { repere, name: parsedAdhesiveName } = parseAdhesiveName(adhesive?.name);
                             const { description, location } = getAdhesiveDetails(adhesiveId, module.type, eca.type);
                             rows.push({
                                ...baseRow,
                                'Station/P+R': data.stationName,
                                'Direction/Équipement/Accès': eca.accessPoint,
                                'Élément': eca.name,
                                'Statut': status,
                                'Repère': repere,
                                'ID Adhésif': adhesiveId,
                                'Description Adhésif': `${parsedAdhesiveName} | ${description}`,
                                'Localisation Adhésif': location,
                                'Commentaire': eca.comment,
                            });
                        }
                    }
                    break;
                }
                case AuditModuleType.PMR_FLOOR_ADHESIVE: {
                    const data = module.data as PMRFloorAdhesiveData;
                    for (const adhesive of data.adhesives) {
                        rows.push({
                            ...baseRow,
                            'Station/P+R': data.stationName,
                            'Élément': adhesive.name,
                            'Statut': adhesive.status,
                            'ID Adhésif': adhesive.id,
                            'Description Adhésif': 'Adhésif de signalisation PMR au sol | 920x3705mm',
                            'Localisation Adhésif': 'Au sol devant le passage PMR',
                            'Photo Jointe': adhesive.photo_base64 ? 'Oui' : 'Non',
                            'Commentaire': data.comment,
                        });
                    }
                    break;
                }
                case AuditModuleType.COGNITIVE_PICTOGRAMS: {
                     const data = module.data as CognitivePictogramData;
                     for (const pictogram of data.pictograms) {
                        const dimensions = getCognitivePictogramDimension(data.stationCode, pictogram.accessPointName);
                        rows.push({
                            ...baseRow,
                            'Station/P+R': data.stationName,
                            'Direction/Équipement/Accès': pictogram.accessPointName,
                            'Élément': 'Pictogramme cognitif (ou totem)',
                            'Statut': pictogram.status,
                            'ID Adhésif': pictogram.id,
                            'Description Adhésif': `Pictogramme pour orientation | ${dimensions}`,
                            'Localisation Adhésif': 'Au sol en amont des valideurs',
                            'Commentaire': data.comment,
                        });
                     }
                     break;
                }
            }
        }
    }
    
    if (rows.length === 0) return;

    // Sort rows by line, then by original physical lieu order
    const lineOrder = ['A', 'B', 'C', 'TRAM', 'TELEO', '']; // PR modules will have empty line
    const lineOrderMap = new Map(lineOrder.map((line, index) => [line, index]));

    rows.sort((a, b) => {
        const orderA = lineOrderMap.get(a.Ligne) ?? 99;
        const orderB = lineOrderMap.get(b.Ligne) ?? 99;
        if (orderA !== orderB) return orderA - orderB;

        // If lines are the same, sort by the original lieu order.
        return (a._lieuIndex ?? 0) - (b._lieuIndex ?? 0);
    });

    // Insert blank rows and build final array for CSV conversion
    const finalCsvRowsForStringify: Partial<CsvRow>[] = [];
    let lastLigne: string | null = null;
    
    // Get header keys from the first row, excluding the temp index key.
    const headerKeys = Object.keys(rows[0]).filter(k => k !== '_lieuIndex') as (keyof Omit<CsvRow, '_lieuIndex'>)[];
    const blankRow = headerKeys.reduce((acc, key) => ({ ...acc, [key]: '' }), {});

    for (const row of rows) {
        if (lastLigne !== null && row.Ligne !== lastLigne) {
            finalCsvRowsForStringify.push(blankRow);
        }
        const { _lieuIndex, ...restOfRow } = row;
        finalCsvRowsForStringify.push(restOfRow);
        lastLigne = row.Ligne;
    }

    const csvContent = [
        '\uFEFF' + headerKeys.join(','), // BOM for UTF-8
        ...finalCsvRowsForStringify.map(row => headerKeys.map(fieldName => escapeCsv(row[fieldName])).join(','))
    ].join('\n');

    downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
};


// =================================================================
// SECTION: SORTING
// =================================================================

const ALL_STATIONS_ORDERED = [
    ...LINE_A_STATIONS,
    ...LINE_B_STATIONS,
    ...LINE_C_STATIONS,
    ...TRAM_STATIONS,
    ...TELEO_STATIONS,
    // P+R data does not have a defined physical order, will be sorted alphabetically
    ...PR_DATA.map(pr => ({ name: pr.name }))
];

const stationOrderMap = new Map<string, number>();
ALL_STATIONS_ORDERED.forEach((station, index) => {
    // Use lieuName if available, otherwise use station name.
    const name = (station as any).lieuName || station.name;
    if (name && !stationOrderMap.has(name)) {
        stationOrderMap.set(name, index);
    }
});

export const sortLieuxByPhysicalOrder = (lieux: Lieu[]): Lieu[] => {
    return [...lieux].sort((a, b) => {
        const orderA = stationOrderMap.get(a.name);
        const orderB = stationOrderMap.get(b.name);

        if (orderA !== undefined && orderB !== undefined) {
            return orderA - orderB;
        }
        if (orderA !== undefined) {
            return -1; // A is in the list, B is not (e.g. correspondence station vs. other)
        }
        if (orderB !== undefined) {
            return 1;
        }
        // Neither is in the physical order list, sort alphabetically as a fallback.
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
};