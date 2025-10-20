import React from 'react';
import { Lieu, AuditModule, Station, Direction, DAT, Equipment, ECA, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, CognitivePictogramData } from '../types';
import useAuditStore from '../store'; // Import store to get handlers
import LieuSelector from './LieuSelector';
import ModuleSelector from './ModuleSelector';
import DatGroupSelector from './DatGroupSelector';
import DATList from './DATList';
import AdhesiveAuditForm from './AdhesiveAuditForm';
import EquipmentSelector from './EquipmentSelector';
import PnrAdhesiveAuditForm from './PnrAdhesiveAuditForm';
import EcaSelector from './EcaSelector';
import EcaAdhesiveAuditForm from './EcaAdhesiveAuditForm';
import EcaTripodeSortieDecision from './EcaTripodeSortieDecision';
import PMRFloorAdhesiveAuditForm from './PMRFloorAdhesiveAuditForm';
import CognitivePictogramAuditForm from './CognitivePictogramAuditForm';
import { isPmrEcaType, canEcaBeNotApplicable } from '../data/eca_data';

interface AppRouterProps {
    // Data props
    lieux: Lieu[];
    selectedLieu: Lieu | null | undefined;
    selectedModule: AuditModule | null | undefined;
    selectedStation: Station | null | undefined;
    selectedDirection: Direction | null | undefined;
    selectedDat: DAT | null | undefined;
    selectedEquipment: Equipment | null | undefined;
    selectedEca: ECA | null | undefined;
    
    // Handlers and state from App/Zustand
    // This allows the router to be stateless and just handle rendering logic
    // while the main App component manages all state logic.
    activeFilter: any;
    setActiveFilter: any;
    selectLieu: any;
    selectModule: any;
    selectStation: any;
    selectDirection: any;
    selectDat: any;
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
        lieux, selectedLieu, selectedModule, selectedStation, selectedDirection,
        selectedDat, selectedEquipment, selectedEca, ...handlers
    } = props;

    // --- DEEPEST LEVEL: AUDIT FORMS ---

    // P+R Audit Form
    if (selectedModule && selectedEquipment) {
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
    if (selectedModule && selectedEca) {
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
    if (selectedModule && selectedStation && selectedDirection && selectedDat) {
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
    if (selectedModule?.type === AuditModuleType.PR) {
        return <EquipmentSelector module={selectedModule} onSelectEquipment={handlers.selectEquipment} onBack={() => handlers.selectModule(null)} />;
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
    if (selectedModule && selectedStation && selectedDirection) {
        return <DATList
            module={selectedModule}
            station={selectedStation}
            direction={selectedDirection}
            onSelectDat={handlers.selectDat}
            onAddDat={handlers.handleAddDat}
            onRemoveDat={handlers.handleRemoveDat}
            onUpdateDatName={handlers.handleUpdateDatName}
            onBack={() => handlers.selectDirection(null)}
        />;
    }

    // DAT Station/Direction Selector
    if (selectedModule?.type === AuditModuleType.DAT) {
         return <DatGroupSelector
            module={selectedModule}
            station={selectedStation}
            onSelectStation={handlers.selectStation}
            onSelectDirection={handlers.selectDirection}
            onBack={() => handlers.selectModule(null)}
        />;
    }

    // Module Selector (after selecting a lieu)
    if (selectedLieu) {
        return <ModuleSelector lieu={selectedLieu} onSelectModule={handlers.selectModule} onBack={() => handlers.selectLieu(null)} />;
    }

    // --- TOP LEVEL: LIEU SELECTOR (DASHBOARD) ---
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
};

export default AppRouter;
