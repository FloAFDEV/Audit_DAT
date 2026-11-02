// utils/effectiveAdhesives.ts
// =================================================================
// PONT entre le catalogue historique (data/adhesives.ts — ORDRE et
// APPARTENANCE, jamais modifiés) et le référentiel Dexie
// signageReferences (source du CONTENU affiché : nom, description,
// isDisabled...). Lot 1.
// -----------------------------------------------------------------
// Pourquoi ne pas lire db.signageReferences.toArray() directement pour
// l'ordre d'affichage ? Dexie restitue les enregistrements par ordre
// lexicographique de clé primaire, pas l'ordre du catalogue papier —
// et cet ordre terrain historique ne doit subir AUCUNE régression (R1).
// Les fonctions ci-dessous préservent donc EXACTEMENT l'ordre et
// l'appartenance historiques (dérivés des fonctions inchangées de
// data/adhesives.ts) et résolvent seulement le CONTENU depuis Dexie.
//
// Garde-fou : si un id historique venait à manquer de signageReferences
// (ne devrait jamais arriver — la table est seedée avec les 38 ids au
// premier lancement, cf. data/signage_seed.ts), resolve() lève une
// erreur explicite plutôt que d'afficher silencieusement une liste
// tronquée au terrain.
//
// « Additions » : une référence hors du catalogue historique apparaît en
// fin de liste dès lors que son scope correspond — même résolveur
// générique que le moteur d'index du patrimoine
// (resolveReferencesForEquipment), aucune logique de scope dupliquée ici.
// =================================================================
import { Adhesive, PrAdhesive, SignageReference, EquipmentType, EcaEquipmentType } from '../types';
import {
    ADHESIVES, getEcaAdhesives, getPrAdhesives, getEquipmentAdhesives as getLegacyEquipmentAdhesives,
    getEcaAdhesiveOccurrences, EcaAdhesiveOccurrence,
} from '../data/adhesives';
import { resolveReferencesForEquipment } from './cockpit/patrimoineIndex';

// -----------------------------------------------------------------
// Convention PR : la fiche Admin sépare description et localisation,
// mais le référentiel ne stocke qu'un texte libre (legacyDescription) —
// même séparateur utilisé au seed (data/signage_seed.ts) et ici, pour
// un aller-retour identique quelle que soit l'origine de l'item.
// -----------------------------------------------------------------
export const PR_LOCATION_SEPARATOR = ' | Localisation: ';

export const splitLegacyPrDescription = (
    legacyDescription: string | undefined,
    fallbackDescription: string,
    fallbackLocation: string,
): { description: string; location: string } => {
    if (!legacyDescription) return { description: fallbackDescription, location: fallbackLocation };
    const idx = legacyDescription.indexOf(PR_LOCATION_SEPARATOR);
    if (idx === -1) return { description: legacyDescription, location: fallbackLocation };
    return {
        description: legacyDescription.slice(0, idx),
        location: legacyDescription.slice(idx + PR_LOCATION_SEPARATOR.length),
    };
};

export const buildLegacyPrDescription = (description: string, location: string): string =>
    location ? `${description}${PR_LOCATION_SEPARATOR}${location}` : description;

// -----------------------------------------------------------------
// Union de tous les ids du catalogue historique (DAT + P+R + ECA) —
// utilisée ici pour distinguer « historique » d'« addition Admin », et
// réutilisée en Lot 2a pour interdire la suppression définitive d'un id
// historique (resolve() ci-dessous lèverait sinon au premier affichage
// terrain suivant).
// -----------------------------------------------------------------
const legacyIdSet: Set<string> = (() => {
    const ids = new Set<string>();
    ADHESIVES.forEach(a => ids.add(a.id));
    Object.values(EquipmentType).forEach(t => getPrAdhesives(t).forEach(a => ids.add(a.id)));
    Object.values(EcaEquipmentType).forEach(t => getEcaAdhesives(t).forEach(a => ids.add(a.id)));
    return ids;
})();

export const isLegacyCatalogId = (id: string): boolean => legacyIdSet.has(id);

const resolve = (ref: SignageReference | undefined, legacyId: string): SignageReference => {
    if (!ref) {
        throw new Error(
            `Référence historique absente du référentiel signalétique : "${legacyId}". `
            + 'signageReferences doit toujours contenir les ids historiques (data/adhesives.ts) — '
            + 'vérifier le seed (data/signage_seed.ts) ou une suppression définitive incorrecte.'
        );
    }
    return ref;
};

const toAdhesive = (legacy: Adhesive, ref: SignageReference): Adhesive => ({
    id: ref.id,
    name: ref.name,
    description: ref.legacyDescription ?? legacy.description,
    referentiel: legacy.referentiel,
    groupId: legacy.groupId,
    groupName: legacy.groupName,
    isDisabled: ref.isDisabled,
});

const toPrAdhesive = (legacy: PrAdhesive, ref: SignageReference): PrAdhesive => {
    const { description, location } = splitLegacyPrDescription(ref.legacyDescription, legacy.description, legacy.location);
    return {
        id: ref.id,
        name: ref.name,
        description,
        location,
        referentiel: legacy.referentiel,
        isDisabled: ref.isDisabled,
    };
};

const additionToAdhesive = (ref: SignageReference): Adhesive => ({
    id: ref.id,
    name: ref.name,
    description: ref.legacyDescription ?? '',
    referentiel: '',
    isDisabled: ref.isDisabled,
});

const additionToPrAdhesive = (ref: SignageReference): PrAdhesive => {
    const { description, location } = splitLegacyPrDescription(ref.legacyDescription, ref.legacyDescription ?? '', '');
    return { id: ref.id, name: ref.name, description, location, referentiel: '', isDisabled: ref.isDisabled };
};

/** DAT — les 12 adhésifs historiques (contenu résolu depuis Dexie) suivis
 *  des éventuelles références DAT additionnelles, jamais insérées au milieu
 *  de l'ordre historique. resolve() est appelé pour les 38 ids pour que le
 *  garde-fou (id historique manquant) reste actif. */
export const getEffectiveAdhesives = (references: SignageReference[]): Adhesive[] => {
    const byId = new Map(references.map(r => [r.id, r]));
    const historical = ADHESIVES
        .map(legacy => ({ legacy, ref: resolve(byId.get(legacy.id), legacy.id) }))
        .map(({ legacy, ref }) => toAdhesive(legacy, ref));
    const historicalIds = new Set(ADHESIVES.map(a => a.id));
    const additions = resolveReferencesForEquipment(references, 'DAT')
        .filter(ref => !historicalIds.has(ref.id))
        .map(additionToAdhesive);
    return [...historical, ...additions];
};

/** ECA — historique du type d'équipement donné + additions dont le scope
 *  correspond. */
export const getEffectiveEcaAdhesives = (references: SignageReference[], type: EcaEquipmentType): Adhesive[] => {
    const byId = new Map(references.map(r => [r.id, r]));
    const legacyList = getEcaAdhesives(type);
    const historical = legacyList
        .map(legacy => ({ legacy, ref: resolve(byId.get(legacy.id), legacy.id) }))
        .map(({ legacy, ref }) => toAdhesive(legacy, ref));
    const historicalIds = new Set(legacyList.map(a => a.id));
    const additions = resolveReferencesForEquipment(references, 'ECA', type)
        .filter(ref => !historicalIds.has(ref.id))
        .map(additionToAdhesive);
    return [...historical, ...additions];
};

/** ECA — comme getEffectiveEcaAdhesives, mais avec le détail par occurrence
 *  (zone de validation ZH/ZB pour eca-1 sur un ECA d'entrée) plutôt que par
 *  simple id catalogue. Le contenu (nom/description/isDisabled) reste
 *  résolu depuis Dexie exactement comme les autres occurrences historiques ;
 *  seules les clés de statut (statusKey) et le libellé de zone diffèrent. */
export const getEffectiveEcaAdhesiveOccurrences = (
    references: SignageReference[], type: EcaEquipmentType,
): EcaAdhesiveOccurrence[] => {
    const byId = new Map(references.map(r => [r.id, r]));
    const legacyById = new Map(getEcaAdhesives(type).map(a => [a.id, a]));
    const historical = getEcaAdhesiveOccurrences(type).map(occ => ({
        ...occ,
        ...toAdhesive(legacyById.get(occ.id)!, resolve(byId.get(occ.id), occ.id)),
    }));
    const historicalIds = new Set(legacyById.keys());
    const additions = resolveReferencesForEquipment(references, 'ECA', type)
        .filter(ref => !historicalIds.has(ref.id))
        .map((ref): EcaAdhesiveOccurrence => ({ ...additionToAdhesive(ref), statusKey: ref.id }));
    return [...historical, ...additions];
};

/** P+R — historique du type de borne donné + additions dont le scope
 *  correspond, SAUF si une surcharge locale `adhesiveIds` est posée sur
 *  cette borne : liste blanche stricte, dans l'ordre de la surcharge
 *  elle-même. Une surcharge peut désigner AUSSI BIEN un id historique qu'une
 *  addition (resolveReferencesForEquipment n'est pas utilisé ici : chaque id
 *  de la surcharge est résolu individuellement, pas seulement ceux qui
 *  appartiennent au catalogue papier de ce type). Comme la liste historique,
 *  un id isDisabled reste affiché (grisé côté UI). */
export const getEffectiveEquipmentAdhesives = (
    references: SignageReference[],
    type: EquipmentType,
    adhesiveIds?: string[],
): PrAdhesive[] => {
    const byId = new Map(references.map(r => [r.id, r]));

    if (adhesiveIds) {
        const legacyById = new Map(getPrAdhesives(type).map(a => [a.id, a]));
        return adhesiveIds
            .map(id => byId.get(id))
            .filter((ref): ref is SignageReference => !!ref)
            .map(ref => {
                const legacy = legacyById.get(ref.id);
                return legacy ? toPrAdhesive(legacy, ref) : additionToPrAdhesive(ref);
            });
    }

    const legacyList = getLegacyEquipmentAdhesives(type);
    const historical = legacyList
        .map(legacy => ({ legacy, ref: resolve(byId.get(legacy.id), legacy.id) }))
        .map(({ legacy, ref }) => toPrAdhesive(legacy, ref));
    const historicalIds = new Set(legacyList.map(a => a.id));
    const additions = resolveReferencesForEquipment(references, 'PR', type)
        .filter(ref => !historicalIds.has(ref.id))
        .map(additionToPrAdhesive);
    return [...historical, ...additions];
};

// -----------------------------------------------------------------
// Libellés des EXPORTS — résolus depuis le catalogue IndexedDB
// (signageReferences), sans jamais interrompre un export. Contrairement
// aux listes du terrain ci-dessus (resolve() lève si un id historique
// manque), un export doit toujours aboutir : chaque libellé indique sa
// provenance, explicitement.
//   - 'catalogue' : référence présente dans signageReferences ;
//   - 'legacy'    : absente du catalogue → libellé du catalogue historique
//                   (data/adhesives.ts), à défaut de mieux ;
//   - absent (undefined) : introuvable partout — l'appelant l'indique.
// Identifiants, ordre et appartenance : ceux du catalogue historique,
// comme pour le terrain.
// -----------------------------------------------------------------
export type CatalogueLabelSource = 'catalogue' | 'legacy';
export type ExportAdhesive = Adhesive & { source: CatalogueLabelSource };
export type ExportPrAdhesive = PrAdhesive & { source: CatalogueLabelSource };
export type ExportEcaOccurrence = EcaAdhesiveOccurrence & { source: CatalogueLabelSource };

export const buildExportCatalogue = (references: SignageReference[]) => {
    const byId = new Map(references.map(r => [r.id, r]));
    const datLegacy = new Map(ADHESIVES.map(a => [a.id, a]));

    /** Adhésif DAT par id (historique ou addition du catalogue). */
    const datAdhesive = (id: string): ExportAdhesive | undefined => {
        const ref = byId.get(id);
        const legacy = datLegacy.get(id);
        if (ref) return { ...(legacy ? toAdhesive(legacy, ref) : additionToAdhesive(ref)), source: 'catalogue' };
        return legacy ? { ...legacy, source: 'legacy' } : undefined;
    };

    /** Adhésif P+R par id pour un type de borne (historique du type, ou
     *  toute référence du catalogue — surcharges locales comprises). */
    const prAdhesive = (type: EquipmentType, id: string): ExportPrAdhesive | undefined => {
        const ref = byId.get(id);
        const legacy = getPrAdhesives(type).find(a => a.id === id);
        if (ref) return { ...(legacy ? toPrAdhesive(legacy, ref) : additionToPrAdhesive(ref)), source: 'catalogue' };
        return legacy ? { ...legacy, source: 'legacy' } : undefined;
    };

    /** Occurrences ECA d'un type (zones comprises) + additions du catalogue. */
    const ecaOccurrences = (type: EcaEquipmentType): ExportEcaOccurrence[] => {
        const legacyById = new Map(getEcaAdhesives(type).map(a => [a.id, a]));
        const historical = getEcaAdhesiveOccurrences(type).map((occ): ExportEcaOccurrence => {
            const ref = byId.get(occ.id);
            return ref
                ? { ...occ, ...toAdhesive(legacyById.get(occ.id)!, ref), source: 'catalogue' }
                : { ...occ, source: 'legacy' };
        });
        const additions = resolveReferencesForEquipment(references, 'ECA', type)
            .filter(ref => !legacyById.has(ref.id))
            .map((ref): ExportEcaOccurrence => ({ ...additionToAdhesive(ref), statusKey: ref.id, source: 'catalogue' }));
        return [...historical, ...additions];
    };

    return { datAdhesive, prAdhesive, ecaOccurrences };
};
