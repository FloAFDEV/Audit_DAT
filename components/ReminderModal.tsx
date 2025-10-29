import React, { useState, useEffect } from 'react';
import { Download, Pencil } from 'lucide-react';
import { AuditCategoryConfig } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedDate: Date) => void;
    onSkip: () => void;
    titlePrefix: string;
    titleSubject: string;
    reminderDescription: React.ReactNode;
    fileName: string;
    initialDate: Date;
    categoryConfig?: AuditCategoryConfig;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onConfirm, onSkip, titlePrefix, titleSubject, reminderDescription, fileName, initialDate, categoryConfig }) => {
    const [dateString, setDateString] = useState('');

    useEffect(() => {
        if (initialDate) {
            const year = initialDate.getFullYear();
            const month = (initialDate.getMonth() + 1).toString().padStart(2, '0');
            const day = initialDate.getDate().toString().padStart(2, '0');
            setDateString(`${year}-${month}-${day}`);
        }
    }, [initialDate]);
    
    if (!isOpen) return null;
    
    const handleConfirm = () => {
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
                    <div className="w-full">
                        {/* Title Section */}
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
                                <Download className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-lg text-gray-800 dark:text-slate-100" id="modal-title">
                                    {titlePrefix}
                                </h3>
                                <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{titleSubject}</p>
                                    {categoryConfig && <CategoryIcon categoryConfig={categoryConfig} size="md" />}
                                </div>
                            </div>
                        </div>

                        {/* File Name Section */}
                        <div className="mt-4 text-center">
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                Vous êtes sur le point d'exporter le fichier CSV :
                                <span className="mt-2 block font-mono font-semibold text-gray-800 dark:text-slate-200">
                                    "{fileName}"
                                </span>
                            </p>
                        </div>

                        {/* Reminder Section */}
                        <div className="mt-5 pt-5 border-t border-dashed border-gray-200 dark:border-slate-700">
                            <h4 className="text-center text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                                Option : Créer un rappel de suivi
                            </h4>
                            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300 text-left">
                                {reminderDescription}
                            </p>
                            <div className="mt-4 text-left">
                                <label htmlFor="reminder-date" className="flex items-center gap-2 text-sm font-medium leading-6 text-gray-900 dark:text-slate-200">
                                    <span>Date du rappel</span>
                                    <Pencil className="w-4 h-4 text-gray-400 dark:text-slate-500 sm:hidden" />
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
                <div className="bg-gray-50 dark:bg-slate-800/50 dark:border-t dark:border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="inline-flex w-full justify-center rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 sm:ml-3 sm:w-auto"
                    >
                        Exporter avec rappel
                    </button>
                    <button
                        type="button"
                        onClick={onSkip}
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 sm:mt-0 sm:w-auto"
                    >
                        Exporter sans rappel
                    </button>
                     <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20 sm:mt-0 sm:mr-auto sm:w-auto"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReminderModal;