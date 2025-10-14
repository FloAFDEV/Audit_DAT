


import React from 'react';
import { AuditModule, EcaData, ECA, AdhesiveStatus } from '../types';
import { ChevronRight, ArrowLeft, Fence, Accessibility, Brackets } from 'lucide-react';
import { isPmrEcaType } from '../data/eca_data';
import { LineIcon } from './LineIcon';
import { FormattedCorrespondence } from './Icons';

interface EcaSelectorProps {
  module: AuditModule;
  onSelectEca: (ecaId: string) => void;
  onBack: () => void;
}

const getEcaProgress = (eca: ECA): number => {
    const statuses = Object.values(eca.adhesives);
    if (statuses.length === 0) return 0;
    const checked = statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
    return (checked / statuses.length) * 100;
};

const getEcaIcon = (eca: ECA) => {
    const isPmr = isPmrEcaType(eca.type);

    if (isPmr) {
        // Light blue for PMR
        const iconProps = { className: "w-8 h-8 text-blue-600 dark:text-blue-300" };
        return (
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Accessibility {...iconProps} />
            </div>
        );
    } else {
        // Light green for main access
        const iconProps = { className: "w-8 h-8 text-green-600 dark:text-green-300" };
        return (
            <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <Brackets {...iconProps} />
            </div>
        );
    }
};

const EcaSelector: React.FC<EcaSelectorProps> = ({ module, onSelectEca, onBack }) => {
    const ecaData = module.data as EcaData;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
                        aria-label="Retour"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <LineIcon module={module} size="md" />
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{ecaData.stationName} - {module.name}</h2>
                            <p className="text-gray-500 dark:text-slate-400">Sélectionner un équipement de contrôle d'accès</p>
                        </div>
                    </div>
                </div>
            </div>

            {ecaData.ecas.length === 0 ? (
                 <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <Fence className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Aucun ECA</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Aucun valideur n'est enregistré pour cette station.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {ecaData.ecas.map((eca) => {
                        const progress = getEcaProgress(eca);
                        const isComplete = progress === 100;
                        const isInProgress = progress > 0 && !isComplete;
                        const progressBarColor = isInProgress ? 'bg-amber-500 dark:bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';
                        const isPmr = isPmrEcaType(eca.type);

                        return (
                            <button
                                key={eca.id}
                                onClick={() => onSelectEca(eca.id)}
                                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full text-left group dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {getEcaIcon(eca)}
                                        <div>
                                            <FormattedCorrespondence 
                                                as="p" 
                                                text={eca.name} 
                                                useLogos={isPmr && eca.name.includes('->')}
                                                className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate" 
                                            />
                                            <p className="text-sm text-gray-500 dark:text-slate-400">{eca.accessPoint} &bull; {eca.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center flex-shrink-0">
                                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-300 transition-colors ml-2" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1">
                                         <span className={`text-xs font-medium ${isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                            {isComplete ? 'Terminé' : 'Progression'}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                        <div className={`${progressBarColor} h-2 rounded-full`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default EcaSelector;