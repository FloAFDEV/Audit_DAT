// components/cockpit/PreparationView.tsx
// =================================================================
// Section « Préparation » — PLACEHOLDER (commit de réalignement).
// -----------------------------------------------------------------
// Matérialise dès maintenant l'arborescence cible du flux :
//   Anomalies → Besoins matériels → Commandes → Résumés de pose SAE
//   → Historique
//
// Aucun contenu réel construit ici. Chaque sous-item sera un futur
// commit séparé, dans cet ordre validé :
//   Préparation 1 : Besoins matériels (vue calculée depuis les
//     anomalies — support → référence → quantité, PAS de stockage Dexie)
//   Préparation 2 : Selection enrichie comme pivot transversal
//   Préparation 3 : Résumé de pose SAE (ligne → station → implantation
//     → référence → quantité)
//   Préparation 4 : Exports (matériel / SAE)
// Volontairement PAS de gestion de commandes fournisseur — hors
// périmètre de cette application.
// =================================================================
import React from 'react';
import { PackageSearch, ClipboardList, FileStack, LucideIcon } from 'lucide-react';

const PLANNED: { label: string; description: string; Icon: LucideIcon }[] = [
    {
        label: 'Besoins matériels',
        description: 'Support → référence → quantité, calculé depuis les anomalies. Vue calculée, aucun stockage.',
        Icon: PackageSearch,
    },
    {
        label: 'Commandes',
        description: 'Récapitulatif à transmettre pour fabrication/achat — pas de prix, pas de fournisseur, pas de suivi de livraison.',
        Icon: ClipboardList,
    },
    {
        label: 'Résumés de pose SAE',
        description: 'Ligne → station → implantation → référence → quantité, prêt pour une équipe terrain.',
        Icon: FileStack,
    },
];

const PreparationView: React.FC = () => (
    <div className="py-12 text-center space-y-8">
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Cette section deviendra le pont entre les anomalies constatées et l'action concrète — besoin
            matériel, commande, résumé de pose. Rien n'est encore construit ici ; chaque étape arrivera
            dans son propre commit, dans cet ordre.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {PLANNED.map(({ label, description, Icon }) => (
                <div key={label} className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-left">
                    <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500 mb-2" />
                    <h4 className="font-semibold text-slate-600 dark:text-slate-300 text-sm">{label}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{description}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Bientôt disponible
                    </span>
                </div>
            ))}
        </div>
    </div>
);

export default PreparationView;
