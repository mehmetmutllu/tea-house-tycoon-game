/**
 * kat2/yol.ts — Kat 2 grubunun merdivenden masaya YÜRÜYÜŞ YOLU (yalnız görsel; mantık grubun
 * nerede olduğunu bilmez, yalnız `geliyor` süresini sayar — `kat2Dongu`).
 *
 * Yol köşeli (Manhattan) çizilir ki masaların ve kuyunun İÇİNDEN geçmesin:
 *   merdiven dibi (kuyu içi, y −3,2) → sahanlık → kuyunun yanı → kuyunun önü → [orta yol] →
 *   masanın arka koridoru → oturağın hizası → oturak.
 * Koridorlar masa dizilerinin arasından geçer (okey sıraları 5 br, tavla 3,6 br aralıklı).
 * Sayılar sahne ölçüsüdür (oyun kuralı değil); masa yerleri `KAT2_MASALAR`dan, kuyu `AGIZ`tan.
 */
import { AGIZ, type Kat2MasaYeri } from '../../../game/kat';
import { BAND } from '../../../game/layout';

export type Nokta = [number, number, number];

/** Oturakların masa merkezine uzaklığı (saf sayı — çizim `Esya`, yol ve bekçi aynı yerden okur). */
export const OKEY_OTURAK_R = 1.0;
export const TAVLA_OTURAK_R = 0.82;
/** Sv4'te masa büyür (okey ×1,15 · tavla ×1,2, D-181): oturaklar bu kadar dışarı açılır (`kat2-esya` yolu). */
export const SV4_ACILMA = 0.09;
export const oturakYerleri = (tur: 'okey' | 'tavla', sv = 1): [number, number][] => {
  const r = (tur === 'okey' ? OKEY_OTURAK_R : TAVLA_OTURAK_R) + (sv >= 4 ? SV4_ACILMA : 0);
  return tur === 'okey' ? [[0, -r], [r, 0], [0, r], [-r, 0]] : [[r, 0], [-r, 0]];
};

/**
 * Kuyunun içinde merdivenin basamak yüksekliği (z'ye göre). Kuyu dışı 0. G-100: kuyunun ÖNÜ (z ≥ `AGIZ.on`)
 * salon zeminidir — eskiden yalnız arka kenar sınırdı, merdiven hizasından (|x| < 2,3) salona geçen grup
 * kuyu dibi yüksekliğinde (−3,2) zeminin ALTINDA yürüyüp görünmez oluyordu.
 */
export function merdivenY(x: number, z: number): number {
  if (Math.abs(x) >= AGIZ.x || z <= AGIZ.arka || z >= AGIZ.on) return 0;
  const u = Math.min(1, (z - AGIZ.arka) / (AGIZ.on - AGIZ.arka));
  return -3.2 * u;
}

/** Grubun ön salonlara indiği hat: merdiven önünün iki yanı (D-191 N7: x ±4,6 arası boş yol). */
const GECIT_X = 0.9;
/** Kuyunun yanından geçilen hat (korkuluk ±2,3, kova duvarı ±4,6). */
const YAN_X = AGIZ.x + 0.6;
const ON_Z = BAND.front + 0.6;
/**
 * G-99: ÇIKIŞ şeridi geliş şeridinin yanından (yeni grup gelirken eskisi iner; karşı karşıya iç içe
 * geçmesinler): kuyuda +0,45 · kuyunun yanında +0,75 (kova duvarı ±4,6) · ön salona geçitte +0,7 ·
 * kuyunun önünde +0,6 (bir sıra salona doğru).
 */
const CIKIS = { serit: 0.45, yan: 0.75, gecit: 0.7, on: 0.6 } as const;

/** Merdiven dibinden (kuyu içi) oturağa giden yol. `cikis`: aynı güzergâhın çıkış şeridi (yönü çağıran çevirir — `cikisYolu`). */
export function grupYolu(m: Kat2MasaYeri, oturak: [number, number], sira: number, cikis = false): Nokta[] {
  const s = m.x < 0 ? -1 : 1;
  const ek = cikis ? CIKIS : { serit: 0, yan: 0, gecit: 0, on: 0 };
  const serit = s * (0.6 + ek.serit + (sira % 2) * 0.9);
  const yanX = YAN_X + ek.yan;
  const onZ = ON_Z + ek.on;
  // Koridor masa ayak izinin (okey ±1,25) hemen önü: sıralar arasından yana geçilir (bekçi `kat2-yol`).
  const koridor = m.z - (m.tur === 'okey' ? 1.9 : 1.8);
  const [dx, dz] = oturak;
  const ox = m.x + dx;
  const oz = m.z + dz;
  // Arka (kuzey) oturağa masanın yanından dolaşılır; öbürlerine doğrudan hizadan girilir.
  // Yan dolaşma salonun ortasına bakan yandan (S3: dış yanda Sv çerçevesi durur — `kat2SvTetikleri`).
  const ax = dz > 0.01 ? m.x - s * 1.9 : ox;
  const xz: [number, number][] = [
    [serit, AGIZ.on - 0.25],
    [serit, AGIZ.sahanlik - 0.55],
    [s * yanX, AGIZ.sahanlik - 0.55],
    [s * yanX, onZ],
  ];
  if (m.alan > 0) {
    const gx = (m.alan === 1 ? -1 : 1) * (GECIT_X + ek.gecit);
    xz.push([gx, onZ], [gx, koridor]);
  } else {
    xz.push([s * yanX, koridor]);
  }
  xz.push([ax, koridor], [ax, oz], [ox, oz]);
  const out: Nokta[] = [];
  for (const [x, z] of xz) {
    const son = out[out.length - 1];
    if (son && Math.abs(son[0] - x) < 1e-6 && Math.abs(son[2] - z) < 1e-6) continue;
    out.push([x, merdivenY(x, z), z]);
  }
  return out;
}

/**
 * G-99: kalkan grubun yolu — oturaktan çıkış şeridiyle kuyunun yanına, sahanlıktan merdivene, merdivenden
 * AŞAĞI (kuyu dibi, zeminin altı). Grup salonda değil inerken kaybolur (`Grup` son `SONME` payında söndürür).
 */
export const cikisYolu = (m: Kat2MasaYeri, oturak: [number, number], sira: number): Nokta[] => grupYolu(m, oturak, sira, true).reverse();

/** Grubun yürüme hızı (Kat 1 müşterisi `NPC_SPEED` 1,4); uzak masada süre yetmezse hızlanır. */
export const GRUP_HIZ = 1.5;
/**
 * Grup üyeleri arka arkaya çıkar (sn). D-198 (oyun testi G4 "iç içe giriyorlar"): herkes AYNI hızla
 * yürür → aradaki mesafe ARA × hız (≈ 1 m; şeritlerin birleştiği yerde ≥ 0,8 — bekçi `kat2-g-turu`) yol boyunca korunur; eskiden her kişi kendi süresine
 * sığdırıldığı için sonra çıkan hızlanıp öndekine biniyordu. Çıkış da aynı aralıkla.
 */
export const GRUP_ARA = 0.7;

/** Ortak geliş hızı: en geç çıkan da `T`de oturağında olsun (kısa yolda `GRUP_HIZ`ın altına inmez). */
export const gelisHizi = (boylar: readonly number[], T: number): number =>
  Math.max(GRUP_HIZ, ...boylar.map((b, k) => b / Math.max(0.5, T - k * GRUP_ARA)));

/** k. üyenin geliş yolundaki oranı (0 = henüz çıkmadı, 1 = oturakta); `gecen` gelişin başından sn. */
export const gelisOrani = (boy: number, k: number, gecen: number, hiz: number): number =>
  Math.max(0, Math.min(1, ((gecen - k * GRUP_ARA) * hiz) / boy));

export interface Yol {
  n: Nokta[];
  /** Kümülatif uzunluk (yatay). */
  L: number[];
  boy: number;
}

export function yolKur(n: Nokta[]): Yol {
  const L = [0];
  for (let i = 1; i < n.length; i++) L.push(L[i - 1] + Math.hypot(n[i][0] - n[i - 1][0], n[i][2] - n[i - 1][2]));
  return { n, L, boy: L[L.length - 1] };
}

/** Yolun `u` (0..1) oranındaki noktası + gidiş yönü (y açısı). Kuyu içinde y basamaktan. */
export function yolNoktasi(y: Yol, u: number, out: Nokta): number {
  const d = Math.max(0, Math.min(1, u)) * y.boy;
  let i = 1;
  while (i < y.L.length - 1 && y.L[i] < d) i++;
  const a = y.n[i - 1];
  const b = y.n[i] ?? a;
  const seg = y.L[i] - y.L[i - 1] || 1;
  const t = Math.max(0, Math.min(1, (d - y.L[i - 1]) / seg));
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  out[1] = merdivenY(out[0], out[2]);
  return Math.atan2(b[0] - a[0], b[2] - a[2]);
}

/** G-99: çıkışın son payı (sn) — kuyu dibinde, zeminin altında söner. */
export const SONME_SN = 0.35;

/**
 * Çıkışta k. üyenin yerinin oranı (0 = oturak, 1 = kuyu dibi) ve ölçeği; `null` = yolu bitti (gizli).
 * Üyeler `GRUP_ARA` arayla kalkar, `GRUP_HIZ`la yürür; yalnız yolun son `SONME_SN` payında söner.
 */
export function cikisPozu(boy: number, k: number, t: number): { u: number; olcek: number } | null {
  const d = Math.max(0, t - k * GRUP_ARA) * GRUP_HIZ;
  if (d >= boy) return null;
  return { u: d / boy, olcek: Math.max(0.001, Math.min(1, (boy - d) / (GRUP_HIZ * SONME_SN))) };
}

/** Bütün grubun kuyuya inip söndüğü süre (sn). */
export const cikisSuresi = (boylar: readonly number[]): number => Math.max(0, ...boylar.map((b, k) => k * GRUP_ARA + b / GRUP_HIZ));

/**
 * G-100: SIRADAKİ grubun gelişin başından geçen süresi (sn) — `null` = henüz yola çıkmadı. Geliş toplam
 * `once + yurume` sürer ve `geliyor` bitince oturakta biter; grup `bos` bitmeden `once` sn önce merdivenden
 * çıkar. Boş süre (`bosSure`, Sv ile kısalır: Sv5'te 1,5 sn) `once`tan kısaysa önceki grup daha OYNARKEN
 * yola çıkar — yoksa ya yolun ortasında belirir ya da koşarak yetişmek zorunda kalırdı.
 */
export function gelisGecen(durum: string, t: number, once: number, yurume: number, bosSure: number): number | null {
  if (durum === 'geliyor') return once + yurume - t;
  if (durum === 'bos') return t <= once ? once - Math.max(0, t) : null;
  if (durum === 'oyunda') {
    const g = once - (t + bosSure);
    return g >= 0 ? g : null;
  }
  return null;
}

/** Bütün üyelerin `GRUP_HIZ`la `GRUP_ARA` arayla yürüyüp yetişeceği erken çıkış (sn): en uzun (yol + sıra) − `yurume`. */
export const gerekenOnce = (boylar: readonly number[], yurume: number): number =>
  Math.max(0, ...boylar.map((b, k) => b / GRUP_HIZ + k * GRUP_ARA - yurume));
