// utils/naturalSort.ts
// Tri « naturel » des libellés affichés : les nombres contenus dans le texte
// sont comparés numériquement (« Valideur 9 » avant « Valideur 10 »), le
// reste par ordre alphabétique français. Un libellé sans nombre ou un code
// particulier (« R1 », « BE01 ») garde sa place alphabétique habituelle.

const collator = new Intl.Collator('fr', { numeric: true });

export const compareNatural = (a: string, b: string): number => collator.compare(a, b);
