// components/cockpit/ImplantationsTree.tsx
// =================================================================
// Affichage canonique des implantations (Ligne → Station → Accès/liaison
// → Équipement → Référence, zone, statut) et leur export .xlsx — partagés
// par la fiche de référence, « Implantations sélectionnées » et l'onglet
// Implantations. Ne fait que présenter des ImplantationRef déjà calculées
// par le moteur d'index (aucun second calcul).
// =================================================================
import React, { useMemo, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdhesiveStatus, SignageReference } from '../../types';
import { AUDIT_CATEGORIES } from '../../data/config';
import { CategoryIcon } from '../CategoryIcon';
import { ImplantationRef, PatrimoineIndex } from '../../utils/cockpit/patrimoineIndex';
import { groupImplantationsByLocation } from '../../utils/cockpit/implantationsGrouping';
import { sortByPhysicalStationOrder } from '../../utils/cockpit/exportStationOrder';
import { downloadImplantationsWorkbook, ImplantationExportRow, SyntheseExportRow } from '../../utils/cockpit/implantationsExporter';
import {
    STATUS_LABELS, compareLines, displayReferenceName, exportZoneLabel, fieldDesignation, formatDimensions,
    implantationEquipmentLabel, implantationZoneLabel, validatorTypeLabel,
} from './labels';

/** Ligne de transport → config visuelle (mêmes couleurs que partout
 *  ailleurs dans l'app, cf. AUDIT_CATEGORIES), P+R compris (badge PR). */
const LINE_CATEGORY_KEY: Record<string, string> = {
    A: 'METRO_A', B: 'METRO_B', C: 'METRO_C', TRAM: 'TRAM', TELEO: 'TELEO', AEROPORT: 'LAE', 'P+R': 'PR',
};
export const LineBadge: React.FC<{ line: string; size?: 'xs' | 'sm' }> = ({ line, size = 'sm' }) => {
    const config = AUDIT_CATEGORIES.find(c => c.key === LINE_CATEGORY_KEY[line]);
    return config ? <CategoryIcon categoryConfig={config} size={size} /> : <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{line}</span>;
};

const STATUS_BADGE: Record<string, string> = {
    [AdhesiveStatus.OK]: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    [AdhesiveStatus.Absent]: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    [AdhesiveStatus.ToBeReplaced]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    [AdhesiveStatus.NotChecked]: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

/* ================= Arbre des implantations (rendu partagé) ================= */
// Ligne → Station → Accès/liaison → Équipement → Référence → Zone.
// LE rendu unique des implantations : fiche de référence, « Implantations
// sélectionnées » et onglet Implantations — lignes et stations repliables,
// aucune implantation tronquée.

interface ImplantationsTreeProps {
    items: ImplantationRef[];
    refById: Map<string, SignageReference>;
    onOpenReference: (id: string) => void;
}

export const ImplantationsTree: React.FC<ImplantationsTreeProps> = ({ items, refById, onOpenReference }) => {
    // Lignes dans l'ordre métier, stations dans l'ordre réseau (registre).
    const groupedLines = useMemo(
        () => groupImplantationsByLocation(items)
            .sort((a, b) => compareLines(a.line, b.line))
            .map(l => ({ ...l, stations: sortByPhysicalStationOrder(l.line, l.stations, s => s.stationName) })),
        [items]
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

    return (
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
                                <LineBadge line={line} />
                                {line !== 'P+R' && `Ligne ${line}`}
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
                                                    <LineBadge line={line} size="xs" />
                                                    <span className="truncate">{station.stationName}</span>
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
                                                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{implantationEquipmentLabel(equip.items[0])}</p>
                                                                        <ul className="space-y-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                                                                            {equip.items.map((imp, i) => {
                                                                                const ref = refById.get(imp.referenceId);
                                                                                return (
                                                                                    <li key={`${imp.referenceId}-${imp.zone ?? ''}-${i}`} className="flex items-baseline justify-between gap-3">
                                                                                        <span className="min-w-0 overflow-hidden">
                                                                                            <button
                                                                                                onClick={() => onOpenReference(imp.referenceId)}
                                                                                                className="block text-sm font-medium text-teal-700 dark:text-teal-300 hover:underline text-left truncate max-w-full"
                                                                                            >
                                                                                                {ref ? displayReferenceName(ref) : imp.referenceId}
                                                                                            </button>
                                                                                            {imp.zone && (
                                                                                                <span className="block text-xs text-slate-500 dark:text-slate-400" title={imp.zoneLabel}>{implantationZoneLabel(imp.zone)}</span>
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
    );
};

/* ================= Export .xlsx d'un ensemble d'implantations ================= */

interface ImplantationsExportButtonProps {
    items: ImplantationRef[];
    index: PatrimoineIndex;
    refById: Map<string, SignageReference>;
}

export const ImplantationsExportButton: React.FC<ImplantationsExportButtonProps> = ({ items, index, refById }) => {
    const [isExporting, setIsExporting] = useState(false);
    const handleExport = async () => {
        setIsExporting(true);
        try {
            const syntheseRows: SyntheseExportRow[] = [];
            const referenceIds = [...new Set(items.map(i => i.referenceId))];
            for (const refId of referenceIds) {
                const usage = index.byReference.get(refId);
                const ref = refById.get(refId);
                if (!usage || !ref) continue;
                for (const lineEntry of usage.byLine) {
                    syntheseRows.push({
                        reference: refId,
                        designation: fieldDesignation(ref),
                        catalogDesignation: displayReferenceName(ref),
                        dimensions: formatDimensions(ref.dimensions),
                        line: lineEntry.line,
                        count: lineEntry.installed,
                    });
                }
            }
            syntheseRows.sort((a, b) => a.reference.localeCompare(b.reference) || compareLines(a.line, b.line));

            const lines = [...new Set(items.map(i => i.line))].sort(compareLines);
            const ligneSheets = lines.map(line => ({
                line,
                sheetName: line === 'P+R' ? 'P+R' : `Ligne ${line}`,
                // Stations dans leur ordre physique sur la ligne (export uniquement).
                rows: sortByPhysicalStationOrder(line, items.filter(i => i.line === line), i => i.lieuName)
                    .map((imp): ImplantationExportRow => {
                        const ref = refById.get(imp.referenceId);
                        return {
                            station: imp.lieuName,
                            context: imp.context,
                            equipment: imp.equipmentLabel,
                            validatorType: validatorTypeLabel(imp.equipmentType),
                            reference: imp.referenceId,
                            designation: ref ? fieldDesignation(ref) : imp.referenceId,
                            catalogDesignation: ref ? displayReferenceName(ref) : imp.referenceId,
                            zoneLabel: exportZoneLabel(imp.equipmentType, imp.zone),
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

    const total = items.length;
    return (
        <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || total === 0}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors bg-teal-600 text-white hover:bg-teal-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-500 flex-shrink-0"
        >
            <Download className="w-4 h-4" />
            {isExporting ? 'Export…' : 'Exporter .xlsx'}
        </button>
    );
};
