import { DAT, Direction, AdhesiveStatus } from '../types';

export enum ProgressStatus {
    NotStarted = 'NotStarted',
    InProgress = 'InProgress',
    Completed = 'Completed',
}

export interface DatProgress {
    status: ProgressStatus;
    label: string;
    percentage: number;
    checked: number;
    total: number;
    isComplete: boolean;
}

export const getDatProgress = (dat: DAT): DatProgress => {
    const statuses = Object.values(dat.adhesives);
    const total = statuses.length;
    const checked = statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
    const percentage = total > 0 ? (checked / total) * 100 : 0;
    const isComplete = total > 0 && checked === total;

    let status: ProgressStatus;
    let label: string;

    if (checked === 0) {
        status = ProgressStatus.NotStarted;
        label = "Non commencé";
    } else if (isComplete) {
        status = ProgressStatus.Completed;
        label = "Terminé";
    } else {
        status = ProgressStatus.InProgress;
        label = "En cours";
    }

    return { status, label, percentage, checked, total, isComplete };
};


export interface DirectionProgress {
    completedCount: number;
    totalCount: number;
    percentage: number;
    isComplete: boolean;
}

export const getDirectionProgress = (direction: Direction): DirectionProgress => {
    const totalCount = direction.dats.length;
    if (totalCount === 0) {
        return { completedCount: 0, totalCount: 0, percentage: 100, isComplete: true };
    }

    const completedCount = direction.dats.filter(dat => getDatProgress(dat).isComplete).length;
    const percentage = (completedCount / totalCount) * 100;
    const isComplete = completedCount === totalCount;

    return { completedCount, totalCount, percentage, isComplete };
};
