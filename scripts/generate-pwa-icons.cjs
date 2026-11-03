// scripts/generate-pwa-icons.cjs
// Icônes PWA générées à partir du logo AuditRef (components/Logo.tsx) :
// bouclier + coche, teal-700 (#0f766e), sur fond blanc. Identité inchangée :
// mêmes tracés, même couleur ; seul le cadrage varie (marge de sécurité
// des icônes « maskable »). Usage : node scripts/generate-pwa-icons.cjs
const path = require('path');
const { chromium } = require('playwright');

const TEAL = '#0f766e';
const logo = (scale) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%">
  <rect width="24" height="24" fill="#ffffff"/>
  <g transform="translate(12 12) scale(${scale}) translate(-12 -12)" fill="none" stroke="${TEAL}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="${TEAL}" fill-opacity="0.1"/>
    <path d="m9 12 2 2 4-4" stroke-width="3"/>
  </g>
</svg>`;

const ICONS = [
    { file: 'pwa-192x192.png', size: 192, scale: 0.84 },
    { file: 'pwa-512x512.png', size: 512, scale: 0.84 },
    // Zone de sécurité « maskable » : 80 % centraux.
    { file: 'maskable-512x512.png', size: 512, scale: 0.66 },
    // iOS : fond opaque, coins arrondis appliqués par le système.
    { file: 'apple-touch-icon-180x180.png', size: 180, scale: 0.8 },
];

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const icon of ICONS) {
        await page.setViewportSize({ width: icon.size, height: icon.size });
        await page.setContent(`<html><body style="margin:0">${logo(icon.scale)}</body></html>`);
        await page.locator('svg').screenshot({ path: path.join(__dirname, '..', 'public', 'icons', icon.file), omitBackground: false });
    }
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
