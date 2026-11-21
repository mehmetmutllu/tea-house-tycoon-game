/**
 * T8a / D-142 — ZİNCİR SIRASI + T3 DENGE KOLLARI + YÜKSELTME NOKTASI KAPISI + SEVİYE ₺'Sİ.
 *
 * Karar paketi PK2 + garson tepsi tavanı 4 + seviye ₺'si 60 sn (Seviye 5'ten) + nokta kapısı.
 * Ölçüm: `docs/zincir-raporu-t8a.md` · final: `docs/olcum-t8a.txt` (taban = commit #1'in PK2 satırı).
 *
 * Mutasyon sınavı: `tools/mutasyon-zincir-t8a.mjs`.
 */
import { describe, it, expect } from 'vitest';
import {
  economyConfig as C,
  waiterTrayCapacityFor,
  waiterTrayMaxTier,
  charNextCost,
  levelProgress,
} from '../src/config/economy.config';
import { upgradeSpotLive, upgradeSpotLiveNow, levelRewardAmount, currentPad } from '../src/game/rules';
import { ekranKanali } from '../src/game/ekranKanali';
import { loadSave, SAVE_VERSION, defaultSave } from '../src/game/save';
import { useGame, LAYOUT, servicePlace } from '../src/game/store';
import type { Vec3 } from '../src/game/types';

const qi = (id: string) => C.quests.findIndex((q) => q.id === id);
const pad = (id: string) => C.pads.find((p) => p.id === id)!;

describe('1 · seçilen sayılar (PK2)', () => {
  it('tepsi T1 ₺25 (S5 G-92) · 4. masa ₺250 · 2. garson ₺800 · seviye tabanı 90', () => {
    expect(charNextCost('tray', 0)).toBe(25);
    expect(pad('table4').cost).toBe(250);
    expect(pad('waiter2').cost).toBe(800);
    expect(C.xp.levelBase).toBe(90);
  });

  it('garson 2 bardakla başlar, tavan 4 (iki kademe: ₺1.200 · ₺2.500)', () => {
    expect(waiterTrayCapacityFor(0)).toBe(2);
    expect(waiterTrayMaxTier()).toBe(2);
    expect(waiterTrayCapacityFor(waiterTrayMaxTier())).toBe(4);
    expect(C.waiter.trayUpgrades.costs).toEqual([1200, 2500]);
  });

  it('pad dolum süresi bandı korunur (≤ 3,5 sn) — fiyatla birlikte dolum hızı da taşındı', () => {
    for (const id of ['table4', 'waiter2']) expect(pad(id).cost / pad(id).fillRate).toBeLessThanOrEqual(3.55);
  });
});

describe('2 · zincir (G-86): 2. garson Salon 1 sonunda, tepsi-3 hatta', () => {
  it('pad zinciri: table4 → waiter2 → zone2 ; z3table2 → z3table3', () => {
    expect(pad('waiter2').requires).toEqual({ prev: ['table4'] });
    expect(pad('zone2').requires).toEqual({ prev: ['waiter2'] });
    expect(pad('z3table3').requires).toEqual({ prev: ['z3table2'] });
    expect(currentPad({ padsDone: ['table2', 'table3', 'waiter', 'table4'], tables: 4, stationLevel: 2, lifetime: 1e6 })?.id).toBe('waiter2');
  });

  it('görev: q_waiter2 mıknatıstan hemen sonra, 2. salondan hemen önce', () => {
    expect(qi('q_waiter2')).toBe(qi('q_charMagnet') + 1);
    expect(qi('q_zone2')).toBe(qi('q_waiter2') + 1);
  });

  it('garson tepsisi hattı: eski 1. kademe görevi yok; 2. görev kademe 1, yeni son görev kademe 2', () => {
    expect(qi('q_waiterTray1')).toBe(-1);
    expect(C.quests[qi('q_waiterTray2')].target).toEqual({ type: 'waiterTray', tier: 1 });
    expect(qi('q_waiterTray3')).toBe(qi('q_waiter3') + 1);
    expect(C.quests[qi('q_waiterTray3')].target).toEqual({ type: 'waiterTray', tier: 2 });
  });

  it('2. garson pad\'i Salon 1 AÇIKKEN yürünebilir yerde (eski yeri Salon 3 bandıydı)', () => {
    const [x, , z] = LAYOUT.padPos.waiter2;
    const a0 = LAYOUT.areaBounds[0];
    expect(x).toBeGreaterThanOrEqual(a0.minX);
    expect(x).toBeLessThanOrEqual(a0.maxX);
    expect(z).toBeGreaterThanOrEqual(a0.minZ);
    expect(z).toBeLessThanOrEqual(a0.maxZ);
  });
});

describe('3 · yükseltme noktası kapısı (G-61)', () => {
  it('nokta yalnız kendi görev türünde canlı', () => {
    expect(upgradeSpotLive('station', qi('q_station1'))).toBe(true);
    expect(upgradeSpotLive('table', qi('q_station1'))).toBe(false);
    expect(upgradeSpotLive('table', qi('q_tableL2'))).toBe(true);
    expect(upgradeSpotLive('station', qi('q_tableL2'))).toBe(false);
    expect(upgradeSpotLive('lavabo', qi('q_lavabo2'))).toBe(true);
    // pad / sayaç görevinde hiçbiri
    for (const k of ['station', 'table', 'lavabo'] as const) {
      expect(upgradeSpotLive(k, qi('q_zone2'))).toBe(false);
      expect(upgradeSpotLive(k, qi('q_wash'))).toBe(false);
    }
  });

  it('hat bitince hepsi canlı', () => {
    for (const k of ['station', 'table', 'lavabo'] as const) expect(upgradeSpotLive(k, C.quests.length)).toBe(true);
  });

  it('görev geçiş penceresinde hiçbiri (G-60 ile aynı sıra)', () => {
    const q = { questIndex: qi('q_station1'), questDoneIndex: qi('q_station1') - 1, questPhase: 'completing' as const };
    expect(upgradeSpotLiveNow(q, 'station')).toBe(false);
    expect(upgradeSpotLiveNow({ ...q, questPhase: 'active' }, 'station')).toBe(true);
  });

  it('GERÇEK TICK: görevi olmayan ocak noktasında dolum akmaz, ocak görevinde akar', () => {
    const dolum = (questIndex: number): number => {
      useGame.getState().hardReset();
      useGame.setState({
        padsDone: ['table2'], upgradeFills: [0, 0, 0], questIndex, questPhase: 'active', questPhaseT: 0,
        npcs: [], spawnTimer: 999, inputKeyboard: [0, 0], inputJoystick: [0, 0],
      });
      useGame.getState().addMoney(10_000);
      const u = servicePlace(1).upgradeSpot;
      useGame.setState({ player: [u[0], 0.6, u[2]] as Vec3 });
      for (let i = 0; i < 6; i++) useGame.getState().tick(0.05);
      return useGame.getState().upgradeFills[0];
    };
    expect(dolum(qi('q_station1')), 'ocak görevinde dolum akmalı (ölçüt kör değil)').toBeGreaterThan(0);
    expect(dolum(qi('q_table3')), 'pad görevinde ocak noktası kapalı').toBe(0);
  });
});

describe('4 · seviye ödülü (G-66/G-67)', () => {
  it('Seviye 5\'ten önce ₺ yok; sonra son 60 sn\'nin kazancı', () => {
    expect(C.xp.levelRewardFromLevel).toBe(5);
    expect(C.xp.levelRewardSec).toBe(60);
    for (const lv of [2, 3, 4]) expect(levelRewardAmount(lv, 500)).toBe(0);
    expect(levelRewardAmount(5, 500.7)).toBe(500);
    expect(levelRewardAmount(9, -3)).toBe(0);
  });

  it('GERÇEK TICK: seviye atlama TOAST değil ödül ekranı; ₺ "Al" ile cüzdana geçer', () => {
    useGame.getState().hardReset();
    // Seviye 5'in eşiğinin 1 XP altı; bir pad tamamlanınca (perPad XP) seviye 5'e atlar.
    let need = 0;
    for (let l = 1; l < 5; l++) need += Math.round(C.xp.levelBase * Math.pow(C.xp.levelGrowth, l - 1));
    expect(levelProgress(need - 1).level).toBe(4);
    expect(levelProgress(need - 1 + C.xp.perPad).level).toBe(5);
    useGame.getState().addMoney(240); // son pencerede kazanılan: 240 (iz 0'dan başlıyor)
    const p = pad('table2');
    useGame.setState({
      xp: need - 1,
      // Hat bitmiş kurulur: görev ödülü (₺) pencereye karışmasın, pad omurgadan görünsün.
      questIndex: C.quests.length, questPhase: 'active', questPhaseT: 0,
      gelirIzi: [0], gelirIziT: 99, npcs: [], spawnTimer: 999,
      padsDone: [], padFills: { table2: p.cost - 0.01 },
      player: [LAYOUT.padPos.table2[0], 0.6, LAYOUT.padPos.table2[2]] as Vec3,
      inputKeyboard: [0, 0], inputJoystick: [0, 0],
    });
    useGame.getState().tick(0.05);
    const s = useGame.getState();
    expect(s.padsDone).toContain('table2');
    expect(s.levelUp, 'seviye ödül ekranı kuruldu').not.toBeNull();
    expect(s.levelUp!.level).toBe(5);
    expect(s.levelUp!.amount).toBe(240);
    expect(s.levelUp!.carryAfter).toBeGreaterThan(s.levelUp!.carryBefore);
    expect(s.notice?.kind ?? null, 'seviye TOAST üretmez').not.toBe('level');
    // Ekran kapanmadan ikinci bir seviye: ödüller TEK ekranda birikir (ilki kaybolmaz).
    const need6 = need + Math.round(C.xp.levelBase * Math.pow(C.xp.levelGrowth, 4));
    const p3 = pad('table3');
    useGame.setState({
      xp: need6 - 1, gelirIziT: 99, padFills: { table3: p3.cost - 0.01 },
      player: [LAYOUT.padPos.table3[0], 0.6, LAYOUT.padPos.table3[2]] as Vec3,
    });
    useGame.getState().tick(0.05);
    expect(useGame.getState().padsDone).toContain('table3');
    expect(useGame.getState().levelUp!.level).toBe(6);
    expect(useGame.getState().levelUp!.amount).toBe(480);
    expect(useGame.getState().levelUp!.carryBefore).toBe(s.levelUp!.carryBefore);
    const once = useGame.getState().wallet.toNumber();
    useGame.getState().claimLevelUp();
    expect(useGame.getState().levelUp).toBeNull();
    expect(useGame.getState().wallet.toNumber()).toBeCloseTo(once + 480, 6);
  });

  it("Seviye 5'ten ÖNCE atlanan seviye ekran açar ama ₺ vermez (açılış korunur)", () => {
    useGame.getState().hardReset();
    useGame.getState().addMoney(240);
    const p = pad('table2');
    useGame.setState({
      xp: Math.round(C.xp.levelBase) - 1, // Seviye 2'nin 1 altı
      questIndex: C.quests.length, questPhase: 'active', questPhaseT: 0,
      gelirIzi: [0], gelirIziT: 99, npcs: [], spawnTimer: 999,
      padsDone: [], padFills: { table2: p.cost - 0.01 },
      player: [LAYOUT.padPos.table2[0], 0.6, LAYOUT.padPos.table2[2]] as Vec3,
      inputKeyboard: [0, 0], inputJoystick: [0, 0],
    });
    useGame.getState().tick(0.05);
    const lu = useGame.getState().levelUp;
    expect(lu?.level).toBe(2);
    expect(lu?.amount).toBe(0);
  });

  it('ekran kanalı: seviye ekranı kutlama/panel/bildirim bitene kadar BEKLER, ipucudan önce gelir', () => {
    const g = {
      cevrimdisiVar: false, ustaVar: false, panelAcik: false, bildirimVar: false, gecisPenceresi: false,
      seviyeVar: true, bulasikOgretmeHazir: true, karakterIpucuHazir: true, tepsiIpucuHazir: true,
    };
    expect(ekranKanali(g)).toBe('seviye');
    expect(ekranKanali({ ...g, gecisPenceresi: true })).toBeNull();
    expect(ekranKanali({ ...g, panelAcik: true })).toBeNull();
    expect(ekranKanali({ ...g, cevrimdisiVar: true })).toBe('cevrimdisi');
  });
});

describe('5 · kayıt v33 → v34: garson tepsi KAPASİTESİ korunur', () => {
  const withStorage = (raw: string, fn: () => void) => {
    const g = globalThis as unknown as { localStorage?: unknown };
    const orig = g.localStorage;
    const mem: Record<string, string> = { 'kiraathane.save': raw };
    g.localStorage = {
      getItem: (k: string) => (k in mem ? mem[k] : null),
      setItem: (k: string, v: string) => { mem[k] = v; },
      removeItem: (k: string) => { delete mem[k]; },
    };
    try { fn(); } finally { if (orig === undefined) delete g.localStorage; else g.localStorage = orig; }
  };

  it('eski kademe k (kapasite 1+k) → yeni kademe k−1 (kapasite 2+(k−1)) · kademe 0 → 0', () => {
    expect(SAVE_VERSION).toBe(34);
    for (const [eski, yeni] of [[0, 0], [1, 0], [2, 1], [3, 2]]) {
      const kayit = { ...defaultSave(), saveVersion: 33, wallet: '777', waiterUpgrades: { ...defaultSave().waiterUpgrades, tray: eski } };
      withStorage(JSON.stringify(kayit), () => {
        const s = loadSave();
        expect(s.saveVersion).toBe(34);
        expect(s.wallet, 'ilerleme korunur').toBe('777');
        expect(s.waiterUpgrades.tray).toBe(yeni);
        if (eski > 0) expect(waiterTrayCapacityFor(yeni)).toBe(1 + eski);
      });
    }
  });

  it('v32 kaydı iki adımda göçer (v33 teması + v34 tepsisi)', () => {
    const kayit = { ...defaultSave(), saveVersion: 32, waiterUpgrades: { ...defaultSave().waiterUpgrades, tray: 2 } } as Record<string, unknown>;
    delete kayit.kitchenTheme;
    withStorage(JSON.stringify(kayit), () => {
      const s = loadSave();
      expect(s.saveVersion).toBe(34);
      expect(s.kitchenTheme).toBe('klasik');
      expect(s.waiterUpgrades.tray).toBe(1);
    });
  });
});
