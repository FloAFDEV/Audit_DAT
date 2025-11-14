import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { MaintenanceItem } from '../types';

interface MaintenanceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: MaintenanceItem[];
}

const MaintenanceListModal: React.FC<MaintenanceListModalProps> = ({ isOpen, onClose, title, items }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black/80 transition-opacity z-50 flex items-center justify-center p-4"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="relative transform flex flex-col overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
                                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold leading-6 text-gray-900 dark:text-white" id="modal-title">
                                    {title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-slate-400">{items.length} élément(s) trouvé(s)</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -m-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                            aria-label="Fermer"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                         <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-slate-400">Aucun élément à afficher.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                            {items.map((item, index) => (
                                <li key={index} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <p className="font-semibold text-gray-800 dark:text-slate-100">{item.adhesiveName}</p>
                                    <p className="text-sm text-gray-600 dark:text-slate-300">
                                        <span className="font-medium text-gray-800 dark:text-slate-200">Élément :</span> {item.elementName}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                        <span className="font-medium">Lieu :</span> {item.lieuName} ({item.moduleName})
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{item.context}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 sm:mt-0 sm:w-auto"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceListModal;
