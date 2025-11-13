import React from 'react';
import { AuditModule, Pr, PrZone, Lieu } from '../types';
import { ArrowLeft, ChevronRight, MapPin, Building, Navigation2, Users } from 'lucide-react';
import { getPrZoneProgress } from '../utils/progressCalculators';
import { LieuBadges } from './Icons';

interface PrZoneSelectorProps {
  lieu: Lieu;
  module: AuditModule;
  onSelectZone: (zoneId: string) => void;
  onBack: () => void;
}

// Helper function to get a descriptive icon for a P+R zone
const getZoneIcon = (zone: PrZone) => {
    const name = zone.name.toLowerCase();
    const iconProps = { className: "w-6 h-6" };

    if (name.includes('silo')) return <div className="p-3 bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 rounded-lg"><Building {...iconProps} /></div>;
    if (name.includes('nord')) return <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg"><Navigation2 {...iconProps} /></div>;
    if (name.includes('sud')) return <div className="p-3 bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300 rounded-lg"><Navigation2 {...iconProps} style={{ transform: 'rotate(180deg)' }} /></div>;
    if (name.includes('est')) return <div className="p-3 bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300 rounded-lg"><Navigation2 {...iconProps} style={{ transform: 'rotate(90deg)' }} /></div>;
    if (name.includes('ouest')) return <div className="p-3 bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg"><Navigation2 {...iconProps} style={{ transform: 'rotate(-90deg)' }} /></div>;
    if (name.includes('cov')) return <div className="p-3 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-lg"><Users {...iconProps} /></div>;

    const numberMatch = name.match(/\d+/);
    if (numberMatch) {
        return (
            <div className="flex-shrink-0 flex items-center justify-center rounded-lg font-bold shadow-sm w-12 h-12 text-lg bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300">
                {numberMatch[0]}
            </div>
        );
    }
    
    // Fallback
    return <div className="p-3 bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 rounded-lg"><MapPin {...iconProps} /></div>;
};

const PrZoneSelector: React.FC<PrZoneSelectorProps> = ({ lieu, module, onSelectZone, onBack }) => {
    const prData = module.data as Pr;

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onBack} 
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors" 
                    aria-label="Retour"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <LieuBadges lieu={lieu} />
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{prData.name}</h2>
                    </div>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Sélectionner une zone de parking</p>
                </div>
            </div>
            <div className="space-y-4">
                {prData.zones.map(zone => {
                    const progress = getPrZoneProgress(zone);
                    const isComplete = progress === 100;
                    const isInProgress = progress > 0 && !isComplete;
                    const progressBarColor = isInProgress ? 'bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';

                    return (
                        <button
                            key={zone.id}
                            onClick={() => onSelectZone(zone.id)}
                            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-75 w-full text-left group dark:ring-1 dark:ring-slate-700/50 dark:hover:ring-slate-600"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {getZoneIcon(zone)}
                                    <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{zone.name}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-500 group-hover:text-gray-800 dark:group-hover:text-slate-300 transition-colors" />
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-medium ${isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                        {isComplete ? 'Terminé' : 'Progression'}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                    <div className={`${progressBarColor} h-2 rounded-full`} style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PrZoneSelector;