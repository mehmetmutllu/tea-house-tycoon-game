/**
 * s5-tasarim-cek.mjs — S5 TASARIM TURU kareleri (G-102 · 111 · 112 · 114 · 115 · 129 · 120).
 * Desen `tools/kat2-varis-cek.mjs`: çalışan oyun (vite dev) + aday parçalar `tools/s5-tasarim.tsx`ten; oyun kamerası
 * (portre telefon, HUD'lu) + aynı kadrajda geniş/yakın sinema kamerası. Panolar `docs/kareler/s5-tasarim-*.png`.
 *
 * Koşu: node tools/s5-tasarim-cek.mjs   ·  SORU=G102,G111,... (varsayılan hepsi) · port S5_PORT (varsayılan 5163)
 * Ham kareler: docs/tasarim/s5/
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.S5_PORT ?? 5163);
const OUT = path.join(KOK, 'docs/tasarim/s5');
const PANO = path.join(KOK, 'docs/kareler');
mkdirSync(OUT, { recursive: true });
const SORU = (process.env.SORU ?? 'G102,G111,G112,G114,G115,G129,G120').split(',');
const KAT1_PADS = 'table2 table3 waiter table4 waiter2 zone2 z2table2 z2table3 dishwasher z2table4 zone3 z3table2 z3table3 z3table4 waiter3 lavabo z3table5 z3table6 z3table7 z3table8 z3table9 z3table10 z3table11 z3table12'.split(' ');

const sunucu = await createServer({ root: KOK, configFile: path.join(KOK, 'vite.config.ts'), logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: { ignored: ['**/*'] } } });
await sunucu.listen();
const tarayici = await chromium.launch({ args: ['--use-angle=default', '--ignore-gpu-blocklist'] });
const hatalar = [];
const olcum = {};

const TEL = { viewport: { width: 440, height: 956 }, dpr: 2, mobil: true };
const GENIS = { viewport: { width: 1280, height: 860 }, dpr: 1.25, mobil: false };

async function sayfa(v, { kat = 2, hudYok = false } = {}) {
  const baglam = await tarayici.newContext({ viewport: v.viewport, deviceScaleFactor: v.dpr, hasTouch: v.mobil, isMobile: v.mobil });
  const s = await baglam.newPage();
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
  if (kat === 1) await s.evaluate(() => window.__kat2(1));
  await s.waitForTimeout(2200);
  if (hudYok) await s.addStyleTag({ content: 'body *{visibility:hidden!important} canvas{visibility:visible!important}' });
  return s;
}

const m = (s, fn, arg) => s.evaluate(async ([fn, arg]) => {
  const t = await import('/tools/s5-tasarim.tsx');
  return t.__cagir ? t.__cagir(fn, arg) : null;
}, [fn, arg]);

/** Modül fonksiyonunu sayfa içinde çağırır: `ad` 'G102.B' gibi aday ya da düz dışa aktarım. */
async function cagir(s, ad, ...args) {
  return s.evaluate(async ([ad, args]) => {
    const t = await import('/tools/s5-tasarim.tsx');
    if (ad.includes('.')) {
      const [tablo, k] = ad.split('.');
      return t[tablo][k].kur();
    }
    return t[ad](...args);
  }, [ad, args]);
}

async function oyuncu(s, x, z, yuz = [0, 1]) {
  await s.evaluate(([x, z]) => window.__teleport(x, z), [x, z - 0.2 * yuz[1]]);
  await s.evaluate(([a, b]) => window.__girdi(a, b), yuz);
  await s.waitForTimeout(90);
  await s.evaluate(() => window.__girdi(0, 0));
  await s.evaluate(([x, z]) => window.__teleport(x, z), [x, z]);
}

async function kare(s, ad, bekle = 1600) {
  await s.waitForTimeout(bekle);
  const f = path.join(OUT, `${ad}.png`);
  await s.screenshot({ path: f });
  return f;
}

const sinema = (s, pos, bak, fov = 50) => s.evaluate(([pos, bak, fov]) => window.__sinema({ pos, bak, fov }), [pos, bak, fov]);
const sinemaKapat = (s) => s.evaluate(() => window.__sinema(null));

// ---------------------------------------------------------------- PANO
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
async function pano(dosya, baslik, satirlar, { sutun = 3, genislik = 1600 } = {}) {
  const p = await (await tarayici.newContext({ viewport: { width: genislik, height: 800 }, deviceScaleFactor: 1 })).newPage();
  const stil = `<style>body{margin:0;background:#1d1b2e;color:#fff;font:600 14px system-ui;padding:14px}
    h1{font-size:21px;margin:0 0 4px} h2{font-size:15px;margin:14px 0 8px;color:#cfc8ff;font-weight:600}
    .izgara{display:grid;gap:10px} figure{margin:0;background:#2a2740;border-radius:10px;overflow:hidden}
    .ikili{display:grid;grid-template-columns:var(--k,1fr 1fr);gap:2px;background:#000}
    img{display:block;width:100%} figcaption{padding:6px 9px 8px;line-height:1.3;font-size:13px}
    b{color:#ffcf4a;font-size:18px;margin-right:6px} small{display:block;color:#a9a3c9;font-weight:500;margin-top:3px}</style>`;
  const kart = (k) => `<figure><div class="ikili" style="--k:${k.oran ?? (k.img.length > 1 ? '1fr 1fr' : '1fr')}">${k.img.map((f) => `<img src="${b64(f)}">`).join('')}</div>
    <figcaption><b>${k.ad}</b>${k.metin}${k.not ? `<small>${k.not}</small>` : ''}</figcaption></figure>`;
  const govde = satirlar.map((st) => `${st.h2 ? `<h2>${st.h2}</h2>` : ''}<div class="izgara" style="grid-template-columns:repeat(${st.sutun ?? sutun},1fr)">${st.kartlar.map(kart).join('')}</div>`).join('');
  await p.setContent(`<html><head>${stil}</head><body><h1>${baslik}</h1>${govde}</body></html>`);
  await p.screenshot({ path: path.join(PANO, dosya), fullPage: true });
  await p.close();
  console.log('pano', dosya);
}

// ================================================================ SORULAR
const S = {};

S.kesif = async () => {
  const o = await sayfa(TEL);
  for (const [ad, x, z] of [['k2-mutfak-sag', -5.6, -9.0], ['k2-on-orta', 0, 16.4], ['k2-on-sol', -12, 16.4], ['k2-kose', -16.3, 16.3], ['k2-sag-yan', 16.3, 4], ['k2-tavla', 10, 8]]) {
    await oyuncu(o, x, z);
    await kare(o, `kesif-${ad}`);
  }
  await o.evaluate(() => window.__setState({ camZoomOut: true }));
  await oyuncu(o, -16.3, 16.3);
  await kare(o, 'kesif-k2-kose-uzak');
  await o.evaluate(() => window.__setState({ camZoomOut: false }));
  await o.evaluate(() => window.__kat2(1));
  await o.waitForTimeout(1500);
  for (const [ad, x, z] of [['k1-mutfak', -9, -9.0], ['k1-on-orta', 3, 16.4], ['k1-on-sol', -12, 16.4]]) {
    await oyuncu(o, x, z);
    await kare(o, `kesif-${ad}`);
  }
  const g = await sayfa(GENIS, { hudYok: true });
  await sinema(g, [0, 27, 22], [0, 0, 2], 50);
  await kare(g, 'kesif-k2-genis', 2200);
  await sinema(g, [-1.5, 5.5, -4.5], [-5.5, 0.8, -11], 50);
  await kare(g, 'kesif-k2-kose-yakin', 1800);
  await sinema(g, [-9, 9, 1], [-9, 0, -12], 50);
  await kare(g, 'kesif-k2-mutfak-genis', 1800);
};

S.yokla = async () => {
  const o = await sayfa(TEL);
  const r = await o.evaluate(async () => {
    const t = await import('/tools/s5-tasarim.tsx');
    const ad = (o) => o;
    return {
      onK2: t.kutuOlc(t.ON_DUVAR, 'kat2'),
      sag: t.kutuOlc(t.SAG_DUVAR, 'kat2'),
      tavla: t.kutuOlc({ x0: 5.2, x1: 7.8, z0: 1.8, z1: 3.2, y0: -0.1, y1: 2.2 }, 'kat2'),
      okey: t.kutuOlc({ x0: -14.5, x1: -11.5, z0: 1, z1: 4, y0: -0.1, y1: 2.2 }, 'kat2'),
      det: t.agListe({ x0: 5.2, x1: 7.8, z0: 1.8, z1: 3.2, y0: -0.1, y1: 2.2 }, 'kat2'),
    };
  });
  console.log(JSON.stringify(r));
};

const ORAN = '3.24fr 1fr';
const sifirla = (s) => s.evaluate(async () => (await import('/tools/s5-tasarim.tsx')).sifirla());
const adayKur = (s, tablo, ad) => s.evaluate(async ([tablo, ad]) => {
  const t = await import('/tools/s5-tasarim.tsx');
  t.sifirla();
  return t[tablo][ad].kur();
}, [tablo, ad]);

/** Aynı adayı iki sayfada (geniş sinema + telefon oyun kamerası) kurar ve çeker. */
async function ikili(g, o, tablo, ad, onek, { sin, oyun }) {
  await adayKur(g, tablo, ad);
  await sinema(g, ...sin);
  const f1 = await kare(g, `${onek}-${ad}-sinema`, 1500);
  await adayKur(o, tablo, ad);
  await oyuncu(o, ...oyun);
  const f2 = await kare(o, `${onek}-${ad}-oyun`, 1800);
  return [f1, f2];
}

async function aciklamalar(s, tablo) {
  return s.evaluate(async (tablo) => {
    const t = await import('/tools/s5-tasarim.tsx');
    return Object.fromEntries(Object.entries(t[tablo]).map(([k, v]) => [k, v.aciklama]));
  }, tablo);
}

S.G102 = async () => {
  const g = await sayfa(GENIS, { hudYok: true });
  const o = await sayfa(TEL);
  const ac = await aciklamalar(g, 'G102');
  const kartlar = [];
  for (const ad of Object.keys(ac)) {
    const img = await ikili(g, o, 'G102', ad, 'g102', { sin: [[0.6, 8.2, -2.6], [-7.6, 0.4, -12.6]], oyun: [-5.9, -9.1, [1, 0]] });
    kartlar.push({ ad, img, oran: ORAN, metin: ac[ad] });
  }
  await pano('s5-tasarim-g102-sag-duvar.png', 'G-102 · Kat 2 mutfağının SAĞ duvarı (x −4,6: mutfak ↔ merdiven kovası) — sol: sabit geniş kadraj · sağ: oyun kamerası (telefon)', [{ kartlar, sutun: 2 }]);
};

S.G111 = async () => {
  const g = await sayfa(GENIS, { hudYok: true });
  const o = await sayfa(TEL);
  const ac = await aciklamalar(g, 'G111');
  const kartlar = [];
  for (const ad of Object.keys(ac)) {
    const img = await ikili(g, o, 'G111', ad, 'g111', { sin: [[-2.3, 2.6, -6.6], [-4.8, 0.75, -10.1], 45], oyun: [-4.0, -9.0, [-1, 0]] });
    kartlar.push({ ad, img, oran: ORAN, metin: ac[ad] });
  }
  await pano('s5-tasarim-g111-birlesim.png', 'G-111 · Ön tezgâh ↔ sağ duvar birleşimi — sol: yakın sabit kadraj · sağ: oyun kamerası (oyuncu birleşimin önünde)', [{ kartlar, sutun: 2 }]);
};

S.G112 = async () => {
  const o = await sayfa(TEL);
  const g = await sayfa(GENIS, { hudYok: true });
  const SIN = [[-10.5, 8.5, -1.5], [-10.5, 0, -13.3], 50];
  await sinema(g, ...SIN);
  const k2m = await kare(g, 'g112-k2-mutfak-sinema', 1800);
  await oyuncu(o, -9, -9.1);
  const k2o = await kare(o, 'g112-k2-mutfak-oyun');
  for (const s of [o, g]) {
    await s.evaluate(() => window.__kat2(1));
    await s.waitForTimeout(1400);
  }
  const tema = (ad) => (s) => s.evaluate((ad) => window.__setState({ kitchenTheme: ad }), ad);
  const kol = {
    A: { metin: 'BUGÜN — Kat 1 mutfağı "Klasik Dama" (KayKit siyah #343434 + beyaz #d5dcdf)', kur: tema('klasik') },
    B: { metin: 'YORUM 2 — Kat 2 MUTFAĞININ zemini (koyuKahve #6b5d53 + krem #e8ceb4; aynı KayKit karo)', kur: tema('koyuKahve') },
    C: {
      metin: 'YORUM 1 — Kat 2 SALONUNUN zemini (düz ahşap parke #b98a5a, karo yok)',
      kur: async (s) => {
        await tema('klasik')(s);
        await s.evaluate(async () => {
          const t = await import('/tools/s5-tasarim.tsx');
          t.gizle(t.G112_KUTU, 'kat1');
          await t.parkeKaplama();
        });
      },
    },
    D: { metin: 'ek — mağazadaki "Kahve Dama" (10.000; #995842 + #daae7d) — B ile karıştırılmasın diye', kur: tema('kahve') },
  };
  const kartlar = [{ ad: 'REF', img: [k2m, k2o], oran: ORAN, metin: 'Kat 2 mutfağı bugün (kullanıcının "üst kattaki çok iyi olmuş" dediği yer)' }];
  for (const [ad, k] of Object.entries(kol)) {
    for (const s of [o, g]) {
      await sifirla(s);
      await k.kur(s);
    }
    await sinema(g, ...SIN);
    const f1 = await kare(g, `g112-${ad}-sinema`, 1800);
    await oyuncu(o, -9, -9.1);
    const f2 = await kare(o, `g112-${ad}-oyun`);
    kartlar.push({ ad, img: [f1, f2], oran: ORAN, metin: k.metin });
  }
  await sifirla(o);
  await tema('klasik')(o);
  await pano('s5-tasarim-g112-zemin.png', 'G-112 · Kat 1 mutfak zemini — "üst kattaki gibi" hangisi? (REF = Kat 2 mutfağı bugün; A-D Kat 1 mutfağı, aynı kadraj)', [{ kartlar, sutun: 2 }]);
};

const t5 = (fn) => async (s, ...a) => s.evaluate(fn, a);

S.G114 = async () => {
  const o = await sayfa(TEL);
  // Oyun kamerası oyuncunun +z'sinde d kadar geri, d kadar yukarıda (config/camera). Duvar 3,2, iç yüzü z 17,41.
  const d = await o.evaluate(async () => (await import('/src/config/camera.ts')).cameraDistance(440 / 956));
  const basGor = (h) => +(((h - 1.75) * d) / (d - 1.75)).toFixed(2);
  olcum.G114 = { kameraD: +d.toFixed(2), duvarIcYuz: 17.41, enYakinOyuncuZ: 16.53, araDuvarDibi: 0.88, bas32: basGor(3.2), ayak32: 3.2, ayak10: 1.0, bas10: 'her zaman' };
  console.log(JSON.stringify(olcum.G114));
  const kollar = {
    A: { metin: 'BUGÜN — 3,2 m ön duvar', kur: async () => 0 },
    B: { metin: 'ALÇAK ÖN DUVAR 1,0 — lambri hizasında biter (D-198 alçak bölme dili)', kur: t5(async ([k]) => { const t = await import('/tools/s5-tasarim.tsx'); t.onKirp(k, { y: 1.0 }); await t.onCita(1.0); }) },
    C: { metin: 'KESİK — yalnız oyuncunun önündeki 5 m 0,9 m\'ye iner, uzaklaşınca geri yükselir', kur: t5(async ([k, x]) => { const t = await import('/tools/s5-tasarim.tsx'); t.onKirp(k, { y: 0.9, x0: x - 2.5, x1: x + 2.5 }); await t.onCita(0.9, x - 2.5, x + 2.5); }) },
    D: { metin: 'SAYDAM — oyuncu yakınken ön duvar %30 opaklık', kur: t5(async ([k]) => { const t = await import('/tools/s5-tasarim.tsx'); t.onKirp(k, { y: 0.0 }); await t.onSaydam(0.3); }) },
    E: { metin: 'KALDIR — ön duvar hiç çizilmez', kur: t5(async ([k]) => { const t = await import('/tools/s5-tasarim.tsx'); t.onKirp(k, { y: 0.0 }); }) },
    F: { metin: 'SİLUET — duvar aynen kalır, arkadaki oyuncu sarı siluetle görünür', kur: t5(async () => (await import('/tools/s5-tasarim.tsx')).siluet()) },
  };
  const satir = async (kat, kok, x, z, adlar) => {
    const kartlar = [];
    for (const ad of adlar) {
      await sifirla(o);
      await oyuncu(o, x, z, [0, 1]);
      await o.waitForTimeout(1200);
      await kollar[ad].kur(o, kok, x);
      kartlar.push({ ad: `${kat}·${ad}`, img: [await kare(o, `g114-${kat}-${ad}`, 900)], metin: kollar[ad].metin });
    }
    return kartlar;
  };
  const k2 = await satir('K2', 'kat2', -6, 16.53, ['A', 'B', 'C', 'D', 'E', 'F']);
  await sifirla(o);
  await o.evaluate(() => window.__kat2(1));
  await o.waitForTimeout(1500);
  const k1 = await satir('K1', 'kat1', 6, 16.53, ['A', 'B', 'C', 'F']);
  await pano('s5-tasarim-g114-on-duvar.png', `G-114 · Ön (kameraya bakan) duvar — oyuncu duvar dibinde (z 16,5), oyun kamerası · ölçü: 3,2'lik duvarda oyuncunun başı duvardan ${olcum.G114.bas32} m, ayağı 3,2 m uzaklaşınca görünür`, [
    { h2: 'Kat 2 (ön duvar düz 3,2 — cam yok)', kartlar: k2, sutun: 6 },
    { h2: 'Kat 1 (ön duvar vitrin camlı 3,2; giriş kapısı bu duvarda)', kartlar: k1, sutun: 6 },
  ]);
};

S.G115 = async () => {
  const o = await sayfa(TEL);
  const g = await sayfa(GENIS, { hudYok: true });
  const kollar = {
    A: { metin: 'BUGÜN — duvarın dışı/altı boş (arka plan rengi); yalnız arka duvarın ötesinde bahçe var', kur: async () => 0 },
    B: { metin: 'ALT KAT GÖVDESİ — binanın Kat 1 cephesi 3,2 m aşağı iner (sıva + kat silmesi + koyu cam)', kur: t5(async () => (await import('/tools/s5-tasarim.tsx')).altKatGovde()) },
    C: { metin: 'B + SOKAK — gövdenin dibinde gri sokak zemini (3,2 aşağıda)', kur: t5(async () => { const t = await import('/tools/s5-tasarim.tsx'); await t.altKatGovde(); await t.cevreZemin('#8d8f8a', -3.2); }) },
    D: { metin: 'B + SAÇAK + ÇİM — duvarın dibinde Kat 1 çatı saçağı (kiremit), aşağısı çim', kur: t5(async () => { const t = await import('/tools/s5-tasarim.tsx'); await t.altKatGovde(); await t.sacak(); await t.cevreZemin('#6f9a4e', -3.2); }) },
    E: { metin: 'YALNIZ ZEMİN — gövde yok, boşluğun yerine 3,2 aşağıda çim (en az iş)', kur: t5(async () => (await import('/tools/s5-tasarim.tsx')).cevreZemin('#6f9a4e', -3.2)) },
  };
  const kartlar = [];
  await o.evaluate(() => window.__setState({ camZoomOut: true }));
  for (const [ad, k] of Object.entries(kollar)) {
    await sifirla(g);
    await k.kur(g);
    await sinema(g, [-4, 13, 30], [-6, -1, 10], 50);
    const f1 = await kare(g, `g115-${ad}-sinema`, 1500);
    await sifirla(o);
    await k.kur(o);
    await oyuncu(o, -15.5, 16.3);
    const f2 = await kare(o, `g115-${ad}-oyun`);
    kartlar.push({ ad, img: [f1, f2], oran: ORAN, metin: k.metin });
  }
  await pano('s5-tasarim-g115-alt-kat.png', "G-115 · Kat 2'deyken binanın dışı/altı — sol: ön-sol köşeden sabit kadraj · sağ: oyun kamerası (uzaklaşmış, oyuncu ön-sol köşede)", [{ kartlar, sutun: 2 }]);
};

S.G129 = async () => {
  const g = await sayfa(GENIS, { hudYok: true });
  const ac = await aciklamalar(g, 'G129');
  const kartlar = [];
  olcum.G129 = {};
  for (const ad of Object.keys(ac)) {
    await sifirla(g);
    const r = await g.evaluate(async (ad) => (await import('/tools/s5-tasarim.tsx')).g129Kur(ad), ad);
    olcum.G129[ad] = r;
    await g.evaluate(() => window.__teleport(0, -9.3));
    await sinema(g, [0, 31, 21], [0, 0, 1.5], 50);
    const f1 = await kare(g, `g129-${ad}-genis`, 1500);
    kartlar.push({ ad, img: [f1], metin: ac[ad], not: `masa ${r.masa} (okey ${r.okey} · tavla ${r.tavla}) · en dar serbest şerit ${r.enDarSerbest} m · dar (<0,5 m) şerit ${r.darSerit} · orta yol ${r.ortaYol} m` });
  }
  console.log(JSON.stringify(olcum.G129));
  await pano('s5-tasarim-g129-dagilim.png', 'G-129 · Kat 2 masa dağılımı — bütün masalar açık, aynı geniş kadraj (arka: merdiven salonu · sol ön: okey salonu · sağ ön: tavla köşesi)', [{ kartlar, sutun: 3 }]);
};

// ---------------------------------------------------------------- G-120: HUD maketi — oyunun kendi sayfasına, oyunun CSS'iyle enjekte
S.G120 = async () => {
  const o = await sayfa(TEL);
  const nav = (i) => o.click(`.botnav > :nth-child(${i})`);
  const bugun = [await kare(o, 'g120-bugun-bant', 600)];
  await nav(1);
  bugun.push(await kare(o, 'g120-bugun-gorevler', 900));
  await nav(2);
  bugun.push(await kare(o, 'g120-bugun-hedefler', 900));
  await nav(2);
  await o.waitForTimeout(500);
  const M = readFileSync(path.join(KOK, 'tools/s5-tasarim-gorev.html'), 'utf8');
  const parca = (id) => M.split(`<!--${id}-->`)[1].split(`<!--/${id}-->`)[0];
  const stil = parca('STIL');
  const m = {};
  for (const ad of ['M1', 'M2', 'M3', 'M4a', 'M4b']) {
    await o.evaluate((html) => {
      document.getElementById('s5-maket')?.remove();
      const d = document.createElement('div');
      d.id = 's5-maket';
      d.innerHTML = html;
      document.body.appendChild(d);
    }, stil + parca(ad));
    m[ad] = await kare(o, `g120-${ad}`, 700);
    await o.evaluate(() => document.getElementById('s5-maket')?.remove());
  }
  const kopya = (ad, f) => writeFileSync(path.join(PANO, `s5-tasarim-gorev-${ad}.png`), readFileSync(f));
  kopya('bugun-bant', bugun[0]);
  kopya('bugun-gorevler', bugun[1]);
  kopya('bugun-hedefler', bugun[2]);
  for (const [ad, f] of Object.entries(m)) kopya(ad, f);
  await pano('s5-tasarim-g120-gorev.png', "G-120 · Görev arayüzü — BUGÜN ve MAKET adayları (oyunun kendi HUD CSS'iyle, gerçek oyunun üstünde; kod değil)", [
    { h2: 'Bugün: bant · Görevler sekmesi · Hedefler sekmesi', sutun: 5, kartlar: [
      { ad: '1', img: [bugun[0]], metin: 'Görev bandı (alt): tek satır, aktif hat görevi' },
      { ad: '2', img: [bugun[1]], metin: 'Görevler: üstte GÜNLÜK, hat görevi altta' },
      { ad: '3', img: [bugun[2]], metin: 'Hedefler: uzun vadeli sayaçlar' },
    ] },
    { h2: 'Adaylar', sutun: 5, kartlar: [
      { ad: 'M1', img: [m.M1], metin: 'BANT ÖNE — bant büyür: ilerleme + ödül + "sıradaki" önizlemesi', not: 'HUD.tsx (bant) · hud.css' },
      { ad: 'M2', img: [m.M2], metin: 'GÖREVLER = HAT — sekmenin başında aktif görev + sıradaki 3; günlükler alta', not: 'HUD.tsx QuestsSheet sırası' },
      { ad: 'M3', img: [m.M3], metin: 'YOL HARİTASI — zincir dikey yol; yükseltme görevleri ayrı renk düğüm', not: 'HUD.tsx yeni görünüm · kat2Gorev listesi' },
      { ad: 'M4a', img: [m.M4a], metin: 'ÖDÜL = YÜKSELTME (1/2) — "5 masa aç" görevinin ödülü "açık masalar Sv2"', not: 'economy.config kat2Gorevler + ödül tipi → DENGE, varyant kapısı' },
      { ad: 'M4b', img: [m.M4b], metin: 'ÖDÜL = YÜKSELTME (2/2) — tamamlanınca ödül kartı; masalar yerinde Sv2\'ye seker' },
    ] },
  ]);
};

try {
  for (const q of SORU) {
    console.log('==', q);
    await S[q]();
  }
  writeFileSync(path.join(OUT, 'olcum.json'), JSON.stringify(olcum, null, 2));
} finally {
  console.log('HATALAR', hatalar.length, hatalar.slice(0, 8));
  await tarayici.close();
  await sunucu.close();
}

export { m, pano, sinemaKapat };
