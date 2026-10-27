// components/home/ExplodedStack.tsx
// Direction « Vue éclatée » — trois VRAIS écrans posés en couches, comme une
// vue éclatée technique : le terrain (formulaire), le cockpit (priorités),
// l'intervention (liste). `focus` met une couche au point (à plat, lisible),
// les autres restent en retrait dans la pile.
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { FRAME_BY_ID } from './auditStorySteps';
import { ShotCrop } from './ShotCrop';
import type { StoryFocus, StoryShot } from './auditStorySteps';

export interface Layer {
    id: string;
    label: string;
    shot: StoryShot;
    rect: StoryFocus;
    alt: string;
}

/** Même ratio (16:10) pour les trois couches : la pile reste nette. */
export const LAYERS: Layer[] = [
    { id: 'terrain', label: 'Terrain · formulaire d’audit', shot: FRAME_BY_ID['04-anomalie'].desktop, rect: { x: 0, y: 0, w: 100, h: 100 }, alt: FRAME_BY_ID['04-anomalie'].alt },
    { id: 'cockpit', label: 'Cockpit · priorités', shot: FRAME_BY_ID['06-priorite'].desktop, rect: { x: 0, y: 36, w: 64, h: 64 }, alt: FRAME_BY_ID['06-priorite'].alt },
    { id: 'intervention', label: 'Intervention · liste exportable', shot: FRAME_BY_ID['07-liste'].desktop, rect: { x: 0, y: 0, w: 100, h: 100 }, alt: FRAME_BY_ID['07-liste'].alt },
];

const EASE = [0.65, 0, 0.35, 1] as const;
const ISO = { rotateX: 56, rotateZ: -38 };

interface ExplodedStackProps {
    /** -1 : vue éclatée ; sinon index de la couche mise au point. */
    focus?: number;
    /** Écart entre couches dans la vue éclatée (px). */
    spread?: number;
    /** Anime l'ouverture de la pile au montage. */
    animateIn?: boolean;
    showLabels?: boolean;
    className?: string;
}

export const ExplodedStack: React.FC<ExplodedStackProps> = ({ focus = -1, spread = 110, animateIn = false, showLabels = true, className = '' }) => {
    const reduce = useReducedMotion();
    return (
        <div className={`relative ${className}`} style={{ perspective: '2200px' }}>
            <div className="relative mx-auto aspect-[1.6] w-full" style={{ transformStyle: 'preserve-3d' }}>
                {LAYERS.map((layer, i) => {
                    const focused = focus === i;
                    const exploded = focus === -1;
                    // Couches écartées à l'écran (axe vertical), du terrain (bas) à l'intervention (haut).
                    const lift = (1 - i) * spread;
                    const target = exploded
                        ? { ...ISO, z: 0, scale: 0.72, opacity: 1, y: lift }
                        : focused
                            ? { rotateX: 0, rotateZ: 0, z: 0, scale: 0.94, opacity: 1, y: 0 }
                            : { ...ISO, z: 0, scale: 0.5, opacity: 0, y: lift * 0.6 };
                    return (
                        <motion.div
                            key={layer.id}
                            className="absolute inset-0"
                            style={{ transformStyle: 'preserve-3d', zIndex: focused ? 10 : i }}
                            initial={animateIn && !reduce ? { ...ISO, z: 0, scale: 0.72, opacity: 0, y: 0 } : false}
                            animate={target}
                            transition={{ duration: reduce ? 0 : 0.9, delay: animateIn ? 0.25 + i * 0.12 : 0, ease: EASE }}
                        >
                            <div className={`overflow-hidden rounded-xl bg-white ring-1 ring-white/20 ${focused ? 'shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]' : 'shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]'}`}>
                                <ShotCrop shot={layer.shot} rect={layer.rect} alt={focused || exploded ? layer.alt : ''} eager={animateIn} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
            {showLabels && focus === -1 && (
                <ol aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-center gap-[12%] pr-1">
                    {[...LAYERS].reverse().map((layer, i) => (
                        <li key={layer.id} className="flex items-center gap-2 text-right">
                            <span className="hidden h-px w-10 bg-white/30 sm:block" />
                            <span className="rounded-md bg-slate-950/85 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-200 ring-1 ring-white/10">
                                <span className="text-teal-300">{LAYERS.length - i}</span> {layer.label}
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
};
