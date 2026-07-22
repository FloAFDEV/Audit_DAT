// components/cockpit/SAEView.tsx
// =================================================================
// Section « SAE » — PLACEHOLDER (commit de restructuration/navigation).
// -----------------------------------------------------------------
// Frontière stricte validée : l'application produit une INFORMATION
// (item, quantité, implantations, contexte de pose) à destination du
// SAE — elle ne gère ni achat, ni fabrication, ni organisation, ni pose.
// Ces responsabilités restent entièrement du ressort du SAE.
//
// Flux cible : Référentiel signalétique → Analyse des anomalies (ou
// évolution design) → Résumé d'intervention (ici).
//
// Aucun contenu réel construit dans ce commit. Le Résumé d'intervention
// sera un futur commit séparé : groupement Ligne → Station → Équipement
// → Référence → Quantité, à partir d'une Selection existante.
// =================================================================
import React from 'react';
import { FileStack } from 'lucide-react';

const SAEView: React.FC = () => (
    <div className="py-12 text-center space-y-6">
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Cette section deviendra le pont entre les besoins constatés et leur transmission au SAE — item,
            quantité, localisation et contexte de pose. Rien n'est encore construit ici.
        </p>
        <div className="max-w-sm mx-auto p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-left">
            <FileStack className="w-5 h-5 text-slate-400 dark:text-slate-500 mb-2" />
            <h4 className="font-semibold text-slate-600 dark:text-slate-300 text-sm">Résumé d'intervention</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Ligne → station → implantation → référence → quantité, prêt pour une équipe terrain.
            </p>
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Bientôt disponible
            </span>
        </div>
    </div>
);

export default SAEView;
