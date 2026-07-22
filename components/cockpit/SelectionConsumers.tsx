// components/cockpit/SelectionConsumers.tsx
// =================================================================
// Rend visible, SANS L'IMPLÉMENTER, le contrat Selection → consommateurs
// (commit 6). Ce composant ne contient et ne contiendra jamais de
// logique métier d'export, de campagne ou de commande : il ne fait
// qu'exposer une Selection existante aux futurs modules qui la liront.
//
//   Selection
//       |
//       ├── Export chantier
//       ├── Campagne remplacement
//       ├── Bon de pose
//       └── Analyse
//
// Composant volontairement générique et réutilisable : n'importe quelle
// vue qui produit une Selection (Analyse des anomalies, fiche de vie,
// demain Implantations/Qualification du référentiel) l'affiche à
// l'identique — la sélection n'est la propriété d'aucun module.
// =================================================================
import React from 'react';
import { FileDown, CalendarRange, ClipboardList, BarChart3, LucideIcon } from 'lucide-react';
import { Selection } from '../../utils/cockpit/selection';

const CONSUMERS: { key: string; label: string; Icon: LucideIcon }[] = [
    { key: 'export',   label: 'Export chantier',       Icon: FileDown },
    { key: 'campaign', label: 'Campagne remplacement', Icon: CalendarRange },
    { key: 'pose',     label: 'Bon de pose',           Icon: ClipboardList },
    { key: 'analysis', label: 'Analyse',               Icon: BarChart3 },
];

interface SelectionConsumersProps {
    selection: Selection;
}

const SelectionConsumers: React.FC<SelectionConsumersProps> = ({ selection }) => (
    <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
            Sélection : {selection.items.length} élément{selection.items.length > 1 ? 's' : ''} · source « {selection.source} »
        </p>
        <div className="flex flex-wrap gap-2">
            {CONSUMERS.map(({ key, label, Icon }) => (
                <button
                    key={key}
                    disabled
                    title="Bientôt disponible"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                </button>
            ))}
        </div>
    </div>
);

export default SelectionConsumers;
