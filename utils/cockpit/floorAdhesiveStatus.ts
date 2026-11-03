// utils/cockpit/floorAdhesiveStatus.ts
// Lecture défensive d'un statut d'audit PMR au sol / pictogramme cognitif.
// Une valeur absente ou inconnue (donnée ancienne, import partiel) reste
// « indisponible » : elle n'est jamais convertie en « Non contrôlé ».
import { FloorAdhesiveStatus } from '../../types';

const KNOWN: ReadonlySet<string> = new Set(Object.values(FloorAdhesiveStatus));

export const readFloorAdhesiveStatus = (value: unknown): FloorAdhesiveStatus | undefined =>
    typeof value === 'string' && KNOWN.has(value) ? (value as FloorAdhesiveStatus) : undefined;

export const FLOOR_ADHESIVE_STATUS_LABELS: Record<FloorAdhesiveStatus, string> = {
    [FloorAdhesiveStatus.NotChecked]: 'Non contrôlé',
    [FloorAdhesiveStatus.OK]: 'OK',
    [FloorAdhesiveStatus.ToBeReplaced]: 'À remplacer',
    [FloorAdhesiveStatus.Absent]: 'Absent',
    [FloorAdhesiveStatus.ToPlan]: 'À planifier (ancien statut)',
};

export const STATUS_UNAVAILABLE_LABEL = 'Statut indisponible';
