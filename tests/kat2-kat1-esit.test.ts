/**
 * kat2-kat1-esit.test.ts — D-204 BEKÇİSİ: "Kat 1'de olan Kat 2'de de olsun" (kullanıcı 2026-11-18).
 *
 * 1) XP: Kat 2 pad · masa Sv · elle kahve · garson kahvesi · yıkama Kat 1 kuralıyla XP verir.
 * 2) Günlük görev + Hedefler: Kat 2'nin denk eylemleri Kat 1 metriğine sayılır; arka planda yalnız garson.
 * 3) Çevrimdışı Kat 2 oranı masa Sv'yi ve yükseltmeleri (lavabo L2-L6) görür; store bunları geçirir.
 * 4) Çevrimdışı "İzle" eki gösterilen tutardan: ek ≤ (claimMult − 1) × gösterilen.
 * Ölçüm: `docs/kat2-kat1-esit-raporu.md`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame, dailyCountersOf, goalMetricsOf, kat2OlayXp, kat2OlaySayac } from '../src/game/store';
import { D } from '../src/game/decimal';
import { defaultStats } from '../src/game/save';
import { KAT2_LAVABO_PAD, KAT2_MASALAR, KAT2_YIKAMA_YER, OCAKLAR, OKEY_ERISIM, VARIS } from '../src/game/kat';
import { kat2EtkinAyar, kat2MasaYeri, kat2PadYeri, kat2SiradakiPad, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya } from '../src/game/kat2Dongu';
import { kat2Oran } from '../src/game/rules';
import { seedRandom } from '../tools/olcum-lib';
import type { Vec3 } from '../src/game/types';

const A: Kat2Ayar = C.kat2;
const HAZIR: readonly string[] = C.kat2.hazir;
const ZINCIR = [...HAZIR, ...C.kat2.padler.map((p) => p.id)];
const g = () => useGame.getState();
const X = C.xp;

function withStorage(fn: () => void): void {
  const mem: Record<string, string> = {};
  const gl = globalThis as Record<string, unknown>;
  const orig = gl.localStorage;
  gl.localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
  const rnd = Math.random;
  seedRandom(11);
  try { fn(); } finally {
    Math.random = rnd;
    if (orig === undefined) delete gl.localStorage; else gl.localStorage = orig;
  }
}

/** Kat 1 bitmiş, merdiven açık, oyuncu Kat 2'de (yalnız hazır masa + ocak). */
function kat2deOyuncu(): void {
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  g().kat2Ac();
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, wallet: D(1e6) });
  g().setKeyboardInput(0, 0);
}

const dunya = (f: (d: Kat2Dunya) => void) => {
  const d = structuredClone(g().kat2Dunya);
  f(d);
  useGame.setState({ kat2Dunya: d });
};
const yerdeDur = (x: number, z: number) => useGame.setState({ player: [x, VARIS[2][1], z] as Vec3 });

/** Bir kare; görev hattının verdiği XP ayrılır (o D-204'ün konusu değil). */
function kare(): { xp: number } {
  const xp0 = g().xp;
  const gorev0 = g().kat2.gorev?.idx ?? 0;
  g().tick(0.1);
  return { xp: g().xp - xp0 - X.perQuest * ((g().kat2.gorev?.idx ?? 0) - gorev0) };
}

const bosOlay = { padBitti: null, svAtlayan: [] as string[], servis: 0, garsonServis: 0, yikanan: 0, toplanan: 0, alinan: 0 };

afterEach(() => vi.restoreAllMocks());

describe('1 · XP — Kat 1 kuralı', () => {
  it('olay XP\'si: pad perPad · Sv perUpgrade · elle perTeaServed · garson perWaiterServed · yıkama perDishWashed', () => {
    expect(kat2OlayXp(bosOlay)).toBe(0);
    expect(kat2OlayXp({ ...bosOlay, padBitti: 'k2okey1' })).toBe(X.perPad);
    expect(kat2OlayXp({ ...bosOlay, svAtlayan: ['k2okey1', 'k2okey2'] })).toBe(2 * X.perUpgrade);
    expect(kat2OlayXp({ ...bosOlay, servis: 3 })).toBe(3 * X.perTeaServed);
    expect(kat2OlayXp({ ...bosOlay, servis: 3, garsonServis: 3 })).toBe(3 * X.perWaiterServed);
    expect(kat2OlayXp({ ...bosOlay, servis: 5, garsonServis: 2 })).toBe(3 * X.perTeaServed + 2 * X.perWaiterServed);
    expect(kat2OlayXp({ ...bosOlay, yikanan: 4 })).toBe(4 * X.perDishWashed);
  });

  it('oyunda: elle kahve servisi XP + sayaç (oyuncu masanın önünde, tepside 2 kahve)', () => {
    withStorage(() => {
      kat2deOyuncu();
      const m = kat2MasaYeri('k2okey2')!;
      dunya((d) => {
        const mm = d.masalar.find((x) => x.id === 'k2okey2')!;
        Object.assign(mm, { durum: 'oyunda', t: 200, istek: 2, sabir: 20, kahveT: 0 });
        d.tepsi = 2;
      });
      yerdeDur(m.x, m.z + OKEY_ERISIM - 0.3);
      const r = kare();
      expect(g().kat2Dunya.tepsi).toBe(0);
      expect(g().stats.kat2Elle).toBe(2);
      expect(g().stats.kat2Garson).toBe(0);
      expect(r.xp).toBe(2 * X.perTeaServed);
      // seviye ekranı tick dışı XP'yi görür (D-203 `xpBekleyen` yolu)
      expect(g().xpBekleyen).toBeGreaterThanOrEqual(2 * X.perTeaServed);
    });
  });

  it('oyunda: pad tamamlanınca perPad', () => {
    withStorage(() => {
      kat2deOyuncu();
      const sp = kat2SiradakiPad(kat2EtkinAyar(A, g().kat2.yuk), g().kat2.padsDone)!;
      dunya((d) => { d.padFill[sp.id] = sp.cost - 1; });
      const [px, pz] = kat2PadYeri(sp.id);
      yerdeDur(px, pz);
      const r = kare();
      expect(g().kat2.padsDone).toContain(sp.id);
      expect(r.xp).toBe(X.perPad);
    });
  });

  it('oyunda: oyuncunun yıkadığı fincan perDishWashed + sayaç', () => {
    withStorage(() => {
      kat2deOyuncu();
      dunya((d) => { d.tepsiKirli = 3; });
      yerdeDur(KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1] + 0.6);
      const r = kare();
      expect(g().stats.kat2Yikanan).toBe(3);
      expect(r.xp).toBe(3 * X.perDishWashed);
    });
  });
});

describe('2 · günlük görev + Hedefler — Kat 1 metriği', () => {
  it('sayaç olaydan: elle/garson/yıkama/para/ocaktan; olay yoksa aynı nesne', () => {
    const st = defaultStats();
    expect(kat2OlaySayac(st, bosOlay)).toBe(st);
    const s2 = kat2OlaySayac(st, { servis: 5, garsonServis: 2, yikanan: 4, toplanan: 1, alinan: 6 });
    expect([s2.kat2Elle, s2.kat2Garson, s2.kat2Yikanan, s2.kat2Para, s2.kat2Alinan]).toEqual([3, 2, 4, 1, 6]);
  });

  it('dailyCountersOf + goalMetricsOf Kat 2 sayaçlarını Kat 1\'inkine ekler (tost hariç)', () => {
    const stats = { ...defaultStats(), teasServed: 10, waiterServed: 20, dishesWashed: 3, coinsCollected: 7, teaPickups: 9, tostServed: 1,
      kat2Elle: 100, kat2Garson: 200, kat2Yikanan: 30, kat2Para: 70, kat2Alinan: 90 };
    const c = dailyCountersOf({ stats, lifetime: D(500) });
    expect(c).toEqual({ served: 330, hand: 110, coins: 77, dishes: 33, earn: 500, pickup: 99, waiter: 220, tost: 1 });
    const m = goalMetricsOf({ stats, padsDone: [], lifetime: D(500), tableLevels: [], tables: 0 });
    expect(m.served).toBe(330);
    expect(m.dishes).toBe(33);
  });

  it('oyunda: ocaktan alma ve para toplama Kat 2 sayaçlarına', () => {
    withStorage(() => {
      kat2deOyuncu();
      const o = OCAKLAR[0];
      dunya((d) => {
        d.ocaklar[0].hazir = 2;
        d.paralar.push({ id: 9999, x: o.al[0], z: o.al[1], miktar: 50 });
      });
      yerdeDur(o.al[0], o.al[1]);
      kare();
      expect(g().stats.kat2Alinan).toBe(2);
      expect(g().stats.kat2Para).toBe(1);
      expect(dailyCountersOf(g()).pickup).toBe(g().stats.teaPickups + 2);
    });
  });

  it('arka plan (oyuncu Kat 1\'de): yalnız Kat 2 garsonu sayılır, oyuncunun eli sayılmaz', () => {
    withStorage(() => {
      kat2deOyuncu();
      const k2 = { ...g().kat2, padsDone: ZINCIR };
      useGame.setState({ kat: 1, kat2: k2, kat2Dunya: { ...yeniKat2Dunya(ZINCIR, kat2EtkinAyar(A, k2.yuk)), tepsi: 2, tepsiKirli: 1 } });
      for (let t = 0; t < 180; t += 0.1) g().tick(0.1);
      const st = g().stats;
      expect(st.kat2Garson).toBeGreaterThan(0);
      expect([st.kat2Elle, st.kat2Yikanan, st.kat2Para, st.kat2Alinan]).toEqual([0, 0, 0, 0]);
    });
  });
});

describe('3 · çevrimdışı Kat 2 oranı — Sv + yükseltmeler', () => {
  const tum = Object.fromEntries(KAT2_MASALAR.map((m) => [m.id, 5]));
  it('Sv/yükseltme yoksa bugünkü oran; Sv5 ve lavabo seviyesi oranı büyütür', () => {
    expect(kat2Oran(ZINCIR, {}, {})).toBe(kat2Oran(ZINCIR));
    expect(kat2Oran(ZINCIR, tum)).toBeGreaterThan(1.5 * kat2Oran(ZINCIR));
    const lav = A.yukseltme!.lavabo.fiyat.length;
    expect(kat2Oran(ZINCIR, {}, { lavabo: lav })).toBeGreaterThan(kat2Oran(ZINCIR));
    expect(kat2Oran(ZINCIR.filter((id) => id !== KAT2_LAVABO_PAD), {}, { lavabo: lav })).toBe(kat2Oran(ZINCIR.filter((id) => id !== KAT2_LAVABO_PAD)));
  });

  it('tek okey masası Sv3: masa döngüsünün çarpanlarıyla birebir', () => {
    const k = A.masaSv!.okey;
    const c = (d?: readonly number[]) => d?.[2] ?? 1;
    const oturum = A.oturum * c(k.oturumCarpan);
    const istek = Math.floor((oturum - A.kahveSabir * 0.5) / (A.kahveAralik * c(k.kahveAralikCarpan)));
    const bekle = (A.masaUcreti * c(k.ucretCarpan) + istek * A.istekAdet * A.kahveFiyat * c(k.kahveFiyatCarpan)) / (A.gelisAralik * c(k.gelisAralikCarpan) + A.yurume + oturum);
    expect(kat2Oran(['k2okey2', 'k2cezve'], { k2okey2: 3 })).toBeCloseTo(bekle, 9);
  });

  it('store çevrimdışı dönüşte kat2.masaSv ve yuk\'u geçirir (tavan bağlamazken fark = oran farkı)', () => {
    withStorage(() => {
      const T = 1_900_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(T);
      const don = (masaSv: Record<string, number>) => {
        kat2deOyuncu();
        useGame.setState({ kat: 1, kat2: { ...g().kat2, padsDone: ZINCIR, masaSv }, gizlendiAt: T - 60_000, offlineEarned: 0 });
        g().onPlanaDon();
        return g().offlineEarned;
      };
      const sv1 = don({});
      const sv5 = don(tum);
      const ham = (o: number) => Math.floor(o * C.offline.rateMult * 60);
      expect(sv5 - sv1).toBe(ham(kat2Oran(ZINCIR, tum)) - ham(kat2Oran(ZINCIR)));
      expect(sv5).toBeGreaterThan(sv1);
    });
  });
});

describe('4 · çevrimdışı "İzle" eki — gösterilen tutardan', () => {
  it('Kat 2\'de kapatıp Kat 1 payı kesilince ek gösterilenin (claimMult − 1) katını geçmez; Kat 1\'de aynen kalır', () => {
    withStorage(() => {
      const T = 1_900_000_000_000;
      vi.spyOn(Date, 'now').mockReturnValue(T);
      const don = (kat: 1 | 2) => {
        kat2deOyuncu();
        // Kat 1 kesinti sınırı ~100 coin (kasa-oyun.test `olcumIcin` deseni) — kesinti bağlasın.
        useGame.setState({ kat, kasaOlcum: { para: (100 / C.kasa.dakika / 60) * 600, sn: 600 }, gizlendiAt: T - 60_000, offlineEarned: 0, offlineIzleEki: 0 });
        g().onPlanaDon();
        return { taban: g().offlineEarned, izle: g().offlineIzleEki };
      };
      const k1 = don(1);
      const k2 = don(2);
      expect(k2.taban).toBeLessThan(k1.taban); // kesinti bağladı
      expect(k1.izle).toBeGreaterThan(k2.taban); // önkoşul: ham ek gösterilenden büyük (kırpma devrede)
      expect(k1.izle).toBeLessThanOrEqual((C.rewarded.claimMult - 1) * k1.taban);
      expect(k2.izle).toBe((C.rewarded.claimMult - 1) * k2.taban);
      // "İzle" ile alınan = gösterilen × claimMult (Kat 1 kuralı)
      g().claimOffline(true);
      expect(k2.taban + k2.izle).toBe(C.rewarded.claimMult * k2.taban);
    });
  });
});
