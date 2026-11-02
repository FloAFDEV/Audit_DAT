import { Lieu, SignageReference } from '../types';
import { buildPatrimoineIndex } from './cockpit/patrimoineIndex';
import { buildSignaletiqueStationIndex } from './cockpit/signaletiqueStationIndex';
import { currentExploitationLieux, floorFamilyDefects, generateMaintenanceSummary } from './maintenanceGenerator';

/**
 * Anomalies OPÉRATIONNELLES d'un lieu — exactement celles du cockpit pour
 * ce lieu et le même périmètre (exploitation actuelle), famille par
 * famille, chacune depuis sa source unique :
 *  - Signalétique IV (DAT, P+R, ECA, plans de quartier) : moteur d'index
 *    (portée des références, R10) — absents + à remplacer ;
 *  - équipements de station : leur index (absents, à remplacer, HS) ;
 *  - PMR au sol et pictogrammes cognitifs : maintenance du périmètre
 *    d'exploitation (« sans objet » et pictogrammes non comptés exclus).
 * Les données de préparation (modules futurs) n'y sont jamais ajoutées.
 * Utilisé par les cartes lieu (badge et mise en évidence).
 */
export const getLieuDefectCount = (lieu: Lieu, references: SignageReference[]): number => {
    const catalogue = buildPatrimoineIndex([lieu], references).totals.defectCount;
    const stationEquipment = buildSignaletiqueStationIndex([lieu]).totals.defectCount;
    const { pmrFloor, cognitive } = floorFamilyDefects(generateMaintenanceSummary(currentExploitationLieux([lieu])));
    return catalogue + stationEquipment + pmrFloor.length + cognitive.length;
};
