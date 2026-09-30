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
import { BookOpenCheck, MapPinned, Search, ChevronDown, CheckCircle2, X, LucideIcon } from 'lucide-react';
import { Lieu, SignageReference, SignageSupport, AdhesiveStatus } from '../../types';
import { useSignageReferences } from '../../hooks/useSignageReferences';
import { usePatrimoineIndex } from '../../hooks/usePatrimoineIndex';
import ReferenceSheet from './ReferenceSheet';
import { useCockpitNav } from './cockpitNav';
import { SUPPORT_LABELS, AUDIT_TYPE_LABELS, STATUS_LABELS, formatDimensions } from './labels';
import { buildImplantationTree, filterImplantationsBySupports, orderLines } from '../../utils/cockpit/implantationTree';

/* ================= Références : liste filtrable ================= */

interface ReferencesListProps {
    references: SignageReference[];
    usageOf: (id: string) => { installedCount: number; lieuCount: number; lines: string[] } | undefined;
    onOpen: (id: string) => void;
}

const ReferencesList: React.FC<ReferencesListProps> = ({ references, usageOf, onOpen }) => {
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

            {/* Liste */}
            <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 text-left text-slate-700 dark:text-slate-200 shadow-sm">
                        <tr>
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
                            return (
                                <tr
                                    key={ref.id}
                                    onClick={() => onOpen(ref.id)}
                                    className={`cursor-pointer hover:bg-teal-50/50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}
                                >
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
                                <td colSpan={7} className="p-6 text-center text-base text-slate-500 dark:text-slate-400">
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

const lineLabel = (l: string) => (l === 'P+R' ? 'P+R' : `Ligne ${l}`);

/** En-tête repliable d'un niveau de l'arbre (ligne, station, accès). */
const TreeToggle: React.FC<{
    isOpen: boolean;
    onToggle: () => void;
    installed: number;
    defects: number;
    className?: string;
    children: React.ReactNode;
}> = ({ isOpen, onToggle, installed, defects, className = '', children }) => (
    <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-3 text-left rounded px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${className}`}
    >
        <span className="flex items-center gap-2 min-w-0">
            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            {children}
        </span>
        <span className="flex-shrink-0 flex items-baseline gap-2">
            {defects > 0 && <span className="text-xs font-semibold text-red-600 dark:text-red-400">{defects} défaut{defects > 1 ? 's' : ''}</span>}
            <span className="text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums">{installed}</span>
        </span>
    </button>
);

const ImplantationsExplorer: React.FC<ImplantationsExplorerProps> = ({ references, index, onOpenReference }) => {
    const [line, setLine] = useState<string>('ALL');
    const [status, setStatus] = useState<string>('ALL');
    const [query, setQuery] = useState('');
    // Matières sélectionnées (cards) — vide = toutes les matières.
    const [supports, setSupports] = useState<Set<SignageSupport>>(new Set());
    // Niveaux dépliés (ligne / station / accès) — tout replié par défaut.
    const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

    const refById = useMemo(() => new Map(references.map(r => [r.id, r])), [references]);
    const lines = useMemo(() => orderLines(index.byLine.keys()), [index]);

    const toggleSupport = (support: SignageSupport) => {
        setSupports(prev => {
            const next = new Set(prev);
            if (next.has(support)) next.delete(support); else next.add(support);
            return next;
        });
    };
    const toggleOpen = (key: string) => {
        setOpenKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return filterImplantationsBySupports(index.implantations, refById, supports).filter(imp => {
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
    }, [index, line, status, query, refById, supports]);

    const tree = useMemo(() => buildImplantationTree(filtered), [filtered]);
    const stationCount = useMemo(() => new Set(filtered.map(i => i.lieuId)).size, [filtered]);

    // Recherche active : résultats déjà ciblés, tout est déplié d'office.
    const forceOpen = query.trim().length > 0;
    const isOpen = (key: string) => forceOpen || openKeys.has(key);

    // Regroupements par support — directement depuis l'index.
    const supportEntries = useMemo(() => Array.from(index.bySupport.entries()), [index]);

    return (
        <div className="space-y-4">
            {/* « Combien de Dibond ? de PVC ?... » — servi par l'index ; un
                clic filtre les implantations (sélection multiple). */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {supportEntries.map(([support, counts]) => {
                    const selected = supports.has(support);
                    return (
                        <button
                            key={support}
                            type="button"
                            onClick={() => toggleSupport(support)}
                            aria-pressed={selected}
                            className={`relative p-3 rounded-lg border text-center transition-colors ${
                                selected
                                    ? 'border-teal-600 ring-2 ring-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:border-teal-400 dark:ring-teal-400'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-400 dark:hover:border-teal-500'
                            }`}
                        >
                            {selected && <CheckCircle2 className="absolute top-1.5 right-1.5 w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />}
                            <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{counts.installed}</div>
                            <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-0.5">{SUPPORT_LABELS[support]}</div>
                            {counts.defects > 0 && <div className="text-[11px] font-semibold text-red-600 dark:text-red-400 mt-0.5">{counts.defects} défaut{counts.defects > 1 ? 's' : ''}</div>}
                        </button>
                    );
                })}
            </div>
            {supports.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                    <span>Matière{supports.size > 1 ? 's' : ''} : {Array.from(supports).map(s => SUPPORT_LABELS[s]).join(' + ')}</span>
                    <button
                        type="button"
                        onClick={() => setSupports(new Set())}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 font-semibold"
                    >
                        <X className="w-3 h-3" aria-hidden="true" /> Toutes matières
                    </button>
                </div>
            )}

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
                    {lines.map(l => <option key={l} value={l}>{lineLabel(l)}</option>)}
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

            {/* Arbre des implantations : Ligne → Station → Accès / liaison →
                Équipement → Référence (→ Zone). Aucune implantation masquée :
                chaque niveau replié reste dépliable. */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                {tree.map(lineNode => (
                    <div key={lineNode.key} className="p-1">
                        <TreeToggle
                            isOpen={isOpen(lineNode.key)}
                            onToggle={() => toggleOpen(lineNode.key)}
                            installed={lineNode.installed}
                            defects={lineNode.defects}
                        >
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{lineLabel(lineNode.line)}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">{lineNode.stations.length} lieu{lineNode.stations.length > 1 ? 'x' : ''}</span>
                        </TreeToggle>
                        {isOpen(lineNode.key) && (
                            <div className="pl-3 sm:pl-5 space-y-1 pb-1">
                                {lineNode.stations.map(sta => (
                                    <div key={sta.key} className="border-l border-slate-200 dark:border-slate-700 pl-1">
                                        <TreeToggle
                                            isOpen={isOpen(sta.key)}
                                            onToggle={() => toggleOpen(sta.key)}
                                            installed={sta.installed}
                                            defects={sta.defects}
                                        >
                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{sta.lieuName}</span>
                                        </TreeToggle>
                                        {isOpen(sta.key) && (
                                            <div className="pl-3 sm:pl-5 space-y-1 pb-1">
                                                {sta.accesses.map(acc => (
                                                    <div key={acc.key} className="border-l border-slate-200 dark:border-slate-700 pl-1">
                                                        <TreeToggle
                                                            isOpen={isOpen(acc.key)}
                                                            onToggle={() => toggleOpen(acc.key)}
                                                            installed={acc.installed}
                                                            defects={acc.defects}
                                                        >
                                                            <span className="min-w-0">
                                                                <span className="block text-sm text-slate-700 dark:text-slate-200 truncate">{acc.context}</span>
                                                                <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">{acc.moduleName}</span>
                                                            </span>
                                                        </TreeToggle>
                                                        {isOpen(acc.key) && (
                                                            <ul className="pl-3 sm:pl-5 pr-1 pb-2 space-y-2">
                                                                {acc.equipments.map(eq => (
                                                                    <li key={eq.key} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 pb-1 mb-1 border-b border-dashed border-slate-200 dark:border-slate-700">{eq.label}</div>
                                                                        <ul className="space-y-1">
                                                                            {eq.items.map((imp, i) => {
                                                                                const ref = refById.get(imp.referenceId);
                                                                                return (
                                                                                    <li key={`${imp.referenceId}-${imp.zone ?? ''}-${i}`} className="flex items-center justify-between gap-2">
                                                                                        <span className="flex items-center gap-1.5 min-w-0">
                                                                                            <button
                                                                                                onClick={() => onOpenReference(imp.referenceId)}
                                                                                                className="text-xs text-teal-700 dark:text-teal-300 hover:underline text-left truncate"
                                                                                            >
                                                                                                {ref?.name ?? imp.referenceId}
                                                                                            </button>
                                                                                            {imp.zone && (
                                                                                                <span title={imp.zoneLabel} className="flex-shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{imp.zone}</span>
                                                                                            )}
                                                                                        </span>
                                                                                        <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[imp.status] ?? STATUS_BADGE[AdhesiveStatus.NotChecked]}`}>
                                                                                            {STATUS_LABELS[imp.status] ?? imp.status}
                                                                                        </span>
                                                                                    </li>
                                                                                );
                                                                            })}
                                                                        </ul>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {filtered.length === 0 && (
                    <p className="p-6 text-center text-base text-slate-500 dark:text-slate-400">
                        Aucune implantation ne correspond aux filtres.
                    </p>
                )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
                {filtered.length} implantation{filtered.length > 1 ? 's' : ''} · {stationCount} lieu{stationCount > 1 ? 'x' : ''} · source : moteur d'index du patrimoine.
            </p>
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
