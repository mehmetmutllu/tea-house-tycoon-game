/**
 * kat2/esyaOlcu.ts — Kat 2 eşyalarının SAF yerleşim ölçüleri (three/react yok: bekçi testi düğüm ağacı olmadan
 * okur — `tests/esya-s5.test.ts`). Çizim `Mutfak.tsx` · `Bulasik.tsx` · `Esya.tsx`'te; sayılar yalnız burada.
 */

// ---- G-126: hazır kahve tepsileri (set yereli; set `SET_OLCEK` ile büyür) ----

/** Set büyütmesi — tezgâh üstündeki tek "kahve buradan" işareti; uzak kadrajdan da okunmalı (G2 "nereden alacağım belli değil"). */
export const SET_OLCEK = 1.5;
/**
 * G-126 (oyun testi 2026-11-20): ocak yükseldikçe kuyruk 9'a çıkıyor; fincanlar mangalın önünde tek sıra dizilince
 * tepsiden taşıyordu. Artık mangalın SOLUNDA ve SAĞINDA birer tepsi, fincanlar ikişerli (ön/arka) sütunlar hâlinde
 * mangala en yakın sütundan dışa doğru, iki yana sırayla dizilir. Sağ tepsi 2 sütun: 2. ocağın sağında leğenin
 * ibriği var. Yalnız görsel yer — alma noktası (`OCAKLAR.al`) aynı.
 */
const MANGAL_SOL = 0.25 - 0.5; // mangalın en geniş hâlinin (w 1,0, merkez x 0,25) iki kenarı
const MANGAL_SAG = 0.25 + 0.5;
export const FINCAN = { adim: 0.2, s: 1.3, onZ: 0.12, arkaZ: -0.09, bosluk: 0.04 } as const;
/** Yan tepsilerin sütun kapasitesi (sütun = 2 fincan): sol 3 + sağ 2 = 10 ≥ kuyruk tavanı (4 + 5 alım). */
export const TEPSI_SUTUN = { sol: 3, sag: 2 } as const;
export const TEPSI_KENAR = 0.04;

/** Bir yan tepsinin x aralığı (set yereli): mangal kenarından `bosluk` sonra başlar. */
export function tepsiAraligi(yan: -1 | 1): [number, number] {
  const sutun = yan < 0 ? TEPSI_SUTUN.sol : TEPSI_SUTUN.sag;
  const ic = yan < 0 ? MANGAL_SOL - FINCAN.bosluk : MANGAL_SAG + FINCAN.bosluk;
  const dis = ic + yan * (sutun * FINCAN.adim + 2 * TEPSI_KENAR);
  return yan < 0 ? [dis, ic] : [ic, dis];
}

/** `hazir` fincanın set-yerel [x, z] yerleri: sol/sağ sırayla; her yanda ikişerli sütun, mangaldan dışa. */
export function fincanYerleri(hazir: number): [number, number][] {
  return Array.from({ length: Math.max(0, hazir) }, (_, i) => {
    const yan = i % 2 === 0 ? -1 : 1;
    const j = Math.floor(i / 2);
    const sutun = Math.floor(j / 2);
    const [x0, x1] = tepsiAraligi(yan);
    const ic = yan < 0 ? x1 : x0;
    return [ic + yan * (TEPSI_KENAR + (sutun + 0.5) * FINCAN.adim), j % 2 === 0 ? FINCAN.onZ : FINCAN.arkaZ];
  });
}

// ---- G-127: yıkama leğeni (leğen yereli, `LEGEN_S` ölçeğinden önce) ----

/**
 * G-127 (oyun testi 2026-11-20: "ortadaki tepsiye konan bardaklar tepsinin içine göçüyor"): leğen gövdesi kapalı
 * silindir — üstü y+0,16'da DOLU bir kapak; su (0,14) onun altında görünmüyor, fincanlar (0,10-0,13) kapağın içine
 * gömülüyordu. Su artık kenar halkasının içinde görünür, fincanlar su yüzüne (tabağı altta) oturur.
 */
export const LEGEN_AGIZ = 0.16;
export const LEGEN_SU = LEGEN_AGIZ + 0.004;
/** Suyun yarı kalınlığı (0,01 disk) — tabağın altı su yüzüne değer. */
export const LEGEN_FINCAN = LEGEN_SU + 0.005;

// ---- G-130: tavla haneleri (tahta yereli) ----

/**
 * TAVLA HANELERİ (G-130, oyun testi 2026-11-20: "tavla masalarının içi boyalı değil"). 24 ÜÇGEN hane: her yarının
 * iki uzun kenarından ortaya bakan 6'şar ok; iki yarıyı koyu çubuk (menteşe) ayırır. Her seviyede boyalı:
 *  · Sv1 sade kutu → ahşap tonlarında iki renk (boyalı ama sade)
 *  · Sv2+ kakma → kırmızı / koyu kahve (klasik); Sv4 cilası masa üstünde (D-195), tahtaya dokunmaz.
 */
export interface HaneDuzen {
  /** Hanelerin tabanının oturduğu kenar (±x). */
  kenar: number;
  /** Yarının (|z|) iç ve dış sınırı: haneler bu aralığa eşit dizilir. */
  z0: number;
  z1: number;
  /** Okun boyu (kenardan ortaya) ve taban eninin hane aralığına oranı. */
  boy: number;
  taban: number;
  y: number;
  renk: readonly [string, string];
}
export const HANE_SADE: HaneDuzen = { kenar: 0.2, z0: 0.02, z1: 0.29, boy: 0.15, taban: 0.86, y: 0.0545, renk: ['#b8743a', '#5d3a24'] };
export const HANE_KAKMA: HaneDuzen = { kenar: 0.27, z0: 0.02, z1: 0.36, boy: 0.21, taban: 0.86, y: 0.0345, renk: ['#9b2c22', '#3a2a20'] };

export interface Hane {
  x: number;
  z: number;
  /** +1: ok +x'e bakar (sol kenardan), −1: −x'e. */
  yon: 1 | -1;
  renk: string;
  taban: number;
}

/** 24 hanenin yeri; komşu ve karşılıklı haneler zıt renk (gerçek tavla). */
export function haneYerleri(d: HaneDuzen): Hane[] {
  const adim = (d.z1 - d.z0) / 6;
  const out: Hane[] = [];
  for (const yari of [-1, 1])
    for (const kenar of [-1, 1])
      for (let n = 0; n < 6; n++)
        out.push({
          x: kenar * d.kenar,
          z: yari * (d.z0 + (n + 0.5) * adim),
          yon: kenar < 0 ? 1 : -1,
          renk: d.renk[(n + (kenar > 0 ? 1 : 0)) % 2],
          taban: adim * d.taban,
        });
  return out;
}
