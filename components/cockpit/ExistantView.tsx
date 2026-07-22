// components/cockpit/ExistantView.tsx
// =================================================================
// Section « Existant » du cockpit (ex-Patrimoine — renommage pur).
// -----------------------------------------------------------------
// Répond à « qu'avons-nous aujourd'hui sur le réseau ? » — la source de
// vérité quantitative, indépendante de tout audit ou anomalie. C'est ce
// qui permet de répondre à « le design remplace cet item partout, combien
// faut-il prévoir ? » sans refaire un audit.
// Sous-navigation pilotée par les données : Références (catalogue +
// quantités déjà visibles par référence) et Implantations (parc terrain,
// répartitions déjà visibles par support/ligne), plus Qualification
// référentiel (qualité du catalogue, jamais un constat terrain).
// Pas d'onglet « Inventaire réseau » séparé : le besoin (quantité
// installée, stations, lignes) est déjà couvert par ces deux vues et par
// la fiche de vie — un onglet de plus aurait été un doublon, jamais une
// nouvelle capacité.
// Contrat de plateforme : toutes les données agrégées viennent du
// moteur d'index du patrimoine ; la fiche ouverte ici est LA fiche
// unique (ReferenceSheet).
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, MapPinned, Scale, Search, LucideIcon } from 'lucide-react';
import { Lieu, SignageReference, SignageSupport, AdhesiveStatus } from '../../types';
import { useSignageReferences } from '../../hooks/useSignageReferences';
import { usePatrimoineIndex } from '../../hooks/usePatrimoineIndex';
import ReferenceSheet from './ReferenceSheet';
import ReferenceQualificationView from './ReferenceQualificationView';
import { useCockpitNav } from './cockpitNav';
import { SUPPORT_LABELS, AUDIT_TYPE_LABELS, STATUS_LABELS, formatDimensions } from './labels';

/* ================= Références : liste filtrable ================= */

interface ReferencesListProps {
    references: SignageReference[];
    usageOf: (id: string) => { installedCount: number; defectCount: number; lieuCount: number; lines: string[] } | undefined;
    onOpen: (id: string) => void;
}

const ReferencesList: React.FC<ReferencesListProps> = ({ references, usageOf, onOpen }) => {
    const [family, setFamily] = useState<'ALL' | 'DAT' | 'PR' | 'ECA'>('ALL');
    const [support, setSupport] = useState<'ALL' | SignageSupport>('ALL');
    const [onlyReview, setOnlyReview] = useState(false);
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return references.filter(r => {
            if (family !== 'ALL' && r.auditType !== family) return false;
            if (support !== 'ALL' && r.support !== support) return false;
            if (onlyReview && !r.needsReview) return false;
            if (q && !(
                r.name.toLowerCase().includes(q) ||
                r.id.toLowerCase().includes(q) ||
                (r.code ?? '').toLowerCase().includes(q) ||
                (r.material ?? '').toLowerCase().includes(q)
            )) return false;
            return true;
        });
    }, [references, family, support, onlyReview, query]);

    const reviewCount = useMemo(() => references.filter(r => r.needsReview).length, [references]);

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
                    {(['ALL', 'DAT', 'PR', 'ECA'] as const).map(f => (
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
                <button
                    onClick={() => setOnlyReview(v => !v)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        onlyReview
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}
                >
                    À qualifier ({reviewCount})
                </button>
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
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center hidden sm:table-cell">Défauts</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center hidden lg:table-cell">Stations</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center hidden lg:table-cell">Lignes</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center hidden lg:table-cell">Docs</th>
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
                                            {ref.needsReview && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">À qualifier</span>}
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
                                    <td className="p-3 text-center hidden sm:table-cell">
                                        {usage && usage.defectCount > 0
                                            ? <span className="font-bold text-red-600 dark:text-red-400">{usage.defectCount}</span>
                                            : <span className="text-slate-400">—</span>}
                                    </td>
                                    <td className="p-3 text-center text-slate-600 dark:text-slate-300 hidden lg:table-cell">{usage?.lieuCount ?? '—'}</td>
                                    <td className="p-3 text-center text-slate-600 dark:text-slate-300 hidden lg:table-cell">{usage?.lines.length ?? '—'}</td>
                                    <td className="p-3 text-center text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                                        {(ref.externalDocuments?.length ?? 0) > 0 ? ref.externalDocuments!.length : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={9} className="p-6 text-center text-base text-slate-500 dark:text-slate-400">
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
    const lines = useMemo(() => Array.from(index.byLine.keys()).sort(), [index]);

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

/* ================= Conteneur de section ================= */

type ExistantSubKey = 'references' | 'implantations' | 'qualification';

const SUB_SECTIONS: { key: ExistantSubKey; label: string; Icon: LucideIcon }[] = [
    { key: 'references',    label: 'Références',              Icon: BookOpenCheck },
    { key: 'implantations', label: 'Implantations',            Icon: MapPinned },
    { key: 'qualification', label: 'Qualification référentiel', Icon: Scale },
];

const isExistantSubKey = (v: string): v is ExistantSubKey =>
    v === 'references' || v === 'implantations' || v === 'qualification';

interface ExistantViewProps {
    lieux: Lieu[];
}

const ExistantView: React.FC<ExistantViewProps> = ({ lieux }) => {
    const { references, isLoading, reload } = useSignageReferences();
    const index = usePatrimoineIndex(lieux, references);
    const nav = useCockpitNav();
    const [subSection, setSubSection] = useState<ExistantSubKey>('references');
    const [openReferenceId, setOpenReferenceId] = useState<string | null>(null);

    // Navigation transverse : une autre section peut demander l'ouverture
    // d'un sous-onglet précis (ex. « Qualifier le référentiel → ») ou
    // d'une fiche précise — consommé une fois pris en compte.
    useEffect(() => {
        if (nav.pendingSubSection && isExistantSubKey(nav.pendingSubSection)) {
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
        return <div className="py-16 text-center text-slate-400 dark:text-slate-500">Chargement du patrimoine…</div>;
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
                    onBack={() => setOpenReferenceId(null)}
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
            {subSection === 'qualification' && (
                <ReferenceQualificationView
                    references={references}
                    onReload={reload}
                    onOpenReference={setOpenReferenceId}
                />
            )}
        </div>
    );
};

export default ExistantView;
