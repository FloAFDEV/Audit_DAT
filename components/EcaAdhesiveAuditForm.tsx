

import React, { useMemo, useState } from 'react';
import { ECA, AdhesiveStatus, AuditModule } from '../types';
import { getEcaAdhesives } from '../data/adhesives';
import { CheckCircle2, XCircle, AlertTriangle, ArrowLeft, DatabaseBackup } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LineIcon } from './LineIcon';
import { FormattedCorrespondence } from './Icons';
import { isPmrEcaType } from '../data/eca_data';

interface EcaAdhesiveAuditFormProps {
  module: AuditModule;
  eca: ECA;
  stationName: string;
  onStatusChange: (adhesiveId: string, status: AdhesiveStatus) => void;
  onBack: () => void;
  onCommentChange: (comment: string) => void;
  onReset: () => void;
}

const EcaAdhesiveAuditForm: React.FC<EcaAdhesiveAuditFormProps> = ({ module, eca, stationName, onStatusChange, onBack, onCommentChange, onReset }) => {
  const adhesives = getEcaAdhesives(eca.type);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const isPmr = isPmrEcaType(eca.type);
  
  const progress = useMemo(() => {
    const statuses = Object.values(eca.adhesives);
    if (adhesives.length === 0) return 0;
    const checked = statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
    return (checked / adhesives.length) * 100;
  }, [eca, adhesives]);

  return (
    <div className="bg-white dark:bg-slate-800 shadow-lg rounded-xl overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
                <button
                    onClick={onBack}
                    className="p-2 mt-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label="Retour"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                        Audit pour <FormattedCorrespondence text={eca.name} useLogos={isPmr && eca.name.includes('->')} />
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                        <LineIcon module={module} size="sm" />
                        <p className="text-gray-600 dark:text-slate-400 text-sm">
                            <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {stationName} &bull; <span className="font-semibold text-gray-800 dark:text-slate-200">Accès :</span> {eca.accessPoint}
                        </p>
                    </div>
                </div>
            </div>
             <button
                onClick={() => setShowResetConfirm(true)}
                className="self-start sm:ml-4 flex-shrink-0 flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                title={`Réinitialiser l'audit pour ${eca.name}`}
                aria-label={`Réinitialiser l'audit pour ${eca.name}`}
            >
                <DatabaseBackup className="h-4 w-4" />
                <span>Réinitialiser</span>
            </button>
        </div>
         <div className="mt-4 pl-0 sm:pl-16">
              <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Progression</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-teal-500 dark:bg-teal-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
          </div>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
        {adhesives.map((adhesive) => {
          const currentStatus = eca.adhesives[adhesive.id];
          return (
            <li key={adhesive.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{adhesive.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{adhesive.description}</p>
                </div>
                <div className="flex items-stretch gap-2 mt-4 sm:mt-0 sm:ml-6 sm:flex-wrap sm:gap-3">
                  <button
                    onClick={() => onStatusChange(adhesive.id, currentStatus === AdhesiveStatus.OK ? AdhesiveStatus.NotChecked : AdhesiveStatus.OK)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
                      currentStatus === AdhesiveStatus.OK
                        ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-500'
                        : 'bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    OK
                  </button>
                  <button
                    onClick={() => onStatusChange(adhesive.id, currentStatus === AdhesiveStatus.Absent ? AdhesiveStatus.NotChecked : AdhesiveStatus.Absent)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
                      currentStatus === AdhesiveStatus.Absent
                        ? 'bg-red-600 text-white shadow-sm dark:bg-red-500'
                        : 'bg-white text-red-700 ring-1 ring-inset ring-red-600 hover:bg-red-50 dark:bg-slate-700/50 dark:text-red-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                    }`}
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Absent
                  </button>
                  <button
                    onClick={() => onStatusChange(adhesive.id, currentStatus === AdhesiveStatus.ToBeReplaced ? AdhesiveStatus.NotChecked : AdhesiveStatus.ToBeReplaced)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
                      currentStatus === AdhesiveStatus.ToBeReplaced
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white text-orange-600 ring-1 ring-inset ring-orange-500 hover:bg-orange-50 dark:bg-slate-700/50 dark:text-orange-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    A remplacer
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      
      <div className="p-6 border-t border-gray-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Commentaires</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Remarques ou des détails sur l'incident si nécessaire.</p>
          <textarea
              rows={4}
              className="block w-full rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 text-base text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 leading-6"
              placeholder="Ajouter un commentaire..."
              value={eca.comment || ''}
              onChange={(e) => onCommentChange(e.target.value)}
          />
      </div>
      <ConfirmationModal
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          onConfirm={() => { onReset(); setShowResetConfirm(false); }}
          title="Réinitialiser le valideur"
          message={`Êtes-vous sûr de vouloir réinitialiser toutes les vérifications pour ${eca.name} ?\n\nStation : ${stationName}\nAccès : ${eca.accessPoint}`}
          icon={<LineIcon module={module} size="sm" />}
          isDestructive
      />
    </div>
  );
};

export default EcaAdhesiveAuditForm;