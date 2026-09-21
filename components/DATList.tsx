

import React, { useEffect, useRef, useState } from 'react';
import { Direction, DAT, Station, AuditModule } from '../types';
import { PlusCircle, Pencil, ChevronRight, Ticket, ArrowLeft, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LineIcon } from './LineIcon';
import { getDatProgress, ProgressStatus } from '../utils/progressCalculators';
import { DatIcon } from './DatIcon';
import useAuditStore from '../store';

/** Durée d'affichage de la surbrillance de retour — discrète, alignée sur les
 *  transitions déjà utilisées sur ces cartes (`transition-all duration-75`). */
const RETURN_HIGHLIGHT_MS = 2000;

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

const getStatusLabelColor = (status: ProgressStatus) => {
    switch (status) {
        case ProgressStatus.Completed:
            return 'text-teal-600 dark:text-teal-400';
        case ProgressStatus.InProgress:
            return 'text-amber-600 dark:text-amber-400';
        default:
            return 'text-gray-500 dark:text-slate-400';
    }
};

const getProgressBarColor = (status: ProgressStatus) => {
    switch (status) {
        case ProgressStatus.InProgress:
        case ProgressStatus.Completed:
            return 'bg-teal-500 dark:bg-teal-600';
        default:
            return 'bg-gray-400 dark:bg-slate-500';
    }
};

const DATList: React.FC<DATListProps> = ({ module, station, direction, onSelectDat, onAddDat, onRemoveDat, onUpdateDatName, onBack }) => {
    const [editingDatId, setEditingDatId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [datToDelete, setDatToDelete] = useState<DAT | null>(null);
    const [returnHighlightId, setReturnHighlightId] = useState<string | null>(null);

    const activeDats = direction?.dats ?? [];

    // Repositionnement au retour d'un audit (store.ts::selectDat) — cette
    // liste est entièrement remontée à chaque retour (App.tsx clé son arbre
    // sur selectedDatId), donc lastCompletedDatId ne peut refléter qu'un
    // retour qui vient tout juste de se produire. Capturé UNE FOIS dans une
    // ref (lecture pure, jamais de mutation ici) : l'identité de la cible ne
    // doit pas dépendre du store, qui sera vidé par l'effet ci-dessous — en
    // React StrictMode (dev), cet effet est rejoué une seconde fois juste
    // après le montage (monte → nettoie → remonte), et une deuxième lecture
    // du store y trouverait déjà `null` si la cible n'était pas mise de côté
    // ici (constaté en direct : le minuteur du premier passage était annulé
    // par ce rejeu, sans qu'aucun second minuteur ne soit reprogrammé).
    const pendingHighlightId = useRef(useAuditStore.getState().lastCompletedDatId).current;

    useEffect(() => {
        // Toujours effacé, qu'on retrouve l'élément ou non — idempotent (sans
        // effet la deuxième fois en StrictMode) : jamais de référence
        // obsolète qui traînerait pour un futur montage sans rapport.
        useAuditStore.getState().clearLastCompletedDat();
        if (!pendingHighlightId) return;
        const el = document.getElementById(`dat-card-${pendingHighlightId}`);
        // DAT supprimé/archivé entre-temps : rien à faire, aucune erreur.
        if (!el) return;
        el.scrollIntoView({ block: 'center' });
        setReturnHighlightId(pendingHighlightId);
        const timer = setTimeout(() => setReturnHighlightId(null), RETURN_HIGHLIGHT_MS);
        return () => clearTimeout(timer);
    }, [pendingHighlightId]);

    const handleEditClick = (e: React.MouseEvent, dat: DAT) => {
        e.stopPropagation();
        setEditingDatId(dat.id);
        setEditingName(dat.name);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingName(e.target.value);
    };

    const handleSaveName = (datId: string) => {
        if (editingName.trim() && editingName.trim() !== activeDats.find(d => d.id === datId)?.name) {
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
        {/* Sticky mobile uniquement : Retour + repère station/direction
         *  restent visibles pendant le défilement d'une longue liste de DAT
         *  (même besoin que le header d'audit déjà traité) — pas d'état
         *  compact séparé, ce header est déjà court (pas de barre de
         *  progression ni d'action de reset ici). Doit être un enfant DIRECT
         *  de la racine du composant (pas imbriqué sous un petit conteneur
         *  d'en-tête) : le rectangle de collage d'un `sticky` est borné par
         *  son parent immédiat — imbriqué plus profond, il décroche dès que
         *  ce petit parent est entièrement défilé (constaté en direct sur
         *  Jean-Jaurès : 27 ECA, le header quittait le haut de l'écran après
         *  quelques centaines de pixels au lieu de rester collé). "Ajouter
         *  un DAT" reste hors de la zone sticky sur mobile : pas
         *  indispensable en continu, on évite d'alourdir la barre. */}
        <div className="sticky top-0 z-10 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sm:static sm:py-0 sm:bg-transparent sm:border-0 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-light text-slate-500 dark:text-slate-400">{station.name}</p>
                            <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {station.code}
                            </span>
                        </div>
                         <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-100">{direction.name}</h2>
                        </div>
                    </div>
                </div>
            </div>
            <button
                onClick={onAddDat}
                className="hidden sm:inline-flex items-center gap-x-2 rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-normal text-white shadow-sm hover:bg-teal-500"
            >
                <PlusCircle className="h-5 w-5" />
                Ajouter un DAT
            </button>
        </div>
        {/* Doublon mobile du bouton ci-dessus, hors zone sticky (garde la
         *  barre compacte) — masqué à partir de sm: où le bouton du header
         *  suffit. */}
        <button
            onClick={onAddDat}
            className="sm:hidden w-full inline-flex items-center justify-center gap-x-2 rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-normal text-white shadow-sm hover:bg-teal-500 mt-3 mb-6"
        >
            <PlusCircle className="h-5 w-5" />
            Ajouter un DAT
        </button>
        
        {activeDats.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                <Ticket className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">Aucun DAT</h3>
                <p className="mt-1 text-sm font-light text-slate-500 dark:text-slate-400">Aucun DAT n'est enregistré pour cette direction.</p>
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={onAddDat}
                        className="inline-flex items-center rounded-md bg-teal-600 px-3 py-2 text-sm font-normal text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                    >
                        <PlusCircle className="-ml-0.5 mr-1.5 h-5 w-5" />
                        Ajouter le premier DAT
                    </button>
                </div>
            </div>
        ) : (
             <div className="space-y-4">
                {activeDats.map((dat) => {
                    const progress = getDatProgress(dat);
                    const isReturnHighlighted = dat.id === returnHighlightId;
                    return (
                        <div
                            key={dat.id}
                            id={`dat-card-${dat.id}`}
                            onClick={() => editingDatId !== dat.id && onSelectDat(dat.id)}
                            className={`p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-75 w-full cursor-pointer group ${
                                isReturnHighlighted
                                    ? 'bg-teal-50 dark:bg-teal-900/20 ring-2 ring-teal-500 dark:ring-teal-400'
                                    : 'bg-white dark:bg-slate-800 dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex flex-1 min-w-0 items-center gap-4">
                                    <DatIcon dat={dat} size="lg" />
                                    {editingDatId === dat.id ? (
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={handleNameChange}
                                            onBlur={() => handleSaveName(dat.id)}
                                            onKeyDown={(e) => handleKeyDown(e, dat.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                            className="text-lg font-medium tracking-tight text-slate-900 bg-white border border-teal-500 rounded-md px-2 py-1 -my-1 w-full dark:bg-slate-900 dark:text-slate-100 dark:border-teal-400"
                                        />
                                    ) : (
                                        <div className="flex items-center flex-1 min-w-0">
                                            <p className="text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100 truncate">{dat.name}</p>
                                            <button onClick={(e) => handleEditClick(e, dat)} className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors ml-2 flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        </div>
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
                                    <span className={`text-xs font-normal ${getStatusLabelColor(progress.status)}`}>
                                        {progress.label}
                                    </span>
                                    <span className="text-sm font-normal text-slate-700 dark:text-slate-300">{Math.round(progress.percentage)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                    <div className={`${getProgressBarColor(progress.status)} h-2 rounded-full`} style={{ width: `${progress.percentage}%` }}></div>
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