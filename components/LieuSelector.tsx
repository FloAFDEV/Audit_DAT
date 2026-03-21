
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lieu, AuditModuleType, AuditCategory, AuditCategoryConfig, ModeData } from '../types';
import { Search, ArrowUpDown, ChevronDown, LogOut, Upload, Check, BarChart3 } from 'lucide-react';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from '../data/config';
import { CategoryIcon } from './CategoryIcon';
import ConfirmationModal from './ConfirmationModal';
import { ExportMenu, SyncMenu } from './ActionsMenu';
import toast from 'react-hot-toast';
import ThemeSelector from './ThemeSelector';
import { getCategoryProgress } from '../utils/progressCalculators';
import { AuditFilterSelector } from './AuditFilterSelector';
import useAuditStore from '../store';
import { LieuCard } from './LieuCard';
import { useLieuList } from '../hooks/useLieuList';
import { ProgressBadge } from './ProgressBadge';
import { LieuBadges } from './Icons';
import { ModuleIcon } from './ModuleIcon';
import { Logo } from './Logo';

type ResetTarget = { type: 'ALL' | 'CATEGORY' | 'MODULE_TYPE', value: any };

// New sub-component to render search results with station codes
const SearchResultItem: React.FC<{ lieu: Lieu; onClick: () => void }> = ({ lieu, onClick }) => {
    const stationCodes = useMemo(() => lieu.modules
        .filter(m => m.type === AuditModuleType.DAT)
        .map(m => (m.data as ModeData).stations?.[0]?.code)
        .filter((code): code is string => !!code)
        .filter((value, index, self) => self.indexOf(value) === index), [lieu]);

    return (
        <li
            className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-slate-700"
            onClick={onClick}
        >
            <div className="flex items-center gap-x-3">
                <LieuBadges lieu={lieu} />
                <div className="flex flex-col min-w-0">
                    <span className="block truncate font-medium">{lieu.name}</span>
                    {stationCodes.length > 0 && (
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                            {stationCodes.join(' / ')}
                        </span>
                    )}
                </div>
            </div>
        </li>
    );
};

interface LieuSelectorProps {
  lieux: Lieu[];
  onSelectLieu: (lieuId: string) => void;
  activeFilter: AuditCategory | 'ALL';
  onFilterChange: (filter: AuditCategory | 'ALL') => void;
  onExportByCategory: (category: AuditCategory) => void;
  onExportByModuleType: (moduleType: AuditModuleType) => void;
  onExportAll: () => void;
  onExportCurrentView: () => void;
  onExportJson: () => void;
  onImportJson: (fileContent: string) => void;
  onResetCategory: (category: AuditCategory) => void;
  onResetByModuleType: (moduleType: AuditModuleType) => void;
  onResetAll: () => void;
  onRequestLogout: () => void;
}

const LieuSelector: React.FC<LieuSelectorProps> = (props) => {
    const { 
        lieux, onSelectLieu, activeFilter, onFilterChange, onExportByCategory, onExportByModuleType, 
        onExportAll, onExportCurrentView, onExportJson, onImportJson, onResetCategory, onResetByModuleType, onResetAll, onRequestLogout 
    } = props;
    
    const { activeAuditFilters, setIsStatsViewActive } = useAuditStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isOrderReversed, setIsOrderReversed] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importFileContent, setImportFileContent] = useState<string | null>(null);

    const getSortOrderKey = (filter: AuditCategory | 'ALL') => `tisseo-audit-sort-order-${filter}`;

    useEffect(() => {
        try {
            const savedOrder = localStorage.getItem(getSortOrderKey(activeFilter));
            setIsOrderReversed(savedOrder === 'reversed');
        } catch (error) {
            console.error("Failed to read sort order from localStorage", error);
            setIsOrderReversed(false);
        }
    }, [activeFilter]);

    const toggleOrderReversed = () => {
        const newIsReversed = !isOrderReversed;
        setIsOrderReversed(newIsReversed);
        try {
            localStorage.setItem(getSortOrderKey(activeFilter), newIsReversed ? 'reversed' : 'normal');
        } catch (error) {
            console.error("Failed to save sort order to localStorage", error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) setIsMobileMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const { orderedLieuxForDisplay, searchResults, availableAuditTypes } = useLieuList({
        lieux, searchQuery, activeFilter, isOrderReversed, activeAuditFilters
    });
    
    const handleSelectLieuFromDropdown = (lieu: Lieu) => {
        setSearchQuery('');
        setIsDropdownOpen(false);
        onSelectLieu(lieu.id);
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => setImportFileContent(e.target?.result as string);
        reader.onerror = (e) => {
            console.error("Failed to read file", e);
            toast.error("Erreur lors de la lecture du fichier.");
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleConfirmImport = () => {
        if (importFileContent) onImportJson(importFileContent);
        setImportFileContent(null);
    };

    // FIX: Defined handleResetRequest to set the state for the confirmation modal.
    const handleResetRequest = (target: ResetTarget) => {
        setResetTarget(target);
    };

    const showInverter = activeFilter !== 'ALL';
    const activeCategoryConfig = useMemo(() => AUDIT_CATEGORIES.find(c => c.key === activeFilter), [activeFilter]);
    
    const getCategoryHoverColor = (catKey: AuditCategory | 'ALL'): string => {
        if (catKey === 'ALL') return '#0284c7'; // sky-600
        const category = AUDIT_CATEGORIES.find(c => c.key === catKey);
        return category?.colors.hoverPrimary || category?.colors.primary || '#64748b';
    };

    const getTabButtonStyle = (catKey: AuditCategory | 'ALL') => {
        if (activeFilter !== catKey) return {};
        const color = getCategoryHoverColor(catKey);
        return { borderColor: color, color: color };
    };
    
    const getTabButtonClass = (catKey: AuditCategory | 'ALL') => {
        const baseClasses = 'whitespace-nowrap border-b-2 py-4 px-1 text-sm transition-colors duration-75 flex items-center gap-2 tracking-wide';
        if (activeFilter === catKey) return `${baseClasses} font-medium`;
        return `${baseClasses} border-transparent text-slate-500 dark:text-slate-400 hover:text-[var(--hover-color)] hover:border-[var(--hover-color)] font-normal`;
    };

    const handleConfirmReset = () => {
        if (resetTarget) {
            if (resetTarget.type === 'ALL') onResetAll();
            else if (resetTarget.type === 'CATEGORY') onResetCategory(resetTarget.value);
            else if (resetTarget.type === 'MODULE_TYPE') onResetByModuleType(resetTarget.value);
        }
        setResetTarget(null);
    };

    const resetModalProps = useMemo(() => {
        if (!resetTarget) return { isOpen: false };
    
        let title = "Confirmation";
        let message = "Êtes-vous sûr ?";
        let icon = null;
    
        if (resetTarget.type === 'ALL') {
            title = "Réinitialiser toutes les données";
            message = "Êtes-vous sûr de vouloir réinitialiser l'intégralité de l'application ? Toutes vos données seront perdues et remplacées par les données initiales.";
        } else if (resetTarget.type === 'CATEGORY') {
            const config = AUDIT_CATEGORIES.find(c => c.key === resetTarget.value);
            title = `Réinitialiser ${config?.label}`;
            message = `Êtes-vous sûr de vouloir réinitialiser toutes les données pour la catégorie "${config?.label}" ?`;
            icon = <CategoryIcon categoryConfig={config} size="sm" />;
        } else if (resetTarget.type === 'MODULE_TYPE') {
            const config = AUDIT_MODULES_CONFIG.find(c => c.type === resetTarget.value);
            title = `Réinitialiser ${config?.label}`;
            message = `Êtes-vous sûr de vouloir réinitialiser toutes les données pour le type d'audit "${config?.label}" ?`;
            icon = <ModuleIcon type={config!.type} className="w-4 h-4 text-gray-700 dark:text-slate-300" />;
        }
    
        return { isOpen: true, title, message, icon };
    }, [resetTarget]);

    const placeholderText = activeFilter === 'ALL'
        ? "Rechercher un lieu..."
        : `Rechercher dans ${activeCategoryConfig?.label}...`;

    return (
        <div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/json" className="hidden" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                <div className="flex items-center gap-4">
                    <Logo className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600 dark:text-teal-400" />
                    <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100">Tableau de Bord des Audits</h2>
                </div>
                 <div className="flex items-center gap-x-2 sm:gap-x-4 self-end sm:self-center">
                    <button onClick={() => setIsStatsViewActive(true)} className="flex-shrink-0 p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors" aria-label="Afficher les statistiques" title="Afficher les statistiques">
                        <BarChart3 className="w-5 h-5" />
                    </button>
                    <ThemeSelector />
                    <button onClick={onRequestLogout} className="flex-shrink-0 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-normal text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors" aria-label="Se déconnecter">
                        <LogOut className="w-5 h-5" />
                        <span className="hidden md:inline">Déconnexion</span>
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <div className="hidden sm:block">
                    <div className="border-b border-gray-200 dark:border-slate-700">
                        <nav className="-mb-px flex flex-wrap gap-x-8" aria-label="Tabs">
                            {/* FIX: Cast to `unknown` to allow custom CSS properties, resolving a TypeScript error where '--hover-color' was not recognized on the CSSProperties type. */}
                            <button onClick={() => onFilterChange('ALL')} className={getTabButtonClass('ALL')} style={{ ...getTabButtonStyle('ALL'), '--hover-color': getCategoryHoverColor('ALL') } as unknown as React.CSSProperties}>
                                Tout le réseau
                                <ProgressBadge progress={getCategoryProgress(lieux, 'ALL', activeAuditFilters)} isActive={activeFilter === 'ALL'} />
                            </button>
                            {AUDIT_CATEGORIES.map(cat => (
                                // FIX: Cast to `unknown` to allow custom CSS properties, resolving a TypeScript error where '--hover-color' was not recognized on the CSSProperties type.
                                <button key={cat.key} onClick={() => onFilterChange(cat.key)} className={getTabButtonClass(cat.key)} style={{ ...getTabButtonStyle(cat.key), '--hover-color': getCategoryHoverColor(cat.key) } as unknown as React.CSSProperties}>
                                    {cat.label}
                                    <ProgressBadge progress={getCategoryProgress(lieux, cat.key, activeAuditFilters)} isActive={activeFilter === cat.key} />
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
                 <div className="sm:hidden">
                    <div className="relative" ref={mobileMenuRef}>
                        <button type="button" className="relative w-full cursor-default rounded-md bg-white dark:bg-slate-800 py-2 pl-3 pr-10 text-left text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6" onClick={() => setIsMobileMenuOpen(prev => !prev)} aria-haspopup="listbox" aria-expanded={isMobileMenuOpen}>
                             <span className="flex items-center justify-between w-full">
                                <span className="flex items-center">
                                    <CategoryIcon categoryConfig={activeCategoryConfig} size="sm" asDiv />
                                    <span className="ml-3 block truncate">{activeCategoryConfig?.label ?? 'Tout le réseau'}</span>
                                </span>
                                <ProgressBadge progress={getCategoryProgress(lieux, activeFilter, activeAuditFilters)} isActive={true} />
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2"><ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" /></span>
                        </button>

                        {isMobileMenuOpen && (
                            <ul className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black dark:ring-slate-600 ring-opacity-5 focus:outline-none sm:text-sm">
                                <li className="text-gray-900 dark:text-slate-100 relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-50 dark:hover:bg-slate-700" onClick={() => { onFilterChange('ALL'); setIsMobileMenuOpen(false); }}>
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                            <CategoryIcon size="sm" asDiv />
                                            <span className="ml-3 block truncate">Tout le réseau</span>
                                        </div>
                                        <ProgressBadge progress={getCategoryProgress(lieux, 'ALL', activeAuditFilters)} isActive={activeFilter === 'ALL'} />
                                    </div>
                                    {activeFilter === 'ALL' && <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 dark:text-indigo-400"><Check className="h-5 w-5" aria-hidden="true" /></span>}
                                </li>
                                {AUDIT_CATEGORIES.map(cat => (
                                    <li key={cat.key} className="text-gray-900 dark:text-slate-100 relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-50 dark:hover:bg-slate-700" onClick={() => { onFilterChange(cat.key); setIsMobileMenuOpen(false); }}>
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center">
                                                <CategoryIcon categoryConfig={cat} size="sm" asDiv />
                                                <span className="ml-3 block truncate">{cat.label}</span>
                                            </div>
                                            <ProgressBadge progress={getCategoryProgress(lieux, cat.key, activeAuditFilters)} isActive={activeFilter === cat.key} />
                                        </div>
                                        {activeFilter === cat.key && <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 dark:text-indigo-400"><Check className="h-5 w-5" aria-hidden="true" /></span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {(activeFilter === 'ALL' || availableAuditTypes.length > 1) && (
                <AuditFilterSelector availableAuditTypes={availableAuditTypes} />
            )}
            
            <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="relative w-full sm:flex-grow" ref={searchContainerRef}>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Search className="h-5 w-5 text-gray-400 dark:text-slate-400" aria-hidden="true" />
                    </div>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsDropdownOpen(true)} placeholder={placeholderText} className="block w-full rounded-lg border-0 bg-white dark:bg-slate-700 py-3 pl-12 pr-4 text-gray-900 dark:text-slate-50 shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-slate-600 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base" autoComplete="off" />
                    {isDropdownOpen && (
                        <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg border border-gray-200 dark:border-slate-600 focus:outline-none sm:text-sm">
                            {searchResults.inCategory.length === 0 && searchResults.others.length === 0 && searchQuery.trim() && (
                                <li className="relative select-none py-2 px-4 text-gray-500">Aucun résultat trouvé.</li>
                            )}
                            {searchResults.inCategory.map(lieu => (
                                <SearchResultItem key={lieu.id} lieu={lieu} onClick={() => handleSelectLieuFromDropdown(lieu)} />
                            ))}
                            {searchResults.others.length > 0 && (
                                <li className="relative py-2">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-300 dark:border-slate-600" /></div>
                                    <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-800 px-3 text-sm font-medium text-gray-500 dark:text-slate-400">Résultats dans d'autres catégories</span></div>
                                </li>
                            )}
                            {searchResults.others.map(lieu => (
                                <SearchResultItem key={lieu.id} lieu={lieu} onClick={() => handleSelectLieuFromDropdown(lieu)} />
                            ))}
                        </ul>
                    )}
                </div>
                <div className="flex-shrink-0 flex flex-wrap w-full sm:flex-nowrap sm:w-auto items-center justify-center sm:justify-end gap-4">
                    {showInverter && (
                        <button 
                            onClick={toggleOrderReversed} 
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-x-2 rounded-md bg-white px-3 py-2 text-sm font-normal text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900" 
                            title="Inverser l'ordre des stations"
                        >
                            <ArrowUpDown className="h-5 w-5" />
                            <span>Inverser l'ordre des stations</span>
                        </button>
                    )}
                    <div className="flex w-full sm:w-auto justify-center sm:justify-end gap-4">
                        <ExportMenu
                            onExportByCategory={onExportByCategory}
                            onExportByModuleType={onExportByModuleType}
                            onExportAll={onExportAll}
                            onExportCurrentView={onExportCurrentView}
                            isModalOpen={!!resetTarget || !!importFileContent}
                            activeFilter={activeFilter}
                            activeAuditFilters={activeAuditFilters}
                            availableAuditTypes={availableAuditTypes}
                        />
                        <SyncMenu
                            onExportJson={onExportJson}
                            onImportJson={handleImportClick}
                            onResetRequest={handleResetRequest}
                            isModalOpen={!!resetTarget || !!importFileContent}
                        />
                    </div>
                </div>
            </div>

            {orderedLieuxForDisplay.length === 0 ? (
                 <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">Aucun lieu</h3>
                    <p className="mt-1 text-sm font-light text-slate-500 dark:text-slate-400">Aucun lieu n'est disponible pour les filtres actifs.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orderedLieuxForDisplay.map((lieu) => <LieuCard key={lieu.id} lieu={lieu} onSelect={() => onSelectLieu(lieu.id)} activeFilter={activeFilter} />)}
                </div>
            )}

            <ConfirmationModal 
                isOpen={resetModalProps.isOpen} 
                onClose={() => setResetTarget(null)} 
                onConfirm={handleConfirmReset} 
                title={resetModalProps.title || ''}
                message={resetModalProps.message || ''}
                icon={resetModalProps.icon} 
                isDestructive 
            />
            <ConfirmationModal isOpen={!!importFileContent} onClose={() => setImportFileContent(null)} onConfirm={handleConfirmImport} title="Importer les données" message="Êtes-vous sûr de vouloir importer ce fichier ? Toutes les données actuelles seront remplacées par le contenu du fichier." mainIcon={<div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 sm:mx-0 sm:h-10 sm:w-10"><Upload className="h-6 w-6 text-sky-600" aria-hidden="true" /></div>} confirmButtonClass="inline-flex w-full justify-center rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 sm:ml-3 sm:w-auto" icon={<Upload className="h-5 w-5 text-sky-600" />} isDestructive />
        </div>
    );
};

export default LieuSelector;
