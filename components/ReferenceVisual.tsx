import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Map as MapIcon, Image as ImageIcon } from 'lucide-react';
import { getReferenceVisualUrl } from '../data/referenceVisuals';

/** Agrandissement plein écran d'un visuel (Échap, clic ou bouton pour fermer). */
const ReferenceZoom: React.FC<{ url: string; label: string; referenceId?: string; onClose: () => void }> = ({ url, label, referenceId, onClose }) => {
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Visuel de référence — ${label}`}
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Fermer"
            >
                <X className="w-6 h-6" />
            </button>
            {failed
                ? <p className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white">Visuel indisponible pour le moment.</p>
                : <img src={url} alt={label} onError={() => setFailed(true)} className="min-w-[min(80vw,420px)] max-w-[92vw] max-h-[78vh] rounded-lg bg-white p-2 object-contain" />}
            <p className="max-w-[90vw] text-center text-sm font-semibold text-white">
                {label}
                {referenceId && <span className="ml-2 font-mono text-xs font-normal text-white/70">{referenceId}</span>}
            </p>
        </div>
    );
};

/** Vignette du visuel de référence d'un adhésif (fond blanc : lisible en
 *  mode clair comme sombre). Un appui l'agrandit en plein écran. Rien n'est
 *  rendu si la référence n'a pas de visuel connu. */
export const ReferenceVisual: React.FC<{ referenceId?: string; label: string; size?: 'md' | 'lg'; variant?: 'thumbnail' | 'plan' }> = ({ referenceId, label, size = 'md', variant = 'thumbnail' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const url = getReferenceVisualUrl(referenceId);

    if (!url) return null;
    return (
        <>
            {variant === 'plan' ? (
                // Plan de repérage d'un équipement : bouton texte, pas une vignette.
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                    className="inline-flex items-center gap-2 rounded-md bg-white dark:bg-slate-700/50 px-3 py-1.5 text-sm font-semibold text-teal-700 dark:text-teal-300 ring-1 ring-inset ring-teal-500/60 hover:bg-teal-50 dark:hover:bg-slate-700"
                >
                    <MapIcon className="w-4 h-4" aria-hidden="true" />
                    Plan de repérage
                </button>
            ) : (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                    className={`${size === 'lg' ? 'w-24 h-24' : 'w-14 h-14'} flex-shrink-0 rounded-lg bg-white p-1 ring-1 ring-slate-200 dark:ring-slate-600 hover:ring-2 hover:ring-teal-500 transition-shadow`}
                    aria-label={`Agrandir le visuel — ${label}`}
                >
                    <img src={url} alt="" loading="lazy" className="w-full h-full object-contain" />
                </button>
            )}
            {isOpen && <ReferenceZoom url={url} label={label} referenceId={variant === 'thumbnail' ? referenceId : undefined} onClose={() => setIsOpen(false)} />}
        </>
    );
};

const PREVIEW_SIZE = 160;

/** Nom de référence avec aperçu de son visuel (Inventaire détaillé) :
 *  - ordinateur : survol (ou focus clavier) du nom ou de l'icône → vignette
 *    ~160 px flottante, rendue hors du tableau (portail, position fixe) pour
 *    n'être ni coupée par son conteneur défilant ni déplacer la mise en page ;
 *  - tactile : pas de survol, l'icône ouvre l'agrandissement existant.
 *  L'image n'est demandée qu'à l'affichage. Sans visuel connu : le nom seul,
 *  sans icône. Image en erreur : plus d'aperçu, le nom reste. */
export const ReferenceNamePreview: React.FC<{ referenceId?: string; label: string; children: React.ReactNode }> = ({ referenceId, label, children }) => {
    const url = getReferenceVisualUrl(referenceId);
    const anchorRef = useRef<HTMLSpanElement>(null);
    const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const [failed, setFailed] = useState(false);

    if (!url || failed) return <>{children}</>;

    const canHover = () => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const show = (force = false) => {
        if (!force && !canHover()) return;
        const rect = anchorRef.current?.getBoundingClientRect();
        if (!rect) return;
        const below = rect.bottom + 6;
        const top = below + PREVIEW_SIZE > window.innerHeight ? Math.max(6, rect.top - PREVIEW_SIZE - 6) : below;
        const left = Math.min(Math.max(6, rect.left), window.innerWidth - PREVIEW_SIZE - 6);
        setPos({ left, top });
    };
    const hide = () => setPos(null);

    return (
        <span
            ref={anchorRef}
            className="inline-flex max-w-full min-w-0 items-center gap-1.5"
            onMouseEnter={() => show()}
            onMouseLeave={hide}
        >
            {children}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); hide(); setIsZoomOpen(true); }}
                onFocus={() => show(true)}
                onBlur={hide}
                className="flex-shrink-0 rounded p-0.5 text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                aria-label={`Voir le visuel — ${label}`}
                title="Voir le visuel"
            >
                <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {pos && createPortal(
                <div
                    role="tooltip"
                    className="pointer-events-none fixed z-50 rounded-lg bg-white p-1.5 shadow-xl ring-1 ring-slate-200 dark:ring-slate-600"
                    style={{ left: pos.left, top: pos.top, width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                >
                    <img src={url} alt="" onError={() => { setFailed(true); hide(); }} className="w-full h-full object-contain" />
                </div>,
                document.body
            )}
            {isZoomOpen && createPortal(
                <ReferenceZoom url={url} label={label} referenceId={referenceId} onClose={() => setIsZoomOpen(false)} />,
                document.body
            )}
        </span>
    );
};
