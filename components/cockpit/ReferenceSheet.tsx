// components/cockpit/ReferenceSheet.tsx
// =================================================================
// FICHE DE VIE d'une référence — le centre de vie du patrimoine.
// Contrat de plateforme, règle 2 : c'est LA fiche unique, ouverte depuis
// n'importe quelle section du cockpit.
// Conçue comme une COMPOSITION de sections autonomes : ajouter demain
// une nouvelle capacité = ajouter un composant de section ici, sans
// toucher aux autres.
// Lecture seule : le référentiel (DAT/PR/ECA) est une donnée statique
// distribuée avec le build — sa correction se fait dans le code source,
// jamais depuis l'application (aucune administration locale).
// =================================================================
import React, { useMemo } from 'react';
import { ArrowLeft, Ruler, Link2, Flag, Radar } from 'lucide-react';
import { SignageReference } from '../../types';
import { PatrimoineIndex, ReferenceUsage } from '../../utils/cockpit/patrimoineIndex';
import { AUDIT_CATEGORIES } from '../../data/config';
import { CategoryIcon } from '../CategoryIcon';
import { SUPPORT_LABELS, STATUS_LABELS, ARBITRAGE_LABELS, formatDimensions, formatScope } from './labels';

/** Ligne de transport → config visuelle (mêmes couleurs que partout
 *  ailleurs dans l'app, cf. AUDIT_CATEGORIES). 'P+R' n'a pas de config
 *  de ligne (ce n'est pas une ligne) : CategoryIcon affiche alors le
 *  badge générique "Tout le réseau" — jamais utilisé ici pour du P+R
 *  puisqu'on retombe sur le label texte dans ce cas (cf. LineBadge). */
const LINE_CATEGORY_KEY: Record<string, string> = {
    A: 'METRO_A', B: 'METRO_B', C: 'METRO_C', TRAM: 'TRAM', TELEO: 'TELEO', AEROPORT: 'LAE',
};
const LineBadge: React.FC<{ line: string }> = ({ line }) => {
    if (line === 'P+R') return <span className="text-xs font-bold text-slate-600 dark:text-slate-300">P+R</span>;
    const config = AUDIT_CATEGORIES.find(c => c.key === LINE_CATEGORY_KEY[line]);
    return config ? <CategoryIcon categoryConfig={config} size="sm" /> : <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{line}</span>;
};

/* ---------- briques locales de la fiche ---------- */

/** Titre de section — même grammaire que StatCard (cf. primitives.tsx) :
 *  cercle teal clair + icône teal, jamais une icône nue. Cercle réduit
 *  (w-8 au lieu de w-12) pour rester à l'échelle d'un h3, mais mêmes
 *  classes de couleur — aucune nouvelle variante. */
const SheetSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300">
                {icon}
            </div>
            {title}
        </h3>
        {children}
    </section>
);

/** Une caractéristique ABSENTE n'est pas une caractéristique vide : on ne
 *  l'affiche pas du tout. Un « Matière — » sous un « Support : Dibond » se lit
 *  comme une contradiction, alors que la matière n'a simplement pas de valeur
 *  distincte du support pour ce modèle. */
const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">{label}</span>
            <span className="text-sm text-slate-800 dark:text-slate-100">{value}</span>
        </div>
    );
};

const Pill: React.FC<{ children: React.ReactNode; tone?: 'amber' | 'red' | 'slate' | 'teal' }> = ({ children, tone = 'slate' }) => {
    const tones = {
        amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
        slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>;
};

/** Deux libellés désignent-ils la même chose ? Insensible à la casse, aux
 *  accents et à la ponctuation de liaison : le registre orthographie certains
 *  pôles différemment selon la ligne qui les dessert. */
const sameLabel = (a: string, b: string): boolean => {
    const normalize = (s: string) => s
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalize(a) === normalize(b);
};

/* ---------- sections de la fiche ---------- */

/**
 * Répartition d'une référence : UNE seule lecture, du général au précis —
 * ligne, puis station, puis implantation. La fiche présentait auparavant
 * « Par ligne » et « Par lieu » côte à côte : deux tableaux qui redisaient la
 * même chose, avec la ligne répétée sur chaque station et l'emplacement
 * répété sous son propre intitulé.
 *
 * Aucune donnée nouvelle : tout vient de usage.byLieu, dont chaque groupe
 * porte déjà sa ligne (cf. ImplantationGroup) — on la remonte d'un cran pour
 * qu'elle soit dite une fois, pas à chaque station.
 */
const UsageBreakdown: React.FC<{ usage: ReferenceUsage }> = ({ usage }) => {
    const byLine = useMemo(() => {
        const lines = new Map<string, {
            line: string; installed: number;
            lieux: Map<string, { lieuName: string; installed: number; implantations: Map<string, number> }>;
        }>();
        for (const lieu of usage.byLieu) {
            for (const group of lieu.groups) {
                const entry = lines.get(group.line) ?? { line: group.line, installed: 0, lieux: new Map() };
                entry.installed += group.installed;
                const lieuEntry = entry.lieux.get(lieu.lieuId)
                    ?? { lieuName: lieu.lieuName, installed: 0, implantations: new Map<string, number>() };
                lieuEntry.installed += group.installed;
                // L'implantation n'est dite que si elle apprend quelque chose :
                // quand elle reprend le nom de la station (aucun emplacement
                // précis connu), la répéter sous le titre du groupe n'ajoute
                // rien et allonge la lecture. Comparaison tolérante, car un
                // même lieu s'écrit parfois différemment selon la ligne qui le
                // dessert (« Université Paul Sabatier » côté métro,
                // « Université Paul-Sabatier » côté Téléo).
                if (group.context && !sameLabel(group.context, lieu.lieuName)) {
                    // Un même emplacement portant plusieurs exemplaires est dit
                    // une fois, avec sa quantité — le répéter à l'identique
                    // allonge la fiche sans rien apprendre (un DAT peut avoir
                    // quatre exemplaires « Salle des billets »).
                    lieuEntry.implantations.set(
                        group.context,
                        (lieuEntry.implantations.get(group.context) ?? 0) + group.installed,
                    );
                }
                entry.lieux.set(lieu.lieuId, lieuEntry);
                lines.set(group.line, entry);
            }
        }
        return [...lines.values()]
            .map(l => ({
                ...l,
                lieux: [...l.lieux.values()].sort((a, b) => b.installed - a.installed || a.lieuName.localeCompare(b.lieuName)),
            }))
            .sort((a, b) => b.installed - a.installed || a.line.localeCompare(b.line));
    }, [usage]);

    if (byLine.length === 0) return null;

    return (
        // Deux colonnes dès le desktop, empilées en dessous : chaque ligne de
        // transport est un bloc autonome, jamais une cellule d'un tableau (d'où
        // disparaît aussi la colonne vide de l'ancienne mise en page).
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
            {byLine.map(({ line, installed, lieux }) => (
                <section key={line}>
                    <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                        <span className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                            <LineBadge line={line} />
                            {line === 'P+R' ? 'Parcs relais' : `Ligne ${line}`}
                        </span>
                        <span className="flex items-baseline gap-1.5 flex-shrink-0">
                            <span className="text-lg font-bold text-teal-600 dark:text-teal-400 tabular-nums">{installed}</span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                exemplaire{installed > 1 ? 's' : ''}
                            </span>
                        </span>
                    </div>
                    <ul className="mt-2 space-y-2">
                        {lieux.map(lieu => (
                            <li key={lieu.lieuName}>
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{lieu.lieuName}</span>
                                    <span className="flex-shrink-0 text-sm font-bold text-teal-700 dark:text-teal-300 tabular-nums">{lieu.installed}</span>
                                </div>
                                {lieu.implantations.size > 0 && (
                                    <ul className="mt-0.5 space-y-0.5">
                                        {[...lieu.implantations.entries()].map(([label, count]) => (
                                            <li
                                                key={label}
                                                className="text-xs text-slate-500 dark:text-slate-400 break-words pl-3 border-l border-slate-200 dark:border-slate-700"
                                            >
                                                {label}
                                                {count > 1 && <span className="font-semibold text-slate-600 dark:text-slate-300"> ×{count}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
};

const UsageSection: React.FC<{ reference: SignageReference; index: PatrimoineIndex }> = ({ reference, index }) => {
    const usage = index.byReference.get(reference.id);
    if (!usage) {
        return (
            <SheetSection title="Implantations sur le réseau" icon={<Radar className="w-4 h-4" />}>
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Aucune implantation connue sur le périmètre actuel (référence désactivée, hors scope, ou partout non applicable).
                </p>
            </SheetSection>
        );
    }
    return (
        <SheetSection title="Implantations sur le réseau" icon={<Radar className="w-4 h-4" />}>
            {/* La volumétrie est dite une fois, en en-tête de fiche. Les
                compteurs de statut (conformes / non conformes / non contrôlés)
                relèvent de l'audit, pas de la consultation du patrimoine — ils
                vivent dans Analyse des anomalies. */}
            {/* Familles réellement rencontrées. Absente pour les familles
                qui n'ont pas de type d'équipement (Plans de quartier) : le
                champ disparaît au lieu d'afficher le scope à sa place. */}
            {usage.equipmentTypes.length > 0 && (
                <div className="mb-4">
                    <Field label="Types d'équipements" value={usage.equipmentTypes.join(', ')} />
                </div>
            )}
            <UsageBreakdown usage={usage} />
        </SheetSection>
    );
};

interface ReferenceSheetProps {
    reference: SignageReference;
    references: SignageReference[]; // pour résoudre sameAs / pairedWith
    index: PatrimoineIndex;
    onBack: () => void;
    onOpenReference: (referenceId: string) => void;
}

const ReferenceSheet: React.FC<ReferenceSheetProps> = ({ reference, references, index, onBack, onOpenReference }) => {
    const usage = index.byReference.get(reference.id);
    const refName = (id: string) => references.find(r => r.id === id)?.name ?? id;
    const linked = (id: string) => (
        <button
            key={id}
            onClick={() => onOpenReference(id)}
            className="text-teal-700 dark:text-teal-300 hover:underline font-medium text-sm text-left"
        >
            {refName(id)} <span className="font-mono text-xs text-slate-400">({id})</span>
        </button>
    );

    return (
        <div className="space-y-5">
            {/* En-tête de fiche */}
            <div className="flex items-start gap-3">
                <button
                    onClick={onBack}
                    className="p-2 mt-1 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                    aria-label="Retour à la liste"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100">{reference.name}</h2>
                        {reference.isDisabled && <Pill tone="red">Désactivée</Pill>}
                    </div>
                    {/* Volumétrie d'abord : « combien, et à combien d'endroits »
                        est la question qu'on se pose en ouvrant une fiche. */}
                    {usage && (
                        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-sm">
                            <span className="text-lg font-bold text-teal-600 dark:text-teal-400 tabular-nums">{usage.installedCount}</span>
                            <span className="text-slate-600 dark:text-slate-300">exemplaire{usage.installedCount > 1 ? 's' : ''}</span>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <span className="text-lg font-bold text-teal-600 dark:text-teal-400 tabular-nums">{usage.lieuCount}</span>
                            <span className="text-slate-600 dark:text-slate-300">lieu{usage.lieuCount > 1 ? 'x' : ''}</span>
                        </p>
                    )}
                    {/* L'identifiant technique reste consultable, mais il ne
                        dispute plus la place au nom : ce n'est pas ce qu'on
                        vient chercher ici. */}
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                        {reference.code ? `${reference.code} · ` : ''}{reference.id} · v{reference.version}
                    </p>
                </div>
            </div>

            {/* Identité & caractéristiques */}
            <SheetSection title="Caractéristiques" icon={<Ruler className="w-4 h-4" />}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field label="Support" value={SUPPORT_LABELS[reference.support]} />
                    <Field label="Matière" value={reference.material} />
                    <Field label="Dimensions" value={formatDimensions(reference.dimensions)} />
                    <Field label="Scope d'implantation" value={formatScope(reference.scope)} />
                </div>
            </SheetSection>

            {/* Implantations (moteur d'index) */}
            <UsageSection reference={reference} index={index} />

            {/* Relations */}
            {(reference.sameAs?.length || reference.pairedWith) && (
                <SheetSection title="Relations" icon={<Link2 className="w-4 h-4" />}>
                    <div className="space-y-2">
                        {reference.sameAs && reference.sameAs.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">Équivalences (même visuel)</span>
                                {reference.sameAs.map(linked)}
                            </div>
                        )}
                        {reference.pairedWith && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">Posée avec</span>
                                {linked(reference.pairedWith)}
                            </div>
                        )}
                    </div>
                </SheetSection>
            )}

            {/* Qualification — décision de catalogue, distincte des anomalies terrain (section Anomalies) */}
            {reference.arbitrage && (
                <SheetSection title="Qualification" icon={<Flag className="w-4 h-4" />}>
                    <div className="space-y-1">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-semibold">{ARBITRAGE_LABELS[reference.arbitrage.status]}</span>
                            {reference.arbitrage.reason ? ` — ${reference.arbitrage.reason}` : ''}
                        </p>
                        {reference.arbitrage.updatedAt && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                Décidé le {new Date(reference.arbitrage.updatedAt).toLocaleDateString('fr-FR')}
                                {(reference.arbitrage.history?.length ?? 0) > 0 ? ` · ${reference.arbitrage.history!.length} décision(s) antérieure(s)` : ''}
                            </p>
                        )}
                    </div>
                </SheetSection>
            )}
        </div>
    );
};

export default ReferenceSheet;
