// components/cockpit/SyntheseView.tsx
// Section « Synthèse » du cockpit — vision globale du réseau.
// Contenu déplacé depuis StatsPage (onglet current), enrichi d'un bloc
// « Référentiel signalétique » servi par le moteur d'index réseau
// (contrat de plateforme : aucune donnée agrégée calculée localement).
import React, { useMemo, useState, useEffect, useRef } from 'react';
// `Map` est importée sous alias : le nom brut masquerait le constructeur
// Map natif utilisé par les agrégations de ce fichier.
import { Car, Euro, Fence, ScanEye, Search, Footprints, MapPin, Map as MapIcon, X, Layout, BookOpenCheck, ChevronDown, Flag, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';
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
import { IndicatorTile } from './primitives';
import { compareLines, formatDimensions, SUPPORT_LABELS } from './labels';
import { useCockpitNav } from './cockpitNav';
import { BACHE_LINES, getBacheTotal, getBachesForLieu, isLineRecensee } from '../../utils/cockpit/baches';
import { isModuleInCurrentScope } from '../../utils/moduleScope';
import { lieuMapEmbedUrl, lieuMapOpenUrl, lieuMapQuery } from '../../utils/cockpit/lieuMap';
import { sortByPhysicalStationOrder } from '../../utils/cockpit/exportStationOrder';
import { CognitivePictogramSummary, cognitiveSummaryKey, summarizeCognitivePictograms } from '../../utils/cockpit/cognitivePictogramSummary';
import { CognitivePictogramVisual } from '../CognitivePictogramVisual';
import { SignaletiquePlanQuartier, collectSignaletiquePlansQuartier, summarizeSignaletiqueCensus } from '../../utils/cockpit/signaletiquePlansQuartier';
import { summarizePlanQuartierAudit } from '../../utils/cockpit/planQuartierAuditTotals';
import { getCategoryProgress, getLieuProgress, getModuleProgress } from '../../utils/progressCalculators';
import useAuditStore from '../../store';

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
const PDQ_MODEL_ORDER = ['pdq-78x100', 'pdq-78x120', 'pdq-adhesif', 'pdq-78x120-dibond', 'pem3d-120x80'];

/** Nom de support affiché devant la dimension — dérivé du référentiel
 *  (ref.support, jamais recalculé/deviné ni recopié en dur par modèle) :
 *  Plastifié pour les deux modèles plastifiés (78×100/78×120), Adhésif,
 *  Dibond… PEM 3D reste un nom de produit à part : il partage le support
 *  Dibond avec pdq-78x120-dibond, mais les deux ne doivent jamais se
 *  confondre sous le même libellé. */
const pdqSupportName = (ref: { id: string; support: string }): string =>
    ref.id === 'pem3d-120x80' ? 'PEM 3D' : (SUPPORT_LABELS[ref.support as keyof typeof SUPPORT_LABELS] ?? ref.support);

/** Contexte d'implantation « caisse automatique de P+R » — porté par
 *  l'occurrence elle-même depuis l'unification du patrimoine, plus par un
 *  audit voisin (cf. store.ts::migratePrCaisseAutoPlansDeQuartier). */
const PDQ_CAISSE_AUTO_CONTEXT = 'pr-caisse-auto';

/** Modèle posé dans ce contexte : adhésif 78×120 (métier confirmé). */
const PDQ_CAISSE_AUTO_MODEL_ID = 'pdq-adhesif';

/** Dos gris opaque contre-collé au verso d'un plan posé sur la vitre d'une
 *  caisse automatique. PIÈCE du même exemplaire, jamais un plan de plus :
 *  affiché à part, avec son propre total, et jamais additionné au patrimoine
 *  Plans de quartier. Reste suivi sur la caisse (audit P+R), d'où sa lecture
 *  par référence et non par occurrence. */
const PDQ_BACKING_REF_ID = 'adca13';

const PlanQuartierOverview: React.FC<{
    patrimoineIndex: any;
    references: any[];
    lineConfigs: Record<string, any>;
    onOpenReference: (referenceId: string) => void;
    /** Pictogrammes cognitifs déjà audités, par (ligne, lieu) — lecture seule. */
    cognitivePictograms: Map<string, CognitivePictogramSummary>;
    /** Plans de quartier audités dans Équipements Station (T1…) — lecture seule. */
    signaletiquePlans: SignaletiquePlanQuartier[];
}> = ({ patrimoineIndex, references, lineConfigs, onOpenReference, cognitivePictograms, signaletiquePlans }) => {
    // Repliée par défaut : un plan de quartier posé sur la quasi-totalité
    // d'une ligne peut lister ~90 stations au total, toutes empilées en une
    // colonne sur mobile — un scroll interminable. Chaque ligne s'ouvre
    // indépendamment (pas d'exclusivité : comparer deux lignes reste
    // possible), même pattern que le reste de l'app.
    const [openLines, setOpenLines] = useState<Set<string>>(new Set());
    const toggleLine = (line: string) => {
        setOpenLines(prev => {
            const next = new Set(prev);
            if (next.has(line)) next.delete(line); else next.add(line);
            return next;
        });
    };

    const models = useMemo(() => {
        const pdq = references.filter(r => r.auditType === 'PDQ' && !r.isDisabled);
        return [...pdq].sort((a, b) => PDQ_MODEL_ORDER.indexOf(a.id) - PDQ_MODEL_ORDER.indexOf(b.id));
    }, [references]);

    const tiles = useMemo(() => models.map(ref => {
        const usage = patrimoineIndex.byReference.get(ref.id);
        return {
            id: ref.id,
            label: `${pdqSupportName(ref)} · ${formatDimensions(ref.dimensions)}`,
            installed: usage?.installedCount ?? 0,
            defects: usage?.defectCount ?? 0,
        };
    }), [models, patrimoineIndex]);

    // Même construction que la tuile, réutilisée dans le détail par station
    // ci-dessous (séparateur différent, contexte de lecture en ligne plutôt
    // qu'empilé) — un seul calcul du support par référence, jamais deux
    // libellés qui pourraient diverger.
    const pdqShortLabels = useMemo(
        () => new Map(models.map(ref => [ref.id, `${pdqSupportName(ref)} ${formatDimensions(ref.dimensions)}`])),
        [models]
    );

    // Périmètre d'audit Plans de quartier : modèles PDQ du catalogue seuls.
    const { installed: total, defects: totalDefects } = useMemo(
        () => summarizePlanQuartierAudit(patrimoineIndex, models.map(m => m.id)),
        [models, patrimoineIndex]
    );

    // Plans recensés dans Équipements Station (T1) : recensement séparé,
    // hors total et hors « à traiter » Plans de quartier — l'audit reste
    // dans Équipements Station.
    const signaletiqueLabel = (plan: SignaletiquePlanQuartier) =>
        `${lineConfigs[plan.line]?.shortLabel ?? plan.line} ${plan.dimensions.replace(/\s*x\s*/i, ' × ')}`;
    const census = useMemo(() => summarizeSignaletiqueCensus(signaletiquePlans), [signaletiquePlans]);

    // Combien de ces plans sont posés sur une caisse automatique de P+R ?
    // Lu sur le contexte porté par l'implantation, jamais deviné d'un libellé.
    const caisseAutoCount = useMemo(() => {
        const modelIds = new Set(models.map(m => m.id));
        return (patrimoineIndex.implantations as any[]).filter(
            imp => modelIds.has(imp.referenceId) && imp.implantationContext === PDQ_CAISSE_AUTO_CONTEXT
        ).length;
    }, [models, patrimoineIndex]);

    // Dos gris verso : pièce associée, comptée pour elle-même (stock,
    // remplacement) — jamais agrégée au total des plans.
    const caisseAutoModel = references.find(r => r.id === PDQ_CAISSE_AUTO_MODEL_ID);
    const backingRef = references.find(r => r.id === PDQ_BACKING_REF_ID);
    const backingCount = patrimoineIndex.byReference.get(PDQ_BACKING_REF_ID)?.installedCount ?? 0;

    // Détail par ligne → station, dérivé des implantations déjà indexées.
    // Un lieu n'apparaît que s'il porte réellement un exemplaire : pas de
    // faux zéro, pas de station inventée.
    const lineRows = useMemo(() => {
        const modelIds = new Set(models.map(m => m.id));
        // formats : une entrée structurée {label, detail, count} par (modèle,
        // emplacement) plutôt qu'une chaîne concaténée — la mise en forme
        // (gras/atténué/troncature) se fait à l'affichage, sans reconstituer
        // le détail à partir d'un texte joint (fragile dès qu'un libellé
        // contient lui-même un tiret).
        const lineMap = new Map<string, Map<string, { installed: number; defects: number; formats: Map<string, { label: string; detail?: string; count: number }> }>>();
        for (const imp of patrimoineIndex.implantations as any[]) {
            if (!modelIds.has(imp.referenceId)) continue;
            const stations = lineMap.get(imp.line) ?? new Map();
            const entry = stations.get(imp.lieuName) ?? { installed: 0, defects: 0, formats: new Map<string, { label: string; detail?: string; count: number }>() };
            entry.installed += 1;
            if (imp.status === AdhesiveStatus.Absent || imp.status === AdhesiveStatus.ToBeReplaced) entry.defects += 1;
            const shortLabel = pdqShortLabels.get(imp.referenceId) ?? imp.referenceId;
            // (modèle, emplacement) : patrimoineIndex retombe sur le nom du
            // lieu quand aucune implantation réelle n'est connue (occ.location
            // absent) — un contexte qui DIFFÈRE du lieu est donc une vraie
            // implantation à afficher ; sinon on n'invente rien, juste le
            // modèle seul.
            const hasRealLocation = !!imp.context && imp.context !== imp.lieuName;
            // Le contexte d'implantation se lit AVANT l'emplacement précis :
            // « P+R / Caisse auto CA01 — zone » répond d'un coup d'œil à
            // « où est ce plan ? », là où la seule zone laisserait croire à
            // une implantation en station.
            const detail = hasRealLocation
                ? (imp.implantationContext === PDQ_CAISSE_AUTO_CONTEXT ? `P+R / ${imp.context}` : imp.context)
                : undefined;
            const formatKey = detail ? `${shortLabel}|${detail}` : shortLabel;
            const existing = entry.formats.get(formatKey);
            if (existing) {
                existing.count += 1;
            } else {
                entry.formats.set(formatKey, { label: shortLabel, detail, count: 1 });
            }
            stations.set(imp.lieuName, entry);
            lineMap.set(imp.line, stations);
        }
        // Recensement Équipements Station : même structure, liste distincte —
        // un exemplaire par plan et par direction.
        const censusMap: typeof lineMap = new Map();
        for (const plan of signaletiquePlans) {
            const stations = censusMap.get(plan.line) ?? new Map();
            const entry = stations.get(plan.lieuName) ?? { installed: 0, defects: 0, formats: new Map<string, { label: string; detail?: string; count: number }>() };
            entry.installed += 1;
            if (plan.isDefect) entry.defects += 1;
            const label = signaletiqueLabel(plan);
            const formatKey = `${label}|${plan.direction ?? ''}`;
            const existing = entry.formats.get(formatKey);
            if (existing) existing.count += 1;
            else entry.formats.set(formatKey, { label, detail: plan.direction, count: 1 });
            stations.set(plan.lieuName, entry);
            censusMap.set(plan.line, stations);
        }
        const toRows = (map: typeof lineMap) => [...map.entries()]
            .map(([line, stations]) => ({
                line,
                cfg: lineConfigs[line],
                // Nom de ligne déjà porté par lineConfigs (AUDIT_CATEGORIES,
                // seule source du libellé) — jamais un deuxième « A → Métro A ».
                label: lineConfigs[line]?.label ?? line,
                installed: [...stations.values()].reduce((s, v) => s + v.installed, 0),
                // Ordre physique de la ligne (même source que l'arbre des
                // implantations et l'export).
                stations: sortByPhysicalStationOrder(line, [...stations.entries()].map(([name, v]) => ({ name, ...v })), s => s.name),
            }))
            // Lignes dans l'ordre du réseau (A, B, C, Tram…), comme partout ailleurs.
            .sort((a, b) => compareLines(a.line, b.line));
        return { byLine: toRows(lineMap), censusByLine: toRows(censusMap) };
    }, [models, patrimoineIndex, lineConfigs, signaletiquePlans]);
    const { byLine, censusByLine } = lineRows;

    // Cartes station d'une ligne — même rendu pour le module Plans de
    // quartier et pour le recensement Équipements Station.
    const renderStations = (line: string, cfg: any, stations: typeof byLine[number]['stations']) => (
        <ul className="mt-2 space-y-2.5">
            {stations.map(st => (
                <li key={st.name} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                    <div className="flex items-baseline justify-between gap-3 pb-1.5 mb-1.5 border-b border-dashed border-slate-200 dark:border-slate-700">
                        {/* Badge de ligne répété à chaque station (en plus de celui
                            du header de colonne juste au-dessus) : après plusieurs
                            écrans de scroll sur ~90 stations, le header n'est plus
                            visible — sans ce rappel, on perd le contexte de ligne.
                            Même CategoryIcon, taille xs (plus discrète que le sm du
                            header) : aucun nouveau badge, juste une taille de plus. */}
                        <span className="flex items-center gap-1.5 min-w-0">
                            {cfg && <CategoryIcon categoryConfig={cfg} size="xs" />}
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{st.name}</span>
                        </span>
                        <span className="flex-shrink-0 flex items-baseline gap-2">
                            {st.defects > 0 && (
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400">{st.defects} à traiter</span>
                            )}
                            <span className="text-base font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">{st.installed}</span>
                            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">équipements</span>
                        </span>
                    </div>
                    <ul className="space-y-1">
                        {[...st.formats.values()].map(fmt => (
                            <li key={`${fmt.label}|${fmt.detail ?? ''}`} className="flex items-center justify-between gap-3">
                                <span className="min-w-0">
                                    <span
                                        className="block text-xs font-semibold text-slate-700 dark:text-slate-200 truncate"
                                        title={fmt.detail ? `${fmt.label} — ${fmt.detail}` : fmt.label}
                                    >
                                        {fmt.label}
                                    </span>
                                    {fmt.detail && (
                                        <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate" title={fmt.detail}>
                                            {fmt.detail}
                                        </span>
                                    )}
                                </span>
                                <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                                    ×{fmt.count}
                                </span>
                            </li>
                        ))}
                    </ul>
                    {/* Pictogrammes cognitifs de la station : simple
                        lecture du module Pictogrammes cognitifs (seule
                        source), jamais comptés dans les équipements. */}
                    {(() => {
                        const picto = cognitivePictograms.get(cognitiveSummaryKey(line, st.name));
                        if (!picto) return null;
                        return (
                            <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                                <CognitivePictogramVisual stationCode={picto.stationCode} stationName={st.name} size="sm" />
                                <span>
                                    Pictogrammes cognitifs · {picto.accessCount} accès
                                    {picto.toReplaceCount > 0 && (
                                        <span className="font-semibold text-red-600 dark:text-red-400"> · {picto.toReplaceCount} à remplacer</span>
                                    )}
                                </span>
                            </div>
                        );
                    })()}
                </li>
            ))}
        </ul>
    );

    const emptyPdq = (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            Aucun plan de quartier recensé pour l'instant — les totaux se rempliront au fil des passages terrain.
        </p>
    );

    if (total === 0 && census.total === 0) return emptyPdq;

    return (
        <div className="space-y-6">
            {/* Bande 1 — total réseau (N1) + ce qui appelle une action (N5). */}
            {total === 0 ? emptyPdq : (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">{total}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    plans de quartier recensés
                </span>
                {totalDefects > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
                        {totalDefects} à traiter
                    </span>
                )}
            </div>
            )}

            {/* Bande 2 — par format (N3). Vue « bureau » : préparer une commande. */}
            {total > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-3 gap-3">
                {tiles.map(t => (
                    <IndicatorTile
                        key={t.id}
                        size="sm"
                        value={t.installed}
                        label={t.label}
                        tone="slate"
                        onClick={() => onOpenReference(t.id)}
                    />
                ))}
            </div>
            )}

            {/* Caisse auto + dos gris : deux tuiles du même composant que la
                bande précédente (jamais un bloc à la charte différente), pour
                que l'association visuelle (côte à côte) et la distinction de
                comptage (teal = inclus, slate = à part) se lisent d'un
                regard — chaque hint le redit en toutes lettres, rien à
                déduire. */}
            {(caisseAutoCount > 0 || backingCount > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    {caisseAutoCount > 0 && (
                        <IndicatorTile
                            size="sm"
                            value={caisseAutoCount}
                            label="Caisse auto P+R"
                            hint={`Adhésif ${formatDimensions(caisseAutoModel?.dimensions)} · inclus dans le total`}
                            tone="teal"
                        />
                    )}
                    {backingCount > 0 && (
                        <IndicatorTile
                            size="sm"
                            value={backingCount}
                            label="Dos gris associé"
                            hint={`RAL 7016 · ${formatDimensions(backingRef?.dimensions)} · à commander séparément, hors total`}
                            tone="slate"
                        />
                    )}
                </div>
            )}

            {/* Bande 3 — par ligne puis station. Vue « terrain » : où aller. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-x-8 gap-y-4">
                {byLine.map(({ line, cfg, label, installed, stations }) => {
                    const isOpen = openLines.has(line);
                    return (
                    <div key={line}>
                        <button
                            type="button"
                            onClick={() => toggleLine(line)}
                            aria-expanded={isOpen}
                            className="flex w-full items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-1 text-left -mx-1 px-1 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                <ChevronDown className={`w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                {cfg && <CategoryIcon categoryConfig={cfg} size="sm" />}
                                {label}
                            </span>
                            <span className="text-xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">{installed}</span>
                        </button>
                        {/* Une carte par station plutôt qu'une ligne : au-delà
                            de deux références, une chaîne jointe par « · »
                            devient illisible (dimensions, emplacements et
                            quantités se mélangent). Ici : nom + total station
                            (teal, comme les autres totaux de l'app) en
                            en-tête, puis une ligne par (modèle, emplacement)
                            avec sa quantité en pastille bien distincte. */}
                        {isOpen && renderStations(line, cfg, stations)}
                    </div>
                    );
                })}
            </div>

            {/* Recensement Équipements Station (Tram T1…) : hors périmètre
                d'audit Plans de quartier — total, défauts et localisation
                propres, l'audit se fait dans Équipements Station. */}
            {censusByLine.map(({ line, cfg, label, installed, stations }) => {
                const key = `census:${line}`;
                const isOpen = openLines.has(key);
                const defects = stations.reduce((sum, st) => sum + st.defects, 0);
                return (
                    <div key={key} className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => toggleLine(key)}
                            aria-expanded={isOpen}
                            className="flex w-full items-start justify-between gap-3 text-left -mx-1 px-1 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <span className="flex items-start gap-2 min-w-0">
                                <ChevronDown className={`w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                {cfg && <CategoryIcon categoryConfig={cfg} size="sm" />}
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{label} — plans recensés dans Équipements Station</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400">Audit dans Équipements Station · hors total Plans de quartier</span>
                                    {defects > 0 && (
                                        <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
                                            {defects} à traiter · Équipements Station
                                        </span>
                                    )}
                                </span>
                            </span>
                            <span className="text-xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">{installed}</span>
                        </button>
                        {isOpen && renderStations(line, cfg, stations)}
                    </div>
                );
            })}
        </div>
    );
};

/* =====================
   Mise en page de la Synthèse (présentation uniquement) — organisée en
   trois questions : qu'est-ce qui nécessite mon attention (« À traiter »),
   où en est le réseau (« Réseau par ligne »), où trouver le détail
   (« Patrimoine & référentiel » + détails ouverts à la demande). Aucune
   valeur n'est calculée par ces primitives : elles affichent ce que
   fournissent les moteurs (useStats, patrimoineIndex, index Équipements
   Station, Plans de quartier, bâches, progressions de l'accueil).
   ===================== */

const SynthesePanel: React.FC<{ title?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, aside, children, className = '' }) => (
    <section className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm ${className}`}>
        {title && (
            <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-5 pt-4 pb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h2>
                {aside}
            </header>
        )}
        {children}
    </section>
);

const ProgressBar: React.FC<{ value: number; className?: string; label: string }> = ({ value, className = '', label }) => (
    <div
        className={`h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ${className}`}
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
    >
        <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, value)}%` }} />
    </div>
);

/** Détail ouvert à la demande depuis son point d'entrée (Patrimoine,
 *  Réseau par ligne) — rien n'est affiché tant qu'il est fermé. */
const SyntheseDetail: React.FC<{ id: string; title: string; summary: React.ReactNode; icon: React.ReactNode; open: boolean; onClose: () => void; children: React.ReactNode }> = ({ id, title, summary, icon, open, onClose, children }) => !open ? null : (
    <section id={`synthese-detail-${id}`} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm scroll-mt-4" aria-label={title}>
        <header className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{summary}</span>
            </span>
            <button
                type="button"
                onClick={onClose}
                className="flex-shrink-0 inline-flex items-center gap-1 h-9 px-2.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
                <X className="w-4 h-4" aria-hidden="true" />Fermer
            </button>
        </header>
        <div className="px-4 sm:px-5 pb-5 pt-4">{children}</div>
    </section>
);

/** Valeur de tableau : « — » = non applicable à la ligne (jamais un 0
 *  inventé), 0 atténué, sinon la valeur telle que fournie par le moteur. */
const SyntheseNum: React.FC<{ v?: number | 'nr'; strong?: boolean }> = ({ v, strong }) => {
    if (v === undefined) return <span className="text-slate-300 dark:text-slate-600" aria-label="non applicable">—</span>;
    if (v === 'nr') return <span className="text-[11px] italic text-slate-400 whitespace-nowrap">non recensée</span>;
    return <span className={`tabular-nums ${v === 0 ? 'text-slate-400 dark:text-slate-500' : strong ? 'font-bold text-slate-900 dark:text-slate-50' : 'font-semibold text-slate-700 dark:text-slate-200'}`}>{v}</span>;
};

interface SyntheseLineRow {
    key: 'METRO_A' | 'METRO_B' | 'METRO_C' | 'TRAM' | 'LAE' | 'TELEO';
    stations: number;
    progress: number;
    dat?: number;
    eca?: number;
    pmr?: number;
    pictos?: number;
    eqStation?: number;
    pdq?: number;
    pdqT1?: number;
    baches?: number | 'nr';
}

const normalizeSearch = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface SyntheseViewProps {
    lieux: Lieu[];
}

const SyntheseView: React.FC<SyntheseViewProps> = ({ lieux }) => {
    const nav = useCockpitNav();
    // Ouverture d'un audit : mécanismes de sélection existants de l'application
    // (selectLieu quitte le cockpit et ouvre le lieu, selectModule ouvre le
    // module — exactement le parcours Accueil → lieu → module).
    const selectLieuInApp = useAuditStore(s => s.selectLieu);
    const selectModuleInApp = useAuditStore(s => s.selectModule);

    // --- FILTRE PAR LIEU (recherche de station) ---
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

    // Pictogrammes cognitifs présentés dans les cards (lecture seule du module).
    const cognitivePictograms = useMemo(() => summarizeCognitivePictograms(filteredLieux), [filteredLieux]);
    // Plans de quartier T1 (Équipements Station), agrégés en lecture.
    const signaletiquePlans = useMemo(() => collectSignaletiquePlansQuartier(filteredLieux), [filteredLieux]);
    const t1Census = useMemo(() => summarizeSignaletiqueCensus(signaletiquePlans), [signaletiquePlans]);
    const selectedLieuPictoCode = useMemo(() => (
        selectedLieuObject
            ? [...cognitivePictograms.entries()].find(([key]) => key.endsWith(`|${selectedLieuObject.name}`))?.[1].stationCode
            : undefined
    ), [cognitivePictograms, selectedLieuObject]);

    // Vue mono-lieu : un bloc n'est affiché que si le lieu porte ce type de
    // module dans l'exploitation actuelle — un 0 ne doit jamais laisser croire
    // à un équipement audité et vide là où il n'existe pas (Tram sans ECA,
    // station sans P+R...). Vue réseau : tout reste affiché.
    const lieuHas = (type: AuditModuleType): boolean =>
        !selectedLieuObject || selectedLieuObject.modules.some(m => m.type === type && isModuleInCurrentScope(m));
    const showDat = lieuHas(AuditModuleType.DAT);
    const showPr = lieuHas(AuditModuleType.PR);
    const showEca = lieuHas(AuditModuleType.ECA);
    const showPmrFloor = lieuHas(AuditModuleType.PMR_FLOOR_ADHESIVE);
    const showCogPicto = lieuHas(AuditModuleType.COGNITIVE_PICTOGRAMS);
    const showSignaletique = lieuHas(AuditModuleType.SIGNALETIQUE);
    const showPlanQuartier = lieuHas(AuditModuleType.PLAN_QUARTIER);
    const lieuBaches = useMemo(
        () => (selectedLieuObject ? getBachesForLieu(selectedLieuObject.name) : []),
        [selectedLieuObject],
    );

    // Filtrer la liste des options du dropdown
    const filterOptions = useMemo(() => {
        if (!lieux) return [];
        if (!filterQuery) return lieux;
        // Insensible à la casse et aux accents (« aeroconstellation » trouve Aéroconstellation).
        const query = normalizeSearch(filterQuery);
        return lieux.filter(l =>
            normalizeSearch(l.name).includes(query) ||
            (l.modules || []).some(m => m.type === AuditModuleType.DAT && normalizeSearch((m.data as ModeData).stations?.[0]?.code ?? '').includes(query))
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

    const filteredInventory = (adhesiveInventory || []).filter(item => !selectedLieuId || item.quantity > 0).filter(item =>
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
    // techniques en catégories métier lisibles — Entrée + Sortie + PMR à bras
    // + PMR à vantaux + PMR à vantaux réversible + Réversible = total ECA ;
    // chaque case n'est affichée que si elle est non nulle.
    const ecaEntreeCount = (ecaBreakdown.byType[EcaEquipmentType.TripodeEntree] ?? 0)
        + (ecaBreakdown.byType[EcaEquipmentType.VantauxEntree] ?? 0);
    const ecaSortieCount = (ecaBreakdown.byType[EcaEquipmentType.TripodeSortie] ?? 0)
        + (ecaBreakdown.byType[EcaEquipmentType.VantauxSortie] ?? 0);
    const ecaPmrBrasCount = ecaBreakdown.byType[EcaEquipmentType.PMRBras] ?? 0;
    const ecaPmrVantauxCount = ecaBreakdown.byType[EcaEquipmentType.PMRVantaux] ?? 0;
    const ecaPmrVantauxReversibleCount = ecaBreakdown.byType[EcaEquipmentType.PMRVantauxReversible] ?? 0;
    const ecaReversibleCount = ecaBreakdown.byType[EcaEquipmentType.VantauxReversible] ?? 0;

    // DAT par direction (vue mono-station uniquement) : répartition déjà
    // saisie dans le référentiel (Direction.name + dats.length), regroupée
    // par direction. Rien si une seule direction (redondant avec le total).
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

    // Plans de quartier du module (catalogue PDQ) : même périmètre et même
    // regroupement par ligne que la carte Plans de quartier
    // (PlanQuartierOverview) — implantations des modèles PDQ, par ligne.
    const pdqModelIds = useMemo(
        () => references.filter(r => r.auditType === 'PDQ' && !r.isDisabled).map(r => r.id),
        [references]
    );
    const pdqAudit = useMemo(() => summarizePlanQuartierAudit(patrimoineIndex, pdqModelIds), [patrimoineIndex, pdqModelIds]);
    const pdqByLine = useMemo(() => {
        const modelIds = new Set(pdqModelIds);
        const byLine = new Map<string, number>();
        for (const imp of patrimoineIndex.implantations) {
            if (modelIds.has(imp.referenceId)) byLine.set(imp.line, (byLine.get(imp.line) ?? 0) + 1);
        }
        return byLine;
    }, [patrimoineIndex, pdqModelIds]);

    // Avancement des audits : mêmes fonctions que les badges de l'accueil
    // (getCategoryProgress / getLieuProgress), sans filtre d'audit.
    const networkProgress = useMemo(() => getCategoryProgress(lieux, 'ALL', []), [lieux]);
    const scopeProgress = selectedLieuObject ? getLieuProgress(selectedLieuObject) : networkProgress;

    const bacheTotal = BACHE_LINES.filter(line => isLineRecensee(line)).reduce((sum, line) => sum + getBacheTotal(line), 0);
    const lieuBacheTotal = lieuBaches.reduce((sum, b) => sum + b.count, 0);

    const lineRows: SyntheseLineRow[] = useMemo(() => {
        const bache = (line: 'A' | 'B' | 'C') => (isLineRecensee(line) ? getBacheTotal(line) : 'nr' as const);
        // ECA : colonne présente seulement si la ligne porte des modules ECA
        // (même critère que la matrice ECA, moduleCount) — sinon « — ».
        const eca = (key: 'A' | 'B' | 'C' | 'AEROPORT') => {
            const data = (ecaBreakdown.byLine as any)[key];
            return data?.moduleCount > 0 ? data.total : undefined;
        };
        const g = globalCounts;
        const rows: Omit<SyntheseLineRow, 'progress'>[] = [
            { key: 'METRO_A', stations: g.stationCountA, dat: g.datCountA, eca: eca('A'), pmr: g.pmrFloorAdhesiveCountA, pictos: g.cogPictoCountA, pdq: pdqByLine.get('A') ?? 0, baches: bache('A') },
            { key: 'METRO_B', stations: g.stationCountB, dat: g.datCountB, eca: eca('B'), pmr: g.pmrFloorAdhesiveCountB, pictos: g.cogPictoCountB, pdq: pdqByLine.get('B') ?? 0, baches: bache('B') },
            { key: 'METRO_C', stations: g.stationCountC, dat: g.datCountC, eca: eca('C'), pmr: g.pmrFloorAdhesiveCountC, pictos: g.cogPictoCountC, pdq: pdqByLine.get('C') ?? 0, baches: bache('C') },
            { key: 'TRAM', stations: g.stationCountTram, dat: g.datCountTram, eqStation: g.signaletiqueCountTram, pdqT1: t1Census.total },
            { key: 'LAE', stations: g.stationCountAero, dat: g.datCountAero, eca: eca('AEROPORT'), pmr: g.pmrFloorAdhesiveCountAero, pictos: g.cogPictoCountAero, eqStation: g.signaletiqueCountAero, pdq: pdqByLine.get('AEROPORT') ?? 0 },
            { key: 'TELEO', stations: g.stationCountTeleo, dat: g.datCountTeleo, pdq: pdqByLine.get('TELEO') ?? 0 },
        ];
        return rows.map(r => ({ ...r, progress: getCategoryProgress(lieux, r.key, []) }));
    }, [globalCounts, ecaBreakdown, pdqByLine, t1Census, lieux]);

    // Détails ouverts à la demande (un seul point d'entrée chacun).
    const [openDetails, setOpenDetails] = useState<Set<string>>(new Set());
    const [expandedLine, setExpandedLine] = useState<string | null>(null);
    const closeDetail = (id: string) => setOpenDetails(prev => { const next = new Set(prev); next.delete(id); return next; });
    const toggleDetail = (id: string) => {
        if (openDetails.has(id)) { closeDetail(id); return; }
        setOpenDetails(prev => new Set(prev).add(id));
        setTimeout(() => document.getElementById(`synthese-detail-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const selectLieu = (id: string | null) => {
        setSelectedLieuId(id);
        setFilterQuery('');
        setIsFilterDropdownOpen(false);
    };

    const openAudit = (lieuId: string, moduleId: string) => {
        selectLieuInApp(lieuId);
        selectModuleInApp(moduleId);
    };

    const lineLabel = (line: string) => (line === 'AEROPORT' ? 'LAE' : line === 'TRAM' ? 'T1' : line === 'TELEO' ? 'Téléo' : line);

    /* ---------- Recherche de station (filtre par lieu) ---------- */
    const stationSearch = (
        <div className="sticky top-0 z-20 -mx-2 px-2 py-2 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:dark:bg-transparent sm:backdrop-blur-none">
            <div className="relative" ref={filterRef}>
                <label htmlFor="synthese-station-search" className="sr-only">Rechercher une station</label>
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${selectedLieuId ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} aria-hidden="true" />
                <input
                    id="synthese-station-search"
                    type="search"
                    role="combobox"
                    aria-expanded={isFilterDropdownOpen}
                    aria-controls="synthese-station-results"
                    autoComplete="off"
                    value={filterQuery}
                    onChange={(e) => {
                        setFilterQuery(e.target.value);
                        setIsFilterDropdownOpen(true);
                    }}
                    onFocus={() => setIsFilterDropdownOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && filterQuery && filterOptions[0]) selectLieu(filterOptions[0].id);
                        if (e.key === 'Escape') setIsFilterDropdownOpen(false);
                    }}
                    placeholder={selectedLieuObject ? 'Changer de station…' : 'Rechercher une station (nom ou code)…'}
                    className={`block w-full h-12 rounded-xl border pl-11 pr-11 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        selectedLieuId
                            ? 'border-teal-500 bg-teal-50 text-teal-900 dark:bg-teal-900/20 dark:border-teal-500/50 dark:text-teal-100 placeholder:text-teal-700 dark:placeholder:text-teal-300'
                            : 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 placeholder:text-slate-400'
                    }`}
                />
                {selectedLieuId && (
                    <button
                        type="button"
                        onClick={() => selectLieu(null)}
                        aria-label="Revenir à tout le réseau"
                        className="absolute inset-y-0 right-0 flex items-center px-3.5 text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                )}
                {isFilterDropdownOpen && (
                    <ul id="synthese-station-results" role="listbox" className="absolute z-30 mt-1 w-full max-h-80 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg">
                        <li role="option" aria-selected={!selectedLieuId}>
                            <button type="button" onClick={() => selectLieu(null)} className="w-full text-left px-3 py-2.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700">
                                Tout le réseau
                            </button>
                        </li>
                        {filterOptions.length === 0 ? (
                            <li className="px-3 py-2.5 text-sm italic text-slate-500 dark:text-slate-400">Aucun lieu trouvé</li>
                        ) : filterOptions.map(lieu => {
                            const code = (lieu.modules.find(m => m.type === AuditModuleType.DAT)?.data as ModeData | undefined)?.stations?.[0]?.code;
                            const progress = getLieuProgress(lieu);
                            return (
                                <li key={lieu.id} role="option" aria-selected={lieu.id === selectedLieuId}>
                                    <button type="button" onClick={() => selectLieu(lieu.id)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-slate-700">
                                        <span className="flex-shrink-0"><LieuBadges lieu={lieu} /></span>
                                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-800 dark:text-slate-100 truncate" title={lieu.name}>
                                            {lieu.name}{code && <span className="ml-2 font-mono text-[11px] text-slate-400">{code}</span>}
                                        </span>
                                        <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400" aria-label={`${Math.round(progress)} % audité`}>{Math.round(progress)} %</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );

    /* ---------- 1. À traiter ---------- */
    const anomalyCards = [
        {
            key: 'iv', icon: <BookOpenCheck className="w-4 h-4" />, title: 'Signalétique IV', count: patrimoineIndex.totals.defectCount,
            sub: `${patrimoineIndex.totals.absentCount} absents · ${patrimoineIndex.totals.toReplaceCount} à remplacer`,
            // Toujours actif, comme « Voir le détail » aujourd'hui : mène à l'Analyse des anomalies.
            disabled: false, onClick: () => nav.navigate({ section: 'audit' }),
        },
        {
            key: 'pmr', icon: <Footprints className="w-4 h-4" />, title: 'PMR sol', count: pmrSolDefectItems.length, sub: 'à remplacer',
            disabled: pmrSolDefectItems.length === 0, onClick: () => setModalContent({ title: 'Anomalies PMR sol', items: pmrSolDefectItems }),
        },
        {
            key: 'picto', icon: <ScanEye className="w-4 h-4" />, title: 'Pictogrammes cognitifs', count: pictogrammesDefectItems.length, sub: 'à remplacer',
            disabled: pictogrammesDefectItems.length === 0, onClick: () => setModalContent({ title: 'Anomalies Pictogrammes cognitifs', items: pictogrammesDefectItems }),
        },
        {
            key: 'eq', icon: <Layout className="w-4 h-4" />, title: 'Équipements Station', count: signaletiqueStationIndex.totals.defectCount,
            sub: `${signaletiqueStationIndex.totals.absentCount} absents · ${signaletiqueStationIndex.totals.toReplaceCount} à remplacer · ${signaletiqueStationIndex.totals.hsCount} HS`,
            disabled: signaletiqueStationDefectItems.length === 0, onClick: () => setModalContent({ title: 'Anomalies Équipements Station', items: signaletiqueStationDefectItems }),
        },
    ];
    const anomalyTotal = anomalyCards.reduce((sum, c) => sum + c.count, 0);

    const attention = (
        <SynthesePanel className="overflow-hidden">
            <div className="flex flex-col lg:flex-row">
                <div className="lg:w-56 flex-shrink-0 px-4 sm:px-5 py-4 lg:border-r border-b lg:border-b-0 border-slate-100 dark:border-slate-700 flex lg:flex-col justify-between gap-3">
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">À traiter</h2>
                        <p className="mt-1 flex items-baseline gap-2">
                            <span className={`text-3xl font-extrabold tabular-nums ${anomalyTotal ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-50'}`}>{anomalyTotal}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">anomalie{anomalyTotal > 1 ? 's' : ''}</span>
                        </p>
                        <button type="button" onClick={() => nav.navigate({ section: 'audit' })} className="mt-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline">
                            Analyse des anomalies →
                        </button>
                    </div>
                    <div className="min-w-[9rem] lg:min-w-0">
                        <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>Audits réalisés</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{Math.round(scopeProgress)} %</span>
                        </div>
                        <ProgressBar value={scopeProgress} className="mt-1" label="Audits réalisés" />
                    </div>
                </div>
                <ul className="grid grid-cols-2 lg:grid-cols-4 flex-1">
                    {anomalyCards.map((c, i) => (
                        <li key={c.key} className={`border-slate-100 dark:border-slate-700 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l' : ''}`}>
                            <button
                                type="button"
                                onClick={c.onClick}
                                disabled={c.disabled}
                                aria-label={`${c.title} : ${c.count ? `${c.count} anomalie${c.count > 1 ? 's' : ''}, voir le détail` : 'aucune anomalie'}`}
                                className="group w-full h-full text-left px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 disabled:hover:bg-transparent disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
                            >
                                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                                    <span className="text-slate-400 flex-shrink-0">{c.icon}</span><span className="min-w-0">{c.title}</span>
                                </span>
                                <span className="mt-1 flex items-center gap-1.5">
                                    {c.count > 0 ? (
                                        <>
                                            <span className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">{c.count}</span>
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition-colors" aria-hidden="true" />
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 text-teal-500" aria-hidden="true" />
                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucune</span>
                                        </>
                                    )}
                                </span>
                                {c.count > 0 && <span className="block text-[11px] text-slate-500 dark:text-slate-400">{c.sub}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </SynthesePanel>
    );

    /* ---------- 2. Réseau par ligne ---------- */
    const pdqT1Cell = (count: number) => (
        <span title="Plans T1 recensés dans Équipements Station — hors total Plans de quartier" className="inline-flex items-baseline gap-1 text-sm font-semibold text-sky-700 dark:text-sky-300 tabular-nums">
            {count}<span className="text-[11px] font-normal">T1*</span>
        </span>
    );
    const t1Footnote = `* Plans T1 recensés dans Équipements Station, hors total Plans de quartier (${pdqAudit.installed} + ${t1Census.total} = ${pdqAudit.installed + t1Census.total} plans recensés).`;

    const linesPanel = (
        <SynthesePanel
            title="Réseau par ligne"
            aside={<span className="text-[11px] text-slate-400">équipements recensés · avancement des audits</span>}
        >
            {/* Ordinateur : un tableau comparatif unique. */}
            <div className="hidden lg:block px-2 pb-3">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <caption className="sr-only">Équipements recensés et avancement des audits par ligne</caption>
                    <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            <th scope="col" className="text-left font-semibold px-3 py-2">Ligne</th>
                            <th scope="col" className="text-right font-semibold px-2 py-2">Stations</th>
                            <th scope="col" className="text-left font-semibold px-3 py-2 w-32">Avancement</th>
                            <th scope="col" className="text-right font-semibold px-2 py-2">DAT</th>
                            <th scope="col" className="text-right font-semibold px-2 py-2">ECA</th>
                            <th scope="col" className="text-right font-semibold px-2 py-2">PMR sol</th>
                            <th scope="col" className="text-right font-semibold px-2 py-2">Pictos</th>
                            <th scope="col" className="text-right font-semibold px-2 py-2">Éq. station</th>
                            <th scope="col" className="text-right font-semibold px-2 py-2">Plans quartier</th>
                            <th scope="col" className="text-right font-semibold px-3 py-2">Bâches</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {lineRows.map(r => {
                            const future = r.stations === 0;
                            const cfg = categoryMap[r.key];
                            return (
                                <tr key={r.key} data-line={r.key} className={future ? 'opacity-60' : ''}>
                                    <th scope="row" className="px-3 py-2.5 text-left font-medium">
                                        <span className="flex items-center gap-2 text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                            <CategoryIcon categoryConfig={cfg} size="sm" asDiv />{cfg.label}
                                            {future && <span className="text-[10px] font-semibold uppercase text-slate-400">à venir</span>}
                                        </span>
                                    </th>
                                    <td className="px-2 py-2.5 text-right"><SyntheseNum v={r.stations} strong /></td>
                                    <td className="px-3 py-2.5">
                                        <span className="flex items-center gap-2">
                                            <ProgressBar value={r.progress} label={`Avancement ${cfg.label}`} />
                                            <span className="w-10 flex-shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">{Math.round(r.progress)} %</span>
                                        </span>
                                    </td>
                                    <td className="px-2 py-2.5 text-right"><SyntheseNum v={r.dat} /></td>
                                    <td className="px-2 py-2.5 text-right"><SyntheseNum v={r.eca} /></td>
                                    <td className="px-2 py-2.5 text-right"><SyntheseNum v={r.pmr} /></td>
                                    <td className="px-2 py-2.5 text-right"><SyntheseNum v={r.pictos} /></td>
                                    <td className="px-2 py-2.5 text-right"><SyntheseNum v={r.eqStation} /></td>
                                    <td className="px-2 py-2.5 text-right">{r.pdqT1 !== undefined ? pdqT1Cell(r.pdqT1) : <SyntheseNum v={r.pdq} />}</td>
                                    <td className="px-3 py-2.5 text-right"><SyntheseNum v={r.baches} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-slate-200 dark:border-slate-600">
                            <th scope="row" className="px-3 py-2.5 text-left font-semibold text-slate-900 dark:text-slate-50">Réseau</th>
                            <td className="px-2 py-2.5 text-right"><SyntheseNum v={globalCounts.stationCountTotal} strong /></td>
                            <td className="px-3 py-2.5">
                                <span className="flex items-center gap-2">
                                    <ProgressBar value={networkProgress} label="Avancement du réseau" />
                                    <span className="w-10 flex-shrink-0 text-right text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100 whitespace-nowrap">{Math.round(networkProgress)} %</span>
                                </span>
                            </td>
                            <td className="px-2 py-2.5 text-right"><SyntheseNum v={globalCounts.datCount} strong /></td>
                            <td className="px-2 py-2.5 text-right"><SyntheseNum v={globalCounts.ecaCount} strong /></td>
                            <td className="px-2 py-2.5 text-right"><SyntheseNum v={globalCounts.pmrFloorAdhesiveCount} strong /></td>
                            <td className="px-2 py-2.5 text-right"><SyntheseNum v={globalCounts.cogPictoCount} strong /></td>
                            <td className="px-2 py-2.5 text-right"><SyntheseNum v={globalCounts.signaletiqueCount} strong /></td>
                            <td className="px-2 py-2.5 text-right"><SyntheseNum v={pdqAudit.installed} strong /></td>
                            <td className="px-3 py-2.5 text-right"><SyntheseNum v={bacheTotal} strong /></td>
                        </tr>
                    </tfoot>
                </table>
                </div>
                <div className="px-3 pt-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t1Footnote}</p>
                    <button type="button" onClick={() => toggleDetail('eca')} aria-expanded={openDetails.has('eca')} className="flex-shrink-0 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline">
                        ECA par type →
                    </button>
                </div>
            </div>

            {/* Tablette / téléphone : une carte par ligne, l'essentiel visible, le reste au toucher. */}
            <ul className="lg:hidden grid sm:grid-cols-2 gap-2 px-3 pb-3">
                {lineRows.map(r => {
                    const future = r.stations === 0;
                    const cfg = categoryMap[r.key];
                    const open = expandedLine === r.key;
                    const extras: [string, number | 'nr' | undefined][] = [
                        ['PMR sol', r.pmr], ['Pictos', r.pictos], ['Éq. station', r.eqStation],
                        ['Plans quartier', r.pdqT1 !== undefined ? undefined : r.pdq], ['Bâches', r.baches],
                    ];
                    const visibleExtras = extras.filter(([, v]) => v !== undefined);
                    return (
                        <li key={r.key} data-line={r.key} className={`rounded-lg border border-slate-200 dark:border-slate-700 ${future ? 'opacity-60' : ''}`}>
                            <button
                                type="button"
                                onClick={() => setExpandedLine(open ? null : r.key)}
                                aria-expanded={open}
                                aria-label={`${cfg.label} : ${visibleExtras.length ? 'afficher les autres indicateurs' : 'détail'}`}
                                className="w-full text-left px-3 py-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                            >
                                <span className="flex items-center gap-2">
                                    <CategoryIcon categoryConfig={cfg} size="sm" asDiv />
                                    <span className="flex-1 min-w-0 font-semibold text-slate-800 dark:text-slate-100 truncate">{cfg.label}</span>
                                    {future
                                        ? <span className="text-[10px] font-semibold uppercase text-slate-400">à venir</span>
                                        : <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{Math.round(r.progress)} %</span>}
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                                </span>
                                <ProgressBar value={r.progress} className="mt-2" label={`Avancement ${cfg.label}`} />
                                <span className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    <span><b className="text-slate-800 dark:text-slate-100 tabular-nums">{r.stations}</b> station{r.stations > 1 ? 's' : ''}</span>
                                    {r.dat !== undefined && <span><b className="text-slate-800 dark:text-slate-100 tabular-nums">{r.dat}</b> DAT</span>}
                                    {r.eca !== undefined && <span><b className="text-slate-800 dark:text-slate-100 tabular-nums">{r.eca}</b> ECA</span>}
                                    {r.pdqT1 !== undefined && <span><b className="text-sky-700 dark:text-sky-300 tabular-nums">{r.pdqT1}</b> plans T1*</span>}
                                </span>
                            </button>
                            {open && (
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 pb-3 text-xs">
                                    {visibleExtras.map(([label, v]) => (
                                        <div key={label} className="flex justify-between gap-2">
                                            <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                                            <dd><SyntheseNum v={v} /></dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </li>
                    );
                })}
            </ul>
            <div className="lg:hidden px-4 pb-3 -mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Réseau : {globalCounts.stationCountTotal} stations · {globalCounts.datCount} DAT · {globalCounts.ecaCount} ECA · {globalCounts.pmrFloorAdhesiveCount} PMR sol · {globalCounts.cogPictoCount} pictos · {globalCounts.signaletiqueCount} éq. station · {pdqAudit.installed} plans de quartier · {bacheTotal} bâches · {Math.round(networkProgress)} % audité.
                <span className="block mt-1">{t1Footnote}</span>
                <button type="button" onClick={() => toggleDetail('eca')} aria-expanded={openDetails.has('eca')} className="block mt-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
                    ECA par type →
                </button>
            </div>
        </SynthesePanel>
    );

    /* ---------- 3. Patrimoine & référentiel ---------- */
    const patrimoineRow = (key: string, icon: React.ReactNode, title: string, value: React.ReactNode, hint: React.ReactNode, onClick: () => void, expanded?: boolean) => (
        <li key={key}>
            <button
                type="button"
                onClick={onClick}
                aria-expanded={expanded}
                className="group w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
            >
                <span className="text-slate-400 flex-shrink-0" aria-hidden="true">{icon}</span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{title}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
                </span>
                <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-50 text-right">{value}</span>
                {expanded === undefined
                    ? <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 flex-shrink-0" aria-hidden="true" />
                    : <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-teal-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />}
            </button>
        </li>
    );

    const patrimoinePanel = (
        <SynthesePanel title={`Patrimoine & référentiel${selectedLieuObject ? ` — ${selectedLieuObject.name}` : ''}`}>
            <ul className="divide-y divide-slate-100 dark:divide-slate-700 pb-1">
                {patrimoineRow('referentiel', <BookOpenCheck className="w-5 h-5" />, 'Référentiel signalétique',
                    refsLoading ? '…' : (selectedLieuId ? patrimoineIndex.totals.referencesInstalledCount : activeReferencesCount),
                    refsLoading ? 'Chargement du référentiel…' : `références · ${patrimoineIndex.totals.implantationCount} exemplaires`,
                    () => nav.navigate({ section: 'referentiel' }))}
                {showPlanQuartier && patrimoineRow('pdq', <MapIcon className="w-5 h-5" />, 'Plans de quartier', pdqAudit.installed,
                    <>
                        {pdqAudit.defects > 0 && <span className="font-semibold text-red-600 dark:text-red-400">{pdqAudit.defects} à traiter · </span>}
                        module Plans de quartier{t1Census.total > 0 && ` · + ${t1Census.total} plans T1 (Équipements Station)`}
                    </>,
                    () => toggleDetail('pdq'), openDetails.has('pdq'))}
                {(!selectedLieuId || lieuBaches.length > 0) && patrimoineRow('baches', <Flag className="w-5 h-5" />, 'Bâches de stations',
                    selectedLieuId ? lieuBacheTotal : bacheTotal,
                    selectedLieuId
                        ? (lieuBaches.some(b => !b.pending) ? 'bâches physiques du lieu' : 'quantités à relever')
                        : BACHE_LINES.map(line => (isLineRecensee(line) ? `${line} ${getBacheTotal(line)}` : `${line} non recensée`)).join(' · '),
                    () => nav.navigate({ section: 'referentiel', subSection: 'baches' }))}
                {patrimoineRow('inventaire', <Search className="w-5 h-5" />, 'Inventaire détaillé', filteredInventory.length,
                    selectedLieuId ? `articles du lieu` : 'articles · quantités réseau',
                    () => toggleDetail('inventaire'), openDetails.has('inventaire'))}
                {!selectedLieuId && showPr && patrimoineRow('pr', <Car className="w-5 h-5" />, 'Parkings relais', globalCounts.prCount,
                    `${globalCounts.beCount} bornes entrée · ${globalCounts.bsCount} sortie · ${globalCounts.caCount} caisses auto`,
                    () => toggleDetail('pr'), openDetails.has('pr'))}
            </ul>
        </SynthesePanel>
    );

    /* ---------- Vue station ---------- */
    const stationPanel = selectedLieuObject && (() => {
        const modules = selectedLieuObject.modules.filter(isModuleInCurrentScope);
        const equipment: { key: string; label: React.ReactNode; value: number; icon: React.ReactNode; detail?: string }[] = [];
        if (showDat) equipment.push({ key: 'dat', label: 'DAT', value: globalCounts.datCount, icon: <Euro className="w-4 h-4" />,
            detail: datByDirection.length > 1 ? datByDirection.map(d => `${d.name} ${d.count}`).join(' · ') : undefined });
        if (showEca) equipment.push({ key: 'eca', label: 'ECA (valideurs)', value: globalCounts.ecaCount, icon: <Fence className="w-4 h-4" />,
            detail: [
                ['Entrée', ecaEntreeCount], ['Sortie', ecaSortieCount], ['PMR à bras', ecaPmrBrasCount], ['PMR à vantaux', ecaPmrVantauxCount],
                ['PMR à vantaux réversible', ecaPmrVantauxReversibleCount], ['Vantaux réversible', ecaReversibleCount],
            ].filter(([label, n], i) => i < 2 || (n as number) > 0).map(([label, n]) => `${label} ${n}`).join(' · ') });
        if (showPr) {
            equipment.push({ key: 'be', label: 'Bornes entrée', value: globalCounts.beCount, icon: <Car className="w-4 h-4" /> });
            equipment.push({ key: 'bs', label: 'Bornes sortie', value: globalCounts.bsCount, icon: <Car className="w-4 h-4" /> });
            equipment.push({ key: 'ca', label: 'Caisses auto', value: globalCounts.caCount, icon: <Euro className="w-4 h-4" /> });
        }
        if (showPmrFloor) equipment.push({ key: 'pmr', label: 'Audit sol PMR', value: globalCounts.pmrFloorAdhesiveCount, icon: <Footprints className="w-4 h-4" /> });
        if (showCogPicto) equipment.push({ key: 'picto', icon: <ScanEye className="w-4 h-4" />, value: globalCounts.cogPictoCount,
            label: selectedLieuPictoCode
                ? <span className="inline-flex items-center gap-1.5"><CognitivePictogramVisual stationCode={selectedLieuPictoCode} stationName={selectedLieuObject.name} size="sm" />Pictos cognitifs</span>
                : 'Pictos cognitifs' });
        if (showSignaletique) equipment.push({ key: 'sig', label: 'Équipements Station', value: globalCounts.signaletiqueCount, icon: <Layout className="w-4 h-4" /> });
        if (showPlanQuartier) equipment.push({ key: 'pdq', label: 'Plans de quartier', value: pdqAudit.installed, icon: <MapIcon className="w-4 h-4" /> });
        if (t1Census.total > 0) equipment.push({ key: 't1', label: 'Plans T1 (Éq. station)', value: t1Census.total, icon: <Layout className="w-4 h-4" /> });
        if (lieuBaches.length > 0) equipment.push({ key: 'baches', label: 'Bâches', value: lieuBacheTotal, icon: <Flag className="w-4 h-4" /> });
        const stationProgress = getLieuProgress(selectedLieuObject);

        return (
            <SynthesePanel>
                <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{selectedLieuObject.name}</h2>
                            <LieuBadges lieu={selectedLieuObject} />
                        </div>
                        <div className="mt-2 flex items-center gap-2 max-w-sm">
                            <ProgressBar value={stationProgress} label={`Avancement ${selectedLieuObject.name}`} />
                            <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">{Math.round(stationProgress)} % audité</span>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <a
                            href={lieuMapOpenUrl(selectedLieuObject)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                            <MapPin className="w-4 h-4" aria-hidden="true" />Plan<ExternalLink className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            <span className="sr-only">(ouvre Google Maps dans un nouvel onglet)</span>
                        </a>
                        <button
                            type="button"
                            onClick={() => selectLieu(null)}
                            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />Tout le réseau
                        </button>
                    </div>
                </div>
                {/* Carte : aperçu à partir de sm, le bouton « Plan » suffit sur téléphone. */}
                <a
                    href={lieuMapOpenUrl(selectedLieuObject)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ouvrir ${selectedLieuObject.name} dans Google Maps`}
                    className="hidden sm:block mx-5 mb-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                >
                    <iframe
                        key={selectedLieuObject.id}
                        src={lieuMapEmbedUrl(selectedLieuObject)}
                        title={`Carte — ${lieuMapQuery(selectedLieuObject)}`}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="pointer-events-none block w-full h-40 border-0"
                    />
                </a>
                <h3 className="px-4 sm:px-5 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Audits de la station</h3>
                {modules.length === 0 ? (
                    <p className="px-4 sm:px-5 pb-3 text-sm italic text-slate-500 dark:text-slate-400">Aucun audit en exploitation sur ce lieu.</p>
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                        {modules.map(m => {
                            const progress = getModuleProgress(m);
                            return (
                                <li key={m.id} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">
                                            {m.name}{m.line && <span className="ml-1.5 text-[11px] font-normal text-slate-400">{lineLabel(m.line)}</span>}
                                        </span>
                                        <span className="mt-1 flex items-center gap-2 max-w-xs">
                                            <ProgressBar value={progress.percentage} label={`Avancement ${m.name}`} />
                                            <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400 w-10 text-right whitespace-nowrap">{Math.round(progress.percentage)} %</span>
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => openAudit(selectedLieuObject.id, m.id)}
                                        aria-label={`Ouvrir l'audit ${m.name}${m.line ? ` ${lineLabel(m.line)}` : ''}`}
                                        className="flex-shrink-0 inline-flex items-center gap-1 h-10 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
                                    >
                                        Ouvrir<ArrowRight className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {equipment.length > 0 && (
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 dark:bg-slate-700 border-t border-slate-100 dark:border-slate-700 rounded-b-xl overflow-hidden">
                        {equipment.map((e, i) => (
                            <div key={e.key} className={`bg-white dark:bg-slate-800 px-4 py-2.5 ${i === equipment.length - 1 && equipment.length % 2 ? 'col-span-2 sm:col-span-1' : ''}`}>
                                <dt className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><span className="text-slate-400" aria-hidden="true">{e.icon}</span>{e.label}</dt>
                                <dd className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{e.value}</dd>
                                {e.detail && <dd className="text-[11px] text-slate-500 dark:text-slate-400">{e.detail}</dd>}
                            </div>
                        ))}
                    </dl>
                )}
            </SynthesePanel>
        );
    })();

    /* ---------- Détails (ouverts à la demande) ---------- */
    const details = (
        <div className="space-y-3">
            {showPlanQuartier && (
                <SyntheseDetail
                    id="pdq" title="Plans de quartier" icon={<MapIcon className="w-4 h-4" />}
                    open={openDetails.has('pdq')} onClose={() => closeDetail('pdq')}
                    summary={`${pdqAudit.installed} plans (module Plans de quartier) · ${t1Census.total} plans T1 recensés à part dans Équipements Station`}
                >
                    <PlanQuartierOverview
                        patrimoineIndex={patrimoineIndex}
                        references={references}
                        lineConfigs={{ A: metroAConfig, B: metroBConfig, C: lineCConfig, TRAM: tramConfig, TELEO: teleoConfig, AEROPORT: laeConfig }}
                        onOpenReference={(referenceId) => nav.navigate({ section: 'referentiel', referenceId })}
                        cognitivePictograms={cognitivePictograms}
                        signaletiquePlans={signaletiquePlans}
                    />
                </SyntheseDetail>
            )}

            {!selectedLieuId && showEca && (
                <SyntheseDetail
                    id="eca" title="ECA par type d'équipement" icon={<Fence className="w-4 h-4" />}
                    open={openDetails.has('eca')} onClose={() => closeDetail('eca')}
                    summary={`${globalCounts.ecaCount} valideurs · répartition par type et par ligne`}
                >
                    <EcaLineDetail ecaBreakdown={ecaBreakdown} configs={{ metroAConfig, metroBConfig, lineCConfig, laeConfig }} total={globalCounts.ecaCount} />
                </SyntheseDetail>
            )}

            {!selectedLieuId && showPr && (
                <SyntheseDetail
                    id="pr" title="Parkings relais" icon={<Car className="w-4 h-4" />}
                    open={openDetails.has('pr')} onClose={() => closeDetail('pr')}
                    summary={`${globalCounts.prCount} P+R · bornes et caisses automatiques`}
                >
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([['Nombre de P+R', globalCounts.prCount], ['Bornes entrée', globalCounts.beCount], ['Bornes sortie', globalCounts.bsCount], ['Caisses auto', globalCounts.caCount]] as [string, number][]).map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                                <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
                                <dd className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-50">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </SyntheseDetail>
            )}

            <SyntheseDetail
                id="inventaire" title={`Inventaire détaillé${selectedLieuObject ? ` — ${selectedLieuObject.name}` : ''}`} icon={<Search className="w-4 h-4" />}
                open={openDetails.has('inventaire')} onClose={() => closeDetail('inventaire')}
                summary={`${filteredInventory.length} articles${selectedLieuId ? '' : ' · quantités réseau'}`}
            >
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        aria-label="Rechercher dans l'inventaire"
                        placeholder="Rechercher par nom, type ou repère..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="block w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 pl-10 pr-3 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                    />
                </div>

                {/* Desktop/tablette : tableau complet. */}
                <div className="hidden sm:block overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Type</th>
                                <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Rep.</th>
                                <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Nom du produit</th>
                                <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Dimensions (cm)</th>
                                <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider hidden lg:table-cell">Matière / Usage</th>
                                <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider text-right">{selectedLieuId ? 'Qté' : 'Qté réseau'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredInventory.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                                    <td className="p-3 text-slate-600 dark:text-slate-300">{item.auditType}</td>
                                    <td className="p-3 text-slate-500 dark:text-slate-400">{item.repere}</td>
                                    <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300">{item.dimensions}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300 hidden lg:table-cell">{item.material}</td>
                                    <td className="p-3 text-right font-bold text-teal-700 dark:text-teal-400">
                                        {item.quantity > 0 ? item.quantity : <span className="text-slate-400 font-normal">—</span>}
                                    </td>
                                </tr>
                            ))}
                            {filteredInventory.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-6 text-center text-base text-slate-500 dark:text-slate-400">{searchTerm ? `Aucun adhésif trouvé correspondant à la recherche « ${searchTerm} »` : 'Aucun adhésif sur ce lieu.'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile : présentation carte. */}
                <div className="sm:hidden space-y-2 max-h-96 overflow-auto">
                    {filteredInventory.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <div className="min-w-0">
                                <div className="text-[11px] font-semibold uppercase text-teal-600 dark:text-teal-400">
                                    {item.auditType}{item.repere ? ` · ${item.repere}` : ''}
                                </div>
                                <div className="font-medium text-slate-800 dark:text-slate-100">{item.name}</div>
                                {(item.dimensions || item.material) && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {[item.dimensions, item.material].filter(Boolean).join(' · ')}
                                    </div>
                                )}
                            </div>
                            <div className="flex-shrink-0 text-right">
                                <div className="text-lg font-bold text-teal-700 dark:text-teal-400">
                                    {item.quantity > 0 ? item.quantity : <span className="text-slate-400 font-normal">—</span>}
                                </div>
                                <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">{selectedLieuId ? 'qté' : 'réseau'}</div>
                            </div>
                        </div>
                    ))}
                    {filteredInventory.length === 0 && (
                        <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                            {searchTerm ? `Aucun adhésif trouvé correspondant à la recherche « ${searchTerm} ».` : 'Aucun adhésif sur ce lieu.'}
                        </p>
                    )}
                </div>
            </SyntheseDetail>
        </div>
    );

    return (
        <div className="space-y-4 sm:space-y-5">
            {stationSearch}
            {stationPanel}
            {attention}
            {selectedLieuId ? patrimoinePanel : (
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-4 sm:gap-5 items-start">
                    {linesPanel}
                    {patrimoinePanel}
                </div>
            )}
            {details}

            <MaintenanceListModal
                isOpen={!!modalContent}
                onClose={() => setModalContent(null)}
                title={modalContent?.title || ''}
                items={modalContent?.items || []}
            />
        </div>
    );
};

export default SyntheseView;
