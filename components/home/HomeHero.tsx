// components/home/HomeHero.tsx
// Direction « Vue éclatée » — premier écran. Scène sombre, trame technique,
// typographie à fort contraste de graisse ; le produit présenté comme un
// objet : trois VRAIS écrans en couches (terrain → cockpit → intervention).
// Accès agents dans un panneau dédié de la scène, toujours visible.
import React from 'react';
import { ArrowDown, Mail } from 'lucide-react';
import { Logo } from '../Logo';
import { HomeLoginForm, HomeLoginProps } from './HomeLoginForm';
import { ExplodedStack, LAYERS } from './ExplodedStack';

export const ACCESS_MAILTO = 'mailto:florent.perez@tisseo.fr?subject=Demande%20d%27acc%C3%A8s%20%C3%A0%20AuditRef';
/** Trame technique (fond des scènes sombres) : lignes fines, aucun dégradé décoratif. */
export const BLUEPRINT: React.CSSProperties = {
    backgroundImage:
        'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
    backgroundSize: '56px 56px',
};

const HomeHero: React.FC<{ login: HomeLoginProps }> = ({ login }) => (
    <header className="relative overflow-hidden bg-slate-950 text-white" style={BLUEPRINT}>
        <nav className="mx-auto flex max-w-[88rem] items-center justify-between px-5 py-5 sm:px-8 xl:px-12" aria-label="Accès">
            <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/15">
                    <Logo className="h-5 w-5 [&_path]:text-teal-300" />
                </span>
                <span className="text-base font-semibold tracking-tight">AuditRef</span>
            </span>
            <a href="#acces-agents" className="rounded-full px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/20 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                Accès agents
            </a>
        </nav>

        <div className="mx-auto grid max-w-[88rem] gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pb-28 lg:pt-14 xl:px-12">
            <div className="lg:col-span-5">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-teal-300">Signalétique Information Voyageur</p>
                <h1 className="mt-6 text-[clamp(2.6rem,4.6vw,4.25rem)] leading-[1] tracking-[-0.035em]">
                    <span className="font-light text-slate-300">Un constat terrain</span>
                    <br />
                    <span className="font-semibold">devient une décision.</span>
                </h1>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-400">
                    AuditRef relie ce que l'agent relève en station à ce que l'équipe doit faire : qualifié, priorisé, prêt pour l'intervention.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <a href="#temps-terrain" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
                        Découvrir un audit
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <a href={ACCESS_MAILTO} className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-teal-300 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Demander un accès
                    </a>
                </div>

                <div id="acces-agents" className="mt-12 max-w-sm scroll-mt-6 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
                    <p className="mb-3 text-sm font-semibold">Accès agents</p>
                    <HomeLoginForm login={login} layout="panel" tone="dark" />
                </div>
            </div>

            <figure className="lg:col-span-7">
                {/* Desktop : la pile en vue éclatée. Mobile : les trois écrans en cascade, à plat. */}
                <div className="hidden pr-0 sm:block lg:pr-4">
                    <ExplodedStack animateIn />
                </div>
                <div className="relative mx-auto max-w-sm sm:hidden">
                    {LAYERS.map((layer, i) => (
                        <div key={layer.id} className={`overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/20 ${i > 0 ? '-mt-[38%]' : ''}`} style={{ marginLeft: `${i * 8}%`, marginRight: `${(2 - i) * 8}%` }}>
                            <img src={layer.shot.src} alt={layer.alt} loading="eager" className="block w-full" />
                        </div>
                    ))}
                </div>
                <figcaption className="mt-6 text-xs text-slate-500 sm:mt-28">Écrans réels de l'application · un même contrôle, de la station à l'intervention.</figcaption>
            </figure>
        </div>
    </header>
);

export default HomeHero;
