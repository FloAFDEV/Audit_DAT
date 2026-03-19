import { useMemo } from 'react';
import { Lieu, AuditModuleType, AuditCategory, ModeData, Station } from '../types';
import { getLieuxForCategory } from '../data/builder';
import { AUDIT_CATEGORIES, AUDIT_MODULES_CONFIG } from '../data/config';
import { LINE_A_STATIONS, LINE_B_STATIONS, LINE_C_STATIONS, TRAM_STATIONS, TELEO_STATIONS, AEROPORT_EXPRESS_STATIONS } from '../data/stations';

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
    AEROPORT: AEROPORT_EXPRESS_STATIONS, // tri physique BLA → NAD → DAU → ATB
};

const AUDIT_TYPE_ORDER = AUDIT_MODULES_CONFIG.map(config => config.type);

export const useLieuList = ({ lieux, searchQuery, activeFilter, isOrderReversed, activeAuditFilters }: UseLieuListProps) => {

    const availableAuditTypes = useMemo(() => {
        if (activeFilter === 'ALL') return [];
        
        const categoryConfig = AUDIT_CATEGORIES.find(c => c.key === activeFilter);
        if (!categoryConfig) return [];

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

    const physicalSort = (lieuxToSort: Lieu[], filter: AuditCategory): Lieu[] => {
        const stationOrderList = lineStationsMap[filter];
        if (!stationOrderList) {
            return [...lieuxToSort].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        }

        const stationOrderMap = new Map<string, number>();
        stationOrderList.forEach((station, index) => {
            const lieuName = station.lieuName || station.name;
            if(lieuName) stationOrderMap.set(lieuName, index);
        });
    
        return [...lieuxToSort].sort((a, b) => {
            const orderA = stationOrderMap.get(a.name);
            const orderB = stationOrderMap.get(b.name);
            if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
            if (orderA !== undefined) return -1;
            if (orderB !== undefined) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    const orderedLieuxForDisplay = useMemo(() => {
        let sortedLieux: Lieu[];

        if (activeFilter === 'ALL') {
            sortedLieux = [...lieux].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        } else {
            const lieuxSource = getLieuxForCategory(lieux, activeFilter);
            const sortedByLine = physicalSort(lieuxSource, activeFilter);
            sortedLieux = isOrderReversed ? [...sortedByLine].reverse() : sortedByLine;
        }

        return activeAuditFilters.length > 0
            ? sortedLieux.filter(lieu => lieu.modules.some(module => activeAuditFilters.includes(module.type)))
            : sortedLieux;
    }, [lieux, activeFilter, isOrderReversed, activeAuditFilters]);

    const searchResults = useMemo(() => {
        const normalizedQuery = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        let sourceLieux: Lieu[] = !normalizedQuery
            ? [...lieux] // Use full list when just clicking
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

        if (!predicate) {
            sourceLieux.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
            return { inCategory: sourceLieux, others: [] };
        }
        
        sourceLieux.forEach(lieu => {
            if (lieu.modules.some(module => predicate(module))) {
                inCategory.push(lieu);
            } else {
                others.push(lieu);
            }
        });
        
        // Apply physical sort and reverse order to the 'inCategory' results
        const sortedInCategory = physicalSort(inCategory, activeFilter);
        const finalInCategory = isOrderReversed ? sortedInCategory.reverse() : sortedInCategory;

        // Keep 'others' alphabetically sorted
        others.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

        return { inCategory: finalInCategory, others };

    }, [searchQuery, lieux, activeFilter, isOrderReversed]);

    return { orderedLieuxForDisplay, searchResults, availableAuditTypes };
};