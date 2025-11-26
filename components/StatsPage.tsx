
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ArrowLeft, Car, Euro, Fence, ScanEye, Search, Footprints, MapPin, Building, AlertTriangle, History, Calendar, Trash2, Archive, X, Filter } from 'lucide-react';
import { Lieu, MaintenanceItem, HistoryEntry, AuditModule, ModeData, AuditModuleType } from '../types';
import { useStats } from '../hooks/useStats';
import { AUDIT_CATEGORIES } from '../data/config';
import { CategoryIcon } from './CategoryIcon';
import MaintenanceListModal from './MaintenanceListModal';
import { Logo } from './Logo';
import { db } from '../db'; // Access history DB
import ConfirmationModal from './ConfirmationModal';
import { generateMaintenanceSummary } from '../utils/maintenanceGenerator';
import { HistoryChart } from './HistoryChart';
import { LieuBadges } from './Icons';

interface StatsPageProps {
  lieux: Lieu[];
  onBack: () => void;
}

/* =====================
   Small, well-documented UI building blocks
   ===================== */

const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
    {children}
  </div>
);

const Header: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="flex items-center gap-4">
    <button
      onClick={onBack}
      className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
      aria-label="Retour"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
    <div className="flex items-center gap-3">
        <Logo className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600 dark:text-teal-400" />
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-gray-900 dark:text-slate-100">{title}</h1>
    </div>
  </div>
);

// StatCard optimisé pour l'esthétique
const StatCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
  <section className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-teal-500/10 dark:border-slate-700/50 ${className}`}>
    <div className="flex items-center gap-4 mb-5">
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300">
        {icon}
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-slate-100">{title}</h2>
    </div>
    <div className="space-y-6">{children}</div>
  </section>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm md:text-base font-semibold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wider">{children}</h3>
);

// StatRow centralisant l'amélioration des styles de valeur
const StatRow: React.FC<{
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  isSubItem?: boolean;
  highlight?: 'danger' | 'warning' | 'info' | 'primary' | null; // Ajout de 'primary' pour les totaux
  onClick?: () => void;
}> = ({ icon, label, value, isSubItem = false, highlight = null, onClick }) => {
  
  let valueClass = isSubItem ? 'text-sm' : 'text-base';
  let labelClass = isSubItem ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300';
  let badgeClass = '';
  
  if (highlight === 'primary') {
    // Style pour les totaux principaux (plus grand et couleur d'accent)
    valueClass = 'text-2xl md:text-3xl font-extrabold text-teal-600 dark:text-teal-400';
    labelClass = 'text-lg font-bold text-gray-800 dark:text-slate-100';
  } else {
    // Styles pour les alertes et sous-éléments
    badgeClass = highlight === 'danger' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 font-semibold px-2 py-0.5 rounded' :
                 highlight === 'warning' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 font-semibold px-2 py-0.5 rounded' :
                 highlight === 'info' ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 font-semibold px-2 py-0.5 rounded' :
                 isSubItem 
                    ? 'font-medium text-slate-800 dark:text-slate-200' 
                    : 'font-semibold px-2 py-0.5 rounded text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700';
  }

  const content = (
      <div className={`flex justify-between items-center ${isSubItem ? 'pl-8' : 'pl-0'} py-1`}> 
        <div className={`flex items-center gap-3 ${labelClass}`}>
          {icon && !highlight && <div className="w-5 h-5 flex items-center justify-center">{icon}</div>}
          <div className={`${isSubItem ? 'text-sm' : 'font-medium'}`}>{label}</div>
        </div>
        <div className={`${valueClass} ${badgeClass}`}>{value}</div>
      </div>
  );

  if (onClick) {
    const numericValue = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : -1;
    return (
      <button 
        onClick={onClick} 
        disabled={numericValue === 0}
        className="w-full text-left rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 -mx-2 px-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
      >
        {content}
      </button>
    );
  }

  return content;
};

/* =====================
   History Component
   ===================== */
interface HistoryListProps {
    onViewSnapshot: (entry: HistoryEntry) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ onViewSnapshot }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [entryToDelete, setEntryToDelete] = useState<HistoryEntry | null>(null);

    const loadHistory = () => {
        db.history.orderBy('date').reverse().toArray().then(setHistory);
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const handleDelete = async () => {
        if (entryToDelete && entryToDelete.id) {
            await db.history.delete(entryToDelete.id);
            setEntryToDelete(null);
            loadHistory();
        }
    };

    const getDateParts = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.toLocaleDateString('fr-FR', { day: '2-digit' });
        const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
        const year = date.getFullYear();
        const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return { day, month, year, time };
    };

    const getSubtitle = (type: string) => {
        switch(type) {
            case 'GLOBAL': return 'Réinitialisation complète du réseau';
            case 'CATEGORY': return 'Réinitialisation par ligne / catégorie';
            case 'MODULE_TYPE': return 'Réinitialisation par type d\'équipement';
            case 'SINGLE_AUDIT': return 'Réinitialisation d\'audit unique';
            default: return 'Instantané';
        }
    };

    if (history.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune archive disponible.</p>
                <p className="text-sm mt-1">Les archives se créent automatiquement lors de la réinitialisation d'un audit.</p>
            </div>
        );
    }

    return (
        <>
            <HistoryChart data={history} />
            
            <div className="space-y-4">
                {history.map((entry) => {
                    const { day, month, year, time } = getDateParts(entry.date);
                    return (
                        <div key={entry.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-0 flex hover:shadow-md transition-shadow overflow-hidden group">
                            {/* Gauche : Date */}
                            <div className="flex flex-col items-center justify-center min-w-[90px] bg-slate-50 dark:bg-slate-700/50 border-r border-slate-200 dark:border-slate-700 py-4">
                                <span className="text-2xl font-bold text-gray-700 dark:text-slate-200 leading-none">{day}</span>
                                <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mt-1">{month}</span>
                                <span className="text-xs text-gray-400 dark:text-slate-500 mt-2">{year}</span>
                                <span className="text-xs text-gray-400 dark:text-slate-500">{time}</span>
                            </div>

                            {/* Centre : Contenu (Cliquable) */}
                            <button 
                                onClick={() => onViewSnapshot(entry)}
                                className="flex-1 flex items-center p-4 text-left outline-none focus:bg-slate-50 dark:focus:bg-slate-700/50"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-slate-100 truncate mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        {entry.title}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
                                        <History className="w-3 h-3" />
                                        {getSubtitle(entry.type)}
                                    </p>
                                </div>
                                
                                {/* Droite : Score */}
                                <div className="flex-shrink-0">
                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${
                                        entry.score >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                        entry.score >= 50 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                        entry.score > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' // Style neutre pour 0%
                                    }`}>
                                        {entry.score > 0 ? `${entry.score}%` : '-'}
                                    </span>
                                </div>
                            </button>

                            {/* Action : Supprimer */}
                            <div className="flex items-center pr-4 pl-2 border-l border-slate-100 dark:border-slate-700">
                                <button 
                                    onClick={() => setEntryToDelete(entry)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                    title="Supprimer cette entrée"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ConfirmationModal 
                isOpen={!!entryToDelete}
                onClose={() => setEntryToDelete(null)}
                onConfirm={handleDelete}
                title="Supprimer l'archive"
                message="Êtes-vous sûr de vouloir supprimer cette entrée d'archive ? Cette action est irréversible."
                isDestructive
            />
        </>
    );
};


/* =====================
   Main component
   ===================== */

const StatsPage: React.FC<StatsPageProps> = ({ lieux, onBack }) => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  
  // --- LOCATION FILTER LOGIC ---
  const [selectedLieuId, setSelectedLieuId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si on clique ailleurs
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
              setIsFilterDropdownOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrer les lieux disponibles pour le calcul des stats
  const filteredLieux = useMemo(() => {
      if (selectedLieuId) {
          return lieux.filter(l => l.id === selectedLieuId);
      }
      return lieux;
  }, [lieux, selectedLieuId]);

  const selectedLieuObject = useMemo(() => lieux.find(l => l.id === selectedLieuId), [lieux, selectedLieuId]);

  // Filtrer la liste des options du dropdown
  const filterOptions = useMemo(() => {
      if (!filterQuery) return lieux;
      const lowerQuery = filterQuery.toLowerCase();
      return lieux.filter(l => 
          l.name.toLowerCase().includes(lowerQuery) ||
          // On peut aussi chercher par code station si besoin
          l.modules.some(m => m.type === AuditModuleType.DAT && (m.data as ModeData).stations[0]?.code?.toLowerCase().includes(lowerQuery))
      );
  }, [lieux, filterQuery]);

  // Use filtered lieux for stats calculation
  const { globalCounts, ecaBreakdown, maintenanceSummary, adhesiveInventory } = useStats(filteredLieux);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [modalContent, setModalContent] = useState<{ title: string; items: MaintenanceItem[] } | null>(null);

  const filteredInventory = adhesiveInventory.filter(item =>
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.auditType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.repere || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryMap = useMemo(() => Object.fromEntries(
    AUDIT_CATEGORIES.map(c => [c.key, c])
  ), [] as any);

  const metroAConfig = categoryMap['METRO_A'];
  const metroBConfig = categoryMap['METRO_B'];
  const tramConfig = categoryMap['TRAM'];
  const teleoConfig = categoryMap['TELEO'];
  const lineCConfig = categoryMap['METRO_C'];

  const handleViewSnapshot = (entry: HistoryEntry) => {
      try {
          const data = JSON.parse(entry.details);
          // Normalisation des données pour le générateur
          let lieuxToAnalyze: Lieu[] = [];
          
          if (Array.isArray(data)) {
              // Cas GLOBAL ou CATEGORY : c'est déjà une liste de Lieux
              lieuxToAnalyze = data as Lieu[];
          } else if (data && typeof data === 'object' && 'type' in data) {
              // Cas SINGLE_AUDIT : c'est un Module seul.
              // On doit le wrapper dans une structure Lieu pour que le générateur fonctionne
              const module = data as AuditModule;
              lieuxToAnalyze = [{
                  id: 'snapshot-wrapper',
                  name: 'Archive',
                  modules: [module]
              }];
          }

          const summary = generateMaintenanceSummary(lieuxToAnalyze);
          setModalContent({
              title: `Détails de l'archive : ${entry.title}`,
              items: summary.allDefects.items
          });

      } catch (e) {
          console.error("Failed to parse history entry details", e);
      }
  };

  return (
    <Container>
      <Header title="Statistiques du Réseau" onBack={onBack} />
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
                onClick={() => setActiveTab('current')}
                className={`${activeTab === 'current' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
            >
                <Building className="w-4 h-4" />
                Audit en cours
            </button>
            <button
                onClick={() => setActiveTab('history')}
                className={`${activeTab === 'history' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
            >
                <Archive className="w-4 h-4" />
                Archives
            </button>
        </nav>
      </div>

      {activeTab === 'history' ? (
          <StatCard title="Archives des Audits" icon={<Archive className="w-6 h-6" />}>
              <HistoryList onViewSnapshot={handleViewSnapshot} />
          </StatCard>
      ) : (
        <>
            {/* --- BARRE DE FILTRE PAR LIEU --- */}
            <div className="relative mb-6 z-20" ref={filterRef}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Filter className={`h-5 w-5 ${selectedLieuId ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`} aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        placeholder={selectedLieuId ? selectedLieuObject?.name : "Filtrer les données par lieu (Tout le réseau)..."}
                        value={filterQuery}
                        onChange={(e) => {
                            setFilterQuery(e.target.value);
                            setIsFilterDropdownOpen(true);
                        }}
                        onFocus={() => setIsFilterDropdownOpen(true)}
                        className={`block w-full rounded-lg border py-3 pl-10 pr-10 text-sm shadow-sm focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-base transition-colors ${
                            selectedLieuId 
                            ? 'border-teal-500 bg-teal-50 text-teal-900 dark:bg-teal-900/20 dark:border-teal-500/50 dark:text-teal-100 placeholder:text-teal-700 dark:placeholder:text-teal-300 font-semibold'
                            : 'border-gray-300 bg-white text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-white placeholder:text-gray-400'
                        }`}
                    />
                    {selectedLieuId && (
                        <button
                            onClick={() => {
                                setSelectedLieuId(null);
                                setFilterQuery('');
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {isFilterDropdownOpen && (
                    <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {/* Option "Tout le réseau" */}
                        <li
                            className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 dark:text-slate-100 hover:bg-teal-50 dark:hover:bg-slate-700 font-medium border-b border-gray-100 dark:border-slate-700"
                            onClick={() => {
                                setSelectedLieuId(null);
                                setFilterQuery('');
                                setIsFilterDropdownOpen(false);
                            }}
                        >
                            <div className="flex items-center">
                                <span className="truncate text-teal-600 dark:text-teal-400">Tout le réseau</span>
                            </div>
                        </li>

                        {filterOptions.length === 0 ? (
                            <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-500 dark:text-slate-400 italic">
                                Aucun lieu trouvé
                            </li>
                        ) : (
                            filterOptions.map((lieu) => (
                                <li
                                    key={lieu.id}
                                    className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-900 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-slate-700"
                                    onClick={() => {
                                        setSelectedLieuId(lieu.id);
                                        setFilterQuery('');
                                        setIsFilterDropdownOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <LieuBadges lieu={lieu} />
                                        <span className="truncate">{lieu.name}</span>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>

            {/* Grille principale : Aperçu Global (2/3) + Alertes (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLONNE GAUCHE (2/3) : Aperçu Global */}
                <div className="lg:col-span-2 space-y-8">
                
                <StatCard 
                    title={selectedLieuId ? `Aperçu : ${selectedLieuObject?.name}` : "Aperçu Global du Réseau"} 
                    icon={<Building className="w-6 h-6" />}
                >
                    <div className="space-y-6">
                    
                    {/* Ligne 1 : Billettique et P+R */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Billettique */}
                        <div>
                        <SectionTitle>Équipements Billettique</SectionTitle>
                        <div className="space-y-4">
                            {/* DAT */}
                            <div>
                            <StatRow icon={<Euro className="w-5 h-5" />} label="DAT (Distributeurs)" value={globalCounts.datCount} highlight="primary" />
                            <div className="space-y-1 mt-1">
                                {selectedLieuId ? null : (
                                    <>
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.datCountA} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.datCountB} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" />Tram</span>} value={globalCounts.datCountTram} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={teleoConfig} size="sm" />Téléo</span>} value={globalCounts.datCountTeleo} isSubItem />
                                    </>
                                )}
                            </div>
                            </div>
                            
                            <hr className="border-dashed border-slate-100 dark:border-slate-700/50" />
                            
                            {/* ECA */}
                            <div>
                            <StatRow icon={<Fence className="w-5 h-5" />} label="ECA (Valideurs)" value={globalCounts.ecaCount} highlight="primary" />
                            <div className="space-y-1 mt-1">
                                {selectedLieuId ? (
                                    <StatRow label="Dont PMR" value={globalCounts.ecaPmrCount} isSubItem />
                                ) : (
                                    <>
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={<>{ecaBreakdown.byLine.A.total} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({ecaBreakdown.byLine.A.pmr} PMR)</span></>} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={<>{ecaBreakdown.byLine.B.total} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({ecaBreakdown.byLine.B.pmr} PMR)</span></>} isSubItem />
                                    </>
                                )}
                            </div>
                            </div>
                        </div>
                        </div>

                        {/* Parkings Relais */}
                        <div>
                        <SectionTitle>Parkings Relais (P+R)</SectionTitle>
                        <div className="space-y-4">
                            {selectedLieuId ? null : <StatRow icon={<Car className="w-5 h-5" />} label="Nombre de P+R" value={globalCounts.prCount} highlight="primary" />}
                            <StatRow icon={<Car className="w-4 h-4" />} label="Bornes Entrée" value={globalCounts.beCount} />
                            <StatRow icon={<Car className="w-4 h-4" />} label="Bornes Sortie" value={globalCounts.bsCount} />
                            <StatRow icon={<Euro className="w-4 h-4" />} label="Caisses Auto" value={globalCounts.caCount} />
                        </div>
                        </div>
                    </div>
                    
                    <hr className="border-dashed border-slate-200 dark:border-slate-700" />
                    
                    {/* Ligne 2 : Stations et Audits */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Stations */}
                        <div>
                        {selectedLieuId ? (
                             <div className="py-4">
                                <p className="text-gray-500 dark:text-slate-400 italic">Détails de la station affichés.</p>
                             </div>
                        ) : (
                            <>
                            <SectionTitle>Stations par Ligne</SectionTitle>
                            <StatRow icon={<MapPin className="w-5 h-5" />} label="Total Stations" value={globalCounts.stationCountTotal} highlight="primary" />
                            <div className="space-y-1 mt-1">
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.stationCountA} isSubItem />
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.stationCountB} isSubItem />
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" />Ligne C (Projet)</span>} value={globalCounts.stationCountC} isSubItem />
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" />Tram</span>} value={globalCounts.stationCountTram} isSubItem />
                                <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={teleoConfig} size="sm" />Téléo</span>} value={globalCounts.stationCountTeleo} isSubItem />
                            </div>
                            </>
                        )}
                        </div>
                        
                        {/* Audits */}
                        <div>
                        <SectionTitle>Stations avec Audit Spécifique</SectionTitle>
                        <div className="space-y-4">
                            <div>
                            <StatRow icon={<Footprints className="w-5 h-5" />} label="Audit Sol PMR" value={globalCounts.pmrFloorAdhesiveCount} />
                            {selectedLieuId ? null : (
                                <div className="space-y-1 mt-1">
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.pmrFloorAdhesiveCountA} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.pmrFloorAdhesiveCountB} isSubItem />
                                </div>
                            )}
                            </div>
                            <div>
                            <StatRow icon={<ScanEye className="w-5 h-5" />} label="Audit Pictos Cognitifs" value={globalCounts.cogPictoCount} />
                            {selectedLieuId ? null : (
                                <div className="space-y-1 mt-1">
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.cogPictoCountA} isSubItem />
                                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.cogPictoCountB} isSubItem />
                                </div>
                            )}
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>
                </StatCard>
                </div>

                {/* COLONNE DROITE (1/3) : Alertes Maintenance */}
                <div className="lg:col-span-1 space-y-8">
                <StatCard 
                    title="Alertes Maintenance" 
                    icon={<AlertTriangle className="w-6 h-6 text-red-500" />} 
                    className="!border-red-500/10 dark:!border-red-900/50" // Surcharge de la bordure pour l'alerte
                >
                    <p className="text-sm text-slate-500 dark:text-slate-400 -mt-3">Aperçu des éléments nécessitant une intervention.</p>
                    <div className="space-y-4">
                    {/* BOUTON UNIQUE PRINCIPAL */}
                    <StatRow 
                        label="Total Anomalies" 
                        value={maintenanceSummary.allDefects.count} 
                        highlight="danger" 
                        onClick={() => setModalContent({ title: 'Anomalies constatées', items: maintenanceSummary.allDefects.items })} 
                    />
                    
                    {/* DÉTAILS NON CLIQUABLES (À TITRE INFORMATIF) */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 text-center">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{maintenanceSummary.absent.count}</div>
                            <div className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase mt-1">Absents</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/30 text-center">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{maintenanceSummary.toBeReplaced.count}</div>
                            <div className="text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase mt-1">À remplacer</div>
                        </div>
                    </div>
                    </div>
                </StatCard>
                </div>
            </div>
            
            <hr className="border-dashed border-slate-200 dark:border-slate-700 my-4" />

            {/* Inventaire Adhésifs (Pleine largeur) */}
            <StatCard title={`Inventaire Détaillé ${selectedLieuId ? ' - ' + selectedLieuObject?.name : ''}`} icon={<Search className="w-6 h-6" />}>
                <div>
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    <input
                    type="text"
                    placeholder="Rechercher par nom, type ou repère..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="block w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 pl-10 pr-3 text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                    />
                </div>

                <div className="overflow-auto max-h-96 border border-slate-200 dark:border-slate-700 rounded-lg shadow-inner">
                    <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700 text-left text-slate-700 dark:text-slate-200 shadow-sm">
                        <tr>
                        {/* Amélioration des titres de colonne */}
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Type</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Rep.</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider">Nom du Produit</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider hidden sm:table-cell">Dimensions (cm)</th>
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider hidden md:table-cell">Matière / Usage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredInventory.map((item, idx) => (
                        <tr key={item.id} className={`hover:bg-teal-50/50 dark:hover:bg-slate-700/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
                            <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium">{item.auditType}</td>
                            <td className="p-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{item.repere}</td>
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                            <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-300 hidden sm:table-cell">{item.dimensions}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 hidden md:table-cell">{item.material}</td>
                        </tr>
                        ))}
                        
                        {filteredInventory.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-6 text-center text-base text-slate-500 dark:text-slate-400">Aucun adhésif trouvé correspondant à la recherche "{searchTerm}"</td>
                        </tr>
                        )}
                    </tbody>
                    </table>
                </div>
                </div>
            </StatCard>
        </>
      )}
      
      <MaintenanceListModal
        isOpen={!!modalContent}
        onClose={() => setModalContent(null)}
        title={modalContent?.title || ''}
        items={modalContent?.items || []}
      />
    </Container>
  );
};

export default StatsPage;
