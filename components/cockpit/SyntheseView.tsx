// components/cockpit/SyntheseView.tsx
// Section « Synthèse » du cockpit — vision globale du réseau.
// Contenu déplacé depuis StatsPage (onglet current), enrichi d'un bloc
// « Référentiel signalétique » servi par le moteur d'index réseau
// (contrat de plateforme : aucune donnée agrégée calculée localement).
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Car, Euro, Fence, ScanEye, Search, Footprints, MapPin, Building, AlertTriangle, X, Filter, Layout, BookOpenCheck } from 'lucide-react';
import { Lieu, MaintenanceItem, AuditModuleType, ModeData, EcaEquipmentType, AdhesiveStatus, AuditCategory } from '../../types';
import { useStats } from '../../hooks/useStats';
import { useSignageReferences } from '../../hooks/useSignageReferences';
import { usePatrimoineIndex } from '../../hooks/usePatrimoineIndex';
import { AUDIT_CATEGORIES } from '../../data/config';
import { CategoryIcon } from '../CategoryIcon';
import MaintenanceListModal from '../MaintenanceListModal';
import { LieuBadges } from '../Icons';
import { StatCard, SectionTitle, StatRow, IndicatorTile } from './primitives';
import { useCockpitNav } from './cockpitNav';

// Adaptateur minimal ImplantationRef → MaintenanceItem, pour réutiliser
// MaintenanceListModal/exportMaintenanceListToCsv tels quels (aucune
// nouvelle couche de mapping permanente — colocalisé ici, un seul usage).
// Ligne → catégorie : même correspondance que getCategoryForModule
// (utils/maintenanceGenerator.ts), simplement dérivée de imp.line au lieu
// du module d'audit.
const LINE_TO_CATEGORY: Record<string, AuditCategory> = {
    'A': 'METRO_A', 'B': 'METRO_B', 'C': 'METRO_C',
    'TRAM': 'TRAM', 'TELEO': 'TELEO', 'AEROPORT': 'AEROPORT', 'P+R': 'PR',
};

/* =====================
   ECA per-line detail sub-components (déplacés depuis StatsPage)
   ===================== */

const ECA_TYPE_ROWS = [
    { label: "Tripodes entrée",        type: EcaEquipmentType.TripodeEntree },
    { label: "Tripodes sortie",        type: EcaEquipmentType.TripodeSortie },
    { label: "Vantaux entrée",         type: EcaEquipmentType.VantauxEntree },
    { label: "Vantaux sortie",         type: EcaEquipmentType.VantauxSortie },
    { label: "Vantaux réversibles",    type: EcaEquipmentType.VantauxReversible },
    { label: "PMR à bras",             type: EcaEquipmentType.PMRBras },
    { label: "PMR à vantaux",          type: EcaEquipmentType.PMRVantaux },
    { label: "PMR vantaux réversible", type: EcaEquipmentType.PMRVantauxReversible },
];

const EcaTypeGrid: React.FC<{ byType: Record<string, number> }> = ({ byType }) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5">
        {ECA_TYPE_ROWS.map(({ label, type }) => {
            const count = byType[type] ?? 0;
            if (count === 0) return null;
            return (
                <div key={type} className="flex justify-between items-center py-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">{label}</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">{count}</span>
                </div>
            );
        })}
    </div>
);

const EcaLineDetail: React.FC<{ ecaBreakdown: any; configs: any }> = ({ ecaBreakdown, configs }) => {
    const { metroAConfig, metroBConfig, lineCConfig, laeConfig } = configs;
    const lines = [
        { key: 'A',        label: 'Ligne A',          cfg: metroAConfig,  data: ecaBreakdown.byLine.A },
        { key: 'B',        label: 'Ligne B',          cfg: metroBConfig,  data: ecaBreakdown.byLine.B },
        { key: 'C',        label: 'Ligne C',          cfg: lineCConfig,   data: ecaBreakdown.byLine.C },
        { key: 'AEROPORT', label: 'Aéroport Express', cfg: laeConfig,     data: ecaBreakdown.byLine.AEROPORT },
    ];
    return (
        <div className="mt-2 space-y-3">
            {lines.map(({ key, label, cfg, data }) => (
                <div key={key} className="pl-4 border-l-2 border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <CategoryIcon categoryConfig={cfg} size="sm" />
                            {label}
                        </span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {data.total}
                            <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">({data.pmr} PMR)</span>
                        </span>
                    </div>
                    {data.total > 0 && <EcaTypeGrid byType={data.byType} />}
                </div>
            ))}
        </div>
    );
};

interface SyntheseViewProps {
    lieux: Lieu[];
}

const SyntheseView: React.FC<SyntheseViewProps> = ({ lieux }) => {
    const nav = useCockpitNav();
    // --- LOCATION FILTER LOGIC ---
    const [selectedLieuId, setSelectedLieuId] = useState<string | null>(null);
    const [filterQuery, setFilterQuery] = useState('');
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // Fermer le dropdown si on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtrer les lieux disponibles pour le calcul des stats
    const filteredLieux = useMemo(() => {
        if (!lieux) return [];
        if (selectedLieuId) {
            return lieux.filter(l => l.id === selectedLieuId);
        }
        return lieux;
    }, [lieux, selectedLieuId]);

    const selectedLieuObject = useMemo(() => (lieux || []).find(l => l.id === selectedLieuId), [lieux, selectedLieuId]);

    // Filtrer la liste des options du dropdown
    const filterOptions = useMemo(() => {
        if (!lieux) return [];
        if (!filterQuery) return lieux;
        const lowerQuery = filterQuery.toLowerCase();
        return lieux.filter(l =>
            l.name.toLowerCase().includes(lowerQuery) ||
            (l.modules || []).some(m => m.type === AuditModuleType.DAT && (m.data as ModeData).stations?.[0]?.code?.toLowerCase().includes(lowerQuery))
        );
    }, [lieux, filterQuery]);

    // Use filtered lieux for stats calculation
    const { globalCounts, ecaBreakdown, maintenanceSummary, adhesiveInventory } = useStats(filteredLieux);

    // Référentiel signalétique : moteur d'index réseau (source unique).
    const { references, isLoading: refsLoading } = useSignageReferences();
    const patrimoineIndex = usePatrimoineIndex(filteredLieux, references);
    const needsReviewCount = useMemo(() => references.filter(r => r.needsReview).length, [references]);
    const activeReferencesCount = useMemo(() => references.filter(r => !r.isDisabled).length, [references]);

    // Anomalies Signalétique IV (DAT/PR/ECA) : exclusivement patrimoineIndex,
    // plus aucune lecture de generateMaintenanceSummary pour ce référentiel
    // (règle 7 : une seule source de calcul, à l'intérieur de ce référentiel).
    const refById = useMemo(() => new Map(references.map(r => [r.id, r])), [references]);
    const signaletiqueIvDefectItems = useMemo<MaintenanceItem[]>(() => (
        patrimoineIndex.implantations
            .filter(imp => imp.status === AdhesiveStatus.Absent || imp.status === AdhesiveStatus.ToBeReplaced)
            .map(imp => {
                const ref = refById.get(imp.referenceId);
                return {
                    lieuName: imp.lieuName,
                    moduleName: imp.moduleName,
                    elementName: imp.equipmentLabel,
                    context: imp.context,
                    adhesiveName: ref?.name ?? imp.referenceId,
                    status: imp.status,
                    category: LINE_TO_CATEGORY[imp.line],
                    auditType: ref?.auditType as AuditModuleType | undefined,
                };
            })
    ), [patrimoineIndex, refById]);

    // PMR sol / Pictogrammes cognitifs : référentiels autonomes hors
    // patrimoineIndex (règle 7) — conservés temporairement via le moteur
    // legacy, jamais additionnés silencieusement au total Signalétique IV.
    const autresReferentielsDefectItems = useMemo(() => (
        maintenanceSummary.allDefects.items.filter(item =>
            item.auditType === AuditModuleType.PMR_FLOOR_ADHESIVE || item.auditType === AuditModuleType.COGNITIVE_PICTOGRAMS
        )
    ), [maintenanceSummary]);

    const [searchTerm, setSearchTerm] = useState('');
    const [modalContent, setModalContent] = useState<{ title: string; items: MaintenanceItem[] } | null>(null);

    const filteredInventory = (adhesiveInventory || []).filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.auditType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.repere || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const categoryMap = useMemo(() => Object.fromEntries(
        AUDIT_CATEGORIES.map(c => [c.key, c])
    ), [] as any);

    const metroAConfig = categoryMap['METRO_A'];
    const metroBConfig = categoryMap['METRO_B'];
    const tramConfig = categoryMap['TRAM'];
    const teleoConfig = categoryMap['TELEO'];
    const lineCConfig = categoryMap['METRO_C'];
    const laeConfig = categoryMap['LAE'];

    return (
        <>
            {/* --- BARRE DE FILTRE PAR LIEU --- */}
            <div className="relative mb-6 z-20" ref={filterRef}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Filter className={`h-5 w-5 ${selectedLieuId ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`} aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        placeholder={selectedLieuId ? selectedLieuObject?.name : "Filtrer les données par lieu (Tout le réseau)..."}
                        value={filterQuery}
                        onChange={(e) => {
                            setFilterQuery(e.target.value);
                            setIsFilterDropdownOpen(true);
                        }}
                        onFocus={() => setIsFilterDropdownOpen(true)}
                        className={`block w-full rounded-lg border py-3 pl-10 pr-10 text-sm shadow-sm focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-base transition-colors ${
                            selectedLieuId
                            ? 'border-teal-500 bg-teal-50 text-teal-900 dark:bg-teal-900/20 dark:border-teal-500/50 dark:text-teal-100 placeholder:text-teal-700 dark:placeholder:text-teal-300 font-semibold'
                            : 'border-gray-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white placeholder:text-gray-400'
                        }`}
                    />
                    {selectedLieuId && (
                        <button
                            onClick={() => {
                                setSelectedLieuId(null);
                                setFilterQuery('');
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {isFilterDropdownOpen && (
                    <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {/* Option "Tout le réseau" */}
                        <li
                            className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 dark:text-slate-100 hover:bg-teal-50 dark:hover:bg-slate-700 font-medium border-b border-gray-100 dark:border-slate-700"
                            onClick={() => {
                                setSelectedLieuId(null);
                                setFilterQuery('');
                                setIsFilterDropdownOpen(false);
                            }}
                        >
                            <div className="flex items-center">
                                <span className="truncate text-teal-600 dark:text-teal-400">Tout le réseau</span>
                            </div>
                        </li>

                        {filterOptions.length === 0 ? (
                            <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-500 dark:text-slate-400 italic">
                                Aucun lieu trouvé
                            </li>
                        ) : (
                            filterOptions.map((lieu) => (
                                <li
                                    key={lieu.id}
                                    className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-slate-700"
                                    onClick={() => {
                                        setSelectedLieuId(lieu.id);
                                        setFilterQuery('');
                                        setIsFilterDropdownOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <LieuBadges lieu={lieu} />
                                        <span className="truncate">{lieu.name}</span>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>

            {/* BANNIÈRE ALERTES SIGNALÉTIQUE IV — pleine largeur, priorité maximale.
                Source exclusive : patrimoineIndex (règle 7 : une seule source de
                calcul à l'intérieur de ce référentiel). */}
            {patrimoineIndex.totals.defectCount > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:px-6">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                                    {patrimoineIndex.totals.defectCount} anomalie{patrimoineIndex.totals.defectCount > 1 ? 's' : ''} Signalétique IV détectée{patrimoineIndex.totals.defectCount > 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Éléments nécessitant une intervention de maintenance</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/40 rounded-lg px-3 py-1.5">
                                <span className="text-xl font-extrabold text-red-700 dark:text-red-300">{patrimoineIndex.totals.absentCount}</span>
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Absents</span>
                            </div>
                            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg px-3 py-1.5">
                                <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300">{patrimoineIndex.totals.toReplaceCount}</span>
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">À remplacer</span>
                            </div>
                            <button
                                onClick={() => setModalContent({ title: 'Anomalies Signalétique IV constatées', items: signaletiqueIvDefectItems })}
                                className="text-sm font-semibold text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline underline-offset-2 transition-colors whitespace-nowrap"
                            >
                                Voir la liste →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BANNIÈRE ALERTES PMR SOL / PICTOGRAMMES — référentiels autonomes,
                jamais additionnés au total Signalétique IV ci-dessus (règle 7). */}
            {autresReferentielsDefectItems.length > 0 && (
                <div className="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/40 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:px-6">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50">
                                <AlertTriangle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-sky-800 dark:text-sky-200">
                                    {autresReferentielsDefectItems.length} anomalie{autresReferentielsDefectItems.length > 1 ? 's' : ''} PMR sol / Pictogrammes cognitifs
                                </p>
                                <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5">Référentiels autonomes, distincts de la Signalétique IV</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setModalContent({ title: 'Anomalies PMR sol / Pictogrammes cognitifs', items: autresReferentielsDefectItems })}
                            className="text-sm font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100 underline underline-offset-2 transition-colors whitespace-nowrap flex-shrink-0"
                        >
                            Voir la liste →
                        </button>
                    </div>
                </div>
            )}

            {/* CARTE D'ACCÈS AU RÉFÉRENTIEL — compteur de santé, pas zone de travail.
                L'exploitation se fait dans les sections Référentiel / Analyse
                des anomalies / SAE ; les tuiles et boutons y mènent (navigation
                transverse). */}
            <StatCard
                title={`Référentiel Signalétique${selectedLieuId ? ` — ${selectedLieuObject?.name}` : ''}`}
                icon={<BookOpenCheck className="w-6 h-6" />}
            >
                <p className="text-sm text-slate-500 dark:text-slate-400 -mt-3">
                    État du parc des références suivies (familles DAT / P+R / ECA) — cliquez pour explorer.
                </p>
                {refsLoading ? (
                    <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm">Chargement du référentiel…</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            <IndicatorTile value={activeReferencesCount} label="Références actives" tone="sky" onClick={() => nav.navigate({ section: 'referentiel' })} />
                            <IndicatorTile value={patrimoineIndex.totals.implantationCount} label="Exemplaires suivis" tone="slate" onClick={() => nav.navigate({ section: 'referentiel' })} />
                            <IndicatorTile value={patrimoineIndex.totals.okCount} label="Conformes" tone="teal" />
                            <IndicatorTile value={patrimoineIndex.totals.defectCount} label="Anomalies" tone="red" onClick={() => nav.navigate({ section: 'audit' })} />
                            <IndicatorTile value={patrimoineIndex.totals.uncheckedCount} label="Non contrôlés" tone="amber" />
                            <IndicatorTile value={needsReviewCount} label="À qualifier" tone="amber" onClick={() => nav.navigate({ section: 'referentiel', subSection: 'qualification' })} />
                        </div>
                        <div className="flex flex-wrap gap-3 pt-1">
                            <button
                                onClick={() => nav.navigate({ section: 'referentiel' })}
                                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
                            >
                                Explorer le référentiel →
                            </button>
                            <button
                                onClick={() => nav.navigate({ section: 'audit' })}
                                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 text-sm font-semibold transition-colors"
                            >
                                Voir les anomalies →
                            </button>
                            <button
                                onClick={() => nav.navigate({ section: 'referentiel', subSection: 'qualification' })}
                                className="px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 text-sm font-semibold transition-colors"
                            >
                                Qualifier le référentiel ({needsReviewCount}) →
                            </button>
                        </div>
                    </>
                )}
            </StatCard>

            {/* Grille principale : Aperçu Global (2/3) + Alertes (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLONNE GAUCHE (2/3) : Aperçu Global */}
                <div className="lg:col-span-2 space-y-8">

                <StatCard
                    title={selectedLieuId ? `Aperçu : ${selectedLieuObject?.name}` : "Aperçu Global du Réseau"}
                    icon={<Building className="w-6 h-6" />}
                >
                    <div className="space-y-6">

                    {/* Ligne 1 : Billettique et P+R */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Billettique */}
                        <div>
                        <SectionTitle>Équipements Billettique</SectionTitle>
                        <div className="space-y-4">
                            {/* DAT */}
                            <div>
                            <StatRow icon={<Euro className="w-5 h-5" />} label="DAT (Distributeurs)" value={globalCounts.datCount} highlight="primary" />
                            <div className="space-y-1 mt-1">
                                {selectedLieuId ? null : (
                                    <>
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.datCountA} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.datCountB} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" />Ligne C</span>} value={globalCounts.datCountC} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={laeConfig} size="sm" />Aéroport Express</span>} value={globalCounts.datCountAero} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" />Tram</span>} value={globalCounts.datCountTram} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={teleoConfig} size="sm" />Téléo</span>} value={globalCounts.datCountTeleo} isSubItem />
                                    </>
                                )}
                            </div>
                            </div>

                            <hr className="border-dashed border-slate-100 dark:border-slate-700/50" />

                            {/* ECA */}
                            <div>
                            <StatRow icon={<Fence className="w-5 h-5" />} label="ECA (Valideurs)" value={globalCounts.ecaCount} highlight="primary" />
                            {selectedLieuId ? (
                                <div className="space-y-1 mt-1">
                                    <StatRow label="Dont PMR" value={globalCounts.ecaPmrCount} isSubItem />
                                </div>
                            ) : (
                                <EcaLineDetail ecaBreakdown={ecaBreakdown} configs={{ metroAConfig, metroBConfig, lineCConfig, laeConfig }} />
                            )}
                            </div>
                        </div>
                        </div>

                        {/* Parkings Relais */}
                        <div>
                        <SectionTitle>Parkings Relais (P+R)</SectionTitle>
                        <div className="space-y-4">
                            {selectedLieuId ? null : <StatRow icon={<Car className="w-5 h-5" />} label="Nombre de P+R" value={globalCounts.prCount} highlight="primary" />}
                            <StatRow icon={<Car className="w-4 h-4" />} label="Bornes Entrée" value={globalCounts.beCount} />
                            <StatRow icon={<Car className="w-4 h-4" />} label="Bornes Sortie" value={globalCounts.bsCount} />
                            <StatRow icon={<Euro className="w-4 h-4" />} label="Caisses Auto" value={globalCounts.caCount} />
                        </div>
                        </div>
                    </div>

                    <hr className="border-dashed border-slate-200 dark:border-slate-700" />

                    {/* Ligne 2 : Stations et Audits */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Stations */}
                        <div>
                        {selectedLieuId ? (
                             <div className="py-4">
                                <p className="text-gray-500 dark:text-slate-400 italic">Détails de la station affichés.</p>
                             </div>
                        ) : (
                            <>
                            <SectionTitle>Stations par Ligne</SectionTitle>
                            <StatRow icon={<MapPin className="w-5 h-5" />} label="Total Stations" value={globalCounts.stationCountTotal} highlight="primary" />
                            <div className="space-y-1 mt-1">
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.stationCountA} isSubItem />
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.stationCountB} isSubItem />
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" />Ligne C</span>} value={globalCounts.stationCountC} isSubItem />
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={laeConfig} size="sm" />Aéroport Express</span>} value={globalCounts.stationCountAero} isSubItem />
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" />Tram</span>} value={globalCounts.stationCountTram} isSubItem />
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={teleoConfig} size="sm" />Téléo</span>} value={globalCounts.stationCountTeleo} isSubItem />
                            </div>
                            </>
                        )}
                        </div>

                        {/* Audits */}
                        <div>
                        <SectionTitle>Stations avec Audit Spécifique</SectionTitle>
                        <div className="space-y-4">
                            <div>
                            <StatRow icon={<Footprints className="w-5 h-5" />} label="Audit Sol PMR" value={globalCounts.pmrFloorAdhesiveCount} />
                            {selectedLieuId ? null : (
                                <div className="space-y-1 mt-1">
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.pmrFloorAdhesiveCountA} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.pmrFloorAdhesiveCountB} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" />Ligne C</span>} value={globalCounts.pmrFloorAdhesiveCountC} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={laeConfig} size="sm" />Aéroport Express</span>} value={globalCounts.pmrFloorAdhesiveCountAero} isSubItem />
                                </div>
                            )}
                            </div>
                            <div>
                            <StatRow icon={<ScanEye className="w-5 h-5" />} label="Audit Pictos Cognitifs" value={globalCounts.cogPictoCount} />
                            {selectedLieuId ? null : (
                                <div className="space-y-1 mt-1">
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.cogPictoCountA} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.cogPictoCountB} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" />Ligne C</span>} value={globalCounts.cogPictoCountC} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={laeConfig} size="sm" />Aéroport Express</span>} value={globalCounts.cogPictoCountAero} isSubItem />
                                </div>
                            )}
                            </div>
                            <div>
                            <StatRow icon={<Layout className="w-5 h-5" />} label="Équipements Station" value={globalCounts.signaletiqueCount} />
                            {selectedLieuId ? null : (
                                <div className="space-y-1 mt-1">
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" />Tram</span>} value={globalCounts.signaletiqueCountTram} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={laeConfig} size="sm" />Aéroport Express</span>} value={globalCounts.signaletiqueCountAero} isSubItem />
                                </div>
                            )}
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>
                </StatCard>
                </div>

                {/* COLONNE DROITE (1/3) : Alertes Anomalies */}
                <div className="lg:col-span-1 space-y-8">
                <StatCard
                    title="Alertes Anomalies"
                    icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
                    className="!border-red-500/10 dark:!border-red-900/50" // Surcharge de la bordure pour l'alerte
                >
                    <p className="text-sm text-slate-500 dark:text-slate-400 -mt-3">Aperçu des éléments Signalétique IV signalés comme anomalies.</p>
                    <div className="space-y-4">
                    {/* BOUTON UNIQUE PRINCIPAL — source exclusive : patrimoineIndex */}
                    <StatRow
                        label="Total Anomalies Signalétique IV"
                        value={patrimoineIndex.totals.defectCount}
                        highlight="danger"
                        onClick={() => setModalContent({ title: 'Anomalies Signalétique IV constatées', items: signaletiqueIvDefectItems })}
                    />

                    {/* DÉTAILS NON CLIQUABLES (À TITRE INFORMATIF) */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 text-center">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{patrimoineIndex.totals.absentCount}</div>
                            <div className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase mt-1">Absents</div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 text-center">
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{patrimoineIndex.totals.toReplaceCount}</div>
                            <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase mt-1">À remplacer</div>
                        </div>
                    </div>

                    {/* PMR sol / Pictogrammes — référentiels autonomes, jamais
                        additionnés au total Signalétique IV ci-dessus (règle 7). */}
                    {autresReferentielsDefectItems.length > 0 && (
                        <StatRow
                            label="PMR sol / Pictogrammes cognitifs"
                            value={autresReferentielsDefectItems.length}
                            highlight="info"
                            onClick={() => setModalContent({ title: 'Anomalies PMR sol / Pictogrammes cognitifs', items: autresReferentielsDefectItems })}
                        />
                    )}
                    </div>
                </StatCard>
                </div>
            </div>

            <hr className="border-dashed border-slate-200 dark:border-slate-700 my-4" />

            {/* Inventaire Adhésifs (Pleine largeur) */}
            <StatCard title={`Inventaire Détaillé ${selectedLieuId ? ' - ' + selectedLieuObject?.name : ''}`} icon={<Search className="w-6 h-6" />}>
                <div>
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                    type="text"
                    placeholder="Rechercher par nom, type ou repère..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="block w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 pl-10 pr-3 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                    />
                </div>

                <div className="overflow-auto max-h-96 border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
                    <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 text-left text-slate-700 dark:text-slate-200 shadow-sm">
                        <tr>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Type</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Rep.</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Nom du Produit</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider hidden sm:table-cell">Dimensions (cm)</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider hidden md:table-cell">Matière / Usage</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider text-center">Qté réseau</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInventory.map((item, idx) => (
                        <tr key={item.id} className={`hover:bg-teal-50/50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
                            <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">{item.auditType}</td>
                            <td className="p-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{item.repere}</td>
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                            <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 hidden sm:table-cell">{item.dimensions}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">{item.material}</td>
                            <td className="p-3 text-center font-bold text-teal-700 dark:text-teal-400">
                                {item.quantity > 0 ? item.quantity : <span className="text-slate-400 font-normal">—</span>}
                            </td>
                        </tr>
                        ))}

                        {(!filteredInventory || filteredInventory.length === 0) && (
                        <tr>
                            <td colSpan={6} className="p-6 text-center text-base text-slate-500 dark:text-slate-400">Aucun adhésif trouvé correspondant à la recherche "{searchTerm}"</td>
                        </tr>
                        )}
                    </tbody>
                    </table>
                </div>
                </div>
            </StatCard>

            <MaintenanceListModal
                isOpen={!!modalContent}
                onClose={() => setModalContent(null)}
                title={modalContent?.title || ''}
                items={modalContent?.items || []}
            />
        </>
    );
};

export default SyntheseView;
