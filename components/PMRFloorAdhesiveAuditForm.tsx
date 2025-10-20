import React, { useMemo, useRef, useState } from 'react';
import { AuditModule, FloorAdhesiveStatus, PMRFloorAdhesive, PMRFloorAdhesiveData } from '../types';
import { CheckCircle2, XCircle, Clock, Camera, Trash2, Edit2, Edit } from 'lucide-react';
import { FormattedCorrespondence } from './Icons';
import AuditFormLayout from './AuditFormLayout';
import { showPromiseToast } from './ToastManager';
import PhotoViewerModal from './PhotoViewerModal';

interface PMRFloorAdhesiveAuditFormProps {
  module: AuditModule;
  onStatusChange: (adhesiveId: string, status: FloorAdhesiveStatus) => void;
  onPhotoChange: (adhesiveId: string, photo_base64: string | null) => void;
  onPhotoNoteChange: (adhesiveId: string, note: string) => void;
  onPhotoRotationChange: (adhesiveId: string, rotation: number) => void;
  onBack: () => void;
  onReset: () => void;
  onCommentChange: (comment: string) => void;
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
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Impossible d\'obtenir le contexte du canvas.'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Compression JPEG à 80%
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};


const PMRFloorAdhesiveAuditForm: React.FC<PMRFloorAdhesiveAuditFormProps> = (props) => {
  const { module, onStatusChange, onPhotoChange, onPhotoNoteChange, onPhotoRotationChange, onBack, onReset, onCommentChange } = props;
  const pmrData = module.data as PMRFloorAdhesiveData;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentAdhesiveId = useRef<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<PMRFloorAdhesive | null>(null);

  const progress = useMemo(() => {
    const total = pmrData.adhesives.length;
    if (total === 0) return 0;
    const checked = pmrData.adhesives.filter(s => s.status !== FloorAdhesiveStatus.NotChecked).length;
    return (checked / total) * 100;
  }, [pmrData.adhesives]);

  const handlePhotoUploadClick = (adhesiveId: string) => {
    currentAdhesiveId.current = adhesiveId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentAdhesiveId.current) {
      const adhesiveId = currentAdhesiveId.current;

      const promise = resizeImage(file, 1024).then(base64 => {
        onPhotoChange(adhesiveId, base64);
      });

      showPromiseToast(
        promise,
        {
            icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
            title: "Traitement de l'image...",
            message: "Compression en cours.",
        },
        {
            icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-white" /></div>,
            title: "Photo ajoutée",
            message: "L'image a été enregistrée avec succès.",
        },
        {
            icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
            title: "Erreur",
            message: "Impossible de traiter l'image.",
        }
      );
    }
     if (event.target) {
        event.target.value = ''; // Reset input pour permettre de re-sélectionner le même fichier
    }
  };


  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <AuditFormLayout
        module={module}
        title={<FormattedCorrespondence text={module.name} />}
        subtitle={
          <p className="text-gray-600 dark:text-slate-400 text-sm">
            <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {pmrData.stationName}
          </p>
        }
        progress={progress}
        onBack={onBack}
        onReset={onReset}
        resetConfirmTitle="Réinitialiser l'audit PMR au Sol"
        resetConfirmMessage={`Êtes-vous sûr de vouloir réinitialiser les vérifications pour la station ${pmrData.stationName} ? Les photos seront supprimées.`}
        comment={pmrData.comment}
        onCommentChange={onCommentChange}
      >
        <ul className="divide-y divide-gray-200 dark:divide-slate-700">
          {pmrData.adhesives.map((adhesive) => {
            const currentStatus = adhesive.status;

            return (
              <li key={adhesive.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      {adhesive.name}
                      <span className="text-base font-normal text-gray-400 dark:text-slate-500 ml-2">
                          // <span className="font-bold text-gray-600 dark:text-slate-400">920x3705mm</span>
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-stretch gap-2 mt-4 sm:mt-0 sm:ml-6 sm:flex-wrap sm:gap-3">
                    <button
                      onClick={() => onStatusChange(adhesive.id, currentStatus === FloorAdhesiveStatus.OK ? FloorAdhesiveStatus.NotChecked : FloorAdhesiveStatus.OK)}
                      className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-75 active:scale-95 ${
                        currentStatus === FloorAdhesiveStatus.OK
                          ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-500'
                          : 'bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      OK
                    </button>
                    <button
                      onClick={() => onStatusChange(adhesive.id, currentStatus === FloorAdhesiveStatus.ToBeReplaced ? FloorAdhesiveStatus.NotChecked : FloorAdhesiveStatus.ToBeReplaced)}
                      className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-75 active:scale-95 ${
                        currentStatus === FloorAdhesiveStatus.ToBeReplaced
                          ? 'bg-red-600 text-white shadow-sm dark:bg-red-500'
                          : 'bg-white text-red-700 ring-1 ring-inset ring-red-600 hover:bg-red-50 dark:bg-slate-700/50 dark:text-red-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                      }`}
                    >
                      <XCircle className="w-5 h-5 mr-2" />
                      À remplacer
                    </button>
                     <button
                        onClick={() => onStatusChange(adhesive.id, currentStatus === FloorAdhesiveStatus.ToPlan ? FloorAdhesiveStatus.NotChecked : FloorAdhesiveStatus.ToPlan)}
                        className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-75 active:scale-95 ${
                          currentStatus === FloorAdhesiveStatus.ToPlan
                            ? 'bg-sky-600 text-white shadow-sm dark:bg-sky-500'
                            : 'bg-white text-sky-700 ring-1 ring-inset ring-sky-600 hover:bg-sky-50 dark:bg-slate-700/50 dark:text-sky-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Clock className="w-5 h-5 mr-2" />
                        À planifier
                      </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-start gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => handlePhotoUploadClick(adhesive.id)}
                            className={`flex items-center justify-center text-sm font-medium transition-all duration-75 active:scale-95 ${
                                adhesive.photo_base64
                                ? 'p-2 rounded-full bg-white text-indigo-700 ring-1 ring-inset ring-indigo-500 hover:bg-indigo-50 dark:bg-slate-700/50 dark:text-indigo-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                                : 'px-3 py-1.5 rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 whitespace-nowrap'
                            }`}
                            title={adhesive.photo_base64 ? "Remplacer la photo" : "Ajouter une photo"}
                        >
                            {adhesive.photo_base64 ? (
                                <Edit className="w-5 h-5" />
                            ) : (
                                <>
                                    <Camera className="w-5 h-5 mr-2" />
                                    <span>Ajouter une photo</span>
                                </>
                            )}
                        </button>
                         {adhesive.photo_base64 && (
                            <button
                                onClick={() => onPhotoChange(adhesive.id, null)}
                                className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                aria-label="Supprimer la photo"
                                title="Supprimer la photo"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                     {adhesive.photo_base64 && (
                        <div className="flex items-start gap-4 w-full">
                            <button onClick={() => setViewingPhoto(adhesive)} className="flex-shrink-0 relative group">
                                <img 
                                    src={adhesive.photo_base64} 
                                    alt="Aperçu de l'adhésif" 
                                    className="w-24 h-24 rounded-md object-cover shadow-sm transition-transform duration-75"
                                    style={{ transform: `rotate(${adhesive.photo_rotation || 0}deg)` }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                    <Edit2 className="w-6 h-6 text-white" />
                                </div>
                            </button>
                            <div className="flex-1">
                                {adhesive.photo_note ? (
                                    <p className="text-sm text-gray-600 dark:text-slate-300 italic p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md whitespace-pre-wrap">{adhesive.photo_note}</p>
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
      </AuditFormLayout>
       {viewingPhoto && (
        <PhotoViewerModal
            isOpen={!!viewingPhoto}
            onClose={() => setViewingPhoto(null)}
            photo={viewingPhoto}
            onRotate={(newRotation) => {
                onPhotoRotationChange(viewingPhoto.id, newRotation);
                setViewingPhoto(prev => prev ? { ...prev, photo_rotation: newRotation } : null);
            }}
            onNoteChange={(newNote) => {
                onPhotoNoteChange(viewingPhoto.id, newNote);
                 setViewingPhoto(prev => prev ? { ...prev, photo_note: newNote } : null);
            }}
        />
      )}
    </>
  );
};

export default PMRFloorAdhesiveAuditForm;