/**
 * kat2-varis-cek.mjs — Kat 2 VARIŞ turu: her aday (tools/kat2-varis.tsx) için iki kare —
 * GENİŞ (bütün kat, üstten eğik) + VARIŞ ANI (oyunun kendi takip kamerası, portre, HUD'la).
 * Sonra iki pano: docs/kareler/kat2-varis-pano.png (geniş) · kat2-varis-pano-oyun.png (oyun kamerası + iniş tetikleri).
 *
 * Koşu: node tools/kat2-varis-cek.mjs     ·  port: VARIS_PORT (varsayılan 4127)
 * Ham kareler: docs/tasarim/kat2-varis/
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.VARIS_PORT ?? 4127);
const OUT = path.join(KOK, 'docs/tasarim/kat2-varis');
const PANO = path.join(KOK, 'docs/kareler');
mkdirSync(OUT, { recursive: true });
mkdirSync(PANO, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const ADAYLAR = (process.env.ADAY ?? 'A,B,C,D,E,F,G').split(',');

const ACIKLAMA = {
  A: 'BUGÜN — ağız arkada, varış duvar dibinde (sahanlık), salona kuyunun yanından 6 m yürünür',
  B: 'TERS KUYU (180°) — ağız salona bakar; varış kuyunun önünde, yüz salona; iniş: ağza doğru yürü (Kat 1 ile aynı yön)',
  C: 'B + "Kat 1" ZEMİN PAD\'i — ağzın önünde düz işaret, üstünde durunca dolar ve iner',
  D: 'KUYU YERİNDE, VARIŞ ÖNDE — yalnız varış noktası kuyunun salon tarafına taşınır (iniş hâlâ arkadan)',
  E: '90° YAN KUYU — kova boyunca yatay; ağız sağda, varış kovanın sağ ağzında',
  F: 'U DÖNÜŞLÜ (çift kol + ara sahanlık) — ağız salona bakar, alttaki kol Kat 1 merdiveninin ayağına iner',
  G: 'GENİŞ TERS KUYU (8 m) — B\'nin kova genişliğinde hâli: ağız salona bakan büyük merdiven',
};
const INIS = {
  T1: 'İTME (bugün) — ağza doğru yürümeye devam edince iner',
  T2: 'ZEMİN PAD\'i "Kat 1" — ağızda dur, işaret dolar, iner',
  T3: 'HUD DÜĞMESİ "Kat 1 ↓" — ağza yaklaşınca belirir, dokununca iner',
};

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];

async function sayfa(viewport, dpr, mobil) {
  const baglam = await tarayici.newContext({ viewport, deviceScaleFactor: dpr, hasTouch: mobil, isMobile: mobil });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function' && !!window.__three);
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000 }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(1500);
  // Kat 2: bütün pad'ler açık, masalar boş (yürüyen grup kuyuya girmesin), ocaklar dolu
  await s.evaluate(async () => {
    const dongu = await import('/src/game/kat2Dongu.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const { useGame } = await import('/src/game/store.ts');
    const k = useGame.getState().kat2;
    const hepsi = cfg.economyConfig.kat2.padler.map((p) => p.id);
    const w = dongu.yeniKat2Dunya(hepsi, cfg.economyConfig.kat2);
    w.masalar = w.masalar.map((m) => ({ ...m, durum: 'bos', t: 9999 }));
    w.ocaklar = w.ocaklar.map((o) => ({ ...o, hazir: 3 }));
    w.paralar = [];
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi }, kat2Dunya: w, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
  });
  await s.waitForTimeout(2500);
  return s;
}

const aday = (s, ad) => s.evaluate(async (ad) => {
  const m = await import('/tools/kat2-varis.tsx');
  const r = await m.adayKur(ad);
  const [x, z] = m.VARIS_ADAY[ad];
  return { ...r, varis: [x, z] };
}, ad);

/** Varış: oyuncu noktaya konur ve yüzü salona (+z, kameraya) döner — kısa bir adım atıp durur. */
async function ishal(s, x, z, yuz = true) {
  await s.evaluate(([x, z]) => window.__teleport(x, z), [x, z - (yuz ? 0.35 : 0)]);
  if (!yuz) return;
  await s.evaluate(() => window.__girdi(0, 1));
  await s.waitForTimeout(110);
  await s.evaluate(() => window.__girdi(0, 0));
  await s.evaluate(([x, z]) => window.__teleport(x, z), [x, z]);
}

try {
  // ---- GENİŞ: yatay tuval, sinema kamerası, HUD gizli
  const g = await sayfa({ width: 1280, height: 860 }, 1.25, false);
  await g.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  // ---- OYUN: portre telefon, takip kamerası, HUD açık
  const o = await sayfa({ width: 440, height: 956 }, 2, true);
  const genis = {};
  const oyun = {};
  for (const ad of ADAYLAR) {
    const r = await aday(g, ad);
    await ishal(g, ...r.varis);
    await g.evaluate(() => window.__sinema({ pos: [0, 27, 5.5], bak: [0, 0, -6.8], fov: 50 }));
    await g.waitForTimeout(1800);
    genis[ad] = path.join(OUT, `${ad}-genis.png`);
    await g.screenshot({ path: genis[ad] });

    await aday(o, ad);
    await ishal(o, ...r.varis);
    await o.waitForTimeout(2200);
    oyun[ad] = path.join(OUT, `${ad}-oyun.png`);
    await o.screenshot({ path: oyun[ad] });
    console.log('çekildi', ad, JSON.stringify(r));
  }

  // ---- İNİŞ TETİĞİ (B ve C geometrisinde, oyuncu ağzın önünde)
  const inis = {};
  if (ADAYLAR.includes('B') && ADAYLAR.includes('C')) {
    await aday(o, 'B');
    await ishal(o, 0, -10.2, false);
    await o.evaluate(() => window.__girdi(0, -1));
    await o.waitForTimeout(90);
    await o.evaluate(() => window.__girdi(0, 0));
    await o.evaluate(() => window.__teleport(0, -10.2));
    await o.waitForTimeout(2000);
    inis.T1 = path.join(OUT, 'T1-itme.png');
    await o.screenshot({ path: inis.T1 });
    await aday(o, 'C');
    await ishal(o, 0, -10.45, false);
    await o.waitForTimeout(2000);
    inis.T2 = path.join(OUT, 'T2-pad.png');
    await o.screenshot({ path: inis.T2 });
    await aday(o, 'B');
    await ishal(o, 0, -9.6);
    await o.evaluate(() => {
      const d = document.createElement('button');
      d.id = 'varis-dugme';
      d.innerHTML = '<span style="font-size:22px;line-height:1">↓</span><span>Kat 1</span>';
      d.style.cssText = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:99999;display:flex;gap:8px;align-items:center;'
        + 'padding:10px 22px;border-radius:999px;border:3px solid #fff;background:linear-gradient(#ffcf4a,#f2a516);color:#4a2a08;'
        + "font:800 20px 'Lilita One',system-ui;letter-spacing:.5px;box-shadow:0 4px 0 #b36f0b,0 8px 18px rgba(0,0,0,.35)";
      document.body.appendChild(d);
    });
    await o.waitForTimeout(1500);
    inis.T3 = path.join(OUT, 'T3-hud.png');
    await o.screenshot({ path: inis.T3 });
  }

  // ---- PANOLAR
  const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
  const p = await (await tarayici.newContext({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1 })).newPage();
  const stil = `<style>body{margin:0;background:#1d1b2e;color:#fff;font:600 15px system-ui;padding:14px}
    h1{font-size:22px;margin:0 0 10px} .izgara{display:grid;gap:12px} figure{margin:0;background:#2a2740;border-radius:10px;overflow:hidden}
    img{display:block;width:100%} figcaption{padding:7px 10px 9px;line-height:1.3} b{color:#ffcf4a;font-size:19px;margin-right:6px}</style>`;
  const kart = (ad, f, metin) => `<figure><img src="${b64(f)}"><figcaption><b>${ad}</b>${metin}</figcaption></figure>`;
  await p.setContent(`<html><head>${stil}</head><body><h1>Kat 2 · varış — kat genişliği boydan boya (merdiven salonu + arka bant), aynı kadraj · oyuncu = varış noktası</h1>
    <div class="izgara" style="grid-template-columns:repeat(${ADAYLAR.length > 4 ? 3 : 2},1fr)">${ADAYLAR.map((a) => kart(a, genis[a], ACIKLAMA[a])).join('')}</div></body></html>`);
  await p.screenshot({ path: path.join(PANO, 'kat2-varis-pano.png'), fullPage: true });
  const kucuk = (ad, f, metin) => `<figure><img src="${b64(f)}"><figcaption style="font-size:13px"><b>${ad}</b>${metin}</figcaption></figure>`;
  await p.setContent(`<html><head>${stil}</head><body><h1>Varış anı — oyunun kendi kamerası (telefon, portre)</h1>
    <div class="izgara" style="grid-template-columns:repeat(${ADAYLAR.length},1fr)">${ADAYLAR.map((a) => kucuk(a, oyun[a], ACIKLAMA[a].split(' — ')[0])).join('')}</div>
    ${inis.T1 ? `<h1 style="margin-top:16px">İniş nasıl tetiklenir — oyuncu ağzın önünde (B/C geometrisi)</h1>
    <div class="izgara" style="grid-template-columns:repeat(3,1fr);width:60%">${['T1', 'T2', 'T3'].map((t) => kucuk(t, inis[t], INIS[t])).join('')}</div>` : ''}</body></html>`);
  await p.screenshot({ path: path.join(PANO, 'kat2-varis-pano-oyun.png'), fullPage: true });
  console.log('pano yazıldı');
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
