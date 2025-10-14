import React, { useMemo, useState } from 'react';
import { AuditModule, FloorAdhesiveStatus, PMRFloorAdhesiveData } from '../types';
import { CheckCircle2, XCircle, ArrowLeft, DatabaseBackup, ArrowRight } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LineIcon } from './LineIcon';
import { AUDIT_CATEGORIES } from '../data/config';

interface PMRFloorAdhesiveAuditFormProps {
  module: AuditModule;
  onStatusChange: (adhesiveId: string, status: FloorAdhesiveStatus) => void;
  onBack: () => void;
  onReset: () => void;
}

const PMRFloorAdhesiveAuditForm: React.FC<PMRFloorAdhesiveAuditFormProps> = ({ module, onStatusChange, onBack, onReset }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const pmrData = module.data as PMRFloorAdhesiveData;

  const progress = useMemo(() => {
    const total = pmrData.adhesives.length;
    if (total === 0) return 0;
    const checked = pmrData.adhesives.filter(s => s.status !== FloorAdhesiveStatus.NotChecked).length;
    return (checked / total) * 100;
  }, [pmrData.adhesives]);

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
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{module.name}</h2>
                    <div className="flex items-center gap-3 mt-2">
                        <LineIcon module={module} size="sm" />
                        <p className="text-gray-600 dark:text-slate-400 text-sm">
                            <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {pmrData.stationName}
                        </p>
                    </div>
                </div>
            </div>
             <button
                onClick={() => setShowResetConfirm(true)}
                className="self-start sm:ml-4 flex-shrink-0 flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                title={`Réinitialiser l'audit`}
                aria-label={`Réinitialiser l'audit`}
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
                  <div className="bg-teal-400 dark:bg-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
          </div>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
        {pmrData.adhesives.map((adhesive) => {
          const currentStatus = adhesive.status;
          const match = adhesive.name.match(/Correspondance ([A-Z])->([A-Z])/);
          const fromConfig = match ? AUDIT_CATEGORIES.find(c => c.shortLabel === match[1]) : undefined;
          const toConfig = match ? AUDIT_CATEGORIES.find(c => c.shortLabel === match[2]) : undefined;

          return (
            <li key={adhesive.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{adhesive.name}</h3>
                      {match && fromConfig && toConfig && (
                          <div className="flex items-center gap-1.5">
                              <span
                                  className="w-4 h-4 rounded-full shadow-sm border border-black/10 dark:border-white/10"
                                  style={{ backgroundColor: fromConfig.colors.badgeBg }}
                                  title={`Ligne ${match[1]}`}
                              ></span>
                              <ArrowRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                              <span
                                  className="w-4 h-4 rounded-full shadow-sm border border-black/10 dark:border-white/10"
                                  style={{ backgroundColor: toConfig.colors.badgeBg }}
                                  title={`Ligne ${match[2]}`}
                              ></span>
                          </div>
                      )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Vérifier la présence et l'état de l'adhésif de signalisation au sol.</p>
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
      <ConfirmationModal
          isOpen={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          onConfirm={() => { onReset(); setShowResetConfirm(false); }}
          title="Réinitialiser l'audit PMR au Sol"
          message={`Êtes-vous sûr de vouloir réinitialiser les vérifications pour la station ${pmrData.stationName} ?`}
          icon={<LineIcon module={module} size="sm" />}
          isDestructive
      />
    </div>
  );
};

export default PMRFloorAdhesiveAuditForm;