import React, { useState } from 'react';
import { AuditModule, EcaData, ECA, AdhesiveStatus, EcaEquipmentType, Adhesive } from '../types';
import { ChevronRight, ArrowLeft, Accessibility, Edit, Trash2, PlusCircle } from 'lucide-react';
import { isPmrEcaType } from '../data/eca_data';
import { LineIcon } from './LineIcon';
import { FormattedCorrespondence } from './Icons';
import ConfirmationModal from './ConfirmationModal';
import EcaEditModal from './EcaEditModal';
import { getEcaProgress } from '../utils/progressCalculators';
import { TripodeIcon } from './TripodeIcon';

interface EcaSelectorProps {
  module: AuditModule;
  onSelectEca: (ecaId: string) => void;
  onBack: () => void;
  onAddEca: (ecaData: Omit<ECA, 'id' | 'adhesives' | 'comment' | 'isNotApplicable'>) => void;
  onUpdateEca: (ecaData: Partial<Omit<ECA, 'adhesives' | 'comment'>> & { id: string }) => void;
  onRemoveEca: (ecaId: string) => void;
}

const getEcaIcon = (eca: ECA) => {
    const isPmr = isPmrEcaType(eca.type);

    if (isPmr) {
        const iconProps = { className: "w-8 h-8 text-blue-600 dark:text-blue-300" };
        return (
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                <Accessibility {...iconProps} />
            </div>
        );
    }
    
    // For all non-PMR ECAs (Tripodes, Vantaux), use the new TripodeIcon.
    const iconProps = { className: "w-8 h-8 text-green-600 dark:text-green-300" };
    return (
        <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
            <TripodeIcon {...iconProps} />
        </div>
    );
};

const EcaSelector: React.FC<EcaSelectorProps> = ({ module, onSelectEca, onBack, onAddEca, onUpdateEca, onRemoveEca }) => {
    const ecaData = module.data as EcaData;

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [ecaToEdit, setEcaToEdit] = useState<ECA | null>(null);
    const [ecaToDelete, setEcaToDelete] = useState<ECA | null>(null);

    const handleOpenAddModal = () => {
        setEcaToEdit(null);
        setIsEditModalOpen(true);
    };

    const handleOpenEditModal = (eca: ECA) => {
        setEcaToEdit(eca);
        setIsEditModalOpen(true);
    };

    const handleSaveEca = (data: Omit<ECA, 'adhesives' | 'comment'>) => {
        if (data.id) {
            onUpdateEca(data);
        } else {
            onAddEca(data);
        }
        setIsEditModalOpen(false);
    };

    const handleConfirmDelete = () => {
        if (ecaToDelete) {
            onRemoveEca(ecaToDelete.id);
            setEcaToDelete(null);
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-start gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 mt-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
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
                <button
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center gap-x-2 rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
                >
                    <PlusCircle className="h-5 w-5" />
                    Ajouter un ECA
                </button>
            </div>

            {ecaData.ecas.length === 0 ? (
                 <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <TripodeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Aucun ECA</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Aucun valideur n'est enregistré pour cette station.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {ecaData.ecas.map((eca) => {
                        const progress = getEcaProgress(eca);
                        const isNotApplicable = eca.isNotApplicable;
                        const isInProgress = progress.percentage > 0 && !progress.isComplete;
                        
                        const progressBarColor = isNotApplicable
                            ? 'bg-slate-400 dark:bg-slate-600'
                            : isInProgress
                                ? 'bg-amber-500 dark:bg-amber-500'
                                : 'bg-teal-500 dark:bg-teal-600';
                        
                        const statusLabelColor = isNotApplicable
                            ? 'text-slate-500 dark:text-slate-400'
                            : progress.isComplete
                                ? 'text-teal-600 dark:text-teal-400'
                                : 'text-gray-500 dark:text-slate-400';

                        const isPmr = isPmrEcaType(eca.type);

                        return (
                            <button
                                key={eca.id}
                                onClick={isNotApplicable ? undefined : () => onSelectEca(eca.id)}
                                // We don't use the `disabled` attribute directly to allow child buttons to be interactive.
                                // Instead, we manage the visual state and click behavior manually.
                                className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg transition-all duration-300 w-full text-left group dark:ring-1 dark:ring-slate-700/50 ${
                                    isNotApplicable 
                                    ? 'opacity-70 cursor-default' 
                                    : 'hover:shadow-xl dark:hover:ring-slate-600'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {getEcaIcon(eca)}
                                        <div className="flex-1 min-w-0">
                                            <FormattedCorrespondence 
                                                as="p" 
                                                text={eca.name} 
                                                useLogos={isPmr && eca.name.includes('->')}
                                                className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate" 
                                            />
                                            <p className="text-sm text-gray-500 dark:text-slate-400">{eca.accessPoint} &bull; {eca.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center flex-shrink-0 gap-1 sm:gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(eca); }}
                                            className="p-2 rounded-full hover:bg-indigo-100 text-indigo-600 transition-colors dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                            aria-label={`Modifier ${eca.name}`}
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setEcaToDelete(eca); }}
                                            className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                                            aria-label={`Supprimer ${eca.name}`}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                         {!isNotApplicable && (
                                             <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-300 transition-colors ml-1" />
                                         )}
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1">
                                         <span className={`text-xs font-medium ${statusLabelColor}`}>
                                            {progress.label}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(progress.percentage)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                        <div className={`${progressBarColor} h-2 rounded-full`} style={{ width: `${progress.percentage}%` }}></div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
            
            {isEditModalOpen && (
                 <EcaEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveEca}
                    eca={ecaToEdit}
                    stationName={ecaData.stationName}
                />
            )}
           
            <ConfirmationModal
                isOpen={!!ecaToDelete}
                onClose={() => setEcaToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Supprimer l'ECA"
                message={`Êtes-vous sûr de vouloir supprimer l'équipement "${ecaToDelete?.name}" ?\n\nCette action est irréversible.`}
                isDestructive
            />
        </div>
    );
};

export default EcaSelector;