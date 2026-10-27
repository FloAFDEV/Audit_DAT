// components/home/ControleSection.tsx
// Temps 02 : l'observation et la qualification d'un constat réel. Une
// « fiche repère » annotée comme un dessin technique — visuel, cotes,
// emplacement et qualification sont ceux du référentiel de l'app — où le
// geste de qualification se produit sous les yeux ; l'écran réel
// correspondant est posé en médaillon.
import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { AlertTriangle, CheckCircle2, MapPin, XCircle } from 'lucide-react';
import { FRAME_BY_ID } from './auditStorySteps';
import { DEMO_ADHESIVES, repereInfo } from './auditOutcome';
import { ShotCrop } from './ShotCrop';
import { EASE, SectionHeading, SpecLabel } from './editorial';

const FRONT = repereInfo(DEMO_ADHESIVES[5]); // repère 6 — à remplacer
const BACK = repereInfo(DEMO_ADHESIVES[8]);  // repère 9 — absent
const formShot = FRAME_BY_ID['04-anomalie'].desktop;

/** « 20,5x16cm » → ['20,5 cm', '16 cm'] : les cotes du dessin. */
const [DIM_W, DIM_H] = (FRONT.dimensions ?? '').replace(/cm$/i, '').split(/x/i).map((v) => (v ? `${v.trim()} cm` : undefined));

const STATUS_TOKENS = [
    { key: 'ok', label: 'OK', Icon: CheckCircle2, idle: 'text-teal-700 ring-teal-500', on: 'bg-teal-700 text-white ring-teal-700' },
    { key: 'absent', label: 'Absent', Icon: XCircle, idle: 'text-red-700 ring-red-500', on: 'bg-red-600 text-white ring-red-600' },
    { key: 'remplacer', label: 'À remplacer', Icon: AlertTriangle, idle: 'text-amber-700 ring-amber-500', on: 'bg-amber-700 text-white ring-amber-700' },
] as const;

/** Cote de dessin technique : trait fin, butées, valeur. */
const Dimension: React.FC<{ value?: string; axis: 'x' | 'y' }> = ({ value, axis }) => {
    if (!value) return null;
    return axis === 'x' ? (
        <span aria-hidden="true" className="absolute -bottom-7 left-0 right-0 flex items-center">
            <span className="h-2.5 w-px bg-slate-400" />
            <span className="h-px flex-1 bg-slate-400" />
            <span className="mx-2 font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">{value}</span>
            <span className="h-px flex-1 bg-slate-400" />
            <span className="h-2.5 w-px bg-slate-400" />
        </span>
    ) : (
        <span aria-hidden="true" className="absolute -right-7 bottom-0 top-0 flex flex-col items-center">
            <span className="h-px w-2.5 bg-slate-400" />
            <span className="w-px flex-1 bg-slate-400" />
            <span className="my-2 font-mono text-[11px] font-medium text-slate-600 [writing-mode:vertical-rl] dark:text-slate-300">{value}</span>
            <span className="w-px flex-1 bg-slate-400" />
            <span className="h-px w-2.5 bg-slate-400" />
        </span>
    );
};

const ControleSection: React.FC = () => {
    const reduce = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    // Le geste : la fiche arrive neutre, puis le repère est qualifié « À remplacer ».
    const [qualified, setQualified] = useState(!!reduce);
    useEffect(() => {
        if (!inView || qualified) return;
        const t = window.setTimeout(() => setQualified(true), 700);
        return () => window.clearTimeout(t);
    }, [inView, qualified]);

    return (
        <section id="temps-controle" aria-labelledby="temps-controle-title" className="scroll-mt-4 bg-slate-50 py-16 dark:bg-slate-900 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-[88rem] px-5 sm:px-8 xl:px-12">
                <div className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-10">
                    <SectionHeading id="temps-controle-title" index="02 · CONSTAT" light="Observer," strong="puis qualifier." className="lg:col-span-7" />
                    <p className="max-w-md text-lg leading-relaxed text-slate-600 lg:col-span-5 dark:text-slate-300">
                        Chaque repère attendu arrive avec son visuel, ses dimensions et son emplacement. OK, Absent ou À remplacer : un geste suffit.
                    </p>
                </div>

                <figure ref={ref} className="relative mx-auto mt-12 max-w-5xl lg:mt-16">
                    <div className="relative pt-8 sm:pt-12">
                        {/* Second constat, en retrait : il y en a toujours plus d'un. */}
                        <div aria-hidden="true" className="absolute right-0 top-0 hidden w-[56%] rounded-2xl bg-white px-6 pb-16 pt-4 shadow-lg ring-1 ring-slate-900/5 sm:block dark:bg-slate-800 dark:ring-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <span className="truncate text-sm text-slate-600 dark:text-slate-300"><span className="font-mono text-slate-500">{BACK.number}</span> · {BACK.title}</span>
                                <span className="flex-shrink-0 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">Absent</span>
                            </div>
                        </div>

                        <div className="relative rounded-3xl bg-white p-5 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_40px_90px_-36px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5 sm:p-10 dark:bg-slate-800 dark:ring-white/10">
                            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-700">
                                <p className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">FICHE REPÈRE · DAT 01 · ARÈNES</p>
                                <p className="font-mono text-xs text-slate-400">{FRONT.number}</p>
                            </div>
                            <div className="mt-6 grid gap-8 sm:mt-8 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:gap-12">
                                {/* Le dessin : visuel de référence et ses cotes. */}
                                <div>
                                    <SpecLabel n={1}>Visuel de référence</SpecLabel>
                                    <div className="mt-4 flex justify-center rounded-2xl bg-slate-50 px-6 pb-12 pt-6 sm:pb-14 sm:pt-8 dark:bg-slate-900">
                                        {FRONT.visual && (
                                            <span className="relative mr-7 inline-block">
                                                <img src={FRONT.visual} alt={`Visuel de référence : ${FRONT.title}`} loading="lazy" className="block max-h-36 w-auto sm:max-h-52" />
                                                <Dimension value={DIM_W} axis="x" />
                                                <Dimension value={DIM_H} axis="y" />
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <p className="text-2xl font-semibold leading-snug tracking-[-0.02em] text-slate-950 sm:text-3xl dark:text-white">{FRONT.title}</p>
                                    <dl className="mt-6 grid gap-5 text-sm">
                                        {FRONT.dimensions && (
                                            <div>
                                                <dt><SpecLabel n={2}>Dimensions attendues</SpecLabel></dt>
                                                <dd className="mt-1.5 font-medium text-slate-800 dark:text-slate-200">{DIM_W && DIM_H ? `${DIM_W} × ${DIM_H}` : FRONT.dimensions}</dd>
                                            </div>
                                        )}
                                        {FRONT.location && (
                                            <div>
                                                <dt><SpecLabel n={3}>Emplacement exact</SpecLabel></dt>
                                                <dd className="mt-1.5 flex items-start gap-2 text-slate-600 dark:text-slate-300"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />{FRONT.location}</dd>
                                            </div>
                                        )}
                                    </dl>
                                    <div className="mt-6 sm:mt-auto sm:pt-6">
                                        <SpecLabel n={4}>Qualification</SpecLabel>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {STATUS_TOKENS.map(({ key, label, Icon, idle, on }) => {
                                                const active = qualified && key === 'remplacer';
                                                return (
                                                    <span key={key} className="relative">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors duration-300 ${active ? on : `bg-white dark:bg-slate-800 ${idle}`}`}>
                                                            <Icon className="h-4 w-4" aria-hidden="true" />
                                                            {label}
                                                        </span>
                                                        {key === 'remplacer' && (
                                                            <motion.span
                                                                aria-hidden="true"
                                                                className="pointer-events-none absolute -inset-1.5 rounded-lg ring-2 ring-teal-600"
                                                                initial={false}
                                                                animate={{ opacity: qualified ? 1 : 0, scale: qualified ? 1 : 1.2 }}
                                                                transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                                                            />
                                                        )}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <p className="sr-only">Repère qualifié « À remplacer ».</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Médaillon : la même ligne, dans le vrai formulaire. */}
                        <div className="relative -mt-4 ml-auto mr-3 w-[min(28rem,92%)] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:-mt-8 sm:mr-8">
                            <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-500">Écran réel · formulaire d'audit</p>
                            <ShotCrop shot={formShot} rect={{ x: 2.3, y: 10.5, w: 95.3, h: 26.4 }} alt="Ligne du repère 6 dans le formulaire d'audit, qualifiée « À remplacer »." />
                        </div>
                    </div>
                    <figcaption className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                        Fiche composée pour la page à partir du référentiel de l'application (visuel, cotes, emplacement) ; médaillon : écran réel.
                    </figcaption>
                </figure>
            </div>
        </section>
    );
};

export default ControleSection;
