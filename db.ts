
import Dexie, { type EntityTable } from 'dexie';
import { Lieu, HistoryEntry } from './types';

// FIX: Switched from a subclassing pattern to a typed Dexie instance.
export const db = new Dexie('TisseoAuditDB') as Dexie & {
    lieux: EntityTable<Lieu, 'id'>;
    history: EntityTable<HistoryEntry, 'id'>;
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
                    // Terminus : 1 seule direction — renommer aussi la station
                    station.name = 'Blagnac-Jean Maga';
                    station.directions = [
                        { id: 'dir-sig-bla-1', name: 'Direction Aéroport Toulouse Blagnac', dats: [] },
                    ];
                } else if (station.name === 'Aéroport Toulouse Blagnac') {
                    // Terminus : direction vers Blagnac-Jean Maga
                    station.directions = [
                        { id: 'dir-sig-atb-1', name: 'Direction Blagnac-Jean Maga', dats: [] },
                    ];
                } else {
                    // NAD / DAU intermédiaires
                    station.directions = [
                        { id: `${station.id}-dir-1`, name: 'Direction Aéroport Toulouse Blagnac', dats: [] },
                        { id: `${station.id}-dir-2`, name: 'Direction Blagnac-Jean Maga', dats: [] },
                    ];
                }
            });
        });
        return tx.table('lieux').bulkPut(lieux);
    });
});
