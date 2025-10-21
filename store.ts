import { create } from 'zustand';
import { 
    Lieu, AuditModule, AuditModuleType, Station, Direction, DAT, AdhesiveStatus, AuditCategory, Pr, Equipment, EcaData, ECA, PMRFloorAdhesiveData, FloorAdhesiveStatus, ModeData, EcaEquipmentType, CognitivePictogramData, CognitivePictogram 
} from './types';
import { db } from './db';
import { generateInitialLieuxDataAsync } from './data/builder';
import { ADHESIVES, getEcaAdhesives, getPrAdhesives } from './data/adhesives';
import { AUDIT_CATEGORIES } from './data/config';
import { v4 as uuidv4 } from 'uuid';
import { validateImportedData } from './utils/csvExporter';
import { canEcaBeNotApplicable } from './data/eca_data';

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
    activeAuditFilters: AuditModuleType[];
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
    setActiveAuditFilters: (filters: AuditModuleType[]) => void;
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
    handleSetEcaNotApplicable: (isNA: boolean) => Promise<void>;
    handleAddEca: (ecaData: Omit<ECA, 'id' | 'adhesives' | 'comment' | 'isNotApplicable'>) => Promise<void>;
    handleUpdateEca: (ecaData: Partial<Omit<ECA, 'adhesives' | 'comment'>> & { id: string }) => Promise<void>;
    handleRemoveEca: (ecaId: string) => Promise<void>;

    // PMR Floor Adhesive Actions
    handlePmrFloorAdhesiveStatusChange: (adhesiveId: string, status: FloorAdhesiveStatus) => Promise<void>;
    handlePmrFloorAdhesiveCommentChange: (comment: string) => Promise<void>;
    handleResetPmrFloorAdhesive: () => Promise<void>;
    handlePmrFloorAdhesivePhotoChange: (adhesiveId: string, photo_base64: string | null) => Promise<void>;
    handlePmrFloorAdhesivePhotoNoteChange: (adhesiveId: string, note: string) => Promise<void>;
    handlePmrFloorAdhesivePhotoRotationChange: (adhesiveId: string, rotation: number) => Promise<void>;

    // Cognitive Pictogram Actions
    handleCognitivePictogramStatusChange: (pictogramId: string, status: FloorAdhesiveStatus) => Promise<void>;
    handleCognitivePictogramCommentChange: (comment: string) => Promise<void>;
    handleResetCognitivePictogram: () => Promise<void>;
    handleAddCognitivePictogramAccessPoint: () => Promise<void>;
    handleRemoveCognitivePictogramAccessPoint: (pictogramId: string) => Promise<void>;
    handleUpdateCognitivePictogramAccessPointName: (pictogramId: string, newName: string) => Promise<void>;
    
    // Reset actions
    handleResetCategory: (category: AuditCategory) => Promise<void>;
    handleResetByModuleType: (moduleType: AuditModuleType) => Promise<void>;
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
    activeAuditFilters: [],
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
            // Step 1: Handle Authentication and Theme from localStorage first.
            // This is synchronous and less likely to fail. It ensures the user's
            // auth state is determined before heavy async operations.
            const storedAuth = localStorage.getItem('tisseo-audit-auth');
            const isAuthenticated = storedAuth === 'true';

            const storedTheme = localStorage.getItem('tisseo-audit-theme') as 'light' | 'dark' | null;
            const initialTheme = storedTheme || 'light';
            applyTheme(initialTheme);
            
            set({ isAuthenticated, theme: initialTheme });

            // Step 2: Load the main application data from IndexedDB.
            const count = await db.lieux.count();
            if (count > 0) {
                const data = await db.lieux.toArray();
                set({ lieux: data });
            } else {
                const initialData = await generateInitialLieuxDataAsync();
                await db.lieux.bulkPut(initialData);
                set({ lieux: initialData });
            }
        } catch (error) {
            console.error("Échec de l'initialisation de l'application :", error);
            // Propagate a user-friendly error to the UI. The user will remain on the
            // app screen (if authenticated) but will see an error toast.
            throw new Error("Impossible de charger les données. Vérifiez les permissions de stockage, puis rafraîchissez la page.");
        } finally {
            // Step 3: Always set isLoading to false at the end, whether it succeeds or fails.
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
            activeAuditFilters: [],
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
    setActiveFilter: (filter) => set({ activeFilter: filter, activeAuditFilters: [] }),
    setActiveAuditFilters: (filters) => set({ activeAuditFilters: filters }),

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
                get().setActiveFilter('ALL');
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
            const module = lieu.modules.find(m => m.id === selectedModuleId);
            const station = (module?.data as ModeData)?.stations.find(s => s.id === selectedStationId);
            const direction = station?.directions.find(d => d.id === selectedDirectionId);
            if (direction) {
                const datIndex = direction.dats.findIndex(d => d.id === selectedDatId);
                if (datIndex > -1) {
                    direction.dats[datIndex] = {
                        ...direction.dats[datIndex],
                        adhesives: createInitialAdhesiveStatus(ADHESIVES),
                        comment: ''
                    };
                }
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
            const module = lieu.modules.find(m => m.id === selectedModuleId);
            if (module) {
                const data = module.data as Pr;
                const equipmentIndex = data.equipments.findIndex(e => e.id === selectedEquipmentId);
                if (equipmentIndex > -1) {
                    const equipment = data.equipments[equipmentIndex];
                    data.equipments[equipmentIndex] = {
                        ...equipment,
                        adhesives: createInitialAdhesiveStatus(getPrAdhesives(equipment.type)),
                        comment: ''
                    };
                }
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
            if (eca) {
                eca.adhesives[adhesiveId] = status;
            }
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
            const module = lieu.modules.find(m => m.id === selectedModuleId);
            if (module) {
                const data = module.data as EcaData;
                const ecaIndex = data.ecas.findIndex(e => e.id === selectedEcaId);
                if (ecaIndex > -1) {
                    const eca = data.ecas[ecaIndex];
                    data.ecas[ecaIndex] = {
                        ...eca,
                        adhesives: createInitialAdhesiveStatus(getEcaAdhesives(eca.type)),
                        comment: ''
                    };
                }
            }
        });
    },

    handleSetEcaNotApplicable: async (isNA) => {
        const { selectedModuleId, selectedEcaId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            const eca = module.data.ecas.find(e => e.id === selectedEcaId);
            if (eca) {
                eca.isNotApplicable = isNA;
            }
        });

        if (isNA) {
            set({ selectedEcaId: null });
        }
    },
    
    handleAddEca: async (ecaData) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            if (module) {
                const newEca: ECA = {
                    ...ecaData,
                    id: uuidv4(),
                    adhesives: createInitialAdhesiveStatus(getEcaAdhesives(ecaData.type)),
                    comment: '',
                };
                module.data.ecas.push(newEca);
            }
        });
    },

    handleUpdateEca: async (ecaData) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            const ecaIndex = module.data.ecas.findIndex(e => e.id === ecaData.id);
            if (ecaIndex > -1) {
                const originalEca = module.data.ecas[ecaIndex];
                const updatedEca = {
                    ...originalEca,
                    ...ecaData
                };

                // Si le type a changé, on réinitialise les adhésifs
                if (ecaData.type && ecaData.type !== originalEca.type) {
                    updatedEca.adhesives = createInitialAdhesiveStatus(getEcaAdhesives(ecaData.type));
                }

                // Si le type ne permet pas le statut N/A, on supprime la propriété.
                if (!canEcaBeNotApplicable(updatedEca.type)) {
                    delete updatedEca.isNotApplicable;
                }

                module.data.ecas[ecaIndex] = updatedEca;
            }
        });
    },

    handleRemoveEca: async (ecaId) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            if (module) {
                module.data.ecas = module.data.ecas.filter(e => e.id !== ecaId);
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

    handlePmrFloorAdhesiveCommentChange: async (comment) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            if (module) {
                module.data.comment = comment;
            }
        });
    },

    handleResetPmrFloorAdhesive: async () => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId);
            if (module) {
                const oldData = module.data as PMRFloorAdhesiveData;
                module.data = {
                    ...oldData,
                    adhesives: oldData.adhesives.map(adhesive => ({
                        id: adhesive.id,
                        name: adhesive.name,
                        status: FloorAdhesiveStatus.NotChecked
                        // Photo properties are removed by not being spread
                    })),
                    comment: ''
                };
            }
        });
    },

    handlePmrFloorAdhesivePhotoChange: async (adhesiveId, photo_base64) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            const adhesive = module.data.adhesives.find(a => a.id === adhesiveId);
            if (adhesive) {
                if (photo_base64) {
                    adhesive.photo_base64 = photo_base64;
                } else {
                    delete adhesive.photo_base64;
                    delete adhesive.photo_note;
                    delete adhesive.photo_rotation;
                }
            }
        });
    },

    handlePmrFloorAdhesivePhotoNoteChange: async (adhesiveId, note) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            const adhesive = module.data.adhesives.find(a => a.id === adhesiveId);
            if (adhesive) {
                adhesive.photo_note = note;
            }
        });
    },

    handlePmrFloorAdhesivePhotoRotationChange: async (adhesiveId, rotation) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            const adhesive = module.data.adhesives.find(a => a.id === adhesiveId);
            if (adhesive) {
                adhesive.photo_rotation = rotation;
            }
        });
    },

    // =================================================================
    // Cognitive Pictogram Actions
    // =================================================================
    handleCognitivePictogramStatusChange: async (pictogramId, status) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            const pictogram = module.data.pictograms.find(p => p.id === pictogramId);
            if (pictogram) pictogram.status = status;
        });
    },

    handleCognitivePictogramCommentChange: async (comment) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            if (module) {
                module.data.comment = comment;
            }
        });
    },

    handleResetCognitivePictogram: async () => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId);
            if (module) {
                const oldData = module.data as CognitivePictogramData;
                module.data = {
                    ...oldData,
                    pictograms: oldData.pictograms.map(p => ({
                        ...p,
                        status: FloorAdhesiveStatus.NotChecked
                    })),
                    comment: ''
                };
            }
        });
    },
    
    handleAddCognitivePictogramAccessPoint: async () => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            if (module) {
                const newAccessPoint: CognitivePictogram = {
                    id: uuidv4(),
                    accessPointName: `Nouvel Accès ${module.data.pictograms.length + 1}`,
                    status: FloorAdhesiveStatus.NotChecked,
                };
                module.data.pictograms.push(newAccessPoint);
            }
        });
    },

    handleRemoveCognitivePictogramAccessPoint: async (pictogramId: string) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            if (module) {
                module.data.pictograms = module.data.pictograms.filter(p => p.id !== pictogramId);
            }
        });
    },
    
    handleUpdateCognitivePictogramAccessPointName: async (pictogramId: string, newName: string) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            const pictogram = module.data.pictograms.find(p => p.id === pictogramId);
            if (pictogram) {
                pictogram.accessPointName = newName;
            }
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
            set({
                lieux: updatedLieux,
                activeFilter: 'ALL',
                activeAuditFilters: [],
                selectedLieuId: null,
                selectedModuleId: null,
                selectedStationId: null,
                selectedDirectionId: null,
                selectedDatId: null,
                selectedEquipmentId: null,
                selectedEcaId: null,
            });

        } catch (error) {
            console.error(`Failed to reset category ${category}:`, error);
            throw error;
        }
    },

    handleResetByModuleType: async (moduleType) => {
        try {
            const freshData = await generateInitialLieuxDataAsync();
            const freshModulesMap = new Map<string, AuditModule>();
            freshData.forEach(lieu => 
                lieu.modules.forEach(module => {
                    if (module.type === moduleType) {
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
            set({ lieux: updatedLieux });

        } catch (error) {
            console.error(`Failed to reset module type ${moduleType}:`, error);
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
                activeFilter: 'ALL',
                activeAuditFilters: [],
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
            let rawData;
            try {
                rawData = JSON.parse(jsonString);
            } catch (e) {
                throw new Error("Format de fichier invalide. Assurez-vous que le fichier est un JSON bien formé.");
            }
            
            const dataToValidate = (rawData.data && Array.isArray(rawData.data)) ? rawData.data : rawData;

            if (!validateImportedData(dataToValidate)) {
                throw new Error("Données invalides. Le contenu du fichier ne correspond pas à la structure attendue.");
            }
            
            await db.lieux.clear();
            await db.lieux.bulkPut(dataToValidate);
            set({
                lieux: dataToValidate,
                selectedLieuId: null,
                selectedModuleId: null,
                selectedStationId: null,
                selectedDirectionId: null,
                selectedDatId: null,
                selectedEquipmentId: null,
                selectedEcaId: null,
            });
        } catch (error) {
            console.error("Échec de l'importation :", error);
            // Re-throw the error so it can be displayed in the promise toast
            throw error;
        }
    },
}});

export default useAuditStore;