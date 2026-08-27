// components/cockpit/AdminView.tsx
// =================================================================
// Section « Admin » du cockpit (Lot 2a/2b/2c) — préparer le référentiel
// et les stations avant le terrain, sans jamais toucher au code.
// Verrouillée par AdminGate (code local, non persisté). Registre
// d'onglets, même patron que StatsPage/ReferentielView — une capacité de
// plus = une entrée de registre, jamais une restructuration.
// =================================================================
import React, { useMemo, useState } from 'react';
import { BookPlus, Archive, Building, ArchiveRestore, Trash2, PencilLine, LucideIcon, Search, LayoutList } from 'lucide-react';
import toast from 'react-hot-toast';
import { Lieu } from '../../types';
import { LieuBadges } from '../Icons';
import useAuditStore from '../../store';
import { useAdminReferences } from '../../hooks/useAdminReferences';
import { referenceToEditableFields } from '../../utils/cockpit/signageReferenceEditor';
import SignageReferenceForm from './SignageReferenceForm';
import StationModulesPanel from './StationModulesPanel';
import AdminGate from './AdminGate';
import ConfirmationModal from '../ConfirmationModal';
import { AUDIT_TYPE_LABELS, SUPPORT_LABELS } from './labels';

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

/* ---------------- Conteneur ---------------- */

type AdminTabKey = 'create' | 'archives' | 'stations' | 'stationArchives';

const ADMIN_TABS: { key: AdminTabKey; label: string; Icon: LucideIcon }[] = [
    { key: 'stations', label: 'Stations', Icon: Building },
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
            {tab === 'create' && <CreatePanel />}
            {tab === 'archives' && <ArchivesPanel />}
            {tab === 'stationArchives' && <StationArchivesPanel />}
        </div>
    );
};

export default AdminView;
