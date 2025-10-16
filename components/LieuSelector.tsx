import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Lieu, AuditModuleType, AuditCategory, AuditCategoryConfig, ModeData, Pr, EcaData, PMRFloorAdhesiveData, Station, AdhesiveStatus, FloorAdhesiveStatus } from '../types';
import { LieuBadges } from './Icons';
import { ChevronRight, Search, ArrowRightLeft, ChevronDown, LogOut, Upload } from 'lucide-react';
import { getLieuxForCategory } from '../data/builder';
import { AUDIT_CATEGORIES } from '../data/config';
import { CategoryIcon } from './CategoryIcon';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import ConfirmationModal from './ConfirmationModal';
import { ActionsMenu } from './ActionsMenu';
import toast from 'react-hot-toast';
import ThemeSelector from './ThemeSelector';
import { sortLieuxByPhysicalOrder } from '../utils/csvExporter';
import { getEcaAdhesives } from '../data/adhesives';

interface LieuSelectorProps {
  lieux: Lieu[];
  onSelectLieu: (lieuId: string) => void;
  activeFilter: AuditCategory | 'ALL';
  onFilterChange: (filter: AuditCategory | 'ALL') => void;
  onExportByCategory: (category: AuditCategory) => void;
  onExportByModuleType: (moduleType: AuditModuleType) => void;
  onExportAll: () => void;
  onExportJson: () => void;
  onImportJson: (fileContent: string) => void;
  onResetCategory: (category: AuditCategory) => void;
  onResetAll: () => void;
  onRequestLogout: () => void;
}

const getLieuProgress = (lieu: Lieu): number => {
    if (!lieu?.modules) return 0;

    let totalApplicableItems = 0;
    let totalCheckedItems = 0;

    for (const module of lieu.modules) {
        if (module.isFuture) continue;

        switch (module.type) {
            case AuditModuleType.DAT: {
                const modeData = module.data as ModeData;
                const dats = modeData.stations?.flatMap(s => s.directions?.flatMap(d => d.dats ?? []) ?? []) ?? [];
                for (const dat of dats) {
                    const statuses = Object.values(dat.adhesives);
                    totalApplicableItems += statuses.length;
                    totalCheckedItems += statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
                }
                break;
            }
            case AuditModuleType.PR: {
                const prData = module.data as Pr;
                const equipments = prData.equipments ?? [];
                for (const equipment of equipments) {
                    const statuses = Object.values(equipment.adhesives);
                    totalApplicableItems += statuses.length;
                    totalCheckedItems += statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
                }
                break;
            }
            case AuditModuleType.ECA: {
                const ecaData = module.data as EcaData;
                const ecas = ecaData.ecas ?? [];
                for (const eca of ecas) {
                    if (eca.isNotApplicable) {
                        continue;
                    }
                    const adhesiveDefinitions = getEcaAdhesives(eca.type);
                    for (const adDef of adhesiveDefinitions) {
                        const status = eca.adhesives[adDef.id];
                        if (status !== AdhesiveStatus.NotApplicable) {
                            totalApplicableItems++;
                            if (status && status !== AdhesiveStatus.NotChecked) {
                                totalCheckedItems++;
                            }
                        }
                    }
                }
                break;
            }
            case AuditModuleType.PMR_FLOOR_ADHESIVE: {
                const pmrData = module.data as PMRFloorAdhesiveData;
                const adhesives = pmrData.adhesives ?? [];
                totalApplicableItems += adhesives.length;
                totalCheckedItems += adhesives.filter(a => a.status !== FloorAdhesiveStatus.NotChecked).length;
                break;
            }
        }
    }

    if (totalApplicableItems === 0) {
        return 100;
    }

    return (totalCheckedItems / totalApplicableItems) * 100;
};


const LieuCard: React.FC<{ lieu: Lieu; onSelect: () => void; progress: number }> = ({ lieu, onSelect, progress }) => {
    const cardBgClass = 'bg-white dark:bg-slate-800';
    
    const stationCodes = lieu.modules
        .filter(m => m.type === AuditModuleType.DAT)
        .map(m => (m.data as ModeData).stations[0].code)
        .filter((code): code is string => !!code)
        .filter((value, index, self) => self.indexOf(value) === index);

    const isInProgress = progress > 0 && progress < 100;
    const progressBarColor = isInProgress ? 'bg-amber-500 dark:bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';

    return (
        <button
            onClick={onSelect}
            className={`${cardBgClass} p-4 rounded-lg shadow hover:shadow-lg transition-all duration-300 text-left w-full group flex flex-col h-full dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600`}
        >
            <div className="flex justify-between items-center">
                 <div className="flex items-center gap-x-2 flex-wrap min-w-0">
                    <LieuBadges lieu={lieu} />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 truncate">{lieu.name}</h3>
                     {stationCodes.length > 0 && (
                        <span className="flex-shrink-0 bg-gray-200 text-gray-700 text-xs font-mono font-bold px-2 py-1 rounded dark:bg-slate-700 dark:text-slate-300">
                            {stationCodes.join(' / ')}
                        </span>
                    )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-200 transition-colors flex-shrink-0 ml-2"/>
            </div>
            <div className="mt-auto pt-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Progression</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-slate-700">
                    <div className={`${progressBarColor} h-1.5 rounded-full`} style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </button>
    );
};

const lineStationsMap: { [key in AuditCategory]?: Partial<Station>[] } = {
    METRO_A: LINE_A_STATIONS,
    METRO_B: LINE_B_STATIONS,
    METRO_C: LINE_C_STATIONS,
    TRAM: TRAM_STATIONS,
    TELEO: TELEO_STATIONS,
};


const LieuSelector: React.FC<LieuSelectorProps> = ({ lieux, onSelectLieu, activeFilter, onFilterChange, onExportByCategory, onExportByModuleType, onExportAll, onExportJson, onImportJson, onResetCategory, onResetAll, onRequestLogout }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOrderReversed, setIsOrderReversed] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const [resetTarget, setResetTarget] = useState<AuditCategory | 'ALL' | null>(null);
    const [resetTargetConfig, setResetTargetConfig] = useState<AuditCategoryConfig | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importFileContent, setImportFileContent] = useState<string | null>(null);

    const getSortOrderKey = (filter: AuditCategory | 'ALL') => `tisseo-audit-sort-order-${filter}`;

    // Effect to LOAD the sort preference when the filter changes
    useEffect(() => {
        try {
            const savedOrder = localStorage.getItem(getSortOrderKey(activeFilter));
            setIsOrderReversed(savedOrder === 'reversed');
        } catch (error) {
            console.error("Failed to read sort order from localStorage", error);
            setIsOrderReversed(false); // Default to normal order on error
        }
    }, [activeFilter]);

    // Handler to toggle and SAVE the sort preference
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
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const orderedLieux = useMemo(() => {
        const lieuxSource = activeFilter === 'ALL' 
            ? sortLieuxByPhysicalOrder([...lieux])
            : getLieuxForCategory(lieux, activeFilter);

        const stationOrderList = lineStationsMap[activeFilter as AuditCategory];
        let sortedByLine = lieuxSource;

        if (stationOrderList) {
            const stationOrderMap = new Map<string, number>();
            stationOrderList.forEach((station, index) => {
                const lieuName = station.lieuName || station.name;
                if(lieuName) stationOrderMap.set(lieuName, index);
            });
          
            sortedByLine = [...lieuxSource].sort((a, b) => {
                const orderA = stationOrderMap.get(a.name);
                const orderB = stationOrderMap.get(b.name);
                if (orderA !== undefined && orderB !== undefined) {
                    return orderA - orderB;
                }
                return a.name.localeCompare(b.name);
            });
        }

        const ordered = isOrderReversed ? [...sortedByLine].reverse() : sortedByLine;

        if (!searchQuery.trim()) {
            return ordered;
        }
        
        const normalizedQuery = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return ordered.filter(l => {
            const normalizedName = l.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedQuery);
            
            const stationCodes = l.modules
                .filter(m => m.type === AuditModuleType.DAT)
                .map(m => (m.data as ModeData).stations[0].code)
                .filter((code): code is string => !!code);
            
            const matchesCode = stationCodes.some(code => code.toLowerCase().includes(normalizedQuery));
            
            return normalizedName || matchesCode;
        });
    }, [searchQuery, lieux, activeFilter, isOrderReversed]);
    
    const handleSelectLieuFromDropdown = (lieu: Lieu) => {
        setSearchQuery(lieu.name);
        setIsDropdownOpen(false);
        onSelectLieu(lieu.id);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setImportFileContent(text);
        };
        reader.onerror = (e) => {
            console.error("Failed to read file", e);
            toast.error("Erreur lors de la lecture du fichier.");
        };
        reader.readAsText(file);

        // Reset input value to allow re-uploading the same file
        event.target.value = '';
    };

    const handleConfirmImport = () => {
        if (importFileContent) {
            onImportJson(importFileContent);
        }
        setImportFileContent(null);
    };

    const showInverter = activeFilter !== 'ALL' && activeFilter !== 'PR';
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
        const baseClasses = 'whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors duration-150';
        if (activeFilter === catKey) {
            return baseClasses;
        }
        return `${baseClasses} border-transparent text-gray-500 dark:text-slate-400 hover:text-[var(--hover-color)] hover:border-[var(--hover-color)]`;
    };
    
    const handleResetRequest = (category: AuditCategory | 'ALL') => {
        setResetTarget(category);
        if (category !== 'ALL') {
            const config = AUDIT_CATEGORIES.find(c => c.key === category);
            setResetTargetConfig(config || null);
        } else {
            setResetTargetConfig(null);
        }
    };

    const handleConfirmReset = () => {
        if (resetTarget) {
            if (resetTarget === 'ALL') {
                onResetAll();
            } else {
                onResetCategory(resetTarget);
            }
        }
        setResetTarget(null);
        setResetTargetConfig(null);
    };

    const handleCancelReset = () => {
        setResetTarget(null);
        setResetTargetConfig(null);
    };

    return (
        <div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/json"
                className="hidden"
            />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Tableau de Bord des Audits</h2>
                 <div className="flex items-center gap-x-2 sm:gap-x-4 self-end sm:self-center">
                    <ThemeSelector />
                    <button
                        onClick={onRequestLogout}
                        className="flex-shrink-0 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="Se déconnecter"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="hidden md:inline">Déconnexion</span>
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <div className="hidden sm:block">
                    <div className="border-b border-gray-200 dark:border-slate-700">
                        <nav className="-mb-px flex flex-wrap gap-x-6" aria-label="Tabs">
                            <button
                                onClick={() => onFilterChange('ALL')}
                                className={getTabButtonClass('ALL')}
                                style={{
                                    ...getTabButtonStyle('ALL'),
                                    '--hover-color': getCategoryHoverColor('ALL'),
                                } as unknown as React.CSSProperties}
                            >
                                Tout le réseau
                            </button>
                            {AUDIT_CATEGORIES.map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => onFilterChange(cat.key)}
                                    className={getTabButtonClass(cat.key)}
                                    style={{
                                        ...getTabButtonStyle(cat.key),
                                        '--hover-color': getCategoryHoverColor(cat.key)
                                    } as unknown as React.CSSProperties}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>
                 <div className="sm:hidden">
                    <div className="relative" ref={mobileMenuRef}>
                        <button
                            type="button"
                            className="relative w-full cursor-default rounded-md bg-white dark:bg-slate-800 py-2 pl-3 pr-10 text-left text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm sm:leading-6"
                            onClick={() => setIsMobileMenuOpen(prev => !prev)}
                            aria-haspopup="listbox"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <span className="flex items-center">
                                <CategoryIcon categoryConfig={activeCategoryConfig} size="sm" />
                                <span className="ml-3 block truncate">{activeCategoryConfig?.label ?? 'Tout le réseau'}</span>
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
                                <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                        </button>

                        {isMobileMenuOpen && (
                            <ul className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black dark:ring-slate-600 ring-opacity-5 focus:outline-none sm:text-sm">
                                <li
                                    className="text-gray-900 dark:text-slate-100 relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-50 dark:hover:bg-slate-700"
                                    onClick={() => {
                                        onFilterChange('ALL');
                                        setIsMobileMenuOpen(false);
                                    }}
                                >
                                    <div className="flex items-center">
                                        <CategoryIcon size="sm" />
                                        <span className={`font-normal ml-3 block truncate ${activeFilter === 'ALL' ? 'font-semibold' : ''}`}>
                                            Tout le réseau
                                        </span>
                                    </div>
                                </li>

                                {AUDIT_CATEGORIES.map((cat) => (
                                    <li
                                        key={cat.key}
                                        className="text-gray-900 dark:text-slate-100 relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-indigo-50 dark:hover:bg-slate-700"
                                        onClick={() => {
                                            onFilterChange(cat.key);
                                            setIsMobileMenuOpen(false);
                                        }}
                                    >
                                        <div className="flex items-center">
                                            <CategoryIcon categoryConfig={cat} size="sm" />
                                            <span className={`font-normal ml-3 block truncate ${activeFilter === cat.key ? 'font-semibold' : ''}`}>
                                                {cat.label}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-grow" ref={searchContainerRef}>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Search className="h-5 w-5 text-gray-400 dark:text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Rechercher un lieu..."
                        className="block w-full rounded-lg border-0 bg-white dark:bg-slate-700 py-3 pl-12 pr-4 text-gray-900 dark:text-slate-50 shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-slate-600 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-base"
                        autoComplete="off"
                    />
                    {isDropdownOpen && orderedLieux.length > 0 && (
                        <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg border border-gray-200 dark:border-slate-600 focus:outline-none sm:text-sm">
                            {orderedLieux.map((lieu) => {
                                const stationCodes = lieu.modules
                                    .filter(m => m.type === AuditModuleType.DAT)
                                    .map(m => (m.data as ModeData).stations[0].code)
                                    .filter((code): code is string => !!code)
                                    .filter((value, index, self) => self.indexOf(value) === index);
                                    
                                return (
                                <li
                                    key={lieu.id}
                                    className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-slate-700"
                                    onClick={() => handleSelectLieuFromDropdown(lieu)}
                                >
                                    <div className="flex items-center gap-x-2">
                                        <LieuBadges lieu={lieu} />
                                        <span className="block truncate font-semibold">{lieu.name}</span>
                                        {stationCodes.length > 0 && (
                                            <span className="flex-shrink-0 bg-gray-200 text-gray-700 text-xs font-mono font-bold px-2 py-1 rounded dark:bg-slate-700 dark:text-slate-300">
                                                {stationCodes.join(' / ')}
                                            </span>
                                        )}
                                    </div>
                                </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                <div className="flex-shrink-0 flex items-stretch sm:items-center gap-4">
                    {showInverter && (
                        <button
                            onClick={toggleOrderReversed}
                            className="flex flex-col items-center justify-center text-center px-4 py-2 rounded-md bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors h-full"
                            title="Inverser le sens de la ligne"
                        >
                            <ArrowRightLeft className="h-5 w-5" />
                            <span className="text-xs font-semibold mt-1">Inverser</span>
                        </button>
                    )}
                    <ActionsMenu
                        onExportByCategory={onExportByCategory}
                        onExportByModuleType={onExportByModuleType}
                        onExportAll={onExportAll}
                        onExportJson={onExportJson}
                        onImportJson={handleImportClick}
                        onResetRequest={handleResetRequest}
                        isModalOpen={!!resetTarget || !!importFileContent}
                    />
                </div>
            </div>

            {orderedLieux.length === 0 && searchQuery ? (
                 <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Aucun lieu trouvé</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Votre recherche ne correspond à aucun lieu.</p>
                </div>
            ) : orderedLieux.length === 0 && !searchQuery ? (
                 <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Aucun lieu</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Aucun lieu n'est disponible pour ce filtre.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(!isDropdownOpen || !searchQuery) && orderedLieux.map((lieu) => {
                        const progress = getLieuProgress(lieu);
                        return <LieuCard key={lieu.id} lieu={lieu} onSelect={() => onSelectLieu(lieu.id)} progress={progress} />;
                    })}
                </div>
            )}

            <ConfirmationModal
                isOpen={!!resetTarget}
                onClose={handleCancelReset}
                onConfirm={handleConfirmReset}
                title={resetTarget === 'ALL' ? "Réinitialiser toutes les données" : `Réinitialiser ${resetTargetConfig?.label}`}
                message={
                    resetTarget === 'ALL'
                        ? "Êtes-vous sûr de vouloir réinitialiser l'intégralité de l'application ? Toutes vos données seront perdues et remplacées par les données initiales."
                        : `Êtes-vous sûr de vouloir réinitialiser toutes les données pour la catégorie "${resetTargetConfig?.label}" ?`
                }
                icon={<CategoryIcon categoryConfig={resetTargetConfig || undefined} size="sm" />}
                isDestructive
            />

            <ConfirmationModal
                isOpen={!!importFileContent}
                onClose={() => setImportFileContent(null)}
                onConfirm={handleConfirmImport}
                title="Importer les données"
                message="Êtes-vous sûr de vouloir importer ce fichier ? Toutes les données actuelles seront remplacées par le contenu du fichier."
                mainIcon={
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 sm:mx-0 sm:h-10 sm:w-10">
                        <Upload className="h-6 w-6 text-sky-600" aria-hidden="true" />
                    </div>
                }
                confirmButtonClass="inline-flex w-full justify-center rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 sm:ml-3 sm:w-auto"
                icon={<Upload className="h-5 w-5 text-sky-600" />}
                isDestructive
            />
        </div>
    );
};

export default LieuSelector;