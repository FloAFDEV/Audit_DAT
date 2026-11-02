import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getCognitivePictogramVisualUrl } from '../data/cognitivePictogramVisuals';
import { ReferenceZoom } from './ReferenceVisual';

/** Fond jaune du pictogramme physique posé en station (relevé sur le
 *  visuel terrain de référence). */
const FIELD_PICTO_BG = '#FDBB31';

const visualClassName = (size: 'sm' | 'md', field?: boolean) => field
    ? `${size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'} flex-shrink-0 object-contain rounded-[8px] p-[3px] border border-white ring-1 ring-black/10`
    : `${size === 'sm' ? 'w-7 h-7' : 'w-10 h-10'} flex-shrink-0 object-contain bg-white rounded-md p-1 ring-1 ring-slate-200 dark:ring-slate-600`;

/** Visuel du pictogramme cognitif d'une station (fond blanc : lisible en
 *  mode clair comme sombre). Rien n'est rendu si la station n'a pas de
 *  visuel connu. `field` : rendu fidèle au pictogramme réel (noir sur fond
 *  #FDBB31, liseré blanc), au format d'un badge ligne (32 px ; 28 px en `sm`).
 *  `zoomable` : clic ou toucher → agrandissement ; sur écran tactile,
 *  emplacement réel d'au moins 44 × 44 px (sans débordement invisible),
 *  même rendu. Image chargée à l'affichage seulement (lazy). */
export const CognitivePictogramVisual: React.FC<{ stationCode?: string; stationName?: string; size?: 'sm' | 'md'; field?: boolean; zoomable?: boolean }> = ({ stationCode, stationName, size = 'md', field, zoomable }) => {
    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const url = getCognitivePictogramVisualUrl(stationCode);
    if (!url) return null;
    const label = `Pictogramme cognitif${stationName ? ` — ${stationName}` : ''}`;
    const image = (
        <img
            src={url}
            alt={label}
            loading="lazy"
            className={visualClassName(size, field)}
            style={field ? { backgroundColor: FIELD_PICTO_BG } : undefined}
        />
    );
    if (!zoomable) return image;
    return (
        <>
            <button
                type="button"
                onClick={e => { e.stopPropagation(); setIsZoomOpen(true); }}
                aria-label={`Agrandir — ${label}`}
                title="Agrandir"
                className="flex-shrink-0 inline-flex items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 pointer-coarse:min-w-11 pointer-coarse:min-h-11"
            >
                {image}
            </button>
            {isZoomOpen && createPortal(
                // Un portail propage ses clics aux ancêtres React : fermer
                // l'agrandissement ne doit pas replier la station qui le porte.
                <div onClick={e => e.stopPropagation()}>
                    <ReferenceZoom url={url} label={label} onClose={() => setIsZoomOpen(false)} />
                </div>,
                document.body,
            )}
        </>
    );
};
