// components/home/HomeAuditDemo.tsx
// « À vous » — climax de la page d'accueil. Le visiteur termine un VRAI
// contrôle : le formulaire (AdhesiveAuditForm), la carte de synthèse
// (AnomalySummaryCard) et la liste d'intervention (MaintenanceListModal)
// sont les composants de l'app, montés tels quels ; la priorisation est
// calculée par le moteur du cockpit (buildPatrimoineIndex →
// buildMaintenanceActions → bandes urgent / à planifier).
// Aucune écriture : ni store, ni Dexie — référentiel issu du seed pur,
// DAT en mémoire. Les commandes propres à l'InApp (retour, réinitialisation,
// dictée) sont masquées par la seule portée CSS de la démo, sans toucher au
// composant métier.
import React, { useState } from 'react';
import { BookOpenCheck, CheckCircle2, ClipboardList } from 'lucide-react';
import AdhesiveAuditForm from '../AdhesiveAuditForm';
import MaintenanceListModal from '../MaintenanceListModal';
import { AnomalySummaryCard } from '../cockpit/primitives';
import { URGENCY_BAND_LABELS, UrgencyBand } from '../../utils/cockpit/maintenanceActions';
import { AdhesiveStatus } from '../../types';
import { DEMO_ADHESIVES, datWith, useAuditOutcome } from './auditOutcome';

export const HOME_DEMO_ID = 'a-vous';
const RESULT_ID = 'a-vous-resultat';

/** Repères laissés au visiteur (3, 6, 9) ; les autres sont déjà contrôlés « OK »,
 *  un état réel de l'app : un contrôle repris en cours de route. */
const OPEN_INDEXES = [2, 5, 8];
const OPEN_NAMES = OPEN_INDEXES.map((i) => DEMO_ADHESIVES[i]?.name.match(/Repère \d+/)?.[0] ?? `Repère ${i + 1}`);
const initialDat = () => datWith(Object.fromEntries(OPEN_INDEXES.map((i) => [i, AdhesiveStatus.NotChecked])));

const BAND_STYLE: Record<UrgencyBand, string> = {
    urgent: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800/60',
    a_planifier: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800/60',
    surveillance: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

// Commandes InApp sans objet dans une démo publique, masquées par portée.
const NEUTRALIZE_CSS = `
.home-demo button[aria-label="Retour"],
.home-demo button[aria-label="Réinitialiser l'audit"],
.home-demo button[title*="dictée"] { display: none; }
`;

// Mobile et tablette : les repères déjà contrôlés « OK » sont repliés (lignes
// réelles masquées par portée CSS, dépliables) pour garder la démo courte.
const COMPACT_CSS = `
@media (max-width: 1023.98px) {
  .home-demo-compact ul.divide-y > li${OPEN_INDEXES.map((i) => `:not(:nth-child(${i + 1}))`).join('')} { display: none; }
}
`;

interface HomeAuditDemoProps {
    /** Scène sombre (défaut) ou claire, selon la direction de la page. */
    tone?: 'dark' | 'light';
    /** Remplace l'en-tête par défaut (mise en scène propre à la page) ; doit porter id="home-demo-title". */
    header?: React.ReactNode;
    /** Cadre autour de l'interface réelle (formulaire + résultat). */
    frameClassName?: string;
}

export const DEMO_INSTRUCTIONS = "Cliquez sur les repères pour simuler un contrôle. Rien n'est enregistré.";
export const DEMO_REMAINING = `7 repères sont déjà contrôlés : il reste ${OPEN_NAMES.slice(0, -1).join(', ')} et ${OPEN_NAMES.at(-1)}.`;

const HomeAuditDemo: React.FC<HomeAuditDemoProps> = ({ tone = 'dark', header, frameClassName = '' }) => {
    const [dat, setDat] = useState(initialDat);
    const [touched, setTouched] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    const [showChecked, setShowChecked] = useState(false);
    const { signageReferences, direction, station, module, actions, interventionItems, counts } = useAuditOutcome(dat);

    const { checked, absent, toReplace, total } = counts;
    const anomalies = absent + toReplace;
    const done = checked === total;
    const dark = tone === 'dark';

    const goToResult = () => {
        const el = document.getElementById(RESULT_ID);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
    };

    return (
        <section
            id={HOME_DEMO_ID}
            aria-labelledby="home-demo-title"
            className={`home-demo scroll-mt-4 px-4 py-16 sm:px-8 sm:py-20 lg:py-28 ${dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900 dark:bg-slate-950 dark:text-white'}`}
        >
            <style>{NEUTRALIZE_CSS + COMPACT_CSS}</style>
            <div className="mx-auto max-w-7xl">
                {header ?? (
                    <header className="mx-auto max-w-3xl text-center">
                        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-300">04 / 04</p>
                        <h2 id="home-demo-title" className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                            À vous : contrôlez un vrai DAT
                        </h2>
                        <p className="mt-4 text-base leading-relaxed text-slate-300">{DEMO_INSTRUCTIONS}</p>
                        <p className="mt-2 text-sm text-slate-400">{DEMO_REMAINING}</p>
                    </header>
                )}

                <div className={`mt-10 grid gap-6 lg:mt-12 lg:grid-cols-12 lg:gap-8 lg:items-start ${frameClassName}`}>
                    <div className={`lg:col-span-8 ${showChecked ? '' : 'home-demo-compact'}`}>
                        <AdhesiveAuditForm
                            module={module}
                            dat={dat}
                            station={station}
                            direction={direction}
                            signageReferences={signageReferences}
                            onStatusChange={(id, status) => {
                                setTouched(true);
                                setDat((d) => ({ ...d, adhesives: { ...d.adhesives, [id]: status } }));
                            }}
                            onCommentChange={(comment) => setDat((d) => ({ ...d, comment }))}
                            onReset={() => setDat(initialDat())}
                            onBack={() => undefined}
                        />
                        <button
                            type="button"
                            onClick={() => setShowChecked((v) => !v)}
                            aria-expanded={showChecked}
                            className={`mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium ring-1 ring-inset lg:hidden ${dark ? 'text-slate-200 ring-white/15' : 'text-slate-700 ring-slate-300 dark:text-slate-200 dark:ring-slate-700'}`}
                        >
                            {showChecked ? 'Replier les repères déjà contrôlés' : `Afficher les ${total - OPEN_INDEXES.length} repères déjà contrôlés « OK »`}
                        </button>
                        {/* Mobile : rappel du résultat après le premier geste ; barre opaque
                            qui finit à sa place, sous le formulaire, sans rien recouvrir. */}
                        {touched && (
                            <div aria-hidden="true" className={`sticky bottom-0 z-10 -mx-4 mt-4 border-t px-4 py-3 lg:hidden ${dark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}>
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={goToResult}
                                    className="flex w-full items-center justify-between text-sm font-medium"
                                >
                                    <span className="tabular-nums">
                                        {checked}/{total} · {anomalies} anomalie{anomalies > 1 ? 's' : ''}
                                    </span>
                                    <span className={dark ? 'text-teal-300' : 'text-teal-700 dark:text-teal-300'}>{done ? 'Voir le résultat ↓' : 'Résultat ↓'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <aside aria-labelledby="home-demo-summary" className="lg:sticky lg:top-6 lg:col-span-4">
                        <div
                            id={RESULT_ID}
                            tabIndex={-1}
                            className="rounded-2xl bg-white p-5 text-slate-900 shadow-2xl focus:outline-none dark:bg-slate-800 dark:text-slate-100"
                        >
                            <p id="home-demo-summary" className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Ce que produit votre contrôle
                            </p>
                            <div aria-live="polite">
                                <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                                    {done ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                                            Contrôle terminé · {checked}/{total} repères
                                        </>
                                    ) : (
                                        <span className="font-normal text-slate-600 dark:text-slate-300">
                                            {checked}/{total} repères contrôlés
                                        </span>
                                    )}
                                </p>
                                <div className="mt-4">
                                    <AnomalySummaryCard
                                        icon={<BookOpenCheck className="h-4 w-4" aria-hidden="true" />}
                                        title="Signalétique IV"
                                        count={anomalies}
                                        subCounts={[
                                            { label: `absent${absent > 1 ? 's' : ''}`, value: absent, tone: 'red' },
                                            { label: 'à remplacer', value: toReplace, tone: 'amber' },
                                        ]}
                                        detailLabel="Voir la liste d'intervention"
                                        detailDisabled={!done}
                                        onDetail={() => setListOpen(true)}
                                    />
                                </div>

                                {actions.length > 0 && (
                                    <div className="mt-5">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Priorisation</p>
                                        <ul className="mt-2 space-y-2">
                                            {actions.map((action) => (
                                                <li key={action.key} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                                                    <span className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ring-1 ring-inset ${BAND_STYLE[action.band]}`}>
                                                        {URGENCY_BAND_LABELS[action.band]}
                                                    </span>
                                                    <span className="min-w-0 text-sm">
                                                        <span className="block font-medium leading-snug">{action.label}</span>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                                            {action.items[0]?.lieuName} · {action.items[0]?.equipmentLabel}
                                                        </span>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {done && (
                                    <p className="mt-5 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <ClipboardList className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                                        {anomalies > 0
                                            ? "Les anomalies rejoignent la liste d'intervention, exportable pour l'équipe de pose."
                                            : 'Aucune anomalie : le DAT 01 est conforme. Essayez « Absent » ou « À remplacer » sur un repère.'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <MaintenanceListModal
                isOpen={listOpen}
                onClose={() => setListOpen(false)}
                title="Anomalies Signalétique IV constatées"
                items={interventionItems}
            />
        </section>
    );
};

export default HomeAuditDemo;
