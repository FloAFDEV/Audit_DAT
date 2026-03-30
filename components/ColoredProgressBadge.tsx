import React from 'react';

interface ColoredProgressBadgeProps {
    progress: number;
}

export const ColoredProgressBadge: React.FC<ColoredProgressBadgeProps> = ({ progress }) => {
    const roundedProgress = Math.round(progress);

    let textColorClass = '';
    if (roundedProgress === 0) {
        // Gris pour 0%
        textColorClass = 'text-slate-500 dark:text-slate-400';
    } else if (roundedProgress > 0 && roundedProgress < 100) {
        // Ambre pour 1-99%
        textColorClass = 'text-amber-600 dark:text-amber-400';
    } else {
        // Sarcelle (Teal) pour 100%
        textColorClass = 'text-teal-600 dark:text-teal-400';
    }

    return (
        <span className="px-2 py-0.5 text-xs font-bold rounded-[6px] ring-1 ring-black/5 transition-colors bg-slate-200 dark:bg-slate-600">
            <span className={textColorClass}>
                {roundedProgress}%
            </span>
        </span>
    );
};
