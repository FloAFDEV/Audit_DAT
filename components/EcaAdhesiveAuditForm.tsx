import React, { useMemo, useState } from 'react';
import { ECA, AdhesiveStatus, AuditModule, Adhesive } from '../types';
import { getEcaAdhesives } from '../data/adhesives';
import { CheckCircle2, XCircle, AlertTriangle, ArrowLeft, DatabaseBackup, Ban, MapPin } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LineIcon } from './LineIcon';
import { FormattedCorrespondence } from './Icons';
import { isPmrEcaType } from '../data/eca_data';
import { getEcaProgress } from '../utils/progressCalculators';

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
  
  const progressData = useMemo(() => getEcaProgress(eca), [eca]);

  const progress = progressData.percentage;
  const isComplete = progressData.isComplete;
  const isInProgress = progress > 0 && !isComplete;
  const progressBarColor = isInProgress ? 'bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';

  const { groups, ungrouped } = useMemo(() => {
    const grouped: Record<string, { groupName?: string; adhesives: Adhesive[] }> = {};
    const individual: Adhesive[] = [];
    
    adhesives.forEach(ad => {
        if (ad.groupId) {
            if (!grouped[ad.groupId]) {
                grouped[ad.groupId] = { groupName: ad.groupName, adhesives: [] };
            }
            grouped[ad.groupId].adhesives.push(ad);
        } else {
            individual.push(ad);
        }
    });
    
    return { groups: grouped, ungrouped: individual };
  }, [adhesives]);

  const renderAdhesiveItem = (adhesive: Adhesive) => {
    const currentStatus = eca.adhesives[adhesive.id];
    const isPmrPictogram = adhesive.groupId === 'pmr-pictogram';

    const [dimensions, location] = useMemo(() => {
        if (!adhesive.description) return [null, null];
        const parts = adhesive.description.split('|');
        if (parts.length > 1) {
            return [parts[0].trim(), parts.slice(1).join('|').trim()];
        }
        // Fallback for descriptions without a separator
        return [null, adhesive.description];
    }, [adhesive.description]);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {adhesive.name}
                    {dimensions && (
                        <span className="text-base font-normal text-gray-400 dark:text-slate-500 ml-2">
                            // <span className="font-bold text-gray-600 dark:text-slate-400">{dimensions}</span>
                        </span>
                    )}
                </h3>
                {location && (
                    <div className="flex items-start text-sm text-gray-500 dark:text-slate-400 mt-2">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                        <span>{location}</span>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 sm:mt-0 sm:ml-6 sm:flex sm:flex-wrap sm:gap-3">
            <button
              onClick={() => onStatusChange(adhesive.id, currentStatus === AdhesiveStatus.OK ? AdhesiveStatus.NotChecked : AdhesiveStatus.OK)}
              className={`sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
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
              className={`sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
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
              className={`sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
                currentStatus === AdhesiveStatus.ToBeReplaced
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white text-orange-600 ring-1 ring-inset ring-orange-500 hover:bg-orange-50 dark:bg-slate-700/50 dark:text-orange-300 dark:ring-slate-600 dark:hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              A remplacer
            </button>
            {isPmrPictogram && (
              <button
                onClick={() => onStatusChange(adhesive.id, currentStatus === AdhesiveStatus.NotApplicable ? AdhesiveStatus.NotChecked : AdhesiveStatus.NotApplicable)}
                className={`sm:flex-initial flex items-center justify-center px-2.5 py-1.5 whitespace-nowrap text-sm font-medium rounded-md transition-all duration-200 active:scale-95 ${
                  currentStatus === AdhesiveStatus.NotApplicable
                    ? 'bg-slate-500 text-white shadow-sm dark:bg-slate-600'
                    : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-400 hover:bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300 dark:ring-slate-500 dark:hover:bg-slate-700'
                }`}
              >
                <Ban className="w-5 h-5 mr-2" />
                Non applicable
              </button>
            )}
          </div>
        </div>
    );
  };


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
                        <FormattedCorrespondence text={module.name} />
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                        <LineIcon module={module} size="sm" />
                        <p className="text-gray-600 dark:text-slate-400 text-sm">
                            <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {stationName} &bull; <span className="font-semibold text-gray-800 dark:text-slate-200">Équipement :</span> <FormattedCorrespondence text={eca.name} />
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
                  <div className={`${progressBarColor} h-2 rounded-full transition-all duration-300`} style={{ width: `${progress}%` }}></div>
              </div>
          </div>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
        {ungrouped.map(adhesive => (
            <li key={adhesive.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {renderAdhesiveItem(adhesive)}
            </li>
        ))}
        {/* FIX: Replaced `Object.entries` with `Object.keys` to ensure proper type inference for `groupData`. This resolves the "property does not exist on type 'unknown'" error. */}
        {Object.keys(groups).map((groupId) => {
          const groupData = groups[groupId];
          return (
            <li key={groupId} className="p-6 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="mb-4 bg-slate-100 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{groupData.groupName || 'Groupe'}</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Un ou plusieurs pictogrammes peuvent être présents. Marquez comme 'Non applicable' ceux qui ne sont pas nécessaires pour cet équipement.</p>
                </div>
                <div className="space-y-6">
                    {groupData.adhesives.map(adhesive => (
                        <div key={adhesive.id}>
                            {renderAdhesiveItem(adhesive)}
                        </div>
                    ))}
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