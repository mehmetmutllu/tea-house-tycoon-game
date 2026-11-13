/**
 * olcum-lib.ts — ölçüm araçlarının ORTAK İSKELETİ (D-084 P2).
 *
 * NEDEN: `tick-fingerprint.ts` · `olcum-kuyruk.ts` · `olcum-bardak.ts` üçünde de tohumlu
 * `Math.random` ve sahte `localStorage` blokları BİREBİR aynıydı (md5 eşit), `kur()` iki satır
 * farklıydı. Her yeni ölçüm turu iskeleti yeniden yazıyor, iskeletin TUZAKLARINI da yeniden
 * keşfediyordu (C3'ün zaman aşımı tuzağı C4'te tekrar çıktı). Ölçülen bedel: C4'ün 168
 * dakikasının ~%35'i araç yazımı + aracın kendi hatalarını ayıklamak.
 *
 * İKİ İŞİ VAR:
 *   1) ORTAK PARÇALAR — tohum, sahte depo, biçimleyiciler, yüzdelik/korelasyon.
 *   2) DAMGALAR — "bu satır gerçekten ölçüm mü?" sorusunun makine cevabı. Damga stderr'e yazar
 *      ve süreç çıkış kodunu düşürür; STDOUT'A DOKUNMAZ (rapor çıktısı `>` ile dosyaya gider,
 *      damgalar terminalde kalır, `docs/olcum-*.txt` diff'i temiz olur).
 *
 * KOŞU KİPİ (D-084): `OLCUM=tam` verilmedikçe KISA koşulur.
 *   kisa (varsayılan) : geliştirme kipi — az senaryo, kısa süre, hedef < 60 sn. Rapora GİRMEZ;
 *                       çıktının başına bunu söyleyen bir bant basılır.
 *   tam               : yayınlanabilir sayı. Taban ve final koşusu bununla alınır:
 *                       `OLCUM=tam npx tsx tools/olcum-bardak.ts > docs/olcum-bardak.txt`
 * Gerekçe: C4'te tam koşu 8 dk 02 sn sürüyordu ve 7 kez koştu (oturumun %33'ü). Yön arayan
 * koşuların o parayı ödemesi gerekmiyor; sayı üretenlerin ödemesi gerekiyor.
 */

// --- Sahte depo: node'da localStorage yok → kayıt yazma/okuma bellekte. Import anında kurulur
// (store/save modülleri localStorage'a yalnız fonksiyon içinde dokunuyor, import sırasında değil).
export function sahteDepo(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (g.localStorage) return;
  const mem: Record<string, string> = {};
  g.localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
}
sahteDepo();

/** Tohumlu rastgelelik (mulberry32) — ölçüm tekrarlanabilir olsun. Üç araçta da AYNI diziyi üretir. */
export function seedRandom(seed: number): void {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Biçimleyiciler / istatistik (araçlarda birebir aynıydı).
export const d2 = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);
export const pct = (a: number, b: number) => (b === 0 ? '—' : `%${((100 * a) / b).toFixed(1)}`);
export const ort = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export function yuzdelik(xs: number[], p: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return NaN;
  const mx = ort(x);
  const my = ort(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    sxy += a * b; sxx += a * a; syy += b * b;
  }
  return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
}

// ---------------------------------------------------------------------------
// KOŞU KİPİ
// ---------------------------------------------------------------------------
export type OlcumKipi = 'kisa' | 'tam';
export const KIP: OlcumKipi = process.env.OLCUM === 'tam' ? 'tam' : 'kisa';
export const KISA = KIP === 'kisa';

/** Kısa koşuda listeyi ilk `n` öğeye indirger. */
export const kisalt = <T>(liste: T[], n: number): T[] => (KISA ? liste.slice(0, n) : liste);
/** Kısa koşuda süreyi/sayıyı düşürür. */
export const kisaDeger = <T>(tamDeger: T, kisaDeger: T): T => (KISA ? kisaDeger : tamDeger);

/**
 * Kısa koşuda çıktının başına "bu ölçüm DEĞİL" bandı basar (stdout — yanlışlıkla dosyaya
 * yazılan kısa koşu, dosyanın ilk satırından belli olsun). Tam koşuda hiçbir şey basmaz →
 * `docs/olcum-*.txt` çıktısı birebir korunur.
 */
export function kipBandi(): void {
  if (!KISA) return;
  console.log('#'.repeat(78));
  console.log('# KISA KOŞU (OLCUM=kisa) — YÖN GÖSTERİR, ÖLÇÜM DEĞİLDİR. Rapora sayı GİRMEZ.');
  console.log('# Yayınlanabilir sayı için: OLCUM=tam npx tsx tools/<araç>.ts > docs/<çıktı>.txt');
  console.log('#'.repeat(78));
}

// ---------------------------------------------------------------------------
// DAMGALAR — "bu satır gerçekten ölçüm mü?"
// ---------------------------------------------------------------------------
const kirikDamgalar: string[] = [];

/** Damga stderr'e yazar; stdout'a (rapor çıktısına) DOKUNMAZ. Kırık damga çıkış kodunu düşürür. */
export function damga(ad: string, gecti: boolean, mesaj = ''): boolean {
  if (gecti) return true;
  kirikDamgalar.push(`${ad}${mesaj ? ` — ${mesaj}` : ''}`);
  console.error(`!! DAMGA KIRILDI · ${ad}${mesaj ? ` — ${mesaj}` : ''}`);
  return false;
}

/**
 * BOT YÜRÜDÜ MÜ? (C4 tuzağı ①: bot sokakta başlatılmıştı, `clampToOpenAreas` yüzünden hiç içeri
 * giremedi; sonuçlar park kipiyle BİREBİR aynı çıktı ve "oyuncunun faydası yok" diye okunabilirdi.)
 */
export function botDamgasi(ad: string, yol: number, dakika: number, esik = 30): boolean {
  const hiz = dakika > 0 ? yol / dakika : 0;
  return damga(`bot yürüdü (${ad})`, hiz >= esik, `${hiz.toFixed(1)} br/dk < ${esik}`);
}

/**
 * KORUNUM — kapalı sistemde (bardak gibi) toplam sabit kalmalı. Sapma varsa ölçüm değil KOD hatası.
 */
/**
 * TAKILMA — bot yürümek isteyip yerinden kıpırdamadığı EN UZUN kesintisiz süre. "bot yürüdü" toplam yola
 * bakar: 5 dk yürüyüp 15 dk duvara iten bot onu geçer (S2 garson ölçümü: iki kol ₺/dk 0).
 */
export function takilmaDamgasi(ad: string, enUzunSn: number, esikSn = 10): boolean {
  return damga(`bot takılmadı (${ad})`, enUzunSn < esikSn, `${enUzunSn.toFixed(1)} sn kesintisiz itti`);
}

export function korunumDamgasi(ad: string, sapma: number): boolean {
  return damga(`korunum (${ad})`, sapma === 0, `${sapma} birim sapma`);
}

/**
 * VARYANT ETKİLİ Mİ? (C4 tuzağı ②: bulaşıkçı varyantında config geri alma `kur()`'dan hemen
 * sonraydı, `world` her karede yeniden türetildiği için varyant SESSİZCE etkisiz kaldı ve sahte
 * bir "fark yok" üretti.) Varyantlı koşunun parmak izi kontrol koşusununkiyle aynıysa, varyant
 * dünyaya hiç dokunmamıştır — o satır bir ölçüm değil, kontrolün kopyasıdır.
 */
export function varyantDamgasi(ad: string, kontrolIzi: string, varyantIzi: string): boolean {
  return damga(`varyant etkili (${ad})`, kontrolIzi !== varyantIzi, `parmak izi kontrolle aynı (${varyantIzi})`);
}

/** Koşu boyunca ucuz, sıralı parmak izi (FNV-1a). Varyant damgası bunu karşılaştırır. */
export function izOlustur() {
  let h = 0x811c9dc5;
  return {
    ekle(...ns: number[]): void {
      for (const n of ns) {
        h ^= (Math.round(n * 1000) | 0) >>> 0;
        h = Math.imul(h, 0x01000193);
      }
    },
    get deger(): string {
      return (h >>> 0).toString(16).padStart(8, '0');
    },
  };
}

/** Koşuların sonunda çağrılır: özet stderr'e, kırık damga varsa çıkış kodu 1. */
export function damgaOzeti(): void {
  if (kirikDamgalar.length === 0) {
    console.error(`\n✓ Damgalar temiz (${KIP} koşu).`);
    return;
  }
  console.error(`\n!! ${kirikDamgalar.length} DAMGA KIRILDI — bu koşu ölçüm DEĞİL:`);
  for (const k of kirikDamgalar) console.error(`   · ${k}`);
  process.exitCode = 1;
}
