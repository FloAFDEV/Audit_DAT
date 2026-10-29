# Relevés multi-agents — format d'échange et consolidation

> AuditRef Tisséo · format `auditref.exchange` · `schemaVersion: 1` · référentiel `tisseo-iv` `2026.10`

Plusieurs agents auditent hors connexion, chacun sur sa tablette. Chacun **exporte** ses relevés
(JSON) ; un appareil de consolidation **importe N fichiers**. Aucun nombre d'agents n'est imposé.

Menu **Sauvegarde → Relevés multi-agents (export / consolidation)**.

| | Sauvegarde complète (`formatVersion: 2`) | Échange multi-agents (`auditref.exchange`) |
|---|---|---|
| Rôle | restaurer un appareil | rassembler le travail de plusieurs agents |
| À l'import | **remplace** toute la base | **ajoute** des observations, ne détruit rien |
| Contenu | arbre d'audit + référentiel | observations horodatées et attribuées |

## 1. Notions

- **Contrôle** : le plus petit élément dont un agent constate l'état (repère d'adhésif d'un DAT,
  d'une borne P+R ou d'un valideur ECA, adhésif PMR au sol, pictogramme cognitif, champ d'un
  équipement de station, exemplaire de plan de quartier).
- **Observation** : « tel agent a constaté tel résultat sur tel contrôle, à tel instant, avec telle
  version du référentiel ». Immuable.
- **État courant** d'un contrôle : le résultat de son observation la plus récente.
- **Historique** : toutes les observations, conservées dans la table Dexie `observations` (V27).

## 2. Identité stable des contrôles

Le seed génère des UUID **par appareil** pour les DAT, les zones et bornes P+R, les ECA, les modules
PMR au sol et les pictogrammes : deux tablettes n'ont jamais le même id pour le même objet. La clé
d'un contrôle repose donc sur des attributs métier stables
(`utils/exchange/controls.ts`) — `clé = <audit>/<objet>/<item>` :

| Audit | audit | objet | item |
|---|---|---|---|
| DAT | `module-dat-<station>` | `<station>/<direction>/<nom du DAT>` | id du repère (`ad1`…) |
| Équipements station | `module-sig-<station>` | `<station>/<équipement>/<sens>/<rang>` | champ (`status`, `hap`…) |
| P+R | `module-pr-<parc>` | `<zone>/<borne>` | id du repère |
| ECA | `module-eca-…` | `<accès>/<numéro>` d'origine (`sourceRef`) | repère (`eca-1@ZH`…) |
| PMR au sol | `pmr-<code station>-<nom du module>` | `sol` | nom de l'adhésif |
| Pictogrammes | `module-cog-picto-<station>` | nom de l'accès | `pictogramme` |
| Plans de quartier | `module-pdq-<station>` | id de l'exemplaire (créé une fois, voyage avec lui) | `exemplaire` |

Une clé rencontrée deux fois dans un même lieu reçoit un suffixe `#2`, `#3`… (déterministe). Un test
vérifie que deux seeds indépendants produisent exactement les mêmes clés, sans collision.

## 3. Format JSON

```jsonc
{
  "schema": "auditref.exchange",
  "schemaVersion": 1,
  "exportId": "uuid",                       // identifiant de l'export
  "exportedAt": "2026-10-29T18:00:00.000Z",
  "app": { "name": "auditref-tisseo", "version": "1.0.0", "dataVersion": "v13.2" },
  "network": { "id": "tisseo", "name": "Tisséo" },
  "referentiel": { "id": "tisseo-iv", "version": "2026.10" },   // référentiel de l'appareil exportateur
  "agents": [ { "id": "agent-…", "name": "Serge" } ],
  "observations": [
    {
      "id": "uuid",                          // stable : idempotence
      "control": "pmr-STX-Audit PMR/sol/Item 3",
      "observedAt": "2026-10-29T14:00:00.000Z",
      "timeSource": "recorded",              // recorded | inferred | unknown
      "agent": "agent-…",
      "referentielVersion": "2026.10",       // référentiel au moment du contrôle
      "result": { "status": "ToBeReplaced", "anomaly": true, "comment": "…" },
      "site":   { "id": "lieu-…", "name": "Station X", "code": "STX" },
      "audit":  { "type": "PMR_FLOOR_ADHESIVE", "id": "pmr-STX-Audit PMR", "name": "Audit PMR" },
      "object": { "id": "sol", "label": "Station X · Audit PMR" },
      "item":   { "id": "Item 3", "label": "Item 3" },
      "media":  [ { "photoId": "…", "takenAt": "…" } ],   // références seulement
      "occurrence": { … }                    // plans de quartier : description de l'exemplaire
    }
  ]
}
```

- `timeSource` — `recorded` : heure de saisie sur l'appareil ; `inferred` : constat antérieur au
  journal, daté par une date existante (complétion, prise de vue, constat) ; `unknown` : aucune date,
  horodatage sentinelle `1970-01-01T00:00:00.000Z`, toujours battu par une observation datée.
- `media` : les photos (originaux en table `photos`) **ne voyagent pas** dans le JSON ; seule la
  référence est transmise.
- Évolution : tout champ ajouté reste optionnel en `schemaVersion: 1` ; un changement incompatible
  incrémente `schemaVersion`. Un fichier de version supérieure est refusé, jamais lu à moitié.

## 4. Règles de consolidation

1. **Rien n'est détruit** : l'import ajoute des observations à l'historique.
2. **Idempotence** : une observation est déjà connue si son `id` l'est, ou si un véritable doublon
   existe (même contrôle, même instant, même agent, même statut). Réimporter un fichier, ou le
   recevoir par deux chemins, n'ajoute rien.
3. **Le temps est l'arbitre** : l'état courant suit l'observation la plus récente — aucune résolution
   manuelle. Égalité stricte d'horodatage avec des résultats différents : départage déterministe
   (agent, puis id), signalé dans les points d'attention.
4. **Remise à zéro locale** : un retour à « non contrôlé » est journalisé comme un événement daté
   (`kind: reset`). Une observation importée plus ancienne ne ressuscite pas un statut effacé après
   elle. Les resets ne sont jamais exportés.
5. **Référentiel** : même réseau et même identifiant de référentiel exigés ; une autre **version**
   est acceptée et signalée, chaque observation garde sa version d'origine.
6. **Contrôle inconnu** sur l'instance (structure différente) : signalé, l'observation reste dans
   l'historique. Un exemplaire de plan de quartier découvert ailleurs est recréé.
7. Avant toute consolidation apportant du nouveau, une sauvegarde complète automatique est faite
   (comme avant un import), et l'opération est tracée dans le journal d'événements.

Seule la consolidation applique l'état : elle n'est pas journalisée comme une saisie de l'agent local.
Un export depuis l'appareil de consolidation contient toutes les observations connues avec leur
provenance d'origine (consolidation en chaîne possible).

## 5. Limites assumées (v1)

- Les **commentaires** voyagent dans chaque observation (historique) mais ne sont pas consolidés
  dans l'arbre : le commentaire local d'un DAT/borne n'est jamais écrasé.
- Les **changements de structure** (bornes P+R ajoutées, correction de type ECA, renommage de DAT)
  ne sont pas échangés : seules les observations le sont.
- Une **restauration de sauvegarde** ou une **réinitialisation forcée** ne sont pas des observations ;
  la réinitialisation forcée efface aussi le journal — exporter ses relevés avant.
- Deux agents qui recensent le **même plan de quartier** sur deux appareils créent deux exemplaires.

## 6. Code

| Fichier | Rôle |
|---|---|
| `data/referentiel.ts` | réseau et version du référentiel |
| `utils/exchange/controls.ts` | parcours des contrôles, clés naturelles, lecture/écriture |
| `utils/exchange/format.ts` | format, validation à l'import |
| `utils/exchange/consolidate.ts` | dédoublonnage, arbitrage temporel, application (logique pure) |
| `utils/exchange/observationLog.ts` | identité d'agent, journal Dexie, export, consolidation |
| `components/MultiAgentExchangeModal.tsx` | interface |
| `tests/multiAgentExchange.test.ts` | scénario Station X / Audit PMR et cas limites |

## 7. Relation avec le moteur générique

Ce format est volontairement neutre (site, audit, objet, item, résultat) : c'est le format d'entrée
prévu pour le dépôt générique `auditref`, qui reprend les mêmes règles de consolidation. AuditRef
Tisséo reste spécifique à Tisséo et n'est pas transformé en moteur générique.
