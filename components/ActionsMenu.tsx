import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, DatabaseBackup, Upload, Download } from 'lucide-react';
import { AuditCategory, AuditModuleType } from '../types';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from '../data/config';
import { CategoryIcon } from './CategoryIcon';

interface ActionsMenuProps {
    onExportByCategory: (category: AuditCategory) => void;
    onExportByModuleType: (moduleType: AuditModuleType) => void;
    onExportAll: () => void;
    onExportJson: () => void;
    onImportJson: () => void;
    onResetRequest: (category: AuditCategory | 'ALL') => void;
    isModalOpen: boolean;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
    onExportByCategory,
    onExportByModuleType,
    onExportAll,
    onExportJson,
    onImportJson,
    onResetRequest,
    isModalOpen,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isModalOpen) {
                return;
            }
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isModalOpen]);

    const handleExport = (category: AuditCategory | 'ALL') => {
        if (category === 'ALL') {
            onExportAll();
        } else {
            onExportByCategory(category);
        }
        setIsOpen(false);
    };

    const handleExportModule = (moduleType: AuditModuleType) => {
        onExportByModuleType(moduleType);
        setIsOpen(false);
    }
    
    const handleExportJsonAction = () => {
        onExportJson();
        setIsOpen(false);
    };
    
    const handleImportJsonAction = () => {
        onImportJson();
        setIsOpen(false);
    };

    const handleReset = (category: AuditCategory | 'ALL') => {
        onResetRequest(category);
        // Ne ferme pas le menu pour permettre l'annulation via la modale.
    };

    const DangerZoneButtons = (
        <>
            <button
                onClick={() => handleReset('ALL')}
                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                role="menuitem"
            >
                <DatabaseBackup className="w-4 h-4" />
                <span>Réinitialiser tout le réseau</span>
            </button>
            {AUDIT_CATEGORIES.map(cat => (
                <button
                    key={`reset-${cat.key}`}
                    onClick={() => handleReset(cat.key)}
                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    role="menuitem"
                >
                    <CategoryIcon categoryConfig={cat} size="sm" />
                    <span>Réinitialiser {cat.label}</span>
                </button>
            ))}
        </>
    );

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center gap-x-2 w-full h-full px-4 py-2 rounded-md bg-white text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600 dark:hover:bg-slate-600"
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <span className="text-sm font-semibold">Exporter & Gérer</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 origin-top-left sm:origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none z-20"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="py-1" role="none">
                        <div className="px-4 py-2">
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-300 uppercase tracking-wider">Exporter en CSV par Ligne / Catégorie</p>
                        </div>
                        <button
                            onClick={() => handleExport('ALL')}
                            className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                            role="menuitem"
                        >
                            <CategoryIcon size="sm" />
                            <span>Exporter tout le réseau (CSV)</span>
                        </button>
                        {AUDIT_CATEGORIES.map(cat => (
                            <button
                                key={`export-${cat.key}`}
                                onClick={() => handleExport(cat.key)}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                                role="menuitem"
                            >
                                <CategoryIcon categoryConfig={cat} size="sm" />
                                <span>Exporter {cat.label} (CSV)</span>
                            </button>
                        ))}
                        
                        <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                        <div className="px-4 py-2">
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-300 uppercase tracking-wider">Exporter en CSV par Type d'Audit</p>
                        </div>
                        {AUDIT_MODULES_CONFIG.map(({ type, label, Icon }) => (
                            <button
                                key={`export-module-${type}`}
                                onClick={() => handleExportModule(type)}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                                role="menuitem"
                            >
                                <div className="flex items-center justify-center w-6 h-6 bg-slate-100 dark:bg-slate-600 rounded-md">
                                    <Icon className="w-4 h-4 text-gray-600 dark:text-slate-300" />
                                </div>
                                <span>{label}</span>
                            </button>
                        ))}

                        <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                        <div className="px-4 py-2">
                            <p className="text-xs font-semibold text-gray-400 dark:text-slate-300 uppercase tracking-wider">Synchronisation JSON</p>
                        </div>
                        <button
                            onClick={handleExportJsonAction}
                            className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                            role="menuitem"
                        >
                            <Download className="w-4 h-4 text-sky-600" />
                            <span>Exporter les données (.json)</span>
                        </button>
                        <button
                            onClick={handleImportJsonAction}
                            className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                            role="menuitem"
                        >
                            <Upload className="w-4 h-4 text-sky-600" />
                            <span>Importer les données (.json)</span>
                        </button>

                        <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                        
                        {/* --- Mobile Collapsible Danger Zone --- */}
                        <div className="sm:hidden">
                             <button
                                onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
                                className="w-full text-left flex items-center justify-between gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                aria-expanded={isDangerZoneOpen}
                            >
                                <div className="flex items-center gap-3">
                                    <DatabaseBackup className="w-4 h-4" />
                                    <span>Actions irréversibles</span>
                                </div>
                                <ChevronDown className={`h-5 w-5 transition-transform ${isDangerZoneOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isDangerZoneOpen && (
                                <div className="pl-4 border-l-2 border-red-100 dark:border-red-900/30">
                                    {DangerZoneButtons}
                                </div>
                            )}
                        </div>

                        {/* --- Desktop Always-Visible Danger Zone --- */}
                        <div className="hidden sm:block">
                            <div className="px-4 py-2">
                                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Actions irréversibles</p>
                            </div>
                            {DangerZoneButtons}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};