// components/home/HomeAuditStory.tsx
// Page d'accueil publique — « du constat terrain à la décision ». Trois temps
// racontés sur les vrais écrans (auditStorySteps.ts), puis le quatrième,
// joué par le visiteur : la démo sur le vrai formulaire (HomeAuditDemo).
//
// Deux mises en scène, même contenu :
//  - ≥ lg et mouvement autorisé : scène sticky ; l'écran actif dérive de la
//    progression de scroll (re-render uniquement au changement d'écran) ;
//    chaque écran a sa part de piste : le contexte passe vite, la décision
//    prend son temps ;
//  - mobile, tablette ou prefers-reduced-motion : séquence verticale
//    courte, sans épinglage ni animation d'apparition.
// Motion uniquement (règle d'or des animations, index.css) ; rien de cette
// section n'est importé par l'InApp.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { ArrowDown, ArrowRight, Check, Mail, WifiOff } from 'lucide-react';
import { Logo } from '../Logo';
import { AUDIT_STORY_STEPS as STEPS } from './auditStorySteps';
import { StoryScreen } from './StoryScreen';
import HomeNetworkScale from './HomeNetworkScale';
import HomeAuditDemo, { HOME_DEMO_ID } from './HomeAuditDemo';

const EASE = [0.22, 1, 0.36, 1] as const;
/** Quatre temps : trois racontés, le dernier joué par le visiteur. */
const TOTAL_STEPS = STEPS.length + 1;
const DEMO_STEP_TITLE = 'À vous';
const ACCESS_MAILTO = 'mailto:florent.perez@tisseo.fr?subject=Demande%20d%27acc%C3%A8s%20%C3%A0%20AuditRef';
const pad = (n: number) => String(n).padStart(2, '0');

/** Écrans du récit à plat, avec leur part de piste cumulée. */
const FRAMES = STEPS.flatMap((step, stepIndex) => step.frames.map((frame) => ({ ...frame, stepIndex })));
const TRACK_SVH = FRAMES.reduce((sum, f) => sum + f.scroll, 0);
const FRAME_ENDS = FRAMES.reduce<number[]>((ends, f) => [...ends, (ends.at(-1) ?? 0) + f.scroll / TRACK_SVH], []);

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

const scrollToDemo = (smooth: boolean) =>
    document.getElementById(HOME_DEMO_ID)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });

/** Cadre produit neutre : barre minimale à l'identité AuditRef, pas de faux navigateur. */
const ProductFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-900/10 dark:ring-slate-700/60">
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
        const found = FRAME_ENDS.findIndex((end) => p < end);
        const index = found === -1 ? FRAMES.length - 1 : found;
        setActive((current) => (current === index ? current : index));
    });

    const goToStep = (stepIndex: number) => {
        const track = trackRef.current;
        if (!track) return;
        const first = FRAMES.findIndex((f) => f.stepIndex === stepIndex);
        const start = first === 0 ? 0 : FRAME_ENDS[first - 1];
        const top = track.getBoundingClientRect().top + window.scrollY;
        const distance = track.offsetHeight - window.innerHeight;
        window.scrollTo({ top: top + (start + 0.02) * distance, behavior: 'smooth' });
    };

    const frame = FRAMES[active];
    const step = STEPS[frame.stepIndex];

    return (
        <div ref={trackRef} className="relative" style={{ height: `calc(100svh + ${TRACK_SVH}svh)` }}>
            <div className="sticky top-0 flex h-[100svh] items-center">
                <div className="mx-auto grid w-full max-w-[88rem] grid-cols-12 items-center gap-10 px-8 xl:px-12">
                    <div className="col-span-4">
                        <div aria-hidden="true" className="min-h-[12rem]">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.35, ease: EASE }}
                                >
                                    <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                                        {pad(frame.stepIndex + 1)} / {pad(TOTAL_STEPS)}
                                    </p>
                                    <p className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-white">{step.title}</p>
                                    <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">{step.text}</p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <nav aria-label="Les temps d'un audit" className="relative mt-8 pl-5">
                            <span className="absolute left-0 top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
                            <motion.span
                                className="absolute left-0 top-1 bottom-1 w-px origin-top bg-teal-600 dark:bg-teal-400"
                                style={{ scaleY: railProgress }}
                                aria-hidden="true"
                            />
                            <ol className="space-y-2">
                                {STEPS.map((s, i) => {
                                    const reached = i <= frame.stepIndex;
                                    return (
                                        <li key={s.id}>
                                            <button
                                                type="button"
                                                onClick={() => goToStep(i)}
                                                aria-current={i === frame.stepIndex ? 'step' : undefined}
                                                className={`flex w-full items-baseline gap-3 rounded-md px-2 py-1 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                                                    i === frame.stepIndex
                                                        ? 'font-semibold text-slate-900 dark:text-white'
                                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                <span className="font-mono text-xs tabular-nums text-teal-700 dark:text-teal-400">{pad(i + 1)}</span>
                                                <span>
                                                    {s.title}
                                                    {/* Ce que l'application a enregistré, dans le regard plutôt que sous l'écran. */}
                                                    <span
                                                        className={`mt-0.5 flex items-center gap-1 text-xs font-medium text-teal-800 transition-opacity duration-300 dark:text-teal-300 ${reached ? 'opacity-100' : 'opacity-0'}`}
                                                        aria-hidden={!reached}
                                                    >
                                                        <Check className="h-3 w-3" aria-hidden="true" />
                                                        {s.trail}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                                <li>
                                    <button
                                        type="button"
                                        onClick={() => scrollToDemo(true)}
                                        className="flex w-full items-baseline gap-3 rounded-md px-2 py-1 text-left text-sm font-semibold text-teal-700 hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
                                    >
                                        <span className="font-mono text-xs tabular-nums">{pad(TOTAL_STEPS)}</span>
                                        {DEMO_STEP_TITLE} : essayez
                                        <ArrowDown className="h-3.5 w-3.5 self-center" aria-hidden="true" />
                                    </button>
                                </li>
                            </ol>
                        </nav>
                    </div>

                    <div className="col-span-8" aria-hidden="true">
                        <ProductFrame>
                            <div className="relative">
                                {FRAMES.map((f, i) => (
                                    <motion.div
                                        key={f.id}
                                        className={i === 0 ? 'relative' : 'absolute inset-0'}
                                        initial={false}
                                        animate={{ opacity: i === active ? 1 : 0 }}
                                        transition={{ duration: 0.45, ease: EASE }}
                                    >
                                        <StoryScreen shot={f.desktop} alt="" active={i === active} zoom />
                                    </motion.div>
                                ))}
                            </div>
                        </ProductFrame>
                        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">{frame.caption}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** Mobile / reduced motion : séquence courte, sans épinglage ni apparition animée. */
const StackedStory: React.FC<{ reduceMotion: boolean }> = ({ reduceMotion }) => (
    <ol className="mx-auto max-w-5xl space-y-14 px-5 sm:px-8 md:space-y-20">
        {STEPS.map((step, i) => {
            // Le contexte tient en deux vignettes ; un seul écran, lisible, pour le contrôle et la décision.
            const isContext = i === 0 && step.frames.length > 1;
            const frames = isContext ? step.frames : [step.frames.find((f) => f.id === '06-priorite') ?? step.frames[0]];
            return (
                <li key={step.id} className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
                    <div className={i % 2 ? 'md:order-2' : undefined}>
                        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                            {pad(i + 1)} / {pad(TOTAL_STEPS)}
                        </p>
                        <h3 className="mt-2 text-2xl font-bold leading-tight text-slate-900 dark:text-white">{step.title}</h3>
                        <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">{step.text}</p>
                        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-800 dark:text-teal-300">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            {step.trail}
                        </p>
                    </div>
                    <div className={`mx-auto grid w-full gap-3 ${isContext ? 'max-w-[22rem] grid-cols-2' : 'max-w-[19rem]'}`}>
                        {frames.map((f) => (
                            <figure key={f.id}>
                                <div className="overflow-hidden rounded-[1.5rem] bg-slate-50 p-1 shadow-xl ring-1 ring-slate-900/10 dark:bg-slate-800 dark:ring-slate-700/60">
                                    <StoryScreen shot={f.mobile} alt={f.alt} className="rounded-[1.25rem]" />
                                </div>
                                <figcaption className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">{f.caption}</figcaption>
                            </figure>
                        ))}
                    </div>
                </li>
            );
        })}
        <li>
            <button
                type="button"
                onClick={() => scrollToDemo(!reduceMotion)}
                className="mx-auto flex items-center gap-2 rounded-lg px-3 py-2 text-base font-semibold text-teal-700 hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
            >
                {pad(TOTAL_STEPS)} · {DEMO_STEP_TITLE} : essayez
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>
        </li>
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
    const srSteps = useMemo(() => STEPS.map((s) => ({ ...s, alts: s.frames.map((f) => f.alt) })), []);

    return (
        <MotionConfig reducedMotion="user">
            <section
                id="comment-ca-marche"
                aria-labelledby="home-story-title"
                className="relative border-t border-slate-200 bg-white pt-20 dark:border-slate-800 dark:bg-slate-950 lg:pt-28"
            >
                <header className="mx-auto max-w-3xl px-5 text-center sm:px-8">
                    <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">Comment se déroule un audit</p>
                    <h2 id="home-story-title" className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-white sm:text-4xl">
                        Un constat terrain ne sert que s'il devient une décision.
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                        Suivez un vrai contrôle, le DAT 01 de la station Arènes : du repère décollé relevé en station à la liste d'intervention. Les écrans sont ceux de l'application.
                    </p>
                </header>

                <HomeNetworkScale />

                {sticky ? (
                    <>
                        {/* Version lisible par les lecteurs d'écran : la scène sticky est purement visuelle. */}
                        <ol className="sr-only">
                            {srSteps.map((s, i) => (
                                <li key={s.id}>
                                    <h3>{i + 1}. {s.title}</h3>
                                    <p>{s.text}</p>
                                    {s.alts.map((alt) => <p key={alt}>Écran : {alt}</p>)}
                                </li>
                            ))}
                        </ol>
                        <StickyStory />
                    </>
                ) : (
                    <div className="mt-14 pb-16">
                        <StackedStory reduceMotion={!!reduceMotion} />
                    </div>
                )}
            </section>

            <HomeAuditDemo />

            <section aria-labelledby="home-cta-title" className="bg-white px-5 py-20 dark:bg-slate-950 sm:px-8">
                <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7 dark:border-slate-700 dark:bg-slate-900">
                        <h2 id="home-cta-title" className="text-xl font-bold text-slate-900 dark:text-white">Vous êtes agent IV ?</h2>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Reprenez vos audits là où vous les avez laissés, même hors ligne.</p>
                        <button
                            type="button"
                            onClick={() => focusLogin(reduceMotion)}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                        >
                            Se connecter
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-700 dark:bg-slate-950">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">Vous découvrez AuditRef ?</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Pour un accès, une présentation à une équipe ou une question, écrivez-nous.</p>
                        <a
                            href={ACCESS_MAILTO}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/40 transition-colors hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300 dark:ring-teal-400/40 dark:hover:bg-teal-900/30"
                        >
                            <Mail className="h-4 w-4" aria-hidden="true" />
                            Demander un accès
                        </a>
                    </div>
                </div>
            </section>
        </MotionConfig>
    );
};

export default HomeAuditStory;
