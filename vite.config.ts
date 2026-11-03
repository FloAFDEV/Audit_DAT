import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// =================================================================
// PWA — fonctionnement hors connexion après une première visite.
// - Précache Workbox de TOUT le build (écrans chargés à la demande, export
//   Excel) et de public/ (pictogrammes cognitifs, visuels de référence,
//   icônes) : installation atomique — si une seule ressource échoue, le
//   service worker ne s'active pas et l'app le signale (OfflineStatus).
// - Mise à jour sur confirmation uniquement (registerType 'prompt') :
//   jamais de skipWaiting automatique ni de rechargement imposé.
// - Le service worker ne touche qu'au Cache Storage : IndexedDB (relevés)
//   n'est jamais lu, écrit ni supprimé par lui.
// - Retour arrière : PWA_SELF_DESTROY=1 au build → service worker qui se
//   désinstalle et vide SES caches (jamais IndexedDB).
// =================================================================
const selfDestroying = process.env.PWA_SELF_DESTROY === '1';


export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'prompt',
          injectRegister: false,
          selfDestroying,
          manifest: {
            id: '/',
            name: 'AuditRef — Tisséo',
            short_name: 'AuditRef',
            description: "Audits de signalétique Tisséo sur le terrain, avec ou sans réseau.",
            lang: 'fr',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            orientation: 'any',
            background_color: '#ffffff',
            theme_color: '#0f766e',
            icons: [
              { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
              { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,webp,svg,woff2}'],
            // exceljs (≈ 0,9 Mo) et le bundle principal doivent être précachés.
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            navigateFallback: '/index.html',
            cleanupOutdatedCaches: true,
            clientsClaim: false,
            skipWaiting: false,
          },
        }),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
