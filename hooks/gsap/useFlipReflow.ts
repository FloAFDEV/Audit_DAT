import { useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap, Flip, prefersReducedMotion } from '../../utils/gsapSetup';

/**
 * Anime le RE-AGENCEMENT (reflow) d'une grille lorsqu'un filtre change, via GSAP Flip.
 *
 * Rôle GSAP (complément de Framer Motion) : les cards qui RESTENT glissent
 * fluidement vers leur nouvelle position au lieu de « sauter », avec un stagger
 * léger. L'apparition et la disparition (opacity + translateY) restent gérées par
 * Framer Motion (AnimatePresence). Comportement « outil pro » : court et lisible.
 *
 * @param scopeRef   conteneur de la grille
 * @param signature  chaîne qui change à chaque modification du filtre/tri/recherche
 * @param itemSelector sélecteur des cards à animer (défaut: [data-flip-item])
 */
export const useFlipReflow = (
    scopeRef: RefObject<HTMLElement | null>,
    signature: string,
    itemSelector = '[data-flip-item]',
) => {
    const lastState = useRef<Flip.FlipState | null>(null);
    const lastSignature = useRef<string | null>(null);

    useLayoutEffect(() => {
        const root = scopeRef.current;
        if (!root) return;

        const targets = root.querySelectorAll(itemSelector);

        // Première exécution ou animations réduites : on mémorise sans animer.
        if (
            lastState.current &&
            lastSignature.current !== signature &&
            !prefersReducedMotion()
        ) {
            // Reflow des survivants uniquement : court (0.3s), stagger léger.
            // L'entrée/sortie est déléguée à Framer Motion → pas de onEnter/onLeave ici.
            Flip.from(lastState.current, {
                targets,
                duration: 0.3,
                ease: 'power2.out',
                stagger: 0.06,
            });
        }

        // Capture l'état courant pour la prochaine transition.
        lastState.current = Flip.getState(targets);
        lastSignature.current = signature;
    }, [signature, scopeRef, itemSelector]);
};
