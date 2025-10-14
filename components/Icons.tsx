
import React, { useMemo } from 'react';
import { AUDIT_CATEGORIES } from '../data/config';
import { Lieu } from '../types';
import { getModuleLineConfig } from '../data/builder';
import { CategoryIcon } from './CategoryIcon';

export const FormattedCorrespondence: React.FC<{ text: string, className?: string, as?: React.ElementType, useLogos?: boolean }> = ({ text, className, as: Component = 'span', useLogos = false }) => {
    // This regex will split the string by "A->B" like patterns, keeping the delimiter.
    const parts = text.split(/([A-Z]->[A-Z])/g);
    
    return (
        <Component className={className}>
            {parts.map((part, index) => {
                if (!part) return null; // handle empty strings from split
                // The delimiter will match this regex exactly.
                const match = part.match(/^([A-Z])->([A-Z])$/);
                if (!match) {
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                }

                const [, fromLine, toLine] = match;
                const fromConfig = AUDIT_CATEGORIES.find(c => c.shortLabel === fromLine);
                const toConfig = AUDIT_CATEGORIES.find(c => c.shortLabel === toLine);

                if (!fromConfig || !toConfig) {
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                }

                if (useLogos) {
                    return (
                        <span key={index} className="inline-flex items-center gap-1.5 align-middle">
                            <CategoryIcon categoryConfig={fromConfig} size="sm" />
                            <span className="text-slate-600 dark:text-slate-300 font-normal">&rarr;</span>
                            <CategoryIcon categoryConfig={toConfig} size="sm" />
                        </span>
                    );
                }

                // Special style for yellow text to improve readability on light backgrounds
                const getStyle = (config: typeof fromConfig): React.CSSProperties => {
                    const style: React.CSSProperties = { color: config.colors.primary };
                    if (config.key === 'METRO_B') {
                        style.textShadow = '0px 0px 3px rgba(0, 0, 0, 0.4)';
                    }
                    return style;
                };

                return (
                    <React.Fragment key={index}>
                        <span style={getStyle(fromConfig)} className="font-bold">{fromLine}</span>
                        <span className="text-gray-400 dark:text-slate-500 font-normal mx-0.5">-&gt;</span>
                        <span style={getStyle(toConfig)} className="font-bold">{toLine}</span>
                    </React.Fragment>
                );
            })}
        </Component>
    );
};

// FIX: Added the missing 'LieuBadges' component.
export const LieuBadges: React.FC<{ lieu: Lieu }> = ({ lieu }) => {
    const categories = useMemo(() => {
        const categoryMap = new Map<string, ReturnType<typeof getModuleLineConfig>>();
        
        lieu.modules.forEach(module => {
            // We only want badges for active/existing modules, not future ones.
            if (!module.isFuture) {
                const config = getModuleLineConfig(module);
                if (config) {
                    categoryMap.set(config.key, config);
                }
            }
        });

        // Convert map values to array and filter out any potential undefined values
        const uniqueCategories = Array.from(categoryMap.values()).filter((c): c is NonNullable<typeof c> => !!c);
        
        // Sort the categories based on the order in AUDIT_CATEGORIES for consistency
        uniqueCategories.sort((a, b) => {
            const indexA = AUDIT_CATEGORIES.findIndex(cat => cat.key === a.key);
            const indexB = AUDIT_CATEGORIES.findIndex(cat => cat.key === b.key);
            return indexA - indexB;
        });
        
        return uniqueCategories;

    }, [lieu]);

    if (categories.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map(category => (
                <CategoryIcon key={category.key} categoryConfig={category} size="sm" />
            ))}
        </div>
    );
};