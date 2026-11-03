import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { db } from './db';
import { PwaStatus } from './components/PwaStatus';
import { initPwa, watchDatabaseVersions } from './utils/pwa/pwaState';

// Hors connexion (service worker, mises à jour sur confirmation) et
// connexions IndexedDB concurrentes lors d'une montée de version.
watchDatabaseVersions(db);
void initPwa();

/*
 * =================================================================
 * DÉPLOIEMENT TECHNIQUE - V1.0.4
 * =================================================================
 * Déclenchement manuel du build pour prise en compte des dernières
 * modifications (Codes Ligne C et structure P+R Arènes).
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
    <PwaStatus />
  </React.StrictMode>
);