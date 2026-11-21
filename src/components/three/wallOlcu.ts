/**
 * wallOlcu.ts — DUVARIN ÖLÇÜLERİ (saf sayılar; three'yi import ETMEZ).
 *
 * `wallPanel.tsx`ten ayrıldı (Faz F kod-bölme): `config/decor.ts` bu sayıları okuyor ve arayüz de
 * `config/decor`u okuyor. Sayılar çizim dosyasında durdukça ilk paket, sırf beş sabit için bütün
 * three'yi çekiyordu (`UNIT_BOX = new BoxGeometry` modül düzeyinde). Değerler ve belgeleri aynen
 * taşındı; `wallPanel` hepsini yeniden dışa verir, çağıranlar değişmedi.
 */

/** Duvar yüksekliği — maket v13 `WALL_H`. */
export const WALL_H = 3.2;
/** Lambri kuşağının yüksekliği — maket v13 `wall()` içindeki 0,9. */
export const WAINSCOT_H = 0.9;

/**
 * Duvar hattının alan kenarından dışarıdaki payı. **S6/② ile buraya taşındı:** `wallLook`ta
 * duruyordu ama `config/decor.ts`in de duvarın YÜZÜNÜ hesaplaması gerekti ve `wallLook` artık
 * `config/decor.ts`i import ediyor (pencere boşlukları) → döngü olurdu. `wallPanel` kimseyi
 * import etmiyor, sayının doğru yeri burası.
 */
export const WALL_M = 0.5;

/** Katman kalınlıkları (maketin kendi sayıları). Gövde en ince, çıta en kalın. */
const T_BODY = 0.18;
/** Gövde kalınlığı — duvarın oda tarafındaki YÜZÜ bundan türer (`config/decor.WALL_INNER`). */
export const WALL_T_BODY = T_BODY;
const T_WAINSCOT = 0.22;
/** Lambri kalınlığı — zemin hizasında duvarın EN DIŞ yüzü buradan çıkar (gövde 0,18'den kalın). */
export const WALL_T_WAINSCOT = T_WAINSCOT;
const T_RAIL = 0.26;
/** Çıta kalınlığı — duvarın EN KALIN katmanı; zemine yaslanan eşyanın sırtı buna değer (F4c-2). */
export const WALL_T_RAIL = T_RAIL;
/** Çıtanın yüksekliği ve merkez y'si — maket: box(...,0.08,...) @ y = 0.94. */
export const RAIL_H = 0.08;
export const RAIL_Y = 0.94;
/**
 * Çıtanın ÜST kenarı (0,98). Cephe vitrininin kaidesi buradan türüyor (D-105/C4b): sınır tam
 * 0,90'a konsaydı `wallBoxes` çıta katmanını hiç üretmezdi (parçanın tepesi 0,90 → 0,90…0,98
 * penceresi boş kalır) ve "lambri korunur" kararı lambriyi çıtasız bırakırdı.
 */
export const RAIL_TOP = RAIL_Y + RAIL_H / 2;

/**
 * ANA KAPI BOŞLUĞU — maket v13'ün ana giriş bloğu (`DH = 2.65`, söveler dx ∓2,2).
 *
 * Duvar 1,2'den 3,2'ye çıkınca kapı boşluğu duvarla birlikte 3,2'ye uzamıştı: lento duvarın
 * tepesine yapışıyor, kapının üstünde maketteki **alınlık** hiç doğmuyordu. Makette kapı camla
 * aynı hizada (2,65) biter ve üstündeki 0,55'lik badana şeridi cepheyi tamamlar.
 *
 * `half` yalnız GÖRSEL kesme genişliğidir (nav ve NPC girişi `entranceAt`'tan gelir), ama tek
 * yerde durur: `Scene.Walls` da `tests/layout-b32` de buradan okur (D-015 — sayıyı iki yere yazma).
 */
export const DOOR = { half: 2.2, height: 2.65 } as const;

/**
 * Kapı SÖVESİNİN eni. `Scene.Walls` bu kutuyu çiziyordu ve sayı orada gömülüydü; cephe vitrini
 * (D-105) sövenin DIŞ kenarını bilmek zorunda (gözler oradan başlar) ve `Scene.tsx` vitest'te
 * import edilemiyor — yani bekçi testi sınırı ancak vitrinin KENDİ payından türetebilirdi, o da
 * testin kendi kendini doğrulaması olurdu. Sayı tek yerde (D-015).
 */
export const SOVE_W = 0.4;
/** Sövenin kapı ekseninden ölçülen DIŞ kenarı — vitrin gözlerinin başlayabileceği ilk nokta. */
export const SOVE_DIS = DOOR.half + SOVE_W / 2;

/**
 * ÖN (KAMERAYA BAKAN) DUVARIN BOYU — S5 G-114 (kullanıcı kararı: iki katta da B).
 * 3,2'lik ön duvarda dibindeki oyuncunun başı ancak duvardan 1,72 m, ayağı 3,2 m uzaklaşınca
 * görünüyordu (portre kamera d 11,05). 1,0'da baş hep, ayak 1,0 m'de görünür. D-198 alçak bölme dili:
 * lambri kuşağı + çıta, üstünde 0,02 badana. Kat 1'de vitrin camı ve kapı alınlığı bu duvarla gider.
 */
export const ON_DUVAR_H = 1.0;
/** Kat 1 giriş direklerinin boyu (söve kesildi, giriş iki direkle okunur): duvardan 0,3 yüksek. */
export const KAPI_DIREK_H = ON_DUVAR_H + 0.3;
