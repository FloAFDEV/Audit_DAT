// components/home/HomeAuditStory.tsx
// Direction « Vue éclatée » — tout ce qui suit le premier écran : quatre
// temps, quatre compositions (atelier clair pour le terrain et le gros plan,
// scène sombre pour la décision et pour la démo), puis l'accès.
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

const focusLogin = () => {
    const panel = document.getElementById('acces-agents');
    panel?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    window.setTimeout(() => document.getElementById('password')?.focus({ preventScroll: true }), 450);
};

const DemoHeader: React.FC = () => (
    <header className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
        <p className="font-mono text-sm text-slate-500">04</p>
        <h2 id="home-demo-title" className="mt-3 text-[clamp(2.5rem,5vw,4.5rem)] leading-[1] tracking-[-0.035em]">
            <span className="font-light text-slate-400">À vous,</span>
            <br />
            <span className="font-semibold">contrôlez un vrai DAT.</span>
        </h2>
        </div>
        <div className="lg:col-span-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950">
                <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
                Interface réelle · manipulable
            </p>
            <p className="mt-3 text-base leading-relaxed text-slate-300">{DEMO_INSTRUCTIONS}</p>
            <p className="mt-1 text-sm text-slate-400">{DEMO_REMAINING}</p>
        </div>
    </header>
);

const HomeAuditStory: React.FC = () => (
    <MotionConfig reducedMotion="user">
        <TerrainSection />
        <ControleSection />
        <DecisionSection />

        <HomeAuditDemo
            tone="dark"
            header={<DemoHeader />}
            frameClassName="rounded-[2rem] bg-white/[0.04] p-3 ring-1 ring-white/10 sm:p-6"
        />

        <section aria-labelledby="home-cta-title" className="border-t border-white/10 bg-slate-950 px-5 py-24 text-white sm:px-8">
            <div className="mx-auto grid max-w-[88rem] gap-12 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-white/10">
                <div className="lg:pr-16">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal-300">Agents IV</p>
                    <h2 id="home-cta-title" className="mt-4 text-4xl tracking-[-0.03em]">
                        <span className="font-light text-slate-400">Vos audits vous attendent,</span> <span className="font-semibold">même hors ligne.</span>
                    </h2>
                    <button type="button" onClick={focusLogin} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                        Se connecter
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
                <div className="lg:pl-16">
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Vous découvrez AuditRef</p>
                    <p className="mt-4 text-4xl tracking-[-0.03em]">
                        <span className="font-light text-slate-400">Un accès, une présentation,</span> <span className="font-semibold">une question ?</span>
                    </p>
                    <a href={ACCESS_MAILTO} className="mt-8 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-teal-300 ring-1 ring-inset ring-teal-300/40 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Demander un accès
                    </a>
                </div>
            </div>
            <p className="mt-20 text-center text-[11px] uppercase tracking-wider text-slate-500">
                AuditRef © {new Date().getFullYear()} · <a href="mailto:florent.perez@tisseo.fr?subject=Contact%20depuis%20AuditRef" className="text-teal-300 hover:underline">Contact</a> · 72 76
            </p>
        </section>
    </MotionConfig>
);

export default HomeAuditStory;
