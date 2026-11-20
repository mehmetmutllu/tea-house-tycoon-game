/**
 * kat2/kahveUstaYol.ts — G-109 "kahveci sağa sola yürüsün": Kat 2 kahve ustasının yürüyüşü (SALT GÖRSEL).
 *
 * Kat 1 çaycısının (`Scene.KitchenHand`, D-023 + Ç1/D-118) aynısı: ön tezgâhın arkasındaki koridorda, kendi
 * setinin iki yanı arasında gidip gelir; uçlarda durup tezgâha (oyuncuya) dönüp "iş yapar". Tempo yükten:
 * bekleyen kahve (masaların açık isteği) — Kat 1'de çay bekleyen müşteri. Yük yokken faz donar, usta olduğu
 * yerde tezgâha dönük dinlenir. Faz BİRİKTİRİLİR (zaman × çarpan değil): yük değişince ışınlanmaz.
 */
import { KAT2_ON_TEZGAH, type Kat2Ocak } from '../../../game/kat';
import { CAYCI_TEMPO, cayciHizCarpani } from '../kitchenLook';
import { SET_OLCEK } from './esyaOlcu';

/** Ustanın durduğu hat: tezgâhın arka kenarından 0,45 geride (eski sabit duruşun hattı). */
export const USTA_Z = KAT2_ON_TEZGAH.z0 - 0.45;
/** Setin merkezinden iki yana yürüme payı (br): set + iki tepsi genişliği kadar; komşu ocak 5,8 br ötede. */
export const USTA_YARIM = 1.3;

export interface UstaYolu {
  a: [number, number];
  b: [number, number];
  /** Uçta durunca baktığı yön (tezgâh / salon, +z). */
  yuz: number;
}

/** Bir ocağın ustasının yolu: setin (eski duruş x + 0,25 × ölçek) iki yanı, tezgâhın arkasında. */
export function ustaYolu(ocak: Pick<Kat2Ocak, 'x'>): UstaYolu {
  const cx = ocak.x + 0.25 * SET_OLCEK;
  return { a: [cx - USTA_YARIM, USTA_Z], b: [cx + USTA_YARIM, USTA_Z], yuz: 0 };
}

/** Bekleyen kahve (masalardaki açık isteklerin fincanı) — ustanın YÜKÜ. */
export const kahveBekleyen = (masalar: readonly { istek: number }[]): number => masalar.reduce((a, m) => a + Math.max(0, m.istek), 0);

/** Fazın bu karede ilerleyeceği miktar (rad). Yük yokken 0 — Kat 1 `cayciHizCarpani`. */
export const ustaFazAdimi = (dt: number, bekleyen: number): number => dt * CAYCI_TEMPO.temelHiz * cayciHizCarpani(bekleyen);

/** Uçta "iş yapma" payı: |cos faz| bunun altındayken usta durur, tezgâha döner (Kat 1 ile aynı 0,25). */
const UC_PAYI = 0.25;

/** Fazdaki konum + yön. `calisiyor` false: olduğu yerde tezgâha dönük durur. */
export function ustaPozu(yol: UstaYolu, faz: number, calisiyor: boolean): { x: number; z: number; aci: number; duruyor: boolean } {
  const u = (Math.sin(faz) + 1) / 2;
  const x = yol.a[0] + u * (yol.b[0] - yol.a[0]);
  const z = yol.a[1] + u * (yol.b[1] - yol.a[1]);
  const duruyor = !calisiyor || Math.abs(Math.cos(faz)) < UC_PAYI;
  // Yürüme yönü parçanın ekseninden: cos > 0 → a'dan b'ye.
  const ileri = Math.atan2(yol.b[0] - yol.a[0], yol.b[1] - yol.a[1]);
  const aci = duruyor ? yol.yuz : Math.cos(faz) > 0 ? ileri : ileri + Math.PI;
  return { x, z, aci, duruyor };
}
