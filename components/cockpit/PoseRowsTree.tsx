// components/cockpit/PoseRowsTree.tsx
// Arbre ligne → station générique (LineStationTree) et sa déclinaison pour
// les familles hors catalogue (PoseRowsTree : PMR au sol, pictogrammes
// cognitifs → accès), construite sur les MÊMES lignes que le CSV de pose
// (buildPoseRows) — affichage et export ne peuvent pas diverger. Repliés
// par défaut, comme ImplantationsTree, avec « Tout déplier / Tout replier ».
import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PoseRow } from '../../utils/cockpit/poseExport';
import { LineBadge, ExtensionBTag, ExpandAllButton } from './ImplantationsTree';
import { isLineBExtension } from '../../data/lineBExtension';
import { formatDimensionText } from './labels';
import { isDetailCountRedundant } from '../../utils/cockpit/implantationsGrouping';

export interface AccessGroup { key: string; location: string; designation: string; dimensions: string; count: number; first: PoseRow }

/** Arbre générique ligne → station, replié par défaut. Ne retrie rien :
 *  l'appelant fournit les éléments dans l'ordre voulu (lignes, ordre
 *  physique des stations). */
export function LineStationTree<T>({ items, lineOf, stationOf, stationTag, stationLead, renderStation }: {
    items: T[];
    lineOf: (item: T) => string;
    stationOf: (item: T) => string;
    /** Mention optionnelle à côté du nom de station (ex. « en préparation »). */
    stationTag?: (items: T[]) => React.ReactNode;
    /** Élément interactif affiché devant la station, hors du bouton de
     *  dépliage (ex. visuel agrandissable) — visible sans déplier. */
    stationLead?: (items: T[]) => React.ReactNode;
    renderStation: (items: T[]) => React.ReactNode;
}) {
    const lines = useMemo(() => {
        const out: { line: string; total: number; stations: { station: string; items: T[] }[] }[] = [];
        for (const item of items) {
            const lineKey = lineOf(item);
            let line = out.find(l => l.line === lineKey);
            if (!line) { line = { line: lineKey, total: 0, stations: [] }; out.push(line); }
            const stationKey = stationOf(item);
            let station = line.stations.find(s => s.station === stationKey);
            if (!station) { station = { station: stationKey, items: [] }; line.stations.push(station); }
            station.items.push(item);
            line.total++;
        }
        return out;
    }, [items, lineOf, stationOf]);
    const [openLines, setOpenLines] = useState<Set<string>>(new Set());
    const [openStations, setOpenStations] = useState<Set<string>>(new Set());
    const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, key: string) => {
        const next = new Set(set);
        if (next.has(key)) next.delete(key); else next.add(key);
        setSet(next);
    };
    const allLineKeys = lines.map(l => l.line);
    const allStationKeys = lines.flatMap(l => l.stations.map(st => `${l.line}__${st.station}`));
    const allOpen = allLineKeys.length > 0 && allLineKeys.every(k => openLines.has(k)) && allStationKeys.every(k => openStations.has(k));
    const toggleAll = () => {
        setOpenLines(allOpen ? new Set() : new Set(allLineKeys));
        setOpenStations(allOpen ? new Set() : new Set(allStationKeys));
    };

    return (
        <div className="space-y-3">
            {lines.length > 0 && <ExpandAllButton allOpen={allOpen} onToggle={toggleAll} />}
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
                                    const lead = stationLead?.(station.items);
                                    return (
                                        <div key={stationKey}>
                                            <div className={`flex items-center ${lead ? 'gap-2 pl-4' : ''}`}>
                                            {lead}
                                            <button
                                                type="button"
                                                onClick={() => toggle(openStations, setOpenStations, stationKey)}
                                                aria-expanded={isStationOpen}
                                                className={`flex w-full min-w-0 items-center justify-between gap-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${lead ? 'pl-1 pr-4' : 'px-4'}`}
                                            >
                                                <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                    <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isStationOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                                    <LineBadge line={line} size="xs" />
                                                    <span className="truncate">{station.station}</span>
                                                    {stationTag?.(station.items)}
                                                </span>
                                                <span className="text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums flex-shrink-0">{station.items.length}</span>
                                            </button>
                                            </div>
                                            {isStationOpen && <div className="px-4 pb-3">{renderStation(station.items)}</div>}
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
}

const lineOfRow = (row: PoseRow) => row.line;
const stationOfRow = (row: PoseRow) => row.station;

/** Exemplaires d'une station regroupés par accès (même désignation et
 *  même dimension = une ligne avec sa quantité). */
export const groupAccesses = (rows: PoseRow[]): AccessGroup[] => {
    const groups: AccessGroup[] = [];
    for (const row of rows) {
        const key = `${row.location}|${row.designation}|${row.dimensions}`;
        let group = groups.find(g => g.key === key);
        if (!group) { group = { key, location: row.location, designation: row.designation, dimensions: row.dimensions, count: 0, first: row }; groups.push(group); }
        group.count++;
    }
    return groups;
};

/** Clé de visuel commune à toutes les lignes d'une station, sinon null :
 *  un visuel partagé s'affiche une fois au niveau de la station (visible
 *  sans déplier), jamais répété sur chaque accès. */
export const sharedVisualKey = (rows: PoseRow[], visualKey: (row: PoseRow) => string | undefined): string | null => {
    const keys = new Set(rows.map(visualKey));
    const [only] = keys;
    return keys.size === 1 && only ? only : null;
};

export const PoseRowsTree: React.FC<{
    rows: PoseRow[];
    renderVisual?: (row: PoseRow) => React.ReactNode;
    /** Identité du visuel d'une ligne (ex. visuel par station pour les
     *  pictogrammes) : sert à ne pas répéter une même image. */
    visualKey?: (row: PoseRow) => string | undefined;
}> = ({ rows, renderVisual, visualKey }) => (
    <LineStationTree
        items={rows}
        lineOf={lineOfRow}
        stationOf={stationOfRow}
        stationTag={stationRows => isLineBExtension(stationRows[0].line, stationRows[0].station) && <ExtensionBTag />}
        stationLead={stationRows => renderVisual && visualKey && sharedVisualKey(stationRows, visualKey) ? renderVisual(stationRows[0]) : null}
        renderStation={stationRows => {
            const accesses = groupAccesses(stationRows);
            // Accès unique : sa quantité est celle de la station, déjà affichée.
            const showCount = !isDetailCountRedundant(accesses.length);
            return (
                <ul className="space-y-2">
                    {accesses.map(access => (
                        <li key={access.key} className="ml-3 flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                            {!(visualKey && sharedVisualKey(stationRows, visualKey)) && renderVisual?.(access.first)}
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 break-words">{access.location || 'Emplacement non précisé'}</span>
                                <span className="block text-xs text-slate-500 dark:text-slate-400 break-words">
                                    {access.designation}{access.dimensions ? ` · ${formatDimensionText(access.dimensions)}` : ''}
                                </span>
                            </span>
                            {showCount && <span className="flex-shrink-0 text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums">{access.count}</span>}
                        </li>
                    ))}
                </ul>
            );
        }}
    />
);
