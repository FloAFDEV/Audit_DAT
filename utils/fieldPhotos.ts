// utils/fieldPhotos.ts
// =================================================================
// Photos terrain — même circuit pour tous les audits qui en prennent
// (adhésifs PMR au sol, Équipements Station, plans de quartier T1).
//
// Une prise de vue = un enregistrement de la table `photos` (db.ts, V26) :
// l'original reçu de l'appareil photo, octet pour octet (+ type, taille,
// nom, SHA-256), son rattachement (station, module, accès/direction,
// élément) et la date de prise de vue retenue. La photo AFFICHÉE dans
// l'audit reste `photo_base64` de l'élément : une copie annotée « Station ·
// Accès · AAAA-MM-JJ HH:MM » générée depuis l'original
// (utils/resizeImage.ts) — c'est elle qui voyage dans la sauvegarde JSON ;
// l'original reste sur l'appareil de prise de vue.
//
// Cycle de vie : aucun effacement physique. Remplacer, supprimer ou
// réinitialiser change seulement le statut de l'enregistrement.
// =================================================================
import { v4 as uuidv4 } from 'uuid';
import type { AuditDb } from '../db';
import { FieldPhoto, FieldPhotoStatus, PhotoTakenAtSource } from '../types';
import { resizeImage } from './resizeImage';

/** Côté le plus long de la copie annotée (lisibilité du bandeau, poids
 *  raisonnable dans la sauvegarde JSON). */
export const FIELD_PHOTO_MAX_SIZE = 1600;

// -----------------------------------------------------------------
// Empreinte
// -----------------------------------------------------------------
export const sha256Hex = async (buffer: ArrayBuffer): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
};

// -----------------------------------------------------------------
// Date de prise de vue (EXIF d'un JPEG)
// -----------------------------------------------------------------
const EXIF_DATE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;

const parseExifDate = (text: string): Date | null => {
    const m = text.match(EXIF_DATE);
    if (!m) return null;
    const [year, month, day, hour, minute, second] = m.slice(1).map(Number);
    if (year < 1990 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) return null;
    // Heure locale de l'appareil (l'EXIF ne porte pas de fuseau).
    return new Date(year, month - 1, day, hour, minute, second);
};

/**
 * Date de prise de vue lue dans l'EXIF d'un JPEG : DateTimeOriginal, puis
 * DateTimeDigitized, puis DateTime (IFD0). null si absente ou illisible —
 * jamais d'exception sur un fichier inattendu.
 */
export const readExifDateTime = (buffer: ArrayBuffer): Date | null => {
    try {
        const view = new DataView(buffer);
        if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
        let offset = 2;
        while (offset + 4 <= view.byteLength) {
            if (view.getUint8(offset) !== 0xff) return null;
            const marker = view.getUint8(offset + 1);
            if (marker === 0xda || marker === 0xd9) return null; // données image : plus d'EXIF
            const size = view.getUint16(offset + 2);
            const isExif = marker === 0xe1 && offset + 10 <= view.byteLength
                && view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0x0000; // "Exif\0\0"
            if (isExif) return readTiffDate(view, offset + 10, offset + 2 + size);
            offset += 2 + size;
        }
        return null;
    } catch {
        return null;
    }
};

const readTiffDate = (view: DataView, tiff: number, end: number): Date | null => {
    const order = view.getUint16(tiff);
    if (order !== 0x4949 && order !== 0x4d4d) return null;
    const little = order === 0x4949;
    const u16 = (at: number) => view.getUint16(at, little);
    const u32 = (at: number) => view.getUint32(at, little);
    if (u16(tiff + 2) !== 42) return null;

    const readAscii = (entry: number): string | null => {
        const count = u32(entry + 4);
        const start = count > 4 ? tiff + u32(entry + 8) : entry + 8;
        if (start + count > end) return null;
        let text = '';
        for (let i = 0; i < count; i++) {
            const c = view.getUint8(start + i);
            if (c === 0) break;
            text += String.fromCharCode(c);
        }
        return text;
    };
    const readIfd = (ifd: number): Map<number, number> => {
        const entries = new Map<number, number>();
        if (ifd + 2 > end) return entries;
        const count = u16(ifd);
        for (let i = 0; i < count; i++) {
            const entry = ifd + 2 + i * 12;
            if (entry + 12 > end) break;
            entries.set(u16(entry), entry);
        }
        return entries;
    };

    const ifd0 = readIfd(tiff + u32(tiff + 4));
    const candidates: number[] = [];
    const exifPointer = ifd0.get(0x8769);
    if (exifPointer !== undefined) {
        const exifIfd = readIfd(tiff + u32(exifPointer + 8));
        for (const tag of [0x9003, 0x9004]) {
            const entry = exifIfd.get(tag);
            if (entry !== undefined) candidates.push(entry);
        }
    }
    const dateTime = ifd0.get(0x0132);
    if (dateTime !== undefined) candidates.push(dateTime);

    for (const entry of candidates) {
        const text = readAscii(entry);
        const date = text ? parseExifDate(text) : null;
        if (date) return date;
    }
    return null;
};

/** Date retenue : EXIF, sinon date du fichier, sinon heure de validation. */
export const resolveTakenAt = (
    exifDate: Date | null, lastModified: number | undefined, now: Date,
): { takenAt: Date; source: PhotoTakenAtSource } => {
    if (exifDate) return { takenAt: exifDate, source: 'exif' };
    if (typeof lastModified === 'number' && Number.isFinite(lastModified) && lastModified > 0) {
        return { takenAt: new Date(lastModified), source: 'file' };
    }
    return { takenAt: now, source: 'validation' };
};

// -----------------------------------------------------------------
// Légende
// -----------------------------------------------------------------
/** Accès d'un module PMR, tiré de son nom (« Adhésifs PMR au Sol (Accès
 *  Bus) » → « Accès Bus ») ; vide pour un module sans accès nommé. */
export const pmrAccessLabel = (moduleName: string): string => moduleName.match(/\((.*)\)\s*$/)?.[1].trim() ?? '';

const pad = (n: number) => String(n).padStart(2, '0');

/** AAAA-MM-JJ HH:MM, heure locale. */
export const formatTakenAt = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** « Station · Accès · AAAA-MM-JJ HH:MM » ; sans accès : « Station · date ». */
export const buildPhotoCaption = (stationName: string, accessLabel: string, takenAt: Date): string =>
    [stationName, accessLabel, formatTakenAt(takenAt)].filter(Boolean).join(' · ');

/** Bandeau sombre en bas de l'image, légende en blanc ; la police est
 *  réduite jusqu'à ce que la légende tienne sur la largeur. */
export const drawCaptionBanner = (ctx: CanvasRenderingContext2D, width: number, height: number, caption: string): void => {
    let fontSize = Math.max(14, Math.round(width * 0.035));
    const font = (size: number) => `bold ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.font = font(fontSize);
    while (fontSize > 10 && ctx.measureText(caption).width > width - fontSize * 1.2) {
        fontSize -= 1;
        ctx.font = font(fontSize);
    }
    const bannerHeight = Math.round(fontSize * 1.9);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(caption, Math.round(fontSize * 0.6), height - bannerHeight / 2);
};

// -----------------------------------------------------------------
// Copie annotée
// -----------------------------------------------------------------
export const captionOf = (photo: Pick<FieldPhoto, 'stationName' | 'accessLabel' | 'takenAt'>): string =>
    buildPhotoCaption(photo.stationName, photo.accessLabel, new Date(photo.takenAt));

/** Copie annotée (data URL JPEG) générée depuis l'original, rotation
 *  appliquée aux pixels avant le bandeau. L'original n'est jamais modifié. */
export const renderAnnotatedPhoto = (photo: Pick<FieldPhoto, 'original' | 'originalType' | 'stationName' | 'accessLabel' | 'takenAt' | 'rotation'>): Promise<string> => {
    const caption = captionOf(photo);
    return resizeImage(new Blob([photo.original], { type: photo.originalType || 'image/jpeg' }), FIELD_PHOTO_MAX_SIZE, {
        rotation: photo.rotation,
        annotate: (ctx, width, height) => drawCaptionBanner(ctx, width, height, caption),
    });
};

// -----------------------------------------------------------------
// Enregistrement et cycle de vie
// -----------------------------------------------------------------
/** Rattachement d'une prise de vue. `itemId` est unique dans le module
 *  (adhésif PMR : son id ; Équipements Station : station:catégorie:sens:rang). */
export interface FieldPhotoContext {
    lieuId: string;
    stationName: string;
    stationCode: string;
    moduleId: string;
    moduleName: string;
    accessLabel: string;
    itemId: string;
    itemLabel: string;
}

/** Enregistrement d'une prise de vue : original intact, empreinte, date. */
export const createFieldPhotoRecord = async (file: Blob & { name?: string; lastModified?: number }, context: FieldPhotoContext, now = new Date()): Promise<FieldPhoto> => {
    const original = await file.arrayBuffer();
    const { takenAt, source } = resolveTakenAt(readExifDateTime(original), file.lastModified, now);
    return {
        id: uuidv4(),
        ...context,
        original,
        originalName: file.name ?? '',
        originalType: file.type || 'image/jpeg',
        originalSize: original.byteLength,
        originalSha256: await sha256Hex(original),
        takenAt: takenAt.toISOString(),
        takenAtSource: source,
        rotation: 0,
        createdAt: now.toISOString(),
        status: 'current',
    };
};

const setStatus = (database: AuditDb, photos: FieldPhoto[], status: FieldPhotoStatus, at: string) =>
    Promise.all(photos.map(p => database.photos.update(p.id, { status, statusChangedAt: at })));

/** Élément visé : un id exact, tous ceux d'un préfixe (une station
 *  d'Équipements Station), ou tout le module si absent. */
export type FieldPhotoItemFilter = string | { prefix: string };

const matchesItem = (itemId: string, filter?: FieldPhotoItemFilter) =>
    filter === undefined || (typeof filter === 'string' ? itemId === filter : itemId.startsWith(filter.prefix));

const currentPhotosOf = (database: AuditDb, moduleId: string, filter?: FieldPhotoItemFilter) =>
    database.photos.where('moduleId').equals(moduleId)
        .filter(p => p.status === 'current' && matchesItem(p.itemId, filter))
        .toArray();

/** Ajoute la nouvelle photo d'un élément ; la précédente passe 'replaced'. */
export const saveFieldPhoto = (database: AuditDb, photo: FieldPhoto): Promise<void> =>
    database.transaction('rw', database.photos, async () => {
        await setStatus(database, await currentPhotosOf(database, photo.moduleId, photo.itemId), 'replaced', photo.createdAt);
        await database.photos.add(photo);
    });

/** Suppression (un élément) ou réinitialisation (module ou station) : les
 *  photos en cours passent 'removed', l'enregistrement est conservé. */
export const releaseFieldPhotos = (database: AuditDb, moduleId: string, filter?: FieldPhotoItemFilter, at = new Date().toISOString()): Promise<void> =>
    database.transaction('rw', database.photos, async () => {
        await setStatus(database, await currentPhotosOf(database, moduleId, filter), 'removed', at);
    });

/** Demande au navigateur de ne pas évincer la base en cas de manque de
 *  place (originaux). Sans effet visible ; échec silencieux. */
export const requestPersistentStorage = async (): Promise<void> => {
    try {
        if (typeof navigator !== 'undefined' && navigator.storage?.persist && !(await navigator.storage.persisted())) {
            await navigator.storage.persist();
        }
    } catch {
        // Stockage persistant indisponible : la photo reste enregistrée.
    }
};
