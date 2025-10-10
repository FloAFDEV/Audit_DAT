import { create } from 'zustand';
import { 
    Lieu, AuditModule, AuditModuleType, Station, Direction, DAT, AdhesiveStatus, AuditCategory, Pr, Equipment, EcaData, ECA, PMRFloorAdhesiveData, FloorAdhesiveStatus, ModeData 
} from './types';
import { db } from './db';
import { generateInitialLieuxDataAsync } from './data/builder';
import { ADHESIVES, getEcaAdhesives, getPrAdhesives } from './data/adhesives';
import { AUDIT_CATEGORIES } from './data/config';
import { v4 as uuidv4 } from 'uuid';
import { validateImportedData } from './utils/csvExporter';

// Helper to reset adhesive statuses for a given set of adhesives
const createInitialAdhesiveStatus = (adhesives: any[]): { [key: string]: AdhesiveStatus } => {
    return adhesives.reduce((acc, ad) => ({ ...acc, [ad.id]: AdhesiveStatus.NotChecked }), {});
};

interface AppState {
    // Data
    lieux: Lieu[];
    isLoading: boolean;
    isAuthenticated: boolean;

    // UI State
    theme: 'light' | 'dark';

    // Navigation
    activeFilter: AuditCategory | 'ALL';
    selectedLieuId: string | null;
    selectedModuleId: string | null;
    selectedStationId: string | null;
    selectedDirectionId: string | null;
    selectedDatId: string | null;
    selectedEquipmentId: string | null;
    selectedEcaId: string | null;

    // Actions
    init: () => Promise<void>;
    login: () => void;
    logout: () => void;
    
    // UI Actions
    setTheme: (theme: 'light' | 'dark') => void;

    // Navigation Actions
    setActiveFilter: (filter: AuditCategory | 'ALL') => void;
    selectLieu: (lieuId: string | null) => void;
    selectModule: (moduleId: string | null) => void;
    navigate: (level: 'home' | 'lieu' | 'module' | 'station' | 'direction') => void;
    
    // DAT Flow Actions
    selectStation: (stationId: string | null) => void;
    selectDirection: (directionId: string | null) => void;
    selectDat: (datId: string | null) => void;
    handleDatStatusChange: (adhesiveId: string, status: AdhesiveStatus) => Promise<void>;
    handleDatCommentChange: (comment: string) => Promise<void>;
    handleResetDat: () => Promise<void>;
    handleAddDat: () => Promise<void>;
    handleRemoveDat: (datId: string) => Promise<void>;
    handleUpdateDatName: (datId: string, newName: string) => Promise<void>;

    // P+R Flow Actions
    selectEquipment: (equipmentId: string | null) => void;
    handlePrAdhesiveStatusChange: (adhesiveId: string, status: AdhesiveStatus) => Promise<void>;
    handlePrAdhesiveCommentChange: (comment: string) => Promise<void>;
    handleResetPrAdhesive: () => Promise<void>;
    
    // ECA Flow Actions
    selectEca: (ecaId: string | null) => void;
    handleEcaAdhesiveStatusChange: (adhesiveId: string, status: AdhesiveStatus) => Promise<void>;
    handleEcaAdhesiveCommentChange: (comment: string) => Promise<void>;
    handleResetEcaAdhesive: () => Promise<void>;

    // PMR Floor Adhesive Actions
    handlePmrFloorAdhesiveStatusChange: (adhesiveId: string, status: FloorAdhesiveStatus) => Promise<void>;
    handleResetPmrFloorAdhesive: () => Promise<void>;
    
    // Reset actions
    handleResetCategory: (category: AuditCategory) => Promise<void>;
    handleResetAll: () => Promise<void>;

    // Import action
    handleImportJsonData: (jsonString: string) => Promise<void>;
}

const useAuditStore = create<AppState>((set, get) => {
    /**
     * A generic function to update a nested property within the state.
     * @param updateFn A function that receives a cloned Lieu and should return the modified object.
     */
    const _updateLieu = async (updateFn: (lieu: Lieu) => void) => {
        const { selectedLieuId, lieux } = get();
        if (!selectedLieuId) return;

        const lieuToUpdate = lieux.find(l => l.id === selectedLieuId);
        if (!lieuToUpdate) return;
        
        // Deep clone to avoid direct state mutation
        const clonedLieu = JSON.parse(JSON.stringify(lieuToUpdate));
        
        updateFn(clonedLieu);
        
        await db.lieux.put(clonedLieu);
        
        const updatedLieux = lieux.map(l => l.id === selectedLieuId ? clonedLieu : l);
        set({ lieux: updatedLieux });
    };
    
    const applyTheme = (theme: 'light' | 'dark') => {
        localStorage.setItem('tisseo-audit-theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return {
    // =================================================================
    // Initial State
    // =================================================================
    lieux: [],
    isLoading: true,
    isAuthenticated: false,
    theme: 'light',
    activeFilter: 'ALL',
    selectedLieuId: null,
    selectedModuleId: null,
    selectedStationId: null,
    selectedDirectionId: null,
    selectedDatId: null,
    selectedEquipmentId: null,
    selectedEcaId: null,

    // =================================================================
    // Initialization & Auth
    // =================================================================
    init: async () => {
        try {
            const storedAuth = localStorage.getItem('tisseo-audit-auth');
            const isAuthenticated = storedAuth === 'true';

            const count = await db.lieux.count();
            if (count > 0) {
                const data = await db.lieux.toArray();
                set({ lieux: data, isAuthenticated, isLoading: false });
            } else {
                const initialData = await generateInitialLieuxDataAsync();
                await db.lieux.bulkPut(initialData);
                set({ lieux: initialData, isAuthenticated, isLoading: false });
            }
            
            // Initialize theme
            const storedTheme = localStorage.getItem('tisseo-audit-theme') as 'light' | 'dark' | null;
            const initialTheme = storedTheme || 'light';
            applyTheme(initialTheme);
            set({ theme: initialTheme });

        } catch (error) {
            console.error("Failed to initialize the app:", error);
            set({ isLoading: false });
        }
    },

    login: () => {
        localStorage.setItem('tisseo-audit-auth', 'true');
        set({ isAuthenticated: true });
    },

    logout: () => {
        localStorage.removeItem('tisseo-audit-auth');
        set({
            isAuthenticated: false,
            activeFilter: 'ALL',
            selectedLieuId: null,
            selectedModuleId: null,
            selectedStationId: null,
            selectedDirectionId: null,
            selectedDatId: null,
            selectedEquipmentId: null,
            selectedEcaId: null,
        });
    },
    
    // =================================================================
    // UI State Management
    // =================================================================
    setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
    },

    // =================================================================
    // Navigation State Management
    // =================================================================
    setActiveFilter: (filter) => set({ activeFilter: filter }),

    selectLieu: (lieuId) => set({
        selectedLieuId: lieuId,
        selectedModuleId: null,
        selectedStationId: null,
        selectedDirectionId: null,
        selectedDatId: null,
        selectedEquipmentId: null,
        selectedEcaId: null,
    }),

    selectModule: (moduleId) => {
        const { lieux, selectedLieuId } = get();
        const lieu = lieux.find(l => l.id === selectedLieuId);
        const module = lieu?.modules.find(m => m.id === moduleId);

        let stationIdToAutoSelect: string | null = null;
        
        // Auto-select station if there's only one for DAT modules and it's not a future station
        if (module?.type === AuditModuleType.DAT) {
            const modeData = module.data as ModeData;
            if (modeData.stations.length === 1 && !modeData.stations[0].isFuture) {
                stationIdToAutoSelect = modeData.stations[0].id;
            }
        }

        set({
            selectedModuleId: moduleId,
            selectedStationId: stationIdToAutoSelect,
            selectedDirectionId: null,
            selectedDatId: null,
            selectedEquipmentId: null,
            selectedEcaId: null,
        });
    },

    selectStation: (stationId) => {
        const { selectedModuleId, lieux, selectedLieuId } = get();
        const lieu = lieux.find(l => l.id === selectedLieuId);
        const module = lieu?.modules.find(m => m.id === selectedModuleId);

        if (module?.type === AuditModuleType.DAT) {
             const modeData = module.data as ModeData;
             const station = modeData.stations.find(s => s.id === stationId);
             // Auto-select direction if only one exists
             if (station?.directions.length === 1) {
                 set({ selectedStationId: stationId, selectedDirectionId: station.directions[0].id, selectedDatId: null });
                 return;
             }
        }
        set({ selectedStationId: stationId, selectedDirectionId: null, selectedDatId: null });
    },
    
    selectDirection: (directionId) => set({ selectedDirectionId: directionId, selectedDatId: null }),
    selectDat: (datId) => set({ selectedDatId: datId }),
    selectEquipment: (equipmentId) => set({ selectedEquipmentId: equipmentId }),
    selectEca: (ecaId) => set({ selectedEcaId: ecaId }),

    navigate: (level) => {
        switch (level) {
            case 'home':
                get().selectLieu(null);
                break;
            case 'lieu':
                get().selectModule(null);
                break;
            case 'module':
                get().selectStation(null); // works for DAT, P+R, ECA flows
                get().selectEquipment(null);
                get().selectEca(null);
                break;
            case 'station':
                get().selectDirection(null);
                break;
            case 'direction':
                get().selectDat(null);
                break;
        }
    },

    // =================================================================
    // DAT Audit Actions
    // =================================================================
    handleDatStatusChange: async (adhesiveId, status) => {
        const { selectedModuleId, selectedStationId, selectedDirectionId, selectedDatId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            const direction = station?.directions.find(d => d.id === selectedDirectionId);
            const dat = direction?.dats.find(d => d.id === selectedDatId);
            if (dat) dat.adhesives[adhesiveId] = status;
        });
    },

    handleDatCommentChange: async (comment) => {
        const { selectedModuleId, selectedStationId, selectedDirectionId, selectedDatId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            const direction = station?.directions.find(d => d.id === selectedDirectionId);
            const dat = direction?.dats.find(d => d.id === selectedDatId);
            if (dat) dat.comment = comment;
        });
    },

    handleResetDat: async () => {
        const { selectedModuleId, selectedStationId, selectedDirectionId, selectedDatId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            const direction = station?.directions.find(d => d.id === selectedDirectionId);
            const dat = direction?.dats.find(d => d.id === selectedDatId);
            if (dat) {
                dat.adhesives = createInitialAdhesiveStatus(ADHESIVES);
                dat.comment = '';
            }
        });
    },

    handleAddDat: async () => {
        const { selectedModuleId, selectedStationId, selectedDirectionId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            const direction = station?.directions.find(d => d.id === selectedDirectionId);
            if (direction) {
                const newDatNumber = direction.dats.length + 1;
                const newDat: DAT = {
                    id: uuidv4(),
                    name: `DAT ${String(newDatNumber).padStart(2, '0')}`,
                    adhesives: createInitialAdhesiveStatus(ADHESIVES),
                    comment: ''
                };
                direction.dats.push(newDat);
            }
        });
    },
    
    handleRemoveDat: async (datId) => {
        const { selectedModuleId, selectedStationId, selectedDirectionId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            const direction = station?.directions.find(d => d.id === selectedDirectionId);
            if (direction) {
                direction.dats = direction.dats.filter(d => d.id !== datId);
            }
        });
    },

    handleUpdateDatName: async (datId, newName) => {
        const { selectedModuleId, selectedStationId, selectedDirectionId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            const direction = station?.directions.find(d => d.id === selectedDirectionId);
            const dat = direction?.dats.find(d => d.id === datId);
            if (dat) dat.name = newName;
        });
    },

    // =================================================================
    // P+R Audit Actions
    // =================================================================
    handlePrAdhesiveStatusChange: async (adhesiveId, status) => {
        const { selectedModuleId, selectedEquipmentId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: Pr };
            const equipment = module.data.equipments.find(e => e.id === selectedEquipmentId);
            if (equipment) equipment.adhesives[adhesiveId] = status;
        });
    },

    handlePrAdhesiveCommentChange: async (comment) => {
        const { selectedModuleId, selectedEquipmentId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: Pr };
            const equipment = module.data.equipments.find(e => e.id === selectedEquipmentId);
            if (equipment) equipment.comment = comment;
        });
    },

    handleResetPrAdhesive: async () => {
        const { selectedModuleId, selectedEquipmentId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: Pr };
            const equipment = module.data.equipments.find(e => e.id === selectedEquipmentId);
            if (equipment) {
                equipment.adhesives = createInitialAdhesiveStatus(getPrAdhesives(equipment.type));
                equipment.comment = '';
            }
        });
    },

    // =================================================================
    // ECA Audit Actions
    // =================================================================
    handleEcaAdhesiveStatusChange: async (adhesiveId, status) => {
        const { selectedModuleId, selectedEcaId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            const eca = module.data.ecas.find(e => e.id === selectedEcaId);
            if (eca) eca.adhesives[adhesiveId] = status;
        });
    },

    handleEcaAdhesiveCommentChange: async (comment) => {
        const { selectedModuleId, selectedEcaId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            const eca = module.data.ecas.find(e => e.id === selectedEcaId);
            if (eca) eca.comment = comment;
        });
    },

    handleResetEcaAdhesive: async () => {
        const { selectedModuleId, selectedEcaId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            const eca = module.data.ecas.find(e => e.id === selectedEcaId);
            if (eca) {
                eca.adhesives = createInitialAdhesiveStatus(getEcaAdhesives(eca.type));
                eca.comment = '';
            }
        });
    },

    // =================================================================
    // PMR Floor Adhesive Actions
    // =================================================================
    handlePmrFloorAdhesiveStatusChange: async (adhesiveId, status) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            const adhesive = module.data.adhesives.find(a => a.id === adhesiveId);
            if (adhesive) adhesive.status = status;
        });
    },

    handleResetPmrFloorAdhesive: async () => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            module.data.adhesives.forEach(adhesive => {
                adhesive.status = FloorAdhesiveStatus.NotChecked;
            });
        });
    },

    // =================================================================
    // Global Reset Actions
    // =================================================================
    handleResetCategory: async (category) => {
        try {
            const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category);
            if (!categoryConfig) return;

            const freshData = await generateInitialLieuxDataAsync();
            const freshModulesMap = new Map<string, AuditModule>();
            freshData.forEach(lieu => 
                lieu.modules.forEach(module => {
                    if (categoryConfig.predicate(module)) {
                        freshModulesMap.set(module.id, module);
                    }
                })
            );

            const currentLieux = get().lieux;
            const updatedLieux = JSON.parse(JSON.stringify(currentLieux));

            for (const lieu of updatedLieux) {
                lieu.modules = lieu.modules.map((module: AuditModule) => {
                    if (freshModulesMap.has(module.id)) {
                        return freshModulesMap.get(module.id);
                    }
                    return module;
                });
            }
            
            await db.lieux.bulkPut(updatedLieux);
            set({ lieux: updatedLieux, selectedLieuId: null, selectedModuleId: null });

        } catch (error) {
            console.error(`Failed to reset category ${category}:`, error);
            throw error;
        }
    },
    
    handleResetAll: async () => {
        try {
            await db.lieux.clear();
            const initialData = await generateInitialLieuxDataAsync();
            await db.lieux.bulkPut(initialData);
            set({
                lieux: initialData,
                selectedLieuId: null,
                selectedModuleId: null,
                selectedStationId: null,
                selectedDirectionId: null,
                selectedDatId: null,
                selectedEquipmentId: null,
                selectedEcaId: null,
            });
        } catch (error) {
            console.error("Failed to reset all data:", error);
            throw error;
        }
    },

    // =================================================================
    // Import/Export Actions
    // =================================================================
    handleImportJsonData: async (jsonString: string) => {
        try {
            const data = JSON.parse(jsonString);
            if (!validateImportedData(data)) {
                throw new Error("Le fichier JSON n'est pas valide ou ne correspond pas au format attendu.");
            }
            
            await db.lieux.clear();
            await db.lieux.bulkPut(data);
            set({
                lieux: data,
                selectedLieuId: null,
                selectedModuleId: null,
                selectedStationId: null,
                selectedDirectionId: null,
                selectedDatId: null,
                selectedEquipmentId: null,
                selectedEcaId: null,
            });
        } catch (error) {
            console.error("Failed to import data:", error);
            // Re-throw the error to be caught by the UI layer (for toasts)
            if (error instanceof Error) {
                 throw new Error(`Échec de l'importation : ${error.message}`);
            }
            throw new Error("Une erreur inconnue est survenue lors de l'importation.");
        }
    },
}});

export default useAuditStore;