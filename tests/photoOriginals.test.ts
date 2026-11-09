// tests/photoOriginals.test.ts
// =================================================================
// Photos : choix depuis la photothèque, remise de l'original (partage /
// téléchargement), export ZIP des originaux. Les images sont de vrais
// fichiers ; seul le canvas (copie annotée) est simulé, comme dans
// pmrPhotos.test.ts. Dexie, SHA-256 et ZIP (fflate) sont réels.
// =================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';

const resizeCalls = vi.hoisted(() => [] as { type: string; size: number }[]);
const resizeFailure = vi.hoisted(() => ({ next: false }));
vi.mock('../utils/resizeImage', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/resizeImage')>();
    return {
        ...actual,
        resizeImage: vi.fn(async (file: Blob) => {
            if (resizeFailure.next) { resizeFailure.next = false; throw new Error('format illisible'); }
            resizeCalls.push({ type: file.type, size: file.size });
            return 'data:image/jpeg;base64,copie-annotee';
        }),
    };
});

import { db } from '../db';
import useAuditStore from '../store';
import { AuditModuleType, FieldPhoto, Lieu, PMRFloorAdhesiveData } from '../types';
import { deliverFile, deliveryMessage, DeliveryEnv } from '../utils/photos/deliverFile';
import { originalFileName, originalFileOf } from '../utils/photos/originalFile';
import {
    PhotoExportError, buildPhotoZipPart, extensionOf, pathSlug, planPhotoExport, scanPhotoMetadata, ZIP_ROOT,
} from '../utils/photos/photoExport';

const fixture = (name: string): Buffer => readFileSync(join(__dirname, 'fixtures', name));
const sha = (buf: Uint8Array) => createHash('sha256').update(buf).digest('hex');
const ab = (buf: Uint8Array): ArrayBuffer => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
// Petits fichiers « PNG » / « HEIC » : octets arbitraires, exportés tels quels.
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]);
const HEIC_BYTES = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 9, 9]);

beforeEach(async () => {
    resizeCalls.length = 0;
    resizeFailure.next = false;
    localStorage.clear();
    await db.lieux.clear();
    await db.photos.clear();
    useAuditStore.setState({ lieux: [], isLoading: true, initError: null, selectedLieuId: null, selectedModuleId: null, selectedStationId: null });
});

/** Station avec ses modules PMR au sol (un adhésif chacun) : capture(i)
 *  photographie l'adhésif du i-ème module, comme l'écran (module choisi). */
const seededPmr = async (stationName = 'Jean-Jaurès') => {
    await useAuditStore.getState().init();
    const lieu = useAuditStore.getState().lieux.find(l => l.name === stationName)!;
    const modules = lieu.modules.filter(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && !(m.data as PMRFloorAdhesiveData).isNotApplicable);
    const adhesive = (i: number) => (useAuditStore.getState().lieux.find(l => l.id === lieu.id)!.modules.find(m => m.id === modules[i].id)!.data as PMRFloorAdhesiveData).adhesives[0];
    const capture = async (i: number, file: File) => {
        useAuditStore.setState({ selectedLieuId: lieu.id, selectedModuleId: modules[i].id });
        await useAuditStore.getState().handlePmrFloorAdhesivePhotoCapture(adhesive(i).id, file);
    };
    return { lieu, module: modules[0], modules, adhesive, capture };
};

const record = (over: Partial<FieldPhoto> & { bytes: Uint8Array }): FieldPhoto => {
    const { bytes, ...rest } = over;
    return {
        id: `photo-${Math.random().toString(36).slice(2, 10)}`, lieuId: 'x', stationName: 'X', stationCode: '', moduleId: 'm', moduleName: 'M',
        accessLabel: '', itemId: 'i', itemLabel: 'Élément', original: ab(bytes), originalName: 'p.jpg', originalType: 'image/jpeg',
        originalSize: bytes.byteLength, originalSha256: sha(bytes), takenAt: '2026-10-26T09:43:00.000Z', takenAtSource: 'exif',
        rotation: 0, createdAt: '2026-10-26T09:45:00.000Z', status: 'current', ...rest,
    };
};

// -----------------------------------------------------------------
describe('prise de vue et photothèque : un seul circuit', () => {
    it('photo prise (JPEG EXIF) et photo choisie (PNG sans EXIF) : originaux intacts, empreintes, copie annotée inchangée', async () => {
        const { modules, adhesive, capture } = await seededPmr();
        await capture(0, new File([fixture('pmr-photo-exif.jpg')], 'IMG_0001.jpg', { type: 'image/jpeg' }));
        await capture(1, new File([PNG_BYTES], 'capture-ecran.png', { type: 'image/png', lastModified: Date.UTC(2026, 9, 20, 8, 0) }));

        const camera = await db.photos.get(adhesive(0).photo_id!);
        const library = await db.photos.get(adhesive(1).photo_id!);
        expect(Buffer.from(camera!.original).equals(fixture('pmr-photo-exif.jpg'))).toBe(true);
        expect(camera!.originalSha256).toBe(sha(fixture('pmr-photo-exif.jpg')));
        expect(new Uint8Array(library!.original)).toEqual(PNG_BYTES);
        expect(library).toMatchObject({ originalType: 'image/png', originalName: 'capture-ecran.png', originalSha256: sha(PNG_BYTES), takenAtSource: 'file', moduleId: modules[1].id });
        // Copie annotée : même génération, depuis l'original et son type réel.
        expect(adhesive(1).photo_base64).toBe('data:image/jpeg;base64,copie-annotee');
        expect(resizeCalls.map(c => c.type)).toEqual(['image/jpeg', 'image/png']);
    });

    it('image illisible par le navigateur (ex. HEIC) : rien enregistré, audit inchangé', async () => {
        const { adhesive, capture } = await seededPmr();
        resizeFailure.next = true;
        await expect(capture(0, new File([HEIC_BYTES], 'IMG.HEIC', { type: 'image/heic' }))).rejects.toThrow();
        expect(await db.photos.count()).toBe(0);
        expect(adhesive(0).photo_base64).toBeUndefined();
    });
});

// -----------------------------------------------------------------
describe('remise de l\'original', () => {
    const file = () => originalFileOf(record({ bytes: PNG_BYTES, originalName: 'plan.png', originalType: 'image/png' }));
    const env = (over: Partial<DeliveryEnv>) => {
        const downloads: File[] = [];
        return { downloads, env: { download: (f: File) => downloads.push(f), ...over } as DeliveryEnv };
    };

    it('original (et non la copie annotée) : octets, nom et type d\'origine', async () => {
        const f = file();
        expect(new Uint8Array(await f.arrayBuffer())).toEqual(PNG_BYTES);
        expect(f.name).toBe('plan.png');
        expect(f.type).toBe('image/png');
        expect(originalFileName({ originalName: '', originalType: 'image/heic', stationName: 'Saint-Agne - SNCF', takenAt: '2026-10-26T09:43:00.000Z' })).toMatch(/^Saint-Agne-SNCF_2026-10-26_\d{4}\.heic$/);
    });

    it('partage disponible : feuille de partage avec l\'original', async () => {
        const share = vi.fn(async () => {});
        const { env: e, downloads } = env({ canShare: () => true, share });
        expect(await deliverFile(file(), 'plan.png', e)).toBe('shared');
        expect(share).toHaveBeenCalledWith({ files: [expect.objectContaining({ name: 'plan.png' })], title: 'plan.png' });
        expect(downloads).toHaveLength(0);
    });

    it('navigateur sans navigator.share : téléchargement', async () => {
        const { env: e, downloads } = env({});
        expect(await deliverFile(file(), 'plan.png', e)).toBe('download-started');
        expect(downloads.map(d => d.name)).toEqual(['plan.png']);
    });

    it('fichier non partageable (canShare faux) : téléchargement', async () => {
        const share = vi.fn(async () => {});
        const { env: e, downloads } = env({ canShare: () => false, share });
        expect(await deliverFile(file(), 'plan.png', e)).toBe('download-started');
        expect(share).not.toHaveBeenCalled();
        expect(downloads).toHaveLength(1);
    });

    it('partage annulé : aucun téléchargement, aucun succès', async () => {
        const { env: e, downloads } = env({ canShare: () => true, share: async () => { throw new DOMException('annulé', 'AbortError'); } });
        expect(await deliverFile(file(), 'plan.png', e)).toBe('cancelled');
        expect(downloads).toHaveLength(0);
    });

    it('partage refusé par le système (activation perdue) : téléchargement de repli', async () => {
        const { env: e, downloads } = env({ canShare: () => true, share: async () => { throw new DOMException('refus', 'NotAllowedError'); } });
        expect(await deliverFile(file(), 'plan.png', e)).toBe('download-started');
        expect(downloads).toHaveLength(1);
    });

    it('aucun message ne prétend que la photo est dans la galerie', () => {
        for (const outcome of ['shared', 'cancelled', 'download-started'] as const) {
            for (const what of ['photo', 'zip'] as const) {
                const m = deliveryMessage(outcome, what);
                expect(m).not.toMatch(/enregistrée? dans (la galerie|Photos)/i);
            }
        }
        expect(deliveryMessage('download-started', 'photo')).toContain('Le téléchargement a été lancé');
        expect(deliveryMessage('cancelled', 'photo')).toContain('rien n’a été enregistré');
    });
});

// -----------------------------------------------------------------
describe('export ZIP des originaux', () => {
    const unzip = async (blob: Blob) => unzipSync(new Uint8Array(await blob.arrayBuffer()));

    /** Jeu réel : 2 photos actives (Jean-Jaurès, A) + formats variés,
     *  historique et orpheline ajoutés en base. */
    const seedExport = async () => {
        const { lieu, module, capture } = await seededPmr();
        await capture(0, new File([fixture('pmr-photo-exif.jpg')], 'IMG_0001.jpg', { type: 'image/jpeg' }));
        await capture(0, new File([fixture('pmr-photo-sans-exif.jpg')], 'IMG_0002.jpg', { type: 'image/jpeg', lastModified: Date.UTC(2026, 9, 26) })); // remplace la 1re
        await capture(1, new File([HEIC_BYTES], 'IMG_0003.HEIC', { type: 'image/heic' }));
        // Autre station, autre ligne (accents) : Saint-Agne - SNCF, ligne B.
        const lieuxB = useAuditStore.getState().lieux;
        const sag = lieuxB.find(l => l.name === 'Saint-Agne - SNCF')!;
        const sagModule = sag.modules.find(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE)!;
        await db.photos.add(record({ bytes: PNG_BYTES, id: 'photo-sag', lieuId: sag.id, stationName: 'Saint-Agne - SNCF', stationCode: 'SAG', moduleId: sagModule.id, moduleName: sagModule.name, itemId: 'adh-x', itemLabel: 'Adhésif « quai » n°2', originalName: '', originalType: 'image/png', accessLabel: '', takenAtSource: 'validation' }));
        // Orpheline : module disparu.
        await db.photos.add(record({ bytes: new Uint8Array([7, 7, 7]), id: 'photo-orpheline', lieuId: lieu.id, stationName: 'Jean-Jaurès', moduleId: 'module-supprime', moduleName: 'Ancien module' }));
        return { lieu, module, sag };
    };

    it('par défaut : photos actives rattachées seulement, chemins par ligne et station', async () => {
        await seedExport();
        const plan = planPhotoExport(await scanPhotoMetadata(db, useAuditStore.getState().lieux), { kind: 'all' });
        expect(plan.photos.map(p => [p.status, p.attached])).toEqual([['current', true], ['current', true], ['current', true]]);
        expect(plan.photos.map(p => p.zipPath)).toEqual([
            `${ZIP_ROOT}/originaux/ligne-A/Jean-Jaures/photo_001_${pathSlug(plan.photos[0].itemLabel)}.jpg`,
            // Jean-Jaurès est commune aux lignes A et B : son 2e accès PMR est sur B.
            `${ZIP_ROOT}/originaux/ligne-B/Jean-Jaures/photo_002_${pathSlug(plan.photos[1].itemLabel)}.heic`,
            `${ZIP_ROOT}/originaux/ligne-B/Saint-Agne-SNCF/photo_003_Adhesif-quai-n-2.png`,
        ]);
    });

    it('station, ligne : périmètres exacts ; orphelines jamais attribuées à une station', async () => {
        const { lieu, sag } = await seedExport();
        const metas = await scanPhotoMetadata(db, useAuditStore.getState().lieux);
        expect(planPhotoExport(metas, { kind: 'station', lieuId: lieu.id }).photos).toHaveLength(2);
        expect(planPhotoExport(metas, { kind: 'station', lieuId: sag.id }).photos.map(p => p.id)).toEqual(['photo-sag']);
        const lineB = planPhotoExport(metas, { kind: 'line', line: 'B' }).photos;
        expect(lineB.map(p => p.stationName)).toEqual(['Jean-Jaurès', 'Saint-Agne - SNCF']);
        expect(lineB.every(p => p.line === 'B')).toBe(true);
        expect(planPhotoExport(metas, { kind: 'line', line: 'A' }).photos.map(p => p.stationName)).toEqual(['Jean-Jaurès']);
        const withHistory = planPhotoExport(metas, { kind: 'station', lieuId: lieu.id }, { includeHistory: true });
        expect(withHistory.photos.some(p => p.id === 'photo-orpheline')).toBe(false); // jamais dans une station
        expect(withHistory.photos.filter(p => p.status === 'replaced')).toHaveLength(1);
    });

    it('historique et orphelines (option) : dossiers dédiés, statuts, sans doublon', async () => {
        await seedExport();
        const metas = await scanPhotoMetadata(db, useAuditStore.getState().lieux);
        const plan = planPhotoExport([...metas, ...metas], { kind: 'all' }, { includeHistory: true });
        expect(plan.photos).toHaveLength(5);
        expect(new Set(plan.photos.map(p => p.id)).size).toBe(5);
        expect(new Set(plan.photos.map(p => p.zipPath)).size).toBe(5);
        expect(plan.photos.find(p => p.status === 'replaced')!.zipPath).toContain('/ligne-A/Jean-Jaures/historique/');
        expect(plan.photos.find(p => p.id === 'photo-orpheline')!.zipPath).toContain('/originaux/orphelines/');
    });

    it('ZIP global : originaux octet pour octet, SHA-256, inventaire CSV et manifeste', async () => {
        await seedExport();
        const plan = planPhotoExport(await scanPhotoMetadata(db, useAuditStore.getState().lieux), { kind: 'all' }, { includeHistory: true });
        const built = await buildPhotoZipPart(db, plan, 0, { scope: { kind: 'all' }, scopeLabel: 'tous-les-audits', includeHistory: true, now: new Date('2026-11-09T08:00:00Z') });
        expect(built.fileName).toBe('photos-audit-dat_tous-les-audits_2026-11-09.zip');
        expect(built.integrityIssues).toBe(0);
        const files = await unzip(built.blob);
        for (const p of plan.photos) {
            const stored = await db.photos.get(p.id);
            expect(files[p.zipPath]).toEqual(new Uint8Array(stored!.original));
            expect(sha(files[p.zipPath])).toBe(p.originalSha256);
        }
        const csvBytes = files[`${ZIP_ROOT}/inventaire.csv`];
        expect([...csvBytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM UTF-8 (Excel)
        const csv = strFromU8(csvBytes);
        expect(csv).toContain('Saint-Agne - SNCF'); // libellé exact, accents conservés
        expect(csv).toContain('"Adhésif « quai » n°2"'.replace(/"/g, '') ); // élément tel quel
        expect(csv).toContain('orpheline (lieu ou module introuvable)');
        expect(csv).toContain('remplacé');
        expect(csv.split('\r\n')).toHaveLength(1 + 5);
        const manifest = JSON.parse(strFromU8(files[`${ZIP_ROOT}/manifest.json`]));
        expect(manifest).toMatchObject({ format: 'audit-dat-photos-originales', part: { index: 1, count: 1 }, totals: { photosInExport: 5, photosInPart: 5 } });
        const sag = manifest.photos.find((p: { id: string }) => p.id === 'photo-sag');
        expect(sag).toMatchObject({ originalName: '', accessLabel: '', takenAtSource: 'validation', mimeType: 'image/png', integrity: 'conforme' });
        expect(sag.category).toBe('Adhésif PMR au sol');
        expect(manifest.photos.find((p: { id: string }) => p.id === 'photo-orpheline').category).toBeNull(); // jamais inventée
    });

    it('ZIP vide : inventaire et manifeste seuls', async () => {
        await useAuditStore.getState().init();
        const plan = planPhotoExport(await scanPhotoMetadata(db, useAuditStore.getState().lieux), { kind: 'all' });
        expect(plan.photos).toHaveLength(0);
        const files = await unzip((await buildPhotoZipPart(db, plan, 0, { scope: { kind: 'all' }, scopeLabel: 'tout', includeHistory: false })).blob);
        expect(Object.keys(files).sort()).toEqual([`${ZIP_ROOT}/inventaire.csv`, `${ZIP_ROOT}/manifest.json`]);
    });

    it('découpage en parties : chaque partie autonome, aucune photo perdue ni dupliquée', async () => {
        await seedExport();
        const plan = planPhotoExport(await scanPhotoMetadata(db, useAuditStore.getState().lieux), { kind: 'all' }, { includeHistory: true, maxPartBytes: 20 });
        expect(plan.parts.length).toBeGreaterThan(1);
        const seen: string[] = [];
        for (let i = 0; i < plan.parts.length; i++) {
            const built = await buildPhotoZipPart(db, plan, i, { scope: { kind: 'all' }, scopeLabel: 'tout', includeHistory: true });
            expect(built.fileName).toContain(`_partie-${i + 1}-sur-${plan.parts.length}.zip`);
            const manifest = JSON.parse(strFromU8((await unzip(built.blob))[`${ZIP_ROOT}/manifest.json`]));
            expect(manifest.part).toEqual({ index: i + 1, count: plan.parts.length });
            seen.push(...manifest.photos.map((p: { id: string }) => p.id));
        }
        expect(seen.sort()).toEqual(plan.photos.map(p => p.id).sort());
    });

    it('empreinte divergente : signalée, jamais masquée', async () => {
        await seedExport();
        await db.photos.update('photo-sag', { originalSha256: 'ffff' });
        const plan = planPhotoExport(await scanPhotoMetadata(db, useAuditStore.getState().lieux), { kind: 'line', line: 'B' });
        const built = await buildPhotoZipPart(db, plan, 0, { scope: { kind: 'line', line: 'B' }, scopeLabel: 'ligne-B', includeHistory: false });
        expect(built.integrityIssues).toBe(1);
        expect(built.rows.find(r => r.photo.id === 'photo-sag')!.integrity).toBe('écart');
        expect(built.rows.filter(r => r.photo.id !== 'photo-sag').every(r => r.integrity === 'conforme')).toBe(true);
    });

    it('annulation, erreur de stockage, photo disparue : erreurs explicites, base intacte', async () => {
        await seedExport();
        const plan = planPhotoExport(await scanPhotoMetadata(db, useAuditStore.getState().lieux), { kind: 'all' }, { includeHistory: true });
        const before = (await db.photos.toArray()).map(p => `${p.id}:${p.status}:${p.originalSha256}`).sort();

        const controller = new AbortController();
        await expect(buildPhotoZipPart(db, plan, 0, { scope: { kind: 'all' }, scopeLabel: 't', includeHistory: true }, {
            signal: controller.signal, onProgress: () => controller.abort(),
        })).rejects.toMatchObject({ name: 'AbortError' });

        const failing = { photos: { get: async () => { throw new Error('QuotaExceededError'); } } };
        await expect(buildPhotoZipPart(failing, plan, 0, { scope: { kind: 'all' }, scopeLabel: 't', includeHistory: true })).rejects.toBeInstanceOf(PhotoExportError);

        const partial = { photos: { get: async (id: string) => (id === 'photo-sag' ? undefined : db.photos.get(id)) } };
        const built = await buildPhotoZipPart(partial, plan, 0, { scope: { kind: 'all' }, scopeLabel: 't', includeHistory: true });
        expect(built.missing).toEqual(['photo-sag']);

        expect((await db.photos.toArray()).map(p => `${p.id}:${p.status}:${p.originalSha256}`).sort()).toEqual(before);
    });

    it('hors connexion : aucune requête réseau ; photos conservées après fermeture et réouverture de la base', async () => {
        await seedExport();
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const plan = planPhotoExport(await scanPhotoMetadata(db, useAuditStore.getState().lieux), { kind: 'all' }, { includeHistory: true });
        await buildPhotoZipPart(db, plan, 0, { scope: { kind: 'all' }, scopeLabel: 't', includeHistory: true });
        expect(fetchSpy).not.toHaveBeenCalled();
        fetchSpy.mockRestore();
        const count = await db.photos.count();
        db.close();
        await db.open();
        expect(await db.photos.count()).toBe(count);
    });

    it('extensions : nom d\'origine, sinon type MIME ; jamais de conversion', () => {
        expect(extensionOf({ originalName: 'IMG_1.HEIC', originalType: 'image/heic' })).toBe('heic');
        expect(extensionOf({ originalName: 'a.jpeg', originalType: 'image/jpeg' })).toBe('jpg');
        expect(extensionOf({ originalName: '', originalType: 'image/webp' })).toBe('webp');
        expect(extensionOf({ originalName: '', originalType: '' })).toBe('bin');
        expect(pathSlug('Jean-Jaurès « Accès » / Ligne A')).toBe('Jean-Jaures-Acces-Ligne-A');
    });
});

// Garde : la fixture de lieux contient bien les stations utilisées.
describe('jeu de données', () => {
    it('Saint-Agne - SNCF (B) et Jean-Jaurès (A) portent un module PMR', async () => {
        await useAuditStore.getState().init();
        const names = useAuditStore.getState().lieux.filter((l: Lieu) => l.modules.some(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE)).map(l => l.name);
        expect(names).toEqual(expect.arrayContaining(['Jean-Jaurès', 'Saint-Agne - SNCF']));
    });
});
