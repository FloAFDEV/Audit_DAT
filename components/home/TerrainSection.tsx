// components/home/TerrainSection.tsx
// Direction « Vue éclatée » — temps 01, en atelier clair. Les trois gestes du
// terrain en éventail de VRAIS écrans mobiles, et l'échelle du périmètre dite
// en une phrase (chiffres calculés depuis le référentiel de l'app).
import React from 'react';
import { FRAME_BY_ID } from './auditStorySteps';
import { useNetworkFigures } from './HomeNetworkScale';

const PHONES = [
    { frame: FRAME_BY_ID['01-lieu'], step: '1', label: 'Retrouver le lieu', tilt: -6, lift: 28 },
    { frame: FRAME_BY_ID['02-module'], step: '2', label: 'Ouvrir le module', tilt: 0, lift: 0 },
    { frame: FRAME_BY_ID['04-anomalie'], step: '3', label: 'Contrôler les repères', tilt: 6, lift: 28 },
];

const TerrainSection: React.FC = () => {
    const { figures, ready } = useNetworkFigures();
    const [stations, dat, eca, pr] = figures.map((f) => (ready ? f.value : '—'));

    return (
        <section id="temps-terrain" aria-labelledby="temps-terrain-title" className="scroll-mt-4 bg-stone-50 py-24 text-slate-950 dark:bg-slate-900 dark:text-white lg:py-32">
            <div className="mx-auto max-w-[88rem] px-5 sm:px-8 xl:px-12">
                <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
                    <div className="lg:col-span-7">
                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400">01</p>
                    <h2 id="temps-terrain-title" className="mt-3 text-[clamp(2.5rem,5vw,4.5rem)] leading-[1] tracking-[-0.035em]">
                        <span className="font-light text-slate-500 dark:text-slate-400">Sur le terrain,</span>
                        <br />
                        <span className="font-semibold">trois gestes.</span>
                    </h2>
                    </div>
                    <p className="max-w-md text-lg leading-relaxed text-slate-600 lg:col-span-5 dark:text-slate-300">
                        En station, l'agent retrouve le lieu, ouvre l'équipement à contrôler et passe ses repères en revue. Même sans réseau.
                    </p>
                </div>

                <figure className="mt-16">
                    <ol className="mx-auto grid max-w-5xl grid-cols-3 items-start gap-3 sm:gap-8">
                        {PHONES.map(({ frame, step, label, tilt, lift }) => (
                            <li key={frame.id} className="flex flex-col items-center">
                                <div
                                    className="w-full overflow-hidden rounded-[1.25rem] bg-slate-950 p-1 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.55)] sm:rounded-[2rem] sm:p-1.5"
                                    style={{ transform: `translateY(${lift}px) rotate(${tilt}deg)` }}
                                >
                                    <img src={frame.mobile.src} width={frame.mobile.width} height={frame.mobile.height} alt={frame.alt} loading="lazy" decoding="async" className="block w-full rounded-[1rem] sm:rounded-[1.6rem]" />
                                </div>
                                <p className="mt-12 flex items-center gap-2 text-xs font-semibold sm:text-sm">
                                    <span className="font-mono text-teal-700 dark:text-teal-400">{step}</span>
                                    {label}
                                </p>
                            </li>
                        ))}
                    </ol>
                    <figcaption className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">Écrans réels de l'application, sur téléphone.</figcaption>
                </figure>

                <p className="mx-auto mt-24 max-w-4xl text-center text-[clamp(1.5rem,3vw,2.5rem)] font-light leading-snug tracking-[-0.02em] text-slate-600 dark:text-slate-300">
                    AuditRef suit <strong className="font-semibold text-slate-950 dark:text-white">{stations} stations</strong>,{' '}
                    <strong className="font-semibold text-slate-950 dark:text-white">{dat} distributeurs</strong>,{' '}
                    <strong className="font-semibold text-slate-950 dark:text-white">{eca} valideurs</strong> et{' '}
                    <strong className="font-semibold text-slate-950 dark:text-white">{pr} parcs relais</strong>, chacun avec ses propres repères.
                </p>
                <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">Chiffres calculés depuis le référentiel de l'application.</p>
            </div>
        </section>
    );
};

export default TerrainSection;
