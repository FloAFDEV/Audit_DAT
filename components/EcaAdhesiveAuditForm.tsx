import React, { useMemo } from 'react';
import { ECA, AdhesiveStatus, AuditModule, Adhesive } from '../types';
import { getEcaAdhesives } from '../data/adhesives';
import { CheckCircle2, XCircle, AlertTriangle, Ban, MapPin } from 'lucide-react';
import { FormattedCorrespondence } from './Icons';
import { getEcaProgress } from '../utils/progressCalculators';
import AuditFormLayout from './AuditFormLayout';

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
  
  const progressData = useMemo(() => getEcaProgress(eca), [eca]);
  const progress = progressData.percentage;

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
    <AuditFormLayout
      module={module}
      title={<FormattedCorrespondence text={module.name} />}
      subtitle={
        <p className="text-gray-600 dark:text-slate-400 text-sm">
            <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {stationName} &bull; <span className="font-semibold text-gray-800 dark:text-slate-200">Équipement :</span> <FormattedCorrespondence text={eca.name} />
        </p>
      }
      progress={progress}
      onBack={onBack}
      onReset={onReset}
      resetConfirmTitle="Réinitialiser le valideur"
      resetConfirmMessage={`Êtes-vous sûr de vouloir réinitialiser toutes les vérifications pour ${eca.name} ?\n\nStation : ${stationName}\nAccès : ${eca.accessPoint}`}
      comment={eca.comment}
      onCommentChange={onCommentChange}
    >
      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
        {ungrouped.map(adhesive => (
            <li key={adhesive.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {renderAdhesiveItem(adhesive)}
            </li>
        ))}
        {Object.keys(groups).map((groupId) => {
          const groupData = groups[groupId]!;
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
    </AuditFormLayout>
  );
};

export default EcaAdhesiveAuditForm;