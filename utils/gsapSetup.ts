import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

/**
 * Configuration GSAP centralisée.
 *
 * GSAP est utilisé EN COMPLÉMENT de Framer Motion, jamais en remplacement :
 *  - Framer Motion  → transitions de pages + apparition simple des cards (mount/unmount).
 *  - GSAP           → interactions DOM-level avancées : reflow de filtrage (Flip),
 *                     focus contextuel au survol, surbrillance du mode audit.
 *
 * On enregistre les plugins une seule fois au chargement du module.
 */
gsap.registerPlugin(Flip);

// Défauts globaux : courts et nerveux, adaptés à un outil d'inspection terrain.
gsap.defaults({ ease: 'power3.out', duration: 0.45 });

/** Respecte la préférence système « réduire les animations ». */
export const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export { gsap, Flip };
