import React from 'react';
import { AuditModule, AuditModuleType } from '../types';
import { getModuleLineConfig } from '../data/builder';
import { ParkingCircle, SplitSquareHorizontal, Footprints, ScanEye, Layout } from 'lucide-react';

interface LineIconProps {
  module: AuditModule;
  /** lg : badge principal du header d'audit (44 px mobile, 52 px à partir de sm:). */
  size?: 'sm' | 'md' | 'lg';
}

export const LineIcon: React.FC<LineIconProps> = ({ module, size = 'md' }) => {
    const category = getModuleLineConfig(module);

    if (category && category.shortLabel) {
        const isLongLabel = (category.shortLabel?.length || 0) >= 3;

        // For long labels, use padding instead of a fixed width to avoid text overflow.
        // For short labels, maintain the square aspect ratio.
        const sizeClasses = size === 'lg'
            ? (isLongLabel ? 'h-11 sm:h-[52px] px-3 text-xl sm:text-2xl' : 'w-11 h-11 sm:w-[52px] sm:h-[52px] text-2xl')
            : size === 'md'
            ? (isLongLabel ? 'h-10 px-3 text-lg' : 'w-10 h-10 text-lg')
            : (isLongLabel ? 'h-8 px-2 text-base' : 'w-8 h-8 text-base');

        const radius = size === 'lg' ? 'rounded-xl' : size === 'md' ? 'rounded-[10px]' : 'rounded-[8px]';

        return (
            <div
                className={`line-badge flex-shrink-0 flex items-center justify-center ${radius} font-bold shadow-[0_1px_3px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-black/10 ${sizeClasses} ${category.colors.badgeText}`}
                style={{ backgroundColor: category.colors.badgeBg }}
            >
                {category.shortLabel}
            </div>
        );
    }
    
    // Fallback for modules that might not fit a category
    const radius = size === 'lg' ? 'rounded-xl' : size === 'md' ? 'rounded-[10px]' : 'rounded-[8px]';
    const box = size === 'lg' ? 'w-11 h-11 sm:w-[52px] sm:h-[52px]' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
    const icon = size === 'lg' ? 'w-6 h-6 sm:w-7 sm:h-7' : size === 'md' ? 'w-6 h-6' : 'w-5 h-5';
    switch (module.type) {
        case AuditModuleType.PR:
            return <div className={`flex-shrink-0 p-2 bg-green-100 ${radius} flex items-center justify-center ${box}`}><ParkingCircle className={`${icon} text-green-600`} /></div>;
        case AuditModuleType.PMR_FLOOR_ADHESIVE:
             return <div className={`flex-shrink-0 p-2 bg-cyan-100 ${radius} flex items-center justify-center ${box}`}><Footprints className={`${icon} text-cyan-600`} /></div>;
        case AuditModuleType.COGNITIVE_PICTOGRAMS:
             return <div className={`flex-shrink-0 p-2 bg-purple-100 dark:bg-purple-900/40 ${radius} flex items-center justify-center ${box}`}><ScanEye className={`${icon} text-purple-600 dark:text-purple-300`} /></div>;
        case AuditModuleType.ECA:
             return <div className={`flex-shrink-0 p-2 bg-amber-100 dark:bg-amber-900/40 ${radius} flex items-center justify-center ${box}`}><SplitSquareHorizontal className={`${icon} text-amber-600 dark:text-amber-300`} /></div>;
        case AuditModuleType.SIGNALETIQUE:
             return <div className={`flex-shrink-0 p-2 bg-indigo-100 dark:bg-indigo-900/40 ${radius} flex items-center justify-center ${box}`}><Layout className={`${icon} text-indigo-600 dark:text-indigo-300`} /></div>;
        default:
            return null;
    }
};