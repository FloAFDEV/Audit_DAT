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
// « Additions » (Lot 2a) : une référence créée en Admin, hors du
// catalogue historique, apparaît en fin de liste dès lors que son
// scope correspond — même résolveur générique que le moteur d'index
// du patrimoine (resolveReferencesForEquipment), aucune logique de
// scope dupliquée ici.
// =================================================================
import { Adhesive, PrAdhesive, SignageReference, EquipmentType, EcaEquipmentType } from '../types';
import {
    ADHESIVES, getEcaAdhesives, getPrAdhesives, getEquipmentAdhesives as getLegacyEquipmentAdhesives,
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
 *  des éventuelles références DAT créées en Admin (Lot 2a), jamais insérées
 *  au milieu de l'ordre historique. Une référence ARCHIVÉE — historique ou
 *  addition — disparaît du terrain comme du reste (resolveReferencesForEquipment) ;
 *  resolve() est néanmoins appelé pour les 38 ids AVANT ce filtre, pour que
 *  le garde-fou (id historique manquant) reste actif même sur un id archivé. */
export const getEffectiveAdhesives = (references: SignageReference[]): Adhesive[] => {
    const byId = new Map(references.map(r => [r.id, r]));
    const historical = ADHESIVES
        .map(legacy => ({ legacy, ref: resolve(byId.get(legacy.id), legacy.id) }))
        .filter(({ ref }) => !ref.archivedAt)
        .map(({ legacy, ref }) => toAdhesive(legacy, ref));
    const historicalIds = new Set(ADHESIVES.map(a => a.id));
    const additions = resolveReferencesForEquipment(references, 'DAT')
        .filter(ref => !historicalIds.has(ref.id))
        .map(additionToAdhesive);
    return [...historical, ...additions];
};

/** ECA — historique du type d'équipement donné + additions Admin dont le
 *  scope correspond. Une référence archivée disparaît, historique ou non. */
export const getEffectiveEcaAdhesives = (references: SignageReference[], type: EcaEquipmentType): Adhesive[] => {
    const byId = new Map(references.map(r => [r.id, r]));
    const legacyList = getEcaAdhesives(type);
    const historical = legacyList
        .map(legacy => ({ legacy, ref: resolve(byId.get(legacy.id), legacy.id) }))
        .filter(({ ref }) => !ref.archivedAt)
        .map(({ legacy, ref }) => toAdhesive(legacy, ref));
    const historicalIds = new Set(legacyList.map(a => a.id));
    const additions = resolveReferencesForEquipment(references, 'ECA', type)
        .filter(ref => !historicalIds.has(ref.id))
        .map(additionToAdhesive);
    return [...historical, ...additions];
};

/** P+R — historique du type de borne donné + additions Admin dont le scope
 *  correspond, SAUF si une surcharge locale `adhesiveIds` (Lot 2c/2d) est
 *  posée sur cette borne : liste blanche stricte, dans l'ordre de la
 *  surcharge elle-même. Une surcharge peut désigner AUSSI BIEN un id
 *  historique qu'une addition Admin (resolveReferencesForEquipment n'est pas
 *  utilisé ici : chaque id de la surcharge est résolu individuellement, pas
 *  seulement ceux qui appartiennent au catalogue papier de ce type). Comme la
 *  liste historique, un id isDisabled reste affiché (grisé côté UI) — seul un
 *  id archivé ou définitivement supprimé disparaît (même règle que le reste
 *  de ce fichier), jamais d'erreur : contrairement aux 38 ids historiques,
 *  aucune garantie de présence n'existe pour un id Admin en surcharge. */
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
            .filter((ref): ref is SignageReference => !!ref && !ref.archivedAt)
            .map(ref => {
                const legacy = legacyById.get(ref.id);
                return legacy ? toPrAdhesive(legacy, ref) : additionToPrAdhesive(ref);
            });
    }

    const legacyList = getLegacyEquipmentAdhesives(type);
    const historical = legacyList
        .map(legacy => ({ legacy, ref: resolve(byId.get(legacy.id), legacy.id) }))
        .filter(({ ref }) => !ref.archivedAt)
        .map(({ legacy, ref }) => toPrAdhesive(legacy, ref));
    const historicalIds = new Set(legacyList.map(a => a.id));
    const additions = resolveReferencesForEquipment(references, 'PR', type)
        .filter(ref => !historicalIds.has(ref.id))
        .map(additionToPrAdhesive);
    return [...historical, ...additions];
};
