// utils/cockpit/stationAdmin.ts
// =================================================================
// ADMIN — création, renommage, archivage/restauration d'une station
// (Lieu) — Lot 2b.
// -----------------------------------------------------------------
// Fonctions pures : ne touchent pas Dexie, même patron que
// utils/cockpit/signageReferenceEditor.ts (testables sans IndexedDB ;
// l'écriture est la responsabilité des actions du store).
//
// R1 : l'id d'une station ne change jamais après création (uuidv4,
// jamais dérivé du nom) — un id est purement technique, jamais le
// référentiel métier de l'utilisateur. Renommer une station reste la
// MÊME station (même id) : ce n'est pas un archivage.
//
// AUCUNE CASCADE : withStationArchived/withStationRestored ne touchent
// STRICTEMENT que archivedAt — jamais `modules`, donc jamais les
// équipements ni les données d'audit déjà saisies pour cette station.
//
// Portée volontairement minimale pour la création : une nouvelle station
// démarre avec modules: [] (aucune génération automatique de DAT/ECA —
// cette génération, dans data/builder.ts, est fortement spécifique à
// chaque station réelle du réseau ; la répliquer ici serait une
// complexité disproportionnée pour ce lot, contraire à R4 : « CRUD
// simple et rapide, sans usine à gaz »). Les modules/équipements
// s'ajoutent ensuite via les mécanismes déjà existants (Ajouter un DAT,
// Ajouter un ECA...) une fois la station sélectionnée sur le terrain.
// =================================================================
import { v4 as uuidv4 } from 'uuid';
import { Lieu } from '../../types';

const assertValidName = (name: string) => {
    if (!name.trim()) throw new Error('Le nom de la station est obligatoire.');
};

/** Nouvelle station — id purement technique, jamais saisi (R1). */
export const createStation = (name: string): Lieu => {
    assertValidName(name);
    return { id: uuidv4(), name: name.trim(), modules: [] };
};

/** Renomme une station — id et modules strictement inchangés : une
 *  station qui change de nom reste la même station. */
export const withStationRenamed = (lieu: Lieu, newName: string): Lieu => {
    assertValidName(newName);
    return { ...lieu, name: newName.trim() };
};

/** Archive une station — AUCUNE cascade : `modules` conservé à
 *  l'identique (même contenu, aucun retraitement). */
export const withStationArchived = (lieu: Lieu, now: string = new Date().toISOString()): Lieu => ({
    ...lieu,
    archivedAt: now,
});

/** Restaure une station archivée — id/modules inchangés, aucun nouvel id. */
export const withStationRestored = (lieu: Lieu): Lieu => {
    const { archivedAt, ...rest } = lieu;
    return rest;
};
