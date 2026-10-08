import React from 'react';
import { getCognitivePictogramVisualUrl } from '../data/cognitivePictogramVisuals';

/** Visuel du pictogramme cognitif d'une station (fond blanc : lisible en
 *  mode clair comme sombre). Rien n'est rendu si la station n'a pas de
 *  visuel connu. */
export const CognitivePictogramVisual: React.FC<{ stationCode?: string; stationName?: string; size?: 'sm' | 'md' }> = ({ stationCode, stationName, size = 'md' }) => {
    const url = getCognitivePictogramVisualUrl(stationCode);
    if (!url) return null;
    return (
        <img
            src={url}
            alt={`Pictogramme cognitif${stationName ? ` — ${stationName}` : ''}`}
            loading="lazy"
            className={`${size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'} flex-shrink-0 object-contain bg-white rounded-md p-1 ring-1 ring-slate-200 dark:ring-slate-600`}
        />
    );
};
