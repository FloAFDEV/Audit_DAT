// utils/progressCalculators.ts

import { DAT, Direction, AdhesiveStatus, ECA, Lieu, AuditModule, AuditModuleType, ModeData, Pr, EcaData, PMRFloorAdhesiveData, FloorAdhesiveStatus, CognitivePictogramData, AuditCategory, PrZone } from '../types';
import { getEcaAdhesives, getPrAdhesives, getEquipmentAdhesives } from '../data/adhesives';
import { AUDIT_CATEGORIES } from '../data/config';

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
    // Un DAT retiré du parc de référence (archivedAt) ne compte plus dans la
    // progression — il n'est plus à auditer.
    const activeDats = direction.dats.filter(d => !d.archivedAt);
    const totalCount = activeDats.length;
    if (totalCount === 0) {
        return { completedCount: 0, totalCount: 0, percentage: 100, isComplete: true };
    }

    let totalCheckedAdhesives = 0;
    let totalAdhesives = 0;
    let completedDatCount = 0;

    for (const dat of activeDats) {
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


export const getPrZoneProgress = (zone: PrZone): number => {
    let totalAdhesives = 0;
    let checkedAdhesives = 0;

    for (const equipment of zone.equipments) {
        const adhesiveDefinitions = getEquipmentAdhesives(equipment.type, equipment.adhesiveIds);
        const activeAdhesives = adhesiveDefinitions.filter(ad => !ad.isDisabled);
        totalAdhesives += activeAdhesives.length;

        const checkedCount = Object.entries(equipment.adhesives)
            .filter(([id, status]) => 
                activeAdhesives.some(ad => ad.id === id) && status !== AdhesiveStatus.NotChecked
            ).length;
        checkedAdhesives += checkedCount;
    }

    if (totalAdhesives === 0) return 100;
    return (checkedAdhesives / totalAdhesives) * 100;
};

/**
 * NEW: Centralized helper to get raw progress counts for any module.
 * This ensures all progress calculations are consistent.
 */
const getModuleProgressCounts = (module: AuditModule): { applicable: number; checked: number; hasContent: boolean } => {
    if (module.isFuture) return { applicable: 0, checked: 0, hasContent: false };

    let totalApplicableItems = 0;
    let totalCheckedItems = 0;
    let hasAuditableContent = false;

    switch (module.type) {
        case AuditModuleType.DAT: {
            const stations = (module.data as ModeData).stations ?? [];
            if (stations.length > 0) hasAuditableContent = true;
            for (const station of stations) {
                const dats = (station.directions?.flatMap(d => d.dats ?? []) ?? []).filter(dat => !dat.archivedAt);
                for (const dat of dats) {
                    const statuses = Object.values(dat.adhesives);
                    totalApplicableItems += statuses.length;
                    totalCheckedItems += statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
                }
            }
            break;
        }
        case AuditModuleType.PR: {
            const zones = (module.data as Pr).zones ?? [];
            if (zones.length > 0) hasAuditableContent = true;
            for (const zone of zones) {
                for (const equipment of zone.equipments) {
                    const adhesiveDefinitions = getEquipmentAdhesives(equipment.type, equipment.adhesiveIds);
                    const activeAdhesives = adhesiveDefinitions.filter(ad => !ad.isDisabled);
                    totalApplicableItems += activeAdhesives.length;
                    
                    const checkedCount = Object.entries(equipment.adhesives)
                        .filter(([id, status]) => 
                            activeAdhesives.some(ad => ad.id === id) && status !== AdhesiveStatus.NotChecked
                        ).length;
                    totalCheckedItems += checkedCount;
                }
            }
            break;
        }
        case AuditModuleType.ECA: {
            const ecas = ((module.data as EcaData).ecas ?? []).filter(eca => !eca.archivedAt);
            if (ecas.length > 0) hasAuditableContent = true;
            for (const eca of ecas) {
                if (eca.isNotApplicable) continue;
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
            const data = module.data as PMRFloorAdhesiveData;
            if (data.isNotApplicable) {
                return { applicable: 0, checked: 0, hasContent: true };
            }
            const adhesives = data.adhesives ?? [];
            if (adhesives.length > 0) hasAuditableContent = true;
            totalApplicableItems += adhesives.length;
            totalCheckedItems += adhesives.filter(a => a.status !== FloorAdhesiveStatus.NotChecked).length;
            break;
        }
        case AuditModuleType.COGNITIVE_PICTOGRAMS: {
            const pictos = (module.data as CognitivePictogramData).pictograms ?? [];
            if (pictos.length > 0) hasAuditableContent = true;
            totalApplicableItems += pictos.length;
            totalCheckedItems += pictos.filter(p => p.status !== FloorAdhesiveStatus.NotChecked).length;
            break;
        }
        case AuditModuleType.SIGNALETIQUE: {
            const stations = (module.data as ModeData).stations ?? [];
            if (stations.length > 0) hasAuditableContent = true;
            const BIV_CAISSON_FIELDS = ['ligneCaisson', 'destinationCaisson', 'attenteMinCaisson', 'dureeApproxCaisson'];
            const MULTI_QUAI_STATIONS = ['Arènes', 'Odyssud'];
            for (const station of stations) {
                if (station.signaletique) {
                    const sig = station.signaletique;
                    const isMultiQuai = MULTI_QUAI_STATIONS.includes(station.name);

                    // totem — single objects per physical endpoint (direction1 / direction2)
                    (['direction1', 'direction2'] as const).forEach(dir => {
                        const item = sig.totem?.[dir];
                        if (item) {
                            totalApplicableItems++;
                            if (item.status !== 'NotChecked') totalCheckedItems++;
                        }
                    });

                    // bandeauStation — status + directionContent + stationNameContent per endpoint
                    (['direction1', 'direction2'] as const).forEach(dir => {
                        const item = (sig as any).bandeauStation?.[dir];
                        if (item) {
                            totalApplicableItems += 3;
                            if (item.status !== 'NotChecked') totalCheckedItems++;
                            if (item.directionContent !== undefined && item.directionContent !== 'NotChecked') totalCheckedItems++;
                            if (item.stationNameContent !== undefined && item.stationNameContent !== 'NotChecked') totalCheckedItems++;
                        }
                    });

                    // biv, planReseau, planQuartier, hap — arrays per meett / pdj direction
                    const dirs = ['meett', 'pdj'] as const;
                    const arrayCategories = ['biv', 'planReseau', 'planQuartier', 'hap'] as const;
                    for (const cat of arrayCategories) {
                        for (const dir of dirs) {
                            const items: any[] = (sig[cat] as any)?.[dir] ?? [];
                            for (const item of items) {
                                totalApplicableItems++;
                                if (item.status !== 'NotChecked') totalCheckedItems++;
                                if (cat === 'planQuartier') {
                                    totalApplicableItems++;
                                    if (item.bannerDirection !== undefined && item.bannerDirection !== 'NotChecked') totalCheckedItems++;
                                }
                                if (cat === 'biv') {
                                    for (const field of BIV_CAISSON_FIELDS) {
                                        totalApplicableItems++;
                                        if (item[field] !== undefined && item[field] !== 'NotChecked') totalCheckedItems++;
                                    }
                                    if (isMultiQuai) {
                                        totalApplicableItems++;
                                        if (item.quaiCaisson !== undefined && item.quaiCaisson !== 'NotChecked') totalCheckedItems++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            break;
        }
    }
    return { applicable: totalApplicableItems, checked: totalCheckedItems, hasContent: hasAuditableContent };
};

/**
 * REFACTORED: Now uses the centralized getModuleProgressCounts.
 */
export function getModuleProgress(module: AuditModule) {
    if (module.isFuture) {
        return { percentage: 0, label: 'Bientôt disponible', statusText: 'Bientôt disponible', statusColor: 'text-gray-500 dark:text-slate-400', isComplete: false };
    }

    const { applicable, checked, hasContent } = getModuleProgressCounts(module);

    let percentage = 0;
    if (applicable > 0) {
        percentage = (checked / applicable) * 100;
    } else if (hasContent) {
        percentage = 100;
    }
    
    const isComplete = Math.round(percentage) === 100;
    
    let label: string;
    let statusText: string;
    let statusColor: string;

    if (isComplete) {
        label = 'Terminé';
        statusText = 'Audit terminé';
        statusColor = 'text-teal-600 dark:text-teal-400';
    } else if (percentage > 0) {
        label = 'Progression';
        statusText = 'Audit en cours';
        statusColor = 'text-amber-600 dark:text-amber-400';
    } else {
        label = 'Progression';
        statusText = 'En attente de contrôle';
        statusColor = 'text-gray-500 dark:text-slate-400';
    }
    
    return { percentage, label, statusText, statusColor, isComplete };
}

/**
 * REFACTORED: Now uses the centralized getModuleProgressCounts.
 */
export const getLieuProgress = (lieu: Lieu, activeFilters: AuditModuleType[] = []): number => {
    if (!lieu?.modules) return 0;

    const modulesToConsider = activeFilters.length > 0
        ? lieu.modules.filter(m => activeFilters.includes(m.type))
        : lieu.modules;

    let totalApplicableItems = 0;
    let totalCheckedItems = 0;
    let hasAnyNonFutureModule = false;
    let hasAnyContent = false;

    for (const module of modulesToConsider) {
        if (module.isFuture) continue;
        hasAnyNonFutureModule = true;

        const counts = getModuleProgressCounts(module);
        totalApplicableItems += counts.applicable;
        totalCheckedItems += counts.checked;
        if(counts.hasContent) hasAnyContent = true;
    }

    if (totalApplicableItems === 0) {
        return hasAnyContent || hasAnyNonFutureModule ? 100 : 0;
    }

    return (totalCheckedItems / totalApplicableItems) * 100;
};

/**
 * REFACTORED: Now uses the centralized getModuleProgressCounts.
 */
export const getCategoryProgress = (
    allLieux: Lieu[],
    category: AuditCategory | 'ALL',
    activeFilters: AuditModuleType[]
): number => {
    const categoryConfig = category === 'ALL' ? null : AUDIT_CATEGORIES.find(c => c.key === category);
    
    const relevantLieux = (category === 'ALL' || !categoryConfig)
        ? allLieux
        : allLieux.filter(lieu => lieu.modules.some(module => categoryConfig.predicate(module)));

    let totalApplicableItems = 0;
    let totalCheckedItems = 0;
    let hasAnyItems = false;

    for (const lieu of relevantLieux) {
        const modulesToProcess = activeFilters.length > 0
            ? lieu.modules.filter(m => activeFilters.includes(m.type))
            : lieu.modules.filter(m => category === 'ALL' || !categoryConfig ? true : categoryConfig.predicate(m));

        for (const module of modulesToProcess) {
            if (module.isFuture) continue;
            
            const counts = getModuleProgressCounts(module);
            totalApplicableItems += counts.applicable;
            totalCheckedItems += counts.checked;
            if (counts.hasContent) {
                hasAnyItems = true;
            }
        }
    }
    
    if (totalApplicableItems === 0) {
        return hasAnyItems ? 100 : 0;
    }

    return (totalCheckedItems / totalApplicableItems) * 100;
};