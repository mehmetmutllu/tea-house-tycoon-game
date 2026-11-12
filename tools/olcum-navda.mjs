// olcum-navda.mjs — D-177: alt menü açık ekranlarda menünün EN ÜSTTE ve dokunulur olduğu, gövde payının menü boyuna
// eşit olduğu ve sekme geçişi — dört ekran boyunda. Koşu: node tools/olcum-navda.mjs
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { sunucuKomutu, hazirSinyali, sunucuyuBekle, adres } from './duman.mjs';
const PORT = 5321, URL = adres(PORT);
const { dosya, argv } = sunucuKomutu(PORT, 'dev', KOK);
const sv = spawn(dosya, argv, { cwd: KOK, stdio: ['ignore', 'pipe', 'pipe'] });
process.on('exit', () => sv.kill());
await hazirSinyali(sv); await sunucuyuBekle(URL, { toplamMs: 15000 });
const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [ad, vp] of [['390x844', [390, 844]], ['360x640', [360, 640]], ['yatay', [844, 390]], ['tablet', [820, 1180]]]) {
  const ctx = await br.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'tr-TR' });
  const p = await ctx.newPage();
  await p.goto(URL); await p.waitForFunction(() => typeof window.__game === 'function', null, { timeout: 60000 });
  await p.waitForSelector('[data-testid="kafe-adi"]', { timeout: 8000 }).then(async () => { await p.fill('[data-testid="kafe-adi-girdi"]', 'X'); await p.click('[data-testid="kafe-adi-tamam"]'); }).catch(() => {});
  await p.waitForSelector('[data-testid="ogretici-atla"]', { timeout: 8000 }).then(() => p.click('[data-testid="ogretici-atla"]')).catch(() => {});
  await p.click('[data-testid="quests"]'); await p.waitForSelector('[data-testid="quests-panel"]'); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const n = document.querySelector('.botnav').getBoundingClientRect();
    const b = document.querySelector('[data-testid="quests-panel"]').getBoundingClientRect();
    const ust = document.elementFromPoint(n.left + n.width / 2, n.top + n.height / 2);
    const govde = document.querySelector('[data-testid="quests-panel"] .sheet-body');
    return { navH: +n.height.toFixed(1), menuUstte: !!ust?.closest('.botnav'), zeminAlt: b.bottom,
      govdePayi: parseFloat(getComputedStyle(govde).paddingBottom), geri: !!document.querySelector('[data-testid="quests-panel"] .sheet-back') };
  });
  console.log(ad, JSON.stringify(r));
  await p.screenshot({ path: path.join(process.env.OLCUM_CIKTI || process.env.TEMP, `navda-${ad}.png`) });
  await p.click('[data-testid="shop"]'); await p.waitForSelector('[data-testid="shop-panel"]');
  const gecis = await p.$('[data-testid="quests-panel"]');
  await p.click('[data-testid="shop"]'); await p.waitForSelector('[data-testid="shop-panel"]', { state: 'detached' });
  console.log(ad, 'sekme geçişi:', gecis ? 'görevler hâlâ açık!' : 'tamam', '· aynı sekme kapattı');
  await ctx.close();
}
await br.close(); sv.kill(); process.exit(0);
