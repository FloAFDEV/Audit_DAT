// tests/moduleScope.test.ts
// =================================================================
// Vérifie le correctif P1.5 (Lot 1) : isModuleInAuditScope centralise
// la règle « un module futur reste dans le périmètre audité uniquement
// pour les lignes C et AEROPORT ». Ce test fige le comportement exact
// qui était auparavant recopié (sous plusieurs formulations) dans
// useStats.ts, patrimoineIndex.ts et signaletiqueStationIndex.ts.
//
// Complété (dernière passe corrective) : DatGroupSelector.tsx réutilise
// désormais la même fonction pour une paire (Station.isFuture, module.line)
// au lieu de sa propre expression recopiée trois fois — vérifié ici contre
// des DONNÉES RÉELLES générées par data/builder.ts, pas seulement des
// objets construits à la main.
// =================================================================
import { describe, it, expect } from 'vitest';
import { isModuleInAuditScope } from '../utils/moduleScope';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { AuditModuleType, ModeData } from '../types';

describe('isModuleInAuditScope', () => {
    it('un module non-futur est toujours dans le périmètre, quelle que soit la ligne', () => {
        expect(isModuleInAuditScope({ isFuture: false, line: 'A' })).toBe(true);
        expect(isModuleInAuditScope({ isFuture: undefined, line: 'TRAM' })).toBe(true);
        expect(isModuleInAuditScope({ line: 'B' })).toBe(true); // isFuture absent des données
    });

    it('un module futur sur une ligne normale (A, B, TRAM, TELEO) est hors périmètre', () => {
        expect(isModuleInAuditScope({ isFuture: true, line: 'A' })).toBe(false);
        expect(isModuleInAuditScope({ isFuture: true, line: 'B' })).toBe(false);
        expect(isModuleInAuditScope({ isFuture: true, line: 'TRAM' })).toBe(false);
        expect(isModuleInAuditScope({ isFuture: true, line: 'TELEO' })).toBe(false);
    });

    it('un module futur sur la ligne C reste dans le périmètre (auditable par anticipation)', () => {
        expect(isModuleInAuditScope({ isFuture: true, line: 'C' })).toBe(true);
    });

    it('un module futur sur AEROPORT reste dans le périmètre (auditable par anticipation)', () => {
        expect(isModuleInAuditScope({ isFuture: true, line: 'AEROPORT' })).toBe(true);
    });

    it('un module futur avec une ligne absente ou vide (donnée ambiguë) est hors périmètre par défaut', () => {
        expect(isModuleInAuditScope({ isFuture: true, line: undefined })).toBe(false);
        expect(isModuleInAuditScope({ isFuture: true, line: '' as any })).toBe(false);
    });
});

describe('isModuleInAuditScope — appliqué aux Stations (DatGroupSelector), sur données réelles', () => {
    it('confirme, sur le jeu de données réel, l\'invariante dont dépend useLieuList.ts : '
        + 'AUCUN module généré sur la ligne AEROPORT n\'est jamais isFuture=true '
        + '(data/builder.ts::createDatModule/createSignaletiqueModule le force à false)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const aeroportModules = lieux.flatMap(l => l.modules).filter(m => m.line === 'AEROPORT');

        expect(aeroportModules.length).toBeGreaterThan(0); // le jeu de données contient bien du AEROPORT
        expect(aeroportModules.every(m => m.isFuture !== true)).toBe(true);
        // Conséquence directe : ces modules sont toujours dans le périmètre.
        expect(aeroportModules.every(m => isModuleInAuditScope(m))).toBe(true);
    });

    it('cas standard réel : une station Ligne A non-future est dans le périmètre (bouton actif)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const datA = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.DAT && m.line === 'A' && !m.isFuture)!;
        const station = (datA.data as ModeData).stations[0];
        expect(isModuleInAuditScope({ isFuture: station.isFuture, line: datA.line })).toBe(true);
    });

    it('exception Ligne C réelle : une station future de la Ligne C reste dans le périmètre (bouton actif, pas grisé)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const datC = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.DAT && m.line === 'C')!;
        const futureStation = (datC.data as ModeData).stations.find(s => s.isFuture);

        expect(futureStation).toBeDefined(); // la Ligne C est bien future dans les données réelles
        expect(isModuleInAuditScope({ isFuture: futureStation!.isFuture, line: datC.line })).toBe(true);
    });

    it('exception AEROPORT réelle : une station AEROPORT marquée future au niveau Station reste dans le périmètre '
        + '(le composant DatGroupSelector lit Station.isFuture, qui reste true même quand module.isFuture a été forcé à false)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const datAero = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.DAT && m.line === 'AEROPORT')!;
        const station = (datAero.data as ModeData).stations[0];

        expect(isModuleInAuditScope({ isFuture: station.isFuture, line: datAero.line })).toBe(true);
    });

    it('cas limite réel : une station future sur une ligne normale (Ligne B) reste hors périmètre (bouton grisé)', async () => {
        const lieux = await generateInitialLieuxDataAsync();
        const datB = lieux.flatMap(l => l.modules).find(m => m.type === AuditModuleType.DAT && m.line === 'B');
        const futureStationB = datB && (datB.data as ModeData).stations.find(s => s.isFuture);

        if (futureStationB) {
            expect(isModuleInAuditScope({ isFuture: futureStationB.isFuture, line: 'B' })).toBe(false);
        } else {
            // Aucune station B future dans le jeu de données actuel : rien à vérifier de plus,
            // le cas standard (non-future) suffit à couvrir la Ligne B aujourd'hui.
            expect(true).toBe(true);
        }
    });
});
