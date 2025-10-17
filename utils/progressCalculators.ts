import { DAT, Direction, AdhesiveStatus, ECA, Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, FloorAdhesiveStatus, CognitivePictogramData } from '../types';
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


export const getLieuProgress = (lieu: Lieu, activeFilters: AuditModuleType[] = []): number => {
    if (!lieu?.modules) return 0;

    let totalApplicableItems = 0;
    let totalCheckedItems = 0;

    const modulesToConsider = activeFilters.length > 0
        ? lieu.modules.filter(m => activeFilters.includes(m.type))
        : lieu.modules;

    for (const module of modulesToConsider) {
        if (module.isFuture) continue;

        switch (module.type) {
            case AuditModuleType.DAT: {
                const modeData = module.data as ModeData;
                const dats = modeData.stations?.flatMap(s => s.directions?.flatMap(d => d.dats ?? []) ?? []) ?? [];
                for (const dat of dats) {
                    const statuses = Object.values(dat.adhesives);
                    totalApplicableItems += statuses.length;
                    totalCheckedItems += statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
                }
                break;
            }
            case AuditModuleType.PR: {
                const prData = module.data as Pr;
                const equipments = prData.equipments ?? [];
                for (const equipment of equipments) {
                    const statuses = Object.values(equipment.adhesives);
                    totalApplicableItems += statuses.length;
                    totalCheckedItems += statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
                }
                break;
            }
            case AuditModuleType.ECA: {
                const ecaData = module.data as EcaData;
                const ecas = ecaData.ecas ?? [];
                for (const eca of ecas) {
                    if (eca.isNotApplicable) {
                        continue;
                    }
                    const adhesiveDefinitions = getEcaAdhesives(eca.type);
                    for (const adDef of adhesiveDefinitions) {
                        const status = eca.adhesives[adDef.id];
                        if (status !== AdhesiveStatus.NotApplicable) {
                            totalApplicableItems++;
                            if (status && status !== AdhesiveStatus.NotChecked) {
                                totalCheckedItems++;
                            }
                        }
                    }
                }
                break;
            }
            case AuditModuleType.PMR_FLOOR_ADHESIVE: {
                const pmrData = module.data as PMRFloorAdhesiveData;
                const adhesives = pmrData.adhesives ?? [];
                totalApplicableItems += adhesives.length;
                totalCheckedItems += adhesives.filter(a => a.status !== FloorAdhesiveStatus.NotChecked).length;
                break;
            }
            case AuditModuleType.COGNITIVE_PICTOGRAMS: {
                const cogData = module.data as CognitivePictogramData;
                const pictos = cogData.pictograms ?? [];
                totalApplicableItems += pictos.length;
                totalCheckedItems += pictos.filter(p => p.status !== FloorAdhesiveStatus.NotChecked).length;
                break;
            }
        }
    }

    if (totalApplicableItems === 0) {
        const hasAnyNonFutureModule = modulesToConsider.some(m => !m.isFuture);
        return hasAnyNonFutureModule ? 100 : 0;
    }

    return (totalCheckedItems / totalApplicableItems) * 100;
};