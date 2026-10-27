// components/home/StoryScreen.tsx
// Un vrai écran AuditRef présenté dans un cadre neutre, avec la zone dont
// parle l'étape mise en évidence (anneau + voile sur le reste).
import React from 'react';
import { motion } from 'motion/react';
import type { StoryShot } from './auditStorySteps';

const EASE = [0.22, 1, 0.36, 1] as const;

interface StoryScreenProps {
    shot: StoryShot;
    alt: string;
    /** Écran actuellement raconté : déclenche le léger zoom vers la zone de focus. */
    active?: boolean;
    eager?: boolean;
    className?: string;
}

export const StoryScreen: React.FC<StoryScreenProps> = ({ shot, alt, active = true, eager = false, className = '' }) => {
    const { focus } = shot;
    const origin = `${focus.x + focus.w / 2}% ${focus.y + focus.h / 2}%`;

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <motion.div
                className="relative"
                style={{ transformOrigin: origin }}
                initial={false}
                animate={{ scale: active ? 1.035 : 1 }}
                transition={{ duration: 0.7, ease: EASE }}
            >
                <img
                    src={shot.src}
                    alt={alt}
                    width={shot.width}
                    height={shot.height}
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    className="block h-auto w-full select-none"
                    draggable={false}
                />
                <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-xl ring-2 ring-teal-500/90"
                    style={{
                        left: `${focus.x}%`,
                        top: `${focus.y}%`,
                        width: `${focus.w}%`,
                        height: `${focus.h}%`,
                        boxShadow: '0 0 0 200vmax rgba(15, 23, 42, 0.18), 0 0 24px 2px rgba(20, 184, 166, 0.35)',
                    }}
                    initial={false}
                    animate={{ opacity: active ? 1 : 0 }}
                    transition={{ duration: 0.45, delay: active ? 0.25 : 0, ease: EASE }}
                />
            </motion.div>
        </div>
    );
};
