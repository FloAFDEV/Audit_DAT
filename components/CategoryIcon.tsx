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
    size?: 'sm' | 'md';
    isFuture?: boolean;
    asDiv?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryConfig, size = 'md', isFuture = false, asDiv = false }) => {
    const sizeClasses = size === 'md' ? 'w-7 h-7' : 'w-6 h-6';
    const textSize = size === 'md' ? 'text-sm' : 'text-[11px]';

    if (!categoryConfig) { // For "Tout le réseau"
        const radius = size === 'md' ? 'rounded-[8px]' : 'rounded-[6px]';
        return (
            <div 
                className={`flex-shrink-0 flex items-center justify-center ${radius} bg-sky-500 text-white shadow-[0_1px_3px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-black/10 ${sizeClasses}`}
                title="Tout le réseau"
            >
                <Globe className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
            </div>
        );
    }

    const { shortLabel, colors } = categoryConfig;
    const isLongLabel = (shortLabel?.length || 0) >= 3;

    const sizing = size === 'md'
        ? (isLongLabel ? `h-7 px-2 ${textSize}` : `${sizeClasses} ${textSize}`)
        : (isLongLabel ? `h-6 px-1.5 ${textSize}` : `${sizeClasses} ${textSize}`);

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

    const radius = size === 'md' ? 'rounded-[8px]' : 'rounded-[6px]';
    const commonClasses = `flex-shrink-0 flex items-center justify-center ${radius} font-bold shadow-[0_1px_3px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-black/10 transition-opacity ${sizing} ${colors.badgeText}`;

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