// components/home/HomeHero.tsx
// Direction « Ligne » — premier écran. Composition éditoriale claire : le
// message, la ligne Terrain → Intervention (signature), et une mise en scène
// de deux VRAIS écrans (formulaire terrain, analyse des anomalies) reliés par
// le trajet d'un constat. Connexion des agents dans le bandeau, toujours visible.
import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, KeyRound, Mail, X } from 'lucide-react';
import { Logo } from '../Logo';
import { FRAME_BY_ID } from './auditStorySteps';
import { ShotCrop } from './ShotCrop';
import { HomeLoginForm, HomeLoginProps } from './HomeLoginForm';
import { LineDiagram } from './LineDiagram';

export const ACCESS_MAILTO = 'mailto:florent.perez@tisseo.fr?subject=Demande%20d%27acc%C3%A8s%20%C3%A0%20AuditRef';
const EASE = [0.22, 1, 0.36, 1] as const;

const anomalyShot = FRAME_BY_ID['04-anomalie'].mobile;
const priorityShot = FRAME_BY_ID['06-priorite'].desktop;

const HomeHero: React.FC<{ login: HomeLoginProps }> = ({ login }) => {
    const reduce = useReducedMotion();
    const [mobileLoginOpen, setMobileLoginOpen] = useState(false);

    return (
        <header className="relative overflow-hidden bg-white dark:bg-slate-950">
            {/* Bandeau : identité + accès agents. */}
            <div className="border-b border-slate-200 dark:border-slate-800">
                <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-6 px-5 py-3 sm:px-8 xl:px-12">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 ring-1 ring-teal-600/25 dark:bg-teal-900/30">
                            <Logo className="h-5 w-5" />
                        </span>
                        <span className="leading-tight">
                            <span className="block text-base font-bold tracking-tight text-slate-950 dark:text-white">AuditRef</span>
                            <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:block dark:text-slate-400">Signalétique Information Voyageur</span>
                        </span>
                    </div>
                    <div className="hidden items-center gap-3 md:flex">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Accès agents</span>
                        <HomeLoginForm login={login} layout="bar" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileLoginOpen((v) => !v)}
                        aria-expanded={mobileLoginOpen}
                        aria-controls="acces-agents-mobile"
                        className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white md:hidden"
                    >
                        {mobileLoginOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
                        Se connecter
                    </button>
                </div>
                {mobileLoginOpen && (
                    <div id="acces-agents-mobile" className="border-t border-slate-200 px-5 py-4 md:hidden dark:border-slate-800">
                        <HomeLoginForm login={login} layout="panel" />
                    </div>
                )}
            </div>

            <div className="mx-auto grid max-w-[88rem] gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-20 lg:pt-16 xl:px-12">
                <div className="lg:col-span-5">
                    <p className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white dark:bg-white dark:text-slate-950">
                        Auditer · Contrôler · Valoriser
                    </p>
                    <h1 className="mt-6 text-[clamp(2.75rem,6vw,5.25rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-slate-950 dark:text-white">
                        Du terrain
                        <br />
                        à la <span className="text-teal-700 dark:text-teal-400">décision.</span>
                    </h1>
                    <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                        AuditRef transforme chaque constat relevé en station en intervention priorisée. Hors ligne, au fil du contrôle.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <a
                            href="#temps-terrain"
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                        >
                            Suivre un audit
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </a>
                        <a
                            href={ACCESS_MAILTO}
                            className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-teal-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300"
                        >
                            <Mail className="h-4 w-4" aria-hidden="true" />
                            Demander un accès
                        </a>
                    </div>
                </div>

                {/* Mise en scène : un constat (écran terrain) devient une priorité (cockpit). */}
                <figure className="relative lg:col-span-7">
                    <div className="relative aspect-[1.12]">
                        <motion.div
                            className="absolute right-0 top-0 w-[70%] overflow-hidden rounded-2xl bg-white shadow-[0_40px_90px_-30px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10"
                            initial={reduce ? false : { opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: EASE }}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-[11px] font-medium text-slate-500">
                                <span>Cockpit · Analyse des anomalies</span>
                                <span className="font-mono">ARE · DAT 01</span>
                            </div>
                            <ShotCrop shot={priorityShot} rect={{ x: 0, y: 14, w: 56, h: 86 }} alt="Analyse des anomalies : repère 9 classé urgent, repère 6 à planifier." eager />
                        </motion.div>
                        <motion.div
                            className="absolute bottom-0 left-0 w-[31%] overflow-hidden rounded-[1.75rem] bg-slate-950 p-1.5 shadow-[0_40px_80px_-24px_rgba(15,23,42,0.6)]"
                            initial={reduce ? false : { opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
                        >
                            <img
                                src={anomalyShot.src}
                                width={anomalyShot.width}
                                height={anomalyShot.height}
                                alt="Formulaire d'audit sur téléphone : repère 6 marqué « À remplacer »."
                                className="block w-full rounded-[1.35rem]"
                                loading="eager"
                            />
                        </motion.div>

                        {/* Trajet du constat : du repère qualifié sur le terrain à sa priorité. */}
                        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <motion.path
                                d="M 27 61 C 45 61, 55 74, 71 74"
                                fill="none"
                                stroke="#0f766e"
                                strokeWidth="0.5"
                                strokeDasharray="1.4 1.2"
                                vectorEffect="non-scaling-stroke"
                                style={{ strokeWidth: 2 }}
                                initial={reduce ? false : { pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.9, delay: 0.8, ease: EASE }}
                            />
                        </svg>
                        <motion.span
                            className="absolute left-[14%] top-[57%] hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-lg ring-1 ring-amber-300"
                            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                        >
                            Constat · À remplacer
                        </motion.span>
                        <motion.span
                            className="absolute left-[71%] top-[71%] hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
                            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 1.6 }}
                        >
                            Priorité · À planifier
                        </motion.span>
                    </div>
                    <figcaption className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        Écrans réels de l'application · station Arènes, DAT 01.
                    </figcaption>
                </figure>
            </div>

            <div className="mx-auto max-w-[88rem] px-5 pb-12 sm:px-8 xl:px-12">
                <div className="rounded-2xl border border-slate-200 px-4 pb-4 pt-5 dark:border-slate-800 sm:px-8">
                    <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Le trajet d'un constat
                    </p>
                    <LineDiagram interactive />
                </div>
            </div>
        </header>
    );
};

export default HomeHero;
