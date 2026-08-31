

import React from 'react';
import { AuditModule, ModeData, Station, Direction } from '../types';
import { ArrowLeft, ChevronRight, MapPin, ArrowRightLeft, Layout } from 'lucide-react';
import { LineIcon } from './LineIcon';
import { getDirectionProgress } from '../utils/progressCalculators';
import { getProgressColor } from '../utils/progressColor';
import { CategoryIcon } from './CategoryIcon';
import { AUDIT_CATEGORIES } from '../data/config';
import { isModuleInAuditScope } from '../utils/moduleScope';

interface DatGroupSelectorProps {
  module: AuditModule;
  station: Station | null;
  onSelectStation: (stationId: string | null) => void;
  onSelectDirection: (directionId: string) => void;
  onBack: () => void;
  title?: string;
  hideProgress?: boolean;
}

const DirectionName: React.FC<{ name: string }> = ({ name }) => {
    const match = name.match(/(Ligne [A-C])/);

    if (match) {
        const lineFragment = match[1];
        const lineLabel = lineFragment.split(' ')[1];
        const config = AUDIT_CATEGORIES.find(c => c.shortLabel === lineLabel);
        const textPart = name.replace(lineFragment, '').trim();

        return (
            <div className="flex items-center gap-2 text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100">
                <span className="truncate">{textPart}</span>
                {config && <CategoryIcon categoryConfig={config} size="sm" asDiv />}
            </div>
        );
    }

    return <p className="text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100 truncate">{name}</p>;
};


const DatGroupSelector: React.FC<DatGroupSelectorProps> = ({ module, station, onSelectStation, onSelectDirection, onBack, title, hideProgress }) => {
    const modeData = module.data as ModeData;
    const stations = modeData.stations;
    const isTram = module.line === 'TRAM';

    const handleBack = () => {
        const moduleData = module.data as ModeData;
        
        // If we are currently showing directions (station is selected)...
        if (station) {
            // ...and the module contains more than one station, going back should show the station list.
            if (moduleData.stations.length > 1) {
                 onSelectStation(null);
            } else {
                // Otherwise (if only one station), going back should skip the station list and go to the module selector.
                onBack();
            }
        } else {
            // If we are on the station list screen, go back to the module selector.
            onBack();
        }
    };
    
    if (station) {
        return (
            <div>
                 <div className="flex items-center gap-4 mb-8">
                    <button onClick={handleBack} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors" aria-label="Retour">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <LineIcon module={module} size="md" />
                        <div>
                            <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100">{station.name}</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-light">Sélectionner une direction</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <section>
                        {title && <h3 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 ml-1">{title}</h3>}
                        <div className="space-y-4">
                            {station.directions.map(direction => {
                                const progress = getDirectionProgress(direction);
                                const progressBarColor = getProgressColor(progress.percentage);
                                
                                return (
                                    <button
                                        key={direction.id}
                                        onClick={() => onSelectDirection(direction.id)}
                                        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-75 w-full text-left group dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <ArrowRightLeft className="w-5 h-5 text-gray-500 dark:text-slate-400 flex-shrink-0" />
                                                <DirectionName name={direction.name} />
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-300 transition-colors ml-2 flex-shrink-0" />
                                        </div>
                                        {!hideProgress && (
                                            <div className="mt-4">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`text-xs font-medium ${progress.isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                                        {progress.isComplete ? 'Terminé' : 'Progression'}
                                                    </span>
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                                                        {progress.completedCount} / {progress.totalCount} DATs
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                                    <div className="h-2 rounded-full" style={{ width: `${progress.percentage}%`, backgroundColor: progressBarColor }}></div>
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors" aria-label="Retour">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <LineIcon module={module} size="md" />
                    <div>
                        <h2 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-100">{module.name} - {modeData.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-light">Sélectionner une station</p>
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                {stations.map(s => {
                    // Règle métier canonique (utils/moduleScope.ts), partagée avec les
                    // moteurs de calcul du Cockpit : une station future reste dans le
                    // périmètre auditable uniquement pour les lignes C et AEROPORT.
                    const outOfScope = !isModuleInAuditScope({ isFuture: s.isFuture, line: module.line });
                    return (
                     <button
                        key={s.id}
                        onClick={() => onSelectStation(s.id)}
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-75 w-full text-left group dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600"
                        disabled={outOfScope}
                    >
                         <div className={`flex items-center justify-between ${outOfScope ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-lg">
                                    <MapPin className="w-6 h-6 text-gray-600 dark:text-slate-300" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100">{s.name}</p>
                                    {s.isFuture && <p className="text-sm font-light text-slate-500 dark:text-slate-400">{!outOfScope ? 'Audit prévisionnel' : 'Bientôt disponible'}</p>}
                                </div>
                            </div>
                            {!outOfScope && <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-300 transition-colors" />}
                        </div>
                    </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DatGroupSelector;