import { DAT, Direction, AdhesiveStatus, ECA } from '../types';
import { getEcaAdhesives } from '../data/adhesives';

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
        label = "Progression";
    } else if (isComplete) {
        status = ProgressStatus.Completed;
        label = "Terminé";
    } else {
        status = ProgressStatus.InProgress;
        label = "Progression";
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

    let totalCheckedAdhesives = 0;
    let totalAdhesives = 0;
    let completedDatCount = 0;

    for (const dat of direction.dats) {
        const datProgress = getDatProgress(dat);
        totalCheckedAdhesives += datProgress.checked;
        totalAdhesives += datProgress.total;
        if (datProgress.isComplete) {
            completedDatCount++;
        }
    }

    const percentage = totalAdhesives > 0 ? (totalCheckedAdhesives / totalAdhesives) * 100 : 0;
    const isComplete = completedDatCount === totalCount;

    return { completedCount: completedDatCount, totalCount, percentage, isComplete };
};

export interface EcaProgress {
    percentage: number;
    label: string;
    isComplete: boolean;
}

export const getEcaProgress = (eca: ECA): EcaProgress => {
    if (eca.isNotApplicable) {
        return { percentage: 100, label: 'N/A (sans adhésifs)', isComplete: true };
    }

    const adhesiveDefinitions = getEcaAdhesives(eca.type);
    
    if (adhesiveDefinitions.length === 0) {
        return { percentage: 100, label: 'Terminé', isComplete: true };
    }

    let applicableAdhesivesCount = 0;
    let checkedAdhesivesCount = 0;

    for (const ad of adhesiveDefinitions) {
        const status = eca.adhesives[ad.id] || AdhesiveStatus.NotChecked;
        if (status !== AdhesiveStatus.NotApplicable) {
            applicableAdhesivesCount++;
            if (status !== AdhesiveStatus.NotChecked) {
                checkedAdhesivesCount++;
            }
        }
    }

    if (applicableAdhesivesCount === 0) {
        return { percentage: 100, label: 'Terminé (N/A)', isComplete: true };
    }

    const percentage = (checkedAdhesivesCount / applicableAdhesivesCount) * 100;
    const isComplete = checkedAdhesivesCount === applicableAdhesivesCount;
    
    let label = 'Progression';
    if (isComplete) {
        label = 'Terminé';
    }

    return { percentage, label, isComplete };
};