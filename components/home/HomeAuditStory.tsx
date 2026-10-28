// components/home/HomeAuditStory.tsx
// Tout ce qui suit le premier écran : quatre temps,
// quatre compositions (terrain, contrôle, décision, à vous), puis l'accès.
// Motion uniquement (règle d'or des animations, index.css) ; rien de cette
// section n'est importé par l'InApp.
import React from 'react';
import { MotionConfig } from 'motion/react';
import { ArrowUp, Mail, MousePointerClick } from 'lucide-react';
import TerrainSection from './TerrainSection';
import ControleSection from './ControleSection';
import DecisionSection from './DecisionSection';
import HomeAuditDemo, { DEMO_INSTRUCTIONS, DEMO_REMAINING } from './HomeAuditDemo';
import { ACCESS_MAILTO } from './HomeHero';
import { Reveal, SHADOW, SURFACE, SectionHeading } from './editorial';

const focusLogin = () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    window.setTimeout(() => document.getElementById('password')?.focus({ preventScroll: true }), 400);
};

const DemoHeader: React.FC = () => (
    <header className="mx-auto max-w-[88rem]">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
            <SectionHeading id="home-demo-title" index="04 · À VOUS" light="Contrôlez" strong="un vrai DAT." className="lg:col-span-7" />
            <Reveal delay={0.3} className="lg:col-span-5">
                <p className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-700/20 dark:bg-teal-900/30 dark:text-teal-200">
                    <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
                    Interface réelle · manipulable
                </p>
                <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">{DEMO_INSTRUCTIONS}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{DEMO_REMAINING}</p>
            </Reveal>
        </div>
    </header>
);

const HomeAuditStory: React.FC = () => (
    <MotionConfig reducedMotion="user">
        <TerrainSection />
        <ControleSection />
        <DecisionSection />

        <HomeAuditDemo
            tone="light"
            header={<DemoHeader />}
            surfaceClassName={SURFACE.mist}
            frameClassName={`mx-auto max-w-[88rem] rounded-[2rem] bg-[#f6f5f1] p-2 ring-1 ring-slate-900/[0.08] sm:p-6 dark:bg-slate-900 dark:ring-white/10 ${SHADOW.rest}`}
        />

        <section aria-labelledby="home-cta-title" className={`px-4 pb-10 pt-10 sm:px-8 sm:pt-14 ${SURFACE.paper}`}>
            <Reveal className="mx-auto grid max-w-[88rem] gap-4 lg:grid-cols-2" y={24}>
                <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-10 dark:ring-1 dark:ring-white/10">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">Agents IV</p>
                    <h2 id="home-cta-title" className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Reprenez vos audits où vous les avez laissés.</h2>
                    <button
                        type="button"
                        onClick={focusLogin}
                        className="mt-6 inline-flex sm:mt-8 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                    >
                        Se connecter
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
                <div className="rounded-3xl border border-slate-900/10 bg-white/60 p-6 sm:p-10 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Vous découvrez AuditRef</p>
                    <p className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl dark:text-white">Un accès, une présentation à une équipe, une question ?</p>
                    <a
                        href={ACCESS_MAILTO}
                        className="mt-6 inline-flex sm:mt-8 items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-teal-700 ring-1 ring-inset ring-teal-700/40 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300 dark:hover:bg-teal-900/30"
                    >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Demander un accès
                    </a>
                </div>
            </Reveal>
            <p className="mt-10 text-center text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AuditRef © {new Date().getFullYear()} · <a href="mailto:florent.perez@tisseo.fr?subject=Contact%20depuis%20AuditRef" className="text-teal-700 hover:underline dark:text-teal-400">Contact</a> · 72 76
            </p>
        </section>
    </MotionConfig>
);

export default HomeAuditStory;
