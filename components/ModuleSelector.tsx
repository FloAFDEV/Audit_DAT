import React, { useMemo } from 'react';
import { Lieu, AuditModule, AuditModuleType, ModeData } from '../types';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { LineIcon } from './LineIcon';
import { LieuBadges, FormattedCorrespondence } from './Icons';
import { getModuleProgress } from '../utils/progressCalculators';
import { ModuleIcon } from './ModuleIcon';
import useAuditStore from '../store';
import { AUDIT_CATEGORIES } from '../data/config';

interface ModuleSelectorProps {
  lieu: Lieu;
  onSelectModule: (moduleId: string) => void;
  onBack: () => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ lieu, onSelectModule, onBack }) => {
    const { activeAuditFilters, activeFilter } = useAuditStore();
    
    const sortedModules = useMemo(() => {
        let modulesToDisplay = [...lieu.modules];

        // Apply transport line filter (Tram, Line C, etc.)
        // Les modules P+R n'ont pas de ligne (une borne P+R est un équipement du lieu, pas
        // d'une ligne métro). Ils seraient donc exclus à tort par un filtre de ligne (ex : Basso
        // Cambo, station Ligne A). On les garde toujours visibles dans leur lieu.
        // Le filtre par type d'audit (activeAuditFilters, ci-dessous) reste prioritaire et
        // pourra les masquer si l'utilisateur restreint explicitement aux autres types.
        const activeFilterDef = AUDIT_CATEGORIES.find(f => f.key === activeFilter);
        if (activeFilterDef) {
            modulesToDisplay = modulesToDisplay.filter(module =>
                activeFilterDef.predicate(module) ||
                module.type === AuditModuleType.PR ||
                (activeAuditFilters.length > 0 && activeAuditFilters.includes(module.type))
            );
        }

        // Apply audit type filter (the sub-filters) if any are active
        if (activeAuditFilters.length > 0) {
            modulesToDisplay = modulesToDisplay.filter(module => activeAuditFilters.includes(module.type));
        }

        const order = {
            [AuditModuleType.DAT]: 1,
            [AuditModuleType.SIGNALETIQUE]: 2,
            [AuditModuleType.ECA]: 3,
            [AuditModuleType.PMR_FLOOR_ADHESIVE]: 4,
            [AuditModuleType.COGNITIVE_PICTOGRAMS]: 5,
            [AuditModuleType.PR]: 6,
        };

        // Special sorting for Jean-Jaurès
        if (lieu.name === 'Jean-Jaurès') {
            const lineOrder: Record<string, number> = { 'A': 1, 'B': 2 };
            modulesToDisplay.sort((a, b) => {
                const lineA = a.line as 'A' | 'B' | undefined;
                const lineB = b.line as 'A' | 'B' | undefined;
                const orderA = lineA ? lineOrder[lineA] : 99;
                const orderB = lineB ? lineOrder[lineB] : 99;
                
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                
                // If lines are the same, sort by module type
                const typeOrderA = order[a.type] || 99;
                const typeOrderB = order[b.type] || 99;
                return typeOrderA - typeOrderB;
            });
        } else {
            // Default sorting for other lieux
            modulesToDisplay.sort((a, b) => (order[a.type] || 99) - (order[b.type] || 99));
        }
        
        return modulesToDisplay;

    }, [lieu.modules, lieu.name, activeAuditFilters, activeFilter]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Retour"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <LieuBadges lieu={lieu} />
                            <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100">{lieu.name}</h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-light">Sélectionner un module à auditer</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {sortedModules.map((module) => {
                    const { percentage, label, statusText, statusColor, isComplete } = getModuleProgress(module);
                    const isInProgress = percentage > 0 && !isComplete;
                    const progressBarColor = isInProgress ? 'bg-amber-500 dark:bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';
                    
                    const isDisabled = false;

                    return (
                        <button
                            key={module.id}
                            onClick={() => onSelectModule(module.id)}
                            disabled={isDisabled}
                            className="module-card bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm transition-shadow duration-200 w-full text-left group disabled:opacity-50 disabled:cursor-not-allowed dark:ring-1 dark:ring-slate-700/50"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-shrink-0">
                                        <LineIcon module={module} size="md" />
                                        <div className="icon-3d"><ModuleIcon type={module.type} /></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100 truncate">
                                                <FormattedCorrespondence text={module.name} />
                                            </div>
                                            {module.type === AuditModuleType.DAT || module.type === AuditModuleType.SIGNALETIQUE ? (
                                                <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                    {(module.data as ModeData).stations?.[0]?.code}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className={`text-sm font-normal ${statusColor}`}>
                                            {statusText}
                                        </p>
                                    </div>
                                </div>
                                {!isDisabled && (
                                    <ChevronRight className="module-card-chevron w-5 h-5 text-gray-400 dark:text-slate-500 transition-colors ml-2" />
                                )}
                            </div>
                            {!isDisabled && (
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs font-normal ${isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {label}
                                        </span>
                                        <span className="text-sm font-normal text-slate-700 dark:text-slate-300">{Math.round(percentage)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                        <div className={`${progressBarColor} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ModuleSelector;