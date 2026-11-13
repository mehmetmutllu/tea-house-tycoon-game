/**
 * olcum-kat2-tavla.ts — K2-3c ÖLÇÜMÜ: tavla masası + salonlar + tek oyuncunun yetişme sınırı.
 *
 * Sorular (sprint S1, ajan C):
 *   ① Tavla hangi oyun süresi / para kaynağıyla oynansın? (oyun 60 · 90 · 120 sn × kahve ağır %60 · ücret ağır %20)
 *   ② Kat 2 garsonu gerekir mi, kaçıncı masadan sonra? (4 → 22 masa, tek oyuncu: servis %, kaçan, meşgul, yürüme)
 *   ③ Zincir SIRASI (fiyatsız): okey salonu masaları tavladan önce mi, karışık mı?
 *
 * Bot `olcum-kat2-dongu.ts`inkiyle aynı açgözlü kural: önce yığın, tepside kahve varsa sabrı en az
 * kalan masa, yoksa ocak. FARK: bölme duvarları katı → bot kemerli geçitlerden geçer (en kısa geçit
 * seçilir). Masa gövdeleri K2-3'teki gibi yok sayılır (yürüyüş masaların arasından kısa yoldan).
 * Okey sayıları D-184 (`economy.config.kat2`) — sabit. Tavla sayıları kolların; config DEĞİŞMEZ.
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-tavla.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-tavla.ts > docs/olcum-kat2-tavla.txt
 */
import { KISA, botDamgasi, damga, damgaOzeti, kipBandi, kisaDeger, korunumDamgasi, varyantDamgasi } from './olcum-lib';
import { attractRadiusFor, charMaxTier, economyConfig, playerSpeedFor, trayCapacityFor } from '../src/config/economy.config';
import {
  KAT2_BOLMELER,
  KAT2_KISI,
  KAT2_MASALAR,
  KAT2_SALON_PAD,
  OCAK,
  OKEY_ERISIM,
  TAVLA_ERISIM,
  VARIS,
  kat2AcikAlan,
  kat2Adim,
  kat2AlanBul,
} from '../src/game/kat';
import { kat2MasaYeri, kat2Tick, kat2ZincirHatasi, yeniKat2Dunya, type Kat2Ayar, type Kat2TavlaAyar } from '../src/game/kat2Dongu';

kipBandi();

const DT = 0.1;
const SURE = kisaDeger(20 * 60, 6 * 60);
const ISINMA = kisaDeger(4 * 60, 2 * 60);

type Oyuncu = { ad: string; hiz: number; tepsi: number; miknatis: number };
const GUCLU: Oyuncu = { ad: 'son kademe', hiz: playerSpeedFor(charMaxTier('speed')), tepsi: trayCapacityFor(charMaxTier('tray')), miknatis: attractRadiusFor(charMaxTier('magnet')) };
const ZAYIF: Oyuncu = { ad: 'ilk kademe', hiz: playerSpeedFor(0), tepsi: trayCapacityFor(0), miknatis: attractRadiusFor(0) };

// Okey sayıları (D-184). Tavla sayıları kolların → config'teki seçilmiş kol (D-186) burada kullanılmaz.
const { tavla: _tavla, ...OKEY_AYAR } = economyConfig.kat2;
const OKEY: Kat2Ayar = OKEY_AYAR;

// ---------------------------------------------------------------------------------------------
// TAVLA KOLLARI — fiyatlar teorik tavana normalize (K2-3 kalıbı). Tavan KİŞİ BAŞINA okeyle eşit:
// okey 54 ₺/dk/masa ÷ 4 kişi × 2 kişi = 27 ₺/dk/masa. Gerekçe: tavla köşesi (12 masa × 2) ile okey
// salonu (6 masa × 4) aynı büyüklükte oda ve aynı 24 oturak → iki salonun tavanı eşit (324 ₺/dk).
// Masa başı yarı, masa sayısı iki kat. Kahve ritmi de kişi başına eşit: 25 sn'de 1 fincan (okey 2).
// ---------------------------------------------------------------------------------------------
const HEDEF_OKEY = 54;
const HEDEF_TAVLA = (HEDEF_OKEY * KAT2_KISI.tavla) / KAT2_KISI.okey;
type Bicim = { oturum: number; kahveAralik: number; istekAdet: number; kahvePayi: number };

function istekSayisi(oturum: number, kahveAralik: number): number {
  return Math.max(1, Math.floor((oturum - OKEY.kahveSabir * 0.5) / kahveAralik));
}
function tavlaFiyatla(b: Bicim): Kat2TavlaAyar {
  const n = istekSayisi(b.oturum, b.kahveAralik);
  const dongu = OKEY.gelisAralik + OKEY.yurume + b.oturum;
  const yigin = (HEDEF_TAVLA * dongu) / 60;
  const kahveFiyat = Math.max(1, Math.round((yigin * b.kahvePayi) / (n * b.istekAdet)));
  const masaUcreti = Math.max(0, Math.round(yigin - kahveFiyat * n * b.istekAdet));
  return { oturum: b.oturum, kahveAralik: b.kahveAralik, istekAdet: b.istekAdet, kahveFiyat, masaUcreti };
}

type Kol = { ad: string; not: string; b: Bicim };
const KOLLAR: Kol[] = [60, 90, 120].flatMap((oturum) => [
  { ad: `T${oturum}K`, not: `oyun ${oturum} sn · kahve ağır (gelirin %60'ı kahve)`, b: { oturum, kahveAralik: 25, istekAdet: 1, kahvePayi: 0.6 } },
  { ad: `T${oturum}U`, not: `oyun ${oturum} sn · ücret ağır (gelirin %20'si kahve)`, b: { oturum, kahveAralik: 25, istekAdet: 1, kahvePayi: 0.2 } },
]);
const TABAN = 'T90K';
// D-186: config'e yazılan tavla sayıları T120U kolunun kendisi mi? (stderr damgası; çıktıya dokunmaz)
{
  const t120u = tavlaFiyatla(KOLLAR.find((k) => k.ad === 'T120U')!.b);
  damga('config.tavla = T120U', JSON.stringify(economyConfig.kat2.tavla) === JSON.stringify(t120u), JSON.stringify(t120u));
}
const ayarla = (kol: Kol, ocak?: Ocak): Kat2Ayar => ({ ...OKEY, ...(ocak ?? {}), tavla: tavlaFiyatla(kol.b) });

/** Ocak kolları: tek cezve ocağının hızı bir varsayımdır (D-184'te 4 masa için seçildi). */
type Ocak = { demleme: number; ocakKuyruk: number };
const OCAKLAR: { ad: string; o: Ocak }[] = [
  { ad: 'gerçek', o: { demleme: OKEY.demleme, ocakKuyruk: OKEY.ocakKuyruk } },
  { ad: '2×', o: { demleme: OKEY.demleme / 2, ocakKuyruk: OKEY.ocakKuyruk * 2 } },
  { ad: 'sınırsız', o: { demleme: 0.05, ocakKuyruk: 99 } },
];

// ---------------------------------------------------------------------------------------------
// BOT YOLU — duvar katı: hedef başka alandaysa en kısa geçitten (gerekirse üçüncü alan üzerinden).
// ---------------------------------------------------------------------------------------------
type Kapi = { yatay: boolean; duvar: number; c: number; alanlar: readonly [number, number] };
const KAPILAR: Kapi[] = KAT2_BOLMELER.flatMap((b) =>
  b.kapilar.map(([p, q]) => ({ yatay: b.z1 === b.z2, duvar: b.z1 === b.z2 ? b.z1 : b.x1, c: (p + q) / 2, alanlar: b.alanlar })),
);
/** Kapının `alan` tarafındaki yaklaşma noktası (bölmeler alanlar[0]'ı eksi yanda tutar). */
function kapiNoktasi(k: Kapi, alan: number): [number, number] {
  const s = alan === k.alanlar[0] ? -1.2 : 1.2;
  return k.yatay ? [k.c, k.duvar + s] : [k.duvar + s, k.c];
}
const uz = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function araHedef(x: number, z: number, hedef: readonly [number, number], acik: number): readonly [number, number] {
  const a0 = kat2AlanBul(x, z);
  const a1 = kat2AlanBul(hedef[0], hedef[1]);
  if (a0 === a1) return hedef;
  const kapilar = (p: number, q: number) => KAPILAR.filter((k) => k.alanlar.includes(p) && k.alanlar.includes(q) && p < acik && q < acik);
  let en: { k: Kapi; L: number } | null = null;
  for (const k of kapilar(a0, a1)) {
    const L = uz([x, z], kapiNoktasi(k, a0)) + uz(kapiNoktasi(k, a1), hedef);
    if (!en || L < en.L) en = { k, L };
  }
  for (let c = 0; c < acik; c++) {
    if (c === a0 || c === a1) continue;
    for (const k1 of kapilar(a0, c))
      for (const k2 of kapilar(c, a1)) {
        const L = uz([x, z], kapiNoktasi(k1, a0)) + uz(kapiNoktasi(k1, c), kapiNoktasi(k2, c)) + uz(kapiNoktasi(k2, a1), hedef);
        if (!en || L < en.L) en = { k: k1, L };
      }
  }
  if (!en) return hedef;
  const k = en.k;
  const [boy, dik] = k.yatay ? [x, z] : [z, x];
  const karsi = k.alanlar[0] === a0 ? k.alanlar[1] : k.alanlar[0];
  // Geçidin şeridindeyse karşıya, değilse geçidin önüne.
  if (Math.abs(boy - k.c) <= 0.35 && Math.abs(dik - k.duvar) <= 1.6) return kapiNoktasi(k, karsi);
  return kapiNoktasi(k, a0);
}

// ---------------------------------------------------------------------------------------------
// KOŞU
// ---------------------------------------------------------------------------------------------
interface Sonuc {
  dk: number;
  dkOkey: number;
  dkTavla: number;
  servis: number;
  kacan: number;
  bekleme: number;
  yiginOrt: number;
  mesgul: number;
  yolDk: number;
  iz: string;
}

/** Açık pad listesi: ocak + verilen masalar + masaların salonları (salon sırası korunur). */
function acikPadler(masalar: readonly string[]): string[] {
  const alanMax = Math.max(0, ...masalar.map((id) => kat2MasaYeri(id)!.alan));
  return [OCAK.id, ...KAT2_SALON_PAD.slice(0, alanMax), ...masalar];
}

function kos(ayar: Kat2Ayar, masalar: readonly string[], o: Oyuncu, ad: string): Sonuc {
  const pd = acikPadler(masalar);
  const acik = kat2AcikAlan(pd);
  let d = yeniKat2Dunya(pd, ayar);
  // Masalar ayrı anlarda açılır: döngüleri eşit aralıkla kaydır (K2-3 kalıbı, İD ile).
  const n = masalar.length;
  d.masalar.forEach((m) => {
    const i = masalar.indexOf(m.id);
    if (i < 0 || m.durum !== 'bos') return;
    const oturum = m.tur === 'tavla' ? ayar.tavla!.oturum : ayar.oturum;
    m.t = ayar.gelisAralik + (i * (ayar.gelisAralik + ayar.yurume + oturum)) / n;
  });
  let [x, z] = [VARIS[2][0], VARIS[2][2]];
  let kazanc = 0;
  let olcKazanc = 0;
  let uretilen = 0;
  const tur = { okey: 0, tavla: 0 };
  let servis = 0;
  let kacan = 0;
  let istek = 0;
  let beklemeT = 0;
  let yol = 0;
  let mesgulT = 0;
  const yiginlar: number[] = [];
  let iz = 0x811c9dc5;

  for (let t = 0; t < SURE; t += DT) {
    const olc = t >= ISINMA;
    let hedef: readonly [number, number];
    if (d.paralar.length) {
      const p = d.paralar.reduce((a, b) => (Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b));
      hedef = [p.x, p.z];
    } else {
      const bekleyen = d.masalar.filter((m) => m.durum === 'oyunda' && m.istek > 0);
      if (d.tepsi > 0 && bekleyen.length) {
        const b = bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c));
        const y = kat2MasaYeri(b.id)!;
        hedef = y.tur === 'tavla' ? [y.x, y.z + TAVLA_ERISIM[1] - 0.3] : [y.x, y.z + OKEY_ERISIM - 0.3];
      } else {
        hedef = OCAK.al;
      }
    }
    const ara = araHedef(x, z, hedef, acik);
    const dx = ara[0] - x;
    const dz = ara[1] - z;
    const L = Math.hypot(dx, dz);
    let durdu = true;
    if (L > 0.15) {
      durdu = false;
      const k = Math.min(1, (o.hiz * DT) / L);
      const [nx, nz] = kat2Adim(x, z, dx * k, dz * k, acik);
      yol += Math.hypot(nx - x, nz - z);
      x = nx;
      z = nz;
    }
    if (olc && !(durdu && hedef === OCAK.al)) mesgulT += DT;

    const r = kat2Tick(d, { x, z, durdu, cuzdan: 0, padsDone: pd, tepsiKap: o.tepsi, miknatis: o.miknatis }, DT, ayar);
    // Kalkan masalar `olay.dusen` ile aynı sırada (masalar sırasıyla gezilir) → yığının türü.
    const kalkan = r.dunya.masalar.filter((m, i) => d.masalar[i].durum === 'oyunda' && m.durum === 'bos');
    damga(`kalkış = yığın (${ad})`, kalkan.length === r.olay.dusen.length);
    r.olay.dusen.forEach((miktar, i) => {
      uretilen += miktar;
      if (olc) {
        yiginlar.push(miktar);
        tur[kalkan[i].tur] += miktar;
      }
    });
    d = r.dunya;
    kazanc += r.kazanc;
    if (olc) {
      olcKazanc += r.kazanc;
      servis += r.olay.servis;
      kacan += r.olay.kacan;
      istek += r.olay.istek;
      for (const m of d.masalar) if (m.istek > 0) beklemeT += DT;
    }
    iz = Math.imul(iz ^ (Math.round(kazanc) * 31 + r.olay.servis * 7 + r.olay.istek + Math.round(d.masalar.reduce((a, m) => a + m.birikim, 0))), 16777619) >>> 0;
  }
  const kalan = d.paralar.reduce((a, p) => a + p.miktar, 0);
  korunumDamgasi(`₺ ${ad}`, Math.round(uretilen - kazanc - kalan));
  const sayilanDk = (SURE - ISINMA) / 60;
  return {
    dk: olcKazanc / sayilanDk,
    dkOkey: tur.okey / sayilanDk,
    dkTavla: tur.tavla / sayilanDk,
    servis,
    kacan,
    bekleme: istek ? beklemeT / istek : NaN,
    yiginOrt: yiginlar.length ? yiginlar.reduce((a, b) => a + b, 0) / yiginlar.length : 0,
    mesgul: mesgulT / (SURE - ISINMA),
    yolDk: yol / (SURE / 60),
    iz: iz.toString(16),
  };
}

const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const pc = (v: number) => (Number.isFinite(v) ? `%${(v * 100).toFixed(0)}` : '—');
const oran = (r: Sonuc) => (r.servis + r.kacan ? r.servis / (r.servis + r.kacan) : NaN);

const OKEY_ARKA = KAT2_MASALAR.filter((m) => m.alan === 0).map((m) => m.id);
const OKEY_SALON = KAT2_MASALAR.filter((m) => m.alan === 1).map((m) => m.id);
const TAVLA_ID = KAT2_MASALAR.filter((m) => m.tur === 'tavla').map((m) => m.id);

/** Teorik kahve talebi (fincan/dk/masa, her istek anında servis edilirse). */
function talep(oturum: number, kahveAralik: number, istekAdet: number): number {
  return (istekSayisi(oturum, kahveAralik) * istekAdet * 60) / (OKEY.gelisAralik + OKEY.yurume + oturum);
}

console.log('=== K2-3c — KAT 2: TAVLA MASASI + SALONLAR + TEK OYUNCUNUN SINIRI ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · ${SURE / 60} dk koşu, ilk ${ISINMA / 60} dk ısınma sayılmaz · dt ${DT}`);
console.log(`Bot: ${GUCLU.ad} hız ${GUCLU.hiz} · tepsi ${GUCLU.tepsi} · mıknatıs ${GUCLU.miknatis} | ${ZAYIF.ad} hız ${ZAYIF.hiz} · tepsi ${ZAYIF.tepsi} · mıknatıs ${ZAYIF.miknatis}`);
console.log(`Okey (D-184, sabit): oyun ${OKEY.oturum} sn · ${OKEY.kahveAralik} sn'de ${OKEY.istekAdet} fincan · ücret ${OKEY.masaUcreti} ₺ · kahve ${OKEY.kahveFiyat} ₺ · tavan ${HEDEF_OKEY} ₺/dk/masa`);
console.log(`Tavla tavanı: ${HEDEF_TAVLA} ₺/dk/masa (kişi başı okeyle eşit: ${HEDEF_OKEY}/${KAT2_KISI.okey}×${KAT2_KISI.tavla}). Ortak: geliş ${OKEY.gelisAralik} sn · yürüme ${OKEY.yurume} sn · kahve sabrı ${OKEY.kahveSabir} sn`);
console.log(`Ocak: gerçek ${OKEY.demleme} sn/fincan · kuyruk ${OKEY.ocakKuyruk} → en çok ${f1(60 / OKEY.demleme)} fincan/dk`);
console.log('Yol: bölme duvarı katı, bot geçitten geçer; masa gövdeleri yok sayılır (K2-3 gibi).');

// ---- §A TAVLA KOLLARI
console.log('');
console.log('--- §A TAVLA KOLLARI (yalnız tavla masaları açık + ocak; son kademe oyuncu) ---');
console.log('kol   | masa | ocak     | ₺/dk  | ₺/dk/masa | yığın ort ₺ | servis | kaçan | servis % | bekleme sn | meşgul | yol br/dk');
console.log('-'.repeat(118));
const izler: Record<string, string> = {};
const KOL_SENARYO: { n: number; ocak: (typeof OCAKLAR)[number] }[] = KISA
  ? [{ n: 1, ocak: OCAKLAR[0] }, { n: 12, ocak: OCAKLAR[2] }]
  : [{ n: 1, ocak: OCAKLAR[0] }, { n: 4, ocak: OCAKLAR[0] }, { n: 12, ocak: OCAKLAR[0] }, { n: 12, ocak: OCAKLAR[2] }];
for (const kol of [...KOLLAR].sort((a, b) => (a.ad === TABAN ? -1 : b.ad === TABAN ? 1 : 0))) {
  for (const s of KOL_SENARYO) {
    const r = kos(ayarla(kol, s.ocak.o), TAVLA_ID.slice(0, s.n), GUCLU, `${kol.ad} ${s.n} ${s.ocak.ad}`);
    botDamgasi(`${kol.ad} ${s.n}`, r.yolDk * (SURE / 60), SURE / 60, 2);
    const key = `${s.n} ${s.ocak.ad}`;
    if (kol.ad === TABAN) izler[key] = r.iz;
    else varyantDamgasi(`${kol.ad} ${key}`, izler[key], r.iz);
    console.log(
      `${kol.ad.padEnd(5)} | ${String(s.n).padStart(4)} | ${s.ocak.ad.padEnd(8)} | ${f0(r.dk).padStart(5)} | ${f0(r.dk / s.n).padStart(9)} | ${f0(r.yiginOrt).padStart(11)} | ${String(r.servis).padStart(6)} | ${String(r.kacan).padStart(5)} | ${pc(oran(r)).padStart(8)} | ${f1(r.bekleme).padStart(10)} | ${pc(r.mesgul).padStart(6)} | ${f0(r.yolDk)}`,
    );
  }
  const a = tavlaFiyatla(kol.b);
  console.log(`        ${kol.ad}: ${kol.not} → ücret ${a.masaUcreti} ₺ · kahve ${a.kahveFiyat} ₺`);
}

console.log('');
console.log('--- §A2 TEORİK TAVAN (her istek servis edilir) + KAHVE TALEBİ ---');
{
  const n = istekSayisi(OKEY.oturum, OKEY.kahveAralik);
  const yigin = OKEY.masaUcreti + n * OKEY.istekAdet * OKEY.kahveFiyat;
  const dongu = OKEY.gelisAralik + OKEY.yurume + OKEY.oturum;
  console.log(`okey : döngü ${dongu} sn · ~${n} istek × ${OKEY.istekAdet} · yığın ≤ ${yigin} ₺ · ${f1((yigin / dongu) * 60)} ₺/dk/masa · ${f1((yigin / dongu) * 60 / KAT2_KISI.okey)} ₺/dk/kişi · kahve payı ${pc((yigin - OKEY.masaUcreti) / yigin)} · talep ${f1(talep(OKEY.oturum, OKEY.kahveAralik, OKEY.istekAdet))} fincan/dk/masa`);
}
for (const kol of KOLLAR) {
  const a = tavlaFiyatla(kol.b);
  const n = istekSayisi(a.oturum, a.kahveAralik);
  const yigin = a.masaUcreti + n * a.istekAdet * a.kahveFiyat;
  const dongu = OKEY.gelisAralik + OKEY.yurume + a.oturum;
  console.log(`${kol.ad.padEnd(5)}: döngü ${dongu} sn · ~${n} istek × ${a.istekAdet} · yığın ≤ ${yigin} ₺ · ${f1((yigin / dongu) * 60)} ₺/dk/masa · ${f1((yigin / dongu) * 60 / KAT2_KISI.tavla)} ₺/dk/kişi · kahve payı ${pc((yigin - a.masaUcreti) / yigin)} · talep ${f1(talep(a.oturum, a.kahveAralik, a.istekAdet))} fincan/dk/masa`);
}

// ---- §B YÜK: 4 → 22 masa (zincir A sırası), tek oyuncu, üç ocak
const ZINCIR_A = [...OKEY_ARKA, ...OKEY_SALON, ...TAVLA_ID];
const ZINCIR_B = [...OKEY_ARKA, ...OKEY_SALON.slice(0, 3), ...TAVLA_ID.slice(0, 6), ...OKEY_SALON.slice(3), ...TAVLA_ID.slice(6)];
const tabanKol = KOLLAR.find((k) => k.ad === TABAN)!;
const YUK_N = KISA ? [4, 10, 22] : [4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
console.log('');
console.log(`--- §B YÜK — zincir A sırası (4 arka okey → 6 okey salonu → 12 tavla), tavla ${TABAN}, tek oyuncu ---`);
console.log('oyuncu     | ocak     | masa (o+t) | ₺/dk  | okey ₺/dk | tavla ₺/dk | servis | kaçan | servis % | bekleme sn | meşgul | yol br/dk');
console.log('-'.repeat(126));
for (const o of KISA ? [GUCLU] : [GUCLU, ZAYIF]) {
  for (const oc of KISA ? [OCAKLAR[0], OCAKLAR[2]] : OCAKLAR) {
    for (const n of YUK_N) {
      const masalar = ZINCIR_A.slice(0, n);
      const t = masalar.filter((id) => kat2MasaYeri(id)!.tur === 'tavla').length;
      const r = kos(ayarla(tabanKol, oc.o), masalar, o, `yük ${o.ad} ${oc.ad} ${n}`);
      botDamgasi(`yük ${o.ad} ${oc.ad} ${n}`, r.yolDk * (SURE / 60), SURE / 60, 2);
      console.log(
        `${o.ad.padEnd(10)} | ${oc.ad.padEnd(8)} | ${`${n} (${n - t}+${t})`.padStart(10)} | ${f0(r.dk).padStart(5)} | ${f0(r.dkOkey).padStart(9)} | ${f0(r.dkTavla).padStart(10)} | ${String(r.servis).padStart(6)} | ${String(r.kacan).padStart(5)} | ${pc(oran(r)).padStart(8)} | ${f1(r.bekleme).padStart(10)} | ${pc(r.mesgul).padStart(6)} | ${f0(r.yolDk)}`,
      );
    }
  }
}

// ---- §C 22 masa, tavla kolu duyarlılığı (en ağır yük)
console.log('');
console.log('--- §C 22 MASA × TAVLA KOLU (son kademe oyuncu) — yük altında hangi kol daha az kaybeder? ---');
console.log('kol   | ocak     | ₺/dk  | tavla ₺/dk | servis % | kaçan | meşgul');
for (const kol of KISA ? KOLLAR.filter((k) => k.ad === 'T60K' || k.ad === 'T120U') : KOLLAR) {
  for (const oc of [OCAKLAR[0], OCAKLAR[2]]) {
    const r = kos(ayarla(kol, oc.o), ZINCIR_A, GUCLU, `22 ${kol.ad} ${oc.ad}`);
    console.log(`${kol.ad.padEnd(5)} | ${oc.ad.padEnd(8)} | ${f0(r.dk).padStart(5)} | ${f0(r.dkTavla).padStart(10)} | ${pc(oran(r)).padStart(8)} | ${String(r.kacan).padStart(5)} | ${pc(r.mesgul)}`);
  }
}

// ---- §D ZİNCİR SIRASI (fiyatsız): her masa adımında ₺/dk ve yük
console.log('');
console.log(`--- §D ZİNCİR SIRASI (fiyatsız) — her masa eklenince; son kademe oyuncu, gerçek ocak, tavla ${TABAN} ---`);
console.log('A: 4 arka okey → salon2 → 6 okey → salon3 → 12 tavla · B: 4 arka okey → salon2 → 3 okey → salon3 → 6 tavla → 3 okey → 6 tavla');
const pad = (ids: string[]) => ids.map((id) => ({ id, cost: 1, fillRate: 1 }));
for (const [ad, z] of [['A', ZINCIR_A], ['B', ZINCIR_B]] as const) {
  const salonlu = [...z.slice(0, 4), 'k2salon2', ...z.slice(4)];
  const s3 = salonlu.findIndex((id) => kat2MasaYeri(id)?.tur === 'tavla');
  salonlu.splice(s3, 0, 'k2salon3');
  damga(`zincir ${ad} tutarlı`, kat2ZincirHatasi({ ...ayarla(tabanKol), padler: pad([OCAK.id, ...salonlu]) }) === null);
}
console.log('adım | zincir | son eklenen | ₺/dk  | +₺/dk | servis % | kaçan | meşgul');
const ADIMLAR = KISA ? [4, 7, 10, 16, 22] : Array.from({ length: 19 }, (_, i) => i + 4);
for (const [ad, z] of [['A', ZINCIR_A], ['B', ZINCIR_B]] as const) {
  let onceki = NaN;
  for (const n of ADIMLAR) {
    const r = kos(ayarla(tabanKol, OCAKLAR[0].o), z.slice(0, n), GUCLU, `zincir ${ad} ${n}`);
    const artis = Number.isFinite(onceki) ? r.dk - onceki : NaN;
    onceki = r.dk;
    console.log(`${String(n).padStart(4)} | ${ad.padEnd(6)} | ${z[n - 1].padEnd(11)} | ${f0(r.dk).padStart(5)} | ${f0(artis).padStart(5)} | ${pc(oran(r)).padStart(8)} | ${String(r.kacan).padStart(5)} | ${pc(r.mesgul)}`);
  }
}

damgaOzeti();
