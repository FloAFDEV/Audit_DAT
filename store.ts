
import { create } from 'zustand';
import { 
    Lieu, AuditModule, AuditModuleType, Station, Direction, DAT, AdhesiveStatus, AuditCategory, Pr, Equipment, EcaData, ECA, PMRFloorAdhesiveData, FloorAdhesiveStatus, ModeData, EcaEquipmentType, CognitivePictogramData, CognitivePictogram, PrZone, SignaletiqueData, EquipmentStatusType 
} from './types';
import { db } from './db';
import { generateInitialLieuxDataAsync } from './data/builder';
import { getInitialSignaletiqueData } from './data/signaletique_config';
import { ADHESIVES, getEcaAdhesives, getPrAdhesives } from './data/adhesives';
import { AUDIT_CATEGORIES } from './data/config';
import { v4 as uuidv4 } from 'uuid';
import { validateImportedData } from './utils/csvExporter';
import { canEcaBeNotApplicable } from './data/eca_data';
import { getEcaProgress } from './utils/progressCalculators';
import { sanitizeDataForHistory, calculateComplianceScore } from './utils/historyHelpers';

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
    isStatsViewActive: boolean;

    // Navigation
    activeFilter: AuditCategory | 'ALL';
    activeAuditFilters: AuditModuleType[];
    selectedLieuId: string | null;
    selectedModuleId: string | null;
    selectedStationId: string | null;
    selectedDirectionId: string | null;
    selectedDatId: string | null;
    selectedPrZoneId: string | null;
    selectedEquipmentId: string | null;
    selectedEcaId: string | null;
    isSignaletiqueActive: boolean;

    // Actions
    init: () => Promise<void>;
    login: () => void;
    logout: () => void;
    
    // UI Actions
    setTheme: (theme: 'light' | 'dark') => void;
    setIsStatsViewActive: (isActive: boolean) => void;

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
    selectPrZone: (zoneId: string | null) => void;
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
    
    // Signaletique Actions
    handleSignaletiqueStatusChange: (equipmentType: keyof SignaletiqueData, direction: 'meett' | 'pdj' | 'direction1' | 'direction2', index: number, status: EquipmentStatusType | 'NotChecked') => Promise<void>;
    handleSignaletiqueCommentChange: (equipmentType: keyof SignaletiqueData, direction: 'meett' | 'pdj' | 'direction1' | 'direction2', index: number, comment: string) => Promise<void>;
    handleSignaletiqueFieldChange: (equipmentType: keyof SignaletiqueData, direction: 'meett' | 'pdj' | 'direction1' | 'direction2', index: number, field: string, value: any) => Promise<void>;
    handleSignaletiquePhotoChange: (equipmentType: keyof SignaletiqueData, direction: 'meett' | 'pdj' | 'direction1' | 'direction2', index: number, photo_base64: string | null) => Promise<void>;
    handleSignaletiquePhotoNoteChange: (equipmentType: keyof SignaletiqueData, direction: 'meett' | 'pdj' | 'direction1' | 'direction2', index: number, note: string) => Promise<void>;
    handleSignaletiquePhotoRotationChange: (equipmentType: keyof SignaletiqueData, direction: 'meett' | 'pdj' | 'direction1' | 'direction2', index: number, rotation: number) => Promise<void>;
    handleResetSignaletique: () => Promise<void>;
    handleSignaletiqueStationCommentChange: (comment: string) => Promise<void>;
    setIsSignaletiqueActive: (isActive: boolean) => void;
    
    // Reset actions
    handleResetCategory: (category: AuditCategory) => Promise<void>;
    handleResetByModuleType: (moduleType: AuditModuleType) => Promise<void>;
    handleResetAll: () => Promise<void>;

    // Import action
    handleImportJsonData: (jsonString: string) => Promise<void>;
    hardResetApplication: () => Promise<void>;
}

export const DATA_VERSION = 'v13.2';

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

    // ---------------------------------------------------------------
    // BACKUP HELPERS
    // ---------------------------------------------------------------

    /** Déclenche le téléchargement d'un fichier JSON dans le navigateur. */
    const _triggerJsonDownload = (data: object, filename: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    /**
     * Sauvegarde automatique de toutes les données dans localStorage avant
     * toute opération destructive (reset / hard-reset).
     * Si localStorage est plein, déclenche un téléchargement automatique du fichier JSON.
     * @returns la clé localStorage utilisée pour le backup, ou '' si download forcé.
     */
    const _backupBeforeReset = async (scope: string): Promise<string> => {
        const allLieux = await db.lieux.toArray();
        const now = new Date().toISOString();
        const backup = {
            exportDate: now,
            scope,
            // Clé 'data' volontairement identique au format d'import JSON existant
            // pour permettre la restauration via "Restaurer une sauvegarde (.json)".
            data: allLieux,
        };
        const json = JSON.stringify(backup);
        const backupKey = `tisseo-audit-backup-${Date.now()}`;
        try {
            localStorage.setItem(backupKey, json);
            localStorage.setItem('tisseo-audit-last-backup-key', backupKey);
            localStorage.setItem('tisseo-audit-last-backup-date', now);
        } catch {
            // localStorage plein (quota dépassé) → téléchargement automatique du fichier.
            _triggerJsonDownload(backup, `backup-audit-${scope}-${Date.now()}.json`);
            // Met quand même à jour la date pour que l'UI affiche l'heure du dernier backup.
            try { localStorage.setItem('tisseo-audit-last-backup-date', now); } catch { /* ignore */ }
            return '';
        }
        return backupKey;
    };

    // HISTORY HELPERS (INTERNAL)
    const saveHistoryEntry = async (title: string, type: 'GLOBAL' | 'CATEGORY' | 'MODULE_TYPE' | 'SINGLE_AUDIT', data: any, categoryKey?: string) => {
        const score = calculateComplianceScore(data, type);
        const cleanData = sanitizeDataForHistory(data);
        
        await db.history.add({
            date: new Date().toISOString(),
            title,
            type,
            score,
            details: JSON.stringify(cleanData),
            categoryKey
        });
    };

    return {
    // =================================================================
    // Initial State
    // =================================================================
    lieux: [],
    isLoading: true,
    isAuthenticated: false,
    theme: 'light',
    isStatsViewActive: false,
    activeFilter: 'ALL',
    activeAuditFilters: [],
    selectedLieuId: null,
    selectedModuleId: null,
    selectedStationId: null,
    selectedDirectionId: null,
    selectedDatId: null,
    selectedPrZoneId: null,
    selectedEquipmentId: null,
    selectedEcaId: null,
    isSignaletiqueActive: false,

    // =================================================================
    // Initialization & Auth
    // =================================================================
    init: async () => {
        try {
            const storedAuth = localStorage.getItem('tisseo-audit-auth');
            const isAuthenticated = storedAuth === 'true';

            const storedTheme = localStorage.getItem('tisseo-audit-theme') as 'light' | 'dark' | null;
            const initialTheme = storedTheme || 'light';
            applyTheme(initialTheme);
            
            set({ isAuthenticated, theme: initialTheme });

            const count = await db.lieux.count();
            let data: Lieu[] = [];
            if (count > 0) {
                data = await db.lieux.toArray();

                // DATA MIGRATION v8: Ajouter les lieux LAE (Aéroport Express) si absents.
                // ACTIVE_LINES.AEROPORT était false avant v8 → aucun module AEROPORT en base.
                // On génère les données fraîches et on n'extrait que les lieux AEROPORT.
                let dataChanged = false;
                const hasAeroportModules = data.some(l => l.modules.some(m => m.line === 'AEROPORT'));
                if (!hasAeroportModules) {
                    const freshData = await generateInitialLieuxDataAsync();
                    const aeroportLieux = freshData
                        .filter(l => l.modules.some(m => m.line === 'AEROPORT'))
                        .map(l => ({ ...l, modules: l.modules.filter(m => m.line === 'AEROPORT') }));
                    data.push(...aeroportLieux);
                    dataChanged = true;
                }

                // DATA MIGRATION v9: Supprimer les modules TRAM BLA orphelins (sta-t1-27 / sta-sig-t1-27).
                // Ces modules ont été créés lorsque BLA était dupliqué dans TRAM_STATIONS.
                // Désormais BLA est modélisé UNE SEULE FOIS dans REGISTRY_INTERCHANGE_HUBS,
                // traité via AEROPORT_EXPRESS_STATIONS. Les modules TRAM BLA sont devenus orphelins
                // et doivent être retirés pour éviter les doublons dans la carte "Blagnac".
                const ORPHAN_MODULE_IDS = new Set(['module-dat-sta-t1-27', 'module-sig-sta-t1-27']);
                data = data.map(lieu => {
                    const before = lieu.modules.length;
                    const filtered = lieu.modules.filter(m => !ORPHAN_MODULE_IDS.has(m.id));
                    if (filtered.length !== before) {
                        dataChanged = true;
                        return { ...lieu, modules: filtered };
                    }
                    return lieu;
                }).filter(lieu => lieu.modules.length > 0);

                // DATA MIGRATION v10: Corriger le flag isFuture sur les modules DAT AEROPORT.
                // Avec l'ancien code, createDatModule héritait station.isFuture = true pour BLA,
                // ce qui désactivait le bouton dans ModuleSelector (disabled={module.isFuture}).
                // Désormais les modules DAT AEROPORT sont toujours actifs (isFuture: false)
                // même si la station hub est marquée future dans le registre.
                data = data.map(lieu => {
                    let changed = false;
                    const fixedModules = lieu.modules.map(m => {
                        if (m.type === AuditModuleType.DAT && m.line === 'AEROPORT' && m.isFuture) {
                            changed = true;
                            return { ...m, isFuture: false };
                        }
                        return m;
                    });
                    if (changed) {
                        dataChanged = true;
                        return { ...lieu, modules: fixedModules };
                    }
                    return lieu;
                });

                // DATA MIGRATION: Ensure TRAM stations have signaletique data initialized (incl. hap field)

                const migrateStation = (station: any) => {
                    if (station.isFuture) return;
                    if (!station.signaletique) {
                        station.signaletique = getInitialSignaletiqueData(station.name || '');
                        dataChanged = true;
                        return;
                    }
                    const sig = station.signaletique;

                    // Ensure hap exists
                    if (!sig.hap) {
                        sig.hap = getInitialSignaletiqueData(station.name || '').hap;
                        dataChanged = true;
                    }

                    // Migrate totem: old { meett: [], pdj: [] } → new { direction1: {}, direction2: {} }
                    if (sig.totem && !sig.totem.direction1) {
                        const d1 = sig.totem.meett?.[0] ?? { status: 'NotChecked', comment: '', dimensions: '61,6 x 91,6 cm' };
                        const d2 = sig.totem.pdj?.[0] ?? { status: 'NotChecked', comment: '', dimensions: '61,6 x 91,6 cm' };
                        sig.totem = { direction1: d1, direction2: d2 };
                        dataChanged = true;
                    }

                    // Initialize bandeauStation if missing
                    if (!sig.bandeauStation) {
                        sig.bandeauStation = getInitialSignaletiqueData(station.name || '').bandeauStation;
                        dataChanged = true;
                    }

                    // Remove terminusCase/relayInfo from planQuartier items
                    if (sig.planQuartier) {
                        (['meett', 'pdj'] as const).forEach(dir => {
                            (sig.planQuartier[dir] as any[] ?? []).forEach((item: any) => {
                                if (item.terminusCase !== undefined) { delete item.terminusCase; dataChanged = true; }
                                if (item.relayInfo !== undefined) { delete item.relayInfo; dataChanged = true; }
                            });
                        });
                    }

                    // Migrate BIV items to add missing adhesive fields
                    if (sig.biv) {
                        (['meett', 'pdj'] as const).forEach(dir => {
                            (sig.biv[dir] as any[]).forEach((bivItem: any) => {
                                let changed = false;
                                if (bivItem.ligneCaisson === undefined) { bivItem.ligneCaisson = 'NotChecked'; changed = true; }
                                if (bivItem.destinationCaisson === undefined) { bivItem.destinationCaisson = 'NotChecked'; changed = true; }
                                if (bivItem.attenteMinCaisson === undefined) { bivItem.attenteMinCaisson = 'NotChecked'; changed = true; }
                                if (bivItem.dureeApproxCaisson === undefined) { bivItem.dureeApproxCaisson = 'NotChecked'; changed = true; }
                                if (bivItem.quaiCaisson === undefined) { bivItem.quaiCaisson = 'NotChecked'; changed = true; }
                                if (changed) dataChanged = true;
                            });
                        });
                    }
                };
                data.forEach(lieu => {
                    lieu.modules.forEach(module => {
                        const isTramDat = module.type === AuditModuleType.DAT && module.line === 'TRAM';
                        const isSignaletique = module.type === AuditModuleType.SIGNALETIQUE;
                        if (isTramDat || isSignaletique) {
                            (module.data as ModeData).stations.forEach(migrateStation);
                        }
                    });
                });

                if (dataChanged) {
                    await db.lieux.bulkPut(data);
                }
                
                set({ lieux: data });
            } else {
                const initialData = await generateInitialLieuxDataAsync();
                await db.lieux.bulkPut(initialData);
                set({ lieux: initialData });
            }
        } catch (error) {
            console.error("Échec de l'initialisation de l'application :", error);
            throw new Error("Impossible de charger les données. Vérifiez les permissions de stockage, puis rafraîchissez la page.");
        } finally {
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
            selectedPrZoneId: null,
            selectedEquipmentId: null,
            selectedEcaId: null,
            isStatsViewActive: false,
        });
    },
    
    setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
    },
    setIsStatsViewActive: (isActive) => set({ 
        isStatsViewActive: isActive,
        selectedLieuId: null,
        selectedModuleId: null,
        selectedStationId: null,
        selectedDirectionId: null,
        selectedDatId: null,
        selectedPrZoneId: null,
        selectedEquipmentId: null,
        selectedEcaId: null,
    }),

    setActiveFilter: (filter) => set({ activeFilter: filter, activeAuditFilters: [] }),
    setActiveAuditFilters: (filters) => set({ activeAuditFilters: filters }),

    selectLieu: (lieuId) => set({
        isStatsViewActive: false,
        isSignaletiqueActive: false,
        selectedLieuId: lieuId,
        selectedModuleId: null,
        selectedStationId: null,
        selectedDirectionId: null,
        selectedDatId: null,
        selectedPrZoneId: null,
        selectedEquipmentId: null,
        selectedEcaId: null,
    }),

    selectModule: (moduleId) => {
        const { lieux, selectedLieuId, selectedStationId, selectedDirectionId } = get();
        const lieu = lieux.find(l => l.id === selectedLieuId);
        // Pour les lieux tram/AEROPORT, la direction est choisie AVANT le module (via TramDirectionSelector).
        // Il faut donc préserver station et direction lors de la sélection du module.
        // BLA (Blagnac) n'a que des modules AEROPORT — sans ce OR, isTramLieu serait false
        // et station+direction seraient réinitialisés → boucle infinie sur TramDirectionSelector.
        const isTramLieu = lieu?.modules.some(m => m.line === 'TRAM' || m.line === 'AEROPORT');
        const module = lieu?.modules.find(m => m.id === moduleId);

        const baseState = {
            selectedModuleId: moduleId,
            selectedStationId: isTramLieu ? selectedStationId : null,
            selectedDirectionId: isTramLieu ? selectedDirectionId : null,
            selectedDatId: null,
            selectedPrZoneId: null,
            selectedEquipmentId: null,
            selectedEcaId: null,
            isSignaletiqueActive: false,
        };

        if (!isTramLieu && module?.type === AuditModuleType.DAT) {
            const modeData = module.data as ModeData;
            if (modeData.stations.length === 1 && !modeData.stations[0].isFuture) {
                baseState.selectedStationId = modeData.stations[0].id;
                // La direction sera sélectionnée automatiquement par DatGroupSelector
                // via useEffect quand la station n'a qu'une seule direction.
            }
        }

        if (module?.type === AuditModuleType.PR) {
            const prData = module.data as Pr;
            if (prData.zones.length === 1) {
                baseState.selectedPrZoneId = prData.zones[0].id;
            }
        }

        set(baseState);
    },

    selectStation: (stationId) => {
        const { selectedModuleId, lieux, selectedLieuId } = get();
        const lieu = lieux.find(l => l.id === selectedLieuId);
        const module = lieu?.modules.find(m => m.id === selectedModuleId);

        if (module?.type === AuditModuleType.DAT) {
             const modeData = module.data as ModeData;
             const station = modeData.stations.find(s => s.id === stationId);
             if (station?.directions.length === 1) {
                 set({ selectedStationId: stationId, selectedDirectionId: station.directions[0].id, selectedDatId: null, isSignaletiqueActive: false });
                 return;
             }
        }
        set({ selectedStationId: stationId, selectedDirectionId: null, selectedDatId: null, isSignaletiqueActive: false });
    },
    
    selectDirection: (directionId) => set({ selectedDirectionId: directionId, selectedDatId: null, isSignaletiqueActive: false }),
    setIsSignaletiqueActive: (isActive) => set({ isSignaletiqueActive: isActive }),
    selectDat: (datId) => set({ selectedDatId: datId }),
    selectPrZone: (zoneId) => set({ selectedPrZoneId: zoneId, selectedEquipmentId: null }),
    selectEquipment: (equipmentId) => set({ selectedEquipmentId: equipmentId }),
    selectEca: (ecaId) => set({ selectedEcaId: ecaId }),

    navigate: (level) => {
        switch (level) {
            case 'home':
                get().selectLieu(null);
                get().setActiveFilter('ALL');
                get().setIsStatsViewActive(false);
                break;
            case 'lieu':
                get().selectModule(null);
                break;
            case 'module':
                get().selectStation(null);
                get().selectPrZone(null);
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

    handleDatStatusChange: async (adhesiveId, status) => {
        const { selectedModuleId, selectedStationId, selectedDirectionId, selectedDatId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            const direction = station?.directions.find(d => d.id === selectedDirectionId);
            const dat = direction?.dats.find(d => d.id === selectedDatId);
            if (dat) {
                dat.adhesives[adhesiveId] = status;
                const isComplete = Object.values(dat.adhesives).every(s => s !== AdhesiveStatus.NotChecked);
                if (isComplete && !dat.completionDate) dat.completionDate = new Date().toISOString();
                else if (!isComplete && dat.completionDate) delete dat.completionDate;
            }
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
                // HISTORY SNAPSHOT
                // We don't save history for individual DAT reset typically, as it's too granular.
                // But we can if requested. For now, skipping detailed DAT history to avoid clutter.
                
                dat.adhesives = createInitialAdhesiveStatus(ADHESIVES);
                dat.comment = '';
                delete dat.completionDate;
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

    handlePrAdhesiveStatusChange: async (adhesiveId, status) => {
        const { selectedModuleId, selectedPrZoneId, selectedEquipmentId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: Pr };
            const zone = module.data.zones.find(z => z.id === selectedPrZoneId);
            const equipment = zone?.equipments.find(e => e.id === selectedEquipmentId);
            if (equipment) {
                equipment.adhesives[adhesiveId] = status;
                const isComplete = Object.values(equipment.adhesives).every(s => s !== AdhesiveStatus.NotChecked);
                if (isComplete && !equipment.completionDate) equipment.completionDate = new Date().toISOString();
                else if (!isComplete && equipment.completionDate) delete equipment.completionDate;
            }
        });
    },

    handlePrAdhesiveCommentChange: async (comment) => {
        const { selectedModuleId, selectedPrZoneId, selectedEquipmentId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: Pr };
            const zone = module.data.zones.find(z => z.id === selectedPrZoneId);
            const equipment = zone?.equipments.find(e => e.id === selectedEquipmentId);
            if (equipment) equipment.comment = comment;
        });
    },

    handleResetPrAdhesive: async () => {
        const { selectedModuleId, selectedPrZoneId, selectedEquipmentId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: Pr };
            const zone = module.data.zones.find(z => z.id === selectedPrZoneId);
            const equipment = zone?.equipments.find(e => e.id === selectedEquipmentId);
            if (equipment) {
                equipment.adhesives = createInitialAdhesiveStatus(getPrAdhesives(equipment.type));
                equipment.comment = '';
                delete equipment.completionDate;
            }
        });
    },

    handleEcaAdhesiveStatusChange: async (adhesiveId, status) => {
        const { selectedModuleId, selectedEcaId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            const eca = module.data.ecas.find(e => e.id === selectedEcaId);
            if (eca) {
                eca.adhesives[adhesiveId] = status;
                const progress = getEcaProgress(eca);
                if (progress.isComplete && !eca.completionDate) eca.completionDate = new Date().toISOString();
                else if (!progress.isComplete && eca.completionDate) delete eca.completionDate;
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
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            const eca = module.data.ecas.find(e => e.id === selectedEcaId);
            if (eca) {
                eca.adhesives = createInitialAdhesiveStatus(getEcaAdhesives(eca.type));
                eca.comment = '';
                delete eca.completionDate;
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
                if (isNA) eca.completionDate = new Date().toISOString();
                else delete eca.completionDate;
            }
        });
        if (isNA) set({ selectedEcaId: null });
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
                const updatedEca = { ...originalEca, ...ecaData };
                if (ecaData.type && ecaData.type !== originalEca.type) {
                    updatedEca.adhesives = createInitialAdhesiveStatus(getEcaAdhesives(ecaData.type));
                    delete updatedEca.completionDate;
                }
                if (!canEcaBeNotApplicable(updatedEca.type)) delete updatedEca.isNotApplicable;
                if (updatedEca.isNotApplicable) updatedEca.completionDate = new Date().toISOString();
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

    handlePmrFloorAdhesiveStatusChange: async (adhesiveId, status) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            const adhesive = module.data.adhesives.find(a => a.id === adhesiveId);
            if (adhesive) {
                adhesive.status = status;
                const isComplete = module.data.adhesives.every(a => a.status !== FloorAdhesiveStatus.NotChecked);
                if (isComplete && !module.data.completionDate) module.data.completionDate = new Date().toISOString();
                else if (!isComplete && module.data.completionDate) delete module.data.completionDate;
            }
        });
    },

    handlePmrFloorAdhesiveCommentChange: async (comment) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            if (module) module.data.comment = comment;
        });
    },

    handleResetPmrFloorAdhesive: async () => {
        const { selectedLieuId, selectedModuleId, lieux } = get();
        if (!selectedLieuId || !selectedModuleId) return;

        const newLieux = JSON.parse(JSON.stringify(lieux));
        const lieuToUpdate = newLieux.find((l: Lieu) => l.id === selectedLieuId);
        if (!lieuToUpdate) return;
        const moduleToUpdate = lieuToUpdate.modules.find((m: AuditModule) => m.id === selectedModuleId);
        if (!moduleToUpdate) return;

        // SNAPSHOT BEFORE RESET
        await saveHistoryEntry(
            `Audit Sol PMR - ${lieuToUpdate.name}`, 
            'SINGLE_AUDIT', 
            moduleToUpdate, 
            undefined
        );

        const currentData = moduleToUpdate.data as PMRFloorAdhesiveData;
        currentData.comment = '';
        delete currentData.completionDate;
        currentData.adhesives.forEach(adhesive => {
            adhesive.status = FloorAdhesiveStatus.NotChecked;
            delete adhesive.photo_base64;
            delete adhesive.photo_note;
            delete adhesive.photo_rotation;
        });
        
        await db.lieux.put(lieuToUpdate);
        set({ lieux: newLieux });
    },

    handlePmrFloorAdhesivePhotoChange: async (adhesiveId, photo_base64) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            const adhesive = module.data.adhesives.find(a => a.id === adhesiveId);
            if (adhesive) {
                if (photo_base64) adhesive.photo_base64 = photo_base64;
                else {
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
            if (adhesive) adhesive.photo_note = note;
        });
    },

    handlePmrFloorAdhesivePhotoRotationChange: async (adhesiveId, rotation) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PMRFloorAdhesiveData };
            const adhesive = module.data.adhesives.find(a => a.id === adhesiveId);
            if (adhesive) adhesive.photo_rotation = rotation;
        });
    },

    handleCognitivePictogramStatusChange: async (pictogramId, status) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            const pictogram = module.data.pictograms.find(p => p.id === pictogramId);
            if (pictogram) {
                pictogram.status = status;
                const isComplete = module.data.pictograms.every(p => p.status !== FloorAdhesiveStatus.NotChecked);
                if (isComplete && !module.data.completionDate) module.data.completionDate = new Date().toISOString();
                else if (!isComplete && module.data.completionDate) delete module.data.completionDate;
            }
        });
    },

    handleCognitivePictogramCommentChange: async (comment) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            if (module) module.data.comment = comment;
        });
    },

    handleResetCognitivePictogram: async () => {
        const { selectedModuleId, selectedLieuId, lieux } = get();
        // Snapshot logic duplicate logic due to _updateLieu only allowing state modification
        // Need to fetch the *current* state before reset
        const lieuToSnapshot = lieux.find(l => l.id === selectedLieuId);
        const moduleToSnapshot = lieuToSnapshot?.modules.find(m => m.id === selectedModuleId);
        
        if(moduleToSnapshot) {
             await saveHistoryEntry(
                `Audit Pictogrammes - ${lieuToSnapshot?.name}`, 
                'SINGLE_AUDIT', 
                moduleToSnapshot, 
                undefined
            );
        }

        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            if (module) {
                module.data.pictograms.forEach(p => {
                    p.status = FloorAdhesiveStatus.NotChecked;
                });
                module.data.comment = '';
                delete module.data.completionDate;
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
                delete module.data.completionDate;
            }
        });
    },

    handleRemoveCognitivePictogramAccessPoint: async (pictogramId: string) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            if (module) {
                module.data.pictograms = module.data.pictograms.filter(p => p.id !== pictogramId);
                const isComplete = module.data.pictograms.length > 0 && module.data.pictograms.every(p => p.status !== FloorAdhesiveStatus.NotChecked);
                if (isComplete && !module.data.completionDate) module.data.completionDate = new Date().toISOString();
                else if (!isComplete && module.data.completionDate) delete module.data.completionDate;
            }
        });
    },
    
    handleUpdateCognitivePictogramAccessPointName: async (pictogramId: string, newName: string) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            const pictogram = module.data.pictograms.find(p => p.id === pictogramId);
            if (pictogram) pictogram.accessPointName = newName;
        });
    },

    handleSignaletiqueStatusChange: async (equipmentType, direction, index, status) => {
        const { selectedModuleId, selectedStationId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            if (station?.signaletique) {
                const isSingle = equipmentType === 'totem' || equipmentType === 'bandeauStation';
                const equipment = isSingle
                    ? (station.signaletique[equipmentType] as any)[direction]
                    : (station.signaletique[equipmentType] as any)[direction][index];
                if (equipment) equipment.status = status;
            }
        });
    },

    handleSignaletiqueCommentChange: async (equipmentType, direction, index, comment) => {
        const { selectedModuleId, selectedStationId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            if (station?.signaletique) {
                const isSingle = equipmentType === 'totem' || equipmentType === 'bandeauStation';
                const equipment = isSingle
                    ? (station.signaletique[equipmentType] as any)[direction]
                    : (station.signaletique[equipmentType] as any)[direction][index];
                if (equipment) equipment.comment = comment;
            }
        });
    },

    handleSignaletiqueFieldChange: async (equipmentType, direction, index, field, value) => {
        const { selectedModuleId, selectedStationId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            if (station?.signaletique) {
                const isSingle = equipmentType === 'totem' || equipmentType === 'bandeauStation';
                const equipment = isSingle
                    ? (station.signaletique[equipmentType] as any)[direction]
                    : (station.signaletique[equipmentType] as any)[direction][index];
                if (equipment) (equipment as any)[field] = value;
            }
        });
    },

    handleSignaletiquePhotoChange: async (equipmentType, direction, index, photo_base64) => {
        const { selectedModuleId, selectedStationId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            if (station?.signaletique) {
                const isSingle = equipmentType === 'totem' || equipmentType === 'bandeauStation';
                const equipment = isSingle
                    ? (station.signaletique[equipmentType] as any)[direction]
                    : (station.signaletique[equipmentType] as any)[direction][index];
                if (equipment) {
                    if (photo_base64) {
                        equipment.photo_base64 = photo_base64;
                    } else {
                        delete equipment.photo_base64;
                        delete equipment.photo_note;
                        delete equipment.photo_rotation;
                    }
                }
            }
        });
    },

    handleSignaletiquePhotoNoteChange: async (equipmentType, direction, index, note) => {
        const { selectedModuleId, selectedStationId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            if (station?.signaletique) {
                const isSingle = equipmentType === 'totem' || equipmentType === 'bandeauStation';
                const equipment = isSingle
                    ? (station.signaletique[equipmentType] as any)[direction]
                    : (station.signaletique[equipmentType] as any)[direction][index];
                if (equipment) equipment.photo_note = note;
            }
        });
    },

    handleSignaletiquePhotoRotationChange: async (equipmentType, direction, index, rotation) => {
        const { selectedModuleId, selectedStationId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            if (station?.signaletique) {
                const isSingle = equipmentType === 'totem' || equipmentType === 'bandeauStation';
                const equipment = isSingle
                    ? (station.signaletique[equipmentType] as any)[direction]
                    : (station.signaletique[equipmentType] as any)[direction][index];
                if (equipment) equipment.photo_rotation = rotation;
            }
        });
    },

    handleSignaletiqueStationCommentChange: async (comment) => {
        const { selectedModuleId, selectedStationId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            if (station) {
                station.comment = comment;
            }
        });
    },

    handleResetSignaletique: async () => {
        const { selectedModuleId, selectedStationId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            if (station?.signaletique) {
                const sig = station.signaletique!;
                const resetBase = (eq: any) => {
                    eq.status = 'NotChecked';
                    eq.comment = '';
                    delete eq.photo_base64;
                    delete eq.photo_note;
                    delete eq.photo_rotation;
                };

                // totem — single objects per direction
                (['direction1', 'direction2'] as const).forEach(dir => {
                    resetBase(sig.totem[dir]);
                });

                // bandeauStation — single objects per direction with sub-fields
                (['direction1', 'direction2'] as const).forEach(dir => {
                    const eq = sig.bandeauStation[dir];
                    resetBase(eq);
                    eq.directionContent = 'NotChecked';
                    eq.stationNameContent = 'NotChecked';
                });

                // array-based categories
                (['biv', 'planReseau', 'planQuartier', 'hap'] as const).forEach(type => {
                    (['meett', 'pdj'] as const).forEach(dir => {
                        sig[type][dir].forEach((eq: any) => {
                            resetBase(eq);
                            if (type === 'biv') {
                                eq.screenFunctioning = 'NotChecked';
                                eq.whiteTextAdhesives = 'NotChecked';
                                eq.ligneCaisson = 'NotChecked';
                                eq.destinationCaisson = 'NotChecked';
                                eq.attenteMinCaisson = 'NotChecked';
                                eq.dureeApproxCaisson = 'NotChecked';
                                eq.quaiCaisson = 'NotChecked';
                            } else if (type === 'planReseau') {
                                eq.bannerStationName = 'NotChecked';
                                eq.hap = 'NotChecked';
                            } else if (type === 'planQuartier') {
                                eq.bannerDirection = 'NotChecked';
                                eq.hap = 'NotChecked';
                            }
                        });
                    });
                });

                station.comment = '';
            }
        });
    },

    handleResetCategory: async (category) => {
        try {
            const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category);
            if (!categoryConfig) return;

            const currentLieux = get().lieux;
            
            // SNAPSHOT HISTORY for CATEGORY
            const lieuxToSnapshot = currentLieux.filter(lieu => lieu.modules.some(module => categoryConfig.predicate(module)));
            // We only snapshot the relevant modules in the history entry
            const snapshotData = lieuxToSnapshot.map(lieu => ({
                ...lieu,
                modules: lieu.modules.filter(m => categoryConfig.predicate(m))
            })).filter(l => l.modules.length > 0);

            await saveHistoryEntry(
                `Historique complet - ${categoryConfig.label}`, 
                'CATEGORY', 
                snapshotData, 
                category
            );

            const freshLieux = await generateInitialLieuxDataAsync();
            const freshLieuxMap = new Map(freshLieux.map(l => [l.name, l]));
            const updatedLieux = JSON.parse(JSON.stringify(currentLieux));

            for (const lieu of updatedLieux) {
                const modulesToKeep = lieu.modules.filter((m: AuditModule) => !categoryConfig.predicate(m));
                const freshLieu = freshLieuxMap.get(lieu.name);
                const freshModulesToAdd = freshLieu ? freshLieu.modules.filter((m: AuditModule) => categoryConfig.predicate(m)) : [];
                lieu.modules = [...modulesToKeep, ...freshModulesToAdd];
            }
            
            await db.lieux.bulkPut(updatedLieux);
            set({
                lieux: updatedLieux,
                activeFilter: 'ALL', activeAuditFilters: [], selectedLieuId: null, selectedModuleId: null, selectedStationId: null, selectedDirectionId: null, selectedDatId: null, selectedEquipmentId: null, selectedEcaId: null,
            });

        } catch (error) {
            console.error(`Failed to reset category ${category}:`, error);
            throw error;
        }
    },

    handleResetByModuleType: async (moduleType) => {
        try {
            // SNAPSHOT HISTORY
            const currentLieux = get().lieux;
            const snapshotData = currentLieux.map(lieu => ({
                ...lieu,
                modules: lieu.modules.filter(m => m.type === moduleType)
            })).filter(l => l.modules.length > 0);

            // Find label
            const config = AUDIT_CATEGORIES.flatMap(c => c).find(x => false) || { label: moduleType }; // Fallback
            
            await saveHistoryEntry(
                `Historique - ${moduleType}`, 
                'MODULE_TYPE', 
                snapshotData, 
                undefined
            );

            const freshLieux = await generateInitialLieuxDataAsync();
            const freshLieuxMap = new Map(freshLieux.map(l => [l.name, l]));
            const updatedLieux = JSON.parse(JSON.stringify(currentLieux)); 

            for (const lieu of updatedLieux) {
                const modulesToKeep = lieu.modules.filter((m: AuditModule) => m.type !== moduleType);
                const freshLieu = freshLieuxMap.get(lieu.name);
                const freshModulesToAdd = freshLieu ? freshLieu.modules.filter((m: AuditModule) => m.type === moduleType) : [];
                lieu.modules = [...modulesToKeep, ...freshModulesToAdd];
            }
            
            await db.lieux.bulkPut(updatedLieux);
            set({ lieux: updatedLieux });

        } catch (error) {
            console.error(`Failed to reset module type ${moduleType}:`, error);
            throw error;
        }
    },
    
    hardResetApplication: async () => {
        try {
            // Sauvegarde automatique avant suppression totale de la base.
            await _backupBeforeReset('hard-reset');
            await db.delete();
            window.location.reload();
        } catch (error) {
            console.error("Failed to hard reset the application:", error);
            throw new Error("La réinitialisation forcée a échoué.");
        }
    },
    
    handleResetAll: async () => {
        try {
            // SNAPSHOT GLOBAL HISTORY
            const currentLieux = get().lieux;
            await saveHistoryEntry(
                `Historique Complet Réseau`,
                'GLOBAL',
                currentLieux,
                undefined
            );

            // Sauvegarde automatique avant effacement.
            await _backupBeforeReset('reset-all');
            await db.lieux.clear();
            const initialData = await generateInitialLieuxDataAsync();
            await db.lieux.bulkPut(initialData);
            set({
                lieux: initialData,
                activeFilter: 'ALL', activeAuditFilters: [], selectedLieuId: null, selectedModuleId: null, selectedStationId: null, selectedDirectionId: null, selectedDatId: null, selectedEquipmentId: null, selectedEcaId: null,
            });
        } catch (error) {
            console.error("Failed to reset all data:", error);
            throw error;
        }
    },

    handleImportJsonData: async (jsonString: string) => {
        try {
            let rawData;
            try {
                rawData = JSON.parse(jsonString);
            } catch (e) {
                throw new Error("Format de fichier invalide.");
            }
            const dataToValidate = (rawData.data && Array.isArray(rawData.data)) ? rawData.data : rawData;
            if (!validateImportedData(dataToValidate)) throw new Error("Données invalides.");

            // Sauvegarde automatique des données actuelles avant remplacement par l'import.
            await _backupBeforeReset('pre-import');
            await db.lieux.clear();
            await db.lieux.bulkPut(dataToValidate);
            set({
                lieux: dataToValidate,
                selectedLieuId: null, selectedModuleId: null, selectedStationId: null, selectedDirectionId: null, selectedDatId: null, selectedEquipmentId: null, selectedEcaId: null,
            });
        } catch (error) {
            console.error("Échec de l'importation :", error);
            throw error;
        }
    },
}});

export default useAuditStore;