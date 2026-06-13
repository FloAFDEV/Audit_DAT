import { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '../../utils/gsapSetup';

/**
 * Pulse subtil (scale 1 → 1.05 → 1) déclenché à chaque changement de `triggerKey`.
 * Utilisé pour signaler le badge de ligne actif lors d'un changement de filtre.
 * GSAP : micro-interaction ponctuelle DOM-level.
 */
export const useBadgePulse = (triggerKey: string) => {
    const ref = useRef<HTMLElement | null>(null);
    const first = useRef(true);

    useLayoutEffect(() => {
        // Pas de pulse au tout premier rendu.
        if (first.current) { first.current = false; return; }
        if (!ref.current || prefersReducedMotion()) return;
        gsap.fromTo(
            ref.current,
            { scale: 1 },
            { scale: 1.05, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: 'auto' },
        );
    }, [triggerKey]);

    return ref;
};
