
import Dexie, { type EntityTable } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { Lieu, HistoryEntry, SignageReference, SignageAsset } from './types';
import { buildSignageReferencesSeed } from './data/signage_seed';

// FIX: Switched from a subclassing pattern to a typed Dexie instance.
export const db = new Dexie('TisseoAuditDB') as Dexie & {
    lieux: EntityTable<Lieu, 'id'>;
    history: EntityTable<HistoryEntry, 'id'>;
    signageReferences: EntityTable<SignageReference, 'id'>;
    signageAssets: EntityTable<SignageAsset, 'id'>;
};

// V5: introduction de la table history.
// NOTE historique : cette version utilisait tx.table('lieux').clear() pour forcer un refresh
// du regroupement des modules Signalétique. Ce comportement destructif est conservé uniquement
// pour les utilisateurs qui migrent encore depuis la v4.
// ⛔ Ne JAMAIS reproduire ce pattern (clear) dans les versions suivantes.
db.version(5).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
}).upgrade(tx => {
    return tx.table('lieux').clear();
});

// V6: schéma identique à V5 — aucune migration destructive.
// Sert de point de départ propre pour toutes les futures migrations.
// Règle pour les versions ≥ 6 : utiliser .upgrade() pour patcher les enregistrements existants
// (ajout de champs manquants, renommages), JAMAIS pour les effacer.
db.version(6).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
});

// V7: refonte de la structure Signalétique.
//   - totem : { meett: TotemStatus[], pdj: TotemStatus[] } → { direction1: TotemStatus, direction2: TotemStatus }
//   - bandeauStation (nouveau) : { direction1: BandeauStationStatus, direction2: BandeauStationStatus }
//   - planQuartier : suppression des champs terminusCase et relayInfo
db.version(7).stores({
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
db.version(8).stores({
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
db.version(9).stores({
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
db.version(10).stores({
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
db.version(11).stores({
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
//     Seed initial depuis data/adhesives.ts (38 références) : après cette
//     migration, la table est la source de vérité métier (règle R3) ; les
//     constantes historiques restent utilisées par les lecteurs existants
//     jusqu'à leur bascule progressive (strangler pattern).
//   - signageAssets : médias terrain légers (Blob image compressée uniquement,
//     règle R6). Vide au seed — aucun fichier de production n'entre ici (R5).
//   ⚠ Aucune modification de la table lieux : l'arbre d'audit reste intact (R9).
db.version(12).stores({
    lieux: 'id, name',
    history: '++id, date, type, categoryKey',
    signageReferences: 'id, auditType',
    signageAssets: 'id, referenceId',
}).upgrade(tx => {
    return tx.table('signageReferences').bulkAdd(buildSignageReferencesSeed());
});

// Base neuve (création directe en v12, sans passer par l'upgrade ci-dessus) :
// Dexie ne rejoue pas les .upgrade() — le seed passe alors par 'populate'.
db.on('populate', (tx) => {
    tx.table('signageReferences').bulkAdd(buildSignageReferencesSeed());
});
