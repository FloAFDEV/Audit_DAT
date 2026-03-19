import React from 'react';
import { Lieu, ModeData, Direction, AuditModuleType } from '../types';
import { ArrowLeft, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { LineIcon } from './LineIcon';

interface TramDirectionSelectorProps {
  lieu: Lieu;
  onSelectStation: (stationId: string) => void;
  onSelectDirection: (directionId: string) => void;
  onBack: () => void;
}

const TramDirectionSelector: React.FC<TramDirectionSelectorProps> = ({ lieu, onSelectStation, onSelectDirection, onBack }) => {
    // Get the first TRAM or AEROPORT DAT module — not just modules[0], which could be
    // a Métro module at shared lieux (e.g., Palais de Justice, Arènes).
    // AEROPORT (LAE) stations use the same TramDirectionSelector flow as T1.
    const firstModule = lieu.modules.find(m => (m.line === 'TRAM' || m.line === 'AEROPORT') && m.type === AuditModuleType.DAT)
        ?? lieu.modules.find(m => m.line === 'TRAM' || m.line === 'AEROPORT')
        ?? lieu.modules[0];
    const modeData = firstModule.data as ModeData;
    const station = modeData.stations[0];

    const handleSelectDirection = (directionId: string) => {
        onSelectStation(station.id);
        onSelectDirection(directionId);
    };

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors" aria-label="Retour">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3">
                    <LineIcon module={firstModule} size="md" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{station.name}</h2>
                        <p className="text-gray-500 dark:text-slate-400">Sélectionner une direction</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {station.directions.map(direction => (
                    <button
                        key={direction.id}
                        onClick={() => handleSelectDirection(direction.id)}
                        className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-75 w-full text-left group dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <ArrowRightLeft className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900 dark:text-slate-100">{direction.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Accéder aux audits pour cette direction</p>
                                </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-300 transition-colors" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TramDirectionSelector;
