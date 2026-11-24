/**
 * streetLook.ts — SOKAĞIN ÖLÇÜ VE ANKRAJ KATMANI (S6).
 *
 * `tableLook` (D-072) · `kitchenLook` (S3) · `wallLook` (S4) · `decorLook` (S5) ile aynı gerekçe:
 * `Scene.tsx` vitest'te import EDİLEMEZ (`recolor` → `Image`), yani `Street`in içine yazılmış
 * hiçbir koordinat bekçilenemiyordu. Sayı burada durur, çizim buradan okur, bekçi burayı okur.
 *
 * ÖLÇÜ NEREDEN GELDİ: `npx tsx tools/olcum-dis-cephe.ts` → `docs/olcum-dis-cephe.txt`,
 * rapor `docs/dis-cephe-raporu-s6.md`. Elle tahmin edilen sayı yok.
 *
 * ---------------------------------------------------------------------------------------------
 * TURUN ANA BULGUSU — **KARŞI BİNALAR EKRANA HİÇ GİRMİYOR** (rapor §V).
 *
 * Kamera oyuncunun **+z'sinde** durur (`pz + CAMERA_DIST`) ve **−z'ye** bakar. Oyuncunun z tavanı
 * `FLOOR_HALF` = 17, yani kameranın z tavanı **25,50**. Karşı binalar z = 26,5'te: her zaman
 * kameranın ARKASINDA. Üç kamera kipinde de (taban · uzaklaş ×1,35 · portre ×1,30) görünürlük
 * **%0** ölçüldü — binanın tepesi de dahil, çünkü kameranın üstüne çıkan nokta kadrajın
 * (ufkun altındaki 17°…67° kuşağının) dışında kalıyor.
 *
 * Sonucu iki tane:
 *  1. `building_A…H` KayKit'e GEÇMEDİ. 10.389 üçgen, %0 görünürlük — bedeli var, karşılığı yok.
 *  2. Bugünkü 9 renkli kutu da SİLİNDİ. Gölgeleri de kurtarmıyor: güneş (14, 26, 16) yönünde
 *     7 boyunda bir kütlenin gölgesi z ≈ 22,2'ye düşüyor, görünür şerit ise z ≤ 20,5.
 *
 * Ekrana giren tek şerit **z 17,5 … 20,5 arası kaldırım bandı** (%3–14). Bu turun bütün harcaması
 * oraya yapıldı. Yol karosu da girmedi: karo kendi kaldırım payını taşıyor (asfalt şeridi karonun
 * yalnız 1,24/2,00'si) → oyunun 2,40'lık gri kaldırımıyla yan yana "iki kaldırım" olurdu.
 * ---------------------------------------------------------------------------------------------
 */
import { PLAYER_RADIUS } from '../../config/actor';
import { DOOR } from './wallPanel';
import { KAPI_DIREK_H } from './wallOlcu';

/** city-builder-bits paketi → dünya çarpanı (rapor §A, A1 kolu).
 *
 *  ÖLÇEK NEDEN 3,64 — bu paketin karosu bir ODA değil bir SOKAK: 2,0'lık karo bir yol karosu,
 *  yani ~7 metre. Mutfağın/dekorun 0,90'ı burada **−%66 … −%81** sapıyor (kontrol kolu ölçüldü
 *  ve elendi). Sayı onbir modelin gerçek karşılığından türeyen ORTANCA; aile-başı çarpan kolu
 *  ölçüldü ama üç ailesinde tek model olduğu için sapması tautolojik olarak %0 çıkıyor, yani
 *  bilgi taşımıyor. Tek global çarpan paketin kendi iç oranlarını (bank : araba : bina) korur —
 *  ekranda okunan şey mutlak metre değil, nesnelerin BİRBİRİYLE oranıdır. */
export const CITY_S = 3.636;

export type StreetModel =
  | 'streetlight'
  | 'bench'
  | 'bush'
  | 'firehydrant'
  | 'car_taxi'
  | 'trash_A'
  | 'trash_B';

/**
 * HAM SINIR KUTULARI — `node tools/model-olc.mjs kaykit-city-builder-bits <ad>` çıktısı, BİREBİR.
 * `minX/maxX` de yazılı çünkü KayKit origin'i görsel merkezde olmak zorunda değil ve telafi
 * tahminle yazılmaz (S4 "sucuk" dersi). En çarpıcı örnek `streetlight`: gövde x = 0'da ama
 * KOLU −x'e uzanıyor (minX −0,239 · maxX 0,030), yani direk bbox'ın ortasında DEĞİL.
 */
export const CITY_NATIVE: Record<
  StreetModel,
  { w: number; h: number; d: number; minX: number; maxX: number; minZ: number; maxZ: number }
> = {
  streetlight: { w: 0.269, h: 0.96, d: 0.069, minX: -0.239, maxX: 0.03, minZ: -0.035, maxZ: 0.035 },
  bench: { w: 0.4, h: 0.1, d: 0.15, minX: -0.2, maxX: 0.2, minZ: -0.075, maxZ: 0.075 },
  bush: { w: 0.189, h: 0.381, d: 0.199, minX: -0.089, maxX: 0.1, minZ: -0.1, maxZ: 0.1 },
  firehydrant: { w: 0.135, h: 0.225, d: 0.131, minX: -0.068, maxX: 0.068, minZ: -0.065, maxZ: 0.066 },
  car_taxi: { w: 0.419, h: 0.434, d: 0.938, minX: -0.209, maxX: 0.209, minZ: -0.472, maxZ: 0.466 },
  trash_A: { w: 0.127, h: 0.052, d: 0.133, minX: -0.06, maxX: 0.067, minZ: -0.067, maxZ: 0.067 },
  trash_B: { w: 0.068, h: 0.04, d: 0.071, minX: -0.027, maxX: 0.042, minZ: -0.032, maxZ: 0.038 },
};

/** Bir modelin dünya ölçüsü (ölçek uygulanmış). */
export const cityBoyut = (m: StreetModel): { w: number; h: number; d: number } => {
  const n = CITY_NATIVE[m];
  return { w: n.w * CITY_S, h: n.h * CITY_S, d: n.d * CITY_S };
};

// ---------------------------------------------------------------------------------------------
//  ŞERİTLER — bugüne kadar `Scene.Street`in gövdesinde gömülüydü
// ---------------------------------------------------------------------------------------------

/** Ön duvar hattı — sokağın her şeyi buna göre konumlanır. `LAYOUT.area.maxZ + 0.5`. */
export const STREET_Z0 = 17.5;

/** Kaldırım + asfalt boyu: bahçe arsasının iki ucuna kadar (2026-11-24: x −14'te bitiyordu, sol ön köşede boşluk görünüyordu). */
const CADDE_BOY = 96;
/** Kaldırım şeridi: TÜM cephe boyu, ön duvardan dışa. */
export const KALDIRIM = { x: 0, z: STREET_Z0 + 1.2, w: CADDE_BOY, d: 2.4 } as const;

/**
 * Kaldırımın YOLA bakan kenarı. Asfalt buradan başlar — sayı ikinci kez yazılmaz.
 *
 * NEDEN AYRI SABİT (R4): kaldırım 19,90'da bitiyor, asfalt ise `d: 6` ile 20,00'de başlıyordu;
 * arada **0,10 br'lik bir dikiş** kalmıştı ve oradan arka plan görünüyordu. R4 ölçümü bunu
 * tesadüfen yakaladı: §E'de ön kenara düşen 80 ışının TAMAMI aynı taşmayı (2,37) veriyordu —
 * dağılımı olmayan bir "boşluk" bölge değil ÇİZGİ demektir, ve o çizgi dünya z'sinde 19,97'ye,
 * yani tam dikişin içine düşüyor. İki şeridin kenarı artık aynı sayıdan türüyor, dikiş
 * kapanınca da kapalı kalıyor (`feedback_single_source_of_truth`).
 */
export const KALDIRIM_ARKA = KALDIRIM.z + KALDIRIM.d / 2;

/** Asfalt cadde. Ortası (z 23,00) hiçbir kadrajda yok; ÖN KENARI kaldırımın arkasına YAPIŞIR. */
export const ASFALT = { x: 0, z: STREET_Z0 + 5.5, w: CADDE_BOY, d: (STREET_Z0 + 5.5 - KALDIRIM_ARKA) * 2 } as const;

/**
 * GÖRÜNÜR ŞERİDİN ARKA SINIRI — rapor §V. Kameranın z tavanı `FLOOR_HALF + CAMERA_DIST` = 25,50;
 * ama kadrajın düşey konisi yüzünden pratikte z ≈ 20,5'ten sonrası %0'a iniyor.
 * **Buradan ötesine model konmaz** — bekçi testi bunu denetler.
 */
export const GORUNUR_Z_SON = 21.5;

// ---------------------------------------------------------------------------------------------
//  KAPI ÖNÜ TENTESİ (F1 — kullanıcı kararı 2026-09-10)
// ---------------------------------------------------------------------------------------------
/**
 * MAKET v13'ün tentesi, BİREBİR: `box(6.4, 0.18, 1.9, 0x2e6b4f)` @ `(dx, DH − 0.08, 17.9)`,
 * `rotation.x = 0.18`.
 *
 * **Bedeli ölçüldü ve kullanıcı bilerek kabul etti** (rapor §F): kapı eşiği kameradan
 * **17/22 konumda (%77) görünmez** oluyor; bugünkü dikey tabela %0'dı. Alternatif arandı ve
 * BULUNAMADI — yükseklik × derinlik düzlemi tarandı, hiçbir hücre %0'a inmiyor, çünkü tente
 * giriş yolunun tam üstünde YATAY bir levha ve kamera 45° yukarıdan bakıyor.
 *
 * MAKETİN KENDİ NOTU DOĞRULANDI: *"tente lentonun ALTINDAN çıkar, alınlıktaki tabela kapanmasın."*
 * İlk bakışta sayılar bunu yalanlıyor gibi — arka kenar 2,74, lento 2,65. Ama tentenin arkası
 * duvarın İÇİNDE (z 16,95 < ön duvar 17,50); duvar YÜZÜNDE (z = 17,50) tentenin yüksekliği
 * 2,57 + (17,90 − 17,50) × sin(0,18) = **2,64 ≈ lento 2,65**. Yani maketin sayıları tam oturuyor,
 * düzeltme gerekmiyor. (`rotX` pozitif → +z ucu AŞAĞI iner, −z ucu yukarı kalır.)
 */
export const TENTE = {
  w: 6.4,
  h: 0.18,
  d: 1.9,
  y: DOOR.height - 0.08,
  z: 17.9,
  rotX: 0.18,
} as const;

/** Tentenin duvar YÜZÜNDEKİ yüksekliği — maketin "lentonun altından çıkar" kuralının sağlaması. */
export const tenteYuzY = (): number => TENTE.y + (TENTE.z - STREET_Z0) * Math.sin(TENTE.rotX);

/** Tentenin ön (sokağa bakan) kenarının yüksekliği — altından 1,75'lik biri geçebilmeli. */
export const tenteOnY = (): number => TENTE.y - (TENTE.d / 2) * Math.sin(TENTE.rotX);

// ---------------------------------------------------------------------------------------------
//  KAPI KEMERİ TABELASI (S5 · G-114 sonrası — kullanıcı kararı: "iki koyu direğin ARASINA asılı")
// ---------------------------------------------------------------------------------------------
/**
 * Ön duvar 1,0'a inince (G-114 B) alınlık gitti; kafe adı (D-156) kapının iki DİREĞİNİN arasına asıldı.
 * Direk başlıklarından (üst yüzü `KAPI_DIREK_H + 0,1` = 1,40) iki ince demir dikme çıkar, tepede yatay kiriş
 * (`KEMER`) onları bağlar, levha kirişten iki kısa askıyla sarkar. Levhanın ALT kenarı insan boyunun
 * (1,75) üstünde: müşteri ve oyuncu altından geçer, kirişe/levhaya gömülmez. Levha kameraya doğru hafif
 * eğik (`egim`, üst kenar geriye) — 45° yukarıdan bakan kamerada yazı daha az basılır.
 * Kemer duvar hattında (z = `STREET_Z0`, direklerle aynı); x kapı ekseni (`Scene.Street` `e[0]`).
 */
export const KEMER = {
  /** Dikmelerin başladığı yükseklik = direk başlığının üst yüzü (`Scene.Walls`: başlık KAPI_DIREK_H + 0,05, 0,1 kalın). */
  y0: KAPI_DIREK_H + 0.1,
  /** Kirişin merkez yüksekliği ve kesiti. */
  y: 2.55,
  kalin: 0.1,
  /** Dikme kesiti (kare). Dikmeler direklerin ekseninde: x = ±DOOR.half. */
  dikme: 0.08,
  /** Kirişin direk eksenlerinden taşan payı (her uçta). */
  tasma: 0.15,
  z: STREET_Z0,
} as const;

/** Kemerden sarkan ad levhası. y = merkez; askı boyu = kiriş altı − levha üstü. */
export const TABELA = {
  w: 3.4,
  h: 0.46,
  d: 0.06,
  y: 2.18,
  z: STREET_Z0,
  /** Eğim (rad): üst kenar geriye (−z), yüz kameraya döner. */
  egim: 0.22,
} as const;

/** Eğimli levhanın en alt noktası — altından geçen insanın başı buna değmemeli. */
export const tabelaAltY = (): number => TABELA.y - (TABELA.h / 2) * Math.cos(TABELA.egim);
/** Eğimli levhanın en üst noktası — kirişin altında kalmalı (askı boyu > 0). */
export const tabelaUstY = (): number => TABELA.y + (TABELA.h / 2) * Math.cos(TABELA.egim);
/** Aday dokusunun yazı oranları (tarayıcıda `measureText` ile ölçüldü, rapor B6):
 *  büyük harf = 0,427 × levha boyu · yazı levha eninin en fazla %78,7'sini doldurur. */
export const TABELA_YAZI = { harfBoy: 0.427, doluluk: 0.787, font: '700 {px}px Georgia, "Noto Serif", serif' } as const;

/**
 * Tuvalde yazının font boyu (px): büyük harf levha boyunun `harfBoy`u olsun, ama yazı eninin
 * `doluluk`unu aşmasın — uzun adda harf küçülür, taşmaz. `harf100`/`en100`: 100 px fontta
 * ölçülen büyük harf yüksekliği ve yazı eni (tarayıcı `measureText`i verir).
 */
export function tabelaFontPx(harf100: number, en100: number, tuvalEn: number, tuvalBoy: number): number {
  const boydan = (TABELA_YAZI.harfBoy * tuvalBoy * 100) / Math.max(1e-6, harf100);
  const enden = (TABELA_YAZI.doluluk * tuvalEn * 100) / Math.max(1e-6, en100);
  return Math.min(boydan, enden);
}

// ---------------------------------------------------------------------------------------------
//  KALDIRIM MOBİLYASI
// ---------------------------------------------------------------------------------------------

/**
 * Bir sokak parçası. `x` iki türlü okunur:
 *  - `'kapi'`  → kapı x'ine GÖRE (kapı 2. Alan'da −8,5'ten 0'a kayar, parça da kayar)
 *  - `'kat'`   → mutlak dünya x'i (kata sabitlenmiş, kapıdan bağımsız)
 * Bu ayrım şart: kapının iki yanındaki eşyalar kapıyla gitmeli, sokağın geneli gitmemeli.
 */
export interface StreetProp {
  model: StreetModel;
  ref: 'kapi' | 'kat';
  x: number;
  z: number;
  /** y ekseni dönüşü (radyan). */
  rot?: number;
}

/**
 * MÜŞTERİ KORİDORU — `streetAt` (kaldırım) → `entranceAt` (kapı eşiği) arası düz hat.
 * Sokak mobilyası salt görsel (collision yok) ama bu koridora GİREMEZ: girerse NPC'ler
 * eşyanın içinden yürür ve "kapıdan girdi" anı bozulur. Yarım genişlik iki NPC yan yana geçsin
 * diye çift yarıçap.
 */
export const KORIDOR_YARIM = PLAYER_RADIUS * 2;
export const KORIDOR_Z = { min: 16.6, max: 20.5 } as const;

/**
 * KALDIRIM PROGRAMI. Yerleşim kuralı üç maddeydi ve üçü de ölçüden geliyor:
 *  1. Hiçbiri müşteri koridoruna girmez (bekçi testi).
 *  2. Hiçbiri `GORUNUR_Z_SON`un ötesine konmaz — orada çizilen şey ekrana girmiyor.
 *  3. Kapının iki yanındaki elle çizilen bahçe masaları (kapı ∓2,30) ve saksılar (kapı ∓1,70)
 *     duruyor; yeni parçalar onların DIŞINDAN başlar.
 */
export const STREET_PROPS: readonly StreetProp[] = [
  // Sokak lambaları — kaldırımın dış kenarında, kolu yola (+z) dönük.
  // Kolun −x'e uzandığı ölçüldü → +z'ye bakması için rot = +π/2.
  { model: 'streetlight', ref: 'kat', x: -16.0, z: 19.55, rot: Math.PI / 2 },
  { model: 'streetlight', ref: 'kat', x: 7.5, z: 19.55, rot: Math.PI / 2 },
  { model: 'streetlight', ref: 'kat', x: 19.5, z: 19.55, rot: Math.PI / 2 },
  // Banklar — uzun ekseni x'te (model 0,40 × 0,15 ham), kaldırıma paralel, cepheye dönük.
  { model: 'bench', ref: 'kapi', x: -5.4, z: 18.9 },
  { model: 'bench', ref: 'kapi', x: 5.4, z: 18.9 },
  // Çalılar — duvar dibi yeşili; bahçe masalarının dışında.
  { model: 'bush', ref: 'kapi', x: -3.6, z: 18.05 },
  { model: 'bush', ref: 'kapi', x: 3.6, z: 18.05 },
  { model: 'bush', ref: 'kat', x: 12.0, z: 18.05 },
  { model: 'bush', ref: 'kat', x: -13.0, z: 18.05 },
  // Yangın musluğu — sokağın "gerçek şehir" işareti, kaldırım kenarında.
  { model: 'firehydrant', ref: 'kat', x: -7.0, z: 19.5 },
  // Yer çöpü (S5'te kova OLMADIĞI ölçülmüştü; sokakta doğru okunuyor — 18 üçgen).
  { model: 'trash_A', ref: 'kat', x: 8.6, z: 19.2 },
  { model: 'trash_B', ref: 'kat', x: -12.2, z: 19.0 },
  // Taksi — asfaltın GÖRÜNÜR ön şeridinde. Uzun ekseni z'de (0,938 ham) → yola paralel için π/2.
  { model: 'car_taxi', ref: 'kat', x: 14.0, z: 21.0, rot: Math.PI / 2 },
];

/** Parçanın dünya x'i (kapı konumuna göre çözülür). */
export const propX = (p: StreetProp, dx: number): number => (p.ref === 'kapi' ? dx + p.x : p.x);

/**
 * Parçanın dünya sınır kutusu.
 *
 * **KUTU ORİJİN ETRAFINDA SİMETRİK DEĞİL** — ilk sürüm öyle varsayıyordu (`x ± w/2`) ve bu YANLIŞTI:
 * `streetlight`in gövdesi x = 0'da ama kolu −x'e uzanıyor (minX −0,239 · maxX 0,030). Simetrik
 * kabul edilirse direk 0,49 br yanlış yere düşer ve komşusuyla çakışması görünmez olur. Bekçi
 * testi asimetriyi zaten söylüyordu ama kutu onu KULLANMIYORDU — S4'ün "sucuk" dersinin aynısı.
 *
 * Dönüş yalnız π/2 katlarında: `rot = +π/2` yerel (x, z)'yi dünyaya (z, −x) olarak taşır.
 */
export function propKutu(
  p: StreetProp,
  dx: number,
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const n = CITY_NATIVE[p.model];
  const x = propX(p, dx);
  const r = ((p.rot ?? 0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const c = Math.round(Math.cos(r));
  const si = Math.round(Math.sin(r));
  const kose: [number, number][] = [];
  for (const lx of [n.minX, n.maxX])
    for (const lz of [n.minZ, n.maxZ]) kose.push([lx * c + lz * si, -lx * si + lz * c]);
  const xs = kose.map((k) => k[0] * CITY_S);
  const zs = kose.map((k) => k[1] * CITY_S);
  return {
    minX: x + Math.min(...xs),
    maxX: x + Math.max(...xs),
    minZ: p.z + Math.min(...zs),
    maxZ: p.z + Math.max(...zs),
  };
}

/** İki parçanın dünya kutuları kesişiyor mu? (parça-parça çakışma bekçisi) */
export function propCakisiyor(a: StreetProp, b: StreetProp, dx: number): boolean {
  const ka = propKutu(a, dx);
  const kb = propKutu(b, dx);
  return ka.maxX > kb.minX && ka.minX < kb.maxX && ka.maxZ > kb.minZ && ka.minZ < kb.maxZ;
}

/** Parça müşteri koridorunu kesiyor mu? (kapı x'i verilir; iki kapı konumu da ayrı denetlenir) */
export const koridoruKesiyor = (p: StreetProp, dx: number): boolean => {
  const k = propKutu(p, dx);
  return (
    k.maxX > dx - KORIDOR_YARIM &&
    k.minX < dx + KORIDOR_YARIM &&
    k.maxZ > KORIDOR_Z.min &&
    k.minZ < KORIDOR_Z.max
  );
};
