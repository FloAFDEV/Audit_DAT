// components/home/HomeAuditStory.tsx
// Page d'accueil publique — « Comment se déroule un audit ». Storytelling au
// scroll sur les vrais écrans AuditRef (cf. auditStorySteps.ts).
//
// Deux mises en scène, même contenu :
//  - ≥ lg et mouvement autorisé : scène sticky ; l'étape active dérive de la
//    progression de scroll (re-render uniquement au changement d'étape) ;
//  - mobile, tablette ou prefers-reduced-motion : séquence verticale
//    étape → écran mobile, sans épinglage.
// Motion uniquement (règle d'or des animations, index.css) ; rien de cette
// section n'est importé par l'InApp.
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { ArrowRight, Check, WifiOff } from 'lucide-react';
import { Logo } from '../Logo';
import { AUDIT_STORY_STEPS as STEPS } from './auditStorySteps';
import { StoryScreen } from './StoryScreen';

const EASE = [0.22, 1, 0.36, 1] as const;
/** Distance de scroll par étape (en svh) — assez pour lire, sans tunnel. */
const STEP_SCROLL_SVH = 70;
const pad = (n: number) => String(n).padStart(2, '0');

const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setMatches(mql.matches);
        onChange();
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);
    return matches;
};

/** Ce que l'application a enregistré jusqu'à l'étape courante. */
const AuditTrail: React.FC<{ upTo: number }> = ({ upTo }) => (
    <ul className="flex flex-wrap gap-2" aria-label="Enregistré par l'application">
        <AnimatePresence initial={false} mode="popLayout">
            {STEPS.slice(0, upTo + 1).map((step) => (
                <motion.li
                    key={step.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-teal-600/20 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 dark:border-teal-400/20 dark:bg-teal-900/30 dark:text-teal-200"
                >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {step.trail}
                </motion.li>
            ))}
        </AnimatePresence>
    </ul>
);

/** Cadre produit neutre : barre minimale à l'identité AuditRef, pas de faux navigateur. */
const ProductFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-700/60 ${className}`}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Logo className="h-4 w-4" />
                AuditRef
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <WifiOff className="h-3 w-3" aria-hidden="true" />
                Fonctionne hors ligne
            </span>
        </div>
        {children}
    </div>
);

const StickyStory: React.FC = () => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);
    const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });
    const railProgress = useSpring(scrollYProgress, { stiffness: 260, damping: 40 });

    useMotionValueEvent(scrollYProgress, 'change', (p) => {
        const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length)));
        setActive((current) => (current === next ? current : next));
    });

    const goTo = (index: number) => {
        const track = trackRef.current;
        if (!track) return;
        const top = track.getBoundingClientRect().top + window.scrollY;
        const distance = track.offsetHeight - window.innerHeight;
        window.scrollTo({ top: top + ((index + 0.5) / STEPS.length) * distance, behavior: 'smooth' });
    };

    const step = STEPS[active];

    return (
        <div ref={trackRef} className="relative" style={{ height: `calc(100svh + ${STEPS.length * STEP_SCROLL_SVH}svh)` }}>
            <div className="sticky top-0 flex h-[100svh] items-center">
                <div className="mx-auto grid w-full max-w-7xl grid-cols-12 items-center gap-12 px-8 xl:px-12">
                    <div className="col-span-4">
                        <div aria-hidden="true" className="min-h-[13rem]">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.35, ease: EASE }}
                                >
                                    <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                                        Étape {pad(active + 1)} / {pad(STEPS.length)}
                                    </p>
                                    <p className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-white">{step.title}</p>
                                    <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">{step.text}</p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <nav aria-label="Étapes d'un audit" className="relative mt-10 pl-5">
                            <span className="absolute left-0 top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
                            <motion.span
                                className="absolute left-0 top-1 bottom-1 w-px origin-top bg-teal-600 dark:bg-teal-400"
                                style={{ scaleY: railProgress }}
                                aria-hidden="true"
                            />
                            <ol className="space-y-1">
                                {STEPS.map((s, i) => (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            onClick={() => goTo(i)}
                                            aria-current={i === active ? 'step' : undefined}
                                            className={`flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                                                i === active
                                                    ? 'font-semibold text-slate-900 dark:text-white'
                                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            <span className="font-mono text-xs tabular-nums text-teal-700 dark:text-teal-400">{pad(i + 1)}</span>
                                            {s.title}
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </nav>
                    </div>

                    <div className="col-span-8" aria-hidden="true">
                        <ProductFrame>
                            <div className="relative">
                                {STEPS.map((s, i) => (
                                    <motion.div
                                        key={s.id}
                                        className={i === 0 ? 'relative' : 'absolute inset-0'}
                                        initial={false}
                                        animate={{ opacity: i === active ? 1 : 0, y: i === active ? 0 : i < active ? -10 : 10 }}
                                        transition={{ duration: 0.5, ease: EASE }}
                                    >
                                        <StoryScreen shot={s.desktop} alt="" active={i === active} />
                                    </motion.div>
                                ))}
                            </div>
                        </ProductFrame>
                        <div className="mt-5 min-h-[4.5rem]">
                            <AuditTrail upTo={active} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StackedStory: React.FC = () => (
    <ol className="mx-auto max-w-5xl space-y-16 px-5 sm:px-8 md:space-y-24">
        {STEPS.map((step, i) => (
            <motion.li
                key={step.id}
                className="grid items-center gap-8 md:grid-cols-2 md:gap-12"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, ease: EASE }}
            >
                <div className={i % 2 ? 'md:order-2' : undefined}>
                    <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                        Étape {pad(i + 1)} / {pad(STEPS.length)}
                    </p>
                    <h3 className="mt-2 text-2xl font-bold leading-tight text-slate-900 dark:text-white">{step.title}</h3>
                    <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">{step.text}</p>
                    <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-teal-600/20 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 dark:border-teal-400/20 dark:bg-teal-900/30 dark:text-teal-200">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        {step.trail}
                    </p>
                </div>
                <div className="mx-auto w-full max-w-[19rem]">
                    <div className="overflow-hidden rounded-[1.75rem] bg-slate-50 p-1.5 shadow-2xl ring-1 ring-slate-900/10 dark:bg-slate-800 dark:ring-slate-700/60">
                        <StoryScreen shot={step.mobile} alt={step.alt} className="rounded-[1.4rem]" />
                    </div>
                </div>
            </motion.li>
        ))}
    </ol>
);

const focusLogin = (reduceMotion: boolean | null) => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    // Le champ appartient au formulaire de connexion, inchangé : on ne fait qu'y amener le focus.
    window.setTimeout(() => document.getElementById('password')?.focus({ preventScroll: true }), 400);
};

const HomeAuditStory: React.FC = () => {
    const isDesktop = useMediaQuery('(min-width: 1024px)');
    const reduceMotion = useReducedMotion();
    const sticky = isDesktop && !reduceMotion;

    return (
        <MotionConfig reducedMotion="user">
            <section
                id="comment-ca-marche"
                aria-labelledby="home-story-title"
                className="relative border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-950 lg:py-28"
            >
                <header className="mx-auto max-w-3xl px-5 text-center sm:px-8">
                    <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">Comment se déroule un audit</p>
                    <h2 id="home-story-title" className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-white sm:text-4xl">
                        Du terrain à la décision, en six étapes.
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                        Suivez un vrai contrôle : le distributeur DAT 01 de la station Arènes. Tous les écrans présentés sont ceux de l'application.
                    </p>
                </header>

                {sticky ? (
                    <>
                        {/* Version lisible par les lecteurs d'écran : la scène sticky est purement visuelle. */}
                        <ol className="sr-only">
                            {STEPS.map((s, i) => (
                                <li key={s.id}>
                                    <h3>Étape {i + 1} : {s.title}</h3>
                                    <p>{s.text}</p>
                                    <p>Écran : {s.alt}</p>
                                </li>
                            ))}
                        </ol>
                        <StickyStory />
                    </>
                ) : (
                    <div className="mt-16">
                        <StackedStory />
                    </div>
                )}

                <div className="mx-auto mt-20 max-w-3xl px-5 sm:px-8">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900 sm:p-10">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">Prêt pour le terrain.</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            Hors ligne, données conservées sur l'appareil, export CSV et sauvegarde JSON.
                        </p>
                        <button
                            type="button"
                            onClick={() => focusLogin(reduceMotion)}
                            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                        >
                            Se connecter
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </section>
        </MotionConfig>
    );
};

export default HomeAuditStory;
