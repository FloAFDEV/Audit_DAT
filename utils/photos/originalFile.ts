// utils/photos/originalFile.ts
// Original d'une photo (table `photos`) en fichier prêt à partager ou
// télécharger : octets, type et nom d'origine conservés — jamais la copie
// annotée. Lecture seule.
import type { FieldPhoto } from '../../types';
import { extensionOf, pathSlug } from './photoExport';

/** Nom d'origine s'il existe, sinon « Station_AAAA-MM-JJ_HHMM.ext ». */
export const originalFileName = (photo: Pick<FieldPhoto, 'originalName' | 'originalType' | 'stationName' | 'takenAt'>): string => {
    const name = photo.originalName?.trim();
    if (name && !/[\\/]/.test(name)) return name;
    const date = new Date(photo.takenAt);
    const stamp = Number.isNaN(date.getTime()) ? 'date-inconnue'
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
    return `${pathSlug(photo.stationName)}_${stamp}.${extensionOf(photo)}`;
};

export const originalFileOf = (photo: FieldPhoto): File => {
    const takenAt = Date.parse(photo.takenAt);
    return new File([photo.original], originalFileName(photo), {
        type: photo.originalType || 'application/octet-stream',
        lastModified: Number.isNaN(takenAt) ? Date.now() : takenAt,
    });
};
