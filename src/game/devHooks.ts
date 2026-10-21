// Test/dev kancaları. 3D sahne görsel doğrulanamaz; durum buradan okunur.
// window.__game  -> salt-okunur anlık görüntü
// window.__advanceTime(sn) -> simülasyonu hızlı ileri sar
import { useSandbox } from './devSandbox';
import { useGame, visiblePads, questCounterValue, LAYOUT, LAVABO, servicePlace, trayCapacity, dirtyTables, parkSpot, dailyCountersOf, tableSoftMaxLevel } from './store';
import { THE_SERVICE, sellsTost } from './world';
import { perf, type PerfSnapshot } from './perf';
import { olcumAc, olcumKapat, olcumOku, type OlcumKaydi } from './olcum';
import { getNavGrid, solDuvarKoluAyarla, type SolDuvarKolu } from './layout';
import { navKolAyarla, navKolAdi, navKorpusAc, navKorpusOku, navKorpusKapat, navOnbellekAyarla, navOnbellekAcik } from './nav';
import { collectionMult } from './goals';
import { toastCizilir } from './rules';
import { dailyViews } from './dailyQuests';
import { D } from './decimal';
import { izdusur } from './cameraView';
import { gorunenDekor } from './vitrin';
import { reklamDurumu, reklamSaatiKaydir } from './ads';
import { economyConfig, levelProgress, charLevel, lavaboVisitChance, lavaboFee, lavaboIncomePerCustomer, type CharStat } from '../config/economy.config';
import type { SaveStats } from './save';
import type { Vec3 } from './types';
import type { KabukKipi } from '../config/kabuk';

type NavKolAdi = 'uretim' | 'oracle' | 'onbellek';

/** `__navKorpus.dok()` çıktısı — node'a taşınabilir, JSON-güvenli korpus (T5b). */
export interface NavKorpusDokum {
  /** Korpusta kaç FARKLI ızgara nesnesi görüldü (1 değilse dünya koşu ortasında değişmiştir). */
  izgaraSayisi: number;
  cagriSayisi: number;
  grid: { cols: number; rows: number; cell: number; minX: number; minZ: number; blocked: number[] } | null;
  /** Her çağrı: [sx, sy, sz, tx, tz, reach]. */
  cagrilar: number[][];
}

declare global {
  interface Window {
    __game?: () => Record<string, unknown>;
    __advanceTime?: (seconds: number) => Record<string, unknown>;
    __solDuvarKolu?: (k: SolDuvarKolu | null) => void;
    __resetGame?: () => void;
    __addMoney?: (amount: number) => Record<string, unknown>;
    __upgradeStation?: () => boolean;
    __teleport?: (x: number, z: number) => Record<string, unknown>;
    /** Mağaza videosu (D-170): joystick girdisi + hafif konum okuma (`__game` her karede ağır). */
    __girdi?: (x: number, z: number) => [number, number];
    __sinema?: (k: { pos: [number, number, number]; bak: [number, number, number]; fov: number } | null) => void;
    /** Quest hattında belirli göreve atla (id ile; smoke testleri sıralı sayaç görevlerini beklemesin). */
    __setQuest?: (id: string) => Record<string, unknown>;
    /** Kalıcı sayaç ver (ör. waiterServed=20 → arka-plan reveal şartını test et). */
    __grantStat?: (key: string, value: number) => Record<string, unknown>;
    /** Karakter özelliği satın al (v20; panel butonunun store yolu). */
    __buyChar?: (stat: CharStat) => boolean;
    /** Masa seviyesini doğrudan ayarla (Y2 koltuk/grup testleri — koltuk = seviyeden türetilir). */
    __setTableLevel?: (tableIndex: number, level: number) => Record<string, unknown>;
    __fillDaily?: (id: string) => Record<string, unknown>;
    /** Anlık render bütçesi (FPS Tier 2): { fps, calls, tris }. PerfProbe 0.5sn'de bir günceller. */
    __perf?: () => PerfSnapshot;
    /** Reklam katmanı (F3): sayaçlar + soğuma; `saat(ms)` soğumayı beklemeden ileri alır. */
    __ads?: { durum: () => ReturnType<typeof reklamDurumu>; saat: (ms: number) => ReturnType<typeof reklamDurumu> };
    __olcum?: {
      ac: () => void;
      kapat: () => void;
      oku: () => Record<string, OlcumKaydi>;
      izgara: () => { cols: number; rows: number; hucre: number; cell: number } | null;
    };
    /** NAV A/B KOLU (T5b): 'uretim' = T5 sonrası · 'oracle' = T5 öncesi donmuş kopya ·
     *  'onbellek' = N2-kesin çağrı önbelleği AÇIK (T9a · D-145'ten beri üretim budur;
     *  'uretim' artık önbelleksiz T5 hâlini takar — ölçüm için).
     *  Argümansız çağrı yalnız TAKILI kolun adını döndürür (damga okuma). */
    __navKol?: (kol?: NavKolAdi) => Promise<NavKolAdi>;
    /** NAV KORPUS DÖKÜMÜ (T5b): tarayıcının GERÇEK çağrılarını node'a taşınabilir hâle getirir. */
    __navKorpus?: {
      ac: () => void;
      kapat: () => void;
      dok: () => NavKorpusDokum;
    };
    /** DEV-ONLY ham setState (canlı görsel ayar; masa/zone/seviye zorlama). Üretimde kullanılmaz. */
    __setState?: (patch: Record<string, unknown>) => Record<string, unknown>;
    /** Oyuncuyu hiçbir mekanizmayı tetiklemeyen noktaya park eder (Faz A3: duman testi elle
     *  yazılmış köşe koordinatı kullanmasın — nokta YERLEŞİMDEN türetilir). */
    __park?: () => Record<string, unknown>;
    /** ÜSTTEN PLAN görünümü + ölçü ızgarası (ölçüm kareleri betikten çekilebilsin).
     *  gridStep 0 = ızgara kapalı; topDown false = normal takip kamerası. */
    __devPlan?: (opts: { topDown?: boolean; zoom?: number; gridStep?: number }) => void;
    /** DUVAR KABUĞU KİPİ (S4): 'maket' maketin üç katmanı · 'kaykit' KayKit modülleri.
     *  Kullanıcı takası deneme olarak istedi; geri dönüş bir revert değil bu çağrı. */
    __kabuk?: (kip: KabukKipi) => string;
    /** S4 mutfak zemini karşılaştırma kolu: karo boyu × renk. */
    __fayans?: (karo: 'kucuk' | 'buyuk', renk: 'siyahbeyaz' | 'kahve') => string;
    __devCam?: (opts: { fov?: number; distMul?: number }) => void;
    __zaman?: (kat: number) => number;
    /** Dünya noktalarının takip kamerasındaki NDC izdüşümü (F4c-2 dekor yuvası kareleri). */
    __izdusur?: (pts: [number, number, number][]) => ([number, number] | null)[];
  }
}

export function installDevHooks(): void {
  if (typeof window === 'undefined') return;

  // T8b ölçüm kolu (K10): sol duvar payını KARE için değiştir. Sahne yerleşimi `areasOpen`a abone
  // olduğu için çağıran dönemi bir kez değiştirip geri almalı (`tools/shot-t8b.mjs`); personel yeni
  // postasından başlasın diye bulaşıkçı sıfırlanır.
  window.__solDuvarKolu = (k: SolDuvarKolu | null) => {
    solDuvarKoluAyarla(k);
    useGame.setState({ dishwasher: null } as never);
  };

  window.__game = () => {
    const s = useGame.getState();
    const place = servicePlace(s.areasOpen);
    const gate = {
      padsDone: s.padsDone,
      tables: s.tables,
      stationLevel: s.stationLevels[0],
      lifetime: s.lifetime.toNumber(),
      waiterServed: s.stats.waiterServed,
      waiterServedByService: s.stats.waiterServedByService,
      tableLevels: s.tableLevels,
    };
    // Quest sistemi: görünür pad = aktif görevin pad'i (ekranda tek pad).
    const pad = visiblePads(s.questIndex, gate)[0] ?? null;
    return {
      wallet: s.wallet.toNumber(),
      diamonds: s.diamonds.toNumber(),
      lifetime: s.lifetime.toNumber(),
      tables: s.tables,
      stations: s.stations,
      areasOpen: s.areasOpen,
      // F4c-2: salonda ÇİZİLEN 💎 dekor (sahip + yuvasında + yuvası açık) — duman testi buradan okur.
      // F4c-3 (D-156): kafenin adı (null = hiç sorulmadı) — duman ad kutusunu buradan sınar.
      kafeAdi: s.kafeAdi,
      dekor: gorunenDekor({ dekor: s.dekor, ownedCosmetics: s.ownedCosmetics, satin: s.satin, areasOpen: s.areasOpen }).map((d) => d.id),
      // B2: kat TEK servis noktasından döner → "zone başına ocak/personel" anlık görüntüsü kalktı,
      // yerine tek `service` nesnesi geldi (testler ve duman testi buradan okur).
      service: {
        level: s.stationLevels[THE_SERVICE],
        readyTea: s.ready.tea,
        readyTost: s.ready.tost,
        sellsTost: sellsTost(s.stationLevels[THE_SERVICE]),
        waiters: s.waiters.length,
        hasDishwasher: s.dishwasher != null,
        // B3-1: servisin YERİ açık alan sayısına bağlı (3. Alan açılınca arka banda taşınır).
        stationPos: place.station,
        dishStationPos: place.dish,
        upgradeSpotPos: place.upgradeSpot,
        movedToBand: place.areaIndex !== 0,
      },
      stationLevel: s.stationLevels[THE_SERVICE],
      padsDone: [...s.padsDone],
      npcCount: s.npcCount,
      // Servis durumu (D-011): hazır ÇAY (geri-uyum adı; tost ayrı — service.readyTost).
      readyCups: s.ready.tea,
      tray: s.tray,
      trayFood: s.trayFood,
      trayCap: trayCapacity(),
      // ODA: lavabo (B4) — seviye, gelir kolu ve noktaları. Testler kolun AKTİF olduğunu
      // buradan doğrular (3D sahne görsel doğrulanamaz).
      lavabo: {
        level: s.lavaboLevel,
        open: s.padsDone.includes('lavabo'),
        visitChance: lavaboVisitChance(s.lavaboLevel),
        fee: lavaboFee(s.lavaboLevel),
        perCustomer: lavaboIncomePerCustomer(s.lavaboLevel),
        spot: LAVABO.spot,
        coinSpot: LAVABO.coinSpot,
        inWc: s.npcs.filter((n) => n.state === 'inWc' || n.state === 'toWc').length,
        // Odanın ÖNÜNDEKİ istif: kolun mekânsal karşılığı. Testler "gelir arttı" demez, parayı
        // gerçekten lavabonun önünde bulur (masa istifiyle karışmasın diye yarıçap dar).
        pileCount: s.coins.filter((c) => Math.hypot(c.pos[0] - LAVABO.coinSpot[0], c.pos[2] - LAVABO.coinSpot[2]) < 1.5).length,
        pileValue: s.coins
          .filter((c) => Math.hypot(c.pos[0] - LAVABO.coinSpot[0], c.pos[2] - LAVABO.coinSpot[2]) < 1.5)
          .reduce((n, c) => n + c.value, 0),
      },
      // Masa-başı yükseltme (Faz 2h): her masanın seviyesi + yanındaki yükseltme noktaları
      tableLevels: [...s.tableLevels],
      tableUpgradeSpots: LAYOUT.tables.map((t) => t.upgradeSpot),
      waitingCount: s.npcs.filter((n) => n.state === 'waitingForTea').length,
      stationPos: place.station,
      // Servis edilmeyi bekleyen ilk müşterinin koltuğu (smoke servis testi için) — yoksa null.
      firstWaitingSeat: (() => {
        const w = s.npcs.find((n) => n.state === 'waitingForTea');
        return w ? LAYOUT.tables[w.tableIndex].seat : null;
      })(),
      coins: s.coins.length,
      // Bardak döngüsü (Faz 2e)
      cleanCups: s.cleanCups,
      dirtyCount: s.dishes.length,
      carriedDirty: s.carriedDirty,
      carriedDirtyFood: s.carriedDirtyFood,
      dishStationPos: place.dish,
      firstDishPos: s.dishes[0] ? s.dishes[0].pos : null,
      // Kirli masa mekaniği (D-019): eşiği aşan masa indeksleri (müşteri oturmaz + garson götürmez).
      dirtyTables: [...dirtyTables(s.dishes, s.tableLevels)],
      dishesByTable: LAYOUT.tables.map((_, i) => s.dishes.filter((d) => d.tableIndex === i).length),
      hasDishwasher: s.dishwasher != null,
      dishwasherTray: s.dishwasher ? s.dishwasher.tray + s.dishwasher.trayFood : 0,
      dishwasherPos: s.dishwasher ? s.dishwasher.pos.map((n: number) => +n.toFixed(2)) : null,
      padFill: Math.floor(pad ? s.padFills[pad.id] ?? 0 : 0),
      currentPad: pad ? pad.id : null,
      padCost: pad ? pad.cost : 0,
      padPos: pad ? LAYOUT.padPos[pad.id] : null,
      // Garson durumu (Faz 2d) — zone-1 geri-uyum (v29: hız kademesi waiterUpgrades'te)
      hasWaiter: s.waiters[0] != null,
      waiterTray: s.waiters[0] ? s.waiters[0].tray : 0,
      waiterPos: s.waiters[0] ? s.waiters[0].pos.map((n) => +n.toFixed(2)) : null,
      // Quest sistemi (2026-06-09): aktif görev + sayaçlar + kamera odağı.
      questIndex: s.questIndex,
      /** D3: toplanmış hedef kimlikleri — duman testi ödül toplamayı buradan doğrular. */
      goalsClaimed: [...(s.goalsClaimed ?? [])],
      /** D-090: koleksiyonun KALICI gelir çarpanı (1 = hiç hedef toplanmamış). Ödül artık cüzdana
       *  ₺ koymuyor, bu yüzden duman testi ödülün işe yaradığını buradan okur. */
      goalMult: collectionMult(s.goalsClaimed ?? []),
      /** D-093: USTA olmuş obje kimlikleri + D8'in yakınlık hedefi. Duman testi Usta alımını
       *  buradan doğrular (çarpan kimlik listesinden türer, ayrı alan yok). */
      mastersOwned: [...(s.mastersOwned ?? [])],
      nearMaster: s.nearMaster,
      /** ₺ ile çıkılabilen en yüksek masa seviyesi — üstünde 💎 Usta basamağı durur. */
      tableMaxLevel: tableSoftMaxLevel(),
      /** D8: bugünün günlük görev kartları (kimlik · ilerleme · durum) — HUD'un çizdiğiyle
       *  aynı türetici, böylece duman testi DOM'a değil duruma bakabilir. */
      daily: dailyViews(s.daily, s.tables, dailyCountersOf(s)).map((v) => ({
        id: v.id, cur: v.cur, target: v.target, diamonds: v.diamonds, state: v.state,
      })),
      quest: s.quest ? { id: s.quest.id, title: s.quest.title, cur: s.quest.cur, total: s.quest.total } : null,
      stats: { ...s.stats },
      // Level/XP sistemi (v17): toplam xp + türetilen seviye/ilerleme + ayarlar.
      xp: s.xp,
      level: levelProgress(s.xp),
      settings: { ...s.settings },
      // Karakter yükseltmeleri (v20): kademeler + türetilen karakter seviyesi + spotlight bayrağı.
      charUpgrades: { ...s.charUpgrades },
      charLevel: charLevel(s.charUpgrades),
      charPanelSeen: s.charPanelSeen,
      // Garson yükseltmeleri (v27/Y3) + havuzdaki her garsonun anlık tepsi yükü (çay/tost).
      waiterUpgrades: { ...s.waiterUpgrades },
      waiterTrays: s.waiters.map((w) => w.tray + w.trayFood),
      camFocus: s.camFocus ? { pos: s.camFocus.pos, ttl: +s.camFocus.ttl.toFixed(2) } : null,
      // Yeni-özellik bildirimi (D-019 §4): anlık toast metni + bu oturumda bildirilmiş reveal anahtarları.
      notice: s.notice ? s.notice.text : null,
      // GÖREV ŞERİDİ (G1 ölçümü): geçişin ham hâli. Bant ile toast'ın AYNI ANDA konuşup
      // konuşmadığı yalnız buradan okunabilir — `notice` metni toast'ın TÜRÜNÜ söylemiyordu ve
      // hangi fazda olduğumuzu hiç söylemiyordu. Salt-okunur; tick'e dokunmaz.
      serit: {
        questPhase: s.questPhase,
        questPhaseT: +s.questPhaseT.toFixed(3),
        questDoneIndex: s.questDoneIndex,
        questDone: s.quest?.done === true,
        noticeKind: s.notice ? s.notice.kind : null,
        // ÇİZİLİYOR MU — HUD'un sorduğu sorunun AYNISI, aynı fonksiyondan. Ölçüm aracı buna
        // bakmazsa "durumda bildirim var" ile "ekranda toast var" karışır ve G-41 düzeltildikten
        // sonra bile 2,20 sn örtüşme raporlar (olay hâlâ üretiliyor, yalnız çizilmiyor).
        noticeCizilir: toastCizilir(s.notice),
        noticeTtl: s.notice ? +s.notice.ttl.toFixed(3) : null,
        // Ham nesneler: ölçüm kolu bir bildirimi TÜRÜNE göre eleyip geri yazabilsin diye
        // (`__setState` yazabiliyordu ama okuyamıyordu — kol körlemesine kuyruk siliyordu).
        noticeRaw: s.notice ? { ...s.notice } : null,
        noticeQueueRaw: s.noticeQueue.map((n) => ({ ...n })),
      },
      revealSeen: [...s.revealSeen],
      upgradeFill: Math.floor(s.upgradeFills[0]),
      upgradeZonePos: place.upgradeSpot,
      activeSpot: s.activeSpot ? { kind: s.activeSpot.kind, label: s.activeSpot.label } : null,
      player: s.player.map((n) => +n.toFixed(2)),
      offlineEarned: s.offlineEarned,
    };
  };

  // Sabit küçük adımlarla ileri sar (NPC durum makinesi stabil kalsın).
  window.__advanceTime = (seconds: number) => {
    const tick = useGame.getState().tick;
    const stepDt = 0.1;
    let remaining = Math.max(0, seconds);
    let guard = 0;
    while (remaining > 0 && guard < 200000) {
      tick(Math.min(stepDt, remaining));
      remaining -= stepDt;
      guard++;
    }
    return window.__game!();
  };

  window.__resetGame = () => useGame.getState().hardReset();

  /**
   * KARE BÖLÜŞÜMÜ ÖLÇÜMÜ (§G) — `olcum.ts` dikişinin dışa açılan ucu. Ölçüm aracı açar, koşar,
   * okur, kapatır; kapalıyken sıcak yolda maliyeti yoktur.
   */
  window.__olcum = {
    ac: () => olcumAc(),
    kapat: () => olcumKapat(),
    oku: () => olcumOku(),
    izgara: () => {
      const st = useGame.getState();
      const g = getNavGrid(st.tables, st.areasOpen);
      return { cols: g.cols, rows: g.rows, hucre: g.cols * g.rows, cell: g.cell };
    },
  };

  /**
   * NAV A/B KOLU (T5b) — `docs/nav-raporu-t5.md` §7.
   *
   * Oracle **dinamik** import edilir: üretim derlemesinde `import.meta.env.DEV` false olduğu
   * için bu dosyanın tamamı zaten ölü daldır, dinamik import de onunla birlikte düşer —
   * `tools/nav-oracle.ts` ürün paketine HİÇ girmez.
   */
  window.__navKol = async (kol) => {
    if (kol === 'oracle') {
      const m = await import('../../tools/nav-oracle');
      navOnbellekAyarla(false);
      navKolAyarla(m.navPathOracle);
    } else if (kol === 'uretim' || kol === 'onbellek') {
      navKolAyarla(null);
      navOnbellekAyarla(kol === 'onbellek');
    }
    return navOnbellekAcik() ? 'onbellek' : navKolAdi();
  };

  /**
   * NAV KORPUS DÖKÜMÜ (T5b) — **turun asıl sorusu burada çözülür.**
   *
   * Tarayıcı A/B'si iki kolu neredeyse eşit ölçtü (×1,04), node ise ×2,52. İki sayı da temiz
   * koşulardan geliyor, yani biri "yanlış" değil — FARKLI BİR ŞEY ölçüyorlar. İki şüpheli var:
   *   ① ORTAM  — tarayıcıdaki ölçüm/JIT davranışı farkı eziyor.
   *   ② KORPUS — node'un korpusu `tick()`i başsız koşturarak toplanıyor; o dünyadaki çağrılar
   *              tarayıcının canlı çağrılarından daha PAHALI olabilir (daha uzun arama).
   * Şüpheliyi ayırmanın tek yolu AYNI korpusu iki ortamda da koşturmaktır. Bu kanca tarayıcının
   * gerçek çağrılarını serileştirir; `tools/olcum-nav-korpus-t5b.ts` onları node'da oynatır.
   *
   * Izgara BİR KEZ yazılır ve kaç farklı ızgara nesnesi görüldüğü sayılır: dünya koşu ortasında
   * değişmişse (masa/alan) korpus tek ızgarayla oynatılamaz ve döküm bunu kendisi söyler.
   */
  window.__navKorpus = {
    ac: () => navKorpusAc(),
    kapat: () => navKorpusKapat(),
    dok: () => {
      const c = navKorpusOku();
      const izgaralar = new Set(c.map((x) => x.grid));
      const g = c[0]?.grid;
      return {
        izgaraSayisi: izgaralar.size,
        cagriSayisi: c.length,
        grid: g
          ? { cols: g.cols, rows: g.rows, cell: g.cell, minX: g.minX, minZ: g.minZ, blocked: Array.from(g.blocked) }
          : null,
        cagrilar: c.map((x) => [x.start[0], x.start[1], x.start[2], x.tx, x.tz, x.reach]),
      };
    },
  };

  window.__addMoney = (amount: number) => {
    useGame.getState().addMoney(amount);
    return window.__game!();
  };

  window.__upgradeStation = () => useGame.getState().upgradeStation();

  window.__teleport = (x: number, z: number) => {
    useGame.setState({ player: [x, 0.6, z] as Vec3 });
    return window.__game!();
  };

  window.__girdi = (x: number, z: number) => {
    useGame.getState().setKeyboardInput(x, z);
    const p = useGame.getState().player;
    return [p[0], p[2]];
  };

  window.__sinema = (k) => useSandbox.getState().set({ sinema: k });

  window.__park = () => {
    const s = useGame.getState();
    useGame.setState({ player: parkSpot(s.areasOpen, s.tables), inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    return window.__game!();
  };

  window.__setQuest = (id: string) => {
    const idx = economyConfig.quests.findIndex((q) => q.id === id);
    if (idx >= 0) {
      const s = useGame.getState();
      // Sayaç görevi ise delta tabanı ŞU ANKİ sayaç (görev şimdi başlamış gibi).
      const base = questCounterValue(economyConfig.quests[idx].target, s.stats) ?? 0;
      useGame.setState({ questIndex: idx, questBase: base, questPhase: 'active', questPhaseT: 0, questDoneIndex: -1 });
    }
    return window.__game!();
  };

  window.__buyChar = (stat: CharStat) => useGame.getState().buyCharUpgrade(stat);

  /** D8: bir GÜNLÜK GÖREVİ tam olarak toplanabilir yap — gün tabanını hedefin altına çeker.
   *  Sayacı şişirmek yerine TABAN oynatılır: gerçek sayaçlar (ve onlara bağlı hedefler/görev
   *  hattı) bozulmasın, yalnız bugünün deltası dolsun. */
  window.__fillDaily = (id: string) => {
    const s = useGame.getState();
    const v = dailyViews(s.daily, s.tables, dailyCountersOf(s)).find((x) => x.id === id);
    if (v) {
      const sayac = dailyCountersOf(s);
      const t = economyConfig.dailyQuests.pool.find((x) => x.id === id);
      if (t) useGame.setState({ daily: { ...s.daily, base: { ...s.daily.base, [id]: sayac[t.metric] - v.target } } });
    }
    return window.__game!();
  };

  window.__setTableLevel = (tableIndex: number, level: number) => {
    const levels = useGame.getState().tableLevels.slice();
    levels[tableIndex] = level;
    useGame.setState({ tableLevels: levels });
    return window.__game!();
  };

  window.__perf = () => ({ ...perf });
  window.__ads = {
    durum: reklamDurumu,
    saat: (ms) => {
      reklamSaatiKaydir(ms);
      return reklamDurumu();
    },
  };

  window.__kabuk = (kip) => {
    useGame.getState().setKabuk(kip);
    return kip;
  };

  window.__fayans = (karo, renk) => {
    useSandbox.getState().set({ fayansKaro: karo, fayansRenk: renk });
    return `${karo}/${renk}`;
  };

  window.__devPlan = ({ topDown = true, zoom = 1, gridStep = 0 }) => {
    useSandbox.getState().set({ topDown, topDownZoom: zoom, gridStep });
  };

  // BM adım 4 ölçümü: fov 50 ↔ 34 karşılaştırma karesi. `{ fov: 0, distMul: 0 }` üretime döner.
  window.__devCam = ({ fov = 0, distMul = 0 }) => {
    useSandbox.getState().set({ camFov: fov, camDistMul: distMul });
  };

  // F2 ölçümü: simülasyon hız çarpanı. `__zaman(0)` dünyayı DONDURUR — gölge/dpr kollarının
  // GPU maliyetini ölçerken sahnenin her karede aynı olması şart, yoksa NPC sayısı oynayınca
  // üçgen sayısı kollar arasında kayar ve "aynı dünyayı mı ölçtük" denetimi düşer (kısa koşu
  // tam bunu yakaladı: taban 260.955 ↔ gölge-kapalı 279.797 üçgen).
  window.__zaman = (kat: number) => {
    useSandbox.getState().set({ timeScale: Math.max(0, kat) });
    return kat;
  };

  window.__izdusur = (pts) => pts.map(([x, y, z]) => izdusur(x, y, z));

  window.__setState = (patch) => {
    // Para alanları Decimal'dir; tarayıcı konsolundan/duman testinden düz sayı gelirse sarmalanır
    // (yoksa store sessizce bozulur ve sonraki `__game()` "toNumber is not a function" ile patlar).
    const p: Record<string, unknown> = { ...patch };
    for (const k of ['wallet', 'diamonds', 'lifetime']) {
      if (typeof p[k] === 'number' || typeof p[k] === 'string') p[k] = D(p[k] as number);
    }
    useGame.setState(p as never);
    return window.__game!();
  };

  window.__grantStat = (key: string, value: number) => {
    const s = useGame.getState();
    useGame.setState({ stats: { ...s.stats, [key]: value } as SaveStats });
    return window.__game!();
  };
}
