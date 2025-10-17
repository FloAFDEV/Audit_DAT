import React, { useMemo } from 'react';
import { AuditModule, FloorAdhesiveStatus, PMRFloorAdhesiveData } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';
import { FormattedCorrespondence } from './Icons';
import AuditFormLayout from './AuditFormLayout';

interface PMRFloorAdhesiveAuditFormProps {
  module: AuditModule;
  onStatusChange: (adhesiveId: string, status: FloorAdhesiveStatus) => void;
  onBack: () => void;
  onReset: () => void;
  onCommentChange: (comment: string) => void;
}

const PMRFloorAdhesiveAuditForm: React.FC<PMRFloorAdhesiveAuditFormProps> = ({ module, onStatusChange, onBack, onReset, onCommentChange }) => {
  const pmrData = module.data as PMRFloorAdhesiveData;

  const progress = useMemo(() => {
    const total = pmrData.adhesives.length;
    if (total === 0) return 0;
    const checked = pmrData.adhesives.filter(s => s.status !== FloorAdhesiveStatus.NotChecked).length;
    return (checked / total) * 100;
  }, [pmrData.adhesives]);

  return (
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
      resetConfirmMessage={`Êtes-vous sûr de vouloir réinitialiser les vérifications pour la station ${pmrData.stationName} ?`}
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
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </AuditFormLayout>
  );
};

export default PMRFloorAdhesiveAuditForm;