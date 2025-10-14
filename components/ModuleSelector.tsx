
import React from 'react';
import { Lieu, AuditModule, AdhesiveStatus, AuditModuleType, ModeData, Pr, EcaData, FloorAdhesiveStatus, PMRFloorAdhesiveData } from '../types';
import { ChevronRight, ArrowLeft, Euro, Car, Accessibility, Fence } from 'lucide-react';
import { getModuleLineConfig } from '../data/builder';
import { LineIcon } from './LineIcon';

interface ModuleSelectorProps {
  lieu: Lieu;
  onSelectModule: (moduleId: string) => void;
  onBack: () => void;
}

const getModuleProgress = (module: AuditModule): number => {
    let allAdhesives: (AdhesiveStatus | FloorAdhesiveStatus | undefined)[] = [];

    try {
        if (module.type === AuditModuleType.DAT) {
            const modeData = module.data as ModeData;
            allAdhesives = modeData?.stations?.flatMap(s => s.directions?.flatMap(d => d.dats?.flatMap(dat => Object.values(dat.adhesives)) || []) || []) || [];
        } else if (module.type === AuditModuleType.PR) {
            const prData = module.data as Pr;
            allAdhesives = prData?.equipments?.flatMap(e => Object.values(e.adhesives)) || [];
        } else if (module.type === AuditModuleType.ECA) {
            const ecaData = module.data as EcaData;
            allAdhesives = ecaData?.ecas?.flatMap(e => Object.values(e.adhesives)) || [];
        } else if (module.type === AuditModuleType.PMR_FLOOR_ADHESIVE) {
            const pmrData = module.data as PMRFloorAdhesiveData;
            allAdhesives = pmrData?.adhesives?.map(a => a.status) || [];
        }
    } catch(e) {
        console.error("Error calculating module progress", module, e);
        return 0;
    }

    if (allAdhesives.length === 0) return 0;
    const checkedCount = allAdhesives.filter(status => status && status !== "Non vérifié").length;
    return (checkedCount / allAdhesives.length) * 100;
};

const getModuleDescription = (type: AuditModuleType): string => {
    switch (type) {
        case AuditModuleType.DAT:
            return "Distributeurs Automatiques de Titres";
        case AuditModuleType.PR:
            return "Bornes (Entrée/Sortie) & Caisses Automatiques";
        case AuditModuleType.ECA:
            return "Contrôle d'Accès (Valideurs)";
        case AuditModuleType.PMR_FLOOR_ADHESIVE:
            return "Adhésifs au sol pour passages PMR (Niveau ECA)";
        default:
            return "";
    }
};

const getModuleDetailIcon = (type: AuditModuleType) => {
    const iconProps = { className: "w-4 h-4 text-gray-600 dark:text-slate-300" };
    const iconWrapper = (icon: React.ReactNode) => (
        <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 bg-slate-100 dark:bg-slate-700 rounded-md">
            {icon}
        </div>
    );

    switch (type) {
        case AuditModuleType.DAT: return iconWrapper(<Euro {...iconProps} />);
        case AuditModuleType.PR: return iconWrapper(<Car {...iconProps} />);
        case AuditModuleType.ECA: return iconWrapper(<Fence {...iconProps} />);
        case AuditModuleType.PMR_FLOOR_ADHESIVE: return iconWrapper(<Accessibility {...iconProps} />);
        default: return null;
    }
};


const ModuleSelector: React.FC<ModuleSelectorProps> = ({ lieu, onSelectModule, onBack }) => {
    
    const renderModuleCard = (module: AuditModule) => {
        const progress = getModuleProgress(module);
        const isComplete = progress === 100;

        const cardContent = (
            <>
                <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                            <LineIcon module={module} size="md" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 truncate">{module.name}</h3>
                                {module.isFuture && (
                                    <span className="text-xs bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded-full dark:bg-slate-700 dark:text-slate-300">
                                        Bientôt disponible
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                {getModuleDetailIcon(module.type)}
                                <p className="text-sm text-gray-500 dark:text-slate-400">{getModuleDescription(module.type)}</p>
                            </div>
                        </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-200 transition-colors flex-shrink-0 ml-2"/>
                </div>
                <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-medium ${isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-slate-400'}`}>
                            {isComplete ? 'Terminé' : 'Progression'}
                        </span>
                        <span className="text-sm font-medium text-gray-600 dark:text-slate-300">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div className="bg-teal-500 dark:bg-teal-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </>
        );

        if (module.isFuture) {
            return (
                <div
                    key={module.id}
                    className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg text-left w-full opacity-60 cursor-not-allowed dark:ring-1 dark:ring-slate-700"
                >
                    {cardContent}
                </div>
            );
        }

        return (
            <button
                key={module.id}
                onClick={() => onSelectModule(module.id)}
                className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-left w-full group dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600"
            >
                {cardContent}
            </button>
        );
    };

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
             <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Retour"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Lieu: {lieu.name}</h2>
            </div>
        </div>
      
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-slate-200 mb-6">Sélectionner un audit</h3>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lieu.modules.map(module => renderModuleCard(module))}
      </div>
    </div>
  );
};

export default ModuleSelector;