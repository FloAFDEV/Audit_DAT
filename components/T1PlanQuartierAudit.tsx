// components/T1PlanQuartierAudit.tsx
// Audit des plans de quartier d'une station T1, ouvert depuis la tuile
// « Plans de quartier » : référentiel T1 (2 plans 78 × 100 cm, 1 par sens),
// sans le catalogue générique du module Plans de quartier. Lecture/écriture
// des emplacements Équipements Station existants via les actions
// signalétique du store (cible explicite) — aucune donnée dupliquée.
import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Camera, Edit, Trash2, RotateCw, Flag, MessageSquare, Maximize2 } from 'lucide-react';
import { AuditModule, EquipmentStatusType, SignaletiqueData, Station } from '../types';
import type { SignaletiqueTarget } from '../store';
import AuditFormLayout from './AuditFormLayout';
import PhotoViewerModal from './PhotoViewerModal';
import { showPromiseToast } from './ToastManager';
import { resizeImage } from '../utils/resizeImage';
import { TERMINUS_BANDEAU_TEXT, TERMINUS_STATIONS } from '../utils/signaletiqueDirections';
import {
  T1_PLAN_QUARTIER_DIMENSIONS, T1PlanQuartierOccurrence, summarizeT1PlanQuartier, t1PlanQuartierOccurrences,
} from '../utils/t1PlanQuartierAudit';

type Status = EquipmentStatusType | 'NotChecked';
type Dir = 'meett' | 'pdj';

interface T1PlanQuartierAuditProps {
  /** Module Plans de quartier T1 (tuile ouverte) — en-tête uniquement. */
  module: AuditModule;
  /** Module Équipements Station de la même station : source des emplacements. */
  signaletiqueModule: AuditModule;
  station: Station;
  onStatusChange: (category: keyof SignaletiqueData, dir: Dir, index: number, status: Status, target: SignaletiqueTarget) => Promise<void> | void;
  onFieldChange: (category: keyof SignaletiqueData, dir: Dir, index: number, field: string, value: any, target: SignaletiqueTarget) => Promise<void> | void;
  onCommentChange: (category: keyof SignaletiqueData, dir: Dir, index: number, comment: string, target: SignaletiqueTarget) => Promise<void> | void;
  onPhotoChange: (category: keyof SignaletiqueData, dir: Dir, index: number, photo: string | null, target: SignaletiqueTarget) => Promise<void> | void;
  onPhotoNoteChange: (category: keyof SignaletiqueData, dir: Dir, index: number, note: string, target: SignaletiqueTarget) => Promise<void> | void;
  onPhotoRotationChange: (category: keyof SignaletiqueData, dir: Dir, index: number, rotation: number, target: SignaletiqueTarget) => Promise<void> | void;
  onStationCommentChange: (comment: string, target: SignaletiqueTarget) => void;
  onBack: () => void;
}

const OPTIONS = [
  { value: EquipmentStatusType.OK, label: 'OK', icon: CheckCircle2, colorClass: 'bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600', activeColorClass: 'bg-teal-600 text-white shadow-sm dark:bg-teal-500' },
  { value: EquipmentStatusType.ABSENT, label: 'Absent', icon: XCircle, colorClass: 'bg-white text-red-700 ring-1 ring-inset ring-red-600 hover:bg-red-50 dark:bg-slate-700/50 dark:text-red-300 dark:ring-slate-600', activeColorClass: 'bg-red-600 text-white shadow-sm dark:bg-red-500' },
  { value: EquipmentStatusType.TO_REPLACE, label: 'À remplacer', icon: AlertTriangle, colorClass: 'bg-white text-orange-600 ring-1 ring-inset ring-orange-500 hover:bg-orange-50 dark:bg-slate-700/50 dark:text-orange-300 dark:ring-slate-600', activeColorClass: 'bg-orange-500 text-white shadow-sm' },
];

const StatusButtons: React.FC<{ current: Status; onSelect: (s: Status) => void; small?: boolean }> = ({ current, onSelect, small }) => (
  <div className="flex items-center gap-1.5 w-full sm:w-auto">
    {OPTIONS.map(opt => {
      const Icon = opt.icon;
      return (
        <button
          key={opt.value}
          type="button"
          aria-pressed={current === opt.value}
          // Un second appui sur l'état actif revient à « Non contrôlé ».
          onClick={() => onSelect(current === opt.value ? 'NotChecked' : opt.value)}
          className={`flex-1 sm:flex-none flex items-center justify-center ${small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} font-medium rounded-md transition-all duration-75 active:scale-95 whitespace-nowrap min-w-0 ${current === opt.value ? opt.activeColorClass : opt.colorClass}`}
        >
          <Icon className={`${small ? 'w-4 h-4 mr-1.5' : 'w-5 h-5 mr-2'} flex-shrink-0`} />{opt.label}
        </button>
      );
    })}
  </div>
);

const T1PlanQuartierAudit: React.FC<T1PlanQuartierAuditProps> = ({
  module, signaletiqueModule, station,
  onStatusChange, onFieldChange, onCommentChange, onPhotoChange, onPhotoNoteChange, onPhotoRotationChange, onStationCommentChange, onBack,
}) => {
  const target: SignaletiqueTarget = { moduleId: signaletiqueModule.id, stationId: station.id };
  const occurrences = useMemo(() => t1PlanQuartierOccurrences(station), [station]);
  const summary = summarizeT1PlanQuartier(occurrences);
  const isTerminus = TERMINUS_STATIONS.includes(station.name);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDirRef = useRef<Dir | null>(null);
  const [viewingDir, setViewingDir] = useState<Dir | null>(null);
  const viewing = occurrences.find(o => o.dirKey === viewingDir)?.item;

  // Progression : état du plan + bandeau de chaque occurrence recensée.
  const progress = useMemo(() => {
    let total = 0;
    let checked = 0;
    for (const { item } of occurrences) {
      if (!item) continue;
      total += 2;
      if ((item.status ?? 'NotChecked') !== 'NotChecked') checked++;
      if ((item.bannerDirection ?? 'NotChecked') !== 'NotChecked') checked++;
    }
    return total ? (checked / total) * 100 : 0;
  }, [occurrences]);

  const startUpload = (dir: Dir) => {
    uploadDirRef.current = dir;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const dir = uploadDirRef.current;
    if (file && dir) {
      const hadRotation = !!occurrences.find(o => o.dirKey === dir)?.item?.photo_rotation;
      // Écritures enchaînées (jamais concurrentes sur le même lieu) ; une
      // nouvelle photo repart d'une orientation nulle.
      const promise = resizeImage(file, 1024).then(async base64 => {
        await onPhotoChange('planQuartier', dir, 0, base64, target);
        if (hadRotation) await onPhotoRotationChange('planQuartier', dir, 0, 0, target);
      });
      showPromiseToast(
        promise,
        { icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-teal-500"></div>, title: "Traitement de l'image...", message: 'Compression en cours.' },
        { icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-white" /></div>, title: 'Photo ajoutée', message: "L'image a été enregistrée avec succès." },
        { icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>, title: 'Erreur', message: "Impossible de traiter l'image." }
      );
    }
    event.target.value = '';
  };

  const handleReset = async () => {
    for (const { dirKey, item } of occurrences) {
      if (!item) continue;
      await onStatusChange('planQuartier', dirKey, 0, 'NotChecked', target);
      await onFieldChange('planQuartier', dirKey, 0, 'bannerDirection', 'NotChecked', target);
      await onCommentChange('planQuartier', dirKey, 0, '', target);
      await onPhotoChange('planQuartier', dirKey, 0, null, target);
    }
  };

  const summaryLabel = summary.recensed < summary.expected
    ? `${summary.recensed} / ${summary.expected} recensé${summary.recensed > 1 ? 's' : ''}`
    : `${summary.conformes} / ${summary.expected} conforme${summary.conformes > 1 ? 's' : ''}`;

  const renderOccurrence = (occ: T1PlanQuartierOccurrence, position: number) => {
    const { dirKey, direction, item } = occ;
    const directionLabel = direction ?? `Sens ${position + 1} — direction non renseignée`;
    return (
      <div key={dirKey} className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-700 last:border-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-slate-100">{directionLabel}</h3>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-[10px] font-medium text-gray-500 dark:text-slate-400 rounded uppercase tracking-wider">
                {T1_PLAN_QUARTIER_DIMENSIONS}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {item ? (item.status === 'NotChecked' || !item.status ? 'Non contrôlé' : 'Contrôlé') : 'Aucun emplacement recensé pour ce sens — à traiter'}
            </p>
          </div>
          {item && (
            <div className="w-full sm:w-auto sm:flex-shrink-0">
              <StatusButtons current={item.status ?? 'NotChecked'} onSelect={s => onStatusChange('planQuartier', dirKey, 0, s, target)} />
            </div>
          )}
        </div>

        {item && (
          <>
            {/* Bandeau de direction : contrôle déjà porté par l'occurrence. */}
            <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Flag className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{isTerminus ? 'Bandeau Terminus' : 'Bandeau Direction'}</p>
                  {isTerminus && <p className="text-xs text-gray-500 dark:text-slate-400 italic">{TERMINUS_BANDEAU_TEXT}</p>}
                </div>
              </div>
              <StatusButtons small current={item.bannerDirection ?? 'NotChecked'} onSelect={s => onFieldChange('planQuartier', dirKey, 0, 'bannerDirection', s, target)} />
            </div>

            {/* Photo de l'occurrence : stockée sur l'emplacement lui-même. */}
            <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-slate-700 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => startUpload(dirKey)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all active:scale-95 ${item.photo_base64 ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:ring-teal-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                  {item.photo_base64 ? <Edit className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  {item.photo_base64 ? 'Remplacer' : 'Ajouter une photo'}
                </button>
                {item.photo_base64 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onPhotoRotationChange('planQuartier', dirKey, 0, ((item.photo_rotation || 0) + 90) % 360, target)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-all active:scale-95"
                    >
                      <RotateCw className="w-4 h-4" /> Pivoter
                    </button>
                    <button
                      type="button"
                      onClick={() => onPhotoChange('planQuartier', dirKey, 0, null, target)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-all active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  </>
                )}
              </div>
              {item.photo_base64 && (
                <button type="button" onClick={() => setViewingDir(dirKey)} className="relative group self-start" aria-label="Agrandir la photo">
                  <img
                    src={item.photo_base64}
                    alt={`Plan de quartier T1 — ${directionLabel}`}
                    className="w-24 h-24 rounded-md object-cover shadow-sm"
                    style={{ transform: `rotate(${item.photo_rotation || 0}deg)` }}
                  />
                  <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </span>
                </button>
              )}
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={item.comment || ''}
                  onChange={e => onCommentChange('planQuartier', dirKey, 0, e.target.value, target)}
                  placeholder="Observation..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-teal-500 outline-none text-gray-700 dark:text-slate-300"
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />

      <AuditFormLayout
        module={module}
        title="Plans de quartier T1"
        subtitle={
          <p className="text-gray-600 dark:text-slate-400 text-sm">
            <span className="font-medium text-gray-800 dark:text-slate-200">Tram T1 — {station.name}</span> &bull; audit dans Équipements Station
          </p>
        }
        progress={progress}
        onBack={onBack}
        onReset={handleReset}
        resetConfirmTitle="Réinitialiser les plans de quartier T1"
        resetConfirmMessage={`Réinitialiser l'état, le bandeau, l'observation et la photo des plans de quartier T1 de ${station.name} ?`}
        comment={station.comment}
        onCommentChange={comment => onStationCommentChange(comment, target)}
      >
        <div className="bg-slate-50 dark:bg-slate-900/30">
          <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-slate-700">
            <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">
              Plan de quartier T1 — {T1_PLAN_QUARTIER_DIMENSIONS} · {summary.expected} attendus (1 par sens)
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{summaryLabel}</span>
            {summary.toTreat > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300">{summary.toTreat} à traiter</span>
            )}
            {summary.unchecked > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{summary.unchecked} non contrôlé{summary.unchecked > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="bg-white dark:bg-slate-800">
            {occurrences.map(renderOccurrence)}
          </div>
        </div>
      </AuditFormLayout>

      {viewingDir && viewing?.photo_base64 && (
        <PhotoViewerModal
          isOpen
          onClose={() => setViewingDir(null)}
          photo={{ photo_base64: viewing.photo_base64, photo_note: viewing.photo_note, photo_rotation: viewing.photo_rotation }}
          onRotate={rotation => onPhotoRotationChange('planQuartier', viewingDir, 0, rotation, target)}
          onNoteChange={note => onPhotoNoteChange('planQuartier', viewingDir, 0, note, target)}
        />
      )}
    </>
  );
};

export default T1PlanQuartierAudit;
