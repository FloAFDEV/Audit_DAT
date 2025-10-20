import React from 'react';
import useAuditStore from '../store';
import { AuditModuleType, AuditCategory } from '../types';
import { ModuleIcon } from './ModuleIcon';
import { AUDIT_MODULES_CONFIG } from '../data/config';
import { getCategoryProgress } from '../utils/progressCalculators';
import { ColoredProgressBadge } from './ColoredProgressBadge';

// Simple labels for the buttons, derived from the central config
const AUDIT_TYPE_LABELS: Record<string, string> = AUDIT_MODULES_CONFIG.reduce((acc, config) => {
    acc[config.type] = config.shortLabel;
    return acc;
}, {} as Record<string, string>);

interface AuditFilterSelectorProps {
    availableAuditTypes: AuditModuleType[];
}

export const AuditFilterSelector: React.FC<AuditFilterSelectorProps> = ({ availableAuditTypes }) => {
    const { activeAuditFilters, setActiveAuditFilters, lieux, activeFilter } = useAuditStore();

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
            <div className="flex flex-wrap gap-3">
                {availableAuditTypes.map(type => {
                    const isActive = activeAuditFilters.includes(type);
                    const progress = getCategoryProgress(lieux, activeFilter as AuditCategory, [type]);
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
                            {progress >= 0 && <ColoredProgressBadge progress={progress} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};