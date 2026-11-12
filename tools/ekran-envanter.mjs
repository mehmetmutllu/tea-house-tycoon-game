/**
 * ekran-envanter.mjs — Sprint B Faz 1: arayüzün tüm ekranlarını iki boyda × iki dilde çeker,
 * her ekranın DOM'undan bileşen sayımı + en uzun metni çıkarır, 390×844-TR kontakt sayfasını kurar.
 *
 * Koşu: node tools/ekran-envanter.mjs   (kendi vite sunucusunu 5301'de kaldırır, sonunda indirir)
 * Çıktı: docs/tasarim/sprint-B/ekranlar/<boyut>-<dil>-<ekran>.png · sahne-temiz.png
 *        docs/tasarim/sprint-B/kontakt-tr.png · ENVANTER_HAM (json, varsayılan scratch/ham)
 * Sunucu duman.mjs'in kalıbıyla açılır (doğrudan vite.js, --strictPort, "ready in" sinyali).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { sunucuKomutu, hazirSinyali, sunucuyuBekle, adres } from './duman.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.ENVANTER_PORT || 5301);
const URL = adres(PORT);
const CIKTI = path.join(KOK, 'docs/tasarim/sprint-B/ekranlar');
const KONTAKT = path.join(KOK, 'docs/tasarim/sprint-B/kontakt-tr.png');
const HAM = process.env.ENVANTER_HAM || path.join(KOK, 'docs/sprintler/sprint-B/envanter-ham.json');
mkdirSync(CIKTI, { recursive: true });
mkdirSync(path.dirname(HAM), { recursive: true });

const BOYUTLAR = [
  ['390x844', { width: 390, height: 844 }],
  ['360x640', { width: 360, height: 640 }],
];
const DILLER = [['tr', 'tr-TR'], ['en', 'en-US']];

const ham = {}; // `${boyut}-${dil}` → ekran → { bilesen, enUzun }
const notlar = [];
const hataSayisi = {};

// ---------- sunucu ----------
const { dosya, argv } = sunucuKomutu(PORT, 'dev', KOK);
const sunucu = spawn(dosya, argv, { cwd: KOK, stdio: ['ignore', 'pipe', 'pipe'] });
sunucu.stderr.on('data', (d) => process.stderr.write(`  [vite] ${d}`));
const indir = () => { try { sunucu.kill(); } catch { /* zaten kapalı */ } };
process.on('exit', indir);
if ((await hazirSinyali(sunucu)) !== 'hazir' || !(await sunucuyuBekle(URL, { toplamMs: 15000 }))) {
  console.error(`envanter: vite ${URL} ayağa kalkmadı (port dolu olabilir — ENVANTER_PORT)`);
  process.exit(1);
}
console.log(`envanter: sunucu ${URL}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'],
});

// ---------- DOM sondası: ekrandaki bileşen sayımı + en uzun metin ----------
function sonda(kokSecici) {
  const kok = (kokSecici && document.querySelector(kokSecici)) || document.body;
  const gorunur = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0;
  };
  const tum = [...kok.querySelectorAll('*')].filter(gorunur).filter((el) => !el.closest('canvas'));
  const sinif = {};
  for (const el of tum) for (const c of el.classList) sinif[c] = (sinif[c] || 0) + 1;
  const dugme = {};
  for (const b of tum.filter((e) => e.tagName === 'BUTTON')) {
    const k = `${b.classList[0] || '(sınıfsız)'}${b.disabled ? ' [devre dışı]' : ''}`;
    dugme[k] = (dugme[k] || 0) + 1;
  }
  const metinler = [];
  const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement;
    if (!el || !gorunur(el)) continue;
    const s = n.textContent.replace(/\s+/g, ' ').trim();
    if (s.length > 1) metinler.push(s);
  }
  // Bloğun toplam metni (satır içi parçalar birleşik) — taşma payı için asıl ölçü bu.
  const bloklar = tum
    .filter((el) => /^(BUTTON|P|LI|H\d|SPAN|DIV|B|STRONG|LABEL)$/.test(el.tagName))
    .filter((el) => ![...el.children].some((c) => /^(DIV|P|LI|BUTTON)$/.test(c.tagName)))
    .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 1);
  const uzun = [...new Set([...metinler, ...bloklar])].sort((a, b) => b.length - a.length).slice(0, 3);
  return { sinif, dugme, enUzun: uzun };
}

for (const [boyut, vp] of BOYUTLAR) {
  for (const [dil, locale] of DILLER) {
    const anah = `${boyut}-${dil}`;
    const ekranlar = (ham[anah] = {});
    hataSayisi[anah] = 0;
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') { hataSayisi[anah]++; notlar.push(`[${anah}] konsol: ${m.text().slice(0, 160)}`); } });
    page.on('pageerror', (e) => { hataSayisi[anah]++; notlar.push(`[${anah}] pageerror: ${e.message.slice(0, 160)}`); });

    const ev = (fn, arg) => page.evaluate(fn, arg);
    const var_ = async (sel) => !!(await page.$(sel));
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
    const cek = async (ekran, kok) => {
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(CIKTI, `${anah}-${ekran}.png`) });
      if (boyut === '390x844') ekranlar[ekran] = await ev(sonda, kok ?? null);
      console.log(`  ${anah}-${ekran}`);
    };
    const dene = async (ekran, fn) => {
      try { await fn(); } catch (e) { notlar.push(`[${anah}] ${ekran} çekilemedi: ${String(e.message).split('\n')[0]}`); }
    };
    const tikla = async (sel) => { await kapatAcik(); await page.click(sel, { timeout: 5000 }); };
    // D-177: alt menüdeki ekranlar açık sekmeye yeniden dokunarak kapanır; Ayarlar'da geri düğmesi var.
    const SEKME = { 'quests-panel': 'quests', 'goals-panel': 'goals', 'shop-panel': 'shop', 'char-panel': 'char' };
    const geri = async (panel) => {
      await page.click(SEKME[panel] ? `[data-testid="${SEKME[panel]}"]` : `[data-testid="${panel}"] .sheet-back`);
      await page.waitForSelector(`[data-testid="${panel}"]`, { state: 'detached', timeout: 5000 });
    };

    // 1) YÜKLEME EKRANI — açılışın ilk anı.
    await page.goto(URL, { waitUntil: 'commit', timeout: 60000 });
    await dene('yukleme', async () => {
      await page.waitForSelector('.splash .splash__logo', { timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      if (!(await var_('.splash:not(.splash--out)'))) throw new Error('yükleme ekranı çok erken kapandı');
      await page.screenshot({ path: path.join(CIKTI, `${anah}-yukleme.png`) });
      if (boyut === '390x844') ekranlar.yukleme = await ev(sonda, '.splash');
      console.log(`  ${anah}-yukleme`);
    });
    await page.waitForSelector('canvas', { timeout: 60000 });
    await page.waitForFunction(() => typeof window.__game === 'function', null, { timeout: 20000 });
    await page.waitForSelector('.splash', { state: 'detached', timeout: 15000 }).catch(() => {});

    // 2) KAFE ADI KUTUSU (yeni oyunda ilk iş).
    await dene('kafe-adi', async () => {
      await page.waitForSelector('[data-testid="kafe-adi"]', { timeout: 8000 });
      await cek('kafe-adi', '[data-testid="kafe-adi"]');
      await page.fill('[data-testid="kafe-adi-girdi"]', dil === 'tr' ? 'Çınar Kahvesi' : 'Plane Tree Café');
      await page.click('[data-testid="kafe-adi-tamam"]');
    });

    // 3) ÖĞRETİCİ (ad kutusundan sonra "yürü" adımı).
    await dene('ogretici', async () => {
      await page.waitForSelector('[data-testid="ogretici"]', { timeout: 8000 });
      await cek('ogretici', '[data-testid="ogretici"]');
      await page.click('[data-testid="ogretici-atla"]');
    });

    // 4) İLERLET — duman testinin omurgası: görev → pad'e ışınla → sar.
    await ev(() => { let g = window.__advanceTime(15); for (let i = 0; i < 20 && g.waitingCount === 0; i++) g = window.__advanceTime(1); });
    for (const [q, pad] of [['q_table2', 'table2'], ['q_table3', 'table3'], ['q_waiter', 'waiter'], ['q_table4', 'table4'],
      ['q_waiter2', 'waiter2'], ['q_zone2', 'zone2'], ['q_z2table2', 'z2table2'], ['q_z2table3', 'z2table3'], ['q_dish', 'dishwasher']]) {
      await ev((q) => window.__setQuest(q), q);
      await ev(() => window.__addMoney(3000));
      const g = await ev(() => window.__game());
      if (g.currentPad === pad && g.padPos) {
        await ev((p) => window.__teleport(p[0], p[2]), g.padPos);
        await ev(() => window.__advanceTime(8));
      } else notlar.push(`[${anah}] pad ${pad} görünmedi (currentPad=${g.currentPad})`);
      await kapatAcik();
    }
    await ev(() => window.__park());
    await ev(() => window.__advanceTime(25));
    await ev(() => window.__setState({ wallet: 48250, diamonds: 140, xp: Math.max(window.__game().xp ?? 0, 4000) }));
    await kapatAcik();
    const g0 = await ev(() => window.__game());
    await ev((p) => window.__teleport(p[0], p[2]), g0.stationPos);
    await ev(() => window.__advanceTime(0.3));
    await ev(() => window.__park());
    await ev(() => window.__advanceTime(2));
    await kapatAcik();
    notlar.push(`[${anah}] ilerleme: masa=${g0.tables} padsDone=${(g0.padsDone || []).length} görev=${g0.quest?.id}`);

    // 5) OYUN İÇİ HUD.
    await dene('hud', async () => { await page.waitForTimeout(800); await kapatAcik(); await cek('hud', '[data-testid="hud"]'); });

    // 5b) TEMİZ SAHNE — yalnız 390×844 TR, arayüz gizli.
    if (anah === '390x844-tr') {
      await dene('sahne-temiz', async () => {
        await page.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}', }).then(async (h) => {
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(CIKTI, 'sahne-temiz.png') });
          await page.click('[data-testid="cam-zoom"]', { force: true }).catch(() => {});
          await page.waitForTimeout(1200);
          await page.screenshot({ path: path.join(CIKTI, 'sahne-temiz-genis.png') });
          await page.click('[data-testid="cam-zoom"]', { force: true }).catch(() => {});
          await page.waitForTimeout(800);
          await h.evaluate((el) => el.remove());
        });
      });
    }

    // 6) GÖREVLER · HEDEFLER.
    await dene('gorevler', async () => {
      await tikla('[data-testid="quests"]');
      await page.waitForSelector('[data-testid="quests-panel"]', { timeout: 5000 });
      await cek('gorevler', '[data-testid="quests-panel"]');
      await geri('quests-panel');
    });
    await dene('hedefler', async () => {
      await tikla('[data-testid="goals"]');
      await page.waitForSelector('[data-testid="goals-panel"]', { timeout: 5000 });
      await cek('hedefler', '[data-testid="goals-panel"]');
      await geri('goals-panel');
    });

    // 7) MAĞAZA — her sekme.
    await dene('magaza', async () => {
      await tikla('[data-testid="shop"]');
      await page.waitForSelector('[data-testid="shop-panel"]', { timeout: 5000 });
      for (const [k, ad] of [['outfit', 'kiyafet'], ['tray', 'tepsi'], ['decor', 'dekor'], ['table', 'masa'], ['floor', 'zemin'], ['wall', 'duvar'], ['paket', 'paketler']]) {
        await dene(`magaza-${ad}`, async () => {
          await page.click(`[data-testid="shop-tab-${k}"]`, { timeout: 4000 });
          await page.waitForTimeout(900); // önizleme tuvali çizsin
          await cek(`magaza-${ad}`, '[data-testid="shop-panel"]');
        });
      }
      // 8) SATIN ALMA ÖDÜLÜ — Paketler'den sahte mağazayla 💎 al.
      await dene('satin-odul', async () => {
        const al = '[data-testid="paket-al-kiraathane_elmas_25"]';
        await page.waitForSelector(`${al}:not([disabled])`, { timeout: 6000 });
        await page.click(al);
        await page.waitForSelector('[data-testid="satin-odul"]', { timeout: 6000 });
        await cek('satin-odul', '[data-testid="satin-odul"]');
        await page.click('[data-testid="satin-odul-tamam"]');
      });
      await geri('shop-panel');
    });

    // 9) ÇAYCI PANELİ — oyuncu / garson / bulaşıkçı.
    await dene('cayci', async () => {
      await tikla('[data-testid="char"]');
      await page.waitForSelector('[data-testid="char-panel"]', { timeout: 5000 });
      for (const [k, ad] of [['player', 'oyuncu'], ['waiter', 'garson'], ['dish', 'bulasikci']]) {
        await dene(`cayci-${ad}`, async () => {
          if (await var_(`[data-testid="char-tab-${k}"]`)) await page.click(`[data-testid="char-tab-${k}"]`);
          else if (k !== 'player') throw new Error(`sekme yok (char-tab-${k}) — personel tutulmamış`);
          await page.waitForTimeout(900);
          await cek(`cayci-${ad}`, '[data-testid="char-panel"]');
        });
      }
      await geri('char-panel');
    });

    // 10) AYARLAR.
    await dene('ayarlar', async () => {
      await tikla('[data-testid="gear"]');
      await page.waitForSelector('[data-testid="menu"]', { timeout: 5000 });
      await cek('ayarlar', '[data-testid="menu"]');
      await geri('menu');
    });

    // 11) ÖDÜL MODALI (RewardModal — seviye ekranı).
    await dene('odul', async () => {
      await kapatAcik();
      await ev(() => window.__setState({ levelUp: { level: 9, amount: 1250, carryBefore: 0.02, carryAfter: 0.025 } }));
      await page.waitForSelector('[data-testid="level-up"]', { timeout: 5000 });
      await page.waitForSelector('[data-testid="level-up-izle"]:not([disabled])', { timeout: 5000 }).catch(() => {});
      await cek('odul', '[data-testid="level-up"]');
      await page.click('[data-testid="level-up-ok"]');
    });

    // 12) VİDEO KARTI (sağ kenar "reklam izle" düğmesi; seviye ≥ 5).
    await dene('video', async () => {
      await kapatAcik();
      await page.waitForSelector('[data-testid="video-btn"]', { timeout: 5000 });
      await page.click('[data-testid="video-btn"]');
      await page.waitForSelector('[data-testid="video-kart"]', { timeout: 5000 });
      await cek('video', '[data-testid="video-kart"]');
      await page.mouse.click(8, 8);
      await page.waitForSelector('[data-testid="video-kart"]', { state: 'detached', timeout: 4000 }).catch(() => page.keyboard.press('Escape'));
    });

    // 13) USTA MODALI → 14) BAŞLANGIÇ TEKLİFİ (ilk Usta'dan sonra, noktadan ayrılınca).
    await dene('usta', async () => {
      await kapatAcik();
      const max = await ev(() => window.__game().tableMaxLevel);
      await ev((lv) => window.__setTableLevel(0, lv), max);
      await ev(() => window.__setState({ diamonds: 999 }));
      const spot = await ev(() => window.__game().tableUpgradeSpots[0]);
      await ev((p) => window.__teleport(p[0], p[2]), spot);
      await ev(() => window.__advanceTime(0.5));
      await page.waitForSelector('[data-testid="master-bar"]', { timeout: 6000 });
      await cek('usta', '[data-testid="master-bar"]');
      await page.click('[data-testid="master-buy"]');
    });
    await dene('teklif', async () => {
      await ev(() => window.__park());
      await page.waitForTimeout(1500);
      await kapatAcik();
      await page.waitForSelector('[data-testid="baslangic-teklif"]', { timeout: 15000 });
      await cek('teklif', '[data-testid="baslangic-teklif"]');
      await page.click('[data-testid="teklif-kapat"]');
    });

    await ctx.close();
  }
}

// ---------- kontakt sayfası (390×844 TR) ----------
const SIRA = ['yukleme', 'kafe-adi', 'ogretici', 'hud', 'gorevler', 'hedefler', 'magaza-kiyafet', 'magaza-tepsi', 'magaza-dekor',
  'magaza-masa', 'magaza-zemin', 'magaza-duvar', 'magaza-paketler', 'satin-odul', 'cayci-oyuncu', 'cayci-garson', 'cayci-bulasikci',
  'ayarlar', 'odul', 'video', 'usta', 'teklif'];
const varOlan = new Set(readdirSync(CIKTI));
const kareler = [...SIRA.map((e) => [e, `390x844-tr-${e}.png`]), ['sahne-temiz', 'sahne-temiz.png']].filter(([, f]) => varOlan.has(f));
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#1d1b22;font:600 13px system-ui;color:#eee;width:1600px}
.g{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;padding:12px}
figure{margin:0}img{width:100%;display:block;border-radius:6px}figcaption{padding:4px 2px;text-align:center}
</style><div class="g">${kareler.map(([e, f]) => `<figure><img src="${pathToFileURL(path.join(CIKTI, f)).href}"><figcaption>${e}</figcaption></figure>`).join('')}</div>`;
const kontaktHtml = path.join(path.dirname(HAM), '_kontakt.html');
writeFileSync(kontaktHtml, html);
const kp = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await kp.goto(pathToFileURL(kontaktHtml).href);
await kp.waitForFunction(() => [...document.images].every((i) => i.complete));
await kp.screenshot({ path: KONTAKT, fullPage: true });
await browser.close();

writeFileSync(HAM, JSON.stringify({ hataSayisi, notlar, ham }, null, 1));
console.log('konsol hataları:', JSON.stringify(hataSayisi));
console.log(notlar.filter((n) => !n.includes('konsol') && !n.includes('pageerror')).join('\n'));
indir();
process.exit(0);
