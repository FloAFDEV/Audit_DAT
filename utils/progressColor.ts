// utils/progressColor.ts
// =================================================================
// Interpolation continue amber → teal sur la portion "en cours"
// (0% exclusif à 100%), pour remplacer la bascule brutale amber/teal
// par un dégradé lisible d'un coup d'œil. Mêmes teintes de départ/
// d'arrivée que l'ancien système (amber-500 / teal-500), donc aucune
// rupture de sens : toujours amber en début de progression, toujours
// teal une fois terminé.
// =================================================================
const AMBER = { r: 245, g: 158, b: 11 };  // amber-500
const TEAL = { r: 20, g: 184, b: 166 };   // teal-500

export const getProgressColor = (percentage: number): string => {
    const t = Math.min(100, Math.max(0, percentage)) / 100;
    const r = Math.round(AMBER.r + (TEAL.r - AMBER.r) * t);
    const g = Math.round(AMBER.g + (TEAL.g - AMBER.g) * t);
    const b = Math.round(AMBER.b + (TEAL.b - AMBER.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
};
