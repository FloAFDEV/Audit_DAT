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

    let backgroundClass = '';
    let textColorClass = '';

    if (isActive) {
        if (isComplete) {
            backgroundClass = 'bg-teal-600';
            textColorClass = 'text-white';
        } else {
            backgroundClass = 'bg-sky-100 dark:bg-sky-900/50';
            if (roundedProgress === 0) {
                textColorClass = 'text-slate-500 dark:text-slate-400';
            } else {
                textColorClass = 'text-amber-600 dark:text-amber-400';
            }
        }
    } else { // inactive
        if (isComplete) {
            backgroundClass = 'bg-teal-100 dark:bg-teal-900/50';
            textColorClass = 'text-teal-800 dark:text-teal-300';
        } else {
            backgroundClass = 'bg-slate-200 dark:bg-slate-700';
            if (roundedProgress === 0) {
                textColorClass = 'text-slate-500 dark:text-slate-400';
            } else {
                textColorClass = 'text-amber-600 dark:text-amber-400';
            }
        }
    }

    return (
        <span className={`${baseClasses} ${backgroundClass} ${textColorClass}`}>
            {roundedProgress}%
        </span>
    );
};
