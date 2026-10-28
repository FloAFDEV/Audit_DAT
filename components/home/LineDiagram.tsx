// components/home/LineDiagram.tsx
// Direction « Ligne » — signature de la page : le parcours d'un constat dessiné
// comme une ligne du réseau, arrêt par arrêt. Le même schéma sert de repère
// (« vous êtes ici ») dans tout le récit.
import React from 'react';
import { motion } from 'motion/react';
import { EASE_IN_OUT } from './editorial';

export const LINE_STOPS = [
    { id: 'terrain', label: 'Terrain', anchor: '#temps-terrain' },
    { id: 'constat', label: 'Constat', anchor: '#temps-controle' },
    { id: 'anomalie', label: 'Anomalie qualifiée', anchor: '#temps-controle' },
    { id: 'priorite', label: 'Priorité', anchor: '#temps-decision' },
    { id: 'intervention', label: 'Intervention', anchor: '#temps-decision' },
] as const;

interface LineDiagramProps {
    /** Index du dernier arrêt atteint (-1 : aucun). */
    reached?: number;
    tone?: 'light' | 'dark';
    size?: 'lg' | 'sm';
    /** Arrêts cliquables (ancres vers les temps du récit). */
    interactive?: boolean;
    className?: string;
}

export const LineDiagram: React.FC<LineDiagramProps> = ({ reached = LINE_STOPS.length - 1, tone = 'light', size = 'lg', interactive = false, className = '' }) => {
    const dark = tone === 'dark';
    const progress = LINE_STOPS.length > 1 ? Math.max(0, reached) / (LINE_STOPS.length - 1) : 1;
    const dot = size === 'lg' ? 'h-4 w-4 border-[3px]' : 'h-3 w-3 border-2';
    const track = size === 'lg' ? 'top-[7px] h-[3px]' : 'top-[5px] h-[2px]';

    return (
        <ol className={`relative grid ${className}`} style={{ gridTemplateColumns: `repeat(${LINE_STOPS.length}, minmax(0, 1fr))` }}>
            {/* Tracé : de la moitié du premier arrêt à la moitié du dernier. */}
            <span aria-hidden="true" className={`absolute ${track} rounded-full ${dark ? 'bg-white/15' : 'bg-slate-200 dark:bg-slate-700'}`} style={{ left: `${50 / LINE_STOPS.length}%`, right: `${50 / LINE_STOPS.length}%` }} />
            <motion.span
                aria-hidden="true"
                className={`absolute ${track} origin-left rounded-full bg-teal-600 dark:bg-teal-400`}
                style={{ left: `${50 / LINE_STOPS.length}%`, right: `${50 / LINE_STOPS.length}%` }}
                initial={false}
                animate={{ scaleX: reached < 0 ? 0 : progress }}
                transition={{ duration: 0.7, ease: EASE_IN_OUT }}
            />
            {LINE_STOPS.map((stop, i) => {
                const on = i <= reached;
                const current = i === reached;
                const label = (
                    <>
                        <span
                            aria-hidden="true"
                            className={`relative z-10 mx-auto block rounded-full transition-[background-color,border-color,box-shadow] duration-500 ${dot} ${
                                on ? 'border-teal-600 bg-teal-600 dark:border-teal-400 dark:bg-teal-400' : dark ? 'border-white/30 bg-slate-950' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950'
                            } ${current ? 'ring-4 ring-teal-600/20' : ''}`}
                        />
                        <span
                            className={`mt-2 block text-center leading-tight transition-colors duration-300 ${size === 'lg' ? 'text-sm' : 'text-[11px]'} ${
                                current ? (dark ? 'font-semibold text-white' : 'font-semibold text-slate-900 dark:text-white') : on ? (dark ? 'text-slate-300' : 'text-slate-700 dark:text-slate-300') : dark ? 'text-slate-500' : 'text-slate-500 dark:text-slate-500'
                            }`}
                        >
                            {stop.label}
                        </span>
                    </>
                );
                return (
                    <li key={stop.id} aria-current={current ? 'step' : undefined}>
                        {interactive ? (
                            <a href={stop.anchor} className="block rounded-md py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                                {label}
                            </a>
                        ) : (
                            <div className="py-1">{label}</div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
};
