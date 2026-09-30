# AuditRef

**AuditRef** est une application web **offline-first** dédiée à l'audit, au contrôle et au suivi du patrimoine de signalétique et d'équipements sur le réseau de transport.

L'application permet de réaliser des relevés directement sur le terrain, sans dépendre d'une connexion réseau, puis de consulter, analyser, exporter et maintenir les données collectées.

> **AuditRef = auditer sur le terrain → conserver localement → analyser → exploiter les données**

---

## Fonctionnalités

### 📝 Audits terrain

AuditRef permet de réaliser des audits directement depuis un smartphone, une tablette ou un ordinateur.

Les données saisies sont conservées localement afin de permettre une utilisation fiable sur le terrain, y compris lorsque le réseau est indisponible.

Les audits prennent notamment en charge :

* DAT
* ECA
* P+R
* PMR au sol
* pictogrammes cognitifs
* signalétique
* plans de quartier

Les statuts et observations peuvent être enregistrés au niveau des équipements et de leurs références.

---

## 📚 Référentiel

Le référentiel centralise les références et caractéristiques du patrimoine :

* référence ;
* famille ;
* support ;
* dimensions ;
* désignation ;
* règles d'utilisation ;
* quantités implantées ;
* stations concernées ;
* lignes concernées.

Le référentiel constitue la source de vérité utilisée par les différents modules de l'application.

### Implantations

La vue **Implantations** permet de retrouver les occurrences physiques des références présentes sur le réseau.

Une référence peut être suivie jusqu'à son implantation :

**Ligne → Station → Accès / liaison → Équipement → Référence → Emplacement**

Cette granularité permet notamment d'identifier précisément les éléments à contrôler ou à remplacer.

---

## 🔎 Recherche et analyse du patrimoine

AuditRef permet de sélectionner une ou plusieurs références afin de consulter leurs implantations.

Cette approche permet par exemple de rechercher :

* toutes les occurrences d'une référence ;
* plusieurs références d'une même famille ;
* les implantations d'une référence sur une ligne ;
* les occurrences présentes dans certaines stations ;
* les équipements nécessitant une intervention terrain.

Les regroupements sont réalisés à partir des données réelles du réseau et ne reposent pas sur une duplication des données métier.

---

## 🧮 Nomenclature et quantités

Les quantités sont calculées à partir des occurrences réellement présentes dans le réseau.

Une référence catalogue reste unique même lorsqu'elle possède plusieurs occurrences physiques dans un même équipement.

### Exemple : adhésif cible ECA

La référence :

`eca-1`

correspond à :

**Repère 1 — Adhésif valideur-billetterie-métro-cible — 59 × 59 mm**

Pour les ECA :

* entrée standard → 1 occurrence ;
* entrée PMR → 2 occurrences ;

  * zone de validation haute (ZH) ;
  * zone de validation basse (ZB) ;
* sortie ECA → aucune occurrence.

Les zones ZH et ZB correspondent donc à deux implantations physiques distinctes d'une même référence catalogue.

La nomenclature regroupe néanmoins ces occurrences sous la référence unique `eca-1`.

---

## 📤 Import / Export

AuditRef dispose de mécanismes d'import et d'export permettant notamment :

* la sauvegarde des données ;
* la restauration ;
* l'échange de référentiels ;
* l'exploitation des données hors de l'application ;
* l'export de données pour des opérations terrain ou de production.

Les exports peuvent notamment être structurés par ligne et par implantation afin d'être directement exploitables par des équipes opérationnelles ou des prestataires.

---

## 💾 Architecture offline-first

L'application est conçue pour fonctionner **sans connexion réseau pendant les opérations terrain**.

Les données sont stockées localement dans le navigateur à l'aide d'**IndexedDB**, avec **Dexie** comme couche d'accès.

Principes :

* aucune connexion permanente nécessaire pour réaliser un audit ;
* persistance locale des données ;
* fonctionnement hors ligne ;
* export des données ;
* import/restauration ;
* séparation entre données de terrain et référentiel.

L'absence de réseau ne doit donc pas empêcher la réalisation d'un relevé.

---

## 🏗️ Architecture

AuditRef est une application web construite avec :

* **React**
* **TypeScript**
* **Vite**
* **IndexedDB**
* **Dexie**
* **Vitest**

### Principales zones du projet

```text
.
├── components/              # Composants d'interface
├── data/                    # Données et construction du réseau
├── docs/                    # Documentation
├── hooks/                   # Hooks métier et UI
├── public/                  # Ressources statiques
├── tests/                   # Tests automatisés
├── utils/                   # Logique métier et utilitaires
├── App.tsx                  # Application principale
├── db.ts                    # Accès à la base locale
├── store.ts                 # État applicatif
├── types.ts                 # Types TypeScript
├── index.tsx                # Point d'entrée
├── index.css                # Styles globaux
├── vite.config.ts           # Configuration Vite
└── vitest.config.ts         # Configuration Vitest
```

---

## 🧱 Principes de conception

### Une source de vérité

Les calculs de quantités, de références et d'implantations doivent autant que possible s'appuyer sur les mêmes données métier.

L'interface ne doit pas maintenir de copies statiques des informations du patrimoine.

### Occurrence physique ≠ référence catalogue

Une référence catalogue peut correspondre à plusieurs occurrences physiques.

Exemple :

```text
Référence catalogue
└── eca-1
    ├── occurrence @ZH
    └── occurrence @ZB
```

Cela permet de conserver :

* une référence unique dans le catalogue ;
* plusieurs emplacements physiques ;
* des statuts indépendants lors d'un audit ;
* une quantité correcte dans la nomenclature.

### Compatibilité des données

Les évolutions du modèle doivent préserver autant que possible la lecture des audits existants.

Les corrections de structure ne doivent pas entraîner de migration destructive sans nécessité.

---

## 🧪 Tests

Le projet utilise **Vitest** pour les tests automatisés.

Les tests couvrent notamment :

* les règles métier ;
* la construction des données ;
* les calculs de quantités ;
* les occurrences d'implantation ;
* les audits ;
* les imports/exports ;
* les cas particuliers ECA ;
* la compatibilité avec les données existantes.

Avant de valider une évolution importante :

```bash
npm test
```

Puis :

```bash
npx tsc --noEmit
```

et :

```bash
npm run build
```

Les trois niveaux doivent rester propres avant intégration.

---

## 🚀 Installation

Cloner le dépôt puis installer les dépendances :

```bash
git clone <repository-url>
cd Audit_DAT
npm install
```

Lancer l'application en développement :

```bash
npm run dev
```

L'application est ensuite accessible depuis l'URL indiquée par Vite.

---

## 📱 PWA et utilisation terrain

AuditRef est configurée comme une **Progressive Web App (PWA)**.

L'objectif est de permettre une utilisation confortable sur :

* smartphone ;
* tablette ;
* ordinateur.

L'interface terrain privilégie la lisibilité, les interactions rapides et la conservation locale des données.

---

## 🔐 Données

AuditRef fonctionne avec une base locale dans le navigateur.

Les données d'audit ne nécessitent pas de serveur distant pour être saisies et conservées pendant une session terrain.

Les mécanismes d'import/export permettent de maîtriser les échanges de données et de réaliser des sauvegardes.

**Une sauvegarde/export régulier reste recommandé lors d'une utilisation opérationnelle.**

---

## 📖 Documentation

La documentation complémentaire est disponible dans :

```text
docs/
```

Notamment :

* identité et présentation du produit ;
* documentation fonctionnelle ;
* historique ou documentation spécifique aux modules.

---

## 🎯 Philosophie du projet

AuditRef est conçu autour de quelques principes simples :

**Terrain d'abord**

L'application doit rester utilisable dans les conditions réelles d'un audit.

**Offline-first**

Une mauvaise couverture réseau ne doit pas empêcher un agent de travailler.

**Données exploitables**

Un audit ne doit pas seulement produire une liste de constats : les données doivent pouvoir être analysées, regroupées et exportées.

**Granularité physique**

Une référence doit pouvoir être retrouvée jusqu'à son implantation réelle lorsque cette information est disponible.

**Pas de duplication inutile**

Les fonctionnalités de consultation et d'export doivent exploiter les données métier existantes plutôt que recréer des référentiels parallèles.

**Évolution maîtrisée**

Les évolutions du modèle doivent préserver les données existantes et éviter les changements non nécessaires.

---

## 🛠️ État du projet

AuditRef est un projet en évolution continue.

Les fonctionnalités sont ajoutées progressivement à partir des besoins réels rencontrés lors des opérations d'audit et de suivi du patrimoine.

Le dépôt contient notamment les modules DAT, ECA, P+R, PMR, pictogrammes cognitifs, signalétique et plans de quartier.

---

## 📄 Licence

Projet propriétaire.

Les conditions d'utilisation, de redistribution et d'exploitation sont définies par le propriétaire du projet.
