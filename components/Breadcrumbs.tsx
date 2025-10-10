import React from 'react';
import { Lieu, AuditModule, AuditModuleType, Station, Direction, DAT, Pr, Equipment, ECA } from '../types';
import { Home, ChevronRight } from 'lucide-react';

interface BreadcrumbsProps {
  lieu?: Lieu | null;
  module?: AuditModule | null;
  // DAT props
  station?: Station | null;
  direction?: Direction | null;
  dat?: DAT | null;
  // P+R props
  equipment?: Equipment | null;
  // ECA props
  eca?: ECA | null;
  onNavigate: (level: 'home' | 'lieu' | 'module' | 'station' | 'direction') => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = (props) => {
    const { lieu, module, station, direction, dat, equipment, eca, onNavigate } = props;

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

                {lieu && (
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <button onClick={() => onNavigate('lieu')} disabled={!module} className={`ms-1 text-sm font-medium ${module ? 'text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                                {lieu.name}
                            </button>
                        </div>
                    </li>
                )}

                {module && (
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <button 
                                onClick={() => onNavigate('module')} 
                                disabled={module.type === AuditModuleType.DAT ? !station : !equipment && !eca} 
                                className={`ms-1 text-sm font-medium ${station || equipment || eca ? 'text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-500 dark:text-gray-500'}`}
                            >
                                {module.name}
                            </button>
                        </div>
                    </li>
                )}

                {/* --- DAT Specific Breadcrumbs --- */}
                {module?.type === AuditModuleType.DAT && station && (
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <button onClick={() => onNavigate('station')} disabled={!direction} className={`ms-1 text-sm font-medium ${direction ? 'text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                                {station.name}
                            </button>
                        </div>
                    </li>
                )}
                {module?.type === AuditModuleType.DAT && direction && (
                    <li>
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <button onClick={() => onNavigate('direction')} disabled={!dat} className={`ms-1 text-sm font-medium ${dat ? 'text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                                {direction.name}
                            </button>
                        </div>
                    </li>
                )}
                {module?.type === AuditModuleType.DAT && dat && (
                    <li aria-current="page">
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">{dat.name}</span>
                        </div>
                    </li>
                )}

                {/* --- P+R Specific Breadcrumbs --- */}
                {module?.type === AuditModuleType.PR && equipment && (
                     <li aria-current="page">
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">{equipment.name}</span>
                        </div>
                    </li>
                )}

                {/* --- ECA Specific Breadcrumbs --- */}
                {module?.type === AuditModuleType.ECA && eca && (
                     <li aria-current="page">
                        <div className="flex items-center">
                            <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-1" />
                            <span className="ms-1 text-sm font-medium text-gray-500 md:ms-2 dark:text-gray-400">{eca.name}</span>
                        </div>
                    </li>
                )}

            </ol>
        </nav>
    );
};