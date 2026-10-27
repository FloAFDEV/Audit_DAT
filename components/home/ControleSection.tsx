// components/home/ControleSection.tsx
// Direction « Ligne » — temps 02 : l'observation et la qualification. Une
// « fiche repère » éditoriale (libellés, dimensions, emplacement et visuel
// RÉELS du référentiel) où le geste de qualification se produit sous les
// yeux ; l'écran réel correspondant est posé en médaillon.
import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { AlertTriangle, CheckCircle2, MapPin, Ruler, XCircle } from 'lucide-react';
import { FRAME_BY_ID } from './auditStorySteps';
import { DEMO_ADHESIVES, repereInfo } from './auditOutcome';
import { ShotCrop } from './ShotCrop';
import { LineDiagram } from './LineDiagram';

const FRONT = repereInfo(DEMO_ADHESIVES[5]); // repère 6 — à remplacer
const BACK = repereInfo(DEMO_ADHESIVES[8]);  // repère 9 — absent
const formShot = FRAME_BY_ID['04-anomalie'].desktop;

const Marker: React.FC<{ n: number }> = ({ n }) => (
    <span aria-hidden="true" className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-700 font-mono text-[10px] font-bold text-white">{n}</span>
);

const STATUS_TOKENS = [
    { key: 'ok', label: 'OK', Icon: CheckCircle2, idle: 'text-teal-700 ring-teal-500', on: 'bg-teal-700 text-white ring-teal-700' },
    { key: 'absent', label: 'Absent', Icon: XCircle, idle: 'text-red-700 ring-red-500', on: 'bg-red-600 text-white ring-red-600' },
    { key: 'remplacer', label: 'À remplacer', Icon: AlertTriangle, idle: 'text-amber-700 ring-amber-500', on: 'bg-amber-700 text-white ring-amber-700' },
] as const;

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
        <section id="temps-controle" aria-labelledby="temps-controle-title" className="scroll-mt-4 bg-slate-50 py-24 dark:bg-slate-900 lg:py-32">
            <div className="mx-auto max-w-[88rem] px-5 sm:px-8 xl:px-12">
                <LineDiagram reached={2} size="sm" className="max-w-xl" />

                <div className="mt-14 grid gap-14 lg:grid-cols-12 lg:items-center">
                    <div className="lg:col-span-4">
                        <p className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-400">02</p>
                        <h2 id="temps-controle-title" className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl dark:text-white">
                            Contrôler et qualifier
                        </h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                            Chaque repère attendu arrive avec son visuel, ses dimensions et son emplacement. Un geste suffit à le qualifier.
                        </p>
                        <ol className="mt-8 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                            <li className="flex items-center gap-3"><Marker n={1} />Le visuel de référence</li>
                            <li className="flex items-center gap-3"><Marker n={2} />Les dimensions attendues</li>
                            <li className="flex items-center gap-3"><Marker n={3} />L'emplacement exact</li>
                            <li className="flex items-center gap-3"><Marker n={4} />La qualification : OK, Absent ou À remplacer</li>
                        </ol>
                    </div>

                    <figure ref={ref} className="relative lg:col-span-8">
                        <div className="relative pr-0 pt-10 sm:pr-10">
                            {/* Second constat, en retrait : il y en a toujours plus d'un. */}
                            <div aria-hidden="true" className="absolute right-0 top-0 hidden w-[62%] rounded-2xl bg-white p-5 opacity-70 shadow-lg ring-1 ring-slate-900/5 sm:block dark:bg-slate-800">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs text-slate-500">{BACK.number}</span>
                                    <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase text-white">Absent</span>
                                </div>
                                <p className="mt-2 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{BACK.title}</p>
                            </div>

                            <div className="relative rounded-3xl bg-white p-6 shadow-[0_40px_90px_-36px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5 sm:p-8 dark:bg-slate-800 dark:ring-white/10">
                                <div className="grid gap-8 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] sm:items-center">
                                    <div className="relative rounded-2xl bg-slate-50 p-6 dark:bg-slate-900">
                                        <span className="absolute left-3 top-3"><Marker n={1} /></span>
                                        {FRONT.visual && <img src={FRONT.visual} alt={`Visuel de référence : ${FRONT.title}`} loading="lazy" className="mx-auto max-h-56 w-auto object-contain" />}
                                    </div>
                                    <div>
                                        <p className="font-mono text-sm font-semibold text-slate-500 dark:text-slate-400">{FRONT.number} · DAT 01 · Arènes</p>
                                        <p className="mt-2 text-2xl font-semibold leading-snug tracking-[-0.02em] text-slate-950 sm:text-3xl dark:text-white">{FRONT.title}</p>
                                        <dl className="mt-5 space-y-3 text-sm">
                                            {FRONT.dimensions && (
                                                <div className="flex items-start gap-3"><Marker n={2} /><Ruler className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Dimensions</dt><dd className="font-medium text-slate-800 dark:text-slate-200">{FRONT.dimensions}</dd></div>
                                            )}
                                            {FRONT.location && (
                                                <div className="flex items-start gap-3"><Marker n={3} /><MapPin className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" /><dt className="sr-only">Emplacement</dt><dd className="text-slate-600 dark:text-slate-300">{FRONT.location}</dd></div>
                                            )}
                                        </dl>
                                        <div className="mt-6 flex flex-wrap items-center gap-2">
                                            <Marker n={4} />
                                            {STATUS_TOKENS.map(({ key, label, Icon, idle, on }) => {
                                                const active = qualified && key === 'remplacer';
                                                return (
                                                    <motion.span
                                                        key={key}
                                                        animate={active && !reduce ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                                                        transition={{ duration: 0.35 }}
                                                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-colors duration-300 ${active ? on : `bg-white dark:bg-slate-800 ${idle}`}`}
                                                    >
                                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                                        {label}
                                                    </motion.span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Médaillon : la même ligne, dans le vrai formulaire. */}
                            <div className="relative -mt-6 ml-auto mr-4 w-[min(26rem,85%)] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:-mt-10">
                                <p className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-500">Écran réel · formulaire d'audit</p>
                                <ShotCrop shot={formShot} rect={{ x: 2.3, y: 10.5, w: 95.3, h: 26.4 }} alt="Ligne du repère 6 dans le formulaire d'audit, qualifiée « À remplacer »." />
                            </div>
                        </div>
                        <figcaption className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                            Fiche éditoriale composée à partir du référentiel de l'application ; médaillon : écran réel.
                        </figcaption>
                    </figure>
                </div>
            </div>
        </section>
    );
};

export default ControleSection;
