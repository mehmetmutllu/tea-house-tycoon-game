/**
 * olcum-kat2-g5.ts — D-198 / oyun testi G5 ÖLÇÜMÜ: okey masasının İLK DAKİKALARI.
 *
 * Kullanıcı (2026-11-14): "Okey masasına oturuyor. 1-2 dakika gitmiyor. Kahve servisi hemen gelmiyor. Ne
 * yapacağımı bilmiyorum." Seçtiği yön (tam paket): oturunca hemen kahve · kahve parası anında · kısa oyun +
 * düşük masa ücreti · ilk grup çabuk. Bu araç kolları yan yana koyar; `economy.config.ts` DEĞİŞMEZ (D-084).
 *
 * A · VARIŞ: Kat 2'ye ilk çıkış (hazır okey masası + mutfak), oyuncu merdivenin başında. Ölçülen: ilk
 *     kahve isteği / ilk para kaçıncı saniyede, ilk 3 dakikada kaç para olayı, oyuncunun "yapacak işi
 *     yok" saniyeleri (tepsi dolu, istek yok, para yok).
 * B · DURAĞAN: 1 ve 4 okey masası (ilk 4 dk sayılmaz) — masa başına ₺/dk (zincir fiyatları SB9 bu
 *     gelire bağlı; kol geliri DÜŞÜRMEMELİ), para olayları arası sn, servis %.
 * C · TAVLA: bayraklar (ilk kahve, anında para) tavlaya da işler — 4 tavla masasında ₺/dk farkı.
 *
 * Fiyat kuralı: her kolun masa ücreti, 4 okeyde ÖLÇÜLEN ₺/dk/masa tabanla (config) eşit olacak şekilde
 * kalibre edilir ("getiri düşer" = yığın başına; dakika başına değil — zincir SB9 bu gelire bağlı). Kahve 9 ₺ sabit.
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-g5.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-g5.ts > docs/olcum-kat2-g5.txt
 */
import { KISA, botDamgasi, damgaOzeti, kipBandi, kisaDeger, korunumDamgasi, varyantDamgasi } from './olcum-lib';
import { attractRadiusFor, charMaxTier, economyConfig, playerSpeedFor, trayCapacityFor } from '../src/config/economy.config';
import { KAT2_MASALAR, OCAK, OKEY_ERISIM, TAVLA_ERISIM, VARIS, kat2Adim } from '../src/game/kat';
import { kat2MasaYeri, kat2Tick, yeniKat2Dunya, type Kat2Ayar } from '../src/game/kat2Dongu';

kipBandi();

const DT = 0.1;
const C2 = economyConfig.kat2;

type Oyuncu = { ad: string; hiz: number; tepsi: number; miknatis: number };
const GUCLU: Oyuncu = { ad: 'son kademe', hiz: playerSpeedFor(charMaxTier('speed')), tepsi: trayCapacityFor(charMaxTier('tray')), miknatis: attractRadiusFor(charMaxTier('magnet')) };
const ZAYIF: Oyuncu = { ad: 'ilk kademe', hiz: playerSpeedFor(0), tepsi: trayCapacityFor(0), miknatis: attractRadiusFor(0) };

/** Okeyin teorik ₺/dk/masa tavanı (her istek servis edilir). İlk istek `ilkKahve`de, sonra her `kahveAralik`. */
function teorik(a: Kat2Ayar): { dk: number; istek: number; dongu: number } {
  const ilk = a.ilkKahve ?? a.kahveAralik;
  const son = a.oturum - a.kahveSabir * 0.5; // son anlarda istenmez
  const istek = ilk > son ? 0 : 1 + Math.floor((son - ilk) / a.kahveAralik);
  const dongu = a.gelisAralik + a.yurume + a.oturum;
  return { dk: ((a.masaUcreti + istek * a.istekAdet * a.kahveFiyat) / dongu) * 60, istek, dongu };
}

const TABAN: Kat2Ayar = { ...C2, padler: [] };
const HEDEF_DK = teorik(TABAN).dk;

const HIS = { ilkKahve: 0, kahveAninda: true, ilkGelis: 3 } as const;
type Kol = { ad: string; not: string; ayar: Kat2Ayar };
const HAM: Kol[] = [
  { ad: 'G0', not: 'taban (bugünkü config): 3 dk oyun, ilk kahve 25 sn sonra, para kalkışta', ayar: TABAN },
  { ad: 'G1', not: 'yalnız HİS: oturunca hemen kahve + kahve parası anında + ilk grup 3 sn (süre aynı)', ayar: { ...TABAN, ...HIS } },
  { ad: 'G2', not: 'HİS + oyun 90 sn, sonraki grup 10 sn', ayar: { ...TABAN, ...HIS, oturum: 90, gelisAralik: 10 } },
  { ad: 'G3', not: 'HİS + oyun 60 sn, sonraki grup 8 sn', ayar: { ...TABAN, ...HIS, oturum: 60, gelisAralik: 8 } },
  { ad: 'G4', not: 'HİS + oyun 45 sn, sonraki grup 6 sn', ayar: { ...TABAN, ...HIS, oturum: 45, gelisAralik: 6 } },
];

interface Sonuc {
  ilkIstek: number;
  ilkPara: number;
  ilk3Para: number;
  /** İlk 3 dakikada para düşmeyen EN UZUN aralık (sn; başlangıç ve 180. saniye dahil). */
  ilk3Bosluk: number;
  /** Ölçülen dakikada masa başına kalkış (masa ücreti kalibrasyonu). */
  kalkisDk: number;
  dkMasa: number;
  aralik: number;
  servisYuzde: number;
  yigin: number;
  yol: number;
  iz: string;
}

/**
 * Bot (D-184 aracının botu): önce para yığını, sonra tepside kahve varsa sabrı en az kalan istek, yoksa ocak.
 */
function kos(ayar: Kat2Ayar, masalar: readonly string[], o: Oyuncu, sure: number, isinma: number): Sonuc {
  const acik = [OCAK.id, ...masalar];
  // Tavla köşesi açık olmadan tavla masasına yürünemez (alan 2): o koşuda bütün kat açık.
  const acikAlan = masalar.some((id) => kat2MasaYeri(id)?.tur === 'tavla') ? 3 : 1;
  let d = yeniKat2Dunya(acik, ayar);
  // Durağan koşuda masalar farklı anlarda açılmış gibi: döngüleri eşit aralıkla kaydır (D-184 aracı).
  if (isinma > 0) {
    const dongu = ayar.gelisAralik + ayar.yurume + ayar.oturum;
    let i = 0;
    for (const m of d.masalar) if (m.durum === 'bos') m.t = (ayar.ilkGelis ?? ayar.gelisAralik) + (i++ * dongu) / masalar.length;
  }
  let x = VARIS[2][0];
  let z = VARIS[2][2];
  let kazanc = 0, olcKazanc = 0, uretilen = 0, yol = 0, servis = 0, kacan = 0;
  let ilkIstek = NaN, ilkPara = NaN, ilk3Para = 0, sonPara = 0, ilk3Bosluk = 0, kalkis = 0;
  const paraZaman: number[] = [];
  const yiginlar: number[] = [];
  let iz = 0x811c9dc5;

  for (let t = 0; t < sure; t += DT) {
    const olc = t >= isinma;
    let hedef: readonly [number, number];
    const bekleyen = d.masalar.filter((m) => m.durum === 'oyunda' && m.istek > 0);
    if (d.paralar.length) {
      const p = d.paralar.reduce((a, b) => (Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b));
      hedef = [p.x, p.z];
    } else if (d.tepsi > 0 && bekleyen.length) {
      const b = bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c));
      const yer = kat2MasaYeri(b.id)!;
      hedef = [yer.x, yer.z + (yer.tur === 'tavla' ? TAVLA_ERISIM[1] : OKEY_ERISIM) - 0.3];
    } else {
      hedef = OCAK.al;
    }
    const dx = hedef[0] - x;
    const dz = hedef[1] - z;
    const L = Math.hypot(dx, dz);
    let durdu = true;
    if (L > 0.15) {
      durdu = false;
      const k = Math.min(1, (o.hiz * DT) / L);
      const [nx, nz] = kat2Adim(x, z, dx * k, dz * k, acikAlan);
      yol += Math.hypot(nx - x, nz - z);
      x = nx;
      z = nz;
    }

    const r = kat2Tick(d, { x, z, durdu, cuzdan: 0, padsDone: acik, tepsiKap: o.tepsi, miknatis: o.miknatis }, DT, ayar);
    if (r.olay.istek > 0 && Number.isNaN(ilkIstek)) ilkIstek = t;
    for (const m of r.olay.dusen) {
      uretilen += m;
      if (Number.isNaN(ilkPara)) ilkPara = t;
      if (t < 180) {
        ilk3Para++;
        ilk3Bosluk = Math.max(ilk3Bosluk, t - sonPara);
        sonPara = t;
      }
      if (olc) {
        paraZaman.push(t);
        yiginlar.push(m);
      }
    }
    d = r.dunya;
    kazanc += r.kazanc;
    if (olc) {
      kalkis += r.olay.kalkis;
      olcKazanc += r.kazanc;
      servis += r.olay.servis;
      kacan += r.olay.kacan;
    }
    iz = Math.imul(iz ^ (Math.round(kazanc) * 31 + r.olay.servis * 7 + r.olay.istek), 16777619) >>> 0;
  }
  const kalan = d.paralar.reduce((a, p) => a + p.miktar, 0) + d.masalar.reduce((a, m) => a + m.birikim, 0);
  const yazilan = uretilen + d.masalar.reduce((a, m) => a + m.birikim, 0);
  korunumDamgasi(`₺ ${masalar.length} masa ${o.ad}`, Math.round(yazilan - kazanc - kalan));
  const aralik = paraZaman.slice(1).map((v, i) => v - paraZaman[i]);
  return {
    ilkIstek,
    ilkPara,
    ilk3Para,
    ilk3Bosluk: Math.max(ilk3Bosluk, Math.min(sure, 180) - sonPara),
    kalkisDk: kalkis / ((sure - isinma) / 60) / masalar.length,
    dkMasa: olcKazanc / ((sure - isinma) / 60) / masalar.length,
    aralik: aralik.length ? aralik.reduce((a, b) => a + b, 0) / aralik.length : NaN,
    servisYuzde: servis + kacan ? servis / (servis + kacan) : NaN,
    yigin: yiginlar.length ? yiginlar.reduce((a, b) => a + b, 0) / yiginlar.length : NaN,
    yol,
    iz: iz.toString(16),
  };
}

const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const pc = (v: number) => (Number.isFinite(v) ? `%${(v * 100).toFixed(0)}` : '—');

const HAZIR = C2.hazir.filter((id) => KAT2_MASALAR.some((m) => m.id === id));
const OKEY4 = KAT2_MASALAR.filter((m) => m.tur === 'okey' && m.alan === 0).map((m) => m.id);
const TAVLA4 = KAT2_MASALAR.filter((m) => m.tur === 'tavla').slice(0, 4).map((m) => m.id);
const VARIS_SN = 180;
const SURE = kisaDeger(24 * 60, 10 * 60);
const ISINMA = kisaDeger(4 * 60, 3 * 60);

/** Masa ücretini 4 okeyde ÖLÇÜLEN geliri tabanla eşitleyecek şekilde kurar (gelir = ücretsiz gelir + ücret × kalkış/dk). */
const TABAN_OLCULEN = kos(TABAN, OKEY4, GUCLU, SURE, ISINMA).dkMasa;
function kalibre(a: Kat2Ayar): Kat2Ayar {
  const sifir = kos({ ...a, masaUcreti: 0 }, OKEY4, GUCLU, SURE, ISINMA);
  return { ...a, masaUcreti: Math.max(0, Math.round((TABAN_OLCULEN - sifir.dkMasa) / sifir.kalkisDk)) };
}
const KOLLAR: Kol[] = HAM.map((k) => (k.ad === 'G0' ? k : { ...k, ayar: kalibre(k.ayar) }));

console.log('=== D-198 / G5 — OKEY MASASININ İLK DAKİKALARI (kollar) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · durağan ${SURE / 60} dk, ilk ${ISINMA / 60} dk sayılmaz · varış ${VARIS_SN / 60} dk · dt ${DT}`);
console.log(`Taban (config) teorik okey tavanı ${f1(HEDEF_DK)} · 4 okeyde ÖLÇÜLEN ${f1(TABAN_OLCULEN)} ₺/dk/masa (kolların masa ücreti buna kalibre) · kahve ${C2.kahveFiyat} ₺ · sabır ${C2.kahveSabir} sn`);
console.log(`Varış masaları: ${HAZIR.join(', ')} (config kat2.hazir) · oyuncu merdiven başında`);
console.log('');
for (const k of KOLLAR) {
  const a = k.ayar;
  const t = teorik(a);
  console.log(`${k.ad}: ${k.not}`);
  console.log(`    oyun ${a.oturum} sn · sonraki grup ${a.gelisAralik} sn · ilk grup ${a.ilkGelis ?? a.gelisAralik} sn · ilk kahve ${a.ilkKahve ?? a.kahveAralik} sn · masa ücreti ${a.masaUcreti} ₺ · ~${t.istek} istek/oyun · teorik ${f1(t.dk)} ₺/dk/masa`);
}

const izler: Record<string, string> = {};
const izle = (ad: string, kol: string, iz: string) => {
  if (kol === 'G0') izler[ad] = iz;
  else varyantDamgasi(`${kol} ${ad}`, izler[ad], iz);
};

for (const o of [GUCLU, ZAYIF]) {
  console.log('');
  console.log(`--- A · VARIŞ (${o.ad}: hız ${o.hiz} · tepsi ${o.tepsi}) — masa açıldıktan sonra ---`);
  console.log('kol | ilk kahve isteği sn | ilk para sn | ilk 3 dk para olayı | ilk 3 dk en uzun parasız aralık sn');
  for (const k of KOLLAR) {
    const r = kos(k.ayar, HAZIR, o, VARIS_SN, 0);
    izle(`varis ${o.ad}`, k.ad, r.iz);
    console.log(`${k.ad}  | ${f1(r.ilkIstek).padStart(19)} | ${f1(r.ilkPara).padStart(11)} | ${String(r.ilk3Para).padStart(19)} | ${f0(r.ilk3Bosluk).padStart(17)}`);
  }
}

for (const [ad, masalar] of [['1 okey', OKEY4.slice(0, 1)], ['4 okey', OKEY4]] as const) {
  console.log('');
  console.log(`--- B · DURAĞAN ${ad} (son kademe) ---`);
  console.log('kol | ₺/dk/masa | taban farkı | para olayı arası sn | yığın ort ₺ | servis %');
  let taban = NaN;
  for (const k of KOLLAR) {
    const r = kos(k.ayar, masalar, GUCLU, SURE, ISINMA);
    botDamgasi(`${k.ad} ${ad}`, r.yol, SURE / 60, 2);
    izle(ad, k.ad, r.iz);
    if (k.ad === 'G0') taban = r.dkMasa;
    console.log(`${k.ad}  | ${f1(r.dkMasa).padStart(9)} | ${pc(r.dkMasa / taban - 1).padStart(11)} | ${f1(r.aralik).padStart(19)} | ${f0(r.yigin).padStart(11)} | ${pc(r.servisYuzde)}`);
  }
}

console.log('');
console.log('--- C · TAVLA 4 masa (son kademe) — yalnız bayraklar (ilk kahve + anında para); tavla sayıları aynı ---');
console.log('kol | ₺/dk/masa | taban farkı | para olayı arası sn | servis %');
{
  let taban = NaN;
  for (const k of KOLLAR.slice(0, 2)) {
    const r = kos(k.ayar, TAVLA4, GUCLU, SURE, ISINMA);
    botDamgasi(`${k.ad} tavla`, r.yol, SURE / 60, 2);
    izle('tavla', k.ad, r.iz);
    if (k.ad === 'G0') taban = r.dkMasa;
    console.log(`${k.ad}  | ${f1(r.dkMasa).padStart(9)} | ${pc(r.dkMasa / taban - 1).padStart(11)} | ${f1(r.aralik).padStart(19)} | ${pc(r.servisYuzde)}`);
  }
}

console.log('');
console.log('Kıyas: Kat 1 çay döngüsü — oturur → hemen sipariş → çay 6 sn → para (config tea.prepTime 6, npc.eatTime 4).');
damgaOzeti();
