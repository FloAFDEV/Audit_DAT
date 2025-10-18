import React from 'react';
import useAuditStore from '../store';
import { AuditModuleType, AuditCategory, Lieu } from '../types';
import { ModuleIcon } from './ModuleIcon';
import { getLieuxForCategory } from '../data/builder';
import { AUDIT_MODULES_CONFIG } from '../data/config';

// A defined order for the filter buttons, derived from the central config
const AUDIT_TYPE_ORDER = AUDIT_MODULES_CONFIG.map(config => config.type);

// Simple labels for the buttons, derived from the central config
const AUDIT_TYPE_LABELS: Record<string, string> = AUDIT_MODULES_CONFIG.reduce((acc, config) => {
    acc[config.type] = config.shortLabel;
    return acc;
}, {} as Record<string, string>);

interface AuditFilterSelectorProps {
    lieux: Lieu[];
    activeCategory: AuditCategory;
}

export const AuditFilterSelector: React.FC<AuditFilterSelectorProps> = ({ lieux, activeCategory }) => {
    const { activeAuditFilters, setActiveAuditFilters } = useAuditStore();

    const availableAuditTypes = React.useMemo(() => {
        const lieuxForCategory = getLieuxForCategory(lieux, activeCategory);
        const types = new Set<AuditModuleType>();
        for (const lieu of lieuxForCategory) {
            for (const module of lieu.modules) {
                if (!module.isFuture) { // Only include active audits
                    types.add(module.type);
                }
            }
        }
        // Sort the found types based on our predefined order
        return AUDIT_TYPE_ORDER.filter(type => types.has(type));
    }, [lieux, activeCategory]);

    const handleToggleFilter = (type: AuditModuleType) => {
        const newFilters = activeAuditFilters.includes(type)
            ? activeAuditFilters.filter(f => f !== type)
            : [...activeAuditFilters, type];
        setActiveAuditFilters(newFilters);
    };

    if (availableAuditTypes.length <= 1) {
        return null; // Don't show filters if there's only one or zero types of audit
    }

    return (
        <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 block">Filtrer par type d'audit :</label>
            <div className="flex flex-wrap gap-2">
                {availableAuditTypes.map(type => {
                    const isActive = activeAuditFilters.includes(type);
                    return (
                        <button
                            key={type}
                            onClick={() => handleToggleFilter(type)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 active:scale-95 ${
                                isActive
                                ? 'bg-teal-600 text-white shadow-md'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
                            }`}
                        >
                            <ModuleIcon type={type} className="w-4 h-4" />
                            <span>{AUDIT_TYPE_LABELS[type] || type}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};