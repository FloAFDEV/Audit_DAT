// components/cockpit/ReferenceSheet.tsx
// =================================================================
// FICHE DE VIE d'une référence — le centre de vie du patrimoine.
// Contrat de plateforme, règle 2 : c'est LA fiche unique, ouverte depuis
// n'importe quelle section du cockpit.
// Conçue comme une COMPOSITION de sections autonomes : ajouter demain
// « Photos », « Campagnes », « Stocks »... = ajouter un composant de
// section ici, sans toucher aux autres. Lecture seule à ce stade
// (l'édition arrive avec l'administration).
// =================================================================
import React from 'react';
import {
    ArrowLeft, ArrowRight, Ruler, MapPin, FileText, Link2, History, Flag, Radar, Camera,
} from 'lucide-react';
import { SignageReference } from '../../types';
import { PatrimoineIndex } from '../../utils/cockpit/patrimoineIndex';
import { selectionFromReference } from '../../utils/cockpit/selection';
import { SUPPORT_LABELS, STATUS_LABELS, ARBITRAGE_LABELS, formatDimensions, formatScope } from './labels';
import SelectionConsumers from './SelectionConsumers';

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

const UsageSection: React.FC<{ reference: SignageReference; index: PatrimoineIndex; onViewInventory: (id: string) => void }> = ({ reference, index, onViewInventory }) => {
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{usage.installedCount}</div>
                    <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mt-1">Exemplaires</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/30">
                    <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{usage.okCount}</div>
                    <div className="text-xs font-semibold uppercase text-teal-600 dark:text-teal-400 mt-1">Conformes</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">{usage.defectCount}</div>
                    <div className="text-xs font-semibold uppercase text-red-600 dark:text-red-400 mt-1">Non conformes</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{usage.uncheckedCount}</div>
                    <div className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400 mt-1">Non contrôlés</div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <Field label="Lieux concernés" value={usage.lieuCount} />
                <Field label="Lignes" value={usage.lines.join(', ')} />
                <Field label="Types d'équipements" value={usage.equipmentTypes.length > 0 ? usage.equipmentTypes.join(', ') : 'DAT'} />
            </div>
            {usage.byLieu.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-700 text-left text-slate-600 dark:text-slate-300">
                            <tr>
                                <th className="p-2.5 font-bold text-xs uppercase">Lieu</th>
                                <th className="p-2.5 font-bold text-xs uppercase text-center">Exemplaires</th>
                                <th className="p-2.5 font-bold text-xs uppercase text-center">Défauts</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {usage.byLieu.map(l => (
                                <tr key={l.lieuId} className="bg-white dark:bg-slate-900">
                                    <td className="p-2.5 font-medium text-slate-800 dark:text-slate-100">{l.lieuName}</td>
                                    <td className="p-2.5 text-center text-slate-600 dark:text-slate-300">{l.installed}</td>
                                    <td className="p-2.5 text-center">
                                        {l.defects > 0
                                            ? <span className="font-bold text-red-600 dark:text-red-400">{l.defects}</span>
                                            : <span className="text-slate-400">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <button
                onClick={() => onViewInventory(reference.id)}
                className="flex items-center gap-1 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:underline"
            >
                Voir l'inventaire réseau (répartition par ligne) <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {/* La sélection n'est pas une notion propriétaire d'Anomalies :
                une fiche de référence en produit une du même contrat (source
                'reference'), consommable par les mêmes futurs modules. */}
            <SelectionConsumers selection={selectionFromReference(index, reference.id, reference.name)} />
        </SheetSection>
    );
};

interface ReferenceSheetProps {
    reference: SignageReference;
    references: SignageReference[]; // pour résoudre sameAs / pairedWith
    index: PatrimoineIndex;
    onBack: () => void;
    onOpenReference: (referenceId: string) => void;
    onViewInventory: (referenceId: string) => void;
}

const ReferenceSheet: React.FC<ReferenceSheetProps> = ({ reference, references, index, onBack, onOpenReference, onViewInventory }) => {
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
            <UsageSection reference={reference} index={index} onViewInventory={onViewInventory} />

            {/* Pose recommandée */}
            <SheetSection title="Pose recommandée" icon={<MapPin className="w-4 h-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Zone" value={reference.placement.zone} />
                    <Field label="Position" value={reference.placement.position} />
                    <Field label="Repère d'alignement" value={reference.placement.alignmentMark} />
                </div>
                {reference.placement.installationGuidance && (
                    <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
                        {reference.placement.installationGuidance}
                    </p>
                )}
                {reference.legacyDescription && (
                    <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 italic">
                        Description historique : {reference.legacyDescription}
                    </p>
                )}
            </SheetSection>

            {/* Documents externes */}
            <SheetSection title="Documents externes" icon={<FileText className="w-4 h-4" />}>
                {(reference.externalDocuments?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucune référence documentaire connue.</p>
                ) : (
                    <ul className="space-y-3">
                        {reference.externalDocuments!.map((doc, i) => (
                            <li key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Pill tone="teal">{doc.provider}</Pill>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100 font-mono">{doc.fileReference}</span>
                                    {doc.docVersion && <span className="text-xs text-slate-500 dark:text-slate-400">({doc.docVersion})</span>}
                                    {doc.forVersion !== undefined && <span className="text-xs text-slate-400">→ v{doc.forVersion}</span>}
                                </div>
                                {doc.note && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{doc.note}</p>}
                            </li>
                        ))}
                    </ul>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                    Les fichiers de production restent gérés hors application (références documentaires uniquement).
                </p>
            </SheetSection>

            {/* Médias terrain — emplacement prévu, édition à venir */}
            <SheetSection title="Médias terrain" icon={<Camera className="w-4 h-4" />}>
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    Aucun média — photos d'exemple de pose, schémas et illustrations seront ajoutables dans une prochaine étape.
                </p>
            </SheetSection>

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

            {/* Historique des versions physiques */}
            <SheetSection title="Historique des versions" icon={<History className="w-4 h-4" />}>
                {(reference.previousVersions?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                        Version initiale (v{reference.version}) — aucun changement physique enregistré.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {reference.previousVersions!.map(v => (
                            <li key={v.version} className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-bold">v{v.version}</span> — {SUPPORT_LABELS[v.support]}
                                {v.dimensions ? `, ${formatDimensions(v.dimensions)}` : ''}
                                {v.effectiveTo && <span className="text-slate-400"> · jusqu'au {new Date(v.effectiveTo).toLocaleDateString('fr-FR')}</span>}
                                {v.changeReason && <p className="text-xs text-slate-500 dark:text-slate-400">{v.changeReason}</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </SheetSection>

            {/* Qualification — décision de catalogue, distincte des anomalies terrain (section Anomalies) */}
            {(reference.needsReview || reference.arbitrage) && (
                <SheetSection title="Qualification" icon={<Flag className="w-4 h-4" />}>
                    {reference.needsReview && !reference.arbitrage && (
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                            Cette référence nécessite une décision de qualification catalogue (divergence documentaire ou
                            classement incomplet). Le détail figure dans les notes des documents externes ci-dessus —
                            décision à prendre dans Existant / Qualification référentiel.
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
