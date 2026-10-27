// components/home/HomeHero.tsx
// Premier écran. Composition éditoriale claire : un titre à contraste de
// graisse, la ligne Terrain → Intervention (signature), et deux VRAIS écrans
// superposés — le téléphone posé sur la zone vide du cockpit — dont le même
// repère est annoté. Connexion des agents dans le bandeau, toujours visible.
import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, KeyRound, Mail, X } from 'lucide-react';
import { Logo } from '../Logo';
import { FRAME_BY_ID } from './auditStorySteps';
import { ShotCrop } from './ShotCrop';
import { HomeLoginForm, HomeLoginProps } from './HomeLoginForm';
import { LineDiagram } from './LineDiagram';
import { Callout, EASE } from './editorial';

export const ACCESS_MAILTO = 'mailto:florent.perez@tisseo.fr?subject=Demande%20d%27acc%C3%A8s%20%C3%A0%20AuditRef';

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

            <div className="mx-auto grid max-w-[88rem] gap-10 px-5 pb-10 pt-10 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pb-12 lg:pt-14 xl:px-12">
                <div className="lg:col-span-5">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-400">
                        Auditer · Contrôler · Valoriser
                    </p>
                    <h1 className="mt-5 text-[clamp(2.9rem,4.9vw,5rem)] leading-[0.96] tracking-[-0.045em]">
                        <span className="block font-light text-slate-400 dark:text-slate-500">Du terrain</span>
                        <span className="block font-semibold text-slate-950 dark:text-white">
                            à la <span className="text-teal-700 dark:text-teal-400">décision.</span>
                        </span>
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

                {/* Mise en scène : le constat relevé sur le terrain (téléphone) devient une priorité (cockpit). */}
                <figure className="relative lg:col-span-7">
                    <div className="relative aspect-[1.06] sm:aspect-[1.3]">
                        {/* Profondeur : un plan en retrait sous le cockpit, rien de plus. */}
                        <div aria-hidden="true" className="absolute left-[3%] top-[6%] h-[80%] w-[78%] rounded-2xl bg-slate-100 ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/5" />
                        <motion.div
                            className="absolute left-0 top-0 w-[80%] rounded-2xl bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04),0_40px_90px_-30px_rgba(15,23,42,0.42)] ring-1 ring-slate-900/10 sm:w-[76%]"
                            initial={reduce ? false : { opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, ease: EASE }}
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-[11px] font-medium text-slate-500">
                                <span>Cockpit · Analyse des anomalies</span>
                                <span className="hidden font-mono sm:inline">ARE · DAT 01</span>
                            </div>
                            <div className="relative overflow-hidden rounded-b-2xl">
                                <ShotCrop shot={priorityShot} rect={{ x: 0, y: 14, w: 56, h: 86 }} alt="Analyse des anomalies : repère 9 classé urgent, repère 6 à planifier." eager />
                            </div>
                            {/* Repère 6 dans le cockpit : la priorité calculée. */}
                            <motion.span
                                aria-hidden="true"
                                className="pointer-events-none absolute left-[4.3%] top-[74.6%] h-[24.6%] w-[56%] rounded-xl ring-2 ring-teal-600"
                                initial={reduce ? false : { opacity: 0, scale: 1.08 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.45, delay: 1.1, ease: EASE }}
                            >
                                <span className="absolute left-full top-1/2 hidden -translate-y-1/2 items-center sm:flex">
                                    <span className="h-px w-5 bg-teal-600" />
                                    <Callout n={2} tone="ink">Priorité · À planifier</Callout>
                                </span>
                            </motion.span>
                        </motion.div>
                        <motion.div
                            className="absolute bottom-0 right-0 w-[36%] sm:w-[31%]"
                            initial={reduce ? false : { opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
                        >
                            <span className="absolute -top-9 right-1 hidden items-center sm:flex">
                                <Callout n={1}>Constat · À remplacer</Callout>
                            </span>
                            <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-1.5 shadow-[0_40px_80px_-24px_rgba(15,23,42,0.6)]">
                                <img
                                    src={anomalyShot.src}
                                    width={anomalyShot.width}
                                    height={anomalyShot.height}
                                    alt="Formulaire d'audit sur téléphone : repère 6 marqué « À remplacer »."
                                    className="block w-full rounded-[1.35rem]"
                                    loading="eager"
                                />
                                {/* Repère 6 sur le terrain : le constat. */}
                                <motion.span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-x-2 top-[30%] h-[40%] rounded-lg ring-2 ring-amber-500"
                                    initial={reduce ? false : { opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.45, delay: 0.7 }}
                                />
                            </div>
                        </motion.div>
                    </div>
                    <figcaption className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        Écrans réels de l'application · station Arènes, DAT 01 · annotations ajoutées.
                    </figcaption>
                </figure>
            </div>

            {/* Signature : le trajet d'un constat, dessiné comme une ligne du réseau. */}
            <div className="mx-auto max-w-[88rem] px-5 pb-10 sm:px-8 lg:pb-12 xl:px-12">
                <div className="grid items-start gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 lg:grid-cols-12 lg:gap-8">
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 lg:col-span-2 lg:pt-1.5 dark:text-slate-400">
                        Le trajet d'un constat
                    </p>
                    <LineDiagram interactive className="lg:col-span-10" />
                </div>
            </div>
        </header>
    );
};

export default HomeHero;
