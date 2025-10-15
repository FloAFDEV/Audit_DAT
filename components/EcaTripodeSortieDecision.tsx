import React from 'react';
import { AuditModule, ECA } from '../types';
import { ArrowLeft, Check, Edit3 } from 'lucide-react';
import { LineIcon } from './LineIcon';
import { FormattedCorrespondence } from './Icons';

interface EcaTripodeSortieDecisionProps {
  module: AuditModule;
  eca: ECA;
  stationName: string;
  onBack: () => void;
  onConfirmNA: () => void;
  onAudit: () => void;
}

const EcaTripodeSortieDecision: React.FC<EcaTripodeSortieDecisionProps> = ({
  module,
  eca,
  stationName,
  onBack,
  onConfirmNA,
  onAudit,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 shadow-lg rounded-xl overflow-hidden max-w-2xl mx-auto">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="p-2 mt-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Retour"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
              <FormattedCorrespondence text={eca.name} />
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <LineIcon module={module} size="sm" />
              <p className="text-gray-600 dark:text-slate-400 text-sm">
                <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {stationName} &bull; <span className="font-semibold text-gray-800 dark:text-slate-200">Accès :</span> {eca.accessPoint}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 border-t border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-slate-100">Cet équipement est un tripode de sortie.</h3>
        <p className="text-center text-gray-600 dark:text-slate-400 mt-2">
          La plupart des tripodes de sortie ne possèdent pas d'adhésifs. Confirmez-vous que c'est le cas pour cet équipement, ou s'agit-il du cas spécial à auditer ?
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onConfirmNA}
            className="w-full flex flex-col items-center justify-center p-6 text-center rounded-lg bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-all duration-200 transform hover:scale-105"
          >
            <Check className="w-10 h-10 mb-3" />
            <span className="text-lg font-semibold">Valider (sans adhésifs)</span>
            <span className="text-sm text-teal-100 mt-1">Marquer comme terminé et passer au suivant.</span>
          </button>
          <button
            onClick={onAudit}
            className="w-full flex flex-col items-center justify-center p-6 text-center rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 shadow-lg ring-1 ring-inset ring-gray-200 dark:ring-slate-600 hover:ring-indigo-500 dark:hover:ring-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200 transform hover:scale-105"
          >
            <Edit3 className="w-10 h-10 mb-3 text-indigo-500 dark:text-indigo-400" />
            <span className="text-lg font-semibold">Auditer les adhésifs</span>
            <span className="text-sm text-gray-500 dark:text-slate-400 mt-1">Procéder à l'audit (cas spécial).</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EcaTripodeSortieDecision;