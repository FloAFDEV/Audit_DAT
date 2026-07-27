// components/cockpit/SyntheseView.tsx
// Section « Synthèse » du cockpit — vision globale du réseau.
// Contenu déplacé depuis StatsPage (onglet current), enrichi d'un bloc
// « Référentiel signalétique » servi par le moteur d'index réseau
// (contrat de plateforme : aucune donnée agrégée calculée localement).
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Car, Euro, Fence, ScanEye, Search, Footprints, MapPin, Building, X, Filter, Layout, BookOpenCheck } from 'lucide-react';
import { Lieu, MaintenanceItem, AuditModuleType, ModeData, EcaEquipmentType } from '../../types';
import { useStats } from '../../hooks/useStats';
import { useSignageReferences } from '../../hooks/useSignageReferences';
import { usePatrimoineIndex } from '../../hooks/usePatrimoineIndex';
import { useSignaletiqueStationIndex } from '../../hooks/useSignaletiqueStationIndex';
import { signaletiqueStationDefectsToMaintenanceItems } from '../../utils/cockpit/signaletiqueStationIndex';
import { AUDIT_CATEGORIES } from '../../data/config';
import { CategoryIcon } from '../CategoryIcon';
import MaintenanceListModal from '../MaintenanceListModal';
import { LieuBadges } from '../Icons';
import { StatCard, SectionTitle, StatRow, IndicatorTile, AnomalySummaryCard } from './primitives';
import { useCockpitNav } from './cockpitNav';

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
    // Une seule colonne sur mobile : à 2 colonnes sous 640px, les libellés les
    // plus longs (« PMR vantaux réversible ») étaient tronqués.
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5">
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
    // Lignes disposées côte à côte (2 colonnes) plutôt qu'empilées : ECA est
    // le bloc le plus dense de l'Aperçu, et c'est la comparaison ENTRE lignes
    // qui a du sens métier. Les lignes encore à 0 (C, Aéroport) se regroupent
    // ainsi sur la même rangée au lieu de trouer la grille.
    return (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
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

    // Signalétique IV (DAT/PR/ECA) : totaux exclusivement patrimoineIndex
    // (règle 7 : une seule source de calcul, à l'intérieur de ce référentiel).
    // Le détail (liste + export) vit désormais dans Analyse des anomalies,
    // pas ici — Synthèse ne fait qu'orienter (nav.navigate).

    // PMR sol / Pictogrammes cognitifs : référentiels autonomes hors
    // patrimoineIndex (règle 7) — conservés temporairement via le moteur
    // legacy, jamais additionnés silencieusement au total Signalétique IV,
    // ni fusionnés entre eux : deux référentiels distincts, deux compteurs.
    const pmrSolDefectItems = useMemo(() => (
        maintenanceSummary.allDefects.items.filter(item => item.auditType === AuditModuleType.PMR_FLOOR_ADHESIVE)
    ), [maintenanceSummary]);
    const pictogrammesDefectItems = useMemo(() => (
        maintenanceSummary.allDefects.items.filter(item => item.auditType === AuditModuleType.COGNITIVE_PICTOGRAMS)
    ), [maintenanceSummary]);

    // Équipements Station : référentiel autonome, sa propre instance du
    // principe de calcul patrimonial (règle 7), jamais fusionné avec les
    // autres. Source unique : useSignaletiqueStationIndex.
    const signaletiqueStationIndex = useSignaletiqueStationIndex(filteredLieux);
    const signaletiqueStationDefectItems = useMemo(() => (
        signaletiqueStationDefectsToMaintenanceItems(signaletiqueStationIndex.items)
    ), [signaletiqueStationIndex]);

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

            {/* ÉTAT DES ANOMALIES — zone dédiée, une carte compacte par
                référentiel autonome (règle 7 : jamais fusionnées). Chaque
                carte restitue un compte déjà produit ailleurs, elle ne
                recalcule rien. Signalétique IV oriente vers Analyse des
                anomalies (son espace opérationnel) ; PMR sol / Pictogrammes
                cognitifs ouvrent la liste existante faute de section dédiée. */}
            <section>
                <SectionTitle>État des anomalies</SectionTitle>
                {/* Une colonne par référentiel : la grille suit le nombre réel
                    de référentiels (4), sinon la dernière carte reste orpheline
                    sur une seconde rangée aux deux tiers vide. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AnomalySummaryCard
                        icon={<BookOpenCheck className="w-4 h-4" />}
                        title="Signalétique IV"
                        count={patrimoineIndex.totals.defectCount}
                        subCounts={[
                            { label: 'absents', value: patrimoineIndex.totals.absentCount, tone: 'red' },
                            { label: 'à remplacer', value: patrimoineIndex.totals.toReplaceCount, tone: 'amber' },
                        ]}
                        detailLabel="Voir le détail"
                        onDetail={() => nav.navigate({ section: 'audit' })}
                    />
                    <AnomalySummaryCard
                        icon={<Footprints className="w-4 h-4" />}
                        title="PMR sol"
                        count={pmrSolDefectItems.length}
                        detailLabel="Voir le détail"
                        detailDisabled={pmrSolDefectItems.length === 0}
                        onDetail={() => setModalContent({ title: 'Anomalies PMR sol', items: pmrSolDefectItems })}
                    />
                    <AnomalySummaryCard
                        icon={<ScanEye className="w-4 h-4" />}
                        title="Pictogrammes cognitifs"
                        count={pictogrammesDefectItems.length}
                        detailLabel="Voir le détail"
                        detailDisabled={pictogrammesDefectItems.length === 0}
                        onDetail={() => setModalContent({ title: 'Anomalies Pictogrammes cognitifs', items: pictogrammesDefectItems })}
                    />
                    <AnomalySummaryCard
                        icon={<Layout className="w-4 h-4" />}
                        title="Anomalies Équipements Station"
                        count={signaletiqueStationIndex.totals.defectCount}
                        subCounts={[
                            { label: 'absents', value: signaletiqueStationIndex.totals.absentCount, tone: 'red' },
                            { label: 'à remplacer', value: signaletiqueStationIndex.totals.toReplaceCount, tone: 'amber' },
                            { label: 'HS', value: signaletiqueStationIndex.totals.hsCount, tone: 'red' },
                        ]}
                        detailLabel="Voir le détail"
                        detailDisabled={signaletiqueStationDefectItems.length === 0}
                        onDetail={() => setModalContent({ title: 'Anomalies Équipements Station', items: signaletiqueStationDefectItems })}
                    />
                </div>
            </section>

            {/* CARTE D'ACCÈS AU RÉFÉRENTIEL — compteur de santé, pas zone de travail.
                L'exploitation se fait dans les sections Référentiel / Analyse
                des anomalies / SAE ; les tuiles et boutons y mènent (navigation
                transverse). */}
            <StatCard
                title={`Référentiel Signalétique${selectedLieuId ? ` — ${selectedLieuObject?.name}` : ''}`}
                icon={<BookOpenCheck className="w-6 h-6" />}
            >
                {refsLoading ? (
                    <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-sm">Chargement du référentiel…</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
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

            {/* Aperçu Global du Réseau — bloc de contexte volumétrique, sous
                l'État des anomalies. Synthèse reste une vue d'état : le
                traitement se fait dans Analyse des anomalies (Signalétique IV)
                ou via la liste PMR sol/Pictogrammes ci-dessus — jamais ici.
                Principe de grille : UN SEUL NIVEAU HIÉRARCHIQUE PAR CELLULE
                (une famille d'équipement, ou un axe de couverture) et la
                largeur accordée suit la densité réelle du bloc. */}
            <StatCard
                title={selectedLieuId ? `Aperçu : ${selectedLieuObject?.name}` : "Aperçu Global du Réseau"}
                icon={<Building className="w-6 h-6" />}
            >
                <div className="space-y-8">

                {/* Rangée 1 — DAT et P+R : deux familles de volume comparable,
                    répondant à la même question (combien de points, par
                    ligne ou par zone). */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">

                    {/* DAT */}
                    <div>
                    <StatRow icon={<Euro className="w-5 h-5" />} label="DAT (Distributeurs)" value={globalCounts.datCount} highlight="primary" />
                    <div className="space-y-1 mt-2">
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

                {/* Rangée 2 — ECA sur toute la largeur. C'est le bloc le plus
                    dense de la carte (4 lignes × jusqu'à 8 types) : lui donner
                    la pleine largeur permet de disposer les lignes CÔTE À CÔTE
                    plutôt qu'empilées. On compare enfin les lignes entre elles
                    type par type, au lieu de faire défiler. */}
                <div>
                <StatRow icon={<Fence className="w-5 h-5" />} label="ECA (Valideurs)" value={globalCounts.ecaCount} highlight="primary" />
                {selectedLieuId ? (
                    <div className="space-y-1 mt-2">
                        <StatRow label="Dont PMR" value={globalCounts.ecaPmrCount} isSubItem />
                    </div>
                ) : (
                    <EcaLineDetail ecaBreakdown={ecaBreakdown} configs={{ metroAConfig, metroBConfig, lineCConfig, laeConfig }} />
                )}
                </div>

                <hr className="border-dashed border-slate-200 dark:border-slate-700" />

                {/* Rangée 3 — couverture d'audit. « Stations par ligne » est une
                    liste simple : une colonne suffit. « Audit spécifique »
                    porte trois familles indépendantes, qui se lisent côte à
                    côte plutôt qu'empilées — d'où le 1/3 + 2/3. */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

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
                        <div className="space-y-1 mt-2">
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

                    {/* Audits — trois familles autonomes, une colonne chacune. */}
                    <div className="lg:col-span-2">
                    <SectionTitle>Stations avec Audit Spécifique</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                        <div>
                        <StatRow icon={<Footprints className="w-5 h-5" />} label="Audit Sol PMR" value={globalCounts.pmrFloorAdhesiveCount} />
                        {selectedLieuId ? null : (
                            <div className="space-y-1 mt-2">
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
                            <div className="space-y-1 mt-2">
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
                            <div className="space-y-1 mt-2">
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

                {/* Desktop/tablette : tableau complet. */}
                <div className="hidden sm:block overflow-auto max-h-96 border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
                    <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 text-left text-slate-700 dark:text-slate-200 shadow-sm">
                        <tr>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Type</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Rep.</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Nom du Produit</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider hidden md:table-cell">Dimensions (cm)</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Matière / Usage</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider text-center">Qté réseau</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInventory.map((item, idx) => (
                        <tr key={item.id} className={`hover:bg-teal-50/50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
                            <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">{item.auditType}</td>
                            <td className="p-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{item.repere}</td>
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                            <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 hidden md:table-cell">{item.dimensions}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 hidden lg:table-cell">{item.material}</td>
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

                {/* Mobile : présentation carte, plus lisible qu'un tableau
                    compressé sur petit écran (colonnes secondaires intégrées
                    en ligne, pas masquées silencieusement). */}
                <div className="sm:hidden space-y-2 max-h-96 overflow-auto">
                    {filteredInventory.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <div className="min-w-0">
                                <div className="text-[11px] font-semibold uppercase text-teal-600 dark:text-teal-400 truncate">
                                    {item.auditType}{item.repere ? ` · ${item.repere}` : ''}
                                </div>
                                <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{item.name}</div>
                                {(item.dimensions || item.material) && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                        {[item.dimensions, item.material].filter(Boolean).join(' · ')}
                                    </div>
                                )}
                            </div>
                            <div className="flex-shrink-0 text-right">
                                <div className="text-lg font-bold text-teal-700 dark:text-teal-400">
                                    {item.quantity > 0 ? item.quantity : <span className="text-slate-400 font-normal">—</span>}
                                </div>
                                <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">réseau</div>
                            </div>
                        </div>
                    ))}

                    {(!filteredInventory || filteredInventory.length === 0) && (
                        <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                            Aucun adhésif trouvé correspondant à la recherche « {searchTerm} ».
                        </p>
                    )}
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
