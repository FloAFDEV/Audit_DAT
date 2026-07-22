// components/cockpit/primitives.tsx
// =================================================================
// Primitives UI partagées du cockpit métier.
// Extraction PURE depuis StatsPage.tsx (aucun changement de style) :
// toutes les sections du cockpit (Synthèse, Référentiel, Analyse des
// anomalies, SAE, Archives et futures) composent ces briques — jamais
// leurs propres variantes locales.
// =================================================================
import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Logo } from '../Logo';

export const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="max-w-7xl mx-auto space-y-8">
    {children}
  </div>
);

export const Header: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="flex items-center gap-4">
    <button
      onClick={onBack}
      className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
      aria-label="Retour"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
    <div className="flex items-center gap-3">
        <Logo className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600 dark:text-teal-400" />
        <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-gray-900 dark:text-slate-100">{title}</h1>
    </div>
  </div>
);

// StatCard optimisé pour l'esthétique
export const StatCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
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

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm md:text-base font-semibold text-slate-600 dark:text-slate-300 mb-3 uppercase tracking-wider">{children}</h3>
);

/** Tuile d'indicateur compacte — partagée par toutes les sections du cockpit.
 *  Cliquable si onClick est fourni (raccourci de navigation métier). */
export const IndicatorTile: React.FC<{
    value: number;
    label: string;
    tone: 'teal' | 'red' | 'amber' | 'slate' | 'sky';
    onClick?: () => void;
}> = ({ value, label, tone, onClick }) => {
    const tones: Record<string, string> = {
        teal:  'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-900/30 text-teal-700 dark:text-teal-300',
        red:   'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300',
        amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300',
        slate: 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
        sky:   'bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-900/30 text-sky-700 dark:text-sky-300',
    };
    const content = (
        <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs font-semibold uppercase mt-1 opacity-80">{label}</div>
        </>
    );
    if (onClick) {
        return (
            <button onClick={onClick} className={`p-3 rounded-lg border text-center w-full transition-transform hover:scale-[1.02] hover:shadow-sm ${tones[tone]}`}>
                {content}
            </button>
        );
    }
    return <div className={`p-3 rounded-lg border text-center ${tones[tone]}`}>{content}</div>;
};

// StatRow centralisant l'amélioration des styles de valeur
export const StatRow: React.FC<{
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  isSubItem?: boolean;
  highlight?: 'danger' | 'warning' | 'info' | 'primary' | null; // 'primary' pour les totaux
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
                 highlight === 'warning' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 font-semibold px-2 py-0.5 rounded' :
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
   Carte compacte « État des anomalies » — une par référentiel autonome
   (Synthèse et Analyse des anomalies la composent toutes deux, jamais
   de variante locale). Ne recalcule rien : reçoit un compte déjà
   produit ailleurs (patrimoineIndex, generateMaintenanceSummary filtré,
   signaletiqueStationIndex...). Jamais de total fusionné entre cartes.
   ===================== */

export interface AnomalySummaryCardProps {
    icon: React.ReactNode;
    title: string;
    count: number;
    subCounts?: { label: string; value: number; tone: 'red' | 'amber' }[];
    detailLabel: string;
    detailDisabled?: boolean;
    onDetail: () => void;
}

export const AnomalySummaryCard: React.FC<AnomalySummaryCardProps> = ({ icon, title, count, subCounts, detailLabel, detailDisabled, onDetail }) => {
    const hasAnomalies = count > 0;
    return (
        <div className={`rounded-xl border p-4 shadow-sm flex flex-col gap-3 ${hasAnomalies ? 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full ${hasAnomalies ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        {icon}
                    </div>
                    <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{title}</span>
                </div>
                {hasAnomalies && (
                    <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-xs font-bold bg-red-600 text-white" aria-label={`${count} anomalies`}>
                        {count}
                    </span>
                )}
            </div>

            <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold ${hasAnomalies ? 'text-red-700 dark:text-red-300' : 'text-slate-400 dark:text-slate-500'}`}>{count}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">anomalie{count > 1 ? 's' : ''}</span>
            </div>

            {subCounts && subCounts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {subCounts.map(sc => (
                        <span
                            key={sc.label}
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${sc.tone === 'red' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'}`}
                        >
                            {sc.value} {sc.label}
                        </span>
                    ))}
                </div>
            )}

            <button
                onClick={onDetail}
                disabled={detailDisabled}
                className="mt-auto inline-flex items-center justify-center gap-1 text-sm font-semibold rounded-lg px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {detailLabel} <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
};
