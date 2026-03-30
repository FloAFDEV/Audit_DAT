
import { SignaletiqueData, EquipmentStatus, EquipmentStatusType, TotemStatus, BivStatus, PlanReseauStatus, PlanQuartierStatus, HapStatus, BandeauStationStatus } from '../types';

const createTotemStatus = (): TotemStatus => ({
    status: 'NotChecked' as const,
    comment: '',
    dimensions: '61,6 x 91,6 cm'
});

const createBandeauStationStatus = (): BandeauStationStatus => ({
    status: 'NotChecked' as const,
    comment: '',
    dimensions: '80x29 cm',
    directionContent: 'NotChecked' as const,
    stationNameContent: 'NotChecked' as const
});

const createInitialBivStatus = (count: number): BivStatus[] => {
    return Array.from({ length: count }, () => ({
        status: 'NotChecked' as const,
        comment: '',
        screenFunctioning: 'NotChecked' as const,
        whiteTextAdhesives: 'NotChecked' as const,
        ligneCaisson: 'NotChecked' as const,
        destinationCaisson: 'NotChecked' as const,
        attenteMinCaisson: 'NotChecked' as const,
        dureeApproxCaisson: 'NotChecked' as const,
        quaiCaisson: 'NotChecked' as const
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
        hap: 'NotChecked' as const
    }));
};

const createInitialHapStatus = (count: number): HapStatus[] => {
    return Array.from({ length: count }, () => ({
        status: 'NotChecked' as const,
        comment: '',
    }));
};

// Nombre de HAP (fiches horaires) par station et par direction.
// La majorité des stations ont 1 HAP par direction.
// Modifier ici pour les stations ayant 2 HAP dans une direction.
const HAP_COUNTS: Record<string, { meett: number; pdj: number }> = {
    // Exemples de surcharge (décommenter/adapter selon le terrain) :
    // 'Cartoucherie': { meett: 2, pdj: 2 },
    // 'Arènes': { meett: 1, pdj: 1 },
};

export const getInitialSignaletiqueData = (stationName: string): SignaletiqueData => {
    // Default counts
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

    const hapCountsMeett = HAP_COUNTS[stationName]?.meett ?? 1;
    const hapCountsPdj = HAP_COUNTS[stationName]?.pdj ?? 1;

    return {
        totem: {
            direction1: createTotemStatus(),
            direction2: createTotemStatus()
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
        },
        hap: {
            meett: createInitialHapStatus(hapCountsMeett),
            pdj: createInitialHapStatus(hapCountsPdj)
        },
        bandeauStation: {
            direction1: createBandeauStationStatus(),
            direction2: createBandeauStationStatus()
        }
    };
};
