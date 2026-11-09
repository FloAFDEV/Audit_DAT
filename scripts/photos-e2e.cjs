// scripts/photos-e2e.cjs
// =================================================================
// Photos — test dans un vrai navigateur, HORS CONNEXION après une première
// visite (service worker actif) : « Choisir une photo » (photothèque, sans
// capture), original enregistré (SHA-256), « Enregistrer ou partager
// l'original » (téléchargement ou feuille de partage simulée), export ZIP
// d'une station (original intact, inventaire, manifeste), réouverture.
// Profil navigateur isolé (jamais les données de l'utilisateur).
//
// Usage : npm run test:photos
//   PHOTOS_E2E_ENGINE=chromium|webkit  PHOTOS_E2E_DEVICE="iPhone SE"
//   PHOTOS_E2E_THEME=light|dark        PHOTOS_E2E_SHARE=none|share-ok|share-abort
// WebKit : coupure réseau RÉELLE (serveur arrêté) — la coupure simulée de
// Playwright bloque aussi le service worker sous WebKit/Linux.
// =================================================================
const { execSync, spawn } = require('child_process');
const os = require('os');
const engine = process.env.PHOTOS_E2E_ENGINE || 'chromium';
const device = process.env.PHOTOS_E2E_DEVICE || 'iPhone 13';
const theme = process.env.PHOTOS_E2E_THEME || 'light';
const shareMode = process.env.PHOTOS_E2E_SHARE || 'none';
const PORT = process.env.PHOTOS_E2E_PORT || '4392';
const ROOT = require('path').resolve(__dirname, '..');
const WORK = require('fs').mkdtempSync(require('path').join(os.tmpdir(), 'auditref-photos-'));
const out = WORK;
let server;
const startServer = () => { server = spawn('npx', ['vite', 'preview', '--outDir', `${WORK}/dist`, '--port', PORT, '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true }); };
const stopServer = () => { try { process.kill(-server.pid); } catch { /* déjà arrêté */ } };
const pw = require('playwright'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
const { unzipSync, strFromU8 } = require('fflate');
const URL = `http://localhost:${PORT}/`;
// WebKit : coupure RÉELLE (serveur arrêté) — la coupure simulée de Playwright
// bloque aussi le service worker sous WebKit/Linux.
const goOffline = async (ctx) => { if (engine === 'webkit') { stopServer(); await new Promise(res => setTimeout(res, 800)); } else await ctx.setOffline(true); };
const JPEG = path.join(ROOT, 'tests', 'fixtures', 'pmr-photo-exif.jpg');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const r = { engine, device, theme, shareMode, checks: {}, overflow: {} };
const ok = (k, v, d = '') => { r.checks[k] = v ? 'OK' : `ÉCHEC ${d}`; };
(async () => {
  execSync(`npx vite build --outDir "${WORK}/dist" --emptyOutDir`, { cwd: ROOT, stdio: 'ignore' });
  startServer(); await new Promise(res => setTimeout(res, 2500));
  const o = { ...pw.devices[device], acceptDownloads: true, colorScheme: theme }; delete o.defaultBrowserType; if (engine === 'chromium') delete o.isMobile;
  let ctx = await pw[engine].launchPersistentContext(`${out}/profile`, o);
  await ctx.addInitScript(([t, mode]) => {
    localStorage.setItem('tisseo-audit-auth', 'true'); localStorage.setItem('tisseo-audit-theme', t);
    if (mode === 'share-ok' || mode === 'share-abort') {
      window.__shared = [];
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { if (mode === 'share-abort') throw new DOMException('x', 'AbortError'); window.__shared.push({ name: d.files[0].name, size: d.files[0].size, type: d.files[0].type }); } });
    }
  }, [theme, shareMode]);
  let page = ctx.pages()[0] || await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message.slice(0, 120)));
  const ov = async k => { r.overflow[k] = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); };
  await page.goto(URL); await page.locator('.lieu-card').first().waitFor({ timeout: 90000 });
  await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise(res => setTimeout(res, 90000))]));
  // Premier passage en ligne sur les écrans utilisés (puis tout hors connexion).
  await goOffline(ctx);
  await page.reload(); await page.locator('.lieu-card').first().waitFor({ timeout: 60000 });
  ok('hors connexion : rechargement', engine !== 'webkit' || await page.evaluate(() => fetch('/__x__', { cache: 'no-store' }).then(() => false, () => true)));
  await page.getByPlaceholder(/Rechercher|station/i).first().fill('Basso');
  await page.locator('.lieu-card', { hasText: 'Basso Cambo' }).first().click();
  await page.getByText('Adhésifs PMR au Sol').first().click();
  const lib = page.locator('input[data-photo-source="library"]'), cam = page.locator('input[data-photo-source="camera"]');
  ok('2 entrées : appareil photo (capture) + photothèque (sans capture)', (await cam.getAttribute('capture')) === 'environment' && (await lib.getAttribute('capture')) === null);
  await page.getByRole('button', { name: 'Prendre une photo' }).first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/1-boutons-photo.png` }); await ov('formulaire');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choisir une photo' }).first().click()]);
  ok('« Choisir une photo » ouvre le sélecteur sans capture', !(await chooser.element().getAttribute('capture')));
  await chooser.setFiles(JPEG);
  await page.locator('img[src^="data:image/jpeg"]').first().waitFor({ timeout: 30000 });
  const stored = await page.evaluate(() => new Promise(res => { const q = indexedDB.open('TisseoAuditDB'); q.onsuccess = () => { const g = q.result.transaction('photos').objectStore('photos').getAll(); g.onsuccess = () => res(g.result.map(p => ({ id: p.id, sha: p.originalSha256, size: p.originalSize, type: p.originalType, bytes: Array.from(new Uint8Array(p.original)).slice(0, 4) }))); }; }));
  const jpeg = fs.readFileSync(JPEG);
  ok('photo choisie hors connexion : original enregistré, SHA-256', stored.length === 1 && stored[0].sha === sha(jpeg) && stored[0].size === jpeg.length, JSON.stringify(stored));
  // Visionneuse → original
  await page.locator('img[src^="data:image/jpeg"]').first().click();
  const saveBtn = page.getByRole('button', { name: /Enregistrer ou partager l’original/ });
  await saveBtn.waitFor(); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Enregistrer ou partager l’original/.test(b.textContent) && !b.disabled), null, { timeout: 15000 });
  await page.screenshot({ path: `${out}/2-visionneuse.png` }); await ov('visionneuse');
  if (shareMode === 'none') {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), saveBtn.click()]);
    const p = path.join(out, dl.suggestedFilename()); await dl.saveAs(p);
    ok('original téléchargé (octets identiques, nom d’origine)', sha(fs.readFileSync(p)) === sha(jpeg) && dl.suggestedFilename() === 'pmr-photo-exif.jpg', dl.suggestedFilename());
  } else {
    await saveBtn.click(); await page.waitForTimeout(800);
  }
  const msg = await page.getByTestId('original-delivery-message').innerText();
  r.message = msg;
  ok('message exact, jamais « enregistrée dans la galerie »', !/enregistrée? dans (la galerie|Photos)/i.test(msg)
    && (shareMode === 'none' ? /Le téléchargement a été lancé/.test(msg) : shareMode === 'share-ok' ? /transmis à l'application choisie/.test(msg) : /Partage annulé/.test(msg)), msg);
  if (shareMode === 'share-ok') { const s = await page.evaluate(() => window.__shared); ok('partage : fichier original', s.length === 1 && s[0].size === jpeg.length && s[0].name === 'pmr-photo-exif.jpg', JSON.stringify(s)); }
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Fermer' }).first().click().catch(() => {});
  // Export ZIP (hors connexion)
  await page.getByRole('button', { name: 'Accueil' }).first().click(); await page.locator('.lieu-card').first().waitFor();
  await page.getByRole('button', { name: /Sauvegarde/ }).first().click();
  await page.getByRole('menuitem', { name: /Exporter les photos originales/ }).click();
  await page.getByTestId('photo-export-estimate').waitFor({ timeout: 20000 });
  r.estimate = await page.getByTestId('photo-export-estimate').innerText();
  await page.getByRole('radio', { name: 'Une station' }).check(); await page.getByRole('combobox', { name: 'Station' }).selectOption({ label: 'Basso Cambo' });
  await page.waitForTimeout(300); r.estimateStation = await page.getByTestId('photo-export-estimate').innerText();
  await page.screenshot({ path: `${out}/3-export.png` }); await ov('export');
  await page.getByRole('button', { name: 'Exporter les photos originales' }).click();
  const zipBtn = page.getByRole('button', { name: 'Enregistrer le ZIP' }); await zipBtn.waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${out}/4-export-pret.png` });
  if (shareMode === 'none') {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), zipBtn.click()]);
    const p = path.join(out, dl.suggestedFilename()); await dl.saveAs(p);
    const files = unzipSync(new Uint8Array(fs.readFileSync(p)));
    const photos = Object.keys(files).filter(k => k.includes('/originaux/'));
    const manifest = JSON.parse(strFromU8(files['photos-audit-dat/manifest.json']));
    ok('ZIP station hors connexion : original intact + inventaire + manifeste', photos.length === 1 && sha(files[photos[0]]) === sha(jpeg) && !!files['photos-audit-dat/inventaire.csv'] && manifest.photos[0].integrity === 'conforme' && /ligne-A\/Basso-Cambo\//.test(photos[0]), `${dl.suggestedFilename()} ${photos.join(',')}`);
  } else { await zipBtn.click(); await page.waitForTimeout(800); }
  await page.getByText(/Export terminé|Partage annulé/).first().waitFor({ timeout: 10000 }).catch(() => {});
  r.exportMessages = await page.getByTestId('photo-export-messages').innerText().catch(() => '');
  r.exportFinal = await page.getByText(/Export terminé/).count();
  await page.screenshot({ path: `${out}/5-export-fin.png` });
  await ctx.close();
  // Fermeture / réouverture hors connexion : photo toujours là
  ctx = await pw[engine].launchPersistentContext(`${out}/profile`, o); if (engine !== 'webkit') await ctx.setOffline(true); page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(URL); await page.locator('.lieu-card').first().waitFor({ timeout: 60000 });
  const after = await page.evaluate(() => new Promise(res => { const q = indexedDB.open('TisseoAuditDB'); q.onsuccess = () => { const c = q.result.transaction('photos').objectStore('photos').count(); c.onsuccess = () => res(c.result); }; }));
  ok('réouverture hors connexion : photo conservée', after === 1, String(after));
  r.errors = errors; await ctx.close();
  stopServer();
  const failed = Object.entries(r.checks).filter(([, v]) => v !== 'OK');
  for (const [k, v] of Object.entries(r.checks)) console.log(`${v === 'OK' ? '✔' : '✘'} ${k}${v === 'OK' ? '' : ` — ${v}`}`);
  console.log(`débordement horizontal : ${JSON.stringify(r.overflow)} · erreurs JS : ${r.errors.length}`);
  console.log(`\n${Object.keys(r.checks).length - failed.length}/${Object.keys(r.checks).length} vérifications réussies (${engine}, ${device}, ${theme}, partage ${shareMode}).`);
  if (!process.env.PHOTOS_E2E_KEEP) fs.rmSync(WORK, { recursive: true, force: true });
  process.exit(failed.length || r.errors.length || Object.values(r.overflow).some(v => v > 0) ? 1 : 0);
})().catch(e => { console.error('ÉCHEC', e.message.slice(0, 500)); stopServer(); process.exit(1); });
