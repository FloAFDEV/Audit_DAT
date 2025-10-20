import React, { useState } from 'react';
import useAuditStore from '../store';
import { Lieu, AuditCategory, AuditModuleType, AuditModule, DAT, Equipment, ECA } from '../types';
import { getLieuxForCategory } from '../data/builder';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from '../data/config';
import { exportLieuxToCsv, exportLieuxToJson, generateAndDownloadIcsFile, calculateInitialReminderDate, slugify } from '../utils/csvExporter';
import { showPromiseToast, showSuccessToast, showErrorToast, showInfoToast } from '../components/ToastManager';
import { CheckCircle, RefreshCw, XCircle, Download } from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';

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

const hasPhotos = (lieux: Lieu[]): boolean => {
    return lieux.some(lieu =>
        lieu.modules.some(module =>
            module.type === AuditModuleType.PMR_FLOOR_ADHESIVE &&
            (module.data as any).adhesives.some((a: any) => a.photo_base64)
        )
    );
};

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
        const categoryConfig = categoryKey ? AUDIT_CATEGORIES.find(c => c.key === categoryKey) : undefined;
        // FIX: Replaced JSX with React.createElement to be compatible with .ts files.
        const icon = categoryConfig ? React.createElement(CategoryIcon, { categoryConfig: categoryConfig, size: "md" }) : React.createElement('div', { className: "h-full w-full rounded-full bg-teal-500 flex items-center justify-center" }, React.createElement(CheckCircle, { className: "h-6 w-6 text-white" }));
        showSuccessToast({ icon, title: 'Exportation réussie', message });
        triggerSuccessAnimation();
    };

    const executeExport = (exportConfig: PendingExport) => {
        const { lieux, fileName, successMessage, category } = exportConfig;
        if (hasPhotos(lieux)) {
            // FIX: Replaced JSX with React.createElement to be compatible with .ts files.
            showInfoToast({ icon: React.createElement('div', { className: "h-full w-full rounded-full bg-sky-500 flex items-center justify-center" }, React.createElement(Download, { className: "h-6 w-6 text-white" })), title: 'Rappel pour les photos', message: "Cet export contient des photos. N'oubliez pas d'exporter le JSON pour une sauvegarde complète." });
        }
        const result = exportLieuxToCsv(lieux, fileName);

        if (result.success) {
            showExportSuccessToast(successMessage, category);
        } else {
            // FIX: Replaced JSX with React.createElement to be compatible with .ts files.
            showErrorToast({ icon: React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" })), title: 'Exportation Échouée', message: result.error || "Une erreur est survenue lors de la génération du fichier CSV." });
        }
    };

    const handleCsvExportFlow = (lieuxToExport: Lieu[], baseFileName: string, successMessage: string, category: AuditCategory | undefined, reminder: { title: string; description: string; months: number }) => {
        setPendingExport({ lieux: lieuxToExport, fileName: `${baseFileName}.csv`, successMessage, category });
        setReminderOptions({ title: reminder.title, description: `${reminder.description}\n\nDernier export effectué le : ${new Date().toLocaleDateString('fr-FR')}`, initialDate: calculateInitialReminderDate(reminder.months) });
        setIsReminderModalOpen(true);
    };
    
    // --- EXPORT HANDLERS ---
    
    const handleExportByCategory = (category: AuditCategory) => {
        const filteredLieux = getLieuxForCategory(store.lieux, category);
        const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category);
        const categoryLabel = categoryConfig?.label || category;
        handleCsvExportFlow(filteredLieux, `export-${slugify(categoryLabel)}`, `La catégorie "${categoryLabel}" a été exportée.`, category, { title: `Planifier le ré-audit : ${categoryLabel}`, description: `Ceci est un rappel pour planifier le prochain cycle de contrôle des audits pour la catégorie '${categoryLabel}'.`, months: 5 });
    };

    const handleExportByModuleType = (moduleType: AuditModuleType) => {
        const filteredLieux = JSON.parse(JSON.stringify(store.lieux)).map((lieu: Lieu) => {
            lieu.modules = lieu.modules.filter(m => m.type === moduleType);
            return lieu;
        }).filter((lieu: Lieu) => lieu.modules.length > 0);
        
        const moduleConfig = AUDIT_MODULES_CONFIG.find(m => m.type === moduleType);
        const moduleLabel = moduleConfig?.label || moduleType;
        const reminderMonths = moduleType === AuditModuleType.COGNITIVE_PICTOGRAMS ? 11 : 5;
        handleCsvExportFlow(filteredLieux, `export-${slugify(moduleLabel)}`, `Les audits de type "${moduleLabel}" ont été exportés.`, undefined, { title: `Planifier le ré-audit des ${moduleLabel}`, description: `Ceci est un rappel pour planifier le prochain cycle de contrôle pour les audits de type '${moduleLabel}'.`, months: reminderMonths });
    };
    
    const handleExportAll = () => {
        const allModuleTypesDescription = AUDIT_MODULES_CONFIG.map(config => `- ${config.label}`).join('\n');
        handleCsvExportFlow(store.lieux, 'export-reseau-complet', "Toutes les données ont été exportées.", undefined, { title: 'Planifier le suivi global des audits Tisséo', description: `Ceci est un rappel pour planifier le prochain cycle de contrôle global pour l'ensemble des audits.\n\nAudits concernés:\n${allModuleTypesDescription}`, months: 5 });
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
        
        const reminderTitle = `Rappel d'audit : ${categoryConfig?.label || 'Vue personnalisée'}`;
        let reminderDescription = `Ceci est un rappel pour planifier le prochain cycle de contrôle pour la vue que vous venez d'exporter.`;
        if (auditLabels) reminderDescription += `\n\nFiltres : ${auditLabels}`;

        handleCsvExportFlow(lieuxToExport, fileNameBase, successMessage, activeFilter === 'ALL' ? undefined : activeFilter, { title: reminderTitle, description: reminderDescription, months: 5 });
    };
    
    const handleExportJson = () => {
        const { success } = exportLieuxToJson(store.lieux);
        if (success) {
            // FIX: Replaced JSX with React.createElement to be compatible with .ts files.
            showSuccessToast({ icon: React.createElement('div', { className: "h-full w-full rounded-full bg-sky-500 flex items-center justify-center" }, React.createElement(CheckCircle, { className: "h-6 w-6 text-white" })), title: 'Exportation JSON réussie', message: 'Le fichier de données a été téléchargé.' });
            triggerSuccessAnimation();
        } else {
            // FIX: Replaced JSX with React.createElement to be compatible with .ts files.
            showErrorToast({ icon: React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" })), title: 'Erreur', message: "Échec de l'exportation JSON." });
        }
    };

    // --- IMPORT HANDLER ---
    const handleImportJson = (fileContent: string) => {
        const promise = store.handleImportJsonData(fileContent);
        // FIX: Replaced JSX with React.createElement to be compatible with .ts files.
        showPromiseToast(promise, { icon: React.createElement('div', { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" }), title: "Importation en cours...", message: "Veuillez patienter." }, { icon: React.createElement('div', { className: "h-full w-full rounded-full bg-teal-500 flex items-center justify-center" }, React.createElement(CheckCircle, { className: "h-5 w-5 text-white" })), title: "Importation réussie", message: "Les données ont été chargées." }, { icon: React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" })), title: "Erreur d'importation", message: "Le fichier est invalide ou corrompu." }, triggerSuccessAnimation);
    };

    // --- RESET HANDLERS ---
    const handleResetCategoryRequest = (category: AuditCategory) => {
        const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === category)!;
        const promise = store.handleResetCategory(category);
        // FIX: Replaced JSX with React.createElement to be compatible with .ts files.
        showPromiseToast(promise, { icon: React.createElement('div', { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" }), title: "Réinitialisation en cours...", message: `Catégorie "${categoryConfig.label}"` }, { icon: React.createElement(CategoryIcon, { categoryConfig: categoryConfig, size: "md" }), title: "Réinitialisation terminée", message: `La catégorie "${categoryConfig.label}" a été réinitialisée.` }, { icon: React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" })), title: "Erreur", message: "La réinitialisation a échoué." }, triggerSuccessAnimation);
    };

    const handleResetAllRequest = () => {
        const promise = store.handleResetAll();
        // FIX: Replaced JSX with React.createElement to be compatible with .ts files.
        showPromiseToast(promise, { icon: React.createElement('div', { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" }), title: "Réinitialisation en cours...", message: "Toutes les données sont en cours de réinitialisation." }, { icon: React.createElement('div', { className: "h-full w-full rounded-full bg-blue-500 flex items-center justify-center" }, React.createElement(RefreshCw, { className: "h-5 w-5 text-white" })), title: "Réinitialisation terminée", message: "Toutes les données ont été réinitialisées." }, { icon: React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" })), title: "Erreur", message: "La réinitialisation a échoué." }, triggerSuccessAnimation);
    };

    const createResetHandler = (itemName: string, selectedItem: any, resetAction: () => Promise<void>) => {
        const promise = resetAction();
        // FIX: Replaced JSX with React.createElement to be compatible with .ts files.
        showPromiseToast(promise, { icon: React.createElement('div', { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500" }), title: "Réinitialisation en cours...", message: `${itemName} : ${selectedItem?.name || selectedItem?.stationName}` }, { icon: React.createElement('div', { className: "h-full w-full rounded-full bg-teal-500 flex items-center justify-center" }, React.createElement(CheckCircle, { className: "h-5 w-5 text-white" })), title: "Réinitialisation terminée", message: `L'audit a été réinitialisé.` }, { icon: React.createElement('div', { className: "h-full w-full rounded-full bg-red-500 flex items-center justify-center" }, React.createElement(XCircle, { className: "h-6 w-6 text-white" })), title: "Erreur", message: "La réinitialisation a échoué." }, triggerSuccessAnimation);
    };
    
    // --- MODAL HANDLERS ---
    const cleanupAfterModal = () => { setIsReminderModalOpen(false); setReminderOptions(null); setPendingExport(null); };
    const handleConfirmAndGenerateReminder = (selectedDate: Date) => {
        if (pendingExport && reminderOptions) {
            generateAndDownloadIcsFile({ title: reminderOptions.title, description: reminderOptions.description, reminderDate: selectedDate });
            executeExport(pendingExport);
        }
        setTimeout(cleanupAfterModal, 100);
    };
    const handleSkipReminderAndExport = () => { if (pendingExport) executeExport(pendingExport); setTimeout(cleanupAfterModal, 100); };
    const handleCancelExport = () => cleanupAfterModal();

    return {
        showSuccessAnimation,
        triggerSuccessAnimation,
        handlers: {
            handleExportByCategory, handleExportByModuleType, handleExportAll, handleExportCurrentView, handleExportJson, handleImportJson,
            handleResetCategoryRequest, handleResetAllRequest,
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