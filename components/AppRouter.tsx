import React, { lazy, useEffect } from 'react';
import { Lieu, AuditModule, Station, Direction, DAT, Equipment, ECA, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData, PrZone } from '../types';
import LieuSelector from './LieuSelector';
import { isPmrEcaType, canEcaBeNotApplicable } from '../data/eca_data';

// Dynamically import components for code splitting
const ModuleSelector = lazy(() => import('./ModuleSelector'));
const DatGroupSelector = lazy(() => import('./DatGroupSelector'));
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

    // Retour depuis un écran situé APRÈS le choix de direction (DATList, SignaletiqueAuditForm).
    // Règle décrémentale d'un seul cran, identique au fil d'Ariane et à DatGroupSelector.handleBack :
    //   - si la station a plusieurs directions → revient à l'écran de choix de direction ;
    //   - si elle n'en a qu'une (direction auto-sélectionnée) → revient au module, comme aujourd'hui.
    // Appelé uniquement depuis des branches où selectedModule/selectedStation sont non-nuls.
    const backFromDirectionLevel = () => {
        const stations = (selectedModule!.data as ModeData).stations;
        const currentStation = stations.find(s => s.id === selectedStation?.id);
        if (currentStation && currentStation.directions.length > 1) {
            handlers.selectDirection(null);
        } else {
            handlers.selectModule(null);
        }
    };

    if (isStatsViewActive) {
        return <StatsPage lieux={lieux} onBack={() => handlers.setIsStatsViewActive(false)} />;
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
    if (selectedModule?.type === AuditModuleType.DAT && selectedStation && selectedDirection) {
        return <DATList
            module={selectedModule}
            station={selectedStation}
            direction={selectedDirection}
            onSelectDat={handlers.selectDat}
            onAddDat={handlers.handleAddDat}
            onRemoveDat={handlers.handleRemoveDat}
            onUpdateDatName={handlers.handleUpdateDatName}
            onBack={backFromDirectionLevel}
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

    // Module Selector (after selecting a lieu)
    if (!selectedModule) {
        return <ModuleSelector 
            lieu={selectedLieu!} 
            onSelectModule={handlers.selectModule} 
            onBack={() => handlers.selectLieu(null)} 
        />;
    }

    // --- DIRECTION SELECTION FOR MODULES ---

    // DAT Station/Direction Selector (if DAT selected and no direction yet)
    if (selectedModule.type === AuditModuleType.DAT && !selectedDirection) {
        // Auto-select station if missing (DAT modules are 1:1 with stations)
        if (!selectedStation && (selectedModule.data as ModeData).stations.length === 1) {
            const onlyStation = (selectedModule.data as ModeData).stations[0];
            handlers.selectStation(onlyStation.id);
            return null;
        }

        return <DatGroupSelector
            module={selectedModule}
            station={selectedStation}
            onSelectStation={handlers.selectStation}
            onSelectDirection={handlers.selectDirection}
            onBack={() => handlers.selectModule(null)}
        />;
    }

    // Signaletique Direction Selector (if no direction yet)
    if (selectedModule.type === AuditModuleType.SIGNALETIQUE && !selectedDirection) {
        // Auto-select station if missing (Signaletique modules are 1:1 with stations)
        if (!selectedStation && (selectedModule.data as ModeData).stations.length === 1) {
            const onlyStation = (selectedModule.data as ModeData).stations[0];
            handlers.selectStation(onlyStation.id);
            return null;
        }

        return <DatGroupSelector
            module={selectedModule}
            station={selectedStation}
            onSelectStation={handlers.selectStation}
            onSelectDirection={handlers.selectDirection}
            onBack={() => handlers.selectModule(null)}
            title="Choisir la direction de l'audit"
            hideProgress
        />;
    }

    // --- FINAL AUDIT FORMS ---

    // Signaletique Audit Form
    if (selectedModule?.type === AuditModuleType.SIGNALETIQUE) {
        const modeData = selectedModule.data as ModeData;
        const station = modeData.stations?.[0];
        if (!station) {
            console.error("No station found for Signaletique module:", selectedModule.id);
            return (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <p className="text-red-500 mb-4 font-medium">Erreur : Données de station manquantes pour ce module.</p>
                    <button onClick={() => handlers.selectModule(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Retour</button>
                </div>
            );
        }
        return <SignaletiqueAuditForm
            module={selectedModule}
            station={station}
            direction={selectedDirection}
            onSelectDirection={handlers.selectDirection}
            onStatusChange={handlers.handleSignaletiqueStatusChange}
            onFieldChange={handlers.onFieldChange}
            onCommentChange={handlers.handleSignaletiqueCommentChange}
            onPhotoChange={handlers.handleSignaletiquePhotoChange}
            onStationCommentChange={handlers.handleSignaletiqueStationCommentChange}
            onReset={handlers.handleResetSignaletiqueRequest}
            onBack={backFromDirectionLevel}
        />;
    }

    return null; // Should be handled by forms above
};

export default AppRouter;