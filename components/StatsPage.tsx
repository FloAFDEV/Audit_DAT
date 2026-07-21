// components/StatsPage.tsx
// =================================================================
// COCKPIT MÉTIER — coquille de navigation.
// -----------------------------------------------------------------
// Cette page n'est plus une « page de statistiques » : c'est le point
// d'entrée du cockpit d'exploitation du patrimoine signalétique
// (toute la vie de la signalétique après l'audit).
//
// Architecture : un REGISTRE de sections piloté par les données —
// ajouter une capacité au cockpit = ajouter une entrée au registre
// (demain : campagnes, commandes, stocks, pose), jamais restructurer
// cette coquille. La navigation transverse (raccourcis Synthèse →
// sections, ouverture de fiche depuis n'importe où) passe par
// CockpitNavContext — sans router.
//
// Le contrat de plateforme complet (source de calcul unique via le
// moteur d'index, fiche unique, sections pas pages, sélection→action)
// est documenté dans utils/cockpit/patrimoineIndex.ts.
// =================================================================
import React, { lazy, Suspense, useMemo, useState } from 'react';
import { Building, Archive, Landmark, Wrench, Scale, LucideIcon } from 'lucide-react';
import { Lieu } from '../types';
import { Container, Header } from './cockpit/primitives';
import { CockpitNavContext, CockpitSectionKey } from './cockpit/cockpitNav';

const SyntheseView = lazy(() => import('./cockpit/SyntheseView'));
const PatrimoineView = lazy(() => import('./cockpit/PatrimoineView'));
const InterventionsView = lazy(() => import('./cockpit/InterventionsView'));
const ArbitragesView = lazy(() => import('./cockpit/ArbitragesView'));
const HistoriqueView = lazy(() => import('./cockpit/HistoriqueView'));

interface StatsPageProps {
  lieux: Lieu[];
  onBack: () => void;
}

/**
 * Registre des sections du cockpit — une entrée par section, aucune
 * modification du rendu pour en ajouter (demain : campagnes, commandes,
 * stocks, pose).
 */
const COCKPIT_SECTIONS: { key: CockpitSectionKey; label: string; Icon: LucideIcon }[] = [
    { key: 'synthese',      label: 'Synthèse',      Icon: Building },
    { key: 'patrimoine',    label: 'Patrimoine',    Icon: Landmark },
    { key: 'interventions', label: 'Interventions', Icon: Wrench },
    { key: 'arbitrages',    label: 'Arbitrages',    Icon: Scale },
    { key: 'historique',    label: 'Archives',      Icon: Archive },
];

const SectionLoader: React.FC = () => (
    <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500" aria-label="Chargement de la section..."></div>
    </div>
);

const StatsPage: React.FC<StatsPageProps> = ({ lieux, onBack }) => {
  const [activeSection, setActiveSection] = useState<CockpitSectionKey>('synthese');
  const [pendingReferenceId, setPendingReferenceId] = useState<string | null>(null);

  const nav = useMemo(() => ({
      navigate: ({ section, referenceId }: { section: CockpitSectionKey; referenceId?: string }) => {
          // Une fiche demandée s'ouvre toujours dans Patrimoine (fiche unique).
          if (referenceId) {
              setPendingReferenceId(referenceId);
              setActiveSection('patrimoine');
          } else {
              setActiveSection(section);
          }
      },
      pendingReferenceId,
      consumePendingReference: () => setPendingReferenceId(null),
  }), [pendingReferenceId]);

  return (
    <CockpitNavContext.Provider value={nav}>
    <Container>
      <Header title="Cockpit Signalétique" onBack={onBack} />

      {/* Navigation par sections (registre) */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Sections du cockpit">
            {COCKPIT_SECTIONS.map(({ key, label, Icon }) => (
                <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`${activeSection === key ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
                >
                    <Icon className="w-4 h-4" />
                    {label}
                </button>
            ))}
        </nav>
      </div>

      <Suspense fallback={<SectionLoader />}>
        {activeSection === 'synthese' && <SyntheseView lieux={lieux} />}
        {activeSection === 'patrimoine' && <PatrimoineView lieux={lieux} />}
        {activeSection === 'interventions' && <InterventionsView lieux={lieux} />}
        {activeSection === 'arbitrages' && <ArbitragesView />}
        {activeSection === 'historique' && <HistoriqueView />}
      </Suspense>
    </Container>
    </CockpitNavContext.Provider>
  );
};

export default StatsPage;
