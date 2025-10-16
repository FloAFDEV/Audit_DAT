import React, { useMemo } from 'react';
import { Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, AdhesiveStatus, FloorAdhesiveStatus, CognitivePictogramData } from '../types';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { LineIcon } from './LineIcon';
import { LieuBadges } from './Icons';
import { getDatProgress, getEcaProgress } from '../utils/progressCalculators';
import { ModuleIcon } from './ModuleIcon';

const getModuleProgress = (module: AuditModule): { percentage: number; label: string } => {
    if (module.isFuture) {
        return { percentage: 0, label: 'Bientôt disponible' };
    }

    switch (module.type) {
        case AuditModuleType.DAT: {
            const modeData = module.data as ModeData;
            const dats = modeData.stations.flatMap(s => s.directions.flatMap(d => d.dats));
            if (dats.length === 0) return { percentage: 100, label: 'Terminé' };
            const completedCount = dats.filter(dat => getDatProgress(dat).isComplete).length;
            const percentage = (completedCount / dats.length) * 100;
            return { percentage, label: Math.round(percentage) === 100 ? 'Terminé' : 'Progression' };
        }
        case AuditModuleType.PR: {
            const prData = module.data as Pr;
            const allAdhesives = prData.equipments?.flatMap(e => Object.values(e.adhesives)) ?? [];
            if (allAdhesives.length === 0) return { percentage: 100, label: 'Terminé' };
            const checkedCount = allAdhesives.filter(status => status !== AdhesiveStatus.NotChecked).length;
            const percentage = (checkedCount / allAdhesives.length) * 100;
            return { percentage, label: Math.round(percentage) === 100 ? 'Terminé' : 'Progression' };
        }
        case AuditModuleType.ECA: {
            const ecaData = module.data as EcaData;
            const ecas = ecaData.ecas ?? [];
            if (ecas.length === 0) return { percentage: 100, label: 'Terminé' };
            
            const progresses = ecas.map(e => getEcaProgress(e));
            const totalPercentage = progresses.reduce((sum, p) => sum + p.percentage, 0);
            const avgPercentage = totalPercentage / ecas.length;
            const allComplete = progresses.every(p => p.isComplete);
            
            return { percentage: avgPercentage, label: allComplete ? 'Terminé' : 'Progression' };
        }
        case AuditModuleType.PMR_FLOOR_ADHESIVE: {
            const pmrData = module.data as PMRFloorAdhesiveData;
            const adhesives = pmrData.adhesives;
            if (adhesives.length === 0) return { percentage: 100, label: 'Terminé' };

            const checked = adhesives.filter(a => a.status !== FloorAdhesiveStatus.NotChecked).length;
            const percentage = (checked / adhesives.length) * 100;
            return { percentage, label: Math.round(percentage) === 100 ? 'Terminé' : 'Progression' };
        }
        case AuditModuleType.COGNITIVE_PICTOGRAMS: {
            const cogData = module.data as CognitivePictogramData;
            const pictos = cogData.pictograms;
            if (pictos.length === 0) return { percentage: 100, label: 'Terminé' };
            const checked = pictos.filter(p => p.status !== FloorAdhesiveStatus.NotChecked).length;
            const percentage = (checked / pictos.length) * 100;
            return { percentage, label: Math.round(percentage) === 100 ? 'Terminé' : 'Progression' };
        }
        default:
            return { percentage: 0, label: 'N/A' };
    }
};

const getStatusInfo = (percentage: number): { text: string; color: string } => {
    const roundedPercentage = Math.round(percentage);
    if (roundedPercentage === 0) {
        return { text: 'En attente de contrôle', color: 'text-gray-500 dark:text-slate-400' };
    }
    if (roundedPercentage === 100) {
        return { text: 'Audit terminé', color: 'text-teal-600 dark:text-teal-400' };
    }
    return { text: 'Audit en cours', color: 'text-amber-600 dark:text-amber-400' };
};


interface ModuleSelectorProps {
  lieu: Lieu;
  onSelectModule: (moduleId: string) => void;
  onBack: () => void;
}

const ModuleSelector: React.FC<ModuleSelectorProps> = ({ lieu, onSelectModule, onBack }) => {
    
    const sortedModules = useMemo(() => {
        const order = {
            [AuditModuleType.DAT]: 1,
            [AuditModuleType.ECA]: 2,
            [AuditModuleType.PMR_FLOOR_ADHESIVE]: 3,
            [AuditModuleType.COGNITIVE_PICTOGRAMS]: 4,
            [AuditModuleType.PR]: 5,
        };
        return [...lieu.modules].sort((a, b) => (order[a.type] || 99) - (order[b.type] || 99));
    }, [lieu.modules]);

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
                    const { percentage, label } = getModuleProgress(module);
                    const statusInfo = getStatusInfo(percentage);
                    const isComplete = Math.round(percentage) === 100;
                    const isInProgress = percentage > 0 && !isComplete;
                    const progressBarColor = isInProgress ? 'bg-amber-500 dark:bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';

                    return (
                        <button
                            key={module.id}
                            onClick={() => onSelectModule(module.id)}
                            disabled={module.isFuture}
                            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600 dark:disabled:hover:ring-slate-700/50"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <LineIcon module={module} size="md" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <ModuleIcon type={module.type} />
                                            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{module.name}</p>
                                        </div>
                                        <p className={`text-sm font-semibold ml-9 ${statusInfo.color}`}>{module.isFuture ? 'Bientôt disponible' : statusInfo.text}</p>
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