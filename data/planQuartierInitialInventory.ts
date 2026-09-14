// data/planQuartierInitialInventory.ts
// =================================================================
// Premier jeu de données connu pour l'audit Plans de quartier (+ PEM 3D),
// PAS un inventaire exhaustif (cf. types.ts::PlanQuartierData). Chaque
// entrée décrit un GROUPE d'exemplaires identiques à seeder sur UNE
// station/ligne — jamais une modification du référentiel (les modelId
// utilisés référencent les 4 modèles figés de data/signage_seed.ts).
//
// Nombre et emplacement de chaque exemplaire sont donnés (premier
// recensement) — seul leur état (OK / Absent / À remplacer) reste à
// contrôler sur le terrain, exactement comme pour les autres audits
// visuels. Jean-Jaurès (pôle A/B) et Arènes (pôle A/T1) sont rattachés
// à la Ligne A ci-dessous ; les codes "2026", "2026b", "N2026" ne sont
// pas interprétés (millésime ou lot d'impression inconnu) : conservés
// tels quels dans `comment`, jamais traduits en une donnée devinée.
// =================================================================
import { AdhesiveStatus } from '../types';

export interface PlanQuartierInitialEntry {
    /** Doit correspondre exactement à Station.name (data/stationRegistry.ts). */
    stationName: string;
    line: 'A' | 'B' | 'C' | 'TRAM' | 'TELEO' | 'AEROPORT';
    modelId: string;
    quantity: number;
    comment?: string;
    location?: string;
    measuredDimensions?: { width: number; height: number; unit: 'cm' | 'mm' };
}

export const PLAN_QUARTIER_INITIAL_INVENTORY: PlanQuartierInitialEntry[] = [
    // --- Plans de quartier plastifiés ---
    // NB : les plans posés sur les caisses automatiques de P+R (Arènes,
    // Argoulets, Balma-Gramont, Basso Cambo, Borderouge, Ramonville,
    // Oncopole) ne figurent PAS dans cette liste, mais ils appartiennent
    // bien au patrimoine Plans de quartier : ils sont dérivés de la
    // structure P+R elle-même (un exemplaire par équipement de type CA),
    // par store.ts::migratePrCaisseAutoPlansDeQuartier. Les lister ici en
    // dur les dupliquerait, et figerait une quantité qui doit suivre le
    // parc réel de caisses automatiques.
    { stationName: 'Marengo-SNCF', line: 'A', modelId: 'pdq-78x100', quantity: 1, location: 'Édicule (extérieur)', comment: 'Réf. terrain : 2026b' },
    { stationName: 'Marengo-SNCF', line: 'A', modelId: 'pdq-adhesif', quantity: 1, location: 'Intérieur station', comment: 'Réf. terrain : 78x120 2026b' },
    { stationName: 'Saint-Cyprien - République', line: 'A', modelId: 'pdq-78x100', quantity: 3, location: 'Édicule (extérieur)', comment: 'Réf. terrain : 2026' },
    { stationName: 'Saint-Cyprien - République', line: 'A', modelId: 'pdq-78x120', quantity: 1, comment: 'Réf. terrain : 2026' },
    // 78x120 partout, jamais 78x119 (mesure terrain erronée, corrigée).
    { stationName: 'Empalot', line: 'B', modelId: 'pdq-78x120', quantity: 1, comment: 'Réf. terrain : 2026b' },
    { stationName: 'François Verdier', line: 'B', modelId: 'pdq-78x120', quantity: 1, comment: 'Réf. terrain : 2026' },
    { stationName: 'François Verdier', line: 'B', modelId: 'pdq-78x100', quantity: 1, location: 'Édicule (extérieur)', comment: 'Réf. terrain : 2026' },
    { stationName: 'Jean-Jaurès', line: 'A', modelId: 'pdq-78x100', quantity: 2, location: 'Édicule (extérieur)', comment: 'Réf. terrain : N2026' },
    { stationName: 'Jean-Jaurès', line: 'A', modelId: 'pdq-78x120', quantity: 3, location: 'Mezzanine', comment: 'Réf. terrain : N2026' },
    { stationName: 'Jeanne d\'Arc', line: 'B', modelId: 'pdq-78x100', quantity: 3, location: 'Édicule (extérieur)', comment: 'Réf. terrain : 2026' },
    { stationName: 'Jeanne d\'Arc', line: 'B', modelId: 'pdq-78x120', quantity: 1, comment: 'Réf. terrain : 2026' },
    { stationName: 'Faculté de Pharmacie', line: 'B', modelId: 'pdq-78x120', quantity: 1, location: 'Intérieur station', comment: 'Réf. terrain : 2026' },
    // Université Paul Sabatier : pôle Métro B / Téléo, deux Station.name
    // distincts pour le même lieu physique (lieuName commun) — la ligne B
    // orthographie "Paul Sabatier", le Téléo "Paul-Sabatier" (registre).
    // Les deux 78x100 sont sur les édicules des deux sorties, distinguées par
    // la sortie qu'elles desservent (et non par un numéro d'exemplaire).
    { stationName: 'Université Paul Sabatier', line: 'B', modelId: 'pdq-78x100', quantity: 1, location: 'Édicule — sortie côté Fac' },
    { stationName: 'Université Paul Sabatier', line: 'B', modelId: 'pdq-78x100', quantity: 1, location: 'Édicule — sortie côté gare bus' },
    // Deux 78x120 en station : l'emplacement précis du second reste à
    // confirmer au terrain — jamais recopié de celui du premier.
    { stationName: 'Université Paul Sabatier', line: 'B', modelId: 'pdq-78x120', quantity: 1, location: 'Intérieur station' },
    { stationName: 'Université Paul Sabatier', line: 'B', modelId: 'pdq-78x120', quantity: 1 },
    { stationName: 'Université Paul-Sabatier', line: 'TELEO', modelId: 'pdq-78x120', quantity: 1 },
    { stationName: 'Ramonville', line: 'B', modelId: 'pdq-78x100', quantity: 1, location: 'Entrée bus' },
    { stationName: 'Ramonville', line: 'B', modelId: 'pdq-78x100', quantity: 1, location: 'Entrée square' },
    // Silos des P+R : un exemplaire sous cadre aluminium au rez-de-chaussée
    // de chaque silo (le 78x120 plastifié EST le modèle encadré).
    { stationName: 'Argoulets', line: 'A', modelId: 'pdq-78x120', quantity: 1, location: 'Silo P+R — RDC, cadre aluminium' },
    { stationName: 'Balma-Gramont', line: 'A', modelId: 'pdq-78x120', quantity: 1, location: 'Silo P+R — RDC, cadre aluminium' },

    // --- Adhésifs PDQ ---
    { stationName: 'Jean-Jaurès', line: 'A', modelId: 'pdq-adhesif', quantity: 1, location: 'Agence commerciale', comment: 'Réf. terrain : N2026' },

    // --- PEM 3D (120×80, Dibond) ---
    { stationName: 'Jean-Jaurès', line: 'A', modelId: 'pem3d-120x80', quantity: 1, comment: 'JEAN_JAURES_120X80_V05_tisseo_v3_16-06-2026_imp' },
    { stationName: 'Ramonville', line: 'B', modelId: 'pem3d-120x80', quantity: 1, comment: 'RAMONVILLE_120X80_V05_tisseo_v4_01-09-2026_imp' },
    { stationName: 'Borderouge', line: 'B', modelId: 'pem3d-120x80', quantity: 1 },
    { stationName: 'Argoulets', line: 'A', modelId: 'pem3d-120x80', quantity: 1 },
    { stationName: 'Basso Cambo', line: 'A', modelId: 'pem3d-120x80', quantity: 1 },
    // Arènes : trois PEM 3D réels, géo-orientés différemment — distingués
    // par leur implantation connue, jamais par un numéro d'exemplaire.
    { stationName: 'Arènes', line: 'A', modelId: 'pem3d-120x80', quantity: 1, comment: 'Proche agence / ascenseur' },
    { stationName: 'Arènes', line: 'A', modelId: 'pem3d-120x80', quantity: 1, comment: 'Côté gare bus' },
    { stationName: 'Arènes', line: 'A', modelId: 'pem3d-120x80', quantity: 1, comment: 'Côté amphithéâtre / Tram' },
    { stationName: 'Université Paul Sabatier', line: 'B', modelId: 'pem3d-120x80', quantity: 1 },

    // --- PDQ 78x120 en agence commerciale (hors Marengo/Jean-Jaurès, déjà
    // listés ci-dessus avec leur station d'origine) ---
    // En agence, le support (plastifié ou adhésif) dépend de la commande
    // passée pour cette agence — les deux existent, mais l'adhésif est le
    // plus fréquent. Faute de confirmation terrain agence par agence, ces
    // exemplaires sont seedés sur le modèle adhésif (le plus probable), à
    // corriger vers pdq-78x120 (plastifié) si le contrôle terrain montre
    // le contraire pour l'une d'elles.
    // Aéroport Toulouse Blagnac : la station LAE n'est pas encore en
    // service (train à venir), mais l'agence commerciale, elle, est
    // toujours ouverte au public et équipée d'un plan de quartier 78x120.
    { stationName: 'Arènes', line: 'A', modelId: 'pdq-adhesif', quantity: 1, location: 'Agence commerciale', comment: 'Support à confirmer sur le terrain (plastifié ou adhésif selon la commande).' },
    // Dibond sur grillage : troisième 78x120 d'Arènes, distinct de celui de
    // l'agence (adhésif) et de celui de la caisse auto — même format, support
    // différent parce que l'implantation est en extérieur exposé.
    { stationName: 'Arènes', line: 'A', modelId: 'pdq-78x120-dibond', quantity: 1, location: 'P+R 2 (Arènes Est – Parking isolé) — sur grillage' },
    { stationName: 'Basso Cambo', line: 'A', modelId: 'pdq-adhesif', quantity: 1, location: 'Agence commerciale', comment: 'Support à confirmer sur le terrain (plastifié ou adhésif selon la commande).' },
    { stationName: 'Aéroport Toulouse Blagnac', line: 'AEROPORT', modelId: 'pdq-adhesif', quantity: 1, location: 'Agence commerciale', comment: 'Support à confirmer sur le terrain (plastifié ou adhésif selon la commande).' },
];

/** DEFAULT_STATUS : les exemplaires seedés depuis cet inventaire initial
 *  n'ont pas encore de constat réel (premier recensement transcrit, pas
 *  encore un audit terrain) — statut Non contrôlé, jamais un OK inventé. */
export const PLAN_QUARTIER_INITIAL_STATUS = AdhesiveStatus.NotChecked;
