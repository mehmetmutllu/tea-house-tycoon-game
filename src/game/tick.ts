/**
 * tick.ts — SİMÜLASYON SİSTEMLERİ. Her kare `runTick(c)` bu dosyadaki sistemleri SIRAYLA çağırır.
 *
 * Faz A2 (2026-09-06): eski 800 satırlık tek `tick()` gövdesi buraya, 17 sisteme bölündü.
 * Sıra ÖNEMLİ ve eskisiyle birebir aynıdır (demleme → spawn → NPC → oyuncu → para → servis →
 * bardak → garson → bulaşıkçı → etkileşim → bildirim → pad → yükseltmeler → türetme → görev → seviye).
 *
 * Sözleşme: sistemler yalnız `TickCtx` üstünde çalışır — Zustand'a, React'e, DOM'a DOKUNMAZLAR.
 * Ctx bir KARE anlık görüntüsüdür: `s` girişteki (salt-okunur) durum, geri kalan alanlar bu karede
 * değişebilen çalışma değerleridir. `store.tick()` ctx'i kurar, `runTick`i çağırır, sonucu tek
 * `set()` ile yazar. Bu ayrım sayesinde sistemler saf, tek tek okunabilir ve test edilebilir kalır.
 */
import { activeQuestIndex, eksikPadGorevi } from './questProgress';
import { olcKoş, olcumAcik } from './olcum';
import type { Decimal } from './decimal';
import type { Coin, Dish, Npc, Vec3, Waiter } from './types';
import { collectionMult } from './goals';
import {
  economyConfig as C,
  brewQueueCapacity,
  tableTip,
  tablePatience,
  lavaboVisitChance,
  lavaboFee,
  lavaboUpgradeCost,
  lavaboMaxLevel,
  rollGroupSize,
  upgradeFillRateFor,
  waiterSpeedFor,
  dishSpeedFor,
  levelProgress,
  PRODUCTS,
  waiterTrayCapacityFor,
  dishCarryCapacityFor,
  trayCapacityFor,
  attractRadiusFor,
  playerSpeedFor,
  reputationCarryMult,
  type PadDef,
  type GateState,
  type ProductId,
} from '../config/economy.config';
import { hedefEkranda } from './cameraView';
import {
  deriveWorld,
  areaOfTable,
  THE_SERVICE,
  MAX_WAITERS,
  isCounter,
  serviceMenu,
  tostShare,
  type World,
} from './world';
import type { SaveStats } from './save';
import { inFrame, lavaboCercevesi, masaCercevesi, padCercevesi, servisCercevesi } from './markerFrame';
import {
  LAYOUT,
  LAVABO,
  WC_GECIS,
  wcYol,
  NPC_SPEED,
  REACH_TABLE,
  REACH_PICKUP,
  reachWash,
  REACH_HOME,
  dist2D,
  moveToward,
  oyuncuKatilari,
  clampToOpenAreas,
  openServices,
  tableSolids,
  hitsSolid,
  getNavGrid,
  navStep,
  servicePlace,
  waiterHomeAt,
  entranceAt,
  streetAt,
  type RVec3,
  type Solid,
  type ServicePlace,
  atServiceBody,
  atTableBody,
} from './layout';
import {
  FILL_TEA,
  FILL_TABLE,
  FILL_LAVABO,
  NPC_COLORS,
  WASH_QUEST_INDEX,
  QUEST_COMPLETE_DUR,
  QUEST_GAP_DUR,
  cardQuestIndex,
  upgradeSpotLiveNow,
  levelRewardAmount,
  GELIR_ORNEK_SN,
  questInTransition,
  CAM_FOCUS_TTL,
  brewTime,
  tableSoftMaxLevel,
  tableNextCost,
  stationSoftMaxLevel,
  stationUpgradeCostAt,
  dirtyTables,
  hasLeftTable,
  occupiedSeats,
  findTableForGroup,
  seatsAtTable,
  revealKeys,
  visiblePads,
  stationUpgradeUnlocked,
  tableUpgradeTarget,
  questView,
  questTargetMet,
  questCounterValue,
  questFocusPos,
  masterTipsOf,
  type ActiveSpot,
  type GameNotice,
  type QuestView,
  type QuestCtx,
  type CamFocus,
} from './rules';
import type { LevelUpOdul } from './rules';
import type { NavGrid } from './nav';
import { t } from '../i18n';
import type { GameState } from './store'; // yalnız TİP (derlemede silinir → döngüsel import YOK)

/**
 * Bir karenin çalışma bağlamı. `s` girişteki durum (salt-okunur); diğer alanlar sistemlerin sırayla
 * güncellediği değerlerdir. Bir sistemin ÜRETİP sonrakine verdiği ara değerler (dirty, liveNpcs,
 * input, player, out, quest …) da burada durur — eskiden aynı dev gövdedeki yerel değişkenlerdi;
 * artık sistemler arası sözleşme AÇIKÇA görünür.
 */
export interface TickCtx {
  readonly dt: number;
  readonly s: GameState;
  // --- Giriş kopyaları (bu karede değişebilir) ---
  npcs: Npc[];
  coins: Coin[];
  dishes: Dish[];
  wallet: Decimal;
  lifetime: Decimal;
  padsDone: string[];
  padFills: Record<string, number>;
  readonly world: World;
  readonly tables: number;
  readonly areasOpen: number;
  /** Bu karede AÇIK servis index'leri (ocak/bulaşık/personel döngüleri bunun üstünde döner). */
  readonly openSvc: number[];
  /** Servis kümesinin BU KAREDEKİ yeri (B3-1/D-062: 3. Alan açılınca arka banda taşınır).
   *  Kare başına bir kez çözülür — sistemler koordinatı buradan okur, LAYOUT'tan değil. */
  readonly place: ServicePlace;
  readonly obstacles: Solid[];
  readonly navGrid: NavGrid;
  upgradeFills: number[];
  activeSpot: ActiveSpot | null;
  stationLevels: number[];
  tableLevels: number[];
  /** ODA: lavabo seviyesi (B4; 0 = kapalı). Bu karede yükseltilebilir. */
  lavaboLevel: number;
  /** D-090: hedef koleksiyonunun KALICI gelir çarpanı (1 = hiç hedef toplanmamış). ₺'nin
   *  yaratıldığı iki yerde (müşteri ödemesi · lavabo ücreti) çarpan olarak uygulanır. Kare içinde
   *  DEĞİŞMEZ: hedefler tick'te toplanmaz, yalnız `claimGoal` yazar. */
  readonly incomeMult: number;
  /** D-092: İtibar seviyesinden TÜRETİLEN taşıma çarpanı (oyuncu + garson hareket hızı).
   *  `incomeMult` deseninin aynısı — kayıtta ayrı alan YOK, `xp`ten türer. */
  readonly carryMult: number;
  /** D-093: masa başına Usta bahşiş çarpanı (1 = Usta değil). `incomeMult`/`carryMult` deseni —
   *  kayıtta ayrı alan YOK, `mastersOwned` KİMLİK listesinden türer. Kare içinde değişmez:
   *  Usta tick'te alınmaz, yalnız `buyMaster` yazar. */
  readonly masterTip: readonly number[];
  /** Servisin HAZIR ürünleri — B2: servis başına değil ÜRÜN başına (tek nokta, iki ürün). */
  ready: Record<ProductId, number>;
  /** Ürün başına birikmiş demleme süresi (sn). Tezgâh aynı anda TEK kalem hazırlar: hangi ürünün
   *  açığı büyükse onun sayacı ilerler, diğerinin yarım ilerlemesi KAYBOLMAZ (bekler). */
  brewProgress: Record<ProductId, number>;
  tray: number;
  trayFood: number;
  cleanCups: number;
  /** K9 (D-143): leğende bekleyen kirliler + toplu yıkama sayacı. */
  legen: Legen;
  carriedDirty: number;
  carriedDirtyFood: number;
  tableUpgradeFills: number[];
  /** Lavabo yükseltme noktasının kısmi dolumu (D-018 dwell). */
  lavaboFill: number;
  notice: GameNotice | null;
  noticeQueue: GameNotice[];
  readonly enqueueNotice: (n: GameNotice) => void;
  revealSeen: string[];
  questPhase: 'active' | 'completing' | 'gap';
  questPhaseT: number;
  xp: number;
  stats: SaveStats;
  questIndex: number;
  /** Tamamlanmış görev kimlikleri (store'un kaynağı) — bitişte YENİ dizi yazılır. */
  questsDone: string[];
  questBase: number;
  camFocus: CamFocus | null;
  camPrio: number;
  /** Bu tick'te istenen odak (kim istedi) — geçiş kapısı buna bakar. */
  camIstek: { pos: [number, number, number]; prio: number } | null;
  /** Kutlama penceresinde bekletilen odak; yeni görev kartı gelince salınır. */
  camBekleyen: { pos: [number, number, number]; prio: number } | null;
  readonly requestFocus: (pos: RVec3, prio: number) => void;
  nextId: number;
  spawnTimer: number;
  spawnArea: number;
  // --- Sistemden sisteme geçen ara değerler ---
  dirty: Set<number>;
  liveNpcs: Npc[];
  input: readonly number[];
  pr: number;
  player: Vec3;
  autoCollectSum: number;
  autoCollectToastCooldown: number;
  trayCap: number;
  /** GLOBAL garson havuzu (B2): düz liste, uzunluk = tutulmuş garson sayısı. */
  waiters: Waiter[];
  /** Katın TEK bulaşıkçısı (yoksa null). */
  dishwasher: Waiter | null;
  padGate: GateState;
  activePads: PadDef[];
  fillReady: boolean;
  onFillId: string | null;
  out: World;
  questDoneIndex: number;
  quest: QuestView | null;
  /** D-142: `lifetime`ın `GELIR_ORNEK_SN` aralıklı örnekleri (transient) — seviye ₺'si "son 60 sn'de
   *  kazanılan"dan okunur. */
  gelirIzi: number[];
  gelirIziT: number;
  levelUp: LevelUpOdul | null;
}

/** Kare bağlamını girişteki durumdan kurar (eski tick() prologu). */
export function createTickCtx(s: GameState, dt: number): TickCtx {
  const world = deriveWorld(s.padsDone);
  const tableCount = world.tables.length;
  const c: TickCtx = {
    dt,
    s,
    npcs: s.npcs.map((n) => ({ ...n, pos: [...n.pos] as Vec3 })),
    // pos klonlanır (mıknatıs hareketinde mutasyon önceki state'i bozmasın).
    coins: s.coins.map((x) => ({ ...x, pos: [...x.pos] as Vec3 })),
    dishes: s.dishes.map((d) => ({ ...d, pos: [...d.pos] as Vec3 })),
    wallet: s.wallet,
    lifetime: s.lifetime,
    padsDone: s.padsDone,
    padFills: s.padFills,
    // D-015: masa/servis/personel padsDone'dan TÜRETİLİR (kare anlık görüntüsü; kare içinde
    // ayrıca mutasyona uğramaz — pad açılınca yalnız padsDone büyür, gerisi türetilir).
    world,
    tables: tableCount,
    areasOpen: world.areasOpen,
    openSvc: openServices(world.areasOpen),
    place: servicePlace(world.areasOpen),
    // Personelin oyuncudan kaçarken masaya itilmemesi için masa gövdeleri (navStep avoidSolids).
    obstacles: tableSolids(tableCount),
    // Personel (garson/bulaşıkçı) BFS ızgarası — masa+alan sayısına göre cache'li.
    navGrid: getNavGrid(tableCount, world.areasOpen),
    upgradeFills: s.upgradeFills.slice(),
    activeSpot: null,
    stationLevels: s.stationLevels.slice(), // SERVİS başına ocak seviyesi (bu karede yükselebilir)
    tableLevels: s.tableLevels.slice(), // masa-başı seviyeler (kopya; bu karede yükseltilebilir)
    lavaboLevel: s.lavaboLevel,
    incomeMult: collectionMult(s.goalsClaimed ?? []),
    carryMult: reputationCarryMult(levelProgress(s.xp).level),
    masterTip: masterTipsOf(s.mastersOwned ?? [], tableCount),
    ready: { ...s.ready },
    brewProgress: { ...s.brewProgress },
    tray: s.tray,
    trayFood: s.trayFood,
    cleanCups: s.cleanCups,
    legen: { ...s.legen },
    carriedDirty: s.carriedDirty,
    carriedDirtyFood: s.carriedDirtyFood,
    tableUpgradeFills: s.tableUpgradeFills.slice(),
    lavaboFill: s.lavaboFill,
    notice: s.notice,
    // Bildirim kuyruğu: bitiş/reveal/seviye toast'ları tek slotu EZMEK yerine sıraya girer (B paketi).
    noticeQueue: [...s.noticeQueue],
    enqueueNotice: (n: GameNotice) => { c.noticeQueue.push(n); },
    revealSeen: s.revealSeen,
    questPhase: s.questPhase,
    questPhaseT: s.questPhaseT,
    xp: s.xp, // toplam XP (bu karede eylem ödülleriyle artabilir; level türetilir)
    // Kalıcı eylem sayaçları (bu karede artabilir). waiterServedByService dizisi de klonlanır (v21).
    stats: {
      ...s.stats,
      waiterServedByService: s.stats.waiterServedByService.slice(),
      teasServedByArea: s.stats.teasServedByArea.slice(),
    },
    questIndex: s.questIndex,
    questsDone: s.questsDone,
    questBase: s.questBase,
    camFocus: s.camFocus,
    // Kamera odak tetikleri aynı karede üst üste binebilir (reveal + görev geçişi + alan açılışı) —
    // 2026-06-11 fix: kare-içi ÖNCELİK (reveal 1 < görev 2 < alan 3); düşük öncelik yükseği EZEMEZ.
    camPrio: 0,
    // GEÇİŞ KAPISI (G-44) — bu tick'te İSTENEN odak, kimin istediğiyle birlikte. questSystem
    // tick'in SONUNDA koştuğu için, odak isteyen sistemler (reveal prio 1, alan açılışı prio 3)
    // istediklerinde görevin bitip bitmediği henüz bilinmiyor; istek burada not edilir, kutlama
    // penceresine düşüp düşmediğine questSystem karar verir.
    camIstek: null,
    camBekleyen: s.camBekleyen,
    requestFocus: (pos: RVec3, prio: number) => {
      // H1/K2 KAPISI: hedef ZATEN ekrandaysa pan ATILMAZ. Ölçümde erken zincirdeki 6 panın
      // 6'sında hedef görünürdü — pan bilgi değil yalnız hareket taşıyordu ve oyuncu bu sırada
      // toplam 11,02 sn kendi karakterini göremiyordu (docs/erisim-raporu-h1.md).
      // Kural ÖNCELİKTEN BAĞIMSIZ (alan açılışı dahil): ekranda duran bir şeye kamerayı
      // kaydırmak hangi öncelikle yapılırsa yapılsın aynı şeyi kazandırıyor — hiçbir şey.
      // HUD'un "hedefi göster" düğmesi (`store.focusQuest`) bu kapıdan GEÇMEZ: orada panı
      // oyuncunun kendisi istemiştir.
      if (hedefEkranda(pos[0], pos[2])) return;
      if (prio >= c.camPrio) {
        c.camFocus = { pos: [pos[0], pos[1], pos[2]], ttl: CAM_FOCUS_TTL };
        c.camPrio = prio;
        c.camIstek = { pos: [pos[0], pos[1], pos[2]], prio };
      }
    },
    nextId: s.nextId,
    spawnTimer: s.spawnTimer - dt,
    spawnArea: s.spawnArea,
    // Ara değerler: üreten sistem yazana kadar giriş değeri/boş.
    dirty: new Set<number>(),
    liveNpcs: [],
    input: [0, 0],
    pr: LAYOUT.playerRadius,
    player: s.player,
    autoCollectSum: s.autoCollectSum,
    autoCollectToastCooldown: s.autoCollectToastCooldown,
    trayCap: 0,
    waiters: s.waiters,
    dishwasher: s.dishwasher,
    padGate: { padsDone: s.padsDone, tables: tableCount, stationLevel: s.stationLevels[0], lifetime: 0 },
    activePads: [],
    fillReady: false,
    onFillId: null,
    out: world,
    questDoneIndex: s.questDoneIndex,
    gelirIzi: s.gelirIzi,
    gelirIziT: s.gelirIziT - dt,
    levelUp: s.levelUp,
    quest: s.quest,
  };
  return c;
}

/**
 * SERVİS NOKTASI — hazır ürün kuyruğu (D-011 §3 + bardak döngüsü Faz 2e §5).
 *
 * B2: kat TEK noktadan üretir ve o nokta seviyesine göre BİRDEN ÇOK ürün yapabilir (L5'ten sonra
 * çay + tost). Eskiden her servis kendi tek ürününü kendi kuyruğuna demliyordu; şimdi tek tezgâh
 * aynı anda TEK kalem hazırlar ve hangi kalemi hazırlayacağını TALEP söyler:
 *   açık = (o ürünü bekleyen müşteri) − (o üründen hazır olan)
 * En büyük açığı olan ürün ilerler; eşitlikte çay (ucuz+hızlı olan akışı tıkamaz). Seçilmeyen
 * ürünün yarım ilerlemesi KAYBOLMAZ, olduğu yerde bekler — ürün değiştirmek ceza değildir.
 * Kuyruk kapasitesi ve temiz bardak havuzu ORTAKTIR (korunum değişmezi tek kalır).
 */
function brewSystem(c: TickCtx): void {
  // NOT: talep `npcs` üstünden okunur, `liveNpcs` üstünden DEĞİL — brewSystem sıranın BAŞINDA
  // çalışır, `liveNpcs`i npcSystem sonra doldurur. `npcs` kare başındaki listedir (doğru girdi).
  const { dt, dishes, stationLevels, tableLevels, ready, brewProgress, npcs } = c;
  let cleanCups = c.cleanCups;
  const level = stationLevels[THE_SERVICE] ?? 0;
  const menu = serviceMenu(level);
  const queueCap = brewQueueCapacity(level);
  const readyTotal = menu.reduce((n, p) => n + ready[p], 0);

  if (readyTotal < queueCap && cleanCups > 0) {
    // Bekleyen talep (kuyruğa girmiş müşteriler) ürün başına.
    const want: Record<ProductId, number> = { tea: 0, tost: 0 };
    for (const n of npcs) if (n.state === 'waitingForTea') want[n.product] += 1;
    // En büyük açığı olan ürünü seç; hiçbir ürünün açığı yoksa yine de stok yap (menünün ilki).
    let pick: ProductId = menu[0];
    let bestGap = -Infinity;
    for (const p of menu) {
      const gap = want[p] - ready[p];
      if (gap > bestGap + 1e-9) { bestGap = gap; pick = p; }
    }
    const cupBrewTime = brewTime(level, PRODUCTS[pick].prepTime);
    brewProgress[pick] += dt;
    let total = readyTotal;
    while (total < queueCap && cleanCups > 0 && brewProgress[pick] >= cupBrewTime) {
      ready[pick] += 1;
      total += 1;
      cleanCups -= 1;
      brewProgress[pick] -= cupBrewTime;
    }
    if (total >= queueCap || cleanCups <= 0) brewProgress[pick] = Math.min(brewProgress[pick], cupBrewTime);
  }

  // Kirli masalar (D-019): eşiği aşan masalar müşteriye/garsona kapalı (temizlik baskısı).
  // Y2: eşik koltukla ölçeklenir → seviye gerekir.
  const dirty = dirtyTables(dishes, tableLevels);
  c.cleanCups = cleanCups;
  c.dirty = dirty;
}

/**
 * Spawn (Y2 GRUP sistemi, plan §2)
 */
function spawnSystem(c: TickCtx): void {
  const { npcs, tables, areasOpen, tableLevels, dirty, stationLevels } = c;
  // B2: müşteri ÜRÜNÜNÜ gelirken seçer; tost payı servis SEVİYESİNDEN gelir (L5 öncesi 0 → herkes
  // çay ister, eski davranışla birebir). Sipariş nesnesi `{çay:1, tost:2}` Faz C'de.
  const pTost = tostShare(stationLevels[THE_SERVICE] ?? 0);
  let nextId = c.nextId;
  let spawnTimer = c.spawnTimer;
  let spawnArea = c.spawnArea;
  // S4 kolu: tavanın KAPSAMI. Bugün yalnız `!hasLeftTable` olanlar sayılıyor — yani oturan/gelen
  // nüfusun tavanı var, EKRANDAKİ TOPLAM nüfusun yok (`leaving`/WC sayılmıyor).
  const activeCount = izdihamKolu?.tavanTumNufusa === true
    ? npcs.length
    : npcs.filter((n) => !hasLeftTable(n.state)).length;
  // Müşteri tavanı KOLTUK+2 (masa değil — Y2; M3'ün masa+2 fix'inin koltuklu hali).
  let totalSeats = 0;
  for (let i = 0; i < tables; i++) totalSeats += seatsAtTable(i, tableLevels[i] ?? 0);
  const maxConcurrent = Math.max(C.npc.maxConcurrent, totalSeats + 2);
  if (spawnTimer <= 0 && activeCount < maxConcurrent) {
    const occ = occupiedSeats(npcs);
    const target = findTableForGroup(occ, tables, dirty, tableLevels, areasOpen, spawnArea);
    if (target >= 0) {
      // Grup boyu zarla (%30/35/20/15); koltuk yetmezse KÜÇÜLÜR, tavan da aşılmaz.
      const seats = LAYOUT.tables[target].seats;
      const taken = occ.get(target) ?? new Set<number>();
      const freeSeats = seatsAtTable(target, tableLevels[target] ?? 0) - taken.size;
      const size = Math.min(rollGroupSize(Math.random()), freeSeats, maxConcurrent - activeCount);
      // KENDİ zone'unun sokağında belir → o zone'un kapısından girer (dış dünya hissi).
      // Üyeler sokakta hafif saçılır (üst üste binmesin); her üye FARKLI koltuğa atanır,
      // çay/timer/ödeme/bahşiş bireysel (ekonomi korunumu bozulmaz).
      const street = streetAt(areasOpen);
      let placed = 0;
      for (let k = 0; k < seats.length && placed < size; k++) {
        if (taken.has(k)) continue;
        npcs.push({
          id: nextId++,
          state: 'toTable',
          pos: [street[0] + (placed - (size - 1) / 2) * 0.55, street[1], street[2] + placed * 0.35],
          tableIndex: target,
          seatIndex: k,
          timer: 0,
          product: Math.random() < pTost ? 'tost' : 'tea',
          color: NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)],
        });
        placed += 1;
      }
      spawnTimer += C.npc.spawnInterval;
      spawnArea = (areaOfTable(target) + 1) % areasOpen; // sıradaki grup bir SONRAKİ alandan başlasın
    } else {
      spawnTimer = 0; // koltuk boşalınca hemen denesin
    }
  }
  c.nextId = nextId;
  c.spawnTimer = spawnTimer;
  c.spawnArea = spawnArea;
}

/**
 * NPC durum makinesi
 */
function npcSystem(c: TickCtx): void {
  const { dt, npcs, coins, dishes, navGrid, tableLevels, questIndex, areasOpen, lavaboLevel, incomeMult, masterTip } = c;
  let cleanCups = c.cleanCups;
  let nextId = c.nextId;
  const step = NPC_SPEED * dt;
  // ÖLÇÜM KOLU bir kez okunur (sıcak yolda her NPC için tekrar okunmasın); null = bugünkü hâl.
  const kol = izdihamKolu;
  const removed: number[] = [];
  for (const n of npcs) {
    const slot = LAYOUT.tables[n.tableIndex];
    // TEK KAPI (D-023): tüm müşteriler binanın kapısından girer/çıkar. B3-2: kapı 2. Alan
    // açılınca cephenin ortasına kayar (maket v13 adım 2) → koordinat `areasOpen`'a bağlı.
    const nEntrance = entranceAt(areasOpen);
    const nStreet = streetAt(areasOpen);
    switch (n.state) {
      case 'toTable': {
        // Önce KAPIYA (sokaktaysa düz yürü — dışarıda engel yok), sonra koltuğa BFS rotayla
        // (navStep): eksen-kayması (moveAvoid) ön-sıra masayı dolaşamayıp KİLİTLENİYORDU →
        // müşteri arka masaya hiç oturamıyor, masayı süresiz rezerve ediyordu (telefon bug'ı 2026-06-11).
        const goingIn = n.pos[2] > nEntrance[2] + 0.2;
        // Y2: hedef ATANAN koltuk (grup üyeleri aynı masada farklı koltuğa oturur).
        const seat = slot.seats[n.seatIndex];
        if (goingIn) {
          moveToward(n.pos, nEntrance, step);
        } else if (navStep(n.pos, seat, step, navGrid, 0.5)) {
          // Oturdu (koltuğa tam otur); çay servisini bekler. Sabır timer'ı başlar (D-011);
          // OTURDUĞU masanın seviyesi sabrı uzatır (Faz 2h).
          n.pos[0] = seat[0];
          n.pos[2] = seat[2];
          n.state = 'waitingForTea';
          n.timer = tablePatience(tableLevels[n.tableIndex] ?? 0, n.product);
        } else {
          // Sigorta: rota bulunamayıp uzun süre oturamadıysa vazgeçip gider — masa SÜRESİZ
          // rezerve kalamaz (timer toTable'da yürüme-süresi sayacı olarak kullanılır).
          n.timer += dt;
          if (n.timer > 30) n.state = 'leaving';
        }
        break;
      }
      case 'waitingForTea':
        // Çay artık OTO gelmez — oyuncu/garson tepsiyle bırakmalı. Sabır biterse sessizce gider.
        n.timer -= dt;
        if (n.timer <= 0) n.state = 'leaving';
        break;
      case 'drinking':
        n.timer -= dt;
        if (n.timer <= 0) {
          // Öde: parayı masanın yanına düşür — ÜRÜN fiyatı (çay 5 / tost 25, M3) + masa bahşişi (Faz 2h).
          // (turu-5'te kule istifi ve moneySpot saçılımı denendi; kullanıcı İKİSİNİ de beğenmedi →
          // ORİJİNAL davranış geri. Para sunumuna bir daha dokunmadan önce telefonda mockup onayı al.)
          coins.push({
            id: nextId++,
            pos: [slot.table[0] + (Math.random() - 0.5), 0.3, slot.table[2] + 0.6 + (Math.random() - 0.5)],
            // D-090: koleksiyon çarpanı ₺'nin YARATILDIĞI yerde uygulanır (üç tavana dokunmaz,
            // yalnız müşteri başına ₺'yi büyütür — ölçümdeki `hF` kolunun bindiği yer).
            // D-093: Usta masanın bahşişi ×`master.tipMult`. Çarpan YALNIZ bahşişe biner —
            // ürün fiyatına değil: ölçülen kol tam olarak buydu (§2 Bulgu 3), fiyatı da çarpmak
            // ölçülmemiş bir gelir yaratırdı.
            value: (PRODUCTS[n.product].price
              + tableTip(tableLevels[n.tableIndex] ?? 0) * (masterTip[n.tableIndex] ?? 1)) * incomeMult,
          });
          // İçtiği bardak masada KİRLİ kalır (Faz 2e): toplanıp yıkanmalı, yoksa temiz biter.
          // tableIndex ile masaya etiketlenir (D-019): masa-başı eşik aşılınca masa KİRLİ olur.
          // ONBOARDING GATE (kullanıcı 2026-06-10): bulaşık MEKANİĞİ öğretilmeden (q_wash görevi
          // gelmeden) kirli bardak HİÇ çıkmaz — bardak doğrudan temiz havuza döner (korunum bozulmaz,
          // demleme durmaz). q_wash aktif olduğu andan itibaren kirli bırakılır → görevle birlikte öğrenilir.
          if (questIndex >= WASH_QUEST_INDEX) {
            dishes.push({
              id: nextId++,
              pos: [slot.table[0] + (Math.random() - 0.5) * 0.6, 0.95, slot.table[2] + (Math.random() - 0.5) * 0.6],
              tableIndex: n.tableIndex,
              kind: PRODUCTS[n.product].dish, // M3: bardak/tabak görseli
            });
          } else {
            cleanCups += 1;
          }
          // ODA (B4): ödeyip kalkan müşteri, çıkmadan LAVABOYA uğrayabilir. Olasılık odanın
          // seviyesinden gelir (%30 → %55) — lavabo iyileştikçe daha çok kullanılır ve bu GÖZLE
          // görülür. Sabrı biten müşteri buraya hiç gelmez (ödemeden gider) — kol ancak GERÇEK
          // servisle akar, yani lavabo servisi ikame etmez.
          n.state = Math.random() < lavaboVisitChance(lavaboLevel) ? 'toWc' : 'leaving';
        }
        break;
      case 'toWc':
        // Lavabonun kapısına yürü (bant kütlesinin ön yüzü). Varınca İÇERİ GİRER.
        if (navStep(n.pos, LAVABO.spot, step, navGrid, 0.45)) {
          n.pos[0] = LAVABO.door[0];
          n.pos[2] = LAVABO.door[2];
          n.state = 'wcGiris';
          n.timer = WC_GECIS;
        }
        break;
      case 'wcGiris': {
        // S7/G-35: kapı eşiğinde buharlaşmak yerine kapı boşluğundan içeri yürüyüp yana sapar.
        // Yol `layout.wcYol` — sayı burada değil ölçü katmanında (bekçi oradan okur).
        n.timer -= dt;
        const [gx, gz] = wcYol(1 - Math.max(0, n.timer) / WC_GECIS);
        n.pos[0] = gx;
        n.pos[2] = gz;
        if (n.timer <= 0) {
          n.state = 'inWc';
          n.timer = C.rooms.lavabo.visitTime;
        }
        break;
      }
      case 'inWc':
        n.timer -= dt;
        if (n.timer <= 0) {
          n.state = 'wcCikis';
          n.timer = WC_GECIS;
        }
        break;
      case 'wcCikis': {
        // Aynı yol tersten: köşeden kapı boşluğuna, oradan eşiğe.
        n.timer -= dt;
        const [cx2, cz2] = wcYol(Math.max(0, n.timer) / WC_GECIS);
        n.pos[0] = cx2;
        n.pos[2] = cz2;
        if (n.timer <= 0) {
          n.pos[0] = LAVABO.door[0];
          n.pos[2] = LAVABO.door[2];
          // Çıkarken parasını lavabonun ÖNÜNDEKİ istife bırakır (masa istifiyle aynı desen ve
          // aynı saçılım — para SUNUMU değişmedi, yalnız ikinci bir düşme noktası doğdu).
          coins.push({
            id: nextId++,
            pos: [
              LAVABO.coinSpot[0] + (Math.random() - 0.5),
              LAVABO.coinSpot[1],
              LAVABO.coinSpot[2] + (Math.random() - 0.5),
            ],
            value: lavaboFee(lavaboLevel) * incomeMult, // D-090: lavabo ücreti de müşteri başına ₺'dir
          });
          n.state = 'leaving';
        }
        break;
      }
      case 'leaving': {
        // Önce KAPIYA (içerdeyse BFS rotayla — masalara takılmaz), sonra SOKAĞA düz yürü.
        const nearDoor = n.pos[2] >= nEntrance[2] - 0.2 || dist2D(n.pos, nEntrance) <= 0.45;
        if (nearDoor) {
          // S2 kolu: hedef dağıtılırsa herkes aynı noktaya yürümez (kimliğe bağlı, tohumsuz).
          const yay = kol?.cikisDagitimi ?? 0;
          const hedef: Vec3 = yay > 0
            ? [nStreet[0] + (((n.id % 9) - 4) * yay), nStreet[1], nStreet[2]]
            : (nStreet as Vec3);
          const vardi = moveToward(n.pos, hedef, step);
          // S3 kolu: tam varış yerine YARIÇAP. Bugünkü şart `d <= step` (≈0,023 br).
          const R = kol?.silmeYariCapi ?? 0;
          if (vardi || (R > 0 && dist2D(n.pos, hedef) <= R)) removed.push(n.id);
        } else {
          navStep(n.pos, nEntrance, step, navGrid, 0.4);
        }
        break;
      }
    }
  }
  const liveNpcs = removed.length ? npcs.filter((n) => !removed.includes(n.id)) : npcs;
  npcAyristir(liveNpcs, dt);
  c.cleanCups = cleanCups;
  c.nextId = nextId;
  c.liveNpcs = liveNpcs;
}

/**
 * Ayrışmanın dokunmadığı durumlar: oturanın yeri koltuktur, WC'dekinin gövdesi çizilmez.
 *
 * `leaving` (T6, D-140): çıkanların HEPSİ tek bir sokak noktasına yürür ve silme şartı tam
 * varıştır. Ayrışma (2,4 br/sn) yürüyüşten (1,4) güçlü olduğu için kalabalık o noktanın
 * etrafında halka kurup hiç silinmiyordu — 10 dakikada kapıda 461 NPC (`docs/izdiham-raporu-t6.md`).
 * Çıkış hattında çakışma kısa ömürlü ve kapıdan dışarıda; muafiyetin görsel bedeli yok.
 */
export const AYRISMASIZ: ReadonlySet<Npc['state']> = new Set<Npc['state']>([
  'waitingForTea', 'drinking', 'inWc', 'wcGiris', 'wcCikis', 'leaving',
]);

/**
 * MÜŞTERİ-MÜŞTERİ AYRIŞMASI (S18, kullanıcı: *"gelen misafirler baya yan yana iç içe yürüyo"*).
 *
 * NEDEN YENİ BİR KUVVET, NEDEN AYAR DEĞİL: ölçüm (`docs/olcum-musteri.txt` §3) yürüyen çiftlerin
 * **%1,51'inin** iç içe olduğunu, görülen en kısa aranın **0,056 br** (çakışma eşiği 2r = 0,560)
 * olduğunu gösterdi — gövdeler neredeyse tamamen üst üste. Sebep bir eşiğin küçük olması değil:
 * `navStep`in ayrışma parametresi YALNIZ personele, oyuncudan kaçmak için veriliyordu; müşteriler
 * arasında böyle bir çağrı kodda HİÇ YOKTU. Yani ayarlanacak bir sayı değil, eksik bir kuvvet.
 *
 * KUVVET DEĞİL KONUM DÜZELTMESİ: hedefe gidiş `moveToward`/`navStep`in işi; burası yalnız
 * ÇAKIŞMAYI açar. İki gövde birbirine girerse ikisi de yarı yarıya, aralarındaki eksende
 * itilir — simetrik olduğu için hangi müşterinin önce işlendiği sonucu DEĞİŞTİRMEZ (dizi
 * sırasına bağlı bir sapma doğmaz, `tick-fingerprint` tekrarlanabilir kalır).
 *
 * `dt` İLE KELEPÇELİ: düzeltme bir karede en fazla `AYRISMA_HIZ × dt` kadar. Kelepçesiz tam
 * ayırma, kalabalıkta müşterileri birbirinden fırlatır (zincirleme itme); yumuşak düzeltme
 * birkaç karede aynı sonucu verir ama görsel olarak yürüyüş gibi durur.
 *
 * HEDEFE VARMA BOZULMAZ: oturan müşteri (`waitingForTea`/`drinking`) ayrışmaya GİRMEZ — yeri
 * koltuktur, itilirse masadan kalkmış görünür. WC geçişindekiler de çizilmediği için dışarıda.
 */
/**
 * AYRISMA DUZELTMESININ KARE BASI TAVANI (br/sn). Suprunlerek olculdu (kisa kosu, ayni tohum):
 *
 *   AYRISMA_HIZ | cakisan cift | en kisa ara | servis
 *   ------------|--------------|-------------|-------
 *   0 (kapali)  |       %1,40  |      0,046  |  22
 *   1,2         |       %0,79  |      0,342  |  21
 *   2,4         |       %0,60  |      0,413  |  20     <- SECILEN
 *   4,0         |       %0,60  |      0,413  |  20
 *
 * KIYAS AYNI HIZDA YAPILDI (NPC_SPEED 1,40). Ilk yazdigim tablo "S18 oncesi %1,51" diyordu ve
 * o satir GECERSIZDI: 2,60 br/sn'deki bir kosudan aliniyordu, oysa hiz dusunce ayni anda yuruyen
 * musteri sayisi ~3 kat artiyor ve yuzde tabani degisiyor. Kontrollu A/B yukaridaki tablodur.
 *
 * 2,4te DIZ var: ustune cikmak hicbir sey eklemiyor, cunku kelepce artik baglayici degil —
 * kalan cakisma KAPI HUNISINDEN geliyor. Orada iki musteri ayni noktaya yuruyor; ayrisma iter,
 * hedefe gidis geri toplar ve denge 0,413te kuruluyor. Bu bir kusur degil dar gecidin kendisi:
 * 0,560 (2r) tam temas, 0,056 ise neredeyse tam ic ice demekti.
 *
 * SERVIS SAYISI DEGISMIYOR (21 -> 20, tohum gurultusu): ayrisma hedefe varmayi bozmuyor.
 */
const AYRISMA_HIZ = 2.4;

function npcAyristir(npcs: Npc[], dt: number): void {
  const r2 = LAYOUT.actorRadius * 2;
  const enFazla = AYRISMA_HIZ * dt;
  for (let i = 0; i < npcs.length; i++) {
    const a = npcs[i];
    if (AYRISMASIZ.has(a.state)) continue;
    for (let j = i + 1; j < npcs.length; j++) {
      const b = npcs[j];
      if (AYRISMASIZ.has(b.state)) continue;
      const dx = b.pos[0] - a.pos[0];
      const dz = b.pos[2] - a.pos[2];
      const d2 = dx * dx + dz * dz;
      if (d2 >= r2 * r2) continue;
      // TAM ÜST ÜSTE hâli: yön yok, bölme sıfıra düşer. Kimliğe bağlı sabit bir eksen seçilir
      // (rastgele DEĞİL — tohumlu koşu tekrarlanabilir kalmalı).
      let ux: number;
      let uz: number;
      let d: number;
      if (d2 < 1e-8) {
        const aci = ((a.id * 2654435761) % 1000) / 1000 * Math.PI * 2;
        ux = Math.cos(aci);
        uz = Math.sin(aci);
        d = 0;
      } else {
        d = Math.sqrt(d2);
        ux = dx / d;
        uz = dz / d;
      }
      const itme = Math.min(enFazla, (r2 - d) * 0.5);
      a.pos[0] -= ux * itme;
      a.pos[2] -= uz * itme;
      b.pos[0] += ux * itme;
      b.pos[2] += uz * itme;
    }
  }
}

/**
 * Oyuncu hareketi (D-016: mobilya collision'ı)
 * Collision YALNIZ input'la harekette uygulanır (eksen-başı kayma); doğrudan setState/__teleport
 * (testler/dev kancası) input'suz konum atadığında engellenmez → birim/smoke testleri etkilenmez.
 */
function playerMoveSystem(c: TickCtx): void {
  const { dt, s, tables, areasOpen } = c;
  const jMag = Math.hypot(s.inputJoystick[0], s.inputJoystick[1]);
  const input = jMag > 0.05 ? s.inputJoystick : s.inputKeyboard;
  const pr = LAYOUT.playerRadius;
  const oldX = s.player[0];
  const oldZ = s.player[2];
  // D-092: İtibar seviyesi taşıma hızını büyütür — oyuncu da bir taşıyıcıdır (ölçüm kolu
  // `carryRateOf` oyuncu + garson toplamıydı, ikisine de biner).
  const moveSpeed = playerSpeedFor(s.charUpgrades.speed) * c.carryMult; // hız kademesinden (v20)
  const dxIn = input[0] * moveSpeed * dt;
  const dzIn = input[1] * moveSpeed * dt;
  // Oyuncu yalnız AÇIK zone'ların BİRLEŞİMİNDE gezer (M2 union kelepçesi; L-şekil destekli —
  // kilitli salonun "boş arsa"sına girilmez).
  let [nx, nz] = clampToOpenAreas(oldX + dxIn, oldZ + dzIn, areasOpen);
  if (dxIn !== 0 || dzIn !== 0) {
    // MOBİLYA = KATI engel: yeni bir engele GİRİŞ bloklanır (eksen-başı kayma; kafa kafaya gelince durur).
    // AMA oyuncu zaten bir engelin İÇİNDEyse (ör. üstünde masa açıldı) kilitlenmesin → çıkışına izin ver
    // (aktör collision'ındaki desenin aynısı). Böylece "zorlasan da giremezsin" korunur ama hapsolmazsın.
    const furn = oyuncuKatilari(tables, areasOpen, s.tableLevels);
    const stuckInFurn = hitsSolid(oldX, oldZ, furn, pr);
    if (dxIn !== 0 && hitsSolid(nx, oldZ, furn, pr) && !stuckInFurn) nx = oldX;
    if (dzIn !== 0 && hitsSolid(nx, nz, furn, pr) && !stuckInFurn) nz = oldZ;
    // AKTÖR çarpışması KALDIRILDI (turu-5 m.9): oyuncu müşteri/personel kalabalığının içinden
    // geçer (kalabalıkta yürünemiyordu). Personel zaten navStep separation'ıyla oyuncuya yol verir.
  }
  const player = [nx, s.player[1], nz] as Vec3;
  c.input = input;
  c.pr = pr;
  c.player = player;
}

/**
 * Para mıknatısı + toplama (Faz 2f juice)
 * attractRadius içine giren para oyuncuya doğru GERÇEKTEN akar (hız > oyuncu hızı → daima yetişir),
 * pickupRadius'a varınca toplanır. Mıknatıs store'da yapıldığı için görsel = mantık → "yapışıp
 * toplanmayan para" bug'ı yapısal olarak imkansız (Coins.tsx sadece c.pos'u çizer).
 */
function coinSystem(c: TickCtx): void {
  const { dt, s, enqueueNotice, stats, player } = c;
  let coins = c.coins;
  let wallet = c.wallet;
  let lifetime = c.lifetime;
  let autoCollectSum = s.autoCollectSum;
  let autoCollectToastCooldown = Math.max(0, s.autoCollectToastCooldown - dt);
  if (coins.length) {
    const attractR = attractRadiusFor(s.charUpgrades.magnet); // mıknatıs kademesinden (v20)
    const keep: Coin[] = [];
    for (const c of coins) {
      const inMagnet = dist2D(player, c.pos) < attractR;
      if (inMagnet) {
        moveToward(c.pos, player, C.money.attractSpeed * dt);
      }
      if (dist2D(player, c.pos) < C.money.pickupRadius) {
        wallet = wallet.add(c.value);
        lifetime = lifetime.add(c.value);
        stats.coinsCollected += 1;
        continue;
      }
      // OTO-TOPLAMA (2026-06-13): uzun süre yerde bekleyen para kendiliğinden cüzdana girer.
      // Mıknatıs alanındaki coin'e dokunulmaz (zaten oyuncuya akıyor — manuel toplama hissi korunur).
      // stats.coinsCollected ARTMAZ (o sayaç manuel toplamanın quest/öğretici ölçüsü).
      c.age = (c.age ?? 0) + dt;
      if (!inMagnet && C.money.autoCollectAfter > 0 && c.age >= C.money.autoCollectAfter) {
        wallet = wallet.add(c.value);
        lifetime = lifetime.add(c.value);
        autoCollectSum += c.value;
        continue;
      }
      keep.push(c);
    }
    coins = keep;
  }
  // Oto-toplama bildirimi TOPLU çıkar (en sık autoCollectToastEvery sn'de bir) — kullanıcı
  // paranın kendiliğinden toplandığını GÖRSÜN ama toast spam'ı olmasın.
  if (autoCollectSum > 0 && autoCollectToastCooldown <= 0) {
    enqueueNotice({ text: t('Bekleyen paralar otomatik toplandı'), ttl: 4, kind: 'reveal', reward: autoCollectSum });
    autoCollectSum = 0;
    autoCollectToastCooldown = C.money.autoCollectToastEvery;
  }
  c.coins = coins;
  c.wallet = wallet;
  c.lifetime = lifetime;
  c.autoCollectSum = autoCollectSum;
  c.autoCollectToastCooldown = autoCollectToastCooldown;
}

/**
 * Servis (D-011): ocakta tepsiyi doldur, bekleyen masalara çay bırak (yakınlık)
 */
function serveSystem(c: TickCtx): void {
  const { s, ready, carriedDirty, carriedDirtyFood, stats, liveNpcs, player } = c;
  let tray = c.tray;
  let trayFood = c.trayFood;
  let xp = c.xp;
  const trayCap = trayCapacityFor(s.charUpgrades.tray);
  // Servise yaklaşınca HAZIR üründen tepsi dolar. PAYLAŞIMLI kapasite (2026-06-09): ürün + kirli
  // aynı tepsiyi paylaşır → toplam trayCap'i aşamaz. Karışık taşıma serbest (deadlock'u engeller).
  // B2: tek noktadan iki ürün alınabilir — çay tepsinin bardak bölmesine, tost tabak bölmesine.
  // H1/O3: tetik tezgâhın ÇİZİLEN gövdesinden. Eskiden tezgâhın MERKEZİNDEN 1,6 br'lik daireydi
  // ve tezgâh 3,2 br uzun: uçta duran oyuncu merkeze 1,57-2,07 br kalıyor, semaverin tam önünde
  // durup hiçbir şey alamıyordu (ölü ön yüz 0,72 br — docs/erisim-raporu-h1.md).
  if (
    tray + trayFood + carriedDirty + carriedDirtyFood < trayCap &&
    atServiceBody(player[0], player[2], c.place, C.serving.pickupReach)
  ) {
    for (const prod of ['tea', 'tost'] as const) {
      const free = trayCap - tray - trayFood - carriedDirty - carriedDirtyFood;
      if (free <= 0) break;
      const take = Math.min(free, ready[prod]);
      if (take <= 0) continue;
      if (prod === 'tost') trayFood += take;
      else tray += take;
      ready[prod] -= take;
      stats.teaPickups += take; // generic "üründen al" sayacı (görevler ortak)
    }
  }
  // Bekleyen masaya yaklaşınca tepsiden ÜRÜN bırak → müşteri içmeye/yemeye başlar (toplu servis).
  // K5 (T9c · D-147): tetik masanın GÖVDESİNDEN, kirli kap toplamayla AYNI pay. Eskiden masa
  // MERKEZİNDEN 1,6 br daireydi; dörtlü masanın köşesine dayanan oyuncu merkeze ~1,86 br'de
  // kalıyor, çay bırakılmıyordu (yanaşık yönlerin %69,3'ü — docs/servis-raporu-t9c.md).
  // B2: müşterinin istediği ürün ARTIK MÜŞTERİNİN KENDİSİNDE (n.product) — eskiden masasının
  // bölgesinden okunuyordu. Tepside O ürün yoksa servis OLMAZ (çayla tost müşterisi doyurulamaz).
  if (tray > 0 || trayFood > 0) {
    for (const n of liveNpcs) {
      if (tray <= 0 && trayFood <= 0) break;
      if (n.state !== 'waitingForTea') continue;
      const wantsFood = n.product === 'tost';
      if (wantsFood ? trayFood <= 0 : tray <= 0) continue;
      if (atTableBody(player[0], player[2], n.tableIndex, C.cups.collectReach)) {
        n.state = 'drinking';
        n.timer = C.npc.eatTime;
        if (wantsFood) trayFood -= 1;
        else tray -= 1;
        stats.teasServed += 1;
        if (wantsFood) stats.tostServed += 1; // "3 tost servis et" görevi (B2: alan sayacı değil)
        // Alan sayacı: hangi ALANDA servis verdiği (alanlı serveTea görevleri için) — ürünle ilgisi yok.
        const a = areaOfTable(n.tableIndex);
        stats.teasServedByArea[a] = (stats.teasServedByArea[a] ?? 0) + 1;
        xp += C.xp.perTeaServed;
      }
    }
  }
  c.tray = tray;
  c.trayFood = trayFood;
  c.xp = xp;
  c.trayCap = trayCap;
}

/**
 * Bardak döngüsü (Faz 2e): oyuncu masadaki kirli bardakları toplar, bulaşıkta yıkar (yakınlık)
 * PAYLAŞIMLI kapasite (2026-06-09): çay taşırken de kirli toplanabilir → toplam trayCap'i aşamaz.
 */
function dishCycleSystem(c: TickCtx): void {
  const { tray, trayFood, stats, trayCap, player, place } = c;
  let dishes = c.dishes;
  let cleanCups = c.cleanCups;
  let carriedDirty = c.carriedDirty;
  let carriedDirtyFood = c.carriedDirtyFood;
  let xp = c.xp;
  if (tray + trayFood + carriedDirty + carriedDirtyFood < trayCap && dishes.length) {
    const keep: Dish[] = [];
    for (const d of dishes) {
      // H1/M3: tetik kabın rastgele düştüğü noktadan değil, kabın DURDUĞU MASANIN gövdesinden.
      // Eskiden kap masa merkezinden ±0,30 br saçılıyor, oyuncu ise kenardan en yakın 1,31 br'de
      // durabiliyordu: kap ters köşeye düşünce 1,61 br > 1,40 ve toplama olmuyordu. Yani masanın
      // hangi yanından toplanacağını RASTGELE BİR SAYI seçiyordu (docs/erisim-raporu-h1.md).
      if (
        tray + trayFood + carriedDirty + carriedDirtyFood < trayCap &&
        atTableBody(player[0], player[2], d.tableIndex, C.cups.collectReach)
      ) {
        // turu-5 m.11: kirli kabın TÜRÜ tepsi görseline taşınır (tabak ≠ bardak); havuz/yıkama ortak.
        if (d.kind === 'plate') carriedDirtyFood += 1;
        else carriedDirty += 1;
      } else keep.push(d);
    }
    dishes = keep;
  }
  // Bulaşık noktasına yaklaşınca taşınan kirliler yıkanır → GLOBAL temiz havuza (B2: tek nokta).
  if (carriedDirty + carriedDirtyFood > 0 && dist2D(player, place.dish) < C.cups.washRadius) {
    const washed = carriedDirty + carriedDirtyFood;
    cleanCups = legeneBirak(c, cleanCups, carriedDirty, carriedDirtyFood);
    stats.dishesWashed += washed;
    xp += C.xp.perDishWashed * washed;
    carriedDirty = 0;
    carriedDirtyFood = 0;
  }
  c.dishes = dishes;
  c.cleanCups = cleanCups;
  c.carriedDirty = carriedDirty;
  c.carriedDirtyFood = carriedDirtyFood;
  c.xp = xp;
}

/**
 * GARSON HAVUZU (B2 — D-060). Eskiden garson bölgeye aitti: kendi bölgesinin ocağından alır, YALNIZ
 * kendi bölgesinin masalarına götürürdü (D-012/D-022). Kat tek servisten döndüğü için o ayrım
 * anlamını yitirdi — havuz GLOBAL: hepsi aynı noktadan alır, hepsi her masaya gider.
 * Kısmi assist korunur (D-014): oyuncudan yavaş ve küçük tepsili.
 * ÜSTLENME (claim) BAĞLAYICI (D-046 ② — C3'te uygulandı): garson bir masayı üstlenince teslim
 * edene kadar bırakmaz, üstlendiği masa diğer garsonlara kapalıdır. Eskiden claim yalnız O KARE
 * için tutuluyordu ve hedef her karede yeniden seçiliyordu; `docs/kuyruk-raporu-c3.md` bunun
 * ölçülebilir bedelini gösterdi (ilk durağına giderken hedefinden başlangıç mesafesinin 5,6 katı
 * kadar uzaklaşan garson; modelin beklediğinin 2,35 katı tur süresi).
 * Boşta bekleme noktaları 0.7 br arayla yan yana.
 * Tepsi B2'de İKİ BÖLMELİ (çay/tost): garson en acil bekleyenin ürününü yükler.
 */
function waiterSystem(c: TickCtx): void {
  const { dt, s, world, obstacles, navGrid, ready, stats, dirty, liveNpcs, player, place } = c;
  let xp = c.xp;
  let dishes = c.dishes;
  let cleanCups = c.cleanCups;
  const svc = world.services[THE_SERVICE];
  const wCount = svc?.open ? Math.min(svc.waiters, MAX_WAITERS) : 0;
  if (wCount === 0) {
    c.waiters = [];
    return;
  }
  const wStep = waiterSpeedFor(s.waiterUpgrades.speed) * c.carryMult * dt; // D-092: İtibar çarpanı
  const wTrayCap = waiterTrayCapacityFor(s.waiterUpgrades.tray);
  /**
   * DEMLEME KİLİDİ (D-083): tezgâhta hazır ürün YOK ve temiz bardak da YOK ⇒ yeni ürün
   * ÇIKAMAZ (demleme bir temiz bardak harcar). Bu durumda garsonun tezgâha gidip yüklenmeyi
   * beklemesi sonsuz bir bekleyiştir — bardak ancak biri yıkarsa döner. Bekçi (`tests/bardak.test.ts`
   * ③) tam bu deliği yakaladı: masaların bir kısmı temiz kaldığında bekleyen müşteri hiç bitmiyor,
   * garson "boşta" sayılmıyor ve kilit, boşta-bulaşık kuralına RAĞMEN sürüyordu.
   */
  const demlemeKilidi = ready.tea + ready.tost === 0 && cleanCups === 0;
  const prev = s.waiters;
  const out: Waiter[] = [];
  // ÜSTLENME (claim) — hedeflenen masa index'leri. Önceki karenin üstlenmeleri, bu karenin YENİ
  // seçimlerinden ÖNCE yer tutar: yoksa 1. garsonun taze seçimi, 2. garsonun yolun yarısında
  // olduğu masayı kapar ve onu geri döndürürdü (D-046 ②'nin tam olarak yasakladığı şey).
  const claimed = new Set<number>();
  for (let i = 0; i < wCount; i++) {
    const c = prev[i]?.claim;
    if (c != null) claimed.add(c);
  }

  for (let i = 0; i < wCount; i++) {
    const home: Vec3 = waiterHomeAt(place, i);
    const p = prev[i];
    const w: Waiter = p
      ? { pos: [...p.pos] as Vec3, tray: p.tray, trayFood: p.trayFood ?? 0, claim: p.claim,
          dirtyCarry: p.dirtyCarry ?? 0, dirtyCarryFood: p.dirtyCarryFood ?? 0 }
      : { pos: [...home] as Vec3, tray: 0, trayFood: 0, dirtyCarry: 0, dirtyCarryFood: 0 };
    // Garson kirli masaya ürün GÖTÜRMEZ (D-019). Her garson için YENİDEN filtrelenir (öncekinin
    // bu tick servis ettiği müşteri listeden düşer).
    const waiting = liveNpcs.filter((n) => n.state === 'waitingForTea' && !dirty.has(n.tableIndex));
    // Elindeki ürünle DOYURULABİLİR bekleyenler (tepsisinde çay varsa çay isteyenler…).
    const canServe = (n: (typeof waiting)[number]) => (n.product === 'tost' ? w.trayFood > 0 : w.tray > 0);
    // Kendi üstlendiği masa kendini engellemez; başkasının üstlendiği masa hariç tutulur.
    const claimable = waiting.filter((n) => (n.tableIndex === w.claim || !claimed.has(n.tableIndex)) && canServe(n));

    if (w.tray + w.trayFood > 0 && claimable.length > 0) {
      // ÜSTLENME hâlâ servis edilebiliyorsa KORUNUR (D-046 ②). Düşerse — müşteri kalktı, masa
      // kirlendi ya da tepside o ürün kalmadı — yeniden seçilir.
      const sabit = w.claim == null ? undefined : claimable.find((n) => n.tableIndex === w.claim);
      let best = sabit ?? claimable[0];
      if (!sabit) {
        // İlk seçim: en ACİL (sabrı en az kalan) bekleyen; eşitlikte en yakın (anti-starvation).
        let bestTimer = Infinity;
        let bestDist = Infinity;
        for (const n of claimable) {
          const d = dist2D(w.pos, LAYOUT.tables[n.tableIndex].table);
          if (n.timer < bestTimer - 1e-6 || (Math.abs(n.timer - bestTimer) <= 1e-6 && d < bestDist)) {
            bestTimer = n.timer;
            bestDist = d;
            best = n;
          }
        }
        if (w.claim != null) claimed.delete(w.claim); // düşen üstlenme başkasına serbest kalsın
      }
      w.claim = best.tableIndex;
      claimed.add(best.tableIndex);
      if (navStep(w.pos, LAYOUT.tables[best.tableIndex].table, wStep, navGrid, REACH_TABLE, player, obstacles)) {
        // TEK durakta o masada bekleyen HERKESE tepsi yettiğince bırakır (grup + tepsi-3 = tek seferde).
        for (const n of waiting) {
          if (w.tray + w.trayFood <= 0) break;
          if (n.tableIndex !== best.tableIndex || !canServe(n)) continue;
          n.state = 'drinking';
          n.timer = C.npc.eatTime;
          if (n.product === 'tost') w.trayFood -= 1;
          else w.tray -= 1;
          stats.waiterServed += 1;
          stats.waiterServedByService[THE_SERVICE] = (stats.waiterServedByService[THE_SERVICE] ?? 0) + 1;
          xp += C.xp.perWaiterServed;
        }
      }
    } else if (
      // D6 (T9c): tepsi DOLU ama bekleyenlerin hiçbiri o ürünü istemiyorsa (2 çay taşıyan garson,
      // yalnız tost bekleyenler) garson eskiden yeni bir çay müşterisi gelene dek boşta kalıyordu.
      (w.tray + w.trayFood < wTrayCap || !waiting.some(canServe)) && waiting.length > 0 && !demlemeKilidi &&
      (w.dirtyCarry ?? 0) + (w.dirtyCarryFood ?? 0) === 0
    ) {
      if (w.claim != null) { claimed.delete(w.claim); w.claim = undefined; } // yüklemeye dönen üstlenmez
      // Yükleme: servisin ÖN yüzüne git (ürünler önde); varınca EN ACİL bekleyenin ürününden yükle.
      if (navStep(w.pos, place.pickup, wStep, navGrid, REACH_PICKUP, player, obstacles)) {
        // Talep sırası: en acil bekleyenin ürünü önce; kalan yere diğer üründen doldurur.
        const order = [...waiting].sort((a, b) => a.timer - b.timer).map((n) => n.product);
        // D6: kimsenin istemediği ürün tezgâha GERİ konur (bardağıyla — korunum değişmez).
        if (!order.includes('tea') && w.tray > 0) { ready.tea += w.tray; w.tray = 0; }
        if (!order.includes('tost') && w.trayFood > 0) { ready.tost += w.trayFood; w.trayFood = 0; }
        for (const prod of [...order, 'tea' as const, 'tost' as const]) {
          const free = wTrayCap - w.tray - w.trayFood;
          if (free <= 0) break;
          const take = Math.min(free, ready[prod]);
          if (take <= 0) continue;
          if (prod === 'tost') w.trayFood += take;
          else w.tray += take;
          ready[prod] -= take;
        }
      }
    } else {
      if (w.claim != null) { claimed.delete(w.claim); w.claim = undefined; } // boşta kalan üstlenmez
      // BOŞTA BULAŞIK (D-083): SERVİS EDECEK KİMSE YOKKEN garson bulaşık toplar. Servisten bir
      // saniye bile çalmaz — bu dala ancak taşıyacak ürünü ve bekleyen müşterisi kalmayınca
      // düşülür; biri gelince tepsiyi bırakıp servise döner (öncelik sırası yukarıdan aşağı).
      //
      // TETİK GENİŞ (kullanıcı 2026-09-08: *"bulaşığı ben yapmak istemiyorum, bir süre sonra
      // otomatize olmalı"*). Önce DAR denendi (yalnız temiz bardak bitince) ama ölçüm gösterdi ki
      // dar/geniş tetik AFK debisinde neredeyse fark etmiyor (B2: 6,80 ↔ 7,27) — fark OYUNCU
      // OYNARKEN: dar tetikte bulaşık hep oyuncuya kalıyordu. Otomasyon takvimi böylece net:
      // `q_wash` (~3 dk) elle öğretir → garson (~6-11 dk) boş vaktinde devralır → bulaşıkçı
      // (~33 dk) mekân DOLUYKEN bile devralır. Kısmi assist (D-014) korunur: mekân doldukça
      // garsonun boş vakti biter, kirli birikir, oyuncu yine gerekir.
      const carry = C.waiter.idleDishCarry;
      const tasinan = (w.dirtyCarry ?? 0) + (w.dirtyCarryFood ?? 0);
      // Tepside ÜRÜN varken kirliye başlanmaz. Bu dala ürünle de düşülebiliyor: bekleyen
      // müşterilerin HEPSİ kirli masadaysa `claimable` boşalır, `waiting` de boşalır ve garson
      // elinde çayla buraya gelir. O hâlde bulaşık DEĞİL bekleme doğrudur — yoksa garson çayı
      // ve kirliyi aynı anda taşır (iki tepsi görseli üst üste biner). Bekçi ③ bunu yakaladı.
      const urunVar = w.tray + w.trayFood > 0;
      if (carry > 0 && !urunVar && (tasinan > 0 || dishes.length > 0)) {
        if (tasinan >= carry || (tasinan > 0 && dishes.length === 0)) {
          // Dolu (ya da toplanacak kalmadı) → leğene götür. Bardak da tabak da AYNI havuza döner.
          if (navStep(w.pos, place.dish, wStep, navGrid, reachWash(c.areasOpen), player, obstacles)) {
            // bardak da tabak da AYNI havuza döner (korunum tek) — leğenden geçerek (D-143)
            cleanCups = legeneBirak(c, cleanCups, w.dirtyCarry ?? 0, w.dirtyCarryFood ?? 0);
            // `stats.dishesWashed` OYUNCUNUN sayacıdır (q_wash görevi + "Temizlik" başarımı +
            // XP): personelin yıkadığı oraya yazılmaz. Bulaşıkçı da yazmaz — aynı kural.
            w.dirtyCarry = 0;
            w.dirtyCarryFood = 0;
          }
        } else {
          let target = dishes[0];
          let td = Infinity;
          for (const d of dishes) {
            const dd = dist2D(w.pos, d.pos);
            if (dd < td) { td = dd; target = d; }
          }
          if (navStep(w.pos, target.pos, wStep, navGrid, C.cups.collectRadius, player, obstacles)) {
            dishes = dishes.filter((d) => d.id !== target.id);
            // Kabın TÜRÜ korunur (kod tabanının "tepside yanlış kap" hatasına düşmemek için).
            if (target.kind === 'plate') w.dirtyCarryFood = (w.dirtyCarryFood ?? 0) + 1;
            else w.dirtyCarry = (w.dirtyCarry ?? 0) + 1;
          }
        }
      } else {
        // Boşta ve ortalık temiz: kendi bekleme noktasına dön (garsonlar 0.7 br arayla).
        navStep(w.pos, home, wStep, navGrid, REACH_HOME, player, obstacles);
      }
    }
    out.push(w);
  }
  c.xp = xp;
  c.dishes = dishes;
  c.cleanCups = cleanCups;
  c.waiters = out;
}

/**
 * BULAŞIKÇI (Faz 2e kısmi assist) — B2'de kat çapında TEK kişi: kirlileri nerede olursa olsun
 * toplar, katın tek bulaşık noktasında yıkar. (Eskiden her servisin kendi bulaşıkçısı vardı ve
 * yalnız kendi bölgesinin kirlilerine bakardı.)
 */
function dishwasherSystem(c: TickCtx): void {
  const { dt, s, world, obstacles, navGrid, player, place } = c;
  let dishes = c.dishes;
  let cleanCups = c.cleanCups;
  const svc = world.services[THE_SERVICE];
  if (!svc?.open || !svc.hasDishwasher) {
    c.dishwasher = null;
    return;
  }
  const prevDw = s.dishwasher;
  const dw: Waiter = prevDw
    ? { pos: [...prevDw.pos] as Vec3, tray: prevDw.tray, trayFood: prevDw.trayFood }
    : { pos: [...place.dishwasherHome] as Vec3, tray: 0, trayFood: 0 };
  const dStep = dishSpeedFor(s.waiterUpgrades.dishSpeed) * dt; // v29: hız panel kademesinden
  const dCap = dishCarryCapacityFor(s.waiterUpgrades.dishCarry);
  const carried = dw.tray + dw.trayFood;
  if (carried >= dCap || (carried > 0 && dishes.length === 0)) {
    // Dolu (ya da elinde var ama toplanacak kalmadı) → bulaşıkta yıka. Bardak da tabak da AYNI
    // havuza döner (korunum değişmezi tek).
    if (navStep(dw.pos, place.dish, dStep, navGrid, reachWash(c.areasOpen), player, obstacles)) {
      cleanCups = legeneBirak(c, cleanCups, dw.tray, dw.trayFood);
      dw.tray = 0;
      dw.trayFood = 0;
    }
  } else if (dishes.length > 0) {
    // Topla: KATTAKİ en yakın kirli kaba yaklaş; collectRadius'a girince al.
    let target = dishes[0];
    let td = Infinity;
    for (const d of dishes) {
      const dd = dist2D(dw.pos, d.pos);
      if (dd < td) { td = dd; target = d; }
    }
    if (navStep(dw.pos, target.pos, dStep, navGrid, C.cups.collectRadius, player, obstacles)) {
      dishes = dishes.filter((d) => d.id !== target.id);
      // Kabın TÜRÜ leğende korunur (B2: tek bulaşıkçı iki tür de toplar → tabak taşırken elinde
      // bardak görünmez; oyuncu tepsisindeki carriedDirty/carriedDirtyFood ayrımının aynısı).
      if (target.kind === 'plate') dw.trayFood += 1;
      else dw.tray += 1;
    }
  } else {
    // Boşta: bulaşık köşesine dön.
    navStep(dw.pos, place.dishwasherHome, dStep, navGrid, REACH_HOME, player, obstacles);
  }
  c.dishes = dishes;
  c.cleanCups = cleanCups;
  c.dishwasher = dw;
}

/**
 * Mekânsal etkileşim noktaları (D-018 §2, HAREKET-TEMELLİ)
 * Oyuncu fiziksel olarak aynı anda TEK dolum noktasının üstünde olabilir. Para yalnız oyuncu DURUNCA akar:
 * üstünden GEÇERKEN (hareket halinde) hiç alınmaz, DURDUĞU (input bıraktığı) anda HEMEN başlar (sayaç/countdown YOK).
 */
function interactionZoneSystem(c: TickCtx): void {
  const { lifetime, padsDone, tables, stationLevels, tableLevels, stats } = c;
  const padGate: GateState = {
    padsDone,
    tables,
    stationLevel: stationLevels[0],
    lifetime: lifetime.toNumber(),
    waiterServed: stats.waiterServed,
    waiterServedByService: stats.waiterServedByService,
    tableLevels, // Y4: allZoneTablesLevel gate'i (2. garson pad'leri)
  };
  // EKRANDA TEK PAD (quest sistemi): görünürlük visiblePads'ten (Pad.tsx ile aynı kaynak).
  // G-59: okunan index HAM `questIndex` değil EKRANDAKİ görev (`cardQuestIndex`) — kutlama
  // penceresinde kart biten görevi yazarken pad yeni görevinkini gösteriyordu. Gerekçe rules.ts'te.
  const activePads: PadDef[] = visiblePads(cardQuestIndex(c), padGate);
  c.padGate = padGate;
  c.activePads = activePads;
}

/**
 * Yeni-özellik bildirimi (D-019 §4; v21 zone-başına)
 * Bir ikincil özellik (yükseltme/personel) İLK kez açıldığında kısa toast + pan. revealSeen baseline
 * init'te kurulduğu için zaten açık olanlar tekrar bildirmez (yeniden-yükleme spam'ı yok; persist gerekmez).
 * turu-5 m.8: karakter-butonu spotlight'ı bekliyorsa (charStat görevi aktif + panel hiç açılmamış)
 * reveal kamera panı BASTIRILIR — ekranda tek yönlendirme kalır (table2 bitişi ertesi tick'te
 * "çay yükselt" reveal'ını ateşliyordu; kamera oraya kayarken spotlight char butonunu gösteriyordu).
 */
function revealSystem(c: TickCtx): void {
  const { dt, s, areasOpen, stationLevels, tableLevels, enqueueNotice, requestFocus, input, player, padGate, activePads } = c;
  let notice = c.notice;
  let revealSeen = c.revealSeen;
  // G-59/G-60: reveal de EKRANDAKİ görevi okur (ham `questIndex`i değil) — kutlama penceresinde
  // kart hâlâ biten görevi yazarken yeni görevin kapsadığı reveal'lar "kapsanmamış" görünüyordu.
  const questIndex = cardQuestIndex(c);
  // G-60 — GEÇİŞ PENCERESİNDE YENİ UYARI ÇIKMAZ. Kullanıcı: *"uyarı geldiği anda altta biten
  // göreve de var; onların bir sıralaması olması gerekiyor."* Kamera panı G-44'te zaten
  // erteleniyordu ama TOAST ertelenmiyordu: "Çay ocağını yükseltebilirsin" gibi bir reveal,
  // görev tamamlanma toast'ının hemen ardına biniyordu. Reveal SİLİNMEZ, tüketilmez de —
  // yalnız beklemeye alınır; pencere kapanınca aynı döngüden normal sırasıyla geçer.
  const gecisPenceresi = questInTransition(c);
  const spotlightPending =
    questIndex < C.quests.length &&
    C.quests[questIndex].target.type === 'charStat' &&
    !s.charPanelSeen;
  // C paketi (⑤⑥ → tek talimat kaynağı = görev kartı): bir reveal'ın açtığı özelliği AYNI/İLERİDEKİ
  // bir görev zaten öğretiyorsa reveal toast'ı GÖSTERİLMEZ (sessizce tüketilir) — "Çay ocağını
  // yükseltebilirsin ☕" gibi mesajlar görev cümlesiyle çakışıp görev sanılmasın.
  const questCoveredReveals = new Set<string>();
  for (let qi = questIndex; qi < C.quests.length; qi++) {
    const t = C.quests[qi].target;
    if (t.type === 'stationLevel') questCoveredReveals.add(`upgrade:${THE_SERVICE}`);
    else if (t.type === 'tableLevel') questCoveredReveals.add('tableUp:0');
    else if (t.type === 'tablesAtLevel') questCoveredReveals.add(`tableUp:${t.area ?? 0}`);
    else if (t.type === 'pad') questCoveredReveals.add(`opt:${t.id}`);
  }
  // D-142: reveal de kapıyı okur — kutlama penceresinde zaten döngüden çıkılıyor (aşağıda).
  for (const [key, text, rp] of revealKeys(padGate, areasOpen, stationLevels, c.questIndex)) {
    if (gecisPenceresi) break; // G-60: kutlama sürerken hiçbir reveal işlenmez (tüketilmez de)
    if (!revealSeen.includes(key)) {
      // Bir görevin kapsadığı özellik: reveal'ı sessizce tüket (toast/pan yok) → tek talimat görev kartı.
      if (questCoveredReveals.has(key)) {
        revealSeen = [...revealSeen, key];
        continue;
      }
      // turu-6 fix: spotlight beklerken PAN'lı reveal'ı TAMAMEN ertele (toast + tüketim dahil).
      if (spotlightPending && rp) continue;
      revealSeen = [...revealSeen, key];
      enqueueNotice({ text, ttl: 4.5, kind: 'reveal' });
      // Yeni açılan noktaya anlık kamera pan ("orada bir şey var" — kullanıcı isteği 2026-06-09).
      if (rp) requestFocus(rp, 1);
    }
  }
  if (notice) {
    const ttl = notice.ttl - dt;
    notice = ttl > 0 ? { ...notice, ttl } : null;
  }

  // Oyuncu DURUYOR mu? (input ~0). Para yalnız dururken akar → üstünden geçerken (hareket) alınmaz.
  const fillReady = Math.hypot(input[0], input[1]) <= 0.1;

  // Oyuncunun şu an üstünde durduğu dolum noktasının kanonik id'si (pad.id / 'tea:z' / 'tableUp:i').
  let onFillId: string | null = null;
  for (const pad of activePads) {
    const pp = LAYOUT.padPos[pad.id];
    if (pp && inFrame(player[0], player[2], pp, padCercevesi(t(pad.label)))) { onFillId = pad.id; break; }
  }
  // GUARD (gece fix 2026-06-10): oyuncu AÇIK bir ocağın pickup yarıçapındaysa niyeti ÇAY ALMAK'tır —
  // yükseltme dolumu kesinlikle başlamaz (mekânsal ayrımın yanında ikinci emniyet).
  const inPickupRange = atServiceBody(player[0], player[2], c.place, C.serving.pickupReach);
  if (
    !onFillId &&
    !inPickupRange &&
    upgradeSpotLiveNow(c, 'station') &&
    stationUpgradeUnlocked(padGate) &&
    stationLevels[THE_SERVICE] < stationSoftMaxLevel() &&
    inFrame(player[0], player[2], c.place.upgradeSpot, servisCercevesi())
  ) {
    onFillId = FILL_TEA + THE_SERVICE;
  }
  if (!onFillId) {
    // D-124: SIRA tek hedeflidir — tetik, ÇİZİLEN tek noktadan türer (Scene.tsx aynı çağrıyı
    // yapar). Eskiden burada bütün masalar taranıyor ve alan kapısı açık her masa tetikleniyordu.
    const hedefMasa = upgradeSpotLiveNow(c, 'table') ? tableUpgradeTarget(padGate) : null; // D-142
    if (hedefMasa != null) {
      // Çerçeve ÇİZİLEN etiketten türer, o da seviyeyi taşır (`SV 2` / `SV 12`) — bugün ikisi de
      // `r * 1,05` tabanına kelepçeleniyor, ama bağ kurulu: yazı büyürse tetik de büyür.
      if (inFrame(player[0], player[2], LAYOUT.tables[hedefMasa].upgradeSpot, masaCercevesi(tableLevels[hedefMasa] ?? 0))) {
        onFillId = FILL_TABLE + hedefMasa;
      }
    }
  }
  // ODA (B4): lavabonun yükseltme noktası pad'iyle AYNI yerde durur — oda açılınca pad listeden
  // düşer, nokta onun yerini alır. İkisi aynı anda etkin olamaz, o yüzden çakışma da olamaz.
  if (
    !onFillId &&
    upgradeSpotLiveNow(c, 'lavabo') &&
    c.lavaboLevel >= 1 &&
    c.lavaboLevel < lavaboMaxLevel() &&
    inFrame(player[0], player[2], LAVABO.spot, lavaboCercevesi())
  ) {
    onFillId = FILL_LAVABO;
  }
  c.notice = notice;
  c.revealSeen = revealSeen;
  c.fillReady = fillReady;
  c.onFillId = onFillId;
}

/**
 * Pad doldurma (omurga + opsiyonel; her pad açtığı objenin yerinde)
 */
function padFillSystem(c: TickCtx): void {
  const { dt, requestFocus, pr, player, activePads, fillReady, onFillId } = c;
  let wallet = c.wallet;
  let padsDone = c.padsDone;
  let padFills = c.padFills;
  let activeSpot = c.activeSpot;
  let cleanCups = c.cleanCups;
  let xp = c.xp;
  const activePad = onFillId ? activePads.find((p) => p.id === onFillId) : undefined;
  if (activePad) {
    const padPos = LAYOUT.padPos[activePad.id]!;
    let fill = padFills[activePad.id] ?? 0;
    if (fillReady && wallet.gt(0)) {
      const amt = Math.min(activePad.fillRate * dt, wallet.toNumber(), activePad.cost - fill);
      if (amt > 0) {
        fill += amt;
        wallet = wallet.sub(amt);
      }
    }
    if (fill >= activePad.cost) {
      // Pad tamamlandı: SADECE padsDone'a ekle (etkiler türetilir, D-015), kısmi dolumu temizle.
      padsDone = [...padsDone, activePad.id];
      xp += C.xp.perPad;
      const rest = { ...padFills };
      delete rest[activePad.id];
      padFills = rest;
      activeSpot = null;
      // ALAN açılışı (Faz 3a): yeni alan kendi bardak stoğuyla gelir + kamera oraya pan
      // ("orada yeni bir dünya var" hissi — quest kamerası ayrıca sıradaki göreve döner).
      // ODA (B4): oda açılır açılmaz L1'dir — yani ilk günden gelir kolu akar (pad "boş bir kabuk"
      // açmaz). Seviyenin kendisi padsDone'dan TÜRETİLEMEZ (yükseltme noktasından büyür), o yüzden
      // ayrı saklanır; store init'i ikisini kelepçeyle tutarlı tutar.
      if (activePad.effect.type === 'openRoom' && activePad.effect.room === 'lavabo') {
        c.lavaboLevel = Math.max(c.lavaboLevel, 1);
        c.lavaboFill = 0;
      }
      if (activePad.effect.type === 'unlockArea') {
        cleanCups += C.cups.poolBase;
        // Yeni açılan ALANIN merkezine pan (M2: index pad listesinden değil, AÇILMIŞ sayıdan).
        const aNew = deriveWorld(padsDone).areasOpen - 1;
        const ab = LAYOUT.areaBounds[aNew];
        requestFocus([(ab.minX + ab.maxX) / 2, 0, (ab.minZ + ab.maxZ) / 2], 3); // en yüksek öncelik
      }
      // Masa pad'i oyuncunun DURDUĞU yerde belirir → oyuncu masanın içinde kalmasın, anında dışarı it.
      if (activePad.effect.type === 'addTable') {
        // Masa yarısı + oyuncu yarıçapı — push-out oyuncuyu masanın içinde bırakmaz.
        const out = LAYOUT.tableHalf[0] + pr + 0.1;
        let ex = player[0] - padPos[0];
        let ez = player[2] - padPos[2];
        const ed = Math.hypot(ex, ez);
        if (ed < out) {
          if (ed < 1e-4) { ex = 0; ez = 1; } else { ex /= ed; ez /= ed; }
          player[0] = padPos[0] + ex * out;
          player[2] = padPos[2] + ez * out;
        }
      }
    } else {
      padFills = { ...padFills, [activePad.id]: fill };
      activeSpot = { kind: 'pad', label: t(activePad.label), fill, cost: activePad.cost };
    }
  }
  c.wallet = wallet;
  c.padsDone = padsDone;
  c.padFills = padFills;
  c.activeSpot = activeSpot;
  c.cleanCups = cleanCups;
  c.xp = xp;
}

/**
 * Mekânsal çay yükseltme noktası (ZONE BAŞINA; ocağın önünde dur → altta bar dolar)
 * Biriken ₺ KORUNUR (çıkınca sıfırlanmaz; D-018 dwell) → para harcanıp boşa gitmez.
 */
function stationUpgradeSystem(c: TickCtx): void {
  const { dt, upgradeFills, stationLevels, fillReady, onFillId } = c;
  let wallet = c.wallet;
  let activeSpot = c.activeSpot;
  let cleanCups = c.cleanCups;
  let xp = c.xp;
  if (onFillId != null && onFillId.startsWith(FILL_TEA)) {
    const z = Number(onFillId.slice(FILL_TEA.length));
    const cost = stationUpgradeCostAt(z, stationLevels[z]); // M3: tost tezgâhı kendi maliyet çarpanıyla
    if (fillReady && wallet.gt(0)) {
      const amt = Math.min(upgradeFillRateFor(cost) * dt, wallet.toNumber(), cost - upgradeFills[z]);
      if (amt > 0) {
        upgradeFills[z] += amt;
        wallet = wallet.sub(amt);
      }
    }
    if (upgradeFills[z] >= cost) {
      stationLevels[z] += 1;
      xp += C.xp.perUpgrade;
      upgradeFills[z] = 0;
      cleanCups += C.cups.poolPerLevel; // havuz ocak seviyesiyle büyür (Faz 2e; global depo)
    }
    const lv = stationLevels[z];
    const nextCost = lv < stationSoftMaxLevel() ? stationUpgradeCostAt(z, lv) : cost;
    // Etiket seviyenin KİMLİĞİNİ söyler (tek merdiven, iki kimlik): L4'ten önce ocak, sonra tezgâh.
    const unitName = isCounter(lv) ? t('Tezgâh') : t('Çay Ocağı');
    // GÖRSEL: istasyon L1'den başlar (iç seviye 0-tabanlı; etiket +1). Soft max → "Usta" (💎/video, Faz 4).
    activeSpot = {
      kind: 'upgrade',
      label: t('{1} L{2}{3}', unitName, lv + 1, lv < stationSoftMaxLevel() ? ` → L${lv + 2}` : ' (Usta 💎)'),
      fill: upgradeFills[z],
      cost: nextCost,
    };
  }

  // (v29: mekânsal garson hız yükseltmesi kalktı — hız karakter panelinden satın alınır.)
  c.wallet = wallet;
  c.activeSpot = activeSpot;
  c.cleanCups = cleanCups;
  c.xp = xp;
}

/**
 * Mekânsal masa yükseltme (Faz 2h, MASA-BAŞI / My Hotel): açık masanın KENARINDAKİ noktada dur → o masanın
 * bahşişi + sabrı artar. Gating: 2. masa açılınca belirir (D-018 §1: işaretler kenara taşındı).
 */
function tableUpgradeSystem(c: TickCtx): void {
  const { dt, tableLevels, tableUpgradeFills, fillReady, onFillId } = c;
  let wallet = c.wallet;
  let activeSpot = c.activeSpot;
  let xp = c.xp;
  if (onFillId != null && onFillId.startsWith(FILL_TABLE)) {
    const i = Number(onFillId.slice(FILL_TABLE.length));
    const cost = tableNextCost(tableLevels[i], areaOfTable(i));
    let fill = tableUpgradeFills[i] ?? 0;
    if (fillReady && wallet.gt(0)) {
      const amt = Math.min(upgradeFillRateFor(cost) * dt, wallet.toNumber(), cost - fill);
      if (amt > 0) {
        fill += amt;
        wallet = wallet.sub(amt);
      }
    }
    if (fill >= cost) {
      tableLevels[i] += 1;
      xp += C.xp.perUpgrade;
      fill = 0;
    }
    tableUpgradeFills[i] = fill;
    const nextCost = tableLevels[i] < tableSoftMaxLevel() ? tableNextCost(tableLevels[i], areaOfTable(i)) : cost;
    // GÖRSEL: masa L1'den başlar (iç tableLevels 0-tabanlı; etiket +1). Soft max → "Usta" (💎/video, Faz 4).
    activeSpot = {
      kind: 'upgrade',
      label: t('Masa {1}: L{2}{3}', i + 1, tableLevels[i] + 1, tableLevels[i] < tableSoftMaxLevel() ? ` → L${tableLevels[i] + 2} (+${C.tables.tipBase} bahşiş)` : ' (Usta 💎)'),
      fill,
      cost: nextCost,
    };
  }
  c.wallet = wallet;
  c.activeSpot = activeSpot;
  c.xp = xp;
}

/**
 * ODA: lavabo yükseltme noktası (B4) — kapının önünde dur, alt-orta bar dolar.
 *
 * Ocak/masa yükseltmesiyle AYNI desen (D-018 dwell: biriken ₺ çıkınca sıfırlanmaz). Farkı şu:
 * yükselttiği şey throughput ya da bahşiş DEĞİL, odanın kendi gelir kolu — uğrama olasılığı ve
 * bırakılan ₺ birlikte büyür (economy.config `rooms.lavabo`).
 */
function lavaboUpgradeSystem(c: TickCtx): void {
  const { dt, fillReady, onFillId } = c;
  let wallet = c.wallet;
  let activeSpot = c.activeSpot;
  let xp = c.xp;
  if (onFillId === FILL_LAVABO) {
    const cost = lavaboUpgradeCost(c.lavaboLevel);
    if (cost != null) {
      let fill = c.lavaboFill;
      if (fillReady && wallet.gt(0)) {
        const amt = Math.min(upgradeFillRateFor(cost) * dt, wallet.toNumber(), cost - fill);
        if (amt > 0) {
          fill += amt;
          wallet = wallet.sub(amt);
        }
      }
      if (fill >= cost) {
        c.lavaboLevel += 1;
        xp += C.xp.perUpgrade;
        fill = 0;
      }
      c.lavaboFill = fill;
      const nextCost = lavaboUpgradeCost(c.lavaboLevel) ?? cost;
      activeSpot = {
        kind: 'upgrade',
        label: t('Lavabo L{1}{2}', c.lavaboLevel, c.lavaboLevel < lavaboMaxLevel() ? ` → L${c.lavaboLevel + 1}` : ''),
        fill,
        cost: nextCost,
      };
    }
  }
  c.wallet = wallet;
  c.activeSpot = activeSpot;
  c.xp = xp;
}

/**
 * D-015: padsDone değiştiyse türetilen alanlar yeniden hesaplanır (tek yazım noktası)
 */
function deriveSystem(c: TickCtx): void {
  const { padsDone, waiters, place } = c;
  const out = deriveWorld(padsDone);
  // Personel pad'i bu karede tamamlandıysa aktörü HEMEN var et (GLOBAL havuz — B2).
  const svc = out.services[THE_SERVICE];
  while (waiters.length < svc.waiters)
    waiters.push({ pos: waiterHomeAt(place, waiters.length), tray: 0, trayFood: 0 });
  if (waiters.length > svc.waiters) waiters.length = svc.waiters;
  if (svc.hasDishwasher && !c.dishwasher)
    c.dishwasher = { pos: [...place.dishwasherHome] as Vec3, tray: 0, trayFood: 0 };
  c.out = out;
}

/**
 * GÖREV İLERLEMESİ
 * Aktif görev karşılandıysa sıradakine geç (aynı tick'te birden çok karşılanabilir — ör. migrasyon
 * sonrası): tamamlama toast'u + kamera YENİ hedefe pan ("orada bir şey var" hissi, kullanıcı isteği).
 */
function questSystem(c: TickCtx): void {
  const { dt, s, padsDone, stationLevels, tableLevels, enqueueNotice, stats, requestFocus, out, input } = c;
  let wallet = c.wallet;
  let lifetime = c.lifetime;
  let questPhase = c.questPhase;
  let questPhaseT = c.questPhaseT;
  let xp = c.xp;
  let questIndex = c.questIndex;
  let questBase = c.questBase;
  const questCtx: QuestCtx = {
    padsDone,
    stationLevels,
    tableLevels,
    stats,
    questBase,
    charUpgrades: s.charUpgrades,
    waiterUpgrades: s.waiterUpgrades,
    lavaboLevel: c.lavaboLevel,
  };
  // GÖREV GEÇİŞ RİTMİ (A paketi): aktif görev karşılanınca kart ANINDA takas olmaz. 3 vuruş:
  //   active → (hedef tamam) → completing (kart %100 + yeşil onay, ödül+toast burada) → gap (boşluk,
  //   kart tamamlanmış görevi %100 tutar) → active (questIndex ilerler, yeni kart cardPop ile girer).
  // Bu sayede "bitti → ara → yeni" net hissedilir; zincirli tamamlamalar sıraya girer (instant skip yok).
  let questDone = false; // bu tick kart "tamamlandı" (completing/gap) gösterilsin mi
  let questDoneIndex = s.questDoneIndex;
  if (questPhase === 'active') {
    if (questIndex < C.quests.length && questTargetMet(C.quests[questIndex].target, questCtx)) {
      // BİTİŞ ANI: ödül + tamamlama toast'u + xp (bir kez). Pad onarımının (Y-23) geri çektiği,
      // önceden tamamlanmış görev yeniden biterse ÖDENMEZ (Sprint A P3).
      const biten = C.quests[questIndex];
      const ilkKez = !c.questsDone.includes(biten.id);
      const qReward = ilkKez ? biten.reward ?? 0 : 0;
      if (qReward > 0) {
        wallet = wallet.add(qReward);
        lifetime = lifetime.add(qReward);
      }
      enqueueNotice({ text: t(biten.title), ttl: 3.5, kind: 'quest', reward: qReward > 0 ? qReward : undefined });
      if (ilkKez) {
        xp += C.xp.perQuest;
        c.questsDone = [...c.questsDone, biten.id];
      }
      // GÖREV BU ANDA İLERLER (kutlama yalnız görsel). Yoksa 1,3 sn'lik kutlama penceresinde
      // yapılan eylem yeni görevin TABANINA yazılır ve sayaç 0/1'de kilitlenirdi (q_coin domino'su).
      // Sonraki konum kimliklerden türer: geri çekilmiş hat kaldığı yere döner.
      questDoneIndex = questIndex;
      questIndex = Math.max(questIndex + 1, eksikPadGorevi(C.quests, activeQuestIndex(C.quests, c.questsDone), padsDone));
      const nt = questIndex < C.quests.length ? C.quests[questIndex].target : null;
      questBase = nt ? questCounterValue(nt, stats) ?? 0 : 0;
      questCtx.questBase = questBase;
      questPhase = 'completing';
      questPhaseT = QUEST_COMPLETE_DUR;
      questDone = true;
    }
  } else if (questPhase === 'completing') {
    questPhaseT -= dt;
    questDone = true;
    if (questPhaseT <= 0) {
      questPhase = 'gap';
      questPhaseT = QUEST_GAP_DUR;
    }
  } else {
    // 'gap': boşluk dolunca kutlama kartı iner, YENİ görevin kartı görünür (kamera hedefe pan).
    questPhaseT -= dt;
    questDone = true;
    if (questPhaseT <= 0) {
      questPhase = 'active';
      questDone = false;
      questDoneIndex = -1;
      if (questIndex < C.quests.length) {
        const q = C.quests[questIndex];
        if (q.target.type === 'charStat' && !s.charPanelSeen) {
          // charStat görevi + spotlight bekliyorsa kamera panı İPTAL — ekranda tek yönlendirme (spotlight).
          c.camFocus = null;
        } else {
          const fp = questFocusPos(q.target, tableLevels, out.tables.length, out.areasOpen, q.area ?? 0, tableUpgradeTarget({ ...c.padGate, tableLevels }));
          if (fp) requestFocus(fp, 2); // charStat'ta 3D hedef yok → kamera sıçramaz (buton efekti yönlendirir)
        }
      }
    }
  }
  // ───── GEÇİŞ KAPISI (G-44, kullanıcı 2026-09-16): *"başarılı işareti gelmeden ve yeni görev
  // yazılmadan o gelecek yeni göreve zoom atılmasın"*. Ölçüm bunu doğruladı ve KAYNAĞINI daralttı
  // (docs/serit-raporu-g1.md §Bulgular 4): görev geçişinin KENDİ panı zaten tam yeni kartla
  // birlikte atılıyor (sapma 0,00); erken olan tek şey ALAN AÇILIŞININ panı — `unlockArea` pad'i
  // açıldığı tick'te yeni salonun merkezine prio 3 odak kuruyor ve bu, kartın gelmesinden
  // 1,30 sn ÖNCE oluyor.
  //
  // Pan SİLİNMİYOR, ERTELENİYOR: "orada yeni bir dünya var" hissi kullanıcının kendi isteğiydi
  // (2026-06-09), yalnız sırası yanlıştı. Bu tick'te gelen istek kutlama penceresine düştüyse
  // beklemeye alınır, bu tick'in odağı İSTEKTEN ÖNCEKİ hâline döner (ekranda zaten süren bir pan
  // varsa yarıda kesilmesin), ve pencere bitince `requestFocus`tan yeniden geçirilir — öncelik
  // karşılaştırması ve "hedef zaten ekranda" kapısı (H1) böylece bir kez daha uygulanır.
  if (questPhase !== 'active' && c.camIstek && c.camIstek.prio !== 2) {
    c.camBekleyen = c.camIstek;
    c.camFocus = s.camFocus;
    c.camPrio = 0;
  } else if (questPhase === 'active' && c.camBekleyen) {
    const bekleyen = c.camBekleyen;
    c.camBekleyen = null;
    requestFocus(bekleyen.pos, bekleyen.prio);
  }

  // Kamera odağı: joystick/klavye girdisi iptal eder (oyuncu kontrolü üstün); süre dolunca biter.
  // Deadzone 0.25 (2026-06-11 fix: 0.1 joystick titremesinde odağı yanlışlıkla bozuyordu).
  if (c.camFocus) {
    const ttl = c.camFocus.ttl - dt;
    const moving = Math.hypot(input[0], input[1]) > 0.25;
    c.camFocus = ttl > 0 && !moving ? { pos: c.camFocus.pos, ttl } : null;
  }
  // completing/gap: kart BİTEN görevi %100 + onay flash'ıyla gösterir (questIndex çoktan ilerledi).
  const viewIndex = questDone && questDoneIndex >= 0 ? questDoneIndex : questIndex;
  let quest = viewIndex < C.quests.length ? questView(C.quests[viewIndex], questCtx) : null;
  if (quest && questDone) quest = { ...quest, cur: quest.total, done: true };
  c.wallet = wallet;
  c.lifetime = lifetime;
  c.questPhase = questPhase;
  c.questPhaseT = questPhaseT;
  c.xp = xp;
  c.questIndex = questIndex;
  c.questBase = questBase;
  c.questDoneIndex = questDoneIndex;
  c.quest = quest;
}


/**
 * Level-up bildirimi: toplam XP bu tick'te seviye atlattıysa toast (kuyruğa girer).
 */
function levelNoticeSystem(c: TickCtx): void {
  const { s, noticeQueue, xp } = c;
  let notice = c.notice;

  // D-142: kazanç izi. Pencere `levelRewardSec` kadar geriye bakar; örnek sayısı ondan türer.
  // F3b: video ödülü de aynı izi okur (`videoReward`) → iz ikisinin büyüğü kadar tutulur.
  const n = Math.ceil(C.xp.levelRewardSec / GELIR_ORNEK_SN) + 1;
  if (c.gelirIziT <= 0) {
    const nIz = Math.max(n, Math.ceil(C.rewarded.video.incomeSec / GELIR_ORNEK_SN) + 1);
    c.gelirIzi = [...c.gelirIzi, c.lifetime.toNumber()].slice(-nIz);
    c.gelirIziT = GELIR_ORNEK_SN;
  }

  if (xp !== s.xp) {
    const before = levelProgress(s.xp).level;
    const after = levelProgress(xp).level;
    // D-092 + D-142 (G-66/G-67): seviye atlama artık TOAST değil ÖDÜL EKRANI. Taşıma ödülü (D-092)
    // kalır; Seviye 5'ten itibaren üstüne "son 60 sn'de kazandığın kadar" ₺ gelir. Aynı karede
    // birden çok seviye atlanırsa ödüller tek ekranda toplanır.
    if (after > before) {
      const sonKazanc = c.gelirIzi.length ? c.lifetime.toNumber() - c.gelirIzi[Math.max(0, c.gelirIzi.length - n)] : 0;
      let amount = c.levelUp?.amount ?? 0;
      for (let lv = before + 1; lv <= after; lv++) amount += levelRewardAmount(lv, sonKazanc);
      c.levelUp = {
        level: after,
        amount,
        carryBefore: c.levelUp?.carryBefore ?? reputationCarryMult(before) - 1,
        carryAfter: reputationCarryMult(after) - 1,
      };
    }
  }

  // Bildirim kuyruğu: mevcut toast yoksa sıradakini göster (tek slot, sırayla — B paketi).
  if (!notice && noticeQueue.length > 0) notice = noticeQueue.shift()!;
  c.notice = notice;
}

/** Bir karenin TAMAMI: sistemler sabit sırayla koşar. Sıra eski tek-gövdeli tick() ile birebirdir. */
/**
 * SİSTEM SIRASI — **veri olarak.** Sıra anlamlıdır (örn. `deriveSystem` türetmeleri, kendisinden
 * önceki sistemlerin yazdığı duruma bakar), o yüzden burada tek yerde ve açıkça durur.
 *
 * Adlar ölçüm içindir: `olcum.ts` dikişi açıkken kare bölüşümü sistem başına raporlanır
 * (`docs/perf-raporu-t4.md` §G — `npcSystem` tek başına karenin %27,3'üydü ve bu, liste
 * elle sayılmadan görünmüyordu).
 */
const SISTEMLER: readonly (readonly [string, (c: TickCtx) => void])[] = [
  ['brewSystem', brewSystem],
  ['spawnSystem', spawnSystem],
  ['npcSystem', npcSystem],
  ['playerMoveSystem', playerMoveSystem],
  ['coinSystem', coinSystem],
  ['serveSystem', serveSystem],
  ['dishCycleSystem', dishCycleSystem],
  ['waiterSystem', waiterSystem],
  ['dishwasherSystem', dishwasherSystem],
  ['legenSystem', legenSystem],
  ['interactionZoneSystem', interactionZoneSystem],
  ['revealSystem', revealSystem],
  ['padFillSystem', padFillSystem],
  ['stationUpgradeSystem', stationUpgradeSystem],
  ['tableUpgradeSystem', tableUpgradeSystem],
  ['lavaboUpgradeSystem', lavaboUpgradeSystem],
  ['deriveSystem', deriveSystem],
  ['questSystem', questSystem],
  ['levelNoticeSystem', levelNoticeSystem],
];

export function runTick(c: TickCtx): void {
  if (olcumAcik()) { // DEV kapısı `olcum.ts`te (node'da `import.meta.env` yok)
    for (const [ad, f] of SISTEMLER) olcKoş(ad, () => f(c));
    return;
  }
  for (const s of SISTEMLER) s[1](c);
}

// ---------------------------------------------------------------------------
// İZDİHAM ÖLÇÜM KOLU (T6) — **yalnız ölçüm; varsayılan null = bugünkü davranış.**
// ---------------------------------------------------------------------------
/**
 * NEDEN VAR: G-91'in kolları `tick.ts`e dokunuyor, yani varyant kapısına tabi — raporun
 * §Bulgular tablosunda sayı satırı olmadan hiçbiri uygulanamaz (D-084). Kolları ölçmek için
 * dosyayı kalıcı değiştirmek tam olarak kapının yasakladığı şey; bu yüzden kollar çalışma
 * anında takılır ve geri alınır (`tools/olcum-izdiham-t6.ts`). `nav.ts`in A/B kolu ile aynı
 * desen: kapalıyken bedel tek null okumasıdır.
 *
 * ÖLÇÜLEN KÖK (aynı araç, §A3): `leaving` NPC'lerin hepsi TEK bir noktaya (sokak) yürüyor ve
 * `npcAyristir` onları hedeften daha güçlü itiyor (AYRISMA_HIZ 2,4 > NPC_SPEED 1,4). `moveToward`
 * ancak `d <= step` olunca siliyor, kalabalık o noktaya varamıyor → kimse silinmiyor →
 * yığıldıkça itme artıyor. Kollar bu zincirin dört ayrı halkasına bakar.
 *
 * S1 (`leaving` ayrışmasız) D-140 ile KALICI oldu → `AYRISMASIZ`. Kalan üç kol, üstüne
 * ölçülecek turlar (C kolu: tavan + çıkış payı) için duruyor.
 */
export interface IzdihamKolu {
  /** S2 — çıkış hedefi dağıtılır: her NPC sokakta KENDİ x'ine yürür (0 = kapalı). */
  cikisDagitimi: number;
  /** S3 — silme yarıçapı: sokağa `R` kadar yaklaşan silinir (0 = bugünkü, tam varış şartı). */
  silmeYariCapi: number;
  /** S4 — doğma tavanı TÜM nüfusa (bugün yalnız `!hasLeftTable` olanlara). */
  tavanTumNufusa: boolean;
}

let izdihamKolu: IzdihamKolu | null = null;
export const izdihamKoluAyarla = (k: IzdihamKolu | null): void => { izdihamKolu = k; };
export const izdihamKoluOku = (): IzdihamKolu | null => izdihamKolu;

// ---------------------------------------------------------------------------
// LEĞEN — bırakılan kirli birikir, TOPTAN yıkanır (T8b · K9 · D-143)
// ---------------------------------------------------------------------------
/**
 * Kullanıcı (G-70): *"birkaç tane bıraktıktan sonra kirlenip, o adam oraya geldiğinde temizlenmesi
 * gerek"*. Oyuncu/garson/bulaşıkçı kirliyi leğene bırakır; kirliler `legen`de bekler ve her
 * `cups.washBatchSec` saniyede bir hepsi birden temiz havuza döner (çaycının leğene geldiği an).
 *
 * NEDEN TOPLU, NEDEN KAP BAŞINA SÜRE DEĞİL (`docs/tezgah-raporu-t8b.md` Bulgu 3): kap başına
 * 0,5-2 sn'lik süre leğende en fazla 2-4 kap biriktiriyor — kirliler 1-2'şer geldiği için yığın
 * ekranda hiç oluşmuyor. Toplu yıkama 4-10 kaplık görünür yığın kurar; bedeli geç oyunda −%3 servis.
 *
 * Kayıt şeması DEĞİŞMEDİ: `cleanCups` kayda yazılmaz, yüklemede havuzdan yeniden türer — leğendeki
 * kirliler de onunla birlikte temiz sayılır.
 */
export interface Legen {
  bardak: number;
  tabak: number;
  /** Son toplu yıkamadan beri geçen süre (sn). */
  t: number;
}
export const BOS_LEGEN: Legen = { bardak: 0, tabak: 0, t: 0 };

function legeneBirak(c: TickCtx, temiz: number, bardak: number, tabak: number): number {
  if (bulasikKolu?.topluSn === 0) return temiz + bardak + tabak; // ölçüm kolu: anlık (D-143 öncesi)
  c.legen.bardak += bardak;
  c.legen.tabak += tabak;
  return temiz;
}

function legenSystem(c: TickCtx): void {
  const L = c.legen;
  const n = L.bardak + L.tabak;
  if (bulasikKolu?.yikamaSn) {
    // Ölçüm kolu: kap başına süre (Bulgu 3'ün Y satırları).
    if (n === 0) { L.t = 0; return; }
    L.t += c.dt / bulasikKolu.yikamaSn;
    let k = Math.min(n, Math.floor(L.t));
    L.t -= k;
    const b = Math.min(L.bardak, k);
    L.bardak -= b;
    k -= b;
    L.tabak -= k;
    c.cleanCups += b + k;
    return;
  }
  const periyot = bulasikKolu?.topluSn ?? C.cups.washBatchSec;
  L.t += c.dt;
  if (L.t < periyot) return;
  L.t -= periyot;
  c.cleanCups += n;
  L.bardak = 0;
  L.tabak = 0;
}

// ---- ÖLÇÜM KOLU (yalnız ölçüm; null = yürürlükteki toplu yıkama) ----
/** `topluSn: 0` → anlık yıkama (D-143 öncesi) · `topluSn: T` → T sn'de bir toptan · `yikamaSn` → kap başına. */
export interface BulasikKolu { yikamaSn?: number; topluSn?: number }
let bulasikKolu: BulasikKolu | null = null;
export const bulasikKoluAyarla = (k: BulasikKolu | null): void => { bulasikKolu = k; };
