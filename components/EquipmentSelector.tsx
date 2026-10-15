import React, { useState } from 'react';
import { Lieu, Pr, Equipment, AdhesiveStatus, EquipmentType, PrZone, SignageReference } from '../types';
import { ChevronRight, ArrowLeft, Ticket, Car, Euro, Plus, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LieuBadges } from './Icons';

import { getEffectiveEquipmentAdhesives } from '../utils/effectiveAdhesives';

interface EquipmentSelectorProps {
  lieu: Lieu;
  prData: Pr;
  zone: PrZone;
  signageReferences: SignageReference[];
  onSelectEquipment: (equipmentId: string) => void;
  onBack: () => void;
  /** Caisses automatiques : nombre théorique modifiable (zone sélectionnée). */
  onAddCaisseAuto?: () => void;
  onRemoveCaisseAuto?: (equipmentId: string) => void;
  /** Raison empêchant le retrait (caisse déjà auditée…), ou null. */
  getCaisseRemovalBlocker?: (equipmentId: string) => string | null;
}

const getEquipmentProgress = (equipment: Equipment, signageReferences: SignageReference[]): number => {
    if (!equipment || !equipment.adhesives) return 0;

    const adhesiveDefinitions = getEffectiveEquipmentAdhesives(signageReferences, equipment.type, equipment.adhesiveIds);
    const activeAdhesives = adhesiveDefinitions.filter(ad => !ad.isDisabled);
    
    if (activeAdhesives.length === 0) return 100;

    const checkedCount = Object.entries(equipment.adhesives)
        .filter(([id, status]) => 
            activeAdhesives.some(ad => ad.id === id) && status !== AdhesiveStatus.NotChecked
        ).length;

    return (checkedCount / activeAdhesives.length) * 100;
};

const getEquipmentIcon = (type: EquipmentType) => {
    const iconProps = { className: "w-8 h-8 text-white" };
    switch (type) {
        case EquipmentType.BE: return <div className="p-3 bg-teal-500 rounded-lg"><Car {...iconProps} /></div>;
        case EquipmentType.BS: return <div className="p-3 bg-sky-600 rounded-lg"><Car {...iconProps} /></div>;
        case EquipmentType.CA: return <div className="p-3 bg-amber-500 rounded-lg"><Euro {...iconProps} /></div>;
        default: return null;
    }
}

const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({ lieu, prData, zone, signageReferences, onSelectEquipment, onBack, onAddCaisseAuto, onRemoveCaisseAuto, getCaisseRemovalBlocker }) => {
    const [confirmAdd, setConfirmAdd] = useState(false);
    const [toRemove, setToRemove] = useState<Equipment | null>(null);
    const caisseCount = zone?.equipments?.filter(e => e.type === EquipmentType.CA).length ?? 0;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Retour"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <LieuBadges lieu={lieu} />
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{prData.name} - {zone.name}</h2>
                        </div>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">Sélectionner un équipement à auditer</p>
                    </div>
                </div>
            </div>

            {(!zone || !zone.equipments || zone.equipments.length === 0) ? (
                 <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <Ticket className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Aucun équipement</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Aucun équipement n'est enregistré pour cette zone du P+R.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {zone.equipments.map((equipment) => {
                        const progress = getEquipmentProgress(equipment, signageReferences);
                        const isComplete = progress === 100;
                        const progressBarColor = 'bg-teal-500 dark:bg-teal-600';
                        
                        const removalBlocker = equipment.type === EquipmentType.CA && onRemoveCaisseAuto
                            ? (getCaisseRemovalBlocker?.(equipment.id) ?? null) : undefined;
                        return (
                            <div key={equipment.id} className="relative">
                            <button
                                onClick={() => onSelectEquipment(equipment.id)}
                                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-75 w-full text-left group dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {getEquipmentIcon(equipment.type)}
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{equipment.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-slate-400">{equipment.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center flex-shrink-0">
                                        {removalBlocker !== undefined && <span className="w-9" aria-hidden="true" />}
                                        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-300 transition-colors ml-2" />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1">
                                         <span className={`text-xs font-medium ${isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                            {isComplete ? 'Terminé' : 'Progression'}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                        <div className={`${progressBarColor} h-2 rounded-full`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            </button>
                            {removalBlocker !== undefined && (
                                <button
                                    type="button"
                                    onClick={() => setToRemove(equipment)}
                                    disabled={!!removalBlocker}
                                    title={removalBlocker ?? `Retirer ${equipment.name}`}
                                    aria-label={removalBlocker ?? `Retirer la caisse ${equipment.name}`}
                                    className="absolute top-4 right-10 p-2 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:bg-transparent disabled:cursor-not-allowed dark:hover:bg-red-900/20 transition-colors dark:text-slate-400"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            </div>
                        );
                    })}
                </div>
            )}

            {onAddCaisseAuto && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        Caisses automatiques dans cette zone : <span className="font-semibold text-gray-700 dark:text-slate-200">{caisseCount}</span>
                    </p>
                    <button
                        type="button"
                        onClick={() => setConfirmAdd(true)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-md text-amber-700 ring-1 ring-inset ring-amber-500 hover:bg-amber-50 dark:text-amber-300 dark:ring-amber-500/60 dark:hover:bg-amber-900/20 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter une caisse automatique
                    </button>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmAdd}
                onClose={() => setConfirmAdd(false)}
                onConfirm={() => { setConfirmAdd(false); onAddCaisseAuto?.(); }}
                title="Ajouter une caisse automatique"
                message={`Ajouter une caisse automatique à ${prData.name} — ${zone?.name} ?\n\nElle sera à auditer, et son plan de quartier (repère 12) sera créé dans les Plans de quartier.`}
                confirmLabel="Ajouter"
                confirmButtonClass="inline-flex w-full justify-center rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 sm:ml-3 sm:w-auto"
            />
            <ConfirmationModal
                isOpen={!!toRemove}
                onClose={() => setToRemove(null)}
                onConfirm={() => { const id = toRemove?.id; setToRemove(null); if (id) onRemoveCaisseAuto?.(id); }}
                title="Retirer une caisse automatique"
                message={`Retirer ${toRemove?.name ?? ''} de ${prData.name} — ${zone?.name} ?\n\nCette caisse n'a jamais été auditée : elle et son plan de quartier (repère 12) seront retirés.`}
                confirmLabel="Retirer"
                isDestructive
            />
        </div>
    );
};

export default EquipmentSelector;