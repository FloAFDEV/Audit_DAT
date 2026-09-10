
import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
    Lieu, AuditModule, AuditModuleType, Station, Direction, DAT, AdhesiveStatus, AuditCategory, Pr, Equipment, EquipmentType, EcaData, ECA, PMRFloorAdhesiveData, FloorAdhesiveStatus, ModeData, EcaEquipmentType, CognitivePictogramData, CognitivePictogram, PrZone, SignaletiqueData, EquipmentStatusType, SignageReference, SignageDimensions, SignageSupport, PlanQuartierData, PlanQuartierOccurrence, PlanQuartierConstat
} from './types';
import { db } from './db';
import { generateInitialLieuxDataAsync } from './data/builder';
import { getInitialSignaletiqueData } from './data/signaletique_config';
import { ADHESIVES, getEcaAdhesives, getEquipmentAdhesives } from './data/adhesives';
import { AUDIT_CATEGORIES } from './data/config';
import { PLAN_QUARTIER_INITIAL_INVENTORY, PLAN_QUARTIER_INITIAL_STATUS } from './data/planQuartierInitialInventory';
import { v4 as uuidv4 } from 'uuid';
import { buildFullExportPayload, parseImportPayload, applyImportPayload } from './utils/signageSerializer';
import { canEcaBeNotApplicable } from './data/eca_data';
import { getEcaProgress } from './utils/progressCalculators';
import { sanitizeDataForHistory, calculateComplianceScore } from './utils/historyHelpers';
import { NAV_KEYS, resolveRestoredNavigation, saveNavigationSelection } from './utils/navigationPersistence';
import { logEvent } from './utils/eventLog';

// Helper to reset adhesive statuses for a given set of adhesives
const createInitialAdhesiveStatus = (adhesives: any[]): { [key: string]: AdhesiveStatus } => {
    return adhesives.reduce((acc, ad) => ({ ...acc, [ad.id]: AdhesiveStatus.NotChecked }), {});
};

interface AppState {
    // Data
    lieux: Lieu[];
    /** Référentiel signalétique (Dexie, table signageReferences) — chargé une
     *  fois à init(), source distribuée par le code/build (data/signage_seed.ts).
     *  Source effective consommée par les formulaires terrain
     *  (utils/effectiveAdhesives.ts), qui préserve l'ordre et l'appartenance
     *  historiques tout en résolvant le contenu depuis cette liste (R1 :
     *  aucune régression sur les ids existants). */
    signageReferences: SignageReference[];
    isLoading: boolean;
    isAuthenticated: boolean;
    /** Message affichable si init() a échoué à charger les données — sans lui,
     *  un échec (ex. IndexedDB inaccessible) passait inaperçu : l'app quittait
     *  simplement l'écran de chargement, isAuthenticated restait éventuellement
     *  true, et l'utilisateur atterrissait sur un tableau de bord vide, comme
     *  si le réseau n'avait aucun lieu — indiscernable d'une vraie base vide. */
    initError: string | null;

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
    /** DAT/ECA qu'on vient de quitter (retour depuis le formulaire d'audit),
     *  pour que DATList/EcaSelector puissent s'y repositionner (scroll +
     *  surbrillance) au remontage. Mémoire de session pure : jamais écrite
     *  dans localStorage (absente de NAV_KEYS/navigationPersistence.ts),
     *  consommée et effacée par la liste dès qu'elle l'a utilisée — jamais
     *  une préférence utilisateur durable. */
    lastCompletedDatId: string | null;
    lastCompletedEcaId: string | null;
    isSignaletiqueActive: boolean;
    /** Recherche du tableau de bord (LieuSelector) — la liste entière est
     *  démontée/remontée en quittant puis en revenant d'un lieu (App.tsx clé
     *  son arbre sur selectedLieuId), donc un simple useState local y serait
     *  perdu. Mémoire de session pure, jamais écrite dans localStorage. */
    dashboardSearchQuery: string;

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
    setDashboardSearchQuery: (query: string) => void;
    selectLieu: (lieuId: string | null) => void;
    selectModule: (moduleId: string | null) => void;
    navigate: (level: 'home' | 'lieu' | 'module' | 'station' | 'direction') => void;
    
    // DAT Flow Actions
    selectStation: (stationId: string | null) => void;
    selectDirection: (directionId: string | null) => void;
    selectDat: (datId: string | null) => void;
    /** Consomme lastCompletedDatId (DATList l'appelle après avoir tenté le
     *  scroll/la surbrillance, qu'elle ait trouvé l'élément ou non). */
    clearLastCompletedDat: () => void;
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
    /** Consomme lastCompletedEcaId (EcaSelector l'appelle après avoir tenté
     *  le scroll/la surbrillance, qu'elle ait trouvé l'élément ou non). */
    clearLastCompletedEca: () => void;
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

    // Plans de quartier (+ PEM 3D) Actions — recensement patrimonial dans
    // le temps, comme les anciens audits configurables (cf. types.ts) mais
    // ici un type fixe et permanent.
    handleAddPlanQuartierOccurrence: (input: { modelId?: string; adHocLabel?: string; adHocSupport?: SignageSupport; location?: string }) => Promise<PlanQuartierOccurrence>;
    handleRemovePlanQuartierOccurrence: (occurrenceId: string) => Promise<void>;
    handlePlanQuartierOccurrenceStatusChange: (occurrenceId: string, status: AdhesiveStatus) => Promise<void>;
    handlePlanQuartierOccurrenceCommentChange: (occurrenceId: string, comment: string) => Promise<void>;
    handlePlanQuartierOccurrenceLocationChange: (occurrenceId: string, location: string) => Promise<void>;
    handlePlanQuartierMeasuredDimensionsChange: (occurrenceId: string, dimensions: SignageDimensions | undefined) => Promise<void>;
    handlePlanQuartierNewConstat: (occurrenceId: string) => Promise<void>;
    handlePlanQuartierMarkChecked: () => Promise<void>;
    handlePlanQuartierCommentChange: (comment: string) => Promise<void>;
    handleResetPlanQuartier: () => Promise<void>;

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

/**
 * Réconcilie le premier recensement connu des Plans de quartier
 * (data/planQuartierInitialInventory.ts) avec les modules PLAN_QUARTIER.
 * Occurrences RÉELLES (cataloguées, modelId renseigné) : l'inventaire
 * vient de l'exploitant, pas d'un relevé terrain — d'où le statut Non
 * contrôlé, jamais un OK inventé.
 *
 * Appelée à CHAQUE démarrage, sur les deux chemins d'init (base neuve et
 * base existante), et sûre à répéter :
 *
 *  - modèle absent de la station → les exemplaires connus sont créés ;
 *  - exemplaires déjà présents, encore vierges, en nombre identique →
 *    seule leur implantation connue (commentaire, emplacement, mesure)
 *    est renseignée. C'est ce qui permet d'enrichir un appareil déjà
 *    provisionné quand l'inventaire se précise (les trois PEM 3D
 *    géo-orientés d'Arènes) sans repasser par une base neuve ;
 *  - dès qu'un constat terrain existe (statut saisi, commentaire, ou
 *    historique), le seed ne touche plus à rien : le terrain fait foi.
 *
 * Mute `lieux` en place ; retourne true si quelque chose a été écrit.
 */
const seedPlanQuartierInitialInventory = (lieux: Lieu[]): boolean => {
    const now = new Date().toISOString();
    let changed = false;

    // Une même station peut porter plusieurs entrées pour un même modèle,
    // décrivant des implantations distinctes (Ramonville : entrée bus /
    // entrée square ; Arènes : les trois PEM 3D). Le rapprochement se fait
    // donc par (ligne, station, modèle), pas entrée par entrée.
    type OccurrenceSpec = Pick<PlanQuartierOccurrence, 'comment' | 'location' | 'measuredDimensions'>;
    const groups = new Map<string, { line: string; stationName: string; modelId: string; specs: OccurrenceSpec[] }>();
    for (const entry of PLAN_QUARTIER_INITIAL_INVENTORY) {
        const key = `${entry.line}|${entry.stationName}|${entry.modelId}`;
        const group = groups.get(key)
            ?? { line: entry.line, stationName: entry.stationName, modelId: entry.modelId, specs: [] };
        for (let i = 0; i < entry.quantity; i++) {
            group.specs.push({ comment: entry.comment, location: entry.location, measuredDimensions: entry.measuredDimensions });
        }
        groups.set(key, group);
    }

    for (const group of groups.values()) {
        const module = lieux.flatMap(l => l.modules).find(m =>
            m.type === AuditModuleType.PLAN_QUARTIER && m.line === group.line &&
            (m.data as PlanQuartierData).stationName === group.stationName
        );
        if (!module) continue; // station inconnue du registre — ignorée, jamais inventée
        const pdqData = module.data as PlanQuartierData;
        const existing = pdqData.occurrences.filter(o => o.modelId === group.modelId);

        if (existing.length === 0) {
            for (const spec of group.specs) {
                pdqData.occurrences.push({
                    id: uuidv4(),
                    modelId: group.modelId,
                    status: PLAN_QUARTIER_INITIAL_STATUS,
                    comment: spec.comment,
                    location: spec.location,
                    measuredDimensions: spec.measuredDimensions,
                    constatedAt: now,
                    discoveredAt: now,
                });
            }
            changed = true;
            continue;
        }

        // Enrichissement : uniquement sur des exemplaires encore vierges et
        // en nombre exactement identique — sinon on ne saurait pas lequel
        // porte quelle implantation, et deviner reviendrait à inventer.
        const stillBlank = existing.every(o =>
            o.status === PLAN_QUARTIER_INITIAL_STATUS && !o.comment && !o.location
            && !(o.previousConstats?.length)
        );
        const hasKnownImplantation = group.specs.some(s => s.comment || s.location || s.measuredDimensions);
        if (existing.length !== group.specs.length || !stillBlank || !hasKnownImplantation) continue;

        existing.forEach((occ, i) => {
            occ.comment = group.specs[i].comment;
            occ.location = group.specs[i].location;
            occ.measuredDimensions = group.specs[i].measuredDimensions;
        });
        changed = true;
    }
    return changed;
};

const useAuditStore = create<AppState>((set, get) => {
    /**
     * Écrit une modification sur UNE station : clone, applique updateFn,
     * persiste en base puis synchronise le store — dans ce seul geste, pour
     * que Dexie et Zustand ne divergent jamais. Deux façons de désigner la
     * station, avec un comportement d'absence volontairement différent :
     *  - `mode: 'selected'` (terrain) : si aucune station n'est sélectionnée,
     *    ou si elle est introuvable, ne fait RIEN (silencieux) — état
     *    courant normal du terrain avant sélection, jamais une erreur.
     *  - `mode: 'byId'` : la station DOIT exister (id choisi explicitement) —
     *    une absence lève une erreur explicite plutôt que d'échouer en silence.
     */
    const _updateLieuById = async (
        target: { mode: 'selected' } | { mode: 'byId'; id: string },
        updateFn: (lieu: Lieu) => void,
    ): Promise<Lieu | undefined> => {
        const { selectedLieuId, lieux } = get();
        const id = target.mode === 'selected' ? selectedLieuId : target.id;
        if (!id) {
            if (target.mode === 'byId') throw new Error('Station introuvable : identifiant manquant.');
            return undefined;
        }

        const lieuToUpdate = lieux.find(l => l.id === id);
        if (!lieuToUpdate) {
            if (target.mode === 'byId') throw new Error(`Station introuvable : ${id}`);
            return undefined;
        }

        // Deep clone to avoid direct state mutation
        const clonedLieu = JSON.parse(JSON.stringify(lieuToUpdate));

        updateFn(clonedLieu);

        try {
            await db.lieux.put(clonedLieu);
        } catch (error) {
            // Écriture IndexedDB échouée (ex. quota de stockage dépassé) : on ne
            // met JAMAIS à jour l'état local dans ce cas, sinon l'écran afficherait
            // une modification que la base n'a pas réellement enregistrée — un
            // agent terrain croirait avoir sauvegardé une observation qui serait
            // perdue au rechargement suivant.
            console.error("Échec de l'enregistrement en base :", error);
            toast.error("Échec de l'enregistrement — vérifiez l'espace de stockage disponible. Votre dernière modification n'a pas été sauvegardée, réessayez.", { duration: 8000 });
            // Best-effort : journalise l'échec pour le diagnostic ultérieur (ex.
            // « le stockage a commencé à saturer à partir de telle date »). Ne
            // doit jamais faire échouer CE bloc catch lui-même si l'écriture du
            // journal échoue à son tour (logEvent avale déjà ses propres erreurs).
            await logEvent({
                type: 'PERSISTENCE_ERROR', entityType: 'lieu', entityId: id, entityLabel: lieuToUpdate.name,
                summary: `Échec d'enregistrement — ${lieuToUpdate.name}`,
                metadata: { message: error instanceof Error ? error.message : String(error) },
            });
            // On relance l'erreur (en plus du toast déjà affiché ci-dessus) :
            // plusieurs appelants (les resets DAT/ECA/P+R/Signalétique/Pictos,
            // via createResetHandler → showPromiseToast) attendent cette promesse
            // pour savoir si l'opération a réussi. Sans ce throw, l'échec serait
            // avalé et resolve() silencieusement — showPromiseToast afficherait
            // alors un second toast « Réinitialisation terminée », contradictoire
            // avec l'échec réel qui venait d'être signalé.
            throw error;
        }

        const updatedLieux = lieux.map(l => l.id === id ? clonedLieu : l);
        set({ lieux: updatedLieux });
        return clonedLieu;
    };

    /** Terrain : opère toujours sur la station actuellement sélectionnée. */
    const _updateLieu = (updateFn: (lieu: Lieu) => void) => _updateLieuById({ mode: 'selected' }, updateFn);


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
     * Inclut le référentiel signalétique (signageReferences) : les données
     * ne doivent JAMAIS être perdues silencieusement — notamment lors d'un
     * hard-reset (db.delete()) qui, sans ce backup, re-seederait le
     * référentiel depuis les constantes.
     * Si localStorage est plein, déclenche un téléchargement automatique du fichier JSON.
     * @returns la clé localStorage utilisée pour le backup, ou '' si download forcé.
     */
    const _backupBeforeReset = async (scope: string): Promise<string> => {
        const fullPayload = await buildFullExportPayload();
        const now = fullPayload.exportDate;
        // Format identique à l'export JSON v2 (clé 'data' + signageReferences)
        // pour permettre la restauration complète via
        // "Restaurer une sauvegarde (.json)".
        const backup = { ...fullPayload, scope };
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
    signageReferences: [],
    isLoading: true,
    isAuthenticated: false,
    initError: null,
    theme: 'light',
    isStatsViewActive: false,
    activeFilter: (() => {
        try {
            const saved = localStorage.getItem('tisseo-audit-active-filter') as AuditCategory | 'ALL' | null;
            if (saved === 'ALL') return 'ALL';
            if (saved && AUDIT_CATEGORIES.some(c => c.key === saved)) return saved;
        } catch { /* ignore */ }
        return 'ALL';
    })(),
    activeAuditFilters: [],
    selectedLieuId: null,
    selectedModuleId: null,
    selectedStationId: null,
    selectedDirectionId: null,
    selectedDatId: null,
    selectedPrZoneId: null,
    selectedEquipmentId: null,
    selectedEcaId: null,
    lastCompletedDatId: null,
    lastCompletedEcaId: null,
    isSignaletiqueActive: false,
    dashboardSearchQuery: '',

    // =================================================================
    // Initialization & Auth
    // =================================================================
    init: async () => {
        try {
            // Protection IndexedDB : demande au navigateur de marquer le stockage
            // comme persistant (réduit le risque d'éviction silencieuse de la base
            // sous pression de stockage). Non bloquant, sans UI : un refus est
            // simplement journalisé — l'app fonctionne à l'identique.
            try {
                if (navigator.storage?.persist) {
                    navigator.storage.persist().then(granted => {
                        if (!granted) console.warn('Stockage persistant refusé par le navigateur — pensez à exporter régulièrement (JSON).');
                    }).catch(() => { /* ignore */ });
                }
            } catch { /* environnement sans navigator.storage */ }

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

                const migrateStation = (station: any, line: 'TRAM' | 'AEROPORT') => {
                    if (station.isFuture) return;
                    if (!station.signaletique) {
                        station.signaletique = getInitialSignaletiqueData(station.name || '', line);
                        dataChanged = true;
                        return;
                    }
                    const sig = station.signaletique;

                    // Ensure hap exists
                    if (!sig.hap) {
                        sig.hap = getInitialSignaletiqueData(station.name || '', line).hap;
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
                        sig.bandeauStation = getInitialSignaletiqueData(station.name || '', line).bandeauStation;
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
                            const line = module.line as 'TRAM' | 'AEROPORT';
                            (module.data as ModeData).stations.forEach(station => migrateStation(station, line));
                        }
                    });
                });

                // DATA MIGRATION : ajouter les modules Plans de quartier (+ PEM 3D) si absents.
                // Même patron que la migration v8 LAE : génère les données fraîches (qui
                // incluent déjà les modules PLAN_QUARTIER vierges via data/builder.ts) et
                // n'en extrait que les modules manquants, lieu par lieu — jamais de
                // régénération complète, jamais de perte des modules déjà audités.
                const hasPlanQuartierModules = data.some(l => l.modules.some(m => m.type === AuditModuleType.PLAN_QUARTIER));
                if (!hasPlanQuartierModules) {
                    const freshData = await generateInitialLieuxDataAsync();
                    const freshByLieuName = new Map(freshData.map(l => [l.name, l]));
                    data = data.map(lieu => {
                        const freshLieu = freshByLieuName.get(lieu.name);
                        if (!freshLieu) return lieu;
                        const missingPdqModules = freshLieu.modules.filter(m => m.type === AuditModuleType.PLAN_QUARTIER);
                        if (missingPdqModules.length === 0) return lieu;
                        dataChanged = true;
                        return { ...lieu, modules: [...lieu.modules, ...missingPdqModules] };
                    });
                }

                // Hors du bloc ci-dessus : la réconciliation tourne à chaque
                // démarrage, y compris quand les modules existent déjà. C'est
                // ce qui permet à un appareil déjà provisionné de recevoir une
                // implantation qui se précise, sans jamais écraser un constat
                // terrain (cf. seedPlanQuartierInitialInventory).
                if (seedPlanQuartierInitialInventory(data)) dataChanged = true;

                if (dataChanged) {
                    await db.lieux.bulkPut(data);
                    await logEvent({
                        type: 'DATA_MIGRATION',
                        summary: 'Données du réseau migrées vers le format courant au démarrage',
                    });
                }

                set({ lieux: data });
            } else {
                const initialData = await generateInitialLieuxDataAsync();
                // Base neuve : le premier recensement connu est semé ici aussi,
                // sinon un appareil fraîchement provisionné démarrerait sans
                // aucun plan de quartier, là où un appareil migré les aurait.
                seedPlanQuartierInitialInventory(initialData);
                await db.lieux.bulkPut(initialData);
                set({ lieux: initialData });
            }

            // Référentiel signalétique : chargé une fois ici, jamais rechargé par
            // polling. C'est la même table que useSignageReferences (Cockpit),
            // simplement aussi exposée aux formulaires terrain via le store.
            const references = await db.signageReferences.toArray();
            set({ signageReferences: references });

            // Reprise de navigation : ne restaure QUE ce qui résout encore
            // réellement contre les données qui viennent d'être chargées
            // (cf. utils/navigationPersistence.ts — jamais un identifiant
            // orphelin après un import/reset survenu entre-temps).
            const restoredNav = resolveRestoredNavigation(get().lieux);
            if (Object.keys(restoredNav).length > 0) set(restoredNav);
        } catch (error) {
            // Auparavant, cette erreur était relancée sans jamais être
            // interceptée par l'appelant (App.tsx ne fait qu'un fire-and-forget
            // de store.init()) : un échec de chargement (permissions, migration
            // en erreur...) passait totalement inaperçu — l'utilisateur
            // atterrissait sur un tableau de bord vide, indiscernable d'un
            // réseau réellement sans lieu. `initError` rend cet échec visible.
            console.error("Échec de l'initialisation de l'application :", error);
            set({ initError: "Impossible de charger les données. Vérifiez les permissions de stockage, puis rafraîchissez la page." });
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
            dashboardSearchQuery: '',
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
    setActiveFilter: (filter) => {
        try { localStorage.setItem('tisseo-audit-active-filter', filter); } catch { /* ignore */ }
        set({ activeFilter: filter, activeAuditFilters: [] });
    },
    setActiveAuditFilters: (filters) => set({ activeAuditFilters: filters }),

    setDashboardSearchQuery: (query) => set({ dashboardSearchQuery: query }),

    selectLieu: (lieuId) => {
        set({
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
        });
    },

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
    // Retour depuis le formulaire d'audit (datId passe à null) : mémorise le
    // DAT qu'on vient de quitter pour que DATList puisse s'y repositionner à
    // son prochain montage. N'importe quel autre appel (sélection d'un DAT,
    // resets globaux qui mettent selectedDatId à null ailleurs dans ce
    // fichier) ne passe pas par cette action et ne déclenche donc rien ici.
    selectDat: (datId) => set(state => ({
        selectedDatId: datId,
        lastCompletedDatId: (datId === null && state.selectedDatId) ? state.selectedDatId : state.lastCompletedDatId,
    })),
    clearLastCompletedDat: () => set({ lastCompletedDatId: null }),
    selectPrZone: (zoneId) => set({ selectedPrZoneId: zoneId, selectedEquipmentId: null }),
    selectEquipment: (equipmentId) => set({ selectedEquipmentId: equipmentId }),
    // Même principe que selectDat ci-dessus, pour l'ECA qu'on vient de quitter.
    selectEca: (ecaId) => set(state => ({
        selectedEcaId: ecaId,
        lastCompletedEcaId: (ecaId === null && state.selectedEcaId) ? state.selectedEcaId : state.lastCompletedEcaId,
    })),
    clearLastCompletedEca: () => set({ lastCompletedEcaId: null }),

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
        const { selectedModuleId, selectedStationId, selectedDirectionId, selectedLieuId, lieux } = get();
        let createdDat: DAT | null = null;
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
                    comment: '',
                };
                direction.dats.push(newDat);
                createdDat = newDat;
            }
        });
        if (createdDat) {
            const lieuName = lieux.find(l => l.id === selectedLieuId)?.name;
            const dat: DAT = createdDat;
            await logEvent({
                type: 'AUDIT_ITEM_ADDED', entityType: 'dat', entityId: dat.id, entityLabel: dat.name,
                summary: `DAT ajouté — ${dat.name}${lieuName ? ` (${lieuName})` : ''}`,
            });
        }
    },

    handleRemoveDat: async (datId) => {
        const { selectedModuleId, selectedStationId, selectedDirectionId, selectedLieuId, lieux } = get();
        const lieuBefore = lieux.find(l => l.id === selectedLieuId);
        const moduleBefore = lieuBefore?.modules.find(m => m.id === selectedModuleId);
        const stationBefore = (moduleBefore?.data as ModeData | undefined)?.stations.find(s => s.id === selectedStationId);
        const directionBefore = stationBefore?.directions.find(d => d.id === selectedDirectionId);
        const datName = directionBefore?.dats.find(d => d.id === datId)?.name;

        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: ModeData };
            const station = module.data.stations.find(s => s.id === selectedStationId);
            const direction = station?.directions.find(d => d.id === selectedDirectionId);
            if (direction) {
                direction.dats = direction.dats.filter(d => d.id !== datId);
            }
        });

        if (datName) {
            await logEvent({
                type: 'AUDIT_ITEM_REMOVED', entityType: 'dat', entityId: datId, entityLabel: datName,
                summary: `DAT supprimé — ${datName}${lieuBefore ? ` (${lieuBefore.name})` : ''}`,
            });
        }
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
                equipment.adhesives = createInitialAdhesiveStatus(getEquipmentAdhesives(equipment.type, equipment.adhesiveIds));
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
        // Passe par l'action selectEca (pas un set direct) : un ECA confirmé
        // « Non applicable » retourne directement à la liste sans passer par
        // le formulaire d'audit — il doit bénéficier du même repositionnement
        // que n'importe quel autre retour.
        if (isNA) get().selectEca(null);
    },
    
    handleAddEca: async (ecaData) => {
        const { selectedModuleId, selectedLieuId, lieux } = get();
        let createdEca: ECA | null = null;
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
                createdEca = newEca;
            }
        });
        if (createdEca) {
            const lieuName = lieux.find(l => l.id === selectedLieuId)?.name;
            const eca: ECA = createdEca;
            await logEvent({
                type: 'AUDIT_ITEM_ADDED', entityType: 'eca', entityId: eca.id, entityLabel: eca.name,
                summary: `ECA ajouté — ${eca.name}${lieuName ? ` (${lieuName})` : ''}`,
            });
        }
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
        const { selectedModuleId, selectedLieuId, lieux } = get();
        const lieuBefore = lieux.find(l => l.id === selectedLieuId);
        const moduleBefore = lieuBefore?.modules.find(m => m.id === selectedModuleId);
        const ecaName = (moduleBefore?.data as EcaData | undefined)?.ecas.find(e => e.id === ecaId)?.name;

        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: EcaData };
            if (module) {
                module.data.ecas = module.data.ecas.filter(e => e.id !== ecaId);
            }
        });

        if (ecaName) {
            await logEvent({
                type: 'AUDIT_ITEM_REMOVED', entityType: 'eca', entityId: ecaId, entityLabel: ecaName,
                summary: `ECA supprimé — ${ecaName}${lieuBefore ? ` (${lieuBefore.name})` : ''}`,
            });
        }
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

        // Instantané capturé AVANT la mutation (c'est l'état pré-reset qu'on
        // veut archiver), mais écrit en base seulement APRÈS confirmation que
        // le reset a réellement été persisté (voir plus bas) — jamais avant :
        // si db.lieux.put échouait, l'archive affirmerait à tort qu'un reset
        // a eu lieu alors que les données n'ont pas bougé.
        const snapshotBeforeReset = JSON.parse(JSON.stringify(moduleToUpdate));

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

        await saveHistoryEntry(
            `Audit Sol PMR - ${lieuToUpdate.name}`,
            'SINGLE_AUDIT',
            snapshotBeforeReset,
            undefined
        );
        await logEvent({
            type: 'RESET_AUDIT', entityType: 'lieu', entityId: lieuToUpdate.id, entityLabel: lieuToUpdate.name,
            summary: `Audit Sol PMR réinitialisé — ${lieuToUpdate.name}`,
        });
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

    // -----------------------------------------------------------------
    // Plans de quartier (+ PEM 3D) — saisie terrain.
    // -----------------------------------------------------------------
    // Même esprit que les anciens audits configurables (recensement
    // patrimonial dans le temps, occurrences comptées individuellement),
    // mais ici un type FIXE et permanent (cf. types.ts en-tête) : une
    // occurrence référence un modèle catalogué (modelId) ou, faute de
    // modèle correspondant dans le code, porte sa propre description
    // libre (adHocLabel/adHocSupport) — jamais bloquant pour le terrain.
    // -----------------------------------------------------------------
    handleAddPlanQuartierOccurrence: async (input) => {
        const { selectedModuleId } = get();
        let created: PlanQuartierOccurrence | undefined;
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PlanQuartierData };
            if (!module) return;
            const now = new Date().toISOString();
            created = {
                id: uuidv4(),
                modelId: input.modelId,
                adHocLabel: input.adHocLabel?.trim() || undefined,
                adHocSupport: input.adHocSupport,
                location: input.location?.trim() || undefined,
                status: AdhesiveStatus.NotChecked,
                constatedAt: now,
                discoveredAt: now,
            };
            module.data.occurrences.push(created);
            module.data.lastCheckedAt = now;
        });
        if (created) {
            await logEvent({
                type: 'AUDIT_ITEM_ADDED', entityType: 'planQuartierOccurrence', entityId: created.id,
                entityLabel: input.adHocLabel?.trim() || input.location?.trim() || undefined,
                summary: `Plan de quartier recensé — ${input.adHocLabel?.trim() || input.location?.trim() || 'sans emplacement précisé'}`,
            });
        }
        return created!;
    },

    // Retrait — même règle que les anciens audits configurables : refusé
    // dès qu'un constat réel existe (statut, commentaire, photo, mesure ou
    // historique) ; corrige une erreur de saisie, jamais un objet réel.
    handleRemovePlanQuartierOccurrence: async (occurrenceId) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PlanQuartierData };
            if (!module) return;
            const occ = module.data.occurrences.find(o => o.id === occurrenceId);
            if (!occ) return;
            const isBlank = occ.status === AdhesiveStatus.NotChecked && !occ.comment && !occ.measuredDimensions
                && (!occ.photos || occ.photos.length === 0) && (occ.previousConstats ?? []).length === 0;
            if (!isBlank) {
                throw new Error('Impossible de retirer cet élément : un constat a déjà été saisi (utilisez le statut Absent si l\'objet a disparu).');
            }
            module.data.occurrences = module.data.occurrences.filter(o => o.id !== occurrenceId);
        });
    },

    handlePlanQuartierOccurrenceStatusChange: async (occurrenceId, status) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PlanQuartierData };
            const occ = module?.data.occurrences.find(o => o.id === occurrenceId);
            if (!occ) return;
            occ.status = status;
            occ.constatedAt = new Date().toISOString();
            module!.data.lastCheckedAt = occ.constatedAt;
        });
    },

    handlePlanQuartierOccurrenceCommentChange: async (occurrenceId, comment) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PlanQuartierData };
            const occ = module?.data.occurrences.find(o => o.id === occurrenceId);
            if (occ) occ.comment = comment;
        });
    },

    handlePlanQuartierOccurrenceLocationChange: async (occurrenceId, location) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PlanQuartierData };
            const occ = module?.data.occurrences.find(o => o.id === occurrenceId);
            if (occ) occ.location = location.trim() || undefined;
        });
    },

    // Mesure réelle divergente du modèle catalogué (ex. Empalot : modèle
    // 78×120, mesuré 78×119) — vit uniquement sur l'exemplaire, ne
    // remplace jamais la dimension du modèle catalogué.
    handlePlanQuartierMeasuredDimensionsChange: async (occurrenceId, dimensions) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PlanQuartierData };
            const occ = module?.data.occurrences.find(o => o.id === occurrenceId);
            if (occ) occ.measuredDimensions = dimensions;
        });
    },

    // « Nouveau constat » — SEUL point d'écriture de previousConstats, sans
    // effet si le constat courant est encore Non contrôlé.
    handlePlanQuartierNewConstat: async (occurrenceId) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PlanQuartierData };
            const occ = module?.data.occurrences.find(o => o.id === occurrenceId);
            if (!occ || occ.status === AdhesiveStatus.NotChecked) return;
            const archived: PlanQuartierConstat = { status: occ.status, comment: occ.comment, constatedAt: occ.constatedAt };
            occ.previousConstats = [...(occ.previousConstats ?? []), archived];
            occ.status = AdhesiveStatus.NotChecked;
            occ.comment = undefined;
            occ.constatedAt = new Date().toISOString();
        });
    },

    // « Aucun élément trouvé » — uniquement pertinent quand occurrences est
    // vide : marque le module comme vérifié sans créer d'occurrence fictive.
    handlePlanQuartierMarkChecked: async () => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PlanQuartierData };
            if (module) module.data.lastCheckedAt = new Date().toISOString();
        });
    },

    handlePlanQuartierCommentChange: async (comment) => {
        const { selectedModuleId } = get();
        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: PlanQuartierData };
            if (module) module.data.comment = comment;
        });
    },

    handleResetPlanQuartier: async () => {
        const { selectedLieuId, selectedModuleId, lieux } = get();
        if (!selectedLieuId || !selectedModuleId) return;

        const newLieux = JSON.parse(JSON.stringify(lieux));
        const lieuToUpdate = newLieux.find((l: Lieu) => l.id === selectedLieuId);
        if (!lieuToUpdate) return;
        const moduleToUpdate = lieuToUpdate.modules.find((m: AuditModule) => m.id === selectedModuleId);
        if (!moduleToUpdate) return;

        // Instantané AVANT la mutation, écrit en base seulement APRÈS
        // confirmation de la persistance — même règle que les autres resets.
        const snapshotBeforeReset = JSON.parse(JSON.stringify(moduleToUpdate));

        const currentData = moduleToUpdate.data as PlanQuartierData;
        currentData.occurrences = [];
        currentData.comment = '';
        delete currentData.lastCheckedAt;

        await db.lieux.put(lieuToUpdate);
        set({ lieux: newLieux });

        await saveHistoryEntry(
            `${moduleToUpdate.name} - ${lieuToUpdate.name}`,
            'SINGLE_AUDIT',
            snapshotBeforeReset,
            undefined
        );
        await logEvent({
            type: 'RESET_AUDIT', entityType: 'lieu', entityId: lieuToUpdate.id, entityLabel: lieuToUpdate.name,
            summary: `${moduleToUpdate.name} réinitialisé — ${lieuToUpdate.name}`,
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

        // _updateLieu D'ABORD : si l'écriture échoue, elle relance désormais
        // (cf. correctif Lot 2) — on n'atteint jamais l'archivage ci-dessous,
        // qui n'affirmerait donc jamais à tort qu'un reset a eu lieu.
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

        if (moduleToSnapshot) {
            await saveHistoryEntry(
                `Audit Pictogrammes - ${lieuToSnapshot?.name}`,
                'SINGLE_AUDIT',
                moduleToSnapshot,
                undefined
            );
            await logEvent({
                type: 'RESET_AUDIT', entityType: 'lieu', entityId: lieuToSnapshot?.id, entityLabel: lieuToSnapshot?.name,
                summary: `Audit Pictogrammes réinitialisé — ${lieuToSnapshot?.name}`,
            });
        }
    },
    
    handleAddCognitivePictogramAccessPoint: async () => {
        const { selectedModuleId, selectedLieuId, lieux } = get();
        let createdPoint: CognitivePictogram | null = null;
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
                createdPoint = newAccessPoint;
            }
        });
        if (createdPoint) {
            const lieuName = lieux.find(l => l.id === selectedLieuId)?.name;
            const point: CognitivePictogram = createdPoint;
            await logEvent({
                type: 'AUDIT_ITEM_ADDED', entityType: 'pictogram', entityId: point.id, entityLabel: point.accessPointName,
                summary: `Accès pictogrammes ajouté — ${point.accessPointName}${lieuName ? ` (${lieuName})` : ''}`,
            });
        }
    },

    handleRemoveCognitivePictogramAccessPoint: async (pictogramId: string) => {
        const { selectedModuleId, selectedLieuId, lieux } = get();
        const lieuBefore = lieux.find(l => l.id === selectedLieuId);
        const moduleBefore = lieuBefore?.modules.find(m => m.id === selectedModuleId);
        const pointName = (moduleBefore?.data as CognitivePictogramData | undefined)?.pictograms.find(p => p.id === pictogramId)?.accessPointName;

        await _updateLieu(lieu => {
            const module = lieu.modules.find(m => m.id === selectedModuleId) as AuditModule & { data: CognitivePictogramData };
            if (module) {
                module.data.pictograms = module.data.pictograms.filter(p => p.id !== pictogramId);
                const isComplete = module.data.pictograms.length > 0 && module.data.pictograms.every(p => p.status !== FloorAdhesiveStatus.NotChecked);
                if (isComplete && !module.data.completionDate) module.data.completionDate = new Date().toISOString();
                else if (!isComplete && module.data.completionDate) delete module.data.completionDate;
            }
        });

        if (pointName) {
            await logEvent({
                type: 'AUDIT_ITEM_REMOVED', entityType: 'pictogram', entityId: pictogramId, entityLabel: pointName,
                summary: `Accès pictogrammes supprimé — ${pointName}${lieuBefore ? ` (${lieuBefore.name})` : ''}`,
            });
        }
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

            const freshLieux = await generateInitialLieuxDataAsync();
            const freshLieuxMap = new Map(freshLieux.map(l => [l.name, l]));
            const updatedLieux = JSON.parse(JSON.stringify(currentLieux));

            for (const lieu of updatedLieux) {
                const modulesToKeep = lieu.modules.filter((m: AuditModule) => !categoryConfig.predicate(m));
                const freshLieu = freshLieuxMap.get(lieu.name);
                const freshModulesToAdd = freshLieu ? freshLieu.modules.filter((m: AuditModule) => categoryConfig.predicate(m)) : [];
                lieu.modules = [...modulesToKeep, ...freshModulesToAdd];
            }

            // Écriture réelle D'ABORD : l'archive ci-dessous ne doit jamais
            // affirmer qu'une réinitialisation a eu lieu si bulkPut a échoué.
            await db.lieux.bulkPut(updatedLieux);
            set({
                lieux: updatedLieux,
                activeFilter: 'ALL', activeAuditFilters: [], selectedLieuId: null, selectedModuleId: null, selectedStationId: null, selectedDirectionId: null, selectedDatId: null, selectedEquipmentId: null, selectedEcaId: null,
            });

            await saveHistoryEntry(
                `Historique complet - ${categoryConfig.label}`,
                'CATEGORY',
                snapshotData,
                category
            );
            await logEvent({
                type: 'RESET_CATEGORY', entityType: 'category', entityId: category, entityLabel: categoryConfig.label,
                summary: `Catégorie « ${categoryConfig.label} » réinitialisée`,
                metadata: { lieuxConcernes: lieuxToSnapshot.length },
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

            const freshLieux = await generateInitialLieuxDataAsync();
            const freshLieuxMap = new Map(freshLieux.map(l => [l.name, l]));
            const updatedLieux = JSON.parse(JSON.stringify(currentLieux));

            for (const lieu of updatedLieux) {
                const modulesToKeep = lieu.modules.filter((m: AuditModule) => m.type !== moduleType);
                const freshLieu = freshLieuxMap.get(lieu.name);
                const freshModulesToAdd = freshLieu ? freshLieu.modules.filter((m: AuditModule) => m.type === moduleType) : [];
                lieu.modules = [...modulesToKeep, ...freshModulesToAdd];
            }

            // Écriture réelle D'ABORD (même raison que handleResetCategory).
            await db.lieux.bulkPut(updatedLieux);
            set({ lieux: updatedLieux });

            await saveHistoryEntry(
                `Historique - ${moduleType}`,
                'MODULE_TYPE',
                snapshotData,
                undefined
            );
            await logEvent({
                type: 'RESET_MODULE_TYPE', entityType: 'moduleType', entityId: moduleType, entityLabel: moduleType,
                summary: `Type d'audit « ${moduleType} » réinitialisé`,
                metadata: { lieuxConcernes: snapshotData.length },
            });

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
            // Instantané capturé maintenant (avant effacement), écrit en
            // archive seulement après confirmation que le reset a réellement
            // eu lieu (voir plus bas) — même raison que handleResetCategory.
            const currentLieux = get().lieux;

            // Sauvegarde automatique avant effacement.
            await _backupBeforeReset('reset-all');
            await db.lieux.clear();
            const initialData = await generateInitialLieuxDataAsync();
            await db.lieux.bulkPut(initialData);
            set({
                lieux: initialData,
                activeFilter: 'ALL', activeAuditFilters: [], selectedLieuId: null, selectedModuleId: null, selectedStationId: null, selectedDirectionId: null, selectedDatId: null, selectedEquipmentId: null, selectedEcaId: null,
            });

            await saveHistoryEntry(
                `Historique Complet Réseau`,
                'GLOBAL',
                currentLieux,
                undefined
            );
            await logEvent({
                type: 'RESET_GLOBAL',
                summary: 'Réinitialisation complète du réseau',
                metadata: { lieuxConcernes: currentLieux.length },
            });
        } catch (error) {
            console.error("Failed to reset all data:", error);
            throw error;
        }
    },

    handleImportJsonData: async (jsonString: string) => {
        try {
            // Parsing + validation des deux formats (v1 lieux seuls / v2 complet).
            // RÈGLE : un import au format ancien (sans signageReferences) ne touche
            // JAMAIS au référentiel local — ni écrasement, ni régénération.
            const payload = parseImportPayload(jsonString);

            // Sauvegarde automatique des données actuelles avant remplacement par l'import.
            await _backupBeforeReset('pre-import');
            await applyImportPayload(payload);
            set({
                lieux: payload.lieux,
                // Un import v2 remplace aussi signageReferences en base
                // (applyImportPayload) — sans cette ligne, le store restait sur
                // l'ancien référentiel jusqu'au prochain rechargement complet,
                // et les formulaires terrain (utils/effectiveAdhesives.ts) en
                // divergeaient silencieusement de ce qui venait d'être écrit
                // dans Dexie. Un import v1 (signageReferences absent) laisse
                // le référentiel courant strictement intact, comme prévu.
                ...(payload.signageReferences !== undefined ? { signageReferences: payload.signageReferences } : {}),
                selectedLieuId: null, selectedModuleId: null, selectedStationId: null, selectedDirectionId: null, selectedDatId: null, selectedEquipmentId: null, selectedEcaId: null,
            });
            await logEvent({
                type: 'IMPORT',
                summary: `Import d'une sauvegarde — ${payload.lieux.length} lieu${payload.lieux.length > 1 ? 'x' : ''}`,
                metadata: {
                    lieux: payload.lieux.length,
                    referentiel: payload.signageReferences !== undefined,
                },
            });
        } catch (error) {
            console.error("Échec de l'importation :", error);
            throw error;
        }
    },
}});

// Persistance de la position de navigation (reprise après interruption,
// Lot 2.4) : enregistrée dès qu'un des 8 identifiants de sélection change —
// jamais à chaque frappe (les mutations de champs, via _updateLieu, ne
// touchent aucune de ces clés). Abonnement unique, module-level : le store
// est un singleton importé une seule fois, cette souscription vit donc
// pendant toute la durée de vie de l'application.
useAuditStore.subscribe((state, prevState) => {
    const navChanged = NAV_KEYS.some(key => state[key] !== prevState[key]);
    if (!navChanged) return;
    saveNavigationSelection({
        selectedLieuId: state.selectedLieuId,
        selectedModuleId: state.selectedModuleId,
        selectedStationId: state.selectedStationId,
        selectedDirectionId: state.selectedDirectionId,
        selectedDatId: state.selectedDatId,
        selectedPrZoneId: state.selectedPrZoneId,
        selectedEquipmentId: state.selectedEquipmentId,
        selectedEcaId: state.selectedEcaId,
    });
});

export default useAuditStore;