import { describe, it, expect, vi } from 'vitest';
import { floorQuads } from '../src/components/three/floorPattern';
import { DOOR, wallBoxes, WALL_H, WAINSCOT_H } from '../src/components/three/wallPanel';
import { MERDIVEN_DERINLIK } from '../src/components/three/wallLook';
import { FLOOR_THEMES, WALL_THEMES } from '../src/config/palette';
import {
  economyConfig,
  PRODUCTS,
  upgradeCost,
  upgradeOutputMultiplier,
  brewQueueCapacity,
  cupPoolCapacity,
  tableUpgradeCost,
  tableTip,
  tablePatience,
  tableSeats,
  rollGroupSize,
  waiterSpeedFor,
  waiterSpeedNextCost,
  waiterSpeedMaxTier,
  dishSpeedFor,
  dishSpeedMaxTier,
  xpForLevel,
  levelProgress,
  charValue,
  charNextCost,
  charMaxTier,
  charLevel,
  trayCapacityFor,
  attractRadiusFor,
  playerSpeedFor,
  upgradeFillRateFor,
  waiterTrayCapacityFor,
  waiterTrayMaxTier,
  waiterTrayNextCost,
  dishCarryCapacityFor,
  dishCarryMaxTier,
  dishCarryNextCost,
  requiresMet,
} from '../src/config/economy.config';
import { D, fmt } from '../src/game/decimal';
import {
  useGame,
  LAYOUT,
  currentPad,
  visiblePads,
  questFocusPos,
  computeOfflineEarned,
  questTargetMet,
  questCounterValue,
  findTableForGroup,
  stationSoftMaxLevel,
  stationUpgradeCost,
  trayCapacity,
  tableSoftMaxLevel,
  tableThemeUnlocked,
  tableUpgradeUnlocked,
  tableUpgradeUnlockedIn,
  stationUpgradeUnlocked,
  revealKeys,
  TEA_PRICE,
  brewTime,
  incomeRate,
  dirtyTables,
  totalCupPool,
  stationUpgradeCostAt,
  parkSpot,
  parkClearance,
  PAD_RADIUS,
  openServices,
  deriveWorld,
  defaultFloorTheme,
  MAX_AREAS,
  MAX_SERVICES,
  MAX_TABLES,
  tablesInArea,
  serviceOfTable,
  serviceInArea,
  serviceMenu,
  sellsTost,
  isCounter,
  tostShare,
  THE_SERVICE,
  MAX_WAITERS,
  areaOfTable,
  servicePlace,
  boxDist2D,
  atServiceBody,
  atTableBody,
  tableHalfFor,
  BAND,
  BAND_SHELL,
  FLOOR_HALF,
  BANKET,
  entranceAt,
  streetAt,
} from '../src/game/store';
import { resetKeepingSettings, loadSave, defaultSave, defaultStats, defaultSettings, defaultWaiterUpgrades, SAVE_VERSION } from '../src/game/save';
import { buildNavGrid, findNavPath } from '../src/game/nav';

/** Servis kümesinin YERİ (B3-1/D-062): 3. Alan açılınca arka banda taşınır. Testlerin çoğu tek
 *  alanla koştuğu için varsayılan 1 = sol duvar dönemi; 3 alanlı testler SP(3) ister. */
const SP = (areasOpen = 1) => servicePlace(areasOpen);

// Mevcut ilerleme durumundan gating (requires) için GateState üretir.
function gate() {
  const s = useGame.getState();
  return {
    padsDone: s.padsDone,
    tables: s.tables,
    stationLevel: s.stationLevels[0],
    lifetime: s.lifetime.toNumber(),
    waiterServed: s.stats.waiterServed,
  };
}

// Bir pad'in görev hattındaki quest index'i (her pad'in bir quest'i var).
function questIndexFor(padId: string): number {
  return economyConfig.quests.findIndex(
    (q) => q.target.type === 'pad' && (q.target as { id: string }).id === padId,
  );
}

// --- Sahne yardımcıları (Faz A3: testler koordinat bağından KOPARILDI) ---
// Eskiden "oyuncuyu uzağa park et" niyeti [0, 0.6, 6.5] gibi ELLE yazılmış noktalarla ifade
// ediliyordu; yerleşim değişince (Faz B) bu noktalar sessizce bir masanın/pad'in üstüne düşer,
// test "kimse servis etmedi" derken aslında servis ediliyor olurdu. Artık nokta yerleşimden
// TÜRETİLİR (layout.parkSpot: açık alanı tarar, tüm etkileşim noktalarına uzaklığı en büyük
// engelsiz hücreyi seçer) ve altta bir bekçi test bu boşluğun yeterli olduğunu doğrular.
const PARK = parkSpot();

/** Oyuncuyu hiçbir mekanizmayı tetiklemeyen noktaya park eder (girdi de sıfırlanır). */
function park(areasOpen = 1, tables = 4): void {
  useGame.setState({ player: parkSpot(areasOpen, tables), inputKeyboard: [0, 0], inputJoystick: [0, 0] });
}

/** Oyuncuyu yerleşimden gelen bir noktaya taşır (ocak, koltuk, pad, yükseltme noktası...);
 *  girdiyi de sıfırlar → o noktada BEKLER (mekânsal dolum hareket-temelli: durunca akar). */
function stand(pos: readonly number[]): void {
  useGame.setState({ player: [pos[0], 0.6, pos[2]], inputKeyboard: [0, 0], inputJoystick: [0, 0] });
}

// Pad'i quest hattında aktif yapıp (görünürlük), oyuncuyu üstüne koyup parayla tamamlar.
function completePad(padId: string): boolean {
  const pad = economyConfig.pads.find((p) => p.id === padId);
  if (!pad) return false;
  // Görev geçiş ritmi (A paketi): önceki tamamlamadan kalan questPhase yeni pad'in fill'ini bozmasın
  // (visiblePads questIndex'e bağlı; faz makinesi mid-fill ilerletmesin) → fazı 'active'e sıfırla.
  useGame.setState({ questIndex: questIndexFor(padId), questBase: 0, questPhase: 'active', questPhaseT: 0 });
  useGame.getState().addMoney(pad.cost + 50);
  const pos = LAYOUT.padPos[padId];
  stand(pos);
  for (let i = 0; i < 400 && !useGame.getState().padsDone.includes(padId); i++) {
    useGame.getState().tick(0.1);
  }
  return useGame.getState().padsDone.includes(padId);
}

// Görev geçiş ritmini akıtır (A paketi: completing 0.5s + gap 0.8s). Bir eylemle görev TAMAMLANDIKTAN
// sonra çağır → faz completing/gap'ten 'active'e dönene kadar tikler (sıradaki görev aktif olur).
function flushQuestTransition() {
  for (let i = 0; i < 40; i++) {
    const before = useGame.getState().questPhase;
    useGame.getState().tick(0.1);
    if (before !== 'active' && useGame.getState().questPhase === 'active') return;
  }
}

const spec = economyConfig.service.upgrade;

describe('ekonomi yükseltme formülleri', () => {
  it('maliyet geometrik büyür', () => {
    expect(upgradeCost(spec, 1)).toBe(spec.costBase);
    expect(upgradeCost(spec, 2)).toBe(Math.floor(spec.costBase * spec.costGrowth));
    expect(upgradeCost(spec, 3)).toBeGreaterThan(upgradeCost(spec, 2));
  });

  it('throughput her seviyede aynı oranda büyür ve ₺ tavanının üstünde artmaz', () => {
    expect(upgradeOutputMultiplier(spec, 0)).toBe(1);
    const m = spec.maxLevel;
    // Her seviye SABİT oran (outputMult) — sıçrama yok; tavana kadar.
    for (let l = 1; l <= m; l++) {
      const jump = upgradeOutputMultiplier(spec, l) / upgradeOutputMultiplier(spec, l - 1);
      expect(jump).toBeCloseTo(spec.outputMult, 10);
    }
    // Tavanın üstü kırpılır: 💎 "Usta" katmanı Faz D'de gelene kadar seviye artışı ETKİSİZ.
    expect(upgradeOutputMultiplier(spec, m + 1)).toBe(upgradeOutputMultiplier(spec, m));
  });
});

describe('sayı biçimlendirme', () => {
  it('eşikleri doğru biçimler', () => {
    // K2 (T9d · D-146): küsurat yok · < 1 Mn tam + yerel binlik · ≥ 1 Mn yerel kısaltma, tek ondalık.
    expect(fmt(D(150))).toBe('150');
    expect(fmt(D(1500))).toBe('1.500');
    expect(fmt(D(6042.9))).toBe('6.042');
    expect(fmt(D(999_999.9))).toBe('999.999');
    expect(fmt(D(1_000_000))).toBe('1 Mn');
    expect(fmt(D(1_299_999))).toBe('1,2 Mn');
    expect(fmt(D(999_990_000))).toBe('999,9 Mn');
    expect(fmt(D(2.5e9))).toBe('2,5 Mr');
    expect(fmt(D(-1500))).toBe('-1.500');
    expect(fmt(6042, 'en')).toBe('6,042');
    expect(fmt(1_250_000, 'en')).toBe('1.2M');
  });
});

describe('servis döngüsü (D-011 / Faz 2c)', () => {
  // Oyuncuyu kimseyi servis edemeyeceği, pad doldurmayacağı uzak bir köşeye park eder.
  function parkPlayerAway() {
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
  }

  it('ocak hazır-kuyruğa demler; kapasiteyi (ocak seviyesine bağlı) AŞMAZ', () => {
    useGame.getState().hardReset();
    parkPlayerAway();
    // Uzun süre: hiç servis yok → kuyruk dolar ama kapasitede durur.
    for (let i = 0; i < 1200; i++) useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.ready.tea).toBeGreaterThan(0);
    expect(s.ready.tea).toBeLessThanOrEqual(brewQueueCapacity(s.stationLevels[0]));
  });

  it('servis EDİLMEYEN müşteri sabır aşımında SESSİZCE gider (ödeme yok)', () => {
    useGame.getState().hardReset();
    parkPlayerAway();
    // Sabır + döngü süresinden uzun simüle et; oyuncu servis etmiyor.
    for (let i = 0; i < 600; i++) useGame.getState().tick(0.1);
    const s = useGame.getState();
    // Müşteriler gelip gidiyor ama hiç ödeme olmadı.
    expect(s.lifetime.toNumber()).toBe(0);
    expect(s.coins.length).toBe(0);
  });

  it('ocaktan tepsiye al → bekleyen masaya bırak → müşteri içer, öder, para toplanır', () => {
    useGame.getState().hardReset();
    parkPlayerAway();
    // Bir müşteri otursun + çay demlensin.
    for (let i = 0; i < 200; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().ready.tea).toBeGreaterThan(0);
    const waiting = useGame.getState().npcs.find((n) => n.state === 'waitingForTea');
    expect(waiting).toBeTruthy();

    // 1) Ocağa git → tepsi dolar.
    const st = SP().station;
    stand(st);
    useGame.getState().tick(0.1);
    const trayLoaded = useGame.getState().tray;
    expect(trayLoaded).toBeGreaterThan(0);
    expect(trayLoaded).toBeLessThanOrEqual(trayCapacity());

    // 2) Bekleyen müşterinin koltuğuna git → çay bırak.
    const seat = LAYOUT.tables[waiting!.tableIndex].seat;
    stand(seat);
    useGame.getState().tick(0.1);
    const served = useGame.getState().npcs.find((n) => n.id === waiting!.id);
    expect(served?.state).toBe('drinking'); // servis edildi
    expect(useGame.getState().tray).toBe(trayLoaded - 1); // tepsiden bir çay gitti

    // 3) İçme süresi sonunda öder; oyuncu koltukta olduğundan parayı toplar → lifetime artar.
    for (let i = 0; i < 80; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().lifetime.toNumber()).toBeGreaterThan(0);
  });
});

describe('çay istasyonu yükseltme (Faz 2a)', () => {
  it('₺ ile L1→L4 yükselir; sonra ₺ ile çıkamaz (L5 = Usta 💎)', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(1_000_000);
    expect(useGame.getState().stationLevels[0]).toBe(0);

    expect(useGame.getState().upgradeStation()).toBe(true);
    expect(useGame.getState().stationLevels[0]).toBe(1);

    for (let i = 0; i < 10; i++) useGame.getState().upgradeStation();
    expect(useGame.getState().stationLevels[0]).toBe(stationSoftMaxLevel());
    expect(useGame.getState().upgradeStation()).toBe(false); // L5 ₺ ile açılmaz
  });

  it('maliyet geometrik artar ve cüzdandan düşülür', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(1_000_000);
    const c1 = stationUpgradeCost(0);
    const c2 = stationUpgradeCost(1);
    expect(c2).toBeGreaterThan(c1);
    const before = useGame.getState().wallet.toNumber();
    useGame.getState().upgradeStation();
    expect(useGame.getState().wallet.toNumber()).toBeCloseTo(before - c1, 5);
  });

  it('para yetmezse yükseltmez', () => {
    useGame.getState().hardReset();
    expect(useGame.getState().upgradeStation()).toBe(false);
    expect(useGame.getState().stationLevels[0]).toBe(0);
  });
});

describe('generic pad sistemi + gating (quest hattı omurgası, 2026-06-09)', () => {
  it("pad'ler quest hattı sırasıyla açılır ve etkileri uygulanır (personel ZORUNLU halka)", () => {
    useGame.getState().hardReset();
    expect(useGame.getState().tables).toBe(1);
    // table2 minLifetime:20 ile kilitli — lifetime 0 iken aktif pad yok.
    expect(currentPad(gate())).toBeNull();
    useGame.getState().addMoney(50); // lifetime ≥ 20 → table2 açılır
    expect(currentPad(gate())?.id).toBe('table2');

    // Omurga sırası (B2): table2 → table3 → waiter → table4 → zone2 (quests[] ile birebir).
    // Bulaşıkçı artık Bölüm 1'de DEĞİL: plan §4'ün 14. adımı, yani 2. Alan'ın içinde.
    expect(completePad('table2')).toBe(true);
    expect(useGame.getState().tables).toBe(2);

    expect(currentPad(gate())?.id).toBe('table3');
    expect(completePad('table3')).toBe(true);
    expect(useGame.getState().tables).toBe(3);

    // Personel artık OPSİYONEL DEĞİL: garson omurganın 3. halkası (D-014 kararı güncellendi).
    expect(currentPad(gate())?.id).toBe('waiter');
    expect(completePad('waiter')).toBe(true);
    expect(useGame.getState().waiters.length).toBe(1);
    // Bölüm 1'de bulaşıkçı YOK — otomasyonun ilk halkası garson, ikincisi 2. Alan'da gelir.
    expect(useGame.getState().dishwasher).toBeNull();

    expect(currentPad(gate())?.id).toBe('table4');
    expect(completePad('table4')).toBe(true);
    expect(useGame.getState().tables).toBe(4);
    expect(useGame.getState().stations).toBe(1);

    expect(useGame.getState().padsDone.length).toBe(4);
    // D-142 (G-73): Salon 1'in son halkası 2. GARSON; ardından ZONE-2 açılışı (Faz 3a).
    expect(currentPad(gate())?.id).toBe('waiter2');
    expect(completePad('waiter2')).toBe(true);
    expect(useGame.getState().waiters.length).toBe(2);
    expect(currentPad(gate())?.id).toBe('zone2');
  });

  it('EKRANDA TEK PAD: pad-dışı görev sırasında hiç pad görünmez; pad görevinde YALNIZ o pad', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(50); // lifetime ≥ 20 (gating hazır)
    // Görev 0 (ocaktan çay al) pad görevi DEĞİL → tek pad bile görünmez (currentPad olsa da).
    useGame.setState({ questIndex: 0, questBase: 0 });
    expect(currentPad(gate())?.id).toBe('table2'); // gating açık ama...
    expect(visiblePads(0, gate())).toEqual([]); // ...quest pad görevi değil → görünmez
    // table2 görevi aktifken yalnız table2 görünür.
    const qi = questIndexFor('table2');
    expect(visiblePads(qi, gate()).map((p) => p.id)).toEqual(['table2']);
    // Görev hattı bittiğinde güvenlik ağı: klasik omurga (kalan pad yoksa boş).
    expect(visiblePads(economyConfig.quests.length, gate()).map((p) => p.id)).toEqual(['table2']);
  });
});

describe('garson — quest hattında zorunlu personel (2026-06-09; eski D-014 opsiyonel kararı güncellendi)', () => {
  it('garson tutulunca hasWaiter=true olur ve garson varlığı kurulur', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(50);
    expect(completePad('table2')).toBe(true);
    expect(useGame.getState().waiters.length).toBe(0); // havuz boş
    expect(completePad('table3')).toBe(true);
    expect(completePad('waiter')).toBe(true);
    expect(useGame.getState().waiters.length).toBe(1); // havuza bir garson girdi
    // Tamamlanan pad bir daha görünür listede olmamalı.
    expect(visiblePads(useGame.getState().questIndex, gate()).map((p) => p.id)).not.toContain('waiter');
  });

  it('garson en ACİL (sabrı en az) bekleyene gider — yakın ama sabrı bol masa atlanır (anti-starvation)', () => {
    useGame.getState().hardReset();
    const nearIdx = 0;
    const farIdx = 3;
    const nearSeat = LAYOUT.tables[nearIdx].seat;
    const farSeat = LAYOUT.tables[farIdx].seat;
    const dist = (a: number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[2] - b[2]);
    // Garsonu YAKIN masanın koltuğuna (mesafe ~0) tepsi dolu koy. İki bekleyen:
    //  - 901: yakın AMA sabrı bol (timer 17)   - 902: uzak AMA acil (timer 2)
    // "En yakın" politikasıyla 901 anında servis edilirdi; "en acil" ile garson 902'ye yönelmeli.
    useGame.setState({
      padsDone: ['table2', 'table3', 'table4', 'waiter'],
      waiters: [{ pos: [nearSeat[0], 0.6, nearSeat[2]] as [number, number, number], tray: 1, trayFood: 0 }],
      player: PARK,
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      npcs: [
        { id: 901, state: 'waitingForTea', pos: [...nearSeat] as [number, number, number], tableIndex: nearIdx, seatIndex: 0, timer: 17, product: 'tea', color: '#27ae60' },
        { id: 902, state: 'waitingForTea', pos: [...farSeat] as [number, number, number], tableIndex: farIdx, seatIndex: 0, timer: 2, product: 'tea', color: '#c0392b' },
      ],
      spawnTimer: 999, // bu testte yeni müşteri spawn olmasın
    });
    const startFarDist = dist([nearSeat[0], 0.6, nearSeat[2]], farSeat);
    useGame.getState().tick(0.1);
    const s = useGame.getState();
    const near = s.npcs.find((n) => n.id === 901);
    // Yakın ama sabrı bol masa SERVİS EDİLMEDİ (nearest-first olsaydı anında 'drinking' olurdu).
    expect(near?.state).toBe('waitingForTea');
    expect(s.waiters[0]?.tray).toBe(1); // henüz teslim yok (uzak masaya yürüyor)
    // Garson acil (uzak) masaya YÖNELDİ → ona yaklaştı.
    expect(dist(s.waiters[0]!.pos, farSeat)).toBeLessThan(startFarDist);
  });

  it('garson bekleyen müşteriye çay servis eder (oyuncu uzakta → kısmi assist)', () => {
    useGame.getState().hardReset();
    // D-015: hasWaiter padsDone'dan türetilir → garsonu padsDone üzerinden kur (sahte set işe yaramaz).
    // Oyuncuyu kimseyi servis edemeyeceği köşeye park et.
    useGame.setState({
      padsDone: ['table2', 'waiter'],
      waiters: [{ pos: [...SP().waiterHome] as [number, number, number], tray: 0, trayFood: 0 }],
      player: PARK,
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
    });
    // Oyuncu servis etmeden: yalnız garson sayesinde müşteri içip ödesin (yere para düşer).
    for (let i = 0; i < 900; i++) useGame.getState().tick(0.1);
    const s = useGame.getState();
    // Garson en az bir müşteriye servis etti → ödeme parası yere düştü (oyuncu uzakta, toplamadı).
    expect(s.coins.length).toBeGreaterThan(0);
  });

  it('garson hızı kademeyle artar (v29 panel); aşırı kademe son değere kelepçelenir', () => {
    expect(waiterSpeedFor(1)).toBeGreaterThan(waiterSpeedFor(0));
    expect(waiterSpeedFor(0)).toBe(economyConfig.waiter.speedUpgrades.speeds[0]);
    expect(waiterSpeedFor(99)).toBe(waiterSpeedFor(waiterSpeedMaxTier())); // clamp
  });

  it('buyWaiterSpeed (v29): cüzdan yetersizken false; yeterliyse kademe +1 ve ₺ düşer; max\'ta false', () => {
    useGame.getState().hardReset();
    const cost = waiterSpeedNextCost(0)!;
    expect(useGame.getState().buyWaiterSpeed()).toBe(false); // ₺ 0 → alınamaz
    useGame.getState().addMoney(cost + 50);
    expect(useGame.getState().buyWaiterSpeed()).toBe(true);
    const s = useGame.getState();
    expect(s.waiterUpgrades.speed).toBe(1);
    expect(s.wallet.toNumber()).toBeCloseTo(50, 5);
    // Tavanda satın alma reddedilir (tek kademe: 1.5→2.0).
    useGame.getState().addMoney(99_999);
    expect(useGame.getState().buyWaiterSpeed()).toBe(waiterSpeedNextCost(1) != null);
  });

  it('waiterUpgrades.speed kayıt round-trip\'inde korunur (saveNow→init persist)', () => {
    // node test ortamında localStorage yok → geçici mock ile gerçek persistence'ı doğrula.
    const mem: Record<string, string> = {};
    const g = globalThis as Record<string, unknown>;
    const orig = g.localStorage;
    g.localStorage = {
      getItem: (k: string) => (k in mem ? mem[k] : null),
      setItem: (k: string, v: string) => { mem[k] = v; },
      removeItem: (k: string) => { delete mem[k]; },
    };
    try {
      useGame.getState().hardReset();
      useGame.setState({
        padsDone: ['table2', 'waiter'],
        waiterUpgrades: { ...defaultWaiterUpgrades(), speed: 1 },
      });
      useGame.getState().saveNow();
      useGame.getState().init();
      expect(useGame.getState().waiterUpgrades.speed).toBe(1);
    } finally {
      g.localStorage = orig;
    }
  });
});

describe('park noktası (Faz A3) — testlerin "uzağa park et" niyeti YERLEŞİMDEN türetilir', () => {
  it('park noktası her mekanizmanın tetikleme yarıçapının DIŞINDA (yerleşim daralırsa bu test düşer)', () => {
    const clear = parkClearance(1, 4);
    // Tetikleme yarıçapları: servis, pad dolumu, masa yükseltme noktası, para mıknatısı.
    // H1/O3: çay ALMA artık yarıçap değil gövde payı → park noktası doğrudan tetikle sınanır.
    for (const areasOpen of [1, 2, 3]) {
      const sp = servicePlace(areasOpen);
      const pp = parkSpot(areasOpen, 4);
      expect(
        atServiceBody(pp[0], pp[2], sp, economyConfig.serving.pickupReach),
        `park noktası ${areasOpen} alanda tezgâhın gövde tetiğinde olmamalı`,
      ).toBe(false);
    }
    // K5 (D-147): masaya servis de gövde payı → park noktası hiçbir masanın servis tetiğinde değil.
    for (let i = 0; i < 4; i++) {
      const pp = parkSpot(1, 4);
      expect(atTableBody(pp[0], pp[2], i, economyConfig.cups.collectReach), `park noktası masa ${i} servisinde`).toBe(false);
    }
    expect(clear).toBeGreaterThan(PAD_RADIUS);
    expect(clear).toBeGreaterThan(attractRadiusFor(0));
    // Nokta oynanabilir alanın içinde ve mobilyaya girmiyor (oyuncu kelepçesi onu kaydırmamalı).
    const p = parkSpot(1, 4);
    expect(p[0]).toBeGreaterThan(LAYOUT.areaBounds[0].minX);
    expect(p[0]).toBeLessThan(LAYOUT.areaBounds[0].maxX);
    useGame.getState().hardReset();
    park();
    useGame.getState().tick(0.1);
    const moved = useGame.getState().player;
    expect(Math.hypot(moved[0] - p[0], moved[2] - p[2])).toBeLessThan(0.01);
  });

  it('park edilen oyuncu HİÇBİR mekanizmayı tetiklemez (para/servis/pad/yükseltme durur)', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(5000);
    park();
    const before = useGame.getState();
    const w0 = before.wallet.toNumber();
    const tray0 = before.tray;
    for (let i = 0; i < 30; i++) useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.tray).toBe(tray0); // ocaktan çay ALMADI
    expect(s.padsDone).toEqual(before.padsDone); // pad DOLMADI
    expect(s.stationLevels[0]).toBe(before.stationLevels[0]); // yükseltme noktası ÇEKMEDİ
    expect(s.wallet.toNumber()).toBeLessThanOrEqual(w0 + 0.001 + 3 * 5); // yalnız görev ödülü olabilir
    expect(s.stats.teasServed).toBe(before.stats.teasServed); // servis YOK
  });
});

describe('görev geçişi — kutlama penceresi yarışı (smoke 7 kırık adımın kök nedeni)', () => {
  const qIdx = (id: string) => economyConfig.quests.findIndex((q) => q.id === id);

  it('görev BİTİŞ ANINDA ilerler: kutlama sürerken questIndex + taban zaten yeni görevin', () => {
    useGame.getState().hardReset();
    useGame.setState({
      questIndex: qIdx('q_serve1'), questBase: 0, questPhase: 'active', questPhaseT: 0,
      player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      stats: { ...useGame.getState().stats, teasServed: 1 },
    });
    useGame.getState().tick(0.1);
    // Kart hâlâ biten görevi gösterir (%100 + onay), ama motor çoktan q_coin'e geçti.
    expect(useGame.getState().questPhase).not.toBe('active');
    expect(useGame.getState().quest?.id).toBe('q_serve1');
    expect(useGame.getState().quest?.done).toBe(true);
    expect(useGame.getState().questIndex).toBe(qIdx('q_coin'));
    expect(useGame.getState().questBase).toBe(0); // q_coin tabanı = o andaki coinsCollected
  });

  it("kutlama penceresinde toplanan para SAYILIR (görev 0/1'de kilitlenmez)", () => {
    useGame.getState().hardReset();
    useGame.setState({
      questIndex: qIdx('q_serve1'), questBase: 0, questPhase: 'active', questPhaseT: 0,
      player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      stats: { ...useGame.getState().stats, teasServed: 1 },
    });
    useGame.getState().tick(0.1); // q_serve1 biter → kutlama başlar, q_coin aktif taban 0
    // Oyuncu kutlama animasyonu sürerken yerdeki parayı topluyor (doğal akış: servis → ödeme → topla).
    useGame.setState({ stats: { ...useGame.getState().stats, coinsCollected: 1 } });
    flushQuestTransition();
    // Eski davranışta taban 1 olurdu → q_coin 0/1'de takılır, sonrası domino kırılırdı.
    flushQuestTransition();
    expect(useGame.getState().questIndex).toBe(qIdx('q_table2'));
  });

  it('kutlama ortasında yeniden yükleme kilitlemez: kayda ilerlemiş görev yazılır', () => {
    const mem: Record<string, string> = {};
    const g = globalThis as Record<string, unknown>;
    const orig = g.localStorage;
    g.localStorage = {
      getItem: (k: string) => (k in mem ? mem[k] : null),
      setItem: (k: string, v: string) => { mem[k] = v; },
      removeItem: (k: string) => { delete mem[k]; },
    };
    try {
      useGame.getState().hardReset();
      useGame.setState({
        questIndex: qIdx('q_serve1'), questBase: 0, questPhase: 'active', questPhaseT: 0,
        player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0],
        stats: { ...useGame.getState().stats, teasServed: 1 },
      });
      useGame.getState().tick(0.1); // kutlama başladı
      useGame.getState().saveNow();
      useGame.getState().init(); // kutlama ortasında uygulama kapanıp açıldı
      expect(useGame.getState().questIndex).toBe(qIdx('q_coin'));
      expect(useGame.getState().questPhase).toBe('active');
      expect(useGame.getState().quest?.id).toBe('q_coin');
    } finally {
      if (orig === undefined) delete g.localStorage; else g.localStorage = orig;
    }
  });
});

describe('yeni-özellik bildirimi (D-019 §4)', () => {
  it('yeni oyunda revealSeen boş; özellik açılınca anahtar TÜKETİLİR (toast kapsamı ayrı testte)', () => {
    useGame.getState().hardReset();
    expect(useGame.getState().revealSeen).toEqual([]);
    // Spotlight görülmüş olsun (turu-5 m.8: spotlight beklerken reveal panı bastırılır — alttaki test).
    useGame.setState({ charPanelSeen: true });
    // 2. masa aç → çay ocağı yükseltme açılır (ikincil özellik).
    useGame.getState().addMoney(50);
    expect(completePad('table2')).toBe(true);
    // G-60 (2026-09-18): reveal artık KUTLAMA PENCERESİNDE hiç işlenmez — kullanıcı *"uyarı
    // geldiği anda altta biten görev de var"* dedi. Reveal SİLİNMEZ, TÜKETİLMEZ de; bekler.
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    expect(useGame.getState().questPhase, 'kurulum gerçekten pencere içinde başlamalı').not.toBe('active');
    // Pencere İÇİNDE bir tick at: `upgrade:0` bu tick'te zaten açık (table2 bitti) ama işlenmemeli.
    useGame.getState().tick(0.1);
    expect(useGame.getState().questPhase, 'tek tick pencereyi kapatmamalı').not.toBe('active');
    expect(useGame.getState().revealSeen, 'pencerede reveal TÜKETİLMEZ (ertelenir)').toEqual([]);
    // Pencere kapanınca aynı döngüden normal sırasıyla geçer.
    flushQuestTransition();
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    useGame.getState().tick(0.1);
    // D-142 (G-61): ocak noktası yalnız OCAK görevinde canlı — aktif görev tepsi, anahtar doğmaz.
    expect(useGame.getState().revealSeen).not.toContain('upgrade:0');
    useGame.setState({ questIndex: economyConfig.quests.findIndex((q) => q.id === 'q_station1') });
    useGame.getState().tick(0.1);
    expect(useGame.getState().revealSeen).toContain('upgrade:0'); // v21: anahtarlar zone-başına
  });

  /**
   * DÜZELTME NOTU (2026-09-18, G-60 turu): bu testin eski hâli adında *"toast + kamera pan
   * tetiklenir"* diyor ve `notice`/`camFocus` üstünde iddia taşıyordu — ama **ikisi de reveal'ın
   * eseri değildi.** `upgrade:0`, ileride gelen `q_station1` tarafından KAPSANIYOR (bir alttaki
   * test tam bunu söylüyor), yani sessizce tüketiliyor: toast biten görevin `kind:'quest'`
   * toast'ıydı, `camFocus` da pad tamamlanırken kurulmuş bayat bir odaktı. Yani test yeşildi ama
   * adındaki şeyi ölçmüyordu. İddia buraya, GERÇEKTEN kapsanmayan bir kuruluma taşındı.
   */
  it('KAPSANMAYAN bir reveal gerçekten toast + kamera panı üretir (yukarıdaki testin kör noktası)', () => {
    useGame.getState().hardReset();
    // Görev hattı bitmiş → hiçbir görev reveal'ı kapsamıyor; tek fark bu.
    useGame.setState({
      charPanelSeen: true,
      padsDone: ['table2'],
      revealSeen: [],
      questIndex: economyConfig.quests.length,
      questPhase: 'active',
      questPhaseT: 0,
      camFocus: null,
      player: PARK,
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
    });
    useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.revealSeen).toContain('upgrade:0');
    expect(s.notice?.kind, 'bu kez toast REVEAL olmalı, görev toastı değil').toBe('reveal');
    // Yeni açılan noktaya kamera pan istendi (kullanıcı 2026-06-09: "orada bir şey var" hissi).
    expect(s.camFocus, 'reveal kendi panını istemeli').not.toBeNull();
  });

  it('⑤⑥ fix: ocak yükselt reveal\'ı bir görev (q_station2) tarafından kapsanır → toast/pan YOK (tek talimat = görev kartı)', () => {
    useGame.getState().hardReset();
    expect(useGame.getState().charPanelSeen).toBe(false);
    // q_table2 pad'ini bitir → bitiş ritmi akınca görev q_charTray1'e (charStat) ilerler.
    useGame.getState().addMoney(50);
    expect(completePad('table2')).toBe(true);
    flushQuestTransition();
    expect(useGame.getState().quest?.id).toBe('q_charTray1');
    // upgrade:0 reveal'ı q_station2 (ileride "Çay ocağını yükselt" görevi) tarafından kapsanır →
    // SESSİZCE tüketilir (revealSeen'e girer) ama toast/pan ÜRETMEZ; "yükseltebilirsin" yazısı görev sanılmaz.
    useGame.setState({
      player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      notice: null, noticeQueue: [], camFocus: null,
      // D-142: nokta (ve reveal anahtarı) ancak ocak görevi aktifken doğar.
      questIndex: economyConfig.quests.findIndex((q) => q.id === 'q_station1'),
    });
    useGame.getState().tick(0.1);
    expect(useGame.getState().revealSeen).toContain('upgrade:0'); // tüketildi (görünmeden)
    expect(useGame.getState().notice).toBeNull(); // toast YOK
    expect(useGame.getState().camFocus).toBeNull(); // pan YOK
  });

  it('yeniden yüklemede ZATEN açık özellikler tekrar bildirilmez (baseline; spam yok)', () => {
    const mem: Record<string, string> = {};
    const g = globalThis as Record<string, unknown>;
    const orig = g.localStorage;
    g.localStorage = {
      getItem: (k: string) => (k in mem ? mem[k] : null),
      setItem: (k: string, v: string) => { mem[k] = v; },
      removeItem: (k: string) => { delete mem[k]; },
    };
    try {
      useGame.getState().hardReset();
      // table2 açık + ocak L1 → çay yükseltme zaten açık bir kayıt.
      useGame.setState({ padsDone: ['table2'], stationLevels: [1, 0] });
      useGame.getState().saveNow();
      useGame.getState().init();
      const s = useGame.getState();
      // Baseline açık özellikleri içerir → ilk açılışta toast YOK.
      expect(s.revealSeen).toContain('upgrade:0');
      expect(s.notice).toBeNull();
      // Park + tick → zaten açık olanlar yeniden bildirilmez.
      useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
      useGame.getState().tick(0.1);
      expect(useGame.getState().notice).toBeNull();
    } finally {
      g.localStorage = orig;
    }
  });
});

/**
 * H1/M3 SONRASI FİKSTÜR: kirli kap tetiği kabın noktasından değil MASANIN gövdesinden ölçülüyor.
 * Bu yüzden bu bölümdeki denetimler oyuncuyu artık "kabın üstüne" değil MASANIN YANINA koyar —
 * kabın masada durduğu, oyuncunun da masaya yanaştığı gerçek durum. (Eski fikstür oyuncuyu
 * salonun ortasındaki [1, 1] noktasına koyuyor ve kaba `tableIndex: 0` etiketi veriyordu:
 * ikisi birbirini tutmuyordu, eski nokta-tetiği bunu görmediği için sorun çıkmamıştı.)
 */
function masaBasi(tableIndex = 0): {
  masa: readonly [number, number, number];
  kap: [number, number, number];
  oyuncu: [number, number, number];
} {
  const t = LAYOUT.tables[tableIndex].table;
  const h = tableHalfFor(tableIndex);
  return {
    masa: t as readonly [number, number, number],
    kap: [t[0], 0.95, t[2]],
    // Masanın +z yüzüne gövdesiyle yanaşmış oyuncu (collision standoff kadar).
    oyuncu: [t[0], 0.6, t[2] + h[1] + LAYOUT.playerRadius + 0.02],
  };
}

describe('bardak döngüsü (Faz 2e) — demleme temiz harcar, içen kirli bırakır, topla+yıka', () => {
  // Sistemdeki TÜM bardakları say (korunum değişmezi: toplam = havuz kapasitesi).
  function totalCups() {
    const s = useGame.getState();
    const drinking = s.npcs.filter((n) => n.state === 'drinking').length;
    return (
      s.cleanCups + s.ready.tea + s.tray + s.carriedDirty + s.dishes.length + drinking +
      (s.waiters[0]?.tray ?? 0) + (s.dishwasher?.tray ?? 0) + s.legen.bardak + s.legen.tabak
    );
  }

  it('başlangıçta temiz havuz dolu; demleme temiz harcar (toplam bardak KORUNUR)', () => {
    useGame.getState().hardReset();
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    const pool = cupPoolCapacity(0);
    expect(useGame.getState().cleanCups).toBe(pool);
    // Servis yok → ocak hazır-kuyruğu temizden demler; clean azalır, ready artar, TOPLAM sabit.
    for (let i = 0; i < 300; i++) useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.ready.tea).toBeGreaterThan(0);
    expect(s.cleanCups).toBeLessThan(pool);
    expect(totalCups()).toBe(pool); // korunum
  });

  it('temiz bardak biterse demleme DURUR (yeni darboğaz)', () => {
    useGame.getState().hardReset();
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0], cleanCups: 0, ready: { tea: 0, tost: 0 }, brewProgress: { tea: 0, tost: 0 } });
    for (let i = 0; i < 200; i++) useGame.getState().tick(0.1);
    // Temiz yokken hiç çay demlenemez.
    expect(useGame.getState().ready.tea).toBe(0);
  });

  it('içen müşteri masada KİRLİ bardak bırakır; oyuncu toplar → bulaşıkta yıkar → temize döner', () => {
    useGame.getState().hardReset();
    // Onboarding gate (2026-06-10): kirli bardak ancak q_wash göreviyle çıkmaya başlar.
    const washIdx = economyConfig.quests.findIndex((q) => q.target.type === 'washDish');
    useGame.setState({ questIndex: washIdx, questBase: 0 });
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    const pool = cupPoolCapacity(0);
    // Müşteri otursun + çay demlensin.
    for (let i = 0; i < 200; i++) useGame.getState().tick(0.1);
    const waiting = useGame.getState().npcs.find((n) => n.state === 'waitingForTea');
    expect(waiting).toBeTruthy();

    // Ocaktan tepsiye al → bekleyen masaya götür → servis.
    const st = SP().station;
    stand(st);
    useGame.getState().tick(0.1);
    const seat = LAYOUT.tables[waiting!.tableIndex].seat;
    stand(seat);
    useGame.getState().tick(0.1);
    expect(useGame.getState().npcs.find((n) => n.id === waiting!.id)?.state).toBe('drinking');

    // İçme bitince masada kirli bardak belirir (oyuncuyu uzağa park et ki otomatik toplamasın).
    useGame.setState({ player: PARK });
    const before = useGame.getState().dishes.length;
    for (let i = 0; i < 80; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().dishes.length).toBeGreaterThan(before);
    expect(totalCups()).toBe(pool); // korunum hâlâ geçerli

    // Kirli bardağa git → topla (carriedDirty artar, dishes azalır).
    const dish = useGame.getState().dishes[0];
    stand(dish.pos);
    const dishesBefore = useGame.getState().dishes.length;
    useGame.getState().tick(0.1);
    expect(useGame.getState().carriedDirty).toBeGreaterThan(0);
    expect(useGame.getState().dishes.length).toBe(dishesBefore - 1);

    // Bulaşığa git → yıka (carriedDirty 0, cleanCups artar).
    const cleanBefore = useGame.getState().cleanCups;
    const carried = useGame.getState().carriedDirty;
    const ds = SP().dish;
    stand(ds);
    useGame.getState().tick(0.1);
    expect(useGame.getState().carriedDirty).toBe(0);
    // D-143: kirli önce LEĞENDE birikir, toplu yıkamada temize döner.
    expect(useGame.getState().legen.bardak).toBe(carried);
    expect(useGame.getState().cleanCups).toBe(cleanBefore);
    expect(totalCups()).toBe(pool);
    useGame.setState({ legen: { ...useGame.getState().legen, t: economyConfig.cups.washBatchSec } });
    useGame.getState().tick(0.1);
    expect(useGame.getState().legen.bardak).toBe(0);
    expect(useGame.getState().cleanCups).toBeGreaterThanOrEqual(cleanBefore + carried - 1); // aynı karede demleme 1 harcayabilir
    expect(totalCups()).toBe(pool);
  });

  it('ocak seviyesi artınca temiz havuz büyür (cupPoolCapacity)', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(1_000_000);
    const before = useGame.getState().cleanCups;
    expect(useGame.getState().upgradeStation()).toBe(true);
    expect(useGame.getState().cleanCups).toBe(before + economyConfig.cups.poolPerLevel);
    expect(cupPoolCapacity(1)).toBe(cupPoolCapacity(0) + economyConfig.cups.poolPerLevel);
  });

  // PAYLAŞIMLI kapasite (2026-06-09): çay + kirli aynı tepsiyi paylaşır; karışık taşıma serbest, deadlock yok.
  it('kirli taşırken ocaktan temiz çay ALINIR (karışık taşıma; toplam trayCap sınırı)', () => {
    useGame.getState().hardReset();
    const st = SP().station;
    // Elinde kirli varken ocağa gidince temizi de alabilmeli (toplam trayCap'i aşmadan).
    useGame.setState({
      player: [st[0], 0.6, st[2]], inputKeyboard: [0, 0], inputJoystick: [0, 0],
      ready: { tea: 3, tost: 0 }, carriedDirty: 1, tray: 0,
    });
    useGame.getState().tick(0.1);
    expect(useGame.getState().tray).toBeGreaterThan(0); // kirli elindeyken de temiz alındı
    expect(useGame.getState().tray + useGame.getState().carriedDirty).toBeLessThanOrEqual(trayCapacity());
  });

  it('temiz çay taşırken masadaki kirli TOPLANIR (karışık taşıma; simetrik)', () => {
    useGame.getState().hardReset();
    // Bir masaya kirli bardak koy, oyuncuyu üstüne park et, elinde temiz çay olsun → kirliyi de alabilmeli.
    const { kap, oyuncu } = masaBasi(0);
    useGame.setState({
      player: oyuncu, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      tray: 1, carriedDirty: 0,
      dishes: [{ id: 9001, pos: kap, tableIndex: 0 }],
    });
    useGame.getState().tick(0.1);
    expect(useGame.getState().carriedDirty).toBe(1); // temiz elindeyken kirli toplandı
    expect(useGame.getState().dishes.length).toBe(0);
  });

  it('turu-5 m.9: oyuncu NPC\'nin İÇİNDEN geçer (aktör çarpışması kaldırıldı)', () => {
    useGame.getState().hardReset();
    // NPC tam oyuncunun yolunda otursun (waitingForTea hareketsiz; sabır yüksek → kalkmaz).
    const START = LAYOUT.player; // oyuncunun doğduğu nokta: tanım gereği yürünebilir
    useGame.setState({
      player: [START[0], 0.6, START[2]],
      inputKeyboard: [0, -1], inputJoystick: [0, 0],
      spawnTimer: 999,
      // NPC oyuncunun 0.8 ÖNÜNDE (yerleşimden bağımsız: oyuncuya göre konumlanır).
      npcs: [{ id: 7001, state: 'waitingForTea', pos: [START[0], 0.6, START[2] - 0.8], tableIndex: 0, seatIndex: 0, timer: 999, product: 'tea', color: '#fff' }],
    });
    for (let i = 0; i < 20; i++) useGame.getState().tick(0.1);
    // Eski aktör-engeli oyuncuyu NPC'nin önünde durdururdu; artık içinden geçip ilerler.
    expect(useGame.getState().player[2]).toBeLessThan(START[2] - 1.1);
  });

  it('turu-5 m.11: kirli TABAK ayrı sayılır (carriedDirtyFood) + yıkamada bardakla ortak havuza döner', () => {
    useGame.getState().hardReset();
    const { kap, oyuncu } = masaBasi(0);
    // Aynı masada bir tabak (tost bulaşığı) + bir bardak: tür doğru bölmeye gitmeli.
    useGame.setState({
      player: oyuncu, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      tray: 0, carriedDirty: 0, carriedDirtyFood: 0,
      dishes: [
        { id: 9301, pos: kap, tableIndex: 0, kind: 'plate' },
        { id: 9302, pos: kap, tableIndex: 0, kind: 'cup' },
      ],
    });
    useGame.getState().tick(0.1);
    expect(useGame.getState().carriedDirtyFood).toBe(1); // tabak tabağa
    expect(useGame.getState().carriedDirty).toBe(1); // bardak bardağa
    expect(useGame.getState().dishes.length).toBe(0);
    // Bulaşık noktasına git → ikisi de yıkanır, GLOBAL temiz havuza döner.
    const ds = SP().dish;
    const cleanBefore = useGame.getState().cleanCups;
    stand(ds);
    useGame.getState().tick(0.1);
    expect(useGame.getState().carriedDirty).toBe(0);
    expect(useGame.getState().carriedDirtyFood).toBe(0);
    // D-143: tür leğende de korunur, toplu yıkamada ikisi de ORTAK havuza döner.
    expect(useGame.getState().legen).toMatchObject({ bardak: 1, tabak: 1 });
    useGame.setState({ legen: { ...useGame.getState().legen, t: economyConfig.cups.washBatchSec } });
    useGame.getState().tick(0.1);
    expect(useGame.getState().legen).toMatchObject({ bardak: 0, tabak: 0 });
    expect(useGame.getState().cleanCups).toBeGreaterThanOrEqual(cleanBefore + 2 - 1);
  });

  it('DEADLOCK YOK: elinde çay + tüm masalar kirli → kirli toplanıp temizlenebilir', () => {
    useGame.getState().hardReset();
    // Elinde 1 çay; bir masada eşik üstü kirli (masa kilitli, bekleyen yok) → eskiden kilitlenirdi.
    const { kap, oyuncu } = masaBasi(0);
    const dishes = Array.from({ length: 3 }, (_, i) => ({ id: 9100 + i, pos: kap, tableIndex: 0 }));
    useGame.setState({
      player: oyuncu, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      tray: 1, carriedDirty: 0, dishes,
    });
    useGame.getState().tick(0.1);
    // Çay elindeyken kirli toplanabildi → kilit kırıldı.
    expect(useGame.getState().carriedDirty).toBeGreaterThan(0);
    expect(useGame.getState().tray + useGame.getState().carriedDirty).toBeLessThanOrEqual(trayCapacity());
  });
});

describe('kirli masa mekaniği (D-019) — eşik aşılınca masa kilitlenir', () => {
  const T = economyConfig.cups.dirtyThreshold;
  function dishOn(idx: number, id: number) {
    const t = LAYOUT.tables[idx].table;
    return { id, pos: [t[0], 0.95, t[2]] as [number, number, number], tableIndex: idx };
  }

  it('dirtyTables: eşik kadar kirli temiz sayılır, eşiği AŞINCA kirli olur', () => {
    // T kadar kirli (= eşik) → henüz kirli değil.
    const atThreshold = Array.from({ length: T }, (_, i) => dishOn(0, 1000 + i));
    expect(dirtyTables(atThreshold).has(0)).toBe(false);
    // T+1 kirli (eşiği aşar) → kirli.
    const overThreshold = Array.from({ length: T + 1 }, (_, i) => dishOn(0, 2000 + i));
    expect(dirtyTables(overThreshold).has(0)).toBe(true);
  });

  it('kirli masaya YENİ müşteri oturmaz (findFreeTable atlar); temizlenince yeniden açılır', () => {
    useGame.getState().hardReset();
    // 2 masa aç (table2) → masa 0 kirli olsun, masa 1 temiz.
    useGame.getState().addMoney(50);
    expect(completePad('table2')).toBe(true);
    const dirtyDishes = Array.from({ length: T + 1 }, (_, i) => dishOn(0, 3000 + i));
    useGame.setState({
      player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      npcs: [], dishes: dirtyDishes, spawnTimer: 0,
    });
    // Müşteriler gelir → yalnız temiz masaya (1) oturur, kirli masaya (0) ASLA.
    for (let i = 0; i < 200; i++) useGame.getState().tick(0.1);
    const seated = useGame.getState().npcs.filter((n) => n.state !== 'leaving' && n.state !== 'toTable');
    expect(seated.every((n) => n.tableIndex !== 0)).toBe(true);
    expect(useGame.getState().npcs.some((n) => n.tableIndex === 1)).toBe(true);

    // Kirliyi eşik altına indir → masa 0 yeniden boş sayılır.
    useGame.setState({ dishes: [dishOn(0, 9999)] });
    expect(dirtyTables(useGame.getState().dishes).has(0)).toBe(false);
  });

  it('garson kirli masaya çay GÖTÜRMEZ (teslimat hedefi sayılmaz)', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(50);
    expect(completePad('table2')).toBe(true);
    // Garson tepsisinde çay; masa 0 kirli + orada bekleyen müşteri var.
    const idx = 0;
    const seat = LAYOUT.tables[idx].seat;
    const dirtyDishes = Array.from({ length: T + 1 }, (_, i) => dishOn(idx, 4000 + i));
    useGame.setState({
      padsDone: ['table2', 'waiter'],
      waiters: [{ pos: [LAYOUT.tables[idx].table[0], 0.6, LAYOUT.tables[idx].table[2]] as [number, number, number], tray: 1, trayFood: 0 }],
      player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      npcs: [{ id: 880, state: 'waitingForTea', pos: [...seat] as [number, number, number], tableIndex: idx, seatIndex: 0, timer: 999, product: 'tea', color: '#27ae60' }],
      dishes: dirtyDishes, spawnTimer: 999,
    });
    // D-083'ten sonra bu kurulum artık SABİT DURMUYOR: servis edecek kimsesi kalmayan garson
    // masadaki kirlileri toplayıp yıkıyor, masa eşiğin altına inince de müşteriyi servis ediyor.
    // Kural değişmedi (kirli masaya servis YOK) ama "50 kare sonra hâlâ bekliyor" iddiası artık
    // kuralı değil, kurulumun kilitli kalmasını ölçüyordu. Kuralın KENDİSİ her karede denetlenir:
    // masa o an kirliyken servis OLAMAZ.
    let kirliKare = 0;
    for (let i = 0; i < 50; i++) {
      const kirliydi = dirtyTables(useGame.getState().dishes).has(idx);
      const trayOnce = useGame.getState().waiters[0]?.tray;
      useGame.getState().tick(0.1);
      if (kirliydi) {
        kirliKare += 1;
        expect(useGame.getState().npcs.find((n) => n.id === 880)?.state).toBe('waitingForTea');
        expect(useGame.getState().waiters[0]?.tray).toBe(trayOnce); // çay tepside kalır
      }
    }
    expect(kirliKare).toBeGreaterThan(0); // masa gerçekten bir süre kirliydi (boş denetim değil)
  });
});

describe('bulaşıkçı — omurga halkası (B2: Bölüm 2, plan §4 adım 14)', () => {
  it('bulaşıkçı 2. Alanın içinde gelir: Bölüm 1 boyunca omurgada YOK, sırası gelince görünür', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(50);
    expect(completePad('table2')).toBe(true);
    expect(completePad('table3')).toBe(true);
    expect(completePad('waiter')).toBe(true);
    // B2: Bölüm 1 dört adımda biter — bulaşıkçı DEĞİL, 4. masa gelir.
    expect(currentPad(gate())?.id).toBe('table4');
    expect(useGame.getState().dishwasher).toBeNull();
    // Bölüm 2'nin içine kadar ilerle: alan + iki masa → sıradaki halka bulaşıkçıdır.
    expect(completePad('table4')).toBe(true);
    expect(completePad('waiter2')).toBe(true); // D-142: Salon 1'in son halkası
    expect(completePad('zone2')).toBe(true);
    expect(completePad('z2table2')).toBe(true);
    expect(completePad('z2table3')).toBe(true);
    expect(currentPad(gate())?.id).toBe('dishwasher');
    // Pad YALNIZ kendi görevi aktifken görünür (ekranda tek pad).
    expect(visiblePads(questIndexFor('z2table4'), gate())).toEqual([]);
    expect(visiblePads(questIndexFor('dishwasher'), gate()).map((p) => p.id)).toEqual(['dishwasher']);
  });

  it('bulaşıkçı tutulunca hasDishwasher=true; kirlileri toplayıp yıkar (oyuncu uzakta → kısmi assist)', () => {
    useGame.getState().hardReset();
    // D-015: hasDishwasher padsDone'dan türetilir → padsDone üzerinden kur. NPC'siz izole sahne.
    const ds = SP().dish;
    useGame.setState({
      padsDone: ['table2', 'table3', 'zone2', 'dishwasher'],
      dishwasher: { pos: [...SP().dishwasherHome] as [number, number, number], tray: 0, trayFood: 0 },
      player: PARK, // oyuncu uzakta; yalnız bulaşıkçı çalışsın
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      npcs: [], // yeni müşteri/yeni kirli karışmasın
      // İki kirli bardak masalara serpiştir; temiz havuzu düşür ki yıkamanın etkisi görünsün.
      dishes: [
        { id: 9001, pos: [LAYOUT.tables[0].table[0], 0.95, LAYOUT.tables[0].table[2]] as [number, number, number], tableIndex: 0 },
        { id: 9002, pos: [LAYOUT.tables[1].table[0], 0.95, LAYOUT.tables[1].table[2]] as [number, number, number], tableIndex: 1 },
      ],
      cleanCups: 0,
      readyCups: 0,
      spawnTimer: 999, // yeni müşteri/yeni kirli olmasın
    });
    expect(useGame.getState().dishwasher).not.toBeNull();
    const dirtyBefore = useGame.getState().dishes.length;
    for (let i = 0; i < 600; i++) useGame.getState().tick(0.1);
    const s = useGame.getState();
    // Bulaşıkçı kirlileri toplayıp bulaşıkta yıkadı → kirli temizlendi, bardaklar sisteme döndü
    // (yıkanan temiz bardakları ocak hemen demleyebilir → cleanCups + readyCups olarak ölç).
    expect(s.dishes.length).toBeLessThan(dirtyBefore);
    expect(s.cleanCups + s.ready.tea).toBeGreaterThan(0);
    void ds;
  });
});

describe('para mıknatısı (Faz 2f) — attract yarıçapındaki para oyuncuya akar + toplanır', () => {
  it('düşme noktasının pickup yarıçapına HİÇ girilmese de para mıknatısla toplanır (bug düzeltmesi)', () => {
    useGame.getState().hardReset();
    // Para, oyuncudan pickup (1.4) DIŞINDA ama attract (taban kademe 2.6) İÇİNDE düşsün.
    const px = 0;
    const coinX = px + (economyConfig.money.pickupRadius + attractRadiusFor(0)) / 2; // ~2.0
    useGame.setState({
      player: [px, 0.6, 0], inputKeyboard: [0, 0], inputJoystick: [0, 0],
      coins: [{ id: 5555, pos: [coinX, 0.3, 0], value: 5 }],
    });
    const before = useGame.getState().wallet.toNumber();
    // Oyuncu yerinde dursa bile mıknatıs parayı çeker → birkaç tick'te toplanır.
    for (let i = 0; i < 20; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().coins.length).toBe(0);
    expect(useGame.getState().wallet.toNumber()).toBe(before + 5);
  });

  it('attract yarıçapı DIŞINDAKİ para çekilmez (oyuncu uzaktayken yerinde kalır)', () => {
    useGame.getState().hardReset();
    const far = attractRadiusFor(0) + 2; // attract dışında (taban kademe)
    useGame.setState({
      player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      coins: [{ id: 5556, pos: [PARK[0] + far, 0.3, PARK[2]], value: 5 }],
    });
    for (let i = 0; i < 10; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().coins.length).toBe(1); // toplanmadı
    expect(useGame.getState().coins[0].pos[0]).toBeCloseTo(PARK[0] + far, 5); // hareket etmedi
  });
});

describe('tepsi kapasitesi (v20: karakter tepsi kademesinden türetilir; paylaşımlı çay+kirli)', () => {
  it('kademe → kapasite eğrisi: 2→3→4→5→6; taşan kademe son değere kelepçelenir', () => {
    expect(trayCapacityFor(0)).toBe(2); // yeni oyun
    expect(trayCapacityFor(1)).toBe(3);
    expect(trayCapacityFor(2)).toBe(4); // eski kayıt hediyesi (migrasyon T2)
    expect(trayCapacityFor(4)).toBe(6);
    expect(trayCapacityFor(99)).toBe(6);
  });

  it('arg\'sız trayCapacity() canlı store kademesini okur (devHooks geri-uyumu)', () => {
    useGame.getState().hardReset();
    expect(trayCapacity()).toBe(2);
    useGame.setState({ charUpgrades: { tray: 2, magnet: 0, speed: 0 } });
    expect(trayCapacity()).toBe(4);
  });
});

describe('kayıt migrasyonu v4..v15 (padFills, station2/samovar çıkışı, addTable senkron, türetme, trayLevel düşüşü, tableLevels, waiterLevel)', () => {







  it('varsayılan kayıt padFills={} içerir; türetilen + kaldırılan (trayLevel) alanlar tutulmaz', () => {
    const d = defaultSave();
    expect(d.saveVersion).toBe(SAVE_VERSION);
    expect(d.padFills).toEqual({});
    expect((d as Record<string, unknown>).trayLevel).toBeUndefined();
    expect(d.tableLevels).toEqual([]);
    expect((d as Record<string, unknown>).waiterLevels).toBeUndefined(); // v29: hız panel kademesine taşındı
    expect((d as Record<string, unknown>).tables).toBeUndefined();
    expect((d as Record<string, unknown>).hasWaiter).toBeUndefined();
  });
});

describe('D-015 — tek doğru kaynak: türetilen alanlar padsDone\'dan, kayıttaki sahte değer SIZAMAZ', () => {
  it('deriveWorld padsDone\'dan tutarlı türetir (masa listesi/garson/bulaşıkçı)', () => {
    expect(deriveWorld([]).tables.length).toBe(1);
    expect(deriveWorld(['table2', 'table3', 'table4']).tables.length).toBe(4);
    expect(deriveWorld(['waiter']).services[THE_SERVICE].waiters).toBe(1);
    expect(deriveWorld([]).services[THE_SERVICE].waiters).toBe(0);
    // Bulaşıkçı pad'i 2. ALANDA durur → alan kapalıyken etkisi SAYILMAZ (bozuk kayıt savunması).
    expect(deriveWorld(['dishwasher']).services[THE_SERVICE].hasDishwasher).toBe(false);
    expect(deriveWorld(['zone2', 'dishwasher']).services[THE_SERVICE].hasDishwasher).toBe(true);
    // samovar pad'i kaldırıldı (D-018 adım 5) → artık bilinmeyen id, etki yok (masa/ocak sayısı değişmez).
    expect(deriveWorld(['samovar']).tables.length).toBe(1);
    expect(openServices(deriveWorld([]).areasOpen).length).toBe(1);
    // Bilinmeyen pad id'leri yok sayılır (ileri/geri uyum).
    expect(deriveWorld(['table2', 'station2', 'bogus']).tables.length).toBe(2);
  });


  it('store: pad açıldıkça tables/hasWaiter padsDone ile DAİMA tutarlı (desenkronizasyon üretilemez)', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(50);
    completePad('table2');
    let s = useGame.getState();
    expect(s.tables).toBe(deriveWorld(s.padsDone).tables.length);
    expect(s.waiters.length).toBe(deriveWorld(s.padsDone).services[THE_SERVICE].waiters);

    // Garson omurgada table3'ten sonra (quest hattı).
    completePad('table3');
    completePad('waiter');
    s = useGame.getState();
    expect(s.waiters.length).toBe(1);
    expect(s.waiters.length).toBe(deriveWorld(s.padsDone).services[THE_SERVICE].waiters);
    expect(s.tables).toBe(deriveWorld(s.padsDone).tables.length);
  });
});

describe('ekonomi v2 — seviye throughputu artırır, fiyatı DEĞİL (D-010)', () => {
  it('stationLevel arttıkça demleme süresi kısalır (çay/dk ↑); fiyat sabit kalır', () => {
    const t0 = brewTime(0, 1);
    const t1 = brewTime(1, 1);
    const t2 = brewTime(2, 1);
    expect(t1).toBeLessThan(t0); // throughput arttı → süre kısaldı
    expect(t2).toBeLessThan(t1);
    // Fiyat sabit: müşterinin bıraktığı coin değeri seviyeden bağımsız.
    expect(TEA_PRICE).toBe(economyConfig.service.basePrice);
  });

  it('servis hızı (semaver/ek ocak) da demlemeyi kısaltır', () => {
    expect(brewTime(0, 0.7)).toBeLessThan(brewTime(0, 1));
  });

  it('quest motoru: ilk-oyun görevleri eylem sayaçlarıyla SIRAYLA ilerler (eski onboarding koçunun yerine)', () => {
    useGame.getState().hardReset();
    // Taze oyun: görev 0 = ocaktan çay al; quest bar görünümü dolu.
    expect(useGame.getState().questIndex).toBe(0);
    expect(useGame.getState().quest?.id).toBe('q_pickup');
    // Çay demlensin (oyuncu uzakta).
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    for (let i = 0; i < 200 && useGame.getState().ready.tea === 0; i++) useGame.getState().tick(0.1);
    // 1) Ocağa git → tepsiye al → görev 1 tamam, sıradaki "müşteriye götür".
    const st = SP().station;
    stand(st);
    useGame.getState().tick(0.1);
    expect(useGame.getState().stats.teaPickups).toBeGreaterThan(0);
    flushQuestTransition(); // bitiş ritmi (completing+gap) akınca sıradaki görev aktif olur
    expect(useGame.getState().quest?.id).toBe('q_serve1');
    // Görev geçişinde kamera yeni hedefe pan ister (hareketli onboarding).
    expect(useGame.getState().camFocus).not.toBeNull();
    // 2) Bekleyen müşteriye servis → "parayı topla".
    const waiting = useGame.getState().npcs.find((n) => n.state === 'waitingForTea');
    expect(waiting).toBeTruthy();
    const seat = LAYOUT.tables[waiting!.tableIndex].seat;
    stand(seat);
    useGame.getState().tick(0.1);
    expect(useGame.getState().stats.teasServed).toBe(1);
    flushQuestTransition();
    expect(useGame.getState().quest?.id).toBe('q_coin');
    // 3) Müşteri öder, oyuncu koltukta → para toplanır → "2. Masayı aç".
    for (let i = 0; i < 80; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().stats.coinsCollected).toBeGreaterThan(0);
    expect(useGame.getState().quest?.id).toBe('q_table2');
  });

  it('sayaç görevleri questBase\'ten DELTA sayılır (önceki birikmiş sayaç hedefi bedavaya getirmez)', () => {
    const stats = { ...defaultStats(), teasServed: 7 };
    const target = { type: 'serveTea', count: 5 } as const;
    expect(questCounterValue(target, stats)).toBe(7);
    // questBase 7 (görev şimdi başladı) → 7 servis sayılmaz, 5 YENİ servis gerek.
    const ctx = { padsDone: [], stationLevel: 0, waiterLevel: 0, tableLevels: [], stats, questBase: 7 };
    expect(questTargetMet(target, ctx)).toBe(false);
    expect(questTargetMet(target, { ...ctx, stats: { ...stats, teasServed: 12 } })).toBe(true);
  });

  it('görev ödülü (M1): tamamlanınca reward cüzdana+lifetime\'a eklenir; toast ve görev kartı gösterir', () => {
    useGame.getState().hardReset();
    const reward = economyConfig.quests[0].reward ?? 0;
    expect(reward).toBeGreaterThan(0); // ödül tanımlı olmalı (config sözleşmesi)
    const w0 = useGame.getState().wallet.toNumber();
    const l0 = useGame.getState().lifetime.toNumber();
    // q_pickup sayacını karşıla → tick görev hattını ilerletir ve ödülü öder.
    useGame.setState({ stats: { ...useGame.getState().stats, teaPickups: 1 } });
    useGame.getState().tick(0.05);
    // TAMAMLAMA ANI (A paketi): ödül cüzdana+lifetime eklenir, toast 'quest', kart 'done' (henüz ilerlemedi).
    let s = useGame.getState();
    expect(s.wallet.toNumber()).toBeCloseTo(w0 + reward, 5);
    expect(s.lifetime.toNumber()).toBeCloseTo(l0 + reward, 5);
    expect(s.notice?.kind).toBe('quest');
    expect(s.notice?.reward).toBe(reward); // HUD toast'ı coin + tutar çizer
    expect(s.quest?.done).toBe(true); // kart %100 + yeşil onay gösterir
    // Ritüel (completing+gap) akınca hat ilerler; sıradaki görevin kartında ödül görünür.
    flushQuestTransition();
    s = useGame.getState();
    expect(s.questIndex).toBe(1);
    expect(s.quest?.reward).toBe(economyConfig.quests[1].reward ?? null);
  });

  it('A paketi: görev geçiş ritmi — completing (kart %100+done) → gap → yeni görev (instant swap YOK)', () => {
    useGame.getState().hardReset();
    expect(useGame.getState().questPhase).toBe('active');
    // q_pickup'ı karşıla → bu tick'te questIndex İLERLEMEZ; faz 'completing', kart 'done' (%100).
    useGame.setState({ stats: { ...useGame.getState().stats, teaPickups: 1 } });
    useGame.getState().tick(0.05);
    let s = useGame.getState();
    expect(s.questPhase).toBe('completing');
    // KART henüz takas edilmez (anında takas yok) — ama MOTOR bitiş anında ilerledi (taban yarışı fix'i):
    // kutlama penceresinde yapılan eylem yeni görevin tabanına yazılmasın diye.
    expect(s.quest?.id).toBe('q_pickup');
    expect(s.quest?.done).toBe(true);
    expect(s.quest?.cur).toBe(s.quest?.total); // bar %100 dolar
    expect(s.questIndex).toBe(1);
    expect(s.questDoneIndex).toBe(0);
    // completing süresi (0.5s) dolunca 'gap'; gap boyunca hâlâ tamamlanmış görev KARTI gösterilir.
    for (let i = 0; i < 7; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().questPhase).toBe('gap');
    expect(useGame.getState().quest?.id).toBe('q_pickup');
    // gap (0.8s) dolunca yeni görevin kartı görünür, faz 'active', kart artık done DEĞİL.
    for (let i = 0; i < 9; i++) useGame.getState().tick(0.1);
    s = useGame.getState();
    expect(s.questPhase).toBe('active');
    expect(s.questIndex).toBe(1);
    expect(s.quest?.id).toBe('q_serve1');
    expect(s.quest?.done).toBeFalsy();
  });

  it('B paketi: bildirim kuyruğu — aynı tick içindeki iki toast birbirini EZMEZ, sırayla gösterilir', () => {
    useGame.getState().hardReset();
    // İki reveal'ı aynı anda kuyruğa sok (görevle KAPSANMAYAN anahtarlar → toast üretirler).
    useGame.setState({
      notice: null,
      noticeQueue: [
        { text: 'Birinci', ttl: 0.3, kind: 'reveal' },
        { text: 'İkinci', ttl: 4, kind: 'reveal' },
      ],
      player: PARK,
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
    });
    useGame.getState().tick(0.05);
    expect(useGame.getState().notice?.text).toBe('Birinci'); // önce ilki
    // İlk toast ttl'i (0.3s) dolunca kuyruktaki ikinci gösterilir (üst üste binmez).
    for (let i = 0; i < 6; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().notice?.text).toBe('İkinci');
  });
});

describe('mekânsal çay yükseltme noktası (zone) + gating', () => {
  it('önkoşul (2. masa) karşılanmadan zone pasiftir', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(1000);
    const z = SP().upgradeSpot;
    stand(z);
    for (let i = 0; i < 50; i++) useGame.getState().tick(0.1);
    // table2 açılmadığı için yükseltme noktası çalışmaz.
    expect(useGame.getState().stationLevels[0]).toBe(0);
  });

  it('table2 açıldıktan sonra noktada durunca seviye artar (activeSpot kind=upgrade)', () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(50);
    expect(completePad('table2')).toBe(true); // önkoşulu karşıla
    // D-142: nokta yalnız OCAK görevinde canlı.
    useGame.setState({ questIndex: economyConfig.quests.findIndex((q) => q.id === 'q_station1'), questPhase: 'active', questPhaseT: 0 });

    useGame.getState().addMoney(30); // L1 (25₺) yeter; max'a varmaz
    const z = SP().upgradeSpot;
    stand(z);
    const before = useGame.getState().stationLevels[0];

    // D-142: seviye alınınca görev biter ve nokta kapanır → dolum sırasında görülen tür okunur.
    let gorulen: string | undefined;
    for (let i = 0; i < 50; i++) {
      useGame.getState().tick(0.1);
      gorulen ??= useGame.getState().activeSpot?.kind;
    }

    expect(useGame.getState().stationLevels[0]).toBeGreaterThan(before);
    expect(gorulen).toBe('upgrade');
  });

  it('GEOMETRİ DEĞİŞMEZİ: yükseltme PAD MERKEZİ pickup dairesinin DIŞINDA (kullanıcı 2026-06-11: pad ocağın yanında)', () => {
    // Pad ocağa bitişik durur (My Hotel obje-başı desen) ama MERKEZİ pickup yarıçapının dışında
    // kalmalı (+0.3 marj) → pad merkezinde duran oyuncu çay-alma alanına girmez; pickup alanı
    // içindeyken dolum zaten tick'teki pickup-guard'ıyla kilitli (alttaki test).
    // B3-1: servisin İKİ yeri var (sol duvar · arka bant) — değişmez İKİSİNDE DE geçerli olmalı.
    for (const areasOpen of [1, 2, 3]) {
      const st = SP(areasOpen).station;
      const up = SP(areasOpen).upgradeSpot;
      // H1/O3: tetik tezgâhın GÖVDESİNDEN ölçülüyor → değişmez de gövdeden ölçülür.
      // (Merkezden ölçmek tezgâh uzadıkça sessizce yanlış cevap verirdi.)
      expect(boxDist2D(up[0], up[2], st, SP(areasOpen).half))
        .toBeGreaterThanOrEqual(economyConfig.serving.pickupReach + 0.3);
    }
  });

  it('çay almak için tezgâh önünde dururken yükseltme PARA ÇEKMEZ (pickup-yarıçapı guard\'ı)', () => {
    useGame.getState().hardReset();
    expect(completePad('table2')).toBe(true); // yükseltme noktası açık
    useGame.getState().addMoney(100);

    // Oyuncu tezgâhın TAM ÖN YÜZÜNDE (collision standoff kadar): pickup yarıçapının İÇİNDE.
    // B3-1: ön yüzün yönü `rot`tan gelir (sol duvarda +x, arka bantta +z) — sabit eksen varsayımı kalktı.
    const sp = SP();
    const st = sp.station;
    const d = (sp.rot === 0 ? sp.half[1] : sp.half[0]) + LAYOUT.playerRadius + 0.05;
    const front: [number, number, number] =
      sp.rot === 0 ? [st[0], 0.6, st[2] + d] : [st[0] + d, 0.6, st[2]];
    expect(atServiceBody(front[0], front[2], sp, economyConfig.serving.pickupReach)).toBe(true);
    useGame.setState({ player: front, inputKeyboard: [0, 0], inputJoystick: [0, 0], npcs: [], spawnTimer: 999 });

    const walletBefore = useGame.getState().wallet.toNumber();
    // Demleme (6sn/bardak) tamamlanıp çay tepsiye alınana kadar bekle (en az bir pickup yaşansın).
    for (let i = 0; i < 200 && useGame.getState().tray === 0; i++) useGame.getState().tick(0.1);

    // Durduğu halde (fillReady) ne dolum başladı ne para gitti; çay tepsiye alınabildi.
    expect(useGame.getState().upgradeFills[0]).toBe(0);
    expect(useGame.getState().stationLevels[0]).toBe(0);
    expect(useGame.getState().wallet.toNumber()).toBe(walletBefore);
    expect(useGame.getState().tray).toBeGreaterThan(0);
  });
});

describe('mobilya collision (D-016) — oyuncu ocağın/masanın içine giremez', () => {
  it('input ile ocağa yürürken İÇİNE GİRMEZ (kenarından kayar) + hareket eder', () => {
    useGame.getState().hardReset();
    const ocak = SP().station;
    const startX = ocak[0] - 0.6; // ocağın solu (masa kutusundan uzak, ocak x-menzilinde) → -z'ye yürü
    const startZ = -1.4;
    useGame.setState({ player: [startX, 0.6, startZ], inputKeyboard: [0, -1], inputJoystick: [0, 0], npcs: [], spawnTimer: 999 });
    for (let i = 0; i < 60; i++) useGame.getState().tick(0.1);
    const p = useGame.getState().player;
    // Oyuncu merkezi ocak AABB'sinin İÇİNDE OLMAMALI (içine girmedi; kenardan kaydı/durdu).
    const insideOcak = Math.abs(p[0] - ocak[0]) < SP().half[0] && Math.abs(p[2] - ocak[2]) < SP().half[1];
    expect(insideOcak).toBe(false);
    // Dead-lock değil: bir yere hareket etti (kenara kaydı veya ocağa yaklaştı).
    expect(p[0] !== startX || p[2] !== startZ).toBe(true);
  });

  it('mobilyanın İÇİNDE kalırsa (ör. üstünde masa açıldı) çıkışına izin verilir (hapsolmaz)', () => {
    useGame.getState().hardReset();
    const tbl = LAYOUT.tables[0].table; // oyuncuyu masanın TAM merkezine koy (içinde)
    // Masadan UZAĞA (merkeze ters, +x) input ver → birkaç tick'te footprint dışına çıkmalı.
    useGame.setState({ player: [tbl[0], 0.6, tbl[2]], inputKeyboard: [1, 0], inputJoystick: [0, 0], npcs: [], spawnTimer: 999 });
    for (let i = 0; i < 40; i++) useGame.getState().tick(0.1);
    const p = useGame.getState().player;
    const half = LAYOUT.tableHalf[0] + LAYOUT.playerRadius;
    const stillInside = Math.abs(p[0] - tbl[0]) < half && Math.abs(p[2] - tbl[2]) < half;
    expect(stillInside).toBe(false); // dışarı çıkabildi (eski sürümde kilitlenip içeride kalırdı)
  });

  it('input olmadan (teleport/setState) collision uygulanmaz → testler/dev kancası etkilenmez', () => {
    useGame.getState().hardReset();
    const ocak = SP().station;
    // Doğrudan ocağın merkezine ışınla (kutu içi), input yok → konum AYNEN korunur (push-out yok).
    useGame.setState({ player: [ocak[0], 0.6, ocak[2]], inputKeyboard: [0, 0], inputJoystick: [0, 0], npcs: [], spawnTimer: 999 });
    useGame.getState().tick(0.1);
    const p = useGame.getState().player;
    expect(p[0]).toBeCloseTo(ocak[0], 5);
    expect(p[2]).toBeCloseTo(ocak[2], 5);
  });
});

describe('yerleşim — yürüme döngüsü zorlanır (D-017 §1, çakışma yok)', () => {
  function dist2D(a: readonly number[], b: readonly number[]) {
    return Math.hypot(a[0] - b[0], a[2] - b[2]);
  }
  it('hiçbir masa ocağın çay-alma + servis dairelerinin BİRLEŞİĞİNDE değil (tek noktada çay-al+servis imkânsız)', () => {
    // H1/O3: çay alma tetiği tezgâhın GÖVDESİNDEN pay; K5 (D-147): servis de masanın gövdesinden
    // pay. Tek noktadan hem alıp hem servis yapılamaması için iki KUTU arası mesafe iki payı aşmalı.
    const sp = SP();
    const minSep = economyConfig.serving.pickupReach + economyConfig.cups.collectReach;
    for (let i = 0; i < LAYOUT.tables.length; i++) {
      const t = LAYOUT.tables[i];
      const h = tableHalfFor(i);
      const dx = Math.max(0, Math.abs(t.table[0] - sp.station[0]) - h[0] - sp.half[0]);
      const dz = Math.max(0, Math.abs(t.table[2] - sp.station[2]) - h[1] - sp.half[1]);
      expect(Math.hypot(dx, dz)).toBeGreaterThan(minSep);
    }
  });
  it('hiçbir masa bulaşığın yıkama + kirli-toplama dairelerinin BİRLEŞİĞİNDE değil (tek noktada kirli-al+yıka imkânsız)', () => {
    // H1/M3: kirli toplama tetiği MASANIN gövdesinden pay → değişmez de masanın kutusundan.
    const dish = SP().dish;
    const minSep = economyConfig.cups.washRadius + economyConfig.cups.collectReach;
    for (let i = 0; i < LAYOUT.tables.length; i++) {
      const t = LAYOUT.tables[i];
      expect(boxDist2D(dish[0], dish[2], t.table, tableHalfFor(i))).toBeGreaterThan(minSep);
    }
  });
  it('başlangıç masası (table0) ocaktan hedef ~5 br uzak (yürüme döngüsü en baştan zorlanır)', () => {
    expect(dist2D(SP().station, LAYOUT.tables[0].table)).toBeGreaterThan(4);
  });
});

describe('personel yol bulma (nav.ts — BFS, kilitlenme yok)', () => {
  // Oyundaki ile aynı engeller: ocak + bulaşık + 4 masa (koltuk/semaver hariç).
  function navSolids() {
    const solids = [
      { c: SP().station, h: SP().half },
      { c: SP().dish, h: SP().dishHalf },
    ];
    // D-073: iki masa tipi iki footprint (dörtlü 1,75 · ikili 1,00).
    for (const t of LAYOUT.tables)
      solids.push({ c: t.table, h: t.kind === 'deuce' ? LAYOUT.deuceHalf : LAYOUT.tableHalf });
    return solids;
  }
  const grid = () => buildNavGrid(LAYOUT.area, 0.3, navSolids(), LAYOUT.actorRadius);
  // Teslim mesafesi masanın footprint'inden türer (oyunun `REACH_TABLE`'ıyla aynı formül) —
  // masa büyüyünce sabit 1,1 footprint'in içinde kalıyordu.
  const REACH = LAYOUT.tableHalf[0] + LAYOUT.actorRadius + 0.35;

  it('ocaktan HER masaya yol bulunur (kolon-bloklu arka masalar dahil)', () => {
    const g = grid();
    const station = SP().station;
    for (const t of LAYOUT.tables) {
      const path = findNavPath(g, station, t.table[0], t.table[2], REACH);
      expect(path).not.toBeNull(); // ulaşılamayan masa YOK
    }
  });

  it('engel TAM aradayken etrafından dolaşır (eski moveAvoid kilitlenirdi)', () => {
    const g = grid();
    // table0 (ön-sol) ile table2 (arka-sol) aynı x kolonunda; table0 ocak ile table2 arasında.
    const t0 = LAYOUT.tables[0].table; // [-2.4, 0.0]
    const t2 = LAYOUT.tables[2].table; // [-2.4, 3.0]
    // table0'ın hemen ARKASINDAN (ocak tarafı) table2'ye yol iste.
    const behind: [number, number, number] = [t0[0], 0, t0[2] - 1.0];
    const path = findNavPath(g, behind, t2[0], t2[2], REACH);
    expect(path).not.toBeNull();
    // Yol, table0 gövdesinin İÇİNDEN geçmemeli (her waypoint masa footprint+aktör yarıçapı dışında).
    const blockedHalf = LAYOUT.tableHalf[0] + LAYOUT.actorRadius;
    for (const [wx, wz] of path!) {
      const insideT0 = Math.abs(wx - t0[0]) < blockedHalf && Math.abs(wz - t0[2]) < blockedHalf;
      expect(insideT0).toBe(false);
    }
  });

  it('garson kolon-bloklu ARKA masaya gerçekten servis eder (deadlock yok, entegrasyon)', () => {
    useGame.getState().hardReset();
    const backIdx = 2; // sol-alt masa: ocak ile arasında table0 var (eski sistemde kilitlenirdi)
    useGame.setState({
      padsDone: ['table2', 'table3', 'table4', 'waiter'],
      // Garsonu ocakta tepsi DOLU başlat → doğruca teslimata yönelir.
      waiters: [{ pos: [...SP().station] as [number, number, number], tray: 1, trayFood: 0 }],
      player: PARK, // oyuncu uzakta (servis etmesin)
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      npcs: [
        { id: 950, state: 'waitingForTea', pos: [...LAYOUT.tables[backIdx].seat] as [number, number, number], tableIndex: backIdx, seatIndex: 0, timer: 999, product: 'tea', color: '#27ae60' },
      ],
      spawnTimer: 999, // yeni müşteri spawn olmasın
    });
    // Garson (hız 1.8) rotayı dolaşıp masaya VARANA kadar simüle et (deadlock olsaydı asla varmazdı).
    let servedState = 'waitingForTea';
    for (let i = 0; i < 120 && servedState === 'waitingForTea'; i++) {
      useGame.getState().tick(0.1);
      servedState = useGame.getState().npcs.find((n) => n.id === 950)?.state ?? 'leaving';
    }
    // Müşteri sabrı 999 → tek çıkış yolu SERVİS (drinking) → arka masaya gerçekten ulaşıldı (takılmadı).
    expect(servedState).not.toBe('waitingForTea');
    expect(useGame.getState().waiters[0]?.tray).toBe(0); // çayı bıraktı
  });

  it('MÜŞTERİ kolon-bloklu ARKA masaya gerçekten oturur (eski moveAvoid ön masada kilitleniyordu)', () => {
    useGame.getState().hardReset();
    const backIdx = 2; // arka-sol masa: kapı ile koltuk arasında table0 TAM kolonda
    useGame.setState({
      padsDone: ['table2', 'table3'],
      player: PARK, // oyuncu uzakta
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      npcs: [
        { id: 960, state: 'toTable', pos: [...entranceAt(2)] as [number, number, number], tableIndex: backIdx, seatIndex: 0, timer: 0, product: 'tea', color: '#27ae60' },
      ],
      spawnTimer: 999,
    });
    let st = 'toTable';
    for (let i = 0; i < 120 && st === 'toTable'; i++) {
      useGame.getState().tick(0.1);
      st = useGame.getState().npcs.find((n) => n.id === 960)?.state ?? 'gone';
    }
    expect(st).toBe('waitingForTea'); // oturdu (takılıp 30sn vazgeçme sigortasına düşmedi)
    const npc = useGame.getState().npcs.find((n) => n.id === 960)!;
    expect(npc.pos[0]).toBeCloseTo(LAYOUT.tables[backIdx].seat[0], 5);
    expect(npc.pos[2]).toBeCloseTo(LAYOUT.tables[backIdx].seat[2], 5);
  });

  it('nav ızgarası oyun alanının DIŞINA hücre açmaz (taşan satır kapı önü salınımı yapıyordu)', () => {
    // KÖK NEDEN (telefon 2026-06-11): rows=ceil ile son satır merkezi z≈5.05 > area.maxZ 5.0 →
    // kapıdan girip SAĞA gidecek müşterinin ilk waypoint'i bu satıra düşünce z>5.0'a itiliyor,
    // "kapıya yürü" dalı geri çekiyor → kapı yanında (çöp kovası hizasında) sonsuz salınım.
    const g = buildNavGrid(LAYOUT.area, 0.3, navSolids(), LAYOUT.actorRadius);
    for (let r = 0; r < g.rows; r++) {
      const z = g.minZ + (r + 0.5) * g.cell;
      if (z > LAYOUT.area.maxZ) {
        for (let c = 0; c < g.cols; c++) expect(g.blocked[r * g.cols + c]).toBe(1);
      }
    }
  });

  it('MÜŞTERİ sokaktan SAĞ ön masaya GERÇEK frame dt ile oturur (kapı önü salınım regresyonu)', () => {
    useGame.getState().hardReset();
    const rightIdx = 1; // ön-SAĞ masa: kapıdan sonra rota sağa kırar (telefon bug senaryosu)
    useGame.setState({
      padsDone: ['table2'],
      player: PARK, // oyuncu uzakta
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      npcs: [
        { id: 962, state: 'toTable', pos: [...streetAt(2)] as [number, number, number], tableIndex: rightIdx, seatIndex: 0, timer: 0, product: 'tea', color: '#27ae60' },
      ],
      spawnTimer: 999,
    });
    // GERÇEK frame adımı (1/60): telefondaki küçük adımlar hücre-sınırı salınımını tetikliyordu;
    // dt=0.1'lik eski testler bunu atlıyordu. 35 sn simüle (30sn vazgeçme sigortasından uzun).
    let st = 'toTable';
    for (let i = 0; i < 35 * 60 && st === 'toTable'; i++) {
      useGame.getState().tick(1 / 60);
      st = useGame.getState().npcs.find((n) => n.id === 962)?.state ?? 'gone';
    }
    expect(st).toBe('waitingForTea'); // oturdu — salınıma takılıp vazgeçmedi
  });

  it('MÜŞTERİ arka masadan çıkışta kapıya BFS ile gider ve sokakta silinir', () => {
    useGame.getState().hardReset();
    const backIdx = 2;
    useGame.setState({
      padsDone: ['table2', 'table3'],
      player: PARK,
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      npcs: [
        { id: 961, state: 'leaving', pos: [...LAYOUT.tables[backIdx].seat] as [number, number, number], tableIndex: backIdx, seatIndex: 0, timer: 0, product: 'tea', color: '#27ae60' },
      ],
      spawnTimer: 999,
    });
    let gone = false;
    for (let i = 0; i < 150 && !gone; i++) {
      useGame.getState().tick(0.1);
      gone = !useGame.getState().npcs.some((n) => n.id === 961);
    }
    expect(gone).toBe(true); // kapıdan çıkıp sokakta kayboldu (takılmadı)
  });
});

describe('masa yükseltme + bahşiş (Faz 2h)', () => {
  it('maliyet eğrisi geometrik (60 × 1.8^lvl)', () => {
    expect(tableUpgradeCost(0)).toBe(60);
    expect(tableUpgradeCost(1)).toBe(108);
    expect(tableUpgradeCost(2)).toBe(194);
    expect(tableUpgradeCost(3)).toBe(349);
  });

  it('zone-kademeli yükseltme maliyeti (2026-06-13): z1 birebir, z2 ×1.5, z3 ×2.5 (5\'e yuvarlı)', () => {
    // Salon 1 = varsayılan zone → eski eğriyle birebir (üstteki test).
    expect(tableUpgradeCost(0, 1)).toBe(90);
    expect(tableUpgradeCost(1, 1)).toBe(160);
    expect(tableUpgradeCost(2, 1)).toBe(290);
    expect(tableUpgradeCost(3, 1)).toBe(525);
    expect(tableUpgradeCost(0, 2)).toBe(150);
    expect(tableUpgradeCost(1, 2)).toBe(270);
    expect(tableUpgradeCost(2, 2)).toBe(485);
    expect(tableUpgradeCost(3, 2)).toBe(875);
    // Tanımsız zone son çarpana kelepçelenir.
    expect(tableUpgradeCost(0, 9)).toBe(tableUpgradeCost(0, 2));
  });

  it('bahşiş ve sabır seviyeyle artar; L0 nötr', () => {
    expect(tableTip(0)).toBe(0);
    expect(tableTip(2)).toBe(economyConfig.tables.tipBase * 2);
    expect(tablePatience(0)).toBe(economyConfig.npc.patience);
    expect(tablePatience(2)).toBe(economyConfig.npc.patience + economyConfig.tables.patiencePerLevel * 2);
  });

  it('yükseltme noktası TÜM masalar (table4) açılınca belirir — erken oyunda gizli (D-019 §3)', () => {
    useGame.getState().hardReset();
    expect(tableUpgradeUnlocked(gate())).toBe(false); // başta
    useGame.setState({ padsDone: ['table2', 'table3'] });
    expect(tableUpgradeUnlocked(gate())).toBe(false); // hâlâ kilitli (table4 lazım → erken ekran sade)
    useGame.setState({ padsDone: ['table2', 'table3', 'table4'] });
    expect(tableUpgradeUnlocked(gate())).toBe(true); // 4. masa açılınca belirir
  });

  it('ödeyen müşteri çay fiyatı + OTURDUĞU masanın bahşişini bırakır (masa-başı)', () => {
    useGame.getState().hardReset();
    const seat = LAYOUT.tables[0].seat;
    useGame.setState({
      tableLevels: [2, 0, 0, 0], // sadece 0. masa L2 → bahşiş = tipBase×2
      player: PARK, // GERÇEKTEN uzak (alan içi köşe; eski [0,0.6,99] z=5'e kelepçelenip mıknatısa giriyordu — flaky)
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      coins: [],
      npcs: [{ id: 970, state: 'drinking', pos: [...seat] as [number, number, number], tableIndex: 0, seatIndex: 0, timer: 0.05, product: 'tea', color: '#27ae60' }],
      spawnTimer: 999,
    });
    useGame.getState().tick(0.1); // drinking timer biter → öder
    const coin = useGame.getState().coins.find((c) => c.value === TEA_PRICE + tableTip(2));
    expect(coin).toBeTruthy(); // 5 + 4 = 9 ₺ düştü
  });

  it('oturan müşterinin sabrı OTURDUĞU masanın seviyesiyle uzar', () => {
    useGame.getState().hardReset();
    const seat = LAYOUT.tables[0].seat;
    useGame.setState({
      tableLevels: [2, 0, 0, 0],
      player: PARK,
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      // Koltuğun üstünde 'toTable' → bu tick oturur, timer = tablePatience(2).
      npcs: [{ id: 971, state: 'toTable', pos: [...seat] as [number, number, number], tableIndex: 0, seatIndex: 0, timer: 0, product: 'tea', color: '#2980b9' }],
      spawnTimer: 999,
    });
    useGame.getState().tick(0.05);
    const n = useGame.getState().npcs.find((x) => x.id === 971);
    expect(n?.state).toBe('waitingForTea');
    expect(n?.timer).toBeGreaterThan(economyConfig.npc.patience); // taban 18'den fazla
    expect(n?.timer).toBeCloseTo(tablePatience(2), 5);
  });

  it('yükseltme MASA-BAŞI: bir masanın noktasında dur → SADECE o masa yükselir (diğerleri 0)', () => {
    useGame.getState().hardReset();
    // 4 masayı aç (omurga padsDone) + bol para; oyuncuyu 0. masanın yükseltme noktasına koy.
    useGame.setState({
      padsDone: ['table2', 'table3', 'table4'],
      tableLevels: [0, 0, 0, 0],
      wallet: D(5000),
      questIndex: economyConfig.quests.length, // D-142: kapı değil MASA-BAŞI sınanıyor
      questPhase: 'active',
      player: [LAYOUT.tables[0].upgradeSpot[0], 0.6, LAYOUT.tables[0].upgradeSpot[2]],
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      npcs: [],
      spawnTimer: 999,
    });
    for (let i = 0; i < 40; i++) useGame.getState().tick(0.1);
    const lv = useGame.getState().tableLevels;
    expect(lv[0]).toBeGreaterThan(0); // 0. masa yükseldi
    expect(lv[1]).toBe(0); // komşu masalar ETKİLENMEDİ (toplu değil)
    expect(lv[2]).toBe(0);
    expect(lv[3]).toBe(0);
  });

});

describe('Etkileşim HAREKET-temelli (D-018 §2): üstünden geçerken alma, durunca hemen al', () => {
  function placeOnPad() {
    useGame.getState().hardReset();
    useGame.getState().addMoney(1000); // wallet + lifetime (table2 gate'i için lifetime≥20)
    // Quest sistemi: pad yalnız kendi görevi aktifken doldurulabilir → table2 görevine atla.
    useGame.setState({ questIndex: questIndexFor('table2'), questBase: 0 });
    const pad = currentPad(gate())!; // table2 (omurga)
    const pos = LAYOUT.padPos[pad.id];
    useGame.setState({ player: [pos[0], 0.6, pos[2]], npcs: [], spawnTimer: 999 });
    return { pad, pos };
  }

  it('üstünden GEÇERKEN (hareket halinde) para AKMAZ', () => {
    const { pad, pos } = placeOnPad();
    // Her tick'te pad'e geri koy + HAREKET input'u → konumdan değil HAREKETTEN ötürü akmadığını test eder.
    for (let i = 0; i < 12; i++) {
      useGame.setState({ player: [pos[0], 0.6, pos[2]], inputKeyboard: [1, 0], inputJoystick: [0, 0] });
      useGame.getState().tick(0.1);
    }
    expect(useGame.getState().wallet.toNumber()).toBe(1000); // hiç harcanmadı
    expect(useGame.getState().padsDone).not.toContain(pad.id);
  });

  it('DURUNCA (input ~0) para HEMEN akmaya başlar (sayaç/countdown yok)', () => {
    const { pos } = placeOnPad();
    stand(pos);
    useGame.getState().tick(0.1); // TEK tick yeter → para hemen akar
    expect(useGame.getState().wallet.toNumber()).toBeLessThan(1000);
  });

  it('biriken ₺ KORUNUR: noktadan çıkınca kısmi dolum sıfırlanmaz', () => {
    const { pad, pos } = placeOnPad();
    useGame.setState({ wallet: D(20) }); // cost(25)'ten AZ → tamamlanmaz, kısmi kalır
    for (let i = 0; i < 6; i++) {
      stand(pos);
      useGame.getState().tick(0.1);
    }
    const accrued = useGame.getState().padFills[pad.id] ?? 0;
    expect(accrued).toBeGreaterThan(0);
    expect(useGame.getState().padsDone).not.toContain(pad.id); // tamamlanmadı (20<25)
    // ÇIK → biriken dolum korunur.
    useGame.setState({ player: [pos[0] + 6, 0.6, pos[2]] });
    useGame.getState().tick(0.1);
    expect(useGame.getState().padFills[pad.id] ?? 0).toBeCloseTo(accrued, 5);
  });
});

describe('Level/XP sistemi (v17, 2026-06-10) — eylem XP\'si, seviye eğrisi, migrasyon tohumlama, ayarlar', () => {
  const X = economyConfig.xp;

  it('seviye eğrisi: xpForLevel geometrik büyür; levelProgress doğru böler', () => {
    expect(xpForLevel(1)).toBe(Math.round(X.levelBase));
    expect(xpForLevel(2)).toBe(Math.round(X.levelBase * X.levelGrowth));
    expect(levelProgress(0)).toEqual({ level: 1, cur: 0, need: xpForLevel(1) });
    // Tam L1 eşiği: seviye atlar, içi sıfırlanır.
    expect(levelProgress(xpForLevel(1))).toEqual({ level: 2, cur: 0, need: xpForLevel(2) });
    // L2 ortası.
    const mid = xpForLevel(1) + 10;
    expect(levelProgress(mid)).toEqual({ level: 2, cur: 10, need: xpForLevel(2) });
    // Negatif/bozuk değer güvenli.
    expect(levelProgress(-50).level).toBe(1);
  });

  it('oyuncu eliyle servis XP verir; görev tamamlanınca görev XP\'si eklenir', () => {
    useGame.getState().hardReset();
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    for (let i = 0; i < 200; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().npcs.some((n) => n.state === 'waitingForTea')).toBe(true);
    const st = SP().station;
    stand(st);
    useGame.getState().tick(0.1); // çay al (q_pickup tamamlanır → +perQuest, completing fazı başlar)
    const xpAfterPickup = useGame.getState().xp;
    expect(xpAfterPickup).toBeGreaterThanOrEqual(X.perQuest);
    flushQuestTransition(); // bitiş ritmi akınca q_serve1 aktif olur (oyuncu istasyonda → serve YOK, xp sabit)
    // flush sonrası bekleyen müşteri yoksa belirene kadar tikle (oyuncu istasyonda → q_serve1 serve YOK).
    let waiting = useGame.getState().npcs.find((n) => n.state === 'waitingForTea');
    for (let i = 0; i < 200 && !waiting; i++) {
      useGame.getState().tick(0.1);
      waiting = useGame.getState().npcs.find((n) => n.state === 'waitingForTea');
    }
    expect(waiting).toBeTruthy();
    const seat = LAYOUT.tables[waiting!.tableIndex].seat;
    stand(seat);
    useGame.getState().tick(0.1); // servis (+perTeaServed; q_serve1 da tamamlanır → +perQuest)
    expect(useGame.getState().xp).toBeGreaterThanOrEqual(xpAfterPickup + X.perTeaServed + X.perQuest);
  });

  it('pad açılışı XP verir; seviye atlanınca toast gelir', () => {
    useGame.getState().hardReset();
    // Seviye eşiğinin hemen altına kur → pad XP'si seviye atlatsın.
    useGame.setState({ xp: xpForLevel(1) - 1, notice: null });
    expect(completePad('table2')).toBe(true);
    const s = useGame.getState();
    expect(s.xp).toBeGreaterThanOrEqual(xpForLevel(1) - 1 + X.perPad);
    // Pad + quest XP'si eşiği aştı → "Seviye 2!" toast'u (sonraki görev toast'larından önce yakalanmış olmalı
    // — aynı tick'te görev de tamamlanır; level-up bildirimi görev bildirimini EZER).
    expect(levelProgress(s.xp).level).toBeGreaterThanOrEqual(2);
  });


});

describe('bulaşık onboarding gate (2026-06-10) — q_wash gelmeden kirli bardak çıkmaz', () => {
  it('görev öncesi: içen müşteri kirli BIRAKMAZ, bardak temiz havuza döner (korunum bozulmaz)', () => {
    useGame.getState().hardReset(); // questIndex 0 < q_wash
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    for (let i = 0; i < 200; i++) useGame.getState().tick(0.1);
    const waiting = useGame.getState().npcs.find((n) => n.state === 'waitingForTea');
    expect(waiting).toBeTruthy();
    const st = SP().station;
    stand(st);
    useGame.getState().tick(0.1);
    const seat = LAYOUT.tables[waiting!.tableIndex].seat;
    stand(seat);
    useGame.getState().tick(0.1);
    // İçme bitsin (oyuncu uzakta).
    useGame.setState({ player: PARK });
    for (let i = 0; i < 100; i++) useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.dishes.length).toBe(0); // kirli YOK (öğretilmedi)
    // Korunum: havuz eksilmedi (bardak temize geri döndü) → demleme asla kilitlenmez.
    expect(s.cleanCups + s.ready.tea + s.tray + s.npcs.filter((n) => n.state === 'drinking').length).toBe(
      cupPoolCapacity(s.stationLevels[0]),
    );
  });
});

describe('2. ALAN (B2) — alan mekân getirir, SERVİS getirmez', () => {
  const Z1_CHAIN = ['table2', 'table3', 'waiter', 'table4', 'waiter2']; // D-142: 2. garson Salon 1'in son halkası

  it('deriveWorld: 2. alan açılınca areasOpen=2 + oto 1 masa; SERVİS SAYISI ARTMAZ', () => {
    const d1 = deriveWorld([...Z1_CHAIN]);
    expect(d1.areasOpen).toBe(1);
    expect(d1.tables.length).toBe(4);
    const d2 = deriveWorld([...Z1_CHAIN, 'zone2']);
    expect(d2.areasOpen).toBe(2);
    expect(d2.tables.length).toBe(5); // 2. alan oto 1. masa
    expect([0, 1, 2].map((a) => tablesInArea(d2, a))).toEqual([4, 1, 0]);
    // B2'nin özü: alan açmak ocak açmaz — servis sayısı 1'de kalır (makette 2. Alan'ın ocağı yok).
    expect(openServices(d2.areasOpen).length).toBe(1);
    expect(d2.services.length).toBe(1);
    // Garson havuzu da alanla çoğalmaz: Salon 1'in iki garsonu (D-142), kat çapında.
    expect(d2.services[THE_SERVICE].waiters).toBe(2);
  });

  it("savunmacı: alan pad'i YOKKEN o alanın pad'leri etki edemez (bozuk kayıt sızamaz)", () => {
    const d = deriveWorld(['z2table2', 'dishwasher']);
    expect(d.areasOpen).toBe(1);
    expect(d.tables.length).toBe(1);
    expect(d.services[THE_SERVICE].hasDishwasher).toBe(false); // 2. alan kapalı → pad sayılmaz
  });

  it('STORE entegrasyon: 2. alan açılır, TEK servis onun masalarını da besler', () => {
    useGame.getState().hardReset();
    useGame.setState({ padsDone: [...Z1_CHAIN] });
    useGame.getState().addMoney(50); // lifetime tabanı
    expect(completePad('zone2')).toBe(true);
    const s0 = useGame.getState();
    expect(s0.areasOpen).toBe(2);
    expect(s0.tables).toBe(5);
    expect(s0.stations).toBe(1); // yeni ocak GELMEDİ
    // Tek servis demlemeye devam eder (oyuncu uzakta).
    useGame.setState({ player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0] });
    for (let i = 0; i < 300 && useGame.getState().ready.tea === 0; i++) useGame.getState().tick(0.1);
    expect(useGame.getState().ready.tea).toBeGreaterThan(0);
    // Oyuncu KATIN TEK noktasından alır.
    stand(SP().station);
    useGame.getState().tick(0.1);
    expect(useGame.getState().tray).toBeGreaterThan(0);
    // 2. alan masasına (global slot >= 4) müşteri oturur.
    let sawArea2Npc = false;
    for (let i = 0; i < 600 && !sawArea2Npc; i++) {
      useGame.getState().tick(0.1);
      sawArea2Npc = useGame.getState().npcs.some((n) => n.tableIndex >= 4);
    }
    expect(sawArea2Npc).toBe(true);
  });

  it('bardak korunumu 2. alanla da GLOBAL: toplam bardak değişmezi sürer', () => {
    useGame.getState().hardReset();
    useGame.setState({ padsDone: [...Z1_CHAIN] });
    useGame.getState().addMoney(50);
    expect(completePad('zone2')).toBe(true);
    for (let i = 0; i < 400; i++) useGame.getState().tick(0.1);
    const s = useGame.getState();
    const drinking = s.npcs.filter((n) => n.state === 'drinking').length;
    const total =
      s.cleanCups + s.ready.tea + s.ready.tost + s.tray + s.trayFood +
      s.carriedDirty + s.carriedDirtyFood + s.dishes.length + drinking +
      s.waiters.reduce((a, w) => a + w.tray + w.trayFood, 0) +
      (s.dishwasher ? s.dishwasher.tray + s.dishwasher.trayFood : 0);
    // B2: havuz açık ALAN sayısıyla büyür (unlockArea +poolBase ile aynı kaynak).
    expect(total).toBe(totalCupPool(s.areasOpen, s.stationLevels));
  });
});

describe('WP1 bug paketi (2026-06-11) — quest-pad gate, zone kamera odağı, offline tavanları', () => {
  it("aktif görevin hedef pad'i requires gate'ini ATLAR (q_table2 verilmişken pad görünür)", () => {
    useGame.getState().hardReset();
    const qi = economyConfig.quests.findIndex((q) => q.id === 'q_table2');
    useGame.setState({ questIndex: qi, questBase: 0 });
    const g = gate();
    expect(g.lifetime).toBeLessThan(20); // minLifetime:20 KARŞILANMIYOR ama görev aktif...
    expect(visiblePads(qi, g).map((p) => p.id)).toEqual(['table2']); // ...pad yine görünür
    // Görev-dışı güvenlik ağında gate hâlâ işler (currentPad requires'a bakar).
    expect(currentPad(g)).toBeNull();
  });

  it('questFocusPos: SERVİS hedefleri TEK noktaya bakar, MASA hedefleri alana (B2)', () => {
    // B2: servisle ilgili her hedef katın tek noktasını gösterir — görevin `area`sı ne olursa olsun.
    for (const a of [0, 1, 2]) {
      expect(questFocusPos({ type: 'stationLevel', level: 1 }, [], 8, a)).toEqual(SP().upgradeSpot);
      expect(questFocusPos({ type: 'washDish', count: 3 }, [], 8, a)).toEqual(SP().dish);
      expect(questFocusPos({ type: 'pickupTea', count: 1 }, [], 8, a)).toEqual(SP().station);
    }
    // Masa hedefi hâlâ ALANA bakar: 2. alanın masası 1. alanın dışında.
    const t = questFocusPos({ type: 'tablesAtLevel', level: 1, count: 1, area: 1 }, [0, 0, 0, 0, 0, 0], 8, 1)!;
    expect(t[0]).toBeGreaterThan(LAYOUT.areaBounds[0].maxX);
    // Config: 2. alan görevleri area:1 işaretli (kamera yanlış salona zoom atmaz).
    for (const q of economyConfig.quests) {
      if (q.id.startsWith('q_z2')) expect(q.area).toBe(1);
    }
  });

  it('offline PARA tavanı: kazanç sıradaki omurga pad maliyetinin oranını aşamaz', () => {
    const frac = economyConfig.offline.capNextPadFrac;
    // Taze oyun: sıradaki pad table2 → dev oran bile tavana kelepçelenir.
    const t2Cost = economyConfig.pads.find((p) => p.id === 'table2')!.cost;
    expect(computeOfflineEarned(100, 3600, [])).toBe(Math.floor(t2Cost * frac));
    // Zone-1 bitti: sıradaki zone2 pad'i → tavan = pad × frac (2026-06-11: frac 1.2 — zone AÇILIR
    // ama salonun İÇİ bitmez: tavan < zone2 + ilk iç pad).
    const z1 = ['table2', 'table3', 'waiter', 'table4', 'waiter2']; // D-142: Salon 1'in son halkası
    const capped = computeOfflineEarned(4, 3600, z1);
    const zone2Cost = economyConfig.pads.find((p) => p.id === 'zone2')!.cost;
    const z2t2Cost = economyConfig.pads.find((p) => p.id === 'z2table2')!.cost;
    expect(capped).toBe(Math.floor(zone2Cost * frac));
    expect(capped).toBeLessThan(zone2Cost + z2t2Cost);
    // Düşük oran tavana takılmaz (normal formül işler).
    expect(computeOfflineEarned(0.05, 600, z1)).toBe(
      Math.floor(0.05 * economyConfig.offline.rateMult * 600),
    );
    // Tüm pad'ler bitti: referans = en pahalı pad (tavansız kalmaz).
    const all = economyConfig.pads.map((p) => p.id);
    const maxCost = Math.max(...economyConfig.pads.map((p) => p.cost));
    expect(computeOfflineEarned(1000, 7200, all)).toBe(Math.floor(maxCost * frac));
  });

  it('offline SÜRE tavanı hâlâ işler (cap üstü süre işlemez) + rateMult 0.5 (2026-06-11 kullanıcı)', () => {
    expect(economyConfig.offline.rateMult).toBe(0.5);
    // Sıradaki pad PAHALI olmalı ki ölçülen şey SÜRE tavanı olsun (para tavanına takılmasın).
    const z1 = ['table2', 'table3', 'waiter', 'table4', 'zone2', 'z2table2', 'z2table3'];
    const oneHour = computeOfflineEarned(0.5, 3600, z1);
    const threeHours = computeOfflineEarned(0.5, 3 * 3600, z1);
    expect(threeHours).toBe(oneHour); // 1sa tavanından sonrası işlemez
    expect(oneHour).toBe(Math.floor(0.5 * economyConfig.offline.rateMult * 3600));
  });

  it('offline oranına masa bahşişleri dahil (2026-06-11): tipTotal orana eklenir', () => {
    const base = incomeRate(4, 0);
    const withTips = incomeRate(4, 0, 4 * economyConfig.tables.tipBase); // 4 masa L1
    // Döngü aynı, gelir payı masa başına +tipBase → oran tam o oranda büyür.
    const cycle = (4 * 5) / base;
    expect(withTips).toBeCloseTo((4 * 5 + 4 * economyConfig.tables.tipBase) / cycle, 6);
    expect(withTips).toBeGreaterThan(base);
  });
});

describe('kozmetik mağaza (WP6, v19) — zone-başına tema satın alma + migrasyon', () => {
  it('satın alma cüzdandan düşer, tema uygulanır, sahiplik kalıcı (geri dönüş ücretsiz)', () => {
    useGame.getState().hardReset();
    const floor = economyConfig.cosmetics.floorThemes.find((t) => t.cost > 0)!;
    // Para yokken satın alınamaz.
    expect(useGame.getState().buyCosmetic('floor', floor.id, 0)).toBe(false);
    expect(useGame.getState().floorThemeByArea[0]).toBe('parke');
    // Yeterli parayla satın alınır + uygulanır + cüzdan düşer.
    useGame.getState().addMoney(floor.cost + 500);
    const before = useGame.getState().wallet.toNumber();
    expect(useGame.getState().buyCosmetic('floor', floor.id, 0)).toBe(true);
    expect(useGame.getState().floorThemeByArea[0]).toBe(floor.id);
    expect(useGame.getState().wallet.toNumber()).toBe(before - floor.cost);
    expect(useGame.getState().ownedCosmetics).toContain(`floor:${floor.id}:z0`);
    // Default'a dön (ücretsiz) + sahip olunan temaya GERİ dönmek de ücretsiz.
    expect(useGame.getState().buyCosmetic('floor', 'parke', 0)).toBe(true);
    const w2 = useGame.getState().wallet.toNumber();
    expect(useGame.getState().buyCosmetic('floor', floor.id, 0)).toBe(true);
    expect(useGame.getState().wallet.toNumber()).toBe(w2); // ikinci kez para düşmez
    // Kapalı zone'a uygulanamaz (areasOpen 1) + tanımsız tema reddedilir.
    expect(useGame.getState().buyCosmetic('wall', 'yesil', 1)).toBe(false);
    expect(useGame.getState().buyCosmetic('floor', 'yok-boyle-tema', 0)).toBe(false);
  });

  it('masa teması KİLİTLİ: 3 salon + tüm açık masalar max olana dek satın alınamaz (2026-06-17)', () => {
    useGame.getState().hardReset();
    const paid = economyConfig.cosmetics.tableThemes.find((t) => t.cost > 0)!;
    useGame.getState().addMoney(paid.cost + 1000);
    // Taze oyun (1 salon, masalar lv0): kilitli → tableThemeUnlocked false, satın alma reddedilir.
    expect(tableThemeUnlocked(useGame.getState())).toBe(false);
    expect(useGame.getState().buyCosmetic('table', paid.id, 0)).toBe(false);
    expect(useGame.getState().tableTheme).toBe('mavi');
    // Sadece 3 salon açık ama masalar lv0: hâlâ kilitli (koşul AND).
    useGame.setState({ areasOpen: 3 });
    expect(tableThemeUnlocked(useGame.getState())).toBe(false);
    expect(useGame.getState().buyCosmetic('table', paid.id, 0)).toBe(false);
    // 3 salon + TÜM açık masalar soft-max: kilit açılır → satın alma çalışır + cüzdan düşer.
    const max = tableSoftMaxLevel();
    const tables = useGame.getState().tables;
    const levels = useGame.getState().tableLevels.slice();
    for (let i = 0; i < tables; i++) levels[i] = max;
    useGame.setState({ tableLevels: levels });
    expect(tableThemeUnlocked(useGame.getState())).toBe(true);
    const before = useGame.getState().wallet.toNumber();
    expect(useGame.getState().buyCosmetic('table', paid.id, 0)).toBe(true);
    expect(useGame.getState().tableTheme).toBe(paid.id);
    expect(useGame.getState().wallet.toNumber()).toBe(before - paid.cost);
  });

});

describe('karakter yükseltmeleri (v20) — eğri, satın alma, migrasyon, görev akışı', () => {
  it('fiyat eğrisi: T1-T2 ucuz, T3-T4 köprülü-pahalı; max kademede null; değerler tasarımla birebir', () => {
    // turu-5 denge (ONAYLI): T3/T4 15k/60k → 5k/18k (köprülü eğri); T2 150→130 (5B).
    // T8a (D-142, G-65): T1 75 → 30. S5 G-92: 30 → 25.
    expect(economyConfig.character.tray.costs).toEqual([25, 130, 5_000, 18_000]);
    expect(charNextCost('tray', 0)).toBe(25);
    expect(charNextCost('tray', 3)).toBe(18_000);
    expect(charNextCost('tray', 4)).toBeNull(); // MAX
    expect(charNextCost('magnet', 2)).toBe(2_200);
    expect(charNextCost('magnet', 3)).toBeNull();
    expect(charNextCost('speed', 0)).toBe(400);
    expect(charMaxTier('tray')).toBe(4);
    expect(charMaxTier('magnet')).toBe(3);
    expect(charMaxTier('speed')).toBe(3);
    // Değer türeticileri (kademe → etkin değer).
    expect(attractRadiusFor(0)).toBeCloseTo(2.6);
    expect(attractRadiusFor(3)).toBeCloseTo(5.0);
    expect(playerSpeedFor(0)).toBeCloseTo(4.5);
    // TAVAN 5,40 → 4,95 (S18 · D-115b): ayak kayması 2,41× → 2,21×. TABAN 4,50'de KALDI —
    // indirmek D-087'nin 20 dk güvencesini kırıyor (ölçüldü; `economy.config.ts` → speed notu).
    expect(playerSpeedFor(3)).toBeCloseTo(4.95);
    expect(charValue('speed', 99)).toBeCloseTo(4.95); // kelepçe
  });

  it('buyCharUpgrade: para yetmezse false; yeterliyse kademe+1, ₺ düşer, XP verir; max\'ta false', () => {
    useGame.getState().hardReset();
    expect(useGame.getState().charUpgrades).toEqual({ tray: 0, magnet: 0, speed: 0 });
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(false); // cüzdan 0
    useGame.getState().addMoney(200);
    const xpBefore = useGame.getState().xp;
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(true);
    const s = useGame.getState();
    expect(s.charUpgrades.tray).toBe(1);
    expect(s.wallet.toNumber()).toBe(175); // 200 - 25 (G-92)
    expect(s.xp).toBe(xpBefore + economyConfig.xp.perUpgrade);
    expect(charLevel(s.charUpgrades)).toBe(1);
    // Max kademede satın alma reddedilir.
    useGame.setState({ charUpgrades: { tray: 4, magnet: 0, speed: 0 } });
    useGame.getState().addMoney(1_000_000);
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(false);
  });

  it('tepsi kapasitesi oyunda kademeden türetilir: yeni oyun 2 bardakla sınırlı, T1 sonrası 3', () => {
    useGame.getState().hardReset();
    // Ocakta 5 hazır çay olsun; oyuncu ocağa yaklaşsın → tepsiye EN FAZLA kapasite kadar alır.
    const st = SP().station;
    useGame.setState({
      ready: { tea: 5, tost: 0 }, cleanCups: 10,
      player: [st[0] + 1.0, 0.6, st[2]], inputKeyboard: [0, 0], inputJoystick: [0, 0],
    });
    useGame.getState().tick(0.1);
    expect(useGame.getState().tray).toBe(2); // kapasite 2 (tier 0)
    // T1 alınca kapasite 3 → kalan çaydan 1 daha alınabilir.
    useGame.setState({ charUpgrades: { tray: 1, magnet: 0, speed: 0 } });
    useGame.getState().tick(0.1);
    expect(useGame.getState().tray).toBe(3);
  });

  it('charStat görevi: q_charTray1 tepsi T1 alınınca tamamlanır; kamera odağı SIÇRAMAZ (3D hedef yok)', () => {
    useGame.getState().hardReset();
    const idx = economyConfig.quests.findIndex((q) => q.id === 'q_charTray1');
    expect(idx).toBeGreaterThan(economyConfig.quests.findIndex((q) => q.id === 'q_table2')); // table2 SONRASI
    expect(idx).toBeLessThan(economyConfig.quests.findIndex((q) => q.id === 'q_serve5')); // q_serve5 ÖNCESİ
    useGame.setState({ questIndex: idx, questBase: 0, camFocus: null });
    // charStat görevinin dünya konumu yok → focusQuest no-op (kamera sıçramaz).
    useGame.getState().focusQuest();
    expect(useGame.getState().camFocus).toBeNull();
    expect(questFocusPos({ type: 'charStat', stat: 'tray', tier: 1 }, [], 1)).toBeNull();
    // Satın al → bir sonraki tick görevi tamamlar, hat ilerler.
    useGame.getState().addMoney(200);
    expect(useGame.getState().buyCharUpgrade('tray')).toBe(true);
    flushQuestTransition(); // bitiş ritmi (completing+gap) akınca hat ilerler
    expect(useGame.getState().questIndex).toBeGreaterThan(idx);
    expect(useGame.getState().quest?.id).toBe('q_serve5');
  });

  it('görev zamanlaması (kullanıcı: "aşırı önemli"): charTray2 q_table3→q_waiter arası; charMagnet q_table4→q_waiterL2 arası; T3/T4 ve hız görevsiz', () => {
    const ids = economyConfig.quests.map((q) => q.id);
    const between = (a: string, x: string, b: string) =>
      ids.indexOf(a) < ids.indexOf(x) && ids.indexOf(x) < ids.indexOf(b);
    expect(between('q_table2', 'q_charTray1', 'q_serve5')).toBe(true);
    expect(between('q_table3', 'q_charTray2', 'q_waiter')).toBe(true);
    expect(between('q_table4', 'q_charMagnet', 'q_waiterL2')).toBe(true);
    // T3/T4 ve hız için görev YOK (bilinçli — "çok zor" hedefler görevle dayatılmaz).
    const charQuests = economyConfig.quests.filter((q) => q.target.type === 'charStat');
    expect(charQuests.length).toBe(3);
    expect(charQuests.some((q) => q.target.type === 'charStat' && q.target.stat === 'speed')).toBe(false);
    expect(
      charQuests.some((q) => q.target.type === 'charStat' && q.target.stat === 'tray' && q.target.tier > 2),
    ).toBe(false);
  });


  it('yeni oyun tepsi 2 başlar (trayCapacityFor 0) — eski "sabit 4" değişti', () => {
    const d = defaultSave();
    expect(d.charUpgrades).toEqual({ tray: 0, magnet: 0, speed: 0 });
    expect(trayCapacityFor(d.charUpgrades.tray)).toBe(2);
    expect(d.charPanelSeen).toBe(false);
  });
});

describe('yükseltme gating (B2) — servis TEK kapıdan, masalar ALAN başına', () => {
  const Z1_FULL = ['table2', 'table3', 'waiter', 'table4'];
  const g = (padsDone: string[], extra: Partial<GateLike> = {}) => ({
    padsDone, tables: 0, stationLevel: 0, lifetime: 0, ...extra,
  });
  type GateLike = {
    padsDone: string[]; tables: number; stationLevel: number; lifetime: number;
    waiterServed?: number; waiterServedByService?: number[];
  };

  it('servis yükseltmesi 2. masayla açılır ve alan açılışlarından ETKİLENMEZ', () => {
    expect(stationUpgradeUnlocked(g([]))).toBe(false);
    expect(stationUpgradeUnlocked(g(['table2']))).toBe(true);
    // Alan açmak servis kapısını değiştirmez (B2: tek servis, tek kapı).
    expect(stationUpgradeUnlocked(g([...Z1_FULL, 'zone2']))).toBe(true);
  });

  it('masa yükseltmeleri: o ALANIN 4 masası açılınca belirir (alan başına ayrı)', () => {
    const half = [...Z1_FULL, 'zone2', 'z2table2', 'z2table3'];
    expect(tableUpgradeUnlockedIn(0, g(Z1_FULL))).toBe(true); // 1. alan dolu
    expect(tableUpgradeUnlockedIn(1, g(half))).toBe(false); // 2. alan dolu değil
    expect(tableUpgradeUnlockedIn(1, g([...half, 'dishwasher', 'z2table4']))).toBe(true);
  });

  it('tick garson taşımasını servis sayacına yazar (tek servis → tek sayaç)', () => {
    useGame.getState().hardReset();
    const before = useGame.getState().stats.waiterServedByService.slice();
    useGame.setState({
      padsDone: ['table2', 'table3', 'waiter'],
      waiters: [{ pos: [...LAYOUT.tables[0].table] as [number, number, number], tray: 1, trayFood: 0 }],
      npcs: [{ id: 1, state: 'waitingForTea', pos: [...LAYOUT.tables[0].seat] as [number, number, number], tableIndex: 0, seatIndex: 0, timer: 18, product: 'tea', color: '#fff' }],
      spawnTimer: 999, player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0],
    });
    for (let i = 0; i < 30 && useGame.getState().stats.waiterServed === 0; i++) useGame.getState().tick(0.1);
    const st = useGame.getState().stats;
    expect(st.waiterServed).toBe(1);
    expect(st.waiterServedByService[THE_SERVICE] ?? 0).toBe((before[THE_SERVICE] ?? 0) + 1);
  });
});

describe('GÖREV HATTI (B2) — servis merdiveni hattın omurgasında', () => {
  const qi = (id: string) => economyConfig.quests.findIndex((q) => q.id === id);

  it('Bölüm sırası: 2. Alan → ocak L3 → bulaşıkçı; tezgâh ve tost 3. Bölümde', () => {
    expect(qi('q_zone2')).toBeGreaterThan(qi('q_charMagnet'));
    expect(qi('q_z2table2')).toBe(qi('q_zone2') + 1); // salon açılır açılmaz görev ORADA
    // Sekiz masa tek ocağı zorlar → 2. alanın hemen ardından ocak L3.
    expect(qi('q_station3')).toBe(qi('q_z2table2') + 1);
    // Bulaşıkçı Bölüm 2'de (plan §4 adım 14), 2. alanın 3. masasından sonra.
    expect(qi('q_dish')).toBeGreaterThan(qi('q_z2table3'));
    expect(qi('q_dish')).toBeLessThan(qi('q_z2table4'));
    // Kimlik anı: TEZGÂH 3. alandan sonra, TOST ondan sonra (tek merdiven, iki kimlik).
    expect(qi('q_counter')).toBeGreaterThan(qi('q_zone3'));
    expect(qi('q_tost')).toBeGreaterThan(qi('q_counter'));
    expect(qi('q_tost5')).toBe(qi('q_tost') + 1); // ürün tanıtımı hemen ardından
    // Alan-başı personel görevleri KALKTI (havuz global).
    expect(qi('q_z2waiter')).toBe(-1);
    expect(qi('q_z3waiter')).toBe(-1);
    expect(qi('q_z2dish')).toBe(-1);
    expect(qi('q_z3dish')).toBe(-1);
  });

  it('servis görevleri seviyeyi SIRAYLA ister (L1 → L2 → L3 → L4 → L5)', () => {
    const levels = economyConfig.quests
      .filter((q) => q.target.type === 'stationLevel')
      .map((q) => (q.target as { level: number }).level);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(levels).toContain(economyConfig.service.counterLevel);
    expect(levels).toContain(economyConfig.service.tostLevel);
  });

  it("her pad görevinin pad'i gerçekten var ve her zorunlu pad'in bir görevi var", () => {
    const padIds = new Set(economyConfig.pads.map((p) => p.id));
    for (const q of economyConfig.quests) {
      if (q.target.type === 'pad') expect(padIds.has((q.target as { id: string }).id)).toBe(true);
    }
    for (const pad of economyConfig.pads) {
      if (pad.optional) continue;
      expect(qi(economyConfig.quests.find((q) => q.target.type === 'pad' && (q.target as { id: string }).id === pad.id)?.id ?? '')).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('görev senkronu v23 — q_z2serve öne + zone-başı servis sayacı + v22→v23 migrasyonu', () => {
  const Z1_FULL = ['table2', 'table3', 'waiter', 'dishwasher', 'table4'];




  it('alanlı serveTea sayacı: 1. alanın servisi 2. alan görevini İLERLETMEZ, 2. alanınki ilerletir', () => {
    const stats = { ...defaultStats(), teasServed: 99, teasServedByArea: [99, 0] };
    const target = { type: 'serveTea', count: 5, area: 1 } as const;
    const ctx = {
      padsDone: [], stationLevel: 0, waiterLevel: 0, tableLevels: [], stats, questBase: 0,
      charUpgrades: { tray: 0, magnet: 0, speed: 0 },
    };
    expect(questCounterValue(target, stats)).toBe(0); // global 99 SIZMAZ
    expect(questTargetMet(target, ctx)).toBe(false);
    stats.teasServedByArea[1] = 5;
    expect(questTargetMet(target, ctx)).toBe(true);
    // alansız hedef eski (global) davranışını korur.
    expect(questCounterValue({ type: 'serveTea', count: 5 }, stats)).toBe(99);
  });

  it('emptyTray (v23+Y1): çaylar atılır, bardaklar TEMİZ havuza döner (korunum); kirliler tepside kalır', () => {
    useGame.getState().hardReset();
    const before = useGame.getState().cleanCups;
    useGame.setState({ tray: 3, cleanCups: before - 3, carriedDirty: 1 });
    useGame.getState().emptyTray('tea');
    const s = useGame.getState();
    expect(s.tray).toBe(0);
    expect(s.cleanCups).toBe(before); // bardak korunumu: 3 bardak temiz rafa döndü
    expect(s.carriedDirty).toBe(1); // kirliler etkilenmez (onlar lavaboya gidiyor)
    // Tepsi boşken no-op.
    useGame.getState().emptyTray('tea');
    expect(useGame.getState().cleanCups).toBe(before);
  });

  it('trayTipSeen kayıt round-trip\'inde korunur (markTrayTipSeen → saveNow → init)', () => {
    // node test ortamında localStorage yok → geçici mock ile gerçek persistence'ı doğrula.
    const mem: Record<string, string> = {};
    const g = globalThis as Record<string, unknown>;
    const orig = g.localStorage;
    g.localStorage = {
      getItem: (k: string) => (k in mem ? mem[k] : null),
      setItem: (k: string, v: string) => { mem[k] = v; },
      removeItem: (k: string) => { delete mem[k]; },
    };
    try {
      useGame.getState().hardReset();
      expect(useGame.getState().trayTipSeen).toBe(false);
      useGame.getState().markTrayTipSeen();
      useGame.getState().init();
      expect(useGame.getState().trayTipSeen).toBe(true);
    } finally {
      g.localStorage = orig;
    }
  });

  it('STORE entegrasyon: oyuncunun z2 masasına el servisi teasServedByArea[1]\'i artırır', () => {
    useGame.getState().hardReset();
    const z2Table = 4; // zone-2 oto-masası (slot 4)
    useGame.setState({
      padsDone: [...Z1_FULL, 'zone2'],
      tray: 1,
      player: [LAYOUT.tables[z2Table].table[0], 0.6, LAYOUT.tables[z2Table].table[2]],
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
      npcs: [
        { id: 970, state: 'waitingForTea', pos: [...LAYOUT.tables[z2Table].seat] as [number, number, number], tableIndex: z2Table, seatIndex: 0, timer: 999, product: 'tea', color: '#27ae60' },
      ],
      spawnTimer: 999,
    });
    useGame.getState().tick(0.1);
    expect(useGame.getState().stats.teasServedByArea[1]).toBe(1);
    expect(useGame.getState().stats.teasServedByArea[0] ?? 0).toBe(0);
  });
});

describe('M2 — 2×2 kat ızgarası (zone-3/4 altyapısı; arka sıra + geçitli duvar + union kelepçe)', () => {
  const Z1 = ['table2', 'table3', 'waiter', 'dishwasher', 'table4'];
  const Z2 = ['zone2', 'z2table2', 'z2waiter', 'z2table3', 'z2dishwasher', 'z2table4'];
  const Z3 = ['zone3', 'z3table2', 'z3waiter', 'z3table3', 'z3dishwasher', 'z3table4'];

  it('deriveWorld: 3. alan zinciri — areasOpen artar, önceki alanlar DOLU kelepçesi genel', () => {
    const d3 = deriveWorld([...Z1, ...Z2, 'zone3']);
    expect(d3.areasOpen).toBe(3);
    expect(openServices(d3.areasOpen).length).toBe(1); // B2: alan 3, servis 1
    expect([0, 1, 2].map((a) => tablesInArea(d3, a))).toEqual([4, 4, 1]); // 3. alan oto 1. masa
    expect(d3.tables.length).toBe(9);
    const dFull = deriveWorld([...Z1, ...Z2, ...Z3]);
    expect(dFull.areasOpen).toBe(3);
    expect([0, 1, 2].map((a) => tablesInArea(dFull, a))).toEqual([4, 4, 4]);
    expect(dFull.tables.length).toBe(12);
  });

  it('STORE: zone-3 açık → müşteri sokaktan girip arka salona oturur (gerçek dt nav; z1↔z2 sınırı duvarsız)', () => {
    useGame.getState().hardReset();
    useGame.setState({
      padsDone: [...Z1, ...Z2, 'zone3'],
      questIndex: economyConfig.quests.length,
      npcs: [],
      spawnTimer: 1e9, // test sırasında başka müşteri belirmesin (deterministik rota)
    });
    useGame.getState().tick(0.05);
    expect(useGame.getState().areasOpen).toBe(3);
    expect(useGame.getState().tables).toBe(9);
    // zone-3'ün ilk masası (slot 8) için sokakta müşteri başlat.
    useGame.setState({
      npcs: [
        { id: 9001, state: 'toTable', pos: [...streetAt(3)] as [number, number, number], tableIndex: 8, seatIndex: 0, timer: 0, product: 'tea', color: '#fff' },
      ],
      spawnTimer: 1e9,
    });
    const dt = 1 / 60; // v23 dersi: nav regresyonları GERÇEK kare adımıyla test edilir
    let seated = false;
    for (let i = 0; i < 60 * 40 && !seated; i++) {
      useGame.getState().tick(dt);
      const n = useGame.getState().npcs.find((x) => x.id === 9001);
      if (!n) break; // vazgeçti = başarısızlık (seated false kalır)
      if (n.state === 'waitingForTea') seated = true;
    }
    expect(seated).toBe(true);
  });

  it('oyuncu union kelepçesi: arka sıra KAPALIYKEN girilmez; zone-3 açılınca sınır DUVARSIZ geçilir', () => {
    useGame.getState().hardReset();
    useGame.setState({
      padsDone: [...Z1, ...Z2],
      questIndex: economyConfig.quests.length,
      npcs: [],
      spawnTimer: 1e9,
      player: parkSpot(2, 8, 1) as [number, number, number], // zone-2 içinde, mobilyadan uzak
      inputKeyboard: [0, -1],
    });
    for (let i = 0; i < 120; i++) useGame.getState().tick(1 / 60);
    expect(useGame.getState().player[2]).toBeGreaterThanOrEqual(LAYOUT.areaBounds[1].minZ - 1e-6);
    // zone-3 açık: z1↔z2 sınırı tamamen duvarsız (2026-06-11) — her x hizasından arka salona yürünür.
    for (const x of [7.0, 11.9]) {
      useGame.setState({
        padsDone: [...Z1, ...Z2, 'zone3'],
        npcs: [],
        spawnTimer: 1e9,
        player: [x, 0.6, -4.0] as [number, number, number],
        inputKeyboard: [0, -1],
      });
      for (let i = 0; i < 240; i++) useGame.getState().tick(1 / 60);
      expect(useGame.getState().player[2]).toBeLessThan(-5.5);
    }
    // ... ve REZERV arka-sol arsa zone-3 açıkken bile KAPALI.
    useGame.setState({
      npcs: [],
      spawnTimer: 1e9,
      player: parkSpot(1, 4, 0) as [number, number, number], // zone-1 içinde, mobilyadan uzak
      inputKeyboard: [0, -1],
    });
    for (let i = 0; i < 120; i++) useGame.getState().tick(1 / 60);
    expect(useGame.getState().player[2]).toBeGreaterThanOrEqual(LAYOUT.areaBounds[0].minZ - 1e-6);
    useGame.setState({ inputKeyboard: [0, 0] });
  });
});

describe('TOST (B2) — ürün SERVİS SEVİYESİNDEN gelir, bölgeden değil', () => {
  const Z1 = ['table2', 'table3', 'waiter', 'table4'];
  const Z2 = ['zone2', 'z2table2', 'z2table3', 'dishwasher', 'z2table4'];
  const OPEN3 = [...Z1, ...Z2, 'zone3'];
  const TOST_LV = economyConfig.service.tostLevel;

  it('L5 altında tost YOK: menü tek ürün, tost payı 0 → müşteriler yalnız çay ister', () => {
    useGame.getState().hardReset();
    useGame.setState({
      padsDone: [...OPEN3],
      questIndex: economyConfig.quests.length,
      stationLevels: [TOST_LV - 1],
      npcs: [], spawnTimer: 0,
    });
    for (let i = 0; i < 600; i++) useGame.getState().tick(0.1);
    const s2 = useGame.getState();
    expect(s2.npcs.length).toBeGreaterThan(0);
    expect(s2.npcs.every((n) => n.product === 'tea')).toBe(true);
    expect(s2.ready.tost).toBe(0); // tezgâh tost DEMLEMEZ
  });

  it('L5te tost açılır: müşterilerin bir kısmı tost ister, tezgâh iki kuyruğa üretir', () => {
    useGame.getState().hardReset();
    useGame.setState({
      padsDone: [...OPEN3],
      questIndex: economyConfig.quests.length,
      stationLevels: [TOST_LV],
      npcs: [], spawnTimer: 0,
      player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0],
    });
    let sawTostCustomer = false;
    let sawTostReady = false;
    for (let i = 0; i < 3000 && !(sawTostCustomer && sawTostReady); i++) {
      useGame.getState().tick(0.1);
      const st = useGame.getState();
      if (st.npcs.some((n) => n.product === 'tost')) sawTostCustomer = true;
      if (st.ready.tost > 0) sawTostReady = true;
    }
    expect(sawTostCustomer).toBe(true);
    expect(sawTostReady).toBe(true);
  });

  it('tepsi bölmeleri: tost trayFooda gider; tost müşterisi ÇAYLA doyurulamaz, tostla doyar', () => {
    useGame.getState().hardReset();
    useGame.setState({
      padsDone: [...OPEN3],
      questIndex: economyConfig.quests.length,
      stationLevels: [TOST_LV],
      npcs: [], spawnTimer: 1e9,
      tray: 0, trayFood: 0, carriedDirty: 0,
    });
    useGame.getState().tick(0.05); // türetme otursun
    const st = SP(3).station; // OPEN3 → üç alan açık: servis ARKA BANTTA (B3-1/D-062)
    useGame.setState({
      ready: { tea: 0, tost: 2 },
      player: [st[0], 0.6, st[2]], npcs: [], spawnTimer: 1e9,
    });
    useGame.getState().tick(0.05);
    expect(useGame.getState().trayFood).toBeGreaterThan(0); // tost trayFood'a gitti
    expect(useGame.getState().tray).toBe(0);
    // TOST isteyen müşteri: çayla servis OLMAZ, tostla OLUR.
    const t8 = LAYOUT.tables[8];
    useGame.setState({
      npcs: [{ id: 5, state: 'waitingForTea', pos: [...t8.seat] as [number, number, number], tableIndex: 8, seatIndex: 0, timer: 999, product: 'tost', color: '#fff' }],
      tray: 1, trayFood: 0,
      player: [t8.table[0], 0.6, t8.table[2] + 0.9],
      spawnTimer: 1e9,
    });
    useGame.getState().tick(0.05);
    expect(useGame.getState().npcs[0].state).toBe('waitingForTea'); // çay tost yerine geçmedi
    useGame.setState({ trayFood: 1 });
    useGame.getState().tick(0.05);
    expect(useGame.getState().npcs[0].state).toBe('drinking');
    expect(useGame.getState().trayFood).toBe(0);
    expect(useGame.getState().tray).toBe(1); // çaya dokunulmadı
    expect(useGame.getState().stats.tostServed).toBe(1); // B2: tost'un KENDİ sayacı
    expect(useGame.getState().stats.teasServedByArea[2]).toBe(1); // alan sayacı ürünle ilgilenmez
  });

  it('tost müşterisi ÜRÜN fiyatı öder (25 + bahşiş 0) ve kirli TABAK bırakır', () => {
    useGame.getState().hardReset();
    useGame.setState({
      padsDone: [...OPEN3],
      questIndex: economyConfig.quests.length, // q_wash geçildi → kirli bırakılır
      stationLevels: [TOST_LV],
      npcs: [{ id: 7, state: 'drinking', pos: [...LAYOUT.tables[8].seat] as [number, number, number], tableIndex: 8, seatIndex: 0, timer: 0.02, product: 'tost', color: '#fff' }],
      spawnTimer: 1e9,
      player: PARK,
    });
    useGame.getState().tick(0.1);
    const s2 = useGame.getState();
    expect(s2.coins.length).toBe(1);
    expect(s2.coins[0].value).toBe(25); // PRODUCTS.tost.price (masa L0 → bahşiş yok)
    expect(s2.dishes.length).toBe(1);
    expect(s2.dishes[0].kind).toBe('plate');
  });

  it('MALİYET: tek merdiven, tek eğri — üst basamaklar (tezgâh/tost) kendi ağırlığını taşır', () => {
    // B2: "ürünün maliyet çarpanı" kalktı; her seviyenin fiyatı costsByLevel'dan gelir.
    for (let lv = 0; lv < economyConfig.service.upgrade.maxLevel; lv++) {
      expect(stationUpgradeCostAt(THE_SERVICE, lv)).toBe(stationUpgradeCost(lv));
    }
    // Tezgâh (L4) ve tost (L5) basamakları erken basamaklardan BELİRGİN pahalı olmalı —
    // yoksa oyun tostu 20. dakikada verir (B2 denge bulgusu).
    const early = stationUpgradeCost(economyConfig.service.counterLevel - 2);
    const counter = stationUpgradeCost(economyConfig.service.counterLevel - 1);
    const tost = stationUpgradeCost(economyConfig.service.tostLevel - 1);
    expect(counter).toBeGreaterThan(early * 10);
    expect(tost).toBeGreaterThan(counter);
  });

  it('emptyTray (Y1): çay ve tost AYRI boşaltılır (kind) — kaplar ortak temiz havuza döner, kirliler kalır', () => {
    useGame.getState().hardReset();
    const clean0 = useGame.getState().cleanCups;
    useGame.setState({ tray: 1, trayFood: 2, carriedDirty: 1 });
    // Önce yalnız TOSTLAR bırakılır — çay tepside kalır.
    useGame.getState().emptyTray('food');
    let s2 = useGame.getState();
    expect(s2.trayFood).toBe(0);
    expect(s2.tray).toBe(1);
    expect(s2.cleanCups).toBe(clean0 + 2);
    // Sonra çaylar — toplam korunum tamamlanır; kirli tepsiden inmez (lavaboya gidecek).
    useGame.getState().emptyTray('tea');
    s2 = useGame.getState();
    expect(s2.tray).toBe(0);
    expect(s2.carriedDirty).toBe(1);
    expect(s2.cleanCups).toBe(clean0 + 3);
  });
});

describe('SERVİS NOKTASI (B2) — tek nokta, tek yerleşim, tek rota', () => {
  it("yerleşim: TEK servis, 1-2. Alan'da sol duvarda (uzun kenar z), 3. Alan'da arka bantta (uzun kenar x)", () => {
    // B3-1 (D-062): maket v13 adım 3 ocağı arka banda taşır → yerleşim areasOpen'a bağlı.
    expect(SP(1).areaIndex).toBe(0);
    expect(SP(2).areaIndex).toBe(0);
    expect(SP(3).areaIndex).toBe(2);
    // Sol duvar dönemi: modül duvara paralel → uzun kenar z'de.
    expect(SP(1).half[1]).toBeGreaterThan(SP(1).half[0]);
    // Arka bant dönemi: tezgâh salona bakar → uzun kenar x'te, ön yüz +z.
    expect(SP(3).half[0]).toBeGreaterThan(SP(3).half[1]);
    expect(SP(3).rot).toBe(0);
    // Her iki yerde de: pickup ön yüzde, yükseltme noktası çay-alma dairesinin dışında.
    for (const areasOpen of [1, 3]) {
      const sp2 = SP(areasOpen);
      // H1/O3: yükseltme noktası tezgâhın gövde tetiğinin DIŞINDA olmalı (gardiyan onu yutmasın).
      expect(atServiceBody(sp2.upgradeSpot[0], sp2.upgradeSpot[2], sp2, economyConfig.serving.pickupReach)).toBe(false);
      expect(boxDist2D(sp2.pickup[0], sp2.pickup[2], sp2.station, sp2.half)).toBeLessThanOrEqual(economyConfig.serving.pickupReach);
    }
  });

  it('rota: garson evinden pickupa VE oradan KATIN HER MASASINA gidebilir (tek servis 12 masaya bakar)', () => {
    useGame.getState().hardReset();
    const OPEN3 = ['table2', 'table3', 'waiter', 'table4',
      'zone2', 'z2table2', 'z2table3', 'dishwasher', 'z2table4', 'zone3',
      'z3table2', 'z3table3', 'z3table4'];
    useGame.setState({ padsDone: [...OPEN3], questIndex: economyConfig.quests.length });
    useGame.getState().tick(0.05); // türetilen sayılar otursun (12 masa)
    const solids = [
      { c: SP().station, h: SP().half },
      { c: SP().dish, h: SP().dishHalf },
      ...LAYOUT.tables.map((t) => ({ c: t.table, h: LAYOUT.tableHalf })),
    ];
    const grid = buildNavGrid(LAYOUT.area, 0.3, solids, LAYOUT.actorRadius);
    const home = SP().waiterHome;
    const pickup = SP().pickup;
    expect(findNavPath(grid, [...home] as [number, number, number], pickup[0], pickup[2], 0.45)).not.toBeNull();
    for (const t of LAYOUT.tables) {
      expect(findNavPath(grid, [...pickup] as [number, number, number], t.table[0], t.table[2], 1.5)).not.toBeNull();
    }
  });

  it('yeni oyun: her salon parke zeminle doğar (yemek zemini artık alana bağlı DEĞİL)', () => {
    useGame.getState().hardReset();
    expect(useGame.getState().floorThemeByArea).toEqual(['parke', 'parke', 'parke']);
    // 'yemek' teması mağazada duruyor (ücretsiz) — oyuncu isterse seçer.
    const t = economyConfig.cosmetics.floorThemes.find((x) => x.id === 'yemek');
    expect(t).toBeTruthy();
    expect(t!.cost).toBe(0);
  });
});

describe('M3 — müşteri tavanı masalarla ölçeklenir (arka salon açlığı fix)', () => {
  it('9+ masada 8 müşteri tavanı aşılır: ön masalar doluyken tost salonuna müşteri DOĞAR', () => {
    const OPEN3 = ['table2', 'table3', 'waiter', 'dishwasher', 'table4',
      'zone2', 'z2table2', 'z2waiter', 'z2table3', 'z2dishwasher', 'z2table4', 'zone3'];
    useGame.getState().hardReset();
    useGame.setState({ padsDone: [...OPEN3], questIndex: economyConfig.quests.length });
    useGame.getState().tick(0.05);
    // Ön 8 masayı oturan müşteriyle doldur (eski tavan 8'i tüketir).
    const sitters = Array.from({ length: 8 }, (_, i) => ({
      id: 8000 + i,
      state: 'waitingForTea' as const,
      pos: [...LAYOUT.tables[i].seat] as [number, number, number],
      tableIndex: i,
      seatIndex: 0,
      timer: 999,
      color: '#fff',
    }));
    useGame.setState({ npcs: sitters, spawnTimer: 0, player: PARK });
    useGame.getState().tick(0.1); // spawn denemesi
    const s = useGame.getState();
    const newcomer = s.npcs.find((n) => n.id < 8000 || n.id > 8007);
    expect(newcomer).toBeTruthy(); // 9. müşteri doğdu (eski sabit tavanda doğmazdı)
    expect(newcomer!.tableIndex).toBe(8); // hedefi tost salonunun ilk masası
  });
});

describe('Y2 — koltuk + grup sistemi (plan §2)', () => {
  it('koltuk sayısı masa seviyesinden türetilir: 1/2/2/4/4 + kelepçe', () => {
    // B5a: merdiven masa TİPİNE ait — dörtlü L3'te dörde çıkar, banket ikilisi 2'de TAVANLANIR.
    expect(economyConfig.tables.seatsByLevel.four).toEqual([1, 2, 2, 4, 4]);
    expect(economyConfig.tables.seatsByLevel.deuce).toEqual([1, 2, 2, 2, 2]);
    expect([0, 1, 2, 3, 4].map((l) => tableSeats(l))).toEqual([1, 2, 2, 4, 4]);
    expect([0, 1, 2, 3, 4].map((l) => tableSeats(l, 'deuce'))).toEqual([1, 2, 2, 2, 2]);
    expect(tableSeats(9)).toBe(4); // aşırı seviye son değere kelepçelenir
    expect(tableSeats(9, 'deuce')).toBe(2);
    expect(tableSeats(-1)).toBe(1);
  });

  it('grup zarı deterministik: %30→1, %35→2, %20→3, %15→4 (sınır değerleriyle)', () => {
    expect(economyConfig.npc.groupChances).toEqual([0.3, 0.35, 0.2, 0.15]);
    expect(rollGroupSize(0)).toBe(1);
    expect(rollGroupSize(0.299)).toBe(1);
    expect(rollGroupSize(0.3)).toBe(2);
    expect(rollGroupSize(0.649)).toBe(2);
    expect(rollGroupSize(0.65)).toBe(3);
    expect(rollGroupSize(0.849)).toBe(3);
    expect(rollGroupSize(0.85)).toBe(4);
    expect(rollGroupSize(0.999)).toBe(4);
  });

  it('koltuk pozisyonları: seats[0] eski .seat ile birebir; ön çeyrek kare, orta şerit banket birimi', () => {
    for (const t of LAYOUT.tables) {
      expect(t.seats.length).toBeGreaterThanOrEqual(2);
      expect(t.seats[0]).toEqual(t.seat);
      // Y2 tek kaynak: koltuk sayısı = ofset sayısı = görsel tip sayısı (Tables.tsx aynı listeden çizer).
      expect(t.seatOffsets).toHaveLength(t.seats.length);
      expect(t.seatKinds).toHaveLength(t.seats.length);
    }
    const expectOffsets = (ti: number, want: [number, number][]) => {
      const t = LAYOUT.tables[ti];
      expect(t.seats).toHaveLength(want.length);
      t.seats.forEach((s, k) => {
        expect(s[0] - t.table[0]).toBeCloseTo(want[k][0], 6);
        expect(s[2] - t.table[2]).toBeCloseTo(want[k][1], 6);
      });
    };
    // Ön çeyrekler: dört yanı tabure olan kare masa (dört koltuk da 'stool').
    // D-073: maketin SEATS4'ü — koltuk merkezden ∓1,45 (masa 1,75 olunca ∓0,78 tablanın içinde kalıyordu).
    const KARE: [number, number][] = [[0, 1.45], [0, -1.45], [1.45, 0], [-1.45, 0]];
    expectOffsets(0, KARE);
    expect(LAYOUT.tables[0].seatKinds).toEqual(['stool', 'stool', 'stool', 'stool']);
    // B3-2 orta şerit: banket birimi İKİ koltuk — 0 bank (ada oturağı, ayrı tabure çizilmez),
    // 1 karşı sandalye. Ofsetler maket v13'ün birim geometrisi (bank 0,74 · masa 1,85 · sandalye 2,95).
    expectOffsets(8, [[0, -(BANKET.tableDz - BANKET.benchDz)], [0, BANKET.chairDz - BANKET.tableDz]]);
    expect(LAYOUT.tables[8].seatKinds).toEqual(['bench', 'stool']);
    expect(LAYOUT.tables[9].seatKinds).toEqual(['bench', 'stool']);
  });

  it('grup spawn: L3 masada (4 koltuk) 4 kişilik grup AYNI masaya FARKLI koltuklarla doğar', () => {
    useGame.getState().hardReset();
    useGame.setState({ tableLevels: [3, 0, 0, 0], spawnTimer: 0, player: PARK });
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.99); // zar → 4 kişilik grup
    try {
      useGame.getState().tick(0.05);
    } finally {
      rnd.mockRestore();
    }
    const npcs = useGame.getState().npcs;
    expect(npcs).toHaveLength(4);
    expect(npcs.every((n) => n.tableIndex === 0)).toBe(true);
    expect(new Set(npcs.map((n) => n.seatIndex))).toEqual(new Set([0, 1, 2, 3]));
    // Sokakta hafif saçılmış (üst üste binmesin).
    const xs = new Set(npcs.map((n) => n.pos[0].toFixed(2)));
    expect(xs.size).toBe(4);
  });

  it("koltuk yetmezse grup KÜÇÜLÜR: L1 masada (2 koltuk) 4'lük zar 2 kişi doğurur", () => {
    useGame.getState().hardReset();
    useGame.setState({ tableLevels: [1, 0, 0, 0], spawnTimer: 0, player: PARK });
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      useGame.getState().tick(0.05);
    } finally {
      rnd.mockRestore();
    }
    const npcs = useGame.getState().npcs;
    expect(npcs).toHaveLength(2);
    expect(new Set(npcs.map((n) => n.seatIndex))).toEqual(new Set([0, 1]));
  });

  it('müşteri tavanı KOLTUK+2: 16 koltuk doluyken +2 taşma sonrası spawn durur; boş koltuk atlanarak atanır', () => {
    useGame.getState().hardReset();
    useGame.setState({
      padsDone: ['table2', 'table3', 'table4'],
      tableLevels: [4, 4, 4, 4], // 4 masa × 4 koltuk = 16; tavan = 18
      questIndex: economyConfig.quests.length,
      player: PARK,
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
    });
    // 15 oturan (masa 3'ün 3. koltuğu + 1 koltuk daha boş) + 2 yürüyen = 17 aktif → tavana 1 yer.
    const sitters = [];
    let id = 7000;
    for (let t = 0; t < 4; t++) {
      for (let k = 0; k < 4; k++) {
        if (t === 3 && (k === 3 || k === 2)) continue; // masa 3'te 2 koltuk boş
        const seat = LAYOUT.tables[t].seats[k];
        sitters.push({
          id: id++, state: 'waitingForTea' as const, pos: [...seat] as [number, number, number],
          tableIndex: t, seatIndex: k, timer: 999, color: '#fff',
        });
      }
    }
    // 2 de yolda (toTable, masa 3 koltuk 2'ye atanmış + ekstra biri koltuk 3'e) → aktif 16.
    sitters.push({
      id: id++, state: 'toTable' as const, pos: [...streetAt(1)] as [number, number, number],
      tableIndex: 3, seatIndex: 2, timer: 0, product: 'tea', color: '#fff',
    });
    sitters.push({
      id: id + 1, state: 'toTable' as const, pos: [...streetAt(1)] as [number, number, number],
      tableIndex: 3, seatIndex: 3, timer: 0, product: 'tea', color: '#fff',
    });
    useGame.setState({ npcs: sitters, spawnTimer: 0 });
    expect(useGame.getState().npcs.filter((n) => n.state !== 'leaving')).toHaveLength(16);
    // Koltuklar TAM dolu (16/16) ama tavan 18 → boş koltuk yok → spawn OLMAZ.
    useGame.getState().tick(0.05);
    expect(useGame.getState().npcs.filter((n) => n.state !== 'leaving')).toHaveLength(16);
    // Bir koltuk boşalt (masa 3 koltuk 3 yolcusu gider) → 15 aktif → spawn 1 kişi, KOLTUK 3'e (atlanarak).
    useGame.setState({
      npcs: useGame.getState().npcs.filter((n) => !(n.tableIndex === 3 && n.seatIndex === 3)),
      spawnTimer: 0,
    });
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.99); // 4'lük zar bile 1'e kelepçelenir
    try {
      useGame.getState().tick(0.05);
    } finally {
      rnd.mockRestore();
    }
    const active = useGame.getState().npcs.filter((n) => n.state !== 'leaving');
    expect(active).toHaveLength(16);
    const newcomer = active.find((n) => n.id < 7000);
    expect(newcomer).toBeTruthy();
    expect(newcomer!.tableIndex).toBe(3);
    expect(newcomer!.seatIndex).toBe(3); // dolu koltuklar atlandı
  });

  it('kirli eşik koltukla ölçeklenir: L3 masada (4 koltuk) 8 kap temiz, 9 kap kirli; L0 eski davranış (>2)', () => {
    const T = economyConfig.cups.dirtyThreshold;
    const dishOn = (idx: number, id: number) => ({
      id, pos: [0, 0.95, 0] as [number, number, number], tableIndex: idx,
    });
    // L3 (4 koltuk): eşik = 2×4 = 8.
    const eight = Array.from({ length: T * 4 }, (_, i) => dishOn(0, 100 + i));
    expect(dirtyTables(eight, [3]).has(0)).toBe(false);
    const nine = Array.from({ length: T * 4 + 1 }, (_, i) => dishOn(0, 200 + i));
    expect(dirtyTables(nine, [3]).has(0)).toBe(true);
    // L0 (1 koltuk): eski eşik aynen (>2). Seviye verilmezse de L0 varsayılır.
    const three = Array.from({ length: T + 1 }, (_, i) => dishOn(0, 300 + i));
    expect(dirtyTables(three, [0]).has(0)).toBe(true);
    expect(dirtyTables(three).has(0)).toBe(true);
  });

  it('GERÇEK-DT (1/60): 2 kişilik grup sokaktan yürür, farklı koltuklara oturur, bireysel servis + bireysel ödeme', () => {
    useGame.getState().hardReset();
    useGame.setState({
      tableLevels: [1, 0, 0, 0], // 2 koltuk
      spawnTimer: 0,
      player: PARK,
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
    });
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.5); // zar → 2 kişilik grup
    try {
      useGame.getState().tick(1 / 60);
      const born = useGame.getState().npcs;
      expect(born).toHaveLength(2);
      // Gerçek kare adımıyla yürüyüp OTURMALILAR (sabır bitmeden; nav regresyonu).
      const dt = 1 / 60;
      for (let i = 0; i < 20 * 60 && !useGame.getState().npcs.every((n) => n.state === 'waitingForTea'); i++) {
        useGame.getState().tick(dt);
      }
      const seated = useGame.getState().npcs;
      expect(seated).toHaveLength(2);
      expect(seated.every((n) => n.state === 'waitingForTea')).toBe(true);
      // Farklı koltuklarda oturuyorlar (pozisyon = atanan koltuk).
      const t0 = LAYOUT.tables[0];
      for (const n of seated) {
        expect(n.pos[0]).toBeCloseTo(t0.seats[n.seatIndex][0], 5);
        expect(n.pos[2]).toBeCloseTo(t0.seats[n.seatIndex][2], 5);
      }
      expect(new Set(seated.map((n) => n.seatIndex)).size).toBe(2);
      // Oyuncu tepside 2 çayla masaya gelir → İKİSİNE de tek durakta servis.
      useGame.setState({ tray: 2, player: [t0.table[0], 0.6, t0.table[2] + 1.2] });
      useGame.getState().tick(dt);
      const drinking = useGame.getState().npcs;
      expect(drinking.every((n) => n.state === 'drinking')).toBe(true);
      expect(useGame.getState().tray).toBe(0);
      // İçince HER ÜYE bireysel öder (2 ayrı para; değer = çay + L1 bahşiş).
      useGame.setState({
        npcs: drinking.map((n) => ({ ...n, timer: 0.01 })),
        player: PARK,
        coins: [],
      });
      useGame.getState().tick(dt);
      const coins = useGame.getState().coins;
      expect(coins).toHaveLength(2);
      for (const c of coins) expect(c.value).toBe(TEA_PRICE + tableTip(1));
    } finally {
      rnd.mockRestore();
    }
  });
});

describe('v27 — görev hedefleri + dolum süreleri (telefon feedback 2026-06-12)', () => {







  it('tablesAtLevel: N masa hedef seviyede (alan dilimli ve global)', () => {
    const ctx = {
      padsDone: [], stationLevels: [0, 0, 0], waiterLevel: 0,
      tableLevels: [2, 1, 2, 0, 3, 2, 0, 0], stats: defaultStats(), questBase: 0,
      charUpgrades: { tray: 0, magnet: 0, speed: 0 }, waiterUpgrades: { tray: 0, speed: 0 },
    };
    expect(questTargetMet({ type: 'tablesAtLevel', level: 2, count: 2 }, ctx)).toBe(true); // global 4 adet
    expect(questTargetMet({ type: 'tablesAtLevel', level: 3, count: 2 }, ctx)).toBe(false); // L3+ tek masa
    expect(questTargetMet({ type: 'tablesAtLevel', level: 2, count: 2, area: 0 }, ctx)).toBe(true); // a0: 2 adet
    expect(questTargetMet({ type: 'tablesAtLevel', level: 2, count: 3, area: 0 }, ctx)).toBe(false);
    expect(questTargetMet({ type: 'tablesAtLevel', level: 2, count: 2, area: 1 }, ctx)).toBe(true); // a1: [3,2,..]
  });

  it('stationLevel hedefi TEK servise bakar (B2: servis parametresi kalktı)', () => {
    const ctx = {
      padsDone: [], stationLevels: [3], waiterLevel: 0, tableLevels: [],
      stats: defaultStats(), questBase: 0,
      charUpgrades: { tray: 0, magnet: 0, speed: 0 }, waiterUpgrades: { tray: 0, speed: 0 },
    };
    expect(questTargetMet({ type: 'stationLevel', level: 3 }, ctx)).toBe(true);
    expect(questTargetMet({ type: 'stationLevel', level: 4 }, ctx)).toBe(false);
  });

  it('waiterTray hedefi + eğri türeticileri (Y3 · D-142): kapasite 2+kademe, tavan 2 kademe (4 bardak)', () => {
    const ctx = {
      padsDone: [], stationLevels: [], waiterLevel: 0, tableLevels: [],
      stats: defaultStats(), questBase: 0,
      charUpgrades: { tray: 0, magnet: 0, speed: 0 }, waiterUpgrades: { tray: 1, speed: 0 },
    };
    // B2: tek havuz → tek eğri (tür parametresi kalktı).
    expect(questTargetMet({ type: 'waiterTray', tier: 1 }, ctx)).toBe(true);
    expect(questTargetMet({ type: 'waiterTray', tier: 2 }, ctx)).toBe(false);
    // D-142 (G-72): garson 2'li başlar, ₺400'lük ilk kademe düştü; tavan yine 4 bardak.
    expect(waiterTrayCapacityFor(0)).toBe(2);
    expect(waiterTrayCapacityFor(2)).toBe(4);
    expect(waiterTrayCapacityFor(9)).toBe(4); // kelepçe
    expect(waiterTrayMaxTier()).toBe(2);
    expect(waiterTrayNextCost(0)).toBe(1200);
    expect(waiterTrayNextCost(2)).toBeNull();
  });

  it('kamera odağı: servis görevleri TEK noktaya, masa görevleri masaya bakar', () => {
    // B2: hangi salonun görevi olursa olsun servis hedefi katın tek noktasını gösterir.
    expect(questFocusPos({ type: 'serveTea', count: 5, area: 1 }, [], 8, 1)).toEqual(SP().station);
    expect(questFocusPos({ type: 'serveTea', count: 5, area: 2 }, [], 12, 2)).toEqual(SP().station);
    expect(questFocusPos({ type: 'stationLevel', level: 4 }, [], 12, 2)).toEqual(SP().upgradeSpot);
    // tablesAtLevel: hedef seviyenin altındaki ilk masanın yükseltme noktası.
    expect(questFocusPos({ type: 'tablesAtLevel', level: 2, count: 2 }, [2, 1, 0, 0], 4)).toEqual(LAYOUT.tables[1].upgradeSpot);
    // waiterTray panel görevi: 3D hedef yok (kamera sıçramaz).
    expect(questFocusPos({ type: 'waiterTray', tier: 1 }, [], 4)).toBeNull();
  });

  it('dolum süreleri: pad dwell ≤ 3.5sn, yükseltme dolumu 1-3.5sn kelepçeli (turu-4 ikinci ayar)', () => {
    for (const p of economyConfig.pads) {
      const t = p.cost / p.fillRate;
      expect(t).toBeLessThanOrEqual(3.55); // turu-4 ikinci ayar: tavan 3.5sn (kullanıcı "3-3.5 olsun")
      expect(t).toBeGreaterThanOrEqual(1.0);
    }
    expect(upgradeFillRateFor(20)).toBeCloseTo(20); // 20₺ → 1sn (erken: çok kısa olmaz)
    expect(upgradeFillRateFor(120)).toBeCloseTo(60); // orta bant eski hızla aynı
    expect(1350 / upgradeFillRateFor(1350)).toBeCloseTo(3.5); // tost L4: 22.5sn → 3.5sn tavan
  });
});

describe('Y3 — garson tepsi yükseltmeleri (panel satın alma + FSM kapasite + tek durakta çoklu teslim)', () => {
  it('buyWaiterTray: yetersiz bakiye false; alımda kademe artar + cüzdan düşer; tavanda false', () => {
    useGame.getState().hardReset();
    useGame.setState({ wallet: D(100) });
    expect(useGame.getState().buyWaiterTray()).toBe(false); // 1200 > 100
    useGame.setState({ wallet: D(10000) });
    expect(useGame.getState().buyWaiterTray()).toBe(true);
    expect(useGame.getState().waiterUpgrades.tray).toBe(1);
    expect(useGame.getState().wallet.toNumber()).toBe(10000 - 1200);
    // Tavan: 2 kademe (D-142: taban 2, ilk kademe düştü).
    useGame.setState({ wallet: D(1e9), waiterUpgrades: { ...defaultWaiterUpgrades(), tray: 2 } });
    expect(useGame.getState().buyWaiterTray()).toBe(false);
  });

  it('garson yüklemede tepsiyi KAPASİTE kadar doldurur (kademe 1 → 3 bardak)', () => {
    useGame.getState().hardReset();
    const pick = SP().pickup;
    const farSeat = LAYOUT.tables[1].seat;
    useGame.setState({
      padsDone: ['table2', 'waiter'],
      waiters: [{ pos: [pick[0], 0.6, pick[2]] as [number, number, number], tray: 0, trayFood: 0 }],
      waiterUpgrades: { ...defaultWaiterUpgrades(), tray: 1 },
      player: PARK,
      inputKeyboard: [0, 0], inputJoystick: [0, 0],
      npcs: [
        { id: 950, state: 'waitingForTea', pos: [...farSeat] as [number, number, number], tableIndex: 1, seatIndex: 0, timer: 17, product: 'tea', color: '#27ae60' },
      ],
      spawnTimer: 999,
    });
    useGame.setState({ ready: { tea: 5, tost: 0 } });
    useGame.getState().tick(0.1);
    expect(useGame.getState().waiters[0]?.tray).toBe(3); // taban 2 + kademe 1 (D-142)
    expect(useGame.getState().ready.tea).toBe(2);
  });

  it('garson AYNI masada bekleyen herkese TEK durakta bırakır; artan çay tepside kalır', () => {
    useGame.getState().hardReset();
    const seat = LAYOUT.tables[0].seat;
    useGame.setState({
      padsDone: ['table2', 'waiter'],
      waiters: [{ pos: [seat[0], 0.6, seat[2]] as [number, number, number], tray: 3, trayFood: 0 }],
      waiterUpgrades: { ...defaultWaiterUpgrades(), tray: 2 },
      player: PARK,
      inputKeyboard: [0, 0], inputJoystick: [0, 0],
      npcs: [
        { id: 960, state: 'waitingForTea', pos: [...seat] as [number, number, number], tableIndex: 0, seatIndex: 0, timer: 5, product: 'tea', color: '#fff' },
        { id: 961, state: 'waitingForTea', pos: [seat[0] + 0.4, 0.6, seat[2]] as [number, number, number], tableIndex: 0, seatIndex: 1, timer: 9, product: 'tea', color: '#fff' },
        { id: 962, state: 'waitingForTea', pos: [...LAYOUT.tables[1].seat] as [number, number, number], tableIndex: 1, seatIndex: 0, timer: 12, product: 'tea', color: '#fff' },
      ],
      spawnTimer: 999,
    });
    useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.npcs.find((n) => n.id === 960)?.state).toBe('drinking');
    expect(s.npcs.find((n) => n.id === 961)?.state).toBe('drinking'); // aynı masa → aynı durakta
    expect(s.npcs.find((n) => n.id === 962)?.state).toBe('waitingForTea'); // başka masa → sıradaki tur
    expect(s.waiters[0]?.tray).toBe(1); // 3 − 2 teslim
    expect(s.stats.waiterServed).toBe(2);
  });

  it('KARIŞIK tepsi (B2): tek garson hem çay hem tost taşır, kapasite ORTAK', () => {
    useGame.getState().hardReset();
    const Z1 = ['table2', 'table3', 'waiter', 'table4'];
    const pick = SP().pickup;
    const seat1 = LAYOUT.tables[1].seat;
    useGame.setState({
      padsDone: [...Z1],
      questIndex: economyConfig.quests.length,
      stationLevels: [economyConfig.service.tostLevel],
      waiters: [{ pos: [pick[0], 0.6, pick[2]] as [number, number, number], tray: 0, trayFood: 0 }],
      waiterUpgrades: { ...defaultWaiterUpgrades(), tray: 0 }, // kapasite 2 (D-142: taban 2)
      player: PARK,
      inputKeyboard: [0, 0], inputJoystick: [0, 0],
      npcs: [
        // Bekleyen TOST müşterisi → garson önce onun ürününü yükler.
        { id: 970, state: 'waitingForTea', pos: [...seat1] as [number, number, number], tableIndex: 1, seatIndex: 0, timer: 17, product: 'tost', color: '#fff' },
      ],
      spawnTimer: 999,
    });
    useGame.setState({ ready: { tea: 4, tost: 4 } });
    useGame.getState().tick(0.1);
    const w = useGame.getState().waiters[0]!;
    expect(w.tray + w.trayFood).toBe(2); // 1 + kademe 1 — TOPLAM kapasite
    expect(w.trayFood).toBeGreaterThan(0); // acil bekleyenin ürünü yüklendi
  });
});

describe('GARSON HAVUZU (Y4→B2) — gating (allAreaTablesLevel) + claim + opsiyonel pad', () => {

  it('requiresMet allZoneTablesLevel: 4 masanın hepsi L4 olmadan kapalı; tableLevels yoksa kapalı', () => {
    const req = { prev: ['waiter'], allAreaTablesLevel: { area: 0, level: 4 } } as const;
    const base = { padsDone: ['waiter'], tables: 4, stationLevel: 0, lifetime: 0 };
    expect(requiresMet(req, { ...base, tableLevels: [4, 4, 4, 3] })).toBe(false);
    expect(requiresMet(req, { ...base, tableLevels: [4, 4, 4, 4] })).toBe(true);
    expect(requiresMet(req, base)).toBe(false); // eski çağıran tableLevels vermezse gate kapalı (savunmacı)
    // zone dilimi: z1'in masaları global slot 4-7.
    const reqZ1 = { allAreaTablesLevel: { area: 1, level: 4 } } as const;
    expect(requiresMet(reqZ1, { ...base, tableLevels: [0, 0, 0, 0, 4, 4, 4, 4] })).toBe(true);
    expect(requiresMet(reqZ1, { ...base, tableLevels: [4, 4, 4, 4, 0, 0, 0, 0] })).toBe(false);
  });

  it('deriveWorld garson havuzu: waiter→1, +waiter2→2 (0 = garson yok)', () => {
    expect(deriveWorld(['table2', 'waiter']).services[THE_SERVICE].waiters).toBe(1);
    expect(deriveWorld(['table2', 'waiter', 'waiter2']).services[THE_SERVICE].waiters).toBe(2);
    expect(deriveWorld(['table2']).services[THE_SERVICE].waiters).toBe(0);
  });

  it('OPSİYONEL PAD KATEGORİSİ BUGÜN BOŞ — waiter3 B5b’de omurgaya girdi (D-066)', () => {
    // Bu test eskiden waiter3'ün opsiyonel görünürlüğünü koruyordu. B5b ölçtü: 3. garson her
    // oyuncu için, her zaman doğru olan bir alım (+%19 gelir, ~40 dk amortisman) — yani gerçek bir
    // tercih değil, eksik bir zincir adımıydı. Omurgaya alınınca `optional` kategorisinin ÜYESİ
    // KALMADI. Bu boşluk kayda geçiyor ki kaza eseri değil KARAR olduğu görünsün: mekanizma
    // (`availableOptionalPads` · `visiblePads`) yerinde duruyor ama bugün kullanıcısı yok →
    // Faz D'nin meta katmanı bir opsiyonel pad getirmezse temizlik adayıdır.
    const optional = economyConfig.pads.filter((p) => p.optional);
    expect(optional.map((p) => p.id)).toEqual([]);
    const ALL = ['table2', 'table3', 'waiter', 'table4', 'zone2', 'z2table2', 'z2table3',
      'dishwasher', 'z2table4', 'zone3', 'z3table2', 'waiter2', 'z3table3', 'z3table4'];
    const gate = {
      padsDone: ALL, tables: 12, stationLevel: 6, lifetime: 999999,
      waiterServed: 99, tableLevels: Array(12).fill(2),
    };
    // waiter3 artık OMURGADA: görev sırası gelince TEK hedef olarak çizilir...
    const w3q = economyConfig.quests.findIndex((q) => q.id === 'q_waiter3');
    expect(w3q).toBeGreaterThanOrEqual(0);
    expect(visiblePads(w3q, gate).map((p) => p.id)).toEqual(['waiter3']);
    // ...ve görev hattı bittiğinde bile omurga pad'i olarak çizilir (eskiden opsiyonel olduğu
    // için hattan bağımsız görünüyordu; şimdi zincirin kendi sırasından görünüyor).
    expect(visiblePads(economyConfig.quests.length, gate).map((p) => p.id)).toEqual(['waiter3']);
    // Üyesi olmayan kategori hiçbir şey EKLEMEZ: her şey alınmışken ekran tamamen temiz.
    const hepsi = economyConfig.pads.map((p) => p.id);
    expect(visiblePads(economyConfig.quests.length, { ...gate, padsDone: hepsi })).toEqual([]);
  });

  it('görev hattı SONU (B4): ... q_stationMax → q_waiter3 → LAVABO ile şerit DÖNÜŞÜMLÜ', () => {
    const ids = economyConfig.quests.map((q) => q.id);
    // Kuyruğun önündeki basamakların sırası B5b'nin ölçtüğü darboğaz sırası (D-066): önce ARZ
    // tavana çıkar (`q_stationMax`), o an darboğaz TAŞIMAYA geçer, üçüncü garson onu açar
    // (`q_waiter3`, +%19). Buraya kadar hattın önü B5a öncesiyle birebir aynı.
    expect(ids.slice(-19, -16)).toEqual(['q_waiterTray2', 'q_z1allL4', 'q_stationMax']);
    // B4: bu noktadan sonra Kat 1'de throughput kolu TÜKENMİŞTİR (arz 0,78 fincan/sn tavanda,
    // taşıma tavanı 1,25). Geriye kalan tek büyüme yönü müşteri başına ₺ ve onu LAVABO taşıyor.
    // Bu yüzden odanın seviyeleri şeridin masalarıyla DÖNÜŞÜMLÜ: bir masa → bir seviye → bir masa.
    // Dönüşümlü olmazsa gelir yine donuyor ve şeridin kuyruğu sabit hızda akıyor (plato 1,42 sa;
    // dönüşümlü hâlde en uzun düz aralık ~13 dk — B4 ölçümü).
    // D-142 (G-86 ⑤): 3. garsonun arkasında garson tepsisinin SON kademesi — hatta yoktu.
    expect(ids.slice(-16)).toEqual([
      'q_waiter3', 'q_waiterTray3', 'q_lavabo',
      'q_z3table5', 'q_lavabo2',
      'q_z3table6', 'q_lavabo3',
      'q_z3table7', 'q_lavabo4',
      'q_z3table8', 'q_lavabo5',
      'q_z3table9', 'q_lavabo6',
      'q_z3table10', 'q_z3table11', 'q_z3table12',
    ]);
  });

  it('CLAIM: 2 garson farklı masalara gider — 2. garson 1.\'in hedeflediği masayı atlar', () => {
    useGame.getState().hardReset();
    const seat0 = LAYOUT.tables[0].seat;
    const seat1 = LAYOUT.tables[1].seat;
    useGame.setState({
      padsDone: ['table2', 'waiter', 'waiter2'],
      tableLevels: [4, 4, 4, 4],
      waiters: [
        { pos: [seat0[0], 0.6, seat0[2]] as [number, number, number], tray: 1, trayFood: 0 },
        { pos: [seat1[0], 0.6, seat1[2]] as [number, number, number], tray: 1, trayFood: 0 },
      ],
      player: PARK,
      inputKeyboard: [0, 0], inputJoystick: [0, 0],
      npcs: [
        // Masa 0 EN ACİL (timer 2) → 1. garson onu claim eder; 2. garson masa 1'e (timer 8) düşer.
        { id: 980, state: 'waitingForTea', pos: [...seat0] as [number, number, number], tableIndex: 0, seatIndex: 0, timer: 2, product: 'tea', color: '#fff' },
        { id: 981, state: 'waitingForTea', pos: [...seat1] as [number, number, number], tableIndex: 1, seatIndex: 0, timer: 8, product: 'tea', color: '#fff' },
      ],
      spawnTimer: 999,
    });
    useGame.getState().tick(0.1);
    const s = useGame.getState();
    // Her iki garson da kendi masasının ÜSTÜNDE başladı → tek tick'te ikisi de teslim etti.
    expect(s.npcs.find((n) => n.id === 980)?.state).toBe('drinking');
    expect(s.npcs.find((n) => n.id === 981)?.state).toBe('drinking');
    expect(s.waiters[0]?.tray).toBe(0);
    expect(s.waiters[1]?.tray).toBe(0);
    expect(s.stats.waiterServed).toBe(2);
  });

  it('CLAIM: tek bekleyen masada 2. garson çifte-teslimat YAPMAZ (claim dışı kalır)', () => {
    useGame.getState().hardReset();
    const seat0 = LAYOUT.tables[0].seat;
    useGame.setState({
      padsDone: ['table2', 'waiter', 'waiter2'],
      waiters: [
        { pos: [seat0[0], 0.6, seat0[2]] as [number, number, number], tray: 1, trayFood: 0 },
        { pos: [seat0[0] + 0.3, 0.6, seat0[2]] as [number, number, number], tray: 1, trayFood: 0 },
      ],
      player: PARK,
      inputKeyboard: [0, 0], inputJoystick: [0, 0],
      npcs: [
        { id: 990, state: 'waitingForTea', pos: [...seat0] as [number, number, number], tableIndex: 0, seatIndex: 0, timer: 5, product: 'tea', color: '#fff' },
      ],
      spawnTimer: 999,
    });
    useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.npcs.find((n) => n.id === 990)?.state).toBe('drinking');
    expect(s.stats.waiterServed).toBe(1); // tek teslim — 2. garson aynı masaya gitmedi
    expect(s.waiters[1]?.tray).toBe(1); // tepsisi durur (claim'lenen masa hariçti)
  });

  it('2. garson tutulunca FSM onu HAVUZA ekler; pad olmadan havuz tek kişilik', () => {
    useGame.getState().hardReset();
    useGame.setState({ padsDone: ['table2', 'waiter'], spawnTimer: 999, npcs: [] });
    useGame.getState().tick(0.05);
    expect(useGame.getState().waiters.length).toBe(1);
    useGame.setState({ padsDone: ['table2', 'waiter', 'waiter2'] });
    useGame.getState().tick(0.05);
    expect(useGame.getState().waiters.length).toBe(2);
    // Bekleme noktaları üst üste binmez.
    const [w1, w2] = useGame.getState().waiters;
    expect(Math.hypot(w1.pos[0] - w2.pos[0], w1.pos[2] - w2.pos[2])).toBeGreaterThan(0.5);
  });
});

describe("Müşteri dağılımı — zone round-robin (tost salonu aç kalmasın fix'i)", () => {
  const Z1 = ['table2', 'table3', 'waiter', 'dishwasher', 'table4'];
  const Z2 = ['zone2', 'z2table2', 'z2waiter', 'z2table3', 'z2dishwasher', 'z2table4'];

  it('startZone=2: çay masaları DAHA boş olsa da (L4=4 koltuk) tost masası (L0=1) seçilir', () => {
    const levels = [4, 4, 4, 4, 4, 4, 4, 4, 0];
    expect(findTableForGroup(new Map(), 9, new Set(), levels, 3, 2)).toBe(8);
  });

  it('alan içinde önce SEVİYE, sonra boş koltuk (D-066 · Ö3 — bahşiş seyrelmesi)', () => {
    const levels = [0, 4, 0, 0, 0, 0, 0, 0, 0];
    expect(findTableForGroup(new Map(), 9, new Set(), levels, 3, 0)).toBe(1); // a0: tek L4 masa
    expect(findTableForGroup(new Map(), 9, new Set(), levels, 3, 1)).toBe(4); // a1: hepsi eşit → düşük index

    // ASIL KURAL: konfor koltuk sayısını YENER. Yeni açılan L0 masanın dört boş koltuğu var,
    // L4 masanın yalnız bir koltuğu boş — müşteri yine de iyi masayı seçer. Eski kural
    // ("en çok boş koltuk") burada L0 masayı seçerdi ve servis edilen bardak sayısı sabit
    // olduğu için ortalama bahşişi düşürürdü: masa AÇMAK geliri azaltırdı.
    const iyiMasaDolu = new Map([[1, new Set([0, 1, 2])]]); // L4 masada 3/4 koltuk dolu
    expect(findTableForGroup(iyiMasaDolu, 9, new Set(), levels, 3, 0)).toBe(1);
    // Ama TAMAMEN dolduğunda taşma yeni masaya gider (yoksa alan aç kalırdı).
    const iyiMasaTamDolu = new Map([[1, new Set([0, 1, 2, 3])]]);
    expect(findTableForGroup(iyiMasaTamDolu, 9, new Set(), levels, 3, 0)).toBe(0);
  });

  it("başlangıç zone'u dolu/kirliyse SIRADAKİ zone'a düşer; hiç yer yoksa -1", () => {
    const levels = Array(9).fill(0); // hepsi L0 = 1 koltuk
    const occ8 = new Map([[8, new Set([0])]]);
    expect(findTableForGroup(occ8, 9, new Set(), levels, 3, 2)).toBe(0); // tost dolu → z0'a sar
    expect(findTableForGroup(new Map(), 9, new Set([8]), levels, 3, 2)).toBe(0); // tost kirli → z0
    const allFull = new Map(Array.from({ length: 9 }, (_, i) => [i, new Set([0])] as const));
    expect(findTableForGroup(allFull, 9, new Set(), levels, 3, 0)).toBe(-1);
  });

  it('STORE tick: 3 salon açıkken çay koltukları hep boş olsa da TOST masasına müşteri gelir', () => {
    useGame.getState().hardReset();
    useGame.setState({
      padsDone: [...Z1, ...Z2, 'zone3'],
      questIndex: economyConfig.quests.length,
      npcs: [],
      spawnTimer: 0,
      player: PARK,
      inputKeyboard: [0, 0],
      inputJoystick: [0, 0],
    });
    // ~6 sn akış: round-robin imleciyle 3. spawn tost salonuna (masa 8) düşmeli.
    let tostCustomer = false;
    for (let i = 0; i < 60 && !tostCustomer; i++) {
      useGame.getState().tick(0.1);
      tostCustomer = useGame.getState().npcs.some((n) => n.tableIndex === 8);
    }
    expect(tostCustomer).toBe(true);
    // Dağılım adil: çay salonları da pay almış (z0 ve z1'de de müşteri var).
    const zonesHit = new Set(useGame.getState().npcs.map((n) => Math.floor(n.tableIndex / 4)));
    expect(zonesHit.has(0)).toBe(true);
    expect(zonesHit.has(1)).toBe(true);
  });
});

describe('v28 — bulaşıkçı leğen yükseltmesi (telefon feedback turu-4: "bulaşıkçı yetmiyor")', () => {
  it('eğri config\'ten: kapasite 2→4→6→8 (+ kelepçe), maliyetler 600/2000/5000, tavanda null', () => {
    expect(economyConfig.dishwasher.carryUpgrades.costs).toEqual([600, 2000, 5000]);
    expect([0, 1, 2, 3].map(dishCarryCapacityFor)).toEqual([2, 4, 6, 8]);
    expect(dishCarryCapacityFor(99)).toBe(8); // aşırı kademe kelepçelenir
    expect(dishCarryCapacityFor(-1)).toBe(2);
    expect(dishCarryNextCost(0)).toBe(600);
    expect(dishCarryNextCost(dishCarryMaxTier())).toBeNull();
  });

  it('buyDishCarry: yetersiz bakiye false; alımda kademe artar + cüzdan düşer; tavanda false', () => {
    useGame.getState().hardReset();
    useGame.setState({ wallet: D(100) });
    expect(useGame.getState().buyDishCarry()).toBe(false); // 600 > 100
    useGame.setState({ wallet: D(10000) });
    expect(useGame.getState().buyDishCarry()).toBe(true);
    expect(useGame.getState().waiterUpgrades.dishCarry).toBe(1);
    expect(useGame.getState().wallet.toNumber()).toBe(10000 - 600);
    expect(useGame.getState().buyDishCarry()).toBe(true); // -2000
    expect(useGame.getState().buyDishCarry()).toBe(true); // -5000
    expect(useGame.getState().waiterUpgrades.dishCarry).toBe(3);
    expect(useGame.getState().buyDishCarry()).toBe(false); // MAX
    expect(useGame.getState().wallet.toNumber()).toBe(10000 - 600 - 2000 - 5000);
  });

  it('FSM: kademe 1 (kapasite 4) bulaşıkçı 4 kirliyi TEK turda toplar; taban (2) iki tur gerektirir', () => {
    const fourDishes = (t: { table: [number, number, number] }) =>
      Array.from({ length: 4 }, (_, i) => ({
        id: 9100 + i,
        pos: [t.table[0] + (i % 2) * 0.3 - 0.15, 0.95, t.table[2] + Math.floor(i / 2) * 0.3 - 0.15] as [number, number, number],
        tableIndex: 0,
      }));
    const run = (tier: number) => {
      useGame.getState().hardReset();
      useGame.setState({
        padsDone: ['table2', 'zone2', 'dishwasher'],
        questIndex: economyConfig.quests.length,
        npcs: [],
        spawnTimer: 1e9,
        waiterUpgrades: { ...defaultWaiterUpgrades(), dishCarry: tier },
        dishes: fourDishes(LAYOUT.tables[0]),
        player: PARK,
      });
      let maxTray = 0;
      for (let i = 0; i < 600 && useGame.getState().dishes.length > 0; i++) {
        useGame.getState().tick(0.1);
        const dw = useGame.getState().dishwasher;
        if (dw) maxTray = Math.max(maxTray, dw.tray);
      }
      expect(useGame.getState().dishes.length).toBe(0); // hepsi toplandı
      return maxTray;
    };
    expect(run(1)).toBe(4); // leğen 4 → tek turda 4 kirli
    expect(run(0)).toBe(2); // taban 2 → tur başına en çok 2
  });

});

describe('Turu-4 — tost sabrı ürün-bazlı + temizlik temposu ("tostta müşteri sabırdan kaçıyor")', () => {
  const Z1 = ['table2', 'table3', 'waiter', 'dishwasher', 'table4'];
  const Z2 = ['zone2', 'z2table2', 'z2waiter', 'z2table3', 'z2dishwasher', 'z2table4'];

  it('tablePatience ürünle çarpılır: çay aynı (×1), tost ×1.6; masa seviyesi tabana eklenir', () => {
    expect(PRODUCTS.tea.patienceMult).toBe(1);
    expect(PRODUCTS.tost.patienceMult).toBeCloseTo(1.6);
    expect(tablePatience(0)).toBe(economyConfig.npc.patience); // default ürün = çay, eski davranış
    expect(tablePatience(0, 'tea')).toBe(economyConfig.npc.patience);
    expect(tablePatience(0, 'tost')).toBeCloseTo(economyConfig.npc.patience * 1.6); // 28.8sn > hazırlık 14sn
    expect(tablePatience(4, 'tost')).toBeCloseTo(
      (economyConfig.npc.patience + economyConfig.tables.patiencePerLevel * 4) * 1.6,
    );
  });

  it('STORE (B2): sabır MÜŞTERİNİN ürününden başlar — masasının bölgesinden değil', () => {
    useGame.getState().hardReset();
    const seat = LAYOUT.tables[8].seat;
    const setup = (product: 'tea' | 'tost') => {
      useGame.setState({
        padsDone: [...Z1, ...Z2, 'zone3'],
        questIndex: economyConfig.quests.length,
        player: PARK,
        inputKeyboard: [0, 0],
        inputJoystick: [0, 0],
        npcs: [{ id: 980, state: 'toTable', pos: [...seat] as [number, number, number], tableIndex: 8, seatIndex: 0, timer: 0, product, color: '#2980b9' }],
        spawnTimer: 1e9,
      });
      useGame.getState().tick(0.05);
      return useGame.getState().npcs.find((x) => x.id === 980);
    };
    // AYNI masa, farklı ürün → farklı sabır (tost ×1.6). Eskiden masanın bölgesi belirliyordu.
    const tostCustomer = setup('tost');
    expect(tostCustomer?.state).toBe('waitingForTea');
    expect(tostCustomer?.timer).toBeCloseTo(tablePatience(0, 'tost'), 5);
    const teaCustomer = setup('tea');
    expect(teaCustomer?.timer).toBeCloseTo(tablePatience(0, 'tea'), 5);
  });

  it('bulaşıkçı hız merdiveni (v29): taban 2.0; TAVAN bile oyuncudan yavaş (kısmi assist korunur)', () => {
    expect(dishSpeedFor(0)).toBe(2.0);
    expect(dishSpeedFor(1)).toBeGreaterThan(dishSpeedFor(0));
    expect(dishSpeedFor(dishSpeedMaxTier())).toBeLessThan(charValue('speed', 0) as number);
    expect(dishSpeedFor(99)).toBe(dishSpeedFor(dishSpeedMaxTier())); // clamp
  });


  it('coin OTO-TOPLAMA (2026-06-13): eşiği aşan para cüzdana girer + toast; manuel sayaç ARTMAZ; mıknatıs alanı muaf', () => {
    useGame.getState().hardReset();
    const after = economyConfig.money.autoCollectAfter;
    useGame.setState({
      player: PARK, inputKeyboard: [0, 0], inputJoystick: [0, 0], spawnTimer: 1e9,
      // Coin oyuncudan UZAK (mıknatıs dışı — konum oyuncuya GÖRE), yaşı eşiğin hemen altında.
      coins: [{ id: 1, pos: [PARK[0], 0.3, PARK[2] + attractRadiusFor(0) + 2], value: 7, age: after - 0.05 }],
      notice: null,
    });
    const beforeWallet = useGame.getState().wallet.toNumber();
    const beforeCollected = useGame.getState().stats.coinsCollected;
    useGame.getState().tick(0.1); // yaş eşiği aşar
    const s = useGame.getState();
    expect(s.coins.length).toBe(0);
    expect(s.wallet.toNumber()).toBeCloseTo(beforeWallet + 7, 5);
    expect(s.stats.coinsCollected).toBe(beforeCollected); // manuel toplama sayacı artmaz
    expect(s.notice?.text).toContain('otomatik toplandı');
    expect(s.notice?.reward).toBe(7);
    // Mıknatıs alanındaki coin oto-toplanmaz (oyuncuya akar, manuel toplanır → sayaç artar).
    useGame.setState({
      // Coin oyuncunun mıknatıs alanının İÇİNDE (konum yine oyuncuya göre).
      coins: [{ id: 2, pos: [PARK[0], 0.3, PARK[2] + attractRadiusFor(0) - 0.4], value: 5, age: after + 99 }],
      notice: null,
    });
    useGame.getState().tick(0.1);
    // attract+pickup aynı tick'te tamamlanabilir; coin ya toplandı (sayaç +1) ya hâlâ akıyor.
    const s2 = useGame.getState();
    if (s2.coins.length === 0) expect(s2.stats.coinsCollected).toBe(beforeCollected + 1);
    else expect(s2.coins[0].id).toBe(2); // duruyorsa oto-toplama silmemiş olmalı
  });

  it('q_waiterL2 görevi (v29): hedef panel hız kademesi — speed 1 olunca karşılanır', () => {
    const q = economyConfig.quests.find((x) => x.id === 'q_waiterL2')!;
    expect(q.target).toEqual({ type: 'waiterSpeed', tier: 1 });
    const ctx = {
      padsDone: [], stationLevels: [0], tableLevels: [], stats: defaultStats(), questBase: 0,
      charUpgrades: { tray: 0, magnet: 0, speed: 0 },
      waiterUpgrades: defaultWaiterUpgrades(),
    };
    expect(questTargetMet(q.target, ctx)).toBe(false);
    expect(questTargetMet(q.target, { ...ctx, waiterUpgrades: { ...defaultWaiterUpgrades(), speed: 1 } })).toBe(true);
    // Panel görevi: 3D odak yok (kamera sıçramaz; HUD char butonu nabzı yönlendirir).
    expect(questFocusPos(q.target, [], 1)).toBeNull();
  });
});

describe('G2 — zemin deseni (floorQuads)', () => {
  // D-073: salon zemini 'parke' artık DÜZ (maketin `floorWood`'u); plank deseni 'ceviz'te sürüyor.
  const parke = FLOOR_THEMES.parke;
  const plank = FLOOR_THEMES.ceviz;
  const fayans = FLOOR_THEMES.fayans;

  it('D-073 — salon zemini DÜZ: parke teması tahta çizgisi üretmez', () => {
    expect(parke.kind).toBe('flat');
    expect(floorQuads(parke, 0, 11, 0, 11)).toEqual([]);
  });

  it('düz temada quad üretilmez (tek renk düzlem yeter)', () => {
    expect(floorQuads({ kind: 'flat', base: '#fff', alt: '#eee' }, 0, 10, 0, 10)).toEqual([]);
  });

  it('plank teması: tahtalar alan içinde kalır ve derz BOŞLUK bırakır', () => {
    const qs = floorQuads(plank, 0, 11, 0, 11);
    expect(qs.length).toBeGreaterThan(60); // alan başına ~100 tahta, tek draw call
    for (const q of qs) {
      // Hiçbir tahta alanın dışına taşmaz (duvarın altına girmez).
      expect(q.x - q.w / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(q.x + q.w / 2).toBeLessThanOrEqual(11 + 1e-9);
      expect(q.z - q.d / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(q.z + q.d / 2).toBeLessThanOrEqual(11 + 1e-9);
      // Derz çizgi değil boşluk: tahta hücresinden dar → aradan alt taban görünür.
      expect(q.d).toBeLessThan(0.55);
    }
  });

  it('plank satırları yarım tahta kaydırılır (hizalı derz ızgara gibi durur)', () => {
    const qs = floorQuads(plank, 0, 11, 0, 11);
    const rowZ = [...new Set(qs.map((q) => +q.z.toFixed(3)))].sort((a, b) => a - b);
    const inRow = (z: number) => qs.filter((q) => Math.abs(q.z - z) < 1e-6).sort((a, b) => a.x - b.x);
    // 1. satırın 2. tahtası ile 2. satırın 2. tahtası aynı X'te BAŞLAMAZ.
    const a = inRow(rowZ[0])[1];
    const b = inRow(rowZ[1])[1];
    expect(Math.abs(a.x - b.x)).toBeGreaterThan(0.3);
  });

  it('her tahta kendi ton sapmasını alır ama sapma KARARLI (her yüklemede aynı)', () => {
    const a = floorQuads(plank, 0, 11, 0, 11);
    const b = floorQuads(plank, 0, 11, 0, 11);
    expect(a.map((q) => q.tint)).toEqual(b.map((q) => q.tint));
    expect(new Set(a.map((q) => q.tint)).size).toBeGreaterThan(10); // gerçekten çeşitleniyor
    for (const q of a) expect(Math.abs(q.tint - 1)).toBeLessThanOrEqual(0.04 + 1e-9); // ±%4
  });

  it('fayans = tile: kareler kare (en-boy 1) ve karo ölçüsü temadan gelir', () => {
    const qs = floorQuads(fayans, 0, 7, 0, 7);
    const full = qs.filter((q) => q.w > 0.6 && q.d > 0.6);
    expect(full.length).toBeGreaterThan(50);
    for (const q of full) expect(Math.abs(q.w - q.d)).toBeLessThan(1e-9);
    // 'yemek' teması IRI karo: aynı alanda belirgin daha AZ parça çıkar.
    expect(floorQuads(FLOOR_THEMES.yemek, 0, 7, 0, 7).length).toBeLessThan(qs.length);
  });

  it('dama teması G2 öncesiyle aynı: 1,3 m satranç, derzsiz, ton sapmasız', () => {
    const qs = floorQuads(FLOOR_THEMES.dama, 0, 13, 0, 13);
    for (const q of qs) {
      expect(q.tint).toBe(1);
      expect(q.w).toBeCloseTo(1.3, 6);
    }
    expect(qs.length).toBe(50); // 10x10 ızgarada satrancın yarısı
  });
});

describe('BM — duvar maketin transkripsiyonu (wallBoxes: gövde + lambri + KOYU çıta)', () => {
  const theme = WALL_THEMES.krem;
  const slab = { x: 2, z: -5, w: 6, d: 0.2, theme };
  const boxes = wallBoxes(slab);
  const bot = (b: { y: number; h: number }) => b.y - b.h / 2;
  const top = (b: { y: number; h: number }) => b.y + b.h / 2;
  const [body, wainscot, rail] = boxes;

  it('maketin ÜÇ kutusu: gövde + lambri + çıta (G3’ün beş katmanı D-070 ile indi)', () => {
    expect(boxes.length).toBe(3);
    expect(boxes.map((b) => b.color)).toEqual([theme.cream, theme.wainscot, theme.rail]);
  });

  it('maketin yükseklikleri: duvar 3,2 · lambri 0,9 · çıta 0,08 @ y 0,94', () => {
    expect(WALL_H).toBeCloseTo(3.2, 6);
    expect(WAINSCOT_H).toBeCloseTo(0.9, 6);
    expect(bot(wainscot)).toBeCloseTo(0, 6);
    expect(top(wainscot)).toBeCloseTo(0.9, 6);
    expect(bot(body)).toBeCloseTo(0.9, 6);
    expect(top(body)).toBeCloseTo(3.2, 6);
    expect(rail.h).toBeCloseTo(0.08, 6);
    expect(rail.y).toBeCloseTo(0.94, 6);
  });

  it('kalınlıklar maketin: gövde 0,18 < lambri 0,22 < çıta 0,26 (üçü de ince eksende)', () => {
    // slab yatay (w 6 > d 0,2) → ince eksen d
    expect(body.d).toBeCloseTo(0.18, 6);
    expect(wainscot.d).toBeCloseTo(0.22, 6);
    expect(rail.d).toBeCloseTo(0.26, 6);
    // uzun eksen HİÇ değişmez: katmanlar parçanın boyunu uzatmaz
    for (const b of boxes) expect(b.w).toBeCloseTo(slab.w, 6);
  });

  it('düşey duvarda ince eksen x olur (uzun/ince eksen otomatik seçilir)', () => {
    const dik = wallBoxes({ x: -17, z: 3, w: 0.2, d: 9, theme });
    expect(dik[0].w).toBeCloseTo(0.18, 6);
    expect(dik[1].w).toBeCloseTo(0.22, 6);
    expect(dik[2].w).toBeCloseTo(0.26, 6);
    for (const b of dik) expect(b.d).toBeCloseTo(9, 6);
  });

  it('çıta maketteki gibi KOYU: lambriden koyu, badanadan açıkça koyu', () => {
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
    };
    for (const t of Object.values(WALL_THEMES)) {
      expect(lum(t.rail)).toBeLessThan(lum(t.wainscot)); // maket: doorWood, wain'den koyu
      expect(lum(t.rail)).toBeLessThan(lum(t.cream) - 60); // badanadan AÇIKÇA ayrışır
    }
  });

  it('renkler TEMADAN gelir — duvar teması değişince üç katman da değişir', () => {
    const mavi = wallBoxes({ ...slab, theme: WALL_THEMES.mavi });
    expect(mavi.map((b) => b.color)).not.toEqual(boxes.map((b) => b.color));
    expect(mavi[2].color).toBe(WALL_THEMES.mavi.rail);
  });

  it('h verilirse o yükseklik kullanılır (bandın blokları farklı yükseklikte olabilsin)', () => {
    const alcak = wallBoxes({ ...slab, h: 2.2 });
    expect(top(alcak[0])).toBeCloseTo(2.2, 6);
    expect(top(alcak[1])).toBeCloseTo(0.9, 6); // lambri sabit
  });

  // BM adım 3 — BANDIN KABUĞU. Bant katı kütle olmaktan çıkıp odalara döndü; kabuk salonun
  // duvarıyla aynı kuralda (kat kenarından m = 0,5 dışarıda) ve maketin ara duvarı 2,2.
  it('bandın kabuğu: hatlar kat kenarından 0,5 dışarıda · iç yüz 0,09 içeride · oda duvarı 2,2', () => {
    expect(BAND_SHELL.back).toBeCloseTo(BAND.back - 0.5, 6);
    expect(BAND_SHELL.left).toBeCloseTo(-FLOOR_HALF - 0.5, 6);
    expect(BAND_SHELL.right).toBeCloseTo(FLOOR_HALF + 0.5, 6);
    // iç yüz = hat + gövde kalınlığının yarısı (maketin duvar gövdesi 0,18)
    expect(BAND_SHELL.innerBack - BAND_SHELL.back).toBeCloseTo(0.09, 6);
    expect(BAND_SHELL.right - BAND_SHELL.innerRight).toBeCloseTo(0.09, 6);
    expect(BAND_SHELL.innerLeft - BAND_SHELL.left).toBeCloseTo(0.09, 6);
    expect(BAND_SHELL.roomH).toBeCloseTo(2.2, 6); // maketin "kamera içeri görsün" duvarı
    expect(BAND_SHELL.roomH).toBeLessThan(WALL_H); // ara duvar bina duvarını AŞMAZ
  });

  it('yıkık merdiven bandın DERİNLİĞİNE sığar (1,2’lik bantta sığmıyordu)', () => {
    const bandDepth = BAND.front - BAND_SHELL.back; // 7,6
    expect(bandDepth).toBeCloseTo(7.6, 6);
    // Merdiven bandın 0,4 içinden başlar (Scene.BackBand `stairZ`), sahanlık arka duvara değmez.
    expect(MERDIVEN_DERINLIK + 0.4).toBeLessThan(bandDepth);
    // ve 2,90 yükseldiği için ancak 3,2'lik kabuğun altında durabilir.
    expect(2.9).toBeLessThan(WALL_H);
  });

  // Duvar 1,2 → 3,2 olunca kapı boşluğu da onunla uzamıştı; makette kapı camla aynı hizada (2,65)
  // biter ve üstünde 0,55'lik ALINLIK vardır. Ölçü katmanının kabul kriteri sayı listesidir (D-072).
  it('ana kapı maketin ölçüsünde: boşluk 2,65 yüksek · 4,4 geniş · üstünde alınlık kalır', () => {
    expect(DOOR.height).toBeCloseTo(2.65, 6); // maket `DH`
    expect(DOOR.half).toBeCloseTo(2.2, 6); // maket söveleri dx ∓2,2
    expect(WALL_H - DOOR.height).toBeCloseTo(0.55, 6); // alınlık şeridi gerçekten doğuyor
    expect(DOOR.height).toBeGreaterThan(WAINSCOT_H); // kapı lambri kuşağını AŞAR
  });
});


// ============================================================================
// FAZ B1 — DÜNYA MODELİ (ALAN · SERVİS · MASA · ODA) + KAYIT v31
// ----------------------------------------------------------------------------
// B1'e kadar tek bir `zone` index'i aynı anda mekânsal bölge, servis noktası ve
// 4'lük masa grubu demekti. Maket v13 bu birlikteliği bozuyor (D-058): 2. alanın
// ocağı yok, 3. alan masa değil TEZGÂH getiriyor. Aşağıdaki testler ayrışmanın
// GERÇEKTEN yapıldığını kilitler: bir sistem "servis index'i = alan index'i"
// varsayarsa (B2'de servis tekilleşince) bu testler GÜRÜLTÜYLE düşer.
// ============================================================================
describe('Faz B1 — dünya modeli: ALAN · SERVİS · MASA · ODA ayrışması', () => {
  // B2 zinciri: personel alan-başı DEĞİL (havuz), bulaşıkçı Bölüm 2'de.
  const B1_Z1 = ['table2', 'table3', 'waiter', 'table4'];
  const B1_Z2 = ['zone2', 'z2table2', 'z2table3', 'dishwasher', 'z2table4'];

  it('ALAN: areas listesi MAX_AREAS uzunluğunda; yalnız açılmış olanlar open', () => {
    const w0 = deriveWorld([]);
    expect(w0.areas.length).toBe(MAX_AREAS);
    expect(w0.areas.map((a) => a.open)).toEqual([true, false, false]);
    expect(w0.areas.map((a) => a.index)).toEqual([0, 1, 2]);
    const w2 = deriveWorld([...B1_Z1, 'zone2']);
    expect(w2.areas.map((a) => a.open)).toEqual([true, true, false]);
  });

  it('SERVİS: kat TEK servis noktasından döner (B2) ve o nokta hep açıktır', () => {
    expect(MAX_SERVICES).toBe(1);
    expect(MAX_SERVICES).toBe(1);
    const w = deriveWorld([...B1_Z1, ...B1_Z2, 'zone3']);
    expect(w.services.length).toBe(1);
    // Servisin hangi alanda DURDUĞU artık world'ün değil layout'un sorusu (B3-1) ve zamana bağlı.
    expect(servicePlace(1).areaIndex).toBe(0);
    expect(servicePlace(3).areaIndex).toBe(2);
    // Kat servissiz başlamaz: 1. alan hep açık → servis hep açık.
    expect(deriveWorld([]).services.map((sv) => sv.open)).toEqual([true]);
  });

  it('SERVİS: ALAN açmak SERVİS açmaz (B2nin özü — makette 2. Alanın ocağı yok)', () => {
    const before = deriveWorld([...B1_Z1]);
    const after = deriveWorld([...B1_Z1, 'zone2']);
    expect(after.areasOpen).toBe(before.areasOpen + 1); // alan arttı
    expect(after.services.length).toBe(before.services.length); // servis ARTMADI
  });

  it('SERVİS: garson havuzu GLOBAL — pad hangi alanda durursa dursun aynı havuza yazar', () => {
    expect(deriveWorld(['waiter']).services[THE_SERVICE].waiters).toBe(1);
    const w = deriveWorld([...B1_Z1, ...B1_Z2, 'zone3', 'z3table2', 'waiter2']);
    expect(w.services[THE_SERVICE].waiters).toBe(2);
    // Havuzun tavanı aşılmaz (bozuk kayıt sızamaz).
    const many = deriveWorld([...B1_Z1, ...B1_Z2, 'zone3', 'z3table2', 'waiter2', 'waiter3', 'waiter3']);
    expect(many.services[THE_SERVICE].waiters).toBeLessThanOrEqual(MAX_WAITERS);
  });

  it('SERVİS: MENÜ seviyeden gelir (L5 tost açar) — bölgeden DEĞİL', () => {
    expect(serviceMenu(0)).toEqual(['tea']);
    expect(serviceMenu(4)).toEqual(['tea']); // L4 tezgâh olur ama menü hâlâ tek ürün
    expect(serviceMenu(5)).toEqual(['tea', 'tost']);
    expect(sellsTost(4)).toBe(false);
    expect(sellsTost(5)).toBe(true);
    expect(isCounter(3)).toBe(false);
    expect(isCounter(4)).toBe(true);
    // Tost PAYI da seviyeden: L4te 0, L5te açılır, L6da artar.
    expect(tostShare(4)).toBe(0);
    expect(tostShare(5)).toBeGreaterThan(0);
    expect(tostShare(6)).toBeGreaterThan(tostShare(5));
  });

  it('MASA: açık masalar LİSTE olarak türetilir; indexler bitişik ve artan', () => {
    const w = deriveWorld([...B1_Z1, 'zone2', 'z2table2']);
    expect(w.tables.map((t) => t.index)).toEqual([0, 1, 2, 3, 4, 5]);
    for (let i = 1; i < w.tables.length; i++) {
      expect(w.tables[i].index).toBe(w.tables[i - 1].index + 1);
    }
  });

  it('MASA: alanı ile servisi AYRI cevaplar — B2de ayrıştılar', () => {
    const w = deriveWorld([...B1_Z1, ...B1_Z2, 'zone3', 'z3table2']);
    const at = (i: number) => w.tables.find((t) => t.index === i)!;
    // ALAN masadan masaya değişir…
    expect([at(0).areaIndex, at(4).areaIndex, at(8).areaIndex]).toEqual([0, 1, 2]);
    // …SERVİS değişmez: katın tek noktası hepsine bakar (B1de bu üçü 0/1/2 idi).
    expect([at(0).serviceIndex, at(4).serviceIndex, at(8).serviceIndex]).toEqual([0, 0, 0]);
    for (const t of w.tables) expect(t.serviceIndex).toBe(serviceOfTable(t.index));
  });

  it('MASA: kapalı alanın masası listede YOK; tablesInArea toplamı = tables.length', () => {
    const w = deriveWorld([...B1_Z1, 'zone2']);
    expect(w.tables.some((t) => t.areaIndex === 2)).toBe(false);
    expect(tablesInArea(w, 2)).toBe(0);
    const sum = [0, 1, 2].reduce((a, i) => a + tablesInArea(w, i), 0);
    expect(sum).toBe(w.tables.length);
  });

  it('MASA: bilinmeyen pad idsi listeyi bozmaz (ileri/geri uyum)', () => {
    const w = deriveWorld(['table2', 'yok-boyle-bir-pad', 'station2']);
    expect(w.tables.map((t) => t.index)).toEqual([0, 1]);
  });

  it('ODA: B4e kadar liste boş (kavram var, içerik yok)', () => {
    expect(deriveWorld([...B1_Z1, ...B1_Z2, 'zone3']).rooms).toEqual([]);
  });

  it('deriveWorld her çağrıda TAZE nesne verir (mutasyon çağrılar arası sızmaz)', () => {
    const a = deriveWorld(['waiter']);
    a.services[0].waiters = 99;
    a.tables.length = 0;
    const b = deriveWorld(['waiter']);
    expect(b.services[0].waiters).toBe(1);
    expect(b.tables.length).toBe(1);
  });

  it('areaOfTable ile serviceOfTable AYRI sorular — cevapları B2de ayrıştı', () => {
    expect(areaOfTable(0)).toBe(0);
    expect(areaOfTable(4)).toBe(1);
    expect(areaOfTable(11)).toBe(2);
    expect(areaOfTable(999)).toBe(MAX_AREAS - 1); // sınır dışı son alana kelepçelenir
    // Masa hangi alanda olursa olsun servisi TEK.
    expect(serviceOfTable(0)).toBe(THE_SERVICE);
    expect(serviceOfTable(8)).toBe(THE_SERVICE);
  });

  it('serviceInArea YERLEŞİM sorusudur ve cevabı ZAMANA bağlıdır (B3-1/D-062)', () => {
    // 1-2. Alan: servis ilk salonda. 3. Alan: maket v13 adım 3 onu arka banda taşır.
    expect(serviceInArea(0, 1)).toBe(0);
    expect(serviceInArea(1, 1)).toBe(-1);
    expect(serviceInArea(0, 2)).toBe(0);
    expect(serviceInArea(0, 3)).toBe(-1); // artık 1. alanda DEĞİL
    expect(serviceInArea(2, 3)).toBe(0); // arka yarıda
    expect(serviceInArea(99, 3)).toBe(-1);
  });

  it('openServices: alan sayısı kaç olursa olsun TEK servis açıktır', () => {
    expect(openServices(1)).toEqual([0]);
    expect(openServices(2)).toEqual([0]);
    expect(openServices(3)).toEqual([0]);
  });

  it('LAYOUT: alan dizileri ALAN sayısında; servis KOORDİNATLARI ise diziden değil yerden gelir', () => {
    // B3-1: servis dizileri (stations/stationPickups/…) KALKTI — servisin yeri artık zamana bağlı
    // olduğundan sabit dizi yalan söylerdi. Yerine `servicePlace(areasOpen)` tek kapı.
    expect(MAX_SERVICES).toBe(1);
    expect(LAYOUT.areaBounds.length).toBe(MAX_AREAS);
    // B5a: alan başına masa sayısı EŞİT DEĞİL (4 · 4 · 12) — çarpım artık yanlış cevap verirdi.
    expect(LAYOUT.tables.length).toBe(MAX_TABLES);
    expect(MAX_TABLES).toBe(20);
    // B3-2: kapı dizileri de KALKTI — kapı 2. Alan açılınca cephenin ortasına kayıyor (maket v13
    // adım 2), yani servis gibi o da `areasOpen` fonksiyonu. Alan başına ayrı kapı zaten yoktu.
    for (const key of ['entrances', 'streets', 'stations', 'stationPickups', 'dishStations', 'waiterHomes', 'stationUpgradeSpots']) {
      expect((LAYOUT as unknown as Record<string, unknown>)[key]).toBeUndefined();
    }
  });

  it('YERLEŞİM DEĞİŞMEZİ: servis kümesi HER dönemde kendi alanının AÇIK sınırları içinde', () => {
    for (const areasOpen of [1, 2, 3]) {
      const sp = SP(areasOpen);
      // Servisin durduğu alan o an AÇIK olmak zorunda (yoksa erişilemez bir tezgâh olurdu).
      expect(sp.areaIndex).toBeLessThan(areasOpen);
      const ab = LAYOUT.areaBounds[sp.areaIndex];
      // AKTÖRÜN BASTIĞI noktalar alanın İÇİNDE olmak zorunda (yürünemeyen yerde beklenemez).
      for (const pt of [sp.pickup, sp.upgradeSpot, sp.waiterHome, sp.dishwasherHome]) {
        expect(pt[0]).toBeGreaterThanOrEqual(ab.minX);
        expect(pt[0]).toBeLessThanOrEqual(ab.maxX);
        expect(pt[2]).toBeGreaterThanOrEqual(ab.minZ);
        expect(pt[2]).toBeLessThanOrEqual(ab.maxZ);
      }
      // OBJE GÖVDELERİ (tezgâh · bulaşık) alana DEĞMEK zorunda, içinde durmak zorunda değil:
      // BM adım 3'te küme mutfağın içine geçti, ön yüzü bandın hattında kaldı — bir tezgâhın
      // gövdesinin duvarın içinde olması normaldir, ERİŞİLEMEZ olması değil. Asıl kural bu:
      // alanın tezgâha en yakın noktasından tezgâh ERİŞİLEBİLİR kalmalı (H1/O3: gövdeye pay).
      for (const [c, h] of [
        [sp.station, sp.half],
        [sp.dish, sp.dishHalf],
      ] as const) {
        expect(c[0] + h[0]).toBeGreaterThanOrEqual(ab.minX);
        expect(c[0] - h[0]).toBeLessThanOrEqual(ab.maxX);
        expect(c[2] + h[1]).toBeGreaterThanOrEqual(ab.minZ);
        expect(c[2] - h[1]).toBeLessThanOrEqual(ab.maxZ);
        const nx = Math.max(ab.minX, Math.min(ab.maxX, c[0]));
        const nz = Math.max(ab.minZ, Math.min(ab.maxZ, c[2]));
        expect(boxDist2D(nx, nz, c, h)).toBeLessThanOrEqual(economyConfig.cups.washRadius);
      }
    }
  });

  it('LAYOUT: her masa slotu KENDİ alanının sınırları içinde (areaOfTable ile)', () => {
    for (let i = 0; i < LAYOUT.tables.length; i++) {
      const ab = LAYOUT.areaBounds[areaOfTable(i)];
      const t = LAYOUT.tables[i].table;
      expect(t[0]).toBeGreaterThan(ab.minX);
      expect(t[0]).toBeLessThan(ab.maxX);
      expect(t[2]).toBeGreaterThan(ab.minZ);
      expect(t[2]).toBeLessThan(ab.maxZ);
    }
  });

  it('padler ALANDA durur ama personel GLOBAL havuza yazar (B2)', () => {
    for (const p of economyConfig.pads) {
      const a = (p as { area?: number }).area ?? 0;
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(MAX_AREAS);
    }
    // Bulaşıkçı pad'i 2. alanda DURUYOR (plan §4 adım 14) ama katın tek bulaşıkçısını verir.
    const dishPad = economyConfig.pads.find((p) => p.id === 'dishwasher')!;
    expect(dishPad.area).toBe(1);
    const w = deriveWorld([...B1_Z1, 'zone2', 'z2table2', 'z2table3', 'dishwasher']);
    expect(w.services[THE_SERVICE].hasDishwasher).toBe(true);
  });

  it('store: alan açılınca tables/stations/areasOpen dünyayla tutarlı kalır', () => {
    useGame.getState().hardReset();
    useGame.setState({ padsDone: [...B1_Z1] });
    useGame.getState().tick(0.1);
    let s = useGame.getState();
    let w = deriveWorld(s.padsDone);
    expect(s.tables).toBe(w.tables.length);
    expect(s.stations).toBe(openServices(w.areasOpen).length);
    expect(s.areasOpen).toBe(w.areasOpen);
    useGame.setState({ padsDone: [...B1_Z1, 'zone2'] });
    useGame.getState().tick(0.1);
    s = useGame.getState();
    w = deriveWorld(s.padsDone);
    expect(s.tables).toBe(w.tables.length);
    expect(s.stations).toBe(openServices(w.areasOpen).length);
    expect(s.areasOpen).toBe(2);
  });

  it('store: garson havuzu düz LİSTE — tutulan kadar aktör, fazlası yok', () => {
    useGame.getState().hardReset();
    useGame.setState({ padsDone: [...B1_Z1] });
    useGame.getState().tick(0.1);
    let s = useGame.getState();
    expect(s.waiters.length).toBe(1);
    expect(s.dishwasher).toBeNull(); // bulaşıkçı Bölüm 2'de
    useGame.setState({ padsDone: [...B1_Z1, ...B1_Z2] });
    useGame.getState().tick(0.1);
    s = useGame.getState();
    expect(s.waiters.length).toBe(1);
    expect(s.dishwasher).not.toBeNull();
  });

  it('defaultFloorTheme: B2de her alan parke doğar (yemek zemini alana bağlı DEĞİL)', () => {
    for (let a = 0; a < MAX_AREAS; a++) expect(defaultFloorTheme(a)).toBe('parke');
  });

  it('gating ayrışması: servis yükseltmesi TEK kapıdan, masa yükseltmesi ALANA bağlı', () => {
    const g = (padsDone: string[]) => ({ padsDone, tables: 4, stationLevel: 0, lifetime: 99999 });
    // Servis TEK → tek önkoşul: 2. masa ("önce kapasite, sonra verim").
    expect(stationUpgradeUnlocked(g([]))).toBe(false);
    expect(stationUpgradeUnlocked(g(['table2']))).toBe(true);
    // Masa yükseltmeleri ALANIN 4 masası açılınca (servis değil, alan sorusu).
    expect(tableUpgradeUnlockedIn(0, g(['table4']))).toBe(true);
    expect(tableUpgradeUnlockedIn(1, g(['table4']))).toBe(false);
    expect(tableUpgradeUnlockedIn(1, g(['table4', 'z2table4']))).toBe(true);
  });

  it('revealKeys: TEK upgrade anahtarı (servis) + ALAN başına tableUp', () => {
    const g = {
      padsDone: ['table2', 'table3', 'waiter', 'table4', 'zone2', 'z2table2'],
      tables: 5, stationLevel: 0, lifetime: 99999,
    };
    const keys = revealKeys(g, 2, [0]).map(([k]) => k);
    expect(keys.filter((k) => k.startsWith('upgrade:'))).toEqual(['upgrade:0']); // tek servis
    expect(keys).toContain('tableUp:0'); // 1. ALANIN masaları
    expect(keys).not.toContain('tableUp:1'); // 2. alanın 4 masası daha açılmadı
  });

  it('revealKeys: metin SEVİYENİN kimliğini söyler (L4ten sonra tezgâh)', () => {
    const g = { padsDone: ['table2'], tables: 4, stationLevel: 0, lifetime: 99999 };
    const ocak = revealKeys(g, 1, [0]).find(([k]) => k === 'upgrade:0')!;
    const tezgah = revealKeys(g, 1, [4]).find(([k]) => k === 'upgrade:0')!;
    expect(ocak[1]).toContain('ocağını');
    expect(tezgah[1]).toContain('Tezgâhı');
  });

  it('incomeRate ürün KARIŞIMINDAN hesaplanır (L5te tost payı orana girer)', () => {
    const cay = incomeRate(4, 0, 0);
    const tostlu = incomeRate(4, 5, 0);
    // L5'te hem throughput arttı hem menüye 25₺'lik ürün girdi → oran belirgin yükselir.
    expect(tostlu).toBeGreaterThan(cay);
    // L4'te tost payı 0 → oran saf çay formülüyle birebir.
    const bt4 = brewTime(4, PRODUCTS.tea.prepTime);
    const beklenen = (4 * PRODUCTS.tea.price) / (economyConfig.npc.walkTime + bt4 + economyConfig.npc.eatTime);
    expect(incomeRate(4, 4, 0)).toBeCloseTo(beklenen, 6);
  });
});


describe('Faz B1 — kayıt v31: TEMİZ SIFIRLAMA, migrasyon yok (D-058 karar 3)', () => {
  const KEY = 'kiraathane.save';

  // node test ortamında localStorage yok → geçici bellek mock'u (dosyadaki mevcut desen).
  function withStorage(seed: string | null, fn: () => void) {
    const mem: Record<string, string> = {};
    if (seed != null) mem[KEY] = seed;
    const g = globalThis as Record<string, unknown>;
    const orig = g.localStorage;
    g.localStorage = {
      getItem: (k: string) => (k in mem ? mem[k] : null),
      setItem: (k: string, v: string) => { mem[k] = v; },
      removeItem: (k: string) => { delete mem[k]; },
    };
    try {
      fn();
    } finally {
      if (orig === undefined) delete g.localStorage; else g.localStorage = orig;
    }
  }

  it('SAVE_VERSION 34e çıktı (S4 mutfak teması → v33 · D-142 garson tepsi kademesi → v34)', () => {
    expect(SAVE_VERSION).toBe(34);
    expect(defaultSave().saveVersion).toBe(34);
    expect(defaultSave().kitchenTheme).toBe('klasik');
  });

  // S4'ün asıl bekçisi: v32 kaydı SIFIRLANMAZ, göç eder. Şema EKLEMELİ değişti (yeni alan
  // `kitchenTheme`), ilerlemeyi etkileyen hiçbir şey değişmedi — CLAUDE.md: "eski kayıt migrate
  // edilir; ilerleme kaybolmaz". Bu test olmadan v33'e çıkmak sessizce ilerleme silerdi.
  it('loadSave: v32 kaydı GÖÇ EDER — ilerleme korunur, tema varsayılana düşer', () => {
    withStorage(
      JSON.stringify({
        ...defaultSave(),
        saveVersion: 32,
        wallet: '4242',
        padsDone: ['table2', 'table3', 'waiter'],
        tableLevels: [3, 2, 1, 0],
        ownedCosmetics: ['floor:dama:z0'],
        lastSaved: Date.now(),
      }),
      () => {
        const s = loadSave();
        expect(s.saveVersion).toBe(SAVE_VERSION);
        expect(s.wallet).toBe('4242'); // İLERLEME DURUYOR
        expect(s.padsDone).toEqual(['table2', 'table3', 'waiter']);
        expect(s.tableLevels).toEqual([3, 2, 1, 0]);
        expect(s.ownedCosmetics).toEqual(['floor:dama:z0']);
        expect(s.kitchenTheme).toBe('klasik'); // yeni alan varsayılanla doğar
      },
    );
  });

  it('resetKeepingSettings: İLERLEME sıfırlanır (para/pad/masa/görev)', () => {
    const r = resetKeepingSettings({
      saveVersion: 30, wallet: '99999', diamonds: '50', lifetime: '123456',
      padsDone: ['table2', 'zone2', 'z3table4'], tableLevels: [4, 4, 4, 4],
      stationLevels: [6, 3, 2], questIndex: 17, questBase: 40, xp: 900,
    });
    expect(r.saveVersion).toBe(SAVE_VERSION);
    expect(r.wallet).toBe('0');
    expect(r.diamonds).toBe('0');
    expect(r.lifetime).toBe('0');
    expect(r.padsDone).toEqual([]);
    expect(r.tableLevels).toEqual([]);
    expect(r.stationLevels).toEqual([]);
    expect(r.questsDone).toEqual([]);
    expect(r.questBase).toBe(0);
    expect(r.xp).toBe(0);
  });

  it('resetKeepingSettings: AYARLAR korunur (ses · müzik · bildirim · SEVİYELER)', () => {
    const r = resetKeepingSettings({
      saveVersion: 28,
      // `showFps` R3'te KALDIRILDI (D-128) ama ESKİ kayıtlar hâlâ taşıyor — sessizce düşmeli.
      settings: { sound: false, music: false, notifications: false, showFps: true, soundVolume: 0.3 },
    });
    expect(r.settings).toEqual({
      sound: false, music: false, notifications: false,
      // S9 · D-122: seviyeler de ayar; sıfırlama onları da korumak zorunda.
      soundVolume: 0.3, musicVolume: 1,
      // F2 · D-125: gölge tercihi de ayar. Kayıtta verilmemişti → varsayılan 'oto'ya düşer,
      // yani sıfırlama oyuncunun gölge tercihini de taşır ama uydurmaz.
      golge: 'oto',
      // i18n (2026-09-28): dil tercihi de ayar; verilmediyse 'oto' (telefonun dili).
      dil: 'oto',
    });
  });

  it('resetKeepingSettings: eksik/bozuk ayar alanı defaulta düşer (kısmi de olsa)', () => {
    const def = defaultSettings();
    expect(resetKeepingSettings({ saveVersion: 20 }).settings).toEqual(def);
    expect(resetKeepingSettings({ saveVersion: 20, settings: 'bozuk' }).settings).toEqual(def);
    const kismi = resetKeepingSettings({ saveVersion: 20, settings: { sound: false, music: 'evet' } });
    expect(kismi.settings.sound).toBe(false); // geçerli alan korunur
    expect(kismi.settings.music).toBe(def.music); // bozuk alan defaulta döner
  });

  it('resetKeepingSettings: kozmetik/karakter sahiplikleri de sıfırlanır (ilerleme sayılır)', () => {
    const r = resetKeepingSettings({
      saveVersion: 30,
      ownedCosmetics: ['floor:dama:z0', 'table:kirmizi'],
      charUpgrades: { tray: 3, magnet: 2, speed: 2 },
      waiterUpgrades: { ...defaultWaiterUpgrades(), tray: 3 },
      tableTheme: 'kirmizi',
      charPanelSeen: true,
    });
    expect(r.ownedCosmetics).toEqual([]);
    expect(r.charUpgrades).toEqual({ tray: 0, magnet: 0, speed: 0 });
    expect(r.waiterUpgrades).toEqual(defaultWaiterUpgrades());
    expect(r.tableTheme).toBe('mavi');
    expect(r.charPanelSeen).toBe(false); // taze oyun → onboarding yeniden gösterilir
  });

  it('loadSave: ESKİ sürüm kaydı sıfırlanır, ayarları taşınır', () => {
    withStorage(JSON.stringify({
      saveVersion: 30, wallet: '5000', padsDone: ['table2', 'table3'],
      settings: { sound: false, music: true, notifications: false, showFps: true },
      lastSaved: Date.now(),
    }), () => {
      const s = loadSave();
      expect(s.saveVersion).toBe(SAVE_VERSION);
      expect(s.wallet).toBe('0');
      expect(s.padsDone).toEqual([]);
      expect(s.settings.sound).toBe(false);
      // KALDIRILAN ALAN (D-128): eski kayıttaki `showFps` birleştirmeden geçmez, kayıt bozulmaz.
      expect('showFps' in s.settings).toBe(false);
    });
  });

  it('loadSave: GÜNCEL sürüm kaydı olduğu gibi yüklenir (sıfırlanmaz)', () => {
    withStorage(JSON.stringify({
      ...defaultSave(), wallet: '750', padsDone: ['table2'], lastSaved: Date.now(),
    }), () => {
      const s = loadSave();
      expect(s.wallet).toBe('750');
      expect(s.padsDone).toEqual(['table2']);
    });
  });

  it('loadSave: bozuk JSON / kayıt yokken taze oyun (çökmez)', () => {
    withStorage(null, () => {
      expect(loadSave().padsDone).toEqual([]);
    });
    withStorage('{bozuk', () => {
      expect(loadSave().saveVersion).toBe(SAVE_VERSION);
    });
  });

  it('kayıt şeması ALAN/SERVİS adlarını taşır (eski *ByZone alanları kalktı)', () => {
    const d = defaultSave();
    expect('floorThemeByArea' in d).toBe(true);
    expect('wallThemeByArea' in d).toBe(true);
    expect('floorThemeByZone' in d).toBe(false);
    expect('teasServedByArea' in d.stats).toBe(true);
    expect('waiterServedByService' in d.stats).toBe(true);
    expect('teasServedByZone' in d.stats).toBe(false);
  });
});
