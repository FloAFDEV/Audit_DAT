
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ArrowLeft, Car, Euro, Fence, ScanEye, Search, Footprints, MapPin, Building, AlertTriangle, History, Calendar, Trash2, Archive, X, Filter, Layout } from 'lucide-react';
import { Lieu, MaintenanceItem, HistoryEntry, AuditModule, ModeData, AuditModuleType, EcaEquipmentType } from '../types';
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

/* Grille 2 colonnes compacte pour les sous-items par ligne — remplace space-y-1 StatRow isSubItem */
const LineSubGrid: React.FC<{
    items: Array<{ cfg: any; label: string; value: number }>
}> = ({ items }) => (
    <div className="grid grid-cols-2 gap-x-2 gap-y-0 mt-1.5">
        {items.map(({ cfg, label, value }) => (
            <div key={label} className="flex items-center justify-between gap-1 py-[3px] px-1">
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate min-w-0">
                    <CategoryIcon categoryConfig={cfg} size="sm" />
                    <span className="truncate">{label}</span>
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0 ml-1 tabular-nums">{value}</span>
            </div>
        ))}
    </div>
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
                 highlight === 'warning' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 font-semibold px-2 py-0.5 rounded' :
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

    if (!history || history.length === 0) {
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
                                        entry.score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
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
   ECA per-line detail sub-component
   ===================== */

const ECA_TYPE_ROWS = [
    { label: "Tripodes entrée",        type: EcaEquipmentType.TripodeEntree },
    { label: "Tripodes sortie",        type: EcaEquipmentType.TripodeSortie },
    { label: "Vantaux entrée",         type: EcaEquipmentType.VantauxEntree },
    { label: "Vantaux sortie",         type: EcaEquipmentType.VantauxSortie },
    { label: "Vantaux réversibles",    type: EcaEquipmentType.VantauxReversible },
    { label: "PMR à bras",             type: EcaEquipmentType.PMRBras },
    { label: "PMR à vantaux",          type: EcaEquipmentType.PMRVantaux },
    { label: "PMR vantaux réversible", type: EcaEquipmentType.PMRVantauxReversible },
];

const EcaTypeGrid: React.FC<{ byType: Record<string, number> }> = ({ byType }) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5">
        {ECA_TYPE_ROWS.map(({ label, type }) => {
            const count = byType[type] ?? 0;
            if (count === 0) return null;
            return (
                <div key={type} className="flex justify-between items-center py-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">{label}</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">{count}</span>
                </div>
            );
        })}
    </div>
);

/* Affichage compact des lignes ECA en 2×2 grid — réduit la hauteur vs liste verticale */
const EcaLineCompact: React.FC<{ ecaBreakdown: any; configs: any }> = ({ ecaBreakdown, configs }) => {
    const { metroAConfig, metroBConfig, lineCConfig, laeConfig } = configs;
    const lines = [
        { key: 'A',        label: 'Ligne A',    cfg: metroAConfig,  data: ecaBreakdown.byLine.A },
        { key: 'B',        label: 'Ligne B',    cfg: metroBConfig,  data: ecaBreakdown.byLine.B },
        { key: 'C',        label: 'Ligne C',    cfg: lineCConfig,   data: ecaBreakdown.byLine.C },
        { key: 'AEROPORT', label: 'Aéroport',   cfg: laeConfig,     data: ecaBreakdown.byLine.AEROPORT },
    ];
    return (
        <div className="grid grid-cols-2 gap-2.5 mt-2">
            {lines.map(({ key, label, cfg, data }) => (
                <div key={key} className="rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 p-2.5">
                    <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 truncate min-w-0">
                            <CategoryIcon categoryConfig={cfg} size="sm" />
                            <span className="truncate">{label}</span>
                        </span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex-shrink-0 tabular-nums">{data.total}</span>
                    </div>
                    {data.pmr > 0 && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">{data.pmr} PMR</p>
                    )}
                    {data.total > 0 && <EcaTypeGrid byType={data.byType} />}
                </div>
            ))}
        </div>
    );
};

const EcaLineDetail: React.FC<{ ecaBreakdown: any; configs: any }> = ({ ecaBreakdown, configs }) => {
    const { metroAConfig, metroBConfig, lineCConfig, laeConfig } = configs;
    const lines = [
        { key: 'A',        label: 'Ligne A',          cfg: metroAConfig,  data: ecaBreakdown.byLine.A },
        { key: 'B',        label: 'Ligne B',          cfg: metroBConfig,  data: ecaBreakdown.byLine.B },
        { key: 'C',        label: 'Ligne C',          cfg: lineCConfig,   data: ecaBreakdown.byLine.C },
        { key: 'AEROPORT', label: 'Aéroport Express', cfg: laeConfig,     data: ecaBreakdown.byLine.AEROPORT },
    ];
    return (
        <div className="mt-2 space-y-3">
            {lines.map(({ key, label, cfg, data }) => (
                <div key={key} className="pl-4 border-l-2 border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <CategoryIcon categoryConfig={cfg} size="sm" />
                            {label}
                        </span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {data.total}
                            <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">({data.pmr} PMR)</span>
                        </span>
                    </div>
                    {data.total > 0 && <EcaTypeGrid byType={data.byType} />}
                </div>
            ))}
        </div>
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
      if (!lieux) return [];
      if (selectedLieuId) {
          return lieux.filter(l => l.id === selectedLieuId);
      }
      return lieux;
  }, [lieux, selectedLieuId]);

  const selectedLieuObject = useMemo(() => (lieux || []).find(l => l.id === selectedLieuId), [lieux, selectedLieuId]);

  // Filtrer la liste des options du dropdown
  const filterOptions = useMemo(() => {
      if (!lieux) return [];
      if (!filterQuery) return lieux;
      const lowerQuery = filterQuery.toLowerCase();
      return lieux.filter(l => 
          l.name.toLowerCase().includes(lowerQuery) ||
          // On peut aussi chercher par code station si besoin
          (l.modules || []).some(m => m.type === AuditModuleType.DAT && (m.data as ModeData).stations?.[0]?.code?.toLowerCase().includes(lowerQuery))
      );
  }, [lieux, filterQuery]);

  // Use filtered lieux for stats calculation
  const { globalCounts, ecaBreakdown, maintenanceSummary, adhesiveInventory } = useStats(filteredLieux);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [modalContent, setModalContent] = useState<{ title: string; items: MaintenanceItem[] } | null>(null);

  const filteredInventory = (adhesiveInventory || []).filter(item =>
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
  const laeConfig = categoryMap['LAE'];

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

            {/* [1] BANNIÈRE ALERTES — pleine largeur, priorité maximale */}
            {maintenanceSummary.allDefects.count > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:px-6">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                                    {maintenanceSummary.allDefects.count} anomalie{maintenanceSummary.allDefects.count > 1 ? 's' : ''} détectée{maintenanceSummary.allDefects.count > 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Éléments nécessitant une intervention de maintenance</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/40 rounded-lg px-3 py-1.5">
                                <span className="text-xl font-extrabold text-red-700 dark:text-red-300">{maintenanceSummary.absent.count}</span>
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Absents</span>
                            </div>
                            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg px-3 py-1.5">
                                <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300">{maintenanceSummary.toBeReplaced.count}</span>
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">À remplacer</span>
                            </div>
                            <button
                                onClick={() => setModalContent({ title: 'Anomalies constatées', items: maintenanceSummary.allDefects.items })}
                                className="text-sm font-semibold text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline underline-offset-2 transition-colors whitespace-nowrap"
                            >
                                Voir la liste →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* [2] TROIS CARTES MÉTIER — DAT | ECA | P+R */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* DAT */}
                <StatCard title="DAT" icon={<Euro className="w-6 h-6" />}>
                    <StatRow label="Total distributeurs" value={globalCounts.datCount} highlight="primary" />
                    {!selectedLieuId && (
                        <LineSubGrid items={[
                            { cfg: metroAConfig, label: 'Ligne A',  value: globalCounts.datCountA },
                            { cfg: metroBConfig, label: 'Ligne B',  value: globalCounts.datCountB },
                            { cfg: lineCConfig,  label: 'Ligne C',  value: globalCounts.datCountC },
                            { cfg: laeConfig,    label: 'Aéroport', value: globalCounts.datCountAero },
                            { cfg: tramConfig,   label: 'Tram',     value: globalCounts.datCountTram },
                            { cfg: teleoConfig,  label: 'Téléo',    value: globalCounts.datCountTeleo },
                        ]} />
                    )}
                    {!selectedLieuId && (
                        <div className="pt-2 border-t border-dashed border-slate-100 dark:border-slate-700/50">
                            <StatRow icon={<MapPin className="w-4 h-4" />} label="Total stations" value={globalCounts.stationCountTotal} />
                            <LineSubGrid items={[
                                { cfg: metroAConfig, label: 'Ligne A',  value: globalCounts.stationCountA },
                                { cfg: metroBConfig, label: 'Ligne B',  value: globalCounts.stationCountB },
                                { cfg: lineCConfig,  label: 'Ligne C',  value: globalCounts.stationCountC },
                                { cfg: laeConfig,    label: 'Aéroport', value: globalCounts.stationCountAero },
                                { cfg: tramConfig,   label: 'Tram',     value: globalCounts.stationCountTram },
                                { cfg: teleoConfig,  label: 'Téléo',    value: globalCounts.stationCountTeleo },
                            ]} />
                        </div>
                    )}
                </StatCard>

                {/* ECA */}
                <StatCard title="ECA" icon={<Fence className="w-6 h-6" />}>
                    <StatRow label="Total valideurs" value={globalCounts.ecaCount} highlight="primary" />
                    {selectedLieuId ? (
                        <div className="space-y-1 pt-1">
                            <StatRow label="Dont PMR" value={globalCounts.ecaPmrCount} isSubItem />
                        </div>
                    ) : (
                        <EcaLineCompact ecaBreakdown={ecaBreakdown} configs={{ metroAConfig, metroBConfig, lineCConfig, laeConfig }} />
                    )}
                </StatCard>

                {/* P+R */}
                <StatCard title="P+R" icon={<Car className="w-6 h-6" />}>
                    {!selectedLieuId && <StatRow label="Parkings Relais" value={globalCounts.prCount} highlight="primary" />}
                    <div className="space-y-2 pt-1">
                        <StatRow icon={<Car className="w-4 h-4" />} label="Bornes Entrée" value={globalCounts.beCount} />
                        <StatRow icon={<Car className="w-4 h-4" />} label="Bornes Sortie" value={globalCounts.bsCount} />
                        <StatRow icon={<Euro className="w-4 h-4" />} label="Caisses Auto" value={globalCounts.caCount} />
                    </div>
                </StatCard>
            </div>

            {/* [3] AUDITS SPÉCIFIQUES — ligne compacte */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Sol PMR */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-teal-500/10 dark:border-slate-700/50 shadow-sm p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                        <Footprints className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sol PMR</p>
                        <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{globalCounts.pmrFloorAdhesiveCount}</p>
                        {!selectedLieuId && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                <span className="text-xs text-slate-400">A <strong className="text-slate-600 dark:text-slate-300">{globalCounts.pmrFloorAdhesiveCountA}</strong></span>
                                <span className="text-xs text-slate-400">B <strong className="text-slate-600 dark:text-slate-300">{globalCounts.pmrFloorAdhesiveCountB}</strong></span>
                                <span className="text-xs text-slate-400">C <strong className="text-slate-600 dark:text-slate-300">{globalCounts.pmrFloorAdhesiveCountC}</strong></span>
                                <span className="text-xs text-slate-400">Aéro <strong className="text-slate-600 dark:text-slate-300">{globalCounts.pmrFloorAdhesiveCountAero}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pictos Cognitifs */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-teal-500/10 dark:border-slate-700/50 shadow-sm p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300">
                        <ScanEye className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pictos Cognitifs</p>
                        <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{globalCounts.cogPictoCount}</p>
                        {!selectedLieuId && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                <span className="text-xs text-slate-400">A <strong className="text-slate-600 dark:text-slate-300">{globalCounts.cogPictoCountA}</strong></span>
                                <span className="text-xs text-slate-400">B <strong className="text-slate-600 dark:text-slate-300">{globalCounts.cogPictoCountB}</strong></span>
                                <span className="text-xs text-slate-400">C <strong className="text-slate-600 dark:text-slate-300">{globalCounts.cogPictoCountC}</strong></span>
                                <span className="text-xs text-slate-400">Aéro <strong className="text-slate-600 dark:text-slate-300">{globalCounts.cogPictoCountAero}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Équipements Station */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-teal-500/10 dark:border-slate-700/50 shadow-sm p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300">
                        <Layout className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Équipements Station</p>
                        <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{globalCounts.signaletiqueCount}</p>
                        {!selectedLieuId && (
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                <span className="text-xs text-slate-400">Tram <strong className="text-slate-600 dark:text-slate-300">{globalCounts.signaletiqueCountTram}</strong></span>
                                <span className="text-xs text-slate-400">Aéro <strong className="text-slate-600 dark:text-slate-300">{globalCounts.signaletiqueCountAero}</strong></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <hr className="border-dashed border-slate-200 dark:border-slate-700 my-2" />

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
                        <th scope="col" className="p-3 font-bold text-xs uppercase tracking-wider text-center">Qté réseau</th>
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
                            <td className="p-3 text-center font-bold text-teal-700 dark:text-teal-400">
                                {item.quantity > 0 ? item.quantity : <span className="text-slate-400 font-normal">—</span>}
                            </td>
                        </tr>
                        ))}
                        
                        {(!filteredInventory || filteredInventory.length === 0) && (
                        <tr>
                            <td colSpan={6} className="p-6 text-center text-base text-slate-500 dark:text-slate-400">Aucun adhésif trouvé correspondant à la recherche "{searchTerm}"</td>
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
