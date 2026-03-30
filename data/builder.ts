
import {
    Lieu, AuditModule, ModeData, AuditModuleType, TransportMode, MetroLine, Station, Direction, DAT, AdhesiveStatus, Pr,
    Equipment, EquipmentType, EcaData, ECA, EcaEquipmentType, AuditCategory, PMRFloorAdhesiveData, PMRFloorAdhesive, FloorAdhesiveStatus, AuditCategoryConfig, CognitivePictogramData, CognitivePictogram, PrZone
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { ADHESIVES, getEcaAdhesives, getPrAdhesives } from './adhesives';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS, AEROPORT_EXPRESS_STATIONS } from './stations';
import { PR_DATA } from './pr_data';
import { AUDIT_CATEGORIES } from './config';
import { ECA_DEFINITIONS, isPmrEcaType, ECA_DEFINITIONS_JJA_A_TO_B, ECA_DEFINITIONS_JJA_B_TO_A, ECA_DEFINITIONS_JJA_A_HISTORIQUE, ECA_DEFINITIONS_JJA_A_PRINCIPAL } from './eca_data';
import { PMR_PICTOGRAM_CONFIG } from './pmr_pictogram_config';
import { generateInitialCognitivePictogramsForStation } from './cognitive_pictograms';
import { PR_STRUCTURES } from './pr_structures';

export const createInitialAdhesiveStatus = (adhesives: any[]): { [key: string]: AdhesiveStatus } => {
    return adhesives.reduce((acc, ad) => ({ ...acc, [ad.id]: AdhesiveStatus.NotChecked }), {});
};

const createDatDirectionsAndDatsForStation = (station: Partial<Station>, line: MetroLine | 'TRAM' | 'TELEO' | 'AEROPORT'): Direction[] => {
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
        // All T1 stations are intermediate or terminus — all have 2 directions.
        // The former special case for 'Arènes' (1 direction) was removed in v8:
        // since Hippodrome was added after it (v5), Arènes is fully intermediate.
        return [
            { id: `${stationId}-dir-1`, name: 'Direction MEETT / Aéroport', dats: [createDat('01')] },
            { id: `${stationId}-dir-2`, name: 'Direction Palais de Justice', dats: [createDat('02')] }
        ];
    }
    
    if (line === 'AEROPORT') {
        switch (station.name) {
            case 'Aéroport Toulouse Blagnac':
                return [{ id: `${stationId}-dir-1`, name: 'Direction Palais de Justice', dats: [createDat('01')] }];
            default: // BLA, NAD, DAU
                return [
                    { id: `${stationId}-dir-1`, name: 'Direction Aéroport Toulouse Blagnac', dats: [createDat('01')] },
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

import { getInitialSignaletiqueData } from './signaletique_config';

const createDatModule = (station: Partial<Station>, type: TransportMode, line: MetroLine | 'TRAM' | 'TELEO' | 'AEROPORT'): AuditModule => {
    const fullStation: Station = {
        ...station,
        id: station.id!, name: station.name!,
        // AEROPORT stations are isFuture:true but still need auditable directions (planning phase).
        directions: (station.isFuture && line !== 'AEROPORT') ? [] : createDatDirectionsAndDatsForStation(station, line),
        signaletique: line === 'TRAM' && !station.isFuture ? getInitialSignaletiqueData(station.name!) : undefined
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
        // Les modules DAT AEROPORT sont auditables même en phase de planification :
        // la même exception s'applique ici (cohérence avec la logique des directions ci-dessus).
        isFuture: station.isFuture && line !== 'AEROPORT',
        line: line,
    };
};

const createSignaletiqueModule = (station: Partial<Station>, line: 'TRAM' | 'AEROPORT'): AuditModule => {
    const fullStation: Station = {
        ...station,
        id: station.id!, name: station.name!,
        directions: [],
        signaletique: getInitialSignaletiqueData(station.name!)
    };

    const modeData: ModeData = {
        id: `mode-sig-${station.id}`, name: station.name!, type: TransportMode.TRAM, line,
        stations: [fullStation],
    };

    return {
        id: `module-sig-${station.id}`,
        type: AuditModuleType.SIGNALETIQUE,
        name: 'Équipements Station',
        data: modeData,
        isFuture: !!station.isFuture,
        line: line,
    };
};

const createPrModule = (prData: { id: string, name: string }): AuditModule => {
    const structure = PR_STRUCTURES[prData.id];
    if (!structure) {
        console.warn(`No structure found for P+R: ${prData.name}. Creating an empty module.`);
        const emptyPr: Pr = { id: prData.id, name: prData.name, zones: [] };
        return {
            id: `module-pr-${prData.id}`,
            type: AuditModuleType.PR,
            name: 'Audit Bornes P+R',
            data: emptyPr,
        };
    }
    
    const zones: PrZone[] = structure.zones.map(zoneTemplate => ({
        id: uuidv4(),
        name: zoneTemplate.name,
        equipments: zoneTemplate.equipments.map(equipTemplate => ({
            id: uuidv4(),
            name: equipTemplate.name,
            type: equipTemplate.type,
            adhesives: createInitialAdhesiveStatus(getPrAdhesives(equipTemplate.type)),
            comment: '',
        }))
    }));

    const pr: Pr = { id: prData.id, name: prData.name, zones };

    return {
        id: `module-pr-${prData.id}`,
        type: AuditModuleType.PR,
        name: 'Audit Bornes P+R',
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
            id: `${stationCode}-${line}-eca-${index + 1}-${uuidv4().substring(0,4)}`,
            adhesives: initialAdhesives,
            comment: ''
        };
    });

    const ecaData: EcaData = {
        id: `eca-data-${stationCode}-${line}-${uuidv4().substring(0,4)}`,
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
            ...TRAM_STATIONS.map(s => createSignaletiqueModule(s, 'TRAM')),
            ...AEROPORT_EXPRESS_STATIONS.map(s => createDatModule(s, TransportMode.TRAM, 'AEROPORT')),
            ...AEROPORT_EXPRESS_STATIONS.map(s => createSignaletiqueModule(s, 'AEROPORT')),
            ...TELEO_STATIONS.map(s => createDatModule(s, TransportMode.TELEO, 'TELEO')),
            ...PR_DATA.map(p => createPrModule(p)),
            
            // Generic ECA modules, excluding Jean Jaurès Ligne A ('JJA') et Ligne B ('JJB')
            ...LINE_A_STATIONS.filter(s => s.code !== 'JJA').map(s => createEcaModule(
                'ECA (Valideurs)', s.name!, s.code!, 'A', !!s.isFuture, ECA_DEFINITIONS[s.code!] ?? ECA_DEFINITIONS['DEFAULT']
            )),
            ...LINE_B_STATIONS.filter(s => s.code !== 'JJB').map(s => {
                return createEcaModule(
                    'ECA (Valideurs)', s.name!, s.code!, 'B', !!s.isFuture, ECA_DEFINITIONS[s.code!] ?? ECA_DEFINITIONS['DEFAULT']
                );
            }),
            ...LINE_C_STATIONS.map(s => createEcaModule(
                 'ECA (Valideurs)', s.name!, s.code!, 'C', !!s.isFuture, ECA_DEFINITIONS[s.code!] ?? ECA_DEFINITIONS['DEFAULT']
            )),
            
            ...LINE_A_STATIONS.map(s => createCognitivePictogramModule(s, 'A')),
            ...LINE_B_STATIONS.map(s => createCognitivePictogramModule(s, 'B')),
        ];

        // NEW: Dynamically create PMR Floor Adhesive modules based on ECA definitions
        const allStationsForPmr = [...LINE_A_STATIONS, ...LINE_B_STATIONS, ...LINE_C_STATIONS];
    
        for (const station of allStationsForPmr) {
            if (station.isFuture || !station.code || station.code === 'JJA' || station.code === 'JJB') {
                continue; // Skip future, no code, or Jean Jaurès (handled as a special case)
            }
        
            const ecaTemplates = ECA_DEFINITIONS[station.code] ?? ECA_DEFINITIONS['DEFAULT'];
            const pmrAccessPoints = new Set<string>();
        
            ecaTemplates.forEach(template => {
                if (isPmrEcaType(template.type)) {
                    pmrAccessPoints.add(template.accessPoint);
                }
            });
        
            if (pmrAccessPoints.size === 0) {
                continue; // No PMR ECAs found for this station.
            }
        
            const line = station.id?.startsWith('sta-a-') ? 'A' : 
                         station.id?.startsWith('sta-b-') ? 'B' : 
                         station.id?.startsWith('sta-c-') ? 'C' : undefined;
        
            if (!line) continue;
        
            if (pmrAccessPoints.size === 1) {
                // Only one access point with PMR equipment. Create a single, generically named module.
                modules.push(
                    createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol', station, line)
                );
            } else {
                // Multiple distinct access points with PMR equipment. Create a specific module for each.
                pmrAccessPoints.forEach(accessPoint => {
                    modules.push(
                        createSpecificPmrFloorAdhesiveModule(`Adhésifs PMR au Sol (${accessPoint})`, station, line)
                    );
                });
            }
        }

        const lieuxMap = new Map<string, Lieu>();

        const getLieuName = (module: AuditModule): string => {
            if (module.type === AuditModuleType.DAT || module.type === AuditModuleType.SIGNALETIQUE) {
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

            // LIGNE A - Modules
            // Liaison A→B moved to Line B to count in the 25 PMR of Line B as per user spreadsheet logic
            const moduleAtoB = createEcaModule('ECA Liaison A→B', 'Jean-Jaurès', 'JJA', 'B', false, ECA_DEFINITIONS_JJA_A_TO_B);
            const moduleJjaHist = createEcaModule('ECA (Accès Historique)', 'Jean-Jaurès', 'JJA', 'A', false, ECA_DEFINITIONS_JJA_A_HISTORIQUE);
            const moduleJjaPrinc = createEcaModule('ECA (Accès Principal)', 'Jean-Jaurès', 'JJA', 'A', false, ECA_DEFINITIONS_JJA_A_PRINCIPAL);

            // LIGNE B - Modules
            const moduleJjbB = createEcaModule('ECA Jaurès B', 'Jean-Jaurès', 'JJB', 'B', false, [
                { name: 'PMR 1', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.PMRVantaux, number: 1 },
                { name: 'Valideur 2', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 2 },
                { name: 'Valideur 3', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 3 },
                { name: 'Valideur 4', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 4 },
                { name: 'Valideur 5', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 5 },
                { name: 'Valideur 6', accessPoint: 'Accès Jaurès B', type: EcaEquipmentType.VantauxEntree, number: 6 },
            ]);
            const moduleJjbA = createEcaModule('ECA Jaurès A', 'Jean-Jaurès', 'JJB', 'B', false, [
                { name: 'PMR 7', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.PMRVantaux, number: 7 },
                { name: 'Valideur 8', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.VantauxEntree, number: 8 },
                { name: 'Valideur 9', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.VantauxEntree, number: 9 },
                { name: 'Valideur 10', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.VantauxEntree, number: 10 },
                { name: 'Valideur 11', accessPoint: 'Accès Jaurès A', type: EcaEquipmentType.VantauxEntree, number: 11 },
            ]);
            const moduleBtoA = createEcaModule('ECA Liaison B→A', 'Jean-Jaurès', 'JJB', 'B', false, ECA_DEFINITIONS_JJA_B_TO_A);

            // PMR Floor Adhesive modules
            const modulePmrA_Hist = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Accès Historique)', jjaStation, 'A');
            (modulePmrA_Hist.data as PMRFloorAdhesiveData).isNotApplicable = true;
            (modulePmrA_Hist.data as PMRFloorAdhesiveData).notApplicableReason = "L'adhésif au sol n'est pas posé car il ne tient pas (exposition partielle aux intempéries).";

            const modulePmrA_Princ = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Accès Principal Ligne A)', jjaStation, 'A');
            const modulePmrB = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Accès Principal Ligne B)', jjbStation, 'B');
            const modulePmrAtoB = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Liaison A→B)', jjaStation, 'A');
            const modulePmrBtoA = createSpecificPmrFloorAdhesiveModule('Adhésifs PMR au Sol (Liaison B→A)', jjbStation, 'B');

            jjLieu.modules.push(
                moduleAtoB, moduleBtoA, moduleJjaHist, moduleJjaPrinc, moduleJjbB, moduleJjbA,
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
            return lieu;
        });
};

export const getModuleLineConfig = (module: AuditModule): AuditCategoryConfig | undefined => {
    return AUDIT_CATEGORIES.find(c => c.predicate(module));
};
