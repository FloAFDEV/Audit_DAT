
import React from 'react';
import { motion } from 'motion/react';
import { Lieu, AuditCategory, AuditModuleType, ModeData } from '../types';
import { LieuBadges } from './Icons';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { getLieuProgress } from '../utils/progressCalculators';
import { getLieuDefectCount } from '../utils/anomalyDetector';
import { ProgressBadge } from './ProgressBadge';
import { cardVariants } from '../hooks/motion/transitions';
import useAuditStore from '../store';

interface LieuCardProps {
    lieu: Lieu;
    onSelect: () => void;
    activeFilter: AuditCategory | 'ALL';
}

export const LieuCard: React.FC<LieuCardProps> = ({ lieu, onSelect, activeFilter }) => {
    const { activeAuditFilters, auditModeActive } = useAuditStore();
    const progress = getLieuProgress(lieu, activeAuditFilters);
    const defectCount = getLieuDefectCount(lieu);
    const hasAnomaly = defectCount > 0;
    // En mode audit, on atténue les lieux sans défaut pour faire ressortir les anomalies.
    const dimmed = auditModeActive && !hasAnomaly;

    // Design system des états terrain (accent latéral lisible en 1 seconde).
    const statusClass = hasAnomaly
        ? 'status-error'
        : (progress > 0 && progress < 100 ? 'status-warning' : 'status-ok');

    const cardBgClass = 'bg-white dark:bg-slate-800';
    
    const stationCodes = (lieu?.modules || [])
        .filter(m => m.type === AuditModuleType.DAT)
        .map(m => (m.data as ModeData).stations?.[0]?.code)
        .filter((code): code is string => !!code)
        .filter((value, index, self) => self.indexOf(value) === index);

    const isInProgress = progress > 0 && progress < 100;
    const progressBarColor = isInProgress ? 'bg-amber-500 dark:bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';

    return (
        <motion.div
            variants={cardVariants}
            exit="exit"
            data-flip-item
            data-anomaly={hasAnomaly ? 'true' : 'false'}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
            className={`${cardBgClass} ${statusClass} relative p-4 rounded-lg shadow hover:shadow-lg transition-[opacity] duration-200 text-left w-full group flex flex-col h-full dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600 cursor-pointer ${dimmed ? 'opacity-40' : ''}`}
        >
            {hasAnomaly && (
                <span className="absolute -top-2 -right-2 z-10 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                    <AlertTriangle className="w-3 h-3" />
                    {defectCount}
                </span>
            )}
            <div className="flex justify-between items-center">
                 <div className="flex items-center gap-x-3 flex-wrap min-w-0">
                    <span className="icon-3d inline-flex">
                        <LieuBadges lieu={lieu} activeFilter={activeFilter} />
                    </span>
                    <div className="flex flex-col min-w-0">
                        <h3 className="text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100 truncate">{lieu.name}</h3>
                        {(stationCodes?.length || 0) > 0 && (
                            <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {stationCodes.join(' / ')}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors flex-shrink-0 ml-2"/>
            </div>
            <div className="mt-auto pt-4">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Progression</span>
                    <span className="text-sm font-normal text-slate-700 dark:text-slate-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-slate-700">
                    <div className={`${progressBarColor} h-1.5 rounded-full`} style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </motion.div>
    );
};
