/**
 * _kat2-mangal-kare.mjs — Kat 2 köz mangalı mutfak Sv1-6 (yakın) + mutfak geniş (Sv1, Sv6), tek pano.
 * Seviye `kat2MutfakSeviyesi(kat2.yuk.ocak)`den türer (D-200) → ocak alımı sv − 1 yazılır.
 * Kullanım: node tools/_kat2-mangal-kare.mjs <klasör>
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 4118);
const OUT = path.resolve(process.argv[2]);
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const YOLLAR = [[null, 'Köz mangalı (yol C) · mutfak Sv1-6']];
const ZEMINLER = [[1, 'Mutfak Sv1'], [6, 'Mutfak Sv6']];
const YAKIN = { x: 0, y: 258, width: 440, height: 400 };
const GENIS = { x: 0, y: 100, width: 440, height: 330 };

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];
try {
  const baglam = await tarayici.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await s.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function');
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000 }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(1500);
  const kur = (sv) => s.evaluate(async (sv) => {
    const dongu = await import('/src/game/kat2Dongu.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const kat = await import('/src/game/kat.ts');
    const look = await import('/src/components/three/kitchenLook.ts');
    const { useGame } = await import('/src/game/store.ts');
    const k = useGame.getState().kat2;
    const hepsi = [...cfg.economyConfig.kat2.hazir, ...cfg.economyConfig.kat2.padler.map((p) => p.id)];
    const w = dongu.yeniKat2Dunya(hepsi, cfg.economyConfig.kat2);
    w.masalar = w.masalar.map((m) => ({ ...m, durum: 'oyunda', t: 9999, kahveT: 999 }));
    w.ocaklar = w.ocaklar.map((o) => ({ ...o, hazir: 3, demT: 999 }));
    w.paralar = [];
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi, yuk: { ...k.yuk, ocak: sv - 1 } }, kat2Dunya: w, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    window.__teleport(-3.5, kat.OCAK.al[1] + 1.2);
    return { x: kat.OCAK.x, z: kat.OCAK.z, sv: look.kat2MutfakSeviyesi(sv - 1) };
  }, sv);
  const D = 8.5 * 1.3;
  const satirlar = [];
  let ilk = true;
  for (const [yol, ad] of YOLLAR) {
    const kareler = [];
    for (let sv = 1; sv <= 6; sv++) {
      const O = await kur(sv);
      if (O.sv !== sv) throw new Error(`seviye ${O.sv} != ${sv}`);
      await s.evaluate(([x, z]) => window.__sinema({ pos: [x + 0.4, 4.4, z + 5.0], bak: [x + 0.4, 1.1, z - 0.2], fov: 38 }), [O.x, O.z]);
      await s.waitForTimeout(ilk ? 4000 : 1300);
      ilk = false;
      const f = path.join(OUT, `mangal-sv${sv}.png`);
      await s.screenshot({ path: f, clip: YAKIN });
      kareler.push(f);
    }
    satirlar.push({ ad, kareler });
  }
  // geniş, oyun mesafesi
  const genis = [];
  for (const [z, ad] of ZEMINLER) {
    const O = await kur(z);
    await s.evaluate(([x, z, D]) => window.__sinema({ pos: [x - 2.9, D, z + 4.5 + D], bak: [x - 2.9, 0.8, z + 4.5], fov: 50 }), [O.x, O.z, D]);
    await s.waitForTimeout(1800);
    const f = path.join(OUT, `zemin-${z}.png`);
    await s.screenshot({ path: f, clip: GENIS });
    genis.push({ ad, f });
  }
  const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
  const img = (f) => `<img src="${b64(f)}" style="width:100%;display:block;border-radius:4px">`;
  const html = `<html><body style="margin:0;background:#1d1a17;font:600 18px system-ui;color:#f3e9d8;padding:10px">
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:4px">${[1, 2, 3, 4, 5, 6].map((v) => `<div style="text-align:center">Sv${v}</div>`).join('')}</div>
  ${satirlar.map((r) => `<div style="padding:10px 2px 6px">${r.ad}</div><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${r.kareler.map(img).join('')}</div>`).join('')}
  <div style="padding:18px 2px 6px">Kat 2 mutfağı (oyun mesafesi)</div>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;width:50%">${genis.map((g) => `<div><div style="padding:0 2px 4px;font-size:15px">${g.ad}</div>${img(g.f)}</div>`).join('')}</div>
  </body></html>`;
  const p = await (await tarayici.newContext({ viewport: { width: 1800, height: 900 } })).newPage();
  await p.setContent(html);
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, 'pano.png'), fullPage: true });
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
