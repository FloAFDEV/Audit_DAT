
import React from 'react';
import { AuditModule, Pr, Equipment, AdhesiveStatus, EquipmentType } from '../types';
import { ChevronRight, ArrowLeft, Ticket, Car, Euro } from 'lucide-react';

interface EquipmentSelectorProps {
  module: AuditModule;
  onSelectEquipment: (equipmentId: string) => void;
  onBack: () => void;
}

const getEquipmentProgress = (equipment: Equipment): number => {
    const statuses = Object.values(equipment.adhesives);
    if (statuses.length === 0) return 0;
    const checked = statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
    return (checked / statuses.length) * 100;
};

const getEquipmentIcon = (type: EquipmentType) => {
    const iconProps = { className: "w-8 h-8 text-white" };
    switch (type) {
        case EquipmentType.BE: return <div className="p-3 bg-teal-500 rounded-lg"><Car {...iconProps} /></div>;
        case EquipmentType.BS: return <div className="p-3 bg-sky-600 rounded-lg"><Car {...iconProps} /></div>;
        case EquipmentType.CA: return <div className="p-3 bg-amber-500 rounded-lg"><Euro {...iconProps} /></div>;
        default: return null;
    }
}

const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({ module, onSelectEquipment, onBack }) => {
    const prData = module.data as Pr;

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
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{prData.name}</h2>
                        <p className="text-gray-500 dark:text-slate-400">Sélectionner un équipement à auditer</p>
                    </div>
                </div>
            </div>

            {prData.equipments.length === 0 ? (
                 <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <Ticket className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Aucun équipement</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Aucun équipement n'est enregistré pour ce P+R.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {prData.equipments.map((equipment) => {
                        const progress = getEquipmentProgress(equipment);
                        const isComplete = progress === 100;
                        return (
                            <button
                                key={equipment.id}
                                onClick={() => onSelectEquipment(equipment.id)}
                                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full text-left group dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {getEquipmentIcon(equipment.type)}
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{equipment.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-slate-400">{equipment.type}</p>
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
                                        <div className="bg-teal-500 dark:bg-teal-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
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

export default EquipmentSelector;