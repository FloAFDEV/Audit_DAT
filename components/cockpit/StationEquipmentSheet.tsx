// components/cockpit/StationEquipmentSheet.tsx
// Fiche d'un type d'équipement de station (totem, BIV, plan réseau, plan de
// quartier T1 ou Aéroport Express, HAP, bandeau) — consultation seule, hors
// exports. Même grammaire que les autres fiches du Référentiel. La quantité
// est celle de l'inventaire : des emplacements PRÉVUS ; la présence physique
// n'est affirmée que d'après les constats terrain.
import React, { useMemo } from 'react';
import { ArrowLeft, Ruler, Radar } from 'lucide-react';
import { EquipmentStatusType } from '../../types';
import { FamilyElement } from '../../utils/cockpit/familyElements';
import {
    EquipmentStatus, StationEquipmentItem, stationEquipmentPresence,
} from '../../utils/cockpit/stationEquipment';
import { sortByPhysicalStationOrder } from '../../utils/cockpit/exportStationOrder';
import { LineStationTree } from './PoseRowsTree';
import { lineShortLabel } from './ImplantationsTree';
import { SheetSection, Field } from './ReferenceSheet';
import { compareLines, formatDimensionText } from './labels';

const STATUS: Record<string, { label: string; tone: string }> = {
    NotChecked: { label: 'Non contrôlé', tone: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
    [EquipmentStatusType.OK]: { label: 'Conforme', tone: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
    [EquipmentStatusType.DEGRADED]: { label: 'Dégradé', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    [EquipmentStatusType.TO_REPLACE]: { label: 'À remplacer', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    [EquipmentStatusType.ABSENT]: { label: 'Absent', tone: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    [EquipmentStatusType.HS]: { label: 'HS', tone: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
    [EquipmentStatusType.NOT_APPLICABLE]: { label: 'Non installé', tone: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
};

export const StatusBadge: React.FC<{ status: EquipmentStatus }> = ({ status }) => {
    const s = STATUS[status] ?? STATUS.NotChecked;
    return <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${s.tone}`}>{s.label}</span>;
};

const Count: React.FC<{ value: number; label: string; tone?: string }> = ({ value, label, tone = 'text-teal-700 dark:text-teal-300' }) => (
    <li className="inline-flex items-baseline gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 whitespace-nowrap">
        <span className={`text-base font-bold tabular-nums ${tone}`}>{value}</span>
        <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
    </li>
);

const lineOf = (i: StationEquipmentItem) => i.line;
const stationOf = (i: StationEquipmentItem) => i.stationName;

/** Composantes « en préparation » d'une quantité, par ligne (AEROPORT →
 *  « LAE »), dans l'ordre des lignes du cockpit. */
export const preparationParts = (element: FamilyElement): { line: string; label: string; count: number }[] =>
    Object.entries(element.inPreparationByLine ?? {})
        .sort(([a], [b]) => compareLines(a, b))
        .map(([line, count]) => ({ line, label: lineShortLabel(line), count }));

/** Ordre des lignes du cockpit, puis ordre physique des stations. */
const orderItems = (items: StationEquipmentItem[]) => [...new Set(items.map(i => i.line))].sort(compareLines)
    .flatMap(line => sortByPhysicalStationOrder(line, items.filter(i => i.line === line), i => i.stationName));

/** Un emplacement d'équipement de station : direction · rang, dimensions,
 *  statut, sous-éléments, commentaire. Partagé par la fiche et le
 *  patrimoine d'une station. */
export const EquipmentItemCard: React.FC<{ item: StationEquipmentItem }> = ({ item }) => (
    <li className="ml-3 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
        <div className="flex items-start justify-between gap-3">
            <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 break-words">
                    {item.direction ?? 'Direction non précisée'}{item.rank ? ` · n°${item.rank}` : ''}
                </span>
                {item.dimensions && <span className="block text-xs text-slate-500 dark:text-slate-400">{formatDimensionText(item.dimensions)}</span>}
            </span>
            <StatusBadge status={item.status} />
        </div>
        {item.subElements.length > 0 && (
            <ul className="mt-2 space-y-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                {item.subElements.map(subElement => (
                    <li key={subElement.label} className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="min-w-0 text-slate-600 dark:text-slate-300 break-words">
                            {subElement.label}{subElement.dimensions ? ` · ${subElement.dimensions}` : ''}
                        </span>
                        <StatusBadge status={subElement.status} />
                    </li>
                ))}
            </ul>
        )}
        {item.comment && <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400 break-words">{item.comment}</p>}
    </li>
);

const EquipmentTree: React.FC<{ items: StationEquipmentItem[]; tag: string }> = ({ items, tag }) => (
    <LineStationTree
        items={items}
        lineOf={lineOf}
        stationOf={stationOf}
        stationTag={stationItems => stationItems.some(i => !i.inService) && (
            <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{tag}</span>
        )}
        renderStation={stationItems => (
            <ul className="space-y-2">
                {stationItems.map((item, i) => <EquipmentItemCard key={i} item={item} />)}
            </ul>
        )}
    />
);

interface StationEquipmentSheetProps {
    element: FamilyElement;
    items: StationEquipmentItem[];
    /** Stations futures : consultables, hors quantités. */
    futureItems: StationEquipmentItem[];
    onBack: () => void;
}

const StationEquipmentSheet: React.FC<StationEquipmentSheetProps> = ({ element, items, futureItems, onBack }) => {
    const presence = useMemo(() => stationEquipmentPresence(items), [items]);
    const preparation = preparationParts(element);
    const ordered = useMemo(() => orderItems(items), [items]);
    const orderedFuture = useMemo(() => orderItems(futureItems), [futureItems]);
    const lines = [...element.lines].sort(compareLines).map(l => `Ligne ${l}`).join(', ');

    return (
        <div className="space-y-5">
            <div className="space-y-3">
                <div className="flex items-start gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                        aria-label="Retour à la liste"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100 break-words">{element.name}</h2>
                        {/* Décomposition de la quantité référencée : exploitation +
                            stations en préparation (ex. 50 + 6 LAE = 56). */}
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                            {preparation.length > 0 && (
                                <>
                                    <span className="font-bold tabular-nums">{element.inService}</span> en exploitation
                                    {preparation.map(p => <React.Fragment key={p.line}> + <span className="font-bold tabular-nums">{p.count}</span> {p.label} en préparation</React.Fragment>)}
                                    {' = '}
                                </>
                            )}
                            <span className="font-bold text-teal-700 dark:text-teal-400 tabular-nums">{element.quantity}</span> emplacement{element.quantity > 1 ? 's' : ''} référencé{element.quantity > 1 ? 's' : ''} (inventaire) · {element.lieuCount} lieu{element.lieuCount > 1 ? 'x' : ''}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Équipements station · consultation seule, hors exports</p>
                    </div>
                </div>
                {/* Ce qui est réellement constaté sur le terrain — jamais
                    confondu avec la quantité prévue. */}
                <ul className="flex flex-wrap gap-2" aria-label="Constats terrain">
                    <Count value={presence.present} label="présents constatés" />
                    <Count value={presence.absent} label="absents" tone="text-red-700 dark:text-red-300" />
                    <Count value={presence.unchecked} label="non contrôlés" tone="text-slate-700 dark:text-slate-200" />
                    {presence.notInstalled > 0 && <Count value={presence.notInstalled} label="non installés" tone="text-slate-700 dark:text-slate-200" />}
                </ul>
                {preparation.length > 0 && (
                    <p className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                        {preparation.map(p => `${p.count} ${p.label}`).join(' + ')} en préparation (ligne pas encore en service) : emplacements référencés, comptés dans la quantité, jamais présentés comme posés sans constat terrain.
                    </p>
                )}
            </div>

            <SheetSection title="Caractéristiques" icon={<Ruler className="w-4 h-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Dimensions (référentiel)" value={formatDimensionText(element.dimensions)} />
                    <Field label="Matière (référentiel)" value={element.material} />
                    <Field label="Lignes" value={lines} />
                </div>
            </SheetSection>

            <SheetSection title="Implantations sur le réseau" icon={<Radar className="w-4 h-4" />}>
                {ordered.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucun emplacement sur le périmètre actuel.</p>
                ) : (
                    <EquipmentTree items={ordered} tag="en préparation" />
                )}
            </SheetSection>

            {/* Stations futures (hors périmètre d'exploitation) : visibles pour
                préparer, jamais comptées ni présentées comme installées. */}
            {orderedFuture.length > 0 && (
                <SheetSection title="Stations futures — hors périmètre d'exploitation" icon={<Radar className="w-4 h-4" />}>
                    <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                        {orderedFuture.length} emplacement{orderedFuture.length > 1 ? 's' : ''} déjà décrit{orderedFuture.length > 1 ? 's' : ''} dans les données, non compté{orderedFuture.length > 1 ? 's' : ''} dans la quantité référencée.
                    </p>
                    <EquipmentTree items={orderedFuture} tag="station future" />
                </SheetSection>
            )}
        </div>
    );
};

export default StationEquipmentSheet;
