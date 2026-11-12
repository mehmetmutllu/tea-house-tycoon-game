/**
 * aday-ekran.mjs — 1.0.7 arayüz turu: TAM EKRAN KABUĞUNUN (Sheet.tsx: geri · başlık · cüzdan · gövde)
 * BİÇİM adayları. Her aday CSS olarak canlı oyuna enjekte edilir ve üç ekranda (Görevler · Çaycı ·
 * Mağaza) aynı durumda çekilir. Kod değişmez; seçilen aday sonra hud.css'e yazılır.
 *
 * Koşu: node tools/aday-ekran.mjs   ·   Çıktı: docs/tasarim/1.0.7/ekran/<harf>-<ekran>.png
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { sunucuKomutu, hazirSinyali, sunucuyuBekle, adres } from './duman.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.ADAY_PORT || 5304);
const URL = adres(PORT);
const CIKTI = path.join(KOK, 'docs/tasarim/1.0.7/ekran');
mkdirSync(CIKTI, { recursive: true });

const S = '.modal-card.screen';
const ADAYLAR = {
  A: { ad: 'Bugünkü', css: '/* değişiklik yok */' },
  B: {
    ad: 'Alt sayfa (oyun üstte görünür)',
    css: `
      .screen-backdrop{align-items:flex-end!important;background:rgba(20,10,40,.42)!important}
      ${S}{height:84%!important;border-radius:26px 26px 0 0!important;position:relative;box-shadow:0 -8px 26px rgba(20,10,40,.35)!important}
      ${S}::before{content:'';position:absolute;top:9px;left:50%;width:46px;height:5px;margin-left:-23px;border-radius:3px;background:var(--lila-ot);opacity:.3}
      ${S} .screen-top{padding-top:24px}`,
  },
  C: {
    ad: 'Koyu başlık bandı',
    css: `
      ${S} .screen-top{background:linear-gradient(180deg,#3d2f80,#2b2061);padding-bottom:14px;margin-bottom:12px;
        box-shadow:0 4px 0 rgba(20,10,50,.35)}
      ${S} .screen-title{color:#fff}`,
  },
  D: {
    ad: 'Ortada başlık, sağda kapat',
    css: `
      ${S} .screen-top{display:grid;grid-template-columns:40px 1fr 40px;grid-template-areas:". t b" "p p p";row-gap:8px}
      ${S} .sheet-back{grid-area:b;border-radius:50%}
      ${S} .sheet-back svg{transform:rotate(45deg) scale(.0)}
      ${S} .sheet-back::after{content:'✕';font-size:20px;font-weight:800;color:var(--lila-ot);position:absolute}
      ${S} .sheet-back{position:relative}
      ${S} .screen-title{grid-area:t;text-align:center}
      ${S} .screen-purse{grid-area:p;justify-self:center}`,
  },
  E: {
    ad: 'Pencere + kurdele başlık',
    css: `
      .screen-backdrop{background:rgba(20,10,40,.5)!important;padding:calc(var(--sat) + 44px) 12px calc(var(--sab) + 18px)!important}
      ${S}{height:auto!important;border-radius:28px!important;border:3px solid var(--lila-ot)!important;overflow:visible!important;
        box-shadow:0 6px 0 var(--lila-ot),0 14px 30px rgba(20,10,40,.4)!important}
      ${S} .screen-top{position:relative;padding-top:30px}
      ${S} .screen-title{position:absolute;top:-24px;left:50%;transform:translateX(-50%);flex:none;overflow:visible;
        padding:5px 28px 3px;border-radius:14px;border:3px solid var(--lila-ot)!important;background:linear-gradient(180deg,#ffd45e,#f2a51e);
        box-shadow:0 4px 0 var(--lila-ot);color:var(--lila-ot)}
      ${S} .screen-purse{margin-left:auto}`,
  },
  F: {
    ad: 'Alt menü açık kalır',
    css: `
      .screen-backdrop{bottom:calc(var(--sab) + 74px)!important;z-index:12!important}
      ${S} .sheet-back{visibility:hidden;width:0;margin-right:-10px}
      .botnav{z-index:30!important}`,
  },
  G: {
    ad: 'Büyük sola yaslı başlık',
    css: `
      ${S} .screen-top{flex-wrap:wrap;row-gap:4px}
      ${S} .sheet-back{order:1}
      ${S} .screen-purse{order:2;margin-left:auto}
      ${S} .screen-title{order:3;flex-basis:100%;font-size:34px;line-height:1.1;padding:2px 2px 4px}`,
  },
};
const EKRANLAR = [
  ['gorevler', '[data-testid="quests"]', '[data-testid="quests-panel"]'],
  ['cayci', '[data-testid="char"]', '[data-testid="char-panel"]'],
  ['magaza', '[data-testid="shop"]', '[data-testid="shop-panel"]'],
];

const { dosya, argv } = sunucuKomutu(PORT, 'dev', KOK);
const sunucu = spawn(dosya, argv, { cwd: KOK, stdio: ['ignore', 'pipe', 'pipe'] });
const indir = () => { try { sunucu.kill(); } catch { /* kapalı */ } };
process.on('exit', indir);
if ((await hazirSinyali(sunucu)) !== 'hazir' || !(await sunucuyuBekle(URL, { toplamMs: 15000 }))) {
  console.error(`aday: vite ${URL} kalkmadı (ADAY_PORT)`);
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'tr-TR' });
const page = await ctx.newPage();
let hata = 0;
page.on('pageerror', (e) => { hata++; console.error('pageerror', e.message.slice(0, 160)); });
const ev = (fn, arg) => page.evaluate(fn, arg);
const kapatAcik = async () => {
  for (let i = 0; i < 25; i++) {
    let tik = false;
    for (const s of ['[data-testid="level-up-ok"]', '[data-testid="ogretme-ok"]', '[data-testid="offline-ok"]',
      '[data-testid="goal-reward-ok"]', '[data-testid="daily-reward-ok"]']) {
      const el = await page.$(s);
      if (el) { await el.click().catch(() => {}); tik = true; await page.waitForTimeout(80); }
    }
    if (!tik) return;
  }
};

await page.goto(URL, { waitUntil: 'commit', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 60000 });
await page.waitForFunction(() => typeof window.__game === 'function', null, { timeout: 20000 });
await page.waitForSelector('.splash', { state: 'detached', timeout: 15000 }).catch(() => {});
await page.waitForSelector('[data-testid="kafe-adi"]', { timeout: 8000 }).then(async () => {
  await page.fill('[data-testid="kafe-adi-girdi"]', 'Çınar Kahvesi');
  await page.click('[data-testid="kafe-adi-tamam"]');
}).catch(() => {});
await page.waitForSelector('[data-testid="ogretici"]', { timeout: 8000 }).then(() => page.click('[data-testid="ogretici-atla"]')).catch(() => {});

await ev(() => { let g = window.__advanceTime(15); for (let i = 0; i < 20 && g.waitingCount === 0; i++) g = window.__advanceTime(1); });
for (const [q, pad] of [['q_table2', 'table2'], ['q_table3', 'table3'], ['q_waiter', 'waiter'], ['q_table4', 'table4'],
  ['q_waiter2', 'waiter2'], ['q_zone2', 'zone2'], ['q_z2table2', 'z2table2'], ['q_z2table3', 'z2table3'], ['q_dish', 'dishwasher']]) {
  await ev((q) => window.__setQuest(q), q);
  await ev(() => window.__addMoney(3000));
  const g = await ev(() => window.__game());
  if (g.currentPad === pad && g.padPos) {
    await ev((p) => window.__teleport(p[0], p[2]), g.padPos);
    await ev(() => window.__advanceTime(8));
  }
  await kapatAcik();
}
await ev(() => window.__setState({ wallet: 48250, diamonds: 140, xp: Math.max(window.__game().xp ?? 0, 4000) }));
const g0 = await ev(() => window.__game());
// Kadraj: Salon 2'nin ortası — sıradaki pad'in (4. masa) yanında, üstüne basmadan.
const p = g0.padPos ?? g0.stationPos;
await ev((p) => window.__teleport(p[0] + 2.2, p[2] + 1.2), p);
await ev(() => window.__advanceTime(20));
await ev(() => window.__park());
await kapatAcik();
console.log(`durum: görev=${g0.quest?.id} pad=${g0.currentPad}`);


for (const [harf, { ad, css }] of Object.entries(ADAYLAR)) {
  const h = await page.addStyleTag({ content: css });
  for (const [ekran, ac, panel] of EKRANLAR) {
    await kapatAcik();
    await page.click(ac, { timeout: 5000 });
    await page.waitForSelector(panel, { timeout: 5000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(CIKTI, `${harf}-${ekran}.png`) });
    await page.$eval(ac, (el) => el.click()); // D-177: açık sekme kapatır
    await page.waitForSelector(panel, { state: 'detached', timeout: 5000 });
  }
  await h.evaluate((el) => el.remove());
  console.log(`  ${harf} · ${ad}`);
}
console.log(`sayfa hatası: ${hata}`);
await browser.close();
indir();
process.exit(0);
