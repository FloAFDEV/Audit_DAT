import React, { useState, useEffect } from 'react';
import { ECA, EcaEquipmentType } from '../types';
import { canEcaBeNotApplicable } from '../data/eca_data';

interface EcaEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    // FIX: Updated `onSave` prop to correctly type the data object, allowing for an optional `id` when creating a new ECA.
    onSave: (ecaData: Omit<ECA, 'id' | 'adhesives' | 'comment'> & { id?: string }) => void;
    eca: ECA | null;
    stationName: string;
}

// Define labels for clarity in the dropdown, especially for PMR types as requested.
const typeLabels: Record<string, string> = {
    [EcaEquipmentType.TripodeEntree]: "Tripode d'entrée",
    [EcaEquipmentType.TripodeSortie]: "Tripode de sortie",
    [EcaEquipmentType.VantauxEntree]: "Vantaux d'entrée",
    [EcaEquipmentType.VantauxSortie]: "Vantaux de sortie",
    [EcaEquipmentType.VantauxReversible]: "Vantaux réversible",
    [EcaEquipmentType.PMRBras]: "PMR à bras",
    [EcaEquipmentType.PMRVantaux]: "PMR à vantaux",
};

// The simplified, final list of user-selectable ECA types.
const EDITABLE_ECA_TYPES = [
    EcaEquipmentType.TripodeEntree,
    EcaEquipmentType.TripodeSortie,
    EcaEquipmentType.VantauxEntree,
    EcaEquipmentType.VantauxSortie,
    EcaEquipmentType.VantauxReversible,
    EcaEquipmentType.PMRBras,
    EcaEquipmentType.PMRVantaux,
];


const EcaEditModal: React.FC<EcaEditModalProps> = ({ isOpen, onClose, onSave, eca, stationName }) => {
    const [name, setName] = useState('');
    const [accessPoint, setAccessPoint] = useState('');
    const [type, setType] = useState<EcaEquipmentType>(EcaEquipmentType.TripodeEntree);
    const [number, setNumber] = useState<number>(1);
    const [isNotApplicable, setIsNotApplicable] = useState(false);

    useEffect(() => {
        if (eca) {
            setName(eca.name);
            setAccessPoint(eca.accessPoint);
            setType(eca.type);
            setNumber(eca.number);
            setIsNotApplicable(eca.isNotApplicable ?? false);
        } else {
            // Reset form for new ECA
            setName('');
            setAccessPoint('Accès Principal');
            setType(EcaEquipmentType.TripodeEntree);
            setNumber(1);
            setIsNotApplicable(false);
        }
    }, [eca, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const canBeNA = canEcaBeNotApplicable(type);
        // FIX: Explicitly typed `ecaData` to match the updated `onSave` prop, ensuring `id` is correctly handled as optional.
        const ecaData: Omit<ECA, 'id' | 'adhesives' | 'comment'> & { id?: string } = {
            id: eca?.id,
            name: name.trim(),
            accessPoint: accessPoint.trim(),
            type,
            number,
            isNotApplicable: canBeNA ? isNotApplicable : undefined,
        };
        onSave(ecaData);
    };
    
    if (!isOpen) return null;

    const canBeNA = canEcaBeNotApplicable(type);

    return (
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black/80 transition-opacity z-50 flex items-center justify-center p-4"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                        <h3 className="text-lg font-bold leading-6 text-gray-900 dark:text-white" id="modal-title">
                            {eca ? 'Modifier' : 'Ajouter'} un ECA
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Station : {stationName}</p>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900 dark:text-slate-200">
                                    Nom de l'équipement
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="block w-full rounded-md border-0 py-1.5 px-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="accessPoint" className="block text-sm font-medium leading-6 text-gray-900 dark:text-slate-200">
                                    Point d'accès
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="accessPoint"
                                        value={accessPoint}
                                        onChange={(e) => setAccessPoint(e.target.value)}
                                        required
                                        className="block w-full rounded-md border-0 py-1.5 px-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium leading-6 text-gray-900 dark:text-slate-200">
                                    Type
                                </label>
                                <div className="mt-1">
                                    <select
                                        id="type"
                                        value={type}
                                        onChange={(e) => setType(e.target.value as EcaEquipmentType)}
                                        className="block w-full rounded-md border-0 py-1.5 px-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                    >
                                        {EDITABLE_ECA_TYPES.map((t) => (
                                            <option key={t} value={t}>{typeLabels[t] || t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                             {canBeNA && (
                                <div className="relative flex items-start mt-4">
                                    <div className="flex h-6 items-center">
                                        <input
                                            id="isNotApplicable"
                                            aria-describedby="isNotApplicable-description"
                                            name="isNotApplicable"
                                            type="checkbox"
                                            checked={isNotApplicable}
                                            onChange={(e) => setIsNotApplicable(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                        />
                                    </div>
                                    <div className="ml-3 text-sm leading-6">
                                        <label htmlFor="isNotApplicable" className="font-medium text-gray-900 dark:text-slate-200">
                                            Non Applicable
                                        </label>
                                        <p id="isNotApplicable-description" className="text-gray-500 dark:text-slate-400">
                                            Cochez si cet équipement n'a pas d'adhésifs à auditer.
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label htmlFor="number" className="block text-sm font-medium leading-6 text-gray-900 dark:text-slate-200">
                                    Numéro d'équipement
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="number"
                                        id="number"
                                        value={number}
                                        onChange={(e) => setNumber(parseInt(e.target.value, 10) || 1)}
                                        required
                                        min="1"
                                        className="block w-full rounded-md border-0 py-1.5 px-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-800/50 dark:border-t dark:border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                        <button
                            type="submit"
                            className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                        >
                            Sauvegarder
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 sm:mt-0 sm:w-auto"
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EcaEditModal;