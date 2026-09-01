import React from 'react';
import { AuditModuleType } from '../types';
import { Euro, Car, Fence, Footprints, ScanEye, Layout } from 'lucide-react';
import { resolveCustomAuditIcon } from '../data/customAudits';

interface ModuleIconProps {
  type: AuditModuleType;
  className?: string;
  /** Clé d'icône de l'audit configurable (module.type === CUSTOM
   *  uniquement) — même registre que data/customAudits.ts, jamais un
   *  second système graphique. Ignoré pour tout autre type. */
  customAuditIconKey?: string;
}

export const ModuleIcon: React.FC<ModuleIconProps> = ({ type, className = "w-6 h-6 text-gray-600 dark:text-slate-400 flex-shrink-0", customAuditIconKey }) => {
    switch (type) {
        case AuditModuleType.DAT:
            return <Euro className={className} />;
        case AuditModuleType.PR:
            return <Car className={className} />;
        case AuditModuleType.ECA:
            return <Fence className={className} />;
        case AuditModuleType.PMR_FLOOR_ADHESIVE:
            return <Footprints className={className} />;
        case AuditModuleType.COGNITIVE_PICTOGRAMS:
            return <ScanEye className={className} />;
        case AuditModuleType.SIGNALETIQUE:
            return <Layout className={className} />;
        case AuditModuleType.CUSTOM: {
            if (!customAuditIconKey) return null;
            const Icon = resolveCustomAuditIcon(customAuditIconKey);
            return <Icon className={className} />;
        }
        default:
            return null;
    }
};