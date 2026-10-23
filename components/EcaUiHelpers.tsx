
import React from 'react';
import { LogIn, LogOut, ArrowLeftRight } from 'lucide-react';
import { ECA, EcaEquipmentType } from '../types';
import { isPmrEcaType } from '../data/eca_data';

/**
 * Formats an EcaEquipmentType string to highlight 'entrée' or 'sortie' with bold text.
 * @param type The EcaEquipmentType string.
 * @returns A ReactNode with highlighted keywords.
 */
export const formatEcaTypeForDisplay = (type: EcaEquipmentType): React.ReactNode => {
    const keywordsToHighlight = ["entrée", "sortie", "réversible"];
    // Create a regex that captures keywords words with word boundaries.
    const regex = new RegExp(`\\b(${keywordsToHighlight.join('|')})\\b`, 'gi');

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    type.replace(regex, (match, p1, offset) => {
        // Add the text segment before the current match
        if (offset > lastIndex) {
            parts.push(<React.Fragment key={`text-${lastIndex}`}>{type.substring(lastIndex, offset)}</React.Fragment>);
        }
        // Add the highlighted part, applying specific color classes for contrast
        parts.push(<strong key={`highlight-${offset}`} className="font-semibold text-gray-800 dark:text-slate-200">{match}</strong>);
        lastIndex = offset + match.length;
        return match; // Return the match to keep `replace` method working as expected
    });

    // Add any remaining text after the last match
    if (lastIndex < type.length) {
        parts.push(<React.Fragment key={`text-${lastIndex}`}>{type.substring(lastIndex)}</React.Fragment>);
    }

    return <>{parts}</>;
};

/**
 * Provides a plain text label for an EcaEquipmentType, primarily for dropdowns.
 * @param type The EcaEquipmentType enum value.
 * @returns A user-friendly string label.
 */
export const getEcaTypeLabel = (type: EcaEquipmentType): string => {
    switch (type) {
        case EcaEquipmentType.TripodeEntree: return "Tripode d'entrée";
        case EcaEquipmentType.TripodeSortie: return "Tripode de sortie";
        case EcaEquipmentType.VantauxEntree: return "Vantaux d'entrée";
        case EcaEquipmentType.VantauxSortie: return "Vantaux de sortie";
        case EcaEquipmentType.VantauxReversible: return "Vantaux réversible";
        case EcaEquipmentType.PMRBras: return "PMR à bras";
        case EcaEquipmentType.PMRVantaux: return "PMR à vantaux";
        case EcaEquipmentType.PMRVantauxReversible: return "PMR à vantaux réversible";
        default: return type;
    }
};

/**
 * Sens de passage d'un ECA, déduit UNIQUEMENT de son type technique.
 * PMR à bras / PMR à vantaux : le type ne dit pas le sens → null (aucune
 * information inventée).
 */
export type EcaDirection = 'in' | 'out' | 'both';

/** Ordre d'affichage dans un accès : PMR (hors sens), puis entrées, sorties, double sens. */
export const ECA_DIRECTION_ORDER: EcaDirection[] = ['in', 'out', 'both'];

export const getEcaDirection = (type: EcaEquipmentType): EcaDirection | null => {
    switch (type) {
        case EcaEquipmentType.TripodeEntree:
        case EcaEquipmentType.VantauxEntree: return 'in';
        case EcaEquipmentType.TripodeSortie:
        case EcaEquipmentType.VantauxSortie: return 'out';
        case EcaEquipmentType.VantauxReversible:
        case EcaEquipmentType.PMRVantauxReversible: return 'both';
        default: return null;
    }
};

const ECA_DIRECTION_LABEL: Record<EcaDirection, string> = { in: 'Entrée', out: 'Sortie', both: 'Double sens' };
const ECA_DIRECTION_ICON: Record<EcaDirection, React.FC<{ className?: string }>> = { in: LogIn, out: LogOut, both: ArrowLeftRight };

/**
 * Pictogramme directionnel ; `fallback` quand le sens n'est pas déterminable.
 * Entrée et sortie se lisent au sens de la flèche : vers la droite pour
 * l'entrée, vers la gauche pour la sortie (pictogramme retourné).
 */
export const EcaDirectionIcon: React.FC<{ type: EcaEquipmentType; className?: string; fallback: React.ReactNode }> = ({ type, className, fallback }) => {
    const direction = getEcaDirection(type);
    if (!direction) return <>{fallback}</>;
    const Icon = ECA_DIRECTION_ICON[direction];
    return (
        <span role="img" aria-label={ECA_DIRECTION_LABEL[direction]} title={ECA_DIRECTION_LABEL[direction]} className={direction === 'out' ? 'inline-flex -scale-x-100' : 'inline-flex'}>
            <Icon className={className} aria-hidden="true" />
        </span>
    );
};

/**
 * Titre d'une carte valideur : nom sans le suffixe de sens « (Sortie) » /
 * « (Entrée) » des données source, et sens lu sur le type — affiché pour les
 * seuls valideurs d'entrée ou de sortie. PMR et vantaux réversibles : nom
 * inchangé, aucun sens ajouté.
 */
export const getEcaCardTitle = (eca: ECA): { name: string; direction: string | null } => {
    const direction = isPmrEcaType(eca.type) ? null : getEcaDirection(eca.type);
    if (direction !== 'in' && direction !== 'out') return { name: eca.name, direction: null };
    return { name: eca.name.replace(/\s*\((sortie|entrée)\)\s*$/i, ''), direction: ECA_DIRECTION_LABEL[direction] };
};

/** Résumé d'un accès : « 1 PMR · 2 entrées · 2 sorties ». */
export const summarizeEcaDirections = (ecas: ECA[]): string => {
    const pmr = ecas.filter(e => isPmrEcaType(e.type)).length;
    const count = (d: EcaDirection) => ecas.filter(e => !isPmrEcaType(e.type) && getEcaDirection(e.type) === d).length;
    const entrees = count('in'), sorties = count('out'), doubleSens = count('both');
    return [
        pmr ? `${pmr} PMR` : '',
        entrees ? `${entrees} entrée${entrees > 1 ? 's' : ''}` : '',
        sorties ? `${sorties} sortie${sorties > 1 ? 's' : ''}` : '',
        doubleSens ? `${doubleSens} double sens` : '',
    ].filter(Boolean).join(' · ');
};
