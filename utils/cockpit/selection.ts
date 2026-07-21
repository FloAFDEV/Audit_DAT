// utils/cockpit/selection.ts
// =================================================================
// SELECTION — objet métier transversal (commit 6).
// -----------------------------------------------------------------
// Le jalon stratégique de cette phase : une sélection n'est plus une
// simple prop locale à un module, c'est un OBJET DE LA PLATEFORME —
// avec une identité (id), une provenance (source) et un horodatage.
//
//   Selection
//       |
//       ├── Export chantier       (futur consommateur)
//       ├── Campagne remplacement (futur consommateur)
//       ├── Bon de pose           (futur consommateur)
//       └── Analyse               (futur consommateur)
//
// Ce module ne fait QUE produire et manipuler des Selection — aucune
// logique d'export, de campagne ou de commande n'est construite ici.
// Les consommateurs liront ce contrat plus tard ; jamais l'inverse.
// Anomalies n'est plus le propriétaire de la notion de sélection :
// c'est un producteur parmi d'autres (Existant/Références,
// Implantations, Qualification référentiel, futures vues).
//
// Persistance : l'id est renouvelé à chaque calcul (une Selection n'est
// pas encore enregistrée en base). La persistance viendra avec le
// premier consommateur réel qui en aura besoin (ex. une campagne
// nommée à conserver) — ne pas l'anticiper ici serait de la
// sur-ingénierie prématurée.
// =================================================================
import { v4 as uuidv4 } from 'uuid';
import { ImplantationRef, PatrimoineIndex } from './patrimoineIndex';

export type SelectionSource = 'reference' | 'implantation' | 'line' | 'site';

export interface Selection {
    id: string;
    source: SelectionSource;
    label: string;
    items: ImplantationRef[];
    createdAt: string; // ISO
}

export const createSelection = (
    source: SelectionSource,
    label: string,
    items: ImplantationRef[],
): Selection => ({
    id: uuidv4(),
    source,
    label,
    items,
    createdAt: new Date().toISOString(),
});

/** Toutes les implantations d'une référence — source: 'reference'.
 *  Démontre que la sélection ne vient pas que d'Anomalies : la
 *  fiche de vie (Existant) en produit une, du même contrat. */
export const selectionFromReference = (index: PatrimoineIndex, referenceId: string, label: string): Selection =>
    createSelection('reference', label, index.implantations.filter(i => i.referenceId === referenceId));

/** Toutes les implantations d'un lieu — source: 'site'. */
export const selectionFromSite = (index: PatrimoineIndex, lieuId: string, label: string): Selection =>
    createSelection('site', label, index.implantations.filter(i => i.lieuId === lieuId));

/** Toutes les implantations d'une ligne — source: 'line'. */
export const selectionFromLine = (index: PatrimoineIndex, line: string, label: string): Selection =>
    createSelection('line', label, index.implantations.filter(i => i.line === line));

/** Sélection ad hoc à partir d'implantations déjà filtrées (ex. explorateur,
 *  résultat de recherche) — source: 'implantation'. */
export const selectionFromImplantations = (items: ImplantationRef[], label: string): Selection =>
    createSelection('implantation', label, items);
