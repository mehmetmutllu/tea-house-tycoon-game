/**
 * kat2/yapiOlcu.ts — KAT 2 YAPISININ SAF ÖLÇÜSÜ (three/react yok; bekçi `tests/s5-yapi.test.ts` doğrudan okur).
 * Çizim `Kat2.tsx` (kabuk, kuyu), `kat2/Bolme.tsx` (bölme) ve `kat2/MerdivenDonusum.tsx` (toz) buradan okur.
 *
 * Oyun testi 2026-11-20 (S5 YAPI):
 *  · G-101 kuyunun arka köşesinde yarık → arkada dışarısı (yeşil) görünüyordu: basamak ile kova yanağı arasında
 *    boşluk, ağzın arka/ön yüzü açık. Kuyu kapalı kabuk: basamak yanağa kadar, arka + ön perde, dip.
 *  · G-116 köşelerde duvarlar üst üste / içe dönmüş köşe: dış duvar her alanın kenarı için AYRI parça çiziliyor,
 *    her parça iki ucundan 0,5 taşıyordu (aynı hatta üst üste); bölme kat kenarında bitiyordu, dış duvar 0,5
 *    dışarıda → arada çentik. Dış kenarlar hat başına BİRLEŞİR; bölme uçları dış duvarın eksenine / dik bölmenin
 *    öbür yüzüne uzar.
 *  · G-121 salon açılınca yandaki bölme tam boy (3,2) kalıyordu → bütün bölmeler alçak (`ON_BOLME_H`, D-198 G3 dili).
 *  Yalnız görüntü: çarpışma `kat.kat2Duvarlar` (değişmedi).
 */
import { KAT2_BOLMELER, KAT2_ON_TEZGAH, KOVA, ON_BOLME_H, type Dik } from '../../../game/kat';
import { BAND, FLOOR_HALF } from '../../../game/layout';
import { ON_DUVAR_H, WALL_H, WALL_M } from '../wallOlcu';

const H = FLOOR_HALF;
/** Dış duvarın ekseni kat kenarının bu kadar dışında (Scene.Walls ile aynı). */
export const DIS_PAY = WALL_M;

// ---- Dış kabuk: açık dikdörtgenlerin BİRLEŞİMİNİN çevresi (maketin `cevre`/`hat`ı) ----
export type Kenar = { yon: 'x' | 'z'; c: number; a: number; b: number; dis: boolean; yan: boolean };

function cikar(spans: [number, number][], a: number, b: number): [number, number][] {
  return spans.flatMap(([s, e]) => {
    if (b <= s || a >= e) return [[s, e]] as [number, number][];
    const r: [number, number][] = [];
    if (a > s) r.push([s, a]);
    if (b < e) r.push([b, e]);
    return r;
  });
}

const yanMi = (yon: 'x' | 'z', dis: boolean, b: number) => yon === 'z' && dis && b > BAND.front;

/** Dikdörtgenlerin birleşiminin kenarları; `dis` = bina kabuğu (kat kenarı ya da bant arkası). */
export function cevre(diks: readonly Dik[]): Kenar[] {
  const out: Kenar[] = [];
  diks.forEach((r, i) => {
    const kenarlar = [
      { yon: 'x' as const, c: r.z1, a: r.x0, b: r.x1, karsi: (o: Dik) => o.z0 === r.z1 },
      { yon: 'x' as const, c: r.z0, a: r.x0, b: r.x1, karsi: (o: Dik) => o.z1 === r.z0 },
      { yon: 'z' as const, c: r.x0, a: r.z0, b: r.z1, karsi: (o: Dik) => o.x1 === r.x0 },
      { yon: 'z' as const, c: r.x1, a: r.z0, b: r.z1, karsi: (o: Dik) => o.x0 === r.x1 },
    ];
    for (const k of kenarlar) {
      let sp: [number, number][] = [[k.a, k.b]];
      diks.forEach((o, j) => {
        if (j === i || !k.karsi(o)) return;
        sp = k.yon === 'x' ? cikar(sp, o.x0, o.x1) : cikar(sp, o.z0, o.z1);
      });
      const dis = Math.abs(k.c) === H || k.c === BAND.back;
      for (const [a, b] of sp) out.push({ yon: k.yon, c: k.c, a, b, dis, yan: yanMi(k.yon, dis, b) });
    }
  });
  return out;
}

/**
 * G-116: aynı hatta uç uca değen dış kenarlar TEK kenar olur. Ayrı kalınca her parça iki ucundan `DIS_PAY`
 * taşıyıp komşusunun üstüne biniyordu (aynı düzlemde iki kutu — köşe gibi görünen dikiş).
 */
export function birlestir(kenarlar: readonly Kenar[]): Kenar[] {
  const sirali = [...kenarlar].sort((p, q) => (p.yon === q.yon ? (p.c === q.c ? p.a - q.a : p.c - q.c) : p.yon < q.yon ? -1 : 1));
  const out: Kenar[] = [];
  for (const k of sirali) {
    const son = out[out.length - 1];
    if (son && son.yon === k.yon && son.c === k.c && son.dis === k.dis && k.a <= son.b + 1e-9) {
      son.b = Math.max(son.b, k.b);
      son.yan = yanMi(son.yon, son.dis, son.b);
    } else out.push({ ...k });
  }
  return out;
}

/** Bina kabuğunun dış kenarları: bant + alanlar, hat başına tek parça. */
export function disKenarlar(alanlar: readonly Dik[]): Kenar[] {
  const bant: Dik = { x0: -H, x1: H, z0: BAND.back, z1: BAND.front };
  return birlestir(cevre([bant, ...alanlar]).filter((k) => k.dis));
}

/** Ön (kameraya bakan) kenar mı: kat kenarı z = +H'de yatay dış kenar. */
export const onKenarMi = (k: Kenar): boolean => k.yon === 'x' && k.dis && k.c === H;

/** S5 G-114 B: dış duvarın boyu — ön kenar `ON_DUVAR_H` (1,0, Kat 1 ile aynı kural), gerisi tam boy. */
export const kenarBoyu = (k: Kenar): number => (onKenarMi(k) ? ON_DUVAR_H : WALL_H);

// ---- Mutfağın sağ duvarı (G-102 C + G-111) ----
/** Duvarın ucu ile ön tezgâhın arka yüzü arasındaki aralık (0 = değer). */
export const MUTFAK_SAG_ARALIK = 0;
/**
 * Mutfak ile merdiven kovası arasındaki duvar: ALÇAK (G-102 C, D-198 dili: lambri + çıta, 1,0) ve ön ucu
 * ön tezgâhın ARKASINDA biter (G-111): tezgâhın ucu açıkta tek parça okunur, çıta tezgâhı kesmez.
 * Eskiden 2,2 m ve `BAND.front`a kadar uzanıyordu — tezgâhın ucu duvarın yarı kalınlığına gömülüydü.
 * Arka ucu dış duvarın eksenine (G-116). Yalnız görüntü: çarpışma `kat.kat2Duvarlar` (değişmedi).
 */
export const MUTFAK_SAG_DUVAR = {
  x: KOVA.x0,
  z0: BAND.back - DIS_PAY,
  z1: KAT2_ON_TEZGAH.z0 - MUTFAK_SAG_ARALIK,
  h: ON_DUVAR_H,
} as const;

// ---- Binanın altı (G-115 C) ----
/** Alt kat gövdesi: Kat 2'nin dış duvar hatlarında 3,2 aşağı iner (zemin üstü 0 = Kat 2 zemini). */
export const ALT_KAT = {
  x0: -H - DIS_PAY,
  x1: H + DIS_PAY,
  z0: BAND.back - DIS_PAY,
  z1: H + DIS_PAY,
  derin: WALL_H,
  silme: 0.24,
  silmeRenk: '#cdbb9b',
  camRenk: '#3d5566',
  /** Kat 1 kaldırımı (`Scene.Street`) ile aynı gri. */
  sokakRenk: '#9e9e9e',
  asfaltRenk: '#37424a',
} as const;

/** Alt kat cephesinin koyu camları (ön yüz): 6 göz, eşit adım, kat ortasında. */
export function altKatCamlari(): { x: number; y: number; w: number; h: number }[] {
  const n = 6;
  const w = 1.8;
  const adim = (ALT_KAT.x1 - ALT_KAT.x0) / n;
  return Array.from({ length: n }, (_, i) => ({ x: ALT_KAT.x0 + adim * (i + 0.5), y: -ALT_KAT.derin * 0.53, w, h: 1.5 }));
}

// ---- Bölme (alanlar arası hat) ----
/** Alçak bölmenin lambri gövdesinin yarısı (çizim 0,22) ve üst çıtası (0,28). */
export const BOLME_YARI = 0.11;

export interface BolmeCizimi {
  yatay: boolean;
  /** Hat boyunca uçlar (yatayda x, dikeyde z) ve sabit koordinat. */
  a: number;
  b: number;
  c: number;
  h: number;
}

/**
 * Bir bölmenin ÇİZİMİ (G-116 + G-121). Boy hep `ON_BOLME_H` (kameraya bakan ya da yan — hepsi alçak).
 * Uç kat kenarındaysa dış duvarın eksenine (`H + DIS_PAY`) uzar: arada şap şeridi/çentik kalmaz. İç uç
 * (bölmelerin kavşağı) gövde yarısı kadar uzar: dik bölmeyle temiz L/T kurar.
 */
export function bolmeCizimi(b: (typeof KAT2_BOLMELER)[number]): BolmeCizimi {
  const yatay = b.z1 === b.z2;
  const [a0, b0] = yatay ? [Math.min(b.x1, b.x2), Math.max(b.x1, b.x2)] : [Math.min(b.z1, b.z2), Math.max(b.z1, b.z2)];
  const uza = (u: number, s: -1 | 1) => (Math.abs(u) === H ? u + s * DIS_PAY : u + s * BOLME_YARI);
  return { yatay, a: uza(a0, -1), b: uza(b0, 1), c: yatay ? b.z1 : b.x1, h: ON_BOLME_H };
}

// ---- Merdiven kuyusu (G-101) ----
export const KUYU_DERIN = 3.2;
export const KUYU_BASAMAK = 14;
/** Kuyunun yan yanakları (merdiven korkuluğunun altı) kalınlığı. */
export const KUYU_YANAK = 0.05;
/** Kuyu kabuğunun perdeleri: zeminin hemen altından dibe; kalınlık. */
export const KUYU_PERDE = 0.06;

/** Basamağın yarı eni: yanak iç yüzünün İÇİNE girer — arada aşağı (dışarıya) bakan yarık kalmaz. */
export const kuyuBasamakYariEn = (agizX: number): number => agizX - KUYU_YANAK / 4;

// ---- Toz dönüşümü (G-117: merdiven + lavabo aynı efekt) ----
export interface TozNoktasi {
  x: number;
  z: number;
  r: number;
}

/** Dönüşüm tozunun öbekleri: `merkez` çevresinde `yaricap` elipsinde, `n` öbek (merdivenin ilk deseni). */
export function tozNoktalari(merkez: readonly [number, number], yaricap: readonly [number, number], n: number): TozNoktasi[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: merkez[0] + Math.cos(a) * yaricap[0] + (i % 3) * 0.4 - 0.4, z: merkez[1] + Math.sin(a) * yaricap[1], r: 0.35 + (i % 4) * 0.08 };
  });
}
