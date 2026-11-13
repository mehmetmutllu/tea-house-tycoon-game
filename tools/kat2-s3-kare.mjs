/**
 * kat2-s3-kare.mjs — K2-S3 · ajan B: MASA SEVİYESİ göz kareleri + tek birleşik pano (≤ 1600 px).
 *  1. sıra: okey yol G Sv1…Sv5 · 2. sıra: tavla yol A Sv1…Sv5 — her sırada birebir aynı kadraj
 *  3. sıra: oyun mesafesinden salon (karışık Sv, gruplar oturuyor) · Sv işaretleri (çerçeve + dolan bar) ·
 *     Sv atlama anı (masa yerinde seker, toz)
 * Görünüş store'daki `kat2.masaSv`den türer; durum `__setState` ile kurulur. Sv işaretleri için config'e
 * GEÇİCİ `kat2.masaSv` yazılır (yalnız bu sayfada, dosyaya değil — sayılar ölçülmedi, A'nın kararı).
 * Kat 2'de `__teleport`/`__devCam` kadrajı değiştirmez → kamera `__sinema`.
 *
 * Kullanım: node tools/kat2-s3-kare.mjs [klasör]   ·  port: BAK_PORT (varsayılan 4113)
 * Vite API ile, HMR + dosya izleme KAPALI (paralel ajanlar dosya yazıyor; sayfa yeniden yüklenmesin).
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 4113);
const OUT = path.resolve(process.argv[2] ?? path.join(KOK, 'docs/sprintler/kat2-S3/kareler'));
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
/** Yalnız işaret karesi için (fiyat sırası görünür olsun diye; ölçülmüş sayı DEĞİL). */
const KOL = { fiyat: [0, 900, 2400, 6000, 15000], ucretCarpan: [1, 1, 1, 1, 1], kahveAralikCarpan: [1, 1, 1, 1, 1], gelisAralikCarpan: [1, 1, 1, 1, 1] };
const KARE = { x: 0, y: 258, width: 440, height: 440 };
const SALON = { x: 0, y: 160, width: 440, height: 560 };

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];
let kareSayisi = 0;

async function sayfa() {
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
  return s;
}

/**
 * Kat 2 durumu: bütün pad'ler açık, `sv` (masa id → Sv) + masa yamaları (`m`) + padFill. Taban oyunun
 * kendi `yeniKat2Dunya`sı; masalar varsayılan BOŞ ve uzun süre gelmez (boş oturak okunur).
 */
async function kur(s, d) {
  return s.evaluate(async (d) => {
    const dongu = await import('/src/game/kat2Dongu.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const { useGame } = await import('/src/game/store.ts');
    const k = useGame.getState().kat2;
    const hepsi = cfg.economyConfig.kat2.padler.map((p) => p.id);
    if (d.kol) cfg.economyConfig.kat2.masaSv = { okey: d.kol, tavla: d.kol };
    else delete cfg.economyConfig.kat2.masaSv;
    const w = dongu.yeniKat2Dunya(hepsi, cfg.economyConfig.kat2);
    w.masalar = w.masalar.map((m) => ({ ...m, durum: 'bos', t: 9999, ...(d.m?.[m.id] ?? {}) }));
    w.ocaklar = w.ocaklar.map((o) => ({ ...o, hazir: 3 }));
    w.padFill = { ...(d.fill ?? {}) };
    w.paralar = [];
    const masaSv = {};
    for (const m of w.masalar) masaSv[m.id] = typeof d.sv === 'number' ? d.sv : d.sv?.[m.id] ?? 1;
    window.__setState({ kat2: { ...k, acik: true, padsDone: hepsi, masaSv }, kat2Dunya: w, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    window.__teleport(d.oyuncu?.[0] ?? 0, d.oyuncu?.[1] ?? -8);
    return { masalar: w.masalar.map((m) => ({ id: m.id, x: m.x, z: m.z })), tur: Object.fromEntries((await import('/src/game/kat.ts')).KAT2_MASALAR.map((m) => [m.id, { tur: m.tur, x: m.x, z: m.z }])) };
  }, d);
}

async function kare(s, ad, bekle, clip) {
  await s.waitForTimeout(bekle);
  const dosya = path.join(OUT, `${ad}.png`);
  await s.screenshot({ path: dosya, clip });
  kareSayisi++;
  return dosya;
}

const sinema = (s, pos, bak, fov = 45) => s.evaluate(([pos, bak, fov]) => window.__sinema({ pos, bak, fov }), [pos, bak, fov]);
const OYUNDA = { durum: 'oyunda', t: 9999, kahveT: 999 };

try {
  const s = await sayfa();
  const S = await kur(s, { sv: 1 });
  const masa = (id) => S.tur[id];

  // 1-2 · Sv1…Sv5: bütün masalar aynı Sv; okey (sol salon) ve tavla (sağ salon) aynı kadrajda
  const okey = masa('k2s2okey5');
  const tavla = masa('k2tavla3');
  const sira = { okey: [], tavla: [] };
  for (let sv = 1; sv <= 5; sv++) {
    await kur(s, { sv });
    await sinema(s, [okey.x, 5.4, okey.z + 5.4], [okey.x, 0.45, okey.z]);
    sira.okey.push(await kare(s, `sv-okey-${sv}`, sv === 1 ? 3500 : 1500, KARE));
    await sinema(s, [tavla.x, 5.0, tavla.z + 5.0], [tavla.x, 0.45, tavla.z]);
    sira.tavla.push(await kare(s, `sv-tavla-${sv}`, 1200, KARE));
  }

  // 3 · oyun mesafesi (kamera oyunun takip ofseti: d = 8,5 × portre 1,3): N7, karışık Sv, gruplar oturuyor
  const karisik = {};
  const m3 = {};
  for (const m of S.masalar) {
    const t = S.tur[m.id];
    // tavla: sıra (z) öne doğru Sv1→Sv5 (z 2,5 ve 4,9 Sv1-2 … 12,1+ Sv5) · okey: sıra başına Sv1/Sv3/Sv5
    const zi = [2.5, 4.9, 7.3, 9.7, 12.1, 14.5].indexOf(t.z);
    karisik[m.id] = t.tur === 'tavla' ? Math.min(5, zi + 1) : t.z === 2.5 ? 1 : t.z === 8.5 ? 3 : 5;
    m3[m.id] = OYUNDA;
  }
  await kur(s, { sv: karisik, m: m3, oyuncu: [9.8, 9] });
  const D = 8.5 * 1.3;
  await sinema(s, [7.6, D, 9 + D], [7.6, 0.8, 9], 50);
  const salon = await kare(s, 'salon-oyun-mesafesi', 3500, SALON);

  // 4 · Sv işaretleri: geçici kol → masanın yanında çerçeve, birinde bar %45 dolu
  const fill = { 'sv:k2tavla3': KOL.fiyat[karisik.k2tavla3] * 0.45 };
  // oyuncu yakında (işaret 'konuşan' kademede yazısını gösterir), çerçevelerin dışında
  await kur(s, { sv: karisik, m: m3, kol: KOL, fill, oyuncu: [10.6, 6.1] });
  await sinema(s, [8.6, D, 6 + D], [8.6, 0.8, 6], 50);
  const isaret = await kare(s, 'sv-isaretleri', 2500, SALON);
  const tetik = await s.evaluate(async () => {
    const dongu = await import('/src/game/kat2Dongu.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const { useGame } = await import('/src/game/store.ts');
    const g = useGame.getState();
    return dongu.kat2SvTetikleri(cfg.economyConfig.kat2, g.kat2.padsDone, g.kat2.masaSv ?? {}).length;
  });

  // 5 · Sv atlama anı: Sv3 → Sv4 (masa büyür) yerinde sekme + toz, ~0,15 sn sonra
  await kur(s, { sv: 3, oyuncu: [0, -8] });
  await sinema(s, [okey.x, 5.4, okey.z + 5.4], [okey.x, 0.45, okey.z]);
  await s.waitForTimeout(1500);
  await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    const k = useGame.getState().kat2;
    const masaSv = Object.fromEntries(Object.keys(k.masaSv ?? {}).map((id) => [id, 4]));
    window.__setState({ kat2: { ...k, masaSv } });
  });
  const sekme = await kare(s, 'sv-atlama-ani', 150, KARE);
  await s.evaluate(() => window.__sinema(null));
  await kur(s, { sv: 1 });
  await s.context().close();
  console.log('TETİK SAYISI (kol varken)', tetik);

  // ---- PANO ----
  const p = await (await tarayici.newContext({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 1 })).newPage();
  const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
  const W = Math.floor((1600 - 20 * 6) / 5);
  const satir = (dosyalar, etiketler) =>
    `<div class="s">${dosyalar.map((f, i) => `<figure><figcaption>${etiketler[i]}</figcaption><img src="${b64(f)}" style="width:${W}px"></figure>`).join('')}</div>`;
  const SV = ['Sv1', 'Sv2', 'Sv3', 'Sv4', 'Sv5'];
  const W3 = Math.floor((1600 - 20 * 4) / 3);
  const alt = [[salon, 'Oyun mesafesi: tavla sıraları Sv1→Sv5 (öne doğru)'], [isaret, 'Sv işaretleri: masanın yanında, altta dolan bar'], [sekme, 'Sv3→Sv4 anı: yerinde seker + toz']];
  await p.setContent(`<html><body style="margin:0;background:#1d1b2e;font:700 22px system-ui;color:#fff">
    <h1 style="margin:14px 20px 0;font-size:26px">K2-S3 · masa seviyesi — okey yol G · tavla yol A (D-181)</h1>
    <h2 style="margin:10px 20px 0;font-size:20px;color:#cfc8e8">Okey: tabure → ahşap sandalye → mavi minder → çerçeveli masa büyür → döşemeli sandalye + pirinç + çay</h2>
    ${satir(sira.okey, SV)}
    <h2 style="margin:4px 20px 0;font-size:20px;color:#cfc8e8">Tavla: sade kutu → kakma tavla → minderli tabure → masa büyür → pirinç + çay + zar</h2>
    ${satir(sira.tavla, SV)}
    <div class="s">${alt.map(([f, e]) => `<figure><figcaption>${e}</figcaption><img src="${b64(f)}" style="width:${W3}px;height:${Math.round(W3 * 0.8)}px;object-fit:cover"></figure>`).join('')}</div>
    <style>.s{display:flex;gap:20px;padding:10px 20px}figure{margin:0}img{display:block;border-radius:10px;margin-top:6px}figcaption{text-align:center;font-size:18px}</style></body></html>`);
  await p.waitForTimeout(300);
  const dosya = path.join(OUT, 'pano-masa-sv.png');
  await p.screenshot({ path: dosya, fullPage: true });
  console.log('PANO', dosya, 'KARE', kareSayisi);
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
