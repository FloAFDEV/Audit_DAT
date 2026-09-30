// components/cockpit/ReferentielView.tsx
// =================================================================
// Section « Référentiel » du cockpit (ex-Existant — renommage pur).
// -----------------------------------------------------------------
// Répond à « qu'avons-nous aujourd'hui sur le réseau ? » — la source de
// vérité du patrimoine actuel, indépendante de tout audit ou anomalie.
// C'est ce qui permet de répondre à « le design remplace cet item
// partout, combien faut-il prévoir ? » sans refaire un audit.
// Sous-navigation pilotée par les données : Références (catalogue +
// quantités déjà visibles par référence) et Implantations (parc terrain,
// répartitions déjà visibles par support/ligne). Pas d'onglet
// « Qualification du référentiel » séparé : les décisions de qualité du
// catalogue (arbitrage) se lisent directement sur la fiche de chaque
// référence concernée — le mécanisme (useArbitrage) reste disponible,
// mais n'a plus d'écran dédié dans la navigation.
// Pas d'onglet « Inventaire réseau » séparé : le besoin (quantité
// installée, stations, lignes) est déjà couvert par ces deux vues et par
// la fiche de vie — un onglet de plus aurait été un doublon, jamais une
// nouvelle capacité.
// Contrat de plateforme : toutes les données agrégées viennent du
// moteur d'index du patrimoine ; la fiche ouverte ici est LA fiche
// unique (ReferenceSheet).
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, MapPinned, Search, LucideIcon, ChevronDown, Download, ArrowLeft } from 'lucide-react';
import { Lieu, SignageReference, SignageSupport, AdhesiveStatus } from '../../types';
import { useSignageReferences } from '../../hooks/useSignageReferences';
import { usePatrimoineIndex } from '../../hooks/usePatrimoineIndex';
import ReferenceSheet from './ReferenceSheet';
import { useCockpitNav } from './cockpitNav';
import { SUPPORT_LABELS, AUDIT_TYPE_LABELS, STATUS_LABELS, formatDimensions, compareLines, displayReferenceName } from './labels';
import { Selection, selectionFromReferences } from '../../utils/cockpit/selection';
import { groupImplantationsByLocation } from '../../utils/cockpit/implantationsGrouping';
import { downloadImplantationsWorkbook, ImplantationExportRow, SyntheseExportRow } from '../../utils/cockpit/implantationsExporter';
import { PatrimoineIndex } from '../../utils/cockpit/patrimoineIndex';
import toast from 'react-hot-toast';

/* ================= Références : liste filtrable ================= */

interface ReferencesListProps {
    references: SignageReference[];
    usageOf: (id: string) => { installedCount: number; lieuCount: number; lines: string[] } | undefined;
    onOpen: (id: string) => void;
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onSetSelection: (ids: string[]) => void;
    onViewSelectedImplantations: () => void;
}

const ReferencesList: React.FC<ReferencesListProps> = ({
    references, usageOf, onOpen, selectedIds, onToggleSelect, onSetSelection, onViewSelectedImplantations,
}) => {
    const [family, setFamily] = useState<'ALL' | 'DAT' | 'PR' | 'ECA' | 'PDQ'>('ALL');
    const [support, setSupport] = useState<'ALL' | SignageSupport>('ALL');
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return references.filter(r => {
            if (family !== 'ALL' && r.auditType !== family) return false;
            if (support !== 'ALL' && r.support !== support) return false;
            if (q && !(
                r.name.toLowerCase().includes(q) ||
                r.id.toLowerCase().includes(q) ||
                (r.code ?? '').toLowerCase().includes(q) ||
                (r.material ?? '').toLowerCase().includes(q)
            )) return false;
            return true;
        });
    }, [references, family, support, query]);

    // Sélection portée par l'id réel (référence.id), jamais par le libellé
    // affiché — cf. contrat de sélection (utils/cockpit/selection.ts).
    const visibleIds = useMemo(() => filtered.map(r => r.id), [filtered]);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
    const toggleSelectAllVisible = () => {
        if (allVisibleSelected) {
            // Ne retire que les lignes actuellement visibles — une sélection
            // faite avant un changement de filtre reste intacte pour le reste.
            const remaining = [...selectedIds].filter(id => !visibleIds.includes(id));
            onSetSelection(remaining);
        } else {
            onSetSelection([...new Set([...selectedIds, ...visibleIds])]);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher (nom, id, code, matière)…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="block w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 pl-10 pr-3 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                    />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {(['ALL', 'DAT', 'PR', 'ECA', 'PDQ'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFamily(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                family === f
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                            }`}
                        >
                            {f === 'ALL' ? 'Toutes familles' : AUDIT_TYPE_LABELS[f]}
                        </button>
                    ))}
                </div>
                <select
                    value={support}
                    onChange={e => setSupport(e.target.value as 'ALL' | SignageSupport)}
                    className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-600"
                >
                    <option value="ALL">Tous supports</option>
                    {(Object.keys(SUPPORT_LABELS) as SignageSupport[]).map(s => (
                        <option key={s} value={s}>{SUPPORT_LABELS[s]}</option>
                    ))}
                </select>
            </div>

            {/* Barre de sélection — n'apparaît que si au moins une référence est
                cochée, pour ne pas alourdir la vue par défaut. */}
            <div className="flex items-center justify-between gap-3 flex-wrap min-h-[2.25rem]">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {selectedIds.size > 0
                        ? `${selectedIds.size} référence${selectedIds.size > 1 ? 's' : ''} sélectionnée${selectedIds.size > 1 ? 's' : ''}`
                        : ''}
                </span>
                <button
                    type="button"
                    onClick={onViewSelectedImplantations}
                    disabled={selectedIds.size === 0}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors bg-teal-600 text-white hover:bg-teal-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
                >
                    <MapPinned className="w-4 h-4" />
                    Voir les implantations {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </button>
            </div>

            {/* Liste */}
            <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 text-left text-slate-700 dark:text-slate-200 shadow-sm">
                        <tr>
                            <th className="p-3 w-8">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    ref={el => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
                                    onChange={toggleSelectAllVisible}
                                    aria-label="Sélectionner toutes les références visibles"
                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                            </th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Référence</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Famille</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider hidden sm:table-cell">Support</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider hidden md:table-cell">Dimensions</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center">Posés</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center hidden lg:table-cell">Stations</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center hidden lg:table-cell">Lignes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map((ref, idx) => {
                            const usage = usageOf(ref.id);
                            const isSelected = selectedIds.has(ref.id);
                            return (
                                <tr
                                    key={ref.id}
                                    onClick={() => onOpen(ref.id)}
                                    className={`cursor-pointer hover:bg-teal-50/50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-teal-50/70 dark:bg-teal-900/20' : idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}
                                >
                                    <td className="p-3" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onToggleSelect(ref.id)}
                                            aria-label={`Sélectionner ${ref.name}`}
                                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-slate-800 dark:text-slate-100">{ref.name}</span>
                                            {ref.isDisabled && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">Désactivée</span>}
                                        </div>
                                        <span className="block font-mono text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                            {ref.code ? `${ref.code} · ` : ''}{ref.id}
                                        </span>
                                    </td>
                                    <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{AUDIT_TYPE_LABELS[ref.auditType]}</td>
                                    <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 hidden sm:table-cell">{SUPPORT_LABELS[ref.support]}</td>
                                    <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 hidden md:table-cell">{formatDimensions(ref.dimensions)}</td>
                                    <td className="p-3 text-center font-bold text-teal-700 dark:text-teal-400">{usage?.installedCount ?? <span className="text-slate-400 font-normal">—</span>}</td>
                                    <td className="p-3 text-center text-slate-600 dark:text-slate-300 hidden lg:table-cell">{usage?.lieuCount ?? '—'}</td>
                                    <td className="p-3 text-center text-slate-600 dark:text-slate-300 hidden lg:table-cell">{usage?.lines.length ?? '—'}</td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-6 text-center text-base text-slate-500 dark:text-slate-400">
                                    Aucune référence ne correspond aux filtres.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
                {filtered.length} référence{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''} · quantités, stations et lignes calculées par le moteur d'index du patrimoine.
            </p>
        </div>
    );
};

/* ================= Implantations : le parc sur le terrain ================= */

const STATUS_BADGE: Record<string, string> = {
    [AdhesiveStatus.OK]: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    [AdhesiveStatus.Absent]: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    [AdhesiveStatus.ToBeReplaced]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    [AdhesiveStatus.NotChecked]: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

interface ImplantationsExplorerProps {
    references: SignageReference[];
    index: ReturnType<typeof usePatrimoineIndex>;
    onOpenReference: (id: string) => void;
}

const ImplantationsExplorer: React.FC<ImplantationsExplorerProps> = ({ references, index, onOpenReference }) => {
    const [line, setLine] = useState<string>('ALL');
    const [status, setStatus] = useState<string>('ALL');
    const [query, setQuery] = useState('');

    const refById = useMemo(() => new Map(references.map(r => [r.id, r])), [references]);
    const lines = useMemo(() => Array.from(index.byLine.keys()).sort(compareLines), [index]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return index.implantations.filter(imp => {
            if (line !== 'ALL' && imp.line !== line) return false;
            if (status === 'DEFECT') {
                if (imp.status !== AdhesiveStatus.Absent && imp.status !== AdhesiveStatus.ToBeReplaced) return false;
            } else if (status !== 'ALL' && imp.status !== status) return false;
            if (q) {
                const ref = refById.get(imp.referenceId);
                const haystack = `${imp.lieuName} ${imp.equipmentLabel} ${imp.context} ${ref?.name ?? ''} ${imp.referenceId}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [index, line, status, query, refById]);

    // Regroupements par support et par ligne — directement depuis l'index.
    const supportEntries = useMemo(() => Array.from(index.bySupport.entries()), [index]);

    return (
        <div className="space-y-4">
            {/* « Combien de Dibond ? de PVC ?... » — servi par l'index */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {supportEntries.map(([support, counts]) => (
                    <div key={support} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
                        <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{counts.installed}</div>
                        <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-0.5">{SUPPORT_LABELS[support]}</div>
                        {counts.defects > 0 && <div className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-0.5">{counts.defects} défaut{counts.defects > 1 ? 's' : ''}</div>}
                    </div>
                ))}
            </div>

            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher (lieu, équipement, référence)…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="block w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 pl-10 pr-3 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                    />
                </div>
                <select
                    value={line}
                    onChange={e => setLine(e.target.value)}
                    className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-600"
                >
                    <option value="ALL">Toutes lignes</option>
                    {lines.map(l => <option key={l} value={l}>{l === 'P+R' ? 'P+R' : `Ligne ${l}`}</option>)}
                </select>
                <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-1.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-600"
                >
                    <option value="ALL">Tous statuts</option>
                    <option value="DEFECT">Non conformes (absents + à remplacer)</option>
                    <option value={AdhesiveStatus.OK}>OK</option>
                    <option value={AdhesiveStatus.NotChecked}>Non contrôlés</option>
                </select>
            </div>

            {/* Table des implantations */}
            <div className="overflow-auto max-h-[32rem] border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 text-left text-slate-700 dark:text-slate-200 shadow-sm">
                        <tr>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Lieu</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider hidden sm:table-cell">Contexte</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Équipement</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Référence</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.slice(0, 500).map((imp, i) => {
                            const ref = refById.get(imp.referenceId);
                            return (
                                <tr key={`${imp.moduleId}-${imp.equipmentLabel}-${imp.referenceId}-${i}`} className={`${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
                                    <td className="p-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">
                                        {imp.lieuName}
                                        <span className="block text-[11px] text-slate-400">{imp.line === 'P+R' ? 'P+R' : `Ligne ${imp.line}`}</span>
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300 hidden sm:table-cell">{imp.context}</td>
                                    <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300">{imp.equipmentLabel}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={() => onOpenReference(imp.referenceId)}
                                            className="text-teal-700 dark:text-teal-300 hover:underline text-left"
                                        >
                                            {ref?.name ?? imp.referenceId}
                                        </button>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[imp.status] ?? STATUS_BADGE[AdhesiveStatus.NotChecked]}`}>
                                            {STATUS_LABELS[imp.status] ?? imp.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-base text-slate-500 dark:text-slate-400">
                                    Aucune implantation ne correspond aux filtres.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
                {filtered.length} implantation{filtered.length > 1 ? 's' : ''}
                {filtered.length > 500 ? ' (500 premières affichées — affinez les filtres)' : ''} · source : moteur d'index du patrimoine.
            </p>
        </div>
    );
};

/* ================= Implantations d'une sélection de références ================= */
// Vue de CONSULTATION/EXTRACTION : ne fait que regrouper pour l'affichage
// (utils/cockpit/implantationsGrouping.ts) des implantations déjà calculées
// par le moteur d'index — aucun second calcul, aucune notion de campagne/
// commande/intervention créée ou persistée ici.

interface SelectedImplantationsViewProps {
    selection: Selection;
    index: PatrimoineIndex;
    references: SignageReference[];
    onBack: () => void;
    onOpenReference: (id: string) => void;
}

const SelectedImplantationsView: React.FC<SelectedImplantationsViewProps> = ({
    selection, index, references, onBack, onOpenReference,
}) => {
    const refById = useMemo(() => new Map(references.map(r => [r.id, r])), [references]);

    const groupedLines = useMemo(
        () => groupImplantationsByLocation(selection.items).sort((a, b) => compareLines(a.line, b.line)),
        [selection]
    );

    // Repliées par défaut, même principe que PlanQuartierOverview /
    // ReferenceSheet : une sélection large peut couvrir des dizaines de
    // stations, illisible empilé sur mobile. Ouverture indépendante par
    // ligne et par station (comparer deux lignes/stations reste possible).
    const [openLines, setOpenLines] = useState<Set<string>>(new Set());
    const [openStations, setOpenStations] = useState<Set<string>>(new Set());
    const toggleSet = (set: Set<string>, setSet: (s: Set<string>) => void, key: string) => {
        const next = new Set(set);
        if (next.has(key)) next.delete(key); else next.add(key);
        setSet(next);
    };

    const [isExporting, setIsExporting] = useState(false);
    const handleExport = async () => {
        setIsExporting(true);
        try {
            const syntheseRows: SyntheseExportRow[] = [];
            const referenceIds = [...new Set(selection.items.map(i => i.referenceId))];
            for (const refId of referenceIds) {
                const usage = index.byReference.get(refId);
                const ref = refById.get(refId);
                if (!usage || !ref) continue;
                for (const lineEntry of usage.byLine) {
                    syntheseRows.push({
                        reference: refId,
                        designation: displayReferenceName(ref),
                        line: lineEntry.line,
                        count: lineEntry.installed,
                    });
                }
            }
            syntheseRows.sort((a, b) => a.reference.localeCompare(b.reference) || compareLines(a.line, b.line));

            const lines = [...new Set(selection.items.map(i => i.line))].sort(compareLines);
            const ligneSheets = lines.map(line => ({
                line,
                sheetName: line === 'P+R' ? 'P+R' : `Ligne ${line}`,
                rows: selection.items
                    .filter(i => i.line === line)
                    .map((imp): ImplantationExportRow => {
                        const ref = refById.get(imp.referenceId);
                        return {
                            station: imp.lieuName,
                            context: imp.context,
                            equipment: imp.equipmentLabel,
                            reference: imp.referenceId,
                            designation: ref ? displayReferenceName(ref) : imp.referenceId,
                            zoneLabel: imp.zoneLabel ?? '',
                            dimensions: ref ? formatDimensions(ref.dimensions) : '',
                            quantity: 1,
                        };
                    }),
            }));

            const fileName = `implantations-${new Date().toISOString().slice(0, 10)}.xlsx`;
            const result = await downloadImplantationsWorkbook(syntheseRows, ligneSheets, fileName);
            if (result.success) toast.success('Export Excel téléchargé !');
            else toast.error(result.error ?? "Erreur lors de l'export.");
        } finally {
            setIsExporting(false);
        }
    };

    const total = selection.items.length;

    return (
        <div className="space-y-5">
            <div className="flex items-start gap-3">
                <button
                    onClick={onBack}
                    className="p-2 mt-1 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                    aria-label="Retour aux références"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">Implantations sélectionnées</h2>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-sm">
                        <span className="text-lg font-bold text-teal-600 dark:text-teal-400 tabular-nums">{total}</span>
                        <span className="text-slate-600 dark:text-slate-300">implantation{total > 1 ? 's' : ''}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-slate-600 dark:text-slate-300">{selection.label}</span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting || total === 0}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors bg-teal-600 text-white hover:bg-teal-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-500 flex-shrink-0"
                >
                    <Download className="w-4 h-4" />
                    {isExporting ? 'Export…' : 'Exporter .xlsx'}
                </button>
            </div>

            {groupedLines.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Aucune implantation connue pour cette sélection (références désactivées, hors scope, ou partout non applicable).
                </p>
            )}

            <div className="space-y-3">
                {groupedLines.map(({ line, stations, total: lineTotal }) => {
                    const isLineOpen = openLines.has(line);
                    return (
                        <div key={line} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => toggleSet(openLines, setOpenLines, line)}
                                aria-expanded={isLineOpen}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                                    <ChevronDown className={`w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isLineOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                    {line === 'P+R' ? 'P+R' : `Ligne ${line}`}
                                </span>
                                <span className="text-lg font-bold text-teal-700 dark:text-teal-300 tabular-nums">{lineTotal}</span>
                            </button>
                            {isLineOpen && (
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {stations.map(station => {
                                        const stationKey = `${line}__${station.stationName}`;
                                        const isStationOpen = openStations.has(stationKey);
                                        return (
                                            <div key={stationKey}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSet(openStations, setOpenStations, stationKey)}
                                                    aria-expanded={isStationOpen}
                                                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isStationOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                                        {station.stationName}
                                                    </span>
                                                    <span className="text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums flex-shrink-0">{station.total}</span>
                                                </button>
                                                {isStationOpen && (
                                                    <div className="px-4 pb-3 space-y-2.5">
                                                        {station.contexts.map(ctx => (
                                                            <div key={ctx.context} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 ml-3">
                                                                <div className="flex items-baseline justify-between gap-3 pb-1.5 mb-1.5 border-b border-dashed border-slate-200 dark:border-slate-700">
                                                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{ctx.context}</span>
                                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{ctx.total} implantation{ctx.total > 1 ? 's' : ''}</span>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {ctx.equipments.map(equip => (
                                                                        <div key={equip.equipmentLabel}>
                                                                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{equip.equipmentLabel}</p>
                                                                            <ul className="space-y-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                                                                                {equip.items.map((imp, i) => {
                                                                                    const ref = refById.get(imp.referenceId);
                                                                                    return (
                                                                                        <li key={`${imp.referenceId}-${imp.zone ?? ''}-${i}`} className="flex items-baseline justify-between gap-3">
                                                                                            <span className="min-w-0">
                                                                                                <button
                                                                                                    onClick={() => onOpenReference(imp.referenceId)}
                                                                                                    className="block text-sm font-medium text-teal-700 dark:text-teal-300 hover:underline text-left truncate"
                                                                                                >
                                                                                                    {ref ? displayReferenceName(ref) : imp.referenceId}
                                                                                                </button>
                                                                                                {imp.zoneLabel && (
                                                                                                    <span className="block text-xs text-slate-500 dark:text-slate-400">{imp.zoneLabel}</span>
                                                                                                )}
                                                                                            </span>
                                                                                            <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[imp.status] ?? STATUS_BADGE[AdhesiveStatus.NotChecked]}`}>
                                                                                                {STATUS_LABELS[imp.status] ?? imp.status}
                                                                                            </span>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                            </ul>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ================= Conteneur de section ================= */

type ReferentielSubKey = 'references' | 'implantations';

const SUB_SECTIONS: { key: ReferentielSubKey; label: string; Icon: LucideIcon }[] = [
    { key: 'references',    label: 'Références',     Icon: BookOpenCheck },
    { key: 'implantations', label: 'Implantations',   Icon: MapPinned },
];

const isReferentielSubKey = (v: string): v is ReferentielSubKey =>
    v === 'references' || v === 'implantations';

interface ReferentielViewProps {
    lieux: Lieu[];
}

const ReferentielView: React.FC<ReferentielViewProps> = ({ lieux }) => {
    const { references, isLoading } = useSignageReferences();
    const index = usePatrimoineIndex(lieux, references);
    const nav = useCockpitNav();
    const [subSection, setSubSection] = useState<ReferentielSubKey>('references');
    const [openReferenceId, setOpenReferenceId] = useState<string | null>(null);
    // Sélection multiple (Référentiel → Implantations) : ids réels, jamais
    // les libellés affichés — cf. utils/cockpit/selection.ts.
    const [selectedReferenceIds, setSelectedReferenceIds] = useState<Set<string>>(new Set());
    const [activeSelection, setActiveSelection] = useState<Selection | null>(null);

    const toggleSelectReference = (id: string) => {
        setSelectedReferenceIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleViewSelectedImplantations = () => {
        const ids = [...selectedReferenceIds];
        const single = ids.length === 1 ? references.find(r => r.id === ids[0]) : undefined;
        const label = single ? displayReferenceName(single) : `${ids.length} références sélectionnées`;
        setActiveSelection(selectionFromReferences(index, ids, label));
    };

    // Navigation transverse : une autre section peut demander l'ouverture
    // d'un sous-onglet précis (ex. « Implantations → ») ou d'une fiche
    // précise — consommé une fois pris en compte.
    useEffect(() => {
        if (nav.pendingSubSection && isReferentielSubKey(nav.pendingSubSection)) {
            setSubSection(nav.pendingSubSection);
            nav.consumePendingSubSection();
        }
    }, [nav.pendingSubSection]);

    useEffect(() => {
        if (nav.pendingReferenceId) {
            setOpenReferenceId(nav.pendingReferenceId);
            nav.consumePendingReference();
        }
    }, [nav.pendingReferenceId]);

    if (isLoading) {
        return <div className="py-16 text-center text-slate-400 dark:text-slate-500">Chargement du référentiel…</div>;
    }

    // Fiche de vie (règle 2 : LA fiche unique) — prioritaire sur les sous-vues.
    if (openReferenceId) {
        const reference = references.find(r => r.id === openReferenceId);
        if (reference) {
            return (
                <ReferenceSheet
                    reference={reference}
                    references={references}
                    index={index}
                    onBack={() => {
                        setOpenReferenceId(null);
                        // Si la fiche a été ouverte depuis une autre section
                        // (ex. une tuile de Synthèse), y revenir plutôt que
                        // de rester sur la première page de Référentiel.
                        nav.closeReference();
                    }}
                    onOpenReference={setOpenReferenceId}
                />
            );
        }
    }

    // Vue Implantations sélectionnées — même priorité que la fiche de vie
    // (au-dessus des sous-sections), tant qu'une sélection est active.
    if (activeSelection) {
        return (
            <SelectedImplantationsView
                selection={activeSelection}
                index={index}
                references={references}
                onBack={() => setActiveSelection(null)}
                onOpenReference={setOpenReferenceId}
            />
        );
    }

    return (
        <div className="space-y-5">
            {/* Sous-navigation (registre) */}
            <div className="flex gap-2 flex-wrap">
                {SUB_SECTIONS.map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        onClick={() => setSubSection(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            subSection === key
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {subSection === 'references' && (
                <ReferencesList
                    references={references}
                    usageOf={(id) => index.byReference.get(id)}
                    onOpen={setOpenReferenceId}
                    selectedIds={selectedReferenceIds}
                    onToggleSelect={toggleSelectReference}
                    onSetSelection={(ids) => setSelectedReferenceIds(new Set(ids))}
                    onViewSelectedImplantations={handleViewSelectedImplantations}
                />
            )}
            {subSection === 'implantations' && (
                <ImplantationsExplorer
                    references={references}
                    index={index}
                    onOpenReference={setOpenReferenceId}
                />
            )}
        </div>
    );
};

export default ReferentielView;
