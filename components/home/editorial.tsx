// components/home/editorial.tsx
// Vocabulaire graphique et chorégraphie partagés par les compositions de la
// page d'accueil : surfaces de scène, ombres, titres à contraste de graisse
// révélés au scroll, annotations de dessin technique, parallaxe discrète.
// Présentation seule ; transform / opacity uniquement (pas de CLS).
import React, { useEffect, useRef, useState } from 'react';
import { motion, MotionValue, useReducedMotion, useScroll, useTransform } from 'motion/react';

/** Sortie franche : petites réponses d'interface. */
export const EASE = [0.22, 1, 0.36, 1] as const;
/** Accélération puis décélération douces : entrées de scène, transformations. */
export const EASE_IN_OUT = [0.65, 0.05, 0.25, 1] as const;

/** Surfaces : l'alternance des fonds matérialise la progression du récit. */
export const SURFACE = {
    /** Papier blanc cassé, chaud — premier écran, constat, accès. */
    paper: 'bg-[#f6f5f1] dark:bg-[#0b0f17]',
    /** Brume ardoise-teal très désaturée — terrain, démo. */
    mist: 'bg-[#e4ebe8] dark:bg-[#0c1618]',
    /** Nuit — la scène de décision. */
    night: 'bg-[#050912]',
} as const;

/** Profondeur en trois niveaux : posé, flottant, au premier plan. */
export const SHADOW = {
    rest: 'shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_20px_-12px_rgba(15,23,42,0.18)]',
    float: 'shadow-[0_1px_2px_rgba(15,23,42,0.06),0_18px_36px_-18px_rgba(15,23,42,0.28),0_60px_110px_-40px_rgba(15,23,42,0.42)]',
    front: 'shadow-[0_2px_4px_rgba(15,23,42,0.1),0_30px_60px_-20px_rgba(15,23,42,0.45),0_80px_140px_-50px_rgba(15,23,42,0.5)]',
} as const;

/** Texture à points du projet (teal), pour le papier du premier écran. */
export const DOTS: React.CSSProperties = {
    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(20,184,166,0.16) 1px, transparent 0)',
    backgroundSize: '22px 22px',
};

/** Trame technique (scène sombre du temps 03) : lignes fines, aucun dégradé décoratif. */
export const BLUEPRINT: React.CSSProperties = {
    backgroundImage:
        'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
    backgroundSize: '56px 56px',
};

/** Papier millimétré du dessin technique (temps 02), clair et sombre via variable CSS. */
export const DraftingGrid: React.FC<{ className?: string }> = ({ className = '' }) => (
    <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 [--grid:rgba(15,23,42,0.05)] dark:[--grid:rgba(255,255,255,0.04)] ${className}`}
        style={{
            backgroundImage: 'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
        }}
    />
);

/** Amplitude du mouvement selon l'écran : pleine ≥ lg, réduite en dessous, nulle en reduced motion. */
export const useMotionAmplitude = () => {
    const reduce = useReducedMotion();
    const [factor, setFactor] = useState(1);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const update = () => setFactor(mq.matches ? 1 : 0.35);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);
    return reduce ? 0 : factor;
};

/** Parallaxe : décalage vertical lié au passage de `ref` dans le viewport (+d → −d). */
export const useParallax = (ref: React.RefObject<HTMLElement | null>, distance: number): MotionValue<number> => {
    const amplitude = useMotionAmplitude();
    const d = useRef(0);
    d.current = distance * amplitude;
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    return useTransform(scrollYProgress, (p) => (1 - 2 * p) * d.current);
};

interface RevealProps {
    children: React.ReactNode;
    delay?: number;
    y?: number;
    className?: string;
    amount?: number;
}

/** Entrée d'un bloc à son arrivée dans le viewport. */
export const Reveal: React.FC<RevealProps> = ({ children, delay = 0, y = 32, className = '', amount = 0.25 }) => {
    const reduce = useReducedMotion();
    return (
        <motion.div
            className={className}
            // Reduced motion : contenu affiché d'emblée, sans fondu.
            initial={reduce ? false : { opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount }}
            transition={{ duration: 0.9, delay, ease: EASE_IN_OUT }}
        >
            {children}
        </motion.div>
    );
};

/** Une ligne de titre révélée derrière un masque (le texte monte de sous sa ligne de base). */
export const MaskLine: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => (
    <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
        <motion.span
            className={`block ${className}`}
            variants={{ hidden: { y: '108%' }, shown: { y: '0%' } }}
            transition={{ duration: 1, delay, ease: EASE_IN_OUT }}
        >
            {children}
        </motion.span>
    </span>
);

interface SectionHeadingProps {
    id: string;
    index: string;
    /** Première ligne, en graisse légère. */
    light: string;
    /** Seconde ligne, affirmée. */
    strong: React.ReactNode;
    tone?: 'light' | 'dark';
    className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ id, index, light, strong, tone = 'light', className = '' }) => {
    const dark = tone === 'dark';
    return (
        <motion.div className={className} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.6 }}>
            <p className={`flex items-center gap-3 font-mono text-xs font-semibold tracking-[0.2em] ${dark ? 'text-teal-300' : 'text-teal-700 dark:text-teal-400'}`}>
                <motion.span
                    aria-hidden="true"
                    className="h-px w-8 origin-left bg-current"
                    variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
                    transition={{ duration: 0.8, ease: EASE_IN_OUT }}
                />
                {index}
            </p>
            <h2 id={id} className="mt-3 text-[clamp(2.25rem,4.4vw,4rem)] leading-[1.02] tracking-[-0.035em]">
                <MaskLine delay={0.1} className={`font-light ${dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{light}</MaskLine>
                <MaskLine delay={0.22} className={`font-semibold ${dark ? 'text-white' : 'text-slate-950 dark:text-white'}`}>{strong}</MaskLine>
            </h2>
        </motion.div>
    );
};

/** Repères de coupe (dessin technique) aux quatre coins d'un cadre. */
export const CropMarks: React.FC<{ tone?: 'light' | 'dark'; inset?: string }> = ({ tone = 'light', inset = '-0.75rem' }) => {
    const color = tone === 'dark' ? 'border-white/25' : 'border-slate-400/60 dark:border-slate-500/50';
    const mark = `pointer-events-none absolute h-3.5 w-3.5 ${color}`;
    return (
        <span aria-hidden="true">
            <span className={`${mark} border-l border-t`} style={{ left: inset, top: inset }} />
            <span className={`${mark} border-r border-t`} style={{ right: inset, top: inset }} />
            <span className={`${mark} border-b border-l`} style={{ left: inset, bottom: inset }} />
            <span className={`${mark} border-b border-r`} style={{ right: inset, bottom: inset }} />
        </span>
    );
};

/** Cartouche de planche : référence de la scène, comme sur un plan. */
export const Cartouche: React.FC<{ children: React.ReactNode; tone?: 'light' | 'dark'; className?: string }> = ({ children, tone = 'light', className = '' }) => (
    <p
        aria-hidden="true"
        className={`font-mono text-[10px] uppercase tracking-[0.2em] ${tone === 'dark' ? 'text-slate-500' : 'text-slate-400 dark:text-slate-500'} ${className}`}
    >
        {children}
    </p>
);

/** Étiquette d'annotation façon dessin technique : numéro + libellé.
 *  `light` suit le thème ; `ink` reste sombre (posé sur une capture, toujours claire). */
const CALLOUT_TONE = {
    light: ['bg-slate-950 text-white dark:bg-white dark:text-slate-950', 'text-teal-300 dark:text-teal-700'],
    dark: ['bg-white text-slate-950', 'text-teal-700'],
    ink: ['bg-slate-950 text-white', 'text-teal-300'],
} as const;

export const Callout: React.FC<{ n: number; children: React.ReactNode; tone?: keyof typeof CALLOUT_TONE; className?: string }> = ({ n, children, tone = 'light', className = '' }) => (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${CALLOUT_TONE[tone][0]} ${className}`}>
        <span className={`font-mono ${CALLOUT_TONE[tone][1]}`}>{n}</span>
        {children}
    </span>
);

/** Libellé de spécification (fiche repère) : numéro d'annotation + intitulé en capitales. */
export const SpecLabel: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
    <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-700 text-[9px] text-white">{n}</span>
        {children}
    </p>
);
