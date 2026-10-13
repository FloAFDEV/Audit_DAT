import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getReferenceVisualUrl } from '../data/referenceVisuals';

/** Vignette du visuel de référence d'un adhésif (fond blanc : lisible en
 *  mode clair comme sombre). Un appui l'agrandit en plein écran. Rien n'est
 *  rendu si la référence n'a pas de visuel connu. */
export const ReferenceVisual: React.FC<{ referenceId?: string; label: string; size?: 'md' | 'lg' }> = ({ referenceId, label, size = 'md' }) => {
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
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                className={`${size === 'lg' ? 'w-24 h-24' : 'w-14 h-14'} flex-shrink-0 rounded-lg bg-white p-1 ring-1 ring-slate-200 dark:ring-slate-600 hover:ring-2 hover:ring-teal-500 transition-shadow`}
                aria-label={`Agrandir le visuel — ${label}`}
            >
                <img src={url} alt="" loading="lazy" className="w-full h-full object-contain" />
            </button>
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
                    <img src={url} alt={label} className="w-[min(80vw,420px)] max-h-[70vh] rounded-lg bg-white p-3 object-contain" />
                    <p className="max-w-[90vw] text-center text-sm font-semibold text-white">{label}</p>
                </div>
            )}
        </>
    );
};
