// data/appInfo.ts
// Identité produit — constantes facilement modifiables, sans dépendance.
// Le nom final n'étant pas arrêté, APP_NAME reste une simple constante
// à ajuster ici, sans chercher son usage ailleurs dans le code.
export const APP_NAME = 'AuditRef';

export const APP_TAGLINE = 'Plateforme de gestion et d\'analyse de la signalétique Information Voyageur (IV).';

/** Généalogie produit — affichée telle quelle dans l'à propos. */
export const APP_PIPELINE = [
    'Audit terrain',
    'Référentiel signalétique',
    'Analyse des anomalies',
    'Résumé d\'intervention',
    'Historique',
];

export const APP_AUTHOR = 'FloAFDEV';

// À incrémenter manuellement à chaque évolution notable (pas de build tooling
// dédié à ce jour) — reste une simple constante, volontairement statique.
export const APP_VERSION = '1.0.0';
export const APP_RELEASE_DATE = '2026-07-21';
