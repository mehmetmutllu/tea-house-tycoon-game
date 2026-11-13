/**
 * audio.ts — SES SİSTEMİ. Motor E3'te kuruldu, E4'te BÜYÜTÜLDÜ.
 *
 * DÖRT TASARIM KARARI ve gerekçeleri:
 *
 * 1) SES `tick.ts`'e DOKUNMAZ — olaylar durumun FARKINDAN türetilir.
 *    Kolay yol, tick'e bir ses kuyruğu eklemekti (`noticeQueue` deseninin aynısı). Yapılmadı,
 *    iki sebeple: (a) `tick.ts` bir DENGE dosyasıdır (`tools/sira-kilidi.mjs`) — ona dokunan
 *    her değişiklik varyant kapısını açar ve ses bir denge kolu değildir; (b) ses bir SUNUM
 *    katmanıdır, simülasyonun çıktısı değil. Durum zaten her şeyi taşıyor (`stats.coinsCollected`,
 *    `padsDone`, `xp`, `mastersOwned`…), o yüzden olaylar TÜRETİLİR — `feedback_single_source_of_truth`
 *    ve `padsDone` deseninin (D-015) aynısı. Yan kazanç: `tick-fingerprint` çıktısı birebir korunur.
 *
 * 2) ÇEKİRDEK SAF: `sesOlaylari(onceki, simdiki)` hiçbir şey çalmaz, yalnız kimlik listesi döner.
 *    3B sahne görsel olarak doğrulanamıyor (CLAUDE.md) ve ses HİÇ doğrulanamıyor — o yüzden
 *    doğrulanan şey "duyuldu mu" değil, **hangi olayın hangi durum değişiminden doğduğu**.
 *
 * 3) SENTEZ NİHAİDİR, dosya OPSİYONEL ÜSTÜNE YAZMADIR (E4 · D-013'ün sesteki karşılığı).
 *    E3'te sıra tersti: dosya asıl, sentez "dosya gelene kadar" fallback'ti. E4 ölçümü bu
 *    varsayımı çürüttü — sentez kataloğu 36 çiftin 35'inde ayrışmış çıktı, yani yer tutucu gibi
 *    davranmıyordu (`docs/ses-raporu-e4.md` Bulgu 1). Projenin görsel kararı da zaten bu:
 *    primitive yer tutucu değil NİHAİ stil. Sentez tek "sanatçı"dır (stil kilidi tanımı gereği
 *    sağlanır) ve lisans yüzeyi sıfırdır. `dosya` alanı DURUYOR: bir `.ogg` bırakılırsa o çalar,
 *    tek satır kod değişmeden. Yani karar geri alınabilir kalıyor.
 *
 * 4) SENTEZ TEK YERDE ÜRETİLİR — `audioSynth.ts` (saf, deterministik, DOM'suz).
 *    E3'ün kabul edilen kusuru: sentez `audioWeb.ts` içinde WebAudio düğümleriyle kuruluydu ve
 *    ölçüm aracı o zinciri TAKLİT etmek zorundaydı; ölçülen kod ile duyulan kod ayrıydı ve
 *    sapmayı hiçbir şey tutmuyordu. Artık tarayıcı üretilen tamponu yalnızca ÇALAR, ölçüm aracı
 *    aynı tamponu OKUR.
 */
import type { Katman } from './audioSynth';
import { sesSuresi } from './audioSynth';

/** Çalınabilir ses kimlikleri. Manifest karşılıkları: `public/assets/README.md` §Sesler. */
export type SesId =
  | 'coin'      // yerden para toplandı
  | 'pour'      // ocaktan tepsiye çay alındı
  | 'serve'     // masaya ürün bırakıldı
  | 'purchase'  // ₺ yükseltme alındı (servis · masa · lavabo)
  | 'padFill'   // pad açıldı (yeni alan/masa/personel)
  | 'quest'     // görev tamamlandı
  | 'level'     // İtibar seviyesi atladı
  | 'master'    // 💎 ile Usta alındı
  | 'reward';   // hedef ya da günlük görev ödülü toplandı

/**
 * SERİ İVMESİ (S9 · D-122 kol I2) — art arda gelen aynı olayda perde basamak basamak yükselir.
 *
 * NEDEN: kullanıcının cümlesi *"fazla para topladıkça ses de ivme almalı, fazla topladığını
 * sezgisel olarak hissettirmek için"*. Ölçüm bunun bugün HİÇ olmadığını sayıyla gösterdi
 * (`docs/ses-raporu-s17.md` B6): basamaksız hâlde ardışık iki toplama arasındaki spektral fark
 * **0,00 dB**, mutlak tabanın (1,65 dB) altında — yani iki ses kulakta AYNI perdede.
 *
 * KAYNAKTAN BAĞIMSIZ: sentezde frekans çarpanı (`perdele`), dosyada `playbackRate`. Bu yüzden
 * kaynak kolu (K) ne seçilirse seçilsin basamak aynı kalır; D-122'de K1 (sentez) seçildi ama
 * `dosya` üstüne yazma yolu da basamağı taşıyor, yani karar geri alınabilir kalıyor.
 */
export interface SeriTanim {
  /** İki çalma arasında bu süreden (sn) uzun boşluk olursa seri KESİLİR ve perde tabana döner. */
  pencere: number;
  /** Her adımda kaç yarım ses yükselir. */
  basamak: number;
  /** Kaçıncı adımda durur (tavan dahil). */
  tavan: number;
}

/** Bir sesin tanımı: sentez katmanları + (varsa) üstüne yazan dosya. */
export interface SesTanim {
  /** `public/` altındaki yol. Dosya VARSA sentezin yerine o çalar (opsiyonel üstüne yazma). */
  dosya: string;
  /** Sentez katmanları — sesin kendisi. Süre buradan TÜRER, elle yazılmaz. */
  katmanlar: Katman[];
  /** Aynı sesin iki çalınışı arasındaki EN AZ süre (sn) — yığılmayı keser. */
  aralik: number;
  /** Varsa bu ses SERİ ivmesi taşır. Yoksa her çalınışı aynı perdededir. */
  seri?: SeriTanim;
}

/**
 * SES KATALOĞU — iki AİLE, bilerek ayrılmış (E4).
 *
 * FİZİKSEL olaylar gürültü + filtre ile üretilir: bir bardağın masaya konması bir nota değil,
 * kısa bir şıngırtı ve tok bir gövdedir; çay dökmek de bir ezgi değil, bant merkezi yükselen bir
 * akıştır. Baskın katmanı gürültü olan sesler: `pour` · `serve`. İLERLEME olayları tonal kalır.
 * `coin` ikisinin arasında durur ve bilerek öyle: baskın katmanı TON'dur ama kısmileri
 * İNHARMONİKtir — yani perdeli değil METALİKtir, madenî paranın kendi tınısı.
 * Ayrım D-080 Tek Odak'ın ses karşılığıdır: oyuncu iki aileyi karıştırmaz, çünkü aynı dili
 * konuşmuyorlar.
 *
 * E3'te bu ayrım YOKTU (tek osilatör vardı) ve 9 sesin 7'si yükselen arpejdi; ölçüm bunun
 * kataloğu tek kalıba sıkıştırdığını ve `quest` ile `reward`ı AYNI JESTE düşürdüğünü gösterdi
 * (`docs/ses-raporu-e4.md` Bulgu 2-3). Baskın katmanların aralık örüntüleri artık bilerek farklı:
 *   pour +14 (gürültü süpürmesi) · purchase −5 · padFill +7,+5 · quest +4,+3 ·
 *   level +7,+5,+4 · master +5,+5 · reward +12 · coin ve serve tek değerli (aralıksız)
 *
 * `aralik` değerleri Tek Odak'ın (D-080) ses karşılığıdır: en sık olay PARA (bir karede birden
 * çok toplanabilir) — onun aralığı en kısa ama sıfır değil.
 */
export const SES_KATALOG: Record<SesId, SesTanim> = {
  // METALİK — madenî tık. İnharmonik kısmiler (1 · 2,76 · 5,40 · 8,93) çan/madenî para tınısı
  // verir; klasik dalgayla üretilemez. Üstüne çok kısa bir tiz gürültü geçişi ("tink") biner.
  coin: {
    dosya: '/assets/audio/coin_pickup.ogg',
    katmanlar: [
      { kaynak: 'ton', hz: [2200], kismi: [1, 2.76, 5.40, 8.93], atak: 0.001, sonme: 0.11, gain: 0.16 },
      { kaynak: 'gurultu', hz: [7000], q: 3, atak: 0.0005, sonme: 0.025, gain: 0.06 },
    ],
    aralik: 0.06,
    // D-122 · I2: +1 yarım ses, tavan 5, pencere 1,2 sn. Ölçülen adım farkı 2,82 dB = mutlak
    // tabanın 1,7 katı, yani basamak GERÇEKTEN duyuluyor. I3 (+2, tavan 8) elendi: adımı daha
    // büyük ama tavanda kısmilerinin 3/4'ü 12 kHz üstüne taşıyor ve ilk↔tavan farkı 5,90 → 3,18
    // dB'ye DÜŞÜYOR — merdiven yükseldikçe duyulan azalıyor, madenî tını tepede kayboluyor.
    // Kelepçe (0,06) bilerek gevşek bırakıldı (kol A3): seri üst üste binebilsin, yığılma
    // "ivme"nin taşıyıcısı olsun. Ölçüldü: beş çakışmada tepe 0,196, kırpılma YOK.
    seri: { pencere: 1.2, basamak: 1, tavan: 5 },
  },
  // FİZİKSEL — çay dökme: bant merkezi YÜKSELEN süzülmüş gürültü (bardak doldukça tizleşen akış)
  // + altta yavaş bir fokurdama. Bu ses tam olarak "merkez frekansın yükselmesi"dir; sabit
  // katsayılı bir süzgeçle ya da nota dizisiyle anlatılamaz.
  pour: {
    dosya: '/assets/audio/tea_pour.ogg',
    katmanlar: [
      { kaynak: 'gurultu', hz: [650, 1500], suzul: true, q: 1.2, atak: 0.03, sonme: 0.40, gain: 0.10 },
      { kaynak: 'gurultu', hz: [180, 260], suzul: true, q: 0.8, atak: 0.02, sonme: 0.35, gain: 0.05 },
    ],
    aralik: 0.20,
  },
  // FİZİKSEL — bardak masaya kondu: dar bantlı cam şıngırtısı + tok alçak gövde. Şıngırtı
  // BASKIN katman (0,11 > 0,09): sesin kimliği cam, gövde ona eşlik ediyor. İkisi eşit
  // kazançtayken "baskın katman" beraberliğe düşüyordu ve teşhis sıraya bağlı kalıyordu.
  serve: {
    dosya: '/assets/audio/tea_serve.ogg',
    katmanlar: [
      { kaynak: 'gurultu', hz: [3600], q: 8, atak: 0.001, sonme: 0.10, gain: 0.11 },
      { kaynak: 'ton', hz: [190], dalga: 'sine', atak: 0.002, sonme: 0.09, gain: 0.09 },
    ],
    aralik: 0.10,
  },
  // İLERLEME — satın alma: önce tahta bir tok (kasa/tezgâh), sonra ALÇAK registerda kısa onay.
  // Alçak register bilerek: para HARCAMA sesi, para KAZANMA sesinden aşağıda durur. Jest de
  // bilerek İNİYOR (-5): katalogdaki tek inen tonal jest budur ve anlamı taşıyor — para çıkıyor.
  // Yükselen bir onay, harcamayı kazanç gibi duyururdu.
  purchase: {
    dosya: '/assets/audio/purchase.ogg',
    katmanlar: [
      { kaynak: 'gurultu', hz: [900], q: 4, atak: 0.001, sonme: 0.05, gain: 0.09 },
      { kaynak: 'ton', hz: [440, 330], dalga: 'square', gecikme: 0.03, atak: 0.005, sonme: 0.22, gain: 0.10 },
    ],
    aralik: 0.20,
  },
  // İLERLEME — pad doluyor: yükselen gürültü süpürmesi (DOLMA hissi) + yükselen üçlü.
  padFill: {
    dosya: '/assets/audio/pad_fill.ogg',
    katmanlar: [
      { kaynak: 'gurultu', hz: [400, 2000], suzul: true, q: 1.0, atak: 0.05, sonme: 0.30, gain: 0.05 },
      { kaynak: 'ton', hz: [440, 660, 880], dalga: 'triangle', atak: 0.004, sonme: 0.32, gain: 0.12 },
    ],
    aralik: 0.30,
  },
  // İLERLEME — görev tamam: majör üçlü (+4,+3). Kataloğun tek "üçlü" örüntüsü.
  quest: {
    dosya: '/assets/audio/quest_done.ogg',
    katmanlar: [
      { kaynak: 'ton', hz: [523, 659, 784], dalga: 'triangle', atak: 0.004, sonme: 0.30, gain: 0.13 },
    ],
    aralik: 0.30,
  },
  // İLERLEME — İtibar seviyesi: kataloğun en uzunu ve tek 4 notalısı; üstüne bir oktav üstten
  // ince bir parlaklık katmanı biner (fanfar hissi).
  level: {
    dosya: '/assets/audio/level_up.ogg',
    katmanlar: [
      { kaynak: 'ton', hz: [523, 784, 1047, 1319], dalga: 'triangle', atak: 0.004, sonme: 0.45, gain: 0.12 },
      { kaynak: 'ton', hz: [1046, 1568, 2094, 2638], dalga: 'sine', gecikme: 0.005, atak: 0.004, sonme: 0.42, gain: 0.04 },
    ],
    aralik: 0.45,
  },
  // İLERLEME (💎) — Usta: ÇAN. İnharmonik kısmiler + uzun sönme; katalogda tınısı buna benzeyen
  // tek ses `coin` ve o çok daha kısa/tiz. Sert para ödülü kendi tınısıyla ayrılır.
  master: {
    dosya: '/assets/audio/master.ogg',
    katmanlar: [
      { kaynak: 'ton', hz: [880, 1175, 1568], kismi: [1, 2.76, 5.40], atak: 0.002, sonme: 0.55, gain: 0.11 },
    ],
    aralik: 0.35,
  },
  // İLERLEME — ödül toplandı: OKTAV sıçraması (+12). E3'te `quest` ile aynı jestti (ikisi de
  // triangle, +5); ölçüm bunu tek gerçek kusur olarak buldu, jest bilerek ayrıldı.
  reward: {
    dosya: '/assets/audio/reward.ogg',
    katmanlar: [
      { kaynak: 'ton', hz: [660, 1320], dalga: 'triangle', atak: 0.003, sonme: 0.26, gain: 0.13 },
      { kaynak: 'gurultu', hz: [5000], q: 5, atak: 0.001, sonme: 0.03, gain: 0.04 },
    ],
    aralik: 0.25,
  },
};

/** Sesin süresi (sn) — katmanlardan türer, katalogda elle yazılmaz. */
export const sesSure = (id: SesId): number => sesSuresi(SES_KATALOG[id].katmanlar);

/**
 * Ses olaylarının türetildiği durum kesiti. Store'un TAMAMI değil — yalnız bu alanlar okunur,
 * böylece hangi değişimin ses ürettiği tek bakışta görünür ve alakasız bir alan değişince
 * sessizce yeni bir ses doğmaz.
 */
export interface SesKesit {
  coinsCollected: number;
  teaPickups: number;
  /** Oyuncunun eliyle masaya bıraktığı toplam ürün (çay + tost). */
  served: number;
  /** ₺ yükseltmelerinin TOPLAMI (servis + masa + lavabo) — hangisi olduğu sesi değiştirmiyor. */
  yukseltmeToplam: number;
  padSayisi: number;
  /** Görev hattındaki konum (D-088: çalışma zamanının kodlaması). Yalnız ARTIŞTA ses. */
  questIndex: number;
  seviye: number;
  ustaSayisi: number;
  /** Toplanmış hedef + günlük görev ödüllerinin toplamı. */
  odulSayisi: number;
  /** F4c-4 (D-157): sahip olunan kozmetik + işlenmiş mağaza alımı. Artışı = satın alma sesi (eskiden sessizdi). */
  alimSayisi: number;
}

/**
 * İKİ KESİT ARASINDAKİ ses olayları. SAF: hiçbir şey çalmaz, sıra da vermez — yalnız
 * "bu iki kare arasında ne oldu" sorusunun cevabı.
 *
 * SAYAÇLAR yalnız ARTIŞTA ses üretir; azalma (yükleme, kayıt göçü, prestij) SESSİZDİR.
 * Bu, dosyanın en kolay kaçırılacak kuralı: eski bir kayıt yüklenince bütün sayaçlar sıfırdan
 * o değerlere ATLAR ve kesit farkı devasa çıkar. `ilkKare` bayrağı bu yüzden var.
 */
export function sesOlaylari(onceki: SesKesit | null, simdiki: SesKesit): SesId[] {
  // İlk kare (ya da yükleme sonrası): kıyas noktası yok → hiçbir ses çalınmaz. Yoksa açılışta
  // oyuncunun bütün geçmişi bir anda "olay" olarak çalardı.
  if (!onceki) return [];
  const olaylar: SesId[] = [];
  const arttiMi = (a: number, b: number) => b > a;
  // Sıra ÖNEMLİ: en nadir/en anlamlı olay önce gelir, böylece bir karede birden çok olay
  // düştüğünde çalan ilk ses en bilgilendirici olan olur.
  if (arttiMi(onceki.seviye, simdiki.seviye)) olaylar.push('level');
  if (arttiMi(onceki.ustaSayisi, simdiki.ustaSayisi)) olaylar.push('master');
  if (arttiMi(onceki.padSayisi, simdiki.padSayisi)) olaylar.push('padFill');
  if (arttiMi(onceki.questIndex, simdiki.questIndex)) olaylar.push('quest');
  if (arttiMi(onceki.odulSayisi, simdiki.odulSayisi)) olaylar.push('reward');
  if (arttiMi(onceki.yukseltmeToplam, simdiki.yukseltmeToplam) || arttiMi(onceki.alimSayisi, simdiki.alimSayisi)) olaylar.push('purchase');
  if (arttiMi(onceki.served, simdiki.served)) olaylar.push('serve');
  if (arttiMi(onceki.teaPickups, simdiki.teaPickups)) olaylar.push('pour');
  if (arttiMi(onceki.coinsCollected, simdiki.coinsCollected)) olaylar.push('coin');
  return olaylar;
}

/**
 * Motorun tarayıcıya bakan yüzü. Testlerde sahtesi verilir — `jsdom`da gerçek WebAudio yok ve
 * olsaydı bile "duyuldu mu" doğrulanamazdı; doğrulanan şey motorun ne ÇALMAYA ÇALIŞTIĞI.
 */
export interface SesArkaUc<K extends string = SesId> {
  /**
   * Dosyayı çal. Dosya yoksa/çalamazsa `false` döner → motor sentezi çalar.
   * `yarimSes` seri ivmesinin basamağıdır; dosya tarafında `playbackRate` ile uygulanır.
   */
  dosyaCal(yol: string, gain: number, yarimSes: number): boolean;
  /**
   * Sentezi çal. Arka uç katmanları bir kez tampona çevirip önbellekler.
   * Önbellek anahtarı `id` DEĞİL `id + yarimSes`: aynı sesin her basamağı ayrı tampondur.
   */
  sentezCal(id: K, katmanlar: readonly Katman[], yarimSes: number, gain: number): void;
  /** Tarayıcı ses kilidini açar (mobilde ilk dokunuşta). */
  kilidiAc(): void;
  /** Şu anki zaman (sn) — aralık kelepçesi bunu kullanır (testte sahte saat). */
  simdi(): number;
}

export interface SesMotoru<K extends string = SesId> {
  /** `kazanc` (0..1) çağrı başına çarpan — Kat 2'nin yakınlık kısması (`kat2Ses.ts`). Varsayılan 1. */
  cal(id: K, kazanc?: number): boolean;
  kilidiAc(): void;
  /** Ayar ve SEVİYE birlikte yansıtılır — ikisi de kayıttan gelir ve panelden değişebilir. */
  ayarla(acik: boolean, seviye?: number): void;
  readonly acik: boolean;
  readonly seviye: number;
}

/**
 * Motoru kurar. `acik` = `settings.sound` (kayıttan gelir).
 *
 * ÜÇ KELEPÇE, üçü de gerçek bir kusuru kapatıyor:
 *  1. AYAR — kapalıyken tek bir ses bile çalınmaz (ayar E3'ten önce kayıtta duruyordu ama
 *     hiçbir şeye bağlı değildi; bağlandığı yer burası).
 *  2. KİLİT — mobil tarayıcılar kullanıcı dokunmadan ses çalmaya izin vermez. Kilit açılmadan
 *     yapılan çağrılar SESSİZCE düşer (kuyruğa alınmaz: birikip sonra hep birden patlamasın).
 *  3. ARALIK — aynı ses `aralik` saniyesinden sık çalınmaz. Para toplama bir karede birden çok
 *     kez olabiliyor; kelepçe olmasa tek bir mıknatıs turunda onlarca ses üst üste binerdi.
 *
 * DÖRDÜNCÜSÜ KELEPÇE DEĞİL, SAYAÇ: seri ivmesi (D-122 · I2). `seri` tanımı olan ses art arda
 * çalınırken perdesi basamak basamak yükselir; ara `pencere`den uzun olursa tabana döner.
 * Sayaç motorda durur, arka uçta değil — basamak "hangi tampon" sorusunun cevabı değil,
 * OYUNUN durumu: aynı hesap dosya yoluna da sentez yoluna da aynı sayıyı veriyor.
 */
export function sesMotoruKur<K extends string = SesId>(
  arkaUc: SesArkaUc<K>,
  acik: boolean,
  seviye = 1,
  /** Katalog verilmezse Kat 1'inki. Kat 2 kendi kataloğuyla AYRI bir motor kurar (`audioKat2.ts`). */
  katalog: Readonly<Record<K, SesTanim>> = SES_KATALOG as unknown as Record<K, SesTanim>,
): SesMotoru<K> {
  let aktif = acik;
  // 0..1 arası kazanç. ANAHTARDAN AYRI: "kapat" ile "kıs" farklı isteklerdir — seviye 0'a
  // inse bile anahtar açık kalır ve oyuncu kaldığı yerden geri açar (D-122).
  let ses = Math.min(1, Math.max(0, seviye));
  let kilitli = true;
  const sonCalma = new Map<K, number>();
  /** Sesin o anki seri adımı (kaç basamak yukarıda). Seri kesilince 0'a döner. */
  const seriAdim = new Map<K, number>();

  return {
    get acik() { return aktif; },
    get seviye() { return ses; },
    ayarla(v: boolean, yeniSeviye?: number) {
      aktif = v;
      if (yeniSeviye !== undefined) ses = Math.min(1, Math.max(0, yeniSeviye));
    },
    kilidiAc() {
      if (!kilitli) return;
      kilitli = false;
      arkaUc.kilidiAc();
    },
    cal(id: K, kazanc = 1): boolean {
      // Seviye 0 = sessiz. Kelepçe ve seri sayacı da ÇALIŞMAZ: çalınmayan ses ne yığılır ne
      // basamak yer — kısık sesle oynayıp açan oyuncu merdivenin ortasında bulmaz kendini.
      const g = ses * Math.min(1, Math.max(0, kazanc));
      if (!aktif || kilitli || g <= 0) return false;
      const tanim = katalog[id];
      const t = arkaUc.simdi();
      const son = sonCalma.get(id);
      if (son != null && t - son < tanim.aralik) return false;

      // SERİ: aralık kelepçesini GEÇEN çalmalar sayılır. Kelepçeye takılan çalma yukarıda
      // döndüğü için seriyi ne ilerletir ne kırar — duyulmayan bir ses basamak yiyemez.
      let yarimSes = 0;
      if (tanim.seri) {
        const surdu = son != null && t - son <= tanim.seri.pencere;
        const adim = surdu ? Math.min((seriAdim.get(id) ?? 0) + 1, tanim.seri.tavan) : 0;
        seriAdim.set(id, adim);
        yarimSes = adim * tanim.seri.basamak;
      }

      sonCalma.set(id, t);
      // Dosya bırakılmışsa o üstüne yazar; yoksa NİHAİ ses olan sentez çalar (E4 · karar 3).
      // D-122'de K1 seçildi (sentez kalır) ama dosya yolu basamağı taşımaya devam ediyor.
      if (!arkaUc.dosyaCal(tanim.dosya, g, yarimSes)) {
        arkaUc.sentezCal(id, tanim.katmanlar, yarimSes, g);
      }
      return true;
    },
  };
}
