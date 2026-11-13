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
import { buildNavGrid, type NavGrid } from './nav';
import type { Vec3 } from './types';

export type KatNo = 1 | 2;

const ENV = (import.meta as { env?: { DEV?: boolean; VITE_KAT2?: string } }).env;
/** Kat 2 bu derlemede oyuncuya açık mı. Geliştirmede ve testte açık; üretimde `VITE_KAT2=1` ile. */
export function kat2Etkin(): boolean {
  return ENV?.DEV === true || ENV?.VITE_KAT2 === '1' || ENV === undefined;
}

/**
 * Kat 1'in merdiveni tamirli mi (K2-2b)? Kat 2 açıksa yıkık merdiven + dubalar yerine tamir edilmiş
 * merdiven çizilir. Kapı kapalı derlemede kayıt "açık" dese bile yıkık durur: çıkılamayan merdiven
 * çıkılır gibi görünmesin.
 */
export function merdivenTamirli(kat2: { acik: boolean }, etkin = kat2Etkin()): boolean {
  return kat2.acik && etkin;
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

// ---- SPRINT K2-S1 SÖZLEŞMESİ (orkestratör yazar; ajanlar DEĞİŞTİRMEZ, ihtiyacı rapora yazar) ----

/** Ön salonları açan pad'ler: [okey salonu (alan 1), tavla köşesi (alan 2)] — D-179 açılış sırası. */
export const KAT2_SALON_PAD: readonly string[] = ['k2salon2', 'k2salon3'];

/** Açık alan sayısı padsDone'dan TÜRER (feedback tek kaynak): 1 + açılmış salon pad'i (sıralı). */
export function kat2AcikAlan(padsDone: readonly string[]): number {
  let n = 1;
  for (const id of KAT2_SALON_PAD) {
    if (!padsDone.includes(id)) break;
    n += 1;
  }
  return n;
}

/**
 * Bölme duvarları + kemerli geçitler (maket B `bolmeler`, D-180 tam bölme 2,2). `kapilar` duvar
 * boyunca [a, b] aralıkları (x'e ya da z'ye göre); `alanlar` duvarın ayırdığı iki alan.
 */
export const KAT2_BOLMELER: readonly { x1: number; z1: number; x2: number; z2: number; kapilar: readonly (readonly [number, number])[]; alanlar: readonly [number, number] }[] = [
  { x1: -FLOOR_HALF, z1: 0, x2: 0, z2: 0, kapilar: [[-10.5, -7.2], [-1.8, 0]], alanlar: [0, 1] },
  { x1: 0, z1: 0, x2: FLOOR_HALF, z2: 0, kapilar: [[0, 1.8], [7.2, 10.5]], alanlar: [0, 2] },
  { x1: 0, z1: 0, x2: 0, z2: FLOOR_HALF, kapilar: [[7.2, 10.2]], alanlar: [1, 2] },
];

export type MasaTuru = 'okey' | 'tavla';
export interface Kat2MasaYeri {
  id: string;
  tur: MasaTuru;
  /** Bulunduğu alan (0 merdiven salonu · 1 okey salonu · 2 tavla köşesi). */
  alan: number;
  x: number;
  z: number;
}

const PR = LAYOUT.playerRadius;

/** İç duvar gövdesinin yarısı (maket duvarı 0,18). */
const DUVAR_YARI = 0.09;

type Kenar = 'x0' | 'x1' | 'z0' | 'z1';

/** Bölme, alanın hangi kenarında? (yatay bölme z'de, dikey bölme x'te durur) */
function bolmeKenari(b: (typeof KAT2_BOLMELER)[number], d: Dik): Kenar | null {
  if (b.z1 === b.z2) return b.z1 === d.z0 ? 'z0' : b.z1 === d.z1 ? 'z1' : null;
  return b.x1 === d.x0 ? 'x0' : b.x1 === d.x1 ? 'x1' : null;
}

/**
 * Oyuncunun Kat 2'de yürüyebildiği dikdörtgenler: AÇIK alanların birleşimi + merdiven kovası. Dış
 * duvarlar kat kenarının 0,5 dışında (Kat 1 ile aynı kural) → kenar olduğu gibi. Bir alanın kenarı
 * yalnız KAPALI alanlara bakıyorsa (kilitli salonun bölmesi) o kenar gövde + duvar yarısı kadar içeri
 * çekilir; açık bir alana da bakıyorsa kenar yerinde kalır ve duvarı `kat2Duvarlar` katı tutar
 * (geçit yalnız oradan açılır). Kovanın ara duvarları tam hatta → gövde yarıçapı kadar içeri.
 */
export function kat2YurumeAlani(acikAlan = KAT2_ACIK_ALAN): Dik[] {
  const ic = PR + DUVAR_YARI;
  const out: Dik[] = [];
  for (let a = 0; a < Math.min(acikAlan, KAT2_ALANLAR.length); a++) {
    const d = { ...KAT2_ALANLAR[a] };
    const kenarlar = new Map<Kenar, boolean>(); // kenar → karşısında açık alan var mı
    for (const b of KAT2_BOLMELER) {
      if (!b.alanlar.includes(a)) continue;
      const k = bolmeKenari(b, KAT2_ALANLAR[a]);
      if (!k) continue;
      const karsi = b.alanlar[0] === a ? b.alanlar[1] : b.alanlar[0];
      kenarlar.set(k, (kenarlar.get(k) ?? false) || karsi < acikAlan);
    }
    for (const [k, acikKomsu] of kenarlar) {
      if (acikKomsu) continue;
      if (k === 'x0' || k === 'z0') d[k] += ic;
      else d[k] -= ic;
    }
    out.push(d);
  }
  out.push({ x0: KOVA.x0 + ic, x1: KOVA.x1 - ic, z0: KOVA.z0 + PR, z1: KOVA.z1 });
  return out;
}

/**
 * Bölme duvarlarının katı gövdeleri. En az bir yanı açık her bölme çizilir; geçitleri (`kapilar`)
 * yalnız İKİ yanı da açıksa boşluk bırakır — kapalı salonun geçidi tahta perdeyle kapalıdır.
 */
export function kat2Duvarlar(acikAlan = KAT2_ACIK_ALAN): Solid[] {
  const out: Solid[] = [];
  for (const b of KAT2_BOLMELER) {
    const [a1, a2] = b.alanlar;
    const acik1 = a1 < acikAlan;
    const acik2 = a2 < acikAlan;
    if (!acik1 && !acik2) continue;
    const yatay = b.z1 === b.z2;
    const bas = yatay ? Math.min(b.x1, b.x2) : Math.min(b.z1, b.z2);
    const son = yatay ? Math.max(b.x1, b.x2) : Math.max(b.z1, b.z2);
    const kapilar = acik1 && acik2 ? [...b.kapilar].sort((p, q) => p[0] - q[0]) : [];
    let u = bas;
    const parca = (p: number, q: number) => {
      if (q - p <= 1e-9) return;
      const orta = (p + q) / 2;
      out.push(yatay ? { c: [orta, 0, b.z1], h: [(q - p) / 2, DUVAR_YARI] } : { c: [b.x1, 0, orta], h: [DUVAR_YARI, (q - p) / 2] });
    };
    for (const [p, q] of kapilar) {
      parca(u, p);
      u = Math.max(u, q);
    }
    parca(u, son);
  }
  return out;
}

/** Noktanın bulunduğu alan (0 merdiven salonu + bant · 1 okey salonu · 2 tavla köşesi). */
export function kat2AlanBul(x: number, z: number): number {
  if (z < 0) return 0;
  return x < 0 ? 1 : 2;
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
export function kat2Adim(
  x: number,
  z: number,
  dx: number,
  dz: number,
  acikAlan = KAT2_ACIK_ALAN,
  engeller: readonly Solid[] = [],
): [number, number] {
  const alan = kat2YurumeAlani(acikAlan);
  const duvar = kat2Duvarlar(acikAlan);
  const katilar = [KUYU, ...duvar, ...engeller];
  let [nx, nz] = dikKelepce(x + dx, z + dz, alan);
  const icinde = hitsSolid(x, z, katilar, PR);
  if (!icinde) {
    if (dx !== 0 && hitsSolid(nx, z, katilar, PR)) nx = x;
    if (dz !== 0 && hitsSolid(nx, nz, katilar, PR)) nz = z;
    [nx, nz] = dikKelepce(nx, nz, alan);
  }
  // Bölme duvarı her durumda katı: kelepçe ya da "içindeyse çık" kuralı onu delemez.
  if (hitsSolid(nx, nz, duvar, PR) && !hitsSolid(x, z, duvar, PR)) return [x, z];
  return [nx, nz];
}

/** Masanın katı gövdesi (masa + oturaklar) — türüne göre ayak izi. */
export function masaGovdesi(m: Kat2MasaYeri): Solid {
  return m.tur === 'tavla' ? { c: [m.x, 0, m.z], h: [TAVLA_YARI[0], TAVLA_YARI[1]] } : { c: [m.x, 0, m.z], h: [OKEY_YARI, OKEY_YARI] };
}

/**
 * Açık masaların (okey + tavla) ve salonun içindeki açık ocakların katı gövdesi. Pad'i bitmemiş
 * masa/ocak yok sayılır. Bandın ocağı (`OCAK`) yürüme alanının dışında durur, gövdesi gerekmez.
 */
export function kat2Engeller(padsDone: readonly string[]): Solid[] {
  const out = KAT2_MASALAR.filter((m) => padsDone.includes(m.id)).map(masaGovdesi);
  for (const o of OCAKLAR) if (o.govde && padsDone.includes(o.id)) out.push({ c: [o.x, 0, o.z], h: o.govde });
  return out;
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

// ============================== EŞYA YERLERİ (K2-3) ==============================

/**
 * Merdiven salonunun dört okey masası (maket B'nin `ARKA_OKEY`i: x = ±7,5 · ±13, z = −4,9). Açılış
 * sırası soldan içe: önce ocağa yakın olanlar. Yer geometri, sayı değil — fiyatlar `economy.config`.
 */
export const OKEY_YER: readonly { id: string; x: number; z: number }[] = [
  { id: 'k2okey1', x: -7.5, z: -4.9 },
  { id: 'k2okey2', x: -13, z: -4.9 },
  { id: 'k2okey3', x: 7.5, z: -4.9 },
  { id: 'k2okey4', x: 13, z: -4.9 },
];

/** Okey masasının ayak izi (masa + dört sandalye) yarısı — oyuncu içine yürümez. */
export const OKEY_YARI = 1.25;
/** Masaya kahve bırakma: ayak izinin kenarından pay (Kat 1'in `collectReach`iyle aynı dil). */
export const OKEY_ERISIM = OKEY_YARI + 0.7;
/** Kalkan grubun masa ücreti masanın salona bakan önüne düşer. */
export const PARA_DUSME_DZ = OKEY_YARI + 0.35;

/**
 * Tavla masası (D-181 yol A): küçük masa + iki yanında (±x) tabure → ayak izi [x, z] yarısı. Sv4'te
 * masa ×1,2 büyür; ayak izi o hâle göre (tabure ±0,94 + yarıçap). Kahve erişimi okeyle aynı pay.
 */
export const TAVLA_YARI: readonly [number, number] = [1.2, 0.6];
export const TAVLA_ERISIM: readonly [number, number] = [TAVLA_YARI[0] + 0.7, TAVLA_YARI[1] + 0.7];
/** Tavlada oturaklar yanlarda → yığın masanın +z önüne, ayak izinin kenarından aynı payla düşer. */
export const TAVLA_PARA_DZ = TAVLA_YARI[1] + 0.35;

/** Masa başına oturan kişi (D-181: okeyde 4, tavlada 2 — seviye ile değişmez). Görsel grup bunu okur. */
export const KAT2_KISI: Readonly<Record<MasaTuru, number>> = { okey: 4, tavla: 2 };

/** Masaya kahve bırakılabilir mi (oyuncu masanın erişim kutusunda mı)? */
export function masaErisimde(m: Kat2MasaYeri, x: number, z: number): boolean {
  const dx = Math.abs(x - m.x);
  const dz = Math.abs(z - m.z);
  if (m.tur === 'tavla') return dx <= TAVLA_ERISIM[0] && dz <= TAVLA_ERISIM[1];
  return Math.max(dx, dz) <= OKEY_ERISIM;
}

/** Kalkan grubun yığınının düştüğü yer (masanın +z önü, türüne göre pay). */
export function paraDusmeYeri(m: Kat2MasaYeri): [number, number] {
  return [m.x, m.z + (m.tur === 'tavla' ? TAVLA_PARA_DZ : PARA_DUSME_DZ)];
}

/**
 * Salon pad'lerinin yeri: merdiven salonu tarafında, açtığı salonun GENİŞ kemerli geçidinin önünde
 * (bölme z = 0; pad çerçevesinin yarı yüksekliği 0,85 + duvar payı). Pad bitince geçidin perdesi kalkar.
 */
export const KAT2_SALON_PAD_YER: Readonly<Record<string, [number, number]>> = Object.fromEntries(
  KAT2_SALON_PAD.map((id, i) => {
    const b = KAT2_BOLMELER.find((x) => x.alanlar[0] === 0 && x.alanlar[1] === i + 1)!;
    const [p, q] = [...b.kapilar].sort((u, v) => v[1] - v[0] - (u[1] - u[0]))[0];
    return [id, [(p + q) / 2, -1.6] as [number, number]];
  }),
);

/**
 * Cezve ocağı (D-181 cezve 7): bandın solunda, sırtı arka duvara değil SALONA bakar (maket
 * `CayOcagi` −7,4). Oyuncu salondan, ocağın önündeki noktadan kahve alır.
 */
export const OCAK = { id: 'k2cezve', x: -7.4, z: BAND.front - 0.55, al: [-7.4, BAND.front + 0.6] as [number, number], erisim: 0.9 } as const;

/**
 * Kat 2'nin BÜTÜN masa yerleri (maket B): merdiven salonu 4 okey (yukarıdaki `OKEY_YER`, sıra korunur)
 * · okey salonu 6 okey · tavla köşesi 12 tavla (2 kişilik, oturaklar ±x). Kimlik = pad kimliği.
 */
export const KAT2_MASALAR: readonly Kat2MasaYeri[] = [
  ...OKEY_YER.map((o) => ({ ...o, tur: 'okey' as const, alan: 0 })),
  ...[-12.5, -5].flatMap((x, i) => [4.5, 9.5, 14.5].map((z, j) => ({ id: `k2s2okey${i * 3 + j + 1}`, tur: 'okey' as const, alan: 1, x, z }))),
  ...[4, 8.5, 13].flatMap((x, i) => [3.8, 7.4, 11, 14.6].map((z, j) => ({ id: `k2tavla${i * 4 + j + 1}`, tur: 'tavla' as const, alan: 2, x, z }))),
];

// ============================== S2: ÇOK OCAK + KAT 2 GARSONU (D-186) ==============================

/** Bir cezve ocağı: gövde yeri, oyuncunun/garsonun kahve aldığı nokta (`al`) ve o noktanın payı. */
export interface Kat2Ocak {
  id: string;
  x: number;
  z: number;
  al: readonly [number, number];
  erisim: number;
  /** Yürüme alanının İÇİNDEKİ ocağın gövde yarısı [x, z] (bandın ocağında yok: alanın dışında). */
  govde?: readonly [number, number];
}

/** 2. ocağın gövde yarısı: tezgâh + cezve sırası, çizimin ayak izi (x [−6,3; −2,7] · z [0,09; 2,15]; sırtı bölmeye). */
const OCAK2_YARI: readonly [number, number] = [1.8, 1.03];
const OCAK2_Z = DUVAR_YARI + OCAK2_YARI[1];

/**
 * Kat 2'nin cezve ocakları, AÇILIŞ SIRASIYLA (D-186). `[0]` bandın ocağı (`OCAK`, aynı kimlik/yer).
 * `[1]` okey salonunda: bölmenin (z = 0) salon yüzünde, iki geçidin TAM ortasında (x −4,5; geçitler
 * [−10,5; −7,2] ve [−1,8; 0], gövde [−6,3; −2,7] → iki yana 0,9 pay). Neden burası: oyuncu geniş
 * geçitten salona girince ocak önündedir; okey salonunun sağ sütunu (x −5) önünde, sol sütunu 7 br
 * ötede — salonun altı masasının hepsine kısa yol. Bölme kameranın UZAK duvarı (ocak görünür) ve
 * tavla köşesine açılan geçide (x = 0, z 7,2-10,2) en yakın ocak budur: Kat 2 garsonu buradan alır.
 * Masa ayak izinden (z ≥ 3,25) gövde önü (2,15) 1,1 açık → oyuncu (çap 0,94) ocak ile masa arasından geçer.
 */
export const OCAKLAR: readonly Kat2Ocak[] = [
  OCAK,
  {
    id: 'k2cezve2',
    x: -4.5,
    z: OCAK2_Z,
    al: [-4.5, OCAK2_Z + OCAK2_YARI[1] + PR + 0.08],
    erisim: OCAK.erisim,
    govde: OCAK2_YARI,
  },
];

/**
 * Kat 2 garsonunun pad'i (D-186: tavla köşesi açılınca gelen ilk pad) ve garsonun EVİ (boştayken
 * döndüğü yer). Köşenin İÇİNDE, bölmenin dibinde, 1. tavla sütununun (x 4) önü: pad çerçevesi
 * (±0,89 × ±0,85) z [0,75; 2,45] — masanın ayak izine (z ≥ 3,2) ve geniş geçide (x ≥ 7,2) değmez.
 * Neden salon pad'inin yeri (8,85; −1,6) değil: zincirde `k2salon3`ün hemen ardından geliyor, aynı
 * yerde çıksaydı salonu yeni açan oyuncu durduğu yerde farkında olmadan garsonu doldurmaya başlardı.
 */
export const KAT2_GARSON_PAD = 'k2garson';
export const KAT2_GARSON_YER: readonly [number, number] = [4, 1.6];

// ---- YOL BULMA (Kat 2 garsonu + ölçüm botu). Kat 1'in `nav.ts` ızgarası, Kat 2'nin geometrisiyle:
// katılar = kuyu + bölmeler (geçitler yalnız iki yanı açıksa) + açık masa/ocak gövdeleri, oyuncu
// yarıçapıyla şişirilir; yürüme alanının dışı kapalı. Hedefe UZAKLIK ALANI (Dijkstra, çapraz √2,
// köşe kesmez) hedef başına bir kez kurulur ve önbellekte durur; aktör her adımda alanın eğimini
// izler, görüşü açık en uzak hücreye yönelir. Adımı yine `kat2Adim` atar (duvar her durumda katı).
// `findNavPath` kullanılmaz: onun önbelleği tek ızgaraya bağlı, Kat 1 personeli her karede kendi
// ızgarasıyla çağırdığı için iki kat dönüşümlü çağırınca önbellek her karede boşalırdı.

const YOL_HUCRE = 0.3;
/** Eğimin kaç hücre ilerisine kadar kestirme aranır. */
const KESTIRME = 12;
const SONSUZ = Number.POSITIVE_INFINITY;
const KOMSU: readonly (readonly [number, number, number])[] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/** Kat 2'nin bir açılış durumu için yol ağı (padsDone'dan türer, önbellekte). */
export interface Kat2YolAgi {
  acikAlan: number;
  engeller: Solid[];
  /** Hedefe giden yolda yönelinecek nokta (görüş açıksa hedefin kendisi). */
  nokta(x: number, z: number, tx: number, tz: number): [number, number];
  /** Hedefe yürüme uzunluğu (br; ulaşılamazsa sonsuz). */
  uzunluk(x: number, z: number, tx: number, tz: number): number;
}

function izgaraKur(acikAlan: number, engeller: readonly Solid[]): NavGrid {
  const alan = kat2YurumeAlani(acikAlan);
  const g = buildNavGrid({ minX: -H, maxX: H, minZ: KOVA.z0, maxZ: H }, YOL_HUCRE, [KUYU, ...kat2Duvarlar(acikAlan), ...engeller], PR);
  for (let r = 0; r < g.rows; r++) {
    const z = g.minZ + (r + 0.5) * g.cell;
    for (let c = 0; c < g.cols; c++) {
      const x = g.minX + (c + 0.5) * g.cell;
      const [cx, cz] = dikKelepce(x, z, alan);
      if (cx !== x || cz !== z) g.blocked[r * g.cols + c] = 1;
    }
  }
  return g;
}

function hucre(g: NavGrid, x: number, z: number): [number, number] {
  const c = Math.max(0, Math.min(g.cols - 1, Math.floor((x - g.minX) / g.cell)));
  const r = Math.max(0, Math.min(g.rows - 1, Math.floor((z - g.minZ) / g.cell)));
  return [c, r];
}

/** Noktaya en yakın UYGUN hücre (varsayılan: açık), halka halka; yoksa −1. */
function enYakin(g: NavGrid, x: number, z: number, uygun: (i: number) => boolean): number {
  const [c0, r0] = hucre(g, x, z);
  for (let k = 0; k <= 8; k++) {
    let en = -1;
    let enD = SONSUZ;
    for (let dr = -k; dr <= k; dr++)
      for (let dc = -k; dc <= k; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== k) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) continue;
        const i = r * g.cols + c;
        if (!uygun(i)) continue;
        const d = (g.minX + (c + 0.5) * g.cell - x) ** 2 + (g.minZ + (r + 0.5) * g.cell - z) ** 2;
        if (d < enD) {
          enD = d;
          en = i;
        }
      }
    if (en >= 0) return en;
  }
  return -1;
}

/** Çapraz adım köşe kesmesin: iki dik komşu da açık olmalı. */
function adimAcik(g: NavGrid, c: number, r: number, dc: number, dr: number): boolean {
  const nc = c + dc;
  const nr = r + dr;
  if (nc < 0 || nr < 0 || nc >= g.cols || nr >= g.rows || g.blocked[nr * g.cols + nc]) return false;
  return dc === 0 || dr === 0 || (!g.blocked[r * g.cols + nc] && !g.blocked[nr * g.cols + c]);
}

/** Hedef hücreden bütün açık hücrelere uzaklık (Dijkstra, ikili yığın; birim = hücre). */
function uzaklikAlani(g: NavGrid, hedef: number): Float64Array {
  const d = new Float64Array(g.cols * g.rows).fill(SONSUZ);
  if (hedef < 0) return d;
  const yi: number[] = [];
  const yp: number[] = [];
  const takas = (a: number, b: number) => {
    [yi[a], yi[b]] = [yi[b], yi[a]];
    [yp[a], yp[b]] = [yp[b], yp[a]];
  };
  const it = (i: number, p: number) => {
    let k = yi.length;
    yi.push(i);
    yp.push(p);
    while (k > 0) {
      const u = (k - 1) >> 1;
      if (yp[u] <= yp[k]) break;
      takas(u, k);
      k = u;
    }
  };
  d[hedef] = 0;
  it(hedef, 0);
  while (yi.length) {
    const i = yi[0];
    const p = yp[0];
    const si = yi.pop()!;
    const sp = yp.pop()!;
    if (yi.length) {
      yi[0] = si;
      yp[0] = sp;
      for (let k = 0; ; ) {
        const a = 2 * k + 1;
        let m = k;
        if (a < yi.length && yp[a] < yp[m]) m = a;
        if (a + 1 < yi.length && yp[a + 1] < yp[m]) m = a + 1;
        if (m === k) break;
        takas(m, k);
        k = m;
      }
    }
    if (p > d[i]) continue;
    const r = Math.floor(i / g.cols);
    const c = i - r * g.cols;
    for (const [dc, dr, w] of KOMSU) {
      if (!adimAcik(g, c, r, dc, dr)) continue;
      const j = (r + dr) * g.cols + c + dc;
      if (p + w < d[j]) {
        d[j] = p + w;
        it(j, p + w);
      }
    }
  }
  return d;
}

/** Izgarada düz görüş: iki uç arasındaki örnekler açık hücrede mi (uçların bir hücre çevresi sayılmaz). */
function gorusAcik(g: NavGrid, x0: number, z0: number, x1: number, z1: number): boolean {
  const L = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.ceil(L / (g.cell * 0.5));
  for (let k = 1; k < n; k++) {
    const x = x0 + ((x1 - x0) * k) / n;
    const z = z0 + ((z1 - z0) * k) / n;
    if (Math.hypot(x - x0, z - z0) < g.cell || Math.hypot(x - x1, z - z1) < g.cell) continue;
    const [c, r] = hucre(g, x, z);
    if (g.blocked[r * g.cols + c]) return false;
  }
  return true;
}

function yolAgiKur(padsDone: readonly string[]): Kat2YolAgi {
  const acikAlan = kat2AcikAlan(padsDone);
  const engeller = kat2Engeller(padsDone);
  const g = izgaraKur(acikAlan, engeller);
  const alanlar = new Map<string, Float64Array>();
  const alanOf = (tx: number, tz: number) => {
    const k = `${tx},${tz}`;
    let a = alanlar.get(k);
    if (!a) {
      a = uzaklikAlani(g, enYakin(g, tx, tz, (i) => !g.blocked[i]));
      if (alanlar.size >= 256) alanlar.clear();
      alanlar.set(k, a);
    }
    return a;
  };
  const merkez = (i: number): [number, number] => {
    const r = Math.floor(i / g.cols);
    return [g.minX + (i - r * g.cols + 0.5) * g.cell, g.minZ + (r + 0.5) * g.cell];
  };
  return {
    acikAlan,
    engeller,
    nokta(x, z, tx, tz) {
      if (gorusAcik(g, x, z, tx, tz)) return [tx, tz];
      const a = alanOf(tx, tz);
      let i = enYakin(g, x, z, (j) => a[j] < SONSUZ);
      if (i < 0) return [tx, tz];
      let sec = merkez(i);
      for (let adim = 0; adim < KESTIRME && a[i] > 0; adim++) {
        const r = Math.floor(i / g.cols);
        const c = i - r * g.cols;
        let j = -1;
        for (const [dc, dr] of KOMSU) {
          if (!adimAcik(g, c, r, dc, dr)) continue;
          const k = (r + dr) * g.cols + c + dc;
          if (a[k] < (j < 0 ? a[i] : a[j])) j = k;
        }
        if (j < 0) break;
        i = j;
        const m = merkez(i);
        if (adim > 0 && !gorusAcik(g, x, z, m[0], m[1])) break;
        sec = m;
      }
      return sec;
    },
    uzunluk(x, z, tx, tz) {
      const a = alanOf(tx, tz);
      const i = enYakin(g, x, z, (j) => a[j] < SONSUZ);
      return i < 0 ? SONSUZ : a[i] * g.cell;
    },
  };
}

const yolAglari = new Map<string, Kat2YolAgi>();
let sonYol: { padsDone: readonly string[]; ag: Kat2YolAgi } | null = null;
/** padsDone'un yol ağı (aynı dizi ya da aynı açılış kümesi → önbellekteki ağ). */
export function kat2YolAgi(padsDone: readonly string[]): Kat2YolAgi {
  if (sonYol && sonYol.padsDone === padsDone) return sonYol.ag;
  const k = [...padsDone].sort().join('|');
  let ag = yolAglari.get(k);
  if (!ag) {
    ag = yolAgiKur(padsDone);
    if (yolAglari.size >= 16) yolAglari.clear();
    yolAglari.set(k, ag);
  }
  sonYol = { padsDone, ag };
  return ag;
}
