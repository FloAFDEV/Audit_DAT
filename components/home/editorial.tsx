// components/home/editorial.tsx
// Vocabulaire graphique partagé par les compositions de la page d'accueil :
// titres à contraste de graisse, annotations de dessin technique, trame des
// scènes sombres. Présentation seule.
import React from 'react';

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Trame technique (scène sombre du temps 03) : lignes fines, aucun dégradé décoratif. */
export const BLUEPRINT: React.CSSProperties = {
    backgroundImage:
        'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
    backgroundSize: '56px 56px',
};

interface SectionHeadingProps {
    id: string;
    index: string;
    /** Première ligne, en graisse légère. */
    light: string;
    /** Seconde ligne, affirmée. */
    strong: React.ReactNode;
    tone?: 'light' | 'dark';
    className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ id, index, light, strong, tone = 'light', className = '' }) => {
    const dark = tone === 'dark';
    return (
        <div className={className}>
            <p className={`font-mono text-xs font-semibold tracking-[0.2em] ${dark ? 'text-teal-300' : 'text-teal-700 dark:text-teal-400'}`}>{index}</p>
            <h2 id={id} className="mt-3 text-[clamp(2.25rem,4.4vw,4rem)] leading-[1.02] tracking-[-0.035em]">
                <span className={`block font-light ${dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{light}</span>
                <span className={`block font-semibold ${dark ? 'text-white' : 'text-slate-950 dark:text-white'}`}>{strong}</span>
            </h2>
        </div>
    );
};

/** Étiquette d'annotation façon dessin technique : numéro + libellé.
 *  `light` suit le thème ; `ink` reste sombre (posé sur une capture, toujours claire). */
const CALLOUT_TONE = {
    light: ['bg-slate-950 text-white dark:bg-white dark:text-slate-950', 'text-teal-300 dark:text-teal-700'],
    dark: ['bg-white text-slate-950', 'text-teal-700'],
    ink: ['bg-slate-950 text-white', 'text-teal-300'],
} as const;

export const Callout: React.FC<{ n: number; children: React.ReactNode; tone?: keyof typeof CALLOUT_TONE; className?: string }> = ({ n, children, tone = 'light', className = '' }) => (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${CALLOUT_TONE[tone][0]} ${className}`}>
        <span className={`font-mono ${CALLOUT_TONE[tone][1]}`}>{n}</span>
        {children}
    </span>
);

/** Libellé de spécification (fiche repère) : numéro d'annotation + intitulé en capitales. */
export const SpecLabel: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
    <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-700 text-[9px] text-white">{n}</span>
        {children}
    </p>
);
