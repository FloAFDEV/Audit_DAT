// components/cockpit/StationPatrimoineView.tsx
// =================================================================
// Référentiel → Implantations → Ligne → Station → « Patrimoine complet ».
// Restitution du relevé initial d'une station, consultation seule, pour
// préparer une réfection : chaque famille (référentiel autonome, règle 7 de
// patrimoineIndex.ts) dans sa section et SES unités, jamais un total
// commun. Aucun calcul : utils/cockpit/stationPatrimoine.ts filtre des
// résultats existants ; ce composant n'assemble que des rendus existants.
// =================================================================
import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { FloorAdhesiveStatus, SignageReference } from '../../types';
import { ReferenceNamePreview } from '../ReferenceVisual';
import { CognitivePictogramVisual, StationPictograms } from '../CognitivePictogramVisual';
import useAuditStore from '../../store';
import { ExpandAllButton, ExtensionBTag, ImplantationContexts, LineBadge, lineShortLabel } from './ImplantationsTree';
import { EquipmentItemCard } from './StationEquipmentSheet';
import { SUPPORT_LABELS, displayReferenceName, formatDimensionText, formatDimensions } from './labels';
import { groupImplantationsByLocation } from '../../utils/cockpit/implantationsGrouping';
import { ImplantationRef } from '../../utils/cockpit/patrimoineIndex';
import { PMR_FLOOR_DIMENSIONS } from '../../utils/cockpit/pmrFloorPose';
import { BACHE_TYPE_LABELS } from '../../utils/cockpit/baches';
import { STATION_EQUIPMENT_ROW_IDS, StationEquipmentItem, StationEquipmentKind } from '../../utils/cockpit/stationEquipment';
import { FLOOR_ADHESIVE_STATUS_LABELS, STATUS_UNAVAILABLE_LABEL } from '../../utils/cockpit/floorAdhesiveStatus';
import {
    FamilySummary, StationFamily, StationPatrimoine, STATION_FAMILIES, STATION_FAMILY_LABELS,
    groupStationEquipmentByKind, summarizeStationPatrimoine,
} from '../../utils/cockpit/stationPatrimoine';
import { isLineBExtension } from '../../data/lineBExtension';

const EQUIPMENT_KINDS = Object.keys(STATION_EQUIPMENT_ROW_IDS) as StationEquipmentKind[];

const FLOOR_STATUS_TONE: Record<FloorAdhesiveStatus, string> = {
    [FloorAdhesiveStatus.OK]: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    [FloorAdhesiveStatus.ToBeReplaced]: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    [FloorAdhesiveStatus.Absent]: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    [FloorAdhesiveStatus.ToPlan]: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
    [FloorAdhesiveStatus.NotChecked]: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

/** Statut PMR / pictogramme : jamais « Non contrôlé » par défaut. */
const FloorStatusBadge: React.FC<{ status?: FloorAdhesiveStatus }> = ({ status }) => status
    ? <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${FLOOR_STATUS_TONE[status]}`}>{FLOOR_ADHESIVE_STATUS_LABELS[status]}</span>
    : <span className="flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs italic text-slate-500 ring-1 ring-inset ring-slate-200 dark:text-slate-400 dark:ring-slate-600">{STATUS_UNAVAILABLE_LABEL}</span>;

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{children}</span>
);

const countsText = (s: FamilySummary) => s.counts.map(c => `${c.value} ${c.unit}`).join(' · ');

/** Références d'une famille catalogue (une fois chacune, avec son nombre de
 *  repères) : aperçu du visuel et ouverture de la fiche de vie. */
const ReferenceList: React.FC<{ items: ImplantationRef[]; refById: Map<string, SignageReference>; onOpenReference: (id: string) => void }> = ({ items, refById, onOpenReference }) => {
    const counts = useMemo(() => {
        const map = new Map<string, number>();
        for (const i of items) map.set(i.referenceId, (map.get(i.referenceId) ?? 0) + 1);
        return [...map.entries()];
    }, [items]);
    return (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            {counts.map(([id, count]) => {
                const ref = refById.get(id);
                const label = ref ? displayReferenceName(ref) : id;
                return (
                    <li key={id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                        <span className="min-w-0 text-sm">
                            <ReferenceNamePreview referenceId={id} label={label}>
                                <button type="button" onClick={() => onOpenReference(id)} className="text-left font-medium text-teal-700 dark:text-teal-300 hover:underline">
                                    {label}
                                </button>
                            </ReferenceNamePreview>
                            {ref && (
                                <span className="block text-xs text-slate-500 dark:text-slate-400">
                                    {[SUPPORT_LABELS[ref.support], formatDimensions(ref.dimensions)].filter(v => v && v !== '—').join(' · ')}
                                </span>
                            )}
                        </span>
                        <span className="flex-shrink-0 text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums" title="Repères (exemplaires)">×{count}</span>
                    </li>
                );
            })}
        </ul>
    );
};

const CatalogueFamily: React.FC<{
    items: ImplantationRef[]; line: string; refById: Map<string, SignageReference>; onOpenReference: (id: string) => void;
}> = ({ items, line, refById, onOpenReference }) => {
    const contexts = useMemo(() => groupImplantationsByLocation(items)[0]?.stations[0]?.contexts ?? [], [items]);
    return (
        <div className="space-y-3">
            <div>
                <p className="mb-1.5 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Références</p>
                <ReferenceList items={items} refById={refById} onOpenReference={onOpenReference} />
            </div>
            <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Implantations (accès → appareil → repère)</p>
                <ImplantationContexts contexts={contexts} line={line} stationName={items[0]?.lieuName ?? ''} refById={refById} onOpenReference={onOpenReference} />
            </div>
        </div>
    );
};

const ElementRow: React.FC<{ visual?: React.ReactNode; title: string; detail?: string; status: React.ReactNode; tag?: React.ReactNode }> = ({ visual, title, detail, status, tag }) => (
    <li className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
        {visual}
        <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 break-words">{title} {tag}</span>
            {detail && <span className="block text-xs text-slate-500 dark:text-slate-400 break-words">{detail}</span>}
        </span>
        {status}
    </li>
);

interface StationPatrimoineViewProps {
    patrimoine: StationPatrimoine;
    refById: Map<string, SignageReference>;
    /** Libellé d'un type d'équipement de station (ligne d'inventaire). */
    equipmentLabel: (kind: StationEquipmentKind) => string;
    onBack: () => void;
    onOpenReference: (id: string) => void;
}

const StationPatrimoineView: React.FC<StationPatrimoineViewProps> = ({ patrimoine: p, refById, equipmentLabel, onBack, onOpenReference }) => {
    const lieu = useAuditStore(s => s.lieux.find(l => l.id === p.lieuId));
    const summary = useMemo(() => summarizeStationPatrimoine(p), [p]);
    const present = summary.map(s => s.family);
    const absent = STATION_FAMILIES.filter(f => !present.includes(f));
    const [filter, setFilter] = useState<StationFamily | 'ALL'>('ALL');
    const [open, setOpen] = useState<Set<StationFamily>>(new Set());
    const visible = filter === 'ALL' ? summary : summary.filter(s => s.family === filter);
    const allOpen = visible.length > 0 && visible.every(s => open.has(s.family));
    const toggle = (f: StationFamily) => setOpen(prev => {
        const next = new Set(prev);
        if (next.has(f)) next.delete(f); else next.add(f);
        return next;
    });
    const choose = (f: StationFamily | 'ALL') => {
        setFilter(f);
        if (f !== 'ALL') setOpen(prev => new Set(prev).add(f));
    };

    const renderEquipment = (items: StationEquipmentItem[]) => groupStationEquipmentByKind(items, EQUIPMENT_KINDS).map(g => (
        <div key={g.kind} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{equipmentLabel(g.kind)} · {g.items.length}</p>
            <ul className="space-y-2">
                {g.items.map((item, i) => (
                    <React.Fragment key={i}>
                        {!item.inService && <li className="ml-3"><Tag>En préparation (ligne pas encore en service)</Tag></li>}
                        <EquipmentItemCard item={item} />
                    </React.Fragment>
                ))}
            </ul>
        </div>
    ));

    const body = (family: StationFamily): React.ReactNode => {
        switch (family) {
            case 'DAT': return <CatalogueFamily items={p.dat} line={p.line} refById={refById} onOpenReference={onOpenReference} />;
            case 'ECA': return <CatalogueFamily items={p.eca} line={p.line} refById={refById} onOpenReference={onOpenReference} />;
            case 'PDQ': return <CatalogueFamily items={p.pdq} line={p.line} refById={refById} onOpenReference={onOpenReference} />;
            case 'PMR': return (
                <ul className="space-y-2">
                    {p.pmrFloor.map((item, i) => (
                        <ElementRow
                            key={i}
                            title={item.accessLabel || 'Accès non précisé'}
                            detail={[item.material ?? 'Matière non renseignée', formatDimensionText(PMR_FLOOR_DIMENSIONS)].join(' · ')}
                            status={<FloorStatusBadge status={item.status} />}
                        />
                    ))}
                </ul>
            );
            case 'COG': return (
                <div className="space-y-3">
                    <ul className="space-y-2">
                        {p.cognitive.map((item, i) => (
                            <ElementRow
                                key={i}
                                visual={<CognitivePictogramVisual stationCode={item.stationCode} stationName={p.lieuName} size="sm" field zoomable />}
                                title={item.accessPointName}
                                detail={formatDimensionText(item.dimensions)}
                                status={<FloorStatusBadge status={item.status} />}
                            />
                        ))}
                    </ul>
                    {p.cognitiveUncounted.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Non comptés dans les quantités</p>
                            <ul className="space-y-2">
                                {p.cognitiveUncounted.map((item, i) => (
                                    <ElementRow
                                        key={i}
                                        title={item.accessPointName}
                                        tag={<Tag>{item.reason === 'provisional' ? 'Emplacement à définir — non compté' : 'Ligne non comptée au référentiel'}</Tag>}
                                        status={<FloorStatusBadge status={item.status} />}
                                    />
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            );
            case 'SIG': return (
                <div className="space-y-3">
                    {renderEquipment(p.stationEquipment)}
                    {p.futureStationEquipment.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Stations futures — hors périmètre d'exploitation, non comptées</p>
                            {renderEquipment(p.futureStationEquipment)}
                        </div>
                    )}
                </div>
            );
            case 'BACHE': return (
                <ul className="space-y-2">
                    {p.baches.map(b => (
                        <ElementRow
                            key={b.id}
                            title={b.direction ? `Direction ${b.direction}` : 'Double-sens'}
                            detail={BACHE_TYPE_LABELS[b.type]}
                            status={b.pending
                                ? <span className="flex-shrink-0 text-sm tabular-nums text-amber-700 dark:text-amber-400">0 <span className="text-[10px] font-semibold uppercase">à relever</span></span>
                                : <span className="flex-shrink-0 text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums">{b.count}</span>}
                        />
                    ))}
                    <li className="text-xs text-slate-500 dark:text-slate-400">Recensement des supports physiques — hors audit, sans statut.</li>
                </ul>
            );
            case 'PR': return (
                <div className="space-y-2.5">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Parc relais rattaché à la station : présenté à part, jamais compté dans la ligne {lineShortLabel(p.line)}.
                    </p>
                    <CatalogueFamily items={p.prAssociated} line="P+R" refById={refById} onOpenReference={onOpenReference} />
                </div>
            );
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start gap-3">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                    aria-label="Retour aux implantations"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h2 className="flex flex-wrap items-center gap-2 text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100 break-words">
                        <LineBadge line={p.line} />
                        {p.lieuName}
                        <StationPictograms lieu={lieu} line={p.line} size="md" />
                        {isLineBExtension(p.line, p.lieuName) && <ExtensionBTag />}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                        Patrimoine complet · Ligne {lineShortLabel(p.line)} · relevé initial, consultation seule
                    </p>
                    {p.otherLines.length > 0 && (
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            Station également desservie par
                            {p.otherLines.map(l => <LineBadge key={l} line={l} size="xs" />)}
                            — patrimoine propre à chaque ligne.
                        </p>
                    )}
                </div>
            </div>

            {/* Familles présentes : chacune dans ses unités, sert de filtre. */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par famille">
                <button
                    type="button"
                    aria-pressed={filter === 'ALL'}
                    onClick={() => choose('ALL')}
                    className={`min-h-11 rounded-xl px-3 py-1.5 text-sm font-semibold border transition-colors ${filter === 'ALL' ? 'border-teal-600 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
                >
                    Toutes les familles
                </button>
                {summary.map(s => (
                    <button
                        key={s.family}
                        type="button"
                        aria-pressed={filter === s.family}
                        onClick={() => choose(s.family)}
                        className={`min-h-11 max-w-full rounded-xl px-3 py-1.5 text-left border transition-colors ${filter === s.family ? 'border-teal-600 ring-2 ring-teal-600 bg-teal-50 dark:bg-teal-900/30 dark:border-teal-400 dark:ring-teal-400' : 'border-slate-200 bg-white hover:border-teal-400 dark:border-slate-700 dark:bg-slate-800'}`}
                    >
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{STATION_FAMILY_LABELS[s.family]}</span>
                        <span className="block text-xs text-slate-600 dark:text-slate-300">
                            {countsText(s)}
                            {s.uncounted && <span className="text-amber-700 dark:text-amber-400"> · {s.uncounted.value} {s.uncounted.unit}</span>}
                        </span>
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {visible.length > 0 && (
                    <ExpandAllButton
                        allOpen={allOpen}
                        onToggle={() => setOpen(allOpen ? new Set() : new Set(visible.map(s => s.family)))}
                    />
                )}
                {visible.map(s => {
                    const isOpen = open.has(s.family);
                    return (
                        <section key={s.family} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden" aria-label={STATION_FAMILY_LABELS[s.family]}>
                            <button
                                type="button"
                                onClick={() => toggle(s.family)}
                                aria-expanded={isOpen}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <ChevronDown className={`w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{STATION_FAMILY_LABELS[s.family]}</span>
                                        <span className="block text-xs text-slate-600 dark:text-slate-300">{countsText(s)}</span>
                                    </span>
                                </span>
                            </button>
                            {isOpen && <div className="p-3 sm:p-4">{body(s.family)}</div>}
                        </section>
                    );
                })}
            </div>

            {absent.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aucune donnée relevée pour cette station : {absent.map(f => STATION_FAMILY_LABELS[f]).join(', ')}.
                </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Chaque famille garde sa source et ses unités (appareils, références, repères, adhésifs…) : aucun total commun. Statuts issus des audits ; « Non contrôlé » et « Statut indisponible » ne valent jamais présence constatée.
            </p>
        </div>
    );
};

export default StationPatrimoineView;
