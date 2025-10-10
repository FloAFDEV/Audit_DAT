
import React from 'react';
import { Lieu } from '../types';
// FIX: Corrected import path for AUDIT_CATEGORIES. It was pointing to an empty constants file.
import { AUDIT_CATEGORIES } from '../data/config';
import { AuditCategoryConfig } from '../types';

export const LieuBadges: React.FC<{ lieu: Lieu }> = ({ lieu }) => {
    const categories = new Map<string, AuditCategoryConfig>();
    
    lieu.modules.forEach(module => {
        const key = AUDIT_CATEGORIES.find(c => c.predicate(module))?.key;
        if (key && !categories.has(key)) {
            const config = AUDIT_CATEGORIES.find(c => c.key === key);
            if (config) categories.set(key, config);
        }
    });

    return (
        <div className="flex flex-wrap items-center gap-2">
            {Array.from(categories.values()).map(config => (
                <div 
                    key={config.key} 
                    className={`px-2 py-0.5 rounded text-xs font-bold shadow-sm ${config.colors.badgeText || config.colors.text}`}
                    style={{ backgroundColor: config.colors.badgeBg || config.colors.primary }}
                >
                    {config.shortLabel}
                </div>
            ))}
        </div>
    );
};
