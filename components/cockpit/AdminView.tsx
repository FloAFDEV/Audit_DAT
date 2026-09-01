// components/cockpit/AdminView.tsx
// =================================================================
// Section « Admin » du cockpit (Lot 2a/2b/2c) — préparer le référentiel
// et les stations avant le terrain, sans jamais toucher au code.
// Verrouillée par AdminGate (code local, non persisté). Registre
// d'onglets, même patron que StatsPage/ReferentielView — une capacité de
// plus = une entrée de registre, jamais une restructuration.
// =================================================================
import React, { useMemo, useState } from 'react';
import { BookPlus, Archive, Building, ArchiveRestore, Trash2, PencilLine, LucideIcon, Search, LayoutList, Sparkles, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { Lieu, AuditModule, AuditModuleType, AuditDefinition } from '../../types';
import { LieuBadges } from '../Icons';
import { LineIcon } from '../LineIcon';
import useAuditStore from '../../store';
import { useAdminReferences } from '../../hooks/useAdminReferences';
import { useAuditDefinitions } from '../../hooks/useAuditDefinitions';
import { useAdminAuditDefinitions } from '../../hooks/useAdminAuditDefinitions';
import { referenceToEditableFields } from '../../utils/cockpit/signageReferenceEditor';
import { computeTargetLieuIds, computeDeployedCount, AuditDefinitionEditableFields } from '../../utils/cockpit/auditDefinitionAdmin';
import { MODULE_LINES, ModuleLine } from '../../utils/cockpit/moduleAdmin';
import { CUSTOM_AUDIT_ICON_KEYS, resolveCustomAuditIcon, DEFAULT_CUSTOM_AUDIT_ICON } from '../../data/customAuditIcons';
import SignageReferenceForm from './SignageReferenceForm';
import StationModulesPanel from './StationModulesPanel';
import AdminGate from './AdminGate';
import ConfirmationModal from '../ConfirmationModal';
import { AUDIT_TYPE_LABELS, SUPPORT_LABELS, formatDimensions } from './labels';

const LINE_LABEL: Record<ModuleLine, string> = {
    A: 'Ligne A', B: 'Ligne B', C: 'Ligne C', TRAM: 'Tram', TELEO: 'Téléo', AEROPORT: 'Aéroport Express',
};

/** Badge de ligne réutilisant EXACTEMENT LineIcon (mêmes couleurs/formes
 *  que partout ailleurs dans l'app) — module synthétique minimal portant
 *  juste la ligne, jamais un second système de badges. */
const StandaloneLineBadge: React.FC<{ line: string }> = ({ line }) => (
    <LineIcon module={{ id: '', name: '', type: AuditModuleType.DAT, line: line as any, data: {} as any }} size="sm" />
);

/* ---------------- Créer une référence ---------------- */

const CreatePanel: React.FC = () => {
    const { create } = useAdminReferences();
    const [key, setKey] = useState(0); // force un formulaire vierge après création

    const handleSubmit = async (fields: Parameters<typeof create>[0]) => {
        try {
            await create(fields);
            toast.success(`Référence « ${fields.name} » créée`);
            setKey(k => k + 1);
        } catch (error) {
            console.error('Échec de la création de la référence :', error);
            toast.error('Échec de la création — réessayez.');
        }
    };

    return (
        <div className="max-w-2xl">
            <SignageReferenceForm
                key={key}
                mode="create"
                onSubmit={handleSubmit}
                onCancel={() => setKey(k => k + 1)}
                submitLabel="Créer la référence"
            />
        </div>
    );
};

/* ---------------- Archives des références ---------------- */

const ArchivesPanel: React.FC = () => {
    const allReferences = useAuditStore(s => s.signageReferences);
    const { restore, deleteForever } = useAdminReferences();
    const [toDelete, setToDelete] = useState<string | null>(null);
    const archived = useMemo(() => allReferences.filter(r => r.archivedAt), [allReferences]);

    const handleRestore = async (id: string, name: string) => {
        try {
            await restore(allReferences.find(r => r.id === id)!);
            toast.success(`Référence « ${name} » restaurée`);
        } catch (error) {
            console.error('Échec de la restauration :', error);
            toast.error('Échec de la restauration — réessayez.');
        }
    };

    const handleDeleteForever = async () => {
        if (!toDelete) return;
        const reference = allReferences.find(r => r.id === toDelete);
        if (!reference) { setToDelete(null); return; }
        try {
            await deleteForever(reference);
            toast.success(`Référence « ${reference.name} » supprimée définitivement`);
        } catch (error) {
            console.error('Échec de la suppression définitive :', error);
            toast.error(error instanceof Error ? error.message : 'Échec de la suppression — réessayez.');
        } finally {
            setToDelete(null);
        }
    };

    if (archived.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune référence archivée.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {archived.map(ref => (
                <div key={ref.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{ref.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{AUDIT_TYPE_LABELS[ref.auditType]} · {SUPPORT_LABELS[ref.support]} · {ref.id}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleRestore(ref.id, ref.name)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300">
                            <ArchiveRestore className="w-4 h-4" /> Restaurer
                        </button>
                        <button onClick={() => setToDelete(ref.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Supprimer définitivement">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={handleDeleteForever}
                title="Supprimer définitivement"
                message="Cette référence sera supprimée irréversiblement du catalogue. Cette action est impossible pour une référence encore utilisée dans le catalogue historique."
                isDestructive
            />
        </div>
    );
};

/* ---------------- Stations actives ---------------- */

const StationRow: React.FC<{ lieu: Lieu }> = ({ lieu }) => {
    const renameStationAdmin = useAuditStore(s => s.renameStationAdmin);
    const archiveStationAdmin = useAuditStore(s => s.archiveStationAdmin);
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(lieu.name);
    const [showModules, setShowModules] = useState(false);

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await renameStationAdmin(lieu.id, name);
            setIsRenaming(false);
        } catch (error) {
            console.error('Échec du renommage :', error);
            toast.error('Échec du renommage — réessayez.');
        }
    };

    const handleArchive = async () => {
        try {
            await archiveStationAdmin(lieu.id);
            toast.success(`Station « ${lieu.name} » archivée`);
        } catch (error) {
            console.error("Échec de l'archivage :", error);
            toast.error("Échec de l'archivage — réessayez.");
        }
    };

    return (
        <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                {isRenaming ? (
                    <form onSubmit={handleRename} className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <input value={name} onChange={e => setName(e.target.value)} className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-1.5 px-2 text-sm" autoFocus />
                        <button type="submit" className="text-xs font-semibold text-teal-600">OK</button>
                        <button type="button" onClick={() => { setIsRenaming(false); setName(lieu.name); }} className="text-xs text-slate-400">Annuler</button>
                    </form>
                ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                        <LieuBadges lieu={lieu} />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{lieu.name} <span className="text-xs font-normal text-slate-400">({lieu.modules.length} module{lieu.modules.length !== 1 ? 's' : ''})</span></p>
                    </div>
                )}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setShowModules(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
                        <LayoutList className="w-4 h-4" /> Modules
                    </button>
                    <button onClick={() => setIsRenaming(true)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Renommer la station">
                        <PencilLine className="w-4 h-4" />
                    </button>
                    <button onClick={handleArchive} className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" aria-label="Archiver la station">
                        <Archive className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {showModules && <StationModulesPanel lieu={lieu} />}
        </div>
    );
};

const StationsPanel: React.FC = () => {
    const lieux = useAuditStore(s => s.lieux);
    const createStationAdmin = useAuditStore(s => s.createStationAdmin);
    const [query, setQuery] = useState('');
    const [newName, setNewName] = useState('');
    const active = useMemo(
        () => lieux.filter(l => !l.archivedAt && l.name.toLowerCase().includes(query.trim().toLowerCase())),
        [lieux, query]
    );

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createStationAdmin(newName);
            toast.success(`Station « ${newName} » créée`);
            setNewName('');
        } catch (error) {
            console.error('Échec de la création de la station :', error);
            toast.error('Échec de la création — réessayez.');
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Nouvelle station</label>
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom de la station" className="block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-1.5 px-2 text-sm" />
                </div>
                <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">Créer</button>
            </form>

            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
                <input
                    type="text"
                    placeholder="Rechercher une station…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="block w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 pl-10 pr-3 text-sm"
                />
            </div>

            <div className="space-y-2">
                {active.map(lieu => <StationRow key={lieu.id} lieu={lieu} />)}
                {active.length === 0 && <p className="text-sm text-slate-400 italic text-center py-6">Aucune station ne correspond.</p>}
            </div>
        </div>
    );
};

/* ---------------- Stations archivées ---------------- */

const StationArchivesPanel: React.FC = () => {
    const lieux = useAuditStore(s => s.lieux);
    const restoreStationAdmin = useAuditStore(s => s.restoreStationAdmin);
    const deleteStationForever = useAuditStore(s => s.deleteStationForever);
    const [toDelete, setToDelete] = useState<Lieu | null>(null);
    const archived = useMemo(() => lieux.filter(l => l.archivedAt), [lieux]);

    const handleRestore = async (lieu: Lieu) => {
        try {
            await restoreStationAdmin(lieu.id);
            toast.success(`Station « ${lieu.name} » restaurée`);
        } catch (error) {
            console.error('Échec de la restauration :', error);
            toast.error('Échec de la restauration — réessayez.');
        }
    };

    const handleDeleteForever = async () => {
        if (!toDelete) return;
        try {
            await deleteStationForever(toDelete.id);
            toast.success(`Station « ${toDelete.name} » supprimée définitivement`);
        } catch (error) {
            console.error('Échec de la suppression définitive :', error);
            toast.error('Échec de la suppression — réessayez.');
        } finally {
            setToDelete(null);
        }
    };

    if (archived.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune station archivée.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {archived.map(lieu => (
                <div key={lieu.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 flex-wrap">
                        <LieuBadges lieu={lieu} />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{lieu.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => handleRestore(lieu)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300">
                            <ArchiveRestore className="w-4 h-4" /> Restaurer
                        </button>
                        <button onClick={() => setToDelete(lieu)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Supprimer définitivement">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={handleDeleteForever}
                title="Supprimer définitivement"
                message={`« ${toDelete?.name} » et toutes ses données d'audit seront supprimées irréversiblement. Cette action est réservée aux stations déjà archivées.`}
                isDestructive
            />
        </div>
    );
};

/* ---------------- Audits configurables (Partie 2) ---------------- */

/** Sélecteur multi-station compact (exclusions/inclusions) — recherche +
 *  cases à cocher, pas de nouveau composant générique : juste la liste
 *  déjà utilisée partout (useAuditStore lieux), filtrée localement. */
const StationPicker: React.FC<{ label: string; selectedIds: string[]; onChange: (ids: string[]) => void }> = ({ label, selectedIds, onChange }) => {
    const lieux = useAuditStore(s => s.lieux);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const active = useMemo(() => lieux.filter(l => !l.archivedAt), [lieux]);
    const filtered = useMemo(
        () => active.filter(l => l.name.toLowerCase().includes(query.trim().toLowerCase())),
        [active, query]
    );

    const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);

    return (
        <div>
            <button type="button" onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                {label} ({selectedIds.length}) {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {open && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1 bg-white dark:bg-slate-800">
                    <input
                        type="text" placeholder="Rechercher une station…" value={query} onChange={e => setQuery(e.target.value)}
                        className="block w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-1 px-2 text-xs mb-1"
                    />
                    {filtered.map(l => (
                        <label key={l.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                            <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={() => toggle(l.id)} />
                            <span className="text-slate-700 dark:text-slate-200">{l.name}</span>
                        </label>
                    ))}
                    {filtered.length === 0 && <p className="text-xs text-slate-400 italic px-1">Aucune station.</p>}
                </div>
            )}
        </div>
    );
};

/** Création / modification d'une AuditDefinition — nom, icône (palette
 *  lucide-react existante), lignes ciblées, exclusions, inclusions. Rien
 *  de plus (R : pas de campagne, pas de workflow). */
const DefinitionForm: React.FC<{
    initial?: AuditDefinitionEditableFields;
    onSubmit: (fields: AuditDefinitionEditableFields) => Promise<void>;
    onCancel: () => void;
    submitLabel: string;
}> = ({ initial, onSubmit, onCancel, submitLabel }) => {
    const [name, setName] = useState(initial?.name ?? '');
    const [icon, setIcon] = useState(initial?.icon ?? DEFAULT_CUSTOM_AUDIT_ICON);
    const [targetLines, setTargetLines] = useState<ModuleLine[]>(initial?.targetLines ?? []);
    const [excludedLieuIds, setExcludedLieuIds] = useState<string[]>(initial?.excludedLieuIds ?? []);
    const [includedLieuIds, setIncludedLieuIds] = useState<string[]>(initial?.includedLieuIds ?? []);
    const [error, setError] = useState<string | null>(null);

    const toggleLine = (line: ModuleLine) => setTargetLines(prev => prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { setError('Le nom est obligatoire.'); return; }
        setError(null);
        try {
            await onSubmit({ name: name.trim(), icon, targetLines, excludedLieuIds, includedLieuIds });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Échec — réessayez.');
        }
    };

    const inputClass = "block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 px-3 text-sm text-slate-900 dark:text-slate-50";
    const labelClass = "text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1 block";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div>
                <label className={labelClass}>Nom *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Ex. : Plans de quartier" required autoFocus />
            </div>
            <div>
                <label className={labelClass}>Icône</label>
                <div className="flex flex-wrap gap-2">
                    {CUSTOM_AUDIT_ICON_KEYS.map(key => {
                        const Icon = resolveCustomAuditIcon(key);
                        return (
                            <button key={key} type="button" onClick={() => setIcon(key)} aria-label={key}
                                className={`p-2 rounded-lg border transition-colors ${icon === key ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100'}`}>
                                <Icon className="w-4 h-4" />
                            </button>
                        );
                    })}
                </div>
            </div>
            <div>
                <label className={labelClass}>Lignes ciblées</label>
                <div className="flex flex-wrap gap-2">
                    {MODULE_LINES.map(line => (
                        <button key={line} type="button" onClick={() => toggleLine(line)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${targetLines.includes(line) ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {LINE_LABEL[line]}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StationPicker label="Stations exclues" selectedIds={excludedLieuIds} onChange={setExcludedLieuIds} />
                <StationPicker label="Stations ajoutées (hors lignes ciblées)" selectedIds={includedLieuIds} onChange={setIncludedLieuIds} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Annuler</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">{submitLabel}</button>
            </div>
        </form>
    );
};

/** Références d'une définition (scope.auditType === 'CUSTOM', même
 *  definitionId) — même CRUD que le référentiel historique
 *  (SignageReferenceForm + useAdminReferences), simplement filtré. */
const DefinitionReferencesPanel: React.FC<{ definition: AuditDefinition }> = ({ definition }) => {
    const allReferences = useAuditStore(s => s.signageReferences);
    const { create, update, archive, restore } = useAdminReferences();
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const refs = useMemo(
        () => allReferences.filter(r => r.scope.auditType === 'CUSTOM' && r.scope.definitionId === definition.id),
        [allReferences, definition.id]
    );
    const active = refs.filter(r => !r.archivedAt);
    const archived = refs.filter(r => r.archivedAt);

    const handleCreate = async (fields: Parameters<typeof create>[0]) => {
        try {
            await create(fields);
            toast.success(`Référence « ${fields.name} » créée`);
            setCreating(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Échec de la création — réessayez.');
        }
    };

    const handleUpdate = async (id: string, fields: Parameters<typeof update>[1]) => {
        const ref = refs.find(r => r.id === id);
        if (!ref) return;
        try {
            await update(ref, fields);
            toast.success('Référence modifiée');
            setEditingId(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Échec de la modification — réessayez.');
        }
    };

    return (
        <div className="mt-3 pl-3 border-l-2 border-teal-200 dark:border-teal-800 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Références ({active.length})</p>
                {!creating && (
                    <button onClick={() => setCreating(true)} className="flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline">
                        <BookPlus className="w-3.5 h-3.5" /> Ajouter une référence
                    </button>
                )}
            </div>
            {creating && (
                <SignageReferenceForm mode="create" customDefinitionId={definition.id} onSubmit={handleCreate} onCancel={() => setCreating(false)} submitLabel="Créer la référence" />
            )}
            <div className="space-y-1.5">
                {active.map(ref => (
                    <div key={ref.id}>
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{ref.name}</p>
                                <p className="text-xs text-slate-400">{formatDimensions(ref.dimensions)} · {ref.material || '—'}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => setEditingId(editingId === ref.id ? null : ref.id)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Modifier">
                                    <PencilLine className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => archive(ref)} className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" aria-label="Archiver">
                                    <Archive className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        {editingId === ref.id && (
                            <div className="mt-2">
                                <SignageReferenceForm
                                    mode="edit" customDefinitionId={definition.id}
                                    initialFields={referenceToEditableFields(ref)}
                                    onSubmit={fields => handleUpdate(ref.id, fields)}
                                    onCancel={() => setEditingId(null)}
                                    submitLabel="Enregistrer"
                                />
                            </div>
                        )}
                    </div>
                ))}
                {active.length === 0 && !creating && <p className="text-xs text-slate-400 italic">Aucune référence pour l'instant.</p>}
            </div>
            {archived.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase text-slate-400">Archivées ({archived.length})</p>
                    {archived.map(ref => (
                        <div key={ref.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-500 truncate">{ref.name}</p>
                            <button onClick={() => restore(ref)} className="flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline flex-shrink-0">
                                <ArchiveRestore className="w-3.5 h-3.5" /> Restaurer
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const DefinitionCard: React.FC<{ definition: AuditDefinition }> = ({ definition }) => {
    const lieux = useAuditStore(s => s.lieux);
    const applyToNetwork = useAuditStore(s => s.applyAuditDefinitionToNetwork);
    const { update, archive, restore, deleteForever } = useAdminAuditDefinitions();
    const [editing, setEditing] = useState(false);
    const [showRefs, setShowRefs] = useState(false);
    const [toDelete, setToDelete] = useState(false);
    const [applying, setApplying] = useState(false);

    const targetCount = useMemo(() => computeTargetLieuIds(definition, lieux).length, [definition, lieux]);
    const deployedCount = useMemo(() => computeDeployedCount(definition, lieux), [definition, lieux]);
    const Icon = resolveCustomAuditIcon(definition.icon);
    const isArchived = !!definition.archivedAt;

    const handleUpdate = async (fields: AuditDefinitionEditableFields) => {
        await update(definition, fields);
        toast.success(`« ${fields.name} » modifié`);
        setEditing(false);
    };

    const handleArchiveToggle = async () => {
        try {
            if (isArchived) { await restore(definition); toast.success(`« ${definition.name} » restauré`); }
            else { await archive(definition); toast.success(`« ${definition.name} » archivé`); }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Échec — réessayez.');
        }
    };

    const handleDeleteForever = async () => {
        try {
            await deleteForever(definition);
            toast.success(`« ${definition.name} » supprimé définitivement`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Échec de la suppression — réessayez.');
        } finally {
            setToDelete(false);
        }
    };

    const handleApply = async () => {
        setApplying(true);
        try {
            const { created, unresolved } = await applyToNetwork(definition);
            if (created === 0 && unresolved === 0) toast.success('Déjà à jour — aucune station manquante.');
            else toast.success(`${created} module(s) créé(s)${unresolved > 0 ? ` — ${unresolved} station(s) ignorée(s)` : ''}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Échec de l'application au réseau — réessayez.");
        } finally {
            setApplying(false);
        }
    };

    if (editing) {
        return (
            <DefinitionForm
                initial={{ name: definition.name, icon: definition.icon, targetLines: definition.targetLines, excludedLieuIds: definition.excludedLieuIds, includedLieuIds: definition.includedLieuIds }}
                onSubmit={handleUpdate}
                onCancel={() => setEditing(false)}
                submitLabel="Enregistrer"
            />
        );
    }

    return (
        <div className={`p-3 rounded-lg bg-white dark:bg-slate-800 border ${isArchived ? 'border-slate-200 dark:border-slate-700 opacity-70' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex-shrink-0">
                        <Icon className="w-5 h-5 text-teal-700 dark:text-teal-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {definition.name} {isArchived && <span className="text-xs font-normal text-slate-400">(archivé)</span>}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {definition.targetLines.map(line => <StandaloneLineBadge key={line} line={line} />)}
                            {definition.targetLines.length === 0 && <span className="text-xs text-slate-400 italic">Aucune ligne ciblée</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {targetCount} station{targetCount !== 1 ? 's' : ''} ciblée{targetCount !== 1 ? 's' : ''} · {deployedCount} module{deployedCount !== 1 ? 's' : ''} déployé{deployedCount !== 1 ? 's' : ''}
                            {definition.excludedLieuIds.length > 0 && ` · ${definition.excludedLieuIds.length} exclue(s)`}
                            {definition.includedLieuIds.length > 0 && ` · ${definition.includedLieuIds.length} ajoutée(s)`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                    {!isArchived && (
                        <button onClick={handleApply} disabled={applying} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                            <Share2 className="w-4 h-4" /> Appliquer au réseau
                        </button>
                    )}
                    <button onClick={() => setShowRefs(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
                        <LayoutList className="w-4 h-4" /> Références
                    </button>
                    <button onClick={() => setEditing(true)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Modifier">
                        <PencilLine className="w-4 h-4" />
                    </button>
                    <button onClick={handleArchiveToggle} className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" aria-label={isArchived ? 'Restaurer' : 'Archiver'}>
                        {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                    {isArchived && (
                        <button onClick={() => setToDelete(true)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Supprimer définitivement">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            {showRefs && <DefinitionReferencesPanel definition={definition} />}
            <ConfirmationModal
                isOpen={toDelete}
                onClose={() => setToDelete(false)}
                onConfirm={handleDeleteForever}
                title="Supprimer définitivement"
                message={`« ${definition.name} » sera supprimé irréversiblement. Impossible si une station porte encore un module de cet audit.`}
                isDestructive
            />
        </div>
    );
};

const CustomAuditsPanel: React.FC = () => {
    const { definitions, reload } = useAuditDefinitions();
    const { create } = useAdminAuditDefinitions();
    const [creating, setCreating] = useState(false);

    const active = useMemo(() => definitions.filter(d => !d.archivedAt), [definitions]);
    const archived = useMemo(() => definitions.filter(d => d.archivedAt), [definitions]);

    const handleCreate = async (fields: AuditDefinitionEditableFields) => {
        await create(fields);
        toast.success(`« ${fields.name} » créé`);
        setCreating(false);
        reload();
    };

    return (
        <div className="space-y-4">
            {!creating ? (
                <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">
                    <Sparkles className="w-4 h-4" /> Créer un audit
                </button>
            ) : (
                <DefinitionForm onSubmit={handleCreate} onCancel={() => setCreating(false)} submitLabel="Créer" />
            )}

            <div className="space-y-2">
                {active.map(def => <DefinitionCard key={def.id} definition={def} />)}
                {active.length === 0 && !creating && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Aucun audit créé pour l'instant.</p>
                    </div>
                )}
            </div>

            {archived.length > 0 && (
                <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold uppercase text-slate-400">Archivés ({archived.length})</p>
                    {archived.map(def => <DefinitionCard key={def.id} definition={def} />)}
                </div>
            )}
        </div>
    );
};

/* ---------------- Conteneur ---------------- */

type AdminTabKey = 'create' | 'archives' | 'stations' | 'stationArchives' | 'customAudits';

const ADMIN_TABS: { key: AdminTabKey; label: string; Icon: LucideIcon }[] = [
    { key: 'stations', label: 'Stations', Icon: Building },
    { key: 'customAudits', label: 'Créer un audit', Icon: Sparkles },
    { key: 'create', label: 'Créer une référence', Icon: BookPlus },
    { key: 'archives', label: 'Références archivées', Icon: Archive },
    { key: 'stationArchives', label: 'Stations archivées', Icon: Archive },
];

const AdminView: React.FC = () => {
    const isAdminUnlocked = useAuditStore(s => s.isAdminUnlocked);
    const [tab, setTab] = useState<AdminTabKey>('stations');

    if (!isAdminUnlocked) {
        return <AdminGate />;
    }

    return (
        <div className="space-y-5">
            <div className="flex gap-2 flex-wrap">
                {ADMIN_TABS.map(({ key, label, Icon }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            tab === key
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'stations' && <StationsPanel />}
            {tab === 'customAudits' && <CustomAuditsPanel />}
            {tab === 'create' && <CreatePanel />}
            {tab === 'archives' && <ArchivesPanel />}
            {tab === 'stationArchives' && <StationArchivesPanel />}
        </div>
    );
};

export default AdminView;
