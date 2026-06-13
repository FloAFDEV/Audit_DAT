import type { Variants, Transition } from 'motion/react';

/**
 * Variants Framer Motion — responsable des transitions React :
 * transitions de page (mount/unmount du routeur) et apparition simple des cards.
 * (Le reflow de filtrage et le focus avancé sont gérés par GSAP, cf. hooks/gsap.)
 */

const easeOut: Transition['ease'] = [0.22, 1, 0.36, 1];

/** Transition d'une vue à l'autre (LieuSelector ↔ ModuleSelector ↔ forms ↔ Stats). */
export const pageVariants: Variants = {
    initial: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOut } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
};

/** Conteneur de grille : orchestre l'apparition échelonnée (stagger) des cards. */
export const gridContainerVariants: Variants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.035, delayChildren: 0.04 },
    },
};

/** Une card : fade + léger slide/scale. Sert aussi à l'entrée/sortie au filtrage. */
export const cardVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: easeOut } },
    exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.18, ease: 'easeIn' } },
};
