import React, { useMemo } from 'react';
import { DAT, AdhesiveStatus, Station, Direction, AuditModule } from '../types';
import { ADHESIVES } from '../data/adhesives';
import { CheckCircle2, XCircle, AlertTriangle, MapPin } from 'lucide-react';
import { DatIcon } from './DatIcon';
import AuditFormLayout from './AuditFormLayout';

interface AdhesiveAuditFormProps {
  module: AuditModule;
  dat: DAT;
  station: Station;
  direction: Direction;
  onStatusChange: (adhesiveId: string, status: AdhesiveStatus) => void;
  onBack: () => void;
  onCommentChange: (comment: string) => void;
  onReset: () => void;
}

const AdhesiveAuditForm: React.FC<AdhesiveAuditFormProps> = ({ module, dat, station, direction, onStatusChange, onBack, onCommentChange, onReset }) => {
  const directionName = useMemo(() => direction.name.replace(/^Direction\s/i, ''), [direction.name]);

  const progress = useMemo(() => {
    const statuses = Object.values(dat.adhesives);
    const total = ADHESIVES.length;
    if (total === 0) return 0;
    const checked = statuses.filter(s => s !== AdhesiveStatus.NotChecked).length;
    return (checked / total) * 100;
  }, [dat.adhesives]);

  return (
    <AuditFormLayout
      module={module}
      customIcon={<DatIcon dat={dat} size="md" />}
      title={`Audit pour ${dat.name}`}
      subtitle={
        <p className="text-gray-600 dark:text-slate-400 text-sm">
          <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {station.name} &bull; <span className="font-semibold text-gray-800 dark:text-slate-200">Direction :</span> {directionName}
        </p>
      }
      progress={progress}
      onBack={onBack}
      onReset={onReset}
      resetConfirmTitle="Réinitialiser le DAT"
      resetConfirmMessage={`Êtes-vous sûr de vouloir réinitialiser toutes les vérifications pour ${dat.name} ?\n\nStation : ${station.name}\nDirection : ${directionName}`}
      comment={dat.comment}
      onCommentChange={onCommentChange}
    >
      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
        {ADHESIVES.map((adhesive) => {
          const currentStatus = dat.adhesives[adhesive.id];
           const [dimensions, location] = (() => {
                if (!adhesive.description) return [null, null];
                const parts = adhesive.description.split('|');
                if (parts.length > 1) {
                    const dimPart = parts[0].replace('Dimensions:', '').trim();
                    const locPart = parts.slice(1).join('|').replace('Localisation:', '').trim();
                    return [dimPart, locPart];
                }
                return [null, adhesive.description];
            })();
          return (
            <li key={adhesive.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                <div className="flex-shrink-0 flex items-center flex-wrap justify-start sm:justify-end gap-3">
                  <button
                    onClick={() => onStatusChange(adhesive.id, currentStatus === AdhesiveStatus.OK ? AdhesiveStatus.NotChecked : AdhesiveStatus.OK)}
                    className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 active:scale-95 whitespace-nowrap ${
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
                    className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 active:scale-95 whitespace-nowrap ${
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
                    className={`flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 active:scale-95 whitespace-nowrap ${
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

export default AdhesiveAuditForm;