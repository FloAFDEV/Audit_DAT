import React from 'react';
import { getCognitivePictogramVisualUrl } from '../data/cognitivePictogramVisuals';

/** Fond jaune du pictogramme physique posé en station. */
const FIELD_PICTO_BG = '#F9A02B';

/** Visuel du pictogramme cognitif d'une station (fond blanc : lisible en
 *  mode clair comme sombre). Rien n'est rendu si la station n'a pas de
 *  visuel connu. `field` : rendu fidèle au pictogramme réel (noir sur fond
 *  #F9A02B), au format d'un badge ligne (32 px) — header des audits. */
export const CognitivePictogramVisual: React.FC<{ stationCode?: string; stationName?: string; size?: 'sm' | 'md'; field?: boolean }> = ({ stationCode, stationName, size = 'md', field }) => {
    const url = getCognitivePictogramVisualUrl(stationCode);
    if (!url) return null;
    if (field) {
        return (
            <img
                src={url}
                alt={`Pictogramme cognitif${stationName ? ` — ${stationName}` : ''}`}
                className="w-8 h-8 flex-shrink-0 object-contain rounded-[8px] p-1 ring-1 ring-black/10"
                style={{ backgroundColor: FIELD_PICTO_BG }}
            />
        );
    }
    return (
        <img
            src={url}
            alt={`Pictogramme cognitif${stationName ? ` — ${stationName}` : ''}`}
            loading="lazy"
            className={`${size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'} flex-shrink-0 object-contain bg-white rounded-md p-1 ring-1 ring-slate-200 dark:ring-slate-600`}
        />
    );
};
