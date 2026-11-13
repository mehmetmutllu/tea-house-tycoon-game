/**
 * kat2-akis.test.ts — K2-6 BEKÇİSİ (D-191 akışı + D-192 sayıları).
 *
 * Kata çıkışta hazır okey masası + ocak · eski Kat 2 kaydı bunları yüklemede kazanır · zincir D-191
 * sırasında (lavabo okey salonundan sonra, tavla köşesinden önce) · Kat 2 lavabosu Kat 1 L1 gibi para
 * getirir (beklenen değer birebir, rastgele değil) · Kat 1'de merdiven pad'i omurga bitince belirir,
 * dolunca kat açılır.
 */
import { describe, it, expect } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { kat1OmurgaBitti, kat2Oran } from '../src/game/rules';
import {
  KAT2_KISI,
  KAT2_LAVABO_PAD,
  KAT2_LAVABO_YER,
  KAT2_MASALAR,
  MERDIVEN_PAD,
  MERDIVEN_PAD_YER,
  VARIS,
  kat2HazirEkle,
  merdivenPadAcik,
} from '../src/game/kat';
import { kat2Tick, kat2ZincirHatasi, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya } from '../src/game/kat2Dongu';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';

const A: Kat2Ayar = C.kat2;
const HAZIR = C.kat2.hazir;
const ZINCIR = A.padler.map((p) => p.id);
const OKEY = KAT2_MASALAR.find((m) => m.id === 'k2okey2')!;
const TAVLA = KAT2_MASALAR.find((m) => m.tur === 'tavla')!;

function withStorage(fn: () => void): void {
  const mem: Record<string, string> = {};
  const g = globalThis as Record<string, unknown>;
  const orig = g.localStorage;
  g.localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
  try { fn(); } finally { if (orig === undefined) delete g.localStorage; else g.localStorage = orig; }
}

/** Masa `id`'nin grubunu oyunun son anına getirir; `dt` sonra kalkar. */
function kalkacak(d: Kat2Dunya, ids: readonly string[]): Kat2Dunya {
  return { ...d, masalar: d.masalar.map((m) => (ids.includes(m.id) ? { ...m, durum: 'oyunda' as const, t: 0.05, istek: 0 } : m)) };
}
const UZAK = { x: 0, z: -1, durdu: true, cuzdan: 0, tepsiKap: 0, miknatis: 0.1 };

describe('config — D-191 hazır başlangıç + D-192 zinciri', () => {
  it('hazır = merdivene en yakın iç okey masası + ilk ocak; zincirde yoklar', () => {
    expect([...HAZIR]).toEqual(['k2okey2', 'k2cezve']);
    for (const id of HAZIR) expect(ZINCIR).not.toContain(id);
    expect(Math.abs(OKEY.x)).toBeLessThan(Math.abs(KAT2_MASALAR.find((m) => m.id === 'k2okey1')!.x));
  });

  it('zincir D-191 sırasında: lavabo okey salonu + 2. ocaktan sonra, tavla köşesinden önce; yapı tutarlı', () => {
    const i = (id: string) => ZINCIR.indexOf(id);
    expect(i(KAT2_LAVABO_PAD)).toBeGreaterThan(i('k2cezve2'));
    expect(i(KAT2_LAVABO_PAD)).toBeGreaterThan(i('k2s2okey6'));
    expect(i(KAT2_LAVABO_PAD)).toBeLessThan(i('k2salon3'));
    expect(ZINCIR).toHaveLength(26);
    expect(kat2ZincirHatasi({ ...A, padler: [...HAZIR, ...ZINCIR].map((id) => ({ id, cost: 1, fillRate: 1 })) })).toBeNull();
    for (const p of A.padler) expect(p.fillRate).toBe(Math.round(p.cost / 3.5));
  });

  it('lavabo = Kat 1 lavabosunun L1 sayıları · merdiven 9.400 (dolum ~3,5 sn)', () => {
    expect(A.lavabo).toEqual({ ugrama: C.rooms.lavabo.visitChanceByLevel[0], ucret: C.rooms.lavabo.feeByLevel[0] });
    expect(C.kat2.merdiven).toEqual({ cost: 9_400, fillRate: Math.round(9_400 / 3.5) });
  });
});

describe('hazır pad birleşimi (kayıt + merdiven açılışı)', () => {
  it('kapalı kat dokunulmaz; açık katta eksik hazır pad başa eklenir, tamsa kimlik korunur', () => {
    const kapali = { acik: false, padsDone: [] };
    expect(kat2HazirEkle(kapali, HAZIR)).toBe(kapali);
    expect(kat2HazirEkle({ acik: true, padsDone: ['k2okey1'] }, HAZIR).padsDone).toEqual(['k2okey2', 'k2cezve', 'k2okey1']);
    const tam = { acik: true, padsDone: ['k2cezve', 'k2okey2'] };
    expect(kat2HazirEkle(tam, HAZIR)).toBe(tam);
  });

  it('merdiven açılınca (kat2Ac) hazır masa boş/oynanır, ocak açık', () => {
    useGame.getState().hardReset();
    useGame.getState().kat2Ac();
    const s = useGame.getState();
    expect(s.kat2.acik).toBe(true);
    expect([...s.kat2.padsDone].sort()).toEqual([...HAZIR].sort());
    expect(s.kat2Dunya.masalar.find((m) => m.id === OKEY.id)!.durum).toBe('bos');
    expect(s.kat2Dunya.masalar.find((m) => m.id === 'k2okey1')!.durum).toBe('kapali');
  });

  it('eski Kat 2 kaydı (hazır pad\'siz) yüklemede onları kazanır — ilerleme kaybolmaz', () => {
    withStorage(() => {
      useGame.getState().hardReset();
      useGame.setState({ kat2: { acik: true, padsDone: ['k2okey1', 'k2okey3'] } }); // D-191 öncesi kayıt
      useGame.getState().saveNow();
      useGame.getState().init();
      const s = useGame.getState();
      expect(s.kat2.padsDone).toEqual(expect.arrayContaining(['k2okey1', 'k2okey3', ...HAZIR]));
      expect(s.kat2Dunya.masalar.find((m) => m.id === OKEY.id)!.durum).toBe('bos');
    });
  });
});

describe('Kat 2 lavabosu (D-192) — beklenen değer birebir, yığın lavabonun önünde', () => {
  const pd = [...HAZIR, TAVLA.id, KAT2_LAVABO_PAD];

  it('okey grubu (4 × %30 = 1,2 kişi) → 1 kişilik ücret düşer, 0,2 birikir; sonraki tavla (0,6) → toplam 1,8 → yine 0', () => {
    let d = kalkacak(yeniKat2Dunya(pd, A), [OKEY.id]);
    let r = kat2Tick(d, { ...UZAK, padsDone: pd }, 0.1, A);
    expect(r.olay.lavabo).toBe(A.lavabo!.ucret);
    expect(r.dunya.lavaboSayac).toBeCloseTo(KAT2_KISI.okey * A.lavabo!.ugrama - 1);
    const yigin = r.dunya.paralar.find((p) => p.x === KAT2_LAVABO_YER[0] && p.z === KAT2_LAVABO_YER[1]);
    expect(yigin?.miktar).toBe(A.lavabo!.ucret);
    expect(r.olay.dusen).toHaveLength(1); // masa yığını ayrı; lavabo `dusen`e girmez
    d = kalkacak(r.dunya, [TAVLA.id]);
    r = kat2Tick(d, { ...UZAK, padsDone: pd }, 0.1, A);
    expect(r.olay.lavabo).toBe(0);
    expect(r.dunya.lavaboSayac).toBeCloseTo(0.8);
  });

  it('uzun koşuda lavabo payı = kalkan kişi × uğrama × ücret (±1 kişi); tek yığında birikir', () => {
    let d = yeniKat2Dunya(pd, A);
    let lav = 0;
    let kisi = 0;
    for (let t = 0; t < 3600; t += 0.1) {
      const r = kat2Tick(d, { ...UZAK, padsDone: pd }, 0.1, A);
      d = r.dunya;
      lav += r.olay.lavabo;
      for (const id of r.olay.kalkan) kisi += KAT2_KISI[KAT2_MASALAR.find((m) => m.id === id)!.tur];
    }
    expect(kisi).toBeGreaterThan(50);
    expect(Math.abs(lav - kisi * A.lavabo!.ugrama * A.lavabo!.ucret)).toBeLessThanOrEqual(A.lavabo!.ucret);
    expect(d.paralar.filter((p) => p.x === KAT2_LAVABO_YER[0] && p.z === KAT2_LAVABO_YER[1])).toHaveLength(1);
  });

  it('lavabo pad\'i açılmadan ya da ayar yoksa (süs) para düşmez', () => {
    const pd0 = [...HAZIR, TAVLA.id];
    const r0 = kat2Tick(kalkacak(yeniKat2Dunya(pd0, A), [OKEY.id]), { ...UZAK, padsDone: pd0 }, 0.1, A);
    expect(r0.olay.lavabo).toBe(0);
    const sus: Kat2Ayar = { ...A, lavabo: undefined };
    const r1 = kat2Tick(kalkacak(yeniKat2Dunya(pd, sus), [OKEY.id]), { ...UZAK, padsDone: pd }, 0.1, sus);
    expect(r1.olay.lavabo).toBe(0);
  });

  it('oyuncu yığına yaklaşınca toplar (masa yığını gibi)', () => {
    const d = kalkacak(yeniKat2Dunya(pd, A), [OKEY.id]);
    const r = kat2Tick(d, { ...UZAK, padsDone: pd }, 0.1, A);
    const r2 = kat2Tick(r.dunya, { ...UZAK, x: KAT2_LAVABO_YER[0], z: KAT2_LAVABO_YER[1], miknatis: 1, padsDone: pd }, 0.1, A);
    expect(r2.kazanc).toBeGreaterThanOrEqual(A.lavabo!.ucret);
  });

  it('çevrimdışı oranı (rules.kat2Oran) lavabo açılınca kişi × uğrama × ücret kadar artar', () => {
    const fark = kat2Oran([...HAZIR, KAT2_LAVABO_PAD]) - kat2Oran([...HAZIR]);
    expect(fark).toBeCloseTo((KAT2_KISI.okey * A.lavabo!.ugrama * A.lavabo!.ucret) / (A.gelisAralik + A.yurume + A.oturum));
  });
});

describe('Kat 1 merdiven pad\'i (D-192)', () => {
  function kat1Bitmis(cuzdan: number): void {
    // Kat 1'i bitmiş dükkân: türetmeler (alanlar, masalar) init'ten gelsin diye bir kez kaydedip yükle.
    withStorage(() => {
      useGame.getState().hardReset();
      useGame.setState({ padsDone: C.pads.map((p) => p.id) });
      useGame.getState().saveNow();
      useGame.getState().init();
    });
    useGame.setState({ wallet: D(cuzdan), player: [MERDIVEN_PAD_YER[0], 0.6, MERDIVEN_PAD_YER[1]] as Vec3 });
  }
  const dur = (sn: number) => {
    useGame.getState().setKeyboardInput(0, 0);
    for (let t = 0; t < sn; t += 0.05) useGame.getState().tick(0.05);
  };

  it('tetik: yalnız Kat 1\'in omurgası bitince, kat kapalıyken, Kat 2 etkin derlemede', () => {
    const hepsi = C.pads.map((p) => p.id);
    const omurga = C.pads.filter((p) => !p.optional).map((p) => p.id);
    expect(kat1OmurgaBitti(hepsi)).toBe(true);
    expect(kat1OmurgaBitti(omurga)).toBe(true); // opsiyonel garsonlar beklenmez
    expect(kat1OmurgaBitti(omurga.slice(0, -1))).toBe(false);
    expect(merdivenPadAcik(true, { acik: false }, true)).toBe(true);
    expect(merdivenPadAcik(true, { acik: true }, true)).toBe(false);
    expect(merdivenPadAcik(true, { acik: false }, false)).toBe(false); // üretim kapısı
    expect(merdivenPadAcik(false, { acik: false }, true)).toBe(false);
  });

  it('pad üstünde durunca dolar; dolunca kat açılır (hazır pad\'lerle), cüzdandan tam 9.400 düşer', () => {
    kat1Bitmis(20_000);
    const w0 = useGame.getState().wallet.toNumber();
    const l0 = useGame.getState().lifetime.toNumber();
    dur(1);
    const ara = useGame.getState();
    expect(ara.padFills[MERDIVEN_PAD]).toBeGreaterThan(0);
    expect(ara.activeSpot?.cost).toBe(C.kat2.merdiven.cost);
    expect(ara.kat2.acik).toBe(false);
    dur(4);
    const s = useGame.getState();
    expect(s.kat2.acik).toBe(true);
    expect([...s.kat2.padsDone].sort()).toEqual([...HAZIR].sort());
    expect(s.padFills[MERDIVEN_PAD]).toBeUndefined();
    // Kat 1 o sırada da para toplar (lifetime'a girer): harcanan = başlangıç + toplanan − son.
    expect(w0 + (s.lifetime.toNumber() - l0) - s.wallet.toNumber()).toBeCloseTo(C.kat2.merdiven.cost, 0);
  });

  it('yürürken dolmaz; omurga bitmemişken pad yok, dolmaz', () => {
    kat1Bitmis(20_000);
    useGame.getState().setKeyboardInput(0.3, 0);
    for (let t = 0; t < 0.3; t += 0.05) useGame.getState().tick(0.05);
    expect(useGame.getState().padFills[MERDIVEN_PAD] ?? 0).toBe(0);
    useGame.getState().hardReset();
    useGame.setState({ wallet: D(20_000), player: [MERDIVEN_PAD_YER[0], 0.6, MERDIVEN_PAD_YER[1]] as Vec3 });
    dur(2);
    expect(useGame.getState().padFills[MERDIVEN_PAD] ?? 0).toBe(0);
    expect(useGame.getState().kat2.acik).toBe(false);
  });

  it('pad merdivenin önünde, varış noktasıyla aynı hatta (oyuncu Kat 2\'den inince pad\'in dibinde)', () => {
    expect(MERDIVEN_PAD_YER[0]).toBe(VARIS[1][0]);
    expect(Math.abs(MERDIVEN_PAD_YER[1] - VARIS[1][2])).toBeLessThan(1);
  });
});
