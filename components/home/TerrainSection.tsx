// components/home/TerrainSection.tsx
// Temps 01 : situer le contexte. Un panneau de station
// (données réelles : lignes et modules d'Arènes dans le référentiel de l'app),
// les deux gestes du terrain sur de vrais écrans, et l'échelle du périmètre.
import React, { useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { CategoryIcon } from '../CategoryIcon';
import { getModuleLineConfig } from '../../data/builder';
import { isModuleInCurrentScope } from '../../utils/moduleScope';
import type { AuditCategoryConfig } from '../../types';
import { FRAME_BY_ID } from './auditStorySteps';
import { useNetworkFigures } from './HomeNetworkScale';
import { Callout, Cartouche, CropMarks, EASE_IN_OUT, Reveal, SHADOW, SURFACE, SectionHeading, useParallax } from './editorial';

const STATION = 'Arènes';
const lieuShot = FRAME_BY_ID['01-lieu'].mobile;
const moduleShot = FRAME_BY_ID['02-module'].mobile;

const Phone: React.FC<{ src: string; width: number; height: number; alt: string; className?: string }> = ({ src, width, height, alt, className = '' }) => (
    <div className={`overflow-hidden rounded-[1.75rem] bg-slate-950 p-1.5 ${SHADOW.float} ${className}`}>
        <img src={src} width={width} height={height} alt={alt} loading="lazy" decoding="async" className="block w-full rounded-[1.35rem]" />
    </div>
);

const TerrainSection: React.FC = () => {
    const { lieux, figures, ready } = useNetworkFigures();
    const figureRef = useRef<HTMLElement>(null);
    // Trois plans à trois vitesses : la plaque au premier plan, puis les deux écrans.
    const phoneA = useParallax(figureRef, 16);
    const phoneB = useParallax(figureRef, 40);
    const plateY = useParallax(figureRef, -36);

    // Le lieu tel que le référentiel de l'app le décrit : ses lignes, ses modules.
    const station = useMemo(() => {
        const lieu = lieux.find((l) => l.name === STATION);
        if (!lieu) return null;
        const modules = lieu.modules.filter(isModuleInCurrentScope);
        const lines = new Map<string, AuditCategoryConfig>();
        modules.forEach((m) => {
            const config = getModuleLineConfig(m);
            if (config) lines.set(config.key, config);
        });
        return { modules: modules.length, lines: [...lines.values()] };
    }, [lieux]);

    return (
        <section id="temps-terrain" aria-labelledby="temps-terrain-title" className={`relative scroll-mt-4 overflow-hidden py-16 sm:py-24 lg:py-28 ${SURFACE.mist}`}>
            <div className="mx-auto max-w-[88rem] px-5 sm:px-8 xl:px-12">
                <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
                    <div className="lg:col-span-5">
                        <SectionHeading id="temps-terrain-title" index="01 · TERRAIN" light="Sur le terrain," strong="même sans réseau." />
                        <Reveal delay={0.3}>
                            <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                                En station, l'agent retrouve le lieu, ouvre l'équipement à contrôler et déroule ses repères.
                            </p>
                        </Reveal>
                        {/* Périmètre : calculé depuis le référentiel de l'application. */}
                        <motion.dl
                            className="mt-10 grid max-w-md grid-cols-4 gap-3 border-t border-slate-900/10 pt-5 dark:border-white/10 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-6"
                            initial="hidden"
                            whileInView="shown"
                            viewport={{ once: true, amount: 0.6 }}
                            transition={{ staggerChildren: 0.1 }}
                        >
                            {figures.map(({ value, label }) => (
                                <motion.div
                                    key={label}
                                    className="flex flex-col-reverse"
                                    variants={{ hidden: { opacity: 0, y: 16 }, shown: { opacity: 1, y: 0 } }}
                                    transition={{ duration: 0.7, ease: EASE_IN_OUT }}
                                >
                                    <dt className="mt-1 text-[11px] leading-tight text-slate-600 sm:text-sm dark:text-slate-400">{label}</dt>
                                    <dd className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-950 sm:text-4xl dark:text-white">{ready ? value : '—'}</dd>
                                </motion.div>
                            ))}
                        </motion.dl>
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Périmètre suivi dans AuditRef, calculé depuis le référentiel de l'application.</p>
                    </div>

                    <figure ref={figureRef} className="relative lg:col-span-7">
                        <div className="relative mx-auto max-w-[22rem] pb-10 sm:max-w-xl sm:pb-14">
                            <CropMarks />
                            <div className="grid grid-cols-2 items-start gap-4 sm:gap-10">
                                <motion.div style={{ y: phoneA }}>
                                    <Reveal y={48}>
                                        <p className="mb-3"><Callout n={1}>Retrouver le lieu</Callout></p>
                                        <Phone {...lieuShot} alt={FRAME_BY_ID['01-lieu'].alt} />
                                    </Reveal>
                                </motion.div>
                                <motion.div style={{ y: phoneB }} className="pt-14 sm:pt-24">
                                    <Reveal y={48} delay={0.15}>
                                        <p className="mb-3"><Callout n={2}>Ouvrir le module</Callout></p>
                                        <Phone {...moduleShot} alt={FRAME_BY_ID['02-module'].alt} />
                                    </Reveal>
                                </motion.div>
                            </div>

                            {/* Plaque de station : composition promotionnelle, données du référentiel. */}
                            <motion.div style={{ y: plateY }} className="absolute bottom-0 left-[-3%] w-[64%] sm:left-[-6%] sm:w-[50%]">
                                <Reveal y={40} delay={0.3}>
                                    <div className={`rounded-2xl bg-slate-950 p-4 text-white ring-1 ring-white/10 sm:p-6 ${SHADOW.front}`}>
                                        <div className="flex items-center gap-2">
                                            {station?.lines.map((config) => <CategoryIcon key={config.key} categoryConfig={config} size="md" asDiv />)}
                                        </div>
                                        <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:mt-4 sm:text-5xl">{STATION}</p>
                                        <div className="mt-3 flex items-baseline justify-between border-t border-white/15 pt-3 text-xs sm:mt-4 sm:text-sm">
                                            <span className="text-slate-300">Modules à auditer</span>
                                            <span className="text-xl font-semibold tabular-nums sm:text-2xl">{station ? station.modules : '—'}</span>
                                        </div>
                                    </div>
                                </Reveal>
                            </motion.div>
                        </div>
                        <figcaption className="mt-6 flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>Écrans réels de l'application, sur téléphone · plaque de station composée pour la page.</span>
                            <Cartouche className="hidden sm:block">Pl. 01 · Terrain</Cartouche>
                        </figcaption>
                    </figure>
                </div>
            </div>
        </section>
    );
};

export default TerrainSection;
