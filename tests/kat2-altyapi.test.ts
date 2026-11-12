/**
 * kat2-altyapi.test.ts — K2-2 BEKÇİSİ: kat altyapısı (kayıt · merdiven geçişi · Kat 2'de yürüyüş).
 *
 * Oyun yayında: Kat 2 alanları eklenince ESKİ kayıt hiçbir şey kaybetmemeli (CLAUDE.md "ilerleme
 * kaybolmaz"). Kat 2'deyken Kat 1 kendi başına işler ama oyuncunun eli ona DEĞMEZ — Kat 2'de
 * yürürken altındaki Kat 1 salonunun parası toplanmamalı, pad'i dolmamalı.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { defaultSave, kayitCoz, SAVE_VERSION } from '../src/game/save';
import {
  AGIZ,
  GECIS_SN,
  KUYU,
  VARIS,
  baslangicKati,
  defaultKat2,
  gecisKarartma,
  kat2Adim,
  merdivenTetik,
} from '../src/game/kat';
import { BAND, LAYOUT, hitsSolid } from '../src/game/layout';
import type { Vec3 } from '../src/game/types';

function withStorage(fn: (mem: Record<string, string>) => void): void {
  const mem: Record<string, string> = {};
  const g = globalThis as Record<string, unknown>;
  const orig = g.localStorage;
  g.localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
  try { fn(mem); } finally { if (orig === undefined) delete g.localStorage; else g.localStorage = orig; }
}

/** Kat 1'i bitmiş bir dükkân (bütün pad'ler → 3 alan açık), merdiven açık. */
function bitmisKat1(merdiven = true): void {
  useGame.getState().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  useGame.getState().saveNow();
  useGame.getState().init();
  if (merdiven) useGame.getState().kat2Ac();
}

/** Girdiyi tutup `sn` saniye ilerletir (0,05 sn'lik kareler). */
function yuru(x: number, z: number, sn: number): void {
  useGame.getState().setKeyboardInput(x, z);
  for (let t = 0; t < sn; t += 0.05) useGame.getState().tick(0.05);
  useGame.getState().setKeyboardInput(0, 0);
}

function koy(x: number, z: number): void {
  useGame.setState({ player: [x, 0.6, z] as Vec3 });
}

afterEach(() => vi.restoreAllMocks());

describe('kayıt — eski kayıt Kat 2 alanları olmadan açılır, hiçbir şey kaybetmez', () => {
  it('v34 kaydı (kat/kat2 yok) → Kat 1, merdiven kapalı; diğer her alan AYNEN', () => {
    const eski = {
      ...defaultSave(),
      saveVersion: SAVE_VERSION,
      wallet: '12345',
      diamonds: '77',
      lifetime: '999999',
      padsDone: C.pads.slice(0, 9).map((p) => p.id),
      stationLevels: [4],
      tableLevels: [3, 2, 1],
      xp: 4321,
      kafeAdi: 'Bizim Ocak',
    } as Record<string, unknown>;
    delete eski.kat;
    delete eski.kat2;
    const { data, red } = kayitCoz(eski);
    expect(red).toEqual([]);
    expect(data.kat).toBe(1);
    expect(data.kat2).toEqual(defaultKat2());
    for (const k of Object.keys(eski)) {
      if (k === 'lastSaved') continue;
      expect(data[k as keyof typeof data], k).toEqual(eski[k]);
    }
  });

  it('bozuk kat alanları onarılır; gelecek sürümün Kat 2 alanları korunur', () => {
    const ham = { ...defaultSave(), kat: 7, kat2: { acik: 'evet', padsDone: ['k2a', 5, null], okeyMasa: [1, 2] } };
    const { data } = kayitCoz(ham as unknown as Record<string, unknown>);
    expect(data.kat).toBe(1);
    expect(data.kat2.acik).toBe(false);
    expect(data.kat2.padsDone).toEqual(['k2a']);
    expect((data.kat2 as unknown as Record<string, unknown>).okeyMasa).toEqual([1, 2]);
  });

  it('başlangıç katı: yalnız merdiven açık + kat etkin + kayıt Kat 2 diyorsa Kat 2', () => {
    const acik = { acik: true, padsDone: [] };
    expect(baslangicKati(2, acik, true)).toBe(2);
    expect(baslangicKati(2, acik, false)).toBe(1); // üretim kapısı kapalı → kimse boş kata hapsolmaz
    expect(baslangicKati(2, defaultKat2(), true)).toBe(1); // merdiven yok
    expect(baslangicKati(1, acik, true)).toBe(1);
    expect(baslangicKati('2', acik, true)).toBe(1);
  });

  it('Kat 2\'de kaydedilen oyun Kat 2\'de, varış noktasında açılır', () => {
    withStorage(() => {
      bitmisKat1();
      useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3 });
      useGame.getState().saveNow();
      useGame.setState({ kat: 1 });
      useGame.getState().init();
      expect(useGame.getState().kat).toBe(2);
      expect(useGame.getState().kat2.acik).toBe(true);
      expect(useGame.getState().player).toEqual(VARIS[2]);
    });
  });
});

describe('merdiven — Kat 1 ↔ Kat 2 geçişi', () => {
  it('Kat 1\'de merdivene yürüyünce perde iner, yarıda kat değişir, sonda kalkar', () => {
    withStorage(() => {
      bitmisKat1();
      koy(0, BAND.front + 0.5);
      useGame.getState().setKeyboardInput(0, -1);
      for (let i = 0; i < 20 && !useGame.getState().katGecis; i++) useGame.getState().tick(0.05);
      useGame.getState().setKeyboardInput(0, 0);
      expect(useGame.getState().katGecis?.hedef).toBe(2);
      expect(useGame.getState().kat).toBe(1);
      for (let t = 0; t < GECIS_SN / 2 + 0.06; t += 0.05) useGame.getState().tick(0.05);
      expect(useGame.getState().kat).toBe(2);
      expect(useGame.getState().player).toEqual(VARIS[2]);
      for (let t = 0; t < GECIS_SN; t += 0.05) useGame.getState().tick(0.05);
      expect(useGame.getState().katGecis).toBeNull();
      expect(useGame.getState().kat).toBe(2);
    });
  });

  it('Kat 2\'de sahanlıktan kuyuya itince Kat 1\'e, merdivenin önüne iner', () => {
    withStorage(() => {
      bitmisKat1();
      useGame.setState({ kat: 2 });
      koy(0, AGIZ.sahanlik - LAYOUT.playerRadius - 0.05);
      yuru(0, 1, GECIS_SN / 2 + 0.1); // perde inene dek it; kat yarıda değişir
      expect(useGame.getState().kat).toBe(1);
      expect(useGame.getState().player).toEqual(VARIS[1]);
    });
  });

  it('varışta oyuncu geri tetiklemez (aynı girdiyi tutsa da ping-pong yok)', () => {
    withStorage(() => {
      bitmisKat1();
      koy(0, BAND.front + 0.5);
      yuru(0, -1, 3);
      expect(useGame.getState().kat).toBe(2);
      expect(useGame.getState().katGecis).toBeNull();
    });
  });

  it('merdiven kapalıyken ya da 3. alan açılmadan geçilmez', () => {
    withStorage(() => {
      bitmisKat1(false);
      koy(0, BAND.front + 0.5);
      yuru(0, -1, 1);
      expect(useGame.getState().katGecis).toBeNull();
      expect(useGame.getState().kat).toBe(1);
      expect(useGame.getState().katDegistir(2)).toBe(false);

      useGame.getState().hardReset();
      useGame.getState().kat2Ac();
      expect(useGame.getState().areasOpen).toBeLessThan(3);
      koy(0, BAND.front + 0.5);
      yuru(0, -1, 1);
      expect(useGame.getState().kat).toBe(1);
    });
  });

  it('karartma: 0 → 1 (yarı) → 0', () => {
    expect(gecisKarartma(null)).toBe(0);
    expect(gecisKarartma({ hedef: 2, t: 0 })).toBe(0);
    expect(gecisKarartma({ hedef: 2, t: GECIS_SN / 2 })).toBeCloseTo(1);
    expect(gecisKarartma({ hedef: 2, t: GECIS_SN })).toBeCloseTo(0);
  });

  it('tetik yalnız merdivenin hizasında ve ona doğru itince', () => {
    expect(merdivenTetik(1, 0, BAND.front, [0, -1])).toBe(true);
    expect(merdivenTetik(1, 0, BAND.front, [0, 1])).toBe(false);
    expect(merdivenTetik(1, 4, BAND.front, [0, -1])).toBe(false);
    expect(merdivenTetik(1, 0, BAND.front + 2, [0, -1])).toBe(false);
    expect(merdivenTetik(2, 0, AGIZ.sahanlik - 0.5, [0, 1])).toBe(true);
    expect(merdivenTetik(2, 0, AGIZ.sahanlik - 0.5, [0, -1])).toBe(false);
  });
});

describe('Kat 2\'deyken Kat 1 kendi başına işler, oyuncunun eli değmez', () => {
  it('Kat 2\'de yürünen yerin altındaki Kat 1 parası toplanmaz, kamera Kat 1\'e çekilmez', () => {
    withStorage(() => {
      bitmisKat1();
      useGame.setState({ kat: 2 });
      // Kat 2 salonundaki nokta Kat 1'in arka salonunun TAM üstü.
      koy(-8, -5);
      useGame.setState({ coins: [{ id: 99999, pos: [-8, 0.1, -5] as Vec3, value: 50, age: 5 } as never] });
      const toplanan = useGame.getState().stats.coinsCollected;
      useGame.getState().focusQuest();
      useGame.getState().tick(0.05);
      useGame.getState().tick(0.05);
      expect(useGame.getState().coins.some((c) => (c as { id: number }).id === 99999)).toBe(true);
      expect(useGame.getState().stats.coinsCollected).toBe(toplanan);
      expect(useGame.getState().camFocus).toBeNull();
      expect(useGame.getState().player[0]).toBeCloseTo(-8);
      expect(useGame.getState().player[2]).toBeCloseTo(-5);
    });
  });

  it('Kat 2\'deyken Kat 1\'e müşteri gelir (kat donmaz)', () => {
    withStorage(() => {
      bitmisKat1();
      useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3 });
      for (let t = 0; t < 30; t += 0.1) useGame.getState().tick(0.1);
      expect(useGame.getState().npcCount).toBeGreaterThan(0);
      expect(useGame.getState().kat).toBe(2);
    });
  });
});

describe('Kat 2\'de yürüyüş', () => {
  const PR = LAYOUT.playerRadius;

  it('merdiven kuyusuna girilmez (yan ve ön korkuluk)', () => {
    let [x, z] = [-3.2, -12.5];
    for (let i = 0; i < 100; i++) [x, z] = kat2Adim(x, z, 0.1, 0);
    expect(hitsSolid(x, z, [KUYU], PR)).toBe(false);
    expect(x).toBeLessThan(-AGIZ.x);
    [x, z] = [0, -8];
    for (let i = 0; i < 100; i++) [x, z] = kat2Adim(x, z, 0, -0.1);
    expect(z).toBeGreaterThan(AGIZ.on);
  });

  it('sahanlıktan kuyunun yanından salona yürünür', () => {
    let [x, z] = [...VARIS[2].filter((_, i) => i !== 1)] as [number, number];
    for (let i = 0; i < 200; i++) [x, z] = kat2Adim(x, z, 0, 0.1);
    expect(z).toBeGreaterThan(BAND.front);
  });

  it('kilitli ön salonlara ve bandın kapalı yanlarına geçilmez', () => {
    let [x, z] = [-8, -5];
    for (let i = 0; i < 200; i++) [x, z] = kat2Adim(x, z, 0, 0.1);
    expect(z).toBeLessThan(0);
    [x, z] = [-3.3, -14];
    for (let i = 0; i < 200; i++) [x, z] = kat2Adim(x, z, -0.1, 0);
    expect(x).toBeGreaterThan(BAND.stairs.minX);
    [x, z] = [-10, -5];
    for (let i = 0; i < 200; i++) [x, z] = kat2Adim(x, z, 0, -0.1);
    expect(z).toBeGreaterThanOrEqual(BAND.front);
  });

  it('varış noktası yürünebilir ve tetiğin dışında', () => {
    const [vx, , vz] = VARIS[2];
    expect(kat2Adim(vx, vz, 0, 0)).toEqual([vx, vz]);
    expect(merdivenTetik(2, vx, vz, [0, 1])).toBe(false);
    expect(merdivenTetik(1, VARIS[1][0], VARIS[1][2], [0, -1])).toBe(false);
  });
});
