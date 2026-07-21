// data/signage_seed.ts
// =================================================================
// SEED INITIAL DU RÉFÉRENTIEL SIGNALÉTIQUE (spécification commit 1)
// -----------------------------------------------------------------
// Ce module transforme le catalogue historique (data/adhesives.ts) en
// enregistrements SignageReference pour le premier peuplement de la
// table Dexie `signageReferences` (migration v12).
//
// Rôle strictement limité à l'initialisation (R3) : après migration,
// signageReferences est la source de vérité et les corrections métier
// se font dans l'application — jamais ici.
//
// Principes appliqués :
//  - ids historiques conservés à l'identique (R1) ;
//  - scope DÉRIVÉ programmatiquement des listes actuelles (getPrAdhesives /
//    getEcaAdhesives / ADHESIVES) — aucune règle d'implantation recopiée à
//    la main, donc aucune dérive possible avec le comportement existant ;
//  - texte d'origine intégral conservé dans legacyDescription ;
//  - file needsReview initialisée avec les éléments validés (divergences
//    BPU PICTO + qualifications en attente) ;
//  - aucun champ fabrication, prix ou donnée BPU structurante.
// =================================================================

import {
    Adhesive, EquipmentType, EcaEquipmentType,
    SignageReference, SignageScope, SignageDimensions, SignageSupport, ExternalDocumentRef,
} from '../types';
import { ADHESIVES, getPrAdhesives, getEcaAdhesives } from './adhesives';

/**
 * Extrait des dimensions structurées du texte libre historique.
 * Formats rencontrés dans le catalogue : "95x5,8cm", "214x306mm",
 * "32,8 x 45,1cm", "78x120cm"... Échec de parsing = dimensions absentes
 * (cas légitimes : lettrage largeur variable, étiquette sans format).
 */
export const parseLegacyDimensions = (text: string): SignageDimensions | undefined => {
    const m = text.match(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/);
    if (!m) return undefined;
    const toNum = (s: string) => parseFloat(s.replace(',', '.'));
    return { width: toNum(m[1]), height: toNum(m[2]), unit: m[3].toLowerCase() as 'cm' | 'mm' };
};

// -----------------------------------------------------------------
// Décisions de reclassement validées (spécification, R2/R8).
// Défaut : 'adhesif'. Seules les exceptions sont listées.
// -----------------------------------------------------------------
const SUPPORT_OVERRIDES: Record<string, SignageSupport> = {
    // BPU PICTO L39 : « Vinyle blanc repositionnable » — c'est un adhésif,
    // sa particularité « support dédié » relève du placement, pas du support.
    'ad8': 'adhesif',
    // Pose sur vitrage (définition retenue de la vitrophanie).
    'eca-3': 'vitrophanie',
    // Support physique réel mais non encore catégorisé → règle stricte
    // « autre » ⇒ needsReview jusqu'à qualification en administration.
    'adca12': 'autre',
    'adca13': 'autre',
    // Signalisation lumineuse — appartenance au référentiel à qualifier.
    'eca-r-1': 'autre',
};

// File needsReview validée : divergences BPU PICTO + qualifications en attente.
const NEEDS_REVIEW = new Set<string>([
    'ad1',      // catalogue 95x5,8 cm / BPU PICTO L41 : 96,2x6,7 cm
    'ad5',      // catalogue 12,2x10 cm / BPU PICTO L44 : 12,4x10 cm
    'ad12',     // orientation : catalogue 3,7x5,4 cm / BPU PICTO L51 : 5,4x3,7 cm
    'adbe3',    // scope ambigu (description « entrée ET sortie ») + BPU L66 divergent
    'adca12',   // support 'autre' à qualifier
    'adca13',   // support 'autre' à qualifier
    'eca-r-1',  // signalisation lumineuse : appartenance au référentiel à trancher
    'eca-11',   // étiquette identifiant : dimensions et nature à préciser
]);

// Équivalences métier (comptage commun dans l'inventaire — jamais de fusion, R1).
const SAME_AS: Record<string, string[]> = {
    'adbe2': ['adbs2'], // même artwork « P+r-rustine-ticket-P+r_2025-02-12 »
    'adbs2': ['adbe2'],
    'adbe3': ['adca9'], // même visuel « Tarifs + coordonnées Parc Relais » 34x8
    'adca9': ['adbe3'],
};

// Associations physiques posées ensemble (recto/verso). Symétrie maintenue ici
// au seed ; en administration, c'est une responsabilité de l'écran (R1).
const PAIRED_WITH: Record<string, string> = {
    'adca12': 'adca13',
    'adca13': 'adca12',
};

// Divergences BPU PICTO tracées comme références documentaires (R8 : jamais
// corrigées en silence — elles alimentent la file d'administration).
const BPU_DIVERGENCE_DOCS: Record<string, ExternalDocumentRef> = {
    'ad1':   { provider: 'PICTO', fileReference: 'BPU ligne 41', note: 'Divergence dimensions : catalogue 95x5,8 cm / BPU 96,2x6,7 cm — à arbitrer.' },
    'ad5':   { provider: 'PICTO', fileReference: 'BPU ligne 44', note: 'Divergence dimensions : catalogue 12,2x10 cm / BPU 12,4x10 cm — à arbitrer.' },
    'ad12':  { provider: 'PICTO', fileReference: 'BPU ligne 51', note: 'Orientation inversée : catalogue 3,7x5,4 cm / BPU 5,4x3,7 cm (libellé BPU « BAU Tram ») — à arbitrer.' },
    'adbe3': { provider: 'PICTO', fileReference: 'BPU ligne 66', note: 'Ambiguïté : BPU « Borne P+r - Tarifs » 10x15 cm vs catalogue 34x8 cm ; description historique indique « entrée ET sortie » mais scope actuel = BE seul — à arbitrer.' },
};

/** Reprend le champ `referentiel` historique (chemin UNC ou réf. marché)
 *  comme référence documentaire externe. Prestataire à qualifier en admin. */
const legacyReferentielDoc = (referentiel: string | undefined): ExternalDocumentRef | undefined => {
    if (!referentiel || referentiel.trim() === '') return undefined;
    return {
        provider: 'À qualifier',
        fileReference: referentiel.trim(),
        note: 'Repris automatiquement du champ « referentiel » historique.',
    };
};

const buildReference = (ad: Adhesive, scope: SignageScope, legacyDescription: string): SignageReference => {
    const externalDocuments: ExternalDocumentRef[] = [];
    const legacyDoc = legacyReferentielDoc(ad.referentiel);
    if (legacyDoc) externalDocuments.push(legacyDoc);
    if (BPU_DIVERGENCE_DOCS[ad.id]) externalDocuments.push(BPU_DIVERGENCE_DOCS[ad.id]);

    return {
        id: ad.id,
        name: ad.name,
        auditType: scope.auditType, // R11 : dérivé du scope, jamais indépendant
        scope,
        version: 1,
        support: SUPPORT_OVERRIDES[ad.id] ?? 'adhesif',
        dimensions: parseLegacyDimensions(legacyDescription),
        // Le placement structuré (zone/position/repère/consignes) sera renseigné
        // en administration : le découpage automatique du texte libre serait
        // trop fragile — legacyDescription conserve tout en attendant.
        placement: {},
        ...(externalDocuments.length > 0 ? { externalDocuments } : {}),
        ...(SAME_AS[ad.id] ? { sameAs: SAME_AS[ad.id] } : {}),
        ...(PAIRED_WITH[ad.id] ? { pairedWith: PAIRED_WITH[ad.id] } : {}),
        ...(ad.isDisabled ? { isDisabled: true } : {}),
        ...(NEEDS_REVIEW.has(ad.id) ? { needsReview: true } : {}),
        legacyDescription,
    };
};

/**
 * Construit les 38 enregistrements du référentiel depuis le catalogue
 * historique. Les scopes P+R et ECA sont DÉRIVÉS de l'appartenance réelle
 * aux listes actuelles (aucune recopie manuelle des règles d'implantation).
 */
export const buildSignageReferencesSeed = (): SignageReference[] => {
    const seed: SignageReference[] = [];

    // --- DAT : toutes les références s'appliquent à tous les DAT ---
    for (const ad of ADHESIVES) {
        seed.push(buildReference(ad, { auditType: 'DAT' }, ad.description));
    }

    // --- P+R : scope dérivé de l'appartenance aux listes BE / BS / CA ---
    const prMembership = new Map<string, { ad: Adhesive; types: EquipmentType[]; location: string }>();
    for (const type of Object.values(EquipmentType)) {
        for (const ad of getPrAdhesives(type)) {
            const entry = prMembership.get(ad.id);
            if (entry) entry.types.push(type);
            else prMembership.set(ad.id, { ad, types: [type], location: ad.location });
        }
    }
    const allPrTypes = Object.values(EquipmentType).length;
    for (const { ad, types, location } of prMembership.values()) {
        const scope: SignageScope = types.length === allPrTypes
            ? { auditType: 'PR' }
            : { auditType: 'PR', equipmentTypes: types };
        const legacy = location ? `${ad.description} | Localisation: ${location}` : ad.description;
        seed.push(buildReference(ad, scope, legacy));
    }

    // --- ECA : scope dérivé de l'appartenance aux listes par type d'équipement ---
    const ecaMembership = new Map<string, { ad: Adhesive; types: EcaEquipmentType[] }>();
    for (const type of Object.values(EcaEquipmentType)) {
        for (const ad of getEcaAdhesives(type)) {
            const entry = ecaMembership.get(ad.id);
            if (entry) entry.types.push(type);
            else ecaMembership.set(ad.id, { ad, types: [type] });
        }
    }
    const allEcaTypes = Object.values(EcaEquipmentType).length;
    for (const { ad, types } of ecaMembership.values()) {
        const scope: SignageScope = types.length === allEcaTypes
            ? { auditType: 'ECA' }
            : { auditType: 'ECA', equipmentTypes: types };
        seed.push(buildReference(ad, scope, ad.description));
    }

    return seed;
};
