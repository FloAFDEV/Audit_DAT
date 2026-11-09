// utils/photos/photoExport.ts
// =================================================================
// EXPORT ZIP DES PHOTOS ORIGINALES (table Dexie `photos`, lecture seule).
//
// - Originaux exportés octet pour octet (aucune recompression, aucune
//   conversion HEIC → JPEG, métadonnées EXIF intactes) en mode « stocké ».
// - Empreinte SHA-256 recalculée à l'export et comparée à celle enregistrée
//   à la prise de vue ; tout écart est signalé, jamais masqué.
// - Mémoire : métadonnées lues photo par photo (curseur), puis un original
//   à la fois ; l'export est découpé en parties (~100 Mo) pour les iPhone.
// - Rattachement : ligne / station lues dans les données actuelles via le
//   module de la photo. Module ou lieu introuvable → « orpheline », jamais
//   attribuée à une station. Par défaut : photos actives rattachées ; en
//   option, photos historiques (remplacées, supprimées) et orphelines.
// - Aucune écriture, aucune suppression ; aucune requête réseau.
// =================================================================
import { Zip, ZipPassThrough, strToU8 } from 'fflate';
import { AuditModuleType, FieldPhoto, FieldPhotoStatus, Lieu } from '../../types';
import { escapeCsv } from '../csvExporter';
import { sha256Hex } from '../fieldPhotos';

export type PhotoExportScope =
    | { kind: 'all' }
    | { kind: 'station'; lieuId: string }
    | { kind: 'line'; line: string };

/** Métadonnées d'une photo (sans l'original). */
export interface PhotoMeta extends Omit<FieldPhoto, 'original'> {
    /** Ligne du module de rattachement (données actuelles). */
    line: string | null;
    /** Lieu ET module de la photo existent encore. */
    attached: boolean;
    /** Catégorie d'équipement, seulement si elle est connue. */
    category: string;
}

export interface PlannedPhoto extends PhotoMeta {
    seq: number;
    zipPath: string;
}

export interface PhotoExportPlan {
    photos: PlannedPhoto[];
    totalBytes: number;
    /** Photos réparties en parties (ordre conservé). */
    parts: PlannedPhoto[][];
}

export const ZIP_ROOT = 'photos-audit-dat';
/** Taille cible d'une partie : un iPhone garde la partie en mémoire le
 *  temps du partage ou du téléchargement. */
export const DEFAULT_PART_BYTES = 100 * 1024 * 1024;

const CATEGORY_LABELS: Record<string, string> = {
    totem: 'Totem', bandeauStation: 'Bandeau station', biv: 'BIV', planReseau: 'Plan réseau',
    planQuartier: 'Plan de quartier', hap: 'HAP',
};
const STATUS_LABELS: Record<FieldPhotoStatus, string> = { current: 'actif', replaced: 'remplacé', removed: 'supprimé' };
const MIME_EXT: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif',
    'image/webp': 'webp', 'image/gif': 'gif', 'image/tiff': 'tif', 'image/avif': 'avif',
};

/** Segment de chemin ASCII sûr (accents retirés) — les libellés exacts,
 *  accents compris, restent dans l'inventaire et le manifeste. */
export const pathSlug = (text: string): string =>
    text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'sans-nom';

/** Extension réelle : celle du nom d'origine, sinon déduite du type MIME. */
export const extensionOf = (photo: Pick<FieldPhoto, 'originalName' | 'originalType'>): string => {
    const fromName = photo.originalName?.match(/\.([A-Za-z0-9]{1,5})$/)?.[1]?.toLowerCase();
    if (fromName) return fromName === 'jpeg' ? 'jpg' : fromName;
    return MIME_EXT[(photo.originalType || '').toLowerCase()] ?? 'bin';
};

const categoryOf = (photo: Pick<FieldPhoto, 'itemId'>, moduleType: AuditModuleType | undefined): string => {
    if (moduleType === AuditModuleType.PMR_FLOOR_ADHESIVE) return 'Adhésif PMR au sol';
    if (moduleType === AuditModuleType.SIGNALETIQUE) {
        const key = photo.itemId.split(':')[1];
        return (key && CATEGORY_LABELS[key]) || '';
    }
    return '';
};

/** Lecture des métadonnées de TOUTES les photos, une par une (curseur) :
 *  les originaux ne sont jamais conservés en mémoire ici. */
export const scanPhotoMetadata = async (
    database: { photos: { each: (fn: (p: FieldPhoto) => void) => Promise<unknown> } },
    lieux: Lieu[],
): Promise<PhotoMeta[]> => {
    const modules = new Map<string, { lieuId: string; line: string | null; type: AuditModuleType }>();
    for (const lieu of lieux) for (const m of lieu.modules) modules.set(m.id, { lieuId: lieu.id, line: m.line ?? null, type: m.type });
    const out: PhotoMeta[] = [];
    await database.photos.each(photo => {
        const { original: _original, ...meta } = photo;
        const module = modules.get(photo.moduleId);
        const attached = !!module && module.lieuId === photo.lieuId;
        out.push({ ...meta, line: attached ? module!.line : null, attached, category: categoryOf(photo, attached ? module!.type : undefined) });
    });
    return out;
};

const inScope = (p: PhotoMeta, scope: PhotoExportScope): boolean => {
    if (scope.kind === 'all') return true;
    if (!p.attached) return false; // jamais attribuée arbitrairement
    return scope.kind === 'station' ? p.lieuId === scope.lieuId : p.line === scope.line;
};

/** Photos retenues, ordonnées, numérotées, avec leur chemin dans le ZIP. */
export const planPhotoExport = (
    metas: PhotoMeta[], scope: PhotoExportScope,
    options: { includeHistory?: boolean; maxPartBytes?: number } = {},
): PhotoExportPlan => {
    const seen = new Set<string>();
    const selected = metas.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        if (!options.includeHistory && (p.status !== 'current' || !p.attached)) return false;
        return inScope(p, scope);
    }).sort((a, b) =>
        Number(b.attached) - Number(a.attached)
        || (a.line ?? '').localeCompare(b.line ?? '', 'fr')
        || a.stationName.localeCompare(b.stationName, 'fr')
        || a.moduleName.localeCompare(b.moduleName, 'fr')
        || a.itemLabel.localeCompare(b.itemLabel, 'fr', { numeric: true })
        || a.createdAt.localeCompare(b.createdAt));
    const width = Math.max(3, String(selected.length).length);
    const photos: PlannedPhoto[] = selected.map((p, i) => {
        const seq = i + 1;
        const file = `photo_${String(seq).padStart(width, '0')}_${pathSlug(p.itemLabel || p.itemId)}.${extensionOf(p)}`;
        const folder = p.attached
            ? `originaux/ligne-${pathSlug(p.line ?? 'inconnue')}/${pathSlug(p.stationName)}${p.status === 'current' ? '' : '/historique'}`
            : 'originaux/orphelines';
        return { ...p, seq, zipPath: `${ZIP_ROOT}/${folder}/${file}` };
    });
    const maxPart = options.maxPartBytes ?? DEFAULT_PART_BYTES;
    const parts: PlannedPhoto[][] = [];
    let current: PlannedPhoto[] = [];
    let size = 0;
    for (const p of photos) {
        if (current.length && size + p.originalSize > maxPart) { parts.push(current); current = []; size = 0; }
        current.push(p);
        size += p.originalSize;
    }
    if (current.length) parts.push(current);
    return { photos, totalBytes: photos.reduce((s, p) => s + p.originalSize, 0), parts };
};

// -----------------------------------------------------------------
// Inventaire et manifeste
// -----------------------------------------------------------------
export interface ExportedPhotoRow {
    photo: PlannedPhoto;
    exportedSha256: string;
    integrity: 'conforme' | 'écart';
}

const CSV_COLUMNS = [
    'Identifiant', 'Ligne', 'Station', 'Code station', 'Accès / emplacement', 'Catégorie', 'Élément',
    'Date de prise de vue', 'Source de la date', 'Date d’enregistrement', 'Statut', 'Rattachement',
    'Nom du fichier original', 'Chemin dans le ZIP', 'Type MIME', 'Taille (octets)',
    'SHA-256 enregistrée', 'SHA-256 exportée', 'Intégrité', 'Module (audit)', 'Lieu', 'Partie',
];
const TAKEN_AT_SOURCE: Record<string, string> = { exif: 'EXIF', file: 'date du fichier', validation: 'heure d’enregistrement' };

export const buildInventoryCsv = (rows: ExportedPhotoRow[], partLabel: string): string => [
    '﻿' + CSV_COLUMNS.join(','),
    ...rows.map(({ photo: p, exportedSha256, integrity }) => [
        p.id, p.line ?? '', p.stationName, p.stationCode, p.accessLabel, p.category, p.itemLabel,
        p.takenAt, TAKEN_AT_SOURCE[p.takenAtSource] ?? p.takenAtSource, p.createdAt, STATUS_LABELS[p.status] ?? p.status,
        p.attached ? 'station' : 'orpheline (lieu ou module introuvable)',
        p.originalName, p.zipPath.slice(ZIP_ROOT.length + 1), p.originalType, p.originalSize,
        p.originalSha256, exportedSha256, integrity, p.moduleId, p.lieuId, partLabel,
    ].map(v => escapeCsv(v).replace(/\r?\n/g, ' ')).join(',')),
].join('\r\n');

const manifestPhoto = ({ photo: p, exportedSha256, integrity }: ExportedPhotoRow) => ({
    id: p.id, line: p.line, stationName: p.stationName, stationCode: p.stationCode, accessLabel: p.accessLabel,
    category: p.category || null, itemId: p.itemId, itemLabel: p.itemLabel,
    takenAt: p.takenAt, takenAtSource: p.takenAtSource, createdAt: p.createdAt,
    status: p.status, statusChangedAt: p.statusChangedAt ?? null, attached: p.attached,
    originalName: p.originalName, path: p.zipPath.slice(ZIP_ROOT.length + 1), mimeType: p.originalType,
    size: p.originalSize, sha256: p.originalSha256, exportedSha256, integrity,
    moduleId: p.moduleId, moduleName: p.moduleName, lieuId: p.lieuId,
});

// -----------------------------------------------------------------
// Génération d'une partie
// -----------------------------------------------------------------
export interface PartProgress { done: number; total: number; bytes: number }

export interface BuiltPart {
    blob: Blob;
    fileName: string;
    rows: ExportedPhotoRow[];
    /** Photos dont l'empreinte exportée diffère de l'empreinte enregistrée. */
    integrityIssues: number;
    /** Photos du plan absentes de la base au moment de l'export. */
    missing: string[];
}

export class PhotoExportError extends Error {
    constructor(message: string, readonly cause?: unknown) { super(message); this.name = 'PhotoExportError'; }
}

const abortError = () => new DOMException('Export annulé', 'AbortError');

export const exportFileName = (scopeLabel: string, date: Date, partIndex: number, partCount: number): string => {
    const d = date.toISOString().slice(0, 10);
    return `photos-audit-dat_${pathSlug(scopeLabel)}_${d}${partCount > 1 ? `_partie-${partIndex + 1}-sur-${partCount}` : ''}.zip`;
};

/** Construit UNE partie : originaux lus un par un, empreintes vérifiées,
 *  inventaire.csv + manifest.json décrivant la partie. */
export const buildPhotoZipPart = async (
    database: { photos: { get: (id: string) => Promise<FieldPhoto | undefined> } },
    plan: PhotoExportPlan,
    partIndex: number,
    context: { scope: PhotoExportScope; scopeLabel: string; includeHistory: boolean; now?: Date },
    options: { signal?: AbortSignal; onProgress?: (p: PartProgress) => void } = {},
): Promise<BuiltPart> => {
    const part = plan.parts[partIndex] ?? [];
    const partCount = Math.max(1, plan.parts.length);
    const now = context.now ?? new Date();
    const chunks: Uint8Array[] = [];
    let zipError: unknown = null;
    const zip = new Zip((err, chunk) => { if (err) zipError = err; else if (chunk) chunks.push(chunk); });
    const addFile = (path: string, data: Uint8Array, mtime?: Date) => {
        const entry = new ZipPassThrough(path);
        if (mtime && !Number.isNaN(mtime.getTime()) && mtime.getFullYear() >= 1980) entry.mtime = mtime;
        zip.add(entry);
        entry.push(data, true);
    };
    const rows: ExportedPhotoRow[] = [];
    const missing: string[] = [];
    let bytes = 0;
    try {
        for (let i = 0; i < part.length; i++) {
            if (options.signal?.aborted) throw abortError();
            const planned = part[i];
            let record: FieldPhoto | undefined;
            try {
                record = await database.photos.get(planned.id);
            } catch (error) {
                throw new PhotoExportError('Lecture d’une photo impossible (stockage indisponible ou saturé). Rien n’a été modifié.', error);
            }
            if (!record) { missing.push(planned.id); continue; }
            const data = new Uint8Array(record.original);
            const exportedSha256 = await sha256Hex(record.original);
            addFile(planned.zipPath, data, new Date(planned.takenAt));
            rows.push({ photo: planned, exportedSha256, integrity: exportedSha256 === planned.originalSha256 ? 'conforme' : 'écart' });
            bytes += data.byteLength;
            record = undefined; // un seul original en mémoire à la fois
            options.onProgress?.({ done: i + 1, total: part.length, bytes });
            await new Promise(resolve => setTimeout(resolve, 0)); // laisse l'interface respirer
            if (zipError) throw zipError;
        }
        if (options.signal?.aborted) throw abortError();
        const partLabel = `${partIndex + 1}/${partCount}`;
        addFile(`${ZIP_ROOT}/inventaire.csv`, strToU8(buildInventoryCsv(rows, partLabel)), now);
        addFile(`${ZIP_ROOT}/manifest.json`, strToU8(JSON.stringify({
            format: 'audit-dat-photos-originales', version: 1, generatedAt: now.toISOString(),
            scope: context.scope, scopeLabel: context.scopeLabel, includeHistory: context.includeHistory,
            part: { index: partIndex + 1, count: partCount },
            totals: { photosInExport: plan.photos.length, bytesInExport: plan.totalBytes, photosInPart: rows.length, bytesInPart: bytes },
            missing, photos: rows.map(manifestPhoto),
        }, null, 2)), now);
        zip.end();
        if (zipError) throw zipError;
    } catch (error) {
        try { zip.terminate(); } catch { /* déjà terminé */ }
        chunks.length = 0;
        if ((error as { name?: string })?.name === 'AbortError' || error instanceof PhotoExportError) throw error;
        throw new PhotoExportError('Création de l’archive impossible (mémoire ou stockage insuffisant ?). Rien n’a été modifié.', error);
    }
    return {
        blob: new Blob(chunks as BlobPart[], { type: 'application/zip' }),
        fileName: exportFileName(context.scopeLabel, now, partIndex, partCount),
        rows,
        integrityIssues: rows.filter(r => r.integrity === 'écart').length,
        missing,
    };
};

export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',')} Go`;
};
