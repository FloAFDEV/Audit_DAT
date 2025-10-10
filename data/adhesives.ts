import { Adhesive, PrAdhesive, EcaEquipmentType, EquipmentType } from '../types';

// =================================================================
// SECTION DONNÉES DE BASE (ADHÉSIFS)
// =================================================================

export const ADHESIVES: Adhesive[] = [
  { id: 'ad1', name: 'Repère 1 - Adhésif « Achat et rechargement »', description: 'Dimensions: 95x5,8cm | Localisation: En haut de la niche bleue, en butée basse avant le renfoncement.', referentiel: '' },
  { id: 'ad2', name: 'Repère 2 - Adhésif « bouton-audio »', description: 'Dimensions: 2,5x2,5cm | Localisation: Au dessus du bouton d’action lié, centré sur celui-ci.', referentiel: '' },
  { id: 'ad3', name: 'Repère 3 - Adhésif « Rechargement + paiement CB »', description: 'Dimensions: 25,3x22cm | Localisation: Au dessus de la platine Carte Bancaire, en butée avec celle-ci.', referentiel: '' },
  { id: 'ad4', name: 'Repère 4 - Adhésif « paiement monnaie »', description: 'Dimensions: 21,5x22cm | Localisation: Au dessus de la platine insert monnaie, en butée avec celle-ci.', referentiel: '' },
  { id: 'ad5', name: 'Repère 5 - Adhésif « paiement sans-contact »', description: 'Dimensions: 12,2x10cm | Localisation: A droite du lecteur sans contact, la flèche de l’adhésif doit pointer vers le lecteur.', referentiel: '' },
  { id: 'ad6', name: 'Repère 6 - Adhésif « tickets-reçus rendu-monnaie »', description: 'Dimensions: 20,5x16cm | Localisation: Au dessus de la trappe rendu monnaie, en butée avec celle-ci et centrée par rapport à celle-ci.', referentiel: '' },
  { id: 'ad7', name: 'Repère 7 - Adhésif « carte pastel »', description: 'Dimensions: 4,9x4,9cm | Localisation: Sur le lecteur carte Pastel.', referentiel: '' },
  { id: 'ad8', name: 'Repère 8 - Fiche « Tarif »', description: 'Dimensions: 36x15cm | Localisation: Dans le support dédié (Voir focus page 7).', referentiel: '' },
  { id: 'ad9', name: 'Repère 9 - « Numéro » du DAT', description: 'Localisation: Dans l’angle gauche de la partie grise au dessus du bandeau « Achat + rechargement » (Voir focus page 8).', referentiel: '' },
  { id: 'ad10', name: 'Repère 10 - Adhésif « Validation avec carte bancaire » + QR_Code', description: 'Dimensions: 24x52cm | Localisation: A droite et au dessus de l’appel d’urgence (focus en page 9).', referentiel: '' },
  { id: 'ad11', name: 'Repère 11 - Adhésif « Appel d’urgence. Tous abus sera puni »', description: 'Dimensions: 214x306mm | Localisation: A droite, entoure le bouton d’appel d’urgence (focus en page 9).', referentiel: '' },
  { id: 'ad12', name: 'Repère 12 - Adhésif « Appel d’urgence + braille»', description: 'Dimensions: 3,7x5,4cm | Localisation: Immédiatement au dessus du bouton « Appel d’urgence » (focus en page 9).', referentiel: '' }
];

export const PR_ADHESIVES_BE: PrAdhesive[] = [
    { id: 'adbe1', name: 'Repère 1 - "cible" Information P+R', description: 'Adhésif « P+r-rustine-entree_2025-02-05 » // 11x12,5cm', location: 'A gauche de l’écran principal, sur la partie haute de la borne (uniquement sur entrée)', referentiel: '//serveur/docs/PNR/BE/ref-adbe1.pdf' },
    { id: 'adbe2', name: 'Repère 2 - Information Ticket', description: 'Adhésif « P+r-rustine-ticket-P+r_2025-02-12 » // 9x5cm', location: 'Au dessus du distributeur de ticket parking, centré sur celui-ci', referentiel: '//serveur/docs/PNR/BE/ref-adbe2.pdf' },
    { id: 'adbe3', name: 'Repère 3 - Tarifs', description: 'Adhésif « Tarifs » sur borne d’entrée // 10x20cm', location: 'A droite de la borne, entre l’écran principal et le distributeur de ticket parking', referentiel: '//serveur/docs/PNR/BE/ref-adbe3.pdf' },
    { id: 'adbe10', name: 'Repère 10 - Information latérale', description: 'Adhésif « Sticker-borne-P+R-entree-A3_ » // 32,8x45,1cm', location: 'Sur le latéral de la borne en entrée de P+R orienté vers l’usager', referentiel: '//serveur/docs/PNR/BE/ref-adbe10.pdf' }
];
export const PR_ADHESIVES_BS: PrAdhesive[] = [
    { id: 'adbs4', name: 'Repère 4 - "cible" Information sortie', description: 'Adhésif « P+r-rustine-sortie-cible_2025-02-05 » // 11x12,5cm', location: 'A gauche de l’écran principal, sur la partie haute de la borne (uniquement sur sortie)', referentiel: '//serveur/docs/PNR/BS/ref-adbs4.pdf' },
    { id: 'adbs5', name: 'Repère 5 - Ticket rechargeable', description: 'Adhésif « adhesif-ticket-rechargeable-p+r-borne-sortie_80x120mm_2025-02-07 » // 10,9x14,9cm', location: 'A gauche de la borne, entre l’écran principal et le distributeur de ticket parking', referentiel: '//serveur/docs/PNR/BS/ref-adbs5.pdf' },
    { id: 'adbs11', name: 'Repère 11 - Information latérale', description: 'Adhésif « Sticker-borne-P+R-sortie_A3_ »// 32,8x45,1cm', location: 'Sur le latéral de la borne en sorite de P+R orienté vers l’usager', referentiel: '//serveur/docs/PNR/BS/ref-adbs11.pdf' }
];
export const PR_ADHESIVES_CA: PrAdhesive[] = [
    { id: 'adca6', name: 'Repère 6 - Information caisse', description: 'Adhésif « caisse-P+r-gauche-rustine _ 2025-02-05 » // 10,5x12,9cm', location: 'Sous l’écran de la caisse auto', referentiel: '//serveur/docs/PNR/CA/ref-adca6.pdf' },
    { id: 'adca7', name: 'Repère 7 - Récupération ticket', description: 'Adhésif « caisse-P+r-gauche-rustine-ticket-P+r_ 2025-02-14 » // 8,2x5,5cm', location: 'En bas à droite au niveau du distributeur de ticket suite à un paiement via caisse auto', referentiel: '//serveur/docs/PNR/CA/ref-adca7.pdf' },
    { id: 'adca8', name: 'Repère 8 - Ticket rechargeable', description: 'Fiche « adhesif-ticket-rechargeable-p+r-caisse_120x80mm_2025-02-07 » // 14,9x10,9cm', location: 'En bas a gauche à l’opposé du n°7', referentiel: '//serveur/docs/PNR/CA/ref-adca8.pdf' },
    { id: 'adca9', name: 'Repère 9 - Tarifs P+R', description: 'Fiche « P+R_tarifs_caisse_auto_2023_v2 » // 10,5x21cm', location: 'Sur la partie droite de la caisse auto, orientée vers l’usager', referentiel: '//serveur/docs/PNR/CA/ref-adca9.pdf' },
    { id: 'adca12', name: 'Plan de quartier', description: 'Fiche plan de quartier au format 78x120cm', location: 'Sur la vitre latérale de la caisse auto, côté extérieur, visible par les usagers', referentiel: '' },
    { id: 'adca13', name: 'Dos gris verso', description: 'Dos gris au format 78x120cm', location: 'Placé au verso de la fiche "Plan de quartier"', referentiel: '' }
];

export const ECA_ADHESIVES_STD: Adhesive[] = [
    { id: 'eca-std-1', name: 'Item 1', description: 'Description pour item 1', referentiel: '' },
    { id: 'eca-std-2', name: 'Item 2', description: 'Description pour item 2', referentiel: '' },
    { id: 'eca-std-3', name: 'Item 3', description: 'Description pour item 3', referentiel: '' },
    { id: 'eca-std-4', name: 'Item 4', description: 'Description pour item 4', referentiel: '' },
];
export const ECA_ADHESIVES_PMR: Adhesive[] = [
    ...ECA_ADHESIVES_STD,
    { id: 'eca-pmr-5', name: 'Item 5 (PMR)', description: 'Description pour item 5 spécifique PMR', referentiel: '' },
    { id: 'eca-pmr-6', name: 'Item 6 (PMR)', description: 'Description pour item 6 spécifique PMR', referentiel: '' },
];


// =================================================================
// SECTION HELPER FUNCTIONS
// =================================================================

export const getPrAdhesives = (type: EquipmentType): PrAdhesive[] => {
    switch (type) {
        case EquipmentType.BE: return PR_ADHESIVES_BE;
        case EquipmentType.BS: return PR_ADHESIVES_BS;
        case EquipmentType.CA: return PR_ADHESIVES_CA;
        default: return [];
    }
};

export const getEcaAdhesives = (type: EcaEquipmentType): Adhesive[] => {
    switch (type) {
        case EcaEquipmentType.PMR:
        case EcaEquipmentType.PMRVantaux:
        case EcaEquipmentType.PMRVantauxReversible:
            return ECA_ADHESIVES_PMR;
        default:
            return ECA_ADHESIVES_STD;
    }
};