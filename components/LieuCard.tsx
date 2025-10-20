import React from 'react';
import { Lieu, AuditCategory, AuditModuleType, ModeData } from '../types';
import { LieuBadges } from './Icons';
import { ChevronRight } from 'lucide-react';
import { getLieuProgress } from '../utils/progressCalculators';
import { ProgressBadge } from './ProgressBadge';
import useAuditStore from '../store';

interface LieuCardProps {
    lieu: Lieu;
    onSelect: () => void;
    activeFilter: AuditCategory | 'ALL';
}

export const LieuCard: React.FC<LieuCardProps> = ({ lieu, onSelect, activeFilter }) => {
    const { activeAuditFilters } = useAuditStore();
    const progress = getLieuProgress(lieu, activeAuditFilters);
    const cardBgClass = 'bg-white dark:bg-slate-800';
    
    const stationCodes = lieu.modules
        .filter(m => m.type === AuditModuleType.DAT)
        .map(m => (m.data as ModeData).stations[0].code)
        .filter((code): code is string => !!code)
        .filter((value, index, self) => self.indexOf(value) === index);

    const isInProgress = progress > 0 && progress < 100;
    const progressBarColor = isInProgress ? 'bg-amber-500 dark:bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';

    return (
        <button
            onClick={onSelect}
            className={`${cardBgClass} p-4 rounded-lg shadow hover:shadow-lg transition-all duration-300 text-left w-full group flex flex-col h-full dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600`}
        >
            <div className="flex justify-between items-center">
                 <div className="flex items-center gap-x-2 flex-wrap min-w-0">
                    <LieuBadges lieu={lieu} activeFilter={activeFilter} />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 truncate">{lieu.name}</h3>
                     {stationCodes.length > 0 && (
                        <span className="flex-shrink-0 bg-gray-200 text-gray-700 text-xs font-mono font-bold px-2 py-1 rounded dark:bg-slate-700 dark:text-slate-300">
                            {stationCodes.join(' / ')}
                        </span>
                    )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-200 transition-colors flex-shrink-0 ml-2"/>
            </div>
            <div className="mt-auto pt-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Progression</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-slate-700">
                    <div className={`${progressBarColor} h-1.5 rounded-full`} style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </button>
    );
};
