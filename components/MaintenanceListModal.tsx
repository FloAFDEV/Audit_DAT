import React, { useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { MaintenanceItem, AuditCategory } from '../types';
import { AUDIT_CATEGORIES } from '../data/config';
import { CategoryIcon } from './CategoryIcon';
import { ModuleIcon } from './ModuleIcon';

interface MaintenanceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: MaintenanceItem[];
}

const MaintenanceListModal: React.FC<MaintenanceListModalProps> = ({ isOpen, onClose, title, items }) => {
    const sortedItems = useMemo(() => {
        // Define sorting order for categories
        const categoryOrder: (AuditCategory | undefined)[] = ['METRO_A', 'METRO_B', 'METRO_C', 'TRAM', 'TELEO', 'PR', undefined];
        
        return [...items].sort((a, b) => {
            // 1. Sort by Category (Line)
            const indexA = categoryOrder.indexOf(a.category);
            const indexB = categoryOrder.indexOf(b.category);
            
            // Handle cases where category might not be in the list (put at the end)
            const safeIndexA = indexA === -1 ? 999 : indexA;
            const safeIndexB = indexB === -1 ? 999 : indexB;

            if (safeIndexA !== safeIndexB) {
                return safeIndexA - safeIndexB;
            }

            // 2. Sort by Lieu Name
            const lieuCompare = a.lieuName.localeCompare(b.lieuName);
            if (lieuCompare !== 0) return lieuCompare;

            // 3. Sort by Element Name
            return a.elementName.localeCompare(b.elementName);
        });
    }, [items]);

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
                    {sortedItems.length === 0 ? (
                         <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-slate-400">Aucun élément à afficher.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                            {sortedItems.map((item, index) => {
                                const categoryConfig = item.category ? AUDIT_CATEGORIES.find(c => c.key === item.category) : undefined;
                                
                                return (
                                    <li key={index} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        {/* Header: Badge Line + Lieu Name + Context */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {categoryConfig && <CategoryIcon categoryConfig={categoryConfig} size="sm" />}
                                                <span className="font-bold text-lg text-gray-800 dark:text-slate-100">{item.lieuName}</span>
                                                <span className="hidden sm:inline text-gray-300 dark:text-slate-600">|</span>
                                                <span className="text-sm text-gray-500 dark:text-slate-400">{item.context}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Body: Audit Type Icon + Element Name + Adhesive Name */}
                                        <div className="flex items-start gap-3 pl-1">
                                            {item.auditType && (
                                                <div className="mt-0.5 flex-shrink-0" title={item.moduleName}>
                                                    <ModuleIcon type={item.auditType} className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-base font-semibold text-gray-900 dark:text-slate-50">
                                                    {item.adhesiveName}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-slate-300">
                                                    <span className="font-medium">Élément concerné :</span> {item.elementName}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
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