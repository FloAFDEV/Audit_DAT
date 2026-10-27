// components/home/HomeAuditStory.tsx
// Direction « Ligne » — tout ce qui suit le premier écran : quatre temps,
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
import { LineDiagram } from './LineDiagram';
import { ACCESS_MAILTO } from './HomeHero';

const focusLogin = () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    window.setTimeout(() => document.getElementById('password')?.focus({ preventScroll: true }), 400);
};

const DemoHeader: React.FC = () => (
    <header className="mx-auto max-w-[88rem]">
        <LineDiagram size="sm" className="max-w-xl" />
        <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
                <p className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-400">04 · Terminus</p>
                <h2 id="home-demo-title" className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-6xl dark:text-white">
                    À vous : contrôlez un vrai DAT.
                </h2>
            </div>
            <div className="lg:col-span-5">
                <p className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white">
                    <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
                    Interface réelle · manipulable
                </p>
                <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">{DEMO_INSTRUCTIONS}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{DEMO_REMAINING}</p>
            </div>
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
            frameClassName="mx-auto max-w-[88rem] rounded-[2rem] border-2 border-teal-700/80 bg-slate-50 p-3 sm:p-6 dark:bg-slate-900"
        />

        <section aria-labelledby="home-cta-title" className="bg-white px-5 pb-12 pt-8 sm:px-8 dark:bg-slate-950">
            <div className="mx-auto grid max-w-[88rem] gap-4 lg:grid-cols-2">
                <div className="rounded-3xl bg-slate-950 p-8 text-white sm:p-10 dark:ring-1 dark:ring-white/10">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">Agents IV</p>
                    <h2 id="home-cta-title" className="mt-3 text-3xl font-semibold tracking-[-0.02em]">Reprenez vos audits où vous les avez laissés.</h2>
                    <button
                        type="button"
                        onClick={focusLogin}
                        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                    >
                        Se connecter
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
                <div className="rounded-3xl border border-slate-200 p-8 sm:p-10 dark:border-slate-800">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Vous découvrez AuditRef</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">Un accès, une présentation à une équipe, une question ?</p>
                    <a
                        href={ACCESS_MAILTO}
                        className="mt-8 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-teal-700 ring-1 ring-inset ring-teal-700/40 hover:bg-teal-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300 dark:hover:bg-teal-900/30"
                    >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Demander un accès
                    </a>
                </div>
            </div>
            <p className="mt-10 text-center text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                AuditRef © {new Date().getFullYear()} · <a href="mailto:florent.perez@tisseo.fr?subject=Contact%20depuis%20AuditRef" className="text-teal-700 hover:underline dark:text-teal-400">Contact</a> · 72 76
            </p>
        </section>
    </MotionConfig>
);

export default HomeAuditStory;
