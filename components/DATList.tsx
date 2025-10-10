import React, { useState } from 'react';
import { Direction, DAT, AdhesiveStatus, Station, AuditModule } from '../types';
import { PlusCircle, Pencil, ChevronRight, Ticket, ArrowLeft, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LineIcon } from './LineIcon';

interface DATListProps {
  module: AuditModule;
  station: Station;
  direction: Direction;
  onSelectDat: (datId: string) => void;
  onAddDat: () => void;
  onRemoveDat: (datId: string) => void;
  onUpdateDatName: (datId: string, newName: string) => void;
  onBack: () => void;
}

const getDatStatus = (dat: DAT): { label: string; color: string; checked: number, total: number; percentage: number } => {
    const statuses = Object.values(dat.adhesives);
    const total = statuses.length;
    const checked = statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
    const percentage = total > 0 ? (checked / total) * 100 : 0;

    let label: string;
    let color: string;

    if (checked === 0) {
        label = "Non commencé";
        color = "bg-gray-400 dark:bg-slate-500";
    } else if (checked < total) {
        label = "En cours";
        color = "bg-teal-400 dark:bg-teal-500";
    } else {
        label = "Terminé";
        color = "bg-teal-400 dark:bg-teal-500";
    }

    return { label, color, checked, total, percentage };
};


const DATList: React.FC<DATListProps> = ({ module, station, direction, onSelectDat, onAddDat, onRemoveDat, onUpdateDatName, onBack }) => {
    const [editingDatId, setEditingDatId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [datToDelete, setDatToDelete] = useState<DAT | null>(null);

    const handleEditClick = (e: React.MouseEvent, dat: DAT) => {
        e.stopPropagation();
        setEditingDatId(dat.id);
        setEditingName(dat.name);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingName(e.target.value);
    };

    const handleSaveName = (datId: string) => {
        if (editingName.trim() && editingName.trim() !== direction.dats.find(d => d.id === datId)?.name) {
            onUpdateDatName(datId, editingName.trim());
        }
        setEditingDatId(null);
        setEditingName('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, datId: string) => {
        if (e.key === 'Enter') {
            handleSaveName(datId);
        } else if (e.key === 'Escape') {
            setEditingDatId(null);
            setEditingName('');
        }
    };
  
    const handleConfirmDelete = () => {
        if (datToDelete) {
            onRemoveDat(datToDelete.id);
            setDatToDelete(null);
        }
    };

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div className="flex items-start gap-4">
                <button
                    onClick={onBack}
                    className="p-2 mt-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:text-slate-400 dark:hover:bg-slate-700"
                    aria-label="Retour"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <LineIcon module={module} size="md" />
                    <div>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{station.name}</p>
                         <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{direction.name}</h2>
                        </div>
                    </div>
                </div>
            </div>
            <button
                onClick={onAddDat}
                className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
                <PlusCircle className="h-5 w-5" />
                Ajouter un DAT
            </button>
        </div>
        
        {direction.dats.length === 0 ? (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <Ticket className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-slate-100">Aucun DAT</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Aucun DAT n'est enregistré pour cette direction.</p>
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={onAddDat}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        <PlusCircle className="-ml-0.5 mr-1.5 h-5 w-5" />
                        Ajouter le premier DAT
                    </button>
                </div>
            </div>
        ) : (
             <div className="space-y-4">
                {direction.dats.map((dat) => {
                    const status = getDatStatus(dat);
                    const isComplete = status.percentage === 100;
                    return (
                        <div key={dat.id} onClick={() => editingDatId !== dat.id && onSelectDat(dat.id)} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full cursor-pointer group dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-1 min-w-0 items-center">
                                    <div className={`w-3 h-3 rounded-full mr-4 flex-shrink-0 ${status.color}`}></div>
                                    {editingDatId === dat.id ? (
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={handleNameChange}
                                            onBlur={() => handleSaveName(dat.id)}
                                            onKeyDown={(e) => handleKeyDown(e, dat.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                            className="text-lg font-semibold text-gray-900 bg-white border border-indigo-500 rounded-md px-2 py-1 -my-1 w-full dark:bg-slate-900 dark:text-slate-100 dark:border-indigo-400"
                                        />
                                    ) : (
                                        <>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{dat.name}</p>
                                            <button onClick={(e) => handleEditClick(e, dat)} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors ml-2 flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center flex-shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); setDatToDelete(dat); }} className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors dark:text-red-400 dark:hover:bg-red-900/20">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 ml-2" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-medium ${isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                        {isComplete ? 'Terminé' : 'Progression'}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(status.percentage)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                    <div className="bg-teal-400 dark:bg-teal-500 h-2 rounded-full" style={{ width: `${status.percentage}%` }}></div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )}

        <ConfirmationModal
            isOpen={!!datToDelete}
            onClose={() => setDatToDelete(null)}
            onConfirm={handleConfirmDelete}
            title={`Supprimer ${datToDelete?.name}`}
            message="Êtes-vous sûr de vouloir supprimer ce DAT ? Cette action est définitive."
            icon={<LineIcon module={module} size="sm" />}
            isDestructive
        />
    </div>
  );
};

export default DATList;