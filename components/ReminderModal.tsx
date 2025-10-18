import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedDate: Date) => void;
    onSkip: () => void;
    fileName: string;
    initialDate: Date;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onConfirm, onSkip, fileName, initialDate }) => {
    // State to hold the date value from the input, in YYYY-MM-DD format
    const [dateString, setDateString] = useState('');

    useEffect(() => {
        if (initialDate) {
            // Format the initialDate to YYYY-MM-DD for the input
            const year = initialDate.getFullYear();
            const month = (initialDate.getMonth() + 1).toString().padStart(2, '0');
            const day = initialDate.getDate().toString().padStart(2, '0');
            setDateString(`${year}-${month}-${day}`);
        }
    }, [initialDate]);
    
    if (!isOpen) return null;
    
    const handleConfirm = () => {
        // Convert the string back to a Date object, accounting for timezone offset
        const date = new Date(dateString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        onConfirm(new Date(date.getTime() + userTimezoneOffset));
    };

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
                <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30 sm:mx-0 sm:h-10 sm:w-10">
                            <Calendar className="h-6 w-6 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                        </div>
                        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                            <h3 className="text-lg font-bold leading-6 text-gray-900 dark:text-white" id="modal-title">
                                Ajouter un rappel à votre calendrier
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-600 dark:text-slate-300">
                                    Vous êtes sur le point d'exporter le fichier CSV <span className="font-semibold text-gray-800 dark:text-slate-100">"{fileName}"</span>.
                                </p>
                            </div>
                            <div className="mt-4">
                                 <label htmlFor="reminder-date" className="block text-sm font-medium leading-6 text-gray-900 dark:text-slate-200">
                                    N'hésitez pas à modifier la date suggérée ci-dessous
                                </label>
                                <input
                                    type="date"
                                    id="reminder-date"
                                    value={dateString}
                                    onChange={(e) => setDateString(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-0 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 dark:border-t dark:border-slate-700 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-inset ring-red-300 hover:bg-red-50 dark:bg-slate-700 dark:text-red-400 dark:ring-red-800/50 dark:hover:bg-red-900/20 sm:w-auto"
                        >
                            Annuler
                        </button>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-col-reverse sm:flex-row sm:gap-x-3 gap-y-3">
                        <button
                            type="button"
                            onClick={onSkip}
                            className="inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 sm:w-auto"
                        >
                            Exporter sans rappel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="inline-flex w-full justify-center rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 sm:w-auto"
                        >
                            Générer & Exporter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReminderModal;