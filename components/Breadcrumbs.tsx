
import React from 'react';
import { Lieu, AuditModule, AuditModuleType, Station, Direction, DAT, Pr, Equipment, ECA, PrZone } from '../types';
import { Home, ChevronRight } from 'lucide-react';
import { FormattedCorrespondence } from './Icons';

interface BreadcrumbsProps {
  isStatsPage?: boolean;
  lieu?: Lieu | null;
  module?: AuditModule | null;
  // DAT props
  station?: Station | null;
  direction?: Direction | null;
  dat?: DAT | null;
  // P+R props
  prZone?: PrZone | null;
  equipment?: Equipment | null;
  // ECA props
  eca?: ECA | null;
  onNavigate: (level: 'home' | 'lieu' | 'module' | 'station' | 'direction') => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = (props) => {
    const { isStatsPage, lieu, module, station, direction, dat, prZone, equipment, eca, onNavigate } = props;
    const isTramLieu = lieu?.modules.some(m => m.line === 'TRAM');

    return (
        <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse flex-wrap">
                <li className="inline-flex items-center">
                    <button
                        onClick={() => onNavigate('home')}
                        className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
                    >
                        <Home className="w-4 h-4 me-2.5" />
                        Accueil
                    </button>
                </li>
                
                {isStatsPage && (
                    <li aria-current="page">
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">Cockpit</span>
                        </div>
                    </li>
                )}

                {lieu && !isStatsPage && (
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <button onClick={() => onNavigate('lieu')} disabled={!module} className={`ms-1 text-sm font-medium ${module ? 'text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                                {lieu.name}
                            </button>
                        </div>
                    </li>
                )}

                {module && !isStatsPage && (
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <button 
                                onClick={() => onNavigate('module')} 
                                disabled={module.type === AuditModuleType.DAT ? !station : !prZone && !equipment && !eca} 
                                className={`ms-1 text-sm font-medium ${station || prZone || equipment || eca ? 'text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-500 dark:text-gray-500'}`}
                            >
                                {module.name}
                            </button>
                        </div>
                    </li>
                )}

                {/* --- DAT & SIGNALETIQUE Specific Breadcrumbs --- */}
                {(module?.type === AuditModuleType.DAT || module?.type === AuditModuleType.SIGNALETIQUE) && station && !isStatsPage && station.name.trim() !== lieu?.name.trim() && (
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <button onClick={() => onNavigate('station')} disabled={!direction} className={`ms-1 text-sm font-medium ${direction ? 'text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                                {station.name}
                            </button>
                        </div>
                    </li>
                )}
                {(module?.type === AuditModuleType.DAT || module?.type === AuditModuleType.SIGNALETIQUE || (isTramLieu && !module)) && direction && !isStatsPage && (
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <button onClick={() => onNavigate('direction')} disabled={!dat && module?.type !== AuditModuleType.SIGNALETIQUE && !!module} className={`ms-1 text-sm font-medium ${(dat || module?.type === AuditModuleType.SIGNALETIQUE || !module) ? 'text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                                {direction.name}
                            </button>
                        </div>
                    </li>
                )}
                {module?.type === AuditModuleType.DAT && dat && !isStatsPage && (
                    <li aria-current="page">
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">{dat.name}</span>
                        </div>
                    </li>
                )}

                {/* --- P+R Specific Breadcrumbs --- */}
                {module?.type === AuditModuleType.PR && prZone && !isStatsPage && (
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <button onClick={() => onNavigate('module')} disabled={!equipment} className={`ms-1 text-sm font-medium ${equipment ? 'text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                                {prZone.name}
                            </button>
                        </div>
                    </li>
                )}
                {module?.type === AuditModuleType.PR && equipment && !isStatsPage && (
                     <li aria-current="page">
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">{equipment.name}</span>
                        </div>
                    </li>
                )}

                {/* --- ECA Specific Breadcrumbs --- */}
                {module?.type === AuditModuleType.ECA && eca && !isStatsPage && (
                     <li aria-current="page">
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <FormattedCorrespondence
                                text={eca.name}
                                className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400"
                            />
                        </div>
                    </li>
                )}

            </ol>
        </nav>
    );
};