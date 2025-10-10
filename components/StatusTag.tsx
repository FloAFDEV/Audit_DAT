import React from 'react';
import { AdhesiveStatus } from '../types';

interface StatusTagProps {
    status: AdhesiveStatus;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
    const statusStyles = {
        [AdhesiveStatus.OK]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [AdhesiveStatus.Absent]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [AdhesiveStatus.ToBeReplaced]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        [AdhesiveStatus.NotChecked]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    };

    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
            {status}
        </span>
    );
};