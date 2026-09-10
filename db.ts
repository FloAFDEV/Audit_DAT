
import Dexie, { type EntityTable } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { Lieu, HistoryEntry, SignageReference, AppEvent } from './types';
import { buildSignageReferencesSeed } from './data/signage_seed';

export type AuditDb = Dexie & {
    lieux: EntityTable<Lieu, 'id'>;
    history: EntityTable<HistoryEntry, 'id'>;
    signageReferences: EntityTable<SignageReference, 'id'>;
    events: EntityTable<AppEvent, 'id'>;
};

/**
 * Construit une instance Dexie complète (schéma + chaîne de migrations
 * v5→v12) sous le nom donné. Extrait en factory (Lot 2.3) uniquement pour
 * permettre aux tests d'ouvrir une base isolée sous un autre nom et de
 * vérifier une VRAIE migration d'anciennes données — aucun changement de
 * comportement pour `db`, toujours le même singleton 'TisseoAuditDB'.
 */
export const createAuditDb = (name: string): AuditDb => {
    // FIX: Switched from a subclassing pattern to a typed Dexie instance.
    const instance = new Dexie(name) as AuditDb;

    // V5: introduction de la table history.
// NOTE historique : cette version utilisait tx.table('lieux').clear() pour forcer un refresh
// du regroupement des modules Signalétique. Ce comportement destructif est conservé uniquement
// pour les utilisateurs qui migrent encore depuis la v4.
// ⛔ Ne JAMAIS reproduire ce pattern (clear) dans les versions suivantes.
    instance.version(5).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
}).upgrade(tx => {
    return tx.table('lieux').clear();
});

// V6: schéma identique à V5 — aucune migration destructive.
// Sert de point de départ propre pour toutes les futures migrations.
// Règle pour les versions ≥ 6 : utiliser .upgrade() pour patcher les enregistrements existants
// (ajout de champs manquants, renommages), JAMAIS pour les effacer.
    instance.version(6).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
});

// V7: refonte de la structure Signalétique.
//   - totem : { meett: TotemStatus[], pdj: TotemStatus[] } → { direction1: TotemStatus, direction2: TotemStatus }
//   - bandeauStation (nouveau) : { direction1: BandeauStationStatus, direction2: BandeauStationStatus }
//   - planQuartier : suppression des champs terminusCase et relayInfo
    instance.version(7).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
}).upgrade(tx => {
    return tx.table('lieux').toArray().then(lieux => {
        const TOTEM_BLANK = () => ({ status: 'NotChecked', comment: '', dimensions: '61,6 x 91,6 cm' });
        const BANDEAU_BLANK = () => ({ status: 'NotChecked', comment: '', dimensions: '80x29 cm', directionContent: 'NotChecked', stationNameContent: 'NotChecked' });

        const migrateStation = (station: any) => {
            if (!station.signaletique) return;
            const sig = station.signaletique;

            // Migrate totem arrays → single objects
            if (sig.totem && !sig.totem.direction1) {
                const d1 = sig.totem.meett?.[0] ?? TOTEM_BLANK();
                const d2 = sig.totem.pdj?.[0] ?? TOTEM_BLANK();
                sig.totem = { direction1: d1, direction2: d2 };
            }

            // Initialize bandeauStation
            if (!sig.bandeauStation) {
                sig.bandeauStation = { direction1: BANDEAU_BLANK(), direction2: BANDEAU_BLANK() };
            }

            // Remove terminusCase / relayInfo from planQuartier items
            if (sig.planQuartier) {
                ['meett', 'pdj'].forEach(dir => {
                    (sig.planQuartier[dir] ?? []).forEach((item: any) => {
                        delete item.terminusCase;
                        delete item.relayInfo;
                    });
                });
            }
        };

        lieux.forEach(lieu => {
            lieu.modules.forEach((module: any) => {
                const isSignaletique = module.type === 'SIGNALETIQUE';
                const isTramDat = module.type === 'DAT' && module.line === 'TRAM';
                if (isSignaletique || isTramDat) {
                    module.data?.stations?.forEach(migrateStation);
                }
            });
        });

        return tx.table('lieux').bulkPut(lieux);
    });
});

// V8: activer les modules SIGNALETIQUE AEROPORT (isFuture était propagé depuis le registre).
//     Ajoute aussi les directions manquantes sur toutes les stations SIGNALETIQUE (TRAM + AEROPORT)
//     afin d'afficher les labels corrects d'extrémité dans SignaletiqueAuditForm.
//     ⚠ Les noms de direction LAE de cette version étaient incorrects ("Direction Palais de Justice").
//       Corrigés en V9.
    instance.version(8).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
}).upgrade(tx => {
    return tx.table('lieux').toArray().then((lieux: any[]) => {
        const TRAM_DIRS = [
            { id: 'dir-sig-tram-1', name: 'Direction MEETT / Aéroport', dats: [] },
            { id: 'dir-sig-tram-2', name: 'Direction Palais de Justice', dats: [] },
        ];
        const AEROPORT_DEFAULT_DIRS = [
            { id: 'dir-sig-aero-1', name: 'Direction Aéroport Toulouse Blagnac', dats: [] },
            { id: 'dir-sig-aero-2', name: 'Direction Palais de Justice', dats: [] },
        ];
        const ATB_DIRS = [
            { id: 'dir-sig-atb-1', name: 'Direction Palais de Justice', dats: [] },
        ];

        lieux.forEach((lieu: any) => {
            lieu.modules.forEach((module: any) => {
                if (module.type !== 'SIGNALETIQUE') return;

                // AEROPORT modules: activer (isFuture: true → false)
                if (module.line === 'AEROPORT') {
                    module.isFuture = false;
                }

                // Ajouter les directions manquantes (toutes versions)
                const station = module.data?.stations?.[0];
                if (station && (!station.directions || station.directions.length === 0)) {
                    if (module.line === 'AEROPORT') {
                        station.directions = station.name === 'Aéroport Toulouse Blagnac'
                            ? ATB_DIRS
                            : AEROPORT_DEFAULT_DIRS;
                    } else {
                        // TRAM
                        station.directions = TRAM_DIRS;
                    }
                }
            });
        });

        return tx.table('lieux').bulkPut(lieux);
    });
});

// V9: correction des directions LAE (AEROPORT).
//   - Blagnac est le terminus LAE côté ville → 1 seule direction "Direction Aéroport Toulouse Blagnac"
//   - ATB est le terminus LAE côté aéroport → direction renommée en "Direction Blagnac"
//   - NAD/DAU (intermédiaires) → direction 2 renommée "Direction Blagnac" (était "Direction Palais de Justice")
    instance.version(9).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
}).upgrade(tx => {
    return tx.table('lieux').toArray().then((lieux: any[]) => {
        lieux.forEach((lieu: any) => {
            lieu.modules.forEach((module: any) => {
                if (module.type !== 'SIGNALETIQUE' || module.line !== 'AEROPORT') return;
                const station = module.data?.stations?.[0];
                if (!station) return;

                if (station.name === 'Blagnac' || station.name === 'Blagnac-Jean Maga') {
                    // Terminus : 1 seule direction (normalise aussi l'ancien nom Jean Maga)
                    station.name = 'Blagnac';
                    station.directions = [
                        { id: 'dir-sig-bla-1', name: 'Direction Aéroport Toulouse Blagnac', dats: [] },
                    ];
                } else if (station.name === 'Aéroport Toulouse Blagnac') {
                    // Terminus : direction vers Blagnac
                    station.directions = [
                        { id: 'dir-sig-atb-1', name: 'Direction Blagnac', dats: [] },
                    ];
                } else {
                    // NAD / DAU intermédiaires
                    station.directions = [
                        { id: `${station.id}-dir-1`, name: 'Direction Aéroport Toulouse Blagnac', dats: [] },
                        { id: `${station.id}-dir-2`, name: 'Direction Blagnac', dats: [] },
                    ];
                }
            });
        });
        return tx.table('lieux').bulkPut(lieux);
    });
});

// V10: supprimer isFuture sur les stations B ext. (Parc du Canal sta-b-21, Labège Madron sta-b-22)
//      → DAT, ECA, PMR et Picto. Cognitifs ouverts, identiques aux autres stations Ligne B.
//      Pour les DAT : initialise les directions (Borderouge / Ramonville) avec 4 DATs et adhésifs.
    instance.version(10).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
}).upgrade(tx => {
    return tx.table('lieux').toArray().then((lieux: any[]) => {
        const B_EXT_IDS = ['sta-b-21', 'sta-b-22'];
        const DAT_ADHESIVE_IDS = ['ad1','ad2','ad3','ad4','ad5','ad6','ad7','ad8','ad9','ad10','ad11','ad12'];
        const mkAdhesives = () => DAT_ADHESIVE_IDS.reduce((acc: any, id) => ({ ...acc, [id]: 'NotChecked' }), {});
        const mkDat = (name: string) => ({ id: uuidv4(), name, adhesives: mkAdhesives(), comment: '' });
        const mkBDirs = (stationId: string) => [
            { id: `${stationId}-dir-1`, name: 'Direction Borderouge', dats: [mkDat('DAT 01'), mkDat('DAT 02')] },
            { id: `${stationId}-dir-2`, name: 'Direction Ramonville', dats: [mkDat('DAT 03'), mkDat('DAT 04')] },
        ];

        lieux.forEach((lieu: any) => {
            lieu.modules.forEach((module: any) => {
                if (module.line !== 'B') return;
                const matchesExt = B_EXT_IDS.some(id => module.id?.includes(id));
                if (!matchesExt) return;

                module.isFuture = false;

                // DAT : ajouter les directions si vides
                if (module.type === 'DAT') {
                    const station = module.data?.stations?.[0];
                    if (station && (!station.directions || station.directions.length === 0)) {
                        station.directions = mkBDirs(station.id ?? module.id);
                    }
                }
            });
        });
        return tx.table('lieux').bulkPut(lieux);
    });
});

// V11: réconciliation des bornes P+R avec le seed corrigé (data/pr_structures.ts + adhesives.ts).
//   Les données persistées ne sont jamais régénérées depuis le seed → on patche les enregistrements.
//   1) Basso Cambo : suppression des bornes inexistantes BE14 et BS13.
//   2) Basso Cambo : BE11 ne porte que l'adhésif « Tarifs + coordonnées » (adbe3) → surcharge
//      adhesiveIds + nettoyage de sa map d'adhésifs (on conserve le statut déjà saisi sur adbe3).
//   3) Toutes les bornes de sortie (BS) : ajout du « Repère 2 - Information Ticket » (adbs2)
//      s'il est absent (NotChecked), sans écraser un statut existant.
    instance.version(11).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
}).upgrade(tx => {
    return tx.table('lieux').toArray().then((lieux: any[]) => {
        lieux.forEach((lieu: any) => {
            lieu.modules.forEach((module: any) => {
                if (module.type !== 'PR') return;
                const pr = module.data;
                if (!pr || !Array.isArray(pr.zones)) return;

                const isBasso = pr.name === 'Basso Cambo';

                pr.zones.forEach((zone: any) => {
                    if (!Array.isArray(zone.equipments)) return;

                    // 1) Retirer BE14 / BS13 (n'existent que sur Basso Cambo dans le seed).
                    if (isBasso) {
                        zone.equipments = zone.equipments.filter(
                            (eq: any) => eq.name !== 'BE14' && eq.name !== 'BS13'
                        );
                    }

                    zone.equipments.forEach((eq: any) => {
                        // 2) BE11 (Basso) : uniquement adbe3.
                        if (isBasso && eq.name === 'BE11') {
                            eq.adhesiveIds = ['adbe3'];
                            const prev = eq.adhesives?.['adbe3'] ?? 'NotChecked';
                            eq.adhesives = { adbe3: prev };
                        }

                        // 3) Bornes de sortie (BS) : garantir la présence d'adbs2.
                        if (eq.type === 'BS') {
                            if (!eq.adhesives) eq.adhesives = {};
                            if (eq.adhesives['adbs2'] === undefined) {
                                eq.adhesives['adbs2'] = 'NotChecked';
                            }
                        }
                    });
                });
            });
        });
        return tx.table('lieux').bulkPut(lieux);
    });
});

// V12: création du référentiel signalétique (spécification signageReferences, commit 1).
//   - signageReferences : catalogue métier destiné à devenir administrable.
//     Index : id (clé primaire, ids historiques ad1/adbe1/eca-11... conservés)
//     et auditType (dénormalisé depuis scope.auditType — règle R11).
//     Seed initial depuis data/adhesives.ts (38 références à l'origine, 39 depuis la qualification V15 — adbs3) : après cette
//     migration, la table est la source de vérité métier (règle R3) ; les
//     constantes historiques restent utilisées par les lecteurs existants
//     jusqu'à leur bascule progressive (strangler pattern).
//   - signageAssets : médias terrain légers (Blob image compressée uniquement,
//     règle R6). Vide au seed — aucun fichier de production n'entre ici (R5).
//   ⚠ Aucune modification de la table lieux : l'arbre d'audit reste intact (R9).
    instance.version(12).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
    signageReferences: 'id, auditType',
    signageAssets: 'id, referenceId',
}).upgrade(tx => {
    return tx.table('signageReferences').bulkAdd(buildSignageReferencesSeed());
});

// V13: création du journal d'événements (Lot 3, utils/eventLog.ts).
//   - events : trace chronologique légère des opérations métier importantes
//     (import/export, réinitialisations, ajout/suppression d'éléments
//     d'audit, arbitrage du référentiel, migrations, échecs critiques de
//     persistance) — jamais une copie de données métier (à la différence
//     de `history`, qui reste inchangée et continue de servir les
//     instantanés complets).
//   ⚠ Table neuve uniquement : aucune modification des tables existantes.
    instance.version(13).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
    signageReferences: 'id, auditType',
    signageAssets: 'id, referenceId',
    events: '++id, date, type, entityType',
});

// V14: création de la table des audits configurables (Partie 2).
//   - auditDefinitions : la petite définition (nom, icône, ciblage réseau)
//     d'un audit administrable (ex. Plans de quartier). Vide au seed —
//     aucun audit configurable n'existe tant que l'admin n'en crée pas.
//     Ses références (signageReferences, scope.auditType === 'CUSTOM') et
//     ses modules (Lieu.modules[], type CUSTOM) vivent dans les tables
//     déjà existantes — cette table ne stocke QUE le projet d'audit.
//   ⚠ Table neuve uniquement : aucune modification des tables existantes.
    instance.version(14).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
    signageReferences: 'id, auditType',
    signageAssets: 'id, referenceId',
    events: '++id, date, type, entityType',
    auditDefinitions: 'id',
});

// V15: qualification statique de 8 références DAT/PR/ECA (décisions
// tranchées dans le code, cf. ARBITRAGE_DECISIONS dans data/signage_seed.ts)
// + ajout de adbs3 (même visuel « Tarifs + coordonnées » que adbe3, posé
// aussi sur les bornes de sortie, pas seulement en entrée).
//   ⚠ Aucun re-seed global : seules CES références précises (par id) sont
//   patchées via un merge superficiel, jamais un remplacement complet — un
//   éventuel changement déjà fait localement sur un autre champ de ces
//   mêmes références (support/dimensions non concernés ici) est préservé.
//   Une base neuve (populate) reçoit déjà la version à jour via
//   buildSignageReferencesSeed() : cette migration ne concerne que les
//   appareils déjà provisionnés en V12+.
    instance.version(15).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
    signageReferences: 'id, auditType',
    signageAssets: 'id, referenceId',
    events: '++id, date, type, entityType',
    auditDefinitions: 'id',
}).upgrade(async tx => {
    const table = tx.table<SignageReference, string>('signageReferences');
    const freshById = new Map(buildSignageReferencesSeed().map(r => [r.id, r]));

    // Références déjà présentes : merge ciblé des seuls champs qualifiés
    // (support, dimensions, legacyDescription, sameAs, isDisabled,
    // arbitrage), needsReview retiré — jamais un remplacement de l'objet.
    const patchedIds = ['ad1', 'ad5', 'ad12', 'adbe3', 'adca9', 'adca12', 'adca13', 'eca-r-1', 'eca-11'];
    for (const id of patchedIds) {
        const existing = await table.get(id);
        const fresh = freshById.get(id);
        if (!existing || !fresh) continue;
        const { needsReview, ...rest } = existing;
        await table.put({
            ...rest,
            support: fresh.support,
            dimensions: fresh.dimensions,
            legacyDescription: fresh.legacyDescription,
            ...(fresh.sameAs ? { sameAs: fresh.sameAs } : {}),
            ...(fresh.isDisabled ? { isDisabled: true } : {}),
            ...(fresh.arbitrage ? { arbitrage: fresh.arbitrage } : {}),
        });
    }

    // adbs3 est une référence réellement nouvelle — ajoutée seulement si
    // absente (idempotence : une réouverture ne doit jamais dupliquer) ET
    // seulement si la table est un référentiel déjà peuplé (adbe3 déjà
    // présent) — jamais sur une table vide, qui n'a jamais reçu le seed et
    // n'a donc rien à corriger ici (le seed initial s'en charge via
    // populate).
    const adbs3Existing = await table.get('adbs3');
    if (!adbs3Existing && await table.get('adbe3')) {
        const adbs3 = freshById.get('adbs3');
        if (adbs3) await table.add(adbs3);
    }
});

// V16: retrait de la couche Admin — suppression de auditDefinitions (Partie 2,
// audits configurables, retirés avec l'Admin) et de signageAssets (n'existait
// que pour l'éditeur Admin du référentiel ; orpheline depuis son retrait —
// plus aucun lecteur ni écrivain dans l'application). `null` supprime
// réellement la table côté IndexedDB pour les appareils déjà provisionnés,
// plutôt que de la laisser orpheline.
//   ⚠ Aucune donnée d'audit (lieux/history/events/signageReferences) n'est
//   touchée — ces deux tables ne stockaient jamais de constat terrain.
    instance.version(16).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
    signageReferences: 'id, auditType',
    signageAssets: null,
    events: '++id, date, type, entityType',
    auditDefinitions: null,
});

// V17: ajout du référentiel Plans de quartier (+ PEM 3D) — 4 modèles figés
// (pdq-78x100, pdq-78x120, pdq-adhesif, pem3d-120x80). Idempotent : n'ajoute
// que les ids réellement absents, jamais de doublon à une réouverture.
//   ⚠ N'ajoute JAMAIS les modules Plans de quartier eux-mêmes sur les
//   stations existantes : ça reste une migration de contenu `lieux`,
//   traitée dans store.ts::init() (même patron que la migration v8 LAE),
//   pas une migration de schéma Dexie.
    instance.version(17).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
    signageReferences: 'id, auditType',
    events: '++id, date, type, entityType',
}).upgrade(async tx => {
    const table = tx.table<SignageReference, string>('signageReferences');
    // Jamais sur une table jamais seedée (celle-ci reçoit déjà tout via
    // populate()) — même garde-fou que l'ajout de adbs3 en V15.
    if (!(await table.get('ad1'))) return;
    const freshById = new Map(buildSignageReferencesSeed().map(r => [r.id, r]));
    for (const id of ['pdq-78x100', 'pdq-78x120', 'pdq-adhesif', 'pem3d-120x80']) {
        const existing = await table.get(id);
        if (existing) continue;
        const fresh = freshById.get(id);
        if (fresh) await table.add(fresh);
    }
});

// V18: purge les références d'une famille d'audit disparue (CUSTOM, retiré
// avec l'Admin — cf. historique) qui subsistaient dans signageReferences
// sur les appareils ayant créé un audit configurable avant ce retrait.
//   ⚠ Le retrait de l'Admin avait supprimé les tables auditDefinitions et
//   signageAssets (V16), mais jamais les lignes déjà écrites dans
//   signageReferences par les définitions CUSTOM de l'époque — orphelines
//   depuis, sans plus aucune destination dans l'app. Restées en base, elles
//   se retrouvent dans chaque export, et un réimport de ce même export
//   échouait alors intégralement (validateSignageReferences rejette tout
//   scope.auditType hors DAT/PR/ECA/PDQ) : un aller-retour export→import
//   cassait sur ses propres données mortes. Purge définitive, jamais
//   régénérée (CUSTOM n'a aucun modèle de remplacement, contrairement à
//   V17 qui, elle, complète un référentiel toujours actif).
    instance.version(18).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
    signageReferences: 'id, auditType',
    events: '++id, date, type, entityType',
}).upgrade(async tx => {
    const table = tx.table<SignageReference, string>('signageReferences');
    await table.where('auditType').noneOf(['DAT', 'PR', 'ECA', 'PDQ']).delete();
});

// V19: rafraîchit les MÉTADONNÉES des 4 fiches du référentiel Plans de
// quartier (+ PEM 3D) depuis data/signage_seed.ts, même si leur id existe
// déjà en base — contrairement à V17 qui n'ajoutait QUE les ids absents.
//   ⚠ Portée strictement limitée à la table signageReferences (le
//   catalogue, jamais administrable depuis l'app) : ne touche JAMAIS
//   `lieux` ni la moindre occurrence terrain (modelId, location, status,
//   comment, measuredDimensions...). Ces 4 fiches ne sont éditables par
//   aucun écran de l'app — les réécrire intégralement depuis le code est
//   donc toujours sûr, sans risque d'écraser une personnalisation locale
//   qui n'existe pas.
//   Sans cette migration, une correction de fiche (ex. dimension confirmée
//   de pdq-adhesif, texte de description) ne progressait jamais au-delà
//   du build qui l'a introduite : V17 s'arrêtait au premier `get()` non
//   vide et ne revenait plus jamais sur l'existant.
//   Idempotente : `table.put(fresh)` avec la même définition ne crée
//   jamais de doublon (clé primaire = id) et ne modifie rien d'autre.
    instance.version(19).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
    signageReferences: 'id, auditType',
    events: '++id, date, type, entityType',
}).upgrade(async tx => {
    const table = tx.table<SignageReference, string>('signageReferences');
    if (!(await table.get('ad1'))) return; // jamais sur une table jamais seedée
    const freshById = new Map(buildSignageReferencesSeed().map(r => [r.id, r]));
    for (const id of ['pdq-78x100', 'pdq-78x120', 'pdq-adhesif', 'pem3d-120x80']) {
        const fresh = freshById.get(id);
        if (fresh) await table.put(fresh);
    }
});

// Base neuve (création directe en v12, sans passer par l'upgrade ci-dessus) :
// Dexie ne rejoue pas les .upgrade() — le seed passe alors par 'populate'.
    instance.on('populate', (tx) => {
        tx.table('signageReferences').bulkAdd(buildSignageReferencesSeed());
    });

    return instance;
};

export const db = createAuditDb('TisseoAuditDB');
