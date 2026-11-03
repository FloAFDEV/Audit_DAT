import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCognitivePictogramVisualUrl } from '../data/cognitivePictogramVisuals';
import { ReferenceZoom } from './ReferenceVisual';
import { AuditModule, AuditModuleType, Lieu } from '../types';
import useAuditStore from '../store';
import { getStationPictograms } from '../utils/stationPictograms';
import { displayPictogramUrl } from '../utils/cognitivePictogramPreload';

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
    // Visuel indisponible (hors connexion avant tout chargement) : rien
    // plutôt qu'une image cassée.
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const url = getCognitivePictogramVisualUrl(stationCode);
    const src = url ? displayPictogramUrl(url) : undefined;
    if (!url || !src || failedSrc === src) return null;
    const label = `Pictogramme cognitif${stationName ? ` — ${stationName}` : ''}`;
    const image = (
        <img
            src={src}
            alt={label}
            loading="lazy"
            onError={() => setFailedSrc(src)}
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

/** Pictogramme(s) cognitif(s) d'une station, à côté de son nom : repère
 *  visuel patrimonial, jamais un statut. Données : module Pictogrammes
 *  cognitifs de chaque ligne (getStationPictograms) — rien n'est affiché
 *  sans code station ni visuel connu. `line` : la seule ligne de l'écran
 *  (audit d'un module) ; absent : toutes les lignes en exploitation. */
export const StationPictograms: React.FC<{ lieu?: Pick<Lieu, 'name' | 'modules'>; line?: string; size?: 'sm' | 'md'; className?: string }> = ({ lieu, line, size = 'sm', className = '' }) => {
    const pictograms = useMemo(() => getStationPictograms(lieu, line), [lieu, line]);
    if (!lieu || pictograms.length === 0) return null;
    return (
        <span className={`inline-flex flex-shrink-0 items-center gap-1 ${className}`} data-testid="station-pictograms">
            {pictograms.map(p => (
                <CognitivePictogramVisual
                    key={p.stationCode}
                    stationCode={p.stationCode}
                    stationName={line ? `${lieu.name} (ligne ${p.line})` : lieu.name}
                    size={size}
                    field
                />
            ))}
        </span>
    );
};

/** Pictogramme de la station en cours d'audit, pour la ligne du module
 *  affiché (lieu sélectionné, et seulement s'il porte ce module). Rien pour
 *  l'audit Pictogrammes cognitifs, dont c'est déjà le visuel. */
export const ModuleStationPictograms: React.FC<{ module: Pick<AuditModule, 'id' | 'type' | 'line'>; size?: 'sm' | 'md'; className?: string }> = ({ module, size, className }) => {
    const lieu = useAuditStore(s => s.lieux.find(l => l.id === s.selectedLieuId && l.modules.some(m => m.id === module.id)));
    if (module.type === AuditModuleType.COGNITIVE_PICTOGRAMS) return null;
    return <StationPictograms lieu={lieu} line={module.line} size={size} className={className} />;
};
