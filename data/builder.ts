import {
    Lieu, AuditModule, ModeData, AuditModuleType, TransportMode, MetroLine, Station, Direction, DAT, AdhesiveStatus, Pr,
    Equipment, EquipmentType, EcaData, ECA, EcaEquipmentType, AuditCategory, PMRFloorAdhesiveData, PMRFloorAdhesive, FloorAdhesiveStatus, AuditCategoryConfig, CognitivePictogramData, CognitivePictogram
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ADHESIVES, getEcaAdhesives, getPrAdhesives } from './adhesives';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from './stations';
import { PR_DATA } from './pr_data';
import { AUDIT_CATEGORIES } from './config';
import { ECA_DEFINITIONS, isPmrEcaType, ECA_DEFINITIONS_JJA_A_TO_B, ECA_DEFINITIONS_JJA_B_TO_A, ECA_DEFINITIONS_JJA_A_HISTORIQUE, ECA_DEFINITIONS_JJA_A_PRINCIPAL } from './eca_data';
import { PMR_PICTOGRAM_CONFIG } from './pmr_pictogram_config';
import { generateInitialCognitivePictogramsForStation } from './cognitive_pictograms';

const createInitialAdhesiveStatus = (adhesives: any[]): { [key: string]: AdhesiveStatus } => {
    return adhesives.reduce((acc, ad) => ({ ...acc, [ad.id]: AdhesiveStatus.NotChecked }), {});
};

const createDatDirectionsAndDatsForStation = (station: Partial<Station>, line: MetroLine | 'TRAM' | 'TELEO'): Direction[] => {
    const stationId = station.id!;
    
    const createDat = (name: string): DAT => ({
        id: uuidv4(),
        name: `DAT ${name.padStart(2, '0')}`,
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
                return [{ id: `${stationId}-dir-1`, name: 'Quai', dats: [createDat('02'), createDat('01')] }];
            case 'Hôpital Rangueil-Louis Lareng':
                 return [
                    { id: `${stationId}-dir-1`, name: 'Niveau voirie', dats: [createDat('01')] },
                    { id: `${stationId}-dir-2`, name: 'Niveau passerelle', dats: [createDat('02')] }
                ];
            case 'Université Paul-Sabatier':
                 return [{ id: `${stationId}-dir-1`, name: 'Quai', dats: [createDat('02'), createDat('01')] }];
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
    
    let moduleName = 'DAT';
    if (station.code === 'JJA') {
        moduleName = 'DAT (niveau agence coté entrée historique)';
    }

    return {
        id: `module-dat-${station.id}`,
        type: AuditModuleType.DAT,
        name: moduleName,
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

const createEcaModule = (
    moduleName: string,
    stationName: string,
    stationCode: string,
    line: MetroLine,
    isFuture: boolean,
    ecaTemplates: Omit<ECA, 'id' | 'adhesives' | 'comment'>[]
): AuditModule => {
    const ecas: ECA[] = isFuture ? [] : ecaTemplates.map((template, index) => {
        const initialAdhesives = createInitialAdhesiveStatus(getEcaAdhesives(template.type));

        // Apply pre-configuration for PMR pictograms
        if (isPmrEcaType(template.type) && stationCode && PMR_PICTOGRAM_CONFIG[stationCode]) {
            const config = PMR_PICTOGRAM_CONFIG[stationCode];
            if (!config.bagages) initialAdhesives['eca-8'] = AdhesiveStatus.NotApplicable;
            if (!config.poussette) initialAdhesives['eca-9'] = AdhesiveStatus.NotApplicable;
            if (!config.ufr) initialAdhesives['eca-10'] = AdhesiveStatus.NotApplicable;
        }

        return {
            ...template,
            id: `${stationCode}-${line}-eca-${index + 1}`,
            adhesives: initialAdhesives,
            comment: ''
        };
    });

    const ecaData: EcaData = {
        id: `eca-data-${stationCode}-${line}`,
        stationName,
        stationCode,
        ecas,
    };

    return {
        id: `module-eca-${stationCode}-${line}-${moduleName.replace(/\s/g, '-')}`,
        type: AuditModuleType.ECA,
        name: moduleName,
        data: ecaData,
        isFuture,
        line,
    };
};

const createPmrFloorAdhesiveModule = (station: Partial<Station>, line: MetroLine): AuditModule | null => {
    const ecaTemplates = ECA_DEFINITIONS[station.code!] ?? ECA_DEFINITIONS['DEFAULT'];
    const hasPmrEca = ecaTemplates.some(template => isPmrEcaType(template.type));

    // Only create a module if the station has a PMR ECA and is not Jean Jaurès (handled separately)
    if (!hasPmrEca || station.isFuture || station.code === 'JJA' || station.code === 'JJB') {
        return null;
    }

    const adhesives: PMRFloorAdhesive[] = [{
        id: `${station.id}-pmr-floor-1`,
        name: `Présence et état de l'adhésif de signalisation au sol`,
        status: FloorAdhesiveStatus.NotChecked,
    }];

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
        isFuture: !!station.isFuture,
        line: line,
    };
};

const createSpecificPmrFloorAdhesiveModule = (
    moduleName: string,
    station: Partial<Station>,
    line: MetroLine
): AuditModule => {
    const adhesives: PMRFloorAdhesive[] = [{
        id: uuidv4(),
        name: `Présence et état de l'adhésif de signalisation au sol`,
        status: FloorAdhesiveStatus.NotChecked,
    }];

    const data: PMRFloorAdhesiveData = {
        id: uuidv4(),
        stationName: station.name!,
        stationCode: station.code!,
        adhesives,
        comment: '',
    };

    return {
        id: uuidv4(),
        type: AuditModuleType.PMR_FLOOR_ADHESIVE,
        name: moduleName,
        data: data,
        isFuture: !!station.isFuture,
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
            
            // Generic ECA modules, excluding Jean Jaurès Ligne A ('JJA')
            ...LINE_A_STATIONS.filter(s => s.code !== 'JJA').map(s => createEcaModule(
                'ECA (Valideurs)', s.name!, s.code!, 'A', !!s.isFuture, ECA_DEFINITIONS[s.code!] ?? ECA_DEFINITIONS['DEFAULT']
            )),
            ...LINE_B_STATIONS.map(s => {
                const moduleName = s.code === 'JJB' ? 'ECA (Entrée Principale)' : 'ECA (Valideurs)';
                return createEcaModule(
                    moduleName, s.name!, s.code!, 'B', !!s.isFuture, ECA_DEFINITIONS[s.code!] ?? ECA_DEFINITIONS['DEFAULT']
                );
            }),
            ...LINE_C_STATIONS.map(s => createEcaModule(
                 'ECA (Valideurs)', s.name!, s.code!, 'C', !!s.isFuture, ECA_DEFINITIONS[s.code!] ?? ECA_DEFINITIONS['DEFAULT']
            )),

            ...LINE_A_STATIONS.map(s => createPmrFloorAdhesiveModule(s, 'A')).filter((m): m is AuditModule => m !== null),
            ...LINE_B_STATIONS.map(s => createPmrFloorAdhesiveModule(s, 'B')).filter((m): m is AuditModule => m !== null),
            ...LINE_C_STATIONS.map(s => createPmrFloorAdhesiveModule(s, 'C')).filter((m): m is AuditModule => m !== null),
            
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

        // SPECIAL: Add custom modules to Jean-Jaurès
        const jjLieu = lieuxMap.get('Jean-Jaurès');
        if (jjLieu) {
            const jjaStation = LINE_A_STATIONS.find(s => s.code === 'JJA')!;
            const jjbStation = LINE_B_STATIONS.find(s => s.code === 'JJB')!;

            // ECA modules
            const moduleAtoB = createEcaModule('ECA Liaison A→B', 'Jean-Jaurès', 'JJA', 'A', false, ECA_DEFINITIONS_JJA_A_TO_B);
            const moduleBtoA = createEcaModule('ECA Liaison B→A', 'Jean-Jaurès', 'JJB', 'B', false, ECA_DEFINITIONS_JJA_B_TO_A);
            const moduleJjaHist = createEcaModule('ECA (Accès Historique)', 'Jean-Jaurès', 'JJA', 'A', false, ECA_DEFINITIONS_JJA_A_HISTORIQUE);
            const moduleJjaPrinc = createEcaModule('ECA (Accès Principal)', 'Jean-Jaurès', 'JJA', 'A', false, ECA_DEFINITIONS_JJA_A_PRINCIPAL);

            // PMR Floor Adhesive modules
            const modulePmrA_Hist = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Accès Historique)', jjaStation, 'A');
            const modulePmrA_Princ = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Accès Principal)', jjaStation, 'A');
            const modulePmrB = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Ligne B)', jjbStation, 'B');
            const modulePmrAtoB = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Liaison A→B)', jjaStation, 'A');
            const modulePmrBtoA = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Liaison B→A)', jjbStation, 'B');

            jjLieu.modules.push(
                moduleAtoB, moduleBtoA, moduleJjaHist, moduleJjaPrinc,
                modulePmrA_Hist, modulePmrA_Princ, modulePmrB, modulePmrAtoB, modulePmrBtoA
            );
        }

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