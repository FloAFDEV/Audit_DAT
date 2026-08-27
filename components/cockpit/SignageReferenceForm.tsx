// components/cockpit/SignageReferenceForm.tsx
// =================================================================
// ADMIN — formulaire partagé création / modification d'une SignageReference
// (Lot 2a). Un seul composant pour les deux modes : la seule différence
// est le libellé du bouton et la présence du champ "motif du changement"
// (n'a de sens qu'en modification).
// =================================================================
import React, { useState } from 'react';
import { EquipmentType, EcaEquipmentType, SignageScope, SignageSupport, SignageDimensions, SignagePlacement } from '../../types';
import { SignageReferenceEditableFields } from '../../utils/cockpit/signageReferenceEditor';
import { SUPPORT_LABELS } from './labels';

export interface SignageReferenceFormProps {
    initialFields?: SignageReferenceEditableFields;
    mode: 'create' | 'edit';
    onSubmit: (fields: SignageReferenceEditableFields, changeReason?: string) => void;
    onCancel: () => void;
    submitLabel: string;
}

type Family = 'DAT' | 'PR' | 'ECA';

const DEFAULT_SCOPE: Record<Family, SignageScope> = {
    DAT: { auditType: 'DAT' },
    PR: { auditType: 'PR' },
    ECA: { auditType: 'ECA' },
};

const SignageReferenceForm: React.FC<SignageReferenceFormProps> = ({ initialFields, mode, onSubmit, onCancel, submitLabel }) => {
    const [name, setName] = useState(initialFields?.name ?? '');
    const [code, setCode] = useState(initialFields?.code ?? '');
    const [family, setFamily] = useState<Family>(
        // Ce formulaire ne gère que DAT/PR/ECA — les références CUSTOM
        // (Partie 2, audits configurables) passent par leur propre écran,
        // rattaché à leur définition (jamais ce formulaire générique).
        (initialFields && initialFields.scope.auditType !== 'CUSTOM') ? initialFields.scope.auditType : 'DAT'
    );
    const [equipmentTypes, setEquipmentTypes] = useState<string[]>(
        (initialFields?.scope.auditType === 'PR' || initialFields?.scope.auditType === 'ECA')
            ? (initialFields.scope.equipmentTypes ?? [])
            : []
    );
    const [support, setSupport] = useState<SignageSupport>(initialFields?.support ?? 'adhesif');
    const [material, setMaterial] = useState(initialFields?.material ?? '');
    const [width, setWidth] = useState(initialFields?.dimensions?.width?.toString() ?? '');
    const [height, setHeight] = useState(initialFields?.dimensions?.height?.toString() ?? '');
    const [unit, setUnit] = useState<'cm' | 'mm'>(initialFields?.dimensions?.unit ?? 'cm');
    const [zone, setZone] = useState(initialFields?.placement.zone ?? '');
    const [position, setPosition] = useState(initialFields?.placement.position ?? '');
    const [alignmentMark, setAlignmentMark] = useState(initialFields?.placement.alignmentMark ?? '');
    const [installationGuidance, setInstallationGuidance] = useState(initialFields?.placement.installationGuidance ?? '');
    const [legacyDescription, setLegacyDescription] = useState(initialFields?.legacyDescription ?? '');
    const [changeReason, setChangeReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    const equipmentOptions: string[] = family === 'PR'
        ? Object.values(EquipmentType)
        : family === 'ECA'
        ? Object.values(EcaEquipmentType)
        : [];

    const toggleEquipmentType = (type: string) => {
        setEquipmentTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const handleFamilyChange = (f: Family) => {
        setFamily(f);
        setEquipmentTypes([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Le nom est obligatoire.');
            return;
        }
        setError(null);

        const scope: SignageScope = family === 'DAT'
            ? { auditType: 'DAT' }
            : family === 'PR'
            ? { auditType: 'PR', equipmentTypes: equipmentTypes.length > 0 ? equipmentTypes as EquipmentType[] : undefined }
            : { auditType: 'ECA', equipmentTypes: equipmentTypes.length > 0 ? equipmentTypes as EcaEquipmentType[] : undefined };

        const dimensions: SignageDimensions | undefined = (width || height)
            ? { width: width ? Number(width) : undefined, height: height ? Number(height) : undefined, unit }
            : undefined;

        const placement: SignagePlacement = {
            zone: zone.trim() || undefined,
            position: position.trim() || undefined,
            alignmentMark: alignmentMark.trim() || undefined,
            installationGuidance: installationGuidance.trim() || undefined,
        };

        const fields: SignageReferenceEditableFields = {
            name: name.trim(),
            code: code.trim() || undefined,
            scope,
            support,
            material: material.trim() || undefined,
            dimensions,
            placement,
            legacyDescription: legacyDescription.trim() || undefined,
        };

        onSubmit(fields, mode === 'edit' ? (changeReason.trim() || undefined) : undefined);
    };

    const inputClass = "block w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 px-3 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600";
    const labelClass = "text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1 block";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Nom *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
                </div>
                <div>
                    <label className={labelClass}>Code (nomenclature Tisséo)</label>
                    <input type="text" value={code} onChange={e => setCode(e.target.value)} className={inputClass} />
                </div>
            </div>

            <div>
                <label className={labelClass}>Famille</label>
                <div className="flex gap-2">
                    {(['DAT', 'PR', 'ECA'] as Family[]).map(f => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => handleFamilyChange(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                family === f ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                        >
                            {f === 'PR' ? 'P+R' : f}
                        </button>
                    ))}
                </div>
            </div>

            {equipmentOptions.length > 0 && (
                <div>
                    <label className={labelClass}>Types d'équipements concernés (aucun = tous)</label>
                    <div className="flex flex-wrap gap-2">
                        {equipmentOptions.map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => toggleEquipmentType(type)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                                    equipmentTypes.includes(type) ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 ring-1 ring-teal-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Support</label>
                    <select value={support} onChange={e => setSupport(e.target.value as SignageSupport)} className={inputClass}>
                        {(Object.keys(SUPPORT_LABELS) as SignageSupport[]).map(s => (
                            <option key={s} value={s}>{SUPPORT_LABELS[s]}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Matière</label>
                    <input type="text" value={material} onChange={e => setMaterial(e.target.value)} className={inputClass} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className={labelClass}>Largeur</label>
                    <input type="number" step="0.1" value={width} onChange={e => setWidth(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Hauteur</label>
                    <input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Unité</label>
                    <select value={unit} onChange={e => setUnit(e.target.value as 'cm' | 'mm')} className={inputClass}>
                        <option value="cm">cm</option>
                        <option value="mm">mm</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className={labelClass}>Zone de pose</label>
                    <input type="text" value={zone} onChange={e => setZone(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Position</label>
                    <input type="text" value={position} onChange={e => setPosition(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Repère d'alignement</label>
                    <input type="text" value={alignmentMark} onChange={e => setAlignmentMark(e.target.value)} className={inputClass} />
                </div>
            </div>

            <div>
                <label className={labelClass}>Consignes de pose</label>
                <textarea value={installationGuidance} onChange={e => setInstallationGuidance(e.target.value)} rows={2} className={inputClass} />
            </div>

            <div>
                <label className={labelClass}>Description libre</label>
                <textarea value={legacyDescription} onChange={e => setLegacyDescription(e.target.value)} rows={2} className={inputClass} />
            </div>

            {mode === 'edit' && (
                <div>
                    <label className={labelClass}>Motif du changement (si support/matière/dimensions/pose modifiés)</label>
                    <input type="text" value={changeReason} onChange={e => setChangeReason(e.target.value)} className={inputClass} placeholder="Ex. : mise à jour du visuel BPU 2026" />
                </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
                    Annuler
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">
                    {submitLabel}
                </button>
            </div>
        </form>
    );
};

export default SignageReferenceForm;
