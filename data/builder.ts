import {
    Lieu, AuditModule, ModeData, AuditModuleType, TransportMode, MetroLine, Station, Direction, DAT, AdhesiveStatus, Pr,
    Equipment, EquipmentType, EcaData, ECA, EcaEquipmentType, AuditCategory, PMRFloorAdhesiveData, PMRFloorAdhesive, FloorAdhesiveStatus, AuditCategoryConfig, CognitivePictogramData, CognitivePictogram
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ADHESIVES, getEcaAdhesives, getPrAdhesives } from './adhesives';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from './stations';
import { PR_DATA } from './pr_data';
import { AUDIT_CATEGORIES } from './config';
import { ECA_DEFINITIONS, isPmrEcaType } from './eca_data';
import { PMR_PICTOGRAM_CONFIG } from './pmr_pictogram_config';
import { generateInitialCognitivePictogramsForStation } from './cognitive_pictograms';

const createInitialAdhesiveStatus = (adhesives: any[]): { [key: string]: AdhesiveStatus } => {
    return adhesives.reduce((acc, ad) => ({ ...acc, [ad.id]: AdhesiveStatus.NotChecked }), {});
};

const createDatDirectionsAndDatsForStation = (station: Partial<Station>, line: MetroLine | 'TRAM' | 'TELEO'): Direction[] => {
    const stationId = station.id!;
    
    const createDat = (name: string): DAT => ({
        id: uuidv4(),
        name: `DAT ${name}`,
        adhesives: createInitialAdhesiveStatus(ADHESIVES),
        comment: ''
    });

    if (line === 'A' || line === 'B') {
        switch (station.code) {
            // Ligne A
            case 'MBC': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'BEL': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'REY': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'MUN': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'BAG': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'MER': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'FLE': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'ARE': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'POI': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'SCY': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'ESQ': return [
                { id: `${stationId}-dir-1`, name: 'Direction HAUT (PRI)', dats: [createDat('01'), createDat('02'), createDat('03')] },
                { id: `${stationId}-dir-2`, name: 'Direction BAS (ASC)', dats: [createDat('04')] }
            ];
            case 'CAP': return [
                { id: `${stationId}-dir-1`, name: 'Direction HAUT (PRI)', dats: [createDat('01'), createDat('02'), createDat('03'), createDat('05')] },
                { id: `${stationId}-dir-2`, name: 'Direction BAS (ASC)', dats: [createDat('04')] }
            ];
            case 'JJA': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'MAR': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03'), createDat('04')] }];
            case 'JOL': return [
                { id: `${stationId}-dir-1`, name: 'Direction HAUT (PRI)', dats: [createDat('01'), createDat('02')] },
                { id: `${stationId}-dir-2`, name: 'Direction BAS (ASC)', dats: [createDat('03'), createDat('04')] }
            ];
            case 'ROS': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'ARG': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'BGR': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];

            // Ligne B
            case 'BOR': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'TCO': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'LVA': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'BPA': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'MIN': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'CAN': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'CCA': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'JAR': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'JJB': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'FVE': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'CAR': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'PDJ': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'SMI': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'EMP': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'SAG': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'SAO': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'RAN': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02')] }];
            case 'PHA': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'UPS': return [{ id: `${stationId}-dir-1`, name: 'Salle des billets', dats: [createDat('01'), createDat('02'), createDat('03')] }];
            case 'RAM': return [
                { id: `${stationId}-dir-1`, name: 'Direction SQUARE (SQU)', dats: [createDat('01'), createDat('02')] },
                { id: `${stationId}-dir-2`, name: 'Direction côté BUS', dats: [createDat('03'), createDat('04')] }
            ];
        }
    }

    if (line === 'TRAM') {
        switch (station.name) {
            case 'Arènes':
                return [{
                    id: `${stationId}-dir-1`,
                    name: 'Direction MEETT / Aéroport',
                    dats: [createDat('01'), createDat('02')]
                }];
            case 'Aéroconstellation':
                return [{
                    id: `${stationId}-dir-1`,
                    name: 'Direction Palais de Justice',
                    dats: [createDat('01'), createDat('02')]
                }];
            case 'MEETT':
                return [{
                    id: `${stationId}-dir-1`,
                    name: 'Direction Palais de Justice',
                    dats: [createDat('01'), createDat('02')]
                }];
            default: // All other tram stations
                return [
                    { id: `${stationId}-dir-1`, name: 'Direction MEETT / Aéroport', dats: [createDat('01')] },
                    { id: `${stationId}-dir-2`, name: 'Direction Palais de Justice', dats: [createDat('02')] }
                ];
        }
    }
    
    if (line === 'TELEO') {
        switch (station.name) {
            case 'Oncopole-Lise Enjalbert':
                return [{ id: `${stationId}-dir-1`, name: 'Quai', dats: [createDat('02 (droite)'), createDat('01 (gauche)')] }];
            case 'Hôpital Rangueil-Louis Lareng':
                 return [
                    { id: `${stationId}-dir-1`, name: 'Niveau voirie', dats: [createDat('01')] },
                    { id: `${stationId}-dir-2`, name: 'Niveau passerelle', dats: [createDat('02')] }
                ];
            case 'Université Paul-Sabatier':
                 return [{ id: `${stationId}-dir-1`, name: 'Quai', dats: [createDat('02 (droite)'), createDat('01 (gauche)')] }];
        }
    }

    let dir1Name = 'Direction A';
    let dir2Name = 'Direction B';
    if (line === 'A') { dir1Name = 'Direction Balma-Gramont'; dir2Name = 'Direction Basso Cambo'; }
    if (line === 'B') { dir1Name = 'Direction Borderouge'; dir2Name = 'Direction Ramonville'; }
    if (line === 'C') { dir1Name = 'Direction Colomiers Gare'; dir2Name = 'Direction Labège Gare'; }

    return [
        { id: `${stationId}-dir-1`, name: dir1Name, dats: [createDat('01'), createDat('02')] },
        { id: `${stationId}-dir-2`, name: dir2Name, dats: [createDat('03'), createDat('04')] }
    ];
};

const createDatModule = (station: Partial<Station>, type: TransportMode, line: MetroLine | 'TRAM' | 'TELEO'): AuditModule => {
    const fullStation: Station = {
        ...station,
        id: station.id!, name: station.name!,
        directions: station.isFuture ? [] : createDatDirectionsAndDatsForStation(station, line),
    };

    const modeData: ModeData = {
        id: `mode-${station.id}`, name: station.name!, type, line,
        stations: [fullStation],
    };

    return {
        id: `module-dat-${station.id}`,
        type: AuditModuleType.DAT,
        name: 'DAT',
        data: modeData,
        isFuture: station.isFuture,
        line: line,
    };
};

const createPrModule = (prData: { id: string, name: string }): AuditModule => {
    const equipments: Equipment[] = [
        ...Array.from({ length: 2 }, (_, i) => ({
            id: `${prData.id}-be-${i + 1}`, name: `Borne Entrée ${i + 1}`, type: EquipmentType.BE,
            adhesives: createInitialAdhesiveStatus(getPrAdhesives(EquipmentType.BE)), comment: '',
        })),
        ...Array.from({ length: 2 }, (_, i) => ({
            id: `${prData.id}-bs-${i + 1}`, name: `Borne Sortie ${i + 1}`, type: EquipmentType.BS,
            adhesives: createInitialAdhesiveStatus(getPrAdhesives(EquipmentType.BS)), comment: '',
        })),
        ...Array.from({ length: 1 }, (_, i) => ({
            id: `${prData.id}-ca-${i + 1}`, name: `Caisse Auto ${i + 1}`, type: EquipmentType.CA,
            adhesives: createInitialAdhesiveStatus(getPrAdhesives(EquipmentType.CA)), comment: '',
        })),
    ];

    const pr: Pr = { id: prData.id, name: prData.name, equipments };

    return {
        id: `module-pr-${prData.id}`,
        type: AuditModuleType.PR,
        name: 'P+R',
        data: pr,
    };
};

const createEcaModuleForStation = (station: Partial<Station>, line: MetroLine): AuditModule => {
    const ecaTemplates = ECA_DEFINITIONS[station.code!] ?? ECA_DEFINITIONS['DEFAULT'];

    const ecas: ECA[] = station.isFuture ? [] : ecaTemplates.map((template, index) => {
        const initialAdhesives = createInitialAdhesiveStatus(getEcaAdhesives(template.type));

        // Apply pre-configuration for PMR pictograms
        if (isPmrEcaType(template.type) && station.code && PMR_PICTOGRAM_CONFIG[station.code]) {
            const config = PMR_PICTOGRAM_CONFIG[station.code];
            if (!config.bagages) {
                initialAdhesives['eca-8'] = AdhesiveStatus.NotApplicable;
            }
            if (!config.poussette) {
                initialAdhesives['eca-9'] = AdhesiveStatus.NotApplicable;
            }
            if (!config.ufr) {
                initialAdhesives['eca-10'] = AdhesiveStatus.NotApplicable;
            }
        }

        return {
            ...template,
            id: `${station.id}-eca-${index + 1}`,
            adhesives: initialAdhesives,
            comment: ''
        };
    });

    const ecaData: EcaData = {
        id: `eca-data-${station.id}`,
        stationName: station.name!,
        stationCode: station.code!,
        ecas,
    };

    return {
        id: `module-eca-${station.id}`,
        type: AuditModuleType.ECA,
        name: `ECA (Valideurs)`,
        data: ecaData,
        isFuture: station.isFuture,
        line: line,
    };
};

const createPmrFloorAdhesiveModule = (station: Partial<Station>, line: MetroLine): AuditModule => {
    const ecaTemplates = ECA_DEFINITIONS[station.code!] ?? ECA_DEFINITIONS['DEFAULT'];
    const pmrEcaTemplates = ecaTemplates.filter(template => isPmrEcaType(template.type));

    const adhesives: PMRFloorAdhesive[] = station.isFuture ? [] : pmrEcaTemplates.map((template, index) => ({
        id: `${station.id}-pmr-floor-${index + 1}`,
        name: `Passage PMR - ${template.name}`,
        status: FloorAdhesiveStatus.NotChecked,
    }));

    const data: PMRFloorAdhesiveData = {
        id: `pmr-floor-data-${station.id}`,
        stationName: station.name!,
        stationCode: station.code!,
        adhesives,
        comment: '',
    };

    return {
        id: `module-pmr-floor-${station.id}`,
        type: AuditModuleType.PMR_FLOOR_ADHESIVE,
        name: 'Adhésifs PMR au Sol',
        data: data,
        isFuture: station.isFuture,
        line: line,
    };
};

const createCognitivePictogramModule = (station: Partial<Station>, line: MetroLine): AuditModule => {
    const stationCode = station.code!;
    const pictograms = generateInitialCognitivePictogramsForStation(stationCode);

    const data: CognitivePictogramData = {
        id: `cog-picto-data-${station.id}`,
        stationName: station.name!,
        stationCode: stationCode,
        pictograms,
        comment: '',
    };

    return {
        id: `module-cog-picto-${station.id}`,
        type: AuditModuleType.COGNITIVE_PICTOGRAMS,
        name: 'Pictogrammes Cognitifs',
        data: data,
        isFuture: station.isFuture,
        line: line,
    };
};

export const generateInitialLieuxDataAsync = async (): Promise<Lieu[]> => {
    return new Promise(resolve => {
        const modules: AuditModule[] = [
            ...LINE_A_STATIONS.map(s => createDatModule(s, TransportMode.METRO, 'A')),
            ...LINE_B_STATIONS.map(s => createDatModule(s, TransportMode.METRO, 'B')),
            ...LINE_C_STATIONS.map(s => createDatModule(s, TransportMode.METRO, 'C')),
            ...TRAM_STATIONS.map(s => createDatModule(s, TransportMode.TRAM, 'TRAM')),
            ...TELEO_STATIONS.map(s => createDatModule(s, TransportMode.TELEO, 'TELEO')),
            ...PR_DATA.map(p => createPrModule(p)),
            
            ...LINE_A_STATIONS.map(s => createEcaModuleForStation(s, 'A')),
            ...LINE_B_STATIONS.map(s => createEcaModuleForStation(s, 'B')),
            ...LINE_C_STATIONS.map(s => createEcaModuleForStation(s, 'C')),

            ...LINE_A_STATIONS.map(s => createPmrFloorAdhesiveModule(s, 'A')),
            ...LINE_B_STATIONS.map(s => createPmrFloorAdhesiveModule(s, 'B')),
            ...LINE_C_STATIONS.map(s => createPmrFloorAdhesiveModule(s, 'C')),
            
            ...LINE_A_STATIONS.map(s => createCognitivePictogramModule(s, 'A')),
            ...LINE_B_STATIONS.map(s => createCognitivePictogramModule(s, 'B')),
        ];

        const lieuxMap = new Map<string, Lieu>();

        const getLieuName = (module: AuditModule): string => {
            if (module.type === AuditModuleType.DAT) {
                const station = (module.data as ModeData).stations[0];
                return station.lieuName || station.name;
            }
            if (module.type === AuditModuleType.PR) {
                return (module.data as Pr).name;
            }
            if (module.type === AuditModuleType.ECA) {
                const stationName = (module.data as EcaData).stationName;
                const station = [...LINE_A_STATIONS, ...LINE_B_STATIONS, ...LINE_C_STATIONS].find(s => s.name === stationName);
                return station?.lieuName || stationName;
            }
            if (module.type === AuditModuleType.PMR_FLOOR_ADHESIVE) {
                const stationName = (module.data as PMRFloorAdhesiveData).stationName;
                const station = [...LINE_A_STATIONS, ...LINE_B_STATIONS, ...LINE_C_STATIONS].find(s => s.name === stationName);
                return station?.lieuName || stationName;
            }
            if (module.type === AuditModuleType.COGNITIVE_PICTOGRAMS) {
                const stationName = (module.data as CognitivePictogramData).stationName;
                const station = [...LINE_A_STATIONS, ...LINE_B_STATIONS].find(s => s.name === stationName);
                return station?.lieuName || stationName;
            }
            return module.name;
        };
        
        modules.forEach(module => {
            const lieuName = getLieuName(module);
            if (!lieuxMap.has(lieuName)) {
                lieuxMap.set(lieuName, {
                    id: `lieu-${lieuName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                    name: lieuName,
                    modules: [],
                });
            }
            lieuxMap.get(lieuName)!.modules.push(module);
        });

        resolve(Array.from(lieuxMap.values()));
    });
};

export const getLieuxForCategory = (lieux: Lieu[], category: AuditCategory): Lieu[] => {
    const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category);
    if (!categoryConfig) return [];

    return lieux
        .filter(lieu => lieu.modules.some(module => categoryConfig.predicate(module)))
        .map(lieu => {
            // For the category view, it might be desirable to only show modules of that category
            // but for now we return the full lieu object to avoid breaking navigation logic
            // that expects all modules to be present.
            return lieu;
        });
};

export const getModuleLineConfig = (module: AuditModule): AuditCategoryConfig | undefined => {
    return AUDIT_CATEGORIES.find(c => c.predicate(module));
};