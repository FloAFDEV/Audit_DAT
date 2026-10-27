// components/home/StoryScreen.tsx
// Un vrai écran AuditRef dans un cadre neutre. La zone dont parle le récit
// est cerclée ; avec `zoom`, l'écran est d'abord montré entier puis recadré
// sur cette zone pour la rendre lisible (aucun zoom décoratif : si la zone
// remplit déjà le cadre, l'écran ne bouge pas).
import React from 'react';
import { motion } from 'motion/react';
import type { StoryFocus, StoryShot } from './auditStorySteps';

const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
/** Part du cadre occupée par la zone une fois recadrée. */
const FOCUS_FILL = 0.9;
/** Les captures sont en ×2 : au-delà, le texte perdrait sa netteté. */
const MAX_ZOOM = 1.8;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Échelle et translation (en % de l'écran) qui centrent la zone dans le cadre sans en révéler les bords. */
export const focusCrop = ({ x, y, w, h }: StoryFocus) => {
    const scale = clamp(Math.min((FOCUS_FILL * 100) / w, (FOCUS_FILL * 100) / h), 1, MAX_ZOOM);
    const shift = (center: number) => clamp(50 - center * scale, 100 - 100 * scale, 0);
    return { scale, x: shift(x + w / 2), y: shift(y + h / 2) };
};

interface StoryScreenProps {
    shot: StoryShot;
    alt: string;
    /** Écran actuellement raconté : affiche la zone et déclenche le recadrage. */
    active?: boolean;
    zoom?: boolean;
    eager?: boolean;
    className?: string;
}

export const StoryScreen: React.FC<StoryScreenProps> = ({ shot, alt, active = true, zoom = false, eager = false, className = '' }) => {
    const { focus } = shot;
    const crop = zoom && active ? focusCrop(focus) : { scale: 1, x: 0, y: 0 };

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <motion.div
                className="relative"
                style={{ transformOrigin: '0% 0%' }}
                initial={false}
                animate={{ scale: crop.scale, x: `${crop.x}%`, y: `${crop.y}%` }}
                // Entier d'abord (le lecteur situe la zone), recadré ensuite.
                transition={{ duration: active ? 0.9 : 0, delay: active ? 0.6 : 0, ease: EASE_IN_OUT }}
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
                    className="pointer-events-none absolute rounded-xl ring-2 ring-teal-500 shadow-[0_0_0_6px_rgba(20,184,166,0.12)]"
                    style={{ left: `${focus.x}%`, top: `${focus.y}%`, width: `${focus.w}%`, height: `${focus.h}%` }}
                    initial={false}
                    animate={{ opacity: active ? 1 : 0 }}
                    transition={{ duration: 0.3, delay: active ? 0.2 : 0 }}
                />
            </motion.div>
        </div>
    );
};
