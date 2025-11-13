import React, { useState } from 'react';
import { Lieu } from '../types';
import { useStats } from '../hooks/useStats';
import { ArrowLeft, Ticket, Car, Euro, Fence, ScanEye, CalendarCheck2, Search, Footprints, MapPin, Building } from 'lucide-react';
import { LineIcon } from './LineIcon';
import { AUDIT_CATEGORIES } from '../data/config';
import { CategoryIcon } from './CategoryIcon';

interface StatsPageProps {
    lieux: Lieu[];
    onBack: () => void;
}

const StatCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-teal-600 dark:text-teal-400">{icon}</div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{title}</h3>
        </div>
        {children}
    </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</p>
);

const StatRow: React.FC<{ icon?: React.ReactNode; label: React.ReactNode; value: React.ReactNode; isSubItem?: boolean; className?: string }> = ({ icon, label, value, isSubItem = false, className = '' }) => (
    <div className={`flex justify-between items-center ${isSubItem ? 'pl-8' : ''} ${className}`}>
        <span className={`flex items-center gap-2 ${isSubItem ? 'text-gray-500 dark:text-slate-400' : 'text-gray-600 dark:text-slate-300'}`}>
            {icon}
            {label}
        </span>
        <span className={`font-bold ${isSubItem ? 'text-base text-slate-700 dark:text-slate-200' : 'text-lg text-slate-900 dark:text-slate-100'}`}>
            {value}
        </span>
    </div>
);


const StatsPage: React.FC<StatsPageProps> = ({ lieux, onBack }) => {
    const { globalCounts, ecaBreakdown, recentAudits, adhesiveInventory } = useStats(lieux);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInventory = adhesiveInventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.auditType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.repere.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const metroAConfig = AUDIT_CATEGORIES.find(c => c.key === 'METRO_A');
    const metroBConfig = AUDIT_CATEGORIES.find(c => c.key === 'METRO_B');
    const tramConfig = AUDIT_CATEGORIES.find(c => c.key === 'TRAM');
    const teleoConfig = AUDIT_CATEGORIES.find(c => c.key === 'TELEO');
    const lineCConfig = AUDIT_CATEGORIES.find(c => c.key === 'METRO_C');

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Retour"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Statistiques du Réseau</h2>
            </div>
            
            <StatCard title="Aperçu Global du Réseau" icon={<Building className="w-6 h-6"/>}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-3">
                        <SectionTitle>Équipements Billettique</SectionTitle>
                        <StatRow icon={<Euro className="w-4 h-4"/>} label="DAT (Distributeurs)" value={globalCounts.datCount} />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" /> Ligne A</span>} value={globalCounts.datCountA} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" /> Ligne B</span>} value={globalCounts.datCountB} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" /> Tram</span>} value={globalCounts.datCountTram} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={teleoConfig} size="sm" /> Téléo</span>} value={globalCounts.datCountTeleo} isSubItem />
                        
                        <StatRow icon={<Fence className="w-4 h-4"/>} label="ECA (Valideurs)" value={globalCounts.ecaCount} className="pt-3 mt-3 border-t border-dashed border-slate-200 dark:border-slate-700"/>
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" /> Ligne A</span>} value={<>{ecaBreakdown.byLine.A.total} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">(dont {ecaBreakdown.byLine.A.pmr} PMR)</span></>} isSubItem />
                        <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" /> Ligne B</span>} value={<>{ecaBreakdown.byLine.B.total} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">(dont {ecaBreakdown.byLine.B.pmr} PMR)</span></>} isSubItem />
                        
                         <div className="pt-3 mt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                             <SectionTitle>Stations</SectionTitle>
                             <StatRow icon={<MapPin className="w-4 h-4"/>} label="Total Stations (A+B)" value={globalCounts.stationCountTotal} />
                             <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" /> Ligne A</span>} value={globalCounts.stationCountA} isSubItem />
                             <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" /> Ligne B</span>} value={globalCounts.stationCountB} isSubItem />
                             <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={tramConfig} size="sm" /> Tram</span>} value={globalCounts.stationCountTram} isSubItem />
                             <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={teleoConfig} size="sm" /> Téléo</span>} value={globalCounts.stationCountTeleo} isSubItem />
                             <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={lineCConfig} size="sm" /> Ligne C</span>} value={globalCounts.stationCountC} isSubItem />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <SectionTitle>Parkings Relais (P+R)</SectionTitle>
                        <StatRow icon={<Car className="w-4 h-4"/>} label="Nombre de P+R" value={globalCounts.prCount} />
                        <StatRow icon={<Car className="w-4 h-4"/>} label="Bornes Entrée" value={globalCounts.beCount} />
                        <StatRow icon={<Car className="w-4 h-4"/>} label="Bornes Sortie" value={globalCounts.bsCount} />
                        <StatRow icon={<Euro className="w-4 h-4"/>} label="Caisses Auto" value={globalCounts.caCount} />
                   
                        <div className="pt-3 mt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                            <SectionTitle>Audits Spécifiques</SectionTitle>
                            <StatRow icon={<Footprints className="w-4 h-4"/>} label="Audits Sol PMR" value={globalCounts.pmrFloorAdhesiveCount} />
                            <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" /> Ligne A</span>} value={globalCounts.pmrFloorAdhesiveCountA} isSubItem />
                            <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" /> Ligne B</span>} value={globalCounts.pmrFloorAdhesiveCountB} isSubItem />
                            <StatRow icon={<ScanEye className="w-4 h-4"/>} label="Audits Pictos Cognitifs" value={globalCounts.cogPictoCount} className="pt-3 mt-3 border-t border-dashed border-slate-200 dark:border-slate-700"/>
                            <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroAConfig} size="sm" /> Ligne A</span>} value={globalCounts.cogPictoCountA} isSubItem />
                            <StatRow label={<span className="flex items-center gap-2"><CategoryIcon categoryConfig={metroBConfig} size="sm" /> Ligne B</span>} value={globalCounts.cogPictoCountB} isSubItem />
                        </div>
                    </div>
                </div>
            </StatCard>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Derniers Audits Réalisés" icon={<CalendarCheck2 className="w-6 h-6"/>} className="md:col-span-2 lg:col-span-3">
                     <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-left text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="p-2 font-semibold">Date</th>
                                    <th className="p-2 font-semibold">Type</th>
                                    <th className="p-2 font-semibold">Nom</th>
                                    <th className="p-2 font-semibold">Lieu / Station</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {recentAudits.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-2 whitespace-nowrap text-slate-600 dark:text-slate-300">{new Date(item.completionDate).toLocaleDateString('fr-FR')}</td>
                                        <td className="p-2 whitespace-nowrap"><LineIcon module={item.module} size="sm" /></td>
                                        <td className="p-2 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                                        <td className="p-2 text-slate-600 dark:text-slate-300">{item.location}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </StatCard>

                <StatCard title="Inventaire des Adhésifs" icon={<Search className="w-6 h-6"/>} className="md:col-span-2 lg:col-span-3">
                    <div className="relative mb-4">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher un adhésif..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="block w-full rounded-md border-0 bg-slate-100 dark:bg-slate-700 py-2 pl-10 pr-3 text-gray-900 dark:text-slate-50 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm"
                        />
                    </div>
                    <div className="overflow-auto max-h-96">
                         <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-left text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="p-2 font-semibold">Type</th>
                                    <th className="p-2 font-semibold">Rep.</th>
                                    <th className="p-2 font-semibold">Nom</th>
                                    <th className="p-2 font-semibold">Dimensions</th>
                                    <th className="p-2 font-semibold">Matière / Desc.</th>
                                    <th className="p-2 font-semibold text-right">Qté</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredInventory.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-2 whitespace-nowrap text-slate-600 dark:text-slate-300">{item.auditType}</td>
                                        <td className="p-2 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{item.repere}</td>
                                        <td className="p-2 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                                        <td className="p-2 whitespace-nowrap text-slate-600 dark:text-slate-300">{item.dimensions}</td>
                                        <td className="p-2 text-slate-600 dark:text-slate-300">{item.material}</td>
                                        <td className="p-2 font-bold text-right text-slate-800 dark:text-slate-100">{item.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </StatCard>
            </div>
        </div>
    );
};

export default StatsPage;