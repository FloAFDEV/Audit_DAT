// components/cockpit/InventaireReseauView.tsx
// =================================================================
// Sous-vue « Inventaire réseau » de la section Existant.
// -----------------------------------------------------------------
// Répond à une question métier unique : « combien d'éléments de ce type
// sont actuellement installés sur le réseau, et où ? » — indépendamment
// de tout audit ou anomalie (l'Existant est la source de vérité
// quantitative, pas les constats terrain).
//
// AUCUN nouveau calcul : toutes les données viennent de
// buildPatrimoineIndex (déjà en mémoire via usePatrimoineIndex, passé en
// prop) — installedCount/lieuCount/lines/byLieu/byLine par référence,
// et la liste implantations pour le détail par exemplaire. Un seul ajout
// à l'index a été nécessaire (ReferenceUsage.byLine, calculé dans la
// même passe O(n) que byLieu) : la répartition par ligne n'existait pas
// encore, tout le reste était déjà disponible.
//
// Volontairement HORS scope (l'app n'est pas une GMAO) : simulation de
// remplacement, besoins d'intervention, résumé SAE, exports, commande,
// fournisseur, stock, fabrication, planning. Ce sous-onglet ne fait que
// mettre en avant une donnée déjà calculée, jamais la transformer en
// décision.
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Boxes, X, ChevronRight } from 'lucide-react';
import { SignageReference, SignageSupport, AdhesiveStatus } from '../../types';
import { PatrimoineIndex } from '../../utils/cockpit/patrimoineIndex';
import { SUPPORT_LABELS, AUDIT_TYPE_LABELS, STATUS_LABELS, formatDimensions } from './labels';

const STATUS_BADGE: Record<string, string> = {
    [AdhesiveStatus.OK]: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    [AdhesiveStatus.Absent]: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    [AdhesiveStatus.ToBeReplaced]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    [AdhesiveStatus.NotChecked]: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

/* ================= Détail d'une référence ================= */

const DetailTile: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900/40">
        <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{value}</div>
        <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
);

interface ReferenceDetailProps {
    reference: SignageReference;
    index: PatrimoineIndex;
    onClose: () => void;
    onOpenReference: (id: string) => void;
}

const ReferenceDetail: React.FC<ReferenceDetailProps> = ({ reference, index, onClose, onOpenReference }) => {
    const usage = index.byReference.get(reference.id);
    const implantations = useMemo(
        () => index.implantations.filter(i => i.referenceId === reference.id),
        [index, reference.id],
    );

    return (
        <div className="rounded-xl border-2 border-teal-200 dark:border-teal-900/50 bg-teal-50/40 dark:bg-teal-900/10 p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{reference.name}</h3>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {reference.code ? `${reference.code} · ` : ''}{reference.id}
                    </p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-700/60 text-slate-500 dark:text-slate-400">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Identité catalogue */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><span className="block text-xs uppercase text-slate-400 font-semibold">Famille</span>{AUDIT_TYPE_LABELS[reference.auditType]}</div>
                <div><span className="block text-xs uppercase text-slate-400 font-semibold">Support</span>{SUPPORT_LABELS[reference.support]}</div>
                <div><span className="block text-xs uppercase text-slate-400 font-semibold">Matière</span>{reference.material ?? '—'}</div>
                <div><span className="block text-xs uppercase text-slate-400 font-semibold">Dimensions</span>{formatDimensions(reference.dimensions)}</div>
            </div>

            {!usage ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Aucune implantation connue sur le périmètre actuel (référence désactivée, hors scope, ou partout non applicable).
                </p>
            ) : (
                <>
                    {/* Cas d'usage : « on remplace cette référence partout, combien prévoir ? » */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <DetailTile label="Présente sur le réseau" value={`${usage.installedCount} unité${usage.installedCount > 1 ? 's' : ''}`} />
                        <DetailTile label="Implantations" value={usage.installedCount} />
                        <DetailTile label="Stations / lieux" value={usage.lieuCount} />
                        <DetailTile label="Lignes" value={usage.lines.length} />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 -mt-2">
                        Implantations et quantité installée sont ici le même nombre : chaque implantation représente un exemplaire.
                        Ce total inclut tous les statuts (conforme, non conforme, non contrôlé) — c'est la quantité à prévoir en cas de remplacement complet.
                    </p>

                    {/* Répartitions — directement depuis usage.byLine / usage.byLieu / implantations, sans recalcul */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Répartition par ligne</h4>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <table className="min-w-full text-sm">
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {usage.byLine.map(l => (
                                            <tr key={l.line} className="bg-white dark:bg-slate-800">
                                                <td className="p-2 font-medium text-slate-800 dark:text-slate-100">{l.line === 'P+R' ? 'P+R' : `Ligne ${l.line}`}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-300">{l.installed}</td>
                                                <td className="p-2 text-right w-20">
                                                    {l.defects > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{l.defects} défaut{l.defects > 1 ? 's' : ''}</span> : <span className="text-slate-400">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Répartition par station / site</h4>
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                                <table className="min-w-full text-sm">
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {usage.byLieu.map(l => (
                                            <tr key={l.lieuId} className="bg-white dark:bg-slate-800">
                                                <td className="p-2 font-medium text-slate-800 dark:text-slate-100">{l.lieuName}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-300">{l.installed}</td>
                                                <td className="p-2 text-right w-20">
                                                    {l.defects > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{l.defects}</span> : <span className="text-slate-400">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                            Répartition par implantation ({implantations.length})
                        </h4>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                            <table className="min-w-full text-sm">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 text-left text-slate-600 dark:text-slate-300">
                                    <tr>
                                        <th className="p-2 font-bold text-xs uppercase">Lieu</th>
                                        <th className="p-2 font-bold text-xs uppercase hidden sm:table-cell">Contexte</th>
                                        <th className="p-2 font-bold text-xs uppercase">Équipement</th>
                                        <th className="p-2 font-bold text-xs uppercase text-center">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {implantations.map((imp, i) => (
                                        <tr key={`${imp.moduleId}-${imp.equipmentLabel}-${i}`} className="bg-white dark:bg-slate-800">
                                            <td className="p-2 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">
                                                {imp.lieuName}
                                                <span className="block text-[11px] text-slate-400">{imp.line === 'P+R' ? 'P+R' : `Ligne ${imp.line}`}</span>
                                            </td>
                                            <td className="p-2 text-slate-600 dark:text-slate-300 hidden sm:table-cell">{imp.context}</td>
                                            <td className="p-2 whitespace-nowrap text-slate-600 dark:text-slate-300">{imp.equipmentLabel}</td>
                                            <td className="p-2 text-center">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[imp.status] ?? STATUS_BADGE[AdhesiveStatus.NotChecked]}`}>
                                                    {STATUS_LABELS[imp.status] ?? imp.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <button
                onClick={() => onOpenReference(reference.id)}
                className="flex items-center gap-1 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:underline"
            >
                Voir la fiche complète <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

/* ================= Liste + filtres ================= */

interface InventaireReseauViewProps {
    references: SignageReference[];
    index: PatrimoineIndex;
    /** Référence à afficher directement en détail (arrivée depuis la fiche référence). */
    focusReferenceId?: string | null;
    onOpenReference: (id: string) => void;
}

const InventaireReseauView: React.FC<InventaireReseauViewProps> = ({ references, index, focusReferenceId, onOpenReference }) => {
    const [family, setFamily] = useState<'ALL' | 'DAT' | 'PR' | 'ECA'>('ALL');
    const [support, setSupport] = useState<'ALL' | SignageSupport>('ALL');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (focusReferenceId) setSelectedId(focusReferenceId);
    }, [focusReferenceId]);

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return references
            .filter(r => {
                if (family !== 'ALL' && r.auditType !== family) return false;
                if (support !== 'ALL' && r.support !== support) return false;
                if (q && !(
                    r.name.toLowerCase().includes(q) ||
                    r.id.toLowerCase().includes(q) ||
                    (r.code ?? '').toLowerCase().includes(q)
                )) return false;
                return true;
            })
            .map(ref => ({ ref, usage: index.byReference.get(ref.id) }))
            .sort((a, b) => (b.usage?.installedCount ?? 0) - (a.usage?.installedCount ?? 0));
    }, [references, index, family, support, query]);

    const selectedReference = selectedId ? references.find(r => r.id === selectedId) : undefined;

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Combien de chaque référence est installé aujourd'hui sur le réseau, et où — sans refaire d'audit.
                Cliquez une référence pour son détail (par ligne, par station, par implantation).
            </p>

            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        placeholder="Rechercher (nom, id, code)…"
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
            </div>

            {selectedReference && (
                <ReferenceDetail
                    reference={selectedReference}
                    index={index}
                    onClose={() => setSelectedId(null)}
                    onOpenReference={onOpenReference}
                />
            )}

            {/* Liste triée par quantité installée décroissante — « qu'est-ce qui pèse le plus sur le réseau ? » */}
            <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 text-left text-slate-700 dark:text-slate-200 shadow-sm">
                        <tr>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Référence</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider hidden sm:table-cell">Support</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider hidden md:table-cell">Dimensions</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center">Installé</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center hidden sm:table-cell">Stations</th>
                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center hidden sm:table-cell">Lignes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rows.map(({ ref, usage }, idx) => (
                            <tr
                                key={ref.id}
                                onClick={() => setSelectedId(ref.id)}
                                className={`cursor-pointer hover:bg-teal-50/50 dark:hover:bg-slate-700/50 transition-colors ${
                                    selectedId === ref.id ? 'bg-teal-50 dark:bg-teal-900/20' : idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'
                                }`}
                            >
                                <td className="p-3">
                                    <span className="font-medium text-slate-800 dark:text-slate-100">{ref.name}</span>
                                    <span className="block font-mono text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                        {ref.code ? `${ref.code} · ` : ''}{ref.id}
                                    </span>
                                </td>
                                <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 hidden sm:table-cell">{SUPPORT_LABELS[ref.support]}</td>
                                <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 hidden md:table-cell">{formatDimensions(ref.dimensions)}</td>
                                <td className="p-3 text-center font-bold text-teal-700 dark:text-teal-400">{usage?.installedCount ?? <span className="text-slate-400 font-normal">—</span>}</td>
                                <td className="p-3 text-center text-slate-600 dark:text-slate-300 hidden sm:table-cell">{usage?.lieuCount ?? '—'}</td>
                                <td className="p-3 text-center text-slate-600 dark:text-slate-300 hidden sm:table-cell">{usage?.lines.length ?? '—'}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-6 text-center text-base text-slate-500 dark:text-slate-400">
                                    Aucune référence ne correspond aux filtres.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
                <Boxes className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                {rows.length} référence{rows.length > 1 ? 's' : ''} · quantités calculées par le moteur d'index du patrimoine, triées par quantité installée.
            </p>
        </div>
    );
};

export default InventaireReseauView;
