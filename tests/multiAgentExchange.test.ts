// tests/multiAgentExchange.test.ts
// Échange multi-agents (utils/exchange/) : export JSON, import de N fichiers,
// consolidation temporelle, historique, idempotence. Le scénario métier
// « Station X — Audit PMR » passe par la vraie couche Dexie.
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import { db, createAuditDb } from '../db';
import { AuditModuleType, FloorAdhesiveStatus, AdhesiveStatus, Lieu, PMRFloorAdhesiveData, ModeData, PlanQuartierData } from '../types';
import { generateInitialLieuxDataAsync } from '../data/builder';
import { NETWORK, REFERENTIEL } from '../data/referentiel';
import { indexControls, walkControls } from '../utils/exchange/controls';
import { parseExchangeFile, EXCHANGE_SCHEMA, UNKNOWN_TIME } from '../utils/exchange/format';
import {
    StoredObservation, AgentIdentity, applyCurrentState, buildBaselineObservations, buildExchangeFile,
    diffObservations, planConsolidation,
} from '../utils/exchange/consolidate';
import {
    recordLocalChanges, buildLocalExchangeFile, consolidateExchangeFiles, previewExchangeFiles,
    setLocalAgentName, getControlHistory,
} from '../utils/exchange/observationLog';

const LOCAL = { networkId: NETWORK.id, referentielId: REFERENTIEL.id, referentielVersion: REFERENTIEL.version };
const at = (hhmm: string) => `2026-10-29T${hhmm}:00.000Z`;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Station X, module « Audit PMR » de 10 items. Les ids techniques sont
 *  tirés au hasard à chaque appel, comme le seed sur deux tablettes. */
const makeStationX = (): Lieu[] => [{
    id: 'lieu-station-x',
    name: 'Station X',
    modules: [{
        id: uuidv4(),
        type: AuditModuleType.PMR_FLOOR_ADHESIVE,
        name: 'Audit PMR',
        data: {
            id: uuidv4(), stationName: 'Station X', stationCode: 'STX', comment: '',
            adhesives: Array.from({ length: 10 }, (_, i) => ({ id: uuidv4(), name: `Item ${i + 1}`, status: FloorAdhesiveStatus.NotChecked })),
        } as PMRFloorAdhesiveData,
    }],
}];

const itemsOf = (lieux: Lieu[]) => (lieux[0].modules[0].data as PMRFloorAdhesiveData).adhesives;
const statusOf = (lieux: Lieu[], n: number) => itemsOf(lieux)[n - 1].status;

// -----------------------------------------------------------------
// Appareil simulé (logique pure) : arbre + journal + identité d'agent.
// Reproduit observationLog.ts sans Dexie, pour multiplier les appareils.
// -----------------------------------------------------------------
interface Device { agent: AgentIdentity; lieux: Lieu[]; log: StoredObservation[] }
const device = (name: string, lieux: Lieu[] = makeStationX()): Device => ({ agent: { id: `agent-${name.toLowerCase()}`, name }, lieux, log: [] });

const setItem = (d: Device, n: number, status: FloorAdhesiveStatus, when: string, referentielVersion: string = REFERENTIEL.version) => {
    const before = clone(d.lieux);
    itemsOf(d.lieux)[n - 1].status = status;
    d.log.push(...diffObservations(before, d.lieux, d.agent, referentielVersion, when, uuidv4));
};

const exportOf = (d: Device, overrides: Partial<{ network: { id: string; name: string }; referentiel: { id: string; version: string } }> = {}) => {
    const known = new Set(d.log.map(o => o.control));
    d.log.push(...buildBaselineObservations(d.lieux, known, d.agent, REFERENTIEL.version));
    return JSON.stringify(buildExchangeFile({
        observations: d.log, exportId: uuidv4(), exportedAt: at('18:00'), exporter: d.agent,
        app: { name: 'auditref-tisseo', version: 'test', dataVersion: 'test' },
        network: overrides.network ?? { ...NETWORK }, referentiel: overrides.referentiel ?? { ...REFERENTIEL },
    }));
};

const importInto = (d: Device, files: { name: string; content: string }[]) => {
    const known = new Set(d.log.map(o => o.control));
    d.log.push(...buildBaselineObservations(d.lieux, known, d.agent, REFERENTIEL.version));
    const plan = planConsolidation({ existing: d.log, files, local: LOCAL, importedAt: at('19:00') });
    d.log.push(...plan.added);
    const apply = applyCurrentState(d.lieux, d.log, new Set(plan.added.map(o => o.control)));
    return { plan, apply };
};

const historyOf = (d: Device, n: number) => {
    const key = [...indexControls(d.lieux).values()].find(c => c.item.id === `Item ${n}`)!.key;
    return d.log.filter(o => o.control === key && o.kind === 'observation');
};

// =================================================================
describe('Clés de contrôle stables entre appareils', () => {
    it('deux seeds indépendants (UUID différents) produisent exactement les mêmes clés', async () => {
        const [a, b] = await Promise.all([generateInitialLieuxDataAsync(), generateInitialLieuxDataAsync()]);
        const keys = (lieux: Lieu[]) => { const k: string[] = []; walkControls(lieux, c => k.push(c.key)); return k.sort(); };
        const ka = keys(a);
        expect(ka.length).toBeGreaterThan(1000);
        expect(keys(b)).toEqual(ka);
        expect(new Set(ka).size).toBe(ka.length); // aucune collision
    });

    it('un constat DAT sur un appareil se consolide sur un autre malgré des ids de DAT différents', async () => {
        const [lieuxA, lieuxC] = await Promise.all([generateInitialLieuxDataAsync(), generateInitialLieuxDataAsync()]);
        const pick = (lieux: Lieu[]) => (lieux.find(l => l.modules.some(m => m.type === AuditModuleType.DAT))!
            .modules.find(m => m.type === AuditModuleType.DAT)!.data as ModeData).stations[0].directions[0].dats[0];
        expect(pick(lieuxA).id).not.toBe(pick(lieuxC).id);

        const flo = device('Flo', lieuxA);
        const before = clone(flo.lieux);
        const adhesiveId = Object.keys(pick(flo.lieux).adhesives)[0];
        pick(flo.lieux).adhesives[adhesiveId] = AdhesiveStatus.ToBeReplaced;
        flo.log.push(...diffObservations(before, flo.lieux, flo.agent, REFERENTIEL.version, at('10:00'), uuidv4));

        const central = device('Central', lieuxC);
        const { apply } = importInto(central, [{ name: 'flo.json', content: exportOf(flo) }]);
        expect(apply.updated).toBe(1);
        expect(pick(central.lieux).adhesives[adhesiveId]).toBe(AdhesiveStatus.ToBeReplaced);
    });
});

// =================================================================
describe('Format d\'échange', () => {
    it('porte schéma, version, réseau, référentiel, agent et provenance de chaque observation', () => {
        const flo = device('Flo');
        setItem(flo, 1, FloorAdhesiveStatus.ToBeReplaced, at('09:00'));
        const parsed = parseExchangeFile(exportOf(flo));
        expect(parsed.ok).toBe(true);
        if (parsed.ok === false) return;
        const { file } = parsed;
        expect(file.schema).toBe(EXCHANGE_SCHEMA);
        expect(file.schemaVersion).toBe(1);
        expect(file.network.id).toBe('tisseo');
        expect(file.referentiel).toEqual({ id: REFERENTIEL.id, version: '2026.10' });
        expect(file.agents).toEqual([{ id: 'agent-flo', name: 'Flo' }]);
        expect(file.observations).toHaveLength(1);
        const [o] = file.observations;
        expect(o).toMatchObject({
            observedAt: at('09:00'), timeSource: 'recorded', agent: 'agent-flo', referentielVersion: '2026.10',
            result: { status: 'ToBeReplaced', anomaly: true },
            site: { id: 'lieu-station-x', name: 'Station X', code: 'STX' },
            audit: { type: AuditModuleType.PMR_FLOOR_ADHESIVE, id: 'pmr-STX-Audit PMR', name: 'Audit PMR' },
            item: { id: 'Item 1' },
        });
        expect(o).not.toHaveProperty('kind');
        expect(o).not.toHaveProperty('agentName');
    });

    it('rejette une sauvegarde complète, un JSON illisible et une version future', () => {
        expect(parseExchangeFile('{"formatVersion":2,"data":[]}')).toMatchObject({ ok: false, error: expect.stringContaining('Sauvegarde complète') });
        expect(parseExchangeFile('pas du json')).toMatchObject({ ok: false });
        expect(parseExchangeFile(JSON.stringify({ schema: EXCHANGE_SCHEMA, schemaVersion: 99 }))).toMatchObject({ ok: false, error: expect.stringContaining('99') });
    });

    it('écarte une observation mal formée sans rejeter le fichier', () => {
        const flo = device('Flo');
        setItem(flo, 1, FloorAdhesiveStatus.OK, at('09:00'));
        const file = JSON.parse(exportOf(flo));
        file.observations.push({ id: 'cassée' });
        const parsed = parseExchangeFile(JSON.stringify(file));
        expect(parsed.ok).toBe(true);
        if (parsed.ok === false) return;
        expect(parsed.file.observations).toHaveLength(1);
        expect(parsed.warnings).toHaveLength(1);
    });

    it('un constat antérieur au journal est exporté avec sa date connue, sinon une date sentinelle', () => {
        const flo = device('Flo');
        itemsOf(flo.lieux)[0].status = FloorAdhesiveStatus.OK; // saisi avant le journal, sans date
        (flo.lieux[0].modules[0].data as PMRFloorAdhesiveData).completionDate = at('08:00');
        itemsOf(flo.lieux)[1].status = FloorAdhesiveStatus.OK;
        itemsOf(flo.lieux)[1].photo_taken_at = at('07:30');
        const { file } = parseExchangeFile(exportOf(flo)) as { file: ReturnType<typeof buildExchangeFile> };
        const byItem = new Map(file.observations.map(o => [o.item.id, o]));
        expect(byItem.get('Item 1')).toMatchObject({ observedAt: at('08:00'), timeSource: 'inferred' });
        expect(byItem.get('Item 2')).toMatchObject({ observedAt: at('07:30'), timeSource: 'inferred' });

        const bare = device('Bare');
        itemsOf(bare.lieux)[0].status = FloorAdhesiveStatus.OK;
        const { file: bareFile } = parseExchangeFile(exportOf(bare)) as { file: ReturnType<typeof buildExchangeFile> };
        expect(bareFile.observations[0]).toMatchObject({ observedAt: UNKNOWN_TIME, timeSource: 'unknown' });
        // Réexport : mêmes identifiants (déterministes), donc aucun doublon.
        expect(JSON.parse(exportOf(bare)).observations[0].id).toBe(bareFile.observations[0].id);
    });
});

// =================================================================
describe('Consolidation — cas demandés', () => {
    it('1. deux JSON complémentaires : union sans perte', () => {
        const flo = device('Flo'); const serge = device('Serge');
        setItem(flo, 1, FloorAdhesiveStatus.OK, at('09:00'));
        setItem(serge, 2, FloorAdhesiveStatus.ToBeReplaced, at('10:00'));
        const central = device('Central');
        const { plan, apply } = importInto(central, [{ name: 'flo.json', content: exportOf(flo) }, { name: 'serge.json', content: exportOf(serge) }]);
        expect(plan.added).toHaveLength(2);
        expect(apply.updated).toBe(2);
        expect(statusOf(central.lieux, 1)).toBe(FloorAdhesiveStatus.OK);
        expect(statusOf(central.lieux, 2)).toBe(FloorAdhesiveStatus.ToBeReplaced);
    });

    it('2. deux JSON contenant la même observation : comptée une seule fois', () => {
        const flo = device('Flo'); const serge = device('Serge');
        setItem(flo, 1, FloorAdhesiveStatus.OK, at('09:00'));
        const floFile = exportOf(flo);
        importInto(serge, [{ name: 'flo.json', content: floFile }]); // Serge a récupéré le travail de Flo
        setItem(serge, 2, FloorAdhesiveStatus.OK, at('10:00'));
        const central = device('Central');
        const { plan } = importInto(central, [{ name: 'flo.json', content: floFile }, { name: 'serge.json', content: exportOf(serge) }]);
        expect(plan.added).toHaveLength(2);
        expect(plan.alreadyKnown).toBe(1);
        expect(historyOf(central, 1)).toHaveLength(1);
        expect(historyOf(central, 1)[0].agentName).toBe('Flo'); // provenance d'origine conservée
    });

    it('3. même contrôle, horodatages différents : le plus récent gagne, l\'historique garde les deux', () => {
        const flo = device('Flo'); const serge = device('Serge');
        setItem(flo, 4, FloorAdhesiveStatus.OK, at('09:00'));
        setItem(serge, 4, FloorAdhesiveStatus.ToBeReplaced, at('14:00'));
        for (const order of [['flo', 'serge'], ['serge', 'flo']]) {
            const central = device('Central');
            const files = { flo: exportOf(flo), serge: exportOf(serge) };
            importInto(central, order.map(n => ({ name: n, content: files[n as 'flo' | 'serge'] })));
            expect(statusOf(central.lieux, 4)).toBe(FloorAdhesiveStatus.ToBeReplaced);
            expect(historyOf(central, 4).map(o => o.agentName).sort()).toEqual(['Flo', 'Serge']);
        }
    });

    it('4a. même contrôle, même instant, même agent, même résultat : véritable doublon', () => {
        const flo = device('Flo');
        setItem(flo, 1, FloorAdhesiveStatus.OK, at('09:00'));
        const file = JSON.parse(exportOf(flo));
        const copy = clone(file);
        copy.exportId = uuidv4();
        copy.observations[0].id = uuidv4(); // même constat ré-identifié
        const central = device('Central');
        const { plan } = importInto(central, [{ name: 'a', content: JSON.stringify(file) }, { name: 'b', content: JSON.stringify(copy) }]);
        expect(plan.added).toHaveLength(1);
        expect(plan.alreadyKnown).toBe(1);
    });

    it('4b. même contrôle, même instant, résultats différents : départage déterministe et signalé', () => {
        const flo = device('Flo'); const serge = device('Serge');
        setItem(flo, 3, FloorAdhesiveStatus.OK, at('11:00'));
        setItem(serge, 3, FloorAdhesiveStatus.ToBeReplaced, at('11:00'));
        const results = [['f', 's'], ['s', 'f']].map(order => {
            const central = device('Central');
            const files = { f: exportOf(flo), s: exportOf(serge) };
            const { apply } = importInto(central, order.map(n => ({ name: n, content: files[n as 'f' | 's'] })));
            expect(apply.problems.some(p => p.message.includes('même instant'))).toBe(true);
            expect(historyOf(central, 3)).toHaveLength(2);
            return statusOf(central.lieux, 3);
        });
        expect(results[0]).toBe(results[1]);
    });

    it('5. import du même fichier deux fois : aucune duplication', () => {
        const flo = device('Flo');
        for (let n = 1; n <= 3; n++) setItem(flo, n, FloorAdhesiveStatus.OK, at(`0${n}:00`));
        const file = exportOf(flo);
        const central = device('Central');
        const first = importInto(central, [{ name: 'flo.json', content: file }, { name: 'flo (copie).json', content: file }]);
        expect(first.plan.added).toHaveLength(3);
        expect(first.plan.alreadyKnown).toBe(3);
        const size = central.log.length;
        const second = importInto(central, [{ name: 'flo.json', content: file }]);
        expect(second.plan.added).toHaveLength(0);
        expect(second.plan.alreadyKnown).toBe(3);
        expect(second.apply.updated).toBe(0);
        expect(central.log.length).toBe(size);
    });

    it('6. sans limite d\'agents : 50 agents, un item chacun, plus 3 agents sur le même item', () => {
        const lieux: Lieu[] = makeStationX();
        (lieux[0].modules[0].data as PMRFloorAdhesiveData).adhesives = Array.from({ length: 50 }, (_, i) => ({ id: uuidv4(), name: `Item ${i + 1}`, status: FloorAdhesiveStatus.NotChecked }));
        const files = Array.from({ length: 50 }, (_, i) => {
            const d = device(`Agent ${i + 1}`, clone(lieux));
            setItem(d, i + 1, FloorAdhesiveStatus.OK, at('09:00'));
            return { name: `agent-${i + 1}.json`, content: exportOf(d) };
        });
        const late = [['A', '10:00', FloorAdhesiveStatus.OK], ['B', '12:00', FloorAdhesiveStatus.ToBeReplaced], ['C', '11:00', FloorAdhesiveStatus.ToPlan]] as const;
        late.forEach(([name, hhmm, status]) => {
            const d = device(name, clone(lieux));
            setItem(d, 7, status, at(hhmm));
            files.push({ name: `${name}.json`, content: exportOf(d) });
        });
        const central = device('Central', clone(lieux));
        const { plan } = importInto(central, files);
        expect(plan.added).toHaveLength(53);
        expect(itemsOf(central.lieux).every(a => a.status !== FloorAdhesiveStatus.NotChecked)).toBe(true);
        expect(statusOf(central.lieux, 7)).toBe(FloorAdhesiveStatus.ToBeReplaced); // B, 12:00
        expect(historyOf(central, 7)).toHaveLength(4);
    });

    it('7. référentiels différents : version différente acceptée et tracée, autre référentiel ou réseau refusé', () => {
        const flo = device('Flo');
        setItem(flo, 1, FloorAdhesiveStatus.OK, at('09:00'), '2026.04');
        const older = exportOf(flo, { referentiel: { id: REFERENTIEL.id, version: '2026.04' } });
        const otherRef = exportOf(flo, { referentiel: { id: 'autre-referentiel', version: '1' } });
        const otherNet = exportOf(flo, { network: { id: 'autre-reseau', name: 'Autre' } });
        const central = device('Central');
        const { plan } = importInto(central, [
            { name: 'ancien.json', content: older }, { name: 'autre-ref.json', content: otherRef }, { name: 'autre-reseau.json', content: otherNet },
        ]);
        expect(plan.previews.map(p => p.ok)).toEqual([true, false, false]);
        expect(plan.problems.filter(p => p.level === 'error')).toHaveLength(2);
        expect(plan.problems.some(p => p.level === 'warning' && p.message.includes('2026.04'))).toBe(true);
        expect(plan.added).toHaveLength(1);
        expect(plan.added[0].referentielVersion).toBe('2026.04');
        expect(statusOf(central.lieux, 1)).toBe(FloorAdhesiveStatus.OK);
    });

    it('8. export puis réimport : état et provenance identiques, aucune duplication', () => {
        const flo = device('Flo'); const serge = device('Serge');
        setItem(flo, 1, FloorAdhesiveStatus.OK, at('09:00'));
        setItem(serge, 1, FloorAdhesiveStatus.ToBeReplaced, at('14:00'));
        setItem(serge, 2, FloorAdhesiveStatus.OK, at('14:05'));
        const central = device('Central');
        importInto(central, [{ name: 'flo', content: exportOf(flo) }, { name: 'serge', content: exportOf(serge) }]);
        const consolidated = exportOf(central);

        const parsed = JSON.parse(consolidated);
        expect(parsed.agents.map((a: { name: string }) => a.name).sort()).toEqual(['Central', 'Flo', 'Serge']);
        expect(parsed.observations).toHaveLength(3);

        const fresh = device('Nouveau');
        importInto(fresh, [{ name: 'consolidé', content: consolidated }]);
        expect(itemsOf(fresh.lieux).map(a => a.status)).toEqual(itemsOf(central.lieux).map(a => a.status));
        expect(historyOf(fresh, 1).map(o => o.agentName).sort()).toEqual(['Flo', 'Serge']);

        const again = importInto(central, [{ name: 'consolidé', content: consolidated }]);
        expect(again.plan.added).toHaveLength(0);
    });
});

// =================================================================
describe('Consolidation — garde-fous', () => {
    it('une remise à zéro locale plus récente n\'est pas annulée par une observation importée plus ancienne', () => {
        const central = device('Central'); const serge = device('Serge');
        setItem(serge, 1, FloorAdhesiveStatus.ToBeReplaced, at('09:00'));
        setItem(central, 1, FloorAdhesiveStatus.OK, at('08:00'));
        setItem(central, 1, FloorAdhesiveStatus.NotChecked, at('10:00')); // reset local
        const { apply } = importInto(central, [{ name: 'serge', content: exportOf(serge) }]);
        expect(apply.updated).toBe(0);
        expect(statusOf(central.lieux, 1)).toBe(FloorAdhesiveStatus.NotChecked);
        expect(JSON.parse(exportOf(central)).observations.every((o: { result: { status: string } }) => o.result.status !== 'NotChecked')).toBe(true);
    });

    it('un contrôle inconnu localement est signalé, l\'observation reste dans l\'historique', () => {
        const flo = device('Flo');
        setItem(flo, 1, FloorAdhesiveStatus.OK, at('09:00'));
        const file = JSON.parse(exportOf(flo));
        file.observations[0].control = 'pmr-STX-Audit PMR/sol/Item 99';
        const central = device('Central');
        const { plan, apply } = importInto(central, [{ name: 'flo', content: JSON.stringify(file) }]);
        expect(plan.added).toHaveLength(1);
        expect(apply.problems.some(p => p.message.includes('absent de cette instance'))).toBe(true);
    });

    it('plan de quartier découvert sur un autre appareil : l\'exemplaire est recréé', () => {
        const pdqLieu = (): Lieu[] => [{ id: 'lieu-pdq', name: 'Station PDQ', modules: [{
            id: 'module-pdq-sta-x', type: AuditModuleType.PLAN_QUARTIER, name: 'Plans de quartier',
            data: { id: 'pdq-data-sta-x', stationName: 'Station PDQ', stationCode: 'SPQ', occurrences: [], comment: '' } as PlanQuartierData,
        }] }];
        const flo = device('Flo', pdqLieu());
        const before = clone(flo.lieux);
        (flo.lieux[0].modules[0].data as PlanQuartierData).occurrences.push({
            id: 'occ-1', location: 'Sortie nord', status: AdhesiveStatus.Absent, constatedAt: at('09:00'), discoveredAt: at('09:00'),
        });
        flo.log.push(...diffObservations(before, flo.lieux, flo.agent, REFERENTIEL.version, at('09:00'), uuidv4));
        const central = device('Central', pdqLieu());
        const { apply } = importInto(central, [{ name: 'flo', content: exportOf(flo) }]);
        expect(apply.created).toBe(1);
        const [occ] = (central.lieux[0].modules[0].data as PlanQuartierData).occurrences;
        expect(occ).toMatchObject({ id: 'occ-1', location: 'Sortie nord', status: AdhesiveStatus.Absent, constatedAt: at('09:00') });
    });
});

// =================================================================
// Scénario métier obligatoire — via la vraie couche Dexie.
// Un « appareil » = journal vidé + identité d'agent propre + arbre propre.
// =================================================================
describe('Scénario métier : Station X — Audit PMR, agents A et B', () => {
    const switchDevice = async (agentName: string) => {
        await db.observations.clear();
        localStorage.removeItem('auditref-agent');
        setLocalAgentName(agentName);
    };
    const record = async (lieux: Lieu[], n: number, status: FloorAdhesiveStatus, when: string) => {
        const before = clone(lieux);
        itemsOf(lieux)[n - 1].status = status;
        await recordLocalChanges(before, lieux, when);
    };

    beforeEach(async () => { await db.lieux.clear(); });

    it('JSON A (items 1-5) + JSON B (items 6-10), puis item 3 conforme 09:00 / non conforme 14:00, puis réimport de B', async () => {
        // Agent A : items 1 à 5.
        await switchDevice('Agent A');
        const lieuxA = makeStationX();
        for (let n = 1; n <= 5; n++) await record(lieuxA, n, FloorAdhesiveStatus.OK, at(`08:0${n}`));
        const jsonA = JSON.stringify(await buildLocalExchangeFile(lieuxA, 'test'));

        // Agent B : items 6 à 10.
        await switchDevice('Agent B');
        const lieuxB = makeStationX();
        for (let n = 6; n <= 10; n++) await record(lieuxB, n, FloorAdhesiveStatus.OK, at(`08:${n + 10}`));
        const jsonB = JSON.stringify(await buildLocalExchangeFile(lieuxB, 'test'));

        // Import simultané sur l'instance de consolidation.
        await switchDevice('Consolidation');
        const central = makeStationX();
        await db.lieux.bulkPut(central);
        const preview = await previewExchangeFiles([{ name: 'A.json', content: jsonA }, { name: 'B.json', content: jsonB }]);
        expect(preview.previews.map(p => [p.ok, p.agents, p.observationCount])).toEqual([[true, ['Agent A'], 5], [true, ['Agent B'], 5]]);
        expect(await db.observations.count()).toBe(0); // la prévisualisation n'écrit rien

        const first = await consolidateExchangeFiles(central, [{ name: 'A.json', content: jsonA }, { name: 'B.json', content: jsonB }]);
        expect(first.plan.added).toHaveLength(10);              // 10 items présents
        expect(first.plan.alreadyKnown).toBe(0);                // aucun doublon
        expect(first.apply.updated).toBe(10);
        expect(itemsOf(first.lieux).every(a => a.status === FloorAdhesiveStatus.OK)).toBe(true); // aucune perte
        expect(await db.observations.count()).toBe(10);
        const persisted = await db.lieux.get('lieu-station-x');
        expect(itemsOf([persisted!]).every(a => a.status === FloorAdhesiveStatus.OK)).toBe(true);
        const provenance = (await db.observations.toArray()).map(o => [o.item.id, o.agentName, o.sourceFile]);
        expect(provenance.filter(([, agent]) => agent === 'Agent A').map(([item]) => item).sort()).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']);
        expect(provenance.filter(([, agent]) => agent === 'Agent B').every(([, , file]) => file === 'B.json')).toBe(true);

        // Item 3 : A conforme à 09:00, B non conforme à 14:00.
        await switchDevice('Agent A');
        const lieuxA2 = makeStationX();
        await record(lieuxA2, 3, FloorAdhesiveStatus.OK, at('09:00'));
        const jsonA2 = JSON.stringify(await buildLocalExchangeFile(lieuxA2, 'test'));
        await switchDevice('Agent B');
        const lieuxB2 = makeStationX();
        await record(lieuxB2, 3, FloorAdhesiveStatus.ToBeReplaced, at('14:00'));
        const jsonB2 = JSON.stringify(await buildLocalExchangeFile(lieuxB2, 'test'));

        await switchDevice('Consolidation');
        const central2 = makeStationX();
        await db.lieux.bulkPut(central2);
        const second = await consolidateExchangeFiles(central2, [{ name: 'B2.json', content: jsonB2 }, { name: 'A2.json', content: jsonA2 }]);
        expect(statusOf(second.lieux, 3)).toBe(FloorAdhesiveStatus.ToBeReplaced); // non conforme
        const key = [...indexControls(second.lieux).values()].find(c => c.item.id === 'Item 3')!.key;
        const history = await getControlHistory(key);
        expect(history.map(o => [o.agentName, o.observedAt, o.result.status])).toEqual([
            ['Agent B', at('14:00'), 'ToBeReplaced'],
            ['Agent A', at('09:00'), 'OK'],
        ]);

        // Réimport de JSON B : aucune duplication.
        const countBefore = await db.observations.count();
        const third = await consolidateExchangeFiles(second.lieux, [{ name: 'B2.json', content: jsonB2 }]);
        expect(third.plan.added).toHaveLength(0);
        expect(third.plan.alreadyKnown).toBe(1);
        expect(third.apply.updated).toBe(0);
        expect(await db.observations.count()).toBe(countBefore);
        expect(statusOf(third.lieux, 3)).toBe(FloorAdhesiveStatus.ToBeReplaced);
    });
});

// =================================================================
describe('Migration V26 → V27 (table observations)', () => {
    it('ajoute la table observations vide sans toucher aux données existantes', async () => {
        const name = `observations-migration-${Math.random().toString(36).slice(2)}`;
        const v26 = new Dexie(name);
        v26.version(26).stores({
            lieux: 'id, name', history: '++id, date, type, categoryKey', signageReferences: 'id, auditType',
            events: '++id, date, type, entityType', photos: 'id, lieuId, moduleId, itemId, createdAt',
        });
        await v26.open();
        await v26.table('lieux').put({ id: 'lieu-v26', name: 'Lieu V26', modules: [] });
        v26.close();

        const upgraded = createAuditDb(name);
        await upgraded.open();
        expect(upgraded.verno).toBe(27);
        expect(await upgraded.table('lieux').get('lieu-v26')).toEqual({ id: 'lieu-v26', name: 'Lieu V26', modules: [] });
        expect(await upgraded.observations.count()).toBe(0);
        upgraded.close();
        await Dexie.delete(name);
    });
});

// =================================================================
describe('Store : la saisie terrain alimente le journal, la consolidation met à jour l\'état', () => {
    it('handleDatStatusChange enregistre une observation ; handleConsolidateExchange applique un constat plus récent', async () => {
        const { default: useAuditStore } = await import('../store');
        const lieu: Lieu = {
            id: 'lieu-store-x', name: 'Station Store', modules: [{
                id: 'module-dat-store', type: AuditModuleType.DAT, name: 'DAT', line: 'A',
                data: { id: 'mode-store', name: 'Station Store', type: 'METRO', line: 'A', stations: [{
                    id: 'sta-store', name: 'Station Store', directions: [{ id: 'sta-store-dir-1', name: 'Salle des billets', dats: [{
                        id: uuidv4(), name: 'DAT 01', adhesives: { ad1: AdhesiveStatus.NotChecked, ad2: AdhesiveStatus.NotChecked }, comment: '',
                    }] }],
                }] } as unknown as ModeData,
            }],
        };
        await db.lieux.clear();
        await db.observations.clear();
        await db.lieux.put(lieu);
        useAuditStore.setState({
            lieux: [lieu], selectedLieuId: lieu.id, selectedModuleId: 'module-dat-store', selectedStationId: 'sta-store',
            selectedDirectionId: 'sta-store-dir-1', selectedDatId: (lieu.modules[0].data as ModeData).stations[0].directions[0].dats[0].id,
        });
        setLocalAgentName('Flo');

        await useAuditStore.getState().handleDatStatusChange('ad1', AdhesiveStatus.OK);
        const [recorded] = await db.observations.toArray();
        expect(recorded).toMatchObject({ control: 'module-dat-store/sta-store/sta-store-dir-1/DAT 01/ad1', agentName: 'Flo', kind: 'observation', timeSource: 'recorded', result: { status: 'OK' } });

        // Serge, sur une autre tablette (DAT d'id différent), constate ad1 à remplacer plus tard.
        const serge = device('Serge', [clone(lieu)]);
        (serge.lieux[0].modules[0].data as ModeData).stations[0].directions[0].dats[0].id = uuidv4();
        const before = clone(serge.lieux);
        (serge.lieux[0].modules[0].data as ModeData).stations[0].directions[0].dats[0].adhesives.ad1 = AdhesiveStatus.ToBeReplaced;
        serge.log.push(...diffObservations(before, serge.lieux, serge.agent, REFERENTIEL.version, new Date(Date.now() + 60_000).toISOString(), uuidv4));

        const outcome = await useAuditStore.getState().handleConsolidateExchange([{ name: 'serge.json', content: exportOf(serge) }]);
        expect(outcome.apply.updated).toBe(1);
        const dat = (useAuditStore.getState().lieux[0].modules[0].data as ModeData).stations[0].directions[0].dats[0];
        expect(dat.adhesives.ad1).toBe(AdhesiveStatus.ToBeReplaced);
        expect(await db.observations.where('control').equals(recorded.control).count()).toBe(2);
        // L'application d'une consolidation n'est pas elle-même journalisée comme saisie locale.
        expect((await db.observations.toArray()).filter(o => o.agentName === 'Flo')).toHaveLength(1);
    });
});

describe('États hérités du seed', () => {
    it('les « non applicable » posés par le seed ECA, identiques sur chaque appareil, ne sont comptés qu\'une fois', async () => {
        const [a, b, c] = await Promise.all([generateInitialLieuxDataAsync(), generateInitialLieuxDataAsync(), generateInitialLieuxDataAsync()]);
        const fileA = exportOf(device('A', a));
        const fileB = exportOf(device('B', b));
        const seeded = JSON.parse(fileA).observations.length;
        expect(seeded).toBeGreaterThan(0);
        const central = device('Central', c);
        const { plan, apply } = importInto(central, [{ name: 'a', content: fileA }, { name: 'b', content: fileB }]);
        expect(plan.added).toHaveLength(0);
        expect(plan.alreadyKnown).toBe(2 * seeded);
        expect(apply.updated).toBe(0);
    });
});
