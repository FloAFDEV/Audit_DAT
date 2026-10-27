// components/home/TerrainSection.tsx
// Direction « Ligne » — temps 01 : situer le contexte. Un panneau de station
// (données réelles : lignes et modules d'Arènes dans le référentiel de l'app),
// les deux gestes du terrain sur de vrais écrans, et l'échelle du périmètre.
import React, { useMemo } from 'react';
import { CategoryIcon } from '../CategoryIcon';
import { getModuleLineConfig } from '../../data/builder';
import { isModuleInCurrentScope } from '../../utils/moduleScope';
import type { AuditCategoryConfig } from '../../types';
import { FRAME_BY_ID } from './auditStorySteps';
import { useNetworkFigures } from './HomeNetworkScale';
import { LineDiagram } from './LineDiagram';

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
        <section id="temps-terrain" aria-labelledby="temps-terrain-title" className="scroll-mt-4 bg-white py-24 dark:bg-slate-950 lg:py-32">
            <div className="mx-auto max-w-[88rem] px-5 sm:px-8 xl:px-12">
                <LineDiagram reached={0} size="sm" className="max-w-xl" />

                <div className="mt-14 grid gap-14 lg:grid-cols-12 lg:items-center">
                    <div className="lg:col-span-5">
                        <p className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-400">01</p>
                        <h2 id="temps-terrain-title" className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl dark:text-white">
                            Sur le terrain
                        </h2>
                        <p className="mt-4 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                            En station, l'agent retrouve le lieu puis l'équipement à contrôler. Même sans réseau.
                        </p>

                        {/* Panneau de station : composition promotionnelle, données du référentiel. */}
                        <div className="mt-10 max-w-md rounded-2xl bg-slate-950 p-6 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.8)] dark:ring-1 dark:ring-white/10">
                            <div className="flex items-center gap-2">
                                {station?.lines.map((config) => <CategoryIcon key={config.key} categoryConfig={config} size="md" asDiv />)}
                            </div>
                            <p className="mt-5 text-5xl font-semibold tracking-[-0.03em]">{STATION}</p>
                            <p className="mt-1 font-mono text-sm tracking-[0.2em] text-slate-400">ARE</p>
                            <div className="mt-5 flex items-baseline justify-between border-t border-white/15 pt-4 text-sm">
                                <span className="text-slate-300">Modules à auditer</span>
                                <span className="text-2xl font-semibold tabular-nums">{station ? station.modules : '—'}</span>
                            </div>
                        </div>
                    </div>

                    <figure className="relative lg:col-span-7">
                        <div className="relative mx-auto grid max-w-2xl grid-cols-2 items-start gap-6 sm:gap-10">
                            <div>
                                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs text-white">1</span>
                                    Retrouver le lieu
                                </p>
                                <Phone {...lieuShot} alt={FRAME_BY_ID['01-lieu'].alt} />
                            </div>
                            <div className="pt-16 sm:pt-24">
                                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs text-white">2</span>
                                    Ouvrir le module
                                </p>
                                <Phone {...moduleShot} alt={FRAME_BY_ID['02-module'].alt} />
                            </div>
                        </div>
                        <figcaption className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">Écrans réels de l'application, sur téléphone.</figcaption>
                    </figure>
                </div>

                <div className="mt-20 border-t border-slate-200 pt-8 dark:border-slate-800">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Périmètre suivi dans AuditRef</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Calculé depuis le référentiel de l'application.</p>
                    </div>
                    <dl className="mt-6 grid grid-cols-2 gap-y-8 sm:grid-cols-4">
                        {figures.map(({ value, label }, i) => (
                            <div key={label} className={`flex flex-col-reverse ${i > 0 ? 'sm:border-l sm:border-slate-200 sm:pl-8 dark:sm:border-slate-800' : ''}`}>
                                <dt className="mt-1 text-sm text-slate-600 dark:text-slate-400">{label}</dt>
                                <dd className="text-5xl font-semibold tabular-nums tracking-[-0.03em] text-slate-950 dark:text-white">{ready ? value : '—'}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
};

export default TerrainSection;
