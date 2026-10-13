import React, { useEffect, useState } from 'react';
import { X, Map as MapIcon } from 'lucide-react';
import { getReferenceVisualUrl } from '../data/referenceVisuals';

/** Vignette du visuel de référence d'un adhésif (fond blanc : lisible en
 *  mode clair comme sombre). Un appui l'agrandit en plein écran. Rien n'est
 *  rendu si la référence n'a pas de visuel connu. */
export const ReferenceVisual: React.FC<{ referenceId?: string; label: string; size?: 'md' | 'lg'; variant?: 'thumbnail' | 'plan' }> = ({ referenceId, label, size = 'md', variant = 'thumbnail' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const url = getReferenceVisualUrl(referenceId);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen]);

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
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Visuel de référence — ${label}`}
                    onClick={() => setIsOpen(false)}
                >
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                        aria-label="Fermer"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img src={url} alt={label} className="min-w-[min(80vw,420px)] max-w-[92vw] max-h-[78vh] rounded-lg bg-white p-2 object-contain" />
                    <p className="max-w-[90vw] text-center text-sm font-semibold text-white">
                        {label}
                        {variant === 'thumbnail' && referenceId && <span className="ml-2 font-mono text-xs font-normal text-white/70">{referenceId}</span>}
                    </p>
                </div>
            )}
        </>
    );
};
