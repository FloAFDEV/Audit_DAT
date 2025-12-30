
import { Adhesive, PrAdhesive, EcaEquipmentType, EquipmentType } from '../types';

// =================================================================
// ADHÉSIFS DAT (Distributeur Automatique de Titres)
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

// =================================================================
// ADHÉSIFS P+R (Parcs Relais)
// =================================================================

export const PR_ADHESIVES_BE: PrAdhesive[] = [
    { id: 'adbe1', name: 'Repère 1 - "cible" Information P+R', description: 'Adhésif « P+r-rustine-entree_2025-02-05 » // 11x12,5cm', location: 'A gauche de l’écran principal, sur la partie haute de la borne (uniquement sur entrée)', referentiel: '//serveur/docs/PNR/BE/ref-adbe1.pdf' },
    { id: 'adbe2', name: 'Repère 2 - Information Ticket', description: 'Adhésif « P+r-rustine-ticket-P+r_2025-02-12 » // 9x5cm', location: 'Au dessus du distributeur de ticket parking, centré sur celui-ci', referentiel: '//serveur/docs/PNR/BE/ref-adbe2.pdf' },
    { id: 'adbe3', name: 'Repère 3 - Tarifs', description: 'Adhésif « Tarifs » sur borne d’entrée // 10x20cm', location: 'A droite de la borne, entre l’écran principal et le distributeur de ticket parking', referentiel: '//serveur/docs/PNR/BE/ref-adbe3.pdf' },
    { id: 'adbe10', name: 'Repère 10 - Information latérale', description: 'Adhésif « Sticker-borne-P+R-entree-A3_ » // 32,8x45,1cm', location: 'Sur le latéral de la borne en entrée de P+R orienté vers l’usager', referentiel: '//serveur/docs/PNR/BE/ref-adbe10.pdf' }
];
export const PR_ADHESIVES_BS: PrAdhesive[] = [
    { id: 'adbs4', name: 'Repère 4 - "cible" Information sortie', description: 'Adhésif « P+r-rustine-sortie-cible_2025-02-05 » // 11x12,5cm', location: 'A gauche de l’écran principal, sur la partie haute de la borne (uniquement sur sortie)', referentiel: '//serveur/docs/PNR/BS/ref-adbs4.pdf' },
    { id: 'adbs5', name: 'Repère 5 - Ticket rechargeable', description: 'Adhésif « adhesif-ticket-rechargeable-p+r-borne-sortie_80x120mm_2025-02-07 » // 10,9x14,9cm', location: 'A gauche de la borne, entre l’écran principal et le distributeur de ticket parking', referentiel: '//serveur/docs/PNR/BS/ref-adbs5.pdf', isDisabled: true },
    { id: 'adbs11', name: 'Repère 11 - Information latérale', description: 'Adhésif « Sticker-borne-P+R-sortie_A3_ »// 32,8x45,1cm', location: 'Sur le latéral de la borne en sorite de P+R orienté vers l’usager', referentiel: '//serveur/docs/PNR/BS/ref-adbs11.pdf' }
];
export const PR_ADHESIVES_CA: PrAdhesive[] = [
    { id: 'adca6', name: 'Repère 6 - Information caisse', description: 'Adhésif « caisse-P+r-gauche-rustine _ 2025-02-05 » // 10,5x12,9cm', location: 'Sous l’écran de la caisse auto', referentiel: '//serveur/docs/PNR/CA/ref-adca6.pdf' },
    { id: 'adca7', name: 'Repère 7 - Récupération ticket', description: 'Adhésif « caisse-P+r-gauche-rustine-ticket-P+r_ 2025-02-14 » // 8,2x5,5cm', location: 'En bas à droite au niveau du distributeur de ticket suite à un paiement via caisse auto', referentiel: '//serveur/docs/PNR/CA/ref-adca7.pdf' },
    { id: 'adca8', name: 'Repère 8 - Ticket rechargeable', description: 'Fiche « adhesif-ticket-rechargeable-p+r-caisse_120x80mm_2025-02-07 » // 14,9x10,9cm', location: 'En bas a gauche à l’opposé du n°7', referentiel: '//serveur/docs/PNR/CA/ref-adca8.pdf', isDisabled: true },
    { id: 'adca9', name: 'Repère 9 - Tarifs P+R', description: 'Fiche « P+R_tarifs_caisse_auto_2023_v2 » // 10x20cm', location: 'Sur la partie droite de la caisse auto, orientée vers l’usager', referentiel: '//serveur/docs/PNR/CA/ref-adca9.pdf' },
    { id: 'adca12', name: 'Plan de quartier', description: 'Fiche plan de quartier au format 78x120cm', location: 'Sur la vitre latérale de la caisse auto, côté extérieur, visible par les usagers', referentiel: '' },
    { id: 'adca13', name: 'Dos gris verso', description: 'Dos gris au format 78x120cm', location: 'Placé au verso de la fiche "Plan de quartier"', referentiel: '' }
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

const ECA_IDENTIFIANT_ADHESIVE: Adhesive = { 
    id: 'eca-11', 
    name: 'Repère 11 - Adhésif identifiant (N° ECA)', 
    description: 'Adhésif identifiant unique de l\'équipement | Sur le capot supérieur ou latéral, visible par le personnel.', 
    referentiel: '' 
};

const ECA_ADHESIVES_ENTREE: Adhesive[] = [
    { id: 'eca-1', name: 'Repère 1 - Adhesif valideur-billetique-metro-cible', description: '59x59mm | Sur le support de validation. A la pose laisser la diode visible pour diagnostic.', referentiel: '' },
    { id: 'eca-2', name: 'Repère 2 - Adhesif gris valideur-billetique-metro-pastel', description: '164x170mm | Autour du support de validation, format carré.', referentiel: '' },
    { id: 'eca-3', name: 'Repère 3 - Adhesif valideur-openpayment-metro', description: '183x183mm | Sous la vitre en tête haute de l\'ECA, vitrophanie.', referentiel: '' },
    ECA_IDENTIFIANT_ADHESIVE,
];

const ECA_ADHESIVES_SORTIE: Adhesive[] = [
    ECA_IDENTIFIANT_ADHESIVE,
];

const ECA_ADHESIVES_REVERSIBLE: Adhesive[] = [
    ...ECA_ADHESIVES_ENTREE,
    { id: 'eca-r-1', name: 'Repère R1 - Signalisation dynamique', description: 'Flèche verte / Croix rouge lumineuse | Sur les deux faces du vantail', referentiel: 'REF-ECA-REVERSIBLE-01' },
];

const ECA_ADHESIVES_PMR_PICTOGRAMS: Adhesive[] = [
    { id: 'eca-8', name: 'Repère 8 - Adhesif valideurPMR-metro-Bagages', description: '19x19cm | Format carré bleu sur le bras de l\'ECA (spécifique PMR à bras).', referentiel: '', groupId: 'pmr-pictogram', groupName: 'Pictogrammes de service' },
    { id: 'eca-9', name: 'Repère 9 - Adhesif valideurPMR-metro-Poussette', description: '19x19cm | Format carré bleu sur le bras de l\'ECA (spécifique PMR).', referentiel: '', groupId: 'pmr-pictogram', groupName: 'Pictogrammes de service' },
    { id: 'eca-10', name: 'Repère 10 - Adhesif valideurPMR-metro-UFR', description: '19x19cm | Format carré bleu sur le bras de l\'ECA (spécifique PMR).', referentiel: '', groupId: 'pmr-pictogram', groupName: 'Pictogrammes de service' },
];

const ECA_ADHESIVES_PMR_BRAS: Adhesive[] = [
    ...ECA_ADHESIVES_ENTREE,
    { id: 'eca-4', name: 'Repère 4 - Adhésif valideur-PMR-a-bras', description: '170x195mm | Sur platine jaune, autour du support de validation (spécifique PMR à bras).', referentiel: '' },
    { id: 'eca-6', name: 'Repère 6 - Adhésif valideur-portillon-PMR-bras', description: '8x8cm | Format carré bleu sur le bras de l\'ECA (spécifique PMR à bras).', referentiel: '' },
    ...ECA_ADHESIVES_PMR_PICTOGRAMS,
];

const ECA_ADHESIVES_PMR_VANTAUX: Adhesive[] = [
    ...ECA_ADHESIVES_ENTREE,
    { id: 'eca-5', name: 'Repère 5 - Adhésif valideur-PMRVantaux', description: '195x185mm | Sur platine jaune, autour du support de validation (spécifique PMR à vantaux).', referentiel: '' },
    { id: 'eca-7', name: 'Repère 7 - Adhésif valideur-portillon-PMR-vantaux', description: '8x8cm | Format carré bleu sur le bras de l\'ECA (spécifique PMR à vantaux).', referentiel: '' },
    // PMR à vantaux does not have the "Bagages" pictogram
    ...ECA_ADHESIVES_PMR_PICTOGRAMS.filter(p => p.id !== 'eca-8'),
];

export const getEcaAdhesives = (type: EcaEquipmentType): Adhesive[] => {
    switch (type) {
        case EcaEquipmentType.PMRBras:
            return ECA_ADHESIVES_PMR_BRAS;
        case EcaEquipmentType.PMRVantaux:
            return ECA_ADHESIVES_PMR_VANTAUX;
        case EcaEquipmentType.TripodeEntree:
        case EcaEquipmentType.VantauxEntree:
            return ECA_ADHESIVES_ENTREE;
        case EcaEquipmentType.TripodeSortie:
        case EcaEquipmentType.VantauxSortie:
            return ECA_ADHESIVES_SORTIE;
        case EcaEquipmentType.VantauxReversible:
            return ECA_ADHESIVES_REVERSIBLE;
        default:
            return [ECA_IDENTIFIANT_ADHESIVE];
    }
};
