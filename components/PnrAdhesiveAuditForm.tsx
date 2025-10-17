import React, { useMemo } from 'react';
import { Equipment, AdhesiveStatus, AuditModule, EquipmentType } from '../types';
import { getPrAdhesives } from '../data/adhesives';
import { MapPin, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import AuditFormLayout from './AuditFormLayout';

interface PrAdhesiveAuditFormProps {
  module: AuditModule;
  equipment: Equipment;
  prName: string;
  onStatusChange: (adhesiveId: string, status: AdhesiveStatus) => void;
  onBack: () => void;
  onCommentChange: (comment: string) => void;
  onReset: () => void;
}

const PrAdhesiveAuditForm: React.FC<PrAdhesiveAuditFormProps> = ({ module, equipment, prName, onStatusChange, onBack, onCommentChange, onReset }) => {
    const adhesives = getPrAdhesives(equipment.type);
    
    const equipmentLabel = useMemo(() => {
        return equipment.type === EquipmentType.CA ? 'la caisse' : 'la borne';
    }, [equipment.type]);
    
    const progress = useMemo(() => {
        const statuses = Object.values(equipment.adhesives);
        const total = adhesives.length;
        if (total === 0) return 0;
        const checked = statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
        return (checked / total) * 100;
    }, [equipment.adhesives, adhesives.length]);

  return (
    <AuditFormLayout
      module={module}
      title={`Audit pour ${equipment.name}`}
      subtitle={
        <p className="text-gray-600 dark:text-slate-400 text-sm">
            {prName} &bull; <span className="font-semibold text-gray-800 dark:text-slate-200">Type :</span> {equipment.type}
        </p>
      }
      progress={progress}
      onBack={onBack}
      onReset={onReset}
      resetConfirmTitle={`Réinitialiser ${equipmentLabel}`}
      resetConfirmMessage={`Êtes-vous sûr de vouloir réinitialiser toutes les vérifications pour ${equipment.name} ?\n\nP+R : ${prName}\nType : ${equipment.type}`}
      comment={equipment.comment}
      onCommentChange={onCommentChange}
    >
      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
        {adhesives.map((adhesive) => {
          const currentStatus = equipment.adhesives[adhesive.id] || AdhesiveStatus.NotChecked;
            const [descText, dimensions] = (() => {
                if (!adhesive.description) return [null, null];
                const parts = adhesive.description.split('//');
                if (parts.length > 1) {
                    return [parts[0].trim(), parts.slice(1).join('//').trim()];
                }
                return [adhesive.description, null];
            })();
          return (
            <li key={adhesive.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                   {descText && <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{descText}</p>}
                  <div className="flex items-start text-sm text-gray-500 dark:text-slate-400 mt-2">
                    <MapPin className="w-4 h-4 mr-2 mt-1 text-gray-400 flex-shrink-0" />
                    <span>{adhesive.location}</span>
                  </div>
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
    </AuditFormLayout>
  );
};

export default PrAdhesiveAuditForm;