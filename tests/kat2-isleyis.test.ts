/**
 * kat2-isleyis.test.ts — D-201 BEKÇİSİ: Kat 2 işleyişi = Kat 1 (kol K-Bt2, `docs/kat2-isleyis-raporu.md` §Tur 2).
 *
 *  · Config = K-Bt2: zincir/yükseltme/Sv fiyatları `tools/olcum-kat2-isleyis.ts` (IS_TUR=2) çıktısının aynısı
 *    (`docs/olcum-kat2-isleyis-t2.txt` "K-Bt2 zincir/ocak" satırları).
 *  · Garsonlar zincirde PAD (Kat 1 waiter/2/3), bulaşıkçı pad'i; panelden ek garson yok.
 *  · Lavabo L2-L6: uğrama Kat 1 eğrisi, ücret Kat 1'in yarı hızında; lavabonun solundaki noktada durunca dolar.
 *  · Bulaşık = Kat 1 sayıları + masa başına kişi kadar fincan + garson kahveyi getirirken boşu alır.
 *  · Kayıt additive: `kat2.yuk.lavabo`; eski `garsonSayi` düşer.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { KAT2_LAVABO_PAD, KAT2_LAVABO_YUK_ID, KAT2_LAVABO_YUK_YER, OCAKLAR, VARIS } from '../src/game/kat';
import { kat2EtkinAyar, kat2LavaboTetik, kat2PadEtiket, kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya, type Kat2Girdi } from '../src/game/kat2Dongu';
import { inFrame, servisCercevesi } from '../src/game/markerFrame';
import { defaultSave, kayitCoz } from '../src/game/save';
import { useGame } from '../src/game/store';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';

const A = C.kat2 as unknown as Kat2Ayar;
const U = A.yukseltme!;
const HEPSI = [...C.kat2.hazir, ...A.padler.map((p) => p.id)];
const UZAK: [number, number] = [0, -1];
const girdi = (yer: readonly [number, number], o: Partial<Kat2Girdi> = {}): Kat2Girdi => ({
  x: yer[0], z: yer[1], durdu: true, cuzdan: 0, padsDone: HEPSI, tepsiKap: 6, miknatis: 0.5, ...o,
});

/** `docs/olcum-kat2-isleyis-t2.txt` — "K-Bt2 zincir" satırı (aracın tam koşu çıktısı). */
const K_BT2_ZINCIR =
  'k2okey1 8600 · k2okey3 9100 · k2garson 4800 · k2okey4 9600 · k2garson2 10100 · k2salon2 10100 · k2s2okey1 10100 · k2s2okey2 10600 · k2bulasikci 5500 · k2cezve2 11000 · k2s2okey3 11000 · k2s2okey4 11500 · k2s2okey5 12000 · k2s2okey6 12500 · k2garson3 13000 · k2lavabo 13000 · k2salon3 13600 · k2tavla1 13600 · k2tavla2 13900 · k2tavla3 14100 · k2tavla4 14400 · k2tavla5 14700 · k2tavla6 15000 · k2tavla7 15300 · k2tavla8 15600 · k2tavla9 15900 · k2tavla10 16100 · k2tavla11 16400 · k2tavla12 16700';

describe('config = karar D-201 (K-Bt2)', () => {
  it('zincir: sıra + fiyat aracın K-Bt2 satırı, dolum ~3,5 sn', () => {
    expect(A.padler.map((p) => `${p.id} ${p.cost}`).join(' · ')).toBe(K_BT2_ZINCIR);
    for (const p of A.padler) expect(p.fillRate).toBe(Math.round(p.cost / 3.5));
  });

  it('yükseltmeler: "K-Bt2 ocak" satırı (ocak · garson hız · tepsi · lavabo · okey Sv · tavla Sv)', () => {
    expect(U.ocak.fiyat).toEqual([4_800, 5_500, 6_500, 6_800, 7_500]);
    expect(U.ocak.acan).toEqual(['k2okey4', 'k2cezve2', 'k2lavabo', 'k2salon3', 'k2tavla6']); // 4. alım tavla köşesi kapısında
    expect(U.garsonHiz.fiyat).toEqual([6_950]);
    expect(U.garsonTepsi.fiyat).toEqual([7_350, 8_050]);
    expect(U.lavabo.fiyat).toEqual([6_800, 6_950, 7_350, 7_800, 8_200]);
    expect(U.lavabo.acan).toEqual(['k2salon3', 'k2tavla2', 'k2tavla5', 'k2tavla8', 'k2tavla11']);
    expect(A.masaSv!.okey.fiyat).toEqual([0, 6_750, 7_750, 8_750, 9_750]);
    expect(A.masaSv!.tavla.fiyat).toEqual([0, 4_750, 5_250, 5_750, 6_250]);
  });

  it('lavabo L1-L6: uğrama Kat 1 eğrisi, ücret Kat 1\'in yarı hızında (18 → 52); L1 = kat2.lavabo', () => {
    const k1 = C.rooms.lavabo;
    expect(U.lavabo.ugrama).toEqual(k1.visitChanceByLevel);
    expect(U.lavabo.ucret).toEqual(k1.feeByLevel.map((f) => Math.round(k1.feeByLevel[0] + (f - k1.feeByLevel[0]) / 2)));
    expect({ ugrama: U.lavabo.ugrama[0], ucret: U.lavabo.ucret[0] }).toEqual(A.lavabo);
  });

  it('bulaşık = Kat 1 sayıları (+ masa başına kişi kadar fincan, garson teslimde boşu alır)', () => {
    expect(A.bulasik).toEqual({
      havuz: C.cups.poolBase,
      havuzOcakArti: C.cups.poolPerLevel,
      havuzKisi: 1,
      esik: C.cups.dirtyThreshold,
      yikamaYaricap: C.cups.washRadius,
      yikamaSn: C.cups.washBatchSec,
      garsonTasima: C.waiter.idleDishCarry,
      teslimdeAl: true,
      bulasikci: { hiz: C.dishwasher.speedUpgrades.speeds[0], tasima: 2 },
    });
  });
});

describe('lavabo seviye noktası (Kat 1 lavabo yükseltmesi; ocak noktası deseni)', () => {
  const ONCE = HEPSI.slice(0, HEPSI.indexOf('k2salon3'));
  it('lavabo ya da açan pad yoksa tetik yok; açılınca sıradaki fiyatla lavabonun solunda; tavanda yok', () => {
    expect(kat2LavaboTetik(A, ONCE, {})).toBeNull(); // salon3 (açan) yok
    expect(kat2LavaboTetik(A, HEPSI.filter((id) => id !== KAT2_LAVABO_PAD), {})).toBeNull();
    expect(kat2LavaboTetik(A, HEPSI, {})).toMatchObject({ id: KAT2_LAVABO_YUK_ID, fiyat: U.lavabo.fiyat[0], x: KAT2_LAVABO_YUK_YER[0], z: KAT2_LAVABO_YUK_YER[1] });
    expect(kat2LavaboTetik(A, HEPSI, { lavabo: 3 })!.fiyat).toBe(U.lavabo.fiyat[3]);
    expect(kat2LavaboTetik(A, HEPSI, { lavabo: 5 })).toBeNull();
    // 2. alımı tavla2 açar: salon3 açık ama tavla2 değilken tetik yok.
    expect(kat2LavaboTetik(A, HEPSI.slice(0, HEPSI.indexOf('k2tavla2')), { lavabo: 1 })).toBeNull();
  });

  it('durunca cüzdandan dolar, dolunca olay verir; yürürken/parasızken dolmaz', () => {
    let d = yeniKat2Dunya(HEPSI, A);
    const g = girdi(KAT2_LAVABO_YUK_YER, { cuzdan: 1e6, yuk: {} });
    expect(inFrame(g.x, g.z, [KAT2_LAVABO_YUK_YER[0], 0, KAT2_LAVABO_YUK_YER[1]], servisCercevesi())).toBe(true);
    expect(kat2Tick(d, { ...g, durdu: false }, 0.1, A).harcama).toBe(0);
    expect(kat2Tick(d, { ...g, cuzdan: 0 }, 0.1, A).harcama).toBe(0);
    let harc = 0;
    let bitti = false;
    for (let i = 0; i < 60 && !bitti; i++) {
      const r = kat2Tick(d, g, 0.1, A);
      d = r.dunya;
      harc += r.harcama;
      bitti = r.olay.lavaboYuk;
    }
    expect(bitti).toBe(true);
    expect(harc).toBeCloseTo(U.lavabo.fiyat[0]);
    expect(d.padFill[KAT2_LAVABO_YUK_ID]).toBeUndefined();
  });

  it('seviye lavabonun parasını artırır (L6 ≥ 2,5 × L1, aynı kalkışlar)', () => {
    const lavaboPara = (ayar: Kat2Ayar) => {
      let d: Kat2Dunya = yeniKat2Dunya(HEPSI, ayar);
      let n = 0;
      for (let t = 0; t < 600; t += 0.1) {
        const r = kat2Tick(d, girdi(UZAK), 0.1, ayar);
        d = r.dunya;
        n += r.olay.lavabo;
      }
      return n;
    };
    const l1 = lavaboPara(A);
    expect(l1).toBeGreaterThan(0);
    expect(lavaboPara(kat2EtkinAyar(A, { lavabo: 5 }))).toBeGreaterThanOrEqual(2.5 * l1);
  });
});

describe('bulaşık (Kat 1 döngüsü) — teslimde boşu alır: masa kirli beklemez', () => {
  it('oyuncu uzakta, 3 garson + bulaşıkçı: 10 dk boyunca kirli diye bekleyen masa yok, fincan döner', () => {
    let d: Kat2Dunya = yeniKat2Dunya(HEPSI, A);
    let kirliBek = 0;
    let servis = 0;
    let donen = 0;
    for (let t = 0; t < 600; t += 0.1) {
      const r = kat2Tick(d, girdi(UZAK), 0.1, A);
      d = r.dunya;
      servis += r.olay.servis;
      donen += r.olay.temizDonen;
      if (t > 60) kirliBek += d.masalar.filter((m) => m.durum === 'bos' && (m.kirli ?? 0) > A.bulasik!.esik).length;
    }
    expect(servis).toBeGreaterThan(50);
    expect(donen).toBeGreaterThan(0.5 * servis);
    expect(kirliBek).toBe(0);
  });

  it('teslimde almayan garsonla masa kirli kalır (bekçinin anlamı)', () => {
    const ayar: Kat2Ayar = { ...A, bulasik: { ...A.bulasik!, teslimdeAl: false, bulasikci: undefined } };
    let d: Kat2Dunya = yeniKat2Dunya(HEPSI, ayar);
    let kirliBek = 0;
    for (let t = 0; t < 600; t += 0.1) {
      d = kat2Tick(d, girdi(UZAK), 0.1, ayar).dunya;
      kirliBek += d.masalar.filter((m) => m.durum === 'bos' && (m.kirli ?? 0) > ayar.bulasik!.esik).length;
    }
    expect(kirliBek).toBeGreaterThan(0);
  });

  it('havuz: açık ocak başına 10 + açık masa kişisi başına 1', () => {
    const d = kat2Tick(yeniKat2Dunya(C.kat2.hazir, A), girdi(UZAK, { padsDone: C.kat2.hazir }), 0.1, A).dunya;
    const ocak = OCAKLAR.filter((o) => C.kat2.hazir.includes(o.id)).length;
    expect(d.havuzToplam).toBe(C.cups.poolBase * ocak + 4); // hazır okey masası: 4 kişi
  });
});

describe('store + kayıt', () => {
  beforeEach(() => {
    useGame.getState().hardReset();
  });

  it('store: lavabo noktasında durunca parayı düşer, kat2.yuk.lavabo +1', () => {
    useGame.setState({
      kat: 2,
      player: [KAT2_LAVABO_YUK_YER[0], VARIS[2][1], KAT2_LAVABO_YUK_YER[1]] as Vec3,
      kat2: { acik: true, padsDone: HEPSI, yuk: {} },
      kat2Dunya: yeniKat2Dunya(HEPSI, A),
      wallet: D(1e6),
    });
    useGame.getState().setKeyboardInput(0, 0);
    for (let i = 0; i < 60 && !(useGame.getState().kat2.yuk?.lavabo ?? 0); i++) useGame.getState().tick(0.1);
    expect(useGame.getState().kat2.yuk?.lavabo).toBe(1);
    expect(useGame.getState().wallet.toNumber()).toBeLessThanOrEqual(1e6 - U.lavabo.fiyat[0] + 1e3);
  });

  it('kayıt additive: lavabo okunur, eski garsonSayi düşer', () => {
    const k = { ...defaultSave(), kat2: { acik: true, padsDone: [], yuk: { ocak: 2, lavabo: 3, garsonSayi: 1 } } } as unknown as Record<string, unknown>;
    expect(kayitCoz(JSON.parse(JSON.stringify(k))).data.kat2.yuk).toEqual({ ocak: 2, lavabo: 3 });
  });
});

describe('D-201 Parça 2: personel pad etiketleri = Kat 1', () => {
  // Kat 1 zincirinin kendi etiketleri (config) — Kat 2 aynısını söyler (Kat 2 = Kat 1 uyarlaması).
  const kat1 = (id: string) => C.pads.find((p) => p.id === id)?.label;
  it.each([
    ['k2garson', 'waiter'],
    ['k2garson2', 'waiter2'],
    ['k2garson3', 'waiter3'],
    ['k2bulasikci', 'dishwasher'],
  ])('%s = Kat 1 %s', (k2, k1) => {
    expect(kat1(k1)).toBeTruthy();
    expect(kat2PadEtiket(k2)).toBe(kat1(k1));
  });
});
