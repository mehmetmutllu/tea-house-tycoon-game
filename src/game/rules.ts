/**
 * rules.ts — OYUN KURALLARI: gating, görev motoru, yükseltme/ekonomi türetmeleri, bildirim anahtarları.
 *
 * Faz A2'de store.ts'ten ayrıldı. Burada oyun DURUMU tutulmaz; hepsi saf fonksiyon veya sabittir
 * (girdi: anlık görüntü, çıktı: değer). Böylece tick sistemleri (tick.ts) ve store aynı kuralları
 * tek yerden okur. store.ts bu modülü yeniden dışa aktarır (eski `from './store'` importları çalışır).
 */
import type { Dish, Npc, NpcState } from './types';
import {
  economyConfig as C,
  upgradeOutputMultiplier,
  upgradeCost,
  requiresMet,
  tableUpgradeCost,
  tableSeats,
  lavaboIncomePerCustomer,
  PRODUCTS,
  charNextCost,
  waiterTrayNextCost,
  waiterSpeedNextCost,
  type PadDef,
  type GateState,
  type QuestDef,
  type QuestTarget,
  type Requires,
  type CharUpgrades,
  type WaiterUpgrades,
} from '../config/economy.config';
import type { ReklamSayaci, SatinAlim, SaveStats } from './save';
import { iapConfig } from '../config/iap.config';
import { LAYOUT, LAVABO, servicePlace, type RVec3 } from './layout';
import { KAT2_MASALAR, OCAK } from './kat';
import type { Kat2Ayar } from './kat2Dongu';
import { MAX_AREAS, THE_SERVICE, areaOfTable, areaTableStart, tostShare, isCounter } from './world';
import { t } from '../i18n';

// DWELL kanonik dolum-noktası id'leri (D-018 §2): pad'ler kendi id'sini kullanır; bunlar yükseltme
// noktaları. Önek + index biçimindedir ('tea:0' = SERVİS index'i, 'tableUp:5' = GLOBAL masa index'i).
// (v29: 'waiterUp:' kalktı — garson hızı karakter panelinden satın alınır.)
export const FILL_TEA = 'tea:'; // + SERVİS index
export const FILL_TABLE = 'tableUp:'; // + GLOBAL masa index
export const FILL_LAVABO = 'lavaboUp'; // ODA: lavabo yükseltme noktası (tek nokta, index yok) — B4

/** Servis noktasının yükseltmesi açık mı? (2. masa önkoşul — "önce kapasite sonra verim".)
 *  B2: servis TEK olduğu için parametresiz; alan-başı `upgradeRequiresByArea` dizisi kalktı. */
export function stationUpgradeUnlocked(g: GateState): boolean {
  return requiresMet(C.service.upgradeRequires, g);
}

/** Alanın masa yükseltmeleri açık mı? (v21: o alanın 4 masası da açılınca — D-019 §3.)
 *  DİKKAT: bu ALANIN kapısıdır, masanın değil. Hangi masanın noktasının o an CANLI olduğunu
 *  `tableUpgradeTarget` söyler (D-124) — çizen de, tetikleyen de onu okur. */
export function tableUpgradeUnlockedIn(area: number, g: GateState): boolean {
  return requiresMet(C.tables.upgradeRequiresByArea[area], g);
}

/** Mekânsal yükseltme noktalarının türleri (servis · masa · lavabo). */
export type YukseltmeNoktasi = 'station' | 'table' | 'lavabo';

/**
 * T8a / D-142 (G-61) — YÜKSELTME NOKTASI YALNIZ KENDİ GÖREVİ AKTİFKEN CANLI; hat bitince hepsi.
 * Kullanıcı: *"görev gelmese bile o yükseltme pedi açık olmasın"*. Pad'lerde bu kural zaten vardı
 * (`visiblePads` — ekranda tek pad); yükseltme noktaları görevden bağımsız açık duruyordu.
 *
 * ÖLÇÜM (`docs/zincir-raporu-t8a.md` Bulgu 6): kapısız dünyada parası yeten ucuz noktaya basan
 * oyuncu Kat 1'i aynı sürede bitiriyor ama 2. salonu İKİ KAT geç açıyor (34 → 68 dk). Kapının
 * tempo bedeli sıfır; kazancı görev hattının tasarlanan ritmi. Masa noktasının HANGİ masada
 * olduğunu yine `tableUpgradeTarget` söyler (D-124) — bu kapı yalnız "şu an canlı mı" der.
 * Çizen (Scene), tetikleyen (tick) ve bildiren (revealKeys) üçü de bunu okur.
 */
export function upgradeSpotLive(kind: YukseltmeNoktasi, questIndex: number): boolean {
  const q = questIndex < C.quests.length ? C.quests[questIndex] : null;
  if (!q) return true;
  switch (q.target.type) {
    case 'stationLevel': return kind === 'station';
    case 'tableLevel':
    case 'tablesAtLevel': return kind === 'table';
    case 'lavaboLevel': return kind === 'lavabo';
    default: return false;
  }
}

/**
 * T8a / D-142 (G-67) — SEVİYE ₺ ÖDÜLÜ: seviye `levelRewardFromLevel`'dan önce 0; sonrasında
 * son `levelRewardSec` saniyede kazanılan ₺ (`sonKazanc`). "O anki ekonomi ne kadar
 * gerektiriyorsa" cümlesinin ölçülen karşılığı (K8d); sabit bir ₺ tablosu değil.
 */
export function levelRewardAmount(level: number, sonKazanc: number): number {
  if (level < C.xp.levelRewardFromLevel) return 0;
  return Math.max(0, Math.floor(sonKazanc));
}

/**
 * H2 / D-124 — MASA YÜKSELTMELERİNİN SIRASI: aynı anda **TEK** masanın noktası canlıdır.
 * Başlanan masa ₺ tavanına varmadan sıradaki açılmaz.
 *
 * NEDEN (ölçüm: `docs/sira-raporu-h2.md`): sıra serbestken oyuncunun seçtiği sıra 6 saatlik
 * kazancı **%20,6** değiştiriyordu (58.097 ₺ derin · 48.182 ₺ "en ucuzu al") ve ceza tam da en
 * doğal içgüdüyü — ucuz olanı almayı — vuruyordu. Kapı bunu kapatırken tempodan hiçbir şey
 * götürmüyor: kapılı kolun parmak izi, kapısız "derin oyuncu" kolununkiyle BİREBİR aynı çıktı
 * (`fd6d3dfd`), yani kapı yalnız kazanan sırayı zorunlu kılıyor. Yan kazanç ekranda: aynı anda
 * çizilen masa noktası ort 3,48 → 0,54 (tepe 12 → 1).
 *
 * "Ucuz olanı topla" yerine **"başladığını bitir"**: yarım kalmış (0 < L < tavan) bir masa varsa
 * hedef odur — en küçük indeksli olan. Hiç yarım masa yoksa el değmemiş ilk masa. Bu sıralama
 * eski kayıtları da tek kuralla karşılar: elinde beş yarım masa olan bir kayıt, kapı geldiğinde
 * kilitlenmez; masaları soldan sağa teker teker bitirmeye devam eder (şema değişmedi → saveVersion
 * artmaz).
 *
 * Döner: canlı masanın GLOBAL indeksi, ya da alınacak masa yükseltmesi kalmadıysa `null`.
 */
/** Oyun durumundan kapı görüntüsü (görev odağı · A2). `tick` kendi `padGate`ini kurar. */
export function gateOf(s: {
  padsDone: string[];
  tables: number;
  stationLevels: number[];
  lifetime: { toNumber(): number };
  tableLevels: number[];
  stats: SaveStats;
}): GateState {
  return {
    padsDone: s.padsDone,
    tables: s.tables,
    stationLevel: s.stationLevels[0],
    lifetime: s.lifetime.toNumber(),
    waiterServed: s.stats.waiterServed,
    waiterServedByService: s.stats.waiterServedByService,
    tableLevels: s.tableLevels,
  };
}

export function tableUpgradeTarget(g: GateState): number | null {
  const levels = g.tableLevels ?? [];
  const max = tableSoftMaxLevel();
  let elDegmemis: number | null = null;
  for (let i = 0; i < g.tables; i++) {
    if (!tableUpgradeUnlockedIn(areaOfTable(i), g)) continue;
    const lv = levels[i] ?? 0;
    if (lv >= max) continue;
    if (lv > 0) return i; // yarım kalan: "başladığını bitir" (en küçük indeks)
    if (elDegmemis == null) elDegmemis = i;
  }
  return elDegmemis;
}

// KİMLİK KORUMA (P0 perf, 2026-09-06). `tick()` her karede diziyi/nesneyi kopyalayıp tek `set()`
// ile yazıyordu → içerik AYNI olsa bile referans değişiyor, Zustand seçicileri "değişti" sanıp
// abone bileşeni her karede yeniden render ediyordu. Ölçüm (1920×1080, 3 salon, 14 NPC):
// kare başına 3,2 React commit; 12 anahtar (`tableLevels`, `stationLevels`, `stats`, `quest`,
// `dishes`, `upgradeFills`, ...) karelerin %100'ünde SADECE kimlik değiştiriyordu.
// Çözüm: set'ten hemen önce, içeriği eskisiyle aynı olan değeri ESKİ referansa geri döndür.
// Karşılaştırma sınırlı derinlikte (dizi → aktör nesnesi → pos dizisi → sayı) ve yalnız `tick`
// yükünde çalışır; maliyeti tek bir gereksiz React render'ından ucuzdur.
export function sameDeep(a: unknown, b: unknown, depth = 4): boolean {
  if (a === b) return true;
  if (depth <= 0) return false;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const aArr = Array.isArray(a);
  if (aArr !== Array.isArray(b)) return false;
  if (aArr) {
    const x = a as unknown[];
    const y = b as unknown[];
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (!sameDeep(x[i], y[i], depth - 1)) return false;
    return true;
  }
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  for (const k of ka) {
    if (!(k in bo)) return false;
    if (!sameDeep(ao[k], bo[k], depth - 1)) return false;
  }
  return true;
}

/** set() yükündeki DEĞİŞMEMİŞ değerleri eski referansa çevirir (yerinde). */
export function keepIdentity<T extends Record<string, unknown>>(prev: Record<string, unknown>, next: T): T {
  const patch = next as Record<string, unknown>;
  for (const k in patch) {
    const v = patch[k];
    if (v !== null && typeof v === 'object' && v !== prev[k] && sameDeep(v, prev[k])) patch[k] = prev[k];
  }
  return next;
}

export const SAVE_INTERVAL = 2; // sn
export const NPC_COLORS = ['#c0392b', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#16a085'];


// EKONOMİ v2 (D-010): çay fiyatı SABİT; seviye fiyatı değil throughput'u (çay/dk) artırır.
export const TEA_PRICE = C.service.basePrice;
// Bulaşık öğretilmeden kirli bardak çıkmaz (onboarding gate, 2026-06-10): ilk washDish görevinin index'i.
// Görev hattında yoksa -1 → gate hep açık (questIndex >= -1).
export const WASH_QUEST_INDEX = C.quests.findIndex((q) => q.target.type === 'washDish');

/**
 * G-69 — BULAŞIK TEZGÂHI SAHNEDE Mİ? Kirli bardağın doğduğu gate'in AYNISI.
 *
 * Kullanıcı 2026-09-18: *"bulaşık daha açılmadan, bulaşık tezgâh var, o da olmasın."* Haklıydı:
 * kirli bardak `questIndex >= WASH_QUEST_INDEX` ile doğuyordu (`tick.ts`) ama tezgâh KOŞULSUZ
 * çiziliyordu. Yani hattın ilk sekiz görevi boyunca ekranda hiçbir işe yaramayan, oyuncunun
 * bilmediği bir mekaniğin sözünü veren bir gövde duruyordu.
 *
 * İki yer aynı sayıyı OKUMALI, ayrı ayrı yazmamalı — `visiblePads`in "çizen de tetikleyen de
 * aynı fonksiyonu okur" deseni. Sunum bu kapıdan geçtiği için tezgâh ile mekanik aynı anda doğar.
 */
export const dishStationVisible = (questIndex: number): boolean => questIndex >= WASH_QUEST_INDEX;

/**
 * G-70 — BULAŞIK TEZGÂHI KİRLİ Mİ? **Yalnız ona GELEN kap sayılır.**
 *
 * Eski hâl katın tamamındaki kirliyi (`dishes.length`) sayıyordu, yani masaların üstünde duran
 * bardak tezgâhı kirli gösteriyordu ve kullanıcı bunu *"ben bulaşık bırakmasam bile kirli
 * birikmeye başlıyor"* diye bildirdi. Döngünün nedeni (taşıma) ile sonucu (tezgâhın kirlenmesi)
 * arasındaki bağ kopmuştu.
 *
 * Gövde, kirli kap ona GELİRKEN (oyuncunun tepsisinde ya da bulaşıkçının elinde) ve leğende
 * BEKLERKEN dolu. D-143 (T8b · K9) ile leğen birikiyor: kullanıcının *"birkaç tane bıraktıktan
 * sonra kirlenip, o adam oraya geldiğinde temizlenmesi"* — toplu yıkamada yığın bir anda boşalır.
 */
export const sinkDirty = (s: {
  carriedDirty: number;
  carriedDirtyFood: number;
  dishwasher: { tray: number; trayFood: number } | null;
  legen: { bardak: number; tabak: number };
}): boolean =>
  s.carriedDirty + s.carriedDirtyFood > 0 ||
  s.legen.bardak + s.legen.tabak > 0 ||
  (s.dishwasher ? s.dishwasher.tray + s.dishwasher.trayFood : 0) > 0;

// Görev geçiş ritmi (2026-06-17, kullanıcı onayı): hedef tamamlanınca kart ANINDA takas
// olmaz. completing = bar %100 dolar + yeşil onay flash'ı; gap = yeni görev gelmeden boşluk.
// Böylece "bitti → ara → yeni" net hissedilir (eski: aynı tick'te instant swap).
export const QUEST_COMPLETE_DUR = 0.5;
export const QUEST_GAP_DUR = 0.8;

/**
 * G-59 — **EKRANDAKİ GÖREV**: pad'i çizen de, tetikleyen de, kenar oku da BUNU okur.
 *
 * `questIndex` hedef karşılanır karşılanmaz ilerler ve bu BİLEREK böyle (yoksa 1,3 sn'lik kutlama
 * penceresinde yapılan eylem yeni görevin tabanına yazılır, sayaç 0/1'de kilitlenirdi — q_coin
 * dominosu, `questSystem`). Ama o yüzden kutlama sürerken `questIndex` ARTIK YENİ GÖREVİ
 * gösteriyordu: kart hâlâ biten görevi yazarken pad çoktan belirmişti.
 *
 * Kullanıcı 2026-09-18: *"Diğer görev tostu gelmeden direkt görevin pedi açılabiliyor"* ve
 * *"yeni görev kartı geldikten sonra ikinci masa pedi açılacak ve oraya zum atılacak"*.
 *
 * Çözüm yeni bir durum değil, var olan iki alanın TÜREVİ: kart hangi görevi gösteriyorsa dünya da
 * onu gösterir. Kutlama/boşluk penceresinde bu BİTEN görevdir; biten pad görevi `padsDone`da
 * olduğu için `visiblePads` doğal olarak boş döner — yani pencerede yeni pad BELİRMEZ, eski pad de
 * geri gelmez. Pencere kapanınca kart, pad ve kamera AYNI karede yeni göreve geçer.
 *
 * (`questSystem`in `viewIndex`i ile aynı ifade — orada kartın, burada dünyanın kaynağı. Tek yerde
 * tanımlı olması, ikisinin ayrışmasını yapısal olarak imkânsız kılar: D-038'in dört kanal dersi.)
 */
export interface QuestCardState {
  questIndex: number;
  questPhase: 'active' | 'completing' | 'gap';
  /** Kutlaması süren görevin index'i; pencere dışında −1. */
  questDoneIndex: number;
}
export const cardQuestIndex = (q: QuestCardState): number =>
  q.questPhase !== 'active' && q.questDoneIndex >= 0 ? q.questDoneIndex : q.questIndex;

/** Görev geçiş penceresi açık mı (kutlama + boşluk). Ekran kanalları bunu okur. */
export const questInTransition = (q: Pick<QuestCardState, 'questPhase'>): boolean => q.questPhase !== 'active';

/** D-142: yükseltme noktası ŞU AN canlı mı — görev geçiş penceresinde hiçbiri (G-60: kutlama
 *  sürerken yeni hedef belirmez), sonra aktif görevin türü. Çizen de tetikleyen de bunu okur. */
export const upgradeSpotLiveNow = (q: QuestCardState, kind: YukseltmeNoktasi): boolean =>
  !questInTransition(q) && upgradeSpotLive(kind, q.questIndex);

/** stationLevel'in demleme hız (throughput) çarpanı — çay/dk; fiyatı DEĞİL. */
export function brewThroughputMult(level: number): number {
  return upgradeOutputMultiplier(C.service.upgrade, level);
}

/** Bir birim ürünün hazırlanma süresi (sn) — throughput arttıkça kısalır. prepTime verilmezse çay
 *  (geri uyum: eski çağıranlar/testler); tost servisi PRODUCTS.tost.prepTime geçer (M3). */
export function brewTime(level: number, prepTime: number = C.npc.orderTime): number {
  return prepTime / brewThroughputMult(level);
}

/**
 * GLOBAL bardak havuzu kapasitesi: açık ALAN başına taban + servis seviyesi başına ek.
 * B2: taban ALANLA ölçeklenir (servisle DEĞİL) — mekân büyüdükçe daha çok bardak döner ve
 * `unlockArea` etkisinin havuza eklediği `poolBase` ile aynı kaynağı kullanır. Servis tekilleşince
 * "açık servis başına taban" okuması havuzu alan açılışlarında sessizce tutarsız bırakıyordu.
 */
export function totalCupPool(areasOpen: number, stationLevels: number[]): number {
  let lv = 0;
  for (const l of stationLevels) lv += l ?? 0;
  return areasOpen * C.cups.poolBase + C.cups.poolPerLevel * lv;
}

/** ₺ ile çıkılabilen en yüksek masa seviyesi — üstünde 💎 "Usta" basamağı durur (D-093). */
export const tableSoftMaxLevel = () => C.tables.upgrade.maxLevel;

/* ─────────────────────── USTA KATMANI (D7a · D-093) ───────────────────────
 * Kayıtta yalnız KİMLİK durur (`mastersOwned: string[]`), "kaç Usta aldım" HİÇBİR yerde
 * saklanmaz — `padsDone` (D-015) ve `goalsClaimed` (D-088) deseninin aynısı. Böylece Usta
 * hedefi eklemek/çıkarmak ilerlemiş kaydı bozmaz.
 *
 * Usta ancak ₺ TAVANINDA açılır ve bu şart ölçülmüş bir karardır, kolaylık değil: tavan şartı
 * kalkarsa personel kanalı ×1,25'te bile zinciri %13,4 kısaltıyor (`docs/elmas-raporu-d7.md`
 * §2 Bulgu 4), yani Kat 1 içeriğini yiyor. Plan K6 gereği Usta KRİTİK YOL DIŞIDIR: hiçbir
 * ilerleme Usta'ya bağlı değildir, yalnız hızlandırır. */

/** Usta kimliği. `tur` bugün yalnız 'table'; servis ve personel D7b/Kat 2'de aynı kalıptan gelir. */
export const masterId = (tur: 'table' | 'service' | 'staff', index: number | string): string =>
  `${tur}:${index}`;

/** Bir masa Usta olabilir mi — ₺ tavanına varmış olmalı. */
export const masterUnlockedForTable = (level: number): boolean => level >= tableSoftMaxLevel();

/** Usta basamağının 💎 fiyatı (tempo kolu DEĞİL, kuyruk kolu — §2 Bulgu 6). */
export const masterCost = (): number => C.master.diamondCost;

/** Bir masanın bahşiş çarpanı: Usta ise ölçülen doz, değilse 1 (taban birebir korunur). */
export const masterTipMult = (isMaster: boolean): number => (isMaster ? C.master.tipMult : 1);

/** Masa başına bahşiş çarpanı dizisi — kimlik listesinden TÜRETİLİR (tick bağlamı bunu okur).
 *  Usta olmayan hiç masa yoksa dizi baştan sona 1'dir, yani taban çıktısı birebir korunur. */
export function masterTipsOf(mastersOwned: readonly string[], tableCount: number): number[] {
  const sahip = new Set(mastersOwned);
  return Array.from({ length: Math.max(0, tableCount) }, (_, i) =>
    masterTipMult(sahip.has(masterId('table', i))));
}

/**
 * Masa teması mağazası kilidi (kullanıcı kararı 2026-06-17): 3 salon AÇIK **VE** tüm açık masalar
 * MAX seviye olunca açılır ("seviyeler fullenince"). Başta masalar renksiz (native mavi); tüm ilerleme
 * tamamlanınca premium renk teması satın alınabilir. Zemin/duvar temaları bu kilitten etkilenmez.
 */
export function tableThemeUnlocked(g: { areasOpen: number; tables: number; tableLevels: number[] }): boolean {
  if (g.areasOpen < MAX_AREAS || g.tables <= 0) return false;
  const max = tableSoftMaxLevel();
  for (let i = 0; i < g.tables; i++) if ((g.tableLevels[i] ?? 0) < max) return false;
  return true;
}
/** Mevcut seviyeden bir sonraki masa yükseltmesinin maliyeti (₺). */
export const tableNextCost = (level: number, area = 0) => tableUpgradeCost(level, area);
/** 1. alanın masa yükseltme gate'i (geri uyum: testler/eski çağıranlar). */
export function tableUpgradeUnlocked(g: GateState): boolean {
  return tableUpgradeUnlockedIn(0, g);
}

/**
 * Çevrimdışı gelir oranı (₺/sn) — bottleneck idealize: oturma × ürün fiyatı / döngü.
 * B2: menü artık SEVİYEDEN geldiği için ürün "servisin ürünü" değil, seviyedeki tost payına göre
 * KARIŞIM: L5'te müşterilerin %25'i tost (pahalı + yavaş) ister → hem fiyat hem hazırlık süresi
 * ağırlıklı ortalamayla girer. L0-L4'te pay 0 → formül eski çay-hâliyle birebir aynı sonucu verir.
 * Masa BAHŞİŞLERİ de orana dahil (kullanıcı 2026-06-11): tipTotal = açık masaların Σ(tipBase × seviye).
 * B4: LAVABO kolu da dahil — uğrayan müşteri lavabonun önüne para bırakır, yani gelir müşteri
 * BAŞINA büyür (fiyata/bahşişe dokunmadan). Oda kapalıyken (L0) terim 0 → formül birebir eski.
 * D-090: hedef koleksiyonunun KALICI gelir çarpanı (`goals.collectionMult`) da buraya biner —
 * çevrimdışı gelir aktif gelirle aynı çarpanı görmezse oyuncu oyunu KAPATARAK bonusunu kaybederdi.
 * Varsayılan 1 → hiç hedef toplanmamış kayıt için formül birebir eski.
 */
export function incomeRate(tables: number, level: number, tipTotal = 0, lavaboLevel = 0, mult = 1): number {
  const p = tostShare(level);
  const price = (1 - p) * PRODUCTS.tea.price + p * PRODUCTS.tost.price;
  const prepTime = (1 - p) * PRODUCTS.tea.prepTime + p * PRODUCTS.tost.prepTime;
  const cycle = C.npc.walkTime + brewTime(level, prepTime) + C.npc.eatTime;
  return ((tables * (price + lavaboIncomePerCustomer(lavaboLevel)) + tipTotal) / cycle) * mult;
}

/**
 * Kirli masaların index kümesi (D-019): bir masada eşikten FAZLA (>) kirli kap varsa kirli.
 * Y2: eşik KOLTUKLA ölçeklenir (`dirtyThreshold × koltuk` — plan §2; yoksa 4 kişilik tek grup
 * masayı anında kilitlerdi; L0'da eski davranışla birebir aynı: >2).
 * Kirli masaya yeni müşteri oturmaz + garson çay götürmez → oyuncu eşiğe inene kadar masa kilitli.
 */
export function dirtyTables(dishes: Dish[], tableLevels: number[] = []): Set<number> {
  const counts = new Map<number, number>();
  for (const d of dishes) counts.set(d.tableIndex, (counts.get(d.tableIndex) ?? 0) + 1);
  const dirty = new Set<number>();
  for (const [idx, n] of counts)
    if (n > C.cups.dirtyThreshold * tableSeats(tableLevels[idx] ?? 0)) dirty.add(idx);
  return dirty;
}

/** Masa-başı DOLU koltuk indeksleri (leaving sayılmaz — koltuk kalkar kalkmaz boşalır, Y2). */
/** Müşteri masasından KALKTI mı (B4: lavabo uğrağı da kalkmış sayılır — koltuğu boşalmıştır). */
export const hasLeftTable = (state: NpcState): boolean =>
  state === 'leaving' || state === 'toWc' || state === 'wcGiris' || state === 'inWc' || state === 'wcCikis';

export function occupiedSeats(npcs: Npc[]): Map<number, Set<number>> {
  const occ = new Map<number, Set<number>>();
  for (const n of npcs) {
    if (hasLeftTable(n.state)) continue;
    let set = occ.get(n.tableIndex);
    if (!set) {
      set = new Set();
      occ.set(n.tableIndex, set);
    }
    set.add(n.seatIndex);
  }
  return occ;
}

/** Grup hedefi (Y2, plan §2 + dağılım fix'i): ALANLAR ROUND-ROBIN pay alır — global "en çok
 *  boş koltuk" araması, az koltuklu yeni alanı (tost L0=1 koltuk) çay alanlarına karşı sürekli
 *  kaybettirip AÇ bırakıyordu (q_tost5 ilerleyemiyordu). startArea'dan başlayarak boş koltuğu
 *  olan İLK alan seçilir; hiç boş koltuk yoksa -1.
 *
 *  **Alan İÇİNDE sıralama B5b'de değişti (D-066 · Ö3): önce SEVİYE, sonra boş koltuk.**
 *  Eski kural "en çok boş koltuklu masa" idi ve gerçek bir kusur doğuruyordu: servis edilen bardak
 *  sayısı arz tavanıyla SABİT olduğu için (`docs/denge-raporu-b5b.md` §1) yeni açılan bir L0 masa
 *  o sabit bardakların bir kısmını üstüne çekiyor ve bahşişsiz ödüyordu → **masa açmak ortalama
 *  bahşişi, yani geliri KISA VADEDE DÜŞÜRÜYORDU.** Oyuncunun 13. masayı açtığı için cezalandırıldığı
 *  bir tycoon olmaz. Müşteri artık boş masalar arasında **en konforlusunu** seçiyor: yeni masa
 *  yalnız TAŞMA aldığı için geliri seyreltmez, ve masa yükseltmesi gözle görülür hale gelir
 *  (iyi masalar hep dolu). Eşit seviyede eski kural sürer (çok boş koltuk → grup bölünmez),
 *  eşitlikte düşük index. */
/**
 * Masanın O ANKİ koltuk sayısı: masanın TİPİNE ait seviye merdiveninden okunur, sonra masanın
 * gerçekten sahip olduğu koltuk konumlarıyla kelepçelenir. B3-2'de kelepçe TEK başınaydı ve doğru
 * cevabı tesadüfen veriyordu (min(4, 2) = 2); B5a'da `seatsByLevel` masa tipine ayrıldığı için
 * asıl cevabı merdiven veriyor, kelepçe yerleşim ile config'in çelişmesine karşı savunma olarak
 * duruyor (banketin iki yeri var, dörtlü masanın dört).
 */
export function seatsAtTable(tableIndex: number, level: number): number {
  const t = LAYOUT.tables[tableIndex];
  if (!t) return 0;
  return Math.min(tableSeats(level, t.kind), t.seats.length);
}

export function findTableForGroup(
  occ: Map<number, Set<number>>,
  tables: number,
  dirty: Set<number>,
  tableLevels: number[],
  areasOpen: number,
  startArea: number,
): number {
  for (let da = 0; da < areasOpen; da++) {
    const a = (startArea + da) % areasOpen;
    let best = -1;
    let bestFree = 0;
    let bestLevel = -1;
    const end = Math.min(areaTableStart(a + 1), tables);
    for (let i = areaTableStart(a); i < end; i++) {
      if (dirty.has(i)) continue;
      const level = tableLevels[i] ?? 0;
      const free = seatsAtTable(i, level) - (occ.get(i)?.size ?? 0);
      if (free <= 0) continue;
      if (level > bestLevel || (level === bestLevel && free > bestFree)) {
        bestLevel = level;
        bestFree = free;
        best = i;
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** Oyuncunun o an üstünde durduğu/doldurduğu NOKTA (HUD'da alttaki bar). */
export interface ActiveSpot {
  kind: 'pad' | 'upgrade';
  label: string;
  fill: number;
  cost: number;
}

/** Yeni-özellik bildirimi (D-019 §4): bir özellik İLK kez açılınca beliren kısa toast (ttl = kalan sn).
 *  kind → HUD'daki SVG rozeti seçer (emoji yok — UI game-feel kuralı). */
/** D-142 (G-66/G-67): seviye atlama ÖDÜL EKRANI (transient). Aynı anda birden çok seviye atlanırsa
 *  tek ekranda birikir: `level` en son seviye, `amount` ₺'lerin toplamı. */
export interface LevelUpOdul {
  level: number;
  /** ₺ ödülü (Seviye `levelRewardFromLevel`'dan önce 0). "Al"a basınca cüzdana geçer. */
  amount: number;
  /** Atlamadan ÖNCEKİ ve SONRAKİ taşıma bonusu (oran) — ekran stat'ın geçişini gösterir (D-128). */
  carryBefore: number;
  carryAfter: number;
}

export interface GameNotice {
  text: string;
  ttl: number;
  /** `satin` (F4c-4 · D-157): 💎/₺ kozmetik alındı ya da uygulandı — sessiz kalan satın almanın geri bildirimi. */
  kind: 'quest' | 'level' | 'reveal' | 'satin';
  /** Görev ödülü (₺; M1): toast'ta coin ikonu + tutar olarak gösterilir (₺ sembolü display'de yok). */
  reward?: number;
}

/**
 * EKRANA ÇİZİLEN bildirim türleri — ve bu liste bir üslup tercihi değil, bir KARARIN gövdesi.
 *
 * Kullanıcı 2026-09-09'da görev tamamlanma toast'ını kaldırttı (G-04): toast "şu görev bitti"
 * derken alt bant zaten tamamlanma hâlini gösteriyordu, oyuncu ikisini iki ayrı görev sanıyordu.
 * Karar HUD'da tek bir `notice.kind !== 'quest'` koşulu olarak duruyordu ve `f4b1a52`de SİLİNDİ:
 * o an `kind` tipi `'level' | 'reveal'`e daralmıştı, `tsc -b` koşulu "ölü dal" diye işaretledi,
 * dal silindi — KARAR da onunla gitti. `'quest'` sonradan tipe geri geldi, toast geri geldi,
 * kimse fark etmedi; kullanıcı 2026-09-16'da aynı şeyi ikinci kez bildirdi (G-41/G-43) ve
 * ölçüm bunun 2,20 sn'lik bir ÖRTÜŞME olduğunu gösterdi (`docs/serit-raporu-g1.md`).
 *
 * Bu yüzden kural artık bir OLUMSUZLAMA değil, bir LİSTE: "şunlar çizilir". Tip yeniden
 * daralırsa bu liste ölü dal olmaz, sadece kısalır — yani derleyici kararı bir daha silemez.
 * Bekçisi: `tests/gorev-seridi-g1.test.ts`.
 */
export const CIZILEN_TOAST: readonly GameNotice['kind'][] = ['level', 'reveal', 'satin'];

/** Bu bildirim ekrana çizilir mi? HUD tek karar noktası olarak bunu çağırır. */
export const toastCizilir = (n: GameNotice | null | undefined): n is GameNotice =>
  n != null && CIZILEN_TOAST.includes(n.kind);

/**
 * Şu an açık olan "yeni-özellik" reveal anahtarları (D-019 §4) — v21'den beri ALAN/SERVİS BAŞINA
 * (kullanıcı 2026-06-12: 2. alanın yükseltmeleri de düzenli açılsın + bildirilsin). Bir anahtar
 * revealSeen'de YOKKEN belirirse toast + kamera panı tetiklenir. revealSeen baseline init'te
 * mevcut açık özelliklerle kurulur → yeniden yüklemede zaten açık olanlar tekrar bildirmez.
 * Dönen üçlü: [anahtar, metin, pan hedefi (null = pan yok)].
 */
export function revealKeys(
  g: GateState,
  areasOpen: number,
  stationLevels: number[],
  questIndex = Number.POSITIVE_INFINITY,
): [string, string, RVec3 | null][] {
  const out: [string, string, RVec3 | null][] = [];
  const pre = (a: number) => (a === 0 ? '' : `${t('Salon {1}:', a + 1)} `);
  // D-124: bildirim de, panın hedefi de O AN CANLI masadan türer. Eskiden alan kapısı açılınca
  // haber veriliyor ve pan alanın İLK masasına atılıyordu; tek-hedef kuralında ikisi de yalan
  // söylerdi (salonun kapısı açık olabilir ama sıra henüz o salona gelmemiş olabilir; geldiğinde
  // de canlı masa alanın ilk masası olmayabilir). H1'in dersi burada da geçerli: tetik de,
  // bildirim de ÇİZİLEN şeyden türer.
  const hedefMasa = upgradeSpotLive('table', questIndex) ? tableUpgradeTarget(g) : null;
  if (hedefMasa != null) {
    const a = areaOfTable(hedefMasa);
    if (a < areasOpen)
      out.push([`tableUp:${a}`, t('Yeni: {1}Masaları yükseltebilirsin 🪑', pre(a)), LAYOUT.tables[hedefMasa].upgradeSpot]);
  }
  // Servis noktası TEK (B2) → tek reveal anahtarı, alan döngüsünün dışında. Metin seviyeye göre
  // konuşur: L4'e kadar "çay ocağı", sonrası "tezgâh" (tek merdiven, iki kimlik).
  const lv = stationLevels[THE_SERVICE] ?? 0;
  if (stationUpgradeUnlocked(g) && lv < stationSoftMaxLevel() && upgradeSpotLive('station', questIndex))
    out.push([
      `upgrade:${THE_SERVICE}`,
      isCounter(lv) ? t('Yeni: Tezgâhı yükseltebilirsin 🍞') : t('Yeni: Çay ocağını yükseltebilirsin ☕'),
      servicePlace(areasOpen).upgradeSpot,
    ]);
  for (const op of availableOptionalPads(g)) out.push([`opt:${op.id}`, t('Yeni: {1} 🔓', t(op.label)), null]);
  return out;
}

/**
 * Şu an aktif OMURGA pad'i: ilk açılmamış, opsiyonel OLMAYAN, `requires` koşulu karşılanan pad.
 * Opsiyonel pad'ler (ör. garson) atlanır → alınmasalar da omurga (sonraki masa/ocak) açılmaya
 * devam eder. Önkoşul zinciri (prev) sayesinde sıralıdır; sonraki gate'liyse null döner.
 */
export function currentPad(g: GateState): PadDef | null {
  return (C.pads as readonly PadDef[]).find(
    (p) => !p.optional && !g.padsDone.includes(p.id) && requiresMet(p.requires, g),
  ) ?? null;
}

/**
 * Şu an alınabilir opsiyonel pad'ler (garson vb.): açılmamış, `optional:true`, koşulu karşılanan.
 * Omurgadan bağımsız; oyuncu isterse alır. Aynı anda omurga pad'iyle birlikte aktif olabilir.
 */
export function availableOptionalPads(g: GateState): PadDef[] {
  return (C.pads as readonly PadDef[]).filter(
    (p) => p.optional && !g.padsDone.includes(p.id) && requiresMet(p.requires, g),
  );
}

/** Servis yükseltme gate'i — eski adıyla (geri uyum: testler/eski çağıranlar). */
export const stationUpgradeUnlocked0 = stationUpgradeUnlocked;

// ============================== QUEST MOTORU (2026-06-09) ==============================
// İlerleme sıralı TEK görevle yönlendirilir (Fable brief §1+§4; eski nextStep + onboardingHint
// koç bandının yerini alır). Sayaç görevleri questBase'ten DELTA sayılır; durum görevleri
// (pad/level) doğrudan oyun durumundan okunur.

/** Quest değerlendirme bağlamı (salt-okunur anlık görüntü). */
export interface QuestCtx {
  padsDone: string[];
  /** SERVİS başına ocak seviyesi (v27: servisli stationLevel görevleri — "Salon 2'nin ocağını yükselt"). */
  stationLevels: number[];
  tableLevels: number[];
  stats: SaveStats;
  questBase: number;
  /** Karakter yükseltme kademeleri (v20; charStat görevleri için). */
  charUpgrades: CharUpgrades;
  /** Garson tepsi kademeleri (v27/Y3; waiterTray görevleri için). */
  waiterUpgrades: WaiterUpgrades;
  /** ODA: lavabo seviyesi (B4; lavaboLevel görevleri için — eski çağıranlar vermeyebilir → 0). */
  lavaboLevel?: number;
}

/** Sayaç hedefinin baktığı kümülatif sayaç değeri (durum hedefleri için null). */
export function questCounterValue(target: QuestTarget, stats: SaveStats): number | null {
  switch (target.type) {
    case 'pickupTea': return stats.teaPickups;
    case 'serveTea':
      // ALAN'lı hedef (v23): yalnız o alandaki el servisi sayılır ("Yeni salonda 5 çay" gerçek olsun).
      return target.area != null ? stats.teasServedByArea[target.area] ?? 0 : stats.teasServed;
    case 'serveTost': return stats.tostServed;
    case 'collectCoin': return stats.coinsCollected;
    case 'washDish': return stats.dishesWashed;
    default: return null;
  }
}

/** Görev hedefi karşılandı mı? */
export function questTargetMet(target: QuestTarget, ctx: QuestCtx): boolean {
  const counter = questCounterValue(target, ctx.stats);
  if (counter != null) {
    const count = (target as { count: number }).count;
    return counter - ctx.questBase >= count;
  }
  switch (target.type) {
    case 'pad': return ctx.padsDone.includes(target.id);
    case 'stationLevel': return (ctx.stationLevels[THE_SERVICE] ?? 0) >= target.level;
    case 'waiterSpeed': return ctx.waiterUpgrades.speed >= target.tier;
    case 'tableLevel': return ctx.tableLevels.some((l) => l >= target.level);
    case 'tablesAtLevel': {
      // area verilirse yalnız o alanın masa slotları; verilmezse tüm masalar (v27 çeşitlilik).
      const lvls = target.area != null
        ? ctx.tableLevels.slice(areaTableStart(target.area), areaTableStart(target.area + 1))
        : ctx.tableLevels;
      return lvls.filter((l) => (l ?? 0) >= target.level).length >= target.count;
    }
    case 'waiterTray': return ctx.waiterUpgrades.tray >= target.tier;
    case 'charStat': return ctx.charUpgrades[target.stat] >= target.tier;
    case 'lavaboLevel': return (ctx.lavaboLevel ?? 0) >= target.level;
    default: return false;
  }
}

/** HUD görev barı görünümü (transient; her tick türetilir). */
export interface QuestView {
  id: string;
  /** G-05: bandın üstündeki kısa lakap ("İLK ÇAY"). Net hedef `title`da. */
  kicker: string;
  title: string;
  /** Görev hedefi (HUD görev fotoğrafı hedef tipine göre seçilir). */
  target: QuestTarget;
  /** Sayaç görevlerinde ilerleme (cur/total); durum görevlerinde null. */
  cur: number | null;
  total: number | null;
  /** Pad görevlerinde maliyet (görev barında gösterilir). */
  cost: number | null;
  /** Tamamlama ödülü (₺; M1) — görev kartında coin rozetiyle gösterilir. */
  reward: number | null;
  /** Görev geçiş fazında (completing/gap) true → kart %100 + yeşil onay flash'ı gösterir. */
  done?: boolean;
}

/**
 * B7 (T9d · D-146): çok-adımlı DURUM görevinin ilerlemesi ("2 masayı Seviye 3'e çıkar" → 1/2).
 * Eskiden yalnız sayaç görevlerinde sayı vardı; bu görevler kartta "Hedefe git" yazıyordu.
 * Sayım `questTargetMet`in `tablesAtLevel` dalıyla AYNI kümeden — kart ile bitiş ayrışamaz.
 */
function questStepProgress(target: QuestTarget, ctx: QuestCtx): { cur: number; total: number } | null {
  if (target.type !== 'tablesAtLevel' || target.count < 2) return null;
  const lvls = target.area != null
    ? ctx.tableLevels.slice(areaTableStart(target.area), areaTableStart(target.area + 1))
    : ctx.tableLevels;
  const cur = lvls.filter((l) => (l ?? 0) >= target.level).length;
  return { cur: Math.min(cur, target.count), total: target.count };
}

export function questView(q: QuestDef, ctx: QuestCtx): QuestView {
  const counter = questCounterValue(q.target, ctx.stats);
  const count = counter != null ? (q.target as { count: number }).count : null;
  const adim = counter == null ? questStepProgress(q.target, ctx) : null;
  const pad =
    q.target.type === 'pad'
      ? (C.pads as readonly PadDef[]).find((p) => p.id === (q.target as { id: string }).id)
      : undefined;
  // charStat/waiterTray/waiterSpeed görevinde maliyet = hedef kademeye ulaştıran satın almanın ₺'si (görev kartında).
  const charCost =
    q.target.type === 'charStat'
      ? charNextCost(q.target.stat, q.target.tier - 1)
      : q.target.type === 'waiterTray'
        ? waiterTrayNextCost(q.target.tier - 1)
        : q.target.type === 'waiterSpeed'
          ? waiterSpeedNextCost(q.target.tier - 1)
          : null;
  return {
    id: q.id,
    kicker: q.kicker,
    title: q.title,
    target: q.target,
    cur: counter != null && count != null ? Math.max(0, Math.min(count, counter - ctx.questBase)) : adim?.cur ?? null,
    total: count ?? adim?.total ?? null,
    cost: pad ? pad.cost : charCost,
    reward: q.reward ?? null,
  };
}

/** Görev hedefinin DÜNYA konumu (kamera odak + işaret görünürlüğü). area = görevin ALANI
 *  (2026-06-11 fix: 3. alanın görevlerinde kamera 1. alana zoom atıyordu — hedefler alias'lara sabitti).
 *  charStat görevlerinde 3D hedef YOK → null (kamera sıçramaz; yönlendirme HUD buton efektiyle). */
export function questFocusPos(
  target: QuestTarget,
  tableLevels: number[],
  tables: number,
  areasOpen: number,
  area = 0,
  /** T9c/A2: O AN CANLI masa (`tableUpgradeTarget`). Masa görevinde ok/kamera buraya bakar — canlı
   *  nokta "başladığını bitir" kuralıyla tavana kadar aynı masada kalır; ilk-eksik masaya bakan ok
   *  boş zemini gösteriyordu. Verilmezse (eski çağıran) ilk-eksik masa. */
  hedefMasa?: number | null,
): RVec3 | null {
  const a = Math.min(Math.max(area, 0), MAX_AREAS - 1);
  // B3-1: servisin YERİ areasOpen'a bağlı (3. Alan açılınca arka banda taşınır) → hedef noktalar
  // sabit diziden değil `servicePlace`ten okunur. Alan index'i (a) artık servisi seçmez: tek servis var.
  const sp = servicePlace(areasOpen);
  switch (target.type) {
    case 'charStat': return null;
    case 'waiterTray': return null; // panel satın alımı — 3D hedef yok (charStat deseni)
    case 'waiterSpeed': return null; // v29: hız da panelden — 3D hedef yok
    case 'pickupTea': return sp.station;
    case 'washDish': return sp.dish;
    case 'pad': return LAYOUT.padPos[target.id] ?? sp.station;
    case 'stationLevel': return sp.upgradeSpot;
    case 'lavaboLevel': return LAVABO.spot; // oda açılınca pad'in yerini yükseltme noktası alır
    case 'tableLevel':
    case 'tablesAtLevel': {
      if (hedefMasa != null && hedefMasa < tables) return LAYOUT.tables[hedefMasa].upgradeSpot;
      // O alandan başlayarak hedef seviyenin ALTINDAKİ ilk açık masanın yükseltme noktası
      // (tablesAtLevel v27: oyuncuyu gerçekten yükseltilecek masaya götürür).
      const goal = target.type === 'tablesAtLevel' ? target.level : tableSoftMaxLevel();
      const a0 = target.type === 'tablesAtLevel' && target.area != null ? target.area : a;
      for (let i = areaTableStart(a0); i < tables; i++) {
        if ((tableLevels[i] ?? 0) < goal) return LAYOUT.tables[i].upgradeSpot;
      }
      return LAYOUT.tables[Math.min(areaTableStart(a0), tables - 1) || 0].upgradeSpot;
    }
    // serveTea → o alanın OCAĞI/TEZGÂHI (2026-06-12 telefon feedback: salon ortası boştu —
    // özellikle yeni açılan salonda kamera "hiçbir şeye" bakıyordu); collectCoin → masa bölgesi ortası.
    case 'serveTea':
    case 'serveTost': return sp.station;
    default: {
      // B3-1: alanlar eş olmadığından "şablon + sıra kaydırması" kalktı — alanın KENDİ merkezi.
      const ab = LAYOUT.areaBounds[a];
      return [(ab.minX + ab.maxX) / 2, 0, (ab.minZ + ab.maxZ) / 2];
    }
  }
}

/** Kamera odak isteği (transient): CameraRig bu hedefe kayar/zoom yapar, ttl bitince/girdiyle döner. */
export interface CamFocus {
  pos: [number, number, number];
  ttl: number;
}
export const CAM_FOCUS_TTL = 2.2; // sn — kayma + kısa bekleme; joystick girdisi anında iptal eder

/**
 * EKRANDA TEK PAD (quest sistemi): görünür/doldurulabilir pad'ler. Pad görevi sırasında YALNIZ o pad;
 * pad-dışı görevde HİÇ pad; görev hattı bittiyse güvenlik ağı olarak klasik omurga sırası (normalde
 * hat tüm pad'leri kapsadığından boş kalır). Hem tick (dolum) hem Pad.tsx (çizim) BUNU kullanır →
 * görsel ile mantık ayrışamaz.
 */
export function visiblePads(questIndex: number, g: GateState): PadDef[] {
  // Y4: gating'i karşılanan OPSİYONEL pad'ler (2. garsonlar) görev durumundan bağımsız görünür —
  // geç-oyun serbest keşfi; "ekranda tek pad" ilkesi omurga için sürer (opsiyoneller nadir/gate'li).
  const opt = availableOptionalPads(g);
  const q = questIndex < C.quests.length ? C.quests[questIndex] : null;
  if (q) {
    if (q.target.type !== 'pad') return opt;
    const p = (C.pads as readonly PadDef[]).find((pd) => pd.id === (q.target as { id: string }).id);
    // AKTİF görevin hedef pad'inde TEMPO gate'leri (minLifetime vb.) ATLANIR (2026-06-11 fix:
    // "2. Masayı aç" görevi verilmişken table2 minLifetime:20 pad'i gizliyordu — görev hattı sıralı =
    // tempo kaynağı). `prev` OMURGA zinciri yapısal güvenlik ağı olarak KALIR (bozuk kayda karşı).
    const req = p ? (p.requires as Requires | undefined) : undefined;
    const prevOk = !req?.prev || req.prev.every((id) => g.padsDone.includes(id));
    const rest = opt.filter((o) => o.id !== p?.id); // q_waiter2 gibi opsiyonel-hedefli görevde çiftleme olmasın
    return p && !g.padsDone.includes(p.id) && prevOk ? [p, ...rest] : rest;
  }
  const bp = currentPad(g);
  return bp ? [bp, ...opt] : opt;
}

/**
 * D-185: Kat 2'nin çevrimdışı payı. `acik` = merdiven açık VE Kat 2 bu derlemede etkin (çağıran bakar).
 * Verilmezse ya da kapalıysa çevrimdışı bugünkü gibi yalnız Kat 1'dir (birebir).
 */
export interface CevrimdisiKat2 {
  acik: boolean;
  padsDone: readonly string[];
}

/**
 * Kat 2'nin idealize oranı (₺/sn): açık her masa döngüsünü (geliş + yürüme + oturum) tamamlar ve ocak
 * açıksa her kahve isteği servis edilir. Kat 1'in `incomeRate`i gibi üst sınırdır; tavan kelepçeler.
 * Tavla sayıları config'te yoksa tavla masası gelir üretmez (`kat2Dongu` ile aynı kural).
 */
export function kat2Oran(padsDone: readonly string[]): number {
  const a: Kat2Ayar = C.kat2;
  const ocak = padsDone.includes(OCAK.id);
  let oran = 0;
  for (const m of KAT2_MASALAR) {
    if (!padsDone.includes(m.id)) continue;
    const t = m.tur === 'tavla' ? a.tavla : a;
    if (!t) continue;
    const istek = ocak ? Math.max(0, Math.floor((t.oturum - a.kahveSabir * 0.5) / t.kahveAralik)) : 0;
    oran += (t.masaUcreti + istek * t.istekAdet * t.kahveFiyat) / (a.gelisAralik + a.yurume + t.oturum);
  }
  return oran;
}

/**
 * Çevrimdışının iki kelepçesinden önceki ham tutar ve PARA tavanı (sıradaki pad × oran).
 * D-185: Kat 2 açıksa ham tutara Kat 2 payı eklenir; Kat 1 bitmişse tavanın referansı Kat 2'nin
 * sıradaki pad'idir (yoksa bugünkü "en pahalı pad" — merdiveni açıp 1 sa kapatan oyuncu Kat 2'yi
 * bitirmesin, `docs/kat2-kasa-raporu-k2-4.md` Bulgu 5). `raw1` = ham tutarın Kat 1 payı.
 */
function offlineRawCap(
  rate: number,
  elapsedSec: number,
  padsDone: readonly string[],
  kat2?: CevrimdisiKat2,
): { raw: number; raw1: number; cap: number } {
  const sure = Math.min(elapsedSec, C.offline.baseCapHours * 3600);
  const raw1 = Math.floor(rate * C.offline.rateMult * sure);
  const k2 = kat2?.acik ? kat2 : null;
  const raw2 = k2 ? Math.floor(kat2Oran(k2.padsDone) * C.offline.rateMult * sure) : 0;
  const pads = C.pads as readonly PadDef[];
  const k2Pads: readonly { id: string; cost: number }[] = k2 ? C.kat2.padler : [];
  const next = pads.find((p) => !p.optional && !padsDone.includes(p.id)) ?? k2Pads.find((p) => !k2!.padsDone.includes(p.id));
  const refCost = next ? next.cost : Math.max(...pads.map((p) => p.cost), ...k2Pads.map((p) => p.cost));
  return { raw: raw1 + raw2, raw1, cap: Math.floor(refCost * C.offline.capNextPadFrac) };
}

/**
 * Offline kazanç (saf — vitest edilebilir; 2026-06-11 nerf): oran × rateMult × min(süre, süre-tavanı),
 * SONRA PARA tavanı = sıradaki omurga pad maliyeti × capNextPadFrac (tüm pad'ler bittiyse en pahalı pad
 * referans alınır). İki kelepçe birlikte: kapa-aç ~7k verip zone'u tek girişte bitirme bug'ı kapanır.
 */
export function computeOfflineEarned(rate: number, elapsedSec: number, padsDone: readonly string[], kat2?: CevrimdisiKat2): number {
  const { raw, cap } = offlineRawCap(rate, elapsedSec, padsDone, kat2);
  return Math.min(raw, cap);
}

/**
 * D-185: çevrimdışı kazanç + içindeki Kat 1 payı (tavandan sonra, ham paylarla orantılı). Oyuncu Kat 2'de
 * kapattıysa Kat 1 payı cüzdana değil kasaya girer (store; kasa sınırında kesilir).
 */
export function offlineEarnedSplit(
  rate: number,
  elapsedSec: number,
  padsDone: readonly string[],
  kat2?: CevrimdisiKat2,
): { kazanc: number; kat1Pay: number } {
  const { raw, raw1, cap } = offlineRawCap(rate, elapsedSec, padsDone, kat2);
  const kazanc = Math.min(raw, cap);
  return { kazanc, kat1Pay: raw > 0 ? Math.floor((kazanc * raw1) / raw) : 0 };
}

/**
 * F3b (D-150) — çevrimdışı ekranında "İzle"nin EKİ. Kat tavandan ÖNCE uygulanır (O2): tavan yine
 * bağlar, "alan açılır ama içi bitmez" kuralı korunur. 0 ise ekranda düğme çizilmez — 1 sa'lik
 * dönüşlerin %100'ü zaten tavanda (`odullu-raporu-f3b` §2), orada "2×" boş bir vaat olurdu.
 */
export function offlineWatchExtra(rate: number, elapsedSec: number, padsDone: readonly string[], kat2?: CevrimdisiKat2): number {
  const { raw, cap } = offlineRawCap(rate, elapsedSec, padsDone, kat2);
  return Math.max(0, Math.min(raw * C.rewarded.claimMult, cap) - Math.min(raw, cap));
}

/* ─────────────────────── ÖDÜLLÜ VİDEO HAKLARI (F3b · D-150) ─────────────────────── */

/** Bugün Usta "İzle"nin kaç hakkı kaldı (gün değiştiyse sayaç tazedir). */
export function masterAdsLeft(r: ReklamSayaci, gun: number): number {
  const kullanilan = r.ustaGun === gun ? r.ustaSayi : 0;
  return Math.max(0, C.rewarded.masterPerDay - kullanilan);
}

export function spendMasterAd(r: ReklamSayaci, gun: number): ReklamSayaci {
  return { ...r, ustaGun: gun, ustaSayi: (r.ustaGun === gun ? r.ustaSayi : 0) + 1 };
}

/** Video hakkı penceresi: İLK izlemede başlar, `periodSec` sonra tazelenir. Saat geri alınırsa
 *  (simdi < pencere) pencere de tazelenir — oyuncu cezalandırılmaz, hak da çoğalmaz. */
export function videoRights(r: ReklamSayaci, simdi: number): { kalan: number; yenilenmeMs: number } {
  const per = C.rewarded.video.periodSec * 1000;
  const taze = simdi < r.videoPencere || simdi - r.videoPencere >= per;
  const kullanilan = taze ? 0 : r.videoKullanilan;
  return {
    kalan: Math.max(0, C.rewarded.video.rights - kullanilan),
    yenilenmeMs: taze || kullanilan === 0 ? 0 : r.videoPencere + per - simdi,
  };
}

export function spendVideoRight(r: ReklamSayaci, simdi: number): ReklamSayaci {
  const per = C.rewarded.video.periodSec * 1000;
  const taze = simdi < r.videoPencere || simdi - r.videoPencere >= per;
  return taze
    ? { ...r, videoPencere: simdi, videoKullanilan: 1 }
    : { ...r, videoKullanilan: r.videoKullanilan + 1 };
}

/* ─────────────────────── SATIN ALIMLAR (F4a · D-152) ─────────────────────── */

/** Bir ürünün verdiği: 💎 + hangi kalıcı sahiplik. Bilinmeyen ürün null. Tek kaynak: config. */
export function purchaseGrant(urun: string): { diamonds: number; reklamsiz?: true; baslangic?: true } | null {
  const U = iapConfig.urun;
  if (urun === U.reklamsiz) return { diamonds: 0, reklamsiz: true };
  if (urun === U.baslangic) return { diamonds: C.iap.starterDiamonds, baslangic: true };
  const i = U.elmas.indexOf(urun as (typeof U.elmas)[number]);
  return i >= 0 && C.iap.diamondPacks[i] != null ? { diamonds: C.iap.diamondPacks[i] } : null;
}

/** İşlenmiş işlem listesinin boyu — aynı işlemin ikinci kez gelmesi dakikalar içinde olur. */
const ISLENEN_SINIRI = 50;

/**
 * Satın alımı durumuna uygular. Aynı işlem ikinci kez gelirse HİÇBİR ŞEY vermez (çift 💎 yok).
 * Başlangıç paketi ikinci kez gelirse (geri yükleme ya da mağazanın tekrar bildirimi) 💎'ı VERMEZ:
 * paket bir kez 💎 verir, kalıcı olan yalnız sahipliğidir.
 */
export function applyPurchase(s: SatinAlim, islem: string, urun: string): { satin: SatinAlim; diamonds: number } | null {
  const g = purchaseGrant(urun);
  if (!g || s.islenen.includes(islem)) return null;
  const diamonds = g.baslangic && s.baslangic ? 0 : g.diamonds;
  const islenen = [...s.islenen, islem].slice(-ISLENEN_SINIRI);
  const onceki = s.islemElmas ?? {};
  const islemElmas: Record<string, number> = {};
  for (const k of islenen) if (onceki[k]) islemElmas[k] = onceki[k];
  if (diamonds > 0) islemElmas[islem] = diamonds;
  return {
    satin: {
      ...s,
      reklamsiz: s.reklamsiz || !!g.reklamsiz,
      baslangic: s.baslangic || !!g.baslangic,
      islenen,
      islemElmas,
    },
    diamonds,
  };
}

/** Reklamsızın bugünkü 💎'ı alınabilir mi (gün değiştiyse evet). */
export const adFreeDailyReady = (s: SatinAlim, gun: number): boolean => s.reklamsiz && s.gunlukGun !== gun;

/** Kazanç izinin örnekleme aralığı (sn) — `tick.ts` yazar, ödüller okur. */
export const GELIR_ORNEK_SN = 5;

/** Video ödülü: son `video.incomeSec` saniyede kazanılan ₺ (seviye ₺'si ile aynı iz, D-142). */
export function videoReward(gelirIzi: readonly number[], lifetime: number): number {
  if (!gelirIzi.length) return 0;
  const k = Math.ceil(C.rewarded.video.incomeSec / GELIR_ORNEK_SN);
  return Math.max(0, Math.floor(lifetime - gelirIzi[Math.max(0, gelirIzi.length - 1 - k)]));
}

/** ₺ ile çıkılabilen en yüksek istasyon seviyesi (L5 = Usta, 💎/video — Faz 4). */
export const stationSoftMaxLevel = () => C.service.upgrade.maxLevel;
/**
 * Servis noktasının bir sonraki seviyesinin ₺ maliyeti. B2: TEK eğri — eski "ürünün
 * upgradeCostMult'u ile çarp" (tost tezgâhı ×20) kuralı kalktı, çünkü ürün artık ayrı bir servisin
 * değil AYNI merdivenin üst basamağı; L4-L6'nın pahalı olması eğrinin kendi işi (costsByLevel).
 */
export const stationUpgradeCost = (level: number) => upgradeCost(C.service.upgrade, level + 1);
/** Eski adıyla (servis parametresi kalktı; çağıranlar tek servisi soruyor). */
export const stationUpgradeCostAt = (_service: number, level: number) => stationUpgradeCost(level);
