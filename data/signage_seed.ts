// data/signage_seed.ts
// =================================================================
// SEED INITIAL DU RÉFÉRENTIEL SIGNALÉTIQUE (spécification commit 1)
// -----------------------------------------------------------------
// Ce module transforme le catalogue historique (data/adhesives.ts) en
// enregistrements SignageReference pour le premier peuplement de la
// table Dexie `signageReferences` (migration v12).
//
// Rôle : le référentiel DAT/PR/ECA est une donnée STATIQUE distribuée avec
// le build (aucune administration locale). Toute correction métier se fait
// ICI, dans le code source, puis se distribue via une nouvelle version de
// l'application — jamais depuis l'app elle-même. Une correction qui doit
// aussi atteindre les appareils déjà provisionnés passe par une migration
// Dexie dédiée (db.ts), qui patche les enregistrements déjà persistés sans
// jamais toucher aux données d'audit.
//
// Principes appliqués :
//  - ids historiques conservés à l'identique (R1) ;
//  - scope DÉRIVÉ programmatiquement des listes actuelles (getPrAdhesives /
//    getEcaAdhesives / ADHESIVES) — aucune règle d'implantation recopiée à
//    la main, donc aucune dérive possible avec le comportement existant ;
//  - texte d'origine intégral conservé dans legacyDescription ;
//  - qualification du catalogue tranchée UNE FOIS dans le code
//    (ARBITRAGE_DECISIONS ci-dessous), jamais laissée en attente d'une
//    décision interactive locale ;
//  - aucun champ fabrication, prix ou donnée BPU structurante.
// =================================================================

import {
    Adhesive, EquipmentType, EcaEquipmentType, ArbitrageStatus,
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
    // Affichage digital intégré au caisson à la conception — ni adhésif, ni
    // aucun autre support physique posable ; classement 'autre' maintenu
    // bien que la référence soit désactivée (cf. ARBITRAGE_DECISIONS).
    'eca-r-1': 'autre',
};

// Date de la décision de qualification ci-dessous — fixe (pas new Date()) :
// la donnée doit être identique sur tous les appareils, indépendamment du
// moment où le build tourne localement.
const SEED_QUALIFICATION_DATE = '2026-09-09T00:00:00.000Z';

// Qualification du catalogue — décisions tranchées une fois pour toutes
// (jamais laissées à une administration locale, cf. en-tête de fichier).
// Chaque entrée remplace l'ancien needsReview interactif par une décision
// explicite, versionnée avec le code.
const ARBITRAGE_DECISIONS: Record<string, { status: ArbitrageStatus; reason: string }> = {
    'ad1': {
        status: 'keep',
        reason: "Divergence BPU PICTO L41 (96,2x6,7 cm) jugée non significative — dimension catalogue 95x5,8 cm retenue.",
    },
    'ad5': {
        status: 'keep',
        reason: "Divergence BPU PICTO L44 (12,4x10 cm) jugée non significative — dimension catalogue 12,2x10 cm retenue.",
    },
    'ad12': {
        status: 'keep',
        reason: "Le catalogue avait interverti largeur et hauteur — dimension corrigée à 5,4x3,7 cm (largeur x hauteur), conforme au BPU PICTO L51. Adhésif non produit en interne mais bien référencé.",
    },
    'adbe3': {
        status: 'keep',
        reason: "Confirmé : posé sur la casquette supérieure des bornes d'entrée ET de sortie, 34x8 cm. L'entrée BPU L66 « Borne P+r - Tarifs » 10x15 cm est obsolète. Scope étendu à Bornes Sortie via la référence adbs3 (même visuel).",
    },
    'adca12': {
        status: 'keep',
        reason: "Support confirmé : adhésif simple, format 78x120 cm, posé sur la vitre latérale extérieure des caisses automatiques.",
    },
    'adca13': {
        status: 'keep',
        reason: "Verso de adca12 (dos gris), même format 78x120 cm, adhésif simple.",
    },
    'eca-r-1': {
        status: 'remove',
        reason: "Affichage digital intégré au caisson de l'ECA à la conception — non auditable, non modifiable sur le terrain. Retiré du référentiel actif (désactivé, jamais supprimé, R1).",
    },
    'eca-11': {
        status: 'keep',
        reason: "Étiquette de numéro de valideur, produite en interne, posée sur le corps de l'ECA — équivalent de l'item 9 des DAT. La numérotation suit l'identifiant du valideur (ex. valideur 4 → chiffre 4).",
    },
};

// Équivalences métier (comptage commun dans l'inventaire — jamais de fusion, R1).
const SAME_AS: Record<string, string[]> = {
    'adbe2': ['adbs2'], // même artwork « P+r-rustine-ticket-P+r_2025-02-12 »
    'adbs2': ['adbe2'],
    // Même visuel « Tarifs + coordonnées Parc Relais » 34x8, posé sur les
    // bornes d'entrée, de sortie et les caisses automatiques (qualifié,
    // cf. ARBITRAGE_DECISIONS['adbe3']).
    'adbe3': ['adca9', 'adbs3'],
    'adbs3': ['adbe3', 'adca9'],
    'adca9': ['adbe3', 'adbs3'],
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
        ...(ARBITRAGE_DECISIONS[ad.id]
            ? { arbitrage: { ...ARBITRAGE_DECISIONS[ad.id], createdAt: SEED_QUALIFICATION_DATE } }
            : {}),
        legacyDescription,
    };
};

// -----------------------------------------------------------------
// Plans de quartier (+ PEM 3D) — référentiel figé, 4 modèles connus.
// -----------------------------------------------------------------
// Dimensions confirmées : 78cm, JAMAIS 80cm (corrigé du texte historique
// qui utilisait par erreur 80x..). Le 78x100 (sans header/footer) est
// TOUJOURS plastifié — jamais en version adhésive. Le 78x120 (avec
// header/footer), lui, existe dans les deux supports : plastifié (le plus
// courant) ou adhésif — même dimension physique, seul le support diffère,
// d'où un modèle de référentiel dédié (pdq-adhesif) plutôt qu'un champ
// variable sur pdq-78x120. PEM 3D : 120x80cm, support Dibond exclusivement
// — aucune variante adhésive présentée dans l'app tant qu'elle n'est pas
// une réalité observée.
const PLAN_QUARTIER_REFERENCES_DATE = '2026-09-09T00:00:00.000Z';

const buildPlanQuartierReferencesSeed = (): SignageReference[] => [
    {
        id: 'pdq-78x100',
        name: 'Plan de quartier 78×100 (sans header ni footer)',
        auditType: 'PDQ', scope: { auditType: 'PDQ' },
        version: 1, support: 'plastifie',
        dimensions: { width: 78, height: 100, unit: 'cm' },
        placement: {},
        legacyDescription: '78 x 100 cm | Métro A/B/C, Tram T1, Téléo — sans header ni footer. Jamais en version adhésive.',
    },
    {
        id: 'pdq-78x120',
        name: 'Plan de quartier 78×120 (avec header et footer)',
        auditType: 'PDQ', scope: { auditType: 'PDQ' },
        version: 1, support: 'plastifie',
        dimensions: { width: 78, height: 120, unit: 'cm' },
        placement: {},
        legacyDescription: '78 x 120 cm | Métro A/B/C, Tram T1, Téléo — avec header et footer.',
    },
    {
        id: 'pdq-adhesif',
        name: 'Plan de quartier 78×120 (adhésif)',
        auditType: 'PDQ', scope: { auditType: 'PDQ' },
        version: 1, support: 'adhesif',
        // Même format physique que pdq-78x120 (avec header/footer), en
        // support adhésif au lieu de plastifié — jamais le format 78x100.
        dimensions: { width: 78, height: 120, unit: 'cm' },
        placement: {},
        legacyDescription: '78 x 120 cm | Version adhésive du Plan de quartier avec header et footer — jamais au format 78×100.',
    },
    {
        id: 'pem3d-120x80',
        name: 'PEM 3D 120×80',
        auditType: 'PDQ', scope: { auditType: 'PDQ' },
        version: 1, support: 'dibond',
        dimensions: { width: 120, height: 80, unit: 'cm' },
        placement: {},
        legacyDescription: '120 x 80 cm | Pôles d\'échange multimodaux — support Dibond exclusivement.',
        arbitrage: { status: 'keep', reason: 'Modèle unique confirmé : 120×80cm, Dibond.', createdAt: PLAN_QUARTIER_REFERENCES_DATE },
    },
];

/**
 * Construit les enregistrements du référentiel (39 depuis la qualification V15) depuis le catalogue
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

    seed.push(...buildPlanQuartierReferencesSeed());

    return seed;
};
