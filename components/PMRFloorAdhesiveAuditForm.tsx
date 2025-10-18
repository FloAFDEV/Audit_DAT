import React, { useMemo, useRef } from 'react';
import { AuditModule, FloorAdhesiveStatus, PMRFloorAdhesiveData } from '../types';
import { CheckCircle2, XCircle, Clock, Camera, Trash2 } from 'lucide-react';
import { FormattedCorrespondence } from './Icons';
import AuditFormLayout from './AuditFormLayout';
import { showPromiseToast, showErrorToast } from './ToastManager';

interface PMRFloorAdhesiveAuditFormProps {
  module: AuditModule;
  onStatusChange: (adhesiveId: string, status: FloorAdhesiveStatus) => void;
  onPhotoChange: (adhesiveId: string, photo_base64: string | null) => void;
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


const PMRFloorAdhesiveAuditForm: React.FC<PMRFloorAdhesiveAuditFormProps> = ({ module, onStatusChange, onPhotoChange, onBack, onReset, onCommentChange }) => {
  const pmrData = module.data as PMRFloorAdhesiveData;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentAdhesiveId = useRef<string | null>(null);

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
                      className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
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
                      className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
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
                        className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
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

                <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700 flex items-center gap-4">
                    {adhesive.photo_base64 ? (
                        <div className="relative group">
                            <img src={adhesive.photo_base64} alt="Aperçu de l'adhésif" className="w-16 h-16 rounded-md object-cover shadow-sm" />
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                <button
                                    onClick={() => onPhotoChange(adhesive.id, null)}
                                    className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700"
                                    aria-label="Supprimer la photo"
                                    title="Supprimer la photo"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : null}
                    <button
                        onClick={() => handlePhotoUploadClick(adhesive.id)}
                        className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 active:scale-95 whitespace-nowrap ${
                            adhesive.photo_base64
                            ? 'bg-white text-indigo-700 ring-1 ring-inset ring-indigo-500 hover:bg-indigo-50 dark:bg-slate-700/50 dark:text-indigo-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                            : 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
                        }`}
                    >
                        <Camera className="w-5 h-5 mr-2" />
                        {adhesive.photo_base64 ? 'Modifier la photo' : 'Ajouter une photo'}
                    </button>
                </div>
              </li>
            );
          })}
        </ul>
      </AuditFormLayout>
    </>
  );
};

export default PMRFloorAdhesiveAuditForm;