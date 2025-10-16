import React, { useMemo, useState, useRef, useEffect } from 'react';
import { AuditModule, FloorAdhesiveStatus, CognitivePictogramData, CognitivePictogram } from '../types';
import { CheckCircle2, XCircle, ArrowLeft, DatabaseBackup, Trash2, Edit, PlusCircle, SearchCheck } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LineIcon } from './LineIcon';
import { COGNITIVE_PICTOGRAM_DIMENSIONS } from '../data/cognitive_pictograms';

interface CognitivePictogramAuditFormProps {
    module: AuditModule;
    onStatusChange: (pictogramId: string, status: FloorAdhesiveStatus) => void;
    onBack: () => void;
    onReset: () => void;
    onAddAccessPoint: () => void;
    onRemoveAccessPoint: (pictogramId: string) => void;
    onUpdateAccessPointName: (pictogramId: string, newName: string) => void;
}

const AccessPointItem: React.FC<{
    pictogram: CognitivePictogram;
    dimensions: string;
    onStatusChange: (pictogramId: string, status: FloorAdhesiveStatus) => void;
    onRemove: (pictogram: CognitivePictogram) => void;
    onUpdateName: (pictogramId: string, newName: string) => void;
}> = ({ pictogram, dimensions, onStatusChange, onRemove, onUpdateName }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(pictogram.accessPointName);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (name.trim() !== '' && name.trim() !== pictogram.accessPointName) {
            onUpdateName(pictogram.id, name.trim());
        } else {
            setName(pictogram.accessPointName); // Revert if empty or unchanged
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setName(pictogram.accessPointName);
            setIsEditing(false);
        }
    };
    
    const currentStatus = pictogram.status;

    return (
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="text-lg font-semibold text-gray-900 bg-white border border-teal-500 rounded-md px-2 py-1 -my-1 w-full dark:bg-slate-900 dark:text-slate-100 dark:border-teal-400"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                         <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{name}</h3>
                         <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-600 transition-colors flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700">
                            <Edit className="w-4 h-4" />
                        </button>
                    </div>
                )}
                 <div className="flex items-center text-sm text-gray-600 dark:text-slate-400 mt-1">
                    <SearchCheck className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <span>
                        Présence et etat du pictogramme cognitif
                        <span className="font-semibold text-gray-800 dark:text-slate-200 ml-2">({dimensions})</span>
                    </span>
                 </div>
            </div>
            <div className="flex items-center gap-2">
                 <div className="flex items-stretch gap-2 sm:flex-wrap sm:gap-3">
                    <button
                        onClick={() => onStatusChange(pictogram.id, currentStatus === FloorAdhesiveStatus.OK ? FloorAdhesiveStatus.NotChecked : FloorAdhesiveStatus.OK)}
                        className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
                            currentStatus === FloorAdhesiveStatus.OK
                                ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-500'
                                : 'bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                        }`}
                    >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        OK
                    </button>
                    <button
                        onClick={() => onStatusChange(pictogram.id, currentStatus === FloorAdhesiveStatus.ToBeReplaced ? FloorAdhesiveStatus.NotChecked : FloorAdhesiveStatus.ToBeReplaced)}
                        className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
                            currentStatus === FloorAdhesiveStatus.ToBeReplaced
                                ? 'bg-red-600 text-white shadow-sm dark:bg-red-500'
                                : 'bg-white text-red-700 ring-1 ring-inset ring-red-600 hover:bg-red-50 dark:bg-slate-700/50 dark:text-red-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                        }`}
                    >
                        <XCircle className="w-5 h-5 mr-2" />
                        À remplacer
                    </button>
                 </div>
                 <button 
                    onClick={() => onRemove(pictogram)}
                    className="p-2.5 rounded-md hover:bg-red-100 text-red-600 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                    aria-label={`Supprimer ${pictogram.accessPointName}`}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


const CognitivePictogramAuditForm: React.FC<CognitivePictogramAuditFormProps> = ({ module, onStatusChange, onBack, onReset, onAddAccessPoint, onRemoveAccessPoint, onUpdateAccessPointName }) => {
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [pictoToDelete, setPictoToDelete] = useState<CognitivePictogram | null>(null);
    const cogData = module.data as CognitivePictogramData;

    const dimensions = useMemo(() => {
        return COGNITIVE_PICTOGRAM_DIMENSIONS[cogData.stationCode] || COGNITIVE_PICTOGRAM_DIMENSIONS['DEFAULT'];
    }, [cogData.stationCode]);

    const progress = useMemo(() => {
        const total = cogData.pictograms.length;
        if (total === 0) return 100; // An empty list is considered complete
        const checked = cogData.pictograms.filter(s => s.status !== FloorAdhesiveStatus.NotChecked).length;
        return (checked / total) * 100;
    }, [cogData.pictograms]);

    const isComplete = Math.round(progress) === 100;
    const isInProgress = progress > 0 && !isComplete;
    const progressBarColor = isInProgress ? 'bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';
    
    const handleConfirmDelete = () => {
        if (pictoToDelete) {
            onRemoveAccessPoint(pictoToDelete.id);
            setPictoToDelete(null);
        }
    };


    return (
        <div className="bg-white dark:bg-slate-800 shadow-lg rounded-xl overflow-hidden">
            <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <button
                            onClick={onBack}
                            className="p-2 mt-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label="Retour"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{module.name}</h2>
                            <div className="flex items-center gap-3 mt-2">
                                <LineIcon module={module} size="sm" />
                                <p className="text-gray-600 dark:text-slate-400 text-sm">
                                    <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {cogData.stationName}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="self-start sm:ml-4 flex-shrink-0 flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                        title={`Réinitialiser l'audit`}
                        aria-label={`Réinitialiser l'audit`}
                    >
                        <DatabaseBackup className="h-4 w-4" />
                        <span>Réinitialiser</span>
                    </button>
                </div>
                <div className="mt-4 pl-0 sm:pl-16">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Progression</span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div className={`${progressBarColor} h-2 rounded-full transition-all duration-300`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>
            
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                {cogData.pictograms.length === 0 ? (
                    <li className="text-center p-8">
                        <p className="text-gray-500 dark:text-slate-400">Aucun accès défini pour cette station.</p>
                    </li>
                ) : (
                    cogData.pictograms.map((pictogram) => (
                         <li key={pictogram.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <AccessPointItem 
                                pictogram={pictogram}
                                dimensions={dimensions}
                                onStatusChange={onStatusChange}
                                onRemove={setPictoToDelete}
                                onUpdateName={onUpdateAccessPointName}
                            />
                        </li>
                    ))
                )}
            </ul>

            <div className="p-6 border-t border-gray-200 dark:border-slate-700">
                <button
                    onClick={onAddAccessPoint}
                    className="w-full inline-flex items-center justify-center gap-x-2 rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
                >
                    <PlusCircle className="-ml-0.5 h-5 w-5" />
                    Ajouter un accès
                </button>
            </div>

            <ConfirmationModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={() => { onReset(); setShowResetConfirm(false); }}
                title="Réinitialiser l'audit des pictogrammes"
                message={`Êtes-vous sûr de vouloir réinitialiser les vérifications pour la station ${cogData.stationName} ? Les noms des accès seront conservés.`}
                icon={<LineIcon module={module} size="sm" />}
                isDestructive
            />
            
            <ConfirmationModal
                isOpen={!!pictoToDelete}
                onClose={() => setPictoToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Supprimer l'accès"
                message={`Êtes-vous sûr de vouloir supprimer l'accès "${pictoToDelete?.accessPointName}" ?`}
                isDestructive
            />
        </div>
    );
};

export default CognitivePictogramAuditForm;
