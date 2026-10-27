# Flo Creative Frontend — AuditRef

> Déclare la couche frontend créative (skill global `flo-creative-frontend`) pour ce dépôt.
> Chargé à chaque session via `CLAUDE.md`. Supprimer ce fichier = désactiver la couche.

## Statut
Couche créative : **active — page d'accueil publique uniquement**
Stack : Vite + React 19 (SPA, pas de Next.js → `flo-nextjs` ne s'applique pas)

## Périmètre
- Surface concernée : page d'accueil publique = écran non connecté (`components/Login.tsx`)
  et sa section `components/home/` (storytelling « comment se déroule un audit »).
- Surfaces interdites : tout l'InApp (`App.tsx` hors `Login`, `AppRouter` et écrans,
  `components/cockpit/`, formulaires d'audit), `store.ts`, `db.ts`, `data/`, `utils/`, `hooks/`,
  la logique de connexion. Toute modification hors périmètre exige une demande explicite.

## Mode par défaut
ADAPTATION — référence : l'application elle-même (vrais écrans, vraies données de démo).
Jamais de mockup inventé : les écrans viennent de `scripts/capture-home-story.cjs`.

## Direction artistique (prioritaire sur flo-art-direction)
- Intention : « un outil d'audit sérieux qui se révèle simple ».
- Ton : sobre, professionnel, crédible — identité InApp conservée.
- Tokens existants : palette slate + teal-700 (CTA), Inter, `rounded-2xl` pour les surfaces,
  `ring-1 ring-slate-900/10` + `shadow-2xl` pour les écrans présentés, texture à points du hero.
- Clair et sombre (classe `.dark`).
- À éviter : dégradés décoratifs, faux navigateur chromé, chiffres ou fonctionnalités non réels.

## Signature motion (prioritaire sur flo-motion)
- Niveau : narratif sur la section storytelling, discret ailleurs.
- Librairie : `motion` (règle d'or des animations, `index.css`) — pas de GSAP sur la page d'accueil.
- Moment fort autorisé : scène sticky ≥ lg ; séquence verticale sur mobile et en reduced motion.

## Composants à réutiliser en priorité
- `components/Logo.tsx` — logo.
- `components/home/StoryScreen.tsx` — vrai écran + zone de focus.
- `components/home/auditStorySteps.ts` — étapes réelles et zones de focus.
