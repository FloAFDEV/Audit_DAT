// components/home/ControleSection.tsx
// Direction « Vue éclatée » — temps 02, le gros plan. La VRAIE ligne du
// formulaire, agrandie jusqu'à être lisible comme une affiche, annotée comme
// un dessin technique ; une loupe s'ouvre sur la qualification.
import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { FRAME_BY_ID } from './auditStorySteps';
import { ShotCrop } from './ShotCrop';

const formShot = FRAME_BY_ID['04-anomalie'].desktop;
const mobileShot = FRAME_BY_ID['04-anomalie'].mobile;
/** Ligne du repère 6 dans la capture (en %). */
const ROW = { x: 2.3, y: 10.5, w: 95.3, h: 26.4 };
/** Le bouton « À remplacer » dans la ligne agrandie (en %) : le geste. */
const GESTURE = { x: 82.5, y: 36, w: 15.5, h: 28 };

/** Annotations, positionnées en % de la ligne agrandie. */
const NOTES = [
    { n: 1, label: 'Visuel de référence', x: 6, y: 30, side: 'bottom' as const },
    { n: 2, label: 'Dimensions attendues', x: 15, y: 52, side: 'top' as const },
    { n: 3, label: 'Emplacement exact', x: 34, y: 82, side: 'bottom' as const },
    { n: 4, label: 'Un geste : la qualification', x: 85, y: 50, side: 'bottom' as const },
];

const ControleSection: React.FC = () => {
    const reduce = useReducedMotion();
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.4 });
    const shown = inView || !!reduce;

    return (
        <section id="temps-controle" aria-labelledby="temps-controle-title" className="scroll-mt-4 bg-white py-24 text-slate-950 dark:bg-slate-950 dark:text-white lg:py-32">
            <div className="mx-auto max-w-[88rem] px-5 sm:px-8 xl:px-12">
                <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-7">
                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400">02</p>
                    <h2 id="temps-controle-title" className="mt-3 text-[clamp(2.5rem,5vw,4.5rem)] leading-[1] tracking-[-0.035em]">
                        <span className="font-light text-slate-500 dark:text-slate-400">Observer, puis</span>
                        <br />
                        <span className="font-semibold">qualifier.</span>
                    </h2>
                    </div>
                    <p className="max-w-md text-lg leading-relaxed text-slate-600 lg:col-span-5 dark:text-slate-300">
                        Chaque repère arrive avec son visuel, ses dimensions et son emplacement. OK, Absent ou À remplacer : un geste suffit.
                    </p>
                </div>

                <figure ref={ref} className="relative mt-20">
                    <div className="relative">
                        <div className="hidden overflow-hidden rounded-2xl bg-white shadow-[0_40px_100px_-40px_rgba(15,23,42,0.5)] ring-1 ring-slate-900/10 sm:block">
                            <ShotCrop shot={formShot} rect={ROW} alt="Ligne du repère 6 dans le formulaire d'audit : visuel, dimensions, emplacement et qualification « À remplacer »." />
                        </div>
                        {/* Mobile : la même ligne, dans le vrai écran mobile (lisible à cette largeur). */}
                        <div className="mx-auto max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:hidden">
                            <ShotCrop shot={mobileShot} rect={{ x: 0, y: 29.6, w: 100, h: 40.7 }} alt="Ligne du repère 6 dans le formulaire d'audit sur téléphone, qualifiée « À remplacer »." />
                        </div>

                        {/* Annotations façon dessin technique (desktop). */}
                        <ol aria-hidden="true" className="hidden lg:block">
                            {NOTES.map((note, i) => (
                                <motion.li
                                    key={note.n}
                                    className="absolute flex flex-col items-center"
                                    style={{ left: `${note.x}%`, top: note.side === 'top' ? '-3.25rem' : 'auto', bottom: note.side === 'bottom' ? '-3.25rem' : 'auto', transform: 'translateX(-50%)' }}
                                    initial={false}
                                    animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : note.side === 'top' ? -6 : 6 }}
                                    transition={{ duration: 0.4, delay: shown && !reduce ? 0.2 + i * 0.15 : 0 }}
                                >
                                    {note.side === 'bottom' && <span className="mb-1 h-6 w-px bg-teal-700" />}
                                    <span className="whitespace-nowrap rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-950">
                                        <span className="mr-1.5 font-mono text-teal-300 dark:text-teal-700">{note.n}</span>{note.label}
                                    </span>
                                    {note.side === 'top' && <span className="mt-1 h-6 w-px bg-teal-700" />}
                                </motion.li>
                            ))}
                        </ol>

                        {/* Le geste : un anneau se pose sur la qualification. */}
                        <motion.span
                            aria-hidden="true"
                            className="pointer-events-none absolute hidden rounded-xl ring-4 ring-teal-600 sm:block shadow-[0_0_0_8px_rgba(13,148,136,0.15)]"
                            style={{ left: `${GESTURE.x}%`, top: `${GESTURE.y}%`, width: `${GESTURE.w}%`, height: `${GESTURE.h}%` }}
                            initial={false}
                            animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 1.25 }}
                            transition={{ duration: 0.45, delay: shown && !reduce ? 0.9 : 0, ease: [0.22, 1, 0.36, 1] }}
                        />
                    </div>
                    <figcaption className="mt-8 text-xs text-slate-500 lg:mt-20 dark:text-slate-400">
                        Écran réel du formulaire d'audit, agrandi : le repère 6 qualifié « À remplacer ».
                    </figcaption>
                </figure>
            </div>
        </section>
    );
};

export default ControleSection;
