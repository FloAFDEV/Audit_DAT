import { useLayoutEffect, type RefObject } from 'react';
import { gsap, prefersReducedMotion } from '../../utils/gsapSetup';

/**
 * Focus contextuel avancé au survol (GSAP) : la card survolée prend un léger zoom
 * et passe au premier plan, pendant que les autres cards s'estompent (blur + dim).
 * Transforme la grille en outil d'inspection « ce que je regarde ressort ».
 *
 * Interaction DOM-level pure → GSAP (et non Framer Motion). Délégation d'événements
 * pour rester performant quel que soit le nombre de cards.
 *
 * @param scopeRef     conteneur de la grille
 * @param itemSelector sélecteur des cards
 * @param enabled      désactive l'effet (ex. quand le mode audit prend la main)
 */
export const useCardSpotlight = (
    scopeRef: RefObject<HTMLElement | null>,
    itemSelector = '[data-flip-item]',
    enabled = true,
) => {
    useLayoutEffect(() => {
        const root = scopeRef.current;
        if (!root || !enabled || prefersReducedMotion()) return;

        const ctx = gsap.context(() => {});

        const items = (): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(itemSelector));

        const handleEnter = (e: Event) => {
            const target = (e.target as HTMLElement).closest<HTMLElement>(itemSelector);
            if (!target || !root.contains(target)) return;
            for (const el of items()) {
                if (el === target) {
                    gsap.to(el, { scale: 1.035, zIndex: 2, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
                } else {
                    gsap.to(el, { scale: 0.985, opacity: 0.55, filter: 'blur(2px)', duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
                }
            }
        };

        const handleLeave = () => {
            gsap.to(items(), { scale: 1, opacity: 1, filter: 'blur(0px)', zIndex: 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
        };

        root.addEventListener('pointerover', handleEnter);
        root.addEventListener('pointerleave', handleLeave);

        return () => {
            root.removeEventListener('pointerover', handleEnter);
            root.removeEventListener('pointerleave', handleLeave);
            gsap.to(items(), { scale: 1, opacity: 1, filter: 'blur(0px)', clearProps: 'filter,zIndex', duration: 0 });
            ctx.revert();
        };
    }, [scopeRef, itemSelector, enabled]);
};
