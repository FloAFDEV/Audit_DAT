import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

/**
 * Configuration GSAP centralisée.
 *
 * GSAP est utilisé EN COMPLÉMENT de Framer Motion, jamais en remplacement.
 * Règle d'or (cf. en-tête de index.css) :
 *  - Framer Motion → navigation + mount/unmount des cards.
 *  - GSAP Flip     → reflow de layout au filtrage UNIQUEMENT (useFlipReflow).
 *  - GSAP micro    → survol (useCardSpotlight) + pulse du badge actif (useBadgePulse).
 *  - CSS           → styles statiques + micro-effets (micro-3D, états, mode audit).
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
