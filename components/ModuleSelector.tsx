import React, { useMemo } from 'react';
import { Lieu, AuditModule, AuditModuleType } from '../types';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { LineIcon } from './LineIcon';
import { LieuBadges, FormattedCorrespondence } from './Icons';
import { getModuleProgress } from '../utils/progressCalculators';
import { ModuleIcon } from './ModuleIcon';
import useAuditStore from '../store';

interface ModuleSelectorProps {
  lieu: Lieu;
  onSelectModule: (moduleId: string) => void;
  onBack: () => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ lieu, onSelectModule, onBack }) => {
    const { activeAuditFilters } = useAuditStore();
    
    const sortedModules = useMemo(() => {
        let modulesToDisplay = [...lieu.modules];

        // Apply audit type filter (the sub-filters) if any are active
        if (activeAuditFilters.length > 0) {
            modulesToDisplay = modulesToDisplay.filter(module => activeAuditFilters.includes(module.type));
        }

        const order = {
            [AuditModuleType.DAT]: 1,
            [AuditModuleType.ECA]: 2,
            [AuditModuleType.PMR_FLOOR_ADHESIVE]: 3,
            [AuditModuleType.COGNITIVE_PICTOGRAMS]: 4,
            [AuditModuleType.PR]: 5,
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

    }, [lieu.modules, lieu.name, activeAuditFilters]);

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
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{lieu.name}</h2>
                        </div>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">Sélectionner un module à auditer</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {sortedModules.map((module) => {
                    const { percentage, label, statusText, statusColor, isComplete } = getModuleProgress(module);
                    const isInProgress = percentage > 0 && !isComplete;
                    const progressBarColor = isInProgress ? 'bg-amber-500 dark:bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';

                    return (
                        <button
                            key={module.id}
                            onClick={() => onSelectModule(module.id)}
                            disabled={module.isFuture}
                            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-75 w-full text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600 dark:disabled:hover:ring-slate-700/50"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <LineIcon module={module} size="md" />
                                        <ModuleIcon type={module.type} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">
                                            <FormattedCorrespondence text={module.name} />
                                        </div>
                                        <p className={`text-sm font-semibold ${statusColor}`}>
                                            {statusText}
                                        </p>
                                    </div>
                                </div>
                                {!module.isFuture && (
                                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-300 transition-colors ml-2" />
                                )}
                            </div>
                            {!module.isFuture && (
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-xs font-medium ${isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                            {label}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(percentage)}%</span>
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