import { Adhesive, PrAdhesive, EcaEquipmentType, EquipmentType } from '../types';

// =================================================================
// ADHÉSIFS DAT (Distributeur Automatique de Titres)
// =================================================================

export const ADHESIVES: Adhesive[] = [
    { id: 'dat-1', name: 'Repère 1 - Consignes générales', description: 'Dimensions: 100x150mm | Localisation: Façade', referentiel: 'REF-DAT-01' },
    { id: 'dat-2', name: 'Repère 2 - Moyens de paiement', description: 'Dimensions: 100x100mm | Localisation: Près du TPE', referentiel: 'REF-DAT-02' },
    { id: 'dat-3', name: 'Repère 3 - Rendu monnaie', description: 'Dimensions: 80x50mm | Localisation: Trappe monnaie', referentiel: 'REF-DAT-03' },
    { id: 'dat-4', name: 'Repère 4 - Fente tickets', description: 'Dimensions: 80x50mm | Localisation: Fente ticket', referentiel: 'REF-DAT-04' },
    { id: 'dat-5', name: 'Repère 5 - Assistance', description: 'Dimensions: 120x80mm | Localisation: Façade, en bas', referentiel: 'REF-DAT-05' },
    { id: 'dat-6', name: 'Repère 6 - Sans contact', description: 'Dimensions: 50x50mm | Localisation: Zone sans contact', referentiel: 'REF-DAT-06' },
    { id: 'dat-7', name: 'Repère 7 - Récupération reçu', description: 'Dimensions: 80x50mm | Localisation: Fente reçu', referentiel: 'REF-DAT-07' },
];

// =================================================================
// ADHÉSIFS P+R (Parcs Relais)
// =================================================================

export const PR_ADHESIVES_BE: PrAdhesive[] = [
    { id: 'pr-be-1', name: 'Repère 1 - Instructions Entrée', description: 'Utilisez votre carte Pastel', location: 'Façade avant', referentiel: 'REF-PR-BE-01' },
    { id: 'pr-be-2', name: 'Repère 2 - Logo P+R', description: 'Logo Tisséo P+R // 150x150mm', location: 'Haut de la borne', referentiel: 'REF-PR-BE-02' },
];

export const PR_ADHESIVES_BS: PrAdhesive[] = [
    { id: 'pr-bs-1', name: 'Repère 1 - Instructions Sortie', description: 'Présentez votre titre de transport validé', location: 'Façade avant', referentiel: 'REF-PR-BS-01' },
    { id: 'pr-bs-2', name: 'Repère 2 - Merci de votre visite', description: 'Message de courtoisie', location: 'Barrière de sortie', referentiel: 'REF-PR-BS-02' },
];

export const PR_ADHESIVES_CA: PrAdhesive[] = [
    { id: 'pr-ca-1', name: 'Repère 1 - Tarifs P+R', description: 'Grille tarifaire', location: 'A côté de l\'écran', referentiel: 'REF-PR-CA-01' },
    { id: 'pr-ca-2', name: 'Repère 2 - Paiement CB', description: 'Logo CB // 50x50mm', location: 'Sur le TPE', referentiel: 'REF-PR-CA-02' },
    { id: 'pr-ca-3', name: 'Repère 3 - Assistance', description: 'Numéro d\'appel', location: 'Sous l\'écran', referentiel: 'REF-PR-CA-03' },
];

export const getPrAdhesives = (type: EquipmentType): PrAdhesive[] => {
    switch (type) {
        case EquipmentType.BE: return PR_ADHESIVES_BE;
        case EquipmentType.BS: return PR_ADHESIVES_BS;
        case EquipmentType.CA: return PR_ADHESIVES_CA;
        default: return [];
    }
};

// =================================================================
// ADHÉSIFS ECA (Équipement de Contrôle d'Accès)
// =================================================================

export const ECA_ADHESIVES_STD: Adhesive[] = [
    { id: 'eca-1', name: 'Repère 1 - Sens de passage', description: 'Flèche directionnelle', referentiel: 'REF-ECA-STD-01' },
    { id: 'eca-2', name: 'Repère 2 - Zone de validation', description: 'Validez ici', referentiel: 'REF-ECA-STD-02' },
];

export const ECA_ADHESIVES_PMR: Adhesive[] = [
    { id: 'eca-3', name: 'Repère 3 - Entrée', description: 'Flèche verte sur fond blanc|Sur le vantail', referentiel: 'REF-ECA-PMR-03' },
    { id: 'eca-4', name: 'Repère 4 - Sortie', description: 'Sens interdit sur fond blanc|Sur le vantail', referentiel: 'REF-ECA-PMR-04' },
    { id: 'eca-5', name: 'Repère 5 - Validation Pastel', description: 'Zone de validation carte|Sur le totem', referentiel: 'REF-ECA-PMR-05' },
    { id: 'eca-6', name: 'Repère 6 - Validation Ticket', description: 'Fente ticket|Sur le totem', referentiel: 'REF-ECA-PMR-06' },
    { id: 'eca-7', name: 'Repère 7 - Pictogramme PMR', description: '100x100mm|Sur le vantail', referentiel: 'REF-ECA-PMR-07', groupId: 'pmr-pictogram', groupName: 'Pictogramme PMR' },
    { id: 'eca-8', name: 'Repère 8 - Pictogramme Bagages', description: '100x100mm|Sur le vantail', referentiel: 'REF-ECA-PMR-08', groupId: 'pmr-pictogram', groupName: 'Pictogramme PMR' },
    { id: 'eca-9', name: 'Repère 9 - Pictogramme Poussette', description: '100x100mm|Sur le vantail', referentiel: 'REF-ECA-PMR-09', groupId: 'pmr-pictogram', groupName: 'Pictogramme PMR' },
    { id: 'eca-10', name: 'Repère 10 - Pictogramme UFR', description: '100x100mm|Sur le vantail', referentiel: 'REF-ECA-PMR-10', groupId: 'pmr-pictogram', groupName: 'Pictogramme PMR' },
];

export const getEcaAdhesives = (type: EcaEquipmentType): Adhesive[] => {
    switch (type) {
        case EcaEquipmentType.PMRBras:
        case EcaEquipmentType.PMRVantaux:
            return ECA_ADHESIVES_PMR;
        case EcaEquipmentType.TripodeEntree:
        case EcaEquipmentType.TripodeSortie:
        case EcaEquipmentType.VantauxEntree:
        case EcaEquipmentType.VantauxSortie:
        case EcaEquipmentType.VantauxReversible:
            return ECA_ADHESIVES_STD;
        default:
            return [];
    }
};