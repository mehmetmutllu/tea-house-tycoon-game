/**
 * s5-esya-kare.mjs — S5 ESYA ajanı: G-98 (para yığını) · G-105 (pad dolumu) · G-126 (hazır kahve dizilişi) ·
 * G-127 (tepsideki fincan) · G-130 (tavla tahtası) kareleri. Aynı kadrajlar önce/sonra çekilir.
 *
 * Kullanım: node tools/s5-esya-kare.mjs <once|sonra>  ·  port BAK_PORT (vars. 4127)
 * Pano: node tools/s5-esya-kare.mjs pano  → docs/kareler/s5-esya-pano.png (önce/sonra yan yana)
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 4127);
const KIP = process.argv[2] ?? 'sonra';
const OUT = path.join(KOK, 'docs/kareler/s5-esya');
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const KARE = { x: 0, y: 258, width: 440, height: 440 };
const KADRAJ = [
  ['para', 'G-98 para yığınları (miktar 40 · 120 · 400)'],
  ['pad', 'G-105 pad dolumu %8 · %50 · %96'],
  ['ocak', 'G-126/127 hazır kahve (9) + tepsi'],
  ['ocak-yakin', 'G-127 servis tepsisi (yakın)'],
  ['legen', 'G-127 ortadaki leğen: kirli fincanlar'],
  ['tavla1', 'G-130 tavla Sv1'],
  ['tavla2', 'G-130 tavla Sv2'],
  ['tavla4', 'G-130 tavla Sv4 (cila)'],
];

if (KIP === 'pano') {
  const tarayici = await chromium.launch();
  const p = await (await tarayici.newContext({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 1 })).newPage();
  const b64 = (f) => (existsSync(f) ? `data:image/png;base64,${readFileSync(f).toString('base64')}` : '');
  const W = 330;
  const satirlar = KADRAJ.map(([ad, e]) => `<div class="s"><div class="e">${e}</div>${['once', 'sonra'].map((k) => `<figure><figcaption>${k === 'once' ? 'önce' : 'sonra'}</figcaption><img src="${b64(path.join(OUT, `${k}-${ad}.png`))}" style="width:${W}px"></figure>`).join('')}</div>`);
  // iki sütun: satırları ikiye böl
  const yari = Math.ceil(satirlar.length / 2);
  await p.setContent(`<html><body style="margin:0;background:#1d1b2e;font:700 18px system-ui;color:#fff">
    <h1 style="margin:12px 20px 0;font-size:24px">S5 · ESYA — G-98 · G-105 · G-126 · G-127 · G-130 (önce / sonra)</h1>
    <div style="display:flex;gap:20px"><div>${satirlar.slice(0, yari).join('')}</div><div>${satirlar.slice(yari).join('')}</div></div>
    <style>.s{display:flex;gap:10px;padding:8px 20px;align-items:center}.e{width:90px;font-size:15px;color:#cfc8e8}figure{margin:0}img{display:block;border-radius:8px;margin-top:4px}figcaption{text-align:center;font-size:14px}</style></body></html>`);
  await p.waitForTimeout(300);
  const dosya = path.join(KOK, 'docs/kareler/s5-esya-pano.png');
  await p.screenshot({ path: dosya, fullPage: true });
  console.log('PANO', dosya);
  await tarayici.close();
  process.exit(0);
}

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

  /** Kat 2 durumu: tüm pad'ler açık, masalar boş, hazır fincan + para + dolum verilen gibi. */
  const kur = (d) => s.evaluate(async (d) => {
    const dongu = await import('/src/game/kat2Dongu.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const kat = await import('/src/game/kat.ts');
    const { useGame } = await import('/src/game/store.ts');
    const k = useGame.getState().kat2;
    const hepsi = [...(cfg.economyConfig.kat2.hazir ?? []), ...cfg.economyConfig.kat2.padler.map((p) => p.id)];
    const w = dongu.yeniKat2Dunya(hepsi, cfg.economyConfig.kat2);
    w.masalar = w.masalar.map((m) => ({ ...m, durum: 'bos', t: 9999 }));
    w.ocaklar = w.ocaklar.map((o) => ({ ...o, hazir: d.hazir ?? 0 }));
    w.padFill = { ...(d.fill ?? {}) };
    if (d.legen != null) w.legen = d.legen;
    w.paralar = (d.paralar ?? []).map((p, i) => ({ id: 900 + i, ...p }));
    const masaSv = {};
    for (const m of w.masalar) masaSv[m.id] = d.sv ?? 1;
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi, masaSv, yuk: d.yuk ?? {} }, kat2Dunya: w, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    window.__teleport(d.oyuncu?.[0] ?? 0, d.oyuncu?.[1] ?? -6);
    const tavla = kat.KAT2_MASALAR.find((m) => m.tur === 'tavla');
    return { tavla: [tavla.x, tavla.z], ocak: [kat.OCAKLAR[0].x, kat.OCAKLAR[0].z], yuk: kat.KAT2_OCAK_YUK_YER };
  }, d);
  const sinema = (pos, bak, fov = 45) => s.evaluate(([pos, bak, fov]) => window.__sinema({ pos, bak, fov }), [pos, bak, fov]);
  const kare = async (ad, bekle = 1500) => {
    await s.waitForTimeout(bekle);
    await s.screenshot({ path: path.join(OUT, `${KIP}-${ad}.png`), clip: KARE });
  };

  if (process.env.GENIS) { await kur({ hazir: 9, yuk: { ocak: 5 } }); await sinema([-6, 22, 6], [-6, 0, -6], 50); await s.waitForTimeout(3000); await s.screenshot({ path: path.join(OUT, 'genis.png') }); }
  // G-98: tavla masasının önünde üç yığın (küçük → büyük)
  const Y = await kur({});
  const [tx, tz] = Y.tavla;
  await kur({ paralar: [{ x: tx - 1.2, z: tz + 1.3, miktar: 40 }, { x: tx, z: tz + 1.3, miktar: 120 }, { x: tx + 1.2, z: tz + 1.3, miktar: 400 }], oyuncu: [tx + 3, tz + 3.2] });
  await sinema([tx, 6.5, tz + 7.5], [tx, 0.3, tz + 1.1]);
  await kare('para', 3000);

  // G-105: ocak yükseltme noktası %8 / %50 / %96 — üç kare yerine aynı kadrajda sırayla (önemli olan köşe)
  const yukId = 'k2ocakYuk';
  const [yx, yz] = Y.yuk;
  for (const [ad, p] of [['pad', 0.5], ['pad-08', 0.08], ['pad-96', 0.96]]) {
    const fiyat = await s.evaluate(async () => {
      const dongu = await import('/src/game/kat2Dongu.ts');
      const cfg = await import('/src/config/economy.config.ts');
      const { useGame } = await import('/src/game/store.ts');
      return dongu.kat2OcakTetik(cfg.economyConfig.kat2, cfg.economyConfig.kat2.padler.map((x) => x.id), useGame.getState().kat2.yuk)?.fiyat ?? 0;
    });
    await kur({ fill: { [yukId]: fiyat * p }, oyuncu: [yx + 1.8, yz + 2.2] });
    await sinema([yx, 6.5, yz + 5], [yx, 0, yz + 0.1]);
    await kare(ad, 1800);
  }

  // G-126/127: ocak 5 alım → kuyruk 9, hepsi hazır
  const [ox, oz] = Y.ocak;
  await kur({ hazir: 9, yuk: { ocak: 5 }, oyuncu: [ox + 3, oz + 3.5] });
  await sinema([ox, 9, oz + 7], [ox, 0.9, oz]);
  await kare('ocak', 2500);
  await sinema([ox + 0.4, 4.2, oz + 2.6], [ox + 0.4, 1.0, oz], 40);
  await kare('ocak-yakin', 1500);
  const lx = -10.3;
  await kur({ hazir: 3, legen: 6, yuk: { ocak: 5 }, oyuncu: [ox + 3, oz + 3.5] });
  await sinema([lx, 4.2, oz + 2.6], [lx, 1.0, oz], 40);
  await kare('legen', 2000);

  // G-130: tavla Sv1 / Sv2 / Sv4
  for (const sv of [1, 2, 4]) {
    await kur({ sv, oyuncu: [tx + 3, tz + 3.2] });
    await sinema([tx, 3.6, tz + 2.4], [tx, 0.7, tz]);
    await kare(`tavla${sv}`, 1800);
  }
  await s.evaluate(() => window.__sinema(null));
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
