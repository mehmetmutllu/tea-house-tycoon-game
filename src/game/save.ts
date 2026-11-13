// Kalıcı kayıt + saveVersion. Backend yok: cihaz = veritabanı (depo: `kalicilik.ts` — Preferences +
// localStorage hızlı kopya). Sprint A: sağlama zarfı + dönen yedekler + bozuk kayıt karantinası.
// v31 (D-058): migrasyon YOK — eski sürüm bulunursa ilerleme sıfırlanır, ayarlar korunur.
// v32 (D-088): görev hattının kimliği sıra numarası olmaktan çıktı → GERÇEK migrasyon (aşağıda).
import { defaultDaily, type DailyState } from './dailyQuests';
import {
  economyConfig as C,
  type CharUpgrades,
  type WaiterUpgrades,
} from '../config/economy.config';
import { activeQuestIndex, completedQuestIds } from './questProgress';
import type { LevelUpOdul } from './rules';
import { D } from './decimal';
import { kaliciOku, kaliciSil, kaliciYaz, kaliciYerelOku } from './kalicilik';
import { KAT2_SV_MAX, defaultKat2, defaultKat2Gorev, type Kat2Kayit } from './kat';
import { bosKasaOlcum, type KasaOlcum } from './kasa';

/**
 * KAYIT ŞEMASI SÜRÜMÜ. Bir denge sayısı değil, bu dosyanın kendi kavramı — bu yüzden
 * `economy.config.ts`'te değil burada durur (D-088; orada dururken her sürüm artışı varyant
 * kapısının commit denetimini boşuna tetikliyordu).
 *
 * 31 → 32: `questIndex: number` yerine `questsDone: string[]` (+ tabanın sahibi `questBaseId`).
 * 33 → 34: garson tepsi kademesinin ANLAMI değişti (D-142: taban 1 → 2, ilk kademe düştü).
 */
export const SAVE_VERSION = 34;

const KEY = 'kiraathane.save';
/** Oturumun bildiği bilinçli sıfırlama sayısı (`SaveData.sifirlamaNo`): yükleme okur, `clearSave` artırır. */
let sifirlamaNo = 0;

/**
 * Kalıcı (transient NPC/coin hariç) oyun durumu. Sayılar string Decimal serisi.
 * D-015: masa/servis/personel SAKLANMAZ — `padsDone`'dan türetilir (`deriveWorld`, world.ts).
 * Böylece sayaç ile pad listesi yapısal olarak desenkronize olamaz.
 */
/** Kalıcı oyun sayaçları (quest sistemi v16): oyuncu eylemleri + garson taşıması. */
export interface SaveStats {
  /** Oyuncunun ocaktan tepsiye aldığı toplam çay. */
  teaPickups: number;
  /** Oyuncunun ELİYLE masaya bıraktığı toplam ÜRÜN — çay + tost (garson hariç). */
  teasServed: number;
  /** Oyuncunun ELİYLE masaya bıraktığı toplam TOST (B2: tost artık salona değil tezgâh L5'e bağlı,
   *  bu yüzden "tost servis et" görevi alan sayacıyla değil kendi sayacıyla ölçülür). */
  tostServed: number;
  /** Yerden toplanan toplam para adedi. */
  coinsCollected: number;
  /** Oyuncunun ELİYLE bulaşıkta yıkadığı toplam kirli bardak (bulaşıkçı hariç). */
  dishesWashed: number;
  /** Garsonun bugüne dek taşıdığı toplam çay (arka-plan reveal şartları). */
  waiterServed: number;
  /** SERVİS-BAŞINA garson taşıma sayacı (v21): her servisin hızlandırma noktası KENDİ garsonunun
   *  işini sayar (yeni garson tutulur tutulmaz hızlandırma belirmesin — sindirme ilkesi). */
  waiterServedByService: number[];
  /** ALAN-BAŞINA oyuncu el servisi (v23): alanlı serveTea görevleri YALNIZ o alandaki servisi
   *  sayar — eski global sayaç "Yeni salonda 5 çay" görevini 1. alanda da dolduruyordu. */
  teasServedByArea: number[];
}

export function defaultStats(): SaveStats {
  return {
    teaPickups: 0,
    teasServed: 0,
    tostServed: 0,
    coinsCollected: 0,
    dishesWashed: 0,
    waiterServed: 0,
    waiterServedByService: [],
    teasServedByArea: [],
  };
}

/** Oyuncu ayarları (v17 persist). Bildirimler Capacitor'da (Faz 5/7) okunur. */
export interface SaveSettings {
  sound: boolean;
  music: boolean;
  notifications: boolean;
  /**
   * Olay seslerinin seviyesi, 0..1 (S9 · D-122). Anahtarın yanında AYRI durur: "kapat" ile
   * "kıs" farklı isteklerdir — oyuncu sesi tamamen kapatmadan mekânı sessizleştirebilmeli.
   * 1 = bugüne kadarki davranış, yani eski kayıt hiçbir şey kaybetmez.
   */
  soundVolume: number;
  /**
   * Müziğin seviyesi, 0..1. TAVANI ölçülmüş: 1 = `music.ts`teki kazanç, yani dokuz olay sesini
   * kendi bandında +12 dB üstte tutan EN YÜKSEK müzik seviyesi. Slider bu tavanın altını gezer;
   * üstüne çıkamaz, çünkü o an müzik oyunun kendi geri bildirimini örtmeye başlar.
   */
  musicVolume: number;
  /**
   * GÖLGE TERCİHİ (F2 · D-125). 'oto' = cihaz sınıfı karar verir (`game/cihazSinifi.ts`),
   * 'acik'/'kapali' = oyuncunun açık tercihi, ölçümü ezer.
   * ADDITIVE alan → saveVersion ARTMADI (`lavaboLevel` emsali): `ayarlariBirlestir` eksik
   * alanı varsayılanla doldurur, eski kayıt hiçbir şey kaybetmez.
   */
  golge: 'oto' | 'acik' | 'kapali';
  /**
   * OYUNUN DİLİ (i18n, 2026-09-28). 'oto' = telefonun dili (Türkçe → tr, diğer her dil → en); 'tr'/'en' elle
   * seçim. ADDITIVE alan → saveVersion ARTMADI (`golge` emsali).
   */
  dil: 'oto' | 'tr' | 'en';
}

/**
 * REKLAM SAYAÇLARI (F3b · D-150). Ödüllü videonun günlük/pencere hakları kayıtta durur ki uygulamayı
 * kapatıp açmak hakkı tazelemesin. ADDITIVE alan → saveVersion ARTMADI (`golge` emsali):
 * `derinBirlestir` eski kayıtta eksik alanı varsayılanla doldurur.
 */
export interface ReklamSayaci {
  /** Usta "İzle"nin son kullanıldığı gün (`dayIndex`) ve o gün kaç kez kullanıldığı. */
  ustaGun: number;
  ustaSayi: number;
  /** Video hakkı penceresinin başladığı an (ms) ve o pencerede izlenen video sayısı. */
  videoPencere: number;
  videoKullanilan: number;
}

export const defaultReklam = (): ReklamSayaci => ({ ustaGun: -1, ustaSayi: 0, videoPencere: 0, videoKullanilan: 0 });

/**
 * SATIN ALIMLAR (F4a · D-152). Kalıcı sahiplikler mağaza hesabında durur; buradaki bayraklar yalnız
 * ÖNBELLEK (çevrimdışı açılışta reklamsızlık bilinsin). Açılışta mağaza okunursa önbellek onunla
 * eşitlenir (`sahiplikEsitle`). ADDITIVE alan → saveVersion ARTMADI (`reklam` emsali).
 */
export interface SatinAlim {
  reklamsiz: boolean;
  baslangic: boolean;
  /** Reklamsızın günlük 💎'ının son alındığı gün (`dayIndex`). */
  gunlukGun: number;
  /** Ödülü verilmiş son işlem kimlikleri — aynı işlem ikinci kez 💎 vermesin. */
  islenen: string[];
  /** F4c: başlangıç paketi teklifi (ilk Usta'dan sonra) gösterildi mi — bir kez çıkar. */
  teklif: boolean;
  /** `islenen`deki işlemin verdiği 💎 (Y-25): bulut kaydı yereli ezerken bulutta olmayan işlemin
   *  💎'ı taşınır. Eski kayıtta yok (additive) → o işlemler 0 sayılır. */
  islemElmas?: Record<string, number>;
  /** Sprint A (P2): bu andan (ms) önceki mağaza işlemleri işlenmiş sayılır. Eski kayıtta yok → ilk
   *  açılışta "şimdi" yazılır (geçmiş işlemler yeniden ödenmesin). */
  uzlasmaBasi?: number;
  /** Başlangıç paketinin 100 💎'ı bu kayıtta verildi mi — geri yüklemede bir kez (kol A, 2026-10-09). */
  baslangicElmas?: boolean;
  /** Reklamsız/başlangıç hakkını veren mağaza kimliği (RevenueCat appUserID) — iade düşüşü yalnız aynı kimlikte. */
  hakKimlik?: string;
}

export const defaultSatinAlim = (): SatinAlim => ({ reklamsiz: false, baslangic: false, gunlukGun: -1, islenen: [], teklif: false });

export function defaultSettings(): SaveSettings {
  return { sound: true, music: true, notifications: true, soundVolume: 1, musicVolume: 1, golge: 'oto', dil: 'oto' };
}

/**
 * KAYITTAN GELEN AYARLARI VARSAYILANLARLA BİRLEŞTİRİR — ve bu, `loadSave`daki sessiz bir
 * açığı kapatıyor.
 *
 * `{ ...defaultSave(), ...parsed }` yüzeysel bir yayılımdır: `parsed.settings` varsa
 * varsayılan ayar nesnesinin TAMAMINI değiştirir, alan alan birleştirmez. Yani ayarlara
 * eklenen her yeni alan, GÜNCEL SÜRÜMLÜ eski bir kayıtta `undefined` kalırdı — göç bile
 * çalışmazdı, çünkü sürüm zaten güncel. Ses seviyesi bu tuzağa düşerdi: `undefined` bir
 * çarpan sesi tamamen susturur.
 *
 * Buradaki birleştirme alan başına değil NESNE düzeyinde yapılıyor ve bu bilerek: kayıt bir
 * alanı taşımıyorsa varsayılanı geçer, taşıyorsa oyuncunun seçimi geçer.
 *
 * AYNI KAPI, ALAN SİLMEYİ DE KARŞILIYOR (R3 · D-128, `showFps` kaldırıldı): birleştirme
 * BİLİNEN alanları tek tek seçtiği için, eski kayıttaki fazla alan sessizce düşer —
 * `saveVersion` bu yüzden artmadı ve eski kayıt hiçbir şey kaybetmedi.
 */
export function ayarlariBirlestir(ham: unknown): SaveSettings {
  const s = (ham && typeof ham === 'object' ? ham : {}) as Partial<SaveSettings>;
  const d = defaultSettings();
  const oran = (v: unknown, varsayilan: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : varsayilan;
  return {
    sound: typeof s.sound === 'boolean' ? s.sound : d.sound,
    music: typeof s.music === 'boolean' ? s.music : d.music,
    notifications: typeof s.notifications === 'boolean' ? s.notifications : d.notifications,
    soundVolume: oran(s.soundVolume, d.soundVolume),
    musicVolume: oran(s.musicVolume, d.musicVolume),
    golge: s.golge === 'acik' || s.golge === 'kapali' || s.golge === 'oto' ? s.golge : d.golge,
    dil: s.dil === 'tr' || s.dil === 'en' || s.dil === 'oto' ? s.dil : d.dil,
  };
}

export interface SaveData {
  saveVersion: number;
  wallet: string;
  diamonds: string;
  lifetime: string;
  /** SERVİS başına ocak seviyesi (v18; index = servis noktası, D-022). */
  stationLevels: number[];
  /** Masa-başı yükseltme seviyeleri (Faz 2h; index = GLOBAL masa slotu; bahşiş+sabır). */
  tableLevels: number[];
  /** ODA: lavabo seviyesi (B4; 0 = oda kapalı). ADDITIVE alan → sürüm ARTMADI: `defaultSave()`
   *  yayılımı eksik alanı 0 ile doldurur, eski v31 kaydı lavabosuz ama sağlam açılır (additive alan deseni). */
  lavaboLevel: number;
  padsDone: string[];
  /** Aktif pad'lerin kısmi dolumu (pad id → ₺). Aynı anda birden çok pad doldurulabilir (v5). */
  padFills: Record<string, number>;
  /**
   * KISMİ ÖDENMİŞ YÜKSELTMELER (G-78, 2026-09-18). ADDITIVE alan → sürüm ARTMADI
   * (`lavaboLevel`/`goalsClaimed`/`mastersOwned` deseni: eksik alanı `defaultSave()` yayılımı
   * doldurur, eski kayıt sağlam açılır).
   *
   * NEDEN EKLENDİ — kullanıcı 2026-09-18: *"çay ocağında yükseltmede 800 altından 300'ünü falan
   * ödeyerek bıraktım, sonra da geri girdim; para zaten verilmişti ama yükseltmede sıfırdan
   * başlıyordu."* Doğrulandı: `padFills` kaydediliyordu ama YÜKSELTME dolumlarının üçü de
   * kaydedilmiyordu, `store.init` her yüklemede sıfıra çekiyordu. Para cüzdandan çıkmıştı →
   * oyuncunun ilerlemesi yanıyordu. CLAUDE.md: *"ilerleme kaybolmaz."*
   *
   * Pad dolumu neden `Record` de bunlar dizi: pad kimliği stringtir ve seyrektir; yükseltmeler
   * SLOT'a bağlıdır (servis index'i / global masa slotu) ve zaten dizi olarak tutuluyorlar.
   */
  /** Servis noktası başına kısmi yükseltme dolumu (₺; index = servis noktası). */
  upgradeFills: number[];
  /** Masa başına kısmi yükseltme dolumu (₺; index = GLOBAL masa slotu). */
  tableUpgradeFills: number[];
  /** Lavabonun kısmi yükseltme dolumu (₺). */
  lavaboFill: number;
  /** Kalıcı eylem sayaçları (quest + arka-plan reveal şartları; v16). */
  stats: SaveStats;
  /** TAMAMLANMIŞ görev kimlikleri (v32; D-088). Konumun TEK kaynağı — index saklanmaz, aktif
   *  görev `activeQuestIndex` ile buradan türetilir (questProgress.ts). `padsDone` deseni. */
  questsDone: string[];
  /** TOPLANMIŞ hedef kimlikleri (D3/D-089; `<kategori>:<kademe>`). `questsDone` deseni: kademe
   *  index'i SAKLANMAZ, her okumada sayaçtan türetilir (`src/game/goals.ts`). ADDITIVE alan →
   *  sürüm ARTMADI: `defaultSave()` yayılımı eksik alanı `[]` ile doldurur, eski v32 kaydı
   *  hedefsiz ama sağlam açılır (`lavaboLevel` deseni). */
  goalsClaimed: string[];
  /** D-093: USTA olmuş objelerin kimlikleri. Additive — kayıt sürümü ARTMADI; eski kayıtta
   *  alan yoksa boş liste okunur (`goalsClaimed`in v32'deki deseni). */
  mastersOwned: string[];
  /** D8: bugünün günlük görevleri (gün · kimlikler · sayaç tabanı · toplananlar). Additive →
   *  sürüm ARTMADI: eksik alan `defaultDaily()` ile dolar, `day: -1` ilk tick'te dönümü tetikler
   *  (`mastersOwned` deseni). Kimlikler NEDEN saklanıyor: havuz gate'li, gün içinde yeniden
   *  türetilse oyuncunun sabah aldığı görev öğlen altından kayardı (`dailyQuests.ts` başlığı). */
  daily: DailyState;
  /** F3b (D-150): ödüllü videonun günlük/pencere hakları. Additive — sürüm ARTMADI. */
  reklam: ReklamSayaci;
  /** F4a (D-152): satın alımların önbelleği + işlenmiş işlemler. Additive — sürüm ARTMADI. */
  satin: SatinAlim;
  /** Aktif SAYAÇ görevinin başlangıç sayaç değeri (delta hedefi için taban; v16). */
  questBase: number;
  /** Tabanın AİT OLDUĞU görevin kimliği (v32). Konum bilgisi değil sahiplik etiketi: yüklemede
   *  türetilen aktif görev bu değilse taban bayattır ve sıfırdan kurulur (store.init). */
  questBaseId: string;
  /** Toplam oyuncu XP'si (v17; level `levelProgress(xp)` ile türetilir — ayrı saklanmaz). */
  xp: number;
  /** Oyuncu ayarları (v17). */
  settings: SaveSettings;
  /** Kozmetik mağaza (v19, WP6): ALAN başına seçili zemin/duvar teması + satın alınan sahiplikler
   *  (`kind:id:zN` anahtarları — tekrar seçmek ücretsiz). */
  floorThemeByArea: string[];
  wallThemeByArea: string[];
  /** GLOBAL mutfak teması (v33, S4): tezgâh + dolap + zemin rengi. */
  kitchenTheme: string;
  /** GLOBAL masa teması id'si (mobilya minder+örtü rengi). */
  tableTheme: string;
  ownedCosmetics: string[];
  /** F4c 💎 vitrini: sahibin kıyafeti + elindeki tepsi (GLOBAL). Additive — sürüm ARTMADI
   *  (`defaultSave()` yayılımı eksik alanı 'klasik' ile doldurur, `satin` deseni). */
  outfit: string;
  trayLook: string;
  /** F4c-2 💎 dekor: yuva → o yuvada duran ürün (sahiplik `ownedCosmetics`te). Additive — sürüm ARTMADI
   *  (`derinBirlestir` eksik alanı {} ile doldurur, sözlüğün anahtarlarını korur). */
  dekor: Record<string, string>;
  /** F4c-3 (D-156): kafenin adı — tabelada yazar. `null` = hiç sorulmadı (açılışta bir kez sorulur). Additive. */
  kafeAdi: string | null;
  /** Karakter yükseltme kademeleri (v20): tepsi/mıknatıs/hız. Karakter seviyesi türetilir. */
  charUpgrades: CharUpgrades;
  /** Garson tepsi (v27/Y3) + bulaşıkçı leğen (v28) + personel hız (v29) kademeleri.
   *  v29: eski servis-başı `waiterLevels` buraya katlandı (teaSpeed/tostSpeed) ve kaldırıldı. */
  waiterUpgrades: WaiterUpgrades;
  /** Karakter paneli ilk-sefer spotlight'ı görüldü mü (v20; butona dokununca true, bir daha çıkmaz). */
  charPanelSeen: boolean;
  /** Tepsi-boşalt butonu ilk-sefer spotlight'ı görüldü mü (v23; charPanelSeen deseni). */
  trayTipSeen: boolean;
  /**
   * BULAŞIK ÖĞRETME KARTI görüldü mü (G-63, 2026-09-18). ADDITIVE alan → sürüm ARTMADI
   * (`trayTipSeen` deseni; eksik alanı `defaultSave()` yayılımı `false` ile doldurur).
   *
   * NEDEN VAR — kullanıcı: *"'bulaşık yıka' diyor ama öyle bir şey olmaması gerekiyor. Ona bir
   * uyarıcı, bir modal tarzı bir şey… 'müşteriler çay içtikten sonra masalarda kirli çay birikmeye
   * başlar, bunları alıp bulaşık tezgâhına bırakman gerekiyor' … ondan sonra görev gelmeli."*
   * Mekanik (kirli bardak) ile GÖREV aynı anda doğuyordu; arada öğretme yoktu.
   */
  washTipSeen: boolean;
  /** E5: oyuncu ilk dakikaların öğreticisini "Atla" ile kapattı. Öğreticinin BİTTİĞİ kayıtta
   *  tutulmaz — görev hattından türer (`game/onboarding.ts`). Additive → sürüm ARTMADI. */
  ogreticiAtlandi: boolean;
  /** T9c/A7: alınmamış seviye ödülü (yalnız ₺ > 0 iken). Ekran açıkken uygulama kapanırsa ödül
   *  yanıyordu; yüklemede ekran geri gelir. Additive → sürüm ARTMADI (`washTipSeen` deseni). */
  levelUp: LevelUpOdul | null;
  /**
   * BİLİNÇLİ SIFIRLAMA SAYACI (Sprint A). Oyuncu "Oyunu sıfırla" dedikçe bir artar; bulut seçiminde
   * ilerlemeden ÖNCE gelir (`kayitIleriMi`): sıfırlanmış kayıt eski ilerlemeli kayda yenilmesin —
   * yoksa başka cihazdaki eski kayıt sıfırlamayı geri alırdı. Additive → sürüm ARTMADI (eksik = 0).
   */
  sifirlamaNo: number;
  /**
   * K2-2: oyuncunun bulunduğu kat (1 | 2). Additive → sürüm ARTMADI (`sifirlamaNo` deseni): eski kayıtta
   * yok → 1. Bilinçli tercih: sürüm artsaydı bu kaydı okuyan ESKİ uygulama yazma kilidine düşerdi
   * (`kayitKilitli`); additive alanı ise `derinBirlestir` olduğu gibi taşır, eski sürüm de silmez.
   */
  kat: number;
  /** K2-2: Kat 2'nin kendi ilerlemesi (`kat.ts` · `Kat2Kayit`). Additive — eksik alan varsayılanla dolar. */
  kat2: Kat2Kayit;
  /**
   * D-185: Kat 1'in kasası (Decimal dizgesi) + kasa sınırının kaynağı olan gelir ölçümü. Additive →
   * sürüm ARTMADI (`kat`/`kat2` deseni): eski kayıtta yok → kasa '0', ölçüm boş (soğuk başlangıç).
   * Bozuk değer kaydı reddettirmez, sıfırlanır (kasa ilerleme değil, yolda bekleyen para).
   */
  kasa: string;
  kasaOlcum: KasaOlcum;
  lastSaved: number; // epoch ms
}

export function defaultCharUpgrades(): CharUpgrades {
  return { tray: 0, magnet: 0, speed: 0 };
}

export function defaultWaiterUpgrades(): WaiterUpgrades {
  return { tray: 0, speed: 0, dishCarry: 0, dishSpeed: 0 };
}

export function defaultSave(): SaveData {
  return {
    saveVersion: SAVE_VERSION,
    wallet: '0',
    diamonds: '0',
    lifetime: '0',
    stationLevels: [],
    tableLevels: [],
    lavaboLevel: 0,
    padsDone: [],
    padFills: {},
    upgradeFills: [],
    tableUpgradeFills: [],
    lavaboFill: 0,
    stats: defaultStats(),
    questsDone: [],
    goalsClaimed: [],
    mastersOwned: [],
    daily: defaultDaily(),
    reklam: defaultReklam(),
    satin: defaultSatinAlim(),
    questBase: 0,
    questBaseId: '',
    xp: 0,
    settings: defaultSettings(),
    floorThemeByArea: [],
    wallThemeByArea: [],
    kitchenTheme: 'klasik',
    tableTheme: 'mavi',
    ownedCosmetics: [],
    outfit: 'klasik',
    trayLook: 'klasik',
    dekor: {},
    kafeAdi: null,
    charUpgrades: defaultCharUpgrades(),
    waiterUpgrades: defaultWaiterUpgrades(),
    charPanelSeen: false,
    trayTipSeen: false,
    washTipSeen: false,
    ogreticiAtlandi: false,
    levelUp: null,
    // Oturumun bildiği sayaç: `kayitVerisi` bu yayılımdan başladığı için yazılan kayıt onu taşır.
    sifirlamaNo,
    kat: 1,
    kat2: defaultKat2(),
    kasa: '0',
    kasaOlcum: bosKasaOlcum(),
    lastSaved: Date.now(),
  };
}

/**
 * KAYIT v31 — TEMİZ SIFIRLAMA, MİGRASYON YOK (D-058 karar 3).
 *
 * Faz B kat 1'in yapısını (alan/servis/masa zinciri) baştan kuruyor: eski kayıtlardaki
 * `padsDone: ['table2','zone2','z3table4'…]` kimliklerinin yeni zincirde karşılığı YOK.
 * Artık var olmayan bir zincir için migrasyon yazılmaz — eski kayıt bulunursa ilerleme sıfırlanır,
 * yalnız AYARLAR (ses · müzik · bildirim · FPS) korunur.
 *
 * Bu fonksiyon artık yalnız **v31'den ESKİ** (ya da tanınmayan) kayıtların düşüş yeri: göç zinciri
 * v32 ile başladı (`migrateV31`). CLAUDE.md'nin "ilerleme kaybolmaz" kuralı v1.0 mağazaya çıktığı
 * andan itibaren bağlayıcı; o gün geldiğinde buraya düşen kayıt kalmamalı.
 */
export function resetKeepingSettings(raw: Record<string, unknown>): SaveData {
  return { ...defaultSave(), settings: ayarlariBirlestir(raw.settings) };
}

/**
 * MİGRASYON v31 → v32 (D-088) — v31'in temiz-sıfırlamasından sonraki İLK gerçek göç.
 *
 * v31'de sıfırlama meşruydu: zincir kimliklerinin yeni modelde karşılığı YOKTU. Burada öyle bir
 * durum yok — hattın görevleri aynı, değişen yalnız KAYDIN o hattı nasıl işaret ettiği. Bu yüzden
 * CLAUDE.md'nin "şema değişince eski kayıt migrate edilir, ilerleme kaybolmaz" kuralı uygulanır.
 *
 * Dönüşüm tek satır: eski `questIndex` bugünkü hattın o index'ine kadarki KİMLİKLERİNE çevrilir.
 * Bu, göçün yapılabildiği tek an — v31 kaydı yazıldığında hat neyse index onu gösteriyordu ve
 * hat o günden bu yana değişmedi. Göçten sonra kaydın konumu bir daha sıra numarasına bağlı olmaz.
 */
/**
 * MİGRASYON v32 → v33 (S4) — mutfak teması eklendi.
 *
 * Şema EKLEMELİ değişti: yeni alan `kitchenTheme`, eski kayıtta yok. İlerlemeyi etkileyen
 * hiçbir şey değişmediği için göç tek satır — varsayılan tema ('klasik') eski kaydın üstüne
 * eklenir ve oyuncu bugüne kadarki her şeyiyle devam eder. CLAUDE.md: *"şema değişince eski
 * kayıt migrate edilir; ilerleme kaybolmaz."*
 */
function migrateV32(raw: Record<string, unknown>): Record<string, unknown> | null {
  if (raw.saveVersion !== 32) return null;
  return {
    ...defaultSave(),
    ...(raw as object),
    saveVersion: 33,
    kitchenTheme: typeof raw.kitchenTheme === 'string' ? raw.kitchenTheme : 'klasik',
  };
}

/**
 * MİGRASYON v33 → v34 (T8a · D-142) — garson tepsisi 2'li başlıyor.
 *
 * Kapasite = taban + kademe. Taban 1 → 2 oldu ve ₺400'lük ilk kademe merdivenden düştü (tavan
 * yine 4). Kayıtta yalnız KADEME durur; aynı sayı yeni tabanla bir fazla kapasite demek olurdu.
 * Göç kademeyi bir indirir → oyuncunun elindeki kapasite AYNEN korunur (kademe 0'daki oyuncu
 * 1 → 2 kazanır; bu kararın kendisi). Görev kimlikleri dokunulmaz: `q_waiterTray1` hattan çıktı,
 * kaydın listesinde zararsızca durur (D-088).
 */
function migrateV33(raw: Record<string, unknown>): Record<string, unknown> | null {
  if (raw.saveVersion !== 33) return null;
  const wu = (raw.waiterUpgrades ?? {}) as Partial<WaiterUpgrades>;
  return {
    ...raw,
    saveVersion: 34,
    waiterUpgrades: { ...wu, tray: Math.max(0, (wu.tray ?? 0) - 1) },
  };
}

function migrateV31(raw: Record<string, unknown>): Record<string, unknown> | null {
  if (raw.saveVersion !== 31) return null;
  const index = typeof raw.questIndex === 'number' ? raw.questIndex : 0;
  const questsDone = completedQuestIds(C.quests, index);
  const active = C.quests[activeQuestIndex(C.quests, questsDone)];
  const { questIndex: _drop, ...rest } = raw as Record<string, unknown> & { questIndex?: number };
  return {
    ...defaultSave(),
    ...(rest as object),
    saveVersion: 33,
    questsDone,
    questBase: typeof raw.questBase === 'number' ? raw.questBase : 0,
    // Taban eski kayıtta aktif olan görevin tabanıydı; göç konumu değiştirmediği için sahibi de aynı.
    questBaseId: active?.id ?? '',
  };
}

/**
 * T9c/A6 — kaydı varsayılanla DERİN birleştirir. Yüzeysel `...` iç alanları kurtarmıyordu: eksik
 * `stats.waiterServedByService` her karede TypeError, `padsDone: null` init'te çöküş (beyaz ekran).
 * Kural: nesne → anahtar anahtar iner (kayıttaki fazla anahtarlar korunur — `padFills` gibi
 * sözlükler); dizi → kayıttaki dizi ya da varsayılan; ilkel → tür tutuyorsa kayıt, tutmuyorsa
 * varsayılan (sayı ↔ dizge Decimal alanları için çevrilir). Varsayılanı `null` olan alan kaydı
 * olduğu gibi alır (anlamını okuyan doğrular).
 */
export function derinBirlestir(def: unknown, raw: unknown): unknown {
  if (raw === undefined) return def;
  if (def === null || def === undefined) return raw;
  if (Array.isArray(def)) return Array.isArray(raw) ? raw : def;
  if (typeof def === 'object') {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return def;
    const out: Record<string, unknown> = { ...(def as Record<string, unknown>) };
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      out[k] = k in out ? derinBirlestir(out[k], v) : v;
    }
    return out;
  }
  if (typeof def === 'number') {
    const n = typeof raw === 'string' ? Number(raw) : raw;
    return typeof n === 'number' && Number.isFinite(n) ? n : def;
  }
  if (typeof def === 'string' && typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return typeof raw === typeof def ? raw : def;
}

/**
 * T9c/A5 — YAZMA KİLİDİ. Kayıt bu paketten DAHA YENİ sürümle yazılmışsa (eski APK'ya geri dönüş)
 * eskiden `resetKeepingSettings` ilerlemeyi siliyor, 2 sn sonra periyodik kayıt da yeni kaydın
 * üstüne yazıyordu. Artık kayıt en iyi çabayla okunur ve bu oturumda DİSKE YAZILMAZ — yeni sürüm
 * yüklendiğinde kayıt olduğu gibi durur. Kilidi yalnız bilinçli sıfırlama (`clearSave`) açar.
 */
let yazmaKilidi = false;
export function kayitKilitli(): boolean {
  return yazmaKilidi;
}

// ─── Doğrulama (Sprint A) ────────────────────────────────────────────────────────────────────
const sayiMi = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const negatifsiz = (v: unknown): number => (sayiMi(v) && v > 0 ? v : 0);

/** Decimal dizgesi sonlu ve ≥ 0 mı (`'NaN'`, `'Infinity'`, `''`, `'-5'` → hayır). */
export function gecerliTutar(v: unknown): boolean {
  if (typeof v !== 'string' || v.trim() === '') return false;
  try {
    const d = D(v);
    return Number.isFinite(d.mantissa) && Number.isFinite(d.exponent) && d.exponent < 9e15 && d.gte(0);
  } catch {
    return false;
  }
}

const sayiDizisi = (v: unknown): number[] => (Array.isArray(v) ? v.map(negatifsiz) : []);
const metinKumesi = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
/** Alan-başı (index anlamlı) metin dizisi: bozuk eleman düşürülmez (index kayardı) — '' olur, okuyan varsayılana düşer. */
const metinDizisi = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')) : []);
function sozluk<T>(v: unknown, eleman: (x: unknown) => x is T): Record<string, T> {
  const out: Record<string, T> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (eleman(x)) out[k] = x;
  return out;
}
const negatifsizSayiMi = (x: unknown): x is number => sayiMi(x) && x >= 0;
const metinMi = (x: unknown): x is string => typeof x === 'string';

/** S3: Kat 2 masa Sv sözlüğü — tam sayı 2..KAT2_SV_MAX tutulur (Sv1 = kayıt dışı varsayılan); bozuk/≤ 1 düşer. */
function kat2SvSozluk(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(sozluk(v, sayiMi))) {
    const sv = Math.min(KAT2_SV_MAX, Math.floor(x));
    if (sv >= 2) out[k] = sv;
  }
  return out;
}
/** S3: Kat 2 görev hattı kaydı (D'nin `kat2Gorev.ts`i okur) — eksik/bozuk → baştan. */
function kat2GorevKaydi(v: unknown): NonNullable<Kat2Kayit['gorev']> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return defaultKat2Gorev();
  const g = v as Record<string, unknown>;
  return { idx: Math.floor(negatifsiz(g.idx)), sayac: sozluk(g.sayac, negatifsizSayiMi) };
}

/**
 * KAYIT DOĞRULAMA (Sprint A). `derinBirlestir` türü tutturur ama İÇERİĞİ denetlemez: dizi olduğu
 * gibi geçer (`[-500, 'bozuk', null]`), Decimal dizgesi `'NaN'` olabilir — NaN cüzdan her işlemde
 * NaN üretir ve oyuncu bir daha hiçbir şey alamaz.
 *
 * `red`: Decimal alanlardan (cüzdan · elmas · toplam kazanç) biri sonlu ≥ 0 değil → bu kayıt ADAY
 * OLARAK REDDEDİLİR (yükleme yedeğe düşer, bulut kaydı yok sayılır). Geri kalan her şey eleman
 * bazında TEMİZLENİR (red sebebi değil): sayı dizileri ≥ 0, küme dizileri yalnız metin, sözlükler
 * yalnız tutan değerler. Satın alım uzlaşma alanları (`uzlasmaBasi`…) yoksa DOLDURULMAZ — "yok →
 * şimdi" kuralını mağaza tarafı (`magazaUzlas`) uygular; burada yalnız bozuk değer atılır.
 */
export function kayitDogrula(d: SaveData): { data: SaveData; red: string[] } {
  const red: string[] = [];
  const tutar = (alan: 'wallet' | 'diamonds' | 'lifetime'): string => {
    if (gecerliTutar(d[alan])) return d[alan];
    red.push(alan);
    return '0';
  };
  const s = d.satin;
  const satin: SatinAlim = {
    reklamsiz: s.reklamsiz,
    baslangic: s.baslangic,
    gunlukGun: s.gunlukGun,
    islenen: metinKumesi(s.islenen),
    teklif: s.teklif,
  };
  if (s.islemElmas !== undefined) satin.islemElmas = sozluk(s.islemElmas, negatifsizSayiMi);
  if (sayiMi(s.uzlasmaBasi)) satin.uzlasmaBasi = s.uzlasmaBasi;
  if (typeof s.baslangicElmas === 'boolean') satin.baslangicElmas = s.baslangicElmas;
  if (typeof s.hakKimlik === 'string') satin.hakKimlik = s.hakKimlik;
  // Bilinmeyen (gelecek sürümün) satın alım alanları korunur: kayıt onları biz bilmeden taşır.
  for (const [k, v] of Object.entries(s)) if (!(k in satin) && !['islemElmas', 'uzlasmaBasi', 'baslangicElmas', 'hakKimlik'].includes(k)) (satin as unknown as Record<string, unknown>)[k] = v;

  const g = d.daily;
  const daily: DailyState = {
    ...g,
    day: sayiMi(g.day) ? g.day : -1,
    ids: metinKumesi(g.ids),
    base: sozluk(g.base, sayiMi),
    claimed: metinKumesi(g.claimed),
  };
  if (g.targets !== undefined) daily.targets = sozluk(g.targets, sayiMi);
  if (g.onceki !== undefined) {
    const o = g.onceki as unknown;
    if (o && typeof o === 'object' && sayiMi((o as { day?: unknown }).day))
      daily.onceki = { day: (o as { day: number }).day, hazir: sozluk((o as { hazir?: unknown }).hazir, negatifsizSayiMi) };
    else delete daily.onceki;
  }

  const lu = d.levelUp as unknown;
  const levelUp = lu && typeof lu === 'object' && sayiMi((lu as LevelUpOdul).amount) && sayiMi((lu as LevelUpOdul).level)
    ? (lu as LevelUpOdul)
    : null;

  const data: SaveData = {
    ...d,
    wallet: tutar('wallet'),
    diamonds: tutar('diamonds'),
    lifetime: tutar('lifetime'),
    stationLevels: sayiDizisi(d.stationLevels),
    tableLevels: sayiDizisi(d.tableLevels),
    lavaboLevel: negatifsiz(d.lavaboLevel),
    padsDone: metinKumesi(d.padsDone),
    padFills: sozluk(d.padFills, negatifsizSayiMi),
    upgradeFills: sayiDizisi(d.upgradeFills),
    tableUpgradeFills: sayiDizisi(d.tableUpgradeFills),
    lavaboFill: negatifsiz(d.lavaboFill),
    stats: {
      ...d.stats,
      teaPickups: negatifsiz(d.stats.teaPickups),
      teasServed: negatifsiz(d.stats.teasServed),
      tostServed: negatifsiz(d.stats.tostServed),
      coinsCollected: negatifsiz(d.stats.coinsCollected),
      dishesWashed: negatifsiz(d.stats.dishesWashed),
      waiterServed: negatifsiz(d.stats.waiterServed),
      waiterServedByService: sayiDizisi(d.stats.waiterServedByService),
      teasServedByArea: sayiDizisi(d.stats.teasServedByArea),
    },
    questsDone: metinKumesi(d.questsDone),
    goalsClaimed: metinKumesi(d.goalsClaimed),
    mastersOwned: metinKumesi(d.mastersOwned),
    daily,
    satin,
    questBase: negatifsiz(d.questBase),
    xp: negatifsiz(d.xp),
    floorThemeByArea: metinDizisi(d.floorThemeByArea),
    wallThemeByArea: metinDizisi(d.wallThemeByArea),
    ownedCosmetics: metinKumesi(d.ownedCosmetics),
    dekor: sozluk(d.dekor, metinMi),
    kafeAdi: typeof d.kafeAdi === 'string' ? d.kafeAdi : null,
    levelUp,
    sifirlamaNo: Math.floor(negatifsiz(d.sifirlamaNo)),
    kat: d.kat === 2 ? 2 : 1,
    kat2: {
      ...d.kat2,
      acik: d.kat2.acik === true,
      padsDone: metinKumesi(d.kat2.padsDone),
      // S3 (additive, D-182): eski kayıt → bütün masalar Sv1 · görev hattı baştan. Bozuk Sv düşer (Sv1), taşan kırpılır.
      masaSv: kat2SvSozluk(d.kat2.masaSv),
      gorev: kat2GorevKaydi(d.kat2.gorev),
    },
    kasa: gecerliTutar(d.kasa) ? d.kasa : '0',
    kasaOlcum: { para: negatifsiz(d.kasaOlcum.para), sn: negatifsiz(d.kasaOlcum.sn) },
  };
  return { data, red };
}

/**
 * Ham kaydı (JSON'dan çözülmüş nesne) bugünkü şemaya getirir: göç zinciri + derin birleştirme +
 * doğrulama. Yerel kayıt da bulut kaydı da (F4b) AYNI yoldan geçer — iki ayrı çözücü olsaydı biri
 * diğerinden saparda (D-015 dersi). `yeniSurum`: kayıt bu paketten yeni sürümle yazılmış (okunur ama
 * yazılmaz). `red`: doğrulamanın reddettiği alanlar — boş değilse bu kayıt aday olarak KULLANILMAZ.
 */
export function kayitCoz(parsed: Record<string, unknown>): { data: SaveData; yeniSurum: boolean; red: string[] } {
  // Zarf alanı kaydın parçası değil: buluttan/diskten gelse bile şemaya sızmaz.
  const { [ZARF]: _zarf, ...ham } = parsed;
  // Ayarlar HER yolda birleştirilir: yüzeysel yayılım eski kaydın eksik ayar alanlarını
  // `undefined` bırakırdı ve göç bunu yakalayamazdı (sürüm zaten güncel). Bkz. `ayarlariBirlestir`.
  const ayarla = (d: Record<string, unknown>): SaveData => {
    const b = derinBirlestir({ ...defaultSave(), sifirlamaNo: 0 }, d) as SaveData;
    return { ...b, saveVersion: SAVE_VERSION, settings: ayarlariBirlestir(d.settings) };
  };
  const yeniSurum = typeof ham.saveVersion === 'number' && ham.saveVersion > SAVE_VERSION;
  let birlesik: SaveData;
  if (ham.saveVersion === SAVE_VERSION || yeniSurum) birlesik = ayarla(ham);
  else {
    // Göç zinciri ADIM ADIM: her göç bir sonraki sürümü üretir (v31 → v33 → v34, v32 → v33 → v34).
    let d: Record<string, unknown> | null = ham;
    for (const goc of [migrateV31, migrateV32, migrateV33]) d = (d && goc(d)) ?? d;
    birlesik = d && d.saveVersion === SAVE_VERSION ? ayarla(d) : resetKeepingSettings(ham);
  }
  const { data, red } = kayitDogrula(birlesik);
  return { data, yeniSurum, red };
}

// ─── Zarf · yedek · karantina (Sprint A) ─────────────────────────────────────────────────────
/**
 * ZARF. Kayıt metni `{...SaveData, zarf: {v, n, sum}}`: `sum` gövdenin (zarfsız JSON) sağlaması,
 * `n` her yazımda artan sayaç. Gövde BİLEREK üst düzeyde (`data` alt nesnesinde değil): kaydı
 * okuyan duman denetimleri ve testler (`JSON.parse(kayıt).settings`) değişmeden çalışır, zarfsız
 * eski kayıt da aynı biçimdir. Sağlama gövdenin YENİDEN dizgeleştirilmesiyle doğrulanır:
 * JSON.stringify'ın ürettiği metin parse → stringify turunda birebir aynı kalır.
 */
const ZARF = 'zarf';
const ZARF_SURUMU = 1;
const YEDEK_SAYISI = 3;
/** Dönen yedek aralığı: en sık 5 dakikada bir, yalnız SAĞLAM ana kayıttan. */
const YEDEK_ARALIGI_MS = 5 * 60_000;
const YEDEK = (i: number) => `${KEY}.yedek.${i}`;
const BOZUK = `${KEY}.bozuk`;

/** FNV-1a 32 bit — kriptografik değil; amaç yarım/bozuk yazımı yakalamak. */
function saglama(metin: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

let sayac = 0;
let sonYedekAn = 0;

/** Kaydı zarflı metne çevirir (disk + bulut aynı biçim). */
export function kayitMetni(d: SaveData, n: number = sayac): string {
  const { [ZARF]: _eski, ...govdeNesne } = d as SaveData & { [ZARF]?: unknown };
  const govde = JSON.stringify(govdeNesne);
  return `${govde.slice(0, -1)},"${ZARF}":${JSON.stringify({ v: ZARF_SURUMU, n, sum: saglama(govde) })}}`;
}

interface Aday {
  ad: string;
  n: number;
  /** Sağlama tuttu (ya da zarfsız eski kayıt) ve doğrulama reddetmedi. */
  saglam: boolean;
  cozum: { data: SaveData; yeniSurum: boolean; red: string[] } | null;
}

function adayCoz(ad: string, ham: string): Aday {
  try {
    const obj = JSON.parse(ham) as unknown;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ad, n: 0, saglam: false, cozum: null };
    const o = obj as Record<string, unknown>;
    const z = o[ZARF] as { n?: unknown; sum?: unknown } | undefined;
    let tutuyor = true;
    let n = 0;
    if (z !== undefined) {
      const { [ZARF]: _z, ...govde } = o;
      tutuyor = !!z && typeof z === 'object' && z.sum === saglama(JSON.stringify(govde));
      n = z && sayiMi(z.n) ? z.n : 0;
    }
    const cozum = kayitCoz(o);
    return { ad, n, saglam: tutuyor && cozum.red.length === 0, cozum };
  } catch {
    return { ad, n: 0, saglam: false, cozum: null };
  }
}

/** Bulut kaydı metnini çözer; bozuksa (JSON/sağlama/doğrulama) null — üstüne yerel yazılır. */
export function kayitMetniCoz(ham: string): { data: SaveData; yeniSurum: boolean } | null {
  const a = adayCoz('bulut', ham);
  return a.saglam && a.cozum ? { data: a.cozum.data, yeniSurum: a.cozum.yeniSurum } : null;
}

/**
 * Açılışta kaydın başına ne geldi — UI bir kez not gösterir (metin anahtarları: Sprint A kayıt notu).
 * `yedekten`: ana kayıt bozuktu, son sağlam yedekten açıldı (en çok ~5-10 dk geri) ·
 * `onarildi`: hiç sağlam aday yoktu, okunabilen en iyi kayıt temizlenerek açıldı ·
 * `sifirdan`: hiçbir kayıt okunamadı, oyun baştan başladı. Üç durumda da ham veri `…save.bozuk`ta durur.
 */
export type KayitSorunu = 'yedekten' | 'onarildi' | 'sifirdan';
let sorun: KayitSorunu | null = null;
export const kayitSorunu = (): KayitSorunu | null => sorun;
export function kayitSorunuGoruldu(): void {
  sorun = null;
}

/** Ham veriyi karantinaya alır — ana kayıt sonra üstüne yazılsa da bozuk hâli kaybolmaz. */
function karantina(ana: string | null, yedekler: (string | null)[]): void {
  const onceki = kaliciOku(BOZUK);
  try {
    if (onceki && (JSON.parse(onceki) as { ana?: unknown }).ana === ana) return;
  } catch {
    /* bozuk karantina: üstüne yazılır */
  }
  kaliciYaz(BOZUK, JSON.stringify({ an: Date.now(), ana, yedekler }));
}

/** Karantinadaki ham kayıt (destek / elle kurtarma için); yoksa null. */
export const karantinadakiKayit = (): string | null => kaliciOku(BOZUK);

/**
 * KAYDI YÜKLE. Adaylar: ana kayıt (Preferences ve localStorage kopyası ayrıştıysa ikisi; büyük `n`
 * tazedir) → yedek.0..2 (büyük `n` önce). İlk SAĞLAM aday açılır. SESSİZ SIFIRLAMA YOK: hiç sağlam
 * aday yoksa ham veri karantinaya alınır, okunabilen en iyi kayıt temizlenip açılır (`onarildi`),
 * o da yoksa oyun baştan başlar (`sifirdan`) — ve oyuncu not görür.
 */
export function loadSave(): SaveData {
  sorun = null;
  const anaHam = kaliciOku(KEY);
  const yerelHam = kaliciYerelOku(KEY);
  const yedekHam = Array.from({ length: YEDEK_SAYISI }, (_, i) => kaliciOku(YEDEK(i)));
  const anaAdaylar = [anaHam, yerelHam !== anaHam ? yerelHam : null]
    .map((h, i) => (h ? adayCoz(i === 0 ? 'ana' : 'yerel', h) : null))
    .filter((a): a is Aday => a !== null);
  // Yedek sayacı: yedek.0'ın yazıldığı an; yedek yoksa ilk yedek bu oturumun 5. dakikasında.
  const yedek0 = yedekHam[0] ? adayCoz('yedek.0', yedekHam[0]) : null;
  sonYedekAn = yedek0?.cozum?.data.lastSaved ?? Date.now();
  if (anaAdaylar.length === 0 && yedekHam.every((h) => !h)) {
    sayac = 0;
    yazmaKilidi = false;
    return defaultSave();
  }
  const enTaze = (l: Aday[]) => l.filter((a) => a.saglam).sort((a, b) => b.n - a.n)[0];
  let secilen: Aday | undefined = enTaze(anaAdaylar);
  if (!secilen) {
    const yedekler = yedekHam
      .map((h, i) => (i === 0 ? yedek0 : h ? adayCoz(`yedek.${i}`, h) : null))
      .filter((a): a is Aday => a !== null);
    secilen = enTaze(yedekler);
    karantina(anaHam ?? yerelHam, secilen ? [] : yedekHam);
    if (secilen) sorun = 'yedekten';
    else {
      secilen = [...anaAdaylar, ...yedekler].find((a) => a.cozum);
      sorun = secilen ? 'onarildi' : 'sifirdan';
    }
  }
  if (!secilen?.cozum) {
    sayac = Math.max(0, ...anaAdaylar.map((a) => a.n));
    yazmaKilidi = false;
    return defaultSave();
  }
  const { data, yeniSurum } = secilen.cozum;
  sayac = Math.max(secilen.n, ...anaAdaylar.map((a) => a.n));
  sifirlamaNo = data.sifirlamaNo;
  yazmaKilidi = yeniSurum;
  return data;
}

/** Ana kayıt sağlamsa ve son yedekten ≥ 5 dk geçtiyse yedekleri döndürür (yedek.0 = şimdiki ana). */
function yedekDondur(an: number): void {
  if (an - sonYedekAn < YEDEK_ARALIGI_MS) return;
  const ana = kaliciOku(KEY);
  if (!ana || !adayCoz('ana', ana).saglam) return;
  for (let i = YEDEK_SAYISI - 1; i > 0; i--) {
    const v = kaliciOku(YEDEK(i - 1));
    if (v) kaliciYaz(YEDEK(i), v);
  }
  kaliciYaz(YEDEK(0), ana);
  sonYedekAn = an;
}

export function writeSave(data: SaveData): void {
  if (yazmaKilidi) return;
  try {
    const an = Date.now();
    yedekDondur(an);
    sayac += 1;
    kaliciYaz(KEY, kayitMetni({ ...data, lastSaved: an }, sayac));
  } catch {
    /* quota / private mode — sessiz geç */
  }
}

/** Bilinçli sıfırlama: kayıt + yedekler silinir, `sifirlamaNo` artar (karantina durur). */
export function clearSave(): void {
  yazmaKilidi = false;
  sorun = null;
  sifirlamaNo += 1;
  sonYedekAn = Date.now();
  kaliciSil(KEY);
  for (let i = 0; i < YEDEK_SAYISI; i++) kaliciSil(YEDEK(i));
}
