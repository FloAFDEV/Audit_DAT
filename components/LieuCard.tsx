
import React from 'react';
import { motion } from 'motion/react';
import { Lieu, AuditCategory, AuditModuleType, ModeData } from '../types';
import { LieuBadges } from './Icons';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { getLieuProgress } from '../utils/progressCalculators';
import { getLieuDefectCount } from '../utils/anomalyDetector';
import { getProgressColor } from '../utils/progressColor';
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
    const isInProgress = progress > 0 && progress < 100;
    // En mode audit, on atténue les lieux non commencés sans défaut.
    // Les lieux en cours restent toujours visibles (l'auditeur est en train de les traiter).
    const dimmed = auditModeActive && !hasAnomaly && !isInProgress;

    // Design system des états terrain (accent latéral lisible en 1 seconde).
    const statusClass = hasAnomaly
        ? 'status-error'
        : (isInProgress ? 'status-warning' : 'status-ok');

    const cardBgClass = 'bg-white dark:bg-slate-800';
    
    const stationCodes = (lieu?.modules || [])
        .filter(m => m.type === AuditModuleType.DAT)
        .map(m => (m.data as ModeData).stations?.[0]?.code)
        .filter((code): code is string => !!code)
        .filter((value, index, self) => self.indexOf(value) === index);

    const progressBarColor = getProgressColor(progress);

    return (
        <motion.div
            variants={cardVariants}
            exit="exit"
            whileHover={undefined}
            data-flip-item
            data-anomaly={hasAnomaly ? 'true' : 'false'}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
            className={`${cardBgClass} ${statusClass} lieu-card ${isInProgress ? 'is-in-progress' : ''} relative p-4 rounded-lg shadow transition-[opacity] duration-200 text-left w-full group flex flex-col h-full dark:ring-1 dark:ring-slate-700/50 cursor-pointer ${dimmed ? 'opacity-40' : ''}`}
        >
            {hasAnomaly && (
                <span className="absolute -top-2 -right-2 z-10 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-md ring-2 ring-white dark:ring-slate-900">
                    <AlertTriangle className="w-3 h-3" />
                    {defectCount}
                </span>
            )}
            <div className="flex justify-between items-center">
                 <div className="flex items-center gap-x-3 flex-wrap min-w-0">
                    <LieuBadges lieu={lieu} activeFilter={activeFilter} />
                    <div className="flex flex-col min-w-0">
                        <h3 className="text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100 truncate">{lieu.name}</h3>
                        {(stationCodes?.length || 0) > 0 && (
                            <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {stationCodes.join(' / ')}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight className="lieu-card-chevron w-5 h-5 text-slate-400 dark:text-slate-500 transition-colors flex-shrink-0 ml-2"/>
            </div>
            <div className="mt-auto pt-4">
                <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-xs font-medium ${isInProgress ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {isInProgress ? 'En cours' : 'Progression'}
                    </span>
                    <span className={`text-sm ${isInProgress ? 'font-semibold text-amber-600 dark:text-amber-400' : 'font-normal text-slate-700 dark:text-slate-300'}`}>
                        {Math.round(progress)}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-slate-700">
                    <div className="h-2.5 rounded-full" style={{ width: `${progress}%`, backgroundColor: progressBarColor }}></div>
                </div>
            </div>
        </motion.div>
    );
};
