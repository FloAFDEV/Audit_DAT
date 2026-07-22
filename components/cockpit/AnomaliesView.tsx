// components/cockpit/AnomaliesView.tsx
// =================================================================
// Section « Analyse des anomalies » du cockpit (ex-« Anomalies »,
// libellé affiné pour ne pas entrer en collision avec « Audit terrain »
// — les formulaires d'audit vivent ailleurs dans l'application ; cette
// section ne fait qu'analyser leurs résultats).
// -----------------------------------------------------------------
// Généalogie : Référentiel signalétique → Anomalie (constat terrain) →
// Résumé d'intervention destiné au SAE. Un item absent/dégradé/non
// conforme est un CONSTAT, pas une décision — aucune validation humaine
// n'est requise pour le chemin par défaut (contrairement à la
// Qualification du référentiel, réservée aux questions de qualité du
// catalogue).
//
// Rendu en « ordres de travail patrimoine » (cartes par bande
// d'urgence — pas un tableau plat ligne|défaut|quantité|station, sinon
// on revient au tableau Excel). Bandes calculées par des RÈGLES
// EXPLICITES (utils/cockpit/maintenanceActions.ts::bandOf), jamais un
// score opaque.
//
// Moteur inchangé (maintenanceActions.ts, MaintenanceAction,
// MaintenancePriority) : seul le nom de la section et son vocabulaire
// changent, pas la logique de regroupement/priorisation.
//
// Chaque carte est une Selection affichée (contrat de plateforme,
// règle 4) : les futurs consommateurs (Résumé d'intervention — section
// SAE) se poseront ici sans redessiner la vue.
//
// Frontière : ce module ne produit jamais de donnée d'achat, de
// fabrication ni de commande — seulement item + quantité + localisation.
// =================================================================
import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Eye, ChevronRight, Download, Layout } from 'lucide-react';
import { Lieu, MaintenanceItem, AuditModuleType, AdhesiveStatus, AuditCategory } from '../../types';
import { useSignageReferences } from '../../hooks/useSignageReferences';
import { usePatrimoineIndex } from '../../hooks/usePatrimoineIndex';
import { useSignaletiqueStationIndex } from '../../hooks/useSignaletiqueStationIndex';
import { signaletiqueStationDefectsToMaintenanceItems } from '../../utils/cockpit/signaletiqueStationIndex';
import {
    buildMaintenanceActions, MAINTENANCE_GROUP_MODES, MaintenanceGroupMode, MaintenanceAction,
    URGENCY_BAND_LABELS, UrgencyBand,
} from '../../utils/cockpit/maintenanceActions';
import { useCockpitNav } from './cockpitNav';
import SelectionConsumers from './SelectionConsumers';
import MaintenanceListModal from '../MaintenanceListModal';
import { SectionTitle, AnomalySummaryCard } from './primitives';

// Adaptateur minimal ImplantationRef → MaintenanceItem, pour réutiliser
// MaintenanceListModal/exportMaintenanceListToCsv tels quels (aucune nouvelle
// couche de mapping permanente — colocalisé ici, un seul usage : la liste
// détaillée/export vit désormais dans Analyse des anomalies, pas Synthèse).
// Ligne → catégorie : même correspondance que getCategoryForModule
// (utils/maintenanceGenerator.ts), simplement dérivée de imp.line.
const LINE_TO_CATEGORY: Record<string, AuditCategory> = {
    'A': 'METRO_A', 'B': 'METRO_B', 'C': 'METRO_C',
    'TRAM': 'TRAM', 'TELEO': 'TELEO', 'AEROPORT': 'AEROPORT', 'P+R': 'PR',
};

const BAND_ORDER: UrgencyBand[] = ['urgent', 'a_planifier', 'surveillance'];

const BAND_STYLE: Record<UrgencyBand, { icon: React.ReactNode; badge: string; border: string }> = {
    urgent: {
        icon: <AlertTriangle className="w-4 h-4" />,
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        border: 'border-red-200 dark:border-red-900/50',
    },
    a_planifier: {
        icon: <CalendarClock className="w-4 h-4" />,
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-900/50',
    },
    surveillance: {
        icon: <Eye className="w-4 h-4" />,
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
    },
};

const ActionCard: React.FC<{ action: MaintenanceAction; onOpenReference: (id: string) => void; referenceKey: boolean }> = ({ action, onOpenReference, referenceKey }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border p-4 shadow-sm ${BAND_STYLE[action.band].border}`}>
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">{action.label}</h4>
                {action.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{action.subtitle}</p>}
            </div>
            <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{action.items.length}</div>
                <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">unité{action.items.length > 1 ? 's' : ''}</div>
            </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
            {action.absentCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {action.absentCount} absent{action.absentCount > 1 ? 's' : ''}
                </span>
            )}
            {action.toReplaceCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {action.toReplaceCount} à remplacer
                </span>
            )}
            {!referenceKey && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                    {action.referenceCount} référence{action.referenceCount > 1 ? 's' : ''}
                </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                {action.lieuCount} lieu{action.lieuCount > 1 ? 'x' : ''}
            </span>
        </div>

        {referenceKey && (
            <button
                onClick={() => onOpenReference(action.key)}
                className="flex items-center gap-1 mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:underline"
            >
                Voir la fiche référence <ChevronRight className="w-3.5 h-3.5" />
            </button>
        )}

        {/* Chaque carte EST une Selection (id/source/createdAt) — le contrat
            transversal, pas une propriété du module Anomalies. */}
        <SelectionConsumers selection={action} />
    </div>
);

interface AnomaliesViewProps {
    lieux: Lieu[];
}

const AnomaliesView: React.FC<AnomaliesViewProps> = ({ lieux }) => {
    const { references, isLoading } = useSignageReferences();
    const index = usePatrimoineIndex(lieux, references);
    const nav = useCockpitNav();
    const [mode, setMode] = useState<MaintenanceGroupMode>('reference');
    const [showListModal, setShowListModal] = useState(false);
    const [showStationListModal, setShowStationListModal] = useState(false);

    const actions = useMemo(() => buildMaintenanceActions(index, references, mode), [index, references, mode]);
    const byBand = useMemo(() => {
        const grouped = new Map<UrgencyBand, MaintenanceAction[]>();
        for (const band of BAND_ORDER) grouped.set(band, []);
        for (const action of actions) grouped.get(action.band)!.push(action);
        return grouped;
    }, [actions]);

    // Liste plate + export CSV — même source (index), simple présentation
    // alternative aux cartes par bande, pas un second calcul.
    const refById = useMemo(() => new Map(references.map(r => [r.id, r])), [references]);
    const flatDefectItems = useMemo<MaintenanceItem[]>(() => (
        index.implantations
            .filter(imp => imp.status === AdhesiveStatus.Absent || imp.status === AdhesiveStatus.ToBeReplaced)
            .map(imp => {
                const ref = refById.get(imp.referenceId);
                return {
                    lieuName: imp.lieuName,
                    moduleName: imp.moduleName,
                    elementName: imp.equipmentLabel,
                    context: imp.context,
                    adhesiveName: ref?.name ?? imp.referenceId,
                    status: imp.status,
                    category: LINE_TO_CATEGORY[imp.line],
                    auditType: ref?.auditType as AuditModuleType | undefined,
                };
            })
    ), [index, refById]);

    // Équipements Station : référentiel autonome, sa propre instance du
    // principe de calcul patrimonial (règle 7) — jamais fusionné dans les
    // cartes par bande ci-dessus, qui restent exclusivement Signalétique IV.
    const signaletiqueStationIndex = useSignaletiqueStationIndex(lieux);
    const signaletiqueStationDefectItems = useMemo(() => (
        signaletiqueStationDefectsToMaintenanceItems(signaletiqueStationIndex.items)
    ), [signaletiqueStationIndex]);

    if (isLoading) {
        return <div className="py-16 text-center text-slate-400 dark:text-slate-500">Chargement…</div>;
    }

    return (
        <div className="space-y-8">
            <section className="space-y-6">
                <SectionTitle>Signalétique IV</SectionTitle>
                {actions.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="font-medium">Aucune anomalie en attente.</p>
                        <p className="text-sm mt-1">Tous les éléments suivis sont conformes ou non contrôlés.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                                {MAINTENANCE_GROUP_MODES.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setMode(key)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                            mode === key
                                                ? 'bg-teal-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowListModal(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" /> Voir en liste / Exporter
                            </button>
                        </div>

                        {BAND_ORDER.map(band => {
                            const items = byBand.get(band)!;
                            if (items.length === 0) return null;
                            return (
                                <section key={band}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${BAND_STYLE[band].badge}`}>
                                            {BAND_STYLE[band].icon}
                                            {URGENCY_BAND_LABELS[band]}
                                        </span>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">{items.length} action{items.length > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {items.map(action => (
                                            <ActionCard
                                                key={action.key}
                                                action={action}
                                                referenceKey={mode === 'reference'}
                                                onOpenReference={(id) => nav.navigate({ section: 'referentiel', referenceId: id })}
                                            />
                                        ))}
                                    </div>
                                </section>
                            );
                        })}

                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            Priorisation par facteurs transparents (gravité, ampleur) — aucun score agrégé tant que les pondérations métier
                            ne sont pas validées. Source : moteur d'index du patrimoine.
                        </p>
                    </>
                )}
            </section>

            <hr className="border-dashed border-slate-200 dark:border-slate-700" />

            {/* Équipements Station — référentiel autonome distinct de la
                Signalétique IV (règle 7), jamais fusionné dans les cartes par
                bande ci-dessus. Compteur + liste/export propres. */}
            <section className="space-y-3">
                <SectionTitle>Équipements Station</SectionTitle>
                <div className="max-w-sm">
                    <AnomalySummaryCard
                        icon={<Layout className="w-4 h-4" />}
                        title="Équipements Station"
                        count={signaletiqueStationIndex.totals.defectCount}
                        subCounts={[
                            { label: 'absents', value: signaletiqueStationIndex.totals.absentCount, tone: 'red' },
                            { label: 'à remplacer', value: signaletiqueStationIndex.totals.toReplaceCount, tone: 'amber' },
                            { label: 'HS', value: signaletiqueStationIndex.totals.hsCount, tone: 'red' },
                        ]}
                        detailLabel="Voir en liste / Exporter"
                        detailDisabled={signaletiqueStationDefectItems.length === 0}
                        onDetail={() => setShowStationListModal(true)}
                    />
                </div>
            </section>

            <MaintenanceListModal
                isOpen={showListModal}
                onClose={() => setShowListModal(false)}
                title="Anomalies Signalétique IV constatées"
                items={flatDefectItems}
            />
            <MaintenanceListModal
                isOpen={showStationListModal}
                onClose={() => setShowStationListModal(false)}
                title="Anomalies Équipements Station"
                items={signaletiqueStationDefectItems}
            />
        </div>
    );
};

export default AnomaliesView;
