import React from 'react';
import { DAT } from '../types';
import { getDatProgress, ProgressStatus } from '../utils/progressCalculators';

interface DatIconProps {
    dat: DAT;
    size?: 'sm' | 'md' | 'lg';
}

export const DatIcon: React.FC<DatIconProps> = ({ dat, size = 'md' }) => {
    const statusInfo = getDatProgress(dat);

    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
    };

    const colorClasses = {
        [ProgressStatus.NotStarted]: 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200',
        [ProgressStatus.InProgress]: 'bg-amber-100 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300',
        [ProgressStatus.Completed]: 'bg-teal-100 text-teal-800 dark:bg-teal-500/30 dark:text-teal-300',
    };

    // Extract number from DAT name (e.g., "DAT 01" -> "01", "DAT 5" -> "5")
    const datNumber = dat.name.match(/\d+/)?.[0] || '?';

    return (
        <div 
            className={`flex-shrink-0 flex items-center justify-center rounded-lg font-bold shadow-sm ${sizeClasses[size]} ${colorClasses[statusInfo.status]}`}
            title={`Statut: ${statusInfo.label}`}
        >
            {datNumber}
        </div>
    );
};
