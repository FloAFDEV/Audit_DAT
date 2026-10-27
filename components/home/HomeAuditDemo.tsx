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
import React, { useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, ClipboardList } from 'lucide-react';
import AdhesiveAuditForm from '../AdhesiveAuditForm';
import MaintenanceListModal from '../MaintenanceListModal';
import { AnomalySummaryCard } from '../cockpit/primitives';
import { ADHESIVES, getDatAdhesivesForLine } from '../../data/adhesives';
import { createInitialAdhesiveStatus } from '../../data/builder';
import { buildSignageReferencesSeed } from '../../data/signage_seed';
import { buildPatrimoineIndex } from '../../utils/cockpit/patrimoineIndex';
import { buildMaintenanceActions, URGENCY_BAND_LABELS, UrgencyBand } from '../../utils/cockpit/maintenanceActions';
import { LINE_TO_CATEGORY } from '../../utils/cockpit/signaletiqueStationIndex';
import {
    AdhesiveStatus, AuditModule, AuditModuleType, DAT, Direction, Lieu, MaintenanceItem, Station, TransportMode,
} from '../../types';

export const HOME_DEMO_ID = 'a-vous';
const RESULT_ID = 'a-vous-resultat';

// Même parcours que le récit : Arènes, ligne A, Salle des billets, DAT 01.
const LINE = 'A' as const;
const DEMO_ADHESIVES = getDatAdhesivesForLine(ADHESIVES, LINE);
/** Repères laissés au visiteur (3, 6, 9) ; les autres sont déjà contrôlés « OK »,
 *  un état réel de l'app : un contrôle repris en cours de route. */
const OPEN_INDEXES = [2, 5, 8];
const OPEN_NAMES = OPEN_INDEXES.map((i) => DEMO_ADHESIVES[i]?.name.match(/Repère \d+/)?.[0] ?? `Repère ${i + 1}`);

const initialDat = (): DAT => {
    const adhesives = createInitialAdhesiveStatus(DEMO_ADHESIVES);
    DEMO_ADHESIVES.forEach((a, i) => {
        if (!OPEN_INDEXES.includes(i)) adhesives[a.id] = AdhesiveStatus.OK;
    });
    return { id: 'demo-dat-01', name: 'DAT 01', adhesives, comment: '' };
};

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

const HomeAuditDemo: React.FC = () => {
    const signageReferences = useMemo(buildSignageReferencesSeed, []);
    const [dat, setDat] = useState<DAT>(initialDat);
    const [touched, setTouched] = useState(false);
    const [listOpen, setListOpen] = useState(false);

    const { lieu, direction, station, module } = useMemo(() => {
        const direction: Direction = { id: 'demo-direction', name: 'Salle des billets', dats: [dat] };
        const station: Station = { id: 'demo-station', name: 'Arènes', code: 'ARE', directions: [direction] };
        const module: AuditModule = {
            id: 'demo-module',
            type: AuditModuleType.DAT,
            name: 'DAT',
            line: LINE,
            data: { id: 'demo-mode', name: 'Métro A', type: TransportMode.METRO, line: LINE, stations: [station] },
        };
        const lieu: Lieu = { id: 'demo-lieu', name: 'Arènes', modules: [module] };
        return { lieu, direction, station, module };
    }, [dat]);

    // Le moteur du cockpit, sur ce seul DAT.
    const index = useMemo(() => buildPatrimoineIndex([lieu], signageReferences), [lieu, signageReferences]);
    const actions = useMemo(() => buildMaintenanceActions(index, signageReferences, 'reference'), [index, signageReferences]);
    // Même projection que la liste plate de l'Analyse des anomalies (AnomaliesView).
    const interventionItems = useMemo<MaintenanceItem[]>(() => {
        const refById = new Map(signageReferences.map((r) => [r.id, r]));
        return index.implantations
            .filter((imp) => imp.status === AdhesiveStatus.Absent || imp.status === AdhesiveStatus.ToBeReplaced)
            .map((imp) => ({
                lieuName: imp.lieuName,
                moduleName: imp.moduleName,
                elementName: imp.equipmentLabel,
                context: imp.context,
                adhesiveName: refById.get(imp.referenceId)?.name ?? imp.referenceId,
                status: imp.status,
                category: LINE_TO_CATEGORY[imp.line],
                auditType: refById.get(imp.referenceId)?.auditType as AuditModuleType | undefined,
            }));
    }, [index, signageReferences]);

    const statuses = DEMO_ADHESIVES.map((a) => dat.adhesives[a.id]);
    const checked = statuses.filter((s) => s !== undefined && s !== AdhesiveStatus.NotChecked).length;
    const absent = statuses.filter((s) => s === AdhesiveStatus.Absent).length;
    const toReplace = statuses.filter((s) => s === AdhesiveStatus.ToBeReplaced).length;
    const anomalies = absent + toReplace;
    const done = checked === DEMO_ADHESIVES.length;

    const goToResult = () => {
        const el = document.getElementById(RESULT_ID);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus({ preventScroll: true });
    };

    return (
        <section
            id={HOME_DEMO_ID}
            aria-labelledby="home-demo-title"
            className="home-demo scroll-mt-4 bg-slate-900 px-4 py-20 text-white dark:bg-slate-900 sm:px-8 lg:py-28"
        >
            <style>{NEUTRALIZE_CSS}</style>
            <div className="mx-auto max-w-7xl">
                <header className="mx-auto max-w-3xl text-center">
                    <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-300">04 / 04</p>
                    <h2 id="home-demo-title" className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
                        À vous : contrôlez un vrai DAT
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-slate-300">
                        Cliquez sur les repères pour simuler un contrôle. Rien n'est enregistré.
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                        7 repères sont déjà contrôlés : il reste {OPEN_NAMES.slice(0, -1).join(', ')} et {OPEN_NAMES.at(-1)}.
                    </p>
                </header>

                <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-start">
                    <div className="lg:col-span-8">
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
                        {/* Mobile : rappel du résultat après le premier geste ; barre opaque
                            qui finit à sa place, sous le formulaire, sans rien recouvrir. */}
                        {touched && (
                            <div aria-hidden="true" className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-white/10 bg-slate-900 px-4 py-3 lg:hidden">
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={goToResult}
                                    className="flex w-full items-center justify-between text-sm font-medium"
                                >
                                    <span className="tabular-nums">
                                        {checked}/{DEMO_ADHESIVES.length} · {anomalies} anomalie{anomalies > 1 ? 's' : ''}
                                    </span>
                                    <span className="text-teal-300">{done ? 'Voir le résultat ↓' : 'Résultat ↓'}</span>
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
                                            Contrôle terminé · {checked}/{DEMO_ADHESIVES.length} repères
                                        </>
                                    ) : (
                                        <span className="font-normal text-slate-600 dark:text-slate-300">
                                            {checked}/{DEMO_ADHESIVES.length} repères contrôlés
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
