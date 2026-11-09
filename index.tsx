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

// Barre d'état (theme-color) : la couleur RÉELLEMENT affichée en haut de
// l'écran (fond de l'app, de l'accueil public, clair ou sombre), pour que la
// zone système se fonde dans l'interface — aucune couleur de marque, aucun
// élément ajouté, aucune marge. Mesurée au changement de thème et d'écran
// (une fois par image au plus) et à la FIN d'un défilement : aucune mesure
// pendant le défilement lui-même (coût CPU sur mobile).
const opaqueBackgroundAt = (x: number, y: number): string | null => {
  let el: Element | null = document.elementFromPoint(x, y);
  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
    el = el.parentElement;
  }
  return null;
};
// Couleur CSS quelconque (oklch…) → #rrggbb, compris par tous les navigateurs.
// Mémorisée : au défilement, la même couleur n'est convertie qu'une fois
// (la lecture du canvas à chaque image coûtait ~+20 % de CPU sur mobile).
const toHex = (() => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const cache = new Map<string, string>();
  return (color: string): string | null => {
    const known = cache.get(color);
    if (known) return known;
    if (!ctx) return null;
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const hex = `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    cache.set(color, hex);
    return hex;
  };
})();
let themeColorFrame = 0;
const syncThemeColor = () => {
  if (themeColorFrame) return;
  themeColorFrame = requestAnimationFrame(() => {
    themeColorFrame = 0;
    const meta = document.querySelector('meta[name="theme-color"]');
    const fallback = document.documentElement.classList.contains('dark') ? '#0f172a' : '#f8fafc';
    const top = opaqueBackgroundAt(1, 1);
    const color = (top && toHex(top)) || fallback;
    if (meta && meta.getAttribute('content') !== color) meta.setAttribute('content', color);
  });
};
syncThemeColor();
new MutationObserver(syncThemeColor).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(syncThemeColor).observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
let scrollEndTimer = 0;
window.addEventListener('scroll', () => {
  window.clearTimeout(scrollEndTimer);
  scrollEndTimer = window.setTimeout(syncThemeColor, 120);
}, { passive: true });
window.addEventListener('resize', syncThemeColor);

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