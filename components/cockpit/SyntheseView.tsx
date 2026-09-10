// components/cockpit/SyntheseView.tsx
// Section « Synthèse » du cockpit — vision globale du réseau.
// Contenu déplacé depuis StatsPage (onglet current), enrichi d'un bloc
// « Référentiel signalétique » servi par le moteur d'index réseau
// (contrat de plateforme : aucune donnée agrégée calculée localement).
import React, { useMemo, useState, useEffect, useRef } from 'react';
// `Map` est importée sous alias : le nom brut masquerait le constructeur
// Map natif utilisé par les agrégations de ce fichier.
import { Car, Euro, Fence, ScanEye, Search, Footprints, MapPin, Map as MapIcon, Building, X, Filter, Layout, BookOpenCheck } from 'lucide-react';
import { Lieu, MaintenanceItem, AuditModuleType, ModeData, EcaEquipmentType, AdhesiveStatus } from '../../types';
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
import { formatDimensions } from './labels';
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

const EcaLineDetail: React.FC<{ ecaBreakdown: any; configs: any; total: number }> = ({ ecaBreakdown, configs, total }) => {
    const { metroAConfig, metroBConfig, lineCConfig, laeConfig } = configs;

    // COLONNES DÉRIVÉES DU PÉRIMÈTRE RÉEL DU RÉFÉRENTIEL ECA, et non de la
    // liste générale des lignes du réseau. Le critère est l'EXISTENCE D'UN
    // MODULE D'AUDIT ECA sur la ligne (moduleCount), pas le nombre
    // d'équipements recensés — ce qui distingue les deux situations :
    //
    //   1. ligne DANS le périmètre mais pas encore équipée (des modules ECA
    //      existent, total à 0) → colonne conservée, atténuée, cellules « — » ;
    //   2. ligne HORS périmètre, qui relève d'une autre famille de validation
    //      (validation ouverte : valideurs de type bus, sans bras ni vantaux,
    //      au quai ou à bord) → aucun module ECA, donc aucune colonne.
    //
    // Aucune exclusion en dur : si des ECA sont rattachés demain à une ligne,
    // sa colonne apparaît automatiquement, sans modification du code.
    const lines = [
        { key: 'A',        label: 'Ligne A',          cfg: metroAConfig, data: ecaBreakdown.byLine.A },
        { key: 'B',        label: 'Ligne B',          cfg: metroBConfig, data: ecaBreakdown.byLine.B },
        { key: 'C',        label: 'Ligne C',          cfg: lineCConfig,  data: ecaBreakdown.byLine.C },
        { key: 'AEROPORT', label: 'Aéroport Express', cfg: laeConfig,    data: ecaBreakdown.byLine.AEROPORT },
    ].filter(l => (l.data?.moduleCount ?? 0) > 0);

    if (lines.length === 0) return null;

    // Ligne du périmètre pas encore équipée : fond très léger sur sa colonne et
    // total atténué — le vide se lit comme un état du réseau, pas comme une
    // donnée manquante. La teinte disparaît d'elle-même au premier équipement.
    const mutedCell = 'bg-slate-50/70 dark:bg-slate-800/30';

    // Types affichés : ceux présents sur au moins une ligne du périmètre. Un
    // type absent partout n'apparaît pas ; absent d'une seule ligne, il
    // s'affiche « — » (le marqueur de valeur nulle déjà utilisé dans
    // l'Inventaire Détaillé), jamais un zéro inventé.
    const rows = ECA_TYPE_ROWS.filter(({ type }) => lines.some(l => (l.data.byType?.[type] ?? 0) > 0));

    return (
        <div className="mt-4 overflow-x-auto">
            {/* Colonne de libellés fixe et colonnes de lignes à part égale
                (table-fixed) : la largeur d'une colonne ne dépend donc pas de
                la longueur du nom de ligne, et s'adapte au nombre de lignes
                réellement dans le périmètre. Pas de largeur plafonnée : le
                tableau occupe toute la largeur disponible de la carte (un
                max-w-3xl fixe laissait ~35 % de la largeur inutilisée sur
                desktop large, cf. dernière passe corrective ECA) ; seul un
                plancher (min-w) est conservé pour rester lisible en dessous,
                quitte à défiler horizontalement dans ce conteneur. */}
            <table className="w-full min-w-[30rem] table-fixed text-sm">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th scope="col" className="w-[34%] py-2 pr-3 align-bottom text-left">
                            {/* Cellule d'angle : le total global rejoint ici le
                                même niveau de hiérarchie que les totaux par
                                ligne (label + grande valeur), pour se lire
                                sans ambiguïté comme LE total dont les colonnes
                                suivantes sont la ventilation — pas comme un
                                nombre isolé au-dessus du tableau. */}
                            <span className="flex items-center gap-1.5 text-xs font-semibold leading-tight text-slate-700 dark:text-slate-200">
                                <Fence className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span>Total ECA</span>
                            </span>
                            {/* N1 — le total global doit rester le plus gros
                                chiffre de la matrice, sinon les totaux par
                                ligne (N2) le domineraient visuellement. */}
                            <span className="block mt-1 text-left text-2xl font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">
                                {total}
                            </span>
                        </th>
                        {lines.map(({ key, label, cfg, data }) => (
                            <th key={key} scope="col" className={`py-2 px-2 align-bottom ${data.total > 0 ? '' : mutedCell}`}>
                                {/* Le nom de ligne passe à la ligne plutôt que
                                    d'être tronqué. */}
                                <span className="flex items-center justify-end gap-1.5 text-xs font-semibold leading-tight text-right text-slate-700 dark:text-slate-200">
                                    <CategoryIcon categoryConfig={cfg} size="sm" />
                                    <span>{label}</span>
                                </span>
                                {/* N2 — total d'un axe : même teal que le total
                                    global, un cran en dessous en taille. La
                                    ventilation par ligne est une information
                                    de décision, pas un détail secondaire. */}
                                <span className={`block mt-1 text-right text-xl font-bold tabular-nums ${data.total > 0 ? 'text-teal-700 dark:text-teal-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {data.total}
                                    <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">({data.pmr} PMR)</span>
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {rows.map(({ label, type }) => (
                        <tr key={type}>
                            <th scope="row" className="py-1.5 pr-3 text-left text-xs font-normal text-slate-500 dark:text-slate-400 truncate">{label}</th>
                            {lines.map(({ key, data }) => {
                                const count = data.byType?.[type] ?? 0;
                                return (
                                    <td key={key} className={`py-1.5 px-2 text-right text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100 ${data.total > 0 ? '' : mutedCell}`}>
                                        {count > 0 ? count : <span className="font-normal text-slate-300 dark:text-slate-600">—</span>}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/* =====================
   Plans de quartier — lecture en trois bandes : combien au total, de quel
   format, et où. Aucune donnée recalculée ici : tout provient de
   patrimoineIndex (contrat de plateforme #1). Les totaux suivent donc les
   occurrences RÉELLEMENT recensées, jamais un attendu théorique — pendant
   la phase de recensement, ils grandissent au fil des passages terrain.
   ===================== */

/** Ordre de lecture métier des formats, indépendant de l'ordre du seed. */
const PDQ_MODEL_ORDER = ['pdq-78x100', 'pdq-78x120', 'pdq-adhesif', 'pem3d-120x80'];

/** Libellés courts : le nom complet du référentiel (« Plan de quartier
 *  78×100 (sans header ni footer) ») ne tient pas dans une tuile. */
const PDQ_TILE_LABELS: Record<string, string> = {
    'pdq-78x100': '78 × 100',
    'pdq-78x120': '78 × 120',
    'pdq-adhesif': 'Adhésif',
    'pem3d-120x80': 'PEM 3D',
    'adca12': 'Caisse Auto',
};

/** Libellés du détail par station. La tuile porte sa dimension sur une
 *  ligne dédiée ; ici tout tient sur une seule ligne, donc les libellés
 *  qui ne sont pas déjà un format le portent explicitement — un plan en
 *  agence se lit « Adhésif 78 × 120 », pas « Adhésif ». */
const PDQ_DETAIL_LABELS: Record<string, string> = {
    ...PDQ_TILE_LABELS,
    'pdq-adhesif': 'Adhésif 78 × 120',
};

const PDQ_LINE_LABELS: Record<string, string> = {
    A: 'Métro A', B: 'Métro B', C: 'Métro C',
    TRAM: 'Tram T1', TELEO: 'Téléo', AEROPORT: 'Aéroport Express',
};

/** Le 78x120 posé sur les caisses automatiques de P+R est recensé par
 *  l'audit P+R (référence adca12), jamais ressaisi côté Plans de quartier —
 *  mais il compte dans le patrimoine réseau, donc il figure ici. */
const PDQ_CAISSE_AUTO_REF_ID = 'adca12';

const PlanQuartierOverview: React.FC<{
    patrimoineIndex: any;
    references: any[];
    lineConfigs: Record<string, any>;
    onOpenReference: (referenceId: string) => void;
}> = ({ patrimoineIndex, references, lineConfigs, onOpenReference }) => {
    const models = useMemo(() => {
        const pdq = references.filter(r => r.auditType === 'PDQ' && !r.isDisabled);
        return [...pdq].sort((a, b) => PDQ_MODEL_ORDER.indexOf(a.id) - PDQ_MODEL_ORDER.indexOf(b.id));
    }, [references]);

    const caisseAutoUsage = patrimoineIndex.byReference.get(PDQ_CAISSE_AUTO_REF_ID);

    const tiles = useMemo(() => {
        const fromModels = models.map(ref => {
            const usage = patrimoineIndex.byReference.get(ref.id);
            return {
                id: ref.id,
                label: PDQ_TILE_LABELS[ref.id] ?? ref.name,
                hint: formatDimensions(ref.dimensions),
                installed: usage?.installedCount ?? 0,
                defects: usage?.defectCount ?? 0,
                elsewhere: false,
            };
        });
        if (caisseAutoUsage && caisseAutoUsage.installedCount > 0) {
            fromModels.push({
                id: PDQ_CAISSE_AUTO_REF_ID,
                label: 'Caisse Auto P+R',
                hint: 'suivi en audit P+R',
                installed: caisseAutoUsage.installedCount,
                defects: caisseAutoUsage.defectCount,
                elsewhere: true,
            });
        }
        return fromModels;
    }, [models, patrimoineIndex, caisseAutoUsage]);

    const total = tiles.reduce((sum, t) => sum + t.installed, 0);
    const totalDefects = tiles.reduce((sum, t) => sum + t.defects, 0);
    const caisseAutoCount = caisseAutoUsage?.installedCount ?? 0;

    // Détail par ligne → station, dérivé des implantations déjà indexées.
    // Un lieu n'apparaît que s'il porte réellement un exemplaire : pas de
    // faux zéro, pas de station inventée.
    const byLine = useMemo(() => {
        const modelIds = new Set(models.map(m => m.id));
        const lineMap = new Map<string, Map<string, { installed: number; defects: number; formats: Map<string, number> }>>();
        for (const imp of patrimoineIndex.implantations as any[]) {
            if (!modelIds.has(imp.referenceId)) continue;
            const stations = lineMap.get(imp.line) ?? new Map();
            const entry = stations.get(imp.lieuName) ?? { installed: 0, defects: 0, formats: new Map<string, number>() };
            entry.installed += 1;
            if (imp.status === AdhesiveStatus.Absent || imp.status === AdhesiveStatus.ToBeReplaced) entry.defects += 1;
            const shortLabel = PDQ_DETAIL_LABELS[imp.referenceId] ?? imp.referenceId;
            entry.formats.set(shortLabel, (entry.formats.get(shortLabel) ?? 0) + 1);
            stations.set(imp.lieuName, entry);
            lineMap.set(imp.line, stations);
        }
        return [...lineMap.entries()]
            .map(([line, stations]) => ({
                line,
                cfg: lineConfigs[line],
                label: PDQ_LINE_LABELS[line] ?? line,
                installed: [...stations.values()].reduce((s, v) => s + v.installed, 0),
                stations: [...stations.entries()]
                    .map(([name, v]) => ({ name, ...v }))
                    .sort((a, b) => b.installed - a.installed || a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => b.installed - a.installed || a.label.localeCompare(b.label));
    }, [models, patrimoineIndex, lineConfigs]);

    if (total === 0) {
        return (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic mt-2">
                Aucun plan de quartier recensé pour l'instant — les totaux se rempliront au fil des passages terrain.
            </p>
        );
    }

    return (
        <div className="mt-4 space-y-6">
            {/* Bande 1 — total réseau (N1) + ce qui appelle une action (N5). */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">{total}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    exemplaires recensés
                    {caisseAutoCount > 0 && <> · dont {caisseAutoCount} sur caisses auto (audit P+R)</>}
                </span>
                {totalDefects > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
                        {totalDefects} à traiter
                    </span>
                )}
            </div>

            {/* Bande 2 — par format (N3). Vue « bureau » : préparer une commande. */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {tiles.map(t => (
                    <IndicatorTile
                        key={t.id}
                        size="sm"
                        value={t.installed}
                        label={t.label}
                        hint={t.hint}
                        tone={t.elsewhere ? 'sky' : 'slate'}
                        onClick={() => onOpenReference(t.id)}
                    />
                ))}
            </div>

            {/* Bande 3 — par ligne puis station. Vue « terrain » : où aller. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                {byLine.map(({ line, cfg, label, installed, stations }) => (
                    <div key={line}>
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-1">
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {cfg && <CategoryIcon categoryConfig={cfg} size="sm" />}
                                {label}
                            </span>
                            <span className="text-xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">{installed}</span>
                        </div>
                        <ul className="mt-2 space-y-3">
                            {stations.map(st => (
                                <li key={st.name} className="flex items-start justify-between gap-3">
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{st.name}</span>
                                        <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                                            {[...st.formats.entries()].map(([f, n]) => `${f} ×${n}`).join(' · ')}
                                        </span>
                                    </span>
                                    <span className="flex-shrink-0 flex items-baseline gap-2">
                                        {st.defects > 0 && (
                                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">{st.defects} à traiter</span>
                                        )}
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{st.installed}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
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

    // Référentiel signalétique : moteur d'index réseau (source unique) —
    // lu AVANT useStats, dont la Nomenclature (adhesiveInventory) en dépend
    // désormais directement (mêmes références, jamais une deuxième source).
    const { references, isLoading: refsLoading } = useSignageReferences();
    const patrimoineIndex = usePatrimoineIndex(filteredLieux, references);

    // Use filtered lieux for stats calculation
    const { globalCounts, ecaBreakdown, maintenanceSummary, adhesiveInventory } = useStats(filteredLieux, references);
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

    // Lecture synthétique ECA (vue mono-station) : partition des 8 types
    // techniques en catégories métier lisibles au premier coup d'œil, sans
    // tournure « Dont » qui masquerait la nature exacte de l'équipement.
    // Partition stricte (pas de recomptage) — Entrée + Sortie + PMR à bras +
    // PMR à vantaux + PMR à vantaux réversible + Réversible = total ECA,
    // toujours : chaque type technique n'alimente qu'une seule case.
    //   - Entrée = Tripode d'entrée + Vantaux d'entrée
    //   - Sortie = Tripode de sortie + Vantaux de sortie
    //   - PMR à bras / PMR à vantaux / PMR à vantaux réversible : les 3
    //     variantes PMR affichées séparément (jamais recomptées dans
    //     Entrée/Sortie) — un agrégat "Dont PMR" resterait dispo via
    //     globalCounts.ecaPmrCount si besoin ailleurs, mais n'est plus
    //     affiché ici.
    //   - Réversible = Vantaux réversible non-PMR — seul type ne rentrant
    //     dans aucune des cases précédentes.
    // Chaque case n'est affichée que si elle est non nulle (comme le
    // tableau réseau existant, ECA_TYPE_ROWS) : la lecture reste courte sur
    // la grande majorité des stations, qui n'ont pas toutes les variantes.
    const ecaEntreeCount = (ecaBreakdown.byType[EcaEquipmentType.TripodeEntree] ?? 0)
        + (ecaBreakdown.byType[EcaEquipmentType.VantauxEntree] ?? 0);
    const ecaSortieCount = (ecaBreakdown.byType[EcaEquipmentType.TripodeSortie] ?? 0)
        + (ecaBreakdown.byType[EcaEquipmentType.VantauxSortie] ?? 0);
    const ecaPmrBrasCount = ecaBreakdown.byType[EcaEquipmentType.PMRBras] ?? 0;
    const ecaPmrVantauxCount = ecaBreakdown.byType[EcaEquipmentType.PMRVantaux] ?? 0;
    const ecaPmrVantauxReversibleCount = ecaBreakdown.byType[EcaEquipmentType.PMRVantauxReversible] ?? 0;
    const ecaReversibleCount = ecaBreakdown.byType[EcaEquipmentType.VantauxReversible] ?? 0;

    // DAT par direction (vue mono-station uniquement) : répartition déjà
    // saisie dans le référentiel (Direction.name + dats.length), jamais
    // calculée ni stockée ailleurs, juste regroupée par direction au lieu
    // d'être sommée à plat. N'affiche rien si une seule direction (le
    // détail serait redondant avec le total juste au-dessus).
    const datByDirection = useMemo(() => {
        if (!selectedLieuId || !selectedLieuObject) return [];
        const counts = new Map<string, number>();
        for (const module of selectedLieuObject.modules) {
            if (module.type !== AuditModuleType.DAT) continue;
            for (const station of (module.data as ModeData).stations ?? []) {
                for (const direction of station.directions ?? []) {
                    counts.set(direction.name, (counts.get(direction.name) ?? 0) + (direction.dats ?? []).length);
                }
            }
        }
        return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    }, [selectedLieuId, selectedLieuObject]);

    // Bloc « État des anomalies » extrait en variable pour être positionné
    // différemment selon la vue (cf. rendu ci-dessous), sans dupliquer son
    // JSX : vue réseau inchangée (en tête), vue mono-station après les
    // informations concrètes de la station (Référentiel + Aperçu).
    const anomaliesSection = (
        <section>
            <SectionTitle>État des anomalies</SectionTitle>
            {/* Une colonne par référentiel : la grille suit le nombre réel
                de référentiels (4), sinon la dernière carte reste orpheline
                sur une seconde rangée aux deux tiers vide. items-start évite
                que les cartes compactes (0 anomalie) soient étirées à la
                hauteur d'une carte voisine en anomalie. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
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
    );

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
                                    className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 dark:text-slate-100 hover:bg-teal-50 dark:hover:bg-slate-700"
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
                cognitifs ouvrent la liste existante faute de section dédiée.
                Vue réseau : reste en tête (comportement inchangé). Vue
                mono-station : décalée après Référentiel + Aperçu (cf. plus
                bas) pour que la station recherchée montre d'abord son propre
                contenu avant son état d'anomalies. */}
            {!selectedLieuId && anomaliesSection}

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
                        {/* Deux nombres, pas six : le référentiel est acté dans
                            le moteur et distribué avec l'application — Synthèse
                            en donne le volume, pas l'état d'avancement d'un
                            contrôle (qui vit dans Analyse des anomalies). */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:max-w-md">
                            <IndicatorTile value={activeReferencesCount} label="Références" tone="sky" onClick={() => nav.navigate({ section: 'referentiel' })} />
                            <IndicatorTile value={patrimoineIndex.totals.implantationCount} label="Exemplaires" tone="slate" onClick={() => nav.navigate({ section: 'referentiel' })} />
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
                    <div className="space-y-3 mt-2">
                        {selectedLieuId ? (
                            datByDirection.length > 1 && datByDirection.map(({ name, count }) => (
                                <StatRow key={name} label={name} value={count} isSubItem />
                            ))
                        ) : (
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

                    {/* Parkings Relais — même hiérarchie visuelle que DAT et
                        ECA : plus de titre de regroupement, le bloc est
                        introduit par son propre libellé principal. */}
                    <div>
                    {selectedLieuId ? null : <StatRow icon={<Car className="w-5 h-5" />} label="Nombre de P+R" value={globalCounts.prCount} highlight="primary" />}
                    {/* Espacement intermédiaire : ces lignes sont des équipements
                        distincts (et non une ventilation du total au-dessus),
                        elles gardent donc leur taille pleine, avec plus d'air
                        que les sous-listes indentées de DAT ou des stations. */}
                    <div className="space-y-2 mt-2">
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
                {selectedLieuId ? (
                    <>
                    {/* Vue mono-lieu : pas de tableau multi-lignes en dessous,
                        le total garde donc son affichage StatRow habituel,
                        contraint à la largeur d'une colonne de la rangée 1
                        pour que la valeur reste proche de son libellé. */}
                    <div className="max-w-xl md:max-w-[calc(50%-0.75rem)] lg:max-w-[calc(50%-1rem)]">
                        <StatRow icon={<Fence className="w-5 h-5" />} label="ECA (Valideurs)" value={globalCounts.ecaCount} highlight="primary" />
                    </div>
                    <div className="space-y-3 mt-2">
                        <StatRow label="Entrée" value={ecaEntreeCount} isSubItem />
                        <StatRow label="Sortie" value={ecaSortieCount} isSubItem />
                        {ecaPmrBrasCount > 0 && (
                            <StatRow label="PMR à bras" value={ecaPmrBrasCount} isSubItem />
                        )}
                        {ecaPmrVantauxCount > 0 && (
                            <StatRow label="PMR à vantaux" value={ecaPmrVantauxCount} isSubItem />
                        )}
                        {ecaPmrVantauxReversibleCount > 0 && (
                            <StatRow label="PMR à vantaux réversible" value={ecaPmrVantauxReversibleCount} isSubItem />
                        )}
                        {ecaReversibleCount > 0 && (
                            <StatRow label="Vantaux réversible" value={ecaReversibleCount} isSubItem />
                        )}
                    </div>
                    </>
                ) : (
                    <>
                    {/* Vue réseau : le total rejoint la cellule d'angle du
                        tableau (cf. EcaLineDetail) plutôt que d'être répété ici
                        — un seul affichage du total, au même niveau visuel que
                        les totaux par ligne. Ce libellé ne fait donc plus que
                        nommer la section. Toutes les configs de ligne sont
                        transmises : la matrice choisit elle-même ses colonnes
                        selon les données ECA, et doit pouvoir en afficher une
                        nouvelle sans changement ici. */}
                    <div className="flex items-center gap-3 text-lg font-bold text-gray-800 dark:text-slate-100">
                        <Fence className="w-5 h-5" />
                        ECA (Valideurs)
                    </div>
                    <EcaLineDetail ecaBreakdown={ecaBreakdown} configs={{ metroAConfig, metroBConfig, lineCConfig, laeConfig }} total={globalCounts.ecaCount} />
                    </>
                )}
                </div>

                <hr className="border-dashed border-slate-200 dark:border-slate-700" />

                {/* Rangée 2 bis — Plans de quartier (+ PEM 3D), pleine largeur
                    comme ECA : combien au total, de quel format, puis où. */}
                <div>
                    <div className="flex items-center gap-3 text-lg font-bold text-gray-800 dark:text-slate-100">
                        <MapIcon className="w-5 h-5" />
                        Plans de quartier
                    </div>
                    <PlanQuartierOverview
                        patrimoineIndex={patrimoineIndex}
                        references={references}
                        lineConfigs={{ A: metroAConfig, B: metroBConfig, C: lineCConfig, TRAM: tramConfig, TELEO: teleoConfig, AEROPORT: laeConfig }}
                        onOpenReference={(referenceId) => nav.navigate({ section: 'referentiel', referenceId })}
                    />
                </div>

                <hr className="border-dashed border-slate-200 dark:border-slate-700" />

                {/* Rangée 3 — couverture d'audit, pleine largeur. Les six
                    lignes du réseau se répartissent en colonnes plutôt que de
                    s'empiler sous un total isolé : la rangée est occupée, et
                    les lignes se comparent d'un seul regard. */}
                <div>
                    {selectedLieuId ? (
                         <div className="py-4">
                            <p className="text-gray-500 dark:text-slate-400 italic">Détails de la station affichés.</p>
                         </div>
                    ) : (
                        <>
                        {/* Même traitement que DAT, P+R et ECA : le bloc est
                            introduit par son total, sans titre de section.
                            Seul « Stations avec Audit Spécifique » conserve un
                            SectionTitle, car il regroupe réellement plusieurs
                            blocs — information non déductible de leurs seuls
                            libellés. */}
                        <StatRow icon={<MapPin className="w-5 h-5" />} label="Total Stations" value={globalCounts.stationCountTotal} highlight="primary" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-3 mt-2">
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.stationCountA} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.stationCountB} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" />Ligne C</span>} value={globalCounts.stationCountC} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={laeConfig} size="sm" />Aéroport Express</span>} value={globalCounts.stationCountAero} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" />Tram</span>} value={globalCounts.stationCountTram} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={teleoConfig} size="sm" />Téléo</span>} value={globalCounts.stationCountTeleo} isSubItem />
                        </div>
                        </>
                    )}
                </div>

                <hr className="border-dashed border-slate-200 dark:border-slate-700" />

                {/* Rangée 4 — Stations avec Audit Spécifique, pleine largeur.
                    Chaque famille porte son total en N1, comme DAT, P+R et
                    ECA : ce sont des totaux de même niveau métier, ils ne
                    peuvent pas se lire comme un détail en pastille grise. */}
                <div>
                <SectionTitle>Stations avec Audit Spécifique</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                    <div>
                    <StatRow icon={<Footprints className="w-5 h-5" />} label="Audit Sol PMR" value={globalCounts.pmrFloorAdhesiveCount} highlight="primary" />
                    {selectedLieuId ? null : (
                        <div className="space-y-3 mt-2">
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.pmrFloorAdhesiveCountA} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.pmrFloorAdhesiveCountB} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" />Ligne C</span>} value={globalCounts.pmrFloorAdhesiveCountC} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={laeConfig} size="sm" />Aéroport Express</span>} value={globalCounts.pmrFloorAdhesiveCountAero} isSubItem />
                        </div>
                    )}
                    </div>
                    <div>
                    <StatRow icon={<ScanEye className="w-5 h-5" />} label="Audit Pictos Cognitifs" value={globalCounts.cogPictoCount} highlight="primary" />
                    {selectedLieuId ? null : (
                        <div className="space-y-3 mt-2">
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.cogPictoCountA} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.cogPictoCountB} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" />Ligne C</span>} value={globalCounts.cogPictoCountC} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={laeConfig} size="sm" />Aéroport Express</span>} value={globalCounts.cogPictoCountAero} isSubItem />
                        </div>
                    )}
                    </div>
                    <div>
                    <StatRow icon={<Layout className="w-5 h-5" />} label="Équipements Station" value={globalCounts.signaletiqueCount} highlight="primary" />
                    {selectedLieuId ? null : (
                        <div className="space-y-3 mt-2">
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" />Tram</span>} value={globalCounts.signaletiqueCountTram} isSubItem />
                            <StatRow dense label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={laeConfig} size="sm" />Aéroport Express</span>} value={globalCounts.signaletiqueCountAero} isSubItem />
                        </div>
                    )}
                    </div>
                </div>
                </div>
                </div>
            </StatCard>

            {/* Vue mono-station : l'état des anomalies arrive ici, après le
                contenu concret de la station (Référentiel + Aperçu),
                cf. commentaire sur anomaliesSection plus haut. */}
            {selectedLieuId && anomaliesSection}

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
