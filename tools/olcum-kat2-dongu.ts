/**
 * olcum-kat2-dongu.ts — K2-3 ÖLÇÜMÜ: okey masası + Türk kahvesi döngüsünün KOLLARI.
 *
 * Soru (tur kartı): Kat 2'nin "seyrek + büyük para" döngüsü hangi oturum süresi / kahve sıklığı /
 * ücret-kahve payıyla oynanır? Ölçülen: masa başına ₺/dk, para yığınlarının aralığı ve büyüklüğü,
 * kahve servis oranı, oyuncunun meşguliyeti — 1, 2 ve 4 masada.
 *
 * Bot (geç-oyun oyuncusu: hız/tepsi/mıknatıs son kademede) açgözlü oynar: önce para yığını, sonra
 * tepside kahve varsa bekleyen masa, yoksa ocağa dön. Pad fiyatları bu ölçümde YOK (K2-5): masalar
 * baştan açık. Denge sayıları `Kat2Ayar` kollarıdır; `economy.config.ts` DEĞİŞMEZ.
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-dongu.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-dongu.ts > docs/olcum-kat2-dongu.txt
 */
import { KISA, botDamgasi, damga, kipBandi, kisaDeger, korunumDamgasi, varyantDamgasi } from './olcum-lib';
import { attractRadiusFor, charMaxTier, economyConfig, playerSpeedFor, trayCapacityFor } from '../src/config/economy.config';
import { OCAK, OKEY_ERISIM, OKEY_YER, VARIS, kat2Adim } from '../src/game/kat';
import { kat2MasaYeri, kat2Tick, yeniKat2Dunya, type Kat2Ayar } from '../src/game/kat2Dongu';

kipBandi();

const DT = 0.1;
const SURE = kisaDeger(20 * 60, 6 * 60); // sn
const ISINMA = kisaDeger(4 * 60, 2 * 60); // ilk oturumların açılış dalgası ölçülmez

type Oyuncu = { ad: string; hiz: number; tepsi: number; miknatis: number };
const GUCLU: Oyuncu = { ad: 'son kademe', hiz: playerSpeedFor(charMaxTier('speed')), tepsi: trayCapacityFor(charMaxTier('tray')), miknatis: attractRadiusFor(charMaxTier('magnet')) };
const ZAYIF: Oyuncu = { ad: 'ilk kademe', hiz: playerSpeedFor(0), tepsi: trayCapacityFor(0), miknatis: attractRadiusFor(0) };

/**
 * Kollar döngünün BİÇİMİNİ değiştirir, gelirini DEĞİL: her kolun fiyatları aynı teorik tavana
 * (`HEDEF` ₺/dk/masa, her istek servis edilirse) normalize edilir. Böylece seçim "hangi his"
 * sorusudur; ₺ düzeyi K2-5'te zincirle birlikte ölçülür.
 */
const HEDEF = 54;
type Bicim = { oturum: number; kahveAralik: number; istekAdet: number; kahvePayi: number };
const SABIT = { gelisAralik: 15, yurume: 5, kahveSabir: 25, demleme: 4, ocakKuyruk: 4 };

function fiyatla(b: Bicim): Omit<Kat2Ayar, 'padler'> {
  const istekSay = Math.max(1, Math.floor((b.oturum - SABIT.kahveSabir * 0.5) / b.kahveAralik));
  const dongu = SABIT.gelisAralik + SABIT.yurume + b.oturum;
  const yigin = (HEDEF * dongu) / 60;
  const kahveFiyat = Math.max(1, Math.round((yigin * b.kahvePayi) / (istekSay * b.istekAdet)));
  const masaUcreti = Math.max(0, Math.round(yigin - kahveFiyat * istekSay * b.istekAdet));
  return { ...SABIT, oturum: b.oturum, kahveAralik: b.kahveAralik, istekAdet: b.istekAdet, kahveFiyat, masaUcreti };
}

const TABAN_B: Bicim = { oturum: 180, kahveAralik: 40, istekAdet: 2, kahvePayi: 0.6 };
type Kol = { ad: string; not: string; b: Bicim };
const KOLLAR: Kol[] = [
  { ad: 'V0', not: 'taban: 3 dk oyun · 40 sn’de 2 kahve · gelirin %60’ı kahveden', b: TABAN_B },
  { ad: 'V1', not: 'KISA oyun 90 sn', b: { ...TABAN_B, oturum: 90 } },
  { ad: 'V2', not: 'UZUN oyun 300 sn', b: { ...TABAN_B, oturum: 300 } },
  { ad: 'V3', not: 'ÜCRET ağır: gelirin %20’si kahveden', b: { ...TABAN_B, kahvePayi: 0.2 } },
  { ad: 'V4', not: 'SIK kahve: 25 sn’de 2 fincan', b: { ...TABAN_B, kahveAralik: 25 } },
  { ad: 'V5', not: 'SEYREK kahve: 60 sn’de 1 fincan', b: { ...TABAN_B, kahveAralik: 60, istekAdet: 1 } },
];

interface Sonuc {
  dk: number;
  servis: number;
  kacan: number;
  yiginSay: number;
  yiginOrt: number;
  aralikOrt: number;
  mesgul: number;
  yol: number;
  iz: string;
}

function kos(ayar: Kat2Ayar, masaSay: number, o: Oyuncu = GUCLU): Sonuc {
  const acik = [OCAK.id, ...OKEY_YER.slice(0, masaSay).map((o) => o.id)];
  let d = yeniKat2Dunya(acik, ayar);
  // Gerçekte masalar ayrı anlarda açılır (pad'ler sırayla): döngüleri eşit aralıkla kaydır.
  const dongu = ayar.gelisAralik + ayar.yurume + ayar.oturum;
  d.masalar.forEach((m, i) => { if (m.durum === 'bos') m.t = ayar.gelisAralik + (i * dongu) / masaSay; });
  let x = VARIS[2][0];
  let z = VARIS[2][2];
  let kazanc = 0;
  let olcKazanc = 0;
  let servis = 0;
  let kacan = 0;
  let uretilen = 0; // ₺ korunumu: masaya yazılan her ₺
  let yol = 0;
  let mesgulT = 0;
  const yiginlar: number[] = [];
  const yiginZaman: number[] = [];
  let iz = 0x811c9dc5;

  for (let t = 0; t < SURE; t += DT) {
    const olc = t >= ISINMA;
    // ---- bot hedefi
    let hedef: readonly [number, number];
    if (d.paralar.length) {
      const p = d.paralar.reduce((a, b) => (Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b));
      hedef = [p.x, p.z];
    } else {
      const bekleyen = d.masalar
        .filter((m) => m.durum === 'oyunda' && m.istek > 0)
        .map((m) => ({ m, yer: kat2MasaYeri(m.id)! }));
      if (d.tepsi > 0 && bekleyen.length) {
        const b = bekleyen.reduce((a, c) => (a.m.sabir <= c.m.sabir ? a : c));
        hedef = [b.yer.x, b.yer.z + OKEY_ERISIM - 0.3];
      } else {
        hedef = OCAK.al;
      }
    }
    const dx = hedef[0] - x;
    const dz = hedef[1] - z;
    const L = Math.hypot(dx, dz);
    const adim = o.hiz * DT;
    let durdu = true;
    if (L > 0.15) {
      durdu = false;
      const k = Math.min(1, adim / L);
      const [nx, nz] = kat2Adim(x, z, dx * k, dz * k, 1);
      yol += Math.hypot(nx - x, nz - z);
      x = nx;
      z = nz;
    }
    if (olc && !(durdu && hedef === OCAK.al)) mesgulT += DT;

    const r = kat2Tick(d, { x, z, durdu, cuzdan: 0, padsDone: acik, tepsiKap: o.tepsi, miknatis: o.miknatis }, DT, ayar);
    for (const m of r.olay.dusen) {
      uretilen += m;
      if (olc) {
        yiginlar.push(m);
        yiginZaman.push(t);
      }
    }
    d = r.dunya;
    kazanc += r.kazanc;
    if (olc) {
      olcKazanc += r.kazanc;
      servis += r.olay.servis;
      kacan += r.olay.kacan;
    }
    iz = Math.imul(iz ^ (Math.round(kazanc) * 31 + r.olay.servis * 7 + r.olay.istek + Math.round(d.masalar.reduce((a, m) => a + m.birikim, 0))), 16777619) >>> 0;
  }
  const kalan = d.paralar.reduce((a, p) => a + p.miktar, 0);
  korunumDamgasi(`₺ ${masaSay} masa ${o.ad}`, Math.round(uretilen - kazanc - kalan));
  const sayilanDk = (SURE - ISINMA) / 60;
  const aralik = yiginZaman.slice(1).map((v, i) => v - yiginZaman[i]);
  return {
    dk: olcKazanc / sayilanDk,
    servis,
    kacan,
    yiginSay: yiginlar.length,
    yiginOrt: yiginlar.length ? yiginlar.reduce((a, b) => a + b, 0) / yiginlar.length : 0,
    aralikOrt: aralik.length ? aralik.reduce((a, b) => a + b, 0) / aralik.length : NaN,
    mesgul: mesgulT / (SURE - ISINMA),
    yol,
    iz: iz.toString(16),
  };
}

const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const pc = (v: number) => `%${(v * 100).toFixed(0)}`;

console.log('=== K2-3 — KAT 2 DÖNGÜSÜ: okey masası + Türk kahvesi (kollar) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · ${SURE / 60} dk koşu, ilk ${ISINMA / 60} dk ısınma sayılmaz · dt ${DT}`);
console.log(`Bot: ${GUCLU.ad} hız ${GUCLU.hiz} · tepsi ${GUCLU.tepsi} · mıknatıs ${GUCLU.miknatis} | ${ZAYIF.ad} hız ${ZAYIF.hiz} · tepsi ${ZAYIF.tepsi} · mıknatıs ${ZAYIF.miknatis} · pad YOK (masalar açık)`);
console.log(`Sabit: ${JSON.stringify(SABIT)} · fiyatlar her kolda teorik ${HEDEF} ₺/dk/masa tavanına normalize`);
console.log('Kıyas: Kat 1 geç oyun 127-144 ₺/dk (docs/olcum-izdiham-t6.txt §D/§E, garsonlu, 20 masa).');
console.log('');
console.log('kol | masa | ₺/dk  | ₺/dk/masa | yığın ort ₺ | yığın aralığı sn | servis | kaçan | servis % | meşgul');
console.log('-'.repeat(100));

const izler: Record<string, string> = {};
for (const kol of KOLLAR) {
  const ayar: Kat2Ayar = { ...fiyatla(kol.b), padler: [] };
  for (const n of KISA ? [1, 4] : [1, 2, 4]) {
    const r = kos(ayar, n);
    botDamgasi(`${kol.ad} ${n}`, r.yol, SURE / 60, 2); // tek masa ocağın dibinde: az yürümek doğru
    const key = `${n}`;
    if (kol.ad === 'V0') izler[key] = r.iz;
    else varyantDamgasi(`${kol.ad} ${n}`, izler[key], r.iz);
    const oran = r.servis + r.kacan ? r.servis / (r.servis + r.kacan) : NaN;
    console.log(
      `${kol.ad.padEnd(3)} | ${String(n).padStart(4)} | ${f0(r.dk).padStart(5)} | ${f0(r.dk / n).padStart(9)} | ${f0(r.yiginOrt).padStart(11)} | ${f0(r.aralikOrt).padStart(16)} | ${String(r.servis).padStart(6)} | ${String(r.kacan).padStart(5)} | ${pc(oran).padStart(8)} | ${pc(r.mesgul)}`,
    );
  }
  const a = fiyatla(kol.b);
  console.log(`      ${kol.ad}: ${kol.not} → ücret ${a.masaUcreti} ₺ · kahve ${a.kahveFiyat} ₺`);
}

// FİNAL (D-184): config'e yazılan kol V4'ün kendisi mi? Sayılar ve koşu birebir aynı olmalı.
{
  // Okey sayıları (S2'de config'e tavla sayıları ve uzun zincir geldi; okey kolu bunlardan bağımsız).
  const { tavla: _tavla, ...okey } = economyConfig.kat2;
  const secilen: Kat2Ayar = { ...okey, padler: [] };
  const v4 = { ...fiyatla(KOLLAR.find((k) => k.ad === 'V4')!.b), padler: [] };
  const sirali = (o: object) => JSON.stringify(Object.entries(o).sort(([x], [y]) => x.localeCompare(y)));
  damga('config = V4', sirali({ ...secilen, padler: [] }) === sirali(v4), sirali(secilen));
  console.log('');
  console.log('--- SEÇİLEN (economy.config.kat2) · son kademe oyuncu ---');
  for (const n of [1, 2, 4]) {
    const r = kos(secilen, n);
    const oran = r.servis + r.kacan ? r.servis / (r.servis + r.kacan) : NaN;
    console.log(`config | ${n} masa | ${f0(r.dk)} ₺/dk | yığın ort ${f0(r.yiginOrt)} ₺ | aralık ${f0(r.aralikOrt)} sn | servis ${pc(oran)} | meşgul ${pc(r.mesgul)}`);
  }
}

// Zayıf oyuncu: kahve sabrı ve meşguliyet sınırı nerede?
console.log('');
console.log(`--- ${ZAYIF.ad.toUpperCase()} OYUNCU · 4 masa ---`);
console.log('kol | ₺/dk  | servis | kaçan | servis % | meşgul');
for (const kol of KOLLAR) {
  const r = kos({ ...fiyatla(kol.b), padler: [] }, 4, ZAYIF);
  const oran = r.servis + r.kacan ? r.servis / (r.servis + r.kacan) : NaN;
  console.log(`${kol.ad.padEnd(3)} | ${f0(r.dk).padStart(5)} | ${String(r.servis).padStart(6)} | ${String(r.kacan).padStart(5)} | ${pc(oran).padStart(8)} | ${pc(r.mesgul)}`);
}

// Teorik tavan (her istek karşılanırsa): bir masanın döngüsü gelis + yurume + oturum.
console.log('');
console.log('--- TEORİK TAVAN (her istek servis edilir) ---');
for (const kol of KOLLAR) {
  const a = fiyatla(kol.b);
  const istekSay = Math.floor((a.oturum - a.kahveSabir * 0.5) / a.kahveAralik);
  const masaBasi = a.masaUcreti + istekSay * a.istekAdet * a.kahveFiyat;
  const dongu = a.gelisAralik + a.yurume + a.oturum;
  console.log(`${kol.ad}: döngü ${dongu} sn · ~${istekSay} istek · yığın ≤ ${masaBasi} ₺ · ${((masaBasi / dongu) * 60).toFixed(1)} ₺/dk/masa · kahve payı ${pc((masaBasi - a.masaUcreti) / masaBasi)}`);
}
