// components/home/TerrainSection.tsx
// Temps 01 : situer le contexte. Un panneau de station
// (données réelles : lignes et modules d'Arènes dans le référentiel de l'app),
// les deux gestes du terrain sur de vrais écrans, et l'échelle du périmètre.
import React, { useMemo } from 'react';
import { CategoryIcon } from '../CategoryIcon';
import { getModuleLineConfig } from '../../data/builder';
import { isModuleInCurrentScope } from '../../utils/moduleScope';
import type { AuditCategoryConfig } from '../../types';
import { FRAME_BY_ID } from './auditStorySteps';
import { useNetworkFigures } from './HomeNetworkScale';
import { Callout, SectionHeading } from './editorial';

const STATION = 'Arènes';
const lieuShot = FRAME_BY_ID['01-lieu'].mobile;
const moduleShot = FRAME_BY_ID['02-module'].mobile;

const Phone: React.FC<{ src: string; width: number; height: number; alt: string; className?: string }> = ({ src, width, height, alt, className = '' }) => (
    <div className={`overflow-hidden rounded-[1.75rem] bg-slate-950 p-1.5 shadow-[0_30px_70px_-24px_rgba(15,23,42,0.55)] ${className}`}>
        <img src={src} width={width} height={height} alt={alt} loading="lazy" decoding="async" className="block w-full rounded-[1.35rem]" />
    </div>
);

const TerrainSection: React.FC = () => {
    const { lieux, figures, ready } = useNetworkFigures();

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
        <section id="temps-terrain" aria-labelledby="temps-terrain-title" className="scroll-mt-4 bg-white py-16 dark:bg-slate-950 sm:py-24 lg:py-28">
            <div className="mx-auto max-w-[88rem] px-5 sm:px-8 xl:px-12">
                <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
                    <div className="lg:col-span-5">
                        <SectionHeading id="temps-terrain-title" index="01 · TERRAIN" light="Sur le terrain," strong="même sans réseau." />
                        <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                            En station, l'agent retrouve le lieu, ouvre l'équipement à contrôler et déroule ses repères.
                        </p>
                        {/* Périmètre : calculé depuis le référentiel de l'application. */}
                        <dl className="mt-10 grid max-w-md grid-cols-4 gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-6">
                            {figures.map(({ value, label }) => (
                                <div key={label} className="flex flex-col-reverse">
                                    <dt className="mt-1 text-[11px] leading-tight text-slate-600 sm:text-sm dark:text-slate-400">{label}</dt>
                                    <dd className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-slate-950 sm:text-4xl dark:text-white">{ready ? value : '—'}</dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Périmètre suivi dans AuditRef, calculé depuis le référentiel de l'application.</p>
                    </div>

                    <figure className="relative lg:col-span-7">
                        <div className="relative mx-auto max-w-[22rem] pb-10 sm:max-w-xl sm:pb-14">
                            <div className="grid grid-cols-2 items-start gap-4 sm:gap-10">
                                <div>
                                    <p className="mb-3"><Callout n={1}>Retrouver le lieu</Callout></p>
                                    <Phone {...lieuShot} alt={FRAME_BY_ID['01-lieu'].alt} />
                                </div>
                                <div className="pt-14 sm:pt-24">
                                    <p className="mb-3"><Callout n={2}>Ouvrir le module</Callout></p>
                                    <Phone {...moduleShot} alt={FRAME_BY_ID['02-module'].alt} />
                                </div>
                            </div>

                            {/* Plaque de station : composition promotionnelle, données du référentiel. */}
                            <div className="absolute bottom-0 left-[-3%] w-[64%] rounded-2xl bg-slate-950 p-4 text-white shadow-[0_30px_60px_-24px_rgba(15,23,42,0.8)] ring-1 ring-white/10 sm:left-[-6%] sm:w-[50%] sm:p-6">
                                <div className="flex items-center gap-2">
                                    {station?.lines.map((config) => <CategoryIcon key={config.key} categoryConfig={config} size="md" asDiv />)}
                                </div>
                                <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:mt-4 sm:text-5xl">{STATION}</p>
                                <div className="mt-3 flex items-baseline justify-between border-t border-white/15 pt-3 text-xs sm:mt-4 sm:text-sm">
                                    <span className="text-slate-300">Modules à auditer</span>
                                    <span className="text-xl font-semibold tabular-nums sm:text-2xl">{station ? station.modules : '—'}</span>
                                </div>
                            </div>
                        </div>
                        <figcaption className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">Écrans réels de l'application, sur téléphone · plaque de station composée pour la page.</figcaption>
                    </figure>
                </div>
            </div>
        </section>
    );
};

export default TerrainSection;
