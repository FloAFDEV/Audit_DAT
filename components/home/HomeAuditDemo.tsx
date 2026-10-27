// components/home/HomeAuditDemo.tsx
// « À vous » — le VRAI formulaire d'audit DAT (AdhesiveAuditForm) et la VRAIE
// carte de synthèse du cockpit (AnomalySummaryCard), montés tels quels avec
// un état local. Aucune écriture : ni store, ni Dexie — le référentiel vient
// du seed pur (buildSignageReferencesSeed), le DAT est un objet en mémoire.
import React, { useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2 } from 'lucide-react';
import AdhesiveAuditForm from '../AdhesiveAuditForm';
import { AnomalySummaryCard } from '../cockpit/primitives';
import { ADHESIVES, getDatAdhesivesForLine } from '../../data/adhesives';
import { createInitialAdhesiveStatus } from '../../data/builder';
import { buildSignageReferencesSeed } from '../../data/signage_seed';
import { AdhesiveStatus, AuditModule, AuditModuleType, DAT, Direction, Station, TransportMode } from '../../types';

// Même parcours que le storytelling : Arènes, ligne A, Salle des billets, DAT 01.
const LINE = 'A' as const;
const DEMO_ADHESIVES = getDatAdhesivesForLine(ADHESIVES, LINE);
const emptyDat = (): DAT => ({ id: 'demo-dat-01', name: 'DAT 01', adhesives: createInitialAdhesiveStatus(DEMO_ADHESIVES), comment: '' });

const scrollToStory = () => document.getElementById('comment-ca-marche')?.scrollIntoView({ block: 'start' });

const HomeAuditDemo: React.FC = () => {
    const signageReferences = useMemo(buildSignageReferencesSeed, []);
    const [dat, setDat] = useState<DAT>(emptyDat);

    const { direction, station, module } = useMemo(() => {
        const direction: Direction = { id: 'demo-direction', name: 'Salle des billets', dats: [dat] };
        const station: Station = { id: 'demo-station', name: 'Arènes', code: 'ARE', directions: [direction] };
        const module: AuditModule = {
            id: 'demo-module',
            type: AuditModuleType.DAT,
            name: 'DAT',
            line: LINE,
            data: { id: 'demo-mode', name: 'Métro A', type: TransportMode.METRO, line: LINE, stations: [station] },
        };
        return { direction, station, module };
    }, [dat]);

    const statuses = DEMO_ADHESIVES.map((a) => dat.adhesives[a.id]);
    const checked = statuses.filter((s) => s !== undefined && s !== AdhesiveStatus.NotChecked).length;
    const absent = statuses.filter((s) => s === AdhesiveStatus.Absent).length;
    const toReplace = statuses.filter((s) => s === AdhesiveStatus.ToBeReplaced).length;
    const done = checked === DEMO_ADHESIVES.length;

    return (
        <section aria-labelledby="home-demo-title" className="mx-auto mt-24 max-w-7xl px-4 sm:px-8 lg:mt-32">
            <header className="mx-auto max-w-3xl text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">À vous</p>
                <h2 id="home-demo-title" className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-white sm:text-4xl">
                    Contrôlez un vrai DAT.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                    Voici le formulaire de l'application, avec les dix repères du DAT 01 d'Arènes. Marquez chaque repère : la synthèse se met à jour comme dans le cockpit.
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Démonstration locale : rien n'est enregistré.</p>
            </header>

            <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-8">
                    <AdhesiveAuditForm
                        module={module}
                        dat={dat}
                        station={station}
                        direction={direction}
                        signageReferences={signageReferences}
                        onStatusChange={(id, status) => setDat((d) => ({ ...d, adhesives: { ...d.adhesives, [id]: status } }))}
                        onCommentChange={(comment) => setDat((d) => ({ ...d, comment }))}
                        onReset={() => setDat(emptyDat())}
                        onBack={scrollToStory}
                    />
                    {/* Mobile : la synthèse complète est sous le formulaire ; ce rappel
                        collé en bas d'écran relie chaque geste à son résultat. */}
                    <p
                        aria-hidden="true"
                        className="sticky bottom-4 z-10 mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-sm dark:bg-slate-100/90 dark:text-slate-900 lg:hidden"
                    >
                        <span className="tabular-nums">{checked}/{DEMO_ADHESIVES.length}</span>
                        <span className="opacity-50">·</span>
                        <span>{absent + toReplace} anomalie{absent + toReplace > 1 ? 's' : ''}</span>
                    </p>
                </div>

                <aside aria-labelledby="home-demo-summary" className="lg:sticky lg:top-8 lg:col-span-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                        <p id="home-demo-summary" className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Ce que voit le cockpit
                        </p>
                        <div className="mt-4" aria-live="polite">
                            <AnomalySummaryCard
                                icon={<BookOpenCheck className="h-4 w-4" aria-hidden="true" />}
                                title="Signalétique IV"
                                count={absent + toReplace}
                                subCounts={[
                                    { label: `absent${absent > 1 ? 's' : ''}`, value: absent, tone: 'red' },
                                    { label: 'à remplacer', value: toReplace, tone: 'amber' },
                                ]}
                                detailLabel="Voir la priorisation"
                                onDetail={scrollToStory}
                            />
                            <p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                {done ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                                        DAT 01 contrôlé : {checked} repères sur {DEMO_ADHESIVES.length}.
                                    </>
                                ) : (
                                    <>
                                        {checked} repère{checked > 1 ? 's' : ''} contrôlé{checked > 1 ? 's' : ''} sur {DEMO_ADHESIVES.length}.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </aside>
            </div>
        </section>
    );
};

export default HomeAuditDemo;
