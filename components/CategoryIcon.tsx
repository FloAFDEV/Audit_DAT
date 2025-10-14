import React from 'react';
import { AuditCategoryConfig } from '../types';
import { Globe } from 'lucide-react';

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
            <div className={`flex-shrink-0 flex items-center justify-center rounded-md bg-sky-500 text-white ${sizeClasses}`}>
                <Globe className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} />
            </div>
        );
    }

    const { shortLabel, colors, label } = categoryConfig;
    const isLongLabel = shortLabel.length >= 3;

    const sizing = size === 'md'
        ? (isLongLabel ? `h-6 px-2 ${textSize}` : `${sizeClasses} ${textSize}`)
        : (isLongLabel ? `h-5 px-1.5 ${textSize}` : `${sizeClasses} ${textSize}`);

    return (
        <div
            className={`flex-shrink-0 flex items-center justify-center rounded-sm font-bold shadow-sm transition-opacity ${sizing} ${colors.badgeText}`}
            style={{ backgroundColor: colors.badgeBg }}
            title={isFuture ? `${label} (Bientôt disponible)` : label}
        >
            {shortLabel}
        </div>
    );
};
