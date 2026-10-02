// components/cockpit/BachesView.tsx
// Référentiel → Bâches de stations : recensement des supports physiques
// (station, sens, type, nombre). Consultation seule — aucune donnée d'audit.
import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { BACHE_LINES, BACHE_TYPE_LABELS, buildBachesCsv, filterBacheRows, getBachesForLine } from '../../utils/cockpit/baches';
import { downloadFile } from '../../utils/csvExporter';
import { LineBadge } from './ReferenceSheet';

const BachesView: React.FC = () => {
    const [query, setQuery] = useState('');
    const sections = useMemo(
        () => BACHE_LINES.map(line => ({ line, rows: filterBacheRows(getBachesForLine(line), query) })),
        [query],
    );
    const visibleRows = sections.flatMap(s => s.rows);
    const filtering = query.trim() !== '';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1 min-w-[220px]">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        placeholder="Filtrer par station (nom ou trigramme)…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="block w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 pl-10 pr-3 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                    />
                </div>
                <button
                    onClick={() => downloadFile(buildBachesCsv(visibleRows), 'baches-stations.csv', 'text/csv;charset=utf-8')}
                    disabled={visibleRows.length === 0}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" /> Exporter CSV
                </button>
            </div>

            {sections.map(({ line, rows }) => {
                if (filtering && rows.length === 0) return null;
                const total = rows.reduce((sum, b) => sum + b.count, 0);
                const pending = rows.some(b => b.pending);
                return (
                    <section key={line} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100"><LineBadge line={line} />Bâches — Ligne {line}</h3>
                            {rows.length > 0 && (
                                <span className="text-sm text-slate-600 dark:text-slate-300">
                                    <span className="text-lg font-bold text-teal-700 dark:text-teal-300 tabular-nums">{total}</span> bâche{total > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        {pending && (
                            <p className="text-xs text-amber-700 dark:text-amber-300">Quantités « à relever » : 0 provisoire en attendant le relevé.</p>
                        )}
                        {rows.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">Ligne non recensée — aucune donnée de bâche à ce jour.</p>
                        ) : (
                            <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
                                {/* Largeurs fixes : colonnes alignées d'un tableau de ligne à l'autre
                                    (sinon chaque tableau se dimensionne sur son propre contenu). */}
                                <table className="w-full min-w-[720px] table-fixed text-sm">
                                    <colgroup>
                                        <col className="w-[32%]" />
                                        <col className="w-[11%]" />
                                        <col className="w-[24%]" />
                                        <col className="w-[18%]" />
                                        <col className="w-[15%]" />
                                    </colgroup>
                                    <thead className="bg-slate-100 dark:bg-slate-700 text-left text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                        <tr>
                                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Station</th>
                                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Code</th>
                                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Direction</th>
                                            <th className="p-3 font-bold text-xs uppercase tracking-wider">Type</th>
                                            <th className="p-3 font-bold text-xs uppercase tracking-wider text-center">Nb bâches</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {rows.map((b, idx) => (
                                            <tr key={b.id} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}>
                                                <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{b.stationName}</td>
                                                <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">{b.stationCode}</td>
                                                <td className="p-3 text-slate-600 dark:text-slate-300">{b.direction ?? '—'}</td>
                                                <td className="p-3 text-slate-600 dark:text-slate-300">{BACHE_TYPE_LABELS[b.type]}</td>
                                                {b.pending ? (
                                                    <td className="p-3 text-center tabular-nums text-amber-600 dark:text-amber-400" title="Quantité à relever">
                                                        0 <span className="text-[10px] font-semibold uppercase">à relever</span>
                                                    </td>
                                                ) : (
                                                    <td className="p-3 text-center font-bold text-teal-700 dark:text-teal-400 tabular-nums">{b.count}</td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                );
            })}
            {filtering && visibleRows.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucune station ne correspond à « {query} ».</p>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">
                Recensement des supports physiques — hors audit.
            </p>
        </div>
    );
};

export default BachesView;
