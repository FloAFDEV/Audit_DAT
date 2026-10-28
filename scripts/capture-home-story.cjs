/**
 * Capture les VRAIS écrans AuditRef utilisés par le storytelling de la page
 * d'accueil (components/home/). À relancer quand l'UI de l'app change.
 *
 * Prérequis : app lancée (`npm run dev`), Playwright installé sans l'ajouter
 * aux dépendances (`npm i --no-save playwright && npx playwright install chromium`),
 * Python 3 + Pillow pour la conversion WebP. Rejoue un vrai audit sur des données vierges
 * (navigateur jetable : aucune donnée réelle touchée) puis imprime les zones
 * de focus à reporter dans components/home/auditStorySteps.ts.
 *
 * Usage : HOME_STORY_URL=http://localhost:3000 node scripts/capture-home-story.cjs
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const URL = process.env.HOME_STORY_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'public', 'images', 'home-story');
const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'home-story-'));
const FORMATS = {
  desktop: { width: 1024, height: 768, cropH: 640 },
  mobile: { width: 390, height: 844, cropH: 760 },
};

const box = async (loc) => (await loc.first().boundingBox());
const union = (bs, pad) => {
  const x = Math.min(...bs.map((b) => b.x)) - pad, y = Math.min(...bs.map((b) => b.y)) - pad;
  const r = Math.max(...bs.map((b) => b.x + b.width)) + pad, btm = Math.max(...bs.map((b) => b.y + b.height)) + pad;
  return { x, y, width: r - x, height: btm - y };
};

/**
 * Capture pleine page puis recadrage autour des zones `anchorLocs` ; `focusLocs`
 * = zone mise en évidence. `clipLoc` (optionnel) recadre en plus sur un élément
 * (ex. le panneau d'une modale, sans son fond), au même ratio que le format.
 */
async function shoot(page, fmt, id, focusLocs, anchorLocs = focusLocs, clipLoc) {
  await page.mouse.move(1, 1); // aucun état hover parasite dans la capture
  await page.waitForTimeout(900);
  const { width, cropH } = FORMATS[fmt];
  const pageH = await page.evaluate(() => document.documentElement.scrollHeight);
  const focus = union(await Promise.all(focusLocs.map(box)), 8);
  const anchor = union(await Promise.all(anchorLocs.map(box)), 0);
  // Coordonnées absolues (page entière) : boundingBox est relatif au viewport.
  const scrollY = await page.evaluate(() => window.scrollY);
  focus.y += scrollY; anchor.y += scrollY;
  let area;
  if (clipLoc) {
    const c = await box(clipLoc);
    area = { x: c.x, y: c.y + scrollY, w: c.width, h: Math.round((c.width * cropH) / width) };
  } else {
    const top = Math.max(0, Math.min(pageH - cropH, Math.round(anchor.y + anchor.height / 2 - cropH / 2)));
    area = { x: 0, y: top, w: width, h: cropH };
  }
  const png = path.join(TMP, `${id}-${fmt}.png`);
  await page.screenshot({ path: png, fullPage: true });
  const webp = path.join(OUT, `${id}-${fmt}.webp`);
  execFileSync('python3', ['-I', '-c',
    'import sys;from PIL import Image;im=Image.open(sys.argv[1]);s=2;x,y,w,h,W,H=map(float,sys.argv[3:9]);'
    + 'im.crop((int(x*s),int(y*s),int((x+w)*s),int((y+h)*s))).resize((int(W*s),int(H*s)),Image.LANCZOS).save(sys.argv[2],"WEBP",quality=82,method=6)',
    png, webp, ...[area.x, area.y, area.w, area.h, width, cropH].map(String)]);
  const pct = (v, d) => +(100 * v / d).toFixed(1);
  console.log(`${id} ${fmt}: focus { x: ${pct(focus.x - area.x, area.w)}, y: ${pct(focus.y - area.y, area.h)}, w: ${pct(focus.width, area.w)}, h: ${pct(focus.height, area.h)} }`);
}

async function run(fmt) {
  const browser = await chromium.launch();
  const { width, height } = FORMATS[fmt];
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto(URL);
  await page.fill('#password', process.env.HOME_STORY_PASSWORD || 'tisseoiv');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2000);

  const search = page.getByPlaceholder('Rechercher un lieu...');
  await search.fill('Arènes');
  const lieuCard = page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'Arènes', exact: true }) });
  const suggestions = [search, page.getByText('Arènes Romaines').first()];
  await shoot(page, fmt, '01-lieu', suggestions,
    fmt === 'desktop' ? [page.getByRole('heading', { name: 'Tableau de Bord des Audits' }), ...suggestions] : suggestions);

  await lieuCard.click();
  const datModule = page.getByRole('button', { name: /DAT/ }).filter({ hasText: 'Progression' }).first();
  await shoot(page, fmt, '02-module', [datModule]);

  await datModule.click();
  await page.waitForTimeout(800);
  await page.getByText('DAT 01').click();

  // Un vrai contrôle : 7 repères conformes, 1 à remplacer, 1 absent.
  const rows = page.locator('main ul > li');
  const mark = async (i, name) => { await rows.nth(i).getByRole('button', { name }).click(); await page.waitForTimeout(250); };
  for (const i of [0, 1, 2, 3, 4, 6, 7]) await mark(i, /^OK$/);
  await mark(5, /remplacer/);
  await mark(8, /Absent/);
  await page.fill('textarea', 'Repère 6 décollé sur le bord droit, illisible. Numéro du DAT absent.');
  const row6 = page.locator('main ul > li').nth(5);
  await row6.scrollIntoViewIfNeeded();
  await shoot(page, fmt, '04-anomalie', [row6], fmt === 'desktop' ? [row6, page.locator('main ul > li').nth(8)] : [row6]);

  await page.getByRole('button', { name: 'Accueil' }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Ouvrir le cockpit signalétique' }).click();
  await page.waitForTimeout(1200);
  const card = [page.getByText('Signalétique IV', { exact: true }), page.getByRole('button', { name: 'Voir le détail' })];
  const cockpitTitle = page.getByRole('heading', { name: 'Cockpit Signalétique' });
  await shoot(page, fmt, '05-synthese', card, [cockpitTitle, ...card]);

  const tab = page.getByRole('button', { name: /Analyse des anomalies/ });
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await page.getByText(/^urgent$/i).waitFor({ timeout: 10000 });
  const prio = [page.getByText(/^urgent$/i), page.getByText(/^unité$/i).nth(1), page.getByRole('button', { name: /Voir la fiche référence/ }).nth(1)];
  await shoot(page, fmt, '06-priorite', prio, [cockpitTitle, ...prio]);

  // Liste d'intervention réelle (MaintenanceListModal), exportable en CSV.
  await page.getByRole('button', { name: /Voir en liste/ }).click();
  const dialog = page.getByRole('dialog');
  // Zone : des badges de ligne aux libellés des repères ; cadrage : de l'en-tête à l'export.
  const listRows = [dialog.getByText('Arènes', { exact: true }).first(), dialog.getByText(/Repère 6 - Adhésif/), dialog.getByText(/Repère 9 - « Numéro »/)];
  await listRows[2].waitFor();
  const firstBadge = dialog.getByText('A', { exact: true }).first();
  await shoot(page, fmt, '07-liste', [firstBadge, ...listRows], undefined, dialog.locator(':scope > div').first());
  await browser.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const fmt of Object.keys(FORMATS)) await run(fmt);
})();
