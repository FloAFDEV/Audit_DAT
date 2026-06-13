import { useLayoutEffect, type RefObject } from 'react';
import { gsap, prefersReducedMotion } from '../../utils/gsapSetup';

/**
 * Mode audit (GSAP) : met en surbrillance les cards porteuses d'anomalies
 * (adhésifs à remplacer / absents) avec une micro-animation discrète et continue
 * sur les seuls éléments critiques. Hiérarchie visuelle : l'œil va droit aux défauts.
 *
 * Ciblé sur les éléments [data-anomaly="true"] dans le scope. En cas d'animations
 * réduites, on applique une surbrillance statique (sans pulsation).
 *
 * @param scopeRef conteneur de la grille
 * @param active   mode audit activé
 * @param deps     signature recalculant la sélection (filtre, données…)
 */
export const useAuditHighlight = (
    scopeRef: RefObject<HTMLElement | null>,
    active: boolean,
    deps: string,
) => {
    useLayoutEffect(() => {
        const root = scopeRef.current;
        if (!root) return;

        const anomalies = gsap.utils.toArray<HTMLElement>(root.querySelectorAll('[data-anomaly="true"]'));
        if (anomalies.length === 0) return;

        if (!active) return;

        const glow = '0 0 0 2px rgba(239,68,68,0.55), 0 8px 24px -6px rgba(239,68,68,0.45)';
        const glowSoft = '0 0 0 2px rgba(239,68,68,0.25), 0 4px 14px -6px rgba(239,68,68,0.25)';

        if (prefersReducedMotion()) {
            gsap.set(anomalies, { boxShadow: glow });
            return () => gsap.set(anomalies, { clearProps: 'boxShadow' });
        }

        const tween = gsap.fromTo(
            anomalies,
            { boxShadow: glowSoft },
            {
                boxShadow: glow,
                duration: 1,
                ease: 'sine.inOut',
                repeat: -1,
                yoyo: true,
                stagger: { each: 0.12, from: 'random' },
            },
        );

        return () => {
            tween.kill();
            gsap.set(anomalies, { clearProps: 'boxShadow' });
        };
    }, [scopeRef, active, deps]);
};
