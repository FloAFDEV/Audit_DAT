
import { SignaletiqueData, EquipmentStatus, EquipmentStatusType, TotemStatus, BivStatus, PlanReseauStatus, PlanQuartierStatus } from '../types';

const createInitialTotemStatus = (count: number): TotemStatus[] => {
    return Array.from({ length: count }, () => ({
        status: 'NotChecked' as const,
        comment: '',
        dimensions: '61,6 x 91,6 cm'
    }));
};

const createInitialBivStatus = (count: number): BivStatus[] => {
    return Array.from({ length: count }, () => ({
        status: 'NotChecked' as const,
        comment: '',
        screenFunctioning: 'NotChecked' as const,
        whiteTextAdhesives: 'NotChecked' as const
    }));
};

const createInitialPlanReseauStatus = (count: number): PlanReseauStatus[] => {
    return Array.from({ length: count }, () => ({
        status: 'NotChecked' as const,
        comment: '',
        dimensions: '80 x 100 cm',
        bannerStationName: 'NotChecked' as const,
        hap: 'NotChecked' as const
    }));
};

const createInitialPlanQuartierStatus = (count: number): PlanQuartierStatus[] => {
    return Array.from({ length: count }, () => ({
        status: 'NotChecked' as const,
        comment: '',
        dimensions: '80 x 100 cm',
        bannerDirection: 'NotChecked' as const,
        relayInfo: 'NotChecked' as const,
        terminusCase: 'NotChecked' as const,
        hap: 'NotChecked' as const
    }));
};

export const getInitialSignaletiqueData = (stationName: string): SignaletiqueData => {
    // Default counts
    let totemMeett = 2;
    let totemPdj = 2;
    let bivMeett = 1;
    let bivPdj = 1;
    let planReseauMeett = 1;
    let planReseauPdj = 1;
    let planQuartierMeett = 1;
    let planQuartierPdj = 1;

    // Specific cases
    if (stationName === 'MEETT') {
        planReseauMeett = 3;
        planQuartierMeett = 3;
    }

    return {
        totem: {
            meett: createInitialTotemStatus(totemMeett),
            pdj: createInitialTotemStatus(totemPdj)
        },
        biv: {
            meett: createInitialBivStatus(bivMeett),
            pdj: createInitialBivStatus(bivPdj)
        },
        planReseau: {
            meett: createInitialPlanReseauStatus(planReseauMeett),
            pdj: createInitialPlanReseauStatus(planReseauPdj)
        },
        planQuartier: {
            meett: createInitialPlanQuartierStatus(planQuartierMeett),
            pdj: createInitialPlanQuartierStatus(planQuartierPdj)
        }
    };
};
