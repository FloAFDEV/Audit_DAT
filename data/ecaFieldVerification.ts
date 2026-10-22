// data/ecaFieldVerification.ts
// =================================================================
// Valideurs (hors PMR) dont la définition source a changé entre la version
// d'octobre 2025 (ec3733c) et la version actuelle (ca650ce, 26fa57a du
// 30/12/2025), sans relevé terrain confirmant le changement. Liste de
// contrôle uniquement : elle ne modifie aucune donnée.
//   - 'type'      : le sens a changé (entrée ↔ sortie) ;
//   - 'categorie' : même sens, catégorie changée (tripode ↔ vantaux) ;
//   - 'presence'  : équipement ajouté (october2025 null) ou retiré (current null).
// EMP, RAN, PHA et UPS, confirmés terrain, sont rétablis dans eca_data.ts.
// =================================================================
import { EcaEquipmentType } from '../types';

export type EcaFieldVerificationKind = 'type' | 'categorie' | 'presence';

export interface EcaFieldVerificationItem {
    stationCode: string;
    accessPoint: string;
    number: number;
    october2025: EcaEquipmentType | null;
    current: EcaEquipmentType | null;
    kind: EcaFieldVerificationKind;
}

export const ECA_FIELD_VERIFICATION: EcaFieldVerificationItem[] = [
    { stationCode: 'ARG', accessPoint: 'Accès Principal', number: 2, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'ARG', accessPoint: 'Accès Principal', number: 7, october2025: EcaEquipmentType.TripodeSortie, current: EcaEquipmentType.TripodeEntree, kind: 'type' },
    { stationCode: 'BEL', accessPoint: 'Accès Principal', number: 4, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'BPA', accessPoint: 'Accès Principal', number: 6, october2025: EcaEquipmentType.TripodeEntree, current: null, kind: 'presence' },
    { stationCode: 'CAR', accessPoint: 'Accès Principal', number: 5, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'CCA', accessPoint: 'Accès Principal', number: 3, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'CCA', accessPoint: 'Accès Principal', number: 4, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'FLE', accessPoint: 'Accès Principal', number: 1, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'FLE', accessPoint: 'Accès Principal', number: 2, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'FLE', accessPoint: 'Accès Principal', number: 4, october2025: EcaEquipmentType.TripodeSortie, current: EcaEquipmentType.TripodeEntree, kind: 'type' },
    { stationCode: 'FLE', accessPoint: 'Accès Principal', number: 5, october2025: EcaEquipmentType.TripodeSortie, current: EcaEquipmentType.TripodeEntree, kind: 'type' },
    { stationCode: 'JAR', accessPoint: 'Accès Principal', number: 2, october2025: EcaEquipmentType.TripodeSortie, current: EcaEquipmentType.VantauxSortie, kind: 'categorie' },
    { stationCode: 'JAR', accessPoint: 'Accès Principal', number: 3, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JAR', accessPoint: 'Accès Principal', number: 4, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JAR', accessPoint: 'Accès Principal', number: 5, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JAR', accessPoint: 'Accès Principal', number: 6, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JAR', accessPoint: 'Accès Principal', number: 7, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JAR', accessPoint: 'Accès Principal', number: 8, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JAR', accessPoint: 'Accès Principal', number: 9, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JJB', accessPoint: 'Accès Jaurès B', number: 2, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JJB', accessPoint: 'Accès Jaurès B', number: 3, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JJB', accessPoint: 'Accès Jaurès B', number: 4, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JJB', accessPoint: 'Accès Jaurès B', number: 5, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'JJB', accessPoint: 'Accès Jaurès B', number: 6, october2025: EcaEquipmentType.TripodeSortie, current: EcaEquipmentType.VantauxEntree, kind: 'type' },
    { stationCode: 'JJB', accessPoint: 'Accès Jaurès A', number: 8, october2025: null, current: EcaEquipmentType.VantauxEntree, kind: 'presence' },
    { stationCode: 'JJB', accessPoint: 'Accès Jaurès A', number: 9, october2025: null, current: EcaEquipmentType.VantauxEntree, kind: 'presence' },
    { stationCode: 'JJB', accessPoint: 'Accès Jaurès A', number: 10, october2025: null, current: EcaEquipmentType.VantauxEntree, kind: 'presence' },
    { stationCode: 'JJB', accessPoint: 'Accès Jaurès A', number: 11, october2025: null, current: EcaEquipmentType.VantauxEntree, kind: 'presence' },
    { stationCode: 'MAR', accessPoint: 'Accès Principal', number: 2, october2025: EcaEquipmentType.TripodeSortie, current: EcaEquipmentType.VantauxSortie, kind: 'categorie' },
    { stationCode: 'MAR', accessPoint: 'Accès Principal', number: 3, october2025: EcaEquipmentType.TripodeSortie, current: EcaEquipmentType.VantauxSortie, kind: 'categorie' },
    { stationCode: 'MAR', accessPoint: 'Accès Principal', number: 4, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'MAR', accessPoint: 'Accès Principal', number: 5, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'MAR', accessPoint: 'Accès Principal', number: 6, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'MAR', accessPoint: 'Accès Principal', number: 7, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'MAR', accessPoint: 'Accès Principal', number: 8, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.VantauxEntree, kind: 'categorie' },
    { stationCode: 'MER', accessPoint: 'Accès Principal', number: 1, october2025: EcaEquipmentType.TripodeSortie, current: EcaEquipmentType.TripodeEntree, kind: 'type' },
    { stationCode: 'MER', accessPoint: 'Accès Principal', number: 3, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'MIN', accessPoint: 'Accès Principal', number: 4, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'PDJ', accessPoint: 'Accès Principal', number: 5, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'RAM', accessPoint: 'Accès Bus', number: 9, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'SAG', accessPoint: 'Accès Principal', number: 4, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
    { stationCode: 'SAO', accessPoint: 'Accès Principal', number: 3, october2025: EcaEquipmentType.TripodeSortie, current: EcaEquipmentType.TripodeEntree, kind: 'type' },
    { stationCode: 'SMI', accessPoint: 'Accès Principal', number: 4, october2025: EcaEquipmentType.TripodeEntree, current: EcaEquipmentType.TripodeSortie, kind: 'type' },
];
