/**
 * kat.ts — KAT 2 ALTYAPISI (K2-2): hangi kattayız, Kat 2'de nerede yürünür, merdiven nasıl geçilir.
 *
 * Kat 1'in yerleşimi (`layout.ts`) DOKUNULMAZ: Kat 2 aynı binanın üst katı, ayak izi aynı (34 × 34
 * + arka bant), ama kendi yürüme alanı ve kendi merdiven ağzı var. Plan D-179 (B bölmeli salonlar):
 * arka "merdiven salonu" → sol ön okey salonu → sağ ön tavla köşesi. K2-2'de yalnız ilk salon açık;
 * ön salonlar kaba inşaat (çizilir, yürünmez).
 *
 * Kat 2'deyken Kat 1 KENDİ BAŞINA işler (D-174 kararı ②): müşteri gelir, garson taşır. Oyuncu o
 * sırada Kat 1'in sistemlerine `KAT1_DISI`nda görünür — hiçbir masaya, pada, paraya yetişemeyecek
 * kadar uzakta. Böylece Kat 1'in tick'i tek satır kapıyla aynı kalır.
 *
 * ÜRETİM KAPISI: Kat 2 içeriği bitene dek oyuncuya görünmez (`kat2Etkin`). Kapı kapalıyken kayıt
 * Kat 2'de bile olsa oyun Kat 1'de açılır — yayındaki sürüm kimseyi boş bir kata hapsedemez.
 */
import { BAND, BAND_SHELL, FLOOR_HALF, LAYOUT, hitsSolid, type Solid } from './layout';
import type { Vec3 } from './types';

export type KatNo = 1 | 2;

const ENV = (import.meta as { env?: { DEV?: boolean; VITE_KAT2?: string } }).env;
/** Kat 2 bu derlemede oyuncuya açık mı. Geliştirmede ve testte açık; üretimde `VITE_KAT2=1` ile. */
export function kat2Etkin(): boolean {
  return ENV?.DEV === true || ENV?.VITE_KAT2 === '1' || ENV === undefined;
}

// ============================== GEOMETRİ ==============================

export interface Dik {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

const H = FLOOR_HALF;
/** Bandın iç yüzü (dış duvar hattının 0,09 içi) — Kat 1 ile aynı kabuk. */
const BANT_IC = BAND_SHELL.back + 0.09;
/** Merdiven kovasının ara duvarları x = ±4,6 (Kat 1'in `BAND.stairs`ı, aynı hat). */
export const KOVA = { x0: BAND.stairs.minX, x1: BAND.stairs.maxX, z0: BANT_IC, z1: BAND.front } as const;
/**
 * MERDİVEN AĞZI — Kat 1 merdiveninin üst ucu (14 basamak × 0,46). Ön ve iki yanda korkuluk, arkası
 * sahanlık: oyuncu Kat 2'ye arka sahanlıktan çıkar, kuyunun iki yanından salona yürür.
 */
export const AGIZ = { x: 2.3, arka: -16.4, on: -10.2, sahanlik: -15.2 } as const;

/** Kat 2'nin üç alanı (D-179 B): 0 merdiven salonu (arka) · 1 okey salonu (sol ön) · 2 tavla köşesi (sağ ön). */
export const KAT2_ALANLAR: readonly Dik[] = [
  { x0: -H, x1: H, z0: BAND.front, z1: 0 },
  { x0: -H, x1: 0, z0: 0, z1: H },
  { x0: 0, x1: H, z0: 0, z1: H },
];

/** K2-2'de açık alan sayısı. Açılış zinciri K2-3/K2-5'te gelir (pad + ölçülmüş fiyat). */
export const KAT2_ACIK_ALAN = 1;

const PR = LAYOUT.playerRadius;

/** İç duvar gövdesinin yarısı (maket duvarı 0,18). */
const DUVAR_YARI = 0.09;

/**
 * Oyuncunun Kat 2'de yürüyebildiği dikdörtgenler. Dış duvarlar kat kenarının 0,5 dışında (Kat 1 ile
 * aynı kural) → kenar olduğu gibi; İÇ duvarlar (kilitli salonun bölmesi, kovanın ara duvarları) tam
 * hatta → gövde yarıçapı kadar içeri.
 */
export function kat2YurumeAlani(acikAlan = KAT2_ACIK_ALAN): Dik[] {
  const ic = PR + DUVAR_YARI;
  const out = KAT2_ALANLAR.slice(0, acikAlan).map((d) => ({ ...d }));
  // Ön salonlar kapalıyken z = 0 bölme duvarıdır (K2-3'te kemerli geçitler açılır).
  if (acikAlan === 1) out[0].z1 = -ic;
  out.push({ x0: KOVA.x0 + ic, x1: KOVA.x1 - ic, z0: KOVA.z0 + PR, z1: KOVA.z1 });
  return out;
}

/** Merdiven kuyusu — korkuluklu ağız; içine yürünmez (arka sahanlık açık). */
export const KUYU: Solid = {
  c: [0, 0, (AGIZ.sahanlik + AGIZ.on) / 2],
  h: [AGIZ.x, (AGIZ.on - AGIZ.sahanlik) / 2],
};

/** Noktayı dikdörtgen birleşimine kelepçeler (`layout.clampToOpenAreas`in Kat 2 karşılığı). */
export function dikKelepce(x: number, z: number, dikler: readonly Dik[]): [number, number] {
  let bx = x;
  let bz = z;
  let bd = Infinity;
  for (const r of dikler) {
    const cx = Math.max(r.x0, Math.min(r.x1, x));
    const cz = Math.max(r.z0, Math.min(r.z1, z));
    const d = (cx - x) ** 2 + (cz - z) ** 2;
    if (d === 0) return [x, z];
    if (d < bd) {
      bd = d;
      bx = cx;
      bz = cz;
    }
  }
  return [bx, bz];
}

/**
 * Kat 2'de bir adımlık yürüyüş: alan kelepçesi + kuyu katı engeli (eksen-başı kayma — Kat 1'in
 * `playerMoveSystem`iyle aynı desen; içindeyse çıkışa izin verilir, hapsolmaz).
 */
export function kat2Adim(x: number, z: number, dx: number, dz: number, acikAlan = KAT2_ACIK_ALAN): [number, number] {
  const alan = kat2YurumeAlani(acikAlan);
  let [nx, nz] = dikKelepce(x + dx, z + dz, alan);
  const icinde = hitsSolid(x, z, [KUYU], PR);
  if (!icinde) {
    if (dx !== 0 && hitsSolid(nx, z, [KUYU], PR)) nx = x;
    if (dz !== 0 && hitsSolid(nx, nz, [KUYU], PR)) nz = z;
    [nx, nz] = dikKelepce(nx, nz, alan);
  }
  return [nx, nz];
}

// ============================== MERDİVEN ==============================

/** Oyuncu Kat 2'deyken Kat 1 sistemlerinin gördüğü konum: her masadan/pad'den/paradan uzak. */
export const KAT1_DISI: Vec3 = [0, 0.6, 400];

/** Varış noktaları: Kat 1'de merdivenin önü, Kat 2'de sahanlığın solu (kuyunun dışı). */
export const VARIS: Record<KatNo, Vec3> = {
  1: [0, 0.6, BAND.front + 1.4],
  2: [-AGIZ.x - PR - 0.35, 0.6, (AGIZ.arka + AGIZ.sahanlik) / 2],
};

/** Geçiş: ekran YARI sürede kararır, kat değişir, YARI sürede açılır (sn). */
export const GECIS_SN = 0.7;

/** Girdinin merdivene doğru sayılması için en az bileşen (joystick 0..1). */
const ITME = 0.5;

/**
 * Merdivene yürüyor mu? Hareket temelli (dwell değil — feedback_interaction_model): oyuncu
 * merdivenin ağzında durup ONA DOĞRU itiyorsa geçer. Kat 1: kovanın önünde (salonun arka kenarı)
 * −z'ye. Kat 2: sahanlıkta kuyunun hizasında +z'ye (aşağı).
 */
export function merdivenTetik(kat: KatNo, x: number, z: number, girdi: readonly number[]): boolean {
  if (Math.abs(x) > AGIZ.x - 0.3) return false;
  if (kat === 1) return z <= BAND.front + 0.35 && girdi[1] < -ITME;
  return z >= AGIZ.sahanlik - PR - 0.2 && z <= AGIZ.sahanlik && girdi[1] > ITME;
}

/** Süren kat geçişi (geçici durum — kayda yazılmaz). */
export interface KatGecis {
  hedef: KatNo;
  /** Geçen süre (sn). */
  t: number;
}

/** Geçişin karartma oranı 0..1 (UI perdesi okur): yarıya dek artar, sonra azalır. */
export function gecisKarartma(g: KatGecis | null): number {
  if (!g) return 0;
  const y = GECIS_SN / 2;
  return g.t < y ? g.t / y : Math.max(0, 1 - (g.t - y) / y);
}

/** Kat 2 kaydı (her katın kendi ilerlemesi). K2-3'te pad'leri, seviyeleri buraya eklenir. */
export interface Kat2Kayit {
  /** Merdiven tamir edildi mi (Kat 2 erişilebilir). */
  acik: boolean;
  /** Kat 2'de açılmış pad kimlikleri (Kat 1'in `padsDone` deseni; K2-3'te dolar). */
  padsDone: string[];
}

export const defaultKat2 = (): Kat2Kayit => ({ acik: false, padsDone: [] });

/**
 * Yüklemede hangi katta başlanır. Kayıt Kat 2 diyor ama kat kapalıysa (merdiven yok ya da bu
 * derlemede Kat 2 kapıda) Kat 1 — kimse erişemediği bir katta açılmaz.
 */
export function baslangicKati(kayitKat: unknown, kat2: Kat2Kayit, etkin = kat2Etkin()): KatNo {
  return kayitKat === 2 && kat2.acik && etkin ? 2 : 1;
}
