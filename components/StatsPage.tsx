import React, { useMemo, useState } from 'react';
import { ArrowLeft, Car, Euro, Fence, ScanEye, Search, Footprints, MapPin, Building, AlertTriangle } from 'lucide-react';
import { Lieu, MaintenanceItem } from '../types';
import { useStats } from '../hooks/useStats';
import { AUDIT_CATEGORIES } from '../data/config';
import { CategoryIcon } from './CategoryIcon';
import MaintenanceListModal from './MaintenanceListModal';

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
    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-gray-900 dark:text-slate-100">{title}</h1>
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
   Main component
   ===================== */

const StatsPage: React.FC<StatsPageProps> = ({ lieux, onBack }) => {
  const { globalCounts, ecaBreakdown, maintenanceSummary, adhesiveInventory } = useStats(lieux);
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

  return (
    <Container>
      <Header title="Statistiques du Réseau" onBack={onBack} />
      
      {/* Grille principale : Aperçu Global (2/3) + Alertes (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNE GAUCHE (2/3) : Aperçu Global */}
        <div className="lg:col-span-2 space-y-8">
          
          <StatCard title="Aperçu Global du Réseau" icon={<Building className="w-6 h-6" />}>
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
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.datCountA} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.datCountB} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" />Tram</span>} value={globalCounts.datCountTram} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={teleoConfig} size="sm" />Téléo</span>} value={globalCounts.datCountTeleo} isSubItem />
                      </div>
                    </div>
                    
                    <hr className="border-dashed border-slate-100 dark:border-slate-700/50" />
                    
                    {/* ECA */}
                    <div>
                      <StatRow icon={<Fence className="w-5 h-5" />} label="ECA (Valideurs)" value={globalCounts.ecaCount} highlight="primary" />
                      <div className="space-y-1 mt-1">
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={<>{ecaBreakdown.byLine.A.total} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({ecaBreakdown.byLine.A.pmr} PMR)</span></>} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={<>{ecaBreakdown.byLine.B.total} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({ecaBreakdown.byLine.B.pmr} PMR)</span></>} isSubItem />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parkings Relais */}
                <div>
                  <SectionTitle>Parkings Relais (P+R)</SectionTitle>
                  <div className="space-y-4">
                    <StatRow icon={<Car className="w-5 h-5" />} label="Nombre de P+R" value={globalCounts.prCount} highlight="primary" />
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
                  <SectionTitle>Stations par Ligne</SectionTitle>
                  <StatRow icon={<MapPin className="w-5 h-5" />} label="Total Stations" value={globalCounts.stationCountTotal} highlight="primary" />
                  <div className="space-y-1 mt-1">
                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.stationCountA} isSubItem />
                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.stationCountB} isSubItem />
                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" />Ligne C (Projet)</span>} value={globalCounts.stationCountC} isSubItem />
                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" />Tram</span>} value={globalCounts.stationCountTram} isSubItem />
                    <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={teleoConfig} size="sm" />Téléo</span>} value={globalCounts.stationCountTeleo} isSubItem />
                  </div>
                </div>
                
                {/* Audits */}
                <div>
                  <SectionTitle>Stations avec Audit Spécifique</SectionTitle>
                  <div className="space-y-4">
                    <div>
                      <StatRow icon={<Footprints className="w-5 h-5" />} label="Audit Sol PMR" value={globalCounts.pmrFloorAdhesiveCount} />
                      <div className="space-y-1 mt-1">
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.pmrFloorAdhesiveCountA} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.pmrFloorAdhesiveCountB} isSubItem />
                      </div>
                    </div>
                    <div>
                      <StatRow icon={<ScanEye className="w-5 h-5" />} label="Audit Pictos Cognitifs" value={globalCounts.cogPictoCount} />
                      <div className="space-y-1 mt-1">
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" />Ligne A</span>} value={globalCounts.cogPictoCountA} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" />Ligne B</span>} value={globalCounts.cogPictoCountB} isSubItem />
                      </div>
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
              <StatRow label="Adhésifs absents" value={maintenanceSummary.absent.count} highlight="danger" onClick={() => setModalContent({ title: 'Adhésifs Absents', items: maintenanceSummary.absent.items })} />
              <StatRow label="Adhésifs à remplacer" value={maintenanceSummary.toBeReplaced.count} highlight="warning" onClick={() => setModalContent({ title: 'Adhésifs à Remplacer', items: maintenanceSummary.toBeReplaced.items })} />
              <StatRow label="Adhésifs OK" value={maintenanceSummary.okCount} highlight="info" />
            </div>
          </StatCard>
        </div>
      </div>
      
      <hr className="border-dashed border-slate-200 dark:border-slate-700 my-4" />

      {/* Inventaire Adhésifs (Pleine largeur) */}
      <StatCard title="Inventaire Détaillé des Adhésifs" icon={<Search className="w-6 h-6" />}>
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
