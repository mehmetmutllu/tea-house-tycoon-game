/**
 * kat2-s1-kare.mjs — K2-S1 · ajan A: Kat 2 döngü kanıtı kareleri + GÖSTER-SEÇ aday panoları + kare
 * maliyeti (Kat 1 ↔ Kat 2). Oyunun kendi kadrajı, aynı kamera; durum `__setState` ile kurulur.
 *
 * Kullanım: node tools/kat2-s1-kare.mjs [klasör] [bölüm…]
 *   bölümler: dongu · balon · para · dis · perf  (verilmezse hepsi)
 *   port: BAK_PORT (varsayılan 4110)
 * Çıktı: <klasör>/dongu-*.png · <klasör>/aday-{balon,para,dis}-{A..D}.png · <klasör>/pano-*.png
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.BAK_PORT ?? 4110);
const OUT = path.resolve(process.argv[2] ?? path.join(KOK, 'docs/sprintler/kat2-S1/kareler'));
const BOLUM = new Set(process.argv.slice(3).length ? process.argv.slice(3) : ['dongu', 'balon', 'para', 'dis', 'perf']);
mkdirSync(OUT, { recursive: true });
const PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');

// KAT2_MASALAR sırası (kat.ts): 4 okey · okey salonu 6 · tavla köşesi 12.
const MASALAR = [
  ...[1, 2, 3, 4].map((i) => ({ id: `k2okey${i}`, tur: 'okey' })),
  ...[1, 2, 3, 4, 5, 6].map((i) => ({ id: `k2s2okey${i}`, tur: 'okey' })),
  ...Array.from({ length: 12 }, (_, i) => ({ id: `k2tavla${i + 1}`, tur: 'tavla' })),
];
const PARA_DZ = 1.25 + 0.35;

/** Kat 2 dünyası: `m` = { id: {durum,t,istek,sabir} } (verilmeyen masa: açıksa bos, değilse kapali). */
function dunya({ padsDone, m = {}, ocakHazir = 0, tepsi = 0, paralar = [], demT = 0 }) {
  return {
    masalar: MASALAR.map((x) => ({
      id: x.id,
      tur: x.tur,
      durum: padsDone.includes(x.id) ? 'bos' : 'kapali',
      t: 15,
      kahveT: 25,
      istek: 0,
      sabir: 0,
      birikim: 0,
      ...(m[x.id] ?? {}),
    })),
    ocakHazir,
    demT,
    tepsi,
    paralar,
    padFill: {},
    nextId: 1000,
  };
}

// HMR + dosya izleme KAPALI: paralel ajanlar dosya yazdıkça sayfa yeniden yüklenip kurulan durum
// sıfırlanıyordu (ilk koşuda kare 5'te açılış ekranı çıktı).
const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];

async function sayfa(k2gorsel = '') {
  const baglam = await tarayici.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const s = await baglam.newPage();
  s.on('pageerror', (e) => hatalar.push(e.message));
  s.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await s.goto(`http://127.0.0.1:${PORT}/${k2gorsel ? `?k2gorsel=${k2gorsel}` : ''}`, { waitUntil: 'networkidle' });
  await s.waitForFunction(() => typeof window.__game === 'function');
  await s.evaluate((pads) => window.__setState({ padsDone: pads, kafeAdi: 'Köşe', levelUp: null, offlineEarned: 0, ogreticiAtlandi: true, wallet: 200000 }), PADS);
  await s.evaluate(() => window.__advanceTime(2));
  await s.evaluate(() => window.__kat2(2));
  await s.waitForTimeout(1500);
  return s;
}

async function kur(s, d, oyuncu) {
  await s.evaluate(([d, p]) => {
    window.__setState({ kat2: { acik: true, padsDone: d.padsDone }, kat2Dunya: d.dunya, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    if (p) window.__teleport(p[0], p[1]);
  }, [{ padsDone: d.padsDone, dunya: dunya(d) }, oyuncu]);
}

async function kare(s, ad, bekle = 1500, clip) {
  await s.waitForTimeout(bekle);
  const dosya = path.join(OUT, `${ad}.png`);
  await s.screenshot({ path: dosya, clip });
  const k = await s.evaluate(() => window.__game().kat2);
  console.log(ad, JSON.stringify({ padsDone: k.padsDone, tepsi: k.tepsi, ocak: k.ocakHazir, para: k.paralar.length, masalar: k.masalar.filter((m) => m.durum !== 'kapali').map((m) => `${m.id}:${m.durum}${m.istek ? '+' + m.istek : ''}`).join(' ') }));
  return dosya;
}

/** Dünya noktası çevresinde css-px kırpma kutusu (takip kamerasının izdüşümü). */
async function kirp(s, x, y, z, w, h) {
  const [p] = await s.evaluate((q) => window.__izdusur([q]), [x, y, z]);
  if (!p) return undefined;
  const cx = ((p[0] + 1) / 2) * 440;
  const cy = ((1 - p[1]) / 2) * 956;
  return { x: Math.max(0, Math.min(440 - w, cx - w / 2)), y: Math.max(0, Math.min(956 - h, cy - h / 2)), width: w, height: h };
}

/** Yan yana pano (≤ 1600 px): aynı boydaki kareler + aday harfi. */
async function pano(ad, dosyalar, etiketler, baslik) {
  const s = await (await tarayici.newContext({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: 1 })).newPage();
  const w = Math.floor((1600 - 20 * (dosyalar.length + 1)) / dosyalar.length);
  const res = (f) => `<img src="data:image/png;base64,${readFileSync(f).toString('base64')}" style="width:${w}px">`;
  const img = dosyalar.map((f, i) => `<figure>${(Array.isArray(f) ? f : [f]).map(res).join('')}<figcaption>${etiketler[i]}</figcaption></figure>`).join('');
  await s.setContent(`<html><body style="margin:0;background:#1d1b2e;font:700 26px system-ui;color:#fff"><h1 style="margin:14px 20px 0;font-size:28px">${baslik}</h1><div style="display:flex;gap:20px;padding:14px 20px 20px">${img}</div><style>figure{margin:0}img{display:block;border-radius:10px;margin-bottom:8px}figcaption{margin-top:8px;text-align:center}</style></body></html>`);
  await s.waitForTimeout(300);
  const dosya = path.join(OUT, `pano-${ad}.png`);
  await s.screenshot({ path: dosya, fullPage: true });
  await s.context().close();
  console.log('PANO', dosya);
}

const TUM_OKEY = ['k2okey1', 'k2cezve', 'k2okey2', 'k2okey3', 'k2okey4'];
const OYUNDA = (ek = {}) => ({ durum: 'oyunda', t: 170, kahveT: 99, ...ek });

try {
  if (BOLUM.has('dongu')) {
    const s = await sayfa();
    // 1-2 · pad dolumu → masa belirir
    await kur(s, { padsDone: [] }, [-7.5, -4.9]);
    await kare(s, 'dongu-1-pad-doluyor', 1300);
    await kare(s, 'dongu-2-masa-belirdi', 3200);
    // 3 · grup merdivenden çıkıyor (okey2, mantıkta henüz 'bos'un sonu) → salonda masaya yürüyor ('geliyor')
    await kur(s, { padsDone: TUM_OKEY.slice(0, 3), m: { k2okey1: OYUNDA(), k2okey2: { durum: 'bos', t: 5.2 } } }, [-6, -9]);
    await s.evaluate(() => window.__sinema({ pos: [-5, 15, 5], bak: [-6, 0, -9], fov: 44 }));
    await kare(s, 'dongu-3a-grup-merdivende', 700);
    await kur(s, { padsDone: TUM_OKEY.slice(0, 3), m: { k2okey1: OYUNDA(), k2okey2: { durum: 'geliyor', t: 3.4 } } }, [-6, -9]);
    await kare(s, 'dongu-3b-grup-masaya', 500);
    await s.evaluate(() => window.__sinema(null));
    // 4 · oturan grup + kahve balonu
    await kur(s, { padsDone: TUM_OKEY, m: { k2okey1: OYUNDA({ istek: 2, sabir: 22 }), k2okey2: OYUNDA(), k2okey3: OYUNDA({ istek: 2, sabir: 9 }), k2okey4: OYUNDA() }, ocakHazir: 3 }, [-7.5, -1.6]);
    await kare(s, 'dongu-4-oturan-balon', 1500);
    // 5 · ocak + hazır fincanlar + tepside kahve
    await kur(s, { padsDone: TUM_OKEY, m: { k2okey1: OYUNDA({ istek: 2, sabir: 22 }) }, ocakHazir: 2, tepsi: 3, demT: 1 }, [-7.0, -7.6]);
    // oyuncu kameraya dönsün (tepsi gövdenin önünde): bir an +z'ye it, bırak
    await s.evaluate(() => window.__girdi(0, 1));
    await s.waitForTimeout(120);
    await s.evaluate(() => window.__girdi(0, 0));
    await kare(s, 'dongu-5-ocak-tepsi', 1500);
    // 6 · kalkış: oyun biter → grup kalkar, yığın masa önüne düşer
    await kur(s, { padsDone: TUM_OKEY, m: { k2okey1: OYUNDA({ t: 0.25 }) } }, [-4.2, -1.0]);
    await kare(s, 'dongu-6-kalkis-yigin', 1300);
    // 7 · toplama: oyuncu yığına yürür → sikkeler uçar, "+para" yazısı
    await kur(s, { padsDone: TUM_OKEY, paralar: [{ id: 901, x: -7.5, z: -4.9 + PARA_DZ, miktar: 150 }] }, [-3.6, -0.8]);
    await s.waitForTimeout(800);
    await s.evaluate(() => window.__teleport(-7.5, -4.9 + 1.6 + 0.9));
    await kare(s, 'dongu-7-toplama', 260);
    // 8 · bütün kat açık (salonlar + tavla), üstten sinema kamerası
    const hepsi = [...TUM_OKEY, 'k2salon2', ...MASALAR.slice(4, 10).map((m) => m.id), 'k2salon3', ...MASALAR.slice(10).map((m) => m.id)];
    const mm = {};
    MASALAR.forEach((m, i) => { mm[m.id] = i % 3 === 2 ? { durum: 'bos', t: 30 } : OYUNDA({ istek: i % 4 === 0 ? 2 : 0, sabir: 20 }); });
    await kur(s, { padsDone: hepsi, m: mm, ocakHazir: 4, paralar: [{ id: 902, x: 4, z: 3.8 + PARA_DZ, miktar: 110 }] }, [0, -8]);
    await s.evaluate(() => window.__sinema({ pos: [0, 30, 30], bak: [0, 0, 1], fov: 42 }));
    await kare(s, 'dongu-8-tum-kat', 1800);
    await s.evaluate(() => window.__sinema({ pos: [7, 13, 22], bak: [8, 0, 9], fov: 40 }));
    await kare(s, 'dongu-9-tavla-kosesi', 900);
    await s.evaluate(() => window.__sinema({ pos: [-8, 13, 21], bak: [-8, 0, 8], fov: 40 }));
    await kare(s, 'dongu-10-okey-salonu', 900);
    // 11 · ön salonlar kapalı: kaba inşaat + perdeli geçit
    await kur(s, { padsDone: TUM_OKEY }, [0, -8]);
    await s.evaluate(() => window.__sinema({ pos: [0, 24, 22], bak: [0, 0, 0], fov: 46 }));
    await kare(s, 'dongu-11-kapali-salonlar', 1200);
    await s.evaluate(() => window.__sinema(null));
    await s.context().close();
  }

  const adaylar = ['A', 'B', 'C', 'D'];
  if (BOLUM.has('balon')) {
    const dosyalar = [];
    for (const a of adaylar) {
      const s = await sayfa(`balon:${a}`);
      const ikili = [];
      for (const [x, istek] of [[-7.5, 2], [-13, 1]]) {
        await kur(s, { padsDone: TUM_OKEY, m: { k2okey1: OYUNDA({ istek: 2, sabir: 16 }), k2okey2: OYUNDA({ istek: 1, sabir: 6 }) } }, [x, -1.0]);
        await s.waitForTimeout(1600);
        ikili.push(await kare(s, `aday-balon-${a}-${istek}`, 100, await kirp(s, x, 1.6, -4.9, 360, 360)));
      }
      dosyalar.push(ikili);
      await s.context().close();
    }
    await pano('balon', dosyalar, adaylar.map((a) => `${a} · ${{ A: 'fincan + sayı', B: 'fincan adedi', C: 'cezve + rozet', D: 'fincan + sabır halkası' }[a]}`), 'Soru 1 · Kahve balonu (üst: masa 2 fincan istiyor · alt: 1 fincan)');
  }
  if (BOLUM.has('para')) {
    const dosyalar = [];
    for (const a of adaylar) {
      const s = await sayfa(`para:${a}`);
      await kur(s, { padsDone: TUM_OKEY, paralar: [{ id: 903, x: -7.5, z: -4.9 + PARA_DZ, miktar: 81 }, { id: 904, x: -13, z: -4.9 + PARA_DZ, miktar: 162 }] }, [-10.2, -0.5]);
      await s.waitForTimeout(1800);
      dosyalar.push(await kare(s, `aday-para-${a}`, 100, await kirp(s, -10.2, 0.3, -4.0, 430, 500)));
      await s.context().close();
    }
    await pano('para', dosyalar, adaylar.map((a) => `${a} · ${{ A: 'sikke kulesi', B: 'kese', C: 'banknot destesi', D: 'sikke tepesi' }[a]}`), 'Soru 2 · Para yığını (masa önünde yerde · sağ 81, sol 162)');
  }
  if (BOLUM.has('dis')) {
    const dosyalar = [];
    for (const a of adaylar) {
      const s = await sayfa(`dis:${a}`);
      await kur(s, { padsDone: [] }, null);
      await s.evaluate(() => window.__kat2(1));
      await s.waitForTimeout(1200);
      await s.evaluate(() => window.__kat2(2));
      await s.waitForTimeout(1500);
      dosyalar.push(await kare(s, `aday-dis-${a}`, 300, { x: 0, y: 0, width: 440, height: 640 }));
      await s.context().close();
    }
    await pano('dis', dosyalar, adaylar.map((a) => `${a} · ${{ A: 'bahçe (aşağıda)', B: 'komşu çatılar', C: 'ahşap kalkan', D: 'açık gök rengi' }[a]}`), 'Soru 3 · Arka duvarın üstü (Kat 2 varış kadrajı)');
  }
  if (BOLUM.has('perf')) {
    const s = await sayfa();
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
    await s.evaluate(() => window.__advanceTime(120)); // Kat 1 salonu müşteriyle dolsun
    await s.evaluate(() => window.__teleport(0, -2));
    await olc('kat1-salon');
    await s.evaluate(() => window.__kat2(2));
    await s.waitForTimeout(1500);
    await kur(s, { padsDone: [] }, [0, -6]);
    await olc('kat2-bos');
    // oyun kadrajı: oyuncu dolu masanın önünde (masa + 4 gövde + balon + ocak kadrajda)
    await kur(s, { padsDone: TUM_OKEY, m: { k2okey1: OYUNDA({ istek: 2, sabir: 99 }), k2okey2: OYUNDA(), k2okey3: OYUNDA(), k2okey4: OYUNDA() }, ocakHazir: 3, paralar: [{ id: 905, x: -13, z: -3.3, miktar: 120 }] }, [-9, -1.4]);
    await olc('kat2-4okey-dolu');
    await kare(s, 'perf-kat2-4okey', 100);
    // üst sınır: 22 masa dolu (88 gövde değil — okey 4, tavla 2: 64 gövde), bütün kat kadrajda
    const hepsi = [...TUM_OKEY, 'k2salon2', ...MASALAR.slice(4, 10).map((m) => m.id), 'k2salon3', ...MASALAR.slice(10).map((m) => m.id)];
    const mm = {};
    MASALAR.forEach((m) => { mm[m.id] = OYUNDA({ t: 9999 }); });
    await kur(s, { padsDone: hepsi, m: mm, ocakHazir: 4 }, [0, -8]);
    await s.evaluate(() => window.__sinema({ pos: [0, 30, 30], bak: [0, 0, 1], fov: 42 }));
    await olc('kat2-22masa-ustten');
    await s.evaluate(() => window.__sinema(null));
    await s.context().close();
  }
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}
