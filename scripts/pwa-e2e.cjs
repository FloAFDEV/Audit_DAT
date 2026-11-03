// scripts/pwa-e2e.cjs
// =================================================================
// Tests PWA dans un vrai navigateur (Chromium, Playwright) avec un service
// worker actif, sur des builds de production servis avec les mêmes
// en-têtes de cache que Vercel (max-age=0, must-revalidate).
// Profils navigateur isolés (jamais les données de l'utilisateur).
//
// Usage : npm run test:pwa   (≈ 3 min ; construit 4 versions dans /tmp)
//  A : version courante          B : A + une ressource en plus (mise à jour)
//  C : A amputée d'un pictogramme (précache impossible)
//  D : service worker d'autodestruction (retour arrière)
// =================================================================
const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'auditref-pwa-'));
const DIST = { A: path.join(WORK, 'A'), B: path.join(WORK, 'B'), C: path.join(WORK, 'C'), D: path.join(WORK, 'D') };
const PORT = Number(process.env.PWA_E2E_PORT || 4390);
const URL = `http://localhost:${PORT}/`;
const DEVICE = process.env.PWA_E2E_DEVICE || 'iPhone 13';
const SHOTS = process.env.PWA_E2E_SHOTS; // dossier de captures (facultatif)
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${DEVICE.replace(/ /g, '')}-${name}.png`) }); };
const overflowX = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`); };

// ---------------------------------------------------------------- builds
const build = (outDir, env = {}) => execSync(`npx vite build --outDir "${outDir}" --emptyOutDir`, { cwd: ROOT, stdio: 'ignore', env: { ...process.env, ...env } });
const markerFile = path.join(ROOT, 'public', 'icons', 'pwa-e2e-update-marker.svg');
const buildAll = () => {
    build(DIST.A);
    try {
        fs.writeFileSync(markerFile, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>');
        build(DIST.B);
    } finally { fs.rmSync(markerFile, { force: true }); }
    fs.cpSync(DIST.A, DIST.C, { recursive: true });
    fs.rmSync(path.join(DIST.C, 'pictos-cognitifs', 'MBC.png'));
    build(DIST.D, { PWA_SELF_DESTROY: '1' });
};

// ---------------------------------------------------------------- serveur
let servedRoot = DIST.A;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new globalThis.URL(req.url, URL).pathname);
    let file = path.join(servedRoot, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        if (path.extname(pathname)) { res.writeHead(404); res.end(); return; }
        file = path.join(servedRoot, 'index.html');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=0, must-revalidate' });
    fs.createReadStream(file).pipe(res);
});

// ---------------------------------------------------------------- outils
const deviceOptions = () => { const d = { ...devices[DEVICE], acceptDownloads: true }; delete d.defaultBrowserType; return d; };
const launch = async (profile, { offline = false } = {}) => {
    const ctx = await chromium.launchPersistentContext(profile, deviceOptions());
    await ctx.addInitScript(() => localStorage.setItem('tisseo-audit-auth', 'true'));
    if (offline) await ctx.setOffline(true);
    const page = ctx.pages()[0] || await ctx.newPage();
    page.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0, 160)));
    return { ctx, page };
};
const swState = page => page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return { active: !!reg?.active, waiting: !!reg?.waiting, installing: !!reg?.installing, controlled: !!navigator.serviceWorker.controller, script: reg?.active?.scriptURL ?? null };
});
const waitForActiveSw = page => page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 90000))]));
const home = async page => {
    await page.locator('.lieu-card, nav >> text=Accueil').first().waitFor({ timeout: 60000 });
    if (!(await page.locator('.lieu-card').count())) await page.getByRole('button', { name: 'Accueil' }).first().click();
    await page.locator('.lieu-card').first().waitFor({ timeout: 30000 });
};
const openStation = async (page, name) => {
    await home(page);
    await page.getByPlaceholder(/Rechercher|station/i).first().fill(name);
    await page.locator('.lieu-card', { hasText: name }).first().click();
    await page.getByText('Sélectionner un module').waitFor({ timeout: 15000 });
};
const back = async page => { await page.getByRole('button', { name: 'Retour' }).first().evaluate(b => b.click()); await page.waitForTimeout(300); };
const backToStation = async page => { for (let i = 0; i < 5 && !(await page.getByText('Sélectionner un module').count()); i++) await back(page); };
const dbRead = (page, fn) => page.evaluate(`new Promise(res => { const q = indexedDB.open('TisseoAuditDB'); q.onsuccess = () => { const g = q.result.transaction('lieux').objectStore('lieux').getAll(); g.onsuccess = () => { const lieux = g.result; res((${fn})(lieux)); q.result.close(); }; }; })`);
const PMR_STATUS = `lieux => lieux.find(l => l.name === 'Basso Cambo').modules.find(m => m.type === 'PMR_FLOOR_ADHESIVE').data.adhesives[0].status`;
const COG_STATUS = `lieux => lieux.find(l => l.name === 'Basso Cambo').modules.find(m => m.type === 'COGNITIVE_PICTOGRAMS').data.pictograms[0].status`;
const imagesOk = page => page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth > 0).length);
const imagesBroken = page => page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.split('/').pop()));

// ---------------------------------------------------------------- scénarios
const scenarioOffline = async () => {
    const profile = path.join(WORK, 'profile-main');
    let { ctx, page } = await launch(profile);
    // 1. Première visite en ligne : précache complet.
    await page.goto(URL); await home(page); await waitForActiveSw(page);
    const state = await swState(page);
    check('1. Première visite en ligne : service worker actif', state.active, JSON.stringify(state));
    const cached = await page.evaluate(async () => { const keys = await caches.keys(); let n = 0; for (const k of keys) n += (await (await caches.open(k)).keys()).length; return n; });
    check('   précache rempli', cached > 100, `${cached} ressources`);
    await page.waitForTimeout(1500);

    // 2. Passage hors connexion + rechargement complet.
    await ctx.setOffline(true);
    await page.reload(); await home(page);
    check('2. Rechargement complet hors connexion', true, `${await page.locator('.lieu-card').count()} cartes`);

    // 3. Pictogrammes : toute la liste (38 visuels).
    for (let y = 0; y < 45; y++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(80); }
    await page.waitForTimeout(800);
    const pictos = await page.locator('[data-testid="station-pictograms"] img').evaluateAll(is => is.filter(i => i.complete && i.naturalWidth > 0).length);
    check('3. Pictogrammes hors connexion (38 attendus)', pictos === 38, `${pictos}`);

    // 4. Navigation vers tous les écrans + enregistrement / modification.
    const visited = [];
    await openStation(page, 'Basso Cambo'); visited.push('fiche station');
    await page.getByText('Adhésifs PMR au Sol').first().click(); await page.getByRole('button', { name: 'Absent' }).first().click(); await page.waitForTimeout(500);
    const pmr1 = await dbRead(page, PMR_STATUS);
    await page.getByRole('button', { name: 'À remplacer' }).first().click(); await page.waitForTimeout(500);
    const pmr2 = await dbRead(page, PMR_STATUS);
    check('4a. Enregistrement puis modification hors connexion (PMR)', pmr1 === 'Absent' && pmr2 === 'ToBeReplaced', `${pmr1} → ${pmr2}`); visited.push('PMR');
    await backToStation(page);
    await page.getByText('Pictogrammes Cognitifs').first().click(); await page.getByRole('button', { name: 'À remplacer' }).first().click(); await page.waitForTimeout(500);
    check('4b. Enregistrement pictogramme cognitif hors connexion', (await dbRead(page, COG_STATUS)) === 'ToBeReplaced'); visited.push('pictogrammes');
    await backToStation(page);
    await page.getByText('DAT', { exact: true }).first().click(); await page.getByText('Salle des billets').first().click(); await page.getByText('DAT 03').first().click();
    await page.getByRole('button', { name: 'OK' }).first().waitFor(); await page.waitForTimeout(800);
    const broken = await imagesBroken(page);
    check('4c. Formulaire DAT + visuels de référence hors connexion', broken.length === 0, `${await imagesOk(page)} images, cassées : ${broken.join(',') || 'aucune'}`); visited.push('DAT');
    await backToStation(page);
    await page.getByText('ECA (Valideurs)').first().click(); await page.getByText('Valideur 5').first().click(); await page.getByRole('button', { name: 'OK' }).first().waitFor(); visited.push('ECA');
    await backToStation(page);
    await page.getByText('Audit Bornes P+R').first().click(); await page.getByText('MBC – Côté Silo').first().click(); await page.getByText('BE11').first().click(); await page.getByRole('button', { name: 'OK' }).first().waitFor(); visited.push('P+R');
    await backToStation(page);
    await page.getByText('Plans de quartier').first().click(); await page.getByText(/Élément trouvé/).waitFor(); visited.push('plans de quartier');
    await page.getByRole('button', { name: 'Accueil' }).first().click(); await home(page);
    await page.getByLabel('Ouvrir le cockpit signalétique').click(); await page.getByText('État des anomalies').waitFor({ timeout: 15000 }); visited.push('Synthèse');
    for (const [btn, text] of [['Analyse des anomalies', /PMR AU SOL|Signalétique IV/i], ['Archives', /Archives des Audits/], ['Référentiel', /Implantations/]]) {
        await page.getByRole('button', { name: btn }).first().click(); await page.getByText(text).first().waitFor({ timeout: 15000 }); visited.push(btn);
    }
    const errorScreens = await page.getByText("Une erreur d'affichage est survenue").count();
    check('4d. Tous les écrans hors connexion', errorScreens === 0, visited.join(', '));

    // 5. Export Excel hors connexion.
    // (Référentiel → Références : deux références cochées → implantations sélectionnées)
    const boxes = page.locator('tbody input[type=checkbox]');
    await boxes.nth(0).check(); await boxes.nth(1).check();
    await page.getByRole('button', { name: /Voir les implantations/ }).click();
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Exporter .xlsx' }).click()]);
    const xlsx = path.join(WORK, 'offline.xlsx'); await download.saveAs(xlsx);
    const head = fs.readFileSync(xlsx).subarray(0, 2).toString();
    check('5. Export Excel hors connexion', head === 'PK' && fs.statSync(xlsx).size > 5000, `${fs.statSync(xlsx).size} octets`);

    // 6. Fermeture puis réouverture HORS CONNEXION, persistance.
    await ctx.close();
    ({ ctx, page } = await launch(profile, { offline: true }));
    await page.goto(URL); await home(page);
    const after = [await dbRead(page, PMR_STATUS), await dbRead(page, COG_STATUS)];
    check('6. Fermeture / réouverture hors connexion + persistance', after[0] === 'ToBeReplaced' && after[1] === 'ToBeReplaced', after.join(', '));

    // 7. Retour du réseau.
    await ctx.setOffline(false);
    await page.reload(); await home(page);
    check('7. Retour du réseau : données intactes', (await dbRead(page, PMR_STATUS)) === 'ToBeReplaced');
    await ctx.close();
    return profile;
};

const scenarioUpdate = async (profile) => {
    let { ctx, page } = await launch(profile);
    servedRoot = DIST.B;
    await page.goto(URL); await home(page);
    await page.evaluate(() => { window.__pwaE2eMarker = 'sans-rechargement'; });
    await page.getByTestId('pwa-update').waitFor({ timeout: 90000 });
    check('8a. Nouvelle version téléchargée en arrière-plan, bandeau affiché', /Nouvelle version disponible/.test(await page.getByTestId('pwa-update').innerText()) && (await overflowX(page)) === 0, `débordement : ${await overflowX(page)} px`);
    await shot(page, 'bandeau-mise-a-jour');
    await page.waitForTimeout(4000);
    check('8b. Aucun rechargement automatique', (await page.evaluate(() => window.__pwaE2eMarker)) === 'sans-rechargement');

    // Brouillon non enregistré : mise à jour refusée.
    await openStation(page, 'Basso Cambo'); await page.getByText('Plans de quartier').first().click();
    await page.getByText(/Élément trouvé/).click();
    await page.getByPlaceholder('Description libre (obligatoire)').fill('Brouillon en cours');
    await page.evaluate(() => { window.__pwaE2eMarker = 'avant-maj'; });
    await page.getByTestId('pwa-update').getByRole('button', { name: 'Mettre à jour' }).click();
    await page.waitForTimeout(1500);
    const blockedText = await page.getByTestId('pwa-update').innerText();
    await shot(page, 'mise-a-jour-reportee');
    check('8c. Saisie non enregistrée : mise à jour reportée, rien rechargé', /reportée/.test(blockedText) && (await page.evaluate(() => window.__pwaE2eMarker)) === 'avant-maj'
        && (await page.getByPlaceholder('Description libre (obligatoire)').inputValue()) === 'Brouillon en cours', blockedText.replace(/\s+/g, ' ').slice(0, 120));
    await page.getByPlaceholder('Description libre (obligatoire)').fill('');
    await page.getByRole('button', { name: 'Annuler' }).first().click();

    const before = await dbRead(page, PMR_STATUS);
    await Promise.all([
        page.waitForEvent('framenavigated', { timeout: 60000 }),
        page.getByTestId('pwa-update').getByRole('button', { name: 'Mettre à jour' }).click(),
    ]);
    await home(page);
    const backupOk = await page.evaluate(() => { const k = localStorage.getItem('tisseo-audit-pre-update-backup-key'); const v = k && localStorage.getItem(k); return !!v && JSON.parse(v).scope === 'pre-update' && Array.isArray(JSON.parse(v).data); });
    const hasMarker = await page.evaluate(async () => { for (const k of await caches.keys()) { const c = await caches.open(k); if ((await c.keys()).some(r => r.url.includes('pwa-e2e-update-marker'))) return true; } return false; });
    const afterUpd = await dbRead(page, PMR_STATUS);
    check('8d. Mise à jour appliquée sur confirmation, sauvegarde vérifiée, données intactes', hasMarker && backupOk && afterUpd === before, `nouvelle version en cache : ${hasMarker}, sauvegarde : ${backupOk}, PMR : ${before} → ${afterUpd}`);
    check('8e. Bandeau retiré après mise à jour', (await page.getByTestId('pwa-update').count()) === 0);
    await ctx.close();
};

const scenarioMissingResource = async () => {
    servedRoot = DIST.C;
    const { ctx, page } = await launch(path.join(WORK, 'profile-missing'));
    await page.goto(URL); await home(page);
    await page.getByTestId('pwa-not-ready').waitFor({ timeout: 90000 }).catch(() => {});
    const text = (await page.getByTestId('pwa-not-ready').count()) ? await page.getByTestId('pwa-not-ready').innerText() : '';
    const sw = await swState(page);
    await shot(page, 'pas-pret-hors-connexion');
    check('9. Ressource impossible à mettre en cache : signalé, service worker non activé', /Pas prêt pour une utilisation hors connexion/.test(text) && !sw.active, `${text.replace(/\s+/g, ' ').slice(0, 110)} | ${JSON.stringify(sw)}`);
    await ctx.close();
};

const scenarioRollback = async (profile) => {
    servedRoot = DIST.D;
    const { ctx, page } = await launch(profile);
    await page.goto(URL); await home(page);
    // Le navigateur vérifie sw.js à chaque ouverture ; on force la vérification
    // puis on attend la désinstallation (la page peut se recharger entre-temps).
    let reg = true;
    for (let i = 0; i < 30 && reg; i++) {
        try {
            reg = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (r) await r.update().catch(() => {}); return !!(await navigator.serviceWorker.getRegistration()); });
        } catch { /* rechargement en cours */ }
        if (reg) await page.waitForTimeout(1000);
    }
    // Le service worker d'autodestruction recharge lui-même les pages ouvertes.
    await page.waitForTimeout(1500);
    await page.goto(URL).catch(() => page.goto(URL)); await home(page);
    const cacheCount = await page.evaluate(async () => (await caches.keys()).length);
    const data = await dbRead(page, PMR_STATUS);
    check('10. Retour arrière : service worker désinstallé, caches vidés, IndexedDB intacte', !reg && cacheCount === 0 && data === 'ToBeReplaced', `enregistré : ${reg}, caches : ${cacheCount}, PMR : ${data}`);
    await ctx.close();
};

(async () => {
    console.log(`Builds dans ${WORK}…`);
    buildAll();
    await new Promise(r => server.listen(PORT, r));
    try {
        const profile = await scenarioOffline();
        servedRoot = DIST.A;
        await scenarioUpdate(profile);
        await scenarioMissingResource();
        await scenarioRollback(profile);
    } catch (e) {
        check('exécution', false, e.message.split('\n')[0]);
    } finally {
        server.close();
    }
    const failed = results.filter(r => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies (${DEVICE}).`);
    if (!process.env.PWA_E2E_KEEP) fs.rmSync(WORK, { recursive: true, force: true });
    process.exit(failed.length ? 1 : 0);
})();
