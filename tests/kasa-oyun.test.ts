/**
 * kasa-oyun.test.ts — D-185 BEKÇİSİ: Kat 1'in kasası oyunda (store + tick + kayıt + çevrimdışı).
 *
 * Kasa paranın YOLUNU değiştirir: oyuncu Kat 2'deyken Kat 1'in oto-toplanan parası kasaya girer,
 * kasa dolunca Kat 1'e müşteri gelmez (para yanmaz), oyuncu Kat 1'de kasanın yanına yürüyünce
 * kasa cüzdana boşalır. Kat 2 hiç açılmamış oyuncunun Kat 1'i BİREBİR aynı kalır.
 */
import { describe, it, expect } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { D } from '../src/game/decimal';
import { defaultSave, kayitCoz } from '../src/game/save';
import { VARIS } from '../src/game/kat';
import { yeniKat2Dunya, type Kat2Ayar } from '../src/game/kat2Dongu';
import { KASA_YER, bosKasaOlcum, kasaDakikaGeliri, kasaOlcumAdim, kasaSiniriOlcumden } from '../src/game/kasa';
import { computeOfflineEarned, kat2Oran, offlineEarnedSplit } from '../src/game/rules';
import { LAYOUT, atServiceBody, servicePlace } from '../src/game/layout';
import { inFrame, servisCercevesi } from '../src/game/markerFrame';
import { seedRandom } from '../tools/olcum-lib';
import type { Coin, Vec3 } from '../src/game/types';

const A: Kat2Ayar = C.kat2;
const g = () => useGame.getState();

function withStorage(fn: (mem: Record<string, string>) => void): void {
  const mem: Record<string, string> = {};
  const gl = globalThis as Record<string, unknown>;
  const orig = gl.localStorage;
  gl.localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
  const rnd = Math.random;
  try { fn(mem); } finally {
    Math.random = rnd;
    if (orig === undefined) delete gl.localStorage; else gl.localStorage = orig;
  }
}

/** Kat 1'i bitmiş dükkân, merdiven açık. */
function bitmisKat1(merdiven = true): void {
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  if (merdiven) g().kat2Ac();
}

/** Sınırı `sinir` ₺ olan, yeterince ölçülmüş bir kasa ölçümü (taban üstünde). */
const olcumIcin = (sinir: number) => ({ para: (sinir / C.kasa.dakika / 60) * 600, sn: 600 });

const eskiPara = (id: number, value: number, x = 3, z = 5): Coin => ({ id, pos: [x, 0.3, z], value, age: C.money.autoCollectAfter });

function kos(sn: number, dt = 0.1): void {
  for (let t = 0; t < sn; t += dt) g().tick(dt);
}

describe('ölçüm — sınırın kaynağı (incomeRate değil, düşen para)', () => {
  it('sabit akışta ortalama akışa yakınsar; soğuk başlangıçta sınır yok; taban bağlar', () => {
    let o = bosKasaOlcum();
    expect(kasaSiniriOlcumden(o, C.kasa)).toBeNull();
    for (let t = 0; t < 1800; t += 0.1) o = kasaOlcumAdim(o, t % 1 < 0.1 ? 1.25 : 0, 0.1, C.kasa.olcumPencereSn); // 1,25 ₺/sn
    expect(kasaDakikaGeliri(o, C.kasa.olcumMinSn)!).toBeCloseTo(75, 0);
    expect(kasaSiniriOlcumden(o, C.kasa)!.toNumber()).toBeCloseTo(75 * C.kasa.dakika, -2);
    expect(kasaSiniriOlcumden({ para: 1, sn: 600 }, C.kasa)!.toNumber()).toBe(C.kasa.tabanSinir);
    expect(kasaSiniriOlcumden({ para: 100, sn: C.kasa.olcumMinSn - 1 }, C.kasa)).toBeNull();
  });

  it('Kat 2\'deyken Kat 1\'de düşen para ölçülür, Kat 1\'deyken ölçülmez', () => withStorage(() => {
    seedRandom(3);
    bitmisKat1();
    kos(120);
    expect(g().kasaOlcum).toEqual(bosKasaOlcum());
    useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3 });
    kos(300);
    expect(g().kasaOlcum.sn).toBeGreaterThan(C.kasa.olcumMinSn);
    expect(g().kasaOlcum.para).toBeGreaterThan(0);
  }));
});

describe('Kat 2\'deyken oto-toplama kasaya', () => {
  it('yaşlı para cüzdana değil kasaya; ömür boyu kazanç girdiği an artar', () => withStorage(() => {
    bitmisKat1();
    useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, coins: [eskiPara(1e6, 40)], kasaOlcum: olcumIcin(1000) });
    const w0 = g().wallet, l0 = g().lifetime;
    g().tick(0.05);
    expect(g().kasa.toNumber()).toBe(40);
    expect(g().wallet.eq(w0)).toBe(true);
    expect(g().lifetime.sub(l0).toNumber()).toBe(40);
  }));

  it('kasa dolunca sığmayan para yerde bekler (yanmaz), kasa sınırı aşmaz', () => withStorage(() => {
    bitmisKat1();
    useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, coins: [eskiPara(1e6, 40)], kasaOlcum: olcumIcin(1000), kasa: D(990) });
    g().tick(0.05);
    expect(g().kasa.toNumber()).toBe(1000);
    expect(g().coins.reduce((a, c) => a + c.value, 0)).toBe(30);
  }));

  it('kasa doluyken Kat 1\'de müşteri DOĞMAZ; boşken doğar', () => withStorage(() => {
    for (const dolu of [true, false]) {
      seedRandom(5);
      bitmisKat1();
      useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kasaOlcum: olcumIcin(1000), kasa: D(dolu ? 1000 : 0) });
      kos(40);
      if (dolu) expect(g().npcCount).toBe(0);
      else expect(g().npcCount).toBeGreaterThan(0);
    }
  }));

  it('dolu kasa boşalınca biriken doğum sayacı art arda grup doğurmaz', () => withStorage(() => {
    bitmisKat1();
    useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kasaOlcum: olcumIcin(1000), kasa: D(1000) });
    kos(60);
    expect(g().spawnTimer).toBeGreaterThanOrEqual(0);
  }));
});

describe('Kat 1\'de kasaya yürüyünce boşalır', () => {
  it('yanına yürüyen oyuncunun cüzdanına geçer; ömür boyu kazanç değişmez (çift sayım yok)', () => withStorage(() => {
    bitmisKat1();
    useGame.setState({ kasa: D(750), player: [KASA_YER[0] + 2.5, 0.6, KASA_YER[1] + 0.2] as Vec3 });
    g().tick(0.05);
    expect(g().kasa.toNumber()).toBe(750); // uzakta boşalmaz
    const w0 = g().wallet, l0 = g().lifetime;
    g().setKeyboardInput(-1, 0);
    for (let i = 0; i < 200 && g().kasa.gt(0); i++) g().tick(0.05);
    g().setKeyboardInput(0, 0);
    expect(g().kasa.toNumber()).toBe(0);
    expect(g().wallet.sub(w0).toNumber()).toBeGreaterThanOrEqual(750);
    expect(g().lifetime.sub(l0).toNumber() + 0).toBe(g().wallet.sub(w0).toNumber() - 750 + 0);
  }));

  it('Kat 2\'deyken kasa boşalmaz (oyuncu Kat 1\'in hiçbir yerinde değil)', () => withStorage(() => {
    bitmisKat1();
    useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kasa: D(500) });
    kos(2);
    expect(g().kasa.toNumber()).toBe(500);
  }));

  it('kasanın yeri: çay alma erişiminin ve servis yükseltme noktasının dışında, pad\'lerden uzak', () => {
    const sp = servicePlace(3);
    expect(atServiceBody(KASA_YER[0], KASA_YER[1], sp, C.serving.pickupReach)).toBe(false);
    for (let a = 0; a < 16; a++) {
      const x = KASA_YER[0] + Math.cos((a / 16) * 2 * Math.PI) * C.kasa.erisim;
      const z = KASA_YER[1] + Math.sin((a / 16) * 2 * Math.PI) * C.kasa.erisim;
      expect(inFrame(x, z, sp.upgradeSpot, servisCercevesi())).toBe(false);
    }
    for (const [id, p] of Object.entries(LAYOUT.padPos)) {
      expect(Math.hypot(p[0] - KASA_YER[0], p[2] - KASA_YER[1]), id).toBeGreaterThan(C.kasa.erisim + 0.6);
    }
  });
});

describe('Kat 1\'deyken Kat 2 de işler, cüzdana sızmaz', () => {
  it('masalar oynar, yığın masada bekler, pad dolmaz; Kat 1 parası Kat 2 kapalı koşuyla birebir', () => withStorage(() => {
    const kos1 = (kat2Acik: boolean) => {
      seedRandom(11);
      bitmisKat1(false);
      const pads = ['k2okey1'];
      if (kat2Acik) {
        g().kat2Ac();
        useGame.setState({
          kat2: { acik: true, padsDone: pads },
          kat2Dunya: { ...yeniKat2Dunya(pads, A), paralar: [{ id: 9, x: 0, z: 2, miktar: 120 }] },
        });
      }
      const d0 = g().kat2Dunya;
      kos(90);
      return { s: g(), d0 };
    };
    const kapali = kos1(false);
    const acik = kos1(true);
    expect(acik.s.wallet.eq(kapali.s.wallet)).toBe(true);
    expect(acik.s.lifetime.eq(kapali.s.lifetime)).toBe(true);
    expect(acik.s.kat2Dunya).not.toBe(acik.d0);
    expect(acik.s.kat2Dunya.masalar.some((m) => m.durum !== 'bos')).toBe(true);
    expect(acik.s.kat2Dunya.paralar.reduce((a, p) => a + p.miktar, 0)).toBeGreaterThanOrEqual(120);
    expect(acik.s.kat2.padsDone).toEqual(['k2okey1']);
    expect(acik.s.kat2Dunya.padFill).toEqual({});
  }));
});

describe('Kat 2 kapalı oyuncu — Kat 1 birebir', () => {
  it('kasa ayarı Kat 1 koşusunu değiştirmez, kasa 0 kalır', () => withStorage(() => {
    const kos1 = () => {
      seedRandom(21);
      bitmisKat1(false);
      useGame.setState({ player: [KASA_YER[0] + 0.3, 0.6, KASA_YER[1]] as Vec3 });
      kos(240);
      const s = g();
      return { w: s.wallet.toString(), l: s.lifetime.toString(), n: s.npcCount, c: s.coins.length, k: s.kasa.toString(), o: s.kasaOlcum };
    };
    const a = kos1();
    const k = C.kasa as { dakika: number; erisim: number };
    const [dk, er] = [k.dakika, k.erisim];
    k.dakika = 0.01;
    k.erisim = 50;
    try {
      expect(kos1()).toEqual(a);
    } finally {
      k.dakika = dk;
      k.erisim = er;
    }
    expect(a.k).toBe('0');
    expect(a.o).toEqual(bosKasaOlcum());
  }));
});

describe('kayıt', () => {
  it('eski kayıt (kasa alanı yok) → kasa 0, ölçüm boş; bozuk kasa kaydı reddettirmez', () => {
    const { kasa: _k, kasaOlcum: _o, ...eski } = defaultSave() as unknown as Record<string, unknown>;
    const r = kayitCoz({ ...eski, wallet: '500' });
    expect(r.data.kasa).toBe('0');
    expect(r.data.kasaOlcum).toEqual(bosKasaOlcum());
    expect(r.data.wallet).toBe('500');
    const b = kayitCoz({ ...defaultSave(), kasa: 'NaN', kasaOlcum: { para: -3, sn: 'x' } } as unknown as Record<string, unknown>);
    expect(b.red).toEqual([]);
    expect(b.data.kasa).toBe('0');
    expect(b.data.kasaOlcum).toEqual(bosKasaOlcum());
  });

  it('kasa + ölçüm kayda gider ve geri gelir; Kat 2\'deyken yerdeki Kat 1 parası kasaya yazılır', () => withStorage(() => {
    bitmisKat1();
    useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kasa: D(321), kasaOlcum: { para: 900, sn: 600 },
      coins: [{ id: 1e6, pos: [3, 0.3, 5], value: 9 }], wallet: D(100) });
    g().saveNow();
    g().init();
    expect(g().kasa.toNumber()).toBe(330);
    expect(g().wallet.toNumber()).toBe(100);
    expect(g().kasaOlcum).toEqual({ para: 900, sn: 600 });
  }));
});

describe('çevrimdışı — iki kat, tavan sıradaki Kat 2 pad\'i', () => {
  const kat1Pads = C.pads.map((p) => p.id);
  const K2 = C.kat2.padler;
  const durumlar = K2.map((_, i) => K2.slice(0, i).map((p) => p.id));
  const aldigi = (tutar: number, pads: readonly string[]) => {
    let kalan = tutar, say = 0;
    for (const p of K2) {
      if (pads.includes(p.id)) continue;
      if (kalan < p.cost) break;
      kalan -= p.cost;
      say++;
    }
    return say;
  };

  it('Kat 2 yokken bugünkü formülle birebir', () => {
    for (const sn of [100, 3600, 8 * 3600]) {
      expect(computeOfflineEarned(17, sn, ['table2'], { acik: false, padsDone: ['k2okey1'] })).toBe(computeOfflineEarned(17, sn, ['table2']));
      expect(offlineEarnedSplit(17, sn, ['table2']).kazanc).toBe(computeOfflineEarned(17, sn, ['table2']));
    }
  });

  it('Kat 1 bitmiş, Kat 2 açık: hiçbir Kat 2 durumunda 1/4/8 sa sonra art arda 2 pad alınamaz (ihlal 0)', () => {
    let ihlal = 0;
    for (const pads of durumlar)
      for (const h of [1, 4, 8]) {
        const t = computeOfflineEarned(1e4, h * 3600, kat1Pads, { acik: true, padsDone: pads });
        if (aldigi(t, pads) >= 2) ihlal++;
      }
    expect(ihlal).toBe(0);
  });

  it('Kat 2 payı ham tutara girer; Kat 1 payı orantılı ayrılır', () => {
    const pads = K2.slice(0, 2).map((p) => p.id);
    expect(kat2Oran(pads)).toBeGreaterThan(0);
    const r = offlineEarnedSplit(0, 600, ['table2'], { acik: true, padsDone: pads });
    expect(r.kazanc).toBeGreaterThan(0);
    expect(r.kat1Pay).toBe(0);
  });

  it('Kat 2\'de kapatıldıysa Kat 1 payı kasaya girer ve kasa sınırında kesilir', () => withStorage((mem) => {
    bitmisKat1();
    useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kasaOlcum: olcumIcin(400), kasa: D(0), wallet: D(0),
      kat2: { acik: true, padsDone: ['k2okey1'] } });
    g().saveNow();
    const key = Object.keys(mem).find((k) => k === 'kiraathane.save')!;
    const kayit = JSON.parse(mem[key]);
    kayit.lastSaved = Date.now() - 3600_000;
    delete kayit.zarf;
    mem[key] = JSON.stringify(kayit);
    g().init();
    expect(g().kat).toBe(2);
    expect(g().kasa.toNumber()).toBe(400);
    expect(g().wallet.toNumber()).toBe(g().offlineEarned);
    expect(g().offlineEarned + 400).toBeLessThanOrEqual(Math.floor(K2[1].cost * C.offline.capNextPadFrac));
  }));
});
