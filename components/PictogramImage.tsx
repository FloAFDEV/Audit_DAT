import React from 'react';
import { ScanEye } from 'lucide-react';

export const PictogramImage: React.FC = () => (
    <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center p-3 shadow-md">
        <ScanEye className="w-8 h-8 text-purple-600 dark:text-purple-300" strokeWidth={1.5} />
    </div>
);
