// İngilizce duman (i18n bekçisi, 2026-09-28): tarayıcı dili en-US → oyun İngilizce açılır. Panellerin hepsi
// gezilir; ekrandaki metinde Türkçe harf (çğıöşü…) kalan satır = çevrilmemiş metin. Kafe adı (oyuncunun
// yazdığı) hariç. `tools/duman.mjs` smoke.mjs'ten sonra bunu da koşar.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

// Sözlüğün Türkçe anahtarları: ekranda BİREBİR görünen anahtar = çevrilmemiş metin (Türkçe harfi olmasa da).
const SOZLUK = new Map(
  [...readFileSync(new globalThis.URL('../src/i18n/en.ts', import.meta.url), 'utf8').matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*"),?\s*$/gm)]
    .map((m) => [JSON.parse(m[1]), JSON.parse(m[2])])
    .filter(([tr, en]) => tr !== en && !/\{\d\}/.test(tr)),
);

const URL = process.env.SMOKE_URL || 'http://localhost:5173/';
const TR_HARF = /[çğıöşüÇĞİÖŞÜ]/;
const sonuc = [];
const pass = (m) => sonuc.push(['PASS', m]);
const fail = (m) => sonuc.push(['FAIL', m]);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, locale: 'en-US' });
const hatalar = [];
page.on('console', (m) => m.type() === 'error' && hatalar.push(m.text()));
page.on('pageerror', (e) => hatalar.push('pageerror: ' + e.message));

const kacak = new Map(); // metin → ilk görüldüğü yer
async function tara(yer) {
  const satirlar = await page.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('[data-kafe-adi],[class^="dsb"],[lang="tr"]') || getComputedStyle(el).display === 'none') continue;
      const s = n.textContent.trim();
      if (s) out.push(s);
    }
    for (const el of document.querySelectorAll('[aria-label],[title],input[placeholder]')) if (!el.closest('[class^="dsb"]'))
      for (const a of ['aria-label', 'title', 'placeholder']) if (el.getAttribute(a)) out.push(el.getAttribute(a));
    return out;
  });
  // Yüzde Türkçe biçimde (%5) kalmışsa da kaçak: İngilizcede 5%.
  for (const s of satirlar) if ((TR_HARF.test(s) || SOZLUK.has(s) || /(^|[\s+(])%\d/.test(s)) && !s.includes('Çınar') && !kacak.has(s)) kacak.set(s, yer);
}
async function seviyeKapat() {
  for (let i = 0; i < 20; i++) {
    const ok = await page.$('[data-testid="level-up-ok"]');
    if (!ok) return;
    await ok.click();
    await page.waitForTimeout(50);
  }
}
async function tikla(sel) {
  await seviyeKapat();
  const el = await page.$(sel);
  if (!el) return false;
  await el.click();
  await page.waitForTimeout(150);
  return true;
}
async function sekmeleriGez(panel, sekme) {
  const ids = await page.$$eval(sekme, (els) => els.map((e) => e.getAttribute('data-testid')));
  for (const id of ids) {
    await tikla(`[data-testid="${id}"]`);
    await tara(`${panel} › ${id}`);
  }
}

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 40000 });
  await page.waitForFunction(() => typeof window.__game === 'function', { timeout: 10000 });
  const lang = await page.evaluate(() => document.documentElement.lang);
  if (lang === 'en') pass('Tarayıcı en-US → oyun dili en');
  else fail(`Oyun dili en değil: ${lang}`);

  await tara('açılış (kafe adı)');
  if (await page.$('[data-testid="kafe-adi"]')) {
    await page.fill('[data-testid="kafe-adi-girdi"]', 'Çınar');
    await page.click('[data-testid="kafe-adi-tamam"]');
    await page.waitForTimeout(200);
  }
  await tara('öğretici');
  await tikla('[data-testid="ogretici-atla"]');
  await page.evaluate(() => window.__advanceTime(20));
  await tara('HUD başlangıç');

  // Geç döneme sar: omurga pad'leri + para → yükseltme/mağaza/hedef metinleri görünür.
  await page.evaluate(() => {
    window.__addMoney(1e7);
    window.__setState({ diamonds: 500 });
    window.__advanceTime(120);
  });
  await tara('HUD geç');

  const paneller = [
    ['char', 'char-panel', '[data-testid^="char-tab-"]'],
    ['goals', 'goals-panel', null],
    // G-120 M2: günlükler ve tamamlananlar katlı — açılıp taranır.
    ['quests', 'quests-panel', '[data-testid="gunluk-ozet"], [data-testid="tamam-ozet"]'],
    ['shop', 'shop-panel', '[data-testid^="shop-tab-"]'],
    ['gear', 'menu', null],
  ];
  for (const [ac, panel, sekme] of paneller) {
    if (!(await tikla(`[data-testid="${ac}"]`))) {
      fail(`Panel düğmesi yok: ${ac}`);
      continue;
    }
    await tara(panel);
    if (sekme) await sekmeleriGez(panel, sekme);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // Ayarlar › Dil: elle Türkçe → sayfa yeniden yüklenir ve Türkçe açılır; tercih kayıtta kalır.
  await tikla('[data-testid="gear"]');
  await Promise.all([page.waitForEvent('load', { timeout: 20000 }), page.click('[data-testid="set-dil-tr"]')]);
  await page.waitForFunction(() => typeof window.__game === 'function', null, { timeout: 40000 });
  const trSonra = await page.evaluate(() => ({ lang: document.documentElement.lang, dil: JSON.parse(localStorage.getItem('kiraathane.save')).settings.dil }));
  if (trSonra.lang === 'tr' && trSonra.dil === 'tr') pass('Ayarlar › Dil › Türkçe: yeniden yüklendi, oyun Türkçe (tarayıcı en-US iken)');
  else fail(`Dil seçimi işlemedi: ${JSON.stringify(trSonra)}`);

  if (kacak.size === 0) pass('İngilizce kipte ekranda Türkçe harfli metin yok');
  else fail(`İngilizce kipte ${kacak.size} Türkçe metin:\n` + [...kacak].map(([s, y]) => `      [${y}] ${s}`).join('\n'));
  const gercekHata = hatalar.filter((h) => !/favicon|ERR_FILE_NOT_FOUND|404/.test(h));
  if (gercekHata.length === 0) pass('İngilizce koşuda konsol hatası yok');
  else fail(`Konsol hatası: ${gercekHata.slice(0, 5).join(' | ')}`);
} catch (e) {
  fail('İngilizce duman çöktü: ' + e.message);
} finally {
  await browser.close();
}

for (const [d, m] of sonuc) console.log(`${d === 'PASS' ? '✓' : '✗'} ${m}`);
const kotu = sonuc.filter(([d]) => d === 'FAIL').length;
console.log(`\nİngilizce duman: ${sonuc.length - kotu}/${sonuc.length}`);
process.exit(kotu ? 1 : 0);
