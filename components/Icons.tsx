import React, { useMemo } from 'react';
import { AUDIT_CATEGORIES } from '../data/config';
import { Lieu, AuditCategory, AuditCategoryConfig } from '../types';
import { getModuleLineConfig } from '../data/builder';
import { CategoryIcon } from './CategoryIcon';

// FIX: Added 'useLogos' prop to support conditional formatting and resolve a TypeScript error in EcaSelector.tsx.
export const FormattedCorrespondence: React.FC<{ text: string, className?: string, as?: React.ElementType, useLogos?: boolean }> = ({ text, className, as: Component = 'span', useLogos = true }) => {
    // This regex will find patterns like "Liaison A→B" within a larger string.
    // It captures the whole "Liaison A→B" part, and the individual lines.
    const liaisonRegex = /(Liaison\s+([A-Z])→([A-Z]))/g;

    if (!useLogos) {
        return <Component className={className}>{text}</Component>;
    }
    
    const parts = text.split(liaisonRegex);

    if (parts.length <= 1) {
        // No match, render plain text
        return <Component className={className}>{text}</Component>;
    }
    
    return (
        <Component className={className}>
            {parts.map((part, index) => {
                if (!part) return null;
                
                // Parts at index 1, 5, 9, etc. are the full "Liaison A→B" matches.
                // Parts at index 2, 6, 10 are the first letter, 3, 7, 11 are the second letter.
                if ((index - 1) % 4 === 0 && part.startsWith('Liaison')) {
                    const fromLine = parts[index + 1];
                    const toLine = parts[index + 2];
                    
                    const fromConfig = AUDIT_CATEGORIES.find(c => c.shortLabel === fromLine);
                    const toConfig = AUDIT_CATEGORIES.find(c => c.shortLabel === toLine);
                    
                    if (fromConfig && toConfig) {
                        return (
                             <span key={index} className="inline-flex items-center gap-1.5 align-middle">
                                Liaison&nbsp;
                                <CategoryIcon categoryConfig={fromConfig} size="sm" asDiv />
                                <span className="text-slate-600 dark:text-slate-300 font-normal">&rarr;</span>
                                <CategoryIcon categoryConfig={toConfig} size="sm" asDiv />
                            </span>
                        );
                    }
                }
                
                // Skip the captured letters which are already handled
                if ((index - 2) % 4 === 0 || (index - 3) % 4 === 0) {
                    return null;
                }

                // Render normal text parts
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </Component>
    );
};

export const LieuBadges: React.FC<{ lieu: Lieu; activeFilter?: AuditCategory | 'ALL' }> = ({ lieu, activeFilter = 'ALL' }) => {
    const categories = useMemo(() => {
        // This map will store the config and whether ALL modules for that category are future.
        const categoryStatus = new Map<string, { config: AuditCategoryConfig, allFuture: boolean }>();

        lieu.modules.forEach(module => {
            const config = getModuleLineConfig(module);
            if (config) {
                if (!categoryStatus.has(config.key)) {
                    // First time we see this category, assume all its modules are future until proven otherwise.
                    categoryStatus.set(config.key, { config, allFuture: true });
                }
                // If we find even one module that is not future, the whole category is not considered "allFuture".
                if (!module.isFuture) {
                    categoryStatus.get(config.key)!.allFuture = false;
                }
            }
        });

        const uniqueCategories = Array.from(categoryStatus.values());
        
        // Sort the categories
        uniqueCategories.sort((a, b) => {
            const keyA = a.config.key;
            const keyB = b.config.key;

            // If an active filter is set (not 'ALL'), prioritize it.
            if (activeFilter !== 'ALL') {
                if (keyA === activeFilter) return -1; // A is the active filter, so it comes first.
                if (keyB === activeFilter) return 1;  // B is the active filter, so it comes first.
            }
            
            // Otherwise, sort based on the order in AUDIT_CATEGORIES for consistency.
            const indexA = AUDIT_CATEGORIES.findIndex(cat => cat.key === keyA);
            const indexB = AUDIT_CATEGORIES.findIndex(cat => cat.key === keyB);
            return indexA - indexB;
        });
        
        return uniqueCategories;

    }, [lieu, activeFilter]);

    if (categories.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map(({ config, allFuture }) => (
                <CategoryIcon key={config.key} categoryConfig={config} size="sm" isFuture={allFuture} asDiv />
            ))}
        </div>
    );
};