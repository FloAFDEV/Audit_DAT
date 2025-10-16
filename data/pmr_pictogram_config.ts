// data/pmr_pictogram_config.ts

// This configuration maps a station code to the presence of specific PMR pictograms.
// true = present and should be audited.
// false = not present and should be pre-set to 'Non applicable'.
export const PMR_PICTOGRAM_CONFIG: Record<string, { poussette: boolean; ufr: boolean; bagages: boolean; }> = {
    // Ligne A
    'BGR': { poussette: true,  ufr: true,  bagages: false },
    'ARG': { poussette: true,  ufr: true,  bagages: false },
    'ROS': { poussette: true,  ufr: true,  bagages: false },
    'JOL': { poussette: true,  ufr: true,  bagages: false },
    'MAR': { poussette: true,  ufr: false, bagages: true  },
    'JJA': { poussette: true,  ufr: false, bagages: true  },
    'CAP': { poussette: true,  ufr: true,  bagages: false },
    'SCY': { poussette: true,  ufr: true,  bagages: false },
    'POI': { poussette: false, ufr: true,  bagages: true  },
    'ARE': { poussette: true,  ufr: true,  bagages: false },
    'FLE': { poussette: true,  ufr: true,  bagages: false },
    'MER': { poussette: false, ufr: true,  bagages: true  },
    'BAG': { poussette: false, ufr: true,  bagages: true  },
    'MUN': { poussette: true,  ufr: true,  bagages: false },
    'REY': { poussette: true,  ufr: true,  bagages: false },
    'BEL': { poussette: true,  ufr: true,  bagages: false },
    'MBC': { poussette: true,  ufr: true,  bagages: false },
    // Ligne B
    'BOR': { poussette: true,  ufr: true,  bagages: false },
    'TCO': { poussette: true,  ufr: true,  bagages: false },
    'LVA': { poussette: true,  ufr: true,  bagages: false },
    'BPA': { poussette: true,  ufr: false, bagages: true  },
    'MIN': { poussette: true,  ufr: true,  bagages: false },
    'CAN': { poussette: true,  ufr: true,  bagages: false },
    'CCA': { poussette: true,  ufr: true,  bagages: false },
    'JJB': { poussette: true,  ufr: true,  bagages: false },
    'FVE': { poussette: true,  ufr: true,  bagages: false },
    'CAR': { poussette: true,  ufr: true,  bagages: false },
    'PDJ': { poussette: true,  ufr: true,  bagages: false },
    'SMI': { poussette: true,  ufr: true,  bagages: false },
    'EMP': { poussette: true,  ufr: true,  bagages: false },
    'SAG': { poussette: true,  ufr: true,  bagages: false },
    'SAO': { poussette: true,  ufr: true,  bagages: false },
    'RAN': { poussette: true,  ufr: true,  bagages: false },
    'PHA': { poussette: true,  ufr: true,  bagages: false },
    'UPS': { poussette: true,  ufr: true,  bagages: false },
    'RAM': { poussette: true,  ufr: true,  bagages: false },
};
