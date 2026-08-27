// components/cockpit/cockpitNav.ts
// Navigation transverse du cockpit — sans router, cohérente avec le
// pilotage par état de toute l'application.
// Toute vue peut demander : « ouvre telle section », éventuellement un
// sous-onglet précis, ou « ouvre la fiche de telle référence » (règle 2
// du contrat : LA fiche unique vit dans la section Référentiel — y
// naviguer est la seule façon de l'ouvrir).
import { createContext, useContext } from 'react';

// Généalogie du cockpit : Référentiel signalétique → Analyse des
// anomalies (constat terrain) ou évolution design → Résumé
// d'intervention destiné au SAE. Frontière stricte : l'application
// produit une INFORMATION (item, quantité, implantations, contexte de
// pose) — jamais la chaîne aval (achat, fabrication, organisation,
// pose), qui reste du ressort du SAE. La qualification du catalogue
// (ex-Arbitrages) n'est pas un étage du flux opérationnel : c'est un
// sous-onglet de Référentiel, réservé aux questions de qualité de
// donnée (le référentiel est-il correct ?), jamais aux constats terrain.
export type CockpitSectionKey = 'synthese' | 'referentiel' | 'audit' | 'sae' | 'historique' | 'admin';

export interface CockpitNavigation {
    /** Change de section ; `subSection` cible un onglet interne à la
     *  section (générique — chaque section interprète sa propre valeur,
     *  ex. Référentiel : 'references' | 'implantations' | 'qualification') ;
     *  si `referenceId` est fourni, la section Référentiel ouvrira la
     *  fiche de vie correspondante à l'activation. */
    navigate: (target: { section: CockpitSectionKey; subSection?: string; referenceId?: string }) => void;
    /** Référence en attente d'ouverture (consommée par ReferentielView). */
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
