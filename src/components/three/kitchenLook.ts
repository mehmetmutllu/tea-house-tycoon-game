/**
 * kitchenLook.ts — SERVİS KÖŞESİNİN (mutfak) ÖLÇÜ VE ANKRAJ KATMANI (S3).
 *
 * NEDEN AYRI DOSYA: `Scene.tsx` vitest'te import EDİLEMEZ (`recolor` → `Image`), yani orada
 * yazılı hiçbir sayı bekçilenemez. `tableLook.ts` aynı sorunu masalar için çözmüştü (D-072
 * katman 1); mutfak da aynı deseni izler — sayı burada durur, çizim hattı buradan okur.
 *
 * ÖLÇÜ NEREDEN GELDİ: `node tools/model-olc.mjs kaykit-restaurant-bits <ad>` — modelin kendi
 * gltf accessor'larından. Elle tahmin edilen tek sayı yok.
 *
 * PAKET ÖLÇEĞİ (0,90): KayKit restaurant-bits, furniture-bits ile AYNI ham ölçekte yazılmış
 * (`chair_A` iki pakette de 0,75 geniş) — yani projenin zaten dondurduğu `STOOL_S = 0,90`
 * burada da geçerli. Sağlaması insan boyuyla yapıldı (`feedback_reference_scale_trap`):
 * karakter 1,75 · tezgâh üstü 0,90 = boyun **%51**'i (gerçekte 0,90/1,75 = %51) · masa üstü
 * 0,795 = %45. Yani tezgâh masadan gözle görülür yüksek, gerçek oranında.
 *
 * NEDEN 0,80 DEĞİL: KayKit'in duvarı native 4,0, oyununki `WALL_H` 3,2 → mimari ölçek 0,80
 * çıkıyor. O ölçekte tezgâh üstü 0,80'e, yani masa üstüyle (0,795) AYNI hizaya düşerdi.
 * Mobilya insana göre ölçeklenir, duvar odaya göre; ikisi tek sayıya zorlanmadı. Duvara asılan
 * üniteler bu farkı ÜST HİZADAN kapatır: `WALL_UNIT_Y` aşağıda türetiliyor.
 */
import { PLAYER_RADIUS } from '../../config/actor';
import { BAND, BAND_SHELL, WAITER_STATION, servicePlace, waiterStationOpen } from '../../game/layout';
import type { Goz } from './atlasUV';
import { WALL_H } from './wallPanel';

/** KayKit ham ölçek → dünya. `tableLook.STOOL_S` ile aynı sayı, aynı gerekçe. */
export const KITCHEN_S = 0.9;

export type KitchenKey =
  | 'fridge_A'
  // Sırtlıksız gövdeler yalnız ÖN HATTA kullanılır: o tezgâhlar duvara değil salona bakar.
  | 'kitchencounter_straight_A'
  | 'kitchencounter_straight_B'
  | 'kitchencounter_sink'
  | 'kitchencounter_straight_A_backsplash'
  | 'kitchencounter_straight_B_backsplash'
  | 'kitchencounter_sink_backsplash'
  | 'stove_multi'
  | 'oven'
  | 'extractorhood'
  | 'kitchencabinet'
  | 'dishrack_plates'
  | 'crate'
  | 'crate_potatoes'
  | 'crate_lid'
  // S4 (kullanıcı 2026-09-09): "bulaşık için altı boş metalimsi duran lavabo var, onu dene" +
  // "duvar aksesuarları var orada, peçetelik/havluluk" + mutfağı paketle güzelleştir.
  | 'kitchentable_sink_large'
  | 'kitchentable_sink_large_decorated'
  | 'shelf_papertowel_decorated'
  | 'towelrail'
  | 'papertowel'
  | 'dishrack'
  | 'jar_A_medium'
  | 'jar_B_small'
  | 'jar_C_large'
  | 'pot_A'
  | 'pan_A'
  | 'cuttingboard'
  | 'knife'
  | 'food_ingredient_ham'
  | 'waterRack'
  // S22 (D-119) — KADEME ZİNCİRLERİNİN alt/üst üyeleri. Oda artık servis noktasının
  // seviyesiyle büyüyor; bu gövdeler yalnız o merdivende çiziliyor (`KADEME_ZINCIR`).
  | 'stove_single'
  | 'kitchencabinet_half'
  | 'shelf_papertowel'
  // ADA — odanın ortasındaki hazırlık masası, geç basamaklarda doğup yerinde büyür.
  | 'kitchentable_A'
  | 'kitchentable_A_large'
  | 'kitchentable_A_large_decorated';

/**
 * MODELLERİN HAM SINIR KUTUSU — `tools/model-olc.mjs` çıktısı, birebir.
 *
 * `waterRack` KayKit DEĞİL: damacana rafının paket karşılığı yok (KayKit Türk kıraathanesi
 * eşyası içermiyor), elle çizilen `MaketWaterRack` yerinde kalıyor. Ölçüsü yine de buraya
 * yazıldı — çakışma bekçisi odanın TAMAMINI görsün diye, yarısını değil.
 */
export const NATIVE: Record<KitchenKey, { w: number; h: number; minY: number; minZ: number; maxZ: number }> = {
  fridge_A: { w: 2.0, h: 2.5, minY: 0, minZ: -1.0, maxZ: 1.24 },
  kitchencounter_straight_A: { w: 2.0, h: 1.0, minY: 0, minZ: -1.0, maxZ: 1.042 },
  kitchencounter_straight_B: { w: 2.0, h: 1.0, minY: 0, minZ: -1.0, maxZ: 1.042 },
  kitchencounter_sink: { w: 2.0, h: 1.802, minY: 0, minZ: -1.0, maxZ: 1.042 },
  kitchencounter_straight_A_backsplash: { w: 2.0, h: 1.2, minY: 0, minZ: -1.0, maxZ: 1.042 },
  kitchencounter_straight_B_backsplash: { w: 2.0, h: 1.2, minY: 0, minZ: -1.0, maxZ: 1.042 },
  kitchencounter_sink_backsplash: { w: 2.0, h: 1.802, minY: 0, minZ: -1.0, maxZ: 1.042 },
  stove_multi: { w: 2.0, h: 1.2, minY: 0, minZ: -1.03, maxZ: 1.258 },
  oven: { w: 2.0, h: 2.02, minY: 0, minZ: -1.03, maxZ: 1.318 },
  // Duvara asılanlar y 2→4 arasında yazılmış, SIRTI z = 0'da (duvara yaslanır).
  extractorhood: { w: 2.0, h: 2.0, minY: 2.0, minZ: 0, maxZ: 1.609 },
  kitchencabinet: { w: 2.0, h: 2.0, minY: 2.0, minZ: 0, maxZ: 1.042 },
  dishrack_plates: { w: 1.2, h: 1.095, minY: 0, minZ: -0.6, maxZ: 0.6 },
  crate: { w: 2.0, h: 0.8, minY: 0, minZ: -1.0, maxZ: 1.0 },
  crate_potatoes: { w: 2.0, h: 0.966, minY: 0, minZ: -1.0, maxZ: 1.0 },
  crate_lid: { w: 2.0, h: 0.2, minY: 0, minZ: -1.0, maxZ: 1.0 },
  // S4 — hepsi `node tools/model-olc.mjs kaykit-restaurant-bits <ad>` çıktısı, birebir.
  // BULAŞIK ÇİFTİ (kullanıcı 2026-09-09: *"kenarında bulaşık dizmek için olan, kendinden
  // bulaşıklı ve bulaşıksız hâli olan"*). Paket bu ikisini KARDEŞ olarak veriyor: aynı gövde,
  // aynı ayak izi, tek farkı üstündeki bulaşık yığını (1,802 → 1,947 = 0,145'lik istif).
  // Yani boş↔dolu geçişi bir yer değiştirme değil, tek modelin değişmesi.
  kitchentable_sink_large: { w: 3.0, h: 1.802, minY: 0, minZ: -1.0, maxZ: 1.0 },
  kitchentable_sink_large_decorated: { w: 3.0, h: 1.947, minY: 0, minZ: -1.0, maxZ: 1.0 },
  // Duvara asılanlar: origin ASKI noktasında, gövde AŞAĞI sarkıyor (minY negatif).
  shelf_papertowel_decorated: { w: 2.0, h: 1.71, minY: -0.91, minZ: 0, maxZ: 0.626 },
  // Havluluk z'de KAYIK yazılmış (sırtı 0'da değil 0,8'de) — duvara yaslamak için telafi gerek.
  towelrail: { w: 1.6, h: 0.583, minY: 0.281, minZ: 0.8, maxZ: 1.263 },
  papertowel: { w: 0.5, h: 0.914, minY: 0, minZ: -0.25, maxZ: 0.25 },
  dishrack: { w: 1.2, h: 0.6, minY: 0, minZ: -0.6, maxZ: 0.6 },
  jar_A_medium: { w: 0.5, h: 0.65, minY: 0, minZ: -0.25, maxZ: 0.25 },
  jar_B_small: { w: 0.566, h: 0.55, minY: 0, minZ: -0.283, maxZ: 0.283 },
  jar_C_large: { w: 0.5, h: 0.75, minY: 0, minZ: -0.25, maxZ: 0.25 },
  pot_A: { w: 1.4, h: 0.5, minY: 0, minZ: -0.5, maxZ: 0.5 },
  pan_A: { w: 1.0, h: 0.25, minY: 0, minZ: -0.5, maxZ: 1.0 },
  cuttingboard: { w: 1.5, h: 0.15, minY: 0, minZ: -0.5, maxZ: 0.5 },
  // Bıçak origin'i sapın altında (minY negatif) — tahtaya saplı dursun diye ankraj y = 0.
  knife: { w: 0.25, h: 1.15, minY: -0.211, minZ: -0.05, maxZ: 0.05 },
  // Sucuk: origin ORTADA (minY −0,415) — kasanın içine koyarken taban değil merkez hizalanır.
  food_ingredient_ham: { w: 1.391, h: 0.83, minY: -0.415, minZ: -0.415, maxZ: 0.415 },
  // S22 (D-119) — kademe zincirlerinin öbür üyeleri. Hepsi `node tools/model-olc.mjs
  // kaykit-restaurant-bits <ad>` çıktısı, birebir; tek bir sayı elle yazılmadı.
  //
  // DİKKAT — ZİNCİRE GİRMEYEN İKİ MODEL: `stove_single_countertop` ve `stove_multi_countertop`
  // adları ocağın kademesi gibi okunuyor ama gövde değil, tezgâha gömülen OCAK GÖZÜ
  // (yükseklik 0,278 · tabanı y = 0,930). Zincire alınsaydı ocak kaybolup havada bir plaka
  // kalırdı. Ölçüm aracı bunları türetilmiş bir "parça süzgeci" ile eliyor
  // (`tools/olcum-mutfak-kademe.ts` §S); burada da yoklar.
  stove_single: { w: 2.0, h: 1.208, minY: 0, minZ: -1.03, maxZ: 1.258 },
  // Yarım dolap: native 3→4 arası, yani tepesi TAM dolapla aynı hizada (ikisi de 4,0'da biter).
  // Üst hiza korunur, dolap aşağı doğru büyür — `asiliY` bunu türetiyor.
  kitchencabinet_half: { w: 2.0, h: 1.0, minY: 3.0, minZ: 0, maxZ: 1.042 },
  shelf_papertowel: { w: 2.0, h: 1.06, minY: -0.91, minZ: 0, maxZ: 0.6 },
  // ADA ZİNCİRİ — üçü de z'de −1,0…+1,0 (derinlik 2,00); `ADA_Z` bu sayıdan türüyor.
  kitchentable_A: { w: 2.0, h: 1.004, minY: -0.004, minZ: -1.0, maxZ: 1.0 },
  kitchentable_A_large: { w: 3.0, h: 1.004, minY: -0.004, minZ: -1.0, maxZ: 1.0 },
  kitchentable_A_large_decorated: { w: 3.0, h: 1.928, minY: -0.004, minZ: -1.0, maxZ: 1.0 },
  // MaketWaterRack (elle çizili): 1,3 en × 1,5 yükseklik × 0,5 derinlik, origin ortada.
  // Ham sayı olarak yazılır ki `unitBox` ölçeği herkese aynı uygulasın.
  waterRack: {
    w: 1.3 / KITCHEN_S,
    h: 1.5 / KITCHEN_S,
    minY: 0,
    minZ: -0.25 / KITCHEN_S,
    maxZ: 0.25 / KITCHEN_S,
  },
};

/** Bir modülün dünya eni — ızgara adımı buradan türer (elle 1,8 yazılmaz). */
export const MODULE_W = NATIVE.kitchencounter_straight_A_backsplash.w * KITCHEN_S;

/** Tezgâhın ÇALIŞMA yüzeyi: sırtlıksız gövde native 1,0 → dünyada 0,90. */
export const COUNTER_TOP_Y = 1.0 * KITCHEN_S;

/**
 * DUVAR ÜNİTELERİNİN düşey kayması. Ünite native 2→4 arasında yazılı (dünyada 3,6 boyunda);
 * ankraj ÜST HİZADIR: ünitenin tepesi duvarın tepesine (`WALL_H`) oturur, altı nereye düşerse
 * oraya düşer. Böylece paketin 4 birimlik oda yüksekliği oyunun 3,2'sine, ünitenin kendi oranı
 * bozulmadan uyar. Sonuç: alt yüz 1,40 → tezgâhla arası 0,50 (gerçek mutfakta ~0,55).
 */
export const WALL_UNIT_Y = WALL_H - (NATIVE.kitchencabinet.minY + NATIVE.kitchencabinet.h) * KITCHEN_S;

/** Duvar ünitesinin dünyadaki ALT yüzü — "tezgâhın üstünde mi" bekçisi bunu okur. */
export const WALL_UNIT_BOTTOM_Y = WALL_UNIT_Y + NATIVE.kitchencabinet.minY * KITCHEN_S;

// ---- ODANIN SINIRLARI (hepsi türetilir; hiçbiri elle yazılmaz) ----
/** Arka duvarın İÇ yüzü — hattın sırtını dayadığı çizgi. */
export const BACK_Z = BAND_SHELL.innerBack;
/** Sol duvarın iç yüzü. */
export const LEFT_X = BAND_SHELL.innerLeft;
/** Doğu sınırı: merdiven kovasının ara duvarı. */
export const RIGHT_X = BAND.service.maxX;
/**
 * ÖN sınır: OYUNUN işleyen servis tezgâhının ARKA yüzü. Mutfak dekoru buradan öne geçemez —
 * geçerse çaycının hattına ve tezgâhın collision kutusuna girer.
 */
export const FRONT_Z = servicePlace(3).station[2] - servicePlace(3).half[1];

export type Kat = 'zemin' | 'tezgah' | 'duvar';

export interface KitchenUnit {
  key: KitchenKey;
  /** Modülün dünya merkezi. */
  x: number;
  z: number;
  /** Çeyrek dönüş sayısı (0 = ön yüz +z'ye bakar, 1 = +x, 2 = −z, 3 = −x). */
  ceyrek: 0 | 1 | 2 | 3;
  kat: Kat;
  /** Düşey kayma (duvar üniteleri ve tezgâh üstü eşyalar için). */
  y?: number;
  /**
   * Ünitenin KENDİ ölçeği. Varsayılan `KITCHEN_S`. Kasa gibi KÜÇÜK objeler paketin 2×2'lik
   * modül ölçeğinde absürt büyüyor (0,90'da 1,80 br = palet sandığı); onlar gerçek boyuna
   * çekilir. Kullanıcı 2026-09-09: *"kasa olduğu için daha küçük yapabilirsin"*.
   */
  olcek?: number;
}

/** Sırtı arka duvara dayanan modülün z merkezi — modelin KENDİ minZ'sinden türer. */
const arkaZ = (key: KitchenKey): number => BACK_Z - NATIVE[key].minZ * KITCHEN_S;

/** k. modülün x merkezi: sol duvardan başlar, modül eniyle ilerler. */
export const modulX = (k: number): number => LEFT_X + MODULE_W / 2 + k * MODULE_W;

/** Tezgâh sırasındaki modüllerin çalışma yüzeyi (dishrack gibi üstüne konanlar buraya oturur). */
const TEZGAH_Z = arkaZ('kitchencounter_straight_B_backsplash');

/** Batı duvarına dönen modülün x merkezi — sırtı sol duvarda, `arkaZ` ile aynı türetme. */
const BATI_X = LEFT_X - NATIVE.kitchencounter_straight_B_backsplash.minZ * KITCHEN_S;

/** Depo kasalarının z hattı: soğutucunun ön yüzünün 0,4 önünde, hattı kesmez. */
const DEPO_Z = -13.9;

/**
 * KASA ÖLÇEĞİ. KayKit'in kasası da 2×2'lik modül karosunda yazılı; `KITCHEN_S` ile 1,80 br
 * enine çıkıyordu ve arkasındaki fırının önünü kapatıyordu (kullanıcı 2026-09-09).
 * Gerçek bir meyve/erzak kasası ~0,60 × 0,35. Seçilen 0,45 → **0,90 × 0,36**: hem gerçek
 * kasa oranı, hem iki kasa yan yana tam BİR modül eni (1,80) — hat ritmi bozulmuyor.
 * 1,82 boyundaki fırının önünü artık 0,36'lık bir kutu kapatamaz.
 */
const KASA_S = 0.45;

/**
 * Peçetelik rafının askı yüksekliği. `WALL_UNIT_Y` ile AYNI türetme: ünitenin tepesi duvarın
 * tepesine oturur, altı nereye düşerse oraya düşer. Elle 0,55 yazılmıştı ve bekçi yakaladı —
 * raf duvarın tepesini 0,17 aşıyordu. Asılı ünitelerin hepsi tek bir ÜST HİZADA okunmalı.
 */
const RAF_Y = WALL_H - (NATIVE.shelf_papertowel_decorated.minY + NATIVE.shelf_papertowel_decorated.h) * KITCHEN_S;
/**
 * Havluluğun askı yüksekliği — tezgâh üstü ile asılı ünitelerin ALT yüzü arasındaki boşluğun
 * ortası. Üst hizaya BİLEREK oturmuyor: havluluk bir dolap değil, gerçek bir mutfakta da
 * tezgâhın hemen üstünde durur.
 */
const HAVLU_Y = COUNTER_TOP_Y + 0.5 - NATIVE.towelrail.minY * KITCHEN_S;
/**
 * Havluluğun z'si — batı duvarında, ÖN SINIRIN 0,1 gerisinde biter. Elle −11,4 yazılmıştı ve
 * bekçi yakaladı: havluluk 1,44 br geniş, ön sınırı 0,12 aşıp çay ocağının kutusuna giriyordu.
 */
const HAVLU_Z = FRONT_Z - 0.1 - (NATIVE.towelrail.w / 2) * KITCHEN_S;
/** Havluluk z'de KAYIK yazılmış (sırtı 0'da değil 0,8'de); duvara yaslamak için telafi. */
const NATIVE_TOWEL_Z = 0.8 * KITCHEN_S;

/**
 * MUTFAĞIN YERLEŞİMİ — arka duvarda 7 modüllük tek hat, doğu ucunda depo.
 *
 * Hat okunabilir bir iş sırası anlatır (maket v13'ün kurgusu): soğutucu → hazırlık → ocak →
 * bardak/tezgâh → hazırlık → bulaşık → fırın. Depo en doğuda, merdiven kovasının dibinde.
 * Duvar dolapları hattın İKİ ucuna değil, ÇALIŞMA modüllerinin üstüne asılır; çay bardağı
 * rafları (elle çizili `MaketWallShelf`) ortadaki iki modülün üstünde kalır — o yüzden
 * 3. ve 4. modülün üstü boştur.
 */
export const KITCHEN_UNITS: readonly KitchenUnit[] = [
  { key: 'fridge_A', x: modulX(0), z: arkaZ('fridge_A'), ceyrek: 0, kat: 'zemin' },

  { key: 'kitchencounter_straight_A_backsplash', x: modulX(1), z: arkaZ('kitchencounter_straight_A_backsplash'), ceyrek: 0, kat: 'zemin' },
  { key: 'kitchencabinet', x: modulX(1), z: BACK_Z, ceyrek: 0, kat: 'duvar', y: WALL_UNIT_Y },

  { key: 'stove_multi', x: modulX(2), z: arkaZ('stove_multi'), ceyrek: 0, kat: 'zemin' },
  { key: 'extractorhood', x: modulX(2), z: BACK_Z, ceyrek: 0, kat: 'duvar', y: WALL_UNIT_Y },

  { key: 'kitchencounter_straight_B_backsplash', x: modulX(3), z: TEZGAH_Z, ceyrek: 0, kat: 'zemin' },
  { key: 'dishrack_plates', x: modulX(3), z: TEZGAH_Z + 0.3, ceyrek: 0, kat: 'tezgah', y: COUNTER_TOP_Y },

  { key: 'kitchencounter_straight_A_backsplash', x: modulX(4), z: arkaZ('kitchencounter_straight_A_backsplash'), ceyrek: 0, kat: 'zemin' },

  { key: 'kitchencounter_sink_backsplash', x: modulX(5), z: arkaZ('kitchencounter_sink_backsplash'), ceyrek: 0, kat: 'zemin' },
  { key: 'kitchencabinet', x: modulX(5), z: BACK_Z, ceyrek: 0, kat: 'duvar', y: WALL_UNIT_Y },

  { key: 'oven', x: modulX(6), z: arkaZ('oven'), ceyrek: 0, kat: 'zemin' },

  // BATI DUVARI — hat köşeyi döner (L mutfak). Soğutucunun önündeki boş yüzeyi kapatır ve
  // üstündeki çay bardağı rafına bir dayanak verir; rafın altı boş kalmasın diye.
  { key: 'kitchencounter_straight_B_backsplash', x: BATI_X, z: -14.0, ceyrek: 1, kat: 'zemin' },

  // DEPO — fırının önünde, merdiven kovasının dibinde. İki kasa yan yana, ikisi de İSTİFLİ:
  // açık kasanın üstünde kapak, dolu kasanın üstünde ikinci kasa (depo "kullanılıyor" okunsun).
  { key: 'crate', x: modulX(6) - 0.45, z: DEPO_Z, ceyrek: 0, kat: 'zemin', olcek: KASA_S },
  { key: 'crate_lid', x: modulX(6) - 0.45, z: DEPO_Z, ceyrek: 0, kat: 'tezgah', y: NATIVE.crate.h * KASA_S, olcek: KASA_S },
  { key: 'crate_potatoes', x: modulX(6) + 0.45, z: DEPO_Z, ceyrek: 0, kat: 'zemin', olcek: KASA_S },
  { key: 'crate', x: modulX(6) + 0.45, z: DEPO_Z, ceyrek: 1, kat: 'tezgah', y: NATIVE.crate_potatoes.h * KASA_S, olcek: KASA_S },

  // DEPO — üstteki AÇIK kasanın içine sucuk (kullanıcı 2026-09-09: *"kasaların üstte boş olanın
  // içine assetteki sucuk gibi olan şeyi koy"*). Kasa `ceyrek: 1` döndüğü için sucuk da onunla
  // aynı dönüşü alır; y kasanın iç tabanı + sucuğun yarı boyu (origin ortada).
  {
    key: 'food_ingredient_ham',
    // Modelin origin'i x'te ORTALI DEĞİL (minX −0,496 · maxX 0,895 → görsel merkez 0,1995 sağda);
    // kasanın ortasına oturması için o kadar sola itilir. Dönüş YOK: `ceyrek: 1` verilince
    // telafi ekseni de dönüyor ve sucuk kasanın kenarından taşıyordu (ilk deneme).
    x: modulX(6) + 0.45 - 0.1995 * KASA_S,
    z: DEPO_Z,
    ceyrek: 0,
    kat: 'tezgah',
    // Üstteki AÇIK kasanın İÇ tabanı + sucuğun yarı boyu (origin dikeyde ortalı, minY −0,415).
    y: (NATIVE.crate_potatoes.h + 0.12) * KASA_S + -NATIVE.food_ingredient_ham.minY * KASA_S,
    olcek: KASA_S,
  },

  // ---- S4 DUVAR AKSESUARLARI — BATI DUVARINDA ----
  // Kullanıcı 2026-09-09: peçetelik ilk denemede arka duvarda buzdolabının önüne düşmüş ve
  // içine girmiş gibi görünüyordu; ayrıca soldaki (batı) çay bardağı rafının kalkması istendi.
  // İkisinin cevabı aynı: aksesuarlar BATI duvarına geçti, bardak rafları yalnız arka duvarda
  // kaldı. Batı duvarında önlerinde yalnız 1,08 boyunda bir tezgâh var — hiçbir şeyin içine
  // girmiyorlar. `ceyrek: 1` → modelin sırtı (+z yüzü) batı duvarına döner.
  { key: 'shelf_papertowel_decorated', x: LEFT_X, z: -12.5, ceyrek: 1, kat: 'duvar', y: RAF_Y },
  { key: 'towelrail', x: LEFT_X - NATIVE_TOWEL_Z, z: HAVLU_Z, ceyrek: 1, kat: 'duvar', y: HAVLU_Y },

];

/**
 * ÜST HİZAYA oturan asılı üniteler: tepeleri duvarın tepesindedir ve tek bir çizgi okunur.
 * Bu listede OLMAYAN duvar üniteleri (havluluk) kendi yüksekliğinde asılır — bekçi ikisini
 * ayrı denetler. Liste burada durur ki kural ile çizim tek kaynaktan okusun.
 */
export const UST_HIZALI: readonly KitchenKey[] = [
  'kitchencabinet', 'extractorhood', 'shelf_papertowel_decorated',
  // S22: zincirin alt üyeleri de asılı — ve ankrajları KENDİ ölçülerinden türemeli,
  // ünitenin donmuş `y`'sinden değil (`asiliY`).
  'kitchencabinet_half', 'shelf_papertowel',
];

/**
 * ASILI ÜNİTENİN ANKRAJI — ÜST HİZA, çizilen ÜYEYE göre.
 *
 * `WALL_UNIT_Y` ve `RAF_Y` tek bir modelden türetilmişti; oda kademelendiğinde aynı ünite
 * seviyeye göre BAŞKA bir gövdeyle çiziliyor ve o gövdenin tepesi artık duvarın tepesinde
 * durmuyor. Örnek: sade peçetelik rafı (`minY + h` = 0,15) süslü hâlin ankrajıyla (0,80)
 * çizilseydi duvarın tepesinden 0,59 br aşağıda asılı kalırdı. Kural değişmedi — tepesi
 * duvarın tepesinde; değişen, kuralın hangi modelin sayısına uygulandığı.
 */
export const asiliY = (key: KitchenKey): number =>
  WALL_H - (NATIVE[key].minY + NATIVE[key].h) * KITCHEN_S;

/** Duvar rafının (çay bardakları) asıldığı modüller — hattın ortası. */
export const RAF_MODULLERI = [3, 4] as const;

// =============================================================================================
//  KADEMELİ MUTFAK — S22 · D-119  (ölçüm: `docs/mutfak-kademe-raporu-s22.md`)
// =============================================================================================
/**
 * MUTFAK ARTIK SERVİS NOKTASININ SEVİYESİYLE BÜYÜYOR.
 *
 * S20 sayıyı vermişti: tezgâh 6 kademe çıkarken oda altısında da aynı 19 üniteyi çiziyordu,
 * seviye okuması 0'dı. S22 yedi büyüme kalıbını varyant olarak ölçtü; seçilen kol **K5 + Y1**
 * (D-119): erken basamaklarda gövdeler YERİNDE büyür, geç ve pahalı basamaklarda odanın
 * görünür boşluğunda ADA doğar. Kullanıcı kuralı: *"objeler küçük doğup yerinde büyür."*
 *
 * MERDİVEN ELLE YAZILIR, TÜRETİLMEZ — ve bu bir ölçüm bulgusu (raporun §K'sı):
 * "her gövde kendi zincirini altı basamağa yaysın" kuralı kısa zincirleri son basamağa yığıp
 * L2'yi KÖR bırakıyordu. WC'nin `LAVABO_SAYI_BY_LEVEL`'i de aynı sebeple elle yazılı (D-104).
 *
 * BASAMAKLARI CÜMLE DEĞİL SAYI BELİRLEDİ: "ocak büyüsün" kulağa büyük geliyor ama
 * `stove_single → stove_multi` adımının ölçüsü ×0,01 ünite (göz sayısı değişiyor, siluet
 * değil), o yüzden L2'de yanına iki gövde daha kondu. Basamak kütleleri (× ortalama ünite):
 * L2 ×0,40 · L3 ×0,75 · L4 ×1,46 · L5 ×1,80 · L6 ×2,47 — tek yönlü artıyor ve bedel
 * merdiveniyle uyumlu (r = 0,87). Kör basamak 0, yalnız-detay basamağı 0.
 */
export const KADEME_ZINCIR: Partial<Record<KitchenKey, readonly KitchenKey[]>> = {
  stove_multi: ['stove_single', 'stove_multi'],
  kitchencounter_straight_A_backsplash: ['kitchencounter_straight_A', 'kitchencounter_straight_A_backsplash'],
  kitchencounter_straight_B_backsplash: ['kitchencounter_straight_B', 'kitchencounter_straight_B_backsplash'],
  kitchencounter_sink_backsplash: ['kitchencounter_sink', 'kitchencounter_sink_backsplash'],
  kitchencabinet: ['kitchencabinet_half', 'kitchencabinet'],
  dishrack_plates: ['dishrack', 'dishrack_plates'],
  shelf_papertowel_decorated: ['shelf_papertowel', 'shelf_papertowel_decorated'],
};

/**
 * ZİNCİRİN SON ÜYESİ = ÜNİTENİN KENDİ ANAHTARI. Yani **L6 tam olarak bugünkü odadır**;
 * merdiven odayı büyütmez, oraya NASIL varıldığını anlatır. `KITCHEN_UNITS` bitmiş mekânın
 * tek kaynağı olarak kalır (`feedback_single_source_of_truth`) ve `tests/kitchen-look.test.ts`
 * hâlâ "son hâli" bekçiliyor demektir.
 *
 * İlk yazımda soğutucuya `fridge_A → fridge_A_decorated` zinciri konmuştu ve bekçi yakaladı:
 * o zincir L6'yı ünitenin ilan ettiği gövdenin ÖTESİNE taşıyordu — oda iki ayrı yerde
 * tanımlanmış oluyordu. Zincir kaldırıldı; kütlesi zaten ×0,00'dı (kutu değişmiyor).
 */

/**
 * ZİNCİRLER NEDEN `_decorated`'TE BİTMİYOR: arka hattın DÜŞEY boşluğu dolu.
 * Süslü tezgâh 2,095 ham (1,89 br) boyunda; hattın her modülünün üstünde ya duvar dolabı
 * (alt yüzü 1,40) ya çay bardağı rafı (alt kolu 1,40) var. Süslü ocak da davlumbazın içine
 * giriyor. Ölçüm bunları tek tek saydı (§Ç, 17 yeni iç içe geçme) — bu yüzden geç
 * basamakların kütlesi duvardan değil ADADAN geliyor.
 */

/** Bir basamakta hangi ünite zincirinin kaçıncı üyesine geçer. `u` = `KITCHEN_UNITS` index'i. */
export interface KademeAdimi { readonly u: number; readonly asama: number }

/**
 * MERDİVEN — index = seviye − 1. Oyunun kendi kimliğine oturur
 * (`economy.config.service`: L4 TEZGÂH · L5 TOST):
 *   L1 derme çatma: ocak tek gözlü · hat sırtlıksız · dolaplar yarım · bulaşıklık boş
 *   L2 ocak çoğalır · bulaşıklık dolar · doğu tezgâhı sırtlanır
 *   L3 batı tezgâhı sırtlanır · ilk duvar dolabı tam boya çıkar
 *   L4 TEZGÂH: iki hazırlık tezgâhı + lavabo sırtlanır, İLK ADA kurulur
 *   L5 TOST: ikinci dolap · peçetelik rafı donanır, İKİNCİ ADA kurulur
 *   L6 soğutucu dolar · ilk ada tam donanımına geçer · ikinci ada büyür
 */
export const KADEME_MERDIVENI: readonly (readonly KademeAdimi[])[] = [
  [],
  [{ u: 3, asama: 1 }, { u: 6, asama: 1 }, { u: 5, asama: 1 }],
  [{ u: 11, asama: 1 }, { u: 2, asama: 1 }],
  [{ u: 1, asama: 1 }, { u: 7, asama: 1 }, { u: 8, asama: 1 }],
  [{ u: 9, asama: 1 }],
  [{ u: 17, asama: 1 }],
];

/** Merdivenin taşıdığı en yüksek seviye — `economy.config` tavanıyla bekçi karşılaştırır. */
export const KADEME_MAX = KADEME_MERDIVENI.length;

/**
 * KAT 2 MUTFAĞI (D-198, oyun testi G2 "aşağıyı kopyala"): Kat 1'in odası aynı merdivenle. D-200: Kat 1'in
 * `mutfakSeviyesi(stationLevel)` gibi OCAK YÜKSELTMESİNDEN türer — varışta 1, her alım bir basamak.
 */
export const kat2MutfakSeviyesi = (ocakAlim: number): number => Math.min(KADEME_MAX, 1 + Math.max(0, ocakAlim));

/**
 * ODANIN ETKİN SEVİYESİ — `wcSeviye`nin kardeşi (`feedback_single_source_of_truth`).
 * Mutfak salonun kendisiyle birlikte hep çiziliyor; servis noktası ise L0'dan başlıyor.
 * Oda çiziliyorsa seviye tanım gereği en az 1'dir, yoksa L0'da hiçbir gövdesi olmayan bir
 * mutfak çizilirdi. Tavan merdivenin uzunluğudur.
 */
export const mutfakSeviyesi = (stationLevel: number): number =>
  Math.min(Math.max(1, stationLevel), KADEME_MAX);

/** i. ünitenin L seviyesinde ulaştığı zincir aşaması (merdiven kümülatif okunur). */
export function uniteAsamasi(i: number, level: number): number {
  const L = mutfakSeviyesi(level);
  let a = 0;
  for (let s = 0; s < L && s < KADEME_MERDIVENI.length; s++)
    for (const adim of KADEME_MERDIVENI[s]) if (adim.u === i) a = Math.max(a, adim.asama);
  return a;
}

/** i. ünitenin L seviyesinde ÇİZİLECEK gövdesi. Zinciri olmayan ünite hep kendisidir. */
export function uniteModeli(u: KitchenUnit, i: number, level: number): KitchenKey {
  const z = KADEME_ZINCIR[u.key];
  if (!z) return u.key;
  return z[Math.min(uniteAsamasi(i, level), z.length - 1)];
}

/** Ünitenin L seviyesindeki düşey ankrajı — asılıysa ÇİZİLEN üyenin üst hizasından. */
export function uniteY(u: KitchenUnit, model: KitchenKey): number {
  return UST_HIZALI.includes(model) ? asiliY(model) : u.y ?? 0;
}

// ---- ADA (Y1): odanın görünür boşluğunda doğup yerinde büyüyen hazırlık masası ----
/**
 * ADANIN Z EKSENİ — elle yazılmaz, ÇAYCININ KORİDORUNDAN türer.
 *
 * S20 çaycının yolunu ölçmüştü (`staffWalk`, z sabit). Ada o yolun önüne taşarsa çaycı
 * kendi mutfağında sıkışır. Eksen, yolun tam `PLAYER_RADIUS × 2` (geçiş açıklığı) gerisine
 * adanın yarı derinliği eklenerek konur: koridor tanım gereği tam açıklıkta kalır.
 */
export const ADA_DERINLIK = (NATIVE.kitchentable_A.maxZ - NATIVE.kitchentable_A.minZ) * KITCHEN_S;
export const ADA_KORIDOR = PLAYER_RADIUS * 2;
export const adaZ = (areasOpen: number): number =>
  servicePlace(areasOpen).staffWalk.a[2] - ADA_KORIDOR - ADA_DERINLIK / 2;

/** Adanın kendi kademe zinciri — doğduğu yerde büyür. */
export const ADA_ZINCIR: readonly KitchenKey[] = ['kitchentable_A', 'kitchentable_A_large', 'kitchentable_A_large_decorated'];

/**
 * ADA SAYISI İKİ, ÜÇ DEĞİL — çakışma ölçümünün kararı.
 * Ölçüm modül ritmine oturan DÖRT temiz slot buldu (k = 2·3·4·5) ve ilk taslak üçünü bitişik
 * kullandı. Ama ada da büyüyor: `kitchentable_A_large` 3,0 ham = **2,70 br**, slot aralığı
 * 1,80 br → büyüyen iki komşu birbirinin içine 0,45 br giriyordu. Büyüyen ada BİR slot
 * atlamalı: k = 2 ve k = 4, aralık 3,60 br, en büyük hâllerinde bile 0,90 br ayrı.
 * Kalan iki slot bilerek boş — oda tıkanmasın (S20'nin "boşluk en görünür şeritte" bulgusu
 * tümden kapanmasın) ve dolaşım payı kalsın.
 *
 * `asama[L−1]`: −1 henüz yok · 0/1/2 zincir üyesi.
 */
export const ADA_UNITS: readonly { readonly modul: number; readonly asama: readonly number[] }[] = [
  { modul: 2, asama: [-1, -1, -1, 0, 0, 2] },
  { modul: 4, asama: [-1, -1, -1, -1, 0, 1] },
];

/** Adanın L seviyesinde çizilecek gövdesi — `null` ise o ada henüz kurulmamıştır. */
export function adaModeli(s: number, level: number): KitchenKey | null {
  const a = ADA_UNITS[s];
  if (!a) return null;
  const i = a.asama[mutfakSeviyesi(level) - 1];
  return i < 0 ? null : ADA_ZINCIR[Math.min(i, ADA_ZINCIR.length - 1)];
}

/** Ünitenin dünya AABB'si (çeyrek dönüş uygulanmış). */
export function unitBox(u: KitchenUnit): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
} {
  const n = NATIVE[u.key];
  const S = u.olcek ?? KITCHEN_S;
  const hw = (n.w / 2) * S;
  const z0 = n.minZ * S;
  const z1 = n.maxZ * S;
  const y = u.y ?? 0;
  const dus = { minY: y + n.minY * S, maxY: y + (n.minY + n.h) * S };
  switch (u.ceyrek) {
    case 0:
      return { minX: u.x - hw, maxX: u.x + hw, minZ: u.z + z0, maxZ: u.z + z1, ...dus };
    case 2:
      return { minX: u.x - hw, maxX: u.x + hw, minZ: u.z - z1, maxZ: u.z - z0, ...dus };
    case 1:
      // +π/2: yerel +z → dünya +x
      return { minX: u.x + z0, maxX: u.x + z1, minZ: u.z - hw, maxZ: u.z + hw, ...dus };
    default:
      return { minX: u.x - z1, maxX: u.x - z0, minZ: u.z - hw, maxZ: u.z + hw, ...dus };
  }
}

// ---- ÖN HAT: OYUNUN İŞLEYEN TEZGÂHLARI (S3, kullanıcı 2026-09-09) ----
//
// Arka duvardaki dekor hattı serbestçe derinleşebiliyordu (bant yürünmez kütle, 7,1 br derin).
// ÖN hat öyle değil: çay tezgâhı, garson istasyonu ve bulaşık birer COLLISION kutusudur ve
// oyuncu tam önlerinde durur. Bu yüzden KayKit modeli buraya OLDUĞU GİBİ konamaz — modül
// 1,84 derin, collision 1,00. Model kutunun ölçüsüne ÇEKİLİR (eksen başına ölçek), ve
// çekmece yüzleri x-y düzleminde olduğu için gözle okunan tek fark tablanın sığlaşmasıdır —
// bir servis bankosunda zaten istenen şey.
//
// ÇEKMECELER HANGİ YÜZDE (kullanıcı 2026-09-09): ilk uygulamada modelin ön yüzü SALONA
// bakıyordu — yani çekmeceler müşteri tarafına açılıyordu. Gerçek bir servis bankosunda dolap
// personelin durduğu yüzdedir; ön hattın üç tezgâhı da **mutfağa dönük** (`yon = 'mutfak'`,
// varsayılan). Arka duvardaki hat bunun tersi DEĞİL aynı kuralın kendisi: orada da personel
// tezgâhın önünde (mutfağın içinde) durur, o yüzden ön yüz +z'de kalır.
//
// ÜST HİZA: elle çizilen gövdelerin tablası da tam **0,90**'daydı (`boxGeometry` 0,9 boy,
// merkez 0,45). Yani ön hattın üst hizası arka hatla AYNI sayı — ve üstündeki onlarca eşya
// (semaver, hazır bardaklar, tost sacı, sürahiler, peçetelik, kirli bardak tepsisi) tek bir
// koordinat değişmeden yerinde kalıyor. Gövde derinliği de her tezgâhın BUGÜNKÜ derinliğidir;
// takas görsel bir DERİ değişimidir, yeniden yerleşim değil.

/** Ön hattın tabla üstü — arka hatla aynı sayı, eski gövdelerin tablasıyla da aynı. */
export const FRONT_TOP_Y = COUNTER_TOP_Y;

/**
 * ÖN HAT KESİNTİSİZ OLSUN (kullanıcı 2026-09-09: *"en önde olan 3 şeyi birleştir"*).
 *
 * Üç tezgâhın (çay ocağı · garson istasyonu · bulaşık) COLLISION kutuları arasında 0,20'şer
 * boşluk var ve üçü ayrı ada gibi okunuyordu. Kutulara DOKUNULMUYOR — yürüme ve erişim aynı
 * kalsın diye. Değişen yalnız ÇİZİLEN genişlik: her gövde komşusuyla arasındaki boşluğun
 * ORTASINA kadar uzatılır, dış kenarlar kendi yerinde kalır. Sonuç tek bir banko.
 *
 * Ayrıca bulaşık BUGÜNE KADAR YANLIŞ ÇİZİLİYORDU: `dishHalf` [1,0 · 0,5] yani kutu 2,00 × 1,00,
 * ama çizim 1,4 × 0,8 elle yazılmıştı. Artık üçü de kutusundan türüyor.
 */
export interface OnHatGovde {
  /** Çizilecek genişlik. */
  w: number;
  /** Derinlik — kutunun kendi derinliği. */
  d: number;
  /** Gövdenin merkezinin, ünitenin kendi merkezine göre x kayması. */
  dx: number;
}

export function onHat(
  parcalar: readonly { x: number; hx: number; hz: number }[],
): OnHatGovde[] {
  const sirali = [...parcalar].map((p, i) => ({ ...p, i })).sort((a, b) => a.x - b.x);
  const kenar = sirali.map((p) => [p.x - p.hx, p.x + p.hx] as [number, number]);
  for (let k = 0; k < sirali.length - 1; k++) {
    const orta = (kenar[k][1] + kenar[k + 1][0]) / 2;
    kenar[k][1] = orta;
    kenar[k + 1][0] = orta;
  }
  const out: OnHatGovde[] = new Array(parcalar.length);
  sirali.forEach((p, k) => {
    const [x0, x1] = kenar[k];
    out[p.i] = { w: x1 - x0, d: p.hz * 2, dx: (x0 + x1) / 2 - p.x };
  });
  return out;
}

/**
 * Bir KayKit tezgâhını verilen kutuya çeken dönüşüm.
 * `w` gövde eni · `d` derinlik · `topY` tabla üstü. Modelin z aralığı simetrik DEĞİL
 * (−1,000 → +1,042: tabla öne taşar), o yüzden ölçekten sonra bir de ORTALAMA kayması gerekir;
 * aksi hâlde gövde collision kutusunun 2 cm önüne oturur.
 */
export function kayGovde(
  key: KitchenKey,
  w: number,
  d: number,
  topY: number,
  yon: 'mutfak' | 'salon' = 'mutfak',
): {
  scale: [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
} {
  const n = NATIVE[key];
  const sx = w / n.w;
  const sz = d / (n.maxZ - n.minZ);
  // Gövdenin (sırtlıksız) tablası native y = 1,0'da; ölçek onu `topY`ye getirir.
  const sy = topY / 1.0;
  const merkez = ((n.minZ + n.maxZ) / 2) * sz;
  const arka = yon === 'mutfak';
  return {
    scale: [sx, sy, sz],
    // Dönüş z'yi ters çevirir → ortalama kaymasının işareti de döner.
    position: [0, 0, arka ? merkez : -merkez],
    rotation: [0, arka ? Math.PI : 0, 0],
  };
}

// ============================================================================================
//  MUTFAK ZEMİNİ — KayKit karosu (S4)
// ============================================================================================
//
// Zemin bugüne kadar tek `planeGeometry` + düz renk (#d9cdb4). S3'te tezgâhlar KayKit'e geçti,
// altlarındaki zemin düz renk kaldı. Ölçüm (`docs/duvar-zemin-raporu-s4.md` §B7):
//
//   floor_kitchen        native 4,00 × 0,50 × 4,00 → dünyada 3,20 karo, KALINLIK 0,40
//   floor_kitchen_small  native 2,00               → dünyada 1,60 karo
//   mutfak fayans alanı  12,71 × 7,46
//     büyük karo → 3,97 × 2,33 · eş dağıtımla 4 × 2, gerilme %−0,7 × %+16,6
//     küçük karo → 7,94 × 4,66 · eş dağıtımla 8 × 5, gerilme %−0,7 × %−6,8   ← seçilen
//
// Küçük karo z ekseninde belirgin daha iyi oturuyor. Duvarla AYNI eş-dağıtım kuralı (K4)
// kullanılır: iki eksende de karo sayısı yuvarlanır ve fark bütün karolara eşit dağıtılır.

/** Mimari ölçek — duvarla aynı sayı, aynı gerekçe (`wallLook.KAY_S`). */
export const FLOOR_S = 0.8;

/**
 * KARO: `floor_kitchen_small` — KÜÇÜK karo, paketin kendi SİYAH-BEYAZ deseniyle.
 *
 * Dört kol ekranda karşılaştırıldı (`docs/gorsel/ss/fayans-*.png`) ve kullanıcı 2026-09-09:
 * *"kesinlikle ufak ve siyah beyaz olan olsun"*. Ölçüm de aynı yeri gösteriyordu:
 *   küçük (1,60) → 8 × 5 karo, gerilme %−0,7 × **%−6,8**
 *   büyük (3,20) → 4 × 2 karo, gerilme %−0,7 × **%+16,6**  ← karolar gözle dikdörtgenleşiyor
 * Kahve tonu da denendi ve elendi: ton materyal renginin dokuyla ÇARPIMIYLA veriliyordu, çarpım
 * siyahı boyayamaz — sonuç "kahve + siyah" oluyordu, klasik "kahve + krem" değil.
 * Gerçek kahve karo isteği gelirse yol atlas kopyasıdır (`tools/atlas-ton.mjs`, S3'te ölçüldü).
 */
export type FayansKaro = 'kucuk' | 'buyuk';

export const FLOOR_NATIVE = { kucuk: 2.0, buyuk: 4.0, h: 0.5 } as const;
export const floorKaroModel = (k: FayansKaro) => (k === 'kucuk' ? 'floor_kitchen_small' : 'floor_kitchen');
export const floorKaroW = (k: FayansKaro) => FLOOR_NATIVE[k] * FLOOR_S;

/**
 * ZEMİN TEMASI — mutfak zemininin rengi (S4).
 *
 * KAPSAM BİLEREK DAR: yalnız ZEMİN. Bir ara tezgâh/dolap rengini de temaya bağlayan beş kollu
 * bir set kuruldu ve kullanıcı 2026-09-09 reddetti (*"bunları sen kendin uydurmuşsun; mutfak şu
 * anki hâliyle kalsın, sadece o kahve zemin tema olarak satılsın"*). Ders: paketin paletinden
 * SEÇMEK, o seçimi bir ürün hattına çevirmek için yetmiyor — renk paletten gelse bile
 * KOMBİNASYON tasarım kararıdır ve onaysız çoğaltılmaz.
 *
 * KayKit'in dokusu bir resim değil, 8×4'lük bir RENK ŞERİDİ: her model UV'siyle bir "göz" seçer.
 * Paket kahve bir zemin MODELİ içermiyor (üç paket tarandı: yalnız `floor_kitchen` ve
 * `floor_kitchen_small` var, ikisi de aynı iki göze bakıyor) — ama kahve RENKLERİ içeriyor.
 * KayKit'in tanıtım görselindeki kiremit zemin de böyle yapılmış: aynı model, başka göz.
 * Yani renk uydurulmuyor, paketin paletinden seçiliyor (tek-stil kilidi korunur).
 *
 * Gözlerin gerçek renkleri `node tools/atlas-renk.mjs` ile ÖLÇÜLDÜ (tahminle seçilince ilk
 * denemede yanlış çıkmıştı — istenen "yakın iki kahve" yerine yüksek kontrastlı dama gelmişti):
 *   [0,1] #343434 koyu  · [0,4] #d5dcdf beyaz    ← zeminin doğal çifti
 *   [0,6] #995842 kahve · [1,5] #daae7d açık tan ← satılan temanın çifti
 */
export interface ZeminTemasi {
  koyu: Goz;
  acik: Goz;
  /** Mağaza kartının iki renkli özeti (gerçek render yüklenemezse yedek). */
  swatch: [string, string];
}

/** Zeminin DOĞAL gözleri — temanın kaynak tarafı. */
export const ZEMIN_NATIVE = { koyu: [0, 1] as Goz, acik: [0, 4] as Goz };

export const ZEMIN_TEMALARI: Record<string, ZeminTemasi> = {
  // Paketin kendi hâli — hiçbir göz taşınmaz. Kullanıcı dört kolu ekranda karşılaştırıp seçti
  // (`docs/gorsel/ss/s4-zemin-*.png`): *"kesinlikle ufak ve siyah beyaz olan olsun"*.
  klasik: { ...ZEMIN_NATIVE, swatch: ['#343434', '#d5dcdf'] },
  // Satılan TEK tema — `docs/gorsel/ss/s4-zemin-kucuk-kahve.png` karesindeki zeminin ta kendisi.
  kahve: { koyu: [0, 6], acik: [1, 5], swatch: ['#995842', '#daae7d'] },
  // Kat 2 mutfağının zemini (kullanıcı 2026-11-17, `kat2/Mutfak.KAT2_ZEMIN`); mağazada satılmaz.
  koyuKahve: { koyu: [0, 7], acik: [1, 4], swatch: ['#6b5d53', '#e8ceb4'] },
};

/** Temanın UV eşlemesi (kaynak göz → hedef göz). */
export function zeminEsleme(id: string): (readonly [Goz, Goz])[] {
  const t = ZEMIN_TEMALARI[id] ?? ZEMIN_TEMALARI.klasik;
  return [
    [ZEMIN_NATIVE.koyu, t.koyu],
    [ZEMIN_NATIVE.acik, t.acik],
  ];
}

/** Tema hiçbir gözü taşımıyorsa geometri klonlamaya gerek yok. */
export const temaNative = (id: string): boolean => (id || 'klasik') === 'klasik';

/**
 * Karonun dünya KALINLIĞI. Model bir levha: üst yüzü native y = 0,5'te, tabanı 0'da.
 * Zemin y = 0 olduğu için karo bu kadar AŞAĞI kaydırılır, yoksa 0,40 yükselip eşik olur.
 */
export const FLOOR_KALINLIK = FLOOR_NATIVE.h * FLOOR_S;

/** Mutfak fayansının sınırları — `Scene.BackBand`in kullandığı dikdörtgenin ta kendisi. */
export const FAYANS = {
  x0: BAND_SHELL.innerLeft,
  x1: BAND.service.maxX - 0.1,
  z0: BAND_SHELL.innerBack,
  z1: BAND.front - 0.05,
} as const;

export interface FloorKaro {
  x: number;
  z: number;
  /** [en, kalınlık, boy] — en ve boy K4 gerilmesini taşır. */
  scale: [number, number, number];
}

/**
 * Fayans alanını karolara böler (duvarla aynı K4 eş dağıtımı).
 * Karo sayısı yuvarlanır, artan/eksilen fark BÜTÜN karolara eşit dağıtılır — tek bir kenarda
 * yamalı bir şerit kalmaz.
 */
export function fayansKarolari(karo: FayansKaro = 'kucuk'): FloorKaro[] {
  const birim = floorKaroW(karo);
  const enW = FAYANS.x1 - FAYANS.x0;
  const boyW = FAYANS.z1 - FAYANS.z0;
  const nx = Math.max(1, Math.round(enW / birim));
  const nz = Math.max(1, Math.round(boyW / birim));
  const adimX = enW / nx;
  const adimZ = boyW / nz;
  const out: FloorKaro[] = [];
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++)
      out.push({
        x: FAYANS.x0 + adimX * (i + 0.5),
        z: FAYANS.z0 + adimZ * (k + 0.5),
        scale: [FLOOR_S * (adimX / birim), FLOOR_S, FLOOR_S * (adimZ / birim)],
      });
  return out;
}

/**
 * SERVİS GÖVDESİNİN SEVİYE İŞARETLERİ — renk DEĞİL, BİÇİM (R2 · D-127 · G-38).
 *
 * Kullanıcı 2026-09-16: *"tezgah yükseltmeleri de nasıl oluyor bilmiyorum bunları tamamla"*.
 * Ölçüm (`docs/mutfak-raporu-r2.md` §Bulgular 4) şikâyeti doğruladı ve nedenini de söyledi:
 * basamak başına ayırt edilir sinyal [2 · 2 · 2 · 3 · 2 · **0**] ve bunların hepsi RENK —
 * semaverin gövdesi ile tost presinin kapağı. İkisi de aynı objenin aynı bölgesinde.
 * `feedback_upgrade_legibility` tam bunun tersini istiyor: *"tek sinyal yetmez, çoklu redundant
 * sinyal"*. Üstelik **L5 → L6 hiçbir şey değiştirmiyordu**: iki renk dizisi de 6 üyeli ve
 * `Math.min(level, uzunluk − 1)` ile kelepçeli, yani L5 zaten son üyeye varıyor. Oyunun en pahalı
 * yükseltmesi (9.000 ₺) ekranda iz bırakmıyordu.
 *
 * Bağlam bunu daha da ağırlaştırıyor: sol duvar döneminde mutfak odası hiç çizilmiyor
 * (`Scene.BackBand`: `areasOpen < 3 → null`), yani S22'nin kademe merdiveni L0-L3 boyunca ekranda
 * YOK. O dönemde oyuncunun gördüğü tek yükseltme yüzeyi bu gövdedir.
 *
 * ÇÖZÜM (kullanıcı kararı C2): her basamağa renk dışı bir BİÇİM işareti. Liste burada durur ki
 * bekçi onu sahneyi çizmeden sayabilsin — `ServicePoint.tsx` yalnız çizer, hangi basamakta neyin
 * açıldığına karar vermez. L4 (TEZGÂH kimliği) ve L5 (tost sacı) zaten birer biçim işaretiydi;
 * listeye ALINMADILAR, çünkü onları `world.isCounter`/`sellsTost` söylüyor ve aynı sinyal iki
 * kaynaktan sayılırsa bekçi kendini kandırır.
 */
export interface ServisIsareti {
  /** Çizim tarafının anahtarı. */
  readonly ad: 'tepsi' | 'bardakIstifi' | 'surahi' | 'ikinciSemaver' | 'ikinciPres';
  /** Bu seviyede ve üstünde görünür. */
  readonly acilir: number;
  /**
   * Tabla üstündeki YERİ ve ayak izi yarı-boyutu (yerel eksen). Burada durur, `ServicePoint.tsx`te
   * değil: ilk yazımda koordinatlar bileşende, bekçinin kopyası testte duruyordu — yani iki ayrı
   * doğru vardı ve tezgâhtaki bir eşyayı kaydırmak bekçiyi hiç uyandırmıyordu
   * (`feedback_single_source_of_truth`). Artık ikisi de buradan okuyor.
   * `acilir: null` = seviyeye bağlı değil, hep orada (semaver gibi) — çakışma denetimine girer.
   */
  readonly x: number;
  readonly z: number;
  readonly hx: number;
  readonly hz: number;
}

/** Tablanın kullanılabilir yarı-ölçüsü (yerel) — en dar dönem 3,20 × 1,00'dir. */
export const SERVIS_TABLA_HX = 1.6;
export const SERVIS_TABLA_HZ = 0.5;

/** Seviyeden BAĞIMSIZ, hep tablada duran gövdeler — çakışma denetimi bunları da sayar. */
export const SERVIS_SABIT_YERLER: readonly { ad: string; x: number; z: number; hx: number; hz: number }[] = [
  { ad: 'semaver', x: 0.55, z: 0, hx: 0.34, hz: 0.34 },
];

export const SERVIS_ISARETLERI: readonly ServisIsareti[] = [
  /* YERLEŞİM TABLAYA YAYILIR, bir uca KÜMELENMEZ. İlk denemede üçü de kuzey ucundaki 0,70 br'lik
     boşluğa sığdırılmıştı ve karede (ss/r2-son-seviye-L3.png) ilerleme gibi değil KALABALIK gibi
     okunuyordu — üç küçük nesne semaverin gölgesinde. Tablanın iki serbest ucu var (kuzey 0,90…1,60
     ve güney −1,60…−1,10; arası tost sacı, hazır çay ve cezve ocağının); basamaklar ikisine
     dağıtıldı, böylece her yükseltme tezgâhın BAŞKA bir yerini dolduruyor. */
  { ad: 'tepsi', acilir: 1, x: -1.35, z: 0.25, hx: 0.2, hz: 0.14 },
  { ad: 'bardakIstifi', acilir: 2, x: 1.12, z: 0.24, hx: 0.07, hz: 0.07 },
  { ad: 'surahi', acilir: 3, x: 1.42, z: -0.18, hx: 0.14, hz: 0.14 },
  // L4 = TEZGÂH kimliği · L5 = tost sacı (ikisi de zaten biçim işareti, `world`ten okunur)
  { ad: 'ikinciSemaver', acilir: 6, x: -1.35, z: -0.25, hx: 0.2, hz: 0.2 },
  /* İkinci tost presi L6'da ZATEN çiziliyordu ama koşulu `ServicePoint.tsx` içinde düz bir
     `level >= 6`di: yani bir seviye işaretiydi ve hiçbir yerde öyle SAYILMIYORDU. Listeye
     alındı — hem bekçi onu görüyor hem de basamak eşiği tek yerden değişiyor. */
  /* İkinci pres tost SACININ üstünde durur (kendi yeri yok, sacın ayak izinde) — o yüzden
     çakışma denetimine sıfır ayak iziyle girer. */
  { ad: 'ikinciPres', acilir: 6, x: -0.6, z: -0.28, hx: 0, hz: 0 },
];

/** Bir işaretin kaydı — `ServicePoint.tsx` konumu buradan okur, elle yazmaz. */
export const servisIsareti = (ad: ServisIsareti['ad']): ServisIsareti => {
  const i = SERVIS_ISARETLERI.find((k) => k.ad === ad);
  if (!i) throw new Error(`bilinmeyen servis işareti: ${ad}`);
  return i;
};

/** L seviyesinde gövdede DURAN biçim işaretleri. */
export const servisIsaretleri = (level: number): ServisIsareti['ad'][] =>
  SERVIS_ISARETLERI.filter((i) => level >= i.acilir).map((i) => i.ad);

/** `ad` işareti L seviyesinde çizilir mi. */
export const servisIsaretiVar = (ad: ServisIsareti['ad'], level: number): boolean =>
  servisIsaretleri(level).includes(ad);

/**
 * Ön hattın DÖNÜŞÜ dünya eksenlerini takas ediyor mu (0/π → hayır · ±π/2 → evet).
 * Ölçüm aracı da (`tools/olcum-mutfak-r2.ts`) bekçi de bu fonksiyondan okur — "dönmüş mü"
 * sorusunun cevabı tek yerde durur.
 */
export const eksenTakasi = (rot: number): boolean => Math.abs(Math.sin(rot)) > 0.5;

/**
 * Bir gövdenin dünya yerleşiminden YEREL eksendeki ölçüsü ve hattın uzun ekseni boyunca yerel
 * koordinatı. Ayrı bir fonksiyon, çünkü **bugün hiçbir dönem bu dalın takaslı hâlini
 * birleştirmeyle birlikte koşmuyor**: birleştirme yalnız garson istasyonu sahnedeyken olur,
 * o da yalnız `rot = 0` döneminde. Yani takaslı birleştirme yolu canlı kodda ölü — ve mutasyon
 * denemesi bunu gösterdi (iki mutasyon `onHatGovdeleri` üzerinden bekçiden KAÇTI).
 * Sözleşmeyi dışarı almak bekçinin onu doğrudan koşturmasını sağlar; B1 (erken birleşme) bir gün
 * açılırsa kural sessizce yanlış çalışmaz.
 *
 * YÖN: three.js'te Y ekseni etrafında +π/2 dönüş yerel (1,0,0) vektörünü dünya (0,0,−1)'e taşır.
 * Yani yerel +x, dünya **−z**'dir — sıra bu yüzden `-pos[2]` üzerinden kurulur. İşaret ters
 * yazılsaydı birleştirme gövdeleri birbirinden uzağa uzatırdı.
 */
export const yerelKutu = (
  pos: readonly [number, number, number],
  h: readonly [number, number],
  takas: boolean,
): { x: number; hx: number; hz: number } => ({
  x: takas ? -pos[2] : pos[0],
  hx: takas ? h[1] : h[0],
  hz: takas ? h[0] : h[1],
});

/**
 * ÖN HATTIN ÜÇ GÖVDESİ — çay ocağı · garson istasyonu · bulaşık, tek kaynaktan.
 *
 * Üçü de kendi COLLISION kutusundan türer (elle yazılı 2,2 / 1,4 / 0,8 sayıları kalktı) ve
 * garson istasyonu sahnedeyken birbirine BİRLEŞİR. Garson istasyonu açılmadan önce (servis hâlâ
 * sol duvardayken) üçü bir sıra oluşturmuyor — o dönemde birleştirme yapılmaz, her gövde kendi
 * kutusunda kalır.
 *
 * R2 (D-127 · G-35/G-36) — ÖLÇÜ YEREL EKSENDE DÖNER. Bu fonksiyon ölçüyü çarpışma kutusundan,
 * yani DÜNYA eksenlerinden (`half[0]` = x · `half[1]` = z) türetiyordu; oysa iki çağıranın
 * ikisi de gövdeyi `place.rot` ile **zaten döndürülmüş** bir grubun içine çiziyor
 * (`Scene.Stations` · `DishSink`). `rot = 0` olan arka bant döneminde iki eksen aynı olduğu için
 * fark görünmüyordu; sol duvar döneminde (`rot = π/2`) yerel x dünya z'ye gidiyor ve gövde kendi
 * kutusuna DİK çiziliyordu:
 *
 *     tezgâh   kutu 1,00 × 3,20   çizim 3,20 × 1,00   IoU 0,19   açı 90°
 *     bulaşık  kutu 1,00 × 2,00   çizim 2,00 × 1,00   IoU 0,33   açı 90°
 *
 * Ölçülen bedeli iki yönlüydü: çizilen tezgâhın %19,4'ünün içinden yürünüyordu (G-36) ve kutusunun
 * %68,7'sinde hiçbir gövde yoktu. Tezgâh ayrıca duvarı 0,79 br deliyordu.
 * `docs/mutfak-raporu-r2.md` · ham çıktı `docs/olcum-mutfak-r2.txt`.
 *
 * ÇÖZÜM KUTUYA DOKUNMAZ (kullanıcı kararı A1, zıt kol A2 elendi): kutular zaten doğruydu, ölçü
 * yanlış eksende teslim ediliyordu. Dönüş eksenleri takas ediyorsa yarı-boyutlar da takas edilir
 * ve hattın uzun ekseni YEREL x'e çevrilir. Yerel +x, `rot = π/2`de dünya −z'dir — birleştirme
 * sırası da bu yüzden `-pos[2]` üzerinden kurulur, yoksa `dx` ters işaretle uygulanırdı.
 */
export function onHatGovdeleri(areasOpen: number): { station: OnHatGovde; waiter: OnHatGovde; dish: OnHatGovde } {
  const p = servicePlace(areasOpen);
  const takas = eksenTakasi(p.rot);
  const parcalar = [
    yerelKutu(p.station, p.half, takas),
    yerelKutu(WAITER_STATION.pos, WAITER_STATION.half, takas),
    yerelKutu(p.dish, p.dishHalf, takas),
  ];
  if (!waiterStationOpen(areasOpen)) {
    const [a, b, c] = parcalar.map((q) => ({ w: q.hx * 2, d: q.hz * 2, dx: 0 }));
    return { station: a, waiter: b, dish: c };
  }
  const [station, waiter, dish] = onHat(parcalar);
  return { station, waiter, dish };
}

// ---- E2: MUTFAĞIN SINIRI (S20 · D-118) ----
//
// ÖLÇÜM NE DEDİ (`docs/olcum-mutfak.txt` §E): oyuncu mutfağa GİREMİYOR — erişim 0/37.846 hücre —
// ama onu durduran şey bir duvar değil, `clampToOpenAreas` kelepçesi. Ön hattın İKİ UCUNDA
// 2,81 br (batı) ve 1,70 br (doğu) açıklık duruyor ve ikisi de geçiş eşiğinin üstünde. Oyuncu
// odanın 0,05 br yanında durup, gözle açık duran bir boşluktan içeri giremiyor: yanlış vaat.
//
// E2 o vaadi kaldırır. Bölmeler SALT GÖRSEL — collision eklenmez, çünkü ölçüm bir geçiş sorunu
// değil bir OKUNABİLİRLİK sorunu buldu; kelepçe zaten geçirmiyor. Gövdeler ön hattın kendi
// ölçüsünden türer (aynı z, aynı derinlik, aynı tabla) ki banko boydan boya tek çizgi okunsun.
//
// İÇERİDEKİ 0,20'LİK DİKİŞLER BİLEREK AÇIK: ölçüm onları "geçmez" diye işaretledi (0,20 < 0,94).
// Kapatmak üç tezgâhı tek kütleye çevirir ve çay ocağı · garson istasyonu · bulaşık ayrımını
// siler. Yalnız ölçümün işaretlediği yer kapanır.

/** Oyuncunun bir açıklıktan geçebilmesi için gereken en küçük genişlik (iki oyuncu yarıçapı). */
export const GECIS_ESIGI = PLAYER_RADIUS * 2;

export interface SinirBolmesi {
  /** Bölmenin dünya merkezi. */
  x: number;
  z: number;
  w: number;
  d: number;
  /** Hangi uç — çizim tarafı anahtar olarak kullanır. */
  uc: 'bati' | 'dogu';
}

/** Ön hattın üç gövdesinin x aralıkları — `onHatGovdeleri`nin birleştirmesi DEĞİL, ham collision. */
function onHatAraliklari(areasOpen: number): { x0: number; x1: number }[] {
  const p = servicePlace(areasOpen);
  return [
    { x0: p.station[0] - p.half[0], x1: p.station[0] + p.half[0] },
    { x0: WAITER_STATION.pos[0] - WAITER_STATION.half[0], x1: WAITER_STATION.pos[0] + WAITER_STATION.half[0] },
    { x0: p.dish[0] - p.dishHalf[0], x1: p.dish[0] + p.dishHalf[0] },
  ];
}

/**
 * Mutfağın ön yüzünde geçişe YETEN açıklıklar — E2 öncesi hâl. Bekçi bunu kullanır: bölmeler
 * eklendikten sonra bu listenin BOŞ kalması gerekir.
 */
export function onHatAcikliklari(areasOpen: number): { x0: number; x1: number; w: number }[] {
  if (!waiterStationOpen(areasOpen)) return [];
  const parcalar = onHatAraliklari(areasOpen).sort((a, b) => a.x0 - b.x0);
  const out: { x0: number; x1: number; w: number }[] = [];
  let uc = FAYANS.x0;
  for (const g of parcalar) {
    if (g.x0 - uc >= GECIS_ESIGI) out.push({ x0: uc, x1: g.x0, w: g.x0 - uc });
    uc = Math.max(uc, g.x1);
  }
  if (FAYANS.x1 - uc >= GECIS_ESIGI) out.push({ x0: uc, x1: FAYANS.x1, w: FAYANS.x1 - uc });
  return out;
}

/**
 * Açıklıkları kapatan bölmeler. Servis hâlâ sol duvardayken (areasOpen < 3) ön hat yoktur —
 * kapatılacak bir şey de yoktur, boş döner.
 */
export function sinirBolmeleri(areasOpen: number): SinirBolmesi[] {
  if (!waiterStationOpen(areasOpen)) return [];
  const p = servicePlace(areasOpen);
  const z = p.station[2];
  const d = p.half[1] * 2;
  const orta = (FAYANS.x0 + FAYANS.x1) / 2;
  return onHatAcikliklari(areasOpen).map((g) => ({
    x: (g.x0 + g.x1) / 2,
    z,
    w: g.w,
    d,
    uc: (g.x0 + g.x1) / 2 < orta ? ('bati' as const) : ('dogu' as const),
  }));
}

// ---- Ç1: ÇAYCININ TEMPOSU (S20 · D-118) ----
//
// ÖLÇÜM NE DEDİ (`docs/olcum-mutfak.txt` §Ç): çaycının başı oyuncunun 234 duruşunun %100'ünde
// görünür — odanın en çok görülen kişisi o. Buna karşılık mekanik okuması 0, klibi sabit ve
// yol denklemi `sin(t·0,3)` sipariş yükünden bağımsız. Yani boş salonda da tıklım salonda da
// aynı tempoyla gidip geliyordu.
//
// Ç1 bunu düzeltir ve SALT GÖRSEL kalır: hiçbir sayı üretmez, hiçbir sayı tüketmez (D-023).
// `rules.ts` / `tick.ts` / `economy.config.ts` dosyalarına dokunulmadı — varyant kapısı devrede
// değil. Çaycı yalnız salonun yükünü ANLATIR.

export const CAYCI_TEMPO = {
  /** Eski sabit: `sin(t · 0,3)`. Çarpan bunun ÜSTÜNE biner. */
  temelHiz: 0.3,
  /** Yükün doyduğu bekleyen sayısı — bunun üstünde tempo artmaz. */
  doyum: 4,
  /** Tek müşteri beklerken. */
  azCarpan: 0.6,
  /** Doyum ve üstünde. */
  cokCarpan: 2.0,
} as const;

/** Çay bekleyen müşteri sayısı — çaycının YÜKÜ. Diğer durumlar (içiyor, WC, gidiyor) sayılmaz. */
export const cayBekleyenSayisi = (npcs: readonly { state: string }[]): number =>
  npcs.reduce((a, n) => a + (n.state === 'waitingForTea' ? 1 : 0), 0);

/**
 * Yürüyüş hızı çarpanı. Yük yokken **0**: çaycı yolun neresindeyse orada durur ve dinlenir —
 * yavaşlatmak yetmezdi, boş salonda hâlâ "koşturan" bir beden yanlış anlatır.
 */
export function cayciHizCarpani(bekleyen: number): number {
  if (bekleyen <= 0) return 0;
  const k = Math.min(1, (bekleyen - 1) / Math.max(1, CAYCI_TEMPO.doyum - 1));
  return CAYCI_TEMPO.azCarpan + k * (CAYCI_TEMPO.cokCarpan - CAYCI_TEMPO.azCarpan);
}

/** Hangi klip çalar: yük varsa tezgâh başında çalışıyor, yoksa duruyor. */
export const cayciHali = (bekleyen: number): 'dur' | 'calis' => (bekleyen > 0 ? 'calis' : 'dur');
