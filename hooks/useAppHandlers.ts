import React, { useState } from 'react';
import useAuditStore from '../store';
import { Lieu, AuditCategory, AuditModuleType, AuditModule, DAT, Equipment, ECA, AuditCategoryConfig } from '../types';
import { getLieuxForCategory } from '../data/builder';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from '../data/config';
import { exportLieuxToCsv, exportLieuxToJson, generateAndDownloadIcsFile, calculateInitialReminderDate, slugify } from '../utils/csvExporter';
import { showPromiseToast, showSuccessToast, showErrorToast, showInfoToast } from '../components/ToastManager';
import { CheckCircle, RefreshCw, XCircle, Download } from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { ModuleIcon } from '../components/ModuleIcon';

interface ReminderOptions {
    titlePrefix: string;
    titleSubject: string;
    reminderDescription: React.ReactNode;
    initialDate: Date;
}

interface PendingExport {
    lieux: Lieu[];
    fileName: string;
    successMessage: string;
    categoryConfig?: AuditCategoryConfig;
}

const hasPhotos = (lieux: Lieu[]): boolean => {
    return lieux.some(lieu =>
        lieu.modules.some(module =>
            module.type === AuditModuleType.PMR_FLOOR_ADHESIVE &&
            (module.data as any).adhesives.some((a: any) => a.photo_base64)
        )
    );
};

const Bold: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    React.createElement('span', { className: "font-semibold text-gray-800 dark:text-slate-100" }, children)
);

export const useAppHandlers = () => {
    const store = useAuditStore();
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [reminderOptions, setReminderOptions] = useState<ReminderOptions | null>(null);
    const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

    const triggerSuccessAnimation = () => {
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 2200);
    };

    const showExportSuccessToast = (message: string, categoryKey?: AuditCategory) => {
        const catConfig = categoryKey ? AUDIT_CATEGORIES.find(c => c.key === categoryKey) : undefined;
        const icon = catConfig
            ? React.createElement(CategoryIcon, { categoryConfig: catConfig, size: 'md' })
            : React.createElement('div', { className: "h-full w-full rounded-full bg-teal-500 flex items-center justify-center" }, React.createElement(CheckCircle, { className: "h-6 w-6 text-white" }));
        showSuccessToast({
            icon,
            title: 'Exportation réussie',
            message,
        });
        triggerSuccessAnimation();
    };

    const executeExport = (exportConfig: PendingExport) => {
        const { lieux, fileName, successMessage, categoryConfig } = exportConfig;
        if (hasPhotos(lieux)) {
            const icon = React.createElement('div', { className: "h-full w-full rounded-full bg-sky-500 flex items-center justify-center" }, React.createElement(Download, { className: "h-6 w-6 text-white" }));
            showInfoToast({ icon, title: 'Rappel pour les photos', message: "Cet export contient des photos. N'oubliez pas d'exporter le JSON pour une sauvegarde complète." });
        }
        const result = exportLieuxToCsv(lieux, fileName);

        if (result.success) {
            showExportSuccessToast(successMessage, categoryConfig?.key);
        } else {
            const icon = React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" }));
            showErrorToast({ icon, title: 'Exportation Échouée', message: result.error || "Une erreur est survenue lors de la génération du fichier CSV." });
        }
    };

    const handleCsvExportFlow = (lieuxToExport: Lieu[], baseFileName: string, successMessage: string, categoryConfig: AuditCategoryConfig | undefined, reminder: { titlePrefix: string; titleSubject: string; reminderDescription: React.ReactNode; months: number }) => {
        setPendingExport({ lieux: lieuxToExport, fileName: `${baseFileName}.csv`, successMessage, categoryConfig });
        setReminderOptions({ titlePrefix: reminder.titlePrefix, titleSubject: reminder.titleSubject, reminderDescription: reminder.reminderDescription, initialDate: calculateInitialReminderDate(reminder.months) });
        setIsReminderModalOpen(true);
    };
    
    // --- EXPORT HANDLERS ---
    
    const handleExportByCategory = (category: AuditCategory) => {
        const filteredLieux = getLieuxForCategory(store.lieux, category);
        const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category);
        const categoryLabel = categoryConfig?.label || category;
        handleCsvExportFlow(filteredLieux, `export-${slugify(categoryLabel)}`, `La catégorie "${categoryLabel}" a été exportée.`, categoryConfig, { 
            titlePrefix: "Finaliser l'exportation pour",
            titleSubject: categoryLabel,
            reminderDescription: React.createElement(React.Fragment, null, "Pour le suivi du ", React.createElement(Bold, null, "prochain audit"), ", ajoutez un ", React.createElement(Bold, null, "rappel"), " à votre ", React.createElement(Bold, null, "calendrier"), "."),
            months: 5 
        });
    };

    const handleExportByModuleType = (moduleType: AuditModuleType) => {
        const filteredLieux = JSON.parse(JSON.stringify(store.lieux)).map((lieu: Lieu) => {
            lieu.modules = lieu.modules.filter(m => m.type === moduleType);
            return lieu;
        }).filter((lieu: Lieu) => lieu.modules.length > 0);
        
        const moduleConfig = AUDIT_MODULES_CONFIG.find(m => m.type === moduleType);
        const moduleLabel = moduleConfig?.label || moduleType;
        const reminderMonths = 5;
        handleCsvExportFlow(filteredLieux, `export-${slugify(moduleLabel)}`, `Les audits de type "${moduleLabel}" ont été exportés.`, undefined, { 
            titlePrefix: "Finaliser l'exportation des",
            titleSubject: moduleLabel,
            reminderDescription: React.createElement(React.Fragment, null, "Pour le suivi du ", React.createElement(Bold, null, "prochain audit"), ", ajoutez un ", React.createElement(Bold, null, "rappel"), " à votre ", React.createElement(Bold, null, "calendrier"), "."),
            months: reminderMonths 
        });
    };
    
    const handleExportAll = () => {
        handleCsvExportFlow(store.lieux, 'export-reseau-complet', "Toutes les données ont été exportées.", undefined, { 
            titlePrefix: "Finaliser l'exportation du",
            titleSubject: "Réseau complet",
            reminderDescription: React.createElement(React.Fragment, null, "Pour le suivi du ", React.createElement(Bold, null, "prochain audit"), ", ajoutez un ", React.createElement(Bold, null, "rappel"), " à votre ", React.createElement(Bold, null, "calendrier"), "."),
            months: 5 
        });
    };

    const handleExportCurrentView = () => {
        const { lieux, activeFilter, activeAuditFilters } = store;
        if (activeFilter === 'ALL' && activeAuditFilters.length === 0) { handleExportAll(); return; }

        let lieuxToExport = [...lieux];
        const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === activeFilter);
        if (activeFilter !== 'ALL') lieuxToExport = getLieuxForCategory(lieuxToExport, activeFilter);

        if (activeAuditFilters.length > 0) {
            lieuxToExport = lieuxToExport.map(lieu => ({ ...lieu, modules: lieu.modules.filter(module => activeAuditFilters.includes(module.type)) })).filter(lieu => lieu.modules.length > 0);
        }

        const categoryLabel = activeFilter === 'ALL' ? 'reseau' : (categoryConfig?.label || activeFilter);
        const auditLabels = activeAuditFilters.map(type => AUDIT_MODULES_CONFIG.find(c => c.type === type)?.shortLabel || type).join('-');
        const fileNameBase = `export-${slugify(categoryLabel)}${auditLabels ? `-${slugify(auditLabels)}` : ''}`;
        
        let successMessage = `${activeFilter === 'ALL' ? 'La vue actuelle' : `La catégorie "${categoryConfig?.label}"`} a été exportée.`;
        if (auditLabels) successMessage = `${activeFilter === 'ALL' ? 'La vue actuelle' : `La catégorie "${categoryConfig?.label}"`} (filtre: ${auditLabels}) a été exportée.`;
        
        const reminderTitlePrefix = activeFilter !== 'ALL' && categoryConfig ? "Finaliser l'exportation pour" : "Finaliser l'exportation de";
        const reminderTitleSubject = activeFilter !== 'ALL' && categoryConfig ? categoryConfig.label : "la vue actuelle";
        const reminderDescription = React.createElement(React.Fragment, null, "Pour le suivi du ", React.createElement(Bold, null, "prochain audit"), ", ajoutez un ", React.createElement(Bold, null, "rappel"), " à votre ", React.createElement(Bold, null, "calendrier"), ".");

        handleCsvExportFlow(lieuxToExport, fileNameBase, successMessage, activeFilter === 'ALL' ? undefined : categoryConfig, { titlePrefix: reminderTitlePrefix, titleSubject: reminderTitleSubject, reminderDescription: reminderDescription, months: 5 });
    };
    
    const handleExportJson = () => {
        const { success } = exportLieuxToJson(store.lieux);
        if (success) {
            const icon = React.createElement('div', { className: "h-full w-full rounded-full bg-sky-500 flex items-center justify-center" }, React.createElement(CheckCircle, { className: "h-6 w-6 text-white" }));
            showSuccessToast({ icon, title: 'Exportation JSON réussie', message: 'Le fichier de données a été téléchargé.' });
            triggerSuccessAnimation();
        } else {
            const icon = React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" }));
            showErrorToast({ icon, title: 'Erreur', message: "Échec de l'exportation JSON." });
        }
    };

    // --- IMPORT HANDLER ---
    const handleImportJson = (fileContent: string) => {
        const promise = store.handleImportJsonData(fileContent);
        const loadingIcon = React.createElement('div', { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" });
        const successIcon = React.createElement('div', { className: "h-full w-full rounded-full bg-teal-500 flex items-center justify-center" }, React.createElement(CheckCircle, { className: "h-5 w-5 text-white" }));
        const errorIcon = React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" }));
        showPromiseToast(promise, { icon: loadingIcon, title: "Importation en cours...", message: "Veuillez patienter." }, { icon: successIcon, title: "Importation réussie", message: "Les données ont été chargées." }, { icon: errorIcon, title: "Erreur d'importation", message: "Le fichier est invalide ou corrompu." }, triggerSuccessAnimation);
    };

    // --- RESET HANDLERS ---
    const handleResetCategoryRequest = (category: AuditCategory) => {
        const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category)!;
        const promise = store.handleResetCategory(category);
        const loadingIcon = React.createElement('div', { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" });
        const successIcon = React.createElement(CategoryIcon, { categoryConfig: categoryConfig, size: "md" });
        const errorIcon = React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" }));
        showPromiseToast(promise, { icon: loadingIcon, title: "Réinitialisation en cours...", message: `Catégorie "${categoryConfig.label}"` }, { icon: successIcon, title: "Réinitialisation terminée", message: `La catégorie "${categoryConfig.label}" a été réinitialisée.` }, { icon: errorIcon, title: "Erreur", message: "La réinitialisation a échoué." }, triggerSuccessAnimation);
    };

    const handleResetByModuleTypeRequest = (moduleType: AuditModuleType) => {
        const moduleConfig = AUDIT_MODULES_CONFIG.find(c => c.type === moduleType)!;
        const promise = store.handleResetByModuleType(moduleType);
        const loadingIcon = React.createElement('div', { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" });
        const successIcon = React.createElement(ModuleIcon, { type: moduleType });
        const errorIcon = React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" }));
        showPromiseToast(
            promise,
            { icon: loadingIcon, title: "Réinitialisation en cours...", message: `Audit: ${moduleConfig.label}` },
            { icon: successIcon, title: "Réinitialisation terminée", message: `Les audits "${moduleConfig.label}" ont été réinitialisés.` },
            { icon: errorIcon, title: "Erreur", message: "La réinitialisation a échoué." },
            triggerSuccessAnimation
        );
    };

    const handleResetAllRequest = () => {
        const promise = store.handleResetAll();
        const loadingIcon = React.createElement('div', { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" });
        const successIcon = React.createElement('div', { className: "h-full w-full rounded-full bg-blue-500 flex items-center justify-center" }, React.createElement(RefreshCw, { className: "h-5 w-5 text-white" }));
        const errorIcon = React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" }));
        showPromiseToast(promise, { icon: loadingIcon, title: "Réinitialisation en cours...", message: "Toutes les données sont en cours de réinitialisation." }, { icon: successIcon, title: "Réinitialisation terminée", message: "Toutes les données ont été réinitialisées." }, { icon: errorIcon, title: "Erreur", message: "La réinitialisation a échoué." }, triggerSuccessAnimation);
    };

    const createResetHandler = (itemName: string, selectedItem: any, resetAction: () => Promise<void>) => {
        const promise = resetAction();
        const loadingIcon = React.createElement('div', { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" });
        const successIcon = React.createElement('div', { className: "h-full w-full rounded-full bg-teal-500 flex items-center justify-center" }, React.createElement(CheckCircle, { className: "h-5 w-5 text-white" }));
        const errorIcon = React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" }));
        showPromiseToast(promise, { icon: loadingIcon, title: "Réinitialisation en cours...", message: `${itemName} : ${selectedItem?.name || selectedItem?.stationName}` }, { icon: successIcon, title: "Réinitialisation terminée", message: `L'audit a été réinitialisé.` }, { icon: errorIcon, title: "Erreur", message: "La réinitialisation a échoué." }, triggerSuccessAnimation);
    };
    
    // --- MODAL HANDLERS ---
    const cleanupAfterModal = () => { setIsReminderModalOpen(false); setReminderOptions(null); setPendingExport(null); };
    const handleConfirmAndGenerateReminder = (selectedDate: Date) => {
        if (pendingExport && reminderOptions) {
            const icsTitle = `${reminderOptions.titlePrefix} ${reminderOptions.titleSubject}`;
            generateAndDownloadIcsFile({ title: icsTitle, description: "Rappel de suivi pour AuditRef.", reminderDate: selectedDate });
            executeExport(pendingExport);
        }
        setTimeout(cleanupAfterModal, 100);
    };
    const handleSkipReminderAndExport = () => { if (pendingExport) { executeExport(pendingExport); } setTimeout(cleanupAfterModal, 100); };
    const handleCancelExport = () => cleanupAfterModal();

    return {
        showSuccessAnimation,
        handlers: {
            handleExportByCategory, handleExportByModuleType, handleExportAll, handleExportCurrentView, handleExportJson, handleImportJson,
            handleResetCategoryRequest, handleResetByModuleTypeRequest, handleResetAllRequest,
            handleResetDatRequest: (selectedDat: DAT | null | undefined) => createResetHandler('DAT', selectedDat, store.handleResetDat),
            handleResetPrAdhesiveRequest: (selectedEquipment: Equipment | null | undefined) => createResetHandler('Équipement', selectedEquipment, store.handleResetPrAdhesive),
            handleResetEcaAdhesiveRequest: (selectedEca: ECA | null | undefined) => createResetHandler('ECA', selectedEca, store.handleResetEcaAdhesive),
            handleResetPmrFloorAdhesiveRequest: (selectedModule: AuditModule | null | undefined) => createResetHandler('Adhésifs Sol PMR', selectedModule?.data, store.handleResetPmrFloorAdhesive),
            handleResetCognitivePictogramRequest: (selectedModule: AuditModule | null | undefined) => createResetHandler('Pictogrammes', selectedModule?.data, store.handleResetCognitivePictogram),
        },
        modalState: {
            isReminderModalOpen, reminderOptions, pendingExport,
            handleConfirmAndGenerateReminder, handleSkipReminderAndExport, handleCancelExport,
        },
    };
};