// components/home/DecisionSection.tsx
// Temps 03, climax du récit. Les deux mêmes repères
// changent d'état sous les yeux : constat → anomalie qualifiée → priorité →
// intervention. Représentation éditoriale, mais chaque valeur (statut,
// gravité, bande d'urgence, liste) sort du MOTEUR de l'app (useAuditOutcome).
// Desktop : scène sticky, une phase par segment de scroll, l'écran réel
// correspondant en regard. Mobile, tablette, reduced motion : le trajet de
// chaque constat sur une mini-ligne, puis la liste d'intervention — statique.
import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { Download, MapPin } from 'lucide-react';
import { URGENCY_BAND_LABELS, UrgencyBand } from '../../utils/cockpit/maintenanceActions';
import { FRAME_BY_ID } from './auditStorySteps';
import { DEMO_ADHESIVES, STORY_DAT, repereInfo, useAuditOutcome } from './auditOutcome';
import { ShotCrop } from './ShotCrop';
import { LineDiagram } from './LineDiagram';
import { BLUEPRINT, EASE, SectionHeading } from './editorial';
import type { StoryFocus, StoryShot } from './auditStorySteps';

const listShot = FRAME_BY_ID['07-liste'].desktop;

/** L'écran réel qui correspond à chaque phase (la représentation éditoriale en regard). */
const PROOFS: { shot: StoryShot; rect: StoryFocus; caption: string; alt: string }[] = [
    { shot: FRAME_BY_ID['04-anomalie'].mobile, rect: FRAME_BY_ID['04-anomalie'].mobile.focus, caption: 'Écran réel · formulaire terrain', alt: 'Formulaire d’audit sur téléphone : repère 6 à remplacer.' },
    { shot: FRAME_BY_ID['04-anomalie'].mobile, rect: FRAME_BY_ID['04-anomalie'].mobile.focus, caption: 'Écran réel · formulaire terrain', alt: 'Formulaire d’audit sur téléphone : repère 6 à remplacer.' },
    { shot: FRAME_BY_ID['06-priorite'].desktop, rect: FRAME_BY_ID['06-priorite'].desktop.focus, caption: 'Écran réel · analyse des anomalies', alt: 'Cockpit : repère 9 urgent, repère 6 à planifier.' },
    { shot: listShot, rect: { x: 0, y: 0, w: 70, h: 62 }, caption: 'Écran réel · liste d’intervention', alt: 'Liste des anomalies constatées, exportable en CSV.' },
];

const PHASES = [
    { stop: 1, title: 'Deux repères relevés en station.', text: "Le constat est enregistré sur place, même sans réseau." },
    { stop: 2, title: 'Chaque constat est qualifié.', text: 'Absent ou à remplacer : la qualification donne sa gravité à l’anomalie.' },
    { stop: 3, title: 'Le cockpit classe les anomalies.', text: 'Urgent ou à planifier, selon des règles explicites, pas un score opaque.' },
    { stop: 4, title: 'Une liste d’intervention, prête à partir.', text: 'Regroupée par lieu et par équipement, exportable en CSV.' },
] as const;

interface Item {
    key: string;
    number: string;
    title: string;
    visual?: string;
    status: 'absent' | 'remplacer';
    severity: number;
    band: UrgencyBand;
    place: string;
}

const STATUS = {
    absent: { label: 'Absent', chip: 'bg-red-600 text-white' },
    remplacer: { label: 'À remplacer', chip: 'bg-amber-600 text-white' },
} as const;

const BAND_TONE: Record<UrgencyBand, string> = {
    urgent: 'text-red-300 ring-red-400/40',
    a_planifier: 'text-amber-200 ring-amber-300/40',
    surveillance: 'text-slate-300 ring-white/20',
};

const useDecisionItems = (): Item[] => {
    const { actions } = useAuditOutcome(STORY_DAT);
    return useMemo(() => actions.map((action) => {
        const adhesive = DEMO_ADHESIVES.find((a) => a.id === action.key);
        const info = adhesive ? repereInfo(adhesive) : { number: action.label, title: action.label, visual: undefined };
        const first = action.items[0];
        return {
            key: action.key,
            number: info.number,
            title: info.title,
            visual: info.visual,
            status: action.absentCount > 0 ? 'absent' : 'remplacer',
            severity: action.priority.severity,
            band: action.band,
            place: `${first?.lieuName ?? ''} · ${first?.context ?? ''} · ${first?.equipmentLabel ?? ''}`,
        };
    }), [actions]);
};

/** Une fiche, dans l'état de la phase. `layoutId` relie ses formes d'une phase à l'autre. */
const Card: React.FC<{ item: Item; phase: number; animated: boolean }> = ({ item, phase, animated }) => {
    const status = STATUS[item.status];
    const layoutId = animated ? `decision-${item.key}` : undefined;

    if (phase === 3) {
        return (
            <motion.li layoutId={layoutId} transition={{ duration: 0.6, ease: EASE }} className="flex items-center gap-4 border-t border-slate-100 px-6 py-4 first:border-t-0">
                {item.visual && <img src={item.visual} alt="" loading="lazy" className="hidden h-9 w-9 flex-shrink-0 object-contain sm:block" />}
                <span className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase ${item.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{status.label}</span>
                <span className="min-w-0 truncate text-sm text-slate-700 sm:text-base">{item.number} · {item.title}</span>
            </motion.li>
        );
    }

    return (
        <motion.li
            layoutId={layoutId}
            transition={{ duration: 0.6, ease: EASE }}
            className={`overflow-hidden rounded-2xl bg-white text-slate-900 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.7)] ${phase === 2 ? 'p-4' : 'p-6'}`}
        >
            <div className="flex gap-4">
                {phase < 2 && item.visual && (
                    <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 p-2">
                        <img src={item.visual} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-semibold text-slate-500">{item.number}</p>
                    <p className={`mt-1 font-semibold leading-snug ${phase < 2 ? 'text-lg' : 'text-sm'}`}>{item.title}</p>
                    {phase < 2 && <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" aria-hidden="true" />{item.place}</p>}
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
                {phase === 0 ? (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Relevé terrain</span>
                ) : (
                    <span className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${status.chip}`}>{status.label}</span>
                )}
                {phase >= 1 && (
                    <span className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                        Gravité
                        <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                            <span className={`absolute inset-y-0 left-0 rounded-full ${item.status === 'absent' ? 'bg-red-600' : 'bg-amber-500'}`} style={{ width: `${item.severity * 100}%` }} />
                        </span>
                    </span>
                )}
            </div>
        </motion.li>
    );
};

/** La scène d'une phase. */
const Stage: React.FC<{ items: Item[]; phase: number; animated: boolean }> = ({ items, phase, animated }) => {
    if (phase === 3) {
        return (
            <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between bg-slate-50 px-6 py-4">
                    <div>
                        <p className="text-base font-semibold">Liste d’intervention</p>
                        <p className="text-xs text-slate-500">{items[0]?.place.split(' · ').slice(0, 2).join(' · ')}</p>
                    </div>
                    <span className="font-mono text-xs text-slate-500">{items.length} actions</span>
                </div>
                <ul>{items.map((item) => <Card key={item.key} item={item} phase={3} animated={animated} />)}</ul>
                <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-3">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white"><Download className="h-3.5 w-3.5" aria-hidden="true" />Exporter (CSV)</span>
                </div>
            </div>
        );
    }
    if (phase === 2) {
        const bands: UrgencyBand[] = ['urgent', 'a_planifier', 'surveillance'];
        return (
            <div className="grid gap-4 sm:grid-cols-3">
                {bands.map((band) => {
                    const inBand = items.filter((i) => i.band === band);
                    return (
                        <div key={band} className={`rounded-2xl p-3 ring-1 ring-inset ${inBand.length ? 'bg-white/5 ring-white/15' : 'ring-white/5'}`}>
                            <p className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${BAND_TONE[band]} ${inBand.length ? '' : 'opacity-40'}`}>{URGENCY_BAND_LABELS[band]}</p>
                            {inBand.length ? (
                                <ul className="mt-3 space-y-3">{inBand.map((item) => <Card key={item.key} item={item} phase={2} animated={animated} />)}</ul>
                            ) : (
                                <p className="mt-3 text-xs text-slate-500">Aucune action</p>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }
    return <ul className="grid gap-5 sm:grid-cols-2">{items.map((item) => <Card key={item.key} item={item} phase={phase} animated={animated} />)}</ul>;
};

const Proof: React.FC<{ phase: number; className?: string }> = ({ phase, className = '' }) => {
    const proof = PROOFS[phase];
    return (
        <figure className={`overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-white/10 ${className}`}>
            <div className="max-h-44 overflow-hidden">
                <ShotCrop shot={proof.shot} rect={proof.rect} alt={proof.alt} />
            </div>
            <figcaption className="border-t border-slate-100 px-3 py-2 text-[11px] font-medium text-slate-600">{proof.caption}</figcaption>
        </figure>
    );
};

/** Mobile : le trajet d'UN constat, sur une mini-ligne à quatre arrêts. */
const Trajectory: React.FC<{ item: Item }> = ({ item }) => {
    const status = STATUS[item.status];
    const stops = [
        { label: 'Constat', value: <span className="text-slate-300">Relevé</span> },
        { label: 'Qualifié', value: <span className={`rounded px-1.5 py-0.5 font-bold uppercase ${status.chip}`}>{status.label}</span> },
        { label: 'Priorité', value: <span className={`rounded px-1.5 py-0.5 font-bold uppercase ring-1 ring-inset ${BAND_TONE[item.band]}`}>{URGENCY_BAND_LABELS[item.band]}</span> },
        { label: 'Intervention', value: <span className="text-teal-300">En liste</span> },
    ];
    return (
        <li className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
                {item.visual && (
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                        <img src={item.visual} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                    </span>
                )}
                <p className="min-w-0 text-sm font-semibold leading-snug"><span className="font-mono text-xs font-medium text-slate-400">{item.number}</span><br />{item.title}</p>
            </div>
            <ol className="relative mt-4 grid grid-cols-4">
                <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-[5px] h-[2px] rounded-full bg-teal-500" />
                {stops.map((stop) => (
                    <li key={stop.label} className="relative text-center">
                        <span aria-hidden="true" className="mx-auto block h-3 w-3 rounded-full border-2 border-teal-400 bg-teal-400" />
                        <span className="mt-1.5 block font-mono text-[9px] uppercase tracking-wider text-slate-400">{stop.label}</span>
                        <span className="mt-1 block whitespace-nowrap text-[9px] leading-tight sm:text-[10px] [&>span]:inline-block">{stop.value}</span>
                    </li>
                ))}
            </ol>
        </li>
    );
};

const DecisionSection: React.FC = () => {
    const reduce = useReducedMotion();
    const items = useDecisionItems();
    const trackRef = useRef<HTMLDivElement>(null);
    const [phase, setPhase] = useState(0);
    const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] });
    useMotionValueEvent(scrollYProgress, 'change', (p) => {
        const next = Math.min(PHASES.length - 1, Math.floor(p * PHASES.length));
        setPhase((current) => (current === next ? current : next));
    });

    const heading = <SectionHeading id="temps-decision-title" index="03 · DÉCISION" light="Du constat" strong="à la décision." tone="dark" />;
    const caption = (
        <p className="text-xs text-slate-400">Représentation éditoriale · statuts, gravité, priorités et liste calculés par le moteur d’AuditRef.</p>
    );

    return (
        <section id="temps-decision" aria-labelledby="temps-decision-title" className="scroll-mt-4 bg-slate-950 text-white" style={BLUEPRINT}>
            {/* Desktop, mouvement autorisé : scène sticky. */}
            <div ref={trackRef} className={`relative hidden ${reduce ? '' : 'lg:block'}`} style={{ height: `calc(100svh + ${PHASES.length * 65}svh)` }}>
                <div className="sticky top-0 flex h-[100svh] flex-col justify-center">
                    <div className="mx-auto grid w-full max-w-[88rem] grid-cols-12 items-center gap-12 px-8 xl:px-12">
                        <div className="col-span-4">
                            {heading}
                            <div className="mt-8 min-h-[8rem]" aria-live="polite">
                                <p className="font-mono text-xs text-slate-500">{String(phase + 1).padStart(2, '0')} / {String(PHASES.length).padStart(2, '0')}</p>
                                <motion.p key={`t-${phase}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-2 text-2xl font-medium leading-snug">
                                    {PHASES[phase].title}
                                </motion.p>
                                <p className="mt-3 text-base leading-relaxed text-slate-300">{PHASES[phase].text}</p>
                            </div>
                            <div className="mt-6 w-64">
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.div key={PROOFS[phase].caption} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                                        <Proof phase={phase} />
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                        <div className="col-span-8">
                            <LineDiagram reached={PHASES[phase].stop} tone="dark" className="mb-12" />
                            <div className="flex min-h-[24rem] flex-col justify-center">
                                <LayoutGroup>
                                    <Stage items={items} phase={phase} animated />
                                </LayoutGroup>
                            </div>
                            <div className="mt-8">{caption}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile, tablette, reduced motion : le trajet de chaque constat, puis la liste. */}
            <div className={`px-5 py-16 sm:px-8 sm:py-24 xl:px-12 ${reduce ? '' : 'lg:hidden'}`}>
                <div className="mx-auto max-w-3xl lg:max-w-[88rem]">
                    {heading}
                    <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
                        Chaque constat est qualifié, classé par le cockpit puis versé à la liste d’intervention.
                    </p>
                    <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
                        <ul className="min-w-0 space-y-4">{items.map((item) => <Trajectory key={item.key} item={item} />)}</ul>
                        <div className="min-w-0">
                            <Stage items={items} phase={3} animated={false} />
                        </div>
                    </div>
                    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        {caption}
                        <Proof phase={3} className="w-56 flex-shrink-0" />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default DecisionSection;
