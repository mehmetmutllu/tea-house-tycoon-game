/**
 * kat2-garson.test.ts — S2 BEKÇİSİ (D-186): tavla sayıları config'te, 2. cezve ocağı, Kat 2 garsonu,
 * `olay.kalkan` ve zincirin config bekçisi.
 *
 * Garson YALNIZ kahve taşır, YALNIZ tavla masalarına; okey isteğine dokunmaz (oyuncu okeyde taşır),
 * yığın toplamaz. Bölme duvarlarını delmez, salonlar arasında geçitten geçer.
 */
import { describe, it, expect } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { hitsSolid, LAYOUT } from '../src/game/layout';
import {
  KAT2_BOLMELER,
  KAT2_GARSON_PAD,
  KAT2_GARSON_YER,
  KAT2_MASALAR,
  KUYU,
  OCAK,
  OCAKLAR,
  OKEY_YARI,
  TAVLA_YARI,
  kat2AcikAlan,
  kat2Adim,
  kat2Duvarlar,
  kat2Engeller,
  kat2YurumeAlani,
  kat2YolAgi,
  dikKelepce,
} from '../src/game/kat';
import {
  kat2EksikSayi,
  kat2PadEtiket,
  kat2PadYeri,
  kat2Tick,
  kat2YapiHatasi,
  kat2ZincirHatasi,
  yeniKat2Dunya,
  type Kat2Ayar,
  type Kat2Dunya,
  type Kat2Girdi,
} from '../src/game/kat2Dongu';
import { inFrame, padCercevesi } from '../src/game/markerFrame';

const PR = LAYOUT.playerRadius;
const A: Kat2Ayar = C.kat2;
const GARSON = { hiz: 3, tepsi: 4 };
const AG: Kat2Ayar = { ...A, garson: GARSON };
const HEPSI = A.padler.map((p) => p.id);
const UZAK: [number, number] = [0, -1]; // hiçbir masaya/ocağa/pada/yığına yetişmez (mıknatıs 0,5)
const OCAK2 = OCAKLAR[1];
const T1 = KAT2_MASALAR.find((m) => m.tur === 'tavla')!;

function girdi(yer: readonly [number, number], o: Partial<Kat2Girdi> = {}): Kat2Girdi {
  return { x: yer[0], z: yer[1], durdu: true, cuzdan: 0, padsDone: HEPSI, tepsiKap: 6, miknatis: 0.5, ...o };
}

function sur(d: Kat2Dunya, sn: number, g: Kat2Girdi, ayar: Kat2Ayar, her?: (d: Kat2Dunya) => void) {
  const top = { servis: 0, garsonServis: 0, tavlaServis: 0, istek: 0, dusen: [] as number[], kalkan: [] as string[] };
  for (let t = 0; t < sn - 1e-9; t += 0.1) {
    const r = kat2Tick(d, g, 0.1, ayar);
    d = r.dunya;
    top.servis += r.olay.servis;
    top.garsonServis += r.olay.garsonServis;
    top.tavlaServis += r.olay.tavlaServis;
    top.istek += r.olay.istek;
    top.dusen.push(...r.olay.dusen);
    top.kalkan.push(...r.olay.kalkan);
    her?.(d);
  }
  return { d, ...top };
}

describe('config — D-186 tavla T120U + zincir', () => {
  it('tavla sayıları T120U: 2 dk oyun · 25 sn\'de 1 fincan · fincan 3 ₺ · masa ücreti 51 ₺', () => {
    expect(A.tavla).toEqual({ oturum: 120, kahveAralik: 25, istekAdet: 1, kahveFiyat: 3, masaUcreti: 51 });
  });

  it('zincir bekçisi: YAPI tutarlı, eksik sayı yok; garson D-189 (hız 3 · tepsi 2 · 1 garson)', () => {
    expect(kat2YapiHatasi(A)).toBeNull();
    expect(kat2EksikSayi(A)).toBeNull();
    expect(kat2ZincirHatasi(A)).toBeNull();
    expect(A.garson).toEqual({ hiz: 3, tepsi: 2, sayi: 1 });
    expect(A.garson!.hiz).toBeCloseTo(C.waiter.speedUpgrades.speeds.at(-1)! * 1.5);
    const garsonsuz: Kat2Ayar = { ...A, garson: undefined };
    expect(kat2EksikSayi(garsonsuz)).toBe('k2garson: garson sayıları (Kat2Ayar.garson) yok');
  });

  it('2. ocak okey salonundan, garson tavla köşesinden önce zincire giremez', () => {
    const p = (id: string) => ({ id, cost: 1, fillRate: 1 });
    expect(kat2YapiHatasi({ ...AG, padler: [p(OCAK.id), p(OCAK2.id)] })).toMatch(/salonu/);
    expect(kat2YapiHatasi({ ...AG, padler: [p('k2salon2'), p(KAT2_GARSON_PAD)] })).toMatch(/salonu/);
    expect(kat2YapiHatasi({ ...AG, padler: [p('k2salon2'), p(OCAK2.id), p('k2salon3'), p(KAT2_GARSON_PAD)] })).toBeNull();
  });

  it('pad yerleri + etiketler: 2. ocak "Cezve Ocağı" ocağın önünde, garson köşenin içinde', () => {
    expect(kat2PadYeri(OCAK2.id)).toEqual([OCAK2.al[0], OCAK2.al[1]]);
    expect(kat2PadYeri(KAT2_GARSON_PAD)).toEqual([...KAT2_GARSON_YER]);
    expect(kat2PadEtiket(OCAK2.id)).toBe('Cezve Ocağı');
    expect(kat2PadEtiket(KAT2_GARSON_PAD)).toBe('Garson');
  });
});

describe('yerleşim — 2. ocak ve garson pad\'i hiçbir şeyle çakışmaz', () => {
  const tum = kat2AcikAlan(HEPSI);
  const masaKatilari = kat2Engeller(HEPSI).filter((s) => !(s.c[0] === OCAK2.x && s.c[2] === OCAK2.z));

  it('2. ocak okey salonunda, gövdesi masalara/geçitlere değmez, alma noktası yürünebilir', () => {
    expect(OCAK2.x).toBeLessThan(0);
    expect(OCAK2.z).toBeGreaterThan(0);
    const [hx, hz] = OCAK2.govde!;
    // Masa ayak izleri (okey yarısı 1,25) ile kesişmez.
    for (const m of KAT2_MASALAR.filter((x) => x.alan === 1))
      expect(Math.abs(m.x - OCAK2.x) >= hx + OKEY_YARI || Math.abs(m.z - OCAK2.z) >= hz + OKEY_YARI).toBe(true);
    // Bölmenin (z = 0) geçitlerinin önünü kapatmaz: iki yanda en az 0,85 (gövde çapı 0,7 + pay).
    for (const [p, q] of KAT2_BOLMELER[0].kapilar) expect(OCAK2.x + hx <= p - 0.85 || OCAK2.x - hx >= q + 0.85).toBe(true);
    const katilar = [KUYU, ...kat2Duvarlar(tum), ...kat2Engeller(HEPSI)];
    expect(hitsSolid(OCAK2.al[0], OCAK2.al[1], katilar, PR)).toBe(false);
    expect(dikKelepce(OCAK2.al[0], OCAK2.al[1], kat2YurumeAlani(tum))).toEqual([OCAK2.al[0], OCAK2.al[1]]);
  });

  it('2. ocak açılınca gövdesi katıdır (içinden yürünmez)', () => {
    let [x, z] = [OCAK2.x, OCAK2.al[1] + 1];
    for (let i = 0; i < 60; i++) [x, z] = kat2Adim(x, z, 0, -0.1, tum, kat2Engeller(HEPSI));
    expect(z).toBeGreaterThanOrEqual(OCAK2.z + OCAK2.govde![1] + PR - 1e-6);
  });

  it('garson pad\'i tavla köşesinde; çerçevesi masa ayak izine, duvara, geçide değmez', () => {
    const [gx, gz] = KAT2_GARSON_YER;
    expect(gx).toBeGreaterThan(0);
    expect(gz).toBeGreaterThan(0);
    const c = padCercevesi(kat2PadEtiket(KAT2_GARSON_PAD));
    for (const m of KAT2_MASALAR)
      expect(Math.abs(m.x - gx) >= c.hw + TAVLA_YARI[0] || Math.abs(m.z - gz) >= c.hh + TAVLA_YARI[1]).toBe(true);
    expect(gz - c.hh).toBeGreaterThan(0.09);
    expect(gx + c.hw).toBeLessThan(KAT2_BOLMELER[1].kapilar[1][0]);
    expect(hitsSolid(gx, gz, [...kat2Duvarlar(tum), ...masaKatilari], PR)).toBe(false);
    // Salon pad'inden ayrı yerde: salonu bitiren oyuncu farkında olmadan garsonu doldurmaz.
    const [sx, sz] = kat2PadYeri('k2salon3');
    expect(inFrame(sx, sz, [gx, 0, gz], c)).toBe(false);
  });
});

describe('tavla grubu config sayılarıyla gelir', () => {
  it('tavla masası açılınca grup gelir, 2 dk oynar; yığın = 51 ₺ + servis × 3 ₺; olay.kalkan masanın kimliği', () => {
    const pd = [OCAK.id, 'k2salon2', 'k2salon3', T1.id];
    const onu: [number, number] = [T1.x + 1.8, T1.z]; // oturak yanı, yığından uzak
    let d = yeniKat2Dunya(pd, A);
    let servis = 0;
    const dusen: number[] = [];
    const kalkan: string[] = [];
    for (let t = 0; t < A.gelisAralik + A.yurume + A.tavla!.oturum + 1; t += 0.1) {
      const r = kat2Tick({ ...d, tepsi: 6 }, girdi(onu, { padsDone: pd }), 0.1, A);
      d = r.dunya;
      servis += r.olay.servis;
      dusen.push(...r.olay.dusen);
      kalkan.push(...r.olay.kalkan);
    }
    expect(servis).toBeGreaterThan(0);
    expect(dusen).toEqual([51 + servis * 3]);
    expect(kalkan).toEqual([T1.id]);
  });

  it('olay.kalkan her adımda `dusen` ile aynı sırada ve aynı sayıda', () => {
    const r = sur(yeniKat2Dunya(HEPSI, A), 400, girdi(UZAK), A);
    expect(r.kalkan.length).toBe(r.dusen.length);
    expect(r.kalkan.length).toBeGreaterThan(20);
    expect(new Set(r.kalkan).size).toBe(22);
  });
});

describe('2. cezve ocağı', () => {
  it('açılınca iki ocak birlikte pişirir; kapalıyken 2. ocak pişirmez', () => {
    const bir = sur(yeniKat2Dunya(HEPSI.slice(0, 5), A), 9, girdi(UZAK, { padsDone: HEPSI.slice(0, 5) }), A).d;
    expect(bir.ocaklar.map((o) => o.hazir)).toEqual([2, 0]);
    const iki = sur(yeniKat2Dunya(HEPSI, A), 9, girdi(UZAK), A).d;
    expect(iki.ocaklar.map((o) => o.id)).toEqual([OCAK.id, OCAK2.id]);
    expect(iki.ocaklar.map((o) => o.hazir)).toEqual([2, 2]);
  });

  it('oyuncu iki ocaktan da alır (her biri kendi önünden)', () => {
    const d = sur(yeniKat2Dunya(HEPSI, A), 30, girdi(UZAK), A).d;
    const r1 = kat2Tick(d, girdi(OCAK.al, { tepsiKap: 3 }), 0.1, A);
    expect(r1.dunya.tepsi).toBe(3);
    expect(r1.dunya.ocaklar.map((o) => o.hazir)).toEqual([A.ocakKuyruk - 3, A.ocakKuyruk]);
    const r2 = kat2Tick(r1.dunya, girdi(OCAK2.al, { tepsiKap: 6 }), 0.1, A);
    expect(r2.dunya.tepsi).toBe(6);
    expect(r2.dunya.ocaklar[1].hazir).toBe(A.ocakKuyruk - 3);
  });

  it('yalnız 2. ocak açık olsa da istekler başlar (kapı: en az bir ocak)', () => {
    const pd = ['k2okey1', 'k2salon2', OCAK2.id];
    const r = sur(yeniKat2Dunya(pd, A), 60, girdi(UZAK, { padsDone: pd }), A);
    expect(r.istek).toBeGreaterThan(0);
    expect(r.d.ocaklar[0].hazir).toBe(0);
  });
});

describe('Kat 2 garsonu', () => {
  it('sayıları yoksa pad açık olsa da garson GELMEZ (null)', () => {
    const A0: Kat2Ayar = { ...A, garson: undefined };
    expect(yeniKat2Dunya(HEPSI, A0).garson).toBeNull();
    const r = sur(yeniKat2Dunya(HEPSI, A0), 60, girdi(UZAK), A0);
    expect(r.d.garson).toBeNull();
    expect(r.garsonServis).toBe(0);
  });

  it('sayılarla da pad\'i bitmeden gelmez; bitince evinde doğar', () => {
    const pd = HEPSI.filter((id) => id !== KAT2_GARSON_PAD);
    expect(yeniKat2Dunya(pd, AG).garson).toBeNull();
    expect(yeniKat2Dunya(HEPSI, AG).garson).toEqual({ x: KAT2_GARSON_YER[0], z: KAT2_GARSON_YER[1], tepsi: 0, hedef: null });
  });

  it('tavla isteğine ocaktan kahve getirir; okey isteğine DOKUNMAZ, yığın toplamaz', () => {
    const r = sur(yeniKat2Dunya(HEPSI, AG), 400, girdi(UZAK), AG);
    expect(r.garsonServis).toBeGreaterThan(10);
    expect(r.servis).toBe(r.garsonServis); // oyuncu uzakta: her servis garsonun
    expect(r.tavlaServis).toBe(r.servis); // hepsi tavla masasına
    expect(r.d.paralar.length).toBeGreaterThan(0); // yığınlar yerde bekliyor
    // Sonuç: hiçbir okey masasının birikimine kahve parası girmedi.
    const okeyYigin = r.dusen.filter((_, i) => KAT2_MASALAR.find((m) => m.id === r.kalkan[i])!.tur === 'okey');
    expect(okeyYigin.every((v) => v === A.masaUcreti)).toBe(true);
  });

  it('geçitten geçer, hiçbir duvarı/masayı/ocağı delmez (2 garson, 6 dk)', () => {
    const tum = kat2AcikAlan(HEPSI);
    const duvar = kat2Duvarlar(tum);
    const katilar = [KUYU, ...duvar, ...kat2Engeller(HEPSI)];
    const ayar: Kat2Ayar = { ...AG, garson: { ...GARSON, sayi: 2 } };
    let gecis = 0;
    let onceki: [number, number][] = [];
    let ihlal = 0;
    let alan1 = false;
    const r = sur(yeniKat2Dunya(HEPSI, ayar), 360, girdi(UZAK), ayar, (d) => {
      const gs = [d.garson!, ...(d.garsonEk ?? [])];
      expect(gs).toHaveLength(2);
      gs.forEach((g, i) => {
        if (hitsSolid(g.x, g.z, katilar, PR - 1e-6)) ihlal++;
        if (g.x < -0.5 && g.z > 0) alan1 = true;
        const p = onceki[i];
        // x = 0 bölmesini (alan 1 ↔ 2) yalnız geçidinden geçer.
        if (p && g.z > 0 && Math.sign(p[0]) !== Math.sign(g.x) && p[0] !== 0) {
          gecis++;
          expect(g.z).toBeGreaterThan(KAT2_BOLMELER[2].kapilar[0][0]);
          expect(g.z).toBeLessThan(KAT2_BOLMELER[2].kapilar[0][1]);
        }
      });
      onceki = gs.map((g) => [g.x, g.z]);
    });
    expect(ihlal).toBe(0);
    expect(alan1).toBe(true); // 2. ocağa (okey salonu) gitti
    expect(gecis).toBeGreaterThan(2);
    expect(r.garsonServis).toBeGreaterThan(0);
  });

  it('ocak paylaşımı deterministik: aynı adımda oyuncu önce alır', () => {
    let d = sur(yeniKat2Dunya(HEPSI, AG), 30, girdi(UZAK), AG).d;
    d = { ...d, ocaklar: d.ocaklar.map((o) => ({ ...o, hazir: 1 })) };
    const masalar = d.masalar.map((m) => (m.id === T1.id ? { ...m, durum: 'oyunda' as const, t: 60, istek: 1, sabir: 20 } : m));
    const g = { x: OCAK2.al[0], z: OCAK2.al[1], tepsi: 0, hedef: null };
    const r = kat2Tick({ ...d, masalar, garson: g }, girdi(OCAK2.al), 0.1, AG);
    expect(r.dunya.tepsi).toBe(1);
    expect(r.dunya.garson!.tepsi).toBe(0);
    const r2 = kat2Tick({ ...d, masalar, garson: g }, girdi(UZAK), 0.1, AG);
    expect(r2.dunya.garson!.tepsi).toBe(1); // ihtiyaç kadar (1 istek → 1 fincan), tepsiyi doldurmaz
    expect(r2.dunya.garson!.hedef).toBe(OCAK2.id);
  });
});

describe('yol ağı — geçit pervazında takılmaz (S2 kapanışı: ölçüm botu kapı ucunda 15 dk itti)', () => {
  // Izgara kaba: pervazın yarıçap kadar yakınındaki yürüyene düz hedef verilirse `kat2Adim` onu duvarda
  // tutar. Garson da aynı ağla yürür. Her geçidin iki ucunda, iki yandan, karşı yana yürü → varmalı.
  it('her geçidin her ucundan karşı yana yürüyen 400 adımda varır', () => {
    const ag = kat2YolAgi(HEPSI);
    const PR = LAYOUT.playerRadius;
    const katilar = [KUYU, ...kat2Duvarlar(ag.acikAlan), ...ag.engeller];
    const bos = (x: number, z: number) => !hitsSolid(x, z, katilar, PR) && ag.uzunluk(x, z, x, z) < 1e9;
    let denenen = 0;
    const takilan: string[] = [];
    for (const b of KAT2_BOLMELER) {
      const yatay = b.z1 === b.z2;
      for (const [p, q] of b.kapilar) {
        for (const u of [p - 0.3, p, p + PR - 0.05, p + PR + 0.05, q - PR - 0.05, q - PR + 0.05, q, q + 0.3]) {
          for (const yan of [-1, 1]) {
            for (const ara of [0.7, 0.9, 1.2]) {
              const bas: [number, number] = yatay ? [u, b.z1 + yan * ara] : [b.x1 + yan * ara, u];
              const hed: [number, number] = yatay ? [u, b.z1 - yan * 3.3] : [b.x1 - yan * 3.3, u];
              if (!bos(...bas) || !bos(...hed)) continue;
              let [x, z] = bas;
              let vardi = false;
              for (let i = 0; i < 400 && !vardi; i++) {
                const w = ag.nokta(x, z, hed[0], hed[1]);
                const L = Math.hypot(w[0] - x, w[1] - z);
                if (L > 1e-6) {
                  const k = Math.min(1, 0.45 / L);
                  [x, z] = kat2Adim(x, z, (w[0] - x) * k, (w[1] - z) * k, ag.acikAlan, ag.engeller);
                }
                vardi = Math.hypot(hed[0] - x, hed[1] - z) < 0.2;
              }
              denenen++;
              if (!vardi) takilan.push(`(${bas.map((v) => v.toFixed(2))}) → (${hed.map((v) => v.toFixed(2))}) kaldı (${x.toFixed(2)}, ${z.toFixed(2)})`);
            }
          }
        }
      }
    }
    expect(denenen).toBeGreaterThan(60);
    expect(takilan).toEqual([]);
  });
});
