// components/cockpit/CognitivePictogramStationsModal.tsx
// Stations qui composent une ligne « Pictogramme cognitif » de
// l'Inventaire détaillé (une dimension) : visuel terrain, station, ligne,
// nombre de pictogrammes. Lecture seule ; la somme des nombres égale la
// quantité de la ligne d'inventaire.
import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AUDIT_CATEGORIES } from '../../data/config';
import { physicalStationIndex } from '../../utils/cockpit/exportStationOrder';
import { compareLines } from './labels';
import { CategoryIcon } from '../CategoryIcon';
import { CognitivePictogramVisual } from '../CognitivePictogramVisual';
import { CognitivePictogramStationEntry } from '../../utils/cockpit/cognitivePictogramSummary';

const LINE_CATEGORY: Record<string, string> = { A: 'METRO_A', B: 'METRO_B', C: 'METRO_C', AEROPORT: 'LAE' };

export const CognitivePictogramStationsModal: React.FC<{
    title: string;
    entries: CognitivePictogramStationEntry[];
    onClose: () => void;
}> = ({ title, entries, onClose }) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Ordre physique des stations sur la ligne (A puis B) — rang commun
    // (utils/cockpit/exportStationOrder), ordre des lignes du cockpit.
    const sorted = useMemo(() => [...entries].sort((a, b) =>
        compareLines(a.line, b.line)
        || (physicalStationIndex(a.line, a.lieuName) ?? 999) - (physicalStationIndex(b.line, b.lieuName) ?? 999)
        || a.lieuName.localeCompare(b.lieuName, 'fr')
        || (a.dimensions ?? '').localeCompare(b.dimensions ?? '')
    ), [entries]);
    const stationCount = new Set(entries.map(e => `${e.line}|${e.lieuName}`)).size;
    const total = entries.reduce((sum, e) => sum + e.count, 0);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-slate-800"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {total} pictogramme{total > 1 ? 's' : ''} · {stationCount} station{stationCount > 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                        aria-label="Fermer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <ul className="grid grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2">
                    {sorted.map(e => {
                        const cfg = AUDIT_CATEGORIES.find(c => c.key === LINE_CATEGORY[e.line]);
                        return (
                            <li key={`${e.line}|${e.lieuName}|${e.dimensions ?? ''}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                                <CognitivePictogramVisual stationCode={e.stationCode} stationName={e.lieuName} field />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{e.lieuName}</span>
                                    {e.dimensions && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{e.dimensions}</span>}
                                </span>
                                {cfg && <CategoryIcon categoryConfig={cfg} size="sm" asDiv />}
                                <span className="w-8 text-right text-sm font-bold tabular-nums text-teal-700 dark:text-teal-400">×{e.count}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>,
        document.body
    );
};
