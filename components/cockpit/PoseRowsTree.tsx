// components/cockpit/PoseRowsTree.tsx
// Implantations des familles hors catalogue (PMR au sol, pictogrammes
// cognitifs) : ligne → station → accès, construites à partir des MÊMES
// lignes que le CSV de pose (buildPoseRows) — affichage et export ne
// peuvent pas diverger. Repliées par défaut, comme ImplantationsTree.
import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PoseRow } from '../../utils/cockpit/poseExport';
import { LineBadge } from './ImplantationsTree';
import { formatDimensionText } from './labels';

interface AccessGroup { key: string; location: string; designation: string; dimensions: string; count: number; first: PoseRow }
interface StationGroup { station: string; total: number; accesses: AccessGroup[] }
interface LineGroup { line: string; total: number; stations: StationGroup[] }

/** Regroupe sans retrier : buildPoseRows fournit déjà l'ordre des lignes et
 *  l'ordre physique des stations. */
const groupRows = (rows: PoseRow[]): LineGroup[] => {
    const lines: LineGroup[] = [];
    for (const row of rows) {
        let line = lines.find(l => l.line === row.line);
        if (!line) { line = { line: row.line, total: 0, stations: [] }; lines.push(line); }
        let station = line.stations.find(s => s.station === row.station);
        if (!station) { station = { station: row.station, total: 0, accesses: [] }; line.stations.push(station); }
        const key = `${row.location}|${row.designation}|${row.dimensions}`;
        let access = station.accesses.find(a => a.key === key);
        if (!access) { access = { key, location: row.location, designation: row.designation, dimensions: row.dimensions, count: 0, first: row }; station.accesses.push(access); }
        access.count++; station.total++; line.total++;
    }
    return lines;
};

export const PoseRowsTree: React.FC<{ rows: PoseRow[]; renderVisual?: (row: PoseRow) => React.ReactNode }> = ({ rows, renderVisual }) => {
    const lines = useMemo(() => groupRows(rows), [rows]);
    const [openLines, setOpenLines] = useState<Set<string>>(new Set());
    const [openStations, setOpenStations] = useState<Set<string>>(new Set());
    const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, key: string) => {
        const next = new Set(set);
        if (next.has(key)) next.delete(key); else next.add(key);
        setSet(next);
    };

    return (
        <div className="space-y-3">
            {lines.map(({ line, total, stations }) => {
                const isLineOpen = openLines.has(line);
                return (
                    <div key={line} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => toggle(openLines, setOpenLines, line)}
                            aria-expanded={isLineOpen}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                                <ChevronDown className={`w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isLineOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                <LineBadge line={line} />
                                {line !== 'P+R' && `Ligne ${line}`}
                            </span>
                            <span className="text-lg font-bold text-teal-700 dark:text-teal-300 tabular-nums">{total}</span>
                        </button>
                        {isLineOpen && (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {stations.map(station => {
                                    const stationKey = `${line}__${station.station}`;
                                    const isStationOpen = openStations.has(stationKey);
                                    return (
                                        <div key={stationKey}>
                                            <button
                                                type="button"
                                                onClick={() => toggle(openStations, setOpenStations, stationKey)}
                                                aria-expanded={isStationOpen}
                                                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                            >
                                                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isStationOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                                    <LineBadge line={line} size="xs" />
                                                    <span className="truncate">{station.station}</span>
                                                </span>
                                                <span className="text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums flex-shrink-0">{station.total}</span>
                                            </button>
                                            {isStationOpen && (
                                                <ul className="px-4 pb-3 space-y-2">
                                                    {station.accesses.map(access => (
                                                        <li key={access.key} className="ml-3 flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                                                            {renderVisual?.(access.first)}
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 break-words">{access.location || 'Emplacement non précisé'}</span>
                                                                <span className="block text-xs text-slate-500 dark:text-slate-400 break-words">
                                                                    {access.designation}{access.dimensions ? ` · ${formatDimensionText(access.dimensions)}` : ''}
                                                                </span>
                                                            </span>
                                                            <span className="flex-shrink-0 text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums">{access.count}</span>
                                                        </li>
                                                    ))}
                                                </ul>
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
    );
};
