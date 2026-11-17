/**
 * kat2-yukseltme.test.ts — D-200 BEKÇİSİ: Kat 2 = Kat 1 mantığı (kullanıcı 2026-11-17).
 *
 *  · Garson HER masaya (okey dahil) kahve götürür (`garson.herMasa`); bayrak yoksa yalnız tavla (D-186).
 *  · Ocak yükseltmesi: 5 kademe, demleme ×1,35 + kuyruk +1 (Kat 1 `service.upgrade`/`brew`); ocağın yanındaki
 *    noktada durunca cüzdandan dolar (Kat 1 servis noktası); açan zincir pad'i bitmeden görünmez.
 *  · Garson yükseltmesi panelden: hız 3→4 · tepsi 2→3→4 · 2. garson; açılmadan alınamaz.
 *  · Config = karar HOG2-½: her alım onu açan zincir pad'inin yarı fiyatı (ölçüm `tools/olcum-kat2-ocak-garson.ts`).
 *  · Mutfak/mangal görseli ocak alımından türer (Kat 1 `mutfakSeviyesi(stationLevel)` gibi).
 *  · Kayıt additive: eski kayıt → hiç alım yok; bozuk değer temizlenir.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { KAT2_MASALAR, KAT2_OCAK_YUK_ID, KAT2_OCAK_YUK_YER, OCAK, OCAKLAR } from '../src/game/kat';
import {
  kat2EtkinAyar,
  kat2OcakTetik,
  kat2Tick,
  kat2YukSiradaki,
  yeniKat2Dunya,
  type Kat2Ayar,
  type Kat2Dunya,
  type Kat2Girdi,
} from '../src/game/kat2Dongu';
import { inFrame, servisCercevesi } from '../src/game/markerFrame';
import { KADEME_MAX, kat2MutfakSeviyesi } from '../src/components/three/kitchenLook';
import { defaultSave, kayitCoz } from '../src/game/save';
import { useGame } from '../src/game/store';
import { D } from '../src/game/decimal';

const A = C.kat2 as unknown as Kat2Ayar;
const U = A.yukseltme!;
const HEPSI = [...C.kat2.hazir, ...A.padler.map((p) => p.id)];
const UZAK: [number, number] = [0, -1];
const girdi = (yer: readonly [number, number], o: Partial<Kat2Girdi> = {}): Kat2Girdi => ({
  x: yer[0], z: yer[1], durdu: true, cuzdan: 0, padsDone: HEPSI, tepsiKap: 6, miknatis: 0.5, ...o,
});
const fiyatOf = (id: string) => A.padler.find((p) => p.id === id)!.cost;

describe('config = karar D-200 (HOG2-½)', () => {
  it('garson her masaya; hatların uzunluğu Kat 1 karşılığı (ocak 5 · hız 1 · tepsi 2 · ek garson 1)', () => {
    expect(A.garson).toEqual({ hiz: 3, tepsi: 2, sayi: 1, herMasa: true });
    expect(U.ocak.fiyat).toHaveLength(5);
    expect(U.garsonHiz.deger).toEqual([4]);
    expect(U.garsonTepsi.fiyat).toHaveLength(2);
    expect(U.garsonSayi.fiyat).toHaveLength(1);
    expect(U.ocak.demlemeCarpan).toBe(C.service.upgrade.outputMult);
    expect(U.ocak.kuyrukArti).toBe(C.brew.queuePerLevel);
    // Mutfak 1 + 5 alım = Kat 1 mutfağının tepe seviyesi.
    expect(1 + U.ocak.fiyat.length).toBe(KADEME_MAX);
  });

  it('her alımın fiyatı, onu açan zincir pad\'inin YARISI; açan pad zincirde', () => {
    for (const h of [U.ocak, U.garsonHiz, U.garsonTepsi, U.garsonSayi]) {
      expect(h.acan).toHaveLength(h.fiyat.length);
      h.acan.forEach((id, i) => expect(h.fiyat[i], id).toBe(Math.round(fiyatOf(id) * 0.5)));
    }
  });
});

describe('kat2EtkinAyar — Kat 1 ocak/garson eğrisi', () => {
  it('alım yoksa aynı nesne (oyun bugünküyle birebir)', () => {
    expect(kat2EtkinAyar(A, {})).toBe(A);
    expect(kat2EtkinAyar(A, undefined)).toBe(A);
  });
  it('ocak 5 alım: demleme ÷1,35⁵ · kuyruk +5; garson tam: hız 4 · tepsi 4 · 2 garson', () => {
    const e = kat2EtkinAyar(A, { ocak: 5, garsonHiz: 1, garsonTepsi: 2, garsonSayi: 1 });
    expect(e.demleme).toBeCloseTo(A.demleme / 1.35 ** 5);
    expect(e.ocakKuyruk).toBe(A.ocakKuyruk + 5);
    expect(e.garson).toEqual({ hiz: 4, tepsi: 4, sayi: 2, herMasa: true });
  });
  it('bozuk/taşan kayıt tavanda kalır', () => {
    const e = kat2EtkinAyar(A, { ocak: 99, garsonTepsi: -3 });
    expect(e.ocakKuyruk).toBe(A.ocakKuyruk + 5);
    expect(e.garson!.tepsi).toBe(A.garson!.tepsi);
  });
});

describe('ocak yükseltme noktası (Kat 1 servis noktası deseni)', () => {
  it('açan pad bitmeden tetik yok; bitince sıradaki fiyatla ocağın yanında', () => {
    expect(kat2OcakTetik(A, C.kat2.hazir, {})).toBeNull();
    const t = kat2OcakTetik(A, HEPSI, {})!;
    expect(t).toMatchObject({ id: KAT2_OCAK_YUK_ID, fiyat: U.ocak.fiyat[0], x: KAT2_OCAK_YUK_YER[0], z: KAT2_OCAK_YUK_YER[1] });
    expect(kat2OcakTetik(A, HEPSI, { ocak: 2 })!.fiyat).toBe(U.ocak.fiyat[2]);
    expect(kat2OcakTetik(A, HEPSI, { ocak: 5 })).toBeNull(); // tavan
  });

  it('çerçevesi ocakların kahve alma payına değmez (kahve alan oyuncu yükseltmeyi doldurmaz)', () => {
    const c = servisCercevesi();
    for (const o of OCAKLAR) {
      const ax = Math.max(Math.abs(o.al[0] - KAT2_OCAK_YUK_YER[0]) - c.hw, 0);
      const az = Math.max(Math.abs(o.al[1] - KAT2_OCAK_YUK_YER[1]) - c.hh, 0);
      expect(Math.hypot(ax, az), o.id).toBeGreaterThan(o.erisim);
    }
  });

  it('durunca cüzdandan dolar, dolunca olay verir; yürürken/parasızken dolmaz', () => {
    let d = yeniKat2Dunya(HEPSI, A);
    const fiyat = U.ocak.fiyat[0];
    const g = girdi(KAT2_OCAK_YUK_YER, { cuzdan: 1e6, yuk: {} });
    expect(inFrame(g.x, g.z, [KAT2_OCAK_YUK_YER[0], 0, KAT2_OCAK_YUK_YER[1]], servisCercevesi())).toBe(true);
    // Yürürken dolmaz.
    expect(kat2Tick(d, { ...g, durdu: false }, 0.1, A).harcama).toBe(0);
    // Parasızken dolmaz.
    expect(kat2Tick(d, { ...g, cuzdan: 0 }, 0.1, A).harcama).toBe(0);
    let harc = 0;
    let bitti = false;
    for (let i = 0; i < 60 && !bitti; i++) {
      const r = kat2Tick(d, g, 0.1, A);
      d = r.dunya;
      harc += r.harcama;
      bitti = r.olay.ocakYuk;
    }
    expect(bitti).toBe(true);
    expect(harc).toBeCloseTo(fiyat);
    expect(d.padFill[KAT2_OCAK_YUK_ID]).toBeUndefined();
  });

  it('yükseltme yoksa (config `yukseltme` yok) tetik hiç olmaz', () => {
    const { yukseltme: _y, ...yuksuz } = A;
    expect(kat2OcakTetik(yuksuz, HEPSI, {})).toBeNull();
  });

  it('ocak seviyesi kahve üretimini artırır (5 alım ≥ 4 kat fincan/dk)', () => {
    const uret = (ayar: Kat2Ayar) => {
      let d: Kat2Dunya = yeniKat2Dunya([OCAK.id], ayar);
      let n = 0;
      for (let i = 0; i < 600; i++) {
        d = kat2Tick(d, girdi(UZAK, { padsDone: [OCAK.id] }), 0.1, ayar).dunya;
        n += d.ocaklar[0].hazir;
        d = { ...d, ocaklar: d.ocaklar.map((o) => ({ ...o, hazir: 0 })) }; // biri hep alıyor
      }
      return n;
    };
    expect(uret(kat2EtkinAyar(A, { ocak: 5 }))).toBeGreaterThanOrEqual(4 * uret(A));
  });
});

describe('garson her masaya (Kat 1 mantığı)', () => {
  const sur = (ayar: Kat2Ayar, sn: number) => {
    let d = yeniKat2Dunya(HEPSI, ayar);
    let okey = 0, tavla = 0;
    for (let t = 0; t < sn; t += 0.1) {
      const r = kat2Tick(d, girdi(UZAK), 0.1, ayar);
      d = r.dunya;
      tavla += r.olay.tavlaServis;
      okey += r.olay.garsonServis - r.olay.tavlaServis;
    }
    return { okey, tavla };
  };
  it('herMasa: oyuncu uzaktayken garson OKEY masalarına da kahve götürür', () => {
    const r = sur(A, 300);
    expect(r.okey).toBeGreaterThan(5);
    expect(r.tavla).toBeGreaterThan(5);
  });
  it('bayrak yoksa (D-186) okeye dokunmaz', () => {
    const r = sur({ ...A, garson: { ...A.garson!, herMasa: false } }, 300);
    expect(r.okey).toBe(0);
    expect(r.tavla).toBeGreaterThan(5);
  });
  it('2. garson alımı dünyaya ikinci garsonu getirir', () => {
    const e = kat2EtkinAyar(A, { garsonSayi: 1 });
    const r = kat2Tick(yeniKat2Dunya(HEPSI, A), girdi(UZAK), 0.1, e);
    expect([r.dunya.garson, ...(r.dunya.garsonEk ?? [])].filter(Boolean)).toHaveLength(2);
  });
  it('okey masası da var (bekçinin anlamı)', () => {
    expect(KAT2_MASALAR.some((m) => m.tur === 'okey' && HEPSI.includes(m.id))).toBe(true);
  });
});

describe('mutfak görseli ocak alımından türer', () => {
  it('varışta 1, her alım bir basamak, tavan Kat 1 mutfağı', () => {
    expect(kat2MutfakSeviyesi(0)).toBe(1);
    expect(kat2MutfakSeviyesi(2)).toBe(3);
    expect(kat2MutfakSeviyesi(5)).toBe(KADEME_MAX);
    expect(kat2MutfakSeviyesi(99)).toBe(KADEME_MAX);
  });
});

describe('kayıt (additive) + panel alımı', () => {
  it('eski kayıt (yuk yok) → alım yok; bozuk değerler temizlenir', () => {
    const eski = { ...defaultSave(), kat2: { acik: true, padsDone: ['k2okey2'] } } as unknown as Record<string, unknown>;
    expect(kayitCoz(JSON.parse(JSON.stringify(eski))).data.kat2.yuk).toEqual({});
    const bozuk = { ...defaultSave(), kat2: { acik: true, padsDone: [], yuk: { ocak: 2.7, garsonTepsi: -1, uydurma: 4 } } } as unknown as Record<string, unknown>;
    expect(kayitCoz(JSON.parse(JSON.stringify(bozuk))).data.kat2.yuk).toEqual({ ocak: 2 });
  });

  describe('store.kat2GarsonYukAl', () => {
    beforeEach(() => {
      useGame.getState().hardReset();
    });
    it('açılmamışsa ya da para yetmezse almaz; açılmışsa parayı düşer, kademe +1', () => {
      const n = kat2YukSiradaki(A, HEPSI, {}, 'garsonHiz')!;
      useGame.setState({ kat2: { acik: true, padsDone: C.kat2.hazir.slice(), yuk: {} }, wallet: D(1e6) });
      expect(useGame.getState().kat2GarsonYukAl('garsonHiz')).toBe(false); // kilitli
      useGame.setState({ kat2: { acik: true, padsDone: HEPSI, yuk: {} }, wallet: D(n.fiyat - 1) });
      expect(useGame.getState().kat2GarsonYukAl('garsonHiz')).toBe(false); // para yetmez
      useGame.setState({ wallet: D(n.fiyat + 10) });
      expect(useGame.getState().kat2GarsonYukAl('garsonHiz')).toBe(true);
      expect(useGame.getState().wallet.toNumber()).toBe(10);
      expect(useGame.getState().kat2.yuk).toEqual({ garsonHiz: 1 });
      expect(useGame.getState().kat2GarsonYukAl('garsonHiz')).toBe(false); // tavan
    });
  });
});
