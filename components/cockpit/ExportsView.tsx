// components/cockpit/ExportsView.tsx
// =================================================================
// Section « Exports » — PLACEHOLDER (commit de restructuration/navigation).
// -----------------------------------------------------------------
// Un export par section source — aucun export « matériel », « commande »
// ni « fabrication » : ce ne serait pas dans le périmètre de l'application.
// Aucun contenu réel construit dans ce commit.
// =================================================================
import React from 'react';
import { Download, LucideIcon } from 'lucide-react';

const PLANNED: { label: string; filename: string; Icon: LucideIcon }[] = [
    { label: 'Export Existant',        filename: 'IV_Existant_AAAA-MM-JJ.xlsx',        Icon: Download },
    { label: 'Export Anomalies',       filename: 'IV_Anomalies_AAAA-MM-JJ.xlsx',       Icon: Download },
    { label: 'Export Intervention SAE', filename: 'IV_Intervention_SAE_AAAA-MM-JJ.xlsx', Icon: Download },
];

const ExportsView: React.FC = () => (
    <div className="py-12 text-center space-y-8">
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Un export par section source, prêt à transmettre. Rien n'est encore construit ici.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {PLANNED.map(({ label, filename, Icon }) => (
                <div key={label} className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-left">
                    <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500 mb-2" />
                    <h4 className="font-semibold text-slate-600 dark:text-slate-300 text-sm">{label}</h4>
                    <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500 mt-1">{filename}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Bientôt disponible
                    </span>
                </div>
            ))}
        </div>
    </div>
);

export default ExportsView;
