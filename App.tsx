import React, { useEffect, useMemo, useState } from 'react';
import useAuditStore from './store';
import Login from './components/Login';
import AppRouter from './components/AppRouter';
import { Breadcrumbs } from './components/Breadcrumbs';
import { AuditModuleType, Pr, EcaData, ModeData, Lieu, AuditModule, Station, Direction, DAT, Equipment, ECA, AuditCategory, PMRFloorAdhesiveData, EcaEquipmentType, CognitivePictogramData } from './types';
import { getLieuxForCategory } from './data/builder';
import { exportLieuxToCsv, exportLieuxToJson, sortLieuxByPhysicalOrder, generateAndDownloadIcsFile, calculateInitialReminderDate, slugify } from './utils/csvExporter';
import ConfirmationModal from './components/ConfirmationModal';
import ReminderModal from './components/ReminderModal';
import { Toaster } from 'react-hot-toast';
import { CheckCircle, RefreshCw, XCircle, Download } from 'lucide-react';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from './data/config';
import { CategoryIcon } from './components/CategoryIcon';
import { showPromiseToast, showSuccessToast, showErrorToast, showInfoToast } from './components/ToastManager';

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

const hasPhotos = (lieux: Lieu[]): boolean => {
    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            if (module.type === AuditModuleType.PMR_FLOOR_ADHESIVE) {
                const data = module.data as PMRFloorAdhesiveData;
                if (data.adhesives.some(a => a.photo_base64)) {
                    return true;
                }
            }
        }
    }
    return false;
};

interface ReminderOptions {
    title: string;
    description: string;
    initialDate: Date;
}

interface PendingExport {
    lieux: Lieu[];
    fileName: string;
    successMessage: string;
    category?: AuditCategory;
}

const App: React.FC = () => {
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [reminderOptions, setReminderOptions] = useState<ReminderOptions | null>(null);
    const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

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
        store.init().catch(error => {
            showErrorToast({
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: "Erreur de chargement",
                message: error.message,
            });
        });
    }, [store.init]);
    
    // --- Data selection logic using useMemo for performance ---
    const selectedLieu = useMemo(() => store.lieux.find(l => l.id === store.selectedLieuId), [store.lieux, store.selectedLieuId]);
    const selectedModule = useMemo(() => selectedLieu?.modules.find(m => m.id === store.selectedModuleId), [selectedLieu, store.selectedModuleId]);
    
    // DAT flow data
    const selectedStation = useMemo(() => {
        if (selectedModule?.type !== AuditModuleType.DAT) return null;
        return (selectedModule.data as ModeData).stations.find((s: Station) => s.id === store.selectedStationId);
    }, [selectedModule, store.selectedStationId]);

    const selectedDirection = useMemo(() => selectedStation?.directions.find((d: Direction) => d.id === store.selectedDirectionId), [selectedStation, store.selectedDirectionId]);
    const selectedDat = useMemo(() => selectedDirection?.dats.find((d: DAT) => d.id === store.selectedDatId), [selectedDirection, store.selectedDatId]);

    // P+R flow data
    const selectedPrData = useMemo(() => (selectedModule?.type === AuditModuleType.PR ? selectedModule.data as Pr : null), [selectedModule]);
    const selectedEquipment = useMemo(() => selectedPrData?.equipments.find(e => e.id === store.selectedEquipmentId), [selectedPrData, store.selectedEquipmentId]);

    // ECA flow data
    const selectedEcaData = useMemo(() => (selectedModule?.type === AuditModuleType.ECA ? selectedModule.data as EcaData : null), [selectedModule]);
    const selectedEca = useMemo(() => selectedEcaData?.ecas.find(e => e.id === store.selectedEcaId), [selectedEcaData, store.selectedEcaId]);

    const handleLogoutConfirm = () => {
        store.logout();
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
    if (store.isLoading) {
        return <Loader />;
    }

    if (!store.isAuthenticated) {
        return <Login onLoginSuccess={store.login} />;
    }
    
    const executeExport = (exportConfig: PendingExport) => {
        const { lieux, fileName, successMessage, category } = exportConfig;
        if (hasPhotos(lieux)) {
            showInfoToast({
                icon: <div className="h-full w-full rounded-full bg-sky-500 flex items-center justify-center"><Download className="h-6 w-6 text-white" /></div>,
                title: 'Rappel pour les photos',
                message: "Cet export contient des photos. N'oubliez pas d'exporter le JSON pour une sauvegarde complète.",
            });
        }
        const sortedLieux = sortLieuxByPhysicalOrder(lieux);
        exportLieuxToCsv(sortedLieux, fileName);
        showExportSuccessToast(successMessage, category);
    };

    const handleCsvExportFlow = (
        lieuxToExport: Lieu[],
        baseFileName: string,
        successMessage: string,
        category: AuditCategory | undefined,
        reminder: { title: string; description: string; months: number }
    ) => {
        setPendingExport({
            lieux: lieuxToExport,
            fileName: `${baseFileName}.csv`,
            successMessage,
            category,
        });
        
        const exportDateString = new Date().toLocaleDateString('fr-FR');

        setReminderOptions({
            title: reminder.title,
            description: `${reminder.description}\n\nDernier export effectué le : ${exportDateString}`,
            initialDate: calculateInitialReminderDate(reminder.months),
        });
        setIsReminderModalOpen(true);
    };


    const handleExportByCategory = (category: AuditCategory) => {
        const filteredLieux = getLieuxForCategory(store.lieux, category);
        const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category);
        const categoryLabel = categoryConfig?.label || category;

        const fileNameBase = `export-${slugify(categoryLabel)}`;
    
        handleCsvExportFlow(
            filteredLieux,
            fileNameBase,
            `La catégorie "${categoryLabel}" a été exportée.`,
            category,
            {
                title: `Planifier le ré-audit : ${categoryLabel}`,
                description: `Ceci est un rappel pour planifier le prochain cycle de contrôle des audits pour la catégorie '${categoryLabel}'.`,
                months: 5
            }
        );
    };
    
    const handleExportByModuleType = (moduleType: AuditModuleType) => {
        const filteredLieux = JSON.parse(JSON.stringify(store.lieux))
            .map((lieu: Lieu) => {
                lieu.modules = lieu.modules.filter(m => m.type === moduleType);
                return lieu;
            })
            .filter((lieu: Lieu) => lieu.modules.length > 0);
        
        const moduleConfig = AUDIT_MODULES_CONFIG.find(m => m.type === moduleType);
        const moduleLabel = moduleConfig?.label || moduleType;
        let reminderMonths = 5;
        if (moduleType === AuditModuleType.COGNITIVE_PICTOGRAMS) {
            reminderMonths = 11;
        }

        const fileNameBase = `export-${slugify(moduleLabel)}`;
    
        handleCsvExportFlow(
            filteredLieux,
            fileNameBase,
            `Les audits de type "${moduleLabel}" ont été exportés.`,
            undefined,
            {
                title: `Planifier le ré-audit des ${moduleLabel}`,
                description: `Ceci est un rappel pour planifier le prochain cycle de contrôle pour les audits de type '${moduleLabel}'.`,
                months: reminderMonths
            }
        );
    };

    const handleExportAll = () => {
        const allModuleTypesDescription = AUDIT_MODULES_CONFIG.map(config => `- ${config.label}`).join('\n');
        
        handleCsvExportFlow(
            store.lieux,
            'export-reseau-complet',
            "Toutes les données ont été exportées.",
            undefined,
            {
                title: 'Planifier le suivi global des audits Tisséo',
                description: `Ceci est un rappel pour planifier le prochain cycle de contrôle global pour l'ensemble des audits.\n\nAudits concernés:\n${allModuleTypesDescription}`,
                months: 5
            }
        );
    };

    const handleExportJson = () => {
        const { success } = exportLieuxToJson(store.lieux);
        if (success) {
            showSuccessToast({
                icon: <div className="h-full w-full rounded-full bg-sky-500 flex items-center justify-center"><CheckCircle className="h-6 w-6 text-white" /></div>,
                title: 'Exportation JSON réussie',
                message: 'Le fichier de données a été téléchargé.',
            });
            triggerSuccessAnimation();
        } else {
            showErrorToast({
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: 'Erreur',
                message: "Échec de l'exportation JSON.",
            });
        }
    };

    const handleImportJson = (fileContent: string) => {
        const promise = store.handleImportJsonData(fileContent);

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
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: "Erreur d'importation",
                message: "Le fichier est invalide ou corrompu.", // Generic message, specific one comes from promise rejection
            },
            triggerSuccessAnimation
        );
    };

    const handleResetCategoryRequest = (category: AuditCategory) => {
        const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category)!;
        const promise = store.handleResetCategory(category);

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
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetAllRequest = () => {
        const promise = store.handleResetAll();
        
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
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetDatRequest = () => {
        const promise = store.handleResetDat();

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
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetPrAdhesiveRequest = () => {
        const promise = store.handleResetPrAdhesive();

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
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetEcaAdhesiveRequest = () => {
        const promise = store.handleResetEcaAdhesive();

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
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetPmrFloorAdhesiveRequest = () => {
        const promise = store.handleResetPmrFloorAdhesive();
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
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };

    const handleResetCognitivePictogramRequest = () => {
        const promise = store.handleResetCognitivePictogram();
        const stationName = (selectedModule?.data as CognitivePictogramData)?.stationName || 'la station';

        showPromiseToast(
            promise,
            {
                icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
                title: "Réinitialisation en cours...",
                message: `Pictogrammes Cognitifs : ${stationName}`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>,
                title: "Réinitialisation terminée",
                message: `Les pictogrammes pour ${stationName} ont été réinitialisés.`,
            },
            {
                icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-6 w-6 text-white" /></div>,
                title: "Erreur",
                message: "La réinitialisation a échoué.",
            },
            triggerSuccessAnimation
        );
    };
    
    const cleanupAfterModal = () => {
        setIsReminderModalOpen(false);
        setReminderOptions(null);
        setPendingExport(null);
    };

    const handleConfirmAndGenerateReminder = (selectedDate: Date) => {
        if (pendingExport && reminderOptions) {
            generateAndDownloadIcsFile({
                title: reminderOptions.title,
                description: reminderOptions.description,
                reminderDate: selectedDate
            });
            executeExport(pendingExport);
        }
        cleanupAfterModal();
    };

    const handleSkipReminderAndExport = () => {
        if (pendingExport) {
            executeExport(pendingExport);
        }
        cleanupAfterModal();
    };
    
    const handleCancelExport = () => {
        cleanupAfterModal();
    };

    return (
        <main className="bg-slate-50 dark:bg-slate-900 min-h-screen flex flex-col">
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
                        onNavigate={store.navigate}
                    />
                </div>
                <AppRouter
                    // Pass selected data
                    lieux={store.lieux}
                    selectedLieu={selectedLieu}
                    selectedModule={selectedModule}
                    selectedStation={selectedStation}
                    selectedDirection={selectedDirection}
                    selectedDat={selectedDat}
                    selectedEquipment={selectedEquipment}
                    selectedEca={selectedEca}
                    // Pass state and handlers
                    {...store}
                    // Pass request handlers separately
                    handleResetDatRequest={handleResetDatRequest}
                    handleResetPrAdhesiveRequest={handleResetPrAdhesiveRequest}
                    handleResetEcaAdhesiveRequest={handleResetEcaAdhesiveRequest}
                    handleResetPmrFloorAdhesiveRequest={handleResetPmrFloorAdhesiveRequest}
                    handleResetCognitivePictogramRequest={handleResetCognitivePictogramRequest}
                    onExportByCategory={handleExportByCategory}
                    onExportByModuleType={handleExportByModuleType}
                    onExportAll={handleExportAll}
                    onExportJson={handleExportJson}
                    onImportJson={handleImportJson}
                    onResetCategory={handleResetCategoryRequest}
                    onResetAll={handleResetAllRequest}
                    onRequestLogout={() => setIsLogoutModalOpen(true)}
                />
            </div>
      <footer className="text-center py-6 text-gray-800 dark:text-slate-400 text-xs">
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
            {reminderOptions && pendingExport && (
                 <ReminderModal
                    isOpen={isReminderModalOpen}
                    onClose={handleCancelExport}
                    onConfirm={handleConfirmAndGenerateReminder}
                    onSkip={handleSkipReminderAndExport}
                    fileName={pendingExport.fileName}
                    initialDate={reminderOptions.initialDate}
                />
            )}
        </main>
    );
};

export default App;