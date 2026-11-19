/**
 * markerFrame.ts — ZEMİN İŞARETİNİN ÇERÇEVESİ: tek doğru kaynağı (S24 · D-121).
 *
 * NEDEN AYRI MODÜL. S24 ölçümü şunu buldu: oyuncunun bir yükseltme noktasını doldurması
 * DAİRE testine bağlıydı (`dist2D(player, spot) < TABLE_UP_RADIUS | PAD_RADIUS`), ama ekranda
 * daire çizilmiyordu — çizilen şey köşe parantezli bir DİKDÖRTGEN'di. İki geometri birbirinden
 * türemiyordu ve ölçülen sonuç: **tetikleyen alanın %50,4'ü çerçevenin dışında** kalıyordu
 * (kullanıcının *"yanında falan değil, çerçeve içinde olayım"* cümlesi bu). Üstelik geometri
 * iki değil ÜÇTÜ: işaretin "üstündesin" kabarması da kendi dairesini kuruyordu (`hw × 1,35`),
 * onun da %34,3'ü çerçeve dışındaydı.
 *
 * S23'ten farkı önemli: orada ölçü YANLIŞ yazılmıştı (gizli bir √3 çarpanı). Burada ölçü doğru
 * yazılıyor — çizilen çerçeve yazanla birebir aynı (sapma 0,0000 br, 13 işaretin 13'ünde).
 * Kusur sayıda değil, **aynı şeyin iki ayrı yerde ayrı ayrı tanımlanmasında**. O yüzden çözüm
 * de sayı düzeltmek değil: çerçeve artık BURADA bir kez hesaplanır, hem çizim (`GroundMarker`)
 * hem tetik (`tick.ts`) hem de kabarma aynı fonksiyondan okur. Üçü bir daha ayrışamaz.
 *
 * Bu modülde oyun DURUMU tutulmaz; hepsi saf fonksiyon veya sabittir (`rules.ts` deseni) ve
 * three/react'e DOKUNMAZ — tick ve testler onu düğüm ağacı olmadan çağırabilsin diye.
 *
 * Sayılar: `docs/tetik-raporu-s24.md` · ham `docs/olcum-tetik-s24.txt`.
 */
import type { Vec3 } from './types';
import { t } from '../i18n';

/**
 * ÇERÇEVENİN GENİŞLİĞİ YAZIDAN ÇÖZÜLÜR, TAHMİN EDİLMEZ.
 *
 * İlk hâlde çerçeve `radius`tan türüyordu ve yazı ortalanıyordu; küçük işaretlerde (masa/Usta,
 * r = 0,6) "YÜKSELT" ile solundaki ok üst üste biniyordu (kullanıcı 2026-09-09). Artık genişlik
 * `ok bloğu + boşluk + yazının gerçek genişliği` olarak kuruluyor. Baloo 2 Bold'da ortalama
 * harf ilerlemesi ≈ 0,58 em; kısa büyük-harf etiketlerde yeterli yaklaşım — ve çizimdeki
 * `maxWidth` üst sınırı ayrıca kilitliyor, yani hata payı taşmaya değil sarmaya gider.
 */
export const HARF_EM = 0.58;
export const ETIKET_PUNTO = 0.38;
/**
 * OKUN AYRILAN BLOĞU — ve **çizilen okun eni bu sayıdan TÜRER** (S23 · D-120).
 *
 * S23 ölçümü kusurun yerini bulmuştu: blok 0,340 r yazılıyken çizilen uç 0,554 r idi, çünkü uç
 * `circleGeometry(r·0,32, 3)` idi ve 3 kenarlı çemberin KENARI yarıçapın √3 katıdır. Yapısal
 * kapatma: okun eni ayrı bir sayı değil, `OK_GENIS`in kendisi.
 */
export const OK_GENIS = 0.4;
export const OK_BOSLUK = 0.16;
export const KENAR_PAYI = 0.18;

/** İşaret yarıçapları (çerçevenin YARI-YÜKSEKLİĞİ; genişlik yazıdan çözülür). */
export const ISARET_R = 0.85;
/** Masa ve Usta noktaları küçüktür — orta koridor boş kalsın (D-018 §1). */
export const MASA_ISARET_R = 0.6;

/** İşaretin zemindeki dikdörtgeni: yarı-genişlik × yarı-yükseklik (dünya birimi). */
export interface Cerceve {
  hw: number;
  hh: number;
}

/**
 * Çizilen çerçeve. `GroundMarker` bu kutuyu çizer, `tick.ts` bu kutuyu test eder.
 *
 * DİKKAT — bu fonksiyonun çıktısı bir GÖRSEL ölçü değil, artık bir OYUN KURALI: değiştirirsen
 * hem işaretin boyu hem de oyuncunun nerede durunca dolum başlattığı birlikte değişir. Kasıtlı:
 * ayrışmalarını engellemenin tek yolu tek kaynak olmalarıydı.
 */
export function markerFrame(label: string, radius: number, arrow: boolean): Cerceve {
  const punto = radius * ETIKET_PUNTO;
  const yaziGen = label.length * HARF_EM * punto;
  const okBlok = arrow ? (OK_GENIS + OK_BOSLUK) * radius : 0;
  return {
    hw: Math.max(radius * 1.05, (okBlok + yaziGen) / 2 + KENAR_PAYI * radius),
    hh: radius,
  };
}

/**
 * Oyuncu çerçevenin İÇİNDE mi? (Eksene hizalı kutu testi — işaretler döndürülmüyor.)
 *
 * `pay` yalnız görsel kabarma gibi "biraz daha geniş" isteyen çağıranlar içindir; TETİK payı
 * KULLANMAZ — tetik tam olarak çizilen dikdörtgendir, ölçümün "dışarı %0,0 · ölü %0,0" satırı
 * bu yüzden doğrudur.
 */
export function inFrame(px: number, pz: number, spot: Vec3, c: Cerceve, pay = 0): boolean {
  return Math.abs(px - spot[0]) <= c.hw + pay && Math.abs(pz - spot[2]) <= c.hh + pay;
}

// --- ETİKETLER: hem çizim hem tetik aynı metni okumalı, yoksa çerçeve genişliği ayrışır.
// (Etiket uzunluğu `hw`ye giriyor: "Yükselt" ile "Sv 12" aynı kutuyu vermez. C3 (T9d): yazım cümle
// düzenine indi — harf SAYISI aynı kaldığı için çerçeve ve tetik birebir aynı.)

/** G-11: her yükseltme noktası AYNI sözü söyler; hangi obje olduğunu metin değil KONUM anlatır. */
export const ETIKET_SERVIS = t('Yükselt');
export const ETIKET_LAVABO = t('Lavaboyu Büyüt');
/** G-18: masa noktasının yazısı seviyeyi taşır (çoklu sinyalin sayı kanalı). */
export const masaEtiketi = (seviye: number): string => t('Sv {1}', seviye + 1);

export const servisCercevesi = (): Cerceve => markerFrame(ETIKET_SERVIS, ISARET_R, true);
export const masaCercevesi = (seviye: number): Cerceve => markerFrame(masaEtiketi(seviye), MASA_ISARET_R, true);
export const padCercevesi = (label: string): Cerceve => markerFrame(label, ISARET_R, false);
export const lavaboCercevesi = (): Cerceve => markerFrame(ETIKET_LAVABO, ISARET_R, false);
/** K4: Usta noktası masa noktasının biçimiyle aynı (G-14 ②) — tetik de aynı dikdörtgen. */
export const ETIKET_USTA = t('Yükselt');
export const ustaCercevesi = (): Cerceve => markerFrame(ETIKET_USTA, MASA_ISARET_R, true);

/**
 * G-105 (S5): DOLUM ÇERÇEVEYİ TAM İZLER. Eskiden dolum, iç zeminin %90'ı kadar DÜZ bir dikdörtgendi:
 * kenarlıkla arasında boşluk kalıyor, yuvarlak köşede dolum köşeli görünüyordu (oyun testi 2026-11-20).
 * Artık kenarlığın iç çevresi BURADA bir kez kurulur; hem kenarlığın deliği hem dolum aynı noktalardan
 * çizilir, dolum o çevrenin `y ≤ üst` kesitidir. Köşeler gerçek çeyrek daire. Yalnız çizim: tetik kutusu
 * yine `markerFrame`.
 */
export type Nokta = readonly [number, number];

/** Yuvarlak köşeli dikdörtgenin çevresi (merkez 0,0; saat yönü tersine; köşe başına `seg` dilim). */
export function yuvarlakDikdortgen(w: number, h: number, r: number, seg = 8): Nokta[] {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.max(1e-4, Math.min(r, hw, hh));
  const koseler: [number, number, number][] = [
    [hw - rr, -hh + rr, -Math.PI / 2],
    [hw - rr, hh - rr, 0],
    [-hw + rr, hh - rr, Math.PI / 2],
    [-hw + rr, -hh + rr, Math.PI],
  ];
  const out: Nokta[] = [];
  for (const [cx, cy, a0] of koseler)
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  return out;
}

/** Çevrenin alttan `p` (0..1) kadarı: `y ≤ alt + p·boy` yarı-düzlemiyle kesit (dışbükey çokgen → dışbükey). */
export function dolumKesiti(cevre: readonly Nokta[], p: number): Nokta[] {
  if (p <= 0 || cevre.length < 3) return [];
  let alt = Infinity;
  let ust = -Infinity;
  for (const [, y] of cevre) {
    alt = Math.min(alt, y);
    ust = Math.max(ust, y);
  }
  if (p >= 1) return cevre.slice();
  const sinir = alt + (ust - alt) * p;
  const out: Nokta[] = [];
  for (let i = 0; i < cevre.length; i++) {
    const a = cevre[i];
    const b = cevre[(i + 1) % cevre.length];
    const aIc = a[1] <= sinir;
    const bIc = b[1] <= sinir;
    if (aIc) out.push(a);
    if (aIc !== bIc) {
      const t = (sinir - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, sinir]);
    }
  }
  return out;
}
