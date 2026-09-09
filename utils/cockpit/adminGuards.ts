// utils/cockpit/adminGuards.ts
// =================================================================
// Gardes partagées par TOUTES les actions d'administration (référentiel,
// stations, définitions d'audit configurable, modules/équipements).
// -----------------------------------------------------------------
// Extrait ici parce que les deux règles ci-dessous étaient répétées
// verbatim à plus de 25 endroits (store.ts, useAdminReferences.ts,
// useAdminAuditDefinitions.ts) : la même règle métier doit vivre à un
// seul endroit, jamais recopiée. Aucune dépendance Dexie/React — mêmes
// fonctions pures que le reste des modules *Admin.ts.
// =================================================================

/** Verrou Admin : toute écriture d'administration (référentiel, stations,
 *  définitions, modules) exige isAdminUnlocked. Lève la même erreur,
 *  textuellement identique, partout où elle apparaissait avant extraction. */
export const assertAdminUnlocked = (isAdminUnlocked: boolean): void => {
    if (!isAdminUnlocked) {
        throw new Error('Action Admin refusée : accès non déverrouillé.');
    }
};

/** Un champ texte obligatoire ne doit jamais être vide une fois trimé —
 *  même règle pour le nom d'une station, d'une référence, d'une direction,
 *  d'un DAT/ECA de référence, d'une zone/borne P+R ou d'une définition
 *  d'audit configurable ; seul le libellé affiché change. */
export const assertNonEmpty = (value: string, label: string): void => {
    if (!value.trim()) {
        throw new Error(`${label} est obligatoire.`);
    }
};
