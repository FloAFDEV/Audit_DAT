import { AuditCategoryConfig, AuditModuleType } from "../types";
import { Euro, Car, Fence, Footprints, ScanEye, Layout } from 'lucide-react';

export const AUDIT_CATEGORIES: AuditCategoryConfig[] = [
    { 
        key: 'METRO_A', label: 'Métro A', shortLabel: 'A',
        predicate: m => m.line === 'A',
        colors: { primary: '#DB001B', text: 'text-white', badgeBg: '#DB001B', badgeText: 'text-white' }
    },
    { 
        key: 'METRO_B', label: 'Métro B', shortLabel: 'B',
        predicate: m => m.line === 'B',
        colors: { primary: '#FFDD00', text: 'text-black', badgeBg: '#FFDD00', badgeText: 'text-black' }
    },
    { 
        key: 'METRO_C', label: 'Métro C', shortLabel: 'C',
        predicate: m => m.line === 'C',
        colors: { primary: '#33A02C', text: 'text-white', badgeBg: '#33A02C', badgeText: 'text-white' }
    },
    { 
        key: 'TRAM', label: 'Tram', shortLabel: 'T1',
        predicate: m => m.line === 'TRAM',
        colors: { primary: '#0369a1', text: 'text-white', badgeBg: '#0369a1', badgeText: 'text-white' } // sky-700
    },
    { 
        key: 'TELEO', label: 'Téléo', shortLabel: 'Téléo',
        predicate: m => m.line === 'TELEO',
        colors: { primary: '#DC006B', text: 'text-white', badgeBg: '#DC006B', badgeText: 'text-white' }
    },
    { 
        key: 'PR', label: 'Parkings Relais', shortLabel: 'P+R',
        predicate: m => m.type === AuditModuleType.PR,
        colors: { 
            primary: '#dcfce7', // green-100
            text: 'text-green-900', 
            badgeBg: '#dcfce7', // green-100
            badgeText: 'text-green-900',
            hoverPrimary: '#16a34a', // green-600
        }
    },
];

export const AUDIT_MODULES_CONFIG = [
    { type: AuditModuleType.DAT, label: "Audits DAT", shortLabel: "DAT", Icon: Euro },
    { type: AuditModuleType.PR, label: "Audits Bornes P+R", shortLabel: "Bornes P+R", Icon: Car },
    { type: AuditModuleType.ECA, label: "Audits ECA (Valideurs)", shortLabel: "Valideurs (ECA)", Icon: Fence },
    { type: AuditModuleType.PMR_FLOOR_ADHESIVE, label: "Adhésifs Sol PMR", shortLabel: "PMR au Sol", Icon: Footprints },
    { type: AuditModuleType.COGNITIVE_PICTOGRAMS, label: "Pictogrammes Cognitifs", shortLabel: "Picto. Cognitifs", Icon: ScanEye },
    { type: AuditModuleType.SIGNALETIQUE, label: "Équipements Station", shortLabel: "Équipements", Icon: Layout },
];