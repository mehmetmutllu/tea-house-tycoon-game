/**
 * s5-ga-kare.mjs — S5 GÖRSEL-A kareleri (G-102 · G-111 · G-114 · G-115): oyun kamerası (portre telefon, HUD'lu)
 * + geniş sinema kadrajı. Kurulum `tools/s5-tasarim-cek.mjs` ile aynı (bütün Kat 1 + Kat 2 açık).
 *
 * Koşu: GA_ETIKET=sonra node tools/s5-ga-kare.mjs   (port GA_PORT, varsayılan 4151; HMR kapalı)
 *       GA_KOK=<başka çalışma ağacı> ile "önce" kareleri aynı betikle o ağaçtan çekilir.
 * Çıktı: docs/kareler/s5-ga-<etiket>-*.png · GA_PANO=1 → docs/kareler/s5-ga-pano.png (önce | sonra).
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KOK = process.env.GA_KOK ?? BURASI;
const PORT = Number(process.env.GA_PORT ?? 4151);
const ETIKET = process.env.GA_ETIKET ?? 'sonra';
const OUT = path.join(BURASI, 'docs/kareler');
const KAT1_PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const TEL = { viewport: { width: 440, height: 956 }, dpr: 2, mobil: true };
const GENIS = { viewport: { width: 1280, height: 860 }, dpr: 1.25, mobil: false };

/** [ad, kat, kip, ...] — kip 'oyun': oyuncu (x, z), zoomOut? · kip 'sinema': pos, bak, fov. */
const KARELER = [
  ['k2-mutfak-genis', 2, 'sinema', [0.6, 8.2, -2.6], [-7.6, 0.4, -12.6], 50],
  ['k2-birlesim-yakin', 2, 'sinema', [-2.3, 2.6, -6.6], [-4.8, 0.75, -10.1], 45],
  ['k2-mutfak-oyun', 2, 'oyun', -5.9, -9.1],
  ['k2-on-oyun', 2, 'oyun', -6, 16.53],
  ['k2-alt-genis', 2, 'sinema', [-4, 13, 30], [-6, -1, 10], 50],
  ['k2-alt-oyun', 2, 'oyun', -15.5, 16.3, true],
  ['k1-on-oyun', 1, 'oyun', 6, 16.53],
  ['k1-kapi-oyun', 1, 'oyun', 'kapi', 16.3],
  ['k1-cephe-genis', 1, 'sinema', [0, 9, 32], [0, 1, 14], 50],
];

async function main() {
  if (process.env.GA_PANO) return pano();
  const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
  await sunucu.listen();
  const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
  const hatalar = [];
  async function sayfa(v) {
    const b = await tarayici.newContext({ viewport: v.viewport, deviceScaleFactor: v.dpr, hasTouch: v.mobil, isMobile: v.mobil });
    const s = await b.newPage();
    s.on('pageerror', (e) => hatalar.push(e.message));
    s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
    await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    await s.waitForFunction(() => typeof window.__game === 'function' && !!window.__three);
    await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000 }), KAT1_PADS);
    await s.evaluate(() => window.__advanceTime(2));
    await s.evaluate(() => window.__kat2(2));
    await s.waitForTimeout(1200);
    await s.evaluate(async () => {
      const dongu = await import('/src/game/kat2Dongu.ts');
      const cfg = await import('/src/config/economy.config.ts');
      const { useGame } = await import('/src/game/store.ts');
      const k = useGame.getState().kat2;
      const hepsi = [...cfg.economyConfig.kat2.hazir, ...cfg.economyConfig.kat2.padler.map((p) => p.id)];
      const w = dongu.yeniKat2Dunya(hepsi, cfg.economyConfig.kat2);
      w.masalar = w.masalar.map((m) => ({ ...m, durum: 'bos', t: 9999 }));
      w.ocaklar = w.ocaklar.map((o) => ({ ...o, hazir: 3 }));
      w.paralar = [];
      window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi }, kat2Dunya: w, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    });
    await s.waitForTimeout(2000);
    return s;
  }
  const o = await sayfa(TEL);
  const g = await sayfa(GENIS);
  await g.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  const kat = { o: 2, g: 2 };
  const katGec = async (s, k, n) => {
    if (kat[k] === n) return;
    await s.evaluate((n) => window.__kat2(n), n);
    kat[k] = n;
    await s.waitForTimeout(1800);
  };
  try {
    const sadece = process.env.GA_SADECE?.split(',');
    for (const [ad, k, kip, a, b, c] of KARELER.filter(([ad]) => !sadece || sadece.includes(ad))) {
      if (kip === 'sinema') {
        await katGec(g, 'g', k);
        await g.evaluate(([pos, bak, fov]) => window.__sinema({ pos, bak, fov }), [a, b, c]);
        await g.waitForTimeout(1600);
        await g.screenshot({ path: path.join(OUT, `s5-ga-${ETIKET}-${ad}.png`) });
      } else {
        await katGec(o, 'o', k);
        const x = a === 'kapi' ? await o.evaluate(async () => (await import('/src/game/layout.ts')).doorX(window.__game().areasOpen ?? 3) + 3.4) : a;
        await o.evaluate((z) => window.__setState({ camZoomOut: z }), !!c);
        await o.evaluate(([x, z]) => window.__teleport(x, z), [x, b - 0.2]);
        await o.evaluate(() => window.__girdi(0, 1));
        await o.waitForTimeout(90);
        await o.evaluate(() => window.__girdi(0, 0));
        await o.evaluate(([x, z]) => window.__teleport(x, z), [x, b]);
        await o.waitForTimeout(1800);
        await o.screenshot({ path: path.join(OUT, `s5-ga-${ETIKET}-${ad}.png`) });
      }
      console.log('kare', ad);
    }
  } finally {
    console.log('HATALAR', hatalar.length, hatalar.slice(0, 6));
    await tarayici.close();
    await sunucu.close();
  }
}

async function pano() {
  const tarayici = await chromium.launch();
  const p = await (await tarayici.newContext({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1 })).newPage();
  const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
  const dosya = (e, ad) => path.join(OUT, `s5-ga-${e}-${ad}.png`);
  const satir = (baslik, adlar) =>
    `<h2>${baslik}</h2><div class="s">${adlar
      .filter((ad) => existsSync(dosya('once', ad)) && existsSync(dosya('sonra', ad)))
      .map((ad) => `<figure><div class="c"><img src="${b64(dosya('once', ad))}"><img src="${b64(dosya('sonra', ad))}"></div><figcaption>${ad} · önce | sonra</figcaption></figure>`)
      .join('')}</div>`;
  const stil = `<style>body{margin:0;background:#1d1b2e;color:#fff;font:600 13px system-ui;padding:10px}h1{font-size:18px;margin:0 0 4px}
    h2{font-size:14px;margin:10px 0 6px;color:#cfc8ff}.s{display:flex;gap:8px;align-items:flex-start}figure{margin:0;background:#2a2740;border-radius:8px;overflow:hidden;flex:1 1 0}
    .c{display:flex;gap:2px;background:#000;align-items:flex-start}.c img{display:block;width:50%}figcaption{padding:4px 8px}</style>`;
  const govde = [
    satir('G-102 C + G-111 — mutfak | kova duvarı alçak (1,0), ucu tezgâhın arkasında', ['k2-mutfak-genis', 'k2-birlesim-yakin', 'k2-mutfak-oyun']),
    satir('G-114 B — ön duvar 1,0 (Kat 2 · Kat 1 · Kat 1 kapı)', ['k2-on-oyun', 'k1-on-oyun', 'k1-kapi-oyun']),
    satir('G-114 Kat 1 cephe · G-115 C — Kat 2 bina altı', ['k1-cephe-genis', 'k2-alt-genis', 'k2-alt-oyun']),
  ].join('');
  await p.setContent(`<html><head>${stil}</head><body><h1>S5 GÖRSEL-A · önce | sonra</h1>${govde}</body></html>`);
  await p.screenshot({ path: path.join(OUT, 's5-ga-pano.png'), fullPage: true });
  await tarayici.close();
  console.log('pano s5-ga-pano.png');
}

await main();
