import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, DatabaseBackup, Upload, Download } from 'lucide-react';
import { AuditCategory, AuditModuleType } from '../types';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from '../data/config';
import { CategoryIcon } from './CategoryIcon';
import { ModuleIcon } from './ModuleIcon';

interface ActionsMenuProps {
    onExportByCategory: (category: AuditCategory) => void;
    onExportByModuleType: (moduleType: AuditModuleType) => void;
    onExportAll: () => void;
    onExportCurrentView: () => void;
    onExportJson: () => void;
    onImportJson: () => void;
    onResetRequest: (target: { type: 'ALL' | 'CATEGORY' | 'MODULE_TYPE', value: any }) => void;
    isModalOpen: boolean;
    activeFilter: AuditCategory | 'ALL';
    activeAuditFilters: AuditModuleType[];
    availableAuditTypes: AuditModuleType[];
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
    onExportByCategory,
    onExportByModuleType,
    onExportAll,
    onExportCurrentView,
    onExportJson,
    onImportJson,
    onResetRequest,
    isModalOpen,
    activeFilter,
    activeAuditFilters,
    availableAuditTypes
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

    useEffect(() => {
        // Reset danger zone state every time the main menu is opened
        if (isOpen) {
            setIsDangerZoneOpen(false);
        }
    }, [isOpen]);

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

    const handleReset = (type: 'ALL' | 'CATEGORY' | 'MODULE_TYPE', value: any) => {
        onResetRequest({ type, value });
    };

    const isViewFiltered = activeFilter !== 'ALL' && activeAuditFilters.length > 0 && activeAuditFilters.length < availableAuditTypes.length;
    const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === activeFilter);
    const showAuditFilterIcons = activeAuditFilters.length > 0 && availableAuditTypes.length > 0 && activeAuditFilters.length < availableAuditTypes.length;


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
                        {isViewFiltered && (
                            <>
                                <div className="px-4 py-2">
                                    <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Export Personnalisé</p>
                                </div>
                                <button
                                    onClick={() => { onExportCurrentView(); setIsOpen(false); }}
                                    className="w-full text-left flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                                    role="menuitem"
                                >
                                    <span className="flex-1 min-w-0 truncate">Exporter la sélection en csv</span>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <CategoryIcon categoryConfig={categoryConfig} size="sm" />
                                        {showAuditFilterIcons && activeAuditFilters.map(type => {
                                            const config = AUDIT_MODULES_CONFIG.find(c => c.type === type);
                                            return config ? (
                                                <div key={type} className="flex items-center justify-center w-5 h-5 bg-teal-100 dark:bg-teal-900/40 rounded-md" title={config.label}>
                                                    <ModuleIcon type={type} className="w-3 h-3 text-teal-700 dark:text-teal-300" />
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                </button>
                                <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
                            </>
                        )}

                        <div className="px-4 py-2">
                            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Exporter en CSV par Ligne / Catégorie</p>
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
                            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Exporter en CSV par Type d'Audit</p>
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
                            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Synchronisation JSON</p>
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
                        
                        <button
                            onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
                            className="w-full text-left flex items-center justify-between gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            aria-expanded={isDangerZoneOpen}
                        >
                            <div className="flex items-center gap-3">
                                <DatabaseBackup className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span>Actions irréversibles</span>
                            </div>
                            <ChevronDown className={`h-5 w-5 transition-transform ${isDangerZoneOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isDangerZoneOpen && (
                            <div className="pl-4 border-l-2 border-red-100 dark:border-red-900/30">
                                <button
                                    onClick={() => handleReset('ALL', 'ALL')}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    role="menuitem"
                                >
                                    <DatabaseBackup className="w-4 h-4" />
                                    <span>Réinitialiser tout le réseau</span>
                                </button>
                                {AUDIT_CATEGORIES.map(cat => (
                                    <button
                                        key={`reset-${cat.key}`}
                                        onClick={() => handleReset('CATEGORY', cat.key)}
                                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                        role="menuitem"
                                    >
                                        <CategoryIcon categoryConfig={cat} size="sm" />
                                        <span>Réinitialiser {cat.label}</span>
                                    </button>
                                ))}
                                {AUDIT_MODULES_CONFIG.map(({ type, label, Icon }) => (
                                    <button
                                        key={`reset-module-${type}`}
                                        onClick={() => handleReset('MODULE_TYPE', type)}
                                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                        role="menuitem"
                                    >
                                        <div className="flex items-center justify-center w-6 h-6 rounded-md">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span>Réinitialiser {label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
