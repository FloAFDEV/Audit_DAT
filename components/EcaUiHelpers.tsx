
import React from 'react';
import { EcaEquipmentType } from '../types';

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
