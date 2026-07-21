// components/cockpit/cockpitNav.ts
// Navigation transverse du cockpit — sans router, cohérente avec le
// pilotage par état de toute l'application.
// Toute vue peut demander : « ouvre telle section », éventuellement un
// sous-onglet précis, ou « ouvre la fiche de telle référence » (règle 2
// du contrat : LA fiche unique vit dans la section Patrimoine — y
// naviguer est la seule façon de l'ouvrir).
import { createContext, useContext } from 'react';

// Généalogie du cockpit : Audit → Patrimoine → Anomalies → Préparation
// → (demain) Pose. « Anomalies » plutôt que « Interventions » : un item
// absent/dégradé/non conforme est un CONSTAT, pas une décision — le
// chemin par défaut (anomalie → besoin de remplacement) est automatique.
// La qualification du catalogue (ex-Arbitrages) n'est plus un étage du
// flux opérationnel : c'est un sous-onglet de Patrimoine, réservé aux
// questions de qualité de donnée (le référentiel est-il correct ?),
// jamais aux constats terrain.
export type CockpitSectionKey = 'synthese' | 'patrimoine' | 'anomalies' | 'preparation' | 'historique';

export interface CockpitNavigation {
    /** Change de section ; `subSection` cible un onglet interne à la
     *  section (générique — chaque section interprète sa propre valeur,
     *  ex. Patrimoine : 'references' | 'implantations' | 'qualification') ;
     *  si `referenceId` est fourni, la section Patrimoine ouvrira la
     *  fiche de vie correspondante à l'activation. */
    navigate: (target: { section: CockpitSectionKey; subSection?: string; referenceId?: string }) => void;
    /** Référence en attente d'ouverture (consommée par PatrimoineView). */
    pendingReferenceId: string | null;
    /** À appeler une fois la fiche ouverte, pour vider la demande. */
    consumePendingReference: () => void;
    /** Sous-onglet en attente d'activation (consommé par la section ciblée). */
    pendingSubSection: string | null;
    /** À appeler une fois le sous-onglet activé, pour vider la demande. */
    consumePendingSubSection: () => void;
}

export const CockpitNavContext = createContext<CockpitNavigation | null>(null);

export const useCockpitNav = (): CockpitNavigation => {
    const ctx = useContext(CockpitNavContext);
    if (!ctx) throw new Error('useCockpitNav doit être utilisé sous CockpitNavContext.Provider (coquille du cockpit).');
    return ctx;
};
