import { useLayoutEffect, type RefObject } from 'react';
import { gsap, prefersReducedMotion } from '../../utils/gsapSetup';

/**
 * Focus contextuel au survol (GSAP) — desktop uniquement.
 * Les cards NON survolées s'estompent légèrement (blur 1px + dim).
 *
 * MOBILE : désactivé via détection pointer:coarse (touchscreen).
 * Sur iOS/Android, pointerover se déclenche au tap et pointerleave ne
 * se déclenche jamais → l'état dim "colle" après chaque toucher.
 * La règle CSS @media(hover:hover) ne suffit pas côté JS ; on lit
 * matchMedia directement au montage du hook.
 *
 * ANTI-CONFLIT : ce hook n'anime QUE `filter`. transform/opacity/scale
 * des cards → Framer Motion. transform des pictos → CSS .icon-3d.
 */
// Détecte un vrai périphérique de pointage précis (souris, trackpad).
// (pointer:coarse) seul échoue sur les hybrides (Surface, iPad+trackpad)
// où le pointeur primaire reste "coarse" même quand une souris est présente.
// (hover:hover) and (pointer:fine) = pointeur fin qui peut survoler = pointage réel.
const hasFinePonter = (): boolean =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const useCardSpotlight = (
    scopeRef: RefObject<HTMLElement | null>,
    itemSelector = '[data-flip-item]',
    enabled = true,
) => {
    useLayoutEffect(() => {
        const root = scopeRef.current;
        if (!root || !enabled || prefersReducedMotion() || !hasFinePonter()) return;

        const ctx = gsap.context(() => {});

        const items = (): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(itemSelector));

        const handleEnter = (e: Event) => {
            const target = (e.target as HTMLElement).closest<HTMLElement>(itemSelector);
            if (!target || !root.contains(target)) return;
            for (const el of items()) {
                gsap.to(el, {
                    filter: el === target ? 'blur(0px) brightness(1)' : 'blur(1px) brightness(0.9)',
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
