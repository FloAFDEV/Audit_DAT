// data/referentiel.ts
// Identité du réseau et du référentiel embarqués dans cette instance.
// Chaque observation terrain enregistre la version du référentiel en vigueur
// au moment du contrôle ; elle voyage dans l'échange multi-agents (JSON) —
// cf. docs/MULTI_AGENT.md. À incrémenter à chaque évolution du référentiel
// (ajout/retrait de références, changement de règle d'implantation), jamais
// pour une simple évolution de l'interface.

export const NETWORK = { id: 'tisseo', name: 'Tisséo' } as const;

export const REFERENTIEL = { id: 'tisseo-iv', version: '2026.10' } as const;
