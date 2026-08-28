import React, { useMemo, useRef, useState } from 'react';
import { AuditModule, AdhesiveStatus, CustomAuditData, CustomAuditItemStatus, SignageReference } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, Ban, MapPin, Camera, Trash2, Edit2, Edit, LayoutGrid } from 'lucide-react';
import AuditFormLayout from './AuditFormLayout';
import { ModuleIcon } from './ModuleIcon';
import { showPromiseToast } from './ToastManager';
import PhotoViewerModal from './PhotoViewerModal';
import { getEffectiveCustomReferences, getCustomAuditProgress } from '../utils/effectiveAdhesives';
import { formatDimensions } from './cockpit/labels';
import { useAuditDefinitions } from '../hooks/useAuditDefinitions';

interface CustomAuditFormProps {
  module: AuditModule;
  signageReferences: SignageReference[];
  onStatusChange: (referenceId: string, status: AdhesiveStatus) => void;
  onCommentChange: (comment: string) => void;
  onPhotoChange: (referenceId: string, photo_base64: string | null) => void;
  onPhotoNoteChange: (referenceId: string, note: string) => void;
  onPhotoRotationChange: (referenceId: string, rotation: number) => void;
  onReset: () => void;
  onBack: () => void;
}

const resizeImage = (file: File, maxSize: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Impossible d\'obtenir le contexte du canvas.'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const CustomAuditForm: React.FC<CustomAuditFormProps> = (props) => {
  const { module, signageReferences, onStatusChange, onCommentChange, onPhotoChange, onPhotoNoteChange, onPhotoRotationChange, onReset, onBack } = props;
  const data = module.data as CustomAuditData;

  // L'icône de la définition n'est pas dénormalisée sur le module (seul
  // son nom l'est, cf. createBlankCustomModule) : lue à la demande via le
  // même hook déjà utilisé par Admin/Nomenclature (useAuditDefinitions),
  // aucun nouvel état global — une définition introuvable (import ancien,
  // définition supprimée) retombe simplement sur l'icône générique CUSTOM.
  const { definitions } = useAuditDefinitions();
  const definition = useMemo(
    () => definitions.find(d => d.id === data.definitionId),
    [definitions, data.definitionId]
  );

  // Références réellement effectives pour CETTE définition (archivées/
  // désactivées déjà exclues par getEffectiveCustomReferences) — jamais
  // Object.keys(data.items), qui ne reflète que ce qui a déjà été touché.
  const references = useMemo(
    () => getEffectiveCustomReferences(signageReferences, data.definitionId),
    [signageReferences, data.definitionId]
  );

  // Partagée avec store.ts (handleCustomAuditStatusChange) : la
  // progression affichée ici ne doit jamais diverger de la complétude
  // persistée (completionDate).
  const progress = useMemo(
    () => getCustomAuditProgress(signageReferences, data.definitionId, data.items),
    [signageReferences, data.definitionId, data.items]
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentReferenceId = useRef<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{ referenceId: string; item: CustomAuditItemStatus } | null>(null);

  const handlePhotoUploadClick = (referenceId: string) => {
    currentReferenceId.current = referenceId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentReferenceId.current) {
      const referenceId = currentReferenceId.current;
      const promise = resizeImage(file, 1024).then(base64 => {
        onPhotoChange(referenceId, base64);
      });
      showPromiseToast(
        promise,
        { icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>, title: "Traitement de l'image...", message: "Compression en cours." },
        { icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-white" /></div>, title: "Photo ajoutée", message: "L'image a été enregistrée avec succès." },
        { icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>, title: "Erreur", message: "Impossible de traiter l'image." }
      );
    }
    if (event.target) event.target.value = '';
  };

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
      <AuditFormLayout
        module={module}
        customIcon={<ModuleIcon type={module.type} customAuditIconKey={definition?.icon} className="w-8 h-8 text-gray-700 dark:text-slate-300 flex-shrink-0" />}
        title={module.name}
        subtitle={
          <p className="text-gray-600 dark:text-slate-400 text-sm">
            <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {data.stationName}
          </p>
        }
        progress={progress}
        onBack={onBack}
        onReset={onReset}
        resetConfirmTitle="Réinitialiser l'audit"
        resetConfirmMessage={`Êtes-vous sûr de vouloir réinitialiser toutes les vérifications pour « ${module.name} » ?\n\nStation : ${data.stationName}\n\nLes photos seront supprimées.`}
        comment={data.comment}
        onCommentChange={onCommentChange}
      >
        {references.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50">
            <LayoutGrid className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
            <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">Aucune référence pour cet audit</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
              Ajoutez des références à « {module.name} » depuis l'Admin (onglet Audits configurables) pour pouvoir relever cet audit ici.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-slate-700">
            {references.map((ref) => {
              const item = data.items[ref.id];
              const currentStatus = item?.status;
              const dimensions = formatDimensions(ref.dimensions);
              const hasDimensions = dimensions !== '—';

              return (
                <li key={ref.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100">
                        {ref.name}
                        {(hasDimensions || ref.material) && (
                          <span className="text-base font-normal text-slate-400 dark:text-slate-500 ml-2">
                            // <span className="font-medium text-slate-600 dark:text-slate-400">
                              {[hasDimensions ? dimensions : null, ref.material].filter(Boolean).join(' — ')}
                            </span>
                          </span>
                        )}
                      </h3>
                      {ref.placement?.zone && (
                        <div className="flex items-start text-sm font-light text-slate-500 dark:text-slate-400 mt-2">
                          <MapPin className="w-4 h-4 mr-2 mt-0.5 text-slate-400 flex-shrink-0" />
                          <span>{ref.placement.zone}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center flex-wrap justify-start sm:justify-end gap-3">
                      <button
                        onClick={() => onStatusChange(ref.id, currentStatus === AdhesiveStatus.OK ? AdhesiveStatus.NotChecked : AdhesiveStatus.OK)}
                        className={`flex items-center justify-center px-3 py-1.5 text-sm font-normal rounded-md transition-all duration-75 active:scale-95 whitespace-nowrap ${
                          currentStatus === AdhesiveStatus.OK
                            ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-500'
                            : 'bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2" /> OK
                      </button>
                      <button
                        onClick={() => onStatusChange(ref.id, currentStatus === AdhesiveStatus.Absent ? AdhesiveStatus.NotChecked : AdhesiveStatus.Absent)}
                        className={`flex items-center justify-center px-3 py-1.5 text-sm font-normal rounded-md transition-all duration-75 active:scale-95 whitespace-nowrap ${
                          currentStatus === AdhesiveStatus.Absent
                            ? 'bg-red-600 text-white shadow-sm dark:bg-red-500'
                            : 'bg-white text-red-700 ring-1 ring-inset ring-red-600 hover:bg-red-50 dark:bg-slate-700/50 dark:text-red-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                        }`}
                      >
                        <XCircle className="w-5 h-5 mr-2" /> Absent
                      </button>
                      <button
                        onClick={() => onStatusChange(ref.id, currentStatus === AdhesiveStatus.ToBeReplaced ? AdhesiveStatus.NotChecked : AdhesiveStatus.ToBeReplaced)}
                        className={`flex items-center justify-center px-3 py-1.5 text-sm font-normal rounded-md transition-all duration-75 active:scale-95 whitespace-nowrap ${
                          currentStatus === AdhesiveStatus.ToBeReplaced
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-amber-600 ring-1 ring-inset ring-amber-500 hover:bg-amber-50 dark:bg-slate-700/50 dark:text-amber-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                        }`}
                      >
                        <AlertTriangle className="w-5 h-5 mr-2" /> À remplacer
                      </button>
                      <button
                        onClick={() => onStatusChange(ref.id, currentStatus === AdhesiveStatus.NotApplicable ? AdhesiveStatus.NotChecked : AdhesiveStatus.NotApplicable)}
                        className={`flex items-center justify-center px-3 py-1.5 text-sm font-normal rounded-md transition-all duration-75 active:scale-95 whitespace-nowrap ${
                          currentStatus === AdhesiveStatus.NotApplicable
                            ? 'bg-slate-500 text-white shadow-sm dark:bg-slate-600'
                            : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-400 hover:bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300 dark:ring-slate-500 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Ban className="w-5 h-5 mr-2" /> Non applicable
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-start gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handlePhotoUploadClick(ref.id)}
                        className={`flex items-center justify-center text-sm font-medium transition-all duration-75 active:scale-95 ${
                          item?.photo_base64
                            ? 'p-2 rounded-full bg-white text-indigo-700 ring-1 ring-inset ring-indigo-500 hover:bg-indigo-50 dark:bg-slate-700/50 dark:text-indigo-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                            : 'px-3 py-1.5 rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 whitespace-nowrap'
                        }`}
                        title={item?.photo_base64 ? 'Remplacer la photo' : 'Ajouter une photo'}
                      >
                        {item?.photo_base64 ? <Edit className="w-5 h-5" /> : (<><Camera className="w-5 h-5 mr-2" /><span>Ajouter une photo</span></>)}
                      </button>
                      {item?.photo_base64 && (
                        <button
                          onClick={() => onPhotoChange(ref.id, null)}
                          className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                          aria-label="Supprimer la photo"
                          title="Supprimer la photo"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    {item?.photo_base64 && (
                      <div className="flex items-start gap-4 w-full">
                        <button onClick={() => setViewingPhoto({ referenceId: ref.id, item })} className="flex-shrink-0 relative group">
                          <img
                            src={item.photo_base64}
                            alt={`Photo — ${ref.name}`}
                            className="w-24 h-24 rounded-md object-cover shadow-sm transition-transform duration-75"
                            style={{ transform: `rotate(${item.photo_rotation || 0}deg)` }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                            <Edit2 className="w-6 h-6 text-white" />
                          </div>
                        </button>
                        <div className="flex-1">
                          {item.photo_note ? (
                            <p className="text-sm text-gray-600 dark:text-slate-300 italic p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md whitespace-pre-wrap">{item.photo_note}</p>
                          ) : (
                            <p className="text-sm text-gray-400 dark:text-slate-500 italic">Aucune note pour cette photo.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AuditFormLayout>
      {viewingPhoto && (
        <PhotoViewerModal
          isOpen={!!viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          photo={viewingPhoto.item}
          onRotate={(newRotation) => {
            onPhotoRotationChange(viewingPhoto.referenceId, newRotation);
            setViewingPhoto(prev => prev ? { ...prev, item: { ...prev.item, photo_rotation: newRotation } } : null);
          }}
          onNoteChange={(newNote) => {
            onPhotoNoteChange(viewingPhoto.referenceId, newNote);
            setViewingPhoto(prev => prev ? { ...prev, item: { ...prev.item, photo_note: newNote } } : null);
          }}
        />
      )}
    </>
  );
};

export default CustomAuditForm;
