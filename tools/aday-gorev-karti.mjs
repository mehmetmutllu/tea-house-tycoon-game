/**
 * aday-gorev-karti.mjs — 1.0.7 arayüz turu: alt görev kartının BİÇİM adayları.
 * Oyun aynı duruma getirilir (Salon 2, "4. Masayı aç" — fiyatlı görev), her aday CSS olarak canlı
 * oyuna enjekte edilir ve AYNI kadrajda çekilir (feedback_show_dont_ask). Kod değişmez; seçilen aday
 * sonra hud.css'e yazılır.
 *
 * Koşu: node tools/aday-gorev-karti.mjs   (kendi vite sunucusunu 5302'de kaldırır)
 * Çıktı: docs/tasarim/1.0.7/gorev-karti/<harf>.png
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { sunucuKomutu, hazirSinyali, sunucuyuBekle, adres } from './duman.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.ADAY_PORT || 5302);
const URL = adres(PORT);
const CIKTI = path.join(KOK, 'docs/tasarim/1.0.7/gorev-karti');
mkdirSync(CIKTI, { recursive: true });

// Her aday yalnız BİÇİM değiştirir (konum, şekil, bilgi düzeni); renk dili D-168'de kilitli.
export const ADAYLAR = {
  A: { ad: 'Bugünkü', css: '/* değişiklik yok */' },
  B: {
    ad: 'İnce hap',
    css: `
      .band{min-height:46px;padding:4px 6px 4px 4px;border-radius:999px;left:34px;right:34px;gap:8px}
      .band-photo{width:36px;height:36px;border-radius:50%}
      .band-photo>*{transform:scale(.85)}
      .band-kicker,.band-reward{display:none}
      .band-body{flex-direction:row;align-items:center;justify-content:space-between;gap:8px}
      .band-title{font-size:15px}
      .band-go{width:32px;height:32px}`,
  },
  C: {
    ad: 'Taşan ikon',
    css: `
      .band{overflow:visible;padding-left:86px;min-height:66px}
      .band-photo{position:absolute;left:8px;bottom:8px;width:70px;height:70px;border-radius:20px;
        transform:rotate(-5deg);box-shadow:0 5px 0 var(--ot)}
      .band-photo>*{transform:scale(1.45)}
      .band-reward{position:absolute;top:-14px;right:54px}
      .band-go{width:42px;height:42px}
      .band-go svg{width:24px;height:24px}`,
  },
  D: {
    ad: 'Üstte bayrak',
    css: `
      .band{bottom:auto;top:calc(var(--sat) + 104px);left:64px;right:64px;min-height:50px;
        border-radius:16px;padding:4px 8px 4px 6px}
      .band-photo{width:38px;height:38px}
      .band-photo>*{transform:scale(.85)}
      .band-reward{display:none}`,
  },
  E: {
    ad: 'Sol kenar kartı',
    css: `
      .band{left:10px;right:auto;width:124px;bottom:auto;top:calc(var(--sat) + 150px);
        flex-direction:column;align-items:center;text-align:center;padding:12px 8px 10px;gap:6px;overflow:visible}
      .band-photo{width:58px;height:58px}
      .band-photo>*{transform:scale(1.2)}
      .band-body{align-items:center}
      .band-title{white-space:normal;font-size:14px;text-align:center}
      .band-kicker{font-size:10px}
      .band-go{position:absolute;top:-10px;right:-10px;width:32px;height:32px}`,
  },
  F: {
    ad: 'Çaycı söylüyor',
    css: `
      .band{left:96px;overflow:visible;border-radius:20px 20px 20px 4px}
      .band::before{content:'';position:absolute;left:-92px;bottom:-22px;width:92px;height:110px;
        background:url(/assets/ui/ikon/cayci.webp) center bottom/contain no-repeat;pointer-events:none}
      .band-photo{display:none}
      .band-reward{position:absolute;top:-14px;right:44px}`,
  },
  G: {
    ad: 'Sekmeli + GİT',
    css: `
      .band{overflow:visible;border-top-left-radius:6px}
      .band-kicker{position:absolute;top:-25px;left:-3px;padding:3px 12px 2px;border-radius:12px 12px 0 0;
        background:linear-gradient(180deg,var(--kart),var(--kart2));border:3px solid var(--ot);border-bottom:none;
        color:var(--tx2)}
      .band-go{width:auto;height:38px;border-radius:12px;padding:0 10px 0 12px;gap:2px;display:flex;align-items:center}
      .band-go::before{content:'GİT';font-family:var(--font-num);font-size:17px;color:var(--ot);line-height:1;padding-top:3px}`,
  },
  H: {
    ad: 'Navla birleşik',
    css: `
      .band{left:0;right:0;bottom:calc(var(--sab) + 71px);border-radius:18px 18px 0 0;border-bottom:none;
        padding:8px 14px 8px 12px;min-height:60px;animation:none}`,
  },
  I: {
    ad: 'İki katlı kart',
    css: `
      .band{display:grid;grid-template-columns:48px 1fr auto auto;grid-template-areas:
        "p k r g" "p t r g" "s s s s";column-gap:10px;row-gap:2px;padding:8px 10px 8px 8px}
      .band-body{display:contents}
      .band-photo{grid-area:p;width:48px;height:48px}
      .band-kicker{grid-area:k;align-self:end}
      .band-title{grid-area:t}
      .band-reward{grid-area:r}
      .band-go{grid-area:g;width:36px;height:36px}
      .band-sub,.band-track{grid-area:s;margin-top:6px;justify-content:center;padding:4px 0;border-radius:var(--rr);
        background:var(--oyuk);border:2px solid var(--ot)}
      .band-track{height:22px;padding:0}`,
  },
  J: {
    ad: 'Kontursuz (tam ekran dili)',
    css: `
      .band{border:none;background:#fbf8ff;color:#2a1f4d;border-radius:22px;
        box-shadow:0 8px 22px rgba(30,15,70,.32),0 2px 0 rgba(30,15,70,.18);padding:8px 10px 8px 8px}
      .band-photo{border:none;background:#ece6fb;border-radius:16px}
      .band-title{color:#2a1f4d}
      .band-kicker{color:#7a6aa8}
      .band-sub{color:#b0610a}
      .band-reward{border:none;background:#ece6fb;color:#b0610a}
      .band-go{border:none;box-shadow:0 3px 0 #b8740c}`,
  },
};

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
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(CIKTI, `${harf}.png`) });
  await h.evaluate((el) => el.remove());
  console.log(`  ${harf} · ${ad}`);
}
console.log(`sayfa hatası: ${hata}`);
await browser.close();
indir();
process.exit(0);
