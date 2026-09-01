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
import React, { useState } from 'react';
import {
    ArrowLeft, Ruler, MapPin, Link2, History, Flag, Radar, Camera, ShieldCheck, PencilLine, Archive, ArchiveRestore, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SignageReference } from '../../types';
import { PatrimoineIndex } from '../../utils/cockpit/patrimoineIndex';
import useAuditStore from '../../store';
import { useAdminReferences } from '../../hooks/useAdminReferences';
import { referenceToEditableFields } from '../../utils/cockpit/signageReferenceEditor';
import { ADMIN_CODE } from './AdminGate';
import SignageReferenceForm from './SignageReferenceForm';
import { SUPPORT_LABELS, STATUS_LABELS, ARBITRAGE_LABELS, formatDimensions, formatScope } from './labels';

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <Field label="Lieux concernés" value={usage.lieuCount} />
                <Field label="Types d'équipements" value={usage.equipmentTypes.length > 0 ? usage.equipmentTypes.join(', ') : 'DAT'} />
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
                                        <th className="p-2.5 font-bold text-xs uppercase text-center">Exemplaires</th>
                                        <th className="p-2.5 font-bold text-xs uppercase text-center">Défauts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {usage.byLine.map(l => (
                                        <tr key={l.line} className="bg-white dark:bg-slate-900">
                                            <td className="p-2.5 font-medium text-slate-800 dark:text-slate-100">{l.line === 'P+R' ? 'P+R' : `Ligne ${l.line}`}</td>
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
                    </div>
                )}
            </div>
        </SheetSection>
    );
};

/* ---------- section Admin (Lot 2a) : édition / archivage / restauration ---------- */

/** Accès discret depuis la fiche elle-même quand l'Admin est verrouillé —
 *  avant ce correctif, la section Administration disparaissait purement
 *  et simplement (return null), sans aucun moyen de savoir depuis la
 *  fiche que déverrouiller l'Admin est possible. Volontairement minimal :
 *  un simple lien, pas un panneau (AdminGate reste le point d'entrée
 *  complet, utilisé par ailleurs dans l'onglet Admin du cockpit). Une
 *  fois déverrouillé, isAdminUnlocked est un état de STORE (pas local à
 *  ce composant) : la fiche affiche immédiatement Modifier/Archiver,
 *  sans navigation ni rechargement, et reste active pour le reste de la
 *  session — exactement comme un déverrouillage depuis l'onglet Admin. */
const InlineAdminUnlock: React.FC = () => {
    const unlockAdmin = useAuditStore(s => s.unlockAdmin);
    const [isOpen, setIsOpen] = useState(false);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
                <Lock className="w-3.5 h-3.5" /> Déverrouiller l'Admin
            </button>
        );
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code === ADMIN_CODE) {
            unlockAdmin();
        } else {
            setError('Code incorrect.');
            setCode('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                aria-label="Code Admin à 4 chiffres"
                value={code}
                onChange={e => setCode(e.target.value)}
                autoFocus
                className="w-20 text-center tracking-[0.4em] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-1 px-2 text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-inset focus:ring-teal-600"
                placeholder="••••"
            />
            <button type="submit" className="text-xs font-semibold text-teal-600 dark:text-teal-400">Déverrouiller</button>
            <button type="button" onClick={() => { setIsOpen(false); setError(''); setCode(''); }} className="text-xs text-slate-400">Annuler</button>
            {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
        </form>
    );
};

const AdminSection: React.FC<{ reference: SignageReference; onReload: () => void }> = ({ reference, onReload }) => {
    const isAdminUnlocked = useAuditStore(s => s.isAdminUnlocked);
    const { update, archive, restore } = useAdminReferences();
    const [isEditing, setIsEditing] = useState(false);

    if (!isAdminUnlocked) {
        return (
            <SheetSection title="Administration" icon={<ShieldCheck className="w-4 h-4" />}>
                <InlineAdminUnlock />
            </SheetSection>
        );
    }

    const handleSubmit = async (fields: Parameters<typeof update>[1], changeReason?: string) => {
        try {
            await update(reference, fields, changeReason);
            toast.success(`Référence « ${fields.name} » modifiée`);
            setIsEditing(false);
            onReload();
        } catch (error) {
            console.error('Échec de la modification de la référence :', error);
            toast.error("Échec de la modification — réessayez.");
        }
    };

    const handleArchive = async () => {
        try {
            await archive(reference);
            toast.success(`Référence « ${reference.name} » archivée`);
            onReload();
        } catch (error) {
            console.error("Échec de l'archivage de la référence :", error);
            toast.error("Échec de l'archivage — réessayez.");
        }
    };

    const handleRestore = async () => {
        try {
            await restore(reference);
            toast.success(`Référence « ${reference.name} » restaurée`);
            onReload();
        } catch (error) {
            console.error('Échec de la restauration de la référence :', error);
            toast.error('Échec de la restauration — réessayez.');
        }
    };

    return (
        <SheetSection title="Administration" icon={<ShieldCheck className="w-4 h-4" />}>
            {isEditing ? (
                <SignageReferenceForm
                    mode="edit"
                    initialFields={referenceToEditableFields(reference)}
                    onSubmit={handleSubmit}
                    onCancel={() => setIsEditing(false)}
                    submitLabel="Enregistrer les modifications"
                />
            ) : (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                        <PencilLine className="w-4 h-4" /> Modifier
                    </button>
                    {reference.archivedAt ? (
                        <button
                            onClick={handleRestore}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300"
                        >
                            <ArchiveRestore className="w-4 h-4" /> Restaurer
                        </button>
                    ) : (
                        <button
                            onClick={handleArchive}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300"
                        >
                            <Archive className="w-4 h-4" /> Archiver
                        </button>
                    )}
                </div>
            )}
        </SheetSection>
    );
};

interface ReferenceSheetProps {
    reference: SignageReference;
    references: SignageReference[]; // pour résoudre sameAs / pairedWith
    index: PatrimoineIndex;
    onBack: () => void;
    onOpenReference: (referenceId: string) => void;
    onReload: () => void;
}

const ReferenceSheet: React.FC<ReferenceSheetProps> = ({ reference, references, index, onBack, onOpenReference, onReload }) => {
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
                        {reference.archivedAt && <Pill tone="slate">Archivée</Pill>}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        {reference.code ? `${reference.code} · ` : ''}{reference.id} · v{reference.version}
                    </p>
                </div>
            </div>

            <AdminSection reference={reference} onReload={onReload} />

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
                            décision à prendre dans Référentiel / Qualification du référentiel.
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
