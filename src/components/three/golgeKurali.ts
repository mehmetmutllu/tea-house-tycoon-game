/**
 * golgeKurali.ts — HANGİ NESNE GÖLGE DÖKER (S4 · tarama 3-performans #1a).
 *
 * NEDEN: gölge geçişi karenin %35-45'i ve Kat 2 tam dolu iken gölge çağrısı ana geçişten fazla
 * (222 vs 163). Gölge KAPATILMIYOR (D-073); yalnız gözün seçemeyeceği gölgeler düşer: fincan,
 * cezve, pul, ıstaka, bardak, tabak, korkuluk dikmesi, pirinç şerit… Bunların gölgesi 2048'lik
 * haritada (±30 → ~1,5 teksel/cm) birkaç teksellik leke ya da kıl çizgisidir; çağrı başına
 * maliyetleri ise masa üstüyle aynı. Masa, insan, duvar, büyük mobilya gölge vermeye DEVAM eder.
 *
 * KURAL BOYUTA BAKAR, ADA DEĞİL: yeni bir küçük prop eklendiğinde listeye yazılmayı unutsa bile
 * `Kutu`/`Silindir` üzerinden doğru karar verilir. İki ölçüt —
 *   · KÜÇÜK: en uzun kenar < 0,35 → avuç içi nesne (fincan, cezve, pul, zar, tabak).
 *   · İNCE : ikinci kenar < 0,075 → çubuk/şerit (korkuluk dikmesi Ø0,07, ıstaka, pirinç şerit, tabla
 *     kenarı). Masa ayağı (0,08) bilerek eşiğin ÜSTÜNDE: "masalar gölge verir".
 * Boyutlar nesnenin YEREL ölçüsü (ebeveyn ölçeği hariç) — ölçekli props (Fincan s=1,5) yine küçük.
 */
export const GOLGE_KUCUK_MAX = 0.35;
export const GOLGE_INCE_MAX = 0.075;

/** Kenar uzunlukları (sıra önemsiz) → gölge döker mi. */
export function golgeVerir(a: number, b: number, c: number): boolean {
  const [uzun, orta] = [a, b, c].sort((x, y) => y - x);
  if (uzun < GOLGE_KUCUK_MAX) return false;
  if (orta < GOLGE_INCE_MAX) return false;
  return true;
}

/** Silindir (üst/alt yarıçap + yükseklik) için aynı kural. */
export function silindirGolgeVerir(r1: number, r2: number, h: number): boolean {
  const cap = 2 * Math.max(r1, r2);
  return golgeVerir(cap, cap, h);
}
