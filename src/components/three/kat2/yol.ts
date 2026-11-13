/**
 * kat2/yol.ts — Kat 2 grubunun merdivenden masaya YÜRÜYÜŞ YOLU (yalnız görsel; mantık grubun
 * nerede olduğunu bilmez, yalnız `geliyor` süresini sayar — `kat2Dongu`).
 *
 * Yol köşeli (Manhattan) çizilir ki masaların ve kuyunun İÇİNDEN geçmesin:
 *   merdiven dibi (kuyu içi, y −3,2) → sahanlık → kuyunun yanı → kuyunun önü → [geçit] →
 *   masanın arka koridoru → oturağın hizası → oturak.
 * Koridorlar masa dizilerinin arasından geçer (okey sıraları 5 br, tavla 3,6 br aralıklı).
 * Sayılar sahne ölçüsüdür (oyun kuralı değil); masa yerleri `KAT2_MASALAR`dan, kuyu `AGIZ`tan.
 */
import { AGIZ, type Kat2MasaYeri } from '../../../game/kat';
import { BAND } from '../../../game/layout';

export type Nokta = [number, number, number];

/** Kuyunun içinde merdivenin basamak yüksekliği (z'ye göre). Kuyu dışı 0. */
export function merdivenY(x: number, z: number): number {
  if (Math.abs(x) >= AGIZ.x || z <= AGIZ.arka) return 0;
  const u = Math.min(1, (z - AGIZ.arka) / (AGIZ.on - AGIZ.arka));
  return -3.2 * u;
}

/** Grubun ön salonlara indiği hat: merdiven önünün iki yanı (D-191 N7: x ±4,6 arası boş yol). */
const GECIT_X = 0.9;
/** Kuyunun yanından geçilen hat (korkuluk ±2,3, kova duvarı ±4,6). */
const YAN_X = AGIZ.x + 0.6;
const ON_Z = BAND.front + 0.6;

export function grupYolu(m: Kat2MasaYeri, oturak: [number, number], sira: number): Nokta[] {
  const s = m.x < 0 ? -1 : 1;
  const serit = s * (0.6 + (sira % 2) * 0.9);
  // Okey koridoru masa ayak izinin (±1,25) hemen önü: okey salonunda bölmeye yaslı 2. ocağın
  // önünden (tezgâh ön yüzü z ≈ 2,15) değil, ocak ile masa arasından geçer.
  const koridor = m.z - (m.tur === 'okey' ? 1.9 : 1.8);
  const [dx, dz] = oturak;
  const ox = m.x + dx;
  const oz = m.z + dz;
  // Arka (kuzey) oturağa masanın yanından dolaşılır; öbürlerine doğrudan hizadan girilir.
  const ax = dz > 0.01 ? m.x + 1.9 : ox;
  const xz: [number, number][] = [
    [serit, AGIZ.on - 0.25],
    [serit, AGIZ.sahanlik - 0.55],
    [s * YAN_X, AGIZ.sahanlik - 0.55],
    [s * YAN_X, ON_Z],
  ];
  if (m.alan > 0) {
    const gx = m.alan === 1 ? -GECIT_X : GECIT_X;
    xz.push([gx, ON_Z], [gx, koridor]);
  } else {
    xz.push([s * YAN_X, koridor]);
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
