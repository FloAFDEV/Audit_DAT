// components/home/DecisionSection.tsx
// Direction « Vue éclatée » — temps 03, climax. La pile des trois VRAIS écrans
// s'ouvre, puis chaque couche est mise au point tour à tour : le constat
// qualifié, la priorité calculée, la liste d'intervention. Desktop : scène
// sticky pilotée par le scroll. Mobile / reduced motion : les couches à plat.
import React, { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { ExplodedStack, LAYERS } from './ExplodedStack';
import { ShotCrop } from './ShotCrop';
import { BLUEPRINT } from './HomeHero';

const PHASES = [
    { kicker: 'Vue d’ensemble', title: 'Un constat, trois couches.', text: 'Ce que l’agent relève en station, ce que le cockpit en déduit, ce que l’équipe reçoit.' },
    { kicker: 'Constat qualifié', title: 'Relevé et qualifié sur place.', text: 'Repère 6 à remplacer, repère 9 absent : enregistrés au fil du contrôle, même hors ligne.' },
    { kicker: 'Priorité', title: 'Le cockpit décide de l’urgence.', text: 'Chaque anomalie est classée, urgente ou à planifier, selon des règles explicites.' },
    { kicker: 'Intervention', title: 'La liste part vers l’équipe.', text: 'Regroupée par lieu et par équipement, exportable en CSV.' },
] as const;

const DecisionSection: React.FC = () => {
    const reduce = useReducedMotion();
    const trackRef = useRef<HTMLDivElement>(null);
    const [phase, setPhase] = useState(0);
    const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', (p) => {
        const next = Math.min(PHASES.length - 1, Math.floor(p * PHASES.length));
        setPhase((current) => (current === next ? current : next));
    });

    const title = (
        <h2 id="temps-decision-title" className="text-[clamp(2.25rem,4vw,3.75rem)] leading-[1] tracking-[-0.035em]">
            <span className="font-light text-slate-400">Du constat</span>
            <br />
            <span className="font-semibold">à la décision.</span>
        </h2>
    );

    return (
        <section id="temps-decision" aria-labelledby="temps-decision-title" className="scroll-mt-4 bg-slate-950 text-white" style={BLUEPRINT}>
            <div ref={trackRef} className={`relative hidden ${reduce ? '' : 'lg:block'}`} style={{ height: `calc(100svh + ${PHASES.length * 70}svh)` }}>
                <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
                    <div className="mx-auto grid w-full max-w-[88rem] grid-cols-12 items-center gap-10 px-8 xl:px-12">
                        <div className="col-span-4">
                            <p className="font-mono text-sm text-slate-500">03</p>
                            <div className="mt-3">{title}</div>
                            <ol className="mt-10 space-y-4" aria-label="Étapes">
                                {PHASES.map((p, i) => (
                                    <li key={p.kicker} className={`border-l-2 pl-4 transition-colors duration-300 ${i === phase ? 'border-teal-400' : 'border-white/10'}`}>
                                        <p className={`font-mono text-[11px] uppercase tracking-[0.2em] ${i === phase ? 'text-teal-300' : 'text-slate-500'}`}>{p.kicker}</p>
                                        {i === phase && (
                                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                                <p className="mt-1 text-xl font-medium">{p.title}</p>
                                                <p className="mt-1 text-sm leading-relaxed text-slate-400">{p.text}</p>
                                            </motion.div>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <div className="col-span-8">
                            <ExplodedStack focus={phase - 1} spread={120} />
                            <p className="mt-6 text-xs text-slate-500">Écrans réels de l’application · mêmes repères, du terrain à l’intervention.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile, tablette, reduced motion : les trois couches à plat, dans l'ordre. */}
            <div className={`px-5 py-24 sm:px-8 ${reduce ? '' : 'lg:hidden'}`}>
                <div className="mx-auto max-w-3xl">
                    <p className="font-mono text-sm text-slate-500">03</p>
                    <div className="mt-3">{title}</div>
                    <ol className="mt-12 space-y-12">
                        {LAYERS.map((layer, i) => (
                            <li key={layer.id}>
                                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal-300">{PHASES[i + 1].kicker}</p>
                                <p className="mt-1 text-xl font-medium">{PHASES[i + 1].title}</p>
                                <p className="mt-1 text-sm text-slate-400">{PHASES[i + 1].text}</p>
                                <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/10">
                                    <ShotCrop shot={layer.shot} rect={layer.rect} alt={layer.alt} />
                                </div>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-8 text-xs text-slate-500">Écrans réels de l’application.</p>
                </div>
            </div>
        </section>
    );
};

export default DecisionSection;
