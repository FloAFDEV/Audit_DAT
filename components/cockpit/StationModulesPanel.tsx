// components/cockpit/StationModulesPanel.tsx
// =================================================================
// ADMIN — attacher un module à une station, gérer les zones/bornes P+R
// (Lot 2c), et corriger le périmètre adhesiveIds d'une borne existante
// (Lot 2d). DAT/ECA gardent leurs mécanismes terrain existants (Ajouter
// un DAT / Ajouter un ECA, déjà non gated Admin) — ce panneau ne
// duplique pas ce qui fonctionne déjà, il ne comble que ce qui manquait
// réellement (attacher un module, CRUD zones/bornes P+R, périmètre
// adhesiveIds d'une borne).
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, PencilLine, ListFilter, RotateCcw, Link2Off } from 'lucide-react';
import toast from 'react-hot-toast';
import { Lieu, AuditModule, AuditModuleType, Pr, PrZone, Equipment, EquipmentType, CustomAuditData } from '../../types';
import useAuditStore from '../../store';
import {
    AttachableModuleType, ModuleLine, ATTACHABLE_MODULE_LINES, isModuleTypeAttachable, isCustomAuditAttachable,
} from '../../utils/cockpit/moduleAdmin';
import { useAuditDefinitions } from '../../hooks/useAuditDefinitions';
import { getEffectiveEquipmentAdhesives } from '../../utils/effectiveAdhesives';
import ConfirmationModal from '../ConfirmationModal';
import { LineIcon } from '../LineIcon';
import { ModuleIcon } from '../ModuleIcon';

const LINE_LABEL: Record<ModuleLine, string> = {
    A: 'Ligne A', B: 'Ligne B', C: 'Ligne C', TRAM: 'Tram', TELEO: 'Téléo', AEROPORT: 'Aéroport Express',
};

const MODULE_TYPE_LABEL: Record<AttachableModuleType, string> = {
    DAT: 'DAT', ECA: 'ECA (valideurs)', PR: 'P+R (bornes)',
    PMR_FLOOR_ADHESIVE: 'PMR au sol', COGNITIVE_PICTOGRAMS: 'Pictogrammes cognitifs', SIGNALETIQUE: 'Signalétique (Équipements Station)',
    // Non proposé par ce formulaire générique (cf. ALL_ATTACHABLE_TYPES
    // ci-dessous) : un audit configurable se choisit par définition, pas
    // seulement par type — écran dédié dans Admin (onglet Audits
    // configurables). Valeur présente uniquement pour rester exhaustif.
    CUSTOM: 'Audit configurable',
};

const ATTACHABLE_TYPE_TO_AUDIT_TYPE: Record<AttachableModuleType, AuditModuleType> = {
    DAT: AuditModuleType.DAT, ECA: AuditModuleType.ECA, PR: AuditModuleType.PR,
    PMR_FLOOR_ADHESIVE: AuditModuleType.PMR_FLOOR_ADHESIVE, COGNITIVE_PICTOGRAMS: AuditModuleType.COGNITIVE_PICTOGRAMS,
    SIGNALETIQUE: AuditModuleType.SIGNALETIQUE, CUSTOM: AuditModuleType.CUSTOM,
};

/** Un point d'accès nommable a du sens uniquement pour les types qui
 *  peuvent légitimement exister plusieurs fois sur une même station. */
const SUPPORTS_ACCESS_POINT_LABEL: ReadonlySet<AttachableModuleType> = new Set(['ECA', 'PMR_FLOOR_ADHESIVE']);

const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
    [EquipmentType.BE]: 'Borne Entrée (BE)',
    [EquipmentType.BS]: 'Borne Sortie (BS)',
    [EquipmentType.CA]: 'Caisse Auto (CA)',
};

const fieldClass = "rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-1.5 px-2 text-sm text-slate-900 dark:text-slate-50";

/* ---------------- Ajout de module ---------------- */

const ALL_ATTACHABLE_TYPES: AttachableModuleType[] = ['DAT', 'ECA', 'PR', 'PMR_FLOOR_ADHESIVE', 'COGNITIVE_PICTOGRAMS', 'SIGNALETIQUE'];

const AddModuleForm: React.FC<{ lieu: Lieu }> = ({ lieu }) => {
    const attachModuleAdmin = useAuditStore(s => s.attachModuleAdmin);
    const { definitions } = useAuditDefinitions();

    // Filtrage réel (données de la station), pas une liste figée dans l'UI :
    // un type unique déjà présent sur cette station n'est plus proposé.
    const availableTypes = useMemo(
        () => ALL_ATTACHABLE_TYPES.filter(t => isModuleTypeAttachable(lieu.modules, ATTACHABLE_TYPE_TO_AUDIT_TYPE[t])),
        [lieu.modules]
    );
    // Audits configurables (Partie 2) : une définition active pas encore
    // présente sur CETTE station — jamais un module déjà présent proposé
    // à nouveau (même règle que pour DAT/Signalétique...).
    const availableDefinitions = useMemo(
        () => definitions.filter(d => !d.archivedAt && isCustomAuditAttachable(lieu.modules, d.id)),
        [definitions, lieu.modules]
    );
    const allTypes = useMemo(
        () => (availableDefinitions.length > 0 ? [...availableTypes, 'CUSTOM' as AttachableModuleType] : availableTypes),
        [availableTypes, availableDefinitions]
    );

    const [moduleType, setModuleType] = useState<AttachableModuleType>(allTypes[0] ?? 'ECA');
    const lineOptions = ATTACHABLE_MODULE_LINES[moduleType];
    const [line, setLine] = useState<ModuleLine>(lineOptions[0] ?? 'A');
    const [accessPointLabel, setAccessPointLabel] = useState('');
    const [definitionId, setDefinitionId] = useState(availableDefinitions[0]?.id ?? '');
    const [isOpen, setIsOpen] = useState(false);
    const needsLine = lineOptions.length > 0;

    // Les définitions se chargent de façon asynchrone (useAuditDefinitions,
    // lecture Dexie) : à l'ouverture du formulaire, la liste peut encore
    // être vide au premier rendu. Sans cette synchronisation, definitionId
    // resterait figé à '' même une fois les définitions chargées — le
    // <select> afficherait visuellement la première option (comportement
    // par défaut du navigateur pour une value non trouvée) sans que l'état
    // réel corresponde, et la soumission refuserait à tort « Choisissez un
    // audit configurable. ».
    useEffect(() => {
        if (!availableDefinitions.some(d => d.id === definitionId)) {
            setDefinitionId(availableDefinitions[0]?.id ?? '');
        }
    }, [availableDefinitions, definitionId]);

    const handleTypeChange = (t: AttachableModuleType) => {
        setModuleType(t);
        const nextLines = ATTACHABLE_MODULE_LINES[t];
        if (nextLines.length > 0 && !nextLines.includes(line)) setLine(nextLines[0]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (moduleType === 'CUSTOM') {
                const def = availableDefinitions.find(d => d.id === definitionId);
                if (!def) { toast.error('Choisissez un audit configurable.'); return; }
                await attachModuleAdmin(lieu.id, 'CUSTOM', line, undefined, { definitionId: def.id, definitionName: def.name });
            } else {
                await attachModuleAdmin(lieu.id, moduleType, needsLine ? line : undefined, accessPointLabel || undefined);
            }
            toast.success('Module ajouté');
            setAccessPointLabel('');
            setIsOpen(false);
        } catch (error) {
            console.error("Échec de l'ajout du module :", error);
            toast.error(error instanceof Error ? error.message : "Échec de l'ajout du module — réessayez.");
        }
    };

    if (allTypes.length === 0 && !isOpen) {
        return <p className="text-xs text-slate-400 italic">Tous les modules uniques disponibles sont déjà présents sur cette station.</p>;
    }

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300">
                <Plus className="w-4 h-4" /> Ajouter un module
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
            <div>
                <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Type</label>
                <select value={moduleType} onChange={e => handleTypeChange(e.target.value as AttachableModuleType)} className={fieldClass}>
                    {allTypes.map(t => <option key={t} value={t}>{MODULE_TYPE_LABEL[t]}</option>)}
                </select>
            </div>
            {moduleType === 'CUSTOM' && (
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Audit configurable</label>
                    <select value={definitionId} onChange={e => setDefinitionId(e.target.value)} className={fieldClass}>
                        {availableDefinitions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            )}
            {needsLine && (
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Ligne</label>
                    <select value={line} onChange={e => setLine(e.target.value as ModuleLine)} className={fieldClass}>
                        {lineOptions.map(l => <option key={l} value={l}>{LINE_LABEL[l]}</option>)}
                    </select>
                </div>
            )}
            {SUPPORTS_ACCESS_POINT_LABEL.has(moduleType) && (
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Point d'accès (si plusieurs)</label>
                    <input
                        value={accessPointLabel}
                        onChange={e => setAccessPointLabel(e.target.value)}
                        placeholder="ex. Accès Nord"
                        className={fieldClass}
                    />
                </div>
            )}
            <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">Ajouter</button>
            <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">Annuler</button>
        </form>
    );
};

/* ---------------- Périmètre adhesiveIds d'une borne (Lot 2d) ---------------- */

const EquipmentScopeEditor: React.FC<{
    lieuId: string; moduleId: string; zoneId: string; equipment: Equipment; onClose: () => void;
}> = ({ lieuId, moduleId, zoneId, equipment, onClose }) => {
    const signageReferences = useAuditStore(s => s.signageReferences);
    const setPrEquipmentScopeAdmin = useAuditStore(s => s.setPrEquipmentScopeAdmin);
    // Périmètre STANDARD (sans surcharge) du type de borne — les candidats
    // proposés à la coche. Une référence déjà sélectionnée mais absente de
    // cette liste (ex. archivée depuis) reste dans `selected` et sera
    // réenregistrée telle quelle : aucune perte silencieuse de sélection.
    const standard = useMemo(() => getEffectiveEquipmentAdhesives(signageReferences, equipment.type), [signageReferences, equipment.type]);
    const [selected, setSelected] = useState<Set<string>>(() => new Set(equipment.adhesiveIds ?? standard.map(a => a.id)));
    const [isSaving, setIsSaving] = useState(false);

    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await setPrEquipmentScopeAdmin(lieuId, moduleId, zoneId, equipment.id, Array.from(selected));
            toast.success('Périmètre enregistré');
            onClose();
        } catch (error) {
            console.error("Échec de l'enregistrement du périmètre :", error);
            toast.error("Échec de l'enregistrement — réessayez.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetToStandard = async () => {
        setIsSaving(true);
        try {
            await setPrEquipmentScopeAdmin(lieuId, moduleId, zoneId, equipment.id, undefined);
            toast.success('Périmètre standard restauré');
            onClose();
        } catch (error) {
            console.error('Échec de la restauration du périmètre standard :', error);
            toast.error('Échec de la restauration — réessayez.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Références applicables à cette borne — décochez celles qui ne s'appliquent pas ici, sans modifier le catalogue global.
            </p>
            <div className="space-y-1.5 max-h-64 overflow-auto">
                {standard.map(a => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} className="rounded border-slate-300" />
                        {a.name}
                    </label>
                ))}
                {standard.length === 0 && <p className="text-sm text-slate-400 italic">Aucune référence dans le périmètre standard de ce type.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
                <button onClick={handleSave} disabled={isSaving} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
                    Enregistrer
                </button>
                {equipment.adhesiveIds && (
                    <button onClick={handleResetToStandard} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
                        <RotateCcw className="w-3.5 h-3.5" /> Revenir au périmètre standard
                    </button>
                )}
                <button onClick={onClose} disabled={isSaving} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                    Fermer
                </button>
            </div>
        </div>
    );
};

/* ---------------- Borne (ligne) ---------------- */

const EquipmentRow: React.FC<{ lieuId: string; moduleId: string; zoneId: string; equipment: Equipment }> = ({ lieuId, moduleId, zoneId, equipment }) => {
    const renamePrEquipmentAdmin = useAuditStore(s => s.renamePrEquipmentAdmin);
    const removePrEquipmentAdmin = useAuditStore(s => s.removePrEquipmentAdmin);
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(equipment.name);
    const [isScopeOpen, setIsScopeOpen] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await renamePrEquipmentAdmin(lieuId, moduleId, zoneId, equipment.id, name);
            setIsRenaming(false);
        } catch (error) {
            console.error('Échec du renommage :', error);
            toast.error('Échec du renommage — réessayez.');
        }
    };

    const handleRemove = async () => {
        try {
            await removePrEquipmentAdmin(lieuId, moduleId, zoneId, equipment.id);
            toast.success('Borne supprimée');
        } catch (error) {
            console.error('Échec de la suppression :', error);
            toast.error('Échec de la suppression — réessayez.');
        } finally {
            setConfirmRemove(false);
        }
    };

    return (
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                {isRenaming ? (
                    <form onSubmit={handleRename} className="flex items-center gap-2 flex-1 min-w-[180px]">
                        <input value={name} onChange={e => setName(e.target.value)} className={`flex-1 ${fieldClass}`} autoFocus />
                        <button type="submit" className="text-xs font-semibold text-teal-600">OK</button>
                        <button type="button" onClick={() => { setIsRenaming(false); setName(equipment.name); }} className="text-xs text-slate-400">Annuler</button>
                    </form>
                ) : (
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {equipment.name} <span className="text-xs text-slate-400 font-normal">({equipment.type})</span>
                    </span>
                )}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsScopeOpen(v => !v)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${equipment.adhesiveIds ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
                    >
                        <ListFilter className="w-3.5 h-3.5" />
                        {equipment.adhesiveIds ? `Périmètre (${equipment.adhesiveIds.length} personnalisé${equipment.adhesiveIds.length > 1 ? 's' : ''})` : 'Périmètre standard'}
                    </button>
                    <button onClick={() => setIsRenaming(true)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Renommer la borne">
                        <PencilLine className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmRemove(true)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Supprimer la borne">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {isScopeOpen && (
                <EquipmentScopeEditor lieuId={lieuId} moduleId={moduleId} zoneId={zoneId} equipment={equipment} onClose={() => setIsScopeOpen(false)} />
            )}
            <ConfirmationModal
                isOpen={confirmRemove}
                onClose={() => setConfirmRemove(false)}
                onConfirm={handleRemove}
                title="Supprimer la borne"
                message={`Êtes-vous sûr de vouloir supprimer « ${equipment.name} » ? Les données d'audit associées seront perdues.`}
                isDestructive
            />
        </div>
    );
};

/* ---------------- Ajout de borne ---------------- */

const AddEquipmentForm: React.FC<{ lieuId: string; moduleId: string; zoneId: string }> = ({ lieuId, moduleId, zoneId }) => {
    const createPrEquipmentAdmin = useAuditStore(s => s.createPrEquipmentAdmin);
    const [name, setName] = useState('');
    const [type, setType] = useState<EquipmentType>(EquipmentType.BE);
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPrEquipmentAdmin(lieuId, moduleId, zoneId, name, type);
            setName('');
            setIsOpen(false);
        } catch (error) {
            console.error("Échec de l'ajout de la borne :", error);
            toast.error("Échec de l'ajout — réessayez.");
        }
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline">
                <Plus className="w-3.5 h-3.5" /> Ajouter une borne
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la borne" className={fieldClass} autoFocus />
            <select value={type} onChange={e => setType(e.target.value as EquipmentType)} className={fieldClass}>
                {Object.values(EquipmentType).map(t => <option key={t} value={t}>{EQUIPMENT_TYPE_LABEL[t]}</option>)}
            </select>
            <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">Ajouter</button>
            <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500">Annuler</button>
        </form>
    );
};

/* ---------------- Zone P+R ---------------- */

const ZoneBlock: React.FC<{ lieuId: string; moduleId: string; zone: PrZone }> = ({ lieuId, moduleId, zone }) => {
    const renamePrZoneAdmin = useAuditStore(s => s.renamePrZoneAdmin);
    const removePrZoneAdmin = useAuditStore(s => s.removePrZoneAdmin);
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(zone.name);
    const [confirmRemove, setConfirmRemove] = useState(false);

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await renamePrZoneAdmin(lieuId, moduleId, zone.id, name);
            setIsRenaming(false);
        } catch (error) {
            console.error('Échec du renommage :', error);
            toast.error('Échec du renommage — réessayez.');
        }
    };

    const handleRemove = async () => {
        try {
            await removePrZoneAdmin(lieuId, moduleId, zone.id);
            toast.success('Zone supprimée');
        } catch (error) {
            console.error('Échec de la suppression :', error);
            toast.error('Échec de la suppression — réessayez.');
        } finally {
            setConfirmRemove(false);
        }
    };

    return (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                {isRenaming ? (
                    <form onSubmit={handleRename} className="flex items-center gap-2 flex-1 min-w-[180px]">
                        <input value={name} onChange={e => setName(e.target.value)} className={`flex-1 ${fieldClass}`} autoFocus />
                        <button type="submit" className="text-xs font-semibold text-teal-600">OK</button>
                        <button type="button" onClick={() => { setIsRenaming(false); setName(zone.name); }} className="text-xs text-slate-400">Annuler</button>
                    </form>
                ) : (
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{zone.name}</h4>
                )}
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsRenaming(true)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Renommer la zone">
                        <PencilLine className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmRemove(true)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="Supprimer la zone">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="space-y-1.5 pl-1">
                {zone.equipments.map(eq => (
                    <EquipmentRow key={eq.id} lieuId={lieuId} moduleId={moduleId} zoneId={zone.id} equipment={eq} />
                ))}
                {zone.equipments.length === 0 && <p className="text-xs text-slate-400 italic">Aucune borne dans cette zone.</p>}
            </div>
            <AddEquipmentForm lieuId={lieuId} moduleId={moduleId} zoneId={zone.id} />
            <ConfirmationModal
                isOpen={confirmRemove}
                onClose={() => setConfirmRemove(false)}
                onConfirm={handleRemove}
                title="Supprimer la zone"
                message={
                    zone.equipments.length > 0
                        ? `« ${zone.name} » contient ${zone.equipments.length} borne(s). Les supprimer avec la zone est irréversible. Continuer ?`
                        : `Êtes-vous sûr de vouloir supprimer la zone « ${zone.name} » ?`
                }
                isDestructive
            />
        </div>
    );
};

const AddZoneForm: React.FC<{ lieuId: string; moduleId: string }> = ({ lieuId, moduleId }) => {
    const createPrZoneAdmin = useAuditStore(s => s.createPrZoneAdmin);
    const [name, setName] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPrZoneAdmin(lieuId, moduleId, name);
            setName('');
            setIsOpen(false);
        } catch (error) {
            console.error("Échec de l'ajout de la zone :", error);
            toast.error("Échec de l'ajout — réessayez.");
        }
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300">
                <Plus className="w-4 h-4" /> Ajouter une zone
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la zone" className={fieldClass} autoFocus />
            <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">Ajouter</button>
            <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500">Annuler</button>
        </form>
    );
};

const PrZonesEditor: React.FC<{ lieuId: string; module: AuditModule }> = ({ lieuId, module }) => {
    const prData = module.data as Pr;
    return (
        <div className="space-y-2 pl-4 border-l-2 border-teal-100 dark:border-teal-900/40">
            {prData.zones.map(zone => (
                <ZoneBlock key={zone.id} lieuId={lieuId} moduleId={module.id} zone={zone} />
            ))}
            <AddZoneForm lieuId={lieuId} moduleId={module.id} />
        </div>
    );
};

/* ---------------- Conteneur ---------------- */

interface StationModulesPanelProps {
    lieu: Lieu;
}

/** Détachement générique (Partie 2) — visible pour tout module, refuse
 *  côté store si le module n'est pas strictement vide (message explicite
 *  remonté tel quel, jamais de suppression forcée). */
const DetachModuleButton: React.FC<{ lieuId: string; module: AuditModule }> = ({ lieuId, module }) => {
    const detachModuleAdmin = useAuditStore(s => s.detachModuleAdmin);
    const handleDetach = async () => {
        try {
            await detachModuleAdmin(lieuId, module.id);
            toast.success('Module détaché');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Échec du détachement — réessayez.');
        }
    };
    return (
        <button onClick={handleDetach} className="p-1 rounded text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0" aria-label="Détacher (uniquement si vide)" title="Détacher — uniquement si aucune donnée d'audit n'a été saisie">
            <Link2Off className="w-3.5 h-3.5" />
        </button>
    );
};

const StationModulesPanel: React.FC<StationModulesPanelProps> = ({ lieu }) => {
    const { definitions } = useAuditDefinitions();

    return (
        <div className="space-y-3 mt-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {lieu.modules.length === 0 && <p className="text-sm text-slate-400 italic">Aucun module — ajoutez-en un pour commencer.</p>}
            {lieu.modules.map(module => {
                const customIconKey = module.type === AuditModuleType.CUSTOM
                    ? definitions.find(d => d.id === (module.data as CustomAuditData).definitionId)?.icon
                    : undefined;
                return (
                    <div key={module.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                            <LineIcon module={module} size="sm" />
                            <ModuleIcon type={module.type} className="w-5 h-5 text-gray-500 dark:text-slate-400 flex-shrink-0" customAuditIconKey={customIconKey} />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">
                                {module.name}
                            </p>
                            <DetachModuleButton lieuId={lieu.id} module={module} />
                        </div>
                        {module.type === AuditModuleType.PR && <PrZonesEditor lieuId={lieu.id} module={module} />}
                        {module.type === AuditModuleType.CUSTOM && (() => {
                            const data = module.data as CustomAuditData;
                            const count = (data.occurrences ?? []).length;
                            const label = count > 0
                                ? `${count} objet${count > 1 ? 's' : ''} recensé${count > 1 ? 's' : ''}`
                                : data.lastCheckedAt ? 'vérifié, aucun objet trouvé' : 'pas encore vérifié';
                            return <p className="text-xs text-slate-400 italic pl-4">Audit configurable — {label}.</p>;
                        })()}
                        {module.type !== AuditModuleType.PR && module.type !== AuditModuleType.CUSTOM && (
                            <p className="text-xs text-slate-400 italic pl-4">Gestion via les écrans terrain existants (Ajouter un DAT / un ECA / un point d'accès...).</p>
                        )}
                    </div>
                );
            })}
            <AddModuleForm lieu={lieu} />
        </div>
    );
};

export default StationModulesPanel;
