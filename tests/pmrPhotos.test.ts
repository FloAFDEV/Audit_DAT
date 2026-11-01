// tests/pmrPhotos.test.ts
// =================================================================
// Photos des adhésifs PMR au sol (utils/fieldPhotos.ts, store.ts, db.ts V26).
// Les images sont de vrais JPEG (tests/fixtures, générés avec un EXIF réel).
// L'environnement de test n'a pas de canvas : resizeImage est remplacé par
// un double qui enregistre ses appels et rejoue le dessin du bandeau sur un
// contexte factice — tout le reste (EXIF, SHA-256, Dexie, store) est réel.
// =================================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import Dexie from 'dexie';

const resizeCalls = vi.hoisted(() => [] as { rotation?: number; caption?: string; type: string; size: number }[]);

/** Contexte 2D factice : enregistre le texte dessiné. */
const fakeContext = () => {
    const texts: string[] = [];
    const rects: number[][] = [];
    const ctx = {
        font: '', fillStyle: '', textBaseline: '',
        measureText: (text: string) => ({ width: text.length * (parseInt(ctx.font.replace(/^bold /, ''), 10) || 10) * 0.55 }),
        fillRect: (...args: number[]) => { rects.push(args); },
        fillText: (text: string) => { texts.push(text); },
    };
    return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, rects };
};

vi.mock('../utils/resizeImage', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../utils/resizeImage')>();
    return {
        ...actual,
        resizeImage: vi.fn(async (file: Blob, _max: number, options: import('../utils/resizeImage').ResizeImageOptions = {}) => {
            const { ctx, texts } = fakeContext();
            options.annotate?.(ctx, 1600, 1200);
            resizeCalls.push({ rotation: options.rotation, caption: texts[0], type: file.type, size: file.size });
            return `data:image/jpeg;base64,annotee-r${options.rotation ?? 0}`;
        }),
    };
});

import { db, createAuditDb } from '../db';
import useAuditStore, { signaletiquePhotoItemId } from '../store';
import {
    buildPhotoCaption, createFieldPhotoRecord, drawCaptionBanner, formatTakenAt, pmrAccessLabel,
    readExifDateTime, resolveTakenAt, sha256Hex, FIELD_PHOTO_MAX_SIZE,
} from '../utils/fieldPhotos';
import { computeResizeGeometry } from '../utils/resizeImage';
import { buildFullExportPayload, parseImportPayload, applyImportPayload } from '../utils/signageSerializer';
import { AuditModule, AuditModuleType, Lieu, ModeData, PMRFloorAdhesiveData } from '../types';

const fixture = (name: string): Buffer => readFileSync(join(__dirname, 'fixtures', name));
const toArrayBuffer = (buf: Buffer): ArrayBuffer => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
const jpegFile = (name: string, lastModified = Date.UTC(2026, 9, 26, 9, 0, 0)) =>
    new File([fixture(name)], name, { type: 'image/jpeg', lastModified });
const sha = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

// -----------------------------------------------------------------
// Date de prise de vue, empreinte, légende
// -----------------------------------------------------------------
describe('date de prise de vue', () => {
    it('EXIF DateTimeOriginal lu dans un vrai JPEG (heure locale de l\'appareil)', () => {
        const date = readExifDateTime(toArrayBuffer(fixture('pmr-photo-exif.jpg')));
        expect(date && formatTakenAt(date)).toBe('2026-10-26 11:43');
        expect(date?.getSeconds()).toBe(7); // DateTimeOriginal, pas DateTimeDigitized (:08) ni DateTime IFD0
    });

    it('repli sur DateTime (IFD0) ; JPEG sans EXIF, fichier non JPEG ou tronqué : null, sans exception', () => {
        expect(formatTakenAt(readExifDateTime(toArrayBuffer(fixture('pmr-photo-exif-ifd0.jpg')))!)).toBe('2026-09-30 07:05');
        expect(readExifDateTime(toArrayBuffer(fixture('pmr-photo-sans-exif.jpg')))).toBeNull();
        expect(readExifDateTime(new TextEncoder().encode('pas une image').buffer as ArrayBuffer)).toBeNull();
        expect(readExifDateTime(toArrayBuffer(fixture('pmr-photo-exif.jpg').subarray(0, 40)))).toBeNull();
    });

    it('priorité : EXIF, puis date du fichier, puis heure de validation', () => {
        const exif = new Date(2026, 9, 26, 11, 43);
        const now = new Date(2026, 9, 26, 12, 0);
        const file = Date.UTC(2026, 9, 26, 10, 30);
        expect(resolveTakenAt(exif, file, now)).toEqual({ takenAt: exif, source: 'exif' });
        expect(resolveTakenAt(null, file, now)).toEqual({ takenAt: new Date(file), source: 'file' });
        expect(resolveTakenAt(null, undefined, now)).toEqual({ takenAt: now, source: 'validation' });
        expect(resolveTakenAt(null, 0, now).source).toBe('validation');
        expect(resolveTakenAt(null, NaN, now).source).toBe('validation');
    });
});

describe('empreinte et légende', () => {
    it('SHA-256 identique à celui calculé par Node sur les mêmes octets', async () => {
        const buf = fixture('pmr-photo-exif.jpg');
        expect(await sha256Hex(toArrayBuffer(buf))).toBe(sha(buf));
    });

    it('« Station · Accès · AAAA-MM-JJ HH:MM » ; module sans accès : « Station · date »', () => {
        const at = new Date(2026, 9, 26, 11, 43);
        expect(pmrAccessLabel('Adhésifs PMR au Sol (Accès Principal Ligne A)')).toBe('Accès Principal Ligne A');
        expect(pmrAccessLabel('Adhésifs PMR au Sol (Accès Bas (ASC))')).toBe('Accès Bas (ASC)');
        expect(pmrAccessLabel('Adhésifs PMR au Sol')).toBe('');
        expect(buildPhotoCaption('Jean-Jaurès', 'Entrée', at)).toBe('Jean-Jaurès · Entrée · 2026-10-26 11:43');
        expect(buildPhotoCaption('Capitole', '', at)).toBe('Capitole · 2026-10-26 11:43');
    });

    it('bandeau : dessiné en bas sur toute la largeur, légende réduite pour tenir', () => {
        const { ctx, texts, rects } = fakeContext();
        drawCaptionBanner(ctx, 1600, 1200, 'Jean-Jaurès · Entrée · 2026-10-26 11:43');
        expect(texts).toEqual(['Jean-Jaurès · Entrée · 2026-10-26 11:43']);
        const [x, y, w, h] = rects[0];
        expect([x, w, y + h]).toEqual([0, 1600, 1200]);
        const narrow = fakeContext();
        drawCaptionBanner(narrow.ctx, 300, 400, 'Université Paul-Sabatier · Accès Principal Ligne B · 2026-10-26 11:43');
        expect(parseInt(narrow.ctx.font.replace(/^bold /, ''), 10)).toBeLessThan(14);
    });

    it('géométrie : rotation d\'un quart de tour = canevas inversé, côté le plus long borné', () => {
        expect(computeResizeGeometry(4000, 3000, FIELD_PHOTO_MAX_SIZE, 0).canvas).toEqual({ width: 1600, height: 1200 });
        expect(computeResizeGeometry(4000, 3000, FIELD_PHOTO_MAX_SIZE, 90).canvas).toEqual({ width: 1200, height: 1600 });
        expect(computeResizeGeometry(4000, 3000, FIELD_PHOTO_MAX_SIZE, 180).canvas).toEqual({ width: 1600, height: 1200 });
        expect(computeResizeGeometry(800, 600, FIELD_PHOTO_MAX_SIZE, 270).draw).toEqual({ width: 800, height: 600 });
        // Sans option : comportement historique (1024, aucun changement).
        expect(computeResizeGeometry(2048, 1024, 1024).canvas).toEqual({ width: 1024, height: 512 });
    });
});

// -----------------------------------------------------------------
// Enregistrement, cycle de vie, store
// -----------------------------------------------------------------
const CONTEXT = {
    lieuId: 'lieu-jj', stationName: 'Jean-Jaurès', stationCode: 'JJA',
    moduleId: 'module-pmr-a', moduleName: 'Adhésifs PMR au Sol (Accès Principal Ligne A)',
    accessLabel: 'Accès Principal Ligne A',
    itemId: 'adh-1', itemLabel: "Présence et état de l'adhésif de signalisation au sol",
};

beforeEach(async () => {
    resizeCalls.length = 0;
    localStorage.clear();
    await db.lieux.clear();
    await db.photos.clear();
    useAuditStore.setState({ lieux: [], isLoading: true, initError: null, selectedLieuId: null, selectedModuleId: null, selectedStationId: null });
});

describe('enregistrement d\'une prise de vue', () => {
    it('original conservé octet pour octet (type, taille, nom, SHA-256), rattachement et date', async () => {
        const buf = fixture('pmr-photo-exif.jpg');
        const record = await createFieldPhotoRecord(jpegFile('pmr-photo-exif.jpg'), CONTEXT, new Date(2026, 9, 26, 12, 0));
        expect(Buffer.from(record.original).equals(buf)).toBe(true);
        expect(record).toMatchObject({
            ...CONTEXT,
            originalName: 'pmr-photo-exif.jpg', originalType: 'image/jpeg', originalSize: buf.length,
            originalSha256: sha(buf), takenAtSource: 'exif', rotation: 0, status: 'current',
        });
        expect(formatTakenAt(new Date(record.takenAt))).toBe('2026-10-26 11:43');

        // Relu depuis Dexie : mêmes octets, même empreinte.
        await db.photos.add(record);
        const stored = await db.photos.get(record.id);
        expect(Buffer.from(stored!.original).equals(buf)).toBe(true);
        expect(await sha256Hex(stored!.original)).toBe(sha(buf));
    });

    it('sans EXIF : date du fichier', async () => {
        const record = await createFieldPhotoRecord(jpegFile('pmr-photo-sans-exif.jpg', Date.UTC(2026, 9, 26, 10, 30)), CONTEXT);
        expect(record.takenAtSource).toBe('file');
        expect(record.takenAt).toBe(new Date(Date.UTC(2026, 9, 26, 10, 30)).toISOString());
    });
});

const seededPmrModule = async (): Promise<{ lieu: Lieu; module: AuditModule; other: AuditModule }> => {
    await useAuditStore.getState().init();
    const lieu = useAuditStore.getState().lieux.find(l => l.name === 'Jean-Jaurès')!;
    const pmr = lieu.modules.filter(m => m.type === AuditModuleType.PMR_FLOOR_ADHESIVE && !(m.data as PMRFloorAdhesiveData).isNotApplicable);
    const module = pmr.find(m => m.name.includes('Accès Principal Ligne A'))!;
    const other = pmr.find(m => m.id !== module.id)!;
    useAuditStore.setState({ selectedLieuId: lieu.id, selectedModuleId: module.id });
    return { lieu, module, other };
};
const adhesiveOf = (moduleId: string) => {
    const lieu = useAuditStore.getState().lieux.find(l => l.modules.some(m => m.id === moduleId))!;
    return (lieu.modules.find(m => m.id === moduleId)!.data as PMRFloorAdhesiveData).adhesives[0];
};

describe('store : prise de vue d\'un adhésif PMR', () => {
    it('une prise de vue : copie annotée affichée, original et rattachement enregistrés, persistés', async () => {
        const { lieu, module } = await seededPmrModule();
        const adhesiveId = adhesiveOf(module.id).id;
        await useAuditStore.getState().handlePmrFloorAdhesivePhotoCapture(adhesiveId, jpegFile('pmr-photo-exif.jpg'));

        const adhesive = adhesiveOf(module.id);
        expect(adhesive.photo_base64).toBe('data:image/jpeg;base64,annotee-r0');
        expect(formatTakenAt(new Date(adhesive.photo_taken_at!))).toBe('2026-10-26 11:43');
        // Copie annotée générée depuis l'original, avec le bon bandeau.
        expect(resizeCalls).toEqual([{ rotation: 0, caption: 'Jean-Jaurès · Accès Principal Ligne A · 2026-10-26 11:43', type: 'image/jpeg', size: fixture('pmr-photo-exif.jpg').length }]);

        const photo = await db.photos.get(adhesive.photo_id!);
        expect(photo).toMatchObject({
            lieuId: lieu.id, stationName: 'Jean-Jaurès', moduleId: module.id, moduleName: module.name,
            accessLabel: 'Accès Principal Ligne A', itemId: adhesiveId, status: 'current',
            originalSha256: sha(fixture('pmr-photo-exif.jpg')),
        });
        // Écrit en base (pas seulement dans l'état local).
        const persisted = await db.lieux.get(lieu.id);
        const persistedAdhesive = (persisted!.modules.find(m => m.id === module.id)!.data as PMRFloorAdhesiveData).adhesives[0];
        expect(persistedAdhesive.photo_id).toBe(photo!.id);
    }, 60000);

    it('changement d\'écran pendant le traitement : la photo reste sur l\'adhésif photographié', async () => {
        const { module, other } = await seededPmrModule();
        const adhesiveId = adhesiveOf(module.id).id;
        const pending = useAuditStore.getState().handlePmrFloorAdhesivePhotoCapture(adhesiveId, jpegFile('pmr-photo-exif.jpg'));
        useAuditStore.setState({ selectedModuleId: other.id });
        await pending;
        expect(adhesiveOf(module.id).photo_id).toBeDefined();
        expect(adhesiveOf(other.id).photo_base64).toBeUndefined();
    }, 60000);

    it('remplacement : nouvel enregistrement lié, l\'ancien conservé « replaced »', async () => {
        const { module } = await seededPmrModule();
        const adhesiveId = adhesiveOf(module.id).id;
        const { handlePmrFloorAdhesivePhotoCapture } = useAuditStore.getState();
        await handlePmrFloorAdhesivePhotoCapture(adhesiveId, jpegFile('pmr-photo-exif.jpg'));
        const first = adhesiveOf(module.id).photo_id!;
        await useAuditStore.getState().handlePmrFloorAdhesivePhotoCapture(adhesiveId, jpegFile('pmr-photo-sans-exif.jpg'));
        const second = adhesiveOf(module.id).photo_id!;
        expect(second).not.toBe(first);
        expect((await db.photos.get(first))!.status).toBe('replaced');
        expect((await db.photos.get(second))!.status).toBe('current');
        expect(await db.photos.count()).toBe(2);
    }, 60000);

    it('rotation : régénérée depuis l\'original, rotation cumulée dans les pixels', async () => {
        const { module } = await seededPmrModule();
        const adhesiveId = adhesiveOf(module.id).id;
        await useAuditStore.getState().handlePmrFloorAdhesivePhotoCapture(adhesiveId, jpegFile('pmr-photo-exif.jpg'));
        const photoId = adhesiveOf(module.id).photo_id!;
        // La visionneuse envoie photo_rotation + 90 (photo_rotation reste 0).
        await useAuditStore.getState().handlePmrFloorAdhesivePhotoRotationChange(adhesiveId, 90);
        expect(adhesiveOf(module.id).photo_base64).toBe('data:image/jpeg;base64,annotee-r90');
        await useAuditStore.getState().handlePmrFloorAdhesivePhotoRotationChange(adhesiveId, 90);
        expect(adhesiveOf(module.id).photo_base64).toBe('data:image/jpeg;base64,annotee-r180');
        expect(adhesiveOf(module.id).photo_rotation).toBeUndefined();
        const photo = await db.photos.get(photoId);
        expect(photo!.rotation).toBe(180);
        // L'original n'a pas bougé, le bandeau est toujours régénéré.
        expect(Buffer.from(photo!.original).equals(fixture('pmr-photo-exif.jpg'))).toBe(true);
        expect(resizeCalls.map(c => [c.rotation, c.caption])).toEqual([
            [0, 'Jean-Jaurès · Accès Principal Ligne A · 2026-10-26 11:43'],
            [90, 'Jean-Jaurès · Accès Principal Ligne A · 2026-10-26 11:43'],
            [180, 'Jean-Jaurès · Accès Principal Ligne A · 2026-10-26 11:43'],
        ]);
    }, 60000);

    it('suppression et réinitialisation : lien retiré, enregistrements conservés « removed »', async () => {
        const { module } = await seededPmrModule();
        const adhesiveId = adhesiveOf(module.id).id;
        await useAuditStore.getState().handlePmrFloorAdhesivePhotoCapture(adhesiveId, jpegFile('pmr-photo-exif.jpg'));
        const deleted = adhesiveOf(module.id).photo_id!;
        await useAuditStore.getState().handlePmrFloorAdhesivePhotoChange(adhesiveId, null);
        expect(adhesiveOf(module.id)).not.toHaveProperty('photo_id');
        expect(adhesiveOf(module.id)).not.toHaveProperty('photo_base64');
        expect((await db.photos.get(deleted))!.status).toBe('removed');

        await useAuditStore.getState().handlePmrFloorAdhesivePhotoCapture(adhesiveId, jpegFile('pmr-photo-exif.jpg'));
        const beforeReset = adhesiveOf(module.id).photo_id!;
        await useAuditStore.getState().handleResetPmrFloorAdhesive();
        expect(adhesiveOf(module.id)).not.toHaveProperty('photo_id');
        expect((await db.photos.get(beforeReset))!.status).toBe('removed');
        // Aucun effacement physique, rattachement historique intact.
        expect(await db.photos.count()).toBe(2);
        expect((await db.photos.get(beforeReset))!.itemId).toBe(adhesiveId);
    }, 60000);

    it('sauvegarde JSON : la copie annotée voyage ; sans original (autre appareil), rotation d\'affichage', async () => {
        const { lieu, module } = await seededPmrModule();
        const adhesiveId = adhesiveOf(module.id).id;
        await useAuditStore.getState().handlePmrFloorAdhesivePhotoCapture(adhesiveId, jpegFile('pmr-photo-exif.jpg'));
        const json = JSON.stringify(await buildFullExportPayload());
        expect(json).not.toContain('"original"'); // l'original reste sur l'appareil

        // « Ordinateur de bureau » : base vide de photos, import de la sauvegarde.
        await db.photos.clear();
        await applyImportPayload(parseImportPayload(json));
        await useAuditStore.getState().init();
        useAuditStore.setState({ selectedLieuId: lieu.id, selectedModuleId: module.id });
        const imported = adhesiveOf(module.id);
        expect(imported.photo_base64).toBe('data:image/jpeg;base64,annotee-r0');
        expect(imported.photo_id).toBeDefined();

        await useAuditStore.getState().handlePmrFloorAdhesivePhotoRotationChange(adhesiveId, 90);
        expect(adhesiveOf(module.id).photo_rotation).toBe(90);
        expect(adhesiveOf(module.id).photo_base64).toBe('data:image/jpeg;base64,annotee-r0');
    }, 60000);
});

// -----------------------------------------------------------------
// Équipements Station (et plans de quartier T1) : même circuit
// -----------------------------------------------------------------
const seededSignaletique = async () => {
    await useAuditStore.getState().init();
    for (const lieu of useAuditStore.getState().lieux) {
        for (const module of lieu.modules.filter(m => m.type === AuditModuleType.SIGNALETIQUE)) {
            const station = (module.data as ModeData).stations?.find(s => (s.signaletique?.planReseau?.meett?.length ?? 0) > 0);
            if (station) {
                useAuditStore.setState({ selectedLieuId: lieu.id, selectedModuleId: module.id, selectedStationId: station.id });
                return { lieu, module, station };
            }
        }
    }
    throw new Error('Aucune station avec Équipements Station dans le jeu initial');
};
const planReseauOf = (lieuId: string, moduleId: string, stationId: string) => {
    const lieu = useAuditStore.getState().lieux.find(l => l.id === lieuId)!;
    const station = (lieu.modules.find(m => m.id === moduleId)!.data as ModeData).stations.find(s => s.id === stationId)!;
    return station.signaletique!.planReseau.meett[0];
};
const LABELS = { stationName: 'Arènes', accessLabel: 'MEETT / Aéroport', itemLabel: 'Plan du Réseau' };

describe('store : photo d\'un équipement de station', () => {
    it('prise de vue, rotation, suppression, réinitialisation : même circuit que le PMR', async () => {
        const { lieu, module, station } = await seededSignaletique();
        const { handleSignaletiquePhotoCapture } = useAuditStore.getState();
        await handleSignaletiquePhotoCapture('planReseau', 'meett', 0, jpegFile('pmr-photo-exif.jpg'), LABELS);

        const item = planReseauOf(lieu.id, module.id, station.id);
        expect(item.photo_base64).toBe('data:image/jpeg;base64,annotee-r0');
        expect(resizeCalls[0].caption).toBe('Arènes · MEETT / Aéroport · 2026-10-26 11:43');
        const photo = await db.photos.get(item.photo_id!);
        expect(photo).toMatchObject({
            lieuId: lieu.id, moduleId: module.id, itemId: signaletiquePhotoItemId(station.id, 'planReseau', 'meett', 0),
            itemLabel: 'Plan du Réseau', accessLabel: 'MEETT / Aéroport', status: 'current',
            originalSha256: sha(fixture('pmr-photo-exif.jpg')),
        });

        await useAuditStore.getState().handleSignaletiquePhotoRotationChange('planReseau', 'meett', 0, 90);
        expect(planReseauOf(lieu.id, module.id, station.id).photo_base64).toBe('data:image/jpeg;base64,annotee-r90');
        expect((await db.photos.get(photo!.id))!.rotation).toBe(90);

        await useAuditStore.getState().handleSignaletiquePhotoChange('planReseau', 'meett', 0, null);
        expect(planReseauOf(lieu.id, module.id, station.id)).not.toHaveProperty('photo_id');
        expect((await db.photos.get(photo!.id))!.status).toBe('removed');

        await useAuditStore.getState().handleSignaletiquePhotoCapture('planReseau', 'meett', 0, jpegFile('pmr-photo-exif.jpg'), LABELS);
        const second = planReseauOf(lieu.id, module.id, station.id).photo_id!;
        await useAuditStore.getState().handleResetSignaletique();
        expect(planReseauOf(lieu.id, module.id, station.id)).not.toHaveProperty('photo_base64');
        expect((await db.photos.get(second))!.status).toBe('removed');
        expect(await db.photos.count()).toBe(2);
    }, 60000);
});

// -----------------------------------------------------------------
// Migration Dexie
// -----------------------------------------------------------------
describe('Migration V25 → V26 (table photos)', () => {
    it('ajoute la table photos vide sans toucher aux données existantes', async () => {
        const name = `pmr-photos-migration-${Math.random().toString(36).slice(2)}`;
        const v25 = new Dexie(name);
        v25.version(25).stores({
            lieux: 'id, name',
            history: '++id, date, type, categoryKey',
            signageReferences: 'id, auditType',
            events: '++id, date, type, entityType',
        });
        await v25.open();
        const lieu = { id: 'lieu-v25', name: 'Lieu V25', modules: [{ id: 'm', type: 'PMR_FLOOR_ADHESIVE', data: { adhesives: [{ id: 'a', photo_base64: 'data:image/jpeg;base64,ancienne' }] } }] };
        await v25.table('lieux').put(lieu);
        await v25.table('history').add({ date: '2026-10-01T00:00:00.000Z', title: 'Historique', type: 'GLOBAL', score: 50, details: '[]' });
        await v25.table('signageReferences').put({ id: 'ad1', name: 'Réf' });
        await v25.table('events').add({ date: '2026-10-01T00:00:00.000Z', type: 'IMPORT', summary: 'avant' });
        v25.close();

        const upgraded = createAuditDb(name);
        await upgraded.open();
        expect(upgraded.verno).toBeGreaterThanOrEqual(26); // versions ultérieures : ajouts purs (V27 observations)
        expect(await upgraded.table('lieux').get('lieu-v25')).toEqual(lieu);
        expect(await upgraded.table('history').count()).toBe(1);
        expect(await upgraded.table('signageReferences').get('ad1')).toEqual({ id: 'ad1', name: 'Réf' });
        expect(await upgraded.table('events').count()).toBe(1);
        expect(await upgraded.photos.count()).toBe(0);
        await upgraded.photos.add({ ...(await createFieldPhotoRecord(jpegFile('pmr-photo-exif.jpg'), CONTEXT)) });
        expect(await upgraded.photos.where('moduleId').equals(CONTEXT.moduleId).count()).toBe(1);

        upgraded.close();
        await Dexie.delete(name);
    });
});
