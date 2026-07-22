// components/StatsPage.tsx
// =================================================================
// COCKPIT MÉTIER — coquille de navigation.
// -----------------------------------------------------------------
// Cette page n'est plus une « page de statistiques » : c'est le point
// d'entrée du cockpit d'exploitation du patrimoine signalétique
// (toute la vie de la signalétique après l'audit).
//
// Flux métier : Référentiel signalétique → Analyse des anomalies
// (constat terrain) ou évolution design → Résumé d'intervention destiné
// au SAE → Historique. Frontière stricte : l'application produit une
// INFORMATION (item, quantité, implantations, contexte de pose) —
// jamais la chaîne aval (achat, fabrication, organisation, pose), qui
// reste du ressort du SAE.
// « Résumé d'intervention » (section SAE) reste un placeholder qui
// matérialise l'arborescence cible, en attente d'un futur commit dédié.
// Un export est une action locale à la vue qui produit la donnée —
// jamais une section à part : pas d'onglet « Exports » dans ce cockpit.
//
// Architecture : un REGISTRE de sections piloté par les données —
// ajouter une capacité au cockpit = ajouter une entrée au registre,
// jamais restructurer cette coquille. La navigation transverse
// (raccourcis Synthèse → sections/sous-onglets, ouverture de fiche
// depuis n'importe où) passe par CockpitNavContext — sans router.
//
// Le contrat de plateforme complet (source de calcul unique via le
// moteur d'index, fiche unique, sections pas pages, sélection→action,
// trois mémoires jamais confondues) est documenté dans
// utils/cockpit/patrimoineIndex.ts et utils/cockpit/selection.ts.
// =================================================================
import React, { lazy, Suspense, useMemo, useState } from 'react';
import { Building, Archive, Landmark, AlertTriangle, Send, LucideIcon } from 'lucide-react';
import { Lieu } from '../types';
import { Container, Header } from './cockpit/primitives';
import { CockpitNavContext, CockpitSectionKey } from './cockpit/cockpitNav';

const SyntheseView = lazy(() => import('./cockpit/SyntheseView'));
const ReferentielView = lazy(() => import('./cockpit/ReferentielView'));
const AnomaliesView = lazy(() => import('./cockpit/AnomaliesView'));
const SAEView = lazy(() => import('./cockpit/SAEView'));
const HistoriqueView = lazy(() => import('./cockpit/HistoriqueView'));

interface StatsPageProps {
  lieux: Lieu[];
  onBack: () => void;
}

/**
 * Registre des sections du cockpit — une entrée par section, aucune
 * modification du rendu pour en ajouter (demain : contenu réel du
 * Résumé d'intervention SAE).
 */
const COCKPIT_SECTIONS: { key: CockpitSectionKey; label: string; Icon: LucideIcon }[] = [
    { key: 'synthese',   label: 'Synthèse',              Icon: Building },
    { key: 'referentiel', label: 'Référentiel',          Icon: Landmark },
    { key: 'audit',      label: 'Analyse des anomalies', Icon: AlertTriangle },
    { key: 'sae',        label: 'SAE',                   Icon: Send },
    { key: 'historique', label: 'Archives',              Icon: Archive },
];

const SectionLoader: React.FC = () => (
    <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500" aria-label="Chargement de la section..."></div>
    </div>
);

const StatsPage: React.FC<StatsPageProps> = ({ lieux, onBack }) => {
  const [activeSection, setActiveSection] = useState<CockpitSectionKey>('synthese');
  const [pendingReferenceId, setPendingReferenceId] = useState<string | null>(null);
  const [pendingSubSection, setPendingSubSection] = useState<string | null>(null);

  const nav = useMemo(() => ({
      navigate: ({ section, subSection, referenceId }: { section: CockpitSectionKey; subSection?: string; referenceId?: string }) => {
          if (subSection) setPendingSubSection(subSection);
          // Une fiche demandée s'ouvre toujours dans Référentiel (fiche unique).
          if (referenceId) {
              setPendingReferenceId(referenceId);
              setActiveSection('referentiel');
          } else {
              setActiveSection(section);
          }
      },
      pendingReferenceId,
      consumePendingReference: () => setPendingReferenceId(null),
      pendingSubSection,
      consumePendingSubSection: () => setPendingSubSection(null),
  }), [pendingReferenceId, pendingSubSection]);

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
        {activeSection === 'referentiel' && <ReferentielView lieux={lieux} />}
        {activeSection === 'audit' && <AnomaliesView lieux={lieux} />}
        {activeSection === 'sae' && <SAEView />}
        {activeSection === 'historique' && <HistoriqueView />}
      </Suspense>
    </Container>
    </CockpitNavContext.Provider>
  );
};

export default StatsPage;
