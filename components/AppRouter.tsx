import React, { lazy } from 'react';
import { Lieu, AuditModule, Station, Direction, DAT, Equipment, ECA, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData, PrZone } from '../types';
import LieuSelector from './LieuSelector';
import { isPmrEcaType, canEcaBeNotApplicable } from '../data/eca_data';

// Dynamically import components for code splitting
const ModuleSelector = lazy(() => import('./ModuleSelector'));
const DatGroupSelector = lazy(() => import('./DatGroupSelector'));
const TramDirectionSelector = lazy(() => import('./TramDirectionSelector'));
const SignaletiqueAuditForm = lazy(() => import('./SignaletiqueAuditForm'));
const DATList = lazy(() => import('./DATList'));
const AdhesiveAuditForm = lazy(() => import('./AdhesiveAuditForm'));
const PrZoneSelector = lazy(() => import('./PrZoneSelector'));
const EquipmentSelector = lazy(() => import('./EquipmentSelector'));
const PnrAdhesiveAuditForm = lazy(() => import('./PnrAdhesiveAuditForm'));
const EcaSelector = lazy(() => import('./EcaSelector'));
const EcaAdhesiveAuditForm = lazy(() => import('./EcaAdhesiveAuditForm'));
const EcaTripodeSortieDecision = lazy(() => import('./EcaTripodeSortieDecision'));
const PMRFloorAdhesiveAuditForm = lazy(() => import('./PMRFloorAdhesiveAuditForm'));
const CognitivePictogramAuditForm = lazy(() => import('./CognitivePictogramAuditForm'));
const StatsPage = lazy(() => import('./StatsPage'));


interface AppRouterProps {
    isStatsViewActive: boolean;
    // Data props
    lieux: Lieu[];
    selectedLieu: Lieu | null | undefined;
    selectedModule: AuditModule | null | undefined;
    selectedStation: Station | null | undefined;
    selectedDirection: Direction | null | undefined;
    selectedDat: DAT | null | undefined;
    selectedPrZone: PrZone | null | undefined;
    selectedEquipment: Equipment | null | undefined;
    selectedEca: ECA | null | undefined;
    
    // Handlers and state from App/Zustand
    // This allows the router to be stateless and just handle rendering logic
    // while the main App component manages all state logic.
    activeFilter: any;
    setActiveFilter: any;
    setIsStatsViewActive: any;
    selectLieu: any;
    selectModule: any;
    selectStation: any;
    selectDirection: any;
    selectDat: any;
    selectPrZone: any;
    selectEquipment: any;
    selectEca: any;
    
    handleDatStatusChange: any;
    handleDatCommentChange: any;
    handleResetDatRequest: any;
    handleAddDat: any;
    handleRemoveDat: any;
    handleUpdateDatName: any;

    handlePrAdhesiveStatusChange: any;
    handlePrAdhesiveCommentChange: any;
    handleResetPrAdhesiveRequest: any;

    handleEcaAdhesiveStatusChange: any;
    handleEcaAdhesiveCommentChange: any;
    handleResetEcaAdhesiveRequest: any;
    handleSetEcaNotApplicable: any;
    handleAddEca: any;
    handleUpdateEca: any;
    handleRemoveEca: any;

    handlePmrFloorAdhesiveStatusChange: any;
    handlePmrFloorAdhesiveCommentChange: any;
    handlePmrFloorAdhesivePhotoChange: any;
    handlePmrFloorAdhesivePhotoNoteChange: any;
    handlePmrFloorAdhesivePhotoRotationChange: any;
    handleResetPmrFloorAdhesiveRequest: any;

    handleCognitivePictogramStatusChange: any;
    handleCognitivePictogramCommentChange: any;
    handleResetCognitivePictogramRequest: any;
    handleAddCognitivePictogramAccessPoint: any;
    handleRemoveCognitivePictogramAccessPoint: any;
    handleUpdateCognitivePictogramAccessPointName: any;

    handleSignaletiqueStatusChange: any;
    handleSignaletiqueCommentChange: any;
    handleSignaletiquePhotoChange: any;
    handleSignaletiqueStationCommentChange: any;
    onPhotoNoteChange: any;
    onPhotoRotationChange: any;
    onFieldChange: any;
    handleResetSignaletiqueRequest: any;
    setIsSignaletiqueActive: any;
    isSignaletiqueActive: boolean;

    onExportByCategory: any;
    onExportByModuleType: any;
    onExportAll: any;
    onExportCurrentView: any;
    onExportJson: any;
    onImportJson: any;
    onResetCategory: any;
    onResetByModuleType: any;
    onResetAll: any;
    onRequestLogout: any;
}

const AppRouter: React.FC<AppRouterProps> = (props) => {
    const {
        isStatsViewActive, isSignaletiqueActive, lieux, selectedLieu, selectedModule, selectedStation, selectedDirection,
        selectedDat, selectedPrZone, selectedEquipment, selectedEca, ...handlers
    } = props;

    // TRAM lieux = T1 stations + LAE (AEROPORT) branch — both use TramDirectionSelector flow
    const isTramLieu = selectedLieu?.modules.some(m => m.line === 'TRAM' || m.line === 'AEROPORT') ?? false;

    if (isStatsViewActive) {
        return <StatsPage lieux={lieux} onBack={() => handlers.setIsStatsViewActive(false)} />;
    }

    // Signaletique Audit Form
    if (selectedModule?.type === AuditModuleType.SIGNALETIQUE && selectedDirection) {
        const station = (selectedModule.data as ModeData).stations[0];
        return <SignaletiqueAuditForm
            module={selectedModule}
            station={station}
            direction={selectedDirection}
            onStatusChange={handlers.handleSignaletiqueStatusChange}
            onCommentChange={handlers.handleSignaletiqueCommentChange}
            onPhotoChange={handlers.handleSignaletiquePhotoChange}
            onFieldChange={handlers.onFieldChange}
            onStationCommentChange={handlers.handleSignaletiqueStationCommentChange}
            onReset={handlers.handleResetSignaletiqueRequest}
            onBack={() => handlers.selectModule(null)}
        />;
    }

    // --- DEEPEST LEVEL: AUDIT FORMS ---

    // P+R Audit Form
    if (selectedModule?.type === AuditModuleType.PR && selectedPrZone && selectedEquipment) {
        return <PnrAdhesiveAuditForm
            module={selectedModule}
            equipment={selectedEquipment}
            prName={(selectedModule.data as Pr).name}
            onStatusChange={handlers.handlePrAdhesiveStatusChange}
            onCommentChange={handlers.handlePrAdhesiveCommentChange}
            onReset={handlers.handleResetPrAdhesiveRequest}
            onBack={() => handlers.selectEquipment(null)}
        />;
    }

    // ECA Audit Form or Decision Screen
    if (selectedModule?.type === AuditModuleType.ECA && selectedEca) {
        const isJauresPMR = (selectedModule.data as EcaData).stationName === 'Jean-Jaurès' && isPmrEcaType(selectedEca.type);
        if (canEcaBeNotApplicable(selectedEca.type) && typeof selectedEca.isNotApplicable === 'undefined' && !isJauresPMR) {
            return <EcaTripodeSortieDecision
                module={selectedModule}
                eca={selectedEca}
                stationName={(selectedModule.data as EcaData).stationName}
                onBack={() => handlers.selectEca(null)}
                onConfirmNA={() => handlers.handleSetEcaNotApplicable(true)}
                onAudit={() => handlers.handleSetEcaNotApplicable(false)}
            />;
        }
        return <EcaAdhesiveAuditForm
            module={selectedModule}
            eca={selectedEca}
            stationName={(selectedModule.data as EcaData).stationName}
            onStatusChange={handlers.handleEcaAdhesiveStatusChange}
            onCommentChange={handlers.handleEcaAdhesiveCommentChange}
            onReset={handlers.handleResetEcaAdhesiveRequest}
            onBack={() => handlers.selectEca(null)}
        />;
    }

    // DAT Audit Form
    if (selectedModule?.type === AuditModuleType.DAT && selectedStation && selectedDirection && selectedDat) {
         return <AdhesiveAuditForm
            module={selectedModule}
            dat={selectedDat}
            station={selectedStation}
            direction={selectedDirection}
            onStatusChange={handlers.handleDatStatusChange}
            onCommentChange={handlers.handleDatCommentChange}
            onReset={handlers.handleResetDatRequest}
            onBack={() => handlers.selectDat(null)}
        />
    }

    // PMR Floor Adhesive Form
    if (selectedModule?.type === AuditModuleType.PMR_FLOOR_ADHESIVE) {
        return <PMRFloorAdhesiveAuditForm
            module={selectedModule}
            onStatusChange={handlers.handlePmrFloorAdhesiveStatusChange}
            onCommentChange={handlers.handlePmrFloorAdhesiveCommentChange}
            onPhotoChange={handlers.handlePmrFloorAdhesivePhotoChange}
            onPhotoNoteChange={handlers.handlePmrFloorAdhesivePhotoNoteChange}
            onPhotoRotationChange={handlers.handlePmrFloorAdhesivePhotoRotationChange}
            onReset={handlers.handleResetPmrFloorAdhesiveRequest}
            onBack={() => handlers.selectModule(null)}
        />
    }

    // Cognitive Pictogram Form
    if (selectedModule?.type === AuditModuleType.COGNITIVE_PICTOGRAMS) {
        return <CognitivePictogramAuditForm
            module={selectedModule}
            onStatusChange={handlers.handleCognitivePictogramStatusChange}
            onCommentChange={handlers.handleCognitivePictogramCommentChange}
            onReset={handlers.handleResetCognitivePictogramRequest}
            onAddAccessPoint={handlers.handleAddCognitivePictogramAccessPoint}
            onRemoveAccessPoint={handlers.handleRemoveCognitivePictogramAccessPoint}
            onUpdateAccessPointName={handlers.handleUpdateCognitivePictogramAccessPointName}
            onBack={() => handlers.selectModule(null)}
        />
    }

    // --- INTERMEDIATE SELECTION SCREENS ---

    // P+R Equipment Selector
    if (selectedModule?.type === AuditModuleType.PR && selectedPrZone) {
        const prData = selectedModule.data as Pr;
        const handleBack = () => {
            if (prData.zones.length > 1) {
                handlers.selectPrZone(null); // Go back to zone selector for multi-zone P+R
            } else {
                handlers.selectModule(null); // Go back to module selector for single-zone P+R
            }
        };
        return <EquipmentSelector lieu={selectedLieu!} prData={prData} zone={selectedPrZone} onSelectEquipment={handlers.selectEquipment} onBack={handleBack} />;
    }
    
    // P+R Zone Selector
    if (selectedModule?.type === AuditModuleType.PR) {
        return <PrZoneSelector lieu={selectedLieu!} module={selectedModule} onSelectZone={handlers.selectPrZone} onBack={() => handlers.selectModule(null)} />;
    }
    
    // ECA Selector
    if (selectedModule?.type === AuditModuleType.ECA) {
        return <EcaSelector
            module={selectedModule}
            onSelectEca={handlers.selectEca}
            onBack={() => handlers.selectModule(null)}
            onAddEca={handlers.handleAddEca}
            onUpdateEca={handlers.handleUpdateEca}
            onRemoveEca={handlers.handleRemoveEca}
        />;
    }

    // DAT List (after selecting a direction)
    // Guard: ensure selectedStation + selectedDirection actually belong to this module
    // (at shared TRAM+Métro lieux, TramDirectionSelector sets TRAM ids that don't match a Métro module)
    const datStationInModule = selectedModule?.type === AuditModuleType.DAT && selectedStation
        ? (selectedModule.data as ModeData).stations.find(s => s.id === selectedStation.id) ?? null
        : null;
    const datDirectionInModule = datStationInModule && selectedDirection
        ? datStationInModule.directions.find(d => d.id === selectedDirection.id) ?? null
        : null;

    if (selectedModule?.type === AuditModuleType.DAT && datStationInModule && datDirectionInModule) {
        const stationDirections = datStationInModule.directions;
        const backFromDatList = () => {
            if (isTramLieu) return handlers.selectModule(null);
            if (stationDirections.length <= 1) return handlers.selectModule(null);
            return handlers.selectDirection(null);
        };
        return <DATList
            module={selectedModule}
            station={selectedStation}
            direction={selectedDirection}
            onSelectDat={handlers.selectDat}
            onAddDat={handlers.handleAddDat}
            onRemoveDat={handlers.handleRemoveDat}
            onUpdateDatName={handlers.handleUpdateDatName}
            onBack={backFromDatList}
        />;
    }

    // --- TOP LEVEL: LIEU SELECTOR (DASHBOARD) ---
    if (!selectedLieu) {
        return <LieuSelector
            lieux={lieux}
            onSelectLieu={handlers.selectLieu}
            activeFilter={handlers.activeFilter}
            onFilterChange={handlers.setActiveFilter}
            onExportByCategory={handlers.onExportByCategory}
            onExportByModuleType={handlers.onExportByModuleType}
            onExportAll={handlers.onExportAll}
            onExportCurrentView={handlers.onExportCurrentView}
            onExportJson={handlers.onExportJson}
            onImportJson={handlers.onImportJson}
            onResetCategory={handlers.onResetCategory}
            onResetByModuleType={handlers.onResetByModuleType}
            onResetAll={handlers.onResetAll}
            onRequestLogout={handlers.onRequestLogout}
        />;
    }

    // Tram Direction Selector (after selecting a lieu, before module)
    if (isTramLieu && !selectedDirection) {
        return <TramDirectionSelector
            lieu={selectedLieu}
            onSelectStation={handlers.selectStation}
            onSelectDirection={handlers.selectDirection}
            onBack={() => handlers.selectLieu(null)}
        />;
    }

    // Module Selector (after selecting a lieu and direction if tram)
    if (!selectedModule) {
        return <ModuleSelector 
            lieu={selectedLieu} 
            onSelectModule={handlers.selectModule} 
            onBack={() => {
                if (isTramLieu) {
                    handlers.selectDirection(null);
                } else {
                    handlers.selectLieu(null);
                }
            }} 
        />;
    }

    // DAT Station/Direction Selector:
    // - if no direction yet, OR
    // - if direction/station are set but don't belong to this module (shared TRAM+Métro lieux)
    if (selectedModule.type === AuditModuleType.DAT && (!datDirectionInModule || !datStationInModule)) {
        // When navigating from a different module at a shared lieu, reset station+direction first
        const stationForSelector = datStationInModule ? selectedStation : null;
        return <DatGroupSelector
            module={selectedModule}
            station={stationForSelector}
            onSelectStation={handlers.selectStation}
            onSelectDirection={handlers.selectDirection}
            onBack={() => handlers.selectModule(null)}
        />;
    }

    return null; // Should be handled by forms above
};

export default AppRouter;