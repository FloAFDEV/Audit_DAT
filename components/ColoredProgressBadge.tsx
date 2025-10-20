import React from 'react';

interface ColoredProgressBadgeProps {
    progress: number;
}

export const ColoredProgressBadge: React.FC<ColoredProgressBadgeProps> = ({ progress }) => {
    const roundedProgress = Math.round(progress);

    let colorClasses = '';
    if (roundedProgress === 0) {
        // Gris pour 0%
        colorClasses = 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300';
    } else if (roundedProgress < 50) {
        // Orange pour 1% à 49%
        colorClasses = 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
    } else if (roundedProgress < 75) {
        // Jaune/Ambre pour 50% à 74%
        colorClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
    } else if (roundedProgress < 100) {
        // Bleu Ciel pour 75% à 99%
        colorClasses = 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300';
    } else {
        // Vert Sarcelle (Teal) pour 100%
        colorClasses = 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300';
    }

    return (
        <span className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${colorClasses}`}>
            {roundedProgress}%
        </span>
    );
};