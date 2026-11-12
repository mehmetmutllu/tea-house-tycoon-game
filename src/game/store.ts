import { create } from 'zustand';
import { KABUK_VARSAYILAN, type KabukKipi } from '../config/kabuk';
import { Decimal, D } from './decimal';
import type { Coin, Dish, Npc, Vec3, Waiter } from './types';
import {
  economyConfig as C,
  cupPoolCapacity,
  waiterSpeedNextCost,
  waiterSpeedMaxTier,
  dishSpeedNextCost,
  dishSpeedMaxTier,
  charMaxTier,
  charNextCost,
  waiterTrayMaxTier,
  waiterTrayNextCost,
  dishCarryNextCost,
  dishCarryMaxTier,
  type WaiterUpgrades,
  type ProductId,
  trayCapacityFor,
  type CharStat,
  type CharUpgrades,
  lavaboMaxLevel,
  lavaboUpgradeCost,
  tableUpgradeCost,
} from '../config/economy.config';
import {
  defaultSave,
  defaultStats,
  defaultSettings,
  defaultCharUpgrades,
  defaultWaiterUpgrades,
  defaultReklam,
  defaultSatinAlim,
  loadSave,
  writeSave,
  clearSave,
  type SaveData,
  type SaveStats,
  type SaveSettings,
  type ReklamSayaci,
  type SatinAlim,
} from './save';
import { KAFE_ADI_VARSAYILAN, kafeAdiOku, kafeAdiTemizle } from './kafeAdi';
import { dekorAcik, dekorDegistir, satinBildirimi, vitrinSahip, vitrinUrunu, type DekorYerlesim, type VitrinTuru } from './vitrin';
import { reklamsizAyarla } from './ads';
import type { Islem } from './iap';
import { magazaUzlas, type MusteriOzu } from './satinAlimUzlas';

import {
  LAYOUT,
  openServices,
  servicePlace,
  waiterHomeAt,
} from './layout';
import { areaOfTable as areaOfTableIdx, deriveWorld, defaultFloorTheme, MAX_AREAS, MAX_SERVICES, roomOpen, sellsTost, THE_SERVICE, type World } from './world';
import { activeQuestIndex, completedQuestIds, eksikPadGorevi } from './questProgress';
import {
  dayIndex,
  defaultDaily,
  rollDaily,
  claimDailyReward,
  type DailyState,
  type DailyContext,
  type DailyCounters,
} from './dailyQuests';
import { claimGoalReward, collectionMult, type GoalMetrics } from './goals';
// Dünya modeli (ALAN · SERVİS · MASA · ODA) Faz B1'de world.ts'e ayrıldı; store aynı kapıdan sunar.
export {
  deriveWorld,
  defaultFloorTheme,
  serviceOfTable,
  serviceMenu,
  sellsTost,
  isCounter,
  tostShare,
  areaOfTable,
  tablesInArea,
  THE_SERVICE,
  MAX_AREAS,
  MAX_SERVICES,
  MAX_WAITERS,
  MAX_TABLES,
  areaTableStart,
  areaTableSlots,
  tableKindOf,
} from './world';
export type { World, Area, Service, Table, Room } from './world';
// Yerleşim/geometri Faz A2'de layout.ts'e taşındı; eski `from './store'` importları kırılmasın diye
// buradan yeniden dışa aktarılır (tek tanım, iki kapı).
export {
  LAYOUT,
  LAVABO,
  PAD_RADIUS,
  BAND,
  BAND_SHELL,
  FLOOR_HALF,
  wallSpans,
  hasAreaNeighbor,
  servicePlace,
  serviceInArea,
  serviceMoved,
  boxDist2D,
  atServiceBody,
  atTableBody,
  tableHalfFor,
  openServices,
  parkSpot,
  parkClearance,
  BANKET,
  banketLen,
  banketColSpan,
  banketUnit,
  banketUnitsOpen,
  banketIslands,
  WAITER_STATION,
  waiterStationOpen,
  waiterHomeAt,
  staffIdleSpots,
  WAITER_HOME_GAP,
  doorX,
  entranceAt,
  streetAt,
} from './layout';
export type { ServicePlace, AreaSide, BanketIsland, SeatKind } from './layout';
export type { RVec3 } from './layout';

import {
  SAVE_INTERVAL,
  CAM_FOCUS_TTL,
  keepIdentity,
  totalCupPool,
  tableSoftMaxLevel,
  masterUnlockedForTable,
  masterCost,
  masterAdsLeft,
  spendMasterAd,
  videoRights,
  spendVideoRight,
  videoReward,
  offlineWatchExtra,
  applyPurchase,
  adFreeDailyReady,
  stationSoftMaxLevel,
  stationUpgradeCost,
  incomeRate,
  revealKeys,
  questView,
  questCounterValue,
  questFocusPos,
  tableUpgradeTarget,
  gateOf,
  computeOfflineEarned,
  type ActiveSpot,
  type GameNotice,
  type LevelUpOdul,
  type QuestView,
  type CamFocus,
  tableThemeUnlocked,
} from './rules';
// Kurallar Faz A2'de rules.ts'e taşındı; eski `from './store'` importları kırılmasın diye yeniden
// dışa aktarılır (tek tanım, iki kapı).
export {
  FILL_TEA,
  FILL_TABLE,
  TEA_PRICE,
  brewTime,
  brewThroughputMult,
  incomeRate,
  dirtyTables,
  totalCupPool,
  occupiedSeats,
  findTableForGroup,
  visiblePads,
  currentPad,
  availableOptionalPads,
  revealKeys,
  stationUpgradeUnlocked0,
  stationUpgradeUnlocked,
  tableUpgradeUnlocked,
  tableUpgradeUnlockedIn,
  tableUpgradeTarget,
  gateOf,
  tableSoftMaxLevel,
  tableNextCost,
  tableThemeUnlocked,
  stationSoftMaxLevel,
  stationUpgradeCost,
  stationUpgradeCostAt,
  computeOfflineEarned,
  questTargetMet,
  questCounterValue,
  questFocusPos,
} from './rules';
export type { ActiveSpot, GameNotice, LevelUpOdul, QuestView, QuestCtx, CamFocus } from './rules';

import { createTickCtx, runTick, BOS_LEGEN, type Legen } from './tick';
import { GECIS_SN, VARIS, baslangicKati, defaultKat2, kat2Adim, kat2Engeller, kat2Etkin, merdivenTetik, type Kat2Kayit, type KatGecis, type KatNo } from './kat';
import { attractRadiusFor, economyConfig, playerSpeedFor } from '../config/economy.config';
import { kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya } from './kat2Dongu';
import { t } from '../i18n';


/**
 * G-78 — KAYITTAN OKUNAN KISMİ YÜKSELTME DOLUMU, kelepçeli.
 *
 * Dolum kaydedilir (oyuncunun ödediği para yanmasın) ama körü körüne geri yazılmaz: `cost`
 * bugünkü bir sonraki seviyenin maliyetidir ve dolum onu AŞAMAZ. İki hâli birden karşılar —
 * ① kayıt bozuk/elle kurcalanmış, ② denge turunda maliyet DÜŞMÜŞ (eski dolum yeni fiyatı aşıyor).
 * `cost` null ise (o merdiven bitmiş, alınacak seviye yok) dolum anlamsızdır → 0.
 */
function kismiDolum(ham: unknown, cost: number | null): number {
  if (cost == null || !(cost > 0)) return 0;
  return typeof ham === 'number' && Number.isFinite(ham) ? Math.min(Math.max(0, ham), cost) : 0;
}

/** Oyuncunun tepsi kapasitesi (tek turda taşınan çay/kirli) — karakter tepsi kademesinden türetilir
 *  (v20; D-018'in "sabit" kararı karakter yükseltmeleriyle değişti). Arg'sız çağrı canlı store'dan okur
 *  (devHooks/testler geri-uyumu). */
export function trayCapacity(tier?: number): number {
  return trayCapacityFor(tier ?? useGame.getState().charUpgrades.tray);
}


/**
 * HEDEF SAYAÇLARI (D3/D-089) — beş kategorinin okuduğu değerler TEK yerde durumdan türetilir.
 * HUD kendi başına sayı hesaplamaz: D3 öncesi `GoalsSheet` bunu içinde yapıyordu ve eşikleri de
 * kendi tutuyordu, yani hedefler ölçüm aracının göremediği bir yerde yaşıyordu.
 */
/**
 * B11 (T9d · D-146): EKRANDA görünen cüzdan. Çevrimdışı ₺ yüklemede cüzdana YAZILIR (kapatılırsa
 * kaybolmasın — A7'nin dersi), ama ödül ekranı açıkken üst şerit onu henüz göstermez: "Al" basılınca
 * sayı büyür. Eskiden şerit ödülü zaten içeriyordu ve "Al" hiçbir şey eklemiyor gibi görünüyordu.
 */
export const gorunenCuzdan = (s: { wallet: Decimal; offlineEarned: number }): Decimal =>
  s.offlineEarned > 0 ? Decimal.max(0, s.wallet.sub(s.offlineEarned)) : s.wallet;

/**
 * KAYIT GÖRÜNTÜSÜ — diske yazılan da (`saveNow`) buluta giden de (F4b) bu. Tek yerde kurulur ki
 * iki kayıt yolu birbirinden sapmasın.
 */
export function kayitVerisi(s: GameState): SaveData {
  // K8 (D-146): yerdeki para kayıtta cüzdandadır — uygulama kapanınca yanmasın. Canlı durumda
  // paralar yerde kalır (toplama oyunun döngüsü); yalnız YAZILAN cüzdan onları içerir. Kayıt
  // yüklenince yerde para yoktur → çift sayım olmaz.
  let yerde = 0;
  for (const c of s.coins) yerde += c.value;
  // D-015: tables/stations/hasWaiter KAYDEDİLMEZ — yüklemede padsDone'dan türetilir.
  return {
    ...defaultSave(),
    wallet: s.wallet.add(yerde).toString(),
    diamonds: s.diamonds.toString(),
    lifetime: s.lifetime.add(yerde).toString(),
    stationLevels: [...s.stationLevels],
    tableLevels: [...s.tableLevels],
    lavaboLevel: s.lavaboLevel,
    padsDone: [...s.padsDone],
    padFills: { ...s.padFills },
    // G-78: kısmi ödenmiş yükseltmeler de kayda gider. `padFills` zaten gidiyordu; bu üçü
    // gitmediği için oyuncunun yarım bıraktığı yükseltmeye ödediği para her yüklemede yanıyordu.
    upgradeFills: [...s.upgradeFills],
    tableUpgradeFills: [...s.tableUpgradeFills],
    lavaboFill: s.lavaboFill,
    stats: { ...s.stats },
    // D-088: kayda index DEĞİL kimlik gider — hat değişse de kaydın yeri kaymasın.
    // index'in gerisindekiler de eklenir: dev kancası/sandbox index'i ileri atabilir.
    questsDone: [...new Set([...s.questsDone, ...completedQuestIds(C.quests, s.questIndex)])],
    goalsClaimed: [...(s.goalsClaimed ?? [])],
    mastersOwned: [...(s.mastersOwned ?? [])],
    reklam: { ...s.reklam },
    satin: { ...s.satin, islenen: [...s.satin.islenen] },
    daily: { ...s.daily, ids: [...s.daily.ids], base: { ...s.daily.base }, claimed: [...s.daily.claimed] },
    questBase: s.questBase,
    questBaseId: C.quests[s.questIndex]?.id ?? '',
    xp: s.xp,
    settings: { ...s.settings },
    floorThemeByArea: [...s.floorThemeByArea],
    wallThemeByArea: [...s.wallThemeByArea],
    tableTheme: s.tableTheme,
    kitchenTheme: s.kitchenTheme,
    ownedCosmetics: [...s.ownedCosmetics],
    outfit: s.outfit,
    trayLook: s.trayLook,
    dekor: { ...s.dekor },
    kafeAdi: s.kafeAdi,
    charUpgrades: { ...s.charUpgrades },
    waiterUpgrades: { ...s.waiterUpgrades },
    charPanelSeen: s.charPanelSeen,
    trayTipSeen: s.trayTipSeen,
    washTipSeen: s.washTipSeen,
    ogreticiAtlandi: s.ogreticiAtlandi,
    // A7: alınmamış ₺'li seviye ödülü kayda gider (ekran açıkken kapanırsa yanmasın).
    levelUp: s.levelUp && s.levelUp.amount > 0 ? { ...s.levelUp } : null,
    // Geçiş sürerken kayıt HEDEF katı yazar (perde inerken kapanırsa oyuncu vardığı katta açılır).
    kat: s.katGecis?.hedef ?? s.kat,
    kat2: { ...s.kat2, padsDone: [...s.kat2.padsDone] },
    lastSaved: Date.now(),
  };
}

export function goalMetricsOf(s: {
  stats: { teasServed: number; waiterServed: number; dishesWashed: number };
  padsDone: readonly string[];
  lifetime: Decimal;
  tableLevels: readonly number[];
  tables: number;
}): GoalMetrics {
  return {
    served: s.stats.teasServed + s.stats.waiterServed,
    pads: s.padsDone.length,
    lifetime: Math.max(0, Math.floor(s.lifetime.toNumber())),
    dishes: s.stats.dishesWashed,
    masterTables: s.tableLevels.slice(0, s.tables).filter((l) => l >= tableSoftMaxLevel()).length,
  };
}

/**
 * GÜNLÜK GÖREV GİRDİLERİ (D8) — sayaçlar ve gate'ler TEK yerde durumdan türetilir; `goalMetricsOf`
 * deseninin aynısı. HUD ne sayaç toplar ne gate bakar.
 */
export function dailyCountersOf(s: {
  stats: {
    teasServed: number; waiterServed: number; dishesWashed: number;
    coinsCollected: number; teaPickups: number; tostServed: number;
  };
  lifetime: Decimal;
}): DailyCounters {
  return {
    served: s.stats.teasServed + s.stats.waiterServed,
    hand: s.stats.teasServed,
    coins: s.stats.coinsCollected,
    dishes: s.stats.dishesWashed,
    earn: Math.max(0, Math.floor(s.lifetime.toNumber())),
    pickup: s.stats.teaPickups,
    waiter: s.stats.waiterServed,
    tost: s.stats.tostServed,
  };
}

/** Havuz gate'lerinin ve hedef ölçeğinin baktığı dünya — yalnız gün DÖNÜMÜNDE okunur. */
export function dailyContextOf(s: {
  tables: number;
  waiters: readonly unknown[];
  stationLevels: readonly number[];
}): DailyContext {
  return {
    tables: s.tables,
    hasWaiter: s.waiters.length > 0,
    tostOpen: sellsTost(s.stationLevels[THE_SERVICE] ?? 0),
  };
}

export interface GameState {
  // Kalıcı
  wallet: Decimal;
  diamonds: Decimal;
  lifetime: Decimal;
  tables: number;
  stations: number;
  /** Açık ALAN sayısı (deriveWorld anlık görüntüsü; 1 = yalnız 1. alan). */
  areasOpen: number;
  /** SERVİS başına ocak seviyesi (persist v18; D-022). */
  stationLevels: number[];
  /** Masa-başı yükseltme seviyeleri (Faz 2h; persist; index = GLOBAL masa slotu; bahşiş + sabır). */
  tableLevels: number[];
  /** ODA: lavabo seviyesi (persist; 0 = oda kapalı, pad açılınca 1). B4 — gelir kolu buradan okunur. */
  lavaboLevel: number;
  padsDone: string[];
  /** Aktif pad'lerin kısmi dolumu (pad id → ₺). Eş zamanlı omurga + opsiyonel için kayıt (v5). */
  padFills: Record<string, number>;
  // Transient (kaydedilmez — D-011 servis durumu yeniden kurulur)
  player: Vec3;
  npcs: Npc[];
  coins: Coin[];
  /** Oto-toplanan ama henüz toast'la bildirilmemiş ₺ (transient; toplu bildirim birikimi). */
  autoCollectSum: number;
  /** Oto-toplama toast'ının yeniden çıkabilmesine kalan sn (transient; spam önleme). */
  autoCollectToastCooldown: number;
  npcCount: number;
  /** GLOBAL garson havuzu (B2): düz liste, uzunluk = tutulmuş garson sayısı (0..MAX_WAITERS).
   *  Konum/tepsi transient, her oturumda kurulur. Eskiden servis başına `waiters`+`waiters2` idi. */
  waiters: Waiter[];
  /** Katın TEK bulaşıkçısı (yoksa null) — konum/taşıdığı kirli transient. */
  dishwasher: Waiter | null;
  /** Leğende bekleyen kirliler (D-143, transient — yüklemede temiz havuza katılır). */
  legen: Legen;
  /** Servisin HAZIR ürünleri — ÜRÜN başına (B2: tek nokta, seviyeye göre iki ürün). */
  ready: Record<ProductId, number>;
  /** Ürün başına birikmiş hazırlama süresi (sn); tezgâh aynı anda tek kalem hazırlar. */
  brewProgress: Record<ProductId, number>;
  /** Oyuncunun tepsisinde taşıdığı çay sayısı. */
  tray: number;
  /** Oyuncunun tepsisinde taşıdığı TOST sayısı (M3 ikinci ürün hattı; kapasite tray+trayFood+
   *  carriedDirty toplamı üzerinden PAYLAŞIMLIDIR). */
  trayFood: number;
  /** Temiz bardak havuzu — GLOBAL tek depo (servisler ortak; korunum değişmezi global kalır). Faz 2e. */
  cleanCups: number;
  /** Masalarda bekleyen kirli bardaklar (mekânsal nesneler). */
  dishes: Dish[];
  /** Oyuncunun bulaşığa götürmek için taşıdığı kirli bardak. */
  carriedDirty: number;
  /** Oyuncunun taşıdığı kirli TABAK (tost bulaşığı; turu-5 m.11 — tepside tabak çizilir).
   *  Transient; yıkama/havuz bardakla ORTAK, yalnız görsel için ayrı sayılır. */
  carriedDirtyFood: number;
  /** SERVİS başına ocak-yükseltme noktası kısmi dolumu (transient; D-018 dwell). */
  upgradeFills: number[];
  /** Masa-başı yükseltme noktalarındaki kısmi dolum (transient; index = GLOBAL masa slotu). */
  tableUpgradeFills: number[];
  /** Lavabo yükseltme noktasının kısmi dolumu (transient; D-018 dwell — çıkınca sıfırlanmaz). */
  lavaboFill: number;
  activeSpot: ActiveSpot | null;
  /** Yeni-özellik toast'u (D-019 §4) — transient; null ise gösterilmez. AYNI ANDA tek toast. */
  notice: GameNotice | null;
  /** Bekleyen toast kuyruğu (transient): bitiş/reveal/seviye sırayla gösterilir, birbirini ezmez. */
  noticeQueue: GameNotice[];
  /** D-142: seviye atlama ödül ekranı (transient; "Al" basılınca ₺ cüzdana geçer). */
  levelUp: LevelUpOdul | null;
  /** D-142: seviye ₺'sinin kazanç izi — `lifetime` örnekleri (transient, `tick.ts` yazar). */
  gelirIzi: number[];
  gelirIziT: number;
  /** Bu oturumda zaten bildirilmiş reveal anahtarları (transient; init'te açık olanlarla doldurulur). */
  revealSeen: string[];
  /** Kalıcı eylem sayaçları (quest + arka-plan reveal şartları; v16 persist). */
  stats: SaveStats;
  /** TOPLANMIŞ hedef kimlikleri (D3/D-089). Hedeflerin konumu SAKLANMAZ — `goals.ts` bu listeden
   *  türetir (`questsDone` deseni, D-088). */
  goalsClaimed: string[];
  /** USTA olmuş objelerin KİMLİKLERİ (D7a · D-093). "Kaç Usta aldım" saklanmaz — tick
   *  çarpanı (`masterTipsOf`) ve hedef sayaçları bu listeden türer (`goalsClaimed` deseni). */
  mastersOwned: string[];
  /** F3b (D-150): ödüllü videonun günlük Usta hakkı + video hakkı penceresi (kayıtta). */
  reklam: ReklamSayaci;
  /** F4a (D-152): satın alımların önbelleği. Reklamsızlık bayrağı `ads.ts`e buradan iner. */
  satin: SatinAlim;
  /** D8: bugünün günlük görevleri (gün · kimlikler · sayaç tabanı · toplananlar). Gün dönümü
   *  `store.tick`te bakılır — `tick.ts`e (denge dosyası) DOKUNULMAZ, `saveTimer` deseni. */
  daily: DailyState;
  /** D8: oyuncunun YANINDA duran Usta noktasının kimliği (`table:3`) ya da `null`. GEÇİCİ —
   *  kaydedilmez. Sahne katmanı `useFrame` içinde hesaplar ve yalnız hedef DEĞİŞİNCE yazar
   *  (oyuncu konumuna abone olmak HUD'u saniyede 60 kez yeniden çizerdi). */
  nearMaster: string | null;
  /** K4: oyuncunun KAPATTIĞI Usta noktası — o noktadan çıkana kadar yeniden dolmaz (GEÇİCİ). */
  ustaKapali: string | null;
  /** Sıradaki görevin index'i (>= quests.length ⇒ görev hattı bitti). `questsDone`'dan türer
   *  (yükleme + görev bitişi); pad onarımı (Y-23) onu GERİ çekebilir, liste geri gitmez. */
  questIndex: number;
  /** Tamamlanmış görev kimlikleri — KAYDIN kaynağı (D-088). Geri çekilen index bunları silemez,
   *  yeniden tamamlanan görev ikinci kez ödenmez (Sprint A P3). */
  questsDone: string[];
  /** Aktif sayaç görevinin başlangıç sayaç değeri (persist; delta hedefi tabanı). */
  questBase: number;
  /** Toplam oyuncu XP'si (persist v17). Seviye `levelProgress(xp)` ile türetilir — ayrı saklanmaz. */
  xp: number;
  /** Oyuncu ayarları (persist v17): ses/müzik/bildirim. */
  settings: SaveSettings;
  /** Kozmetik mağaza (persist v19, WP6): ALAN başına seçili tema + sahiplikler (`kind:id:zN`). */
  floorThemeByArea: string[];
  wallThemeByArea: string[];
  /** GLOBAL masa teması (persist v30): mobilya minder+örtü rengi (recolor atlas). */
  tableTheme: string;
  /**
   * GLOBAL mutfak teması (persist v33, S4): tezgâh üstü + dolap gövdesi + zemin damasının rengi.
   * Masa temasıyla aynı desen (alansız, tek sahiplik anahtarı) — mutfak tek bir oda.
   * Renkler KayKit atlasının kendi gözlerinden gelir; uygulama UV taşımayla (`atlasUV`).
   */
  kitchenTheme: string;
  /**
   * DUVAR KABUĞU KİPİ (S4) — `'maket'` maketin üç katmanı, `'kaykit'` KayKit modülleri.
   *
   * KAYDA GİRMEZ (bilerek): kullanıcı takası *deneme* olarak istedi (*"beğenmezsek eskisine
   * dönebilir olalım"*), yani bu bir oyuncu ilerlemesi değil bir GELİŞTİRME AYARI. Kayda
   * girseydi `saveVersion` + migrasyon gerekirdi ve geri dönüş eski kayıtları da etkilerdi.
   * Varsayılanı `config/kabuk.ts` verir; `__kabuk()` dev kancası ve DevSandbox canlı çevirir.
   */
  kabuk: KabukKipi;
  ownedCosmetics: string[];
  /** F4c 💎 vitrini (additive): sahibin kıyafeti + tepsi görünümü. Giyilen = `gecerliKiyafet`. */
  outfit: string;
  trayLook: string;
  /** F4c-2 💎 dekor: yuva → duran ürün. Çizilen = `gorunenDekor` (sahiplik + yuva açık). */
  dekor: DekorYerlesim;
  /** F4c-4 (D-157): mağazada ÖNİZLENEN dekor — sahnede kendi yuvasında geçici çizilir. KAYDA GİRMEZ. */
  dekorOnizleme: string | null;
  /** F4c-3 (D-156): kafenin adı (tabela). `null` = hiç sorulmadı → açılışta ad kutusu. */
  kafeAdi: string | null;
  /** Karakter yükseltme kademeleri (persist v20): tepsi/mıknatıs/hız. Karakter seviyesi türetilir. */
  charUpgrades: CharUpgrades;
  /** Garson tepsi yükseltme kademeleri (persist v27/Y3): çay garsonları ortak + tostçu ayrı. */
  waiterUpgrades: WaiterUpgrades;
  /** Karakter paneli ilk-sefer spotlight'ı görüldü mü (persist v20). */
  charPanelSeen: boolean;
  /** Tepsi-boşalt butonu ilk-sefer spotlight'ı görüldü mü (persist v23). */
  trayTipSeen: boolean;
  /** Bulaşık öğretme kartı görüldü mü (G-63; `trayTipSeen` deseni — persist, additive). */
  washTipSeen: boolean;
  /** E5: ilk dakikaların öğreticisi atlandı (persist). */
  ogreticiAtlandi: boolean;
  /** Üst görev barı görünümü (transient; her tick türetilir; null = hat bitti). */
  quest: QuestView | null;
  /** Görev geçiş fazı (transient): active=normal, completing=bitiş flash, gap=yeni görev öncesi boşluk. */
  questPhase: 'active' | 'completing' | 'gap';
  /** Görev geçiş fazı geri sayımı (transient, sn). */
  questPhaseT: number;
  /** Kutlama fazında EKRANDA gösterilen (biten) görevin index'i; -1 = yok (transient).
   *  questIndex bitiş ANINDA ilerler (taban yarışı yok), kart 1,3 sn daha bunu gösterir. */
  questDoneIndex: number;
  /** Kamera odak isteği (transient): görev barına dokununca / yeni şey açılınca hedefe pan. */
  camFocus: CamFocus | null;
  /** Kutlama penceresinde BEKLETİLEN odak (transient; G-44): yeni görev kartı gelince salınır.
   *  Alan açılışının panı bitişin kendi tick'inde isteniyor — 1,30 sn erken. Silinmiyor,
   *  sıraya alınıyor (`tick.ts` geçiş kapısı · docs/serit-raporu-g1.md §Bulgular 4). */
  camBekleyen: { pos: [number, number, number]; prio: number } | null;
  /** Genel-bakış zoom'u (transient): HUD kamera butonu AÇIKKEN kamera uzaklaşır (salonu görmek için). */
  camZoomOut: boolean;
  offlineEarned: number;
  /** F3b (D-150): çevrimdışı ekranında "İzle"nin eki (transient; 0 → düğme çizilmez). */
  offlineIzleEki: number;
  /** T9c/A3: arka plana geçiş anı (epoch ms, transient). Sıcak dönüşte çevrimdışı gelir buradan sayılır. */
  gizlendiAt: number | null;
  // Dahili
  spawnTimer: number;
  /** Spawn round-robin ALAN imleci (transient): grup dağılımı alanlar arası adil olsun. */
  spawnArea: number;
  saveTimer: number;
  nextId: number;
  inputKeyboard: [number, number];
  inputJoystick: [number, number];
  /** K2-2: oyuncunun bulunduğu kat. Kat 2'deyken Kat 1 kendi başına işler (`kat.ts`). */
  kat: KatNo;
  /** K2-2: Kat 2'nin kaydı (merdiven açık mı + ilerlemesi). */
  kat2: Kat2Kayit;
  /** Süren merdiven geçişi (transient): perde iner → kat değişir → perde kalkar. */
  katGecis: KatGecis | null;
  /** K2-3: Kat 2'nin anlık dünyası (masalar, ocak, tepsi, yığınlar — transient; kalıcı olan `kat2.padsDone`). */
  kat2Dunya: Kat2Dunya;
  // Aksiyonlar
  init: () => void;
  tick: (dt: number) => void;
  setKeyboardInput: (x: number, z: number) => void;
  setJoystickInput: (x: number, z: number) => void;
  upgradeStation: () => boolean;
  addMoney: (amount: number) => void;
  /** Görev barına dokununca: kamera aktif görevin hedefine kayar (görev yoksa no-op). */
  focusQuest: () => void;
  /** G-63: kamerayı bulaşık tezgâhına çevirir (öğretme kartı açılırken). */
  focusDish: () => void;
  /** Hedef ödülünü topla (D3/D-089). Toplanabilir değilse hiçbir şey yapmaz ve `false` döner. */
  claimGoal: (id: string) => boolean;
  /** D-142: seviye ödül ekranını kapatır ve ₺'yi cüzdana geçirir. */
  claimLevelUp: (izledi?: boolean) => void;
  /** D-093: USTA basamağını 💎 ile satın al. Kimlik `masterId()` kalıbında (`table:3`). */
  buyMaster: (id: string) => boolean;
  /** F3b (D-150): Usta'yı ödüllü videoyla aç — 💎 yerine günlük hak (`rewarded.masterPerDay`). */
  buyMasterAd: (id: string) => boolean;
  /** F3b (D-150): video hakkını kullan → son `video.incomeSec` sn'nin ₺'si cüzdana. Hak yoksa 0. */
  claimVideo: () => number;
  /** F4a: mağazanın onayladığı işlemin ödülü. Verilen 💎 (0 olabilir); işlem tanınmıyorsa ya da
   *  daha önce işlendiyse null. */
  satinAlimIsle: (islem: Islem) => number | null;
  /** Sprint A (P2): mağazanın müşteri bilgisi (açılış · dinleyici · geri yükleme · satın alma dönüşü)
   *  kayda uygulanır — işlenmemiş işlemler bir kez ödenir, reklamsız asimetrik eşitlenir. Verilen 💎. */
  magazaUzlasUygula: (m: MusteriOzu) => number;
  /** F4b: buluttaki daha ileri kaydı yükle (`bulut.ts` birleştirilmiş kaydı verir). */
  bulutKaydiYukle: (d: SaveData) => void;
  /** F4a: reklamsızın bugünkü 💎'ını al. Hazır değilse 0. */
  claimAdFreeDaily: () => number;
  /** D8: bugünün bir günlük görevinin 💎 ödülünü al. Eşik doğrulaması `dailyQuests.ts`te.
   *  `gorulenGun`: ödül kartının açıldığı gün — gün o arada döndüyse önceki günün hazır ödülü verilir. */
  claimDailyQuest: (id: string, izledi?: boolean, gorulenGun?: number) => boolean;
  /** Sahne katmanı çağırır: oyuncunun menzilindeki Usta noktası (yoksa `null`). */
  setNearMaster: (id: string | null) => void;
  /** K4: Usta penceresi kapatıldı → nokta, oyuncu çıkıp yeniden basana kadar kilitli. */
  closeMaster: () => void;
  toggleCamZoomOut: () => void;
  setKabuk: (kip: KabukKipi) => void;
  /** Ayar değiştir (ayarlar modalı) — anında kaydedilir. */
  /** Ayar yaz. Değer tipi anahtara göre: anahtarlar boolean, SEVİYELER sayı (0..1 — D-122). */
  setSetting: <K extends keyof SaveSettings>(key: K, value: SaveSettings[K]) => void;
  /**
   * Kozmetik tema satın al/uygula (WP6): ALAN AÇIK olmalı; ilk satın alma ₺ düşer (cüzdan yetmezse
   * false), sahip olunan tema ücretsiz yeniden seçilir. Başarıda anında kaydedilir.
   */
  buyCosmetic: (kind: 'floor' | 'wall' | 'table' | 'kitchen', id: string, area: number) => boolean;
  /** F4c: 💎 vitrini — sahip değilse 💎 düşer (yetmezse/paket ürünüyse false), sahipse giyer.
   *  Dekor (F4c-2): yuvası kapalıysa false; sahipse yuvasına koyar, zaten oradaysa KALDIRIR. */
  buyGemCosmetic: (kind: VitrinTuru, id: string) => boolean;
  /** F4c: başlangıç paketi teklifi kapandı — bir daha çıkmaz. */
  baslangicTeklifKapat: () => void;
  /** F4c-4 (D-157): mağazanın Dekor sekmesi önizlenen ürünü bildirir (`null` = önizleme yok). */
  setDekorOnizleme: (id: string | null) => void;
  /** F4c-3 (D-156): kafeye ad ver (girişte ya da Ayarlar'dan). Boş → varsayılan ad. */
  kafeAdiKoy: (ad: string) => void;
  /**
   * Karakter özelliği satın al (v20, karakter paneli): cüzdan yeterliyse kademe +1 (yetmezse/max'taysa
   * false). Başarıda anında kaydedilir; charStat görevi varsa sonraki tick'te tamamlanır.
   */
  buyCharUpgrade: (stat: CharStat) => boolean;
  /** Garson tepsi kademesi satın al (Y3, garson sekmesi): B2'de tek havuz → tek eğri. */
  buyWaiterTray: () => boolean;
  /** Bulaşıkçı leğen kademesi satın al (v28, Bulaşıkçı sekmesi): tüm salonların bulaşıkçılarına ortak. */
  buyDishCarry: () => boolean;
  /** Garson hız kademesi satın al (v29, garson sekmesi): havuza ortak. */
  buyWaiterSpeed: () => boolean;
  /** Bulaşıkçı hız kademesi satın al (v29, Bulaşıkçı sekmesi): tüm salonlara ortak. */
  buyDishSpeed: () => boolean;
  /** Karakter paneli ilk-sefer spotlight'ını kapat (butona dokununca; persist — bir daha çıkmaz). */
  markCharPanelSeen: () => void;
  /**
   * Tepsiyi boşalt (v23, telefon turu-2): tepsideki ÇAYLAR atılır, bardakları temiz havuza döner
   * (korunum bozulmaz; çay ziyan = küçük bedel, istismarı engeller). Taşınan KİRLİLER kalır —
   * onlar zaten lavaboya gidiyor. Tepsi çayla doluyken müşteriler kalkarsa kilitlenme çözücüsü.
   */
  emptyTray: (kind: 'tea' | 'food') => void;
  /** Tepsi-boşalt butonu ilk-sefer spotlight'ını kapat (persist — bir daha çıkmaz). */
  markTrayTipSeen: () => void;
  /** G-63: bulaşık öğretme kartı kapatıldı (bir daha çıkmaz; anında kaydedilir). */
  markWashTipSeen: () => void;
  /** E5: öğreticiyi atla (bir daha çıkmaz; anında kaydedilir). */
  ogreticiAtla: () => void;
  saveNow: () => void;
  /** T9c/A3: sayfa gizlendi (arka plan) → anı tut + kaydet. */
  arkaPlanaGec: () => void;
  /** T9c/A3: sayfa yeniden görünür → yeniden yüklenmeden dönüşte de çevrimdışı gelir (init ile aynı hesap). */
  onPlanaDon: () => void;
  /** Çevrimdışı ödül ekranı kapatıldı (₺ zaten cüzdanda; ekran bir sonraki dönüşe kadar çıkmaz). */
  claimOffline: (izledi?: boolean) => void;
  hardReset: () => void;
  /** K2-2: merdiven geçişini başlat (perde iner, kat değişir). Merdiven kapalıysa / geçiş sürüyorsa false. */
  katDegistir: (hedef: KatNo) => boolean;
  /** K2-2: merdiveni aç. Bugün yalnız dev kancası/test çağırır — tamir pad'i ve fiyatı K2-5'te (varyant kapısı). */
  kat2Ac: () => void;
}

/** A7: kayıttaki bekleyen seviye ödülü — bozuksa yok say (ödül ekranı çöp göstermesin). */
function gecerliLevelUp(v: unknown): LevelUpOdul | null {
  const o = v as Partial<LevelUpOdul> | null;
  if (!o || typeof o !== 'object') return null;
  const sayi = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
  if (!sayi(o.level) || !sayi(o.amount) || !sayi(o.carryBefore) || !sayi(o.carryAfter) || o.amount! <= 0) return null;
  return { level: o.level!, amount: o.amount!, carryBefore: o.carryBefore!, carryAfter: o.carryAfter! };
}

/** Bu süreden kısa yokluk çevrimdışı sayılmaz (sn). */
const CEVRIMDISI_ESIK_SN = 30;

/**
 * Çevrimdışı gelir — soğuk açılış (`init`) ve sıcak dönüş (`onPlanaDon`) AYNI hesabı kullanır (A3).
 * B2: tek servis tüm masaları besler → tek oran. Offline'ın iki kelepçesi (rateMult + sıradaki pad'in
 * oranı) `computeOfflineEarned`de → "yokken zone bitmez". D-090: koleksiyon çarpanı da görülür —
 * görmezse oyuncu oyunu KAPATARAK topladığı bonusu kaybederdi.
 */
function cevrimdisiGelir(
  s: { tables: number; tableLevels: number[]; stationLevels: number[]; lavaboLevel: number; goalsClaimed: string[]; padsDone: string[] },
  elapsed: number,
): { kazanc: number; izleEki: number } {
  let tipTotal = 0;
  for (let i = 0; i < s.tables; i++) tipTotal += C.tables.tipBase * (s.tableLevels[i] ?? 0);
  const rate = incomeRate(s.tables, s.stationLevels[THE_SERVICE], tipTotal, s.lavaboLevel, collectionMult(s.goalsClaimed));
  // F3b (D-150): "İzle"nin eki aynı oran ve aynı tavanla hesaplanır; 0 ise ekranda düğme yok.
  return { kazanc: computeOfflineEarned(rate, elapsed, s.padsDone), izleEki: offlineWatchExtra(rate, elapsed, s.padsDone) };
}

/**
 * F3b (D-150): ÖDÜL ₺'si kazanç izine girmez. Seviye ve video ödülleri "son N sn'de KAZANILAN ₺"dır
 * (`videoReward` · `levelRewardAmount`); ödülün kendisi `lifetime`a yazılıp izde kalsaydı bir sonraki
 * ödül onu da sayardı ve arka arkaya izlenen videolar katlanırdı (240 → 480 → 960). İz, ödül kadar
 * kaydırılır → fark yalnız oyunun kendi geliri kalır (sim de ödülü gelir akışına saymıyor).
 */
const izKaydir = (iz: readonly number[], odul: number): number[] => iz.map((v) => v + odul);

/** Usta'nın 💎'dan bağımsız iki şartı: alınmamış olmalı ve masa ₺ tavanında olmalı (D-093). */
function ustaAcilabilir(s: { mastersOwned?: string[]; tables: number; tableLevels: number[] }, id: string): boolean {
  if ((s.mastersOwned ?? []).includes(id)) return false;
  const masaIdx = id.startsWith('table:') ? Number(id.slice('table:'.length)) : -1;
  if (!Number.isInteger(masaIdx) || masaIdx < 0 || masaIdx >= s.tables) return false;
  return masterUnlockedForTable(s.tableLevels[masaIdx] ?? 0);
}

/** K2-3: Kat 2 döngüsünün denge sayıları — tek kaynak `economy.config.kat2` (D-184). */
const KAT2_AYAR: Kat2Ayar = economyConfig.kat2;

export const useGame = create<GameState>((set, get) => ({
  wallet: D(0),
  diamonds: D(0),
  lifetime: D(0),
  tables: 1,
  stations: 1,
  areasOpen: 1,
  stationLevels: Array.from({ length: MAX_SERVICES }, () => 0),
  tableLevels: LAYOUT.tables.map(() => 0),
  lavaboLevel: 0,
  padsDone: [],
  padFills: {},
  player: [...LAYOUT.player] as Vec3,
  npcs: [],
  coins: [],
  autoCollectSum: 0,
  autoCollectToastCooldown: 0,
  npcCount: 0,
  waiters: [],
  dishwasher: null,
  legen: { ...BOS_LEGEN },
  ready: { tea: 0, tost: 0 },
  brewProgress: { tea: 0, tost: 0 },
  tray: 0,
  trayFood: 0,
  cleanCups: cupPoolCapacity(0),
  dishes: [],
  carriedDirty: 0,
  carriedDirtyFood: 0,
  upgradeFills: Array.from({ length: MAX_AREAS }, () => 0),
  tableUpgradeFills: LAYOUT.tables.map(() => 0),
  lavaboFill: 0,
  activeSpot: null,
  notice: null,
  noticeQueue: [],
  levelUp: null,
  gelirIzi: [],
  gelirIziT: 0,
  revealSeen: [],
  stats: defaultStats(),
  goalsClaimed: [],
  mastersOwned: [],
  daily: defaultDaily(),
  reklam: defaultReklam(),
  satin: defaultSatinAlim(),
  nearMaster: null,
  ustaKapali: null,
  questIndex: 0,
  questsDone: [],
  questBase: 0,
  questPhase: 'active',
  questPhaseT: 0,
  questDoneIndex: -1,
  xp: 0,
  settings: defaultSettings(),
  floorThemeByArea: Array.from({ length: MAX_AREAS }, (_, z) => defaultFloorTheme(z)),
  wallThemeByArea: Array.from({ length: MAX_AREAS }, () => 'krem'),
  tableTheme: 'mavi',
  kitchenTheme: 'klasik',
  kabuk: KABUK_VARSAYILAN,
  ownedCosmetics: [],
  outfit: 'klasik',
  trayLook: 'klasik',
  dekor: {},
  dekorOnizleme: null,
  kafeAdi: null,
  charUpgrades: defaultCharUpgrades(),
  waiterUpgrades: defaultWaiterUpgrades(),
  charPanelSeen: false,
  trayTipSeen: false,
  washTipSeen: false,
  ogreticiAtlandi: false,
  quest: null,
  camFocus: null,
  camBekleyen: null,
  camZoomOut: false,
  offlineEarned: 0,
  offlineIzleEki: 0,
  gizlendiAt: null,
  spawnTimer: 1,
  spawnArea: 0,
  saveTimer: SAVE_INTERVAL,
  nextId: 1,
  inputKeyboard: [0, 0],
  inputJoystick: [0, 0],
  kat: 1,
  kat2: defaultKat2(),
  katGecis: null,
  kat2Dunya: yeniKat2Dunya([], KAT2_AYAR),

  init: () => {
    const save: SaveData = loadSave();
    const ilkKat = baslangicKati(save.kat, save.kat2);
    // D-015: masa/servis/personel padsDone'dan TÜRETİLİR (ayrı saklanmaz).
    const world: World = deriveWorld(save.padsDone);
    const openSvc = openServices(world.areasOpen);
    // B3-1 (D-062): servis kümesinin YERİ açık alan sayısına bağlı (3. Alan açılınca arka banda taşınır).
    const initPlace = servicePlace(world.areasOpen);
    const stationLevels = Array.from({ length: MAX_SERVICES }, (_, sv) =>
      Math.min(save.stationLevels[sv] ?? 0, stationSoftMaxLevel()),
    );
    // Karakter kademeleri (v20): bozuk/aşırı değer max kademeye kelepçelenir (stationLevels deseni).
    const charUpgrades: CharUpgrades = {
      tray: Math.max(0, Math.min(save.charUpgrades?.tray ?? 0, charMaxTier('tray'))),
      magnet: Math.max(0, Math.min(save.charUpgrades?.magnet ?? 0, charMaxTier('magnet'))),
      speed: Math.max(0, Math.min(save.charUpgrades?.speed ?? 0, charMaxTier('speed'))),
    };
    // Garson tepsi kademeleri (v27/Y3) + bulaşıkçı leğeni (v28) + hız kademeleri (v29): aynı kelepçe deseni.
    const waiterUpgrades: WaiterUpgrades = {
      tray: Math.max(0, Math.min(save.waiterUpgrades?.tray ?? 0, waiterTrayMaxTier())),
      speed: Math.max(0, Math.min(save.waiterUpgrades?.speed ?? 0, waiterSpeedMaxTier())),
      dishCarry: Math.max(0, Math.min(save.waiterUpgrades?.dishCarry ?? 0, dishCarryMaxTier())),
      dishSpeed: Math.max(0, Math.min(save.waiterUpgrades?.dishSpeed ?? 0, dishSpeedMaxTier())),
    };
    // GÖREV KONUMU (v32, D-088): kayıtta index yok — aktif görev tamamlanan KİMLİKLERDEN türer.
    const loadedQuestIndex = eksikPadGorevi(C.quests, activeQuestIndex(C.quests, save.questsDone), save.padsDone);
    const loadedActive = C.quests[loadedQuestIndex];
    // Taban aktif göreve AİTTİR. Hat kayıt yazıldıktan sonra değiştiyse türetilen görev başkası
    // olabilir; o hâlde eski taban bayattır ve sayaç görevi hedefini SIFIRDAN sayar (delta 0).
    const loadedQuestBase =
      loadedActive && save.questBaseId === loadedActive.id
        ? save.questBase
        : loadedActive
          ? questCounterValue(loadedActive.target, save.stats) ?? 0
          : 0;

    // Çevrimdışı gelir: açık SERVİSLERİN idealize oranları TOPLAMI; süre + PARA tavanlı (computeOfflineEarned).
    const elapsed = Math.max(0, (Date.now() - save.lastSaved) / 1000);
    let wallet = D(save.wallet);
    let lifetime = D(save.lifetime);
    let offlineEarned = 0;
    let offlineIzleEki = 0;
    if (elapsed > CEVRIMDISI_ESIK_SN) {
      // B4: offline oran lavabo kolunu da sayar (oyuncu yokken de istif kabarır).
      const lavLevel = roomOpen(world, 'lavabo') ? Math.min(Math.max(save.lavaboLevel ?? 1, 1), lavaboMaxLevel()) : 0;
      ({ kazanc: offlineEarned, izleEki: offlineIzleEki } = cevrimdisiGelir(
        { tables: world.tables.length, tableLevels: save.tableLevels, stationLevels, lavaboLevel: lavLevel,
          goalsClaimed: save.goalsClaimed ?? [], padsDone: save.padsDone },
        elapsed,
      ));
      wallet = wallet.add(offlineEarned);
      lifetime = lifetime.add(offlineEarned);
    }
    // GÜN DÖNÜMÜ (D8): gece kapalıyken gün değiştiyse görevler BURADA yenilenir — çevrimdışı
    // gelir eklendikten SONRA. Sıra ölçülen arzın parçası: taban offline'dan önce alınsaydı
    // gece kazanılan ₺ bugünün "kazan" görevini bedavaya doldururdu (bekçi bunu yakaladı) ve
    // 10 💎/gün sessizce büyürdü. `stats` offline'da değişmez, tek kritik sayaç `lifetime`.
    const loadedDaily = rollDaily(
      save.daily,
      dayIndex(Date.now()),
      dailyContextOf({
        tables: world.tables.length,
        waiters: new Array(world.services[THE_SERVICE].waiters),
        stationLevels,
      }),
      dailyCountersOf({ stats: save.stats, lifetime }),
    );

    set({
      wallet,
      lifetime,
      diamonds: D(save.diamonds),
      tables: world.tables.length,
      stations: openSvc.length,
      areasOpen: world.areasOpen,
      stationLevels,
      // Masa-başı seviyeleri: slot sayısına normalize et + her birini soft max'a clamp'le.
      tableLevels: LAYOUT.tables.map((_, i) => Math.min(save.tableLevels[i] ?? 0, tableSoftMaxLevel())),
      // ODA (B4): odanın kendisi padsDone'dan TÜRETİLİR (D-015); burada saklanan yalnız SEVİYE.
      // Savunmacı: oda kapalıysa seviye 0'a, açıksa en az 1'e ve tavana kelepçelenir → bozuk kayıt
      // "kapalı ama L4" gibi bir hâl üretemez.
      lavaboLevel: roomOpen(world, 'lavabo')
        ? Math.min(Math.max(save.lavaboLevel ?? 1, 1), lavaboMaxLevel())
        : 0,
      padsDone: [...save.padsDone],
      padFills: { ...save.padFills },
      offlineEarned,
      offlineIzleEki,
      player: (ilkKat === 2 ? [...VARIS[2]] : [...LAYOUT.player]) as Vec3,
      npcs: [],
      coins: [],
      autoCollectSum: 0,
      autoCollectToastCooldown: 0,
      npcCount: 0,
      // GLOBAL havuz: tutulmuş garson sayısı kadar aktör, bekleme noktaları 0.7 br arayla.
      waiters: Array.from({ length: world.services[THE_SERVICE].waiters }, (_, i) => ({
        pos: waiterHomeAt(initPlace, i),
        tray: 0,
        trayFood: 0,
      })),
      dishwasher: world.services[THE_SERVICE].hasDishwasher
        ? { pos: [...initPlace.dishwasherHome] as Vec3, tray: 0, trayFood: 0 }
        : null,
      legen: { ...BOS_LEGEN },
      ready: { tea: 0, tost: 0 },
      brewProgress: { tea: 0, tost: 0 },
      tray: 0,
      trayFood: 0,
      // Bardak havuzu her oturumda dolu-temiz başlar (transient). GLOBAL tek depo:
      // açık servis başına taban + o servislerin ocak seviyelerinin toplamı.
      cleanCups: totalCupPool(world.areasOpen, stationLevels),
      dishes: [],
      carriedDirty: 0,
      carriedDirtyFood: 0,
      // G-78: kısmi ödenmiş yükseltmeler artık kayıttan GERİ GELİR (eskiden burada sıfırlanıyordu
      // ve oyuncunun ödediği para yanıyordu). Üçü de KELEPÇELİ okunur: dolum, o slotun BUGÜNKÜ
      // bir sonraki seviyesinin maliyetini aşamaz — denge sayısı değişirse ya da kayıt bozuksa
      // "zaten dolmuş" bir yükseltme doğmasın (tableLevels'ın `Math.min` kelepçesiyle aynı desen).
      upgradeFills: Array.from({ length: MAX_SERVICES }, (_, i) =>
        kismiDolum(save.upgradeFills?.[i], stationUpgradeCost(stationLevels[i] ?? 0)),
      ),
      tableUpgradeFills: LAYOUT.tables.map((_, i) =>
        kismiDolum(save.tableUpgradeFills?.[i], tableUpgradeCost(save.tableLevels[i] ?? 0, areaOfTableIdx(i))),
      ),
      lavaboFill: roomOpen(world, 'lavabo')
        ? kismiDolum(save.lavaboFill, lavaboUpgradeCost(Math.max(save.lavaboLevel ?? 1, 1)))
        : 0,
      activeSpot: null,
      notice: null,
      noticeQueue: [],
      levelUp: gecerliLevelUp(save.levelUp),
  gelirIzi: [],
  gelirIziT: 0,
      // revealSeen baseline: yüklemede ZATEN açık olan özellikler bildirilmiş sayılır (yeniden yükleme spam'ı yok).
      revealSeen: revealKeys(
        {
          padsDone: save.padsDone,
          tables: world.tables.length,
          stationLevel: stationLevels[0],
          lifetime: lifetime.toNumber(),
          waiterServed: save.stats.waiterServed,
          waiterServedByService: save.stats.waiterServedByService,
        },
        world.areasOpen,
        stationLevels,
      ).map(([k]) => k),
      stats: { ...save.stats },
      goalsClaimed: [...(save.goalsClaimed ?? [])],
      mastersOwned: [...(save.mastersOwned ?? [])],
      reklam: { ...save.reklam },
      satin: { ...save.satin, islenen: [...save.satin.islenen] },
      daily: loadedDaily,
      questIndex: loadedQuestIndex,
      questsDone: [...save.questsDone],
      questBase: loadedQuestBase,
      questPhase: 'active',
      questPhaseT: 0,
      questDoneIndex: -1,
      xp: save.xp,
      settings: { ...save.settings },
      floorThemeByArea: Array.from({ length: MAX_AREAS }, (_, a) => save.floorThemeByArea[a] ?? defaultFloorTheme(a)),
      wallThemeByArea: Array.from({ length: MAX_AREAS }, (_, a) => save.wallThemeByArea[a] ?? 'krem'),
      tableTheme: save.tableTheme ?? 'mavi',
      kitchenTheme: save.kitchenTheme ?? 'klasik',
      ownedCosmetics: [...save.ownedCosmetics],
      outfit: save.outfit ?? 'klasik',
      trayLook: save.trayLook ?? 'klasik',
      dekor: { ...(save.dekor ?? {}) },
      kafeAdi: kafeAdiOku(save.kafeAdi),
      charUpgrades,
      waiterUpgrades,
      charPanelSeen: save.charPanelSeen,
      trayTipSeen: save.trayTipSeen,
      washTipSeen: save.washTipSeen ?? false,
      ogreticiAtlandi: save.ogreticiAtlandi === true,
      quest:
        loadedQuestIndex < C.quests.length
          ? questView(C.quests[loadedQuestIndex], {
              padsDone: save.padsDone,
              stationLevels,
              tableLevels: save.tableLevels,
              stats: save.stats,
              questBase: loadedQuestBase,
              charUpgrades,
              waiterUpgrades,
            })
          : null,
      // İlk oyun (taze kayıt): kamera ilk görevin hedefine kısa pan → "hareketli" onboarding girişi.
      camFocus:
        loadedQuestIndex === 0 && lifetime.lte(0)
          ? (() => {
              const p0 = questFocusPos(C.quests[0].target, save.tableLevels, world.tables.length, world.areasOpen);
              return p0 ? { pos: [p0[0], p0[1], p0[2]] as [number, number, number], ttl: 3 } : null;
            })()
          : null,
      camBekleyen: null,
      spawnTimer: 1,
      spawnArea: 0,
      saveTimer: SAVE_INTERVAL,
      nextId: 1,
      kat: ilkKat,
      kat2: { ...save.kat2, padsDone: [...save.kat2.padsDone] },
      katGecis: null,
      kat2Dunya: yeniKat2Dunya(save.kat2.padsDone, KAT2_AYAR),
    });
    reklamsizAyarla(save.satin.reklamsiz);
  },

  /**
   * Bir simülasyon karesi. Gövde Faz A2'de `tick.ts`'e, 17 sisteme bölündü (sıra orada sabit);
   * burada kalan üç iş: bağlamı kur, sistemleri koştur, sonucu TEK `set()` ile yaz.
   * `keepIdentity` (rules.ts): içeriği değişmeyen alan ESKİ referansına döner → React yalnız
   * gerçekten değişen veriyi yeniden çizer (P0 perf düzeltmesi, 2026-09-06).
   */
  tick: (rawDt: number) => {
    const dt = Math.min(Math.max(rawDt, 0), 0.25);
    if (dt <= 0) return;
    const s = get();
    const gecis = s.katGecis;

    // K2-2: geçiş sürerken girdi yok (perdenin arkasında yürünmez). Kat 2'deyken Kat 1 sistemleri
    // oyuncuyu `KAT1_DISI`nda görür (`tick.playerMoveSystem` kapısı) — Kat 1 kendi başına işler.
    const c = createTickCtx(gecis ? { ...s, inputKeyboard: [0, 0], inputJoystick: [0, 0] } : s, dt);
    runTick(c);

    let kat = s.kat;
    let player = c.player;
    let girdi: readonly number[] = c.input;
    let camFocus = c.camFocus;
    let wallet = c.wallet;
    let lifetime = c.lifetime;
    let kat2 = s.kat2;
    let kat2Dunya = s.kat2Dunya;
    if (kat === 2) {
      const j = s.inputJoystick;
      girdi = gecis ? [0, 0] : Math.hypot(j[0], j[1]) > 0.05 ? j : s.inputKeyboard;
      const hiz = playerSpeedFor(s.charUpgrades.speed) * c.carryMult * dt;
      const [nx, nz] = kat2Adim(s.player[0], s.player[2], girdi[0] * hiz, girdi[1] * hiz, undefined, kat2Engeller(kat2.padsDone));
      player = [nx, s.player[1], nz];
      camFocus = null; // Kat 1'in görev/açılış panları Kat 2'deki kamerayı çekmesin
      // K2-3: Kat 2'nin döngüsü (Kat 1 arkada `runTick`le işledi; cüzdan ortak).
      const r = kat2Tick(
        kat2Dunya,
        {
          x: nx,
          z: nz,
          durdu: Math.hypot(girdi[0], girdi[1]) <= 0.1,
          cuzdan: wallet.toNumber(),
          padsDone: kat2.padsDone,
          tepsiKap: trayCapacityFor(s.charUpgrades.tray),
          miknatis: attractRadiusFor(s.charUpgrades.magnet),
        },
        dt,
        KAT2_AYAR,
      );
      kat2Dunya = r.dunya;
      if (r.harcama > 0) wallet = wallet.sub(r.harcama);
      if (r.kazanc > 0) {
        wallet = wallet.add(r.kazanc);
        lifetime = lifetime.add(r.kazanc);
      }
      if (r.padsDone !== kat2.padsDone) kat2 = { ...kat2, padsDone: r.padsDone };
    }
    let katGecis: KatGecis | null = null;
    if (gecis) {
      const t = gecis.t + dt;
      if (gecis.t < GECIS_SN / 2 && t >= GECIS_SN / 2) {
        // Perde tam indi: kat değişir, oyuncu varış noktasında belirir.
        kat = gecis.hedef;
        player = [...VARIS[kat]];
        camFocus = null;
      }
      katGecis = t >= GECIS_SN ? null : { hedef: gecis.hedef, t };
    } else if (
      s.kat2.acik &&
      kat2Etkin() &&
      (kat === 2 || c.out.areasOpen >= 3) &&
      merdivenTetik(kat, player[0], player[2], girdi)
    ) {
      katGecis = { hedef: kat === 1 ? 2 : 1, t: 0 };
    }

    // GÜN DÖNÜMÜ (D8): `tick.ts`e DOKUNMAZ — denge dosyası değil, store'un defter işi
    // (`saveTimer` deseni). Gün değişmediyse `rollDaily` ÖNCEKİ NESNEYİ döndürür, yani
    // `keepIdentity` hiçbir yeniden render tetiklemez; ancak dönümde yeni nesne doğar.
    const gun = dayIndex(Date.now());
    const daily =
      s.daily.day === gun
        ? s.daily // sıcak yol: tek sayı karşılaştırması, nesne üretilmez
        : rollDaily(s.daily, gun, dailyContextOf(s), dailyCountersOf({ stats: c.stats, lifetime: c.lifetime }));

    // Periyodik kayıt (sistemlerin dışında: store'un işi).
    let saveTimer = s.saveTimer - dt;
    if (saveTimer <= 0) {
      saveTimer = SAVE_INTERVAL;
      get().saveNow();
    }

    set(
      keepIdentity(get() as unknown as Record<string, unknown>, {
        npcs: c.liveNpcs,
        coins: c.coins,
        autoCollectSum: c.autoCollectSum,
        autoCollectToastCooldown: c.autoCollectToastCooldown,
        dishes: c.dishes,
        wallet,
        lifetime,
        kat2,
        kat2Dunya,
        tables: c.out.tables.length,
        stations: openServices(c.out.areasOpen).length,
        areasOpen: c.out.areasOpen,
        stationLevels: c.stationLevels,
        tableLevels: c.tableLevels,
        lavaboLevel: c.lavaboLevel,
        padsDone: c.padsDone,
        padFills: c.padFills,
        upgradeFills: c.upgradeFills,
        tableUpgradeFills: c.tableUpgradeFills,
        lavaboFill: c.lavaboFill,
        activeSpot: c.activeSpot,
        notice: c.notice,
        noticeQueue: c.noticeQueue,
        levelUp: c.levelUp,
        gelirIzi: c.gelirIzi,
        gelirIziT: c.gelirIziT,
        revealSeen: c.revealSeen,
        stats: c.stats,
        daily,
        // `goalsClaimed` BİLEREK yok: hedefler tick'te değişmez, yalnız `claimGoal` yazar. Tick
        // bağlamına eklemek `tick.ts`e (denge dosyası) dokunmak olurdu ve buraya `undefined`
        // yazıyordu — 49 test bu yüzden kırıldı.
        questIndex: c.questIndex,
        questsDone: c.questsDone,
        questBase: c.questBase,
        questPhase: c.questPhase,
        questPhaseT: c.questPhaseT,
        questDoneIndex: c.questDoneIndex,
        xp: c.xp,
        quest: c.quest,
        camFocus,
        camBekleyen: c.camBekleyen,
        player,
        kat,
        katGecis,
        waiters: c.waiters,
        dishwasher: c.dishwasher,
        legen: c.legen,
        ready: c.ready,
        brewProgress: c.brewProgress,
        tray: c.tray,
        trayFood: c.trayFood,
        cleanCups: c.cleanCups,
        carriedDirty: c.carriedDirty,
        carriedDirtyFood: c.carriedDirtyFood,
        spawnTimer: c.spawnTimer,
        spawnArea: c.spawnArea,
        saveTimer,
        nextId: c.nextId,
        npcCount: c.liveNpcs.length,
      }),
    );
  },

  setKeyboardInput: (x, z) => set({ inputKeyboard: [x, z] }),
  setJoystickInput: (x, z) => set({ inputJoystick: [x, z] }),

  // Zone-1 çay ocağı yükseltme (₺ ile L1-L4; dev kancası/test). L5 Usta = 💎/video (Faz 4).
  upgradeStation: () => {
    const s = get();
    if (s.stationLevels[0] >= stationSoftMaxLevel()) return false;
    const cost = stationUpgradeCost(s.stationLevels[0]);
    if (s.wallet.lt(cost)) return false;
    const stationLevels = s.stationLevels.slice();
    stationLevels[0] += 1;
    set({
      wallet: s.wallet.sub(cost),
      stationLevels,
      xp: s.xp + C.xp.perUpgrade,
      cleanCups: s.cleanCups + C.cups.poolPerLevel, // havuz ocak seviyesiyle büyür (Faz 2e)
    });
    get().saveNow();
    return true;
  },

  // Test/geliştirme yardımcısı: cüzdana para ekle.
  addMoney: (amount) => {
    const s = get();
    set({ wallet: s.wallet.add(amount), lifetime: s.lifetime.add(amount) });
  },

  /**
   * HEDEF ÖDÜLÜ TOPLA (D3/D-089). Eşik/durum kontrolü BURADA YAPILMAZ — `claimGoalReward` tek
   * karar yeridir; store yalnız onun verdiği ödülü işler. İki yerde kural olsaydı biri
   * diğerinden sapardı (D-015'in dersi).
   *
   * Ödül iki kalemdir (kalıbı D-090'da ölçüldü): **kalıcı gelir çarpanı** + 💎. Çarpan cüzdana
   * BİR ŞEY EKLEMEZ — `goalsClaimed` listesi büyüdükçe `collectionMult` kendiliğinden büyür ve
   * ₺'nin yaratıldığı yerlerde (tick.ts · offline oran) uygulanır. Bu yüzden burada ayrıca
   * saklanacak bir alan yok: kayıt sürümü ARTMADI. XP de verilir — hedef, görev hattı gibi bir
   * ilerleme olayıdır.
   */
  claimLevelUp: (izledi = false) => {
    const s = get();
    if (!s.levelUp) return;
    const amount = s.levelUp.amount * (izledi ? C.rewarded.claimMult : 1);
    set({
      levelUp: null,
      wallet: amount > 0 ? s.wallet.add(amount) : s.wallet,
      lifetime: amount > 0 ? s.lifetime.add(amount) : s.lifetime,
      gelirIzi: amount > 0 ? izKaydir(s.gelirIzi, amount) : s.gelirIzi,
    });
    if (amount > 0) get().saveNow();
  },

  claimGoal: (id) => {
    const s = get();
    const odul = claimGoalReward(id, goalMetricsOf(s), s.goalsClaimed ?? []);
    if (!odul) return false;
    set({
      goalsClaimed: [...(s.goalsClaimed ?? []), id],
      diamonds: s.diamonds.add(odul.diamonds),
      xp: s.xp + C.xp.perQuest,
    });
    get().saveNow();
    return true;
  },

  /**
   * USTA BASAMAĞINI SATIN AL (D7a · D-093) — elmasın ilk HARCAMASI.
   *
   * Üç şart: (a) obje ₺ TAVANINDA olmalı (Usta kritik yol dışıdır, plan K6 — ve tavan şartı
   * ölçülmüş bir karardır: kalkarsa zincir %13,4 kısalıyor, `docs/elmas-raporu-d7.md` §2
   * Bulgu 4); (b) daha önce alınmamış olmalı; (c) 💎 yetmeli.
   *
   * `claimGoal` gibi kayıt sürümü ARTIRMAZ: eklenen tek şey kimlik listesidir, bahşiş çarpanı
   * ondan TÜRETİLİR (`masterTipsOf` → `tick.ts` bağlamı). Eski kayıtta alan yoksa boş liste.
   */
  buyMaster: (id) => {
    const s = get();
    if (!ustaAcilabilir(s, id)) return false;
    const fiyat = D(masterCost());
    if (s.diamonds.lt(fiyat)) return false;
    set({
      mastersOwned: [...(s.mastersOwned ?? []), id],
      diamonds: s.diamonds.sub(fiyat),
      xp: s.xp + C.xp.perUpgrade,
    });
    get().saveNow();
    return true;
  },

  /** F3b (D-150): `buyMaster`in aynı üç şartından ilk ikisi; 💎 yerine günün reklam hakkı düşer.
   *  Reklamın izlendiğini HUD doğrular (`ads.odulluIzle`), store yalnız hakkı sayar. */
  buyMasterAd: (id) => {
    const s = get();
    if (!ustaAcilabilir(s, id)) return false;
    const gun = dayIndex(Date.now());
    if (masterAdsLeft(s.reklam, gun) <= 0) return false;
    set({
      mastersOwned: [...(s.mastersOwned ?? []), id],
      reklam: spendMasterAd(s.reklam, gun),
      xp: s.xp + C.xp.perUpgrade,
    });
    get().saveNow();
    return true;
  },

  satinAlimIsle: (islem) => {
    const s = get();
    const r = applyPurchase(s.satin, islem.islem, islem.urun);
    if (!r) return null;
    // Başlangıç paketi YENİ alındıysa kurucu kıyafeti hemen giyilir — paketin görünen karşılığı.
    const kurucu = r.satin.baslangic && !s.satin.baslangic;
    const satin = kurucu && r.diamonds > 0 ? { ...r.satin, baslangicElmas: true } : r.satin;
    set({ satin, diamonds: s.diamonds.add(r.diamonds), ...(kurucu ? { outfit: 'kurucu' } : {}) });
    reklamsizAyarla(r.satin.reklamsiz);
    get().saveNow();
    return r.diamonds;
  },

  magazaUzlasUygula: (m) => {
    const s = get();
    const r = magazaUzlas(s.satin, m, Date.now());
    if (r.satin === s.satin && r.elmas === 0) return 0;
    const kurucu = r.satin.baslangic && !s.satin.baslangic;
    set({ satin: r.satin, diamonds: s.diamonds.add(r.elmas), ...(kurucu ? { outfit: 'kurucu' } : {}) });
    reklamsizAyarla(r.satin.reklamsiz);
    get().saveNow();
    return r.elmas;
  },

  claimAdFreeDaily: () => {
    const s = get();
    const gun = dayIndex(Date.now());
    if (!adFreeDailyReady(s.satin, gun)) return 0;
    const odul = C.iap.removeAdsDiamondsPerDay;
    set({ satin: { ...s.satin, gunlukGun: gun }, diamonds: s.diamonds.add(odul) });
    get().saveNow();
    return odul;
  },

  claimVideo: () => {
    const s = get();
    const simdi = Date.now();
    if (videoRights(s.reklam, simdi).kalan <= 0) return 0;
    const odul = videoReward(s.gelirIzi, s.lifetime.toNumber());
    if (odul <= 0) return 0;
    set({
      reklam: spendVideoRight(s.reklam, simdi),
      wallet: s.wallet.add(odul),
      lifetime: s.lifetime.add(odul),
      gelirIzi: izKaydir(s.gelirIzi, odul),
    });
    get().saveNow();
    return odul;
  },

  /**
   * GÜNLÜK GÖREV ÖDÜLÜ (D8) — günün 💎'ı. `claimGoal` deseni: eşik kontrolü BURADA DEĞİL
   * `dailyQuests.ts`te (iki yerde kural olsaydı biri diğerinden sapardı — D-015 dersi).
   * Kayıt sürümü ARTMAZ, XP VERMEZ (ölçülmemiş İtibar enjeksiyonu olurdu — `economy.config.ts`).
   */
  claimDailyQuest: (id, izledi = false, gorulenGun) => {
    const s = get();
    const gun = gorulenGun ?? s.daily.day;
    const odul = claimDailyReward(
      id,
      s.daily,
      s.tables,
      dailyCountersOf({ stats: s.stats, lifetime: s.lifetime }),
      gun,
    );
    if (odul === null) return false;
    const onceki = s.daily.onceki;
    const kalan = onceki && gun !== s.daily.day
      ? Object.fromEntries(Object.entries(onceki.hazir).filter(([k]) => k !== id))
      : null;
    set({
      daily: kalan
        ? { ...s.daily, onceki: Object.keys(kalan).length > 0 ? { day: onceki!.day, hazir: kalan } : undefined }
        : { ...s.daily, claimed: [...s.daily.claimed, id] },
      diamonds: s.diamonds.add(odul * (izledi ? C.rewarded.claimMult : 1)),
    });
    get().saveNow();
    return true;
  },

  setNearMaster: (id) => {
    if (get().nearMaster !== id) set({ nearMaster: id });
  },

  closeMaster: () => set({ ustaKapali: get().nearMaster, nearMaster: null }),

  // Görev barına dokununca: kamera aktif görevin hedefine kayar (kullanıcı onboarding isteği).
  /**
   * G-63 — BULAŞIK TEZGÂHINA ODAKLAN. Öğretme kartı açılırken çağrılır: kullanıcı *"oraya birden
   * zoom yapar ve ekranda bir yazı çıkar"* dedi. Hedef koordinatı BURAYA yazılmaz, yerleşimden
   * (`servicePlace`) okunur — tezgâh ileride taşınırsa odak da onunla gider.
   * TTL normalden uzun (×2): kart okunurken kamera yerinde kalmalı; oyuncu joystick'e dokunursa
   * zaten iptal olur (`questSystem`in odak kuralı).
   */
  focusDish: () => {
    const p = servicePlace(get().areasOpen).dish;
    set({ camFocus: { pos: [p[0], p[1], p[2]], ttl: CAM_FOCUS_TTL * 2 } });
  },

  focusQuest: () => {
    const s = get();
    if (s.questIndex >= C.quests.length) return;
    const q = C.quests[s.questIndex];
    const p = questFocusPos(q.target, s.tableLevels, s.tables, s.areasOpen, q.area ?? 0, tableUpgradeTarget(gateOf(s)));
    if (p) set({ camFocus: { pos: [p[0], p[1], p[2]], ttl: CAM_FOCUS_TTL } });
  },

  toggleCamZoomOut: () => set({ camZoomOut: !get().camZoomOut }),

  /** Duvar kabuğu kipini değiştir (S4 denemesi). Kayda YAZILMAZ — saveNow çağrılmaz. */
  setKabuk: (kip: KabukKipi) => set({ kabuk: kip }),

  setSetting: (key, value) => {
    set({ settings: { ...get().settings, [key]: value } });
    get().saveNow();
    // Dil: kayıttan sonra sayfa yeniden yüklenir (main.tsx dili açılışta okur). Testte (vitest) dokunulmaz.
    if (key === 'dil' && typeof location !== 'undefined' && !('__vitest_worker__' in globalThis)) location.reload();
  },

  // Kozmetik tema satın al/uygula (WP6 — feedback §D19). ALAN açık + tema tanımlı olmalı;
  // sahip değilse cüzdandan düşer (yetmezse false), sahipse ücretsiz uygulanır.
  buyCosmetic: (kind, id, area) => {
    const s = get();
    // MASA teması GLOBAL (alansız): tek tableTheme; sahiplik anahtarı `table:id`.
    if (kind === 'table') {
      if (!tableThemeUnlocked(s)) return false; // 3 salon + tüm masalar max olana dek kilitli
      const theme = C.cosmetics.tableThemes.find((t) => t.id === id);
      if (!theme) return false;
      const key = `table:${id}`;
      let wallet = s.wallet;
      let ownedCosmetics = s.ownedCosmetics;
      if (theme.cost > 0 && !ownedCosmetics.includes(key)) {
        if (wallet.lt(theme.cost)) return false;
        wallet = wallet.sub(theme.cost);
        ownedCosmetics = [...ownedCosmetics, key];
      }
      set({ wallet, ownedCosmetics, tableTheme: id, notice: { text: satinBildirimi('table', theme.label), ttl: C.cosmetics.bildirimSn, kind: 'satin' } });
      get().saveNow();
      return true;
    }
    // MUTFAK teması de GLOBAL (mutfak tek oda) — masa temasının deseni birebir.
    if (kind === 'kitchen') {
      const theme = C.cosmetics.kitchenThemes.find((t) => t.id === id);
      if (!theme) return false;
      const key = `kitchen:${id}`;
      let wallet = s.wallet;
      let ownedCosmetics = s.ownedCosmetics;
      if (theme.cost > 0 && !ownedCosmetics.includes(key)) {
        if (wallet.lt(theme.cost)) return false;
        wallet = wallet.sub(theme.cost);
        ownedCosmetics = [...ownedCosmetics, key];
      }
      set({ wallet, ownedCosmetics, kitchenTheme: id, notice: { text: satinBildirimi('kitchen', theme.label), ttl: C.cosmetics.bildirimSn, kind: 'satin' } });
      get().saveNow();
      return true;
    }
    if (area < 0 || area >= s.areasOpen) return false;
    const themes = kind === 'floor' ? C.cosmetics.floorThemes : C.cosmetics.wallThemes;
    const theme = themes.find((t) => t.id === id);
    if (!theme) return false;
    const key = `${kind}:${id}:z${area}`;
    let wallet = s.wallet;
    let ownedCosmetics = s.ownedCosmetics;
    if (theme.cost > 0 && !ownedCosmetics.includes(key)) {
      if (wallet.lt(theme.cost)) return false;
      wallet = wallet.sub(theme.cost);
      ownedCosmetics = [...ownedCosmetics, key];
    }
    const arrKey = kind === 'floor' ? 'floorThemeByArea' : 'wallThemeByArea';
    const arr = (kind === 'floor' ? s.floorThemeByArea : s.wallThemeByArea).slice();
    arr[area] = id;
    set({ wallet, ownedCosmetics, [arrKey]: arr, notice: { text: satinBildirimi(kind, theme.label, { salon: area }), ttl: C.cosmetics.bildirimSn, kind: 'satin' } });
    get().saveNow();
    return true;
  },

  buyGemCosmetic: (kind, id) => {
    const s = get();
    const urun = vitrinUrunu(kind, id);
    if (!urun) return false;
    if (kind === 'decor' && !dekorAcik(id, s.areasOpen)) return false;
    let diamonds = s.diamonds;
    let ownedCosmetics = s.ownedCosmetics;
    if (!vitrinSahip(s, kind, id)) {
      if (urun.paket || diamonds.lt(urun.diamonds)) return false;
      diamonds = diamonds.sub(urun.diamonds);
      ownedCosmetics = [...ownedCosmetics, `${kind}:${id}`];
    }
    const kaldirildi = kind === 'decor' && !!urun.yuva && s.dekor[urun.yuva] === id;
    set({
      diamonds,
      ownedCosmetics,
      ...(kind === 'outfit' ? { outfit: id } : kind === 'tray' ? { trayLook: id } : { dekor: dekorDegistir(s.dekor, id) }),
      notice: { text: satinBildirimi(kind, urun.label, { kaldirildi }), ttl: C.cosmetics.bildirimSn, kind: 'satin' },
    });
    get().saveNow();
    return true;
  },

  kafeAdiKoy: (ad) => {
    set({ kafeAdi: kafeAdiTemizle(ad) || KAFE_ADI_VARSAYILAN });
    get().saveNow();
  },

  setDekorOnizleme: (id) => {
    if (get().dekorOnizleme !== id) set({ dekorOnizleme: id });
  },

  baslangicTeklifKapat: () => {
    const s = get();
    if (s.satin.teklif) return;
    set({ satin: { ...s.satin, teklif: true } });
    get().saveNow();
  },

  // Karakter özelliği satın al (v20 — panel butonundan; mekânsal pad değil, kullanıcı onaylı tasarım).
  buyCharUpgrade: (stat) => {
    const s = get();
    const tier = s.charUpgrades[stat];
    const cost = charNextCost(stat, tier);
    if (cost == null || s.wallet.lt(cost)) return false;
    set({
      wallet: s.wallet.sub(cost),
      charUpgrades: { ...s.charUpgrades, [stat]: tier + 1 },
      xp: s.xp + C.xp.perUpgrade,
    });
    get().saveNow();
    return true;
  },

  // Garson tepsi kademesi satın al (Y3 — karakter panelinin garson sekmelerinden; buyCharUpgrade deseni).
  buyWaiterTray: () => {
    const s = get();
    const tier = s.waiterUpgrades.tray;
    const cost = waiterTrayNextCost(tier);
    if (cost == null || s.wallet.lt(cost)) return false;
    set({
      wallet: s.wallet.sub(cost),
      waiterUpgrades: { ...s.waiterUpgrades, tray: tier + 1 },
      xp: s.xp + C.xp.perUpgrade,
    });
    get().saveNow();
    return true;
  },

  // Bulaşıkçı leğen kademesi satın al (v28 — Bulaşıkçı sekmesi; buyWaiterTray deseni).
  buyDishCarry: () => {
    const s = get();
    const tier = s.waiterUpgrades.dishCarry;
    const cost = dishCarryNextCost(tier);
    if (cost == null || s.wallet.lt(cost)) return false;
    set({
      wallet: s.wallet.sub(cost),
      waiterUpgrades: { ...s.waiterUpgrades, dishCarry: tier + 1 },
      xp: s.xp + C.xp.perUpgrade,
    });
    get().saveNow();
    return true;
  },

  // Garson hız kademesi satın al (v29 — eski mekânsal waiterUp pad'inin panel karşılığı).
  buyWaiterSpeed: () => {
    const s = get();
    const tier = s.waiterUpgrades.speed;
    const cost = waiterSpeedNextCost(tier);
    if (cost == null || s.wallet.lt(cost)) return false;
    set({
      wallet: s.wallet.sub(cost),
      waiterUpgrades: { ...s.waiterUpgrades, speed: tier + 1 },
      xp: s.xp + C.xp.perUpgrade,
    });
    get().saveNow();
    return true;
  },

  // Bulaşıkçı hız kademesi satın al (v29 — kullanıcı: "bulaşıkçıya hız eklenmeli net bir şekilde").
  buyDishSpeed: () => {
    const s = get();
    const tier = s.waiterUpgrades.dishSpeed;
    const cost = dishSpeedNextCost(tier);
    if (cost == null || s.wallet.lt(cost)) return false;
    set({
      wallet: s.wallet.sub(cost),
      waiterUpgrades: { ...s.waiterUpgrades, dishSpeed: tier + 1 },
      xp: s.xp + C.xp.perUpgrade,
    });
    get().saveNow();
    return true;
  },

  markCharPanelSeen: () => {
    if (get().charPanelSeen) return;
    set({ charPanelSeen: true });
    get().saveNow();
  },

  // Y1: çay ve tost AYRI butonlardan boşaltılır (kind) — kaplar ortak temiz havuza döner (korunum);
  // kirliler tepside KALIR.
  emptyTray: (kind) => {
    const s = get();
    const n = kind === 'food' ? s.trayFood : s.tray;
    if (n <= 0) return;
    set(
      kind === 'food'
        ? { trayFood: 0, cleanCups: s.cleanCups + n }
        : { tray: 0, cleanCups: s.cleanCups + n },
    );
  },

  markTrayTipSeen: () => {
    if (get().trayTipSeen) return;
    set({ trayTipSeen: true });
    get().saveNow();
  },

  markWashTipSeen: () => {
    if (get().washTipSeen) return;
    set({ washTipSeen: true });
    get().saveNow();
  },

  ogreticiAtla: () => {
    if (get().ogreticiAtlandi) return;
    set({ ogreticiAtlandi: true });
    get().saveNow();
  },

  arkaPlanaGec: () => {
    set({ gizlendiAt: Date.now() });
    get().saveNow();
  },

  onPlanaDon: () => {
    const s = get();
    if (s.gizlendiAt == null) return;
    const elapsed = Math.max(0, (Date.now() - s.gizlendiAt) / 1000);
    set({ gizlendiAt: null });
    if (elapsed <= CEVRIMDISI_ESIK_SN) return;
    const { kazanc, izleEki } = cevrimdisiGelir({ ...s, goalsClaimed: s.goalsClaimed ?? [] }, elapsed);
    if (kazanc <= 0) return;
    const lifetime = s.lifetime.add(kazanc);
    // D8 sırası (init ile aynı): gün dönümü çevrimdışı gelirden SONRA — gece kazanılan ₺ bugünün
    // "kazan" görevini bedavaya doldurmasın. Gün değişmediyse `tick` zaten dokunmaz.
    const gun = dayIndex(Date.now());
    const daily = s.daily.day === gun
      ? s.daily
      : rollDaily(s.daily, gun, dailyContextOf(s), dailyCountersOf({ stats: s.stats, lifetime }));
    set({ wallet: s.wallet.add(kazanc), lifetime, offlineEarned: kazanc, offlineIzleEki: izleEki, daily,
      gelirIzi: izKaydir(s.gelirIzi, kazanc) });
    get().saveNow();
  },

  claimOffline: (izledi = false) => {
    const s = get();
    const ek = izledi ? s.offlineIzleEki : 0;
    set({
      offlineEarned: 0,
      offlineIzleEki: 0,
      wallet: ek > 0 ? s.wallet.add(ek) : s.wallet,
      lifetime: ek > 0 ? s.lifetime.add(ek) : s.lifetime,
      gelirIzi: ek > 0 ? izKaydir(s.gelirIzi, ek) : s.gelirIzi,
    });
    if (ek > 0) get().saveNow();
  },

  saveNow: () => {
    writeSave(kayitVerisi(get()));
  },

  bulutKaydiYukle: (d) => {
    // F4b: buluttaki DAHA İLERİ kayıt. Diske yazılır ve oyun onunla yeniden kurulur — yükleme yolu
    // yereldekiyle aynı (`init`), yani göç, kelepçe ve türetme bir kez yazılı.
    writeSave(d);
    get().init();
    set({ notice: { text: t('Bulut kaydı yüklendi'), ttl: 4, kind: 'reveal' } });
  },

  katDegistir: (hedef) => {
    const s = get();
    if (s.katGecis || s.kat === hedef || !s.kat2.acik || !kat2Etkin()) return false;
    set({ katGecis: { hedef, t: 0 } });
    return true;
  },

  kat2Ac: () => {
    set((s) => ({ kat2: { ...s.kat2, acik: true } }));
    get().saveNow();
  },

  hardReset: () => {
    // Satın alımlar oyunun değil mağaza hesabının malı: sıfırlama onları silmez (💎 ise ilerlemedir, gider).
    const satin = get().satin;
    clearSave();
    get().init();
    set({ satin: { ...satin, islenen: [...satin.islenen] } });
    reklamsizAyarla(satin.reklamsiz);
    get().saveNow();
  },
}));
