import { useMemo } from 'react';
import { Lieu, AuditModuleType, AuditCategory, ModeData, Station } from '../types';
import { getLieuxForCategory } from '../data/builder';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from '../data/config';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS } from '../data/stations';

interface UseLieuListProps {
    lieux: Lieu[];
    searchQuery: string;
    activeFilter: AuditCategory | 'ALL';
    isOrderReversed: boolean;
    activeAuditFilters: AuditModuleType[];
}

const lineStationsMap: { [key in AuditCategory]?: Partial<Station>[] } = {
    METRO_A: LINE_A_STATIONS,
    METRO_B: LINE_B_STATIONS,
    METRO_C: LINE_C_STATIONS,
    TRAM: TRAM_STATIONS,
    TELEO: TELEO_STATIONS,
};

const AUDIT_TYPE_ORDER = AUDIT_MODULES_CONFIG.map(config => config.type);

export const useLieuList = ({ lieux, searchQuery, activeFilter, isOrderReversed, activeAuditFilters }: UseLieuListProps) => {

    const availableAuditTypes = useMemo(() => {
        if (activeFilter === 'ALL') return [];
        const lieuxForCategory = getLieuxForCategory(lieux, activeFilter);
        const types = new Set<AuditModuleType>();
        for (const lieu of lieuxForCategory) {
            for (const module of lieu.modules) {
                if (!module.isFuture) {
                    types.add(module.type);
                }
            }
        }
        return AUDIT_TYPE_ORDER.filter(type => types.has(type));
    }, [lieux, activeFilter]);

    const orderedLieuxForDisplay = useMemo(() => {
        let sortedLieux: Lieu[];

        if (activeFilter === 'ALL') {
            sortedLieux = [...lieux].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        } else {
            const lieuxSource = getLieuxForCategory(lieux, activeFilter);
            const stationOrderList = lineStationsMap[activeFilter as AuditCategory];
            let sortedByLine = lieuxSource;

            if (stationOrderList) {
                const stationOrderMap = new Map<string, number>();
                stationOrderList.forEach((station, index) => {
                    const lieuName = station.lieuName || station.name;
                    if(lieuName) stationOrderMap.set(lieuName, index);
                });
            
                sortedByLine = [...lieuxSource].sort((a, b) => {
                    const orderA = stationOrderMap.get(a.name);
                    const orderB = stationOrderMap.get(b.name);
                    if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
                    if (orderA !== undefined) return -1;
                    if (orderB !== undefined) return 1;
                    return a.name.localeCompare(b.name);
                });
            } else {
                 sortedByLine = [...lieuxSource].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
            }
            
            sortedLieux = isOrderReversed ? [...sortedByLine].reverse() : sortedByLine;
        }

        return activeAuditFilters.length > 0
            ? sortedLieux.filter(lieu => lieu.modules.some(module => activeAuditFilters.includes(module.type)))
            : sortedLieux;
    }, [lieux, activeFilter, isOrderReversed, activeAuditFilters]);

    const searchResults = useMemo(() => {
        const normalizedQuery = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        let sourceLieux: Lieu[] = !normalizedQuery
            ? [...lieux]
            : [...lieux].filter(l => {
                const normalizedName = l.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedQuery);
                const stationCodes = l.modules.filter(m => m.type === AuditModuleType.DAT).map(m => (m.data as ModeData).stations[0].code).filter(Boolean);
                const matchesCode = stationCodes.some(code => code!.toLowerCase().includes(normalizedQuery));
                return normalizedName || matchesCode;
            });

        if (activeFilter === 'ALL') {
            sourceLieux.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
            return { inCategory: sourceLieux, others: [] };
        }

        const inCategory: Lieu[] = [];
        const others: Lieu[] = [];
        const predicate = AUDIT_CATEGORIES.find(c => c.key === activeFilter)?.predicate;

        if (predicate) {
            sourceLieux.forEach(lieu => {
                if (lieu.modules.some(module => predicate(module))) inCategory.push(lieu);
                else others.push(lieu);
            });
        } else {
            sourceLieux.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
            return { inCategory: sourceLieux, others: [] };
        }
        
        inCategory.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        others.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

        return { inCategory, others };

    }, [searchQuery, lieux, activeFilter]);

    return { orderedLieuxForDisplay, searchResults, availableAuditTypes };
};
