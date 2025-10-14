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
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryConfig, size = 'md', isFuture = false }) => {
    const sizeClasses = size === 'md' ? 'w-6 h-6' : 'w-5 h-5';
    const textSize = size === 'md' ? 'text-sm' : 'text-xs';

    if (!categoryConfig) { // For "Tout le réseau"
        return (
            <div 
                className={`flex-shrink-0 flex items-center justify-center rounded-md bg-sky-500 text-white ${sizeClasses}`}
                title="Tout le réseau"
            >
                <Globe className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />
            </div>
        );
    }

    const { shortLabel, colors } = categoryConfig;
    const isLongLabel = shortLabel.length >= 3;

    const sizing = size === 'md'
        ? (isLongLabel ? `h-6 px-2 ${textSize}` : `${sizeClasses} ${textSize}`)
        : (isLongLabel ? `h-5 px-1.5 ${textSize}` : `${sizeClasses} ${textSize}`);

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


    return (
        <button
            type="button"
            className={`flex-shrink-0 flex items-center justify-center rounded-sm font-bold shadow-sm transition-opacity ${sizing} ${colors.badgeText}`}
            style={{ backgroundColor: colors.badgeBg }}
            title={info.tooltip}
            onClick={handleIconClick}
        >
            {shortLabel}
        </button>
    );
};