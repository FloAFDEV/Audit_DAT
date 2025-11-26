
import React, { useMemo, useState } from 'react';
import { X, AlertTriangle, ArrowUpDown, Download, Filter } from 'lucide-react';
import { MaintenanceItem, AuditCategory, Station, AuditModuleType } from '../types';
import { AUDIT_CATEGORIES } from '../data/config';
import { CategoryIcon } from './CategoryIcon';
import { ModuleIcon } from './ModuleIcon';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';
import { exportMaintenanceListToCsv } from '../utils/csvExporter';
import toast from 'react-hot-toast';

interface MaintenanceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: MaintenanceItem[];
}

// Mapping des stations par ligne pour le tri géographique
const STATION_LISTS: Partial<Record<AuditCategory, Partial<Station>[]>> = {
    'METRO_A': LINE_A_STATIONS,
    'METRO_B': LINE_B_STATIONS,
    'METRO_C': LINE_C_STATIONS,
    'TRAM': TRAM_STATIONS,
    'TELEO': TELEO_STATIONS,
};

// Ordre de priorité des types d'audit pour le tri
const AUDIT_TYPE_PRIORITY: AuditModuleType[] = [
    AuditModuleType.DAT,
    AuditModuleType.ECA,
    AuditModuleType.PMR_FLOOR_ADHESIVE,
    AuditModuleType.COGNITIVE_PICTOGRAMS,
    AuditModuleType.PR
];

type SortMode = 'LINE' | 'AUDIT';

const MaintenanceListModal: React.FC<MaintenanceListModalProps> = ({ isOpen, onClose, title, items }) => {
    const [sortMode, setSortMode] = useState<SortMode>('LINE');

    const sortedItems = useMemo(() => {
        // 1. Définir l'ordre des catégories
        const categoryOrder: (AuditCategory | undefined)[] = ['METRO_A', 'METRO_B', 'METRO_C', 'TRAM', 'TELEO', 'PR', undefined];
        
        // 2. Créer une map d'index pour chaque station sur sa ligne pour un accès rapide O(1)
        const stationIndexMaps = new Map<string, Map<string, number>>();
        Object.entries(STATION_LISTS).forEach(([cat, stations]) => {
            const map = new Map<string, number>();
            stations.forEach((s, idx) => {
                const name = s.lieuName || s.name;
                if (name) map.set(name, idx);
            });
            stationIndexMaps.set(cat, map);
        });

        return [...items].sort((a, b) => {
            // --- NIVEAU 0 : Tri par Type d'Audit (si activé) ---
            if (sortMode === 'AUDIT') {
                const typeRankA = a.auditType ? AUDIT_TYPE_PRIORITY.indexOf(a.auditType) : 99;
                const typeRankB = b.auditType ? AUDIT_TYPE_PRIORITY.indexOf(b.auditType) : 99;
                
                if (typeRankA !== typeRankB) {
                    return typeRankA - typeRankB;
                }
                // Si même type d'audit, on continue avec la logique géographique ci-dessous
            }

            // --- NIVEAU 1 : Tri par Catégorie (Ligne) ---
            const indexA = categoryOrder.indexOf(a.category);
            const indexB = categoryOrder.indexOf(b.category);
            const safeIndexA = indexA === -1 ? 999 : indexA;
            const safeIndexB = indexB === -1 ? 999 : indexB;

            if (safeIndexA !== safeIndexB) {
                return safeIndexA - safeIndexB;
            }

            // --- NIVEAU 2 : Tri Géographique (Ordre de la ligne) ---
            // Si les deux éléments sont sur la même ligne, on regarde leur position géographique
            if (a.category && b.category && a.category === b.category) {
                const map = stationIndexMaps.get(a.category);
                if (map) {
                    const posA = map.get(a.lieuName) ?? 999;
                    const posB = map.get(b.lieuName) ?? 999;
                    if (posA !== posB) return posA - posB;
                }
            }
            
            // Fallback alphabétique sur le nom du lieu si pas de donnée géo
            const lieuCompare = a.lieuName.localeCompare(b.lieuName);
            if (lieuCompare !== 0) return lieuCompare;

            // --- NIVEAU 3 : Tri par Nom de l'élément (Équipement) ---
            return a.elementName.localeCompare(b.elementName);
        });
    }, [items, sortMode]);

    const handleExport = () => {
        const fileName = `anomalies-maintenance-${new Date().toISOString().slice(0, 10)}.csv`;
        const result = exportMaintenanceListToCsv(sortedItems, fileName);
        if (result.success) {
            toast.success('Export CSV téléchargé !');
        } else {
            toast.error('Erreur lors de l\'export.');
        }
    };

    const toggleSortMode = () => {
        setSortMode(prev => prev === 'LINE' ? 'AUDIT' : 'LINE');
    };

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
                <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                                onClick={toggleSortMode}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors"
                                title={sortMode === 'LINE' ? "Actuellement : Groupé par Ligne" : "Actuellement : Groupé par Audit"}
                            >
                                {sortMode === 'LINE' ? <ArrowUpDown className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                                <span>{sortMode === 'LINE' ? "Par Ligne" : "Par Audit"}</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                aria-label="Fermer"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    {sortedItems.length === 0 ? (
                         <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500 dark:text-slate-400">Aucun élément à afficher.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                            {sortedItems.map((item, index) => {
                                const categoryConfig = item.category ? AUDIT_CATEGORIES.find(c => c.key === item.category) : undefined;
                                const isAbsent = item.status === 'Absent';
                                
                                return (
                                    <li key={index} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        {/* Header: Badge Ligne + Nom du Lieu + Zone */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                            <div className="flex items-center gap-3">
                                                {categoryConfig && <CategoryIcon categoryConfig={categoryConfig} size="sm" />}
                                                <span className="font-bold text-lg text-gray-800 dark:text-slate-100">{item.lieuName}</span>
                                            </div>
                                            {item.context && (
                                                <div className="flex items-center">
                                                    <span className="hidden sm:inline text-gray-300 dark:text-slate-600 mr-2">|</span>
                                                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                                        {item.context}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Body: Icône Module + Nom Élément + Nom Adhésif */}
                                        <div className="flex items-start gap-3 pl-1 ml-[2px] border-l-2 border-gray-100 dark:border-slate-700/50">
                                            <div className="mt-0.5 p-1.5 bg-slate-100 dark:bg-slate-700 rounded-md flex-shrink-0" title={item.moduleName}>
                                                {item.auditType && <ModuleIcon type={item.auditType} className="w-4 h-4 text-slate-500 dark:text-slate-300" />}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-slate-50">
                                                    {item.elementName}
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-slate-400 mt-1 flex items-center flex-wrap gap-2">
                                                    {isAbsent ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 uppercase tracking-wide">
                                                            Absent
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 uppercase tracking-wide">
                                                            À remplacer
                                                        </span>
                                                    )}
                                                    <span>{item.adhesiveName}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-gray-200 dark:border-slate-700 flex-shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 sm:w-auto"
                    >
                        Fermer
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        className="inline-flex w-full justify-center items-center gap-2 rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 sm:w-auto mt-3 sm:mt-0"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exporter (CSV)</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceListModal;
