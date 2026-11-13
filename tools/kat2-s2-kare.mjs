/**
 * kat2-s2-kare.mjs — K2-S2 · ajan D: Kat 2 döngü kanıtı kareleri (iki ocak · garson · kalkış · tüm kat)
 * + BÖLME GÖSTER-SEÇ panosu + kare maliyeti. Oyunun kendi kadrajı; durum `__setState` ile kurulur.
 * Dünya oyunun kendi `yeniKat2Dunya`sından kurulur (şema değişse de araç kırılmasın), garson için
 * config'e geçici `kat2.garson` yazılır (yalnız bu sayfada; config dosyasına dokunmaz — sayılar
 * ölçülmedi, kareler GERÇEK garson mantığıyla çekilir).
 *
 * Kullanım: node tools/kat2-s2-kare.mjs [klasör] [bölüm…]
 *   bölümler: dongu · bolme · perf  (verilmezse hepsi)  ·  port: BAK_PORT (varsayılan 4111)
 * Vite API ile, HMR + dosya izleme KAPALI (paralel ajanlar dosya yazıyor; sayfa yeniden yüklenmesin).
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 4111);
const OUT = path.resolve(process.argv[2] ?? path.join(KOK, 'docs/sprintler/kat2-S2/kareler'));
const BOLUM = new Set(process.argv.slice(3).length ? process.argv.slice(3) : ['dongu', 'bolme', 'perf']);
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');
/** Kareler için garson (yalnız görsel kanıt; sayılar ölçülmedi → config'e yazılmaz). */
const GARSON = { hiz: 2.2, tepsi: 3, sayi: 1 };

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];

async function sayfa(sorgu = '') {
  const baglam = await tarayici.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await s.goto(`http://127.0.0.1:${PORT}/${sorgu}`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function');
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000 }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(1500);
  // Ham Kat 2 dünyası (`__game` anlık görüntüsü garsonu/ocakları henüz taşımıyor — devHooks Claude'da).
  await s.evaluate(async () => {
    const { useGame } = await import('/src/game/store.ts');
    window.__k2 = () => useGame.getState().kat2Dunya;
  });
  return s;
}

/** Oyunun sabitleri (zincir, masa yerleri, ocaklar, garson pad'i) — sayfanın kendi modüllerinden. */
async function sabitler(s) {
  return s.evaluate(async () => {
    const kat = await import('/src/game/kat.ts');
    const cfg = await import('/src/config/economy.config.ts');
    return {
      masalar: kat.KAT2_MASALAR.map((m) => ({ id: m.id, tur: m.tur, x: m.x, z: m.z })),
      ocaklar: kat.OCAKLAR.map((o) => ({ id: o.id, x: o.x, z: o.z, al: o.al })),
      garsonPad: kat.KAT2_GARSON_PAD,
      zincir: cfg.economyConfig.kat2.padler.map((p) => p.id),
    };
  });
}

async function garsonAc(s, ac) {
  await s.evaluate(async ([g, ac]) => {
    const cfg = await import('/src/config/economy.config.ts');
    if (ac) cfg.economyConfig.kat2.garson = g;
    else delete cfg.economyConfig.kat2.garson;
  }, [GARSON, ac]);
}

/**
 * Kat 2 durumu: `padsDone` + masa yamaları (`m`: id → alanlar) + ocak hazırları + oyuncu tepsisi +
 * yığınlar + (varsa) garson yaması. Taban oyunun kendi `yeniKat2Dunya`sı.
 */
async function kur(s, d, oyuncu) {
  await s.evaluate(async ([d, p]) => {
    const dongu = await import('/src/game/kat2Dongu.ts');
    const cfg = await import('/src/config/economy.config.ts');
    const w = dongu.yeniKat2Dunya(d.padsDone, cfg.economyConfig.kat2);
    w.masalar = w.masalar.map((m) => ({ ...m, ...(d.m?.[m.id] ?? {}) }));
    if (d.hazir) w.ocaklar = w.ocaklar.map((o, i) => ({ ...o, hazir: d.hazir[i] ?? o.hazir, demT: d.demT ?? o.demT }));
    w.tepsi = d.tepsi ?? 0;
    w.paralar = d.paralar ?? [];
    if (d.garson !== undefined) w.garson = d.garson;
    window.__setState({ kat2: { acik: true, padsDone: d.padsDone }, kat2Dunya: w, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    if (p) window.__teleport(p[0], p[1]);
  }, [d, oyuncu]);
}

async function kare(s, ad, bekle = 1500, clip) {
  await s.waitForTimeout(bekle);
  const dosya = path.join(OUT, `${ad}.png`);
  await s.screenshot({ path: dosya, clip });
  const d = await s.evaluate(async () => {
    const w = (await import('/src/game/store.ts')).useGame.getState().kat2Dunya;
    return {
      ocaklar: w.ocaklar?.map((o) => `${o.id}:${o.hazir}${o.demT > 0 ? '~' : ''}`).join(' '),
      garson: w.garson ? `${w.garson.x.toFixed(1)},${w.garson.z.toFixed(1)} tepsi ${w.garson.tepsi} → ${w.garson.hedef}` : null,
      masalar: w.masalar.filter((m) => m.durum !== 'kapali' && m.durum !== 'bos').map((m) => `${m.id}:${m.durum}${m.istek ? '+' + m.istek : ''}`).join(' '),
    };
  });
  console.log(ad, JSON.stringify(d));
  return dosya;
}

/** Yan yana pano (≤ 1600 px): her sütun bir aday (üstten alta kareler) + harf. */
async function pano(ad, sutunlar, etiketler, baslik, satirlar = []) {
  const s = await (await tarayici.newContext({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 1 })).newPage();
  const w = Math.floor((1600 - 20 * (sutunlar.length + 1)) / sutunlar.length);
  const res = (f) => `<img src="data:image/png;base64,${readFileSync(f).toString('base64')}" style="width:${w}px">`;
  const img = sutunlar.map((f, i) => `<figure><figcaption>${etiketler[i]}</figcaption>${f.map(res).join('')}</figure>`).join('');
  const not = satirlar.length ? `<p style="margin:4px 20px 0;font:500 17px system-ui;color:#cfc8e8">${satirlar.join(' · ')}</p>` : '';
  await s.setContent(`<html><body style="margin:0;background:#1d1b2e;font:700 24px system-ui;color:#fff"><h1 style="margin:14px 20px 0;font-size:28px">${baslik}</h1>${not}<div style="display:flex;gap:20px;padding:14px 20px 20px">${img}</div><style>figure{margin:0}img{display:block;border-radius:10px;margin-top:8px}figcaption{text-align:center}</style></body></html>`);
  await s.waitForTimeout(300);
  const dosya = path.join(OUT, `pano-${ad}.png`);
  await s.screenshot({ path: dosya, fullPage: true });
  await s.context().close();
  console.log('PANO', dosya);
}

const OYUNDA = (ek = {}) => ({ durum: 'oyunda', t: 170, kahveT: 99, ...ek });
/** Zincirin ilk n pad'i (D-186 sırası config'ten). */
const ilk = (S, son) => S.zincir.slice(0, S.zincir.indexOf(son) + 1);

async function bekleKosul(s, fn, arg, sn = 20) {
  try {
    await s.waitForFunction(fn, arg, { timeout: sn * 1000, polling: 50 });
    return true;
  } catch {
    console.log('ZAMAN AŞIMI', fn.toString().slice(0, 80));
    return false;
  }
}

try {
  if (BOLUM.has('dongu')) {
    const s = await sayfa();
    const S = await sabitler(s);
    console.log('OCAKLAR', JSON.stringify(S.ocaklar), 'GARSON PAD', S.garsonPad);
    const hepsi = S.zincir;
    const o2 = S.ocaklar[1];

    // 1 · iki ocak dolu (ikisi de pişiriyor) — üstten, bant + okey salonu
    const ikiOcak = ilk(S, 'k2cezve2');
    const mm1 = {};
    for (const m of S.masalar) if (ikiOcak.includes(m.id)) mm1[m.id] = OYUNDA();
    await kur(s, { padsDone: ikiOcak, m: mm1, hazir: [3, 4], demT: 1 }, [o2.al[0], o2.al[1] + 1.2]);
    await s.evaluate(([x, z]) => window.__sinema({ pos: [x - 1, 22, z + 14], bak: [x - 1, 0, z - 4.5], fov: 44 }), [o2.x, o2.z]);
    await kare(s, 'dongu-1a-iki-ocak-ustten', 1500);
    await s.evaluate(() => window.__sinema(null));
    await kare(s, 'dongu-1b-ikinci-ocak-oyun-kadraji', 1500);
    // 1c · 2. ocak pad'i biter → ocak yerinde büyür (Dogus)
    await kur(s, { padsDone: ikiOcak.slice(0, -1), m: mm1, hazir: [3] }, [o2.al[0], o2.al[1] + 1.2]);
    await s.waitForTimeout(800);
    await s.evaluate((p) => window.__setState({ kat2: { acik: true, padsDone: p } }), ikiOcak);
    await kare(s, 'dongu-1c-ocak-buyuyor', 20);

    // 2-3 · garson: GERÇEK mantıkla (config'e geçici garson) — tavla isteği → ocaktan alır → masaya
    await garsonAc(s, true);
    const mm2 = {};
    for (const m of S.masalar) if (m.tur === 'okey') mm2[m.id] = OYUNDA();
    const hedef = 'k2tavla6';
    mm2[hedef] = OYUNDA({ istek: 2, sabir: 99, kahveT: 99 });
    mm2.k2tavla2 = OYUNDA();
    mm2.k2tavla9 = OYUNDA();
    const tm = S.masalar.find((m) => m.id === hedef);
    await kur(s, { padsDone: hepsi, m: mm2, hazir: [4, 4] }, [tm.x - 2.5, tm.z + 2.5]);
    await bekleKosul(s, () => { const g = window.__k2().garson; return g && g.tepsi > 0; });
    // tepsi doldu: masaya giderken birkaç kare (yolun ortası)
    await s.waitForTimeout(1200);
    const g1 = await s.evaluate(() => window.__k2().garson);
    await s.evaluate(([x, z]) => window.__sinema({ pos: [x, 11, z + 9], bak: [x, 0.6, z - 0.5], fov: 44 }), [g1.x, g1.z]);
    await kare(s, 'dongu-2-garson-tepsiyle-tavlaya', 120);
    await s.evaluate(() => window.__sinema(null));
    await s.evaluate(([x, z]) => window.__sinema({ pos: [x - 2, 11, z + 8.5], bak: [x - 2, 0.6, z], fov: 50 }), [tm.x, tm.z]);
    await bekleKosul(s, ([x, z]) => { const g = window.__k2().garson; return g && g.tepsi > 0 && Math.hypot(g.x - x, g.z - z) < 3.6; }, [tm.x, tm.z]);
    await kare(s, 'dongu-3-garson-masaya-variyor', 0);
    await bekleKosul(s, (id) => window.__k2().masalar.find((m) => m.id === id).istek === 0, hedef);
    await kare(s, 'dongu-3b-garson-servis', 60);
    await s.evaluate(() => window.__sinema(null));

    // 4 · grup kalkışı: oyun biter → kalkar, yürür. Bir kez kare-içi (doğal tick), bir kez
    // `__advanceTime` ile toplu tick (S1'de kaçıyordu): ikisinde de gövdeler yürümeli.
    const mm4 = { k2okey2: OYUNDA({ t: 0.3 }), k2tavla5: OYUNDA() };
    await kur(s, { padsDone: hepsi, m: mm4, hazir: [2, 2] }, [-4.2, -1.0]);
    await kare(s, 'dongu-4a-kalkis', 1100);
    await kare(s, 'dongu-4b-kalkis-yuruyor', 900);
    await kur(s, { padsDone: hepsi, m: { k2okey2: OYUNDA({ t: 5 }) }, hazir: [2, 2] }, [-4.2, -1.0]);
    await s.waitForTimeout(400);
    await s.evaluate(() => window.__advanceTime(6));
    await kare(s, 'dongu-4c-kalkis-toplu-tick', 900);

    // 5 · bütün kat (22 masa · 2 ocak · garson), üstten
    const mm5 = {};
    S.masalar.forEach((m, i) => { mm5[m.id] = i % 3 === 2 ? { durum: 'bos', t: 30 } : OYUNDA({ istek: m.tur === 'tavla' && i % 4 === 0 ? 1 : 0, sabir: 99 }); });
    await kur(s, { padsDone: hepsi, m: mm5, hazir: [4, 4] }, [0, -8]);
    await s.waitForTimeout(2500);
    await s.evaluate(() => window.__sinema({ pos: [0, 46, 27], bak: [0, 0, -0.5], fov: 50 }));
    await kare(s, 'dongu-5-tum-kat', 1500);
    await s.evaluate(() => window.__sinema(null));
    await garsonAc(s, false);
    await s.context().close();
  }

  if (BOLUM.has('bolme')) {
    // D-190 alçak bölme: açık iki salon + KİLİTLİ salon (geçit perdeli, ötesi çizilmez) aynı kadrajlarda.
    const sutunlar = [];
    for (const [ad, sonPad] of [['acik', 'k2salon3'], ['kilitli', 'k2okey4']]) {
      const s = await sayfa('');
      const S = await sabitler(s);
      const acik = S.zincir.slice(0, S.zincir.indexOf(sonPad) + 1);
      const mm = {};
      for (const m of S.masalar) if (acik.includes(m.id)) mm[m.id] = OYUNDA();
      await kur(s, { padsDone: acik, m: mm, hazir: [2, 2] }, [-13.8, 0.9]);
      await s.evaluate(() => window.__girdi(0, -1));
      await s.waitForTimeout(500);
      await s.evaluate(() => window.__girdi(0, 0));
      await s.waitForTimeout(200);
      await s.evaluate(() => window.__teleport(-13.8, -0.5));
      const k1 = await kare(s, `bolme-${ad}-1-arkada`, 1300, { x: 0, y: 140, width: 440, height: 560 });
      await kur(s, { padsDone: acik, m: mm, hazir: [2, 2] }, [-8.8, 6.0]);
      const k2 = await kare(s, `bolme-${ad}-2-oyun`, 1300, { x: 0, y: 140, width: 440, height: 560 });
      await kur(s, { padsDone: acik, m: mm, hazir: [2, 2] }, [-9.5, -3.2]);
      const k3 = await kare(s, `bolme-${ad}-3-oyun`, 1300, { x: 0, y: 140, width: 440, height: 560 });
      await kur(s, { padsDone: acik, m: mm, hazir: [2, 2] }, [8.8, -3.2]);
      const k4 = await kare(s, `bolme-${ad}-4-tavla-gecidi`, 1300, { x: 0, y: 140, width: 440, height: 560 });
      sutunlar.push([k1, k2, k3, k4]);
      await s.context().close();
    }
    await pano('bolme', sutunlar, ['salonlar açık', 'okey salonu kilitli'],
      'D-190 alçak bölme (1,2)', ['1: oyuncu bölmenin arkasında', '2: okey salonundan', '3: merdiven salonundan', '4: tavla geçidi']);
  }

  if (BOLUM.has('akis')) {
    // Kat 2 akışı: her adımda oyuncu sıradaki pad'in önünde (pad kadrajın üst yarısında), öncesi açık ve dolu.
    const adimlar = ['k2okey1', 'k2cezve', 'k2okey2', 'k2salon2', 'k2s2okey1', 'k2cezve2', 'k2salon3', 'k2garson', 'k2tavla1', null];
    for (const [i, hedef] of adimlar.entries()) {
      const s = await sayfa('');
      const S = await sabitler(s);
      const pads = hedef ? S.zincir.slice(0, S.zincir.indexOf(hedef)) : S.zincir;
      const mm = {};
      for (const m of S.masalar) if (pads.includes(m.id)) mm[m.id] = OYUNDA({ istek: i % 2, sabir: 99 });
      const yer = hedef ? await s.evaluate(async (id) => (await import('/src/game/kat2Dongu.ts')).kat2PadYeri(id), hedef) : null;
      const [px, pz] = yer ? [yer[0], yer[1] + 2.4] : [0, 6];
      await kur(s, { padsDone: pads, m: mm, hazir: [pads.includes('k2cezve') ? 2 : 0, pads.includes('k2cezve2') ? 2 : 0] }, [px, pz]);
      await kare(s, `akis-${String(i + 1).padStart(2, '0')}-${hedef ?? 'son'}`, 1500, { x: 0, y: 140, width: 440, height: 560 });
      await s.context().close();
    }
  }

  if (BOLUM.has('perf')) {
    const s = await sayfa();
    const S = await sabitler(s);
    const olc = async (ad) => {
      await s.waitForTimeout(1500);
      const ornek = [];
      for (let i = 0; i < 25; i++) {
        ornek.push(await s.evaluate(() => window.__perf()));
        await s.waitForTimeout(200);
      }
      const ort = (k) => ornek.reduce((a, o) => a + o[k], 0) / ornek.length;
      console.log('PERF', ad, JSON.stringify({ isMs: +ort('isMs').toFixed(2), calls: Math.round(ort('calls')), tris: Math.round(ort('tris')), fps: +ort('fps').toFixed(1) }));
    };
    await s.evaluate(() => window.__kat2(1));
    await s.waitForTimeout(1500);
    await s.evaluate(() => window.__advanceTime(120));
    await s.evaluate(() => window.__teleport(0, -2));
    await olc('kat1-salon');
    await s.evaluate(() => window.__kat2(2));
    await s.waitForTimeout(1500);
    await kur(s, { padsDone: [] }, [0, -6]);
    await olc('kat2-bos');
    const okey = ilk(S, 'k2okey4');
    const m4 = { k2okey1: OYUNDA({ istek: 2, sabir: 99 }), k2okey2: OYUNDA(), k2okey3: OYUNDA(), k2okey4: OYUNDA() };
    await kur(s, { padsDone: okey, m: m4, hazir: [3], paralar: [{ id: 905, x: -13, z: -3.3, miktar: 120 }] }, [-9, -1.4]);
    await olc('kat2-4okey-dolu');
    const mm = {};
    S.masalar.forEach((m) => { mm[m.id] = OYUNDA({ t: 9999, istek: m.tur === 'tavla' ? 1 : 0, sabir: 999, kahveT: 999 }); });
    // S1 eşi (aynı koşuda, makine gürültüsü ayrılsın): 22 masa, 2. ocak ve garson YOK
    await kur(s, { padsDone: S.zincir.filter((id) => id !== 'k2cezve2' && id !== S.garsonPad), m: mm, hazir: [4] }, [0, -8]);
    await s.evaluate(() => window.__sinema({ pos: [0, 30, 30], bak: [0, 0, 1], fov: 42 }));
    await olc('kat2-22masa-ustten-S1-esi');
    await s.evaluate(() => window.__sinema(null));
    await kur(s, { padsDone: S.zincir.filter((id) => id !== 'k2cezve2' && id !== S.garsonPad), m: mm, hazir: [4] }, [8.5, 6]);
    await olc('kat2-tavla-oyun-S1-esi');
    // S2: 2 ocak + garson, oyun kadrajı (tavla köşesi)
    await garsonAc(s, true);
    await kur(s, { padsDone: S.zincir, m: mm, hazir: [4, 4] }, [8.5, 6]);
    await olc('kat2-tavla-garson-oyun');
    await s.evaluate(() => window.__sinema({ pos: [0, 30, 30], bak: [0, 0, 1], fov: 42 }));
    await olc('kat2-22masa-2ocak-garson-ustten');
    await s.evaluate(() => window.__sinema(null));
    await garsonAc(s, false);
    await s.context().close();
  }
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
