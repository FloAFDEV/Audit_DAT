# AuditRef — À propos

## Vision produit

AuditRef n'est pas une GMAO ni un simple outil de maintenance. C'est une
plateforme dédiée à l'**Information Voyageur (IV) et à la signalétique
réseau**, organisée autour d'une généalogie unique :

```
Audit terrain → Référentiel signalétique → Analyse conformité
             → Préparation d'interventions → Production terrain
```

Chaque étape s'appuie sur la précédente sans jamais la dupliquer :
l'audit terrain alimente un référentiel patrimoine normalisé, qui permet
d'analyser la conformité du réseau, de préparer des interventions
priorisées, et — demain — de produire des résumés de pose exploitables
par les équipes terrain.

Le point de départ produit reste explicite : on ne gère pas des tickets
de maintenance, on gère la **connaissance et le cycle de vie** du
patrimoine signalétique du réseau.

## Architecture

- **100 % local, sans backend.** Toutes les données vivent dans
  IndexedDB (Dexie), sur l'appareil de l'utilisateur. Pas de
  synchronisation serveur à ce jour — l'export/import JSON est le seul
  vecteur de portabilité et de sauvegarde.
- **L'arbre d'audit reste la source de vérité de l'état terrain.**
  `Lieu → Module → Équipement → adhesives{}` n'est jamais restructuré ;
  les évolutions du référentiel s'ajoutent à côté (migration Dexie
  additive, jamais destructive).
- **`signageReferences` : le référentiel patrimoine.** Une table dédiée
  qui décrit *ce qu'est* chaque élément signalétique (support, matière,
  dimensions, scope d'implantation, documentation externe) —
  indépendamment de son état terrain constaté.
- **Le cockpit métier (ex-page Stats).** Une coquille à *registre de
  sections*, pilotée par les données : Synthèse (dashboard rapide),
  Patrimoine (référentiel + implantations + fiche de vie), Interventions
  (ordres de travail patrimoine), Arbitrages (décisions humaines),
  Historique. Ajouter une capacité (campagnes, commandes, stocks, pose)
  = ajouter une entrée au registre, jamais restructurer la coquille.
- **Un moteur d'index unique (`buildPatrimoineIndex`).** Un seul
  parcours de l'arbre d'audit produit toutes les données agrégées du
  cockpit — aucune vue ne recalcule sa propre vérité.

## Décisions fondatrices

1. **Une donnée n'est calculée qu'une seule fois.** Si le patrimoine sait
   qu'une référence est posée 427 fois, toutes les vues (Synthèse,
   Patrimoine, Interventions, futures commandes) lisent exactement ce
   chiffre — jamais un recalcul parallèle.
2. **Une seule fiche.** Toute référence, ouverte depuis n'importe quelle
   vue, affiche la même fiche de vie (`ReferenceSheet`) — jamais une
   mini-fiche locale divergente.
3. **Des sections, pas des pages.** Une nouvelle capacité s'ajoute comme
   section de fiche ou mode de regroupement, jamais comme écran isolé.
4. **Sélection → action.** Toute fonctionnalité future (campagne,
   intervention, commande, export) se branche sur une `Selection`
   produite par les vues existantes — l'architecture prépare la prise
   électrique avant l'appareil.
5. **Le patrimoine ne connaît pas les fournisseurs.** Le cockpit
   travaille avec la référence métier ; les prestataires, marchés et BPU
   restent des références documentaires externes (texte uniquement,
   jamais de fichier stocké).
6. **Observation ≠ Décision.** Les constats terrain (Interventions,
   « il y a un problème physique ») et les arbitrages (« on décide quoi
   faire de cet élément ») sont deux sujets distincts, jamais confondus
   dans un même modèle.
7. **Pas de score opaque.** La priorisation expose des facteurs
   transparents et explicables (gravité, ampleur...) ; un score agrégé
   n'est calculé et affiché que si des pondérations métier ont été
   validées par un exploitant.
8. **R1 — Identifiants immuables.** Un id de référence ne se renomme, ne
   se fusionne, ne se supprime jamais — y compris lors d'une décision
   d'arbitrage « à supprimer », qui n'enregistre qu'une décision, jamais
   une suppression réelle.
9. **Migrations additives uniquement.** Aucune migration Dexie ne
   détruit ou ne régénère silencieusement une table existante.

## Auteur / concepteur

Conception et développement : **FloAFDEV**.
