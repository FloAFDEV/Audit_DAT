import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { pageVariants } from './hooks/motion/transitions';
import useAuditStore from './store';
import Login from './components/Login';
import AppRouter from './components/AppRouter';
import { Breadcrumbs } from './components/Breadcrumbs';
import { AuditModuleType, Pr, EcaData, ModeData, Lieu, AuditModule, Station, Direction, DAT, Equipment, ECA, AuditCategory, PMRFloorAdhesiveData, EcaEquipmentType, CognitivePictogramData, PrZone } from './types';
import ConfirmationModal from './components/ConfirmationModal';
import ReminderModal from './components/ReminderModal';
import AboutModal from './components/AboutModal';
import { Toaster } from 'react-hot-toast';
import { useAppHandlers } from './hooks/useAppHandlers';

// A simple loading spinner component
const Loader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900" role="status" aria-live="polite">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500" aria-label="Chargement en cours..."></div>
  </div>
);

// New success animation component as requested by the user.
const SuccessAnimation: React.FC = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <style>
            {`
            @keyframes fill-circle {
                to { stroke-dashoffset: 0; }
            }
            @keyframes draw-check {
                to { stroke-dashoffset: 0; }
            }
            `}
        </style>
        <svg className="w-32 h-32" viewBox="0 0 120 120">
            {/* Circle background */}
            <circle cx="60" cy="60" r="54" fill="none" stroke="#e0e0e0" strokeOpacity="0.5" strokeWidth="8" />

            {/* Animated filling circle. */}
            <circle
                className="text-teal-500"
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{
                    strokeDasharray: 339.292,
                    strokeDashoffset: 339.292,
                    animation: 'fill-circle 1s ease-in-out 0.2s forwards',
                }}
            />

            {/* Hand-drawn-style checkmark path */}
            <path
                d="M 38 62 L 55 78 L 82 50"
                fill="none"
                stroke="white"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                    strokeDasharray: 100,
                    strokeDashoffset: 100,
                    animation: 'draw-check 0.5s ease-in-out 1.2s forwards',
                }}
            />
        </svg>
    </div>
);

const App: React.FC = () => {
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    
    // State selectors from Zustand store
    const store = useAuditStore();

    // Initialize data on app load
    useEffect(() => {
        console.log(
            "%cAuditRef %c- Propriété de Florent Perez.",
            "color: #6366F1; font-weight: bold; font-size: 1.2em;",
            "color: initial; font-weight: normal; font-size: 1em;"
        );
        console.log("Contact: florent.perez@tisseo.fr ou 72 76");
        store.init();
    }, [store.init]);

    // FIX: Correctly destructure the return value of useAppHandlers. The original error was caused by a type inference failure within the hook itself, which is now fixed.
    const {
        showSuccessAnimation,
        handlers,
        modalState,
    } = useAppHandlers();
    
    // --- Data selection logic using useMemo for performance ---
    const selectedLieu = useMemo(() => store.lieux.find(l => l.id === store.selectedLieuId), [store.lieux, store.selectedLieuId]);
    const selectedModule = useMemo(() => selectedLieu?.modules.find(m => m.id === store.selectedModuleId), [selectedLieu, store.selectedModuleId]);
    
    // DAT/Signaletique flow data
    const selectedStation = useMemo(() => {
        if (!selectedLieu || !store.selectedStationId) return null;
        
        // Prioritize the station from the currently selected module if it's a DAT or SIGNALETIQUE module
        if (selectedModule?.type === AuditModuleType.DAT || selectedModule?.type === AuditModuleType.SIGNALETIQUE) {
            const modeData = selectedModule.data as ModeData;
            const station = modeData.stations.find((s: Station) => s.id === store.selectedStationId);
            if (station) return station;
        }

        // Fallback: Find the station in any module that has stations (DAT or SIGNALETIQUE)
        for (const module of selectedLieu.modules) {
            if (module.type === AuditModuleType.DAT || module.type === AuditModuleType.SIGNALETIQUE) {
                const modeData = module.data as ModeData;
                const station = modeData.stations.find((s: Station) => s.id === store.selectedStationId);
                if (station) return station;
            }
        }
        return null;
    }, [selectedLieu, selectedModule, store.selectedStationId]);

    const selectedDirection = useMemo(() => {
        if (!selectedStation || !store.selectedDirectionId) return null;
        return selectedStation.directions.find((d: Direction) => d.id === store.selectedDirectionId);
    }, [selectedStation, store.selectedDirectionId]);
    const selectedDat = useMemo(() => selectedDirection?.dats.find((d: DAT) => d.id === store.selectedDatId), [selectedDirection, store.selectedDatId]);

    // P+R flow data
    const selectedPrData = useMemo(() => (selectedModule?.type === AuditModuleType.PR ? selectedModule.data as Pr : null), [selectedModule]);
    const selectedPrZone = useMemo(() => selectedPrData?.zones.find(z => z.id === store.selectedPrZoneId), [selectedPrData, store.selectedPrZoneId]);
    const selectedEquipment = useMemo(() => selectedPrZone?.equipments.find(e => e.id === store.selectedEquipmentId), [selectedPrZone, store.selectedEquipmentId]);

    // ECA flow data
    const selectedEcaData = useMemo(() => (selectedModule?.type === AuditModuleType.ECA ? selectedModule.data as EcaData : null), [selectedModule]);
    const selectedEca = useMemo(() => selectedEcaData?.ecas.find(e => e.id === store.selectedEcaId), [selectedEcaData, store.selectedEcaId]);

    const handleLogoutConfirm = () => {
        store.logout();
        setIsLogoutModalOpen(false);
    };

    // --- Render logic ---
    if (store.isLoading) {
        return <Loader />;
    }

    if (!store.isAuthenticated) {
        return <Login onLoginSuccess={store.login} />;
    }
    
    return (
        <main className="bg-slate-50 dark:bg-slate-900 min-h-screen flex flex-col">
            {showSuccessAnimation && <SuccessAnimation />}
            <Toaster position="top-center" reverseOrder={false} toastOptions={{ style: { background: 'transparent', boxShadow: 'none', padding: 0 } }} />
            <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6 flex-grow">
                <div className="mb-6">
                    <Breadcrumbs
                        isStatsPage={store.isStatsViewActive}
                        lieu={selectedLieu}
                        module={selectedModule}
                        station={selectedStation}
                        direction={selectedDirection}
                        dat={selectedDat}
                        prZone={selectedPrZone}
                        equipment={selectedEquipment}
                        eca={selectedEca}
                        onNavigate={store.navigate}
                    />
                </div>
                 <Suspense fallback={<Loader />}>
                  <AnimatePresence mode="wait">
                    <motion.div
                        key={`${store.isStatsViewActive}|${store.selectedLieuId}|${store.selectedModuleId}|${store.selectedStationId}|${store.selectedDirectionId}|${store.selectedDatId}|${store.selectedPrZoneId}|${store.selectedEquipmentId}|${store.selectedEcaId}|${store.isSignaletiqueActive}`}
                        variants={pageVariants}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                    >
                    <AppRouter
                        isStatsViewActive={store.isStatsViewActive}
                        isSignaletiqueActive={store.isSignaletiqueActive}
                        // Pass selected data
                        lieux={store.lieux}
                        selectedLieu={selectedLieu}
                        selectedModule={selectedModule}
                        selectedStation={selectedStation}
                        selectedDirection={selectedDirection}
                        selectedDat={selectedDat}
                        selectedPrZone={selectedPrZone}
                        selectedEquipment={selectedEquipment}
                        selectedEca={selectedEca}
                        // Pass state and handlers
                        {...store}
                        // Pass request handlers separately from the hook
                        handleResetDatRequest={() => handlers.handleResetDatRequest(selectedDat)}
                        handleResetPrAdhesiveRequest={() => handlers.handleResetPrAdhesiveRequest(selectedEquipment)}
                        handleResetEcaAdhesiveRequest={() => handlers.handleResetEcaAdhesiveRequest(selectedEca)}
                        handleResetPmrFloorAdhesiveRequest={() => handlers.handleResetPmrFloorAdhesiveRequest(selectedModule)}
                        handleResetCognitivePictogramRequest={() => handlers.handleResetCognitivePictogramRequest(selectedModule)}
                        handleResetSignaletiqueRequest={() => handlers.handleResetSignaletiqueRequest(selectedStation)}
                        handleSignaletiqueStatusChange={handlers.handleSignaletiqueStatusChange}
                        handleSignaletiqueCommentChange={handlers.handleSignaletiqueCommentChange}
                        handleSignaletiquePhotoChange={handlers.handleSignaletiquePhotoChange}
                        handleSignaletiqueStationCommentChange={handlers.handleSignaletiqueStationCommentChange}
                        onPhotoNoteChange={handlers.handleSignaletiquePhotoNoteChange}
                        onPhotoRotationChange={handlers.handleSignaletiquePhotoRotationChange}
                        onFieldChange={handlers.handleSignaletiqueFieldChange}
                        setIsSignaletiqueActive={handlers.setIsSignaletiqueActive}
                        onExportByCategory={handlers.handleExportByCategory}
                        onExportByModuleType={handlers.handleExportByModuleType}
                        onExportAll={handlers.handleExportAll}
                        onExportCurrentView={handlers.handleExportCurrentView}
                        onExportJson={handlers.handleExportJson}
                        onImportJson={handlers.handleImportJson}
                        onResetCategory={handlers.handleResetCategoryRequest}
                        onResetByModuleType={handlers.handleResetByModuleTypeRequest}
                        onResetAll={handlers.handleResetAllRequest}
                        onRequestLogout={() => setIsLogoutModalOpen(true)}
                    />
                    </motion.div>
                  </AnimatePresence>
                </Suspense>
            </div>
      <footer className="text-center py-8 text-slate-500 dark:text-slate-400 text-[10px] font-light tracking-wider uppercase">
        <p>
          AuditRef &copy; {new Date().getFullYear()} - Tous droits réservés |{" "}
          <a
            href="mailto:florent.perez@tisseo.fr"
            className="text-indigo-500 hover:underline font-normal"
          >
            Contact
          </a>{" "}
          | 72 76 |{" "}
          <button
            onClick={() => setIsAboutModalOpen(true)}
            className="text-indigo-500 hover:underline font-normal uppercase tracking-wider"
          >
            À propos
          </button>
        </p>
      </footer>
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
             <ConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogoutConfirm}
                title="Confirmation de déconnexion"
                message="Êtes-vous sûr de vouloir vous déconnecter ? Vous serez redirigé vers l'écran de connexion."
            />
            {modalState.reminderOptions && modalState.pendingExport && (
                 <ReminderModal
                    isOpen={modalState.isReminderModalOpen}
                    onClose={modalState.handleCancelExport}
                    onConfirm={modalState.handleConfirmAndGenerateReminder}
                    onSkip={modalState.handleSkipReminderAndExport}
                    fileName={modalState.pendingExport.fileName}
                    initialDate={modalState.reminderOptions.initialDate}
                    titlePrefix={modalState.reminderOptions.titlePrefix}
                    titleSubject={modalState.reminderOptions.titleSubject}
                    reminderDescription={modalState.reminderOptions.reminderDescription}
                    categoryConfig={modalState.pendingExport.categoryConfig}
                />
            )}
        </main>
    );
};

export default App;