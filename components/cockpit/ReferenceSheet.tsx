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
import React, { useState } from 'react';
import { ArrowLeft, Ruler, Link2, Flag, Radar, ChevronRight, ChevronDown } from 'lucide-react';
import { SignageReference } from '../../types';
import { PatrimoineIndex } from '../../utils/cockpit/patrimoineIndex';
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

const SheetSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">
            <span className="text-teal-600 dark:text-teal-400">{icon}</span>
            {title}
        </h3>
        {children}
    </section>
);

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">{label}</span>
        <span className="text-sm text-slate-800 dark:text-slate-100">{value ?? <span className="text-slate-400">—</span>}</span>
    </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: 'amber' | 'red' | 'slate' | 'teal' }> = ({ children, tone = 'slate' }) => {
    const tones = {
        amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
        slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>;
};

/* ---------- sections de la fiche ---------- */

const UsageSection: React.FC<{ reference: SignageReference; index: PatrimoineIndex }> = ({ reference, index }) => {
    const usage = index.byReference.get(reference.id);
    // Plusieurs lieux dépliables à la fois : on prépare une campagne en
    // comparant des stations, pas en les ouvrant une par une.
    const [openLieux, setOpenLieux] = useState<Set<string>>(new Set());
    const toggleLieu = (lieuId: string) => setOpenLieux(prev => {
        const next = new Set(prev);
        next.has(lieuId) ? next.delete(lieuId) : next.add(lieuId);
        return next;
    });
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
            {/* Volumétrie : deux nombres, ceux dont on a besoin pour préparer
                une pose. Les compteurs de statut (conformes / non conformes /
                non contrôlés) relèvent de l'audit, pas de la consultation du
                patrimoine — ils vivent dans Analyse des anomalies. */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{usage.installedCount}</span>
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">exemplaires</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{usage.lieuCount}</span>
                <span className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">lieux</span>
            </div>
            <div className="mb-4">
                {/* Familles réellement rencontrées ; à défaut, le scope de la
                    référence — jamais un libellé supposé. */}
                <Field
                    label="Types d'équipements"
                    value={usage.equipmentTypes.length > 0 ? usage.equipmentTypes.join(', ') : reference.scope.auditType}
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {usage.byLine.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Par ligne</h4>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-700 text-left text-slate-600 dark:text-slate-300">
                                    <tr>
                                        <th className="p-2.5 font-bold text-xs uppercase">Ligne</th>
                                        <th className="p-2.5 font-bold text-xs uppercase text-right">Exemplaires</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {usage.byLine.map(l => (
                                        <tr key={l.line} className="bg-white dark:bg-slate-900">
                                            <td className="p-2.5">
                                                <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                                                    <LineBadge line={l.line} />
                                                    {l.line === 'P+R' ? null : `Ligne ${l.line}`}
                                                </span>
                                            </td>
                                            <td className="p-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{l.installed}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {usage.byLieu.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Par lieu</h4>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-700 text-left text-slate-600 dark:text-slate-300">
                                    <tr>
                                        <th className="p-2.5 font-bold text-xs uppercase">Lieu</th>
                                        <th className="p-2.5 font-bold text-xs uppercase text-right">Exemplaires</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {usage.byLieu.map(l => {
                                        const isOpen = openLieux.has(l.lieuId);
                                        return (
                                            <React.Fragment key={l.lieuId}>
                                                <tr
                                                    className="bg-white dark:bg-slate-900 cursor-pointer hover:bg-teal-50/60 dark:hover:bg-slate-800 transition-colors"
                                                    onClick={() => toggleLieu(l.lieuId)}
                                                >
                                                    <td className="p-2.5 font-medium text-slate-800 dark:text-slate-100">
                                                        <span className="flex items-center gap-1.5">
                                                            {isOpen
                                                                ? <ChevronDown className="w-4 h-4 flex-shrink-0 text-teal-600 dark:text-teal-400" />
                                                                : <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />}
                                                            {l.lieuName}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{l.installed}</td>
                                                </tr>
                                                {isOpen && (
                                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                        <td colSpan={2} className="px-3 py-2.5">
                                                            {/* Un bloc par emplacement réellement présent :
                                                                ligne, emplacement, nombre, puis les numéros
                                                                d'équipement à poser. */}
                                                            <ul className="space-y-2.5">
                                                                {l.groups.map((g, i) => (
                                                                    <li key={`${g.line}-${g.context}-${i}`}>
                                                                        <div className="flex items-baseline justify-between gap-3">
                                                                            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                                                                <LineBadge line={g.line} />
                                                                                {g.line === 'P+R' ? null : `Ligne ${g.line}`}
                                                                                {g.context && <span className="font-medium normal-case tracking-normal text-slate-500 dark:text-slate-400"> · {g.context}</span>}
                                                                            </span>
                                                                            <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{g.installed}</span>
                                                                        </div>
                                                                        <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                                                                            {g.equipmentLabels.join(' · ')}
                                                                        </p>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
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
                        {reference.needsReview && <Pill tone="amber">À qualifier</Pill>}
                        {reference.isDisabled && <Pill tone="red">Désactivée</Pill>}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">
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
            {(reference.needsReview || reference.arbitrage) && (
                <SheetSection title="Qualification" icon={<Flag className="w-4 h-4" />}>
                    {reference.needsReview && !reference.arbitrage && (
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                            Cette référence nécessite une décision de qualification catalogue (divergence documentaire ou
                            classement incomplet) — décision à prendre dans Référentiel / Qualification du référentiel.
                        </p>
                    )}
                    {reference.arbitrage && (
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
                    )}
                </SheetSection>
            )}
        </div>
    );
};

export default ReferenceSheet;
