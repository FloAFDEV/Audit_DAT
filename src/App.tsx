

import React, { useEffect, useMemo, useState } from 'react';
import useAuditStore from './store';
import Login from './components/Login';
import LieuSelector from './components/LieuSelector';
import ModuleSelector from './components/ModuleSelector';
import DatGroupSelector from './components/DatGroupSelector';
import DATList from './components/DATList';
import AdhesiveAuditForm from './components/AdhesiveAuditForm';
import EquipmentSelector from './components/EquipmentSelector';
import PnrAdhesiveAuditForm from './components/PnrAdhesiveAuditForm';
import { Breadcrumbs } from './components/Breadcrumbs';
import { AuditModuleType, Pr, EcaData, ModeData, Lieu, AuditModule, Station, Direction, DAT, Equipment, ECA, AuditCategory, PMRFloorAdhesiveData } from './types';
import EcaSelector from './components/EcaSelector';
import EcaAdhesiveAuditForm from './components/EcaAdhesiveAuditForm';
import PMRFloorAdhesiveAuditForm from './components/PMRFloorAdhesiveAuditForm';
import { getLieuxForCategory } from './data/builder';
import { exportLieuxToCsv, exportLieuxToJson, sortLieuxByPhysicalOrder } from './utils/csvExporter';
import ConfirmationModal from './components/ConfirmationModal';
import { Toaster } from 'react-hot-toast';
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { AUDIT_CATEGORIES } from './data/config';
import { CategoryIcon } from './components/CategoryIcon';
// FIX: Imported `showErrorToast` to handle simple error notifications consistently.
import { showPromiseToast, showSuccessToast, showErrorToast } from './components/ToastManager';


// A simple loading spinner component
const Loader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
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
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    
    // State selectors from Zustand store
    const {
        lieux,
        isLoading,
        isAuthenticated,
        init,
        login,
        logout,
        // Navigation state
        activeFilter,
        selectedLieuId,
        selectedModuleId,
        selectedStationId,
        selectedDirectionId,
        selectedDatId,
        selectedEquipmentId,
        selectedEcaId,
        // Navigation actions
        setActiveFilter,
        selectLieu,
        selectModule,
        selectStation,
        selectDirection,
        selectDat,
        selectEquipment,
        selectEca,
        navigate,
        // DAT actions
        handleDatStatusChange,
        handleDatCommentChange,
        handleResetDat,
        handleAddDat,
        handleRemoveDat,
        handleUpdateDatName,
        // P+R actions
        handlePrAdhesiveStatusChange,
        handlePrAdhesiveCommentChange,
        handleResetPrAdhesive,
        // ECA actions
        handleEcaAdhesiveStatusChange,
        handleEcaAdhesiveCommentChange,
        handleResetEcaAdhesive,
        // PMR Floor Adhesive actions
        handlePmrFloorAdhesiveStatusChange,
        handleResetPmrFloorAdhesive,
        // Reset Actions
        handleResetCategory,
        handleResetAll,
        // Import/Export
        handleImportJsonData,
    } = useAuditStore();

    // Initialize data on app load
    useEffect(() => {
      console.log(
            "%cAuditRef %c- Propriété de Florent Perez.",
            "color: #6366F1; font-weight: bold; font-size: 1.2em;",
            "color: initial; font-weight: normal; font-size: 1em;"
        );
        console.log("Contact: florent.perez@tisseo.fr ou 72 76");
        init();
    }, [init]);
    
    // --- Data selection logic using useMemo for performance ---
    const selectedLieu = useMemo(() => lieux.find(l => l.id === selectedLieuId), [lieux, selectedLieuId]);
    const selectedModule = useMemo(() => selectedLieu?.modules.find(m => m.id === selectedModuleId), [selectedLieu, selectedModuleId]);
    
    // DAT flow data
    const selectedStation = useMemo(() => {
        if (selectedModule?.type !== AuditModuleType.DAT) return null;
        return (selectedModule.data as ModeData).stations.find((s: Station) => s.id === selectedStationId);
    }, [selectedModule, selectedStationId]);

    const selectedDirection = useMemo(() => selectedStation?.directions.find((d: Direction) => d.id === selectedDirectionId), [selectedStation, selectedDirectionId]);
    const selectedDat = useMemo(() => selectedDirection?.dats.find((d: DAT) => d.id === selectedDatId), [selectedDirection, selectedDatId]);

    // P+R flow data
    const selectedPrData = useMemo(() => (selectedModule?.type === AuditModuleType.PR ? selectedModule.data as Pr : null), [selectedModule]);
    const selectedEquipment = useMemo(() => selectedPrData?.equipments.find(e => e.id === selectedEquipmentId), [selectedPrData, selectedEquipmentId]);

    // ECA flow data
    const selectedEcaData = useMemo(() => (selectedModule?.type === AuditModuleType.ECA ? selectedModule.data as EcaData : null), [selectedModule]);
    const selectedEca = useMemo(() => selectedEcaData?.ecas.find(e => e.id === selectedEcaId), [selectedEcaData, selectedEcaId]);

    const handleLogoutConfirm = () => {
        logout();
        setIsLogoutModalOpen(false);
    };
    
    const triggerSuccessAnimation = () => {
        setShowSuccessAnimation(true);
        setTimeout(() => {
            setShowSuccessAnimation(false);
        }, 2200); // Animation duration is ~1.7s, so 2.2s is a good total display time.
    };


    const showExportSuccessToast = (message: string, categoryKey?: AuditCategory) => {
        const categoryConfig = categoryKey ? AUDIT_CATEGORIES.find(c => c.key === categoryKey) : undefined;
        
        const icon = categoryConfig ? (
            <CategoryIcon categoryConfig={categoryConfig} size="md" />
        ) : (
            <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
            </div>
        );

        showSuccessToast({
            icon,
            title: 'Exportation réussie',
            message,
        });

        triggerSuccessAnimation();
    };

    // --- Render logic ---
    if (isLoading) {
        return <Loader />;
    }

    if (!isAuthenticated) {
        return <Login onLoginSuccess={login} />;
    }
    
    const handleExportByCategory = (category: AuditCategory) => {
        console.log(`Exporting category: ${category}`);
        const filteredLieux = getLieuxForCategory(lieux, category);
        const sortedLieux = sortLieuxByPhysicalOrder(filteredLieux);
        exportLieuxToCsv(sortedLieux, `export-categorie-${category}.csv`);
        const categoryLabel = AUDIT_CATEGORIES.find(c => c.key === category)?.label || category;
        showExportSuccessToast(`La catégorie "${categoryLabel}" a été exportée.`, category);
    };
    
    const handleExportByModuleType = (moduleType: AuditModuleType) => {
        console.log(`Exporting module type: ${moduleType}`);
        // Deep copy and filter modules within each lieu
        const filteredLieux = JSON.parse(JSON.stringify(lieux))
            .map((lieu: Lieu) => {
                lieu.modules = lieu.modules.filter(m => m.type === moduleType);
                return lieu;
            })
            .filter((lieu: Lieu) => lieu.modules.length > 0);
        
        const sortedLieux = sortLieuxByPhysicalOrder(filteredLieux);
        exportLieuxToCsv(sortedLieux, `export-module-${moduleType}.csv`);
        showExportSuccessToast(`Les audits de type "${moduleType}" ont été exportés.`);
    };

    const handleExportAll = () => {
        console.log("Exporting all data");
        const sortedLieux = sortLieuxByPhysicalOrder(lieux);
        exportLieuxToCsv(sortedLieux, 'export-complet.csv');
        showExportSuccessToast("Toutes les données ont été exportées.");
    };

    const handleExportJson = () => {
        const { success } = exportLieuxToJson(lieux);
        if (success) {
            showSuccessToast({
                icon: <div className="h-full w-full rounded-full bg-sky-500 flex items-center justify-center"><CheckCircle className="h-6 w-6 text-white" /></div>,
                title: 'Exportation JSON réussie',
                message: 'Le fichier de données a été téléchargé.',
            });
            triggerSuccessAnimation();
        } else {
            // FIX: Replaced `showPromiseToast` with `showErrorToast` to fix the TypeScript error.
            // This simplifies the code for showing a direct error message and is more idiomatic.
            showErrorToast({
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
                title: 'Erreur',
                message: "Échec de l'exportation JSON.",
            });
        }
    };

    const handleImportJson = (fileContent: string) => {
        const promise = handleImportJsonData(fileContent);

        showPromiseToast(
            promise,
            {
                icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
                title: "Importation en cours...",
                message: "Veuillez patienter.",
            },
            {
                icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>,
                title: "Importation réussie",
                message: "Les données ont été chargées.",
            },
            {
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
                title: "Erreur d'importation",
                message: "Le fichier est invalide ou corrompu.", // Generic message, specific one comes from promise rejection
            },
            triggerSuccessAnimation
        );
    };

    const handleResetCategoryRequest = (category: AuditCategory) => {
        const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category)!;
        const promise = handleResetCategory(category);

        showPromiseToast(
            promise,
            {
                icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
                title: "Réinitialisation en cours...",
                message: `Catégorie "${categoryConfig.label}"`,
            },
            {
                icon: <CategoryIcon categoryConfig={categoryConfig} size="md" />,
                title: "Réinitialisation terminée",
                message: `La catégorie "${categoryConfig.label}" a été réinitialisée.`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetAllRequest = () => {
        const promise = handleResetAll();
        
        showPromiseToast(
            promise,
            {
                icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
                title: "Réinitialisation en cours...",
                message: "Toutes les données sont en cours de réinitialisation.",
            },
            {
                icon: <div className="h-full w-full rounded-full bg-blue-500 flex items-center justify-center"><RefreshCw className="h-5 w-5 text-white" /></div>,
                title: "Réinitialisation terminée",
                message: "Toutes les données ont été réinitialisées.",
            },
            {
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetDatRequest = () => {
        const promise = handleResetDat();

        showPromiseToast(
            promise,
            {
                icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
                title: "Réinitialisation en cours...",
                message: `DAT : ${selectedDat?.name}`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>,
                title: "Réinitialisation terminée",
                message: `L'audit pour ${selectedDat?.name} a été réinitialisé.`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetPrAdhesiveRequest = () => {
        const promise = handleResetPrAdhesive();

        showPromiseToast(
            promise,
            {
                icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
                title: "Réinitialisation en cours...",
                message: `Équipement : ${selectedEquipment?.name}`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>,
                title: "Réinitialisation terminée",
                message: `L'audit pour ${selectedEquipment?.name} a été réinitialisé.`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetEcaAdhesiveRequest = () => {
        const promise = handleResetEcaAdhesive();

        showPromiseToast(
            promise,
            {
                icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
                title: "Réinitialisation en cours...",
                message: `ECA : ${selectedEca?.name}`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>,
                title: "Réinitialisation terminée",
                message: `L'audit pour ${selectedEca?.name} a été réinitialisé.`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetPmrFloorAdhesiveRequest = () => {
        const promise = handleResetPmrFloorAdhesive();
        const stationName = (selectedModule?.data as PMRFloorAdhesiveData)?.stationName || 'la station';

        showPromiseToast(
            promise,
            {
                icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
                title: "Réinitialisation en cours...",
                message: `Adhésifs Sol PMR : ${stationName}`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>,
                title: "Réinitialisation terminée",
                message: `Les adhésifs Sol PMR pour ${stationName} ont été réinitialisés.`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const renderContent = () => {
        // --- DEEPEST LEVEL: AUDIT FORMS ---

        // P+R Audit Form
        if (selectedModule && selectedEquipment) {
            return <PnrAdhesiveAuditForm 
                module={selectedModule}
                equipment={selectedEquipment}
                prName={(selectedModule.data as Pr).name}
                onStatusChange={handlePrAdhesiveStatusChange}
                onCommentChange={handlePrAdhesiveCommentChange}
                onReset={handleResetPrAdhesiveRequest}
                onBack={() => selectEquipment(null)}
            />;
        }

        // ECA Audit Form
        if (selectedModule && selectedEca) {
            return <EcaAdhesiveAuditForm 
                module={selectedModule}
                eca={selectedEca}
                stationName={(selectedModule.data as EcaData).stationName}
                onStatusChange={handleEcaAdhesiveStatusChange}
                onCommentChange={handleEcaAdhesiveCommentChange}
                onReset={handleResetEcaAdhesiveRequest}
                onBack={() => selectEca(null)}
            />;
        }

        // DAT Audit Form
        if (selectedModule && selectedStation && selectedDirection && selectedDat) {
             return <AdhesiveAuditForm 
                module={selectedModule}
                dat={selectedDat}
                station={selectedStation}
                direction={selectedDirection}
                onStatusChange={handleDatStatusChange}
                onCommentChange={handleDatCommentChange}
                onReset={handleResetDatRequest}
                onBack={() => selectDat(null)}
            />
        }

        // PMR Floor Adhesive Form
        if (selectedModule?.type === AuditModuleType.PMR_FLOOR_ADHESIVE) {
            return <PMRFloorAdhesiveAuditForm 
                module={selectedModule}
                onStatusChange={handlePmrFloorAdhesiveStatusChange}
                onReset={handleResetPmrFloorAdhesiveRequest}
                onBack={() => selectModule(null)}
            />
        }

        // --- INTERMEDIATE SELECTION SCREENS ---

        // P+R Equipment Selector
        if (selectedModule?.type === AuditModuleType.PR) {
            return <EquipmentSelector module={selectedModule} onSelectEquipment={selectEquipment} onBack={() => selectModule(null)} />;
        }
        
        // ECA Selector
        if (selectedModule?.type === AuditModuleType.ECA) {
            return <EcaSelector module={selectedModule} onSelectEca={selectEca} onBack={() => selectModule(null)} />;
        }

        // DAT List (after selecting a direction)
        if (selectedModule && selectedStation && selectedDirection) {
            return <DATList 
                module={selectedModule}
                station={selectedStation}
                direction={selectedDirection}
                onSelectDat={selectDat}
                onAddDat={handleAddDat}
                onRemoveDat={handleRemoveDat}
                onUpdateDatName={handleUpdateDatName}
                onBack={() => selectDirection(null)}
            />;
        }

        // DAT Station/Direction Selector
        if (selectedModule?.type === AuditModuleType.DAT) {
             return <DatGroupSelector 
                module={selectedModule}
                station={selectedStation}
                onSelectStation={selectStation}
                onSelectDirection={selectDirection}
                onBack={() => selectModule(null)}
            />;
        }

        // Module Selector (after selecting a lieu)
        if (selectedLieu) {
            return <ModuleSelector lieu={selectedLieu} onSelectModule={selectModule} onBack={() => selectLieu(null)} />;
        }

        // --- TOP LEVEL: LIEU SELECTOR (DASHBOARD) ---
        return <LieuSelector 
            lieux={lieux}
            onSelectLieu={selectLieu}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onExportByCategory={handleExportByCategory}
            onExportByModuleType={handleExportByModuleType}
            onExportAll={handleExportAll}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onResetCategory={handleResetCategoryRequest}
            onResetAll={handleResetAllRequest}
            onRequestLogout={() => setIsLogoutModalOpen(true)}
        />;
    };

    return (
        <main className="bg-slate-50 min-h-screen flex flex-col">
            {showSuccessAnimation && <SuccessAnimation />}
            <Toaster position="top-center" reverseOrder={false} toastOptions={{ style: { background: 'transparent', boxShadow: 'none', padding: 0 } }} />
            <div className="container mx-auto px-4 py-8 flex-grow">
                <div className="mb-6">
                    <Breadcrumbs 
                        lieu={selectedLieu}
                        module={selectedModule}
                        station={selectedStation}
                        direction={selectedDirection}
                        dat={selectedDat}
                        equipment={selectedEquipment}
                        eca={selectedEca}
                        onNavigate={navigate}
                    />
                </div>
                {renderContent()}
            </div>
      <footer className="text-center py-6 text-gray-800 text-xs">
<p>
  AuditRef &copy; {new Date().getFullYear()} - Tous droits réservés |{" "}
  <a
    href="mailto:florent.perez@tisseo.fr"
    className="text-blue-500 hover:underline"
  >
    Contact
  </a>{" "}
  | 72 76
</p>
</footer>
             <ConfirmationModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogoutConfirm}
                title="Confirmation de déconnexion"
                message="Êtes-vous sûr de vouloir vous déconnecter ? Vous serez redirigé vers l'écran de connexion."
            />
        </main>
    );
};

export default App;
