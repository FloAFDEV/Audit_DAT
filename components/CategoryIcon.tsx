import React from 'react';
import { AuditCategoryConfig, AuditCategory } from '../types';
import { Globe } from 'lucide-react';
import { showInfoToast } from './ToastManager';

interface CategoryInfo {
    title: string;
    message: string;
    tooltip: string;
}

const getCategoryInfo = (categoryConfig: AuditCategoryConfig, isFuture: boolean): CategoryInfo => {
    const terminusMap: Partial<Record<AuditCategory, string>> = {
        METRO_A: 'Basso Cambo <> Balma-Gramont',
        METRO_B: 'Borderouge <> Ramonville',
        METRO_C: 'Colomiers Gare <> Labège Gare',
        TRAM: 'MEETT <> Palais de Justice',
        PR: 'Parking + Silo',
    };

    const title = categoryConfig.label;
    const details = terminusMap[categoryConfig.key as AuditCategory] || '';
    const futureText = isFuture ? 'Bientôt disponible' : '';

    const messageParts = [details, futureText].filter(Boolean);
    const message = messageParts.join(' • ');

    const tooltip = `${title}${message ? ` (${message})` : ''}`;

    return { title, message, tooltip };
};

// FIX: Added the missing CategoryIconProps interface to define the component's props.
interface CategoryIconProps {
    categoryConfig?: AuditCategoryConfig;
    size?: 'xs' | 'sm' | 'md';
    isFuture?: boolean;
    asDiv?: boolean;
}

/** Un seul jeu de tailles, dérivé du même barème pour les 3 formats — jamais
 *  une nouvelle échelle de couleurs/icônes : seule la taille varie.
 *  xs (20px) : badge de ligne répété à chaque ligne d'une longue liste
 *  (ex. stations Plans de quartier) — assez discret pour ne pas alourdir,
 *  toujours identifiable grâce à sa couleur (seul signal qui compte ici). */
const SIZE_CONFIG = {
    xs: { box: 'w-5 h-5', text: 'text-[9px] font-bold', pill: 'h-5 px-1.5', radius: 'rounded-[6px]', globe: 'w-3 h-3' },
    sm: { box: 'w-7 h-7', text: 'text-xs font-bold', pill: 'h-7 px-2', radius: 'rounded-[8px]', globe: 'w-4 h-4' },
    md: { box: 'w-8 h-8', text: 'text-sm font-bold', pill: 'h-8 px-2.5', radius: 'rounded-[9px]', globe: 'w-4.5 h-4.5' },
} as const;

export const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryConfig, size = 'md', isFuture = false, asDiv = false }) => {
    // sm : 28px → meilleure lisibilité terrain + contraste AA renforcé
    const { box: sizeClasses, text: textSize, pill: pillSizing, radius } = SIZE_CONFIG[size];

    if (!categoryConfig) { // For "Tout le réseau"
        return (
            <div
                className={`line-badge flex-shrink-0 flex items-center justify-center ${radius} bg-sky-500 text-white shadow-[0_1px_3px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-black/10 ${sizeClasses}`}
                title="Tout le réseau"
            >
                <Globe className={SIZE_CONFIG[size].globe} />
            </div>
        );
    }

    const { shortLabel, colors } = categoryConfig;
    const isLongLabel = (shortLabel?.length || 0) >= 3;

    const sizing = isLongLabel ? `${pillSizing} ${textSize}` : `${sizeClasses} ${textSize}`;

    const info = getCategoryInfo(categoryConfig, isFuture);

    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent parent clicks (e.g., closing a dropdown)
        if (info.message) { // Only show toast if there's extra info
            showInfoToast({
                icon: <CategoryIcon categoryConfig={categoryConfig} size="md" />,
                title: info.title,
                message: info.message,
            });
        }
    };

    const commonClasses = `line-badge flex-shrink-0 flex items-center justify-center ${radius} font-bold shadow-[0_1px_3px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-black/10 transition-opacity ${sizing} ${colors.badgeText}`;

    if (asDiv) {
        return (
            <div
                className={commonClasses}
                style={{ backgroundColor: colors.badgeBg }}
                title={info.tooltip}
            >
                {shortLabel}
            </div>
        );
    }

    return (
        <button
            type="button"
            className={commonClasses}
            style={{ backgroundColor: colors.badgeBg }}
            title={info.tooltip}
            onClick={handleIconClick}
        >
            {shortLabel}
        </button>
    );
};