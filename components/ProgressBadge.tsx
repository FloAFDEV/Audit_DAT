import React from 'react';

interface ProgressBadgeProps {
    progress: number;
    isActive: boolean;
}

export const ProgressBadge: React.FC<ProgressBadgeProps> = ({ progress, isActive }) => {
    if (progress < 0) return null;

    const roundedProgress = Math.round(progress);
    const isComplete = roundedProgress === 100;

    const baseClasses = 'px-2 py-0.5 text-xs font-bold rounded-full transition-colors';

    let colorClasses = '';
    if (isComplete) {
        colorClasses = isActive
            ? 'bg-teal-600 text-white'
            : 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300';
    } else {
        colorClasses = isActive
            ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300'
            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }

    return (
        <span className={`${baseClasses} ${colorClasses}`}>
            {roundedProgress}%
        </span>
    );
};
