// components/cockpit/cockpitNav.ts
// Navigation transverse du cockpit — sans router, cohérente avec le
// pilotage par état de toute l'application.
// Toute vue peut demander : « ouvre telle section » ou « ouvre la fiche
// de telle référence » (règle 2 du contrat : LA fiche unique vit dans
// la section Patrimoine — y naviguer est la seule façon de l'ouvrir).
import { createContext, useContext } from 'react';

// Généalogie du cockpit : Audit → Patrimoine → Interventions → (demain) Pose.
// "Interventions" plutôt que "Maintenance" : c'est la finalité métier
// (préparer l'action), la maintenance en redeviendra un filtre parmi
// d'autres plutôt que le nom de la section.
export type CockpitSectionKey = 'synthese' | 'patrimoine' | 'interventions' | 'arbitrages' | 'historique';

export interface CockpitNavigation {
    /** Change de section ; si referenceId est fourni, la section Patrimoine
     *  ouvrira la fiche de vie correspondante à l'activation. */
    navigate: (target: { section: CockpitSectionKey; referenceId?: string }) => void;
    /** Référence en attente d'ouverture (consommée par PatrimoineView). */
    pendingReferenceId: string | null;
    /** À appeler une fois la fiche ouverte, pour vider la demande. */
    consumePendingReference: () => void;
}

export const CockpitNavContext = createContext<CockpitNavigation | null>(null);

export const useCockpitNav = (): CockpitNavigation => {
    const ctx = useContext(CockpitNavContext);
    if (!ctx) throw new Error('useCockpitNav doit être utilisé sous CockpitNavContext.Provider (coquille du cockpit).');
    return ctx;
};
