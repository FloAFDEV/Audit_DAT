// data/lineBExtension.ts
// =================================================================
// Extension de la ligne B — deux stations RATTACHÉES à la ligne B (jamais
// une ligne à part), mise en service prévue début 2027.
// Présentation uniquement : le registre (isFuture) et les règles de
// périmètre restent inchangés — leurs emplacements restent dans les totaux
// actuels. L'interface les identifie pour ne jamais les présenter comme
// des équipements dont la pose est confirmée.
// =================================================================
import { REGISTRY_LINE_B } from './stationRegistry';

export const LINE_B_EXTENSION = {
    label: 'Extension B',
    commissioning: 'mise en service prévue début 2027',
    stationIds: ['sta-b-21', 'sta-b-22'] as readonly string[],
};

/** Noms de lieu des stations de l'extension (Parc du Canal, Labège Madron). */
export const LINE_B_EXTENSION_LIEUX: ReadonlySet<string> = new Set(
    REGISTRY_LINE_B.filter(s => LINE_B_EXTENSION.stationIds.includes(s.id)).map(s => s.lieuName ?? s.name),
);

/** Implantation / exemplaire situé sur l'extension B : ligne B ET lieu de
 *  l'extension (Labège Madron est aussi un lieu de la ligne C). */
export const isLineBExtension = (line: string, lieuName: string): boolean =>
    line === 'B' && LINE_B_EXTENSION_LIEUX.has(lieuName);

/** Nombre d'éléments situés sur l'extension B. */
export const countLineBExtension = (items: readonly { line: string; lieuName: string }[]): number =>
    items.filter(i => isLineBExtension(i.line, i.lieuName)).length;
