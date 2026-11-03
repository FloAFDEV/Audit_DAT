// utils/pwa/unsavedInput.ts
// =================================================================
// Saisie non enregistrée en cours — empêche une mise à jour (rechargement)
// qui la perdrait. Les constats et commentaires des audits sont écrits à
// chaque modification (store → IndexedDB) ; restent « non enregistrés » :
//  - une fenêtre ouverte (role="dialog" : modification d'un ECA,
//    confirmation…) ;
//  - un brouillon local explicitement marqué data-unsaved="true" (ajout
//    d'un plan de quartier non catalogué, d'un DAT, d'un accès…) ;
//  - un champ de texte en cours d'édition (focus).
// Les écritures IndexedDB déjà lancées sont, elles, attendues avant le
// rechargement (flushPendingWrites).
// =================================================================

const EDITABLE = 'input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea, [contenteditable="true"]';

/** Raison lisible si une saisie non enregistrée est en cours, sinon null. */
export const unsavedInputReason = (doc: Document = document): string | null => {
    if (doc.querySelector('[data-unsaved="true"]')) return 'un ajout est en cours de saisie';
    const dialog = Array.from(doc.querySelectorAll('[role="dialog"]')).find(el => !el.closest('[data-pwa-banner]'));
    if (dialog) return 'une fenêtre est ouverte';
    const active = doc.activeElement;
    if (active && active.matches(EDITABLE) && !active.closest('[data-pwa-banner]')) return 'un champ est en cours de modification';
    return null;
};

/** Attend la fin des écritures IndexedDB déjà lancées : une transaction en
 *  lecture sur toutes les tables ne démarre qu'après les transactions en
 *  écriture créées avant elle (ordre garanti par IndexedDB). */
export const flushPendingWrites = async (database: { tables: unknown[]; transaction: (mode: 'r', tables: never, fn: () => void) => Promise<unknown> }): Promise<void> => {
    await database.transaction('r', database.tables as never, () => { /* rien : barrière */ });
};
