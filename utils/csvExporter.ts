
// utils/csvExporter.ts

import {
    Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData,
    AdhesiveStatus, FloorAdhesiveStatus, EquipmentType, EcaEquipmentType, MaintenanceItem
} from '../types';
import { ADHESIVES, getEcaAdhesives, getPrAdhesives } from '../data/adhesives';
import { getCognitivePictogramDimension } from '../data/cognitive_pictograms';
import { getPmrMaterial } from '../data/pmr_materials';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from '../data/config';

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
// SECTION: CALENDAR (.ics) EXPORT & HOLIDAY LOGIC
// =================================================================

/**
 * Calcule le jour de Pâques pour une année donnée (Algorithme de Meeus/Jones/Butcher).
 */
const getEasterDate = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
};

/**
 * Vérifie si une date est un jour férié en France.
 */
const isHoliday = (date: Date): boolean => {
    const d = date.getDate();
    const m = date.getMonth() + 1; // Janvier = 1
    const year = date.getFullYear();

    // Jours fériés fixes
    if (
        (d === 1 && m === 1) ||   // Jour de l'An
        (d === 1 && m === 5) ||   // Fête du Travail
        (d === 8 && m === 5) ||   // Victoire 1945
        (d === 14 && m === 7) ||  // Fête Nationale
        (d === 15 && m === 8) ||  // Assomption
        (d === 1 && m === 11) ||  // Toussaint
        (d === 11 && m === 11) || // Armistice 1918
        (d === 25 && m === 12)    // Noël
    ) {
        return true;
    }

    // Jours fériés mobiles (basés sur Pâques)
    const easter = getEasterDate(year);
    
    // Lundi de Pâques (+1 jour)
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    if (date.getTime() === easterMonday.getTime()) return true;

    // Ascension (+39 jours)
    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 39);
    if (date.getTime() === ascension.getTime()) return true;

    // Lundi de Pentecôte (+50 jours)
    const pentecostMonday = new Date(easter);
    pentecostMonday.setDate(easter.getDate() + 50);
    if (date.getTime() === pentecostMonday.getTime()) return true;

    return false;
};

/**
 * Vérifie si une date est un jour ouvré (ni week-end, ni férié).
 */
const isBusinessDay = (date: Date): boolean => {
    const day = date.getDay();
    // 0 = Dimanche, 6 = Samedi
    if (day === 0 || day === 6) return false;
    // Normaliser l'heure pour la comparaison de jours fériés
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (isHoliday(normalizedDate)) return false;
    return true;
};

/**
 * Calcule la date de rappel initiale en ajoutant des mois.
 * Si la date tombe un week-end ou un jour férié, elle est décalée au prochain jour ouvré.
 * @param monthsToAdd Le nombre de mois à ajouter à la date actuelle.
 * @returns Un objet Date représentant la date de rappel suggérée.
 */
export const calculateInitialReminderDate = (monthsToAdd: number): Date => {
    let date = new Date();
    // Reset hours to avoid timezone shifts affecting the date calculation roughly
    date.setHours(12, 0, 0, 0);
    date.setMonth(date.getMonth() + monthsToAdd);

    // Boucle jusqu'à trouver un jour ouvré
    while (!isBusinessDay(date)) {
        date.setDate(date.getDate() + 1);
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

const statusTranslations: { [key: string]: string } = {
    [AdhesiveStatus.NotChecked]: 'Non contrôlé',
    [AdhesiveStatus.OK]: 'OK',
    [AdhesiveStatus.Absent]: 'Absent',
    [AdhesiveStatus.ToBeReplaced]: 'À remplacer',
    [AdhesiveStatus.NotApplicable]: 'Non applicable',
    [FloorAdhesiveStatus.ToPlan]: 'À planifier',
};

const parseAdhesiveName = (name: string | undefined): { repere: string; name: string } => {
    if (!name) return { repere: '', name: '' };
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

const formatCompletionDate = (isoDate?: string): string => {
    if (!isoDate) return '';
    // Force date format only (no time)
    return new Date(isoDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

interface CsvRow {
    'Date de l\'export': string;
    'Date de Réalisation': string;
    Lieu: string;
    'Type d\'Audit': string;
    Ligne: string;
    Mode: string;
    'Direction/Équipement/Accès': string;
    'Élément': string;
    'Statut': string;
    'Repère': string;
    'Description Adhésif': string;
    'Localisation Adhésif': string;
    'Photo Jointe': string;
    'Note Photo': string;
    'Commentaire': string;
}

// Configuration pour le tri physique des stations
const STATION_ORDER_MAP = new Map<string, Map<string, number>>();

const buildStationIndexMap = (line: string, stations: any[]) => {
    const map = new Map<string, number>();
    stations.forEach((s, index) => {
        const name = s.lieuName || s.name;
        if (name) map.set(name, index);
    });
    STATION_ORDER_MAP.set(line, map);
};

// Build the maps once
buildStationIndexMap('A', LINE_A_STATIONS);
buildStationIndexMap('B', LINE_B_STATIONS);
buildStationIndexMap('C', LINE_C_STATIONS);
buildStationIndexMap('TRAM', TRAM_STATIONS);
buildStationIndexMap('TELEO', TELEO_STATIONS);

export const exportLieuxToCsv = (lieux: Lieu[], fileName: string): { success: boolean; error?: string } => {
    try {
        const rows: CsvRow[] = [];
        const exportDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        for (const lieu of lieux) {
            for (const module of lieu.modules) {
                const line = module.line || '';
                const mode = getModeFromLine(line);

                const baseRow: CsvRow = {
                    'Date de l\'export': exportDate,
                    'Date de Réalisation': '',
                    Lieu: lieu.name,
                    'Type d\'Audit': module.name,
                    Ligne: line,
                    Mode: mode,
                    'Direction/Équipement/Accès': '',
                    'Élément': '',
                    'Statut': '',
                    'Repère': '',
                    'Description Adhésif': '',
                    'Localisation Adhésif': '',
                    'Photo Jointe': '',
                    'Note Photo': '',
                    'Commentaire': '',
                };

                if (module.isFuture) {
                    rows.push({
                        ...baseRow,
                        'Élément': module.name,
                        'Statut': 'N/A (futur)',
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
                                        
                                        let description = '';
                                        let location = '';
                                        if (adhesive?.description) {
                                            const parts = adhesive.description.split('|');
                                            description = (parts[0] || '').replace('Dimensions:', '').trim();
                                            location = (parts[1] || '').replace('Localisation:', '').trim();
                                        }

                                        rows.push({
                                            ...baseRow,
                                            'Date de Réalisation': formatCompletionDate(dat.completionDate),
                                            'Direction/Équipement/Accès': direction.name,
                                            'Élément': dat.name,
                                            'Statut': statusTranslations[status as string] || status,
                                            'Repère': repere,
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
                        for (const zone of data.zones) {
                            for (const equipment of zone.equipments) {
                                const adhesives = getPrAdhesives(equipment.type);
                                for (const [adhesiveId, status] of Object.entries(equipment.adhesives)) {
                                    const adhesive = adhesives.find(a => a.id === adhesiveId);
                                    const { repere, name: parsedAdhesiveName } = parseAdhesiveName(adhesive?.name);
                                    
                                    let description = adhesive?.description || '';
                                    let dimensions = '';
                                    if (description.includes('//')) {
                                        const parts = description.split('//');
                                        description = parts[0].trim();
                                        dimensions = parts[1].trim();
                                    }

                                    let finalDescription = description;
                                    if (!description.toLowerCase().includes(parsedAdhesiveName.toLowerCase()) && parsedAdhesiveName) {
                                        finalDescription = `${parsedAdhesiveName} | ${description}`;
                                    }
                                    if (dimensions) {
                                        finalDescription += ` | ${dimensions}`;
                                    }

                                    rows.push({
                                        ...baseRow,
                                        'Date de Réalisation': formatCompletionDate(equipment.completionDate),
                                        'Direction/Équipement/Accès': zone.name,
                                        'Élément': `${equipment.name} (${equipment.type})`,
                                        'Statut': statusTranslations[status as string] || status,
                                        'Repère': repere,
                                        'Description Adhésif': finalDescription,
                                        'Localisation Adhésif': adhesive?.location || '',
                                        'Commentaire': equipment.comment,
                                    });
                                }
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
                                    'Date de Réalisation': formatCompletionDate(eca.completionDate),
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

                                let description = '';
                                let location = '';
                                if (adhesive?.description) {
                                    const parts = adhesive.description.split('|');
                                    description = parts[0].trim();
                                    location = parts.slice(1).join('|').trim();
                                }
                                
                                rows.push({
                                    ...baseRow,
                                    'Date de Réalisation': formatCompletionDate(eca.completionDate),
                                    'Direction/Équipement/Accès': eca.accessPoint,
                                    'Élément': eca.name,
                                    'Statut': statusTranslations[status as string] || status,
                                    'Repère': repere,
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
                        if (data.isNotApplicable) {
                            rows.push({
                                ...baseRow,
                                'Date de Réalisation': formatCompletionDate(data.completionDate),
                                'Élément': module.name,
                                'Statut': 'Non applicable',
                                'Commentaire': data.notApplicableReason || data.comment,
                            });
                            break;
                        }
                        const material = getPmrMaterial(data.stationName, module.name);
                        for (const adhesive of data.adhesives) {
                            let description = 'Adhésif de signalisation PMR au sol | 920x370mm';
                            if (material) {
                                description += ` | ${material}`;
                            }
                            rows.push({
                                ...baseRow,
                                'Date de Réalisation': formatCompletionDate(data.completionDate),
                                'Élément': '',
                                'Statut': statusTranslations[adhesive.status] || adhesive.status,
                                'Description Adhésif': description,
                                'Localisation Adhésif': '',
                                'Photo Jointe': adhesive.photo_base64 ? 'Oui (disponible via export/import JSON)' : 'Non',
                                'Note Photo': adhesive.photo_note || '',
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
                                'Date de Réalisation': formatCompletionDate(data.completionDate),
                                'Direction/Équipement/Accès': pictogram.accessPointName,
                                'Élément': 'Pictogramme cognitif (ou totem)',
                                'Statut': statusTranslations[pictogram.status] || pictogram.status,
                                'Description Adhésif': `Pictogramme pour orientation | ${dimensions}`,
                                'Localisation Adhésif': '',
                                'Commentaire': data.comment,
                            });
                        }
                        break;
                    }
                }
            }
        }
        
        if (rows.length === 0) {
            return { success: true };
        }

        // --- TRI PHYSIQUE ET PAR LIGNE ---
        const lineRank = new Map([
            ['A', 1],
            ['B', 2],
            ['C', 3],
            ['TRAM', 4],
            ['TELEO', 5],
            ['', 99] // Autres / P+R
        ]);

        rows.sort((a, b) => {
            // 1. Tri par Ligne (A > B > C > TRAM > TELEO > Autres)
            const rankA = lineRank.get(a.Ligne) ?? 99;
            const rankB = lineRank.get(b.Ligne) ?? 99;
            
            if (rankA !== rankB) {
                return rankA - rankB;
            }

            // 2. Tri Physique (Ordre des stations sur la ligne)
            // Utilisation de STATION_ORDER_MAP générée plus haut
            const stationsOnLine = STATION_ORDER_MAP.get(a.Ligne);
            if (stationsOnLine) {
                const stationIndexA = stationsOnLine.get(a.Lieu) ?? 999;
                const stationIndexB = stationsOnLine.get(b.Lieu) ?? 999;
                
                if (stationIndexA !== stationIndexB) {
                    return stationIndexA - stationIndexB;
                }
            }

            // 3. Fallback : Tri alphabétique sur le Lieu si pas d'ordre physique trouvé
            const lieuCompare = a.Lieu.localeCompare(b.Lieu);
            if (lieuCompare !== 0) return lieuCompare;

            // 4. Tri par Élément (pour regrouper les équipements identiques)
            return a['Élément'].localeCompare(b['Élément']);
        });

        // --- CONSTRUCTION CSV ---
        const finalCsvRowsForStringify: Partial<CsvRow>[] = [];
        let lastLigne: string | null = null;
        
        const headerKeys: (keyof CsvRow)[] = [
            'Date de l\'export', 'Date de Réalisation', 'Lieu', 'Type d\'Audit', 'Ligne', 'Mode', 
            'Direction/Équipement/Accès', 'Élément', 'Statut', 'Repère', 'Description Adhésif', 
            'Localisation Adhésif', 'Photo Jointe', 'Note Photo', 'Commentaire'
        ];

        const blankRow = headerKeys.reduce((acc, key) => ({ ...acc, [key]: '' }), {});

        for (const row of rows) {
            if (lastLigne !== null && row.Ligne !== lastLigne) {
                finalCsvRowsForStringify.push(blankRow);
            }
            finalCsvRowsForStringify.push(row);
            lastLigne = row.Ligne;
        }

        const csvContent = [
            '\uFEFF' + headerKeys.join(','), // BOM for UTF-8
            ...finalCsvRowsForStringify.map(row => headerKeys.map(fieldName => escapeCsv(row ? row[fieldName] : '')).join(','))
        ].join('\n') + '\n\n"Généré avec AuditRef, créé par Florent PEREZ"';

        downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
        return { success: true };
    } catch (error) {
        console.error("Failed to export to CSV:", error);
        return { success: false, error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue' };
    }
};

// =================================================================
// SECTION: MAINTENANCE LIST EXPORT
// =================================================================

export const exportMaintenanceListToCsv = (items: MaintenanceItem[], fileName: string): { success: boolean; error?: string } => {
    try {
        const headerKeys = ['Lieu', 'Ligne', 'Type d\'Audit', 'Élément', 'Contexte', 'Adhésif', 'Statut'];
        const rows = items.map(item => {
            const categoryConfig = item.category ? AUDIT_CATEGORIES.find(c => c.key === item.category) : undefined;
            const moduleConfig = item.auditType ? AUDIT_MODULES_CONFIG.find(m => m.type === item.auditType) : undefined;
            
            const status = item.status === 'Absent' ? 'Absent' : 
                           item.status === 'ToBeReplaced' ? 'À remplacer' : item.status;

            return {
                'Lieu': item.lieuName,
                'Ligne': categoryConfig?.shortLabel || '',
                'Type d\'Audit': moduleConfig?.shortLabel || '',
                'Élément': item.elementName,
                'Contexte': item.context,
                'Adhésif': item.adhesiveName,
                'Statut': status,
            };
        });

        const csvContent = [
            '\uFEFF' + headerKeys.join(','), // BOM for UTF-8
            ...rows.map(row => Object.values(row).map(escapeCsv).join(','))
        ].join('\n');

        downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
        return { success: true };
    } catch (error) {
        console.error("Failed to export maintenance list:", error);
        return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
};
