// components/cockpit/BachesView.tsx
// Référentiel → Bâches de stations : recensement des supports physiques
// (station, sens, type, nombre). Consultation seule — aucune donnée d'audit.
import React from 'react';
import { BACHE_LINES, getBachesForLine, getBacheTotal, isLineRecensee } from '../../utils/cockpit/baches';
import { BacheType } from '../../data/stationBaches';
import { LineBadge } from './ReferenceSheet';

const BACHE_TYPE_LABELS: Record<BacheType, string> = {
    standard: 'Standard',
    'double-sens': 'Double-sens',
};

const BachesView: React.FC = () => (
    <div className="space-y-6">
        {BACHE_LINES.map(line => {
            const recensee = isLineRecensee(line);
            const rows = getBachesForLine(line);
            const total = getBacheTotal(line);
            return (
                <section key={line} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100"><LineBadge line={line} />Bâches — Ligne {line}</h3>
                        {recensee && (
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                                <span className="text-lg font-bold text-teal-700 dark:text-teal-300 tabular-nums">{total}</span> bâche{total > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    {!recensee ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">Ligne non recensée — aucune donnée de bâche à ce jour.</p>
                    ) : (
                        <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-700 text-left text-slate-700 dark:text-slate-200">
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
                                            <td className="p-3 text-center font-bold text-teal-700 dark:text-teal-400 tabular-nums">{b.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            );
        })}
        <p className="text-xs text-slate-400 dark:text-slate-500">
            Recensement des supports physiques — hors audit. Les stations absentes du recensement n'apparaissent pas.
        </p>
    </div>
);

export default BachesView;
