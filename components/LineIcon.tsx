import React from 'react';
import { AuditModule, AuditModuleType } from '../types';
import { getModuleLineConfig } from '../data/builder';
import { ParkingCircle, SplitSquareHorizontal, Footprints, ScanEye, Layout } from 'lucide-react';

interface LineIconProps {
  module: AuditModule;
  size?: 'sm' | 'md';
}

export const LineIcon: React.FC<LineIconProps> = ({ module, size = 'md' }) => {
    const category = getModuleLineConfig(module);

    if (category) {
        const isLongLabel = category.shortLabel.length >= 3;

        // For long labels, use padding instead of a fixed width to avoid text overflow.
        // For short labels, maintain the square aspect ratio.
        const sizeClasses = size === 'md' 
            ? (isLongLabel ? 'h-10 px-3 text-lg' : 'w-10 h-10 text-lg')
            : (isLongLabel ? 'h-8 px-2 text-base' : 'w-8 h-8 text-base');

        const radius = size === 'md' ? 'rounded-[10px]' : 'rounded-[8px]';

        return (
            <div 
                className={`flex-shrink-0 flex items-center justify-center ${radius} font-bold shadow-sm ring-1 ring-black/5 ${sizeClasses} ${category.colors.badgeText}`}
                style={{ backgroundColor: category.colors.badgeBg }}
            >
                {category.shortLabel}
            </div>
        );
    }
    
    // Fallback for modules that might not fit a category
    const radius = size === 'md' ? 'rounded-[10px]' : 'rounded-[8px]';
    switch (module.type) {
        case AuditModuleType.PR:
            return <div className={`flex-shrink-0 p-2 bg-green-100 ${radius} flex items-center justify-center ${size === 'md' ? 'w-10 h-10' : 'w-8 h-8'}`}><ParkingCircle className={`${size === 'md' ? 'w-6 h-6' : 'w-5 h-5'} text-green-600`} /></div>;
        case AuditModuleType.PMR_FLOOR_ADHESIVE:
             return <div className={`flex-shrink-0 p-2 bg-cyan-100 ${radius} flex items-center justify-center ${size === 'md' ? 'w-10 h-10' : 'w-8 h-8'}`}><Footprints className={`${size === 'md' ? 'w-6 h-6' : 'w-5 h-5'} text-cyan-600`} /></div>;
        case AuditModuleType.COGNITIVE_PICTOGRAMS:
             return <div className={`flex-shrink-0 p-2 bg-purple-100 dark:bg-purple-900/40 ${radius} flex items-center justify-center ${size === 'md' ? 'w-10 h-10' : 'w-8 h-8'}`}><ScanEye className={`${size === 'md' ? 'w-6 h-6' : 'w-5 h-5'} text-purple-600 dark:text-purple-300`} /></div>;
        case AuditModuleType.ECA:
             return <div className={`flex-shrink-0 p-2 bg-amber-100 dark:bg-amber-900/40 ${radius} flex items-center justify-center ${size === 'md' ? 'w-10 h-10' : 'w-8 h-8'}`}><SplitSquareHorizontal className={`${size === 'md' ? 'w-6 h-6' : 'w-5 h-5'} text-amber-600 dark:text-amber-300`} /></div>;
        case AuditModuleType.SIGNALETIQUE:
             return <div className={`flex-shrink-0 p-2 bg-indigo-100 dark:bg-indigo-900/40 ${radius} flex items-center justify-center ${size === 'md' ? 'w-10 h-10' : 'w-8 h-8'}`}><Layout className={`${size === 'md' ? 'w-6 h-6' : 'w-5 h-5'} text-indigo-600 dark:text-indigo-300`} /></div>;
        default:
            return null;
    }
};