import { useLayoutEffect, type RefObject } from 'react';

/**
 * BONUS (vanilla JS léger) — inclinaison inertielle des pictos selon la position
 * de la souris. CSS-only pour le rendu : ce hook se contente d'écrire les variables
 * CSS --rx / --ry sur l'élément .icon-3d survolé. Aucun re-render React, throttlé
 * par requestAnimationFrame → GPU-friendly, 60fps.
 *
 * Délégation d'événements sur le conteneur : un seul listener quel que soit le
 * nombre de cards. Inclinaison plafonnée à ~6° pour rester professionnel.
 *
 * @param scopeRef     conteneur de la grille
 * @param cardSelector sélecteur des cards (qui contiennent un .icon-3d)
 * @param enabled      permet de couper l'effet (ex. prefers-reduced-motion / mode audit)
 */
export const useIconTilt = (
    scopeRef: RefObject<HTMLElement | null>,
    cardSelector = '[data-flip-item]',
    enabled = true,
) => {
    useLayoutEffect(() => {
        const root = scopeRef.current;
        if (!root || !enabled) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

        const MAX = 6; // degrés
        let frame = 0;
        let pending: { icon: HTMLElement; rx: number; ry: number } | null = null;

        const apply = () => {
            frame = 0;
            if (!pending) return;
            pending.icon.style.setProperty('--rx', `${pending.rx.toFixed(2)}deg`);
            pending.icon.style.setProperty('--ry', `${pending.ry.toFixed(2)}deg`);
        };

        const onMove = (e: PointerEvent) => {
            const card = (e.target as HTMLElement).closest<HTMLElement>(cardSelector);
            if (!card) return;
            const icon = card.querySelector<HTMLElement>('.icon-3d');
            if (!icon) return;
            const rect = card.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 → 0.5
            const py = (e.clientY - rect.top) / rect.height - 0.5;
            // rotateX suit l'axe vertical, rotateY l'axe horizontal (inversé pour le réalisme).
            pending = { icon, rx: -py * MAX * 2, ry: px * MAX * 2 };
            if (!frame) frame = requestAnimationFrame(apply);
        };

        const onLeave = (e: PointerEvent) => {
            const card = (e.target as HTMLElement).closest<HTMLElement>(cardSelector);
            const icon = card?.querySelector<HTMLElement>('.icon-3d');
            if (icon) { icon.style.removeProperty('--rx'); icon.style.removeProperty('--ry'); }
        };

        root.addEventListener('pointermove', onMove);
        root.addEventListener('pointerout', onLeave);
        return () => {
            root.removeEventListener('pointermove', onMove);
            root.removeEventListener('pointerout', onLeave);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [scopeRef, cardSelector, enabled]);
};
