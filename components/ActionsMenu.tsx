import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, DatabaseBackup, Upload, Download } from 'lucide-react';
import { AuditCategory, AuditModuleType } from '../types';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from '../data/config';
import { CategoryIcon } from './CategoryIcon';
import { ModuleIcon } from './ModuleIcon';

// ========== EXPORT MENU COMPONENT ==========

interface ExportMenuProps {
    onExportByCategory: (category: AuditCategory) => void;
    onExportByModuleType: (moduleType: AuditModuleType) => void;
    onExportAll: () => void;
    onExportCurrentView: () => void;
    isModalOpen: boolean;
    activeFilter: AuditCategory | 'ALL';
    activeAuditFilters: AuditModuleType[];
    availableAuditTypes: AuditModuleType[];
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
    onExportByCategory, onExportByModuleType, onExportAll, onExportCurrentView, isModalOpen, activeFilter, activeAuditFilters, availableAuditTypes
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleClose = () => { if (isOpen && !isClosing) setIsClosing(true); };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isModalOpen) return;
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) handleClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, isClosing, isModalOpen]);

    const handleAnimationEnd = () => { if (isClosing) { setIsOpen(false); setIsClosing(false); } };
    const toggleMenu = () => { if (isOpen) handleClose(); else setIsOpen(true); };

    const isViewFiltered = activeFilter !== 'ALL' && activeAuditFilters.length > 0 && activeAuditFilters.length < availableAuditTypes.length;
    const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === activeFilter);
    const showAuditFilterIcons = activeAuditFilters.length > 0 && availableAuditTypes.length > 0 && activeAuditFilters.length < availableAuditTypes.length;

    let animationDelayCounter = 0;
    const getDelay = (increment = true) => {
        const delay = `${animationDelayCounter * 20}ms`;
        if (increment) animationDelayCounter++;
        return delay;
    };
    if (isOpen && !isClosing) animationDelayCounter = 0;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={toggleMenu}
                className="group inline-flex items-center justify-center gap-x-2 rounded-md px-3 py-2 text-sm font-semibold text-teal-600 dark:text-teal-400 ring-1 ring-inset ring-teal-600 dark:ring-teal-400 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-500 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-slate-900 transition-colors"
                aria-haspopup="true" aria-expanded={isOpen}
            >
                <Download className="h-5 w-5" />
                <span className="text-sm font-semibold">Exporter</span>
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen && !isClosing ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div className={`fixed inset-0 z-10 bg-black/10 dark:bg-black/40 backdrop-blur-[2px] ${isClosing ? 'backdrop-fade-out' : 'backdrop-fade-in'}`} onClick={handleClose} />
                    <div
                        onAnimationEnd={handleAnimationEnd}
                        className={`fixed top-1/2 left-1/2 w-72 sm:w-[36rem] rounded-md bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none z-20 ${isClosing ? 'menu-out-animate' : 'menu-in-animate'}`}
                        role="menu" aria-orientation="vertical"
                    >
                        <div className="py-1" role="none">
                            {isViewFiltered && (
                                <>
                                    <div className="px-4 py-2 title-animate" style={{ animationDelay: getDelay() }}><p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">📤 Export Personnalisé</p></div>
                                    <button onClick={() => { onExportCurrentView(); handleClose(); }} className="w-full text-left flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 menu-item-animate" role="menuitem" style={{ animationDelay: getDelay() }}>
                                        <span className="flex-1 min-w-0 truncate">Sélection actuelle (CSV)</span>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <CategoryIcon categoryConfig={categoryConfig} size="sm" />
                                            {showAuditFilterIcons && activeAuditFilters.map(type => {
                                                const config = AUDIT_MODULES_CONFIG.find(c => c.type === type);
                                                return config ? <div key={type} className="flex items-center justify-center w-5 h-5 bg-teal-100 dark:bg-teal-900/40 rounded-md" title={config.label}><ModuleIcon type={type} className="w-3 h-3 text-teal-700 dark:text-teal-300" /></div> : null;
                                            })}
                                        </div>
                                    </button>
                                    <div className="border-t border-gray-200 dark:border-slate-700 my-1 separator-animate" style={{ animationDelay: getDelay() }} />
                                </>
                            )}
                            <div className="sm:grid sm:grid-cols-2 sm:gap-x-2">
                                <div>
                                    <div className="px-4 py-2 title-animate" style={{ animationDelay: getDelay() }}><p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">📤 Export des données par ligne</p></div>
                                    <button onClick={() => { onExportAll(); handleClose(); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 menu-item-animate" role="menuitem" style={{ animationDelay: getDelay() }}>
                                        <CategoryIcon size="sm" /><span>Réseau complet (CSV)</span>
                                    </button>
                                    {AUDIT_CATEGORIES.map(cat => (
                                        <button key={`export-${cat.key}`} onClick={() => { onExportByCategory(cat.key); handleClose(); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 menu-item-animate" role="menuitem" style={{ animationDelay: getDelay() }}>
                                            <CategoryIcon categoryConfig={cat} size="sm" /><span>{cat.label} (CSV)</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="sm:border-l sm:border-gray-200 sm:dark:border-slate-700 sm:pl-2">
                                    <div className="px-4 py-2 title-animate" style={{ animationDelay: getDelay() }}><p className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">📤 Export des audits par type</p></div>
                                    {AUDIT_MODULES_CONFIG.map(({ type, label, Icon }) => (
                                        <button key={`export-module-${type}`} onClick={() => { onExportByModuleType(type); handleClose(); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 menu-item-animate" role="menuitem" style={{ animationDelay: getDelay() }}>
                                            <div className="flex items-center justify-center w-6 h-6 bg-slate-100 dark:bg-slate-600 rounded-md"><Icon className="w-4 h-4 text-gray-600 dark:text-slate-300" /></div>
                                            <span>{label.replace('Audits ', '').replace('Audits ', '')} (CSV)</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ========== SYNC & RESET MENU COMPONENT ==========

interface SyncMenuProps {
    onExportJson: () => void;
    onImportJson: () => void;
    onResetRequest: (target: { type: 'ALL' | 'CATEGORY' | 'MODULE_TYPE', value: any }) => void;
    isModalOpen: boolean;
}

export const SyncMenu: React.FC<SyncMenuProps> = ({ onExportJson, onImportJson, onResetRequest, isModalOpen }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleClose = () => { if (isOpen && !isClosing) setIsClosing(true); };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isModalOpen) return;
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) handleClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, isClosing, isModalOpen]);

    useEffect(() => { if (isOpen) setIsDangerZoneOpen(false); }, [isOpen]);
    const handleAnimationEnd = () => { if (isClosing) { setIsOpen(false); setIsClosing(false); } };
    const toggleMenu = () => { if (isOpen) handleClose(); else setIsOpen(true); };
    const handleReset = (type: 'ALL' | 'CATEGORY' | 'MODULE_TYPE', value: any) => { onResetRequest({ type, value }); };

    let animationDelayCounter = 0;
    const getDelay = (increment = true) => {
        const delay = `${animationDelayCounter * 20}ms`;
        if (increment) animationDelayCounter++;
        return delay;
    };
    if (isOpen && !isClosing) animationDelayCounter = 0;
    
    const prCategory = AUDIT_CATEGORIES.find(c => c.key === 'PR');
    const prModule = AUDIT_MODULES_CONFIG.find(m => m.type === AuditModuleType.PR);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={toggleMenu}
                className="group inline-flex items-center justify-center gap-x-2 rounded-md px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600 dark:ring-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors"
                aria-haspopup="true" aria-expanded={isOpen}
            >
                <DatabaseBackup className="h-5 w-5" />
                <span className="text-sm font-semibold">Synchroniser</span>
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen && !isClosing ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                 <>
                    <div className={`fixed inset-0 z-10 bg-black/10 dark:bg-black/40 backdrop-blur-[2px] ${isClosing ? 'backdrop-fade-out' : 'backdrop-fade-in'}`} onClick={handleClose} />
                    <div
                        onAnimationEnd={handleAnimationEnd}
                        className={`fixed top-1/2 left-1/2 w-72 sm:w-[36rem] rounded-md bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none z-20 ${isClosing ? 'menu-out-animate' : 'menu-in-animate'}`}
                        role="menu" aria-orientation="vertical"
                    >
                        <div className="py-1" role="none">
                            <div className="px-4 py-2 title-animate" style={{ animationDelay: getDelay() }}><p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Sauvegarde & Restauration</p></div>
                            <button onClick={() => { onExportJson(); handleClose(); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 menu-item-animate" role="menuitem" style={{ animationDelay: getDelay() }}>
                                <Download className="w-4 h-4 text-gray-500 dark:text-slate-400" /><span>Sauvegarder les données (.json)</span>
                            </button>
                            <button onClick={() => { onImportJson(); handleClose(); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100 menu-item-animate" role="menuitem" style={{ animationDelay: getDelay() }}>
                                <Upload className="w-4 h-4 text-gray-500 dark:text-slate-400" /><span>Restaurer une sauvegarde (.json)</span>
                            </button>
                            <div className="border-t border-gray-200 dark:border-slate-700 my-1 separator-animate" style={{ animationDelay: getDelay() }} />
                            <button onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)} className="w-full text-left flex items-center justify-between gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 title-animate" aria-expanded={isDangerZoneOpen} style={{ animationDelay: getDelay() }}>
                                <div className="flex items-center gap-3"><DatabaseBackup className="w-4 h-4" /><span>Zone de Danger – Actions irréversibles</span></div>
                                <ChevronDown className={`h-5 w-5 transition-transform ${isDangerZoneOpen ? 'rotate-180' : ''}`} />
                            </button>
                           {isDangerZoneOpen && (
                                <div className="p-2 border-t border-gray-200 dark:border-slate-700">
                                    <div className="px-2 pt-2">
                                        <p className="text-xs text-gray-500 dark:text-slate-400">Remet à zéro les données d'audit pour les catégories sélectionnées.</p>
                                    </div>

                                    <div className="mt-4">
                                        <p className="px-2 text-sm font-medium text-gray-800 dark:text-slate-200">🔥 Remise à zéro complète</p>
                                        <div className="mt-1">
                                            <button onClick={() => handleReset('ALL', 'ALL')} className="w-full text-left flex items-center gap-3 px-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md" role="menuitem">
                                                <DatabaseBackup className="w-4 h-4 flex-shrink-0" />
                                                <span>Effacer toutes les données réseau</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4">
                                        <p className="px-2 text-sm font-medium text-gray-800 dark:text-slate-200">⚠️ Réinitialisation par ligne</p>
                                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                            {AUDIT_CATEGORIES.filter(c => c.key !== 'PR').map(cat => (
                                                <button key={`reset-${cat.key}`} onClick={() => handleReset('CATEGORY', cat.key)} className="w-full text-left flex items-center gap-3 px-2 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md" role="menuitem">
                                                    <CategoryIcon categoryConfig={cat} size="sm" />
                                                    <span className="flex-1 truncate">{cat.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <p className="px-2 text-sm font-medium text-gray-800 dark:text-slate-200">🔸 Équipements et audits</p>
                                        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                            {AUDIT_MODULES_CONFIG.filter(m => m.type !== AuditModuleType.PR).map(({ type, label, Icon }) => (
                                                <button key={`reset-module-${type}`} onClick={() => handleReset('MODULE_TYPE', type)} className="w-full text-left flex items-center gap-3 px-2 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md" role="menuitem">
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0"><Icon className="w-4 h-4" /></div>
                                                    <span className="flex-1 truncate">{label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {prCategory && prModule && (
                                        <div className="mt-4">
                                            <p className="px-2 text-sm font-medium text-gray-800 dark:text-slate-200">➕ Zones spécifiques</p>
                                            <div className="mt-1">
                                                <button onClick={() => handleReset('CATEGORY', 'PR')} className="w-full text-left flex items-center gap-3 px-2 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md" role="menuitem">
                                                    <CategoryIcon categoryConfig={prCategory} size="sm" />
                                                    <span className="flex-1 truncate">{prCategory.label}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};