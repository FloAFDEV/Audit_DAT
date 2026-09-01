// components/cockpit/StationModulesPanel.tsx
// =================================================================
// ADMIN — attacher un module à une station, gérer les zones/bornes P+R
// (Lot 2c), corriger le périmètre adhesiveIds d'une borne existante
// (Lot 2d), et gérer le PARC DE RÉFÉRENCE des DAT/ECA d'une station
// (Lot 3 — distinct des constats terrain). Un DAT/ECA sans `origin` ou
// avec origin: 'reference' est un équipement structurel connu de
// Tisséo, géré ici (créer/modifier/renommer/retirer, persistance Dexie
// via addDatAdmin/updateDatAdmin/archiveDatAdmin/... — store.ts). Un
// DAT/ECA avec origin: 'terrain' est un CONSTAT ajouté depuis les
// écrans terrain existants (Ajouter un DAT / Ajouter un ECA, mécanisme
// inchangé) — affiché ici en lecture seule, jamais modifiable depuis
// l'Admin : les deux univers partagent le même tableau de données
// (aucun objet dupliqué), distingués par ce seul champ.
// =================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, PencilLine, ListFilter, RotateCcw, Link2Off, Archive, ArchiveRestore } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    Lieu, AuditModule, AuditModuleType, Pr, PrZone, Equipment, EquipmentType, CustomAuditData,
    DAT, ECA, EcaData, EcaEquipmentType, ModeData, Direction,
} from '../../types';
import useAuditStore from '../../store';
import {
    AttachableModuleType, ModuleLine, ATTACHABLE_MODULE_LINES, isModuleTypeAttachable, isCustomAuditAttachable,
} from '../../utils/cockpit/moduleAdmin';
import { useAuditDefinitions } from '../../hooks/useAuditDefinitions';
import { getEffectiveEquipmentAdhesives } from '../../utils/effectiveAdhesives';
import ConfirmationModal from '../ConfirmationModal';
import { LineIcon } from '../LineIcon';
import { ModuleIcon } from '../ModuleIcon';
import { getEcaTypeLabel } from '../EcaUiHelpers';
import { EDITABLE_ECA_TYPES } from '../EcaEditModal';

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

/* ---------------- DAT — parc de référence (Lot 3) ---------------- */

/** Une ligne DAT. Un item origin: 'terrain' (constat, ajouté depuis les
 *  écrans terrain) s'affiche en lecture seule ici — l'Admin ne gère que le
 *  parc de référence (origin absent ou 'reference'), jamais les constats. */
const DatRow: React.FC<{ lieuId: string; moduleId: string; directionId: string; dat: DAT }> = ({ lieuId, moduleId, directionId, dat }) => {
    const updateDatAdmin = useAuditStore(s => s.updateDatAdmin);
    const archiveDatAdmin = useAuditStore(s => s.archiveDatAdmin);
    const restoreDatAdmin = useAuditStore(s => s.restoreDatAdmin);
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(dat.name);
    const [confirmArchive, setConfirmArchive] = useState(false);
    const isArchived = !!dat.archivedAt;
    const isReference = dat.origin !== 'terrain';

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateDatAdmin(lieuId, moduleId, directionId, dat.id, { name });
            setIsRenaming(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Échec du renommage — réessayez.');
        }
    };

    const handleArchiveToggle = async () => {
        try {
            if (isArchived) {
                await restoreDatAdmin(lieuId, moduleId, directionId, dat.id);
                toast.success('DAT restauré au parc de référence');
            } else {
                await archiveDatAdmin(lieuId, moduleId, directionId, dat.id);
                toast.success('DAT retiré du parc de référence');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Échec — réessayez.');
        } finally {
            setConfirmArchive(false);
        }
    };

    if (!isReference) {
        return (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                <span className="text-sm text-slate-700 dark:text-slate-200">{dat.name}</span>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex-shrink-0">Constat terrain</span>
            </div>
        );
    }

    return (
        <div className={`p-2 rounded-lg border ${isArchived ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 opacity-70' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
                {isRenaming ? (
                    <form onSubmit={handleRename} className="flex items-center gap-2 flex-1 min-w-[160px]">
                        <input value={name} onChange={e => setName(e.target.value)} className={`flex-1 ${fieldClass}`} autoFocus />
                        <button type="submit" className="text-xs font-semibold text-teal-600">OK</button>
                        <button type="button" onClick={() => { setIsRenaming(false); setName(dat.name); }} className="text-xs text-slate-400">Annuler</button>
                    </form>
                ) : (
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {dat.name} {isArchived && <span className="text-xs font-normal text-slate-400">(archivé)</span>}
                    </span>
                )}
                {!isRenaming && (
                    <div className="flex items-center gap-1">
                        {!isArchived && (
                            <button onClick={() => setIsRenaming(true)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Renommer le DAT">
                                <PencilLine className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={isArchived ? handleArchiveToggle : () => setConfirmArchive(true)}
                            className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            aria-label={isArchived ? 'Restaurer le DAT' : 'Retirer du parc de référence'}
                        >
                            {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                    </div>
                )}
            </div>
            <ConfirmationModal
                isOpen={confirmArchive}
                onClose={() => setConfirmArchive(false)}
                onConfirm={handleArchiveToggle}
                title="Retirer du parc de référence"
                message={`« ${dat.name} » sera retiré du parc de référence. Il disparaît des écrans terrain (sélection, progression, exports) mais reste consultable et restaurable depuis l'Admin.`}
                isDestructive
            />
        </div>
    );
};

const AddDatForm: React.FC<{ lieuId: string; moduleId: string; directionId: string }> = ({ lieuId, moduleId, directionId }) => {
    const addDatAdmin = useAuditStore(s => s.addDatAdmin);
    const [name, setName] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDatAdmin(lieuId, moduleId, directionId, name);
            setName('');
            setIsOpen(false);
        } catch (error) {
            console.error("Échec de l'ajout du DAT :", error);
            toast.error("Échec de l'ajout — réessayez.");
        }
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline">
                <Plus className="w-3.5 h-3.5" /> Ajouter un DAT
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du DAT (ex. DAT 01)" className={fieldClass} autoFocus />
            <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">Ajouter</button>
            <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500">Annuler</button>
        </form>
    );
};

const DatDirectionBlock: React.FC<{ lieuId: string; moduleId: string; direction: Direction }> = ({ lieuId, moduleId, direction }) => {
    const activeDats = direction.dats.filter(d => !d.archivedAt);
    const archivedDats = direction.dats.filter(d => d.archivedAt);
    const [showArchived, setShowArchived] = useState(false);

    return (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{direction.name}</h4>
            <div className="space-y-1.5 pl-1">
                {activeDats.map(dat => (
                    <DatRow key={dat.id} lieuId={lieuId} moduleId={moduleId} directionId={direction.id} dat={dat} />
                ))}
                {activeDats.length === 0 && <p className="text-xs text-slate-400 italic">Aucun DAT dans cette direction.</p>}
            </div>
            <AddDatForm lieuId={lieuId} moduleId={moduleId} directionId={direction.id} />
            {archivedDats.length > 0 && (
                <div className="pl-1">
                    <button onClick={() => setShowArchived(v => !v)} className="text-xs font-semibold text-slate-400 hover:underline">
                        {archivedDats.length} DAT archivé{archivedDats.length > 1 ? 's' : ''} {showArchived ? '▲' : '▼'}
                    </button>
                    {showArchived && (
                        <div className="space-y-1.5 mt-1.5">
                            {archivedDats.map(dat => (
                                <DatRow key={dat.id} lieuId={lieuId} moduleId={moduleId} directionId={direction.id} dat={dat} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/** Une direction sans aucun DAT (ex. Ligne C : cf. types.ts::DAT — le seed
 *  historique laisse `directions: []` pour les stations encore isFuture)
 *  n'a aucun CRUD ailleurs : addDatDirectionAdmin comble ce manque, sans
 *  dépendre d'un futur ajustement de data/builder.ts. */
const AddDirectionForm: React.FC<{ lieuId: string; moduleId: string }> = ({ lieuId, moduleId }) => {
    const addDatDirectionAdmin = useAuditStore(s => s.addDatDirectionAdmin);
    const [name, setName] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDatDirectionAdmin(lieuId, moduleId, name);
            setName('');
            setIsOpen(false);
        } catch (error) {
            console.error("Échec de l'ajout de la direction :", error);
            toast.error("Échec de l'ajout — réessayez.");
        }
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300">
                <Plus className="w-4 h-4" /> Ajouter une direction
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la direction (ex. Direction Aéroconstellation)" className={fieldClass} autoFocus />
            <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">Ajouter</button>
            <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500">Annuler</button>
        </form>
    );
};

const DatDirectionsEditor: React.FC<{ lieuId: string; module: AuditModule }> = ({ lieuId, module }) => {
    const data = module.data as ModeData;
    const directions = data.stations[0]?.directions ?? [];
    return (
        <div className="space-y-2 pl-4 border-l-2 border-teal-100 dark:border-teal-900/40">
            {directions.map(direction => (
                <DatDirectionBlock key={direction.id} lieuId={lieuId} moduleId={module.id} direction={direction} />
            ))}
            {directions.length === 0 && <p className="text-xs text-slate-400 italic">Aucune direction pour l'instant.</p>}
            <AddDirectionForm lieuId={lieuId} moduleId={module.id} />
        </div>
    );
};

/* ---------------- ECA — parc de référence (Lot 3) ---------------- */

const EcaRow: React.FC<{ lieuId: string; moduleId: string; eca: ECA }> = ({ lieuId, moduleId, eca }) => {
    const updateEcaAdmin = useAuditStore(s => s.updateEcaAdmin);
    const archiveEcaAdmin = useAuditStore(s => s.archiveEcaAdmin);
    const restoreEcaAdmin = useAuditStore(s => s.restoreEcaAdmin);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(eca.name);
    const [accessPoint, setAccessPoint] = useState(eca.accessPoint);
    const [type, setType] = useState<EcaEquipmentType>(eca.type);
    const [number, setNumber] = useState(eca.number);
    const [confirmArchive, setConfirmArchive] = useState(false);
    const isArchived = !!eca.archivedAt;
    const isReference = eca.origin !== 'terrain';

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateEcaAdmin(lieuId, moduleId, eca.id, { name, accessPoint, type, number });
            setIsEditing(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Échec de la modification — réessayez.');
        }
    };

    const handleArchiveToggle = async () => {
        try {
            if (isArchived) {
                await restoreEcaAdmin(lieuId, moduleId, eca.id);
                toast.success('ECA restauré au parc de référence');
            } else {
                await archiveEcaAdmin(lieuId, moduleId, eca.id);
                toast.success('ECA retiré du parc de référence');
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Échec — réessayez.');
        } finally {
            setConfirmArchive(false);
        }
    };

    if (!isReference) {
        return (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                <span className="text-sm text-slate-700 dark:text-slate-200">{eca.name} <span className="text-xs text-slate-400">({eca.accessPoint})</span></span>
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex-shrink-0">Constat terrain</span>
            </div>
        );
    }

    if (isEditing) {
        return (
            <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom" className={fieldClass} autoFocus />
                <input value={accessPoint} onChange={e => setAccessPoint(e.target.value)} placeholder="Point d'accès" className={fieldClass} />
                <select value={type} onChange={e => setType(e.target.value as EcaEquipmentType)} className={fieldClass}>
                    {EDITABLE_ECA_TYPES.map(t => <option key={t} value={t}>{getEcaTypeLabel(t)}</option>)}
                </select>
                <input type="number" min={1} value={number} onChange={e => setNumber(parseInt(e.target.value, 10) || 1)} className={`${fieldClass} w-20`} />
                <button type="submit" className="text-xs font-semibold text-teal-600">OK</button>
                <button type="button" onClick={() => setIsEditing(false)} className="text-xs text-slate-400">Annuler</button>
            </form>
        );
    }

    return (
        <div className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${isArchived ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 opacity-70' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {eca.name} {isArchived && <span className="text-xs font-normal text-slate-400">(archivé)</span>}
                </p>
                <p className="text-xs text-slate-400">{eca.accessPoint} · {getEcaTypeLabel(eca.type)} · n°{eca.number}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                {!isArchived && (
                    <button onClick={() => setIsEditing(true)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Modifier l'ECA">
                        <PencilLine className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={isArchived ? handleArchiveToggle : () => setConfirmArchive(true)}
                    className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    aria-label={isArchived ? "Restaurer l'ECA" : 'Retirer du parc de référence'}
                >
                    {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>
            </div>
            <ConfirmationModal
                isOpen={confirmArchive}
                onClose={() => setConfirmArchive(false)}
                onConfirm={handleArchiveToggle}
                title="Retirer du parc de référence"
                message={`« ${eca.name} » sera retiré du parc de référence. Il disparaît des écrans terrain (sélection, progression, exports) mais reste consultable et restaurable depuis l'Admin.`}
                isDestructive
            />
        </div>
    );
};

const AddEcaForm: React.FC<{ lieuId: string; moduleId: string }> = ({ lieuId, moduleId }) => {
    const addEcaAdmin = useAuditStore(s => s.addEcaAdmin);
    const [name, setName] = useState('');
    const [accessPoint, setAccessPoint] = useState('Accès Principal');
    const [type, setType] = useState<EcaEquipmentType>(EcaEquipmentType.TripodeEntree);
    const [number, setNumber] = useState(1);
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addEcaAdmin(lieuId, moduleId, { name, accessPoint, type, number });
            setName('');
            setIsOpen(false);
        } catch (error) {
            console.error("Échec de l'ajout de l'ECA :", error);
            toast.error("Échec de l'ajout — réessayez.");
        }
    };

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300">
                <Plus className="w-4 h-4" /> Ajouter un ECA
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom (ex. Tripode E01)" className={fieldClass} autoFocus />
            <input value={accessPoint} onChange={e => setAccessPoint(e.target.value)} placeholder="Point d'accès" className={fieldClass} />
            <select value={type} onChange={e => setType(e.target.value as EcaEquipmentType)} className={fieldClass}>
                {EDITABLE_ECA_TYPES.map(t => <option key={t} value={t}>{getEcaTypeLabel(t)}</option>)}
            </select>
            <input type="number" min={1} value={number} onChange={e => setNumber(parseInt(e.target.value, 10) || 1)} className={`${fieldClass} w-20`} />
            <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">Ajouter</button>
            <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-500">Annuler</button>
        </form>
    );
};

const EcaReferenceEditor: React.FC<{ lieuId: string; module: AuditModule }> = ({ lieuId, module }) => {
    const data = module.data as EcaData;
    const active = data.ecas.filter(e => !e.archivedAt);
    const archived = data.ecas.filter(e => e.archivedAt);
    const [showArchived, setShowArchived] = useState(false);

    return (
        <div className="space-y-2 pl-4 border-l-2 border-teal-100 dark:border-teal-900/40">
            <div className="space-y-1.5">
                {active.map(eca => <EcaRow key={eca.id} lieuId={lieuId} moduleId={module.id} eca={eca} />)}
                {active.length === 0 && <p className="text-xs text-slate-400 italic">Aucun ECA.</p>}
            </div>
            <AddEcaForm lieuId={lieuId} moduleId={module.id} />
            {archived.length > 0 && (
                <div>
                    <button onClick={() => setShowArchived(v => !v)} className="text-xs font-semibold text-slate-400 hover:underline">
                        {archived.length} ECA archivé{archived.length > 1 ? 's' : ''} {showArchived ? '▲' : '▼'}
                    </button>
                    {showArchived && (
                        <div className="space-y-1.5 mt-1.5">
                            {archived.map(eca => <EcaRow key={eca.id} lieuId={lieuId} moduleId={module.id} eca={eca} />)}
                        </div>
                    )}
                </div>
            )}
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
                        {module.type === AuditModuleType.DAT && <DatDirectionsEditor lieuId={lieu.id} module={module} />}
                        {module.type === AuditModuleType.ECA && <EcaReferenceEditor lieuId={lieu.id} module={module} />}
                        {module.type === AuditModuleType.CUSTOM && (() => {
                            const data = module.data as CustomAuditData;
                            const count = (data.occurrences ?? []).length;
                            const label = count > 0
                                ? `${count} objet${count > 1 ? 's' : ''} recensé${count > 1 ? 's' : ''}`
                                : data.lastCheckedAt ? 'vérifié, aucun objet trouvé' : 'pas encore vérifié';
                            return <p className="text-xs text-slate-400 italic pl-4">Audit configurable — {label}.</p>;
                        })()}
                        {module.type !== AuditModuleType.PR && module.type !== AuditModuleType.CUSTOM
                            && module.type !== AuditModuleType.DAT && module.type !== AuditModuleType.ECA && (
                            <p className="text-xs text-slate-400 italic pl-4">Gestion via les écrans terrain existants (Ajouter un point d'accès...).</p>
                        )}
                    </div>
                );
            })}
            <AddModuleForm lieu={lieu} />
        </div>
    );
};

export default StationModulesPanel;
