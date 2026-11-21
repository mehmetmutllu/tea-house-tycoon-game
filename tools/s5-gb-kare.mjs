/**
 * s5-gb-kare.mjs — S5 GORSEL-B: G-127 (bakır leğen) · G-112 (Kat 1 mutfak zemini) · G-124 (oto-toplanan yığın uçmaz).
 * Aynı kadrajlar önce/sonra çekilir; G-124 ayrıca `.floater` sayısını ölçer (oto = 0 olmalı, elle ≥ 1).
 *
 * Kullanım: node tools/s5-gb-kare.mjs <once|sonra>  ·  port GB_PORT (vars. 4161, HMR kapalı)
 * Pano: node tools/s5-gb-kare.mjs pano → docs/kareler/s5-gb-pano.png
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.GB_PORT ?? 4161);
const KIP = process.argv[2] ?? 'sonra';
const OUT = path.join(KOK, 'docs/kareler');
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
const KARE = { x: 0, y: 258, width: 440, height: 440 };
const KADRAJ = [
  ['legen', 'G-127 leğen: 6 kirli fincan'],
  ['legen-bos', 'G-127 leğen boş'],
  ['k1-mutfak', 'G-112 Kat 1 mutfağı (kayıtta klasik)'],
  ['k1-mutfak-kahve', 'G-112 Kat 1 mutfağı (satın alınmış Kahve Dama)'],
  ['k2-mutfak', 'G-112 REF Kat 2 mutfağı'],
  ['g124-oto', 'G-124 oto-toplama anı (+0,25 sn)'],
  ['g124-elle', 'G-124 elle toplama anı (+0,25 sn)'],
];

if (KIP === 'pano') {
  const tarayici = await chromium.launch();
  const p = await (await tarayici.newContext({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 1 })).newPage();
  const b64 = (f) => (existsSync(f) ? `data:image/png;base64,${readFileSync(f).toString('base64')}` : '');
  const olcu = (k) => { const f = path.join(OUT, `s5-gb-${k}-g124.json`); return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null; };
  const W = 330;
  const satir = ([ad, e]) => `<div class="s"><div class="e">${e}</div>${['once', 'sonra'].map((k) => {
    const o = ad.startsWith('g124') ? olcu(k) : null;
    const ek = o ? ` · .floater ${ad.endsWith('oto') ? o.oto : o.elle}` : '';
    return `<figure><figcaption>${k === 'once' ? 'önce' : 'sonra'}${ek}</figcaption><img src="${b64(path.join(OUT, `s5-gb-${k}-${ad}.png`))}" style="width:${W}px"></figure>`;
  }).join('')}</div>`;
  const satirlar = KADRAJ.map(satir);
  const yari = Math.ceil(satirlar.length / 2);
  await p.setContent(`<html><body style="margin:0;background:#1d1b2e;font:700 18px system-ui;color:#fff">
    <h1 style="margin:12px 20px 0;font-size:24px">S5 · GORSEL-B — G-127 · G-112 · G-124 (önce / sonra)</h1>
    <div style="display:flex;gap:20px"><div>${satirlar.slice(0, yari).join('')}</div><div>${satirlar.slice(yari).join('')}</div></div>
    <style>.s{display:flex;gap:10px;padding:8px 20px;align-items:center}.e{width:110px;font-size:15px;color:#cfc8e8}figure{margin:0}img{display:block;border-radius:8px;margin-top:4px}figcaption{text-align:center;font-size:14px}</style></body></html>`);
  await p.waitForTimeout(300);
  const dosya = path.join(OUT, 's5-gb-pano.png');
  await p.screenshot({ path: dosya, fullPage: true });
  console.log('PANO', dosya);
  await tarayici.close();
  process.exit(0);
}

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'tools/vite-kare.config.mjs'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
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
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000, kitchenTheme: 'klasik' }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  const sinema = (pos, bak, fov = 45) => s.evaluate(([pos, bak, fov]) => window.__sinema({ pos, bak, fov }), [pos, bak, fov]);
  const kare = async (ad, bekle = 1500) => {
    await s.waitForTimeout(bekle);
    await s.screenshot({ path: path.join(OUT, `s5-gb-${KIP}-${ad}.png`), clip: KARE });
  };

  // ---- G-112: Kat 1 mutfağı (kayıttaki tema 'klasik', sonra satın alınmış 'kahve')
  const F = await s.evaluate(async () => (await import('/src/components/three/kitchenLook.ts')).FAYANS);
  const fx = (F.x0 + F.x1) / 2;
  const fz = (F.z0 + F.z1) / 2;
  await s.evaluate(([x, z]) => window.__teleport(x + 2, z + 5), [fx, fz]);
  await sinema([fx, 15, fz + 15], [fx, 0, fz - 0.5], 50);
  await kare('k1-mutfak', 3500);
  await s.evaluate(() => window.__setState({ kitchenTheme: 'kahve' }));
  await kare('k1-mutfak-kahve', 2500);
  await s.evaluate(() => window.__setState({ kitchenTheme: 'klasik' }));

  // ---- Kat 2
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(1500);
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
    if (d.legen != null) w.legen = d.legen;
    w.legenT = 0;
    w.paralar = (d.paralar ?? []).map((p, i) => ({ id: 900 + i, ...p }));
    const masaSv = {};
    for (const m of w.masalar) masaSv[m.id] = 1;
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi, masaSv, yuk: d.yuk ?? {} }, kat2Dunya: w, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    window.__teleport(d.oyuncu?.[0] ?? 0, d.oyuncu?.[1] ?? -6);
    const tavla = kat.KAT2_MASALAR.find((m) => m.tur === 'tavla');
    return { tavla: [tavla.x, tavla.z], ocak: [kat.OCAKLAR[0].x, kat.OCAKLAR[0].z], yikama: kat.KAT2_YIKAMA_YER, onZ: (kat.KAT2_ON_TEZGAH.z0 + kat.KAT2_ON_TEZGAH.z1) / 2 };
  }, d);

  const Y = await kur({});
  const [ox, oz] = Y.ocak;
  const lx = Y.yikama[0];
  await kur({ hazir: 3, legen: 6, yuk: { ocak: 5 }, oyuncu: [ox + 3, oz + 3.5] });
  await sinema([lx, 4.2, Y.onZ + 2.6], [lx, 1.0, Y.onZ], 40);
  await kare('legen', 2000);
  await kur({ hazir: 3, legen: 0, yuk: { ocak: 5 }, oyuncu: [ox + 3, oz + 3.5] });
  await kare('legen-bos', 1500);

  await kur({ hazir: 3, yuk: { ocak: 5 }, oyuncu: [ox + 2, oz + 5] });
  await sinema([lx, 13, Y.onZ + 12], [lx, 0, Y.onZ - 2.5], 50);
  await kare('k2-mutfak', 2500);

  // ---- G-124: yaşı dolmak üzere bir yığın oyuncudan UZAKTA (oto) / oyuncunun dibinde (elle)
  const [tx, tz] = Y.tavla;
  const floaterSay = () => s.evaluate(() => document.querySelectorAll('.floater').length);
  const olc = async (ad, paralar, oyuncu) => {
    await kur({ paralar: [], oyuncu });
    await sinema([tx + 1.5, 8, tz + 9], [tx + 1.5, 0.3, tz + 2], 50);
    await s.waitForTimeout(1500);
    const once = await floaterSay();
    await kur({ paralar, oyuncu });
    let enCok = 0;
    for (let i = 0; i < 12; i++) {
      await s.waitForTimeout(100);
      if (i === 1) await s.screenshot({ path: path.join(OUT, `s5-gb-${KIP}-${ad}.png`), clip: KARE });
      enCok = Math.max(enCok, (await floaterSay()) - once);
    }
    const kalan = await s.evaluate(() => window.__game().kat2Dunya?.paralar?.length ?? (window.__kat2Pad ? -1 : -2));
    return { enCok, kalan };
  };
  const oto = await olc('g124-oto', [{ x: tx, z: tz + 1.3, miktar: 120, yas: 179.85 }], [tx + 6, tz + 6]);
  const elle = await olc('g124-elle', [{ x: tx, z: tz + 1.3, miktar: 120, yas: 0 }], [tx + 0.3, tz + 1.6]);
  const json = { oto: oto.enCok, elle: elle.enCok, otoKalan: oto.kalan, elleKalan: elle.kalan };
  writeFileSync(path.join(OUT, `s5-gb-${KIP}-g124.json`), JSON.stringify(json));
  console.log('G124', JSON.stringify(json));
  await s.evaluate(() => window.__sinema(null));
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
