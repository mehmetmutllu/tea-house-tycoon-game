/**
 * golge-s4-kare.mjs — S4 gölge turu: önce/sonra kareleri + gölge çağrı sayımı + kare süresi + gölge envanteri.
 *
 * Kullanım: node tools/golge-s4-kare.mjs <etiket> [kip]
 *   etiket  : once | sonra | zayif1024 (çıktı docs/kareler/golge-<etiket>-*.png + .json)
 *   kip     : hepsi (varsayılan) | kare | perf | envanter | pano (once/sonra/zayif1024 → golge-once-sonra.png)
 *   GOLGE_HARITA=1024 → kare kipinde `?f2golge=1024` (zayıf cihaz kolu görüntüsü)
 *   BAK_PORT (varsayılan 4310)
 *
 * Durumlar (3-performans.md S2/S3 ile aynı kurgu):
 *   K1 · Kat 1 geç: 24 pad, masalar L5, 240 sn sim.
 *   K2 · Kat 2 tam: K1 + Kat 2'nin bütün pad'leri, bütün masalar Sv5, yük dolu, 240 sn sim.
 * Kadraj sabit (Kat 1 `__devCam`, Kat 2 `__sinema`), `Math.random` tohumlu, kareden önce `__zaman(0)`.
 * Perf: `?f2golge=2048&f2fps=0` + CDP 4× CPU kısma. Gölge çağrısı = (gölge açık toplam − gölge
 * dondurulmuş toplam) / kare; `info.autoReset=false` ile iki geçiş birlikte sayılır.
 * Vite API ile, HMR + izleme KAPALI (paralel ajanlar dosya yazıyor).
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 4310);
const ETIKET = process.argv[2] ?? 'once';
const KIP = process.argv[3] ?? 'hepsi';
const HARITA = Number(process.env.GOLGE_HARITA ?? 0);
const OUT = path.join(KOK, 'docs/kareler');
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');

const TOHUM = () => {
  let a = 12345;
  Math.random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
const hatalar = [];
const sonuc = { etiket: ETIKET, harita: HARITA || 2048, durumlar: {} };

async function sayfa(sorgu, kisma) {
  const baglam = await tarayici.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const s = await baglam.newPage();
  await s.addInitScript(TOHUM);
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await s.goto(`http://127.0.0.1:${PORT}/${sorgu}`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function');
  if (kisma) {
    const cdp = await baglam.newCDPSession(s);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: kisma });
  }
  return s;
}

async function kat1Gec(s) {
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000 }), PADS);
  await s.evaluate(() => {
    const n = window.__game().tableLevels?.length ?? 16;
    for (let i = 0; i < Math.max(n, 16); i++) window.__setTableLevel(i, 4);
  });
  await s.evaluate(() => window.__advanceTime(240));
  await s.evaluate(() => window.__teleport(0, 6));
  await s.waitForTimeout(2500);
}

async function kat2Tam(s) {
  await s.evaluate(() => window.__sinema(null));
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(2500);
  await s.evaluate(async () => {
    const cfg = await import('/src/config/economy.config.ts');
    const { useGame } = await import('/src/game/store.ts');
    const k = useGame.getState().kat2;
    const hepsi = [...new Set([...(cfg.economyConfig.kat2.hazir ?? []), ...cfg.economyConfig.kat2.padler.map((p) => p.id)])];
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi, yuk: { ocak: 5, garsonHiz: 1, garsonTepsi: 2, lavabo: 5 } }, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
  });
  await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    const k = useGame.getState().kat2;
    const ids = (useGame.getState().kat2Dunya?.masalar ?? []).map((m) => m.id);
    window.__setState({ kat2: { ...k, masaSv: Object.fromEntries(ids.map((id) => [id, 5])) } });
  });
  await s.evaluate(() => window.__advanceTime(240));
  await s.evaluate(() => window.__teleport(2, 6));
  await s.waitForTimeout(3000);
  console.log('K2 durum', JSON.stringify(await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    const g = useGame.getState();
    return { kat: g.kat, pads: g.kat2.padsDone.length, sv: Object.values(g.kat2.masaSv ?? {}).join(''), kam: window.__three.camera.position.toArray().map((v) => +v.toFixed(1)) };
  })));
}

/** Sabit kadrajlar: geniş (bütün kat) + yakın (masa kümesi). Sim donuk. */
const KADRAJ = {
  kat1: { genis: { pos: [0, 24, 28], bak: [0, 0, 4], fov: 72 }, yakin: { pos: [-9, 8, -4], bak: [-9, 0.8, -11.5], fov: 50 } },
  kat2: { genis: { pos: [2, 24, 30], bak: [2, 0, 6], fov: 72 }, yakin: { pos: [-6, 9, -2], bak: [-6, 0.6, -9.5], fov: 50 } },
};
async function kareler(s, kat) {
  await s.evaluate(() => window.__zaman(0));
  for (const [ad, k] of Object.entries(KADRAJ[kat])) {
    await s.evaluate((k) => window.__sinema(k), k);
    await s.waitForTimeout(1200);
    await s.screenshot({ path: path.join(OUT, `golge-${ETIKET}-${kat}-${ad}.png`), clip: { x: 0, y: 150, width: 440, height: 640 } });
  }
  await s.evaluate(() => { window.__sinema(null); window.__zaman(1); });
}

/** Gölge döken / görünür mesh envanteri: kısa kenar ve boyutla kova. */
function envanter(s) {
  return s.evaluate(() => {
    const { scene } = window.__three;
    const gorunur = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const satirlar = [];
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      if (!o.isMesh || !gorunur(o)) return;
      const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
      const b = g.boundingBox; const sc = { x: 0, y: 0, z: 0 };
      const e = o.matrixWorld.elements;
      sc.x = Math.hypot(e[0], e[1], e[2]); sc.y = Math.hypot(e[4], e[5], e[6]); sc.z = Math.hypot(e[8], e[9], e[10]);
      const d = [(b.max.x - b.min.x) * sc.x, (b.max.y - b.min.y) * sc.y, (b.max.z - b.min.z) * sc.z].sort((a, c) => c - a);
      const p = o.getWorldPosition(o.position.clone());
      const renk = o.material?.color?.getHexString?.() ?? '';
      satirlar.push({ cast: !!o.castShadow, inst: !!o.isInstancedMesh, skin: !!o.isSkinnedMesh, tip: g.type, d: d.map((v) => +v.toFixed(3)), p: [p.x, p.y, p.z].map((v) => +v.toFixed(2)), renk, n: o.isInstancedMesh ? o.count : 1, ad: o.name || o.parent?.name || '' });
    });
    const cast = satirlar.filter((r) => r.cast);
    const kova = {};
    for (const r of cast) {
      const k = `${r.tip}|${r.d[1] < 0.12 ? 'ince' : r.d[0] < 0.35 ? 'kucuk' : 'buyuk'}`;
      kova[k] = (kova[k] ?? 0) + 1;
    }
    return { mesh: satirlar.length, cast: cast.length, kova, ornek: cast };
  });
}

/** Kare süresi + gölge çağrısı (4× kısık, tavansız). */
async function olc(s) {
  await s.evaluate(() => window.__zaman(1));
  await s.waitForTimeout(3000);
  const r = await s.evaluate(async () => {
    const { gl } = window.__three;
    const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
    const say = async (ms) => {
      gl.info.autoReset = false; gl.info.reset();
      const f0 = gl.info.render.frame;
      await bekle(ms);
      const n = gl.info.render.frame - f0;
      const c = gl.info.render.calls;
      gl.info.autoReset = true;
      return { kare: n, cagri: c / Math.max(1, n), ms: ms / Math.max(1, n) };
    };
    const isler = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 6000) { isler.push(window.__perf().isMs); await bekle(250); }
    isler.sort((a, b) => a - b);
    const toplam = await say(4000);
    gl.shadowMap.autoUpdate = false;
    const ana = await say(4000);
    gl.shadowMap.autoUpdate = true; gl.shadowMap.needsUpdate = true;
    const toplam2 = await say(4000);
    return {
      kareMs: +((toplam.ms + toplam2.ms) / 2).toFixed(1),
      isMsP50: +isler[Math.floor(isler.length / 2)].toFixed(1),
      cagriToplam: Math.round((toplam.cagri + toplam2.cagri) / 2),
      cagriAna: Math.round(ana.cagri),
      cagriGolge: Math.round((toplam.cagri + toplam2.cagri) / 2 - ana.cagri),
      donukKareMs: +ana.ms.toFixed(1),
    };
  });
  return r;
}

async function pano() {
  const { readFileSync } = await import('node:fs');
  const oku = (f) => JSON.parse(readFileSync(path.join(OUT, f), 'utf8'));
  const P = { once: oku('golge-once-perf.json').durumlar, sonra: oku('golge-sonra.json').durumlar };
  const ort = (d, k, a) => ((d[k].perf1[a] + d[k].perf2[a]) / 2).toFixed(a.startsWith('cagri') ? 0 : 1);
  const alt = (et, k) => `kare ${ort(P[et], k, 'kareMs')} ms · iş p50 ${ort(P[et], k, 'isMsP50')} ms · gölge çağrısı <b>${ort(P[et], k, 'cagriGolge')}</b> (ana ${ort(P[et], k, 'cagriAna')})`;
  const b64 = (f) => `data:image/png;base64,${readFileSync(path.join(OUT, f)).toString('base64')}`;
  const W = 360;
  const cift = (kat, ad, baslik, k) => `<div class="c"><h3>${baslik}</h3><div class="r">
    <figure><img src="${b64(`golge-once-${kat}-${ad}.png`)}" style="width:${W}px"><figcaption>ÖNCE · ${alt('once', k)}</figcaption></figure>
    <figure><img src="${b64(`golge-sonra-${kat}-${ad}.png`)}" style="width:${W}px"><figcaption>SONRA · ${alt('sonra', k)}</figcaption></figure></div></div>`;
  const tek = (f, e) => `<figure><img src="${b64(f)}" style="width:${W}px"><figcaption>${e}</figcaption></figure>`;
  const t = await tarayici.newContext({ viewport: { width: 1600, height: 600 }, deviceScaleFactor: 1 });
  const s = await t.newPage();
  await s.setContent(`<html><body style="margin:0;background:#1d1b2e;font:600 15px system-ui;color:#fff">
    <h1 style="margin:14px 20px 4px;font-size:24px">S4 gölge · küçük prop castShadow kapalı + zayıf cihaz 1024 — önce / sonra (aynı kadraj, sim donuk)</h1>
    <p style="margin:0 20px;color:#cfc8e8">Sayılar: 4× CPU kısma, ?f2golge=2048&f2fps=0, iki koşu ortalaması, kadraj = oyunun takip kamerası (durum K1 Kat 1 geç / K2 Kat 2 tam). Kareler: sabit sinema kadrajı.</p>
    <div class="g">${cift('kat1', 'genis', 'Kat 1 geç — geniş', 'K1')}${cift('kat1', 'yakin', 'Kat 1 — tezgâh + raf bardakları', 'K1')}</div>
    <div class="g">${cift('kat2', 'genis', 'Kat 2 tam — geniş', 'K2')}${cift('kat2', 'yakin', 'Kat 2 — cezve ocağı + fincanlar + korkuluk', 'K2')}</div>
    <div class="c" style="margin:0 20px 16px"><h3>Zayıf cihaz kolu — harita 1024 (sonra)</h3><div class="r">
      ${tek('golge-zayif1024-kat1-genis.png', 'Kat 1 geniş · 1024')}${tek('golge-zayif1024-kat2-genis.png', 'Kat 2 geniş · 1024')}${tek('golge-zayif1024-kat2-yakin.png', 'Kat 2 yakın · 1024')}${tek('golge-sonra-kat2-yakin.png', 'Kat 2 yakın · 2048 (karşılaştırma)')}</div></div>
    <style>.g{display:flex;gap:24px;padding:6px 20px}.c h3{margin:6px 0;font-size:17px}.r{display:flex;gap:10px}figure{margin:0;width:${W}px}img{display:block;border-radius:8px}figcaption{font-size:12.5px;font-weight:500;color:#e8e4f6;margin-top:4px;line-height:1.3}b{color:#ffd166}</style></body></html>`);
  await s.waitForTimeout(300);
  const dosya = path.join(OUT, 'golge-once-sonra.png');
  await s.screenshot({ path: dosya, fullPage: true });
  console.log('PANO', dosya);
}

try {
  if (KIP === 'pano') await pano();
  if (KIP === 'hepsi' || KIP === 'kare' || KIP === 'envanter') {
    const sorgu = HARITA ? `?f2golge=${HARITA}` : '';
    const s = await sayfa(sorgu, 0);
    await kat1Gec(s);
    if (KIP !== 'envanter') await kareler(s, 'kat1');
    if (KIP !== 'kare') sonuc.durumlar.K1 = { envanter: await envanter(s) };
    await kat2Tam(s);
    if (KIP !== 'envanter') await kareler(s, 'kat2');
    if (KIP !== 'kare') sonuc.durumlar.K2 = { envanter: await envanter(s) };
    await s.context().close();
  }
  if (KIP === 'hepsi' || KIP === 'perf') {
    for (let kosu = 1; kosu <= 2; kosu++) {
      const s = await sayfa(`?f2golge=${HARITA || 2048}&f2fps=0`, 0);
      await kat1Gec(s);
      const cdp = await s.context().newCDPSession(s);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const k1 = await olc(s);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await kat2Tam(s);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const k2 = await olc(s);
      (sonuc.durumlar.K1 ??= {})[`perf${kosu}`] = k1;
      (sonuc.durumlar.K2 ??= {})[`perf${kosu}`] = k2;
      console.log('KOŞU', kosu, JSON.stringify({ k1, k2 }));
      await s.context().close();
    }
  }
} finally {
  sonuc.hatalar = hatalar.slice(0, 10);
  if (KIP === 'pano') { await tarayici.close(); await sunucu.close(); process.exit(0); }
  const dosya = path.join(OUT, `golge-${ETIKET}${KIP === 'hepsi' ? '' : '-' + KIP}.json`);
  writeFileSync(dosya, JSON.stringify(sonuc, null, 1));
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 5));
  console.log('JSON', dosya);
  await tarayici.close();
  await sunucu.close();
}
