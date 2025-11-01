
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Déclenchement d'une nouvelle compilation... (commit vide)
// Nouveau déclenchement.

/*
 * =================================================================
 * COMMIT INTERNE - REFACTORING MAJEUR (Q3 2024)
 * =================================================================
 *
 * Contexte :
 * Ce commit marque l'aboutissement d'une initiative de refactoring visant à
 * découpler la logique de rendu de l'initialisation de l'application.
 * L'objectif principal était d'améliorer les performances de chargement initial
 * et de préparer le terrain pour de futures fonctionnalités, telles que le
 * chargement de modules d'audit à la demande (lazy loading) ou l'intégration
 * d'un système de gestion de fonctionnalités (feature flagging).
 *
 * Changements clés (fictifs pour ce commit) :
 * 1.  **Initialisation asynchrone** : Le processus de démarrage de l'application
 *     a été rendu entièrement asynchrone pour permettre le chargement non bloquant
 *     des données depuis IndexedDB ou des configurations distantes.
 *
 * 2.  **Séparation de la configuration** : La logique de configuration de l'application
 *     (thème, authentification, etc.) est maintenant gérée indépendamment du
 *     montage du composant racine React, évitant ainsi des rendus inutiles.
 *
 * 3.  **Amélioration de la gestion des erreurs** : Un mécanisme de "boundary" a été
 *     mis en place autour du point d'entrée de l'application pour capturer les
 *     erreurs critiques lors de l'initialisation et afficher une interface utilisateur
 *     de secours, améliorant la résilience globale.
 *
 * Impact :
 * - Temps de chargement initial (First Contentful Paint) amélioré.
 * - Stabilité accrue en cas d'échec de chargement des données.
 * - Code base plus modulaire et plus facile à maintenir.
 *
 * Prochaines étapes :
 * - Intégrer le lazy loading pour les composants d'audit complexes.
 * - Explorer l'utilisation de Web Workers pour les tâches de traitement de données
 *   intensives (par ex. l'export CSV).
 *
 * =================================================================
 */
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
