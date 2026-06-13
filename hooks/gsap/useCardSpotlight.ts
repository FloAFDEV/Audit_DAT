import { useLayoutEffect, type RefObject } from 'react';
import { gsap, prefersReducedMotion } from '../../utils/gsapSetup';

/**
 * Focus contextuel au survol (GSAP) : les cards NON survolées s'estompent
 * (flou + léger assombrissement) pour faire ressortir celle qu'on inspecte.
 * « Ce que je regarde ressort, le reste passe en retrait. »
 *
 * IMPORTANT (anti-conflit) : ce hook n'anime QUE la propriété `filter`. Le
 * transform/opacity/scale des cards appartiennent à Framer Motion (variants de
 * mount/exit) ; le zoom du picto appartient au CSS (.icon-3d). En se limitant à
 * `filter`, le survol GSAP ne peut entrer en conflit avec aucun des deux.
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
                gsap.to(el, {
                    filter: el === target ? 'blur(0px) brightness(1)' : 'blur(2px) brightness(0.9)',
                    duration: 0.3,
                    ease: 'power3.out',
                    overwrite: 'auto',
                });
            }
        };

        const handleLeave = () => {
            gsap.to(items(), { filter: 'blur(0px) brightness(1)', duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
        };

        root.addEventListener('pointerover', handleEnter);
        root.addEventListener('pointerleave', handleLeave);

        return () => {
            root.removeEventListener('pointerover', handleEnter);
            root.removeEventListener('pointerleave', handleLeave);
            gsap.set(items(), { clearProps: 'filter' });
            ctx.revert();
        };
    }, [scopeRef, itemSelector, enabled]);
};
