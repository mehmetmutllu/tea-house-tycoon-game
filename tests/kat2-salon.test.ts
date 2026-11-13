/**
 * kat2-salon.test.ts — K2-3c BEKÇİSİ: Kat 2'nin salonları ve tavla masası.
 *
 * Plan D-179 B: merdiven salonu → okey salonu → tavla köşesi. D-191: bölme YOK — kapalı alanın önünde
 * boydan boya duvar, alan açılınca duvar kalkar ve hat serbest yürünür (geçit yok). Salon, merdiven
 * salonu tarafındaki pad'iyle açılır. Tavla 2 kişilik (D-181), kendi sayılarıyla döner; ücret + kahve TEK yığın.
 */
import { describe, it, expect } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { hitsSolid, LAYOUT } from '../src/game/layout';
import {
  KAT2_BOLMELER,
  KAT2_KISI,
  KAT2_MASALAR,
  KAT2_SALON_PAD,
  OCAK,
  TAVLA_ERISIM,
  TAVLA_PARA_DZ,
  TAVLA_YARI,
  kat2AcikAlan,
  kat2Adim,
  kat2AlanBul,
  kat2DuvarVar,
  kat2Duvarlar,
  kat2Engeller,
  masaGovdesi,
} from '../src/game/kat';
import {
  kat2PadEtiket,
  kat2PadYeri,
  kat2Tick,
  kat2ZincirHatasi,
  yeniKat2Dunya,
  type Kat2Ayar,
  type Kat2Dunya,
  type Kat2Girdi,
} from '../src/game/kat2Dongu';

const PR = LAYOUT.playerRadius;
const TAVLA = { oturum: 90, kahveAralik: 25, istekAdet: 1, kahveFiyat: 10, masaUcreti: 20 };
const A: Kat2Ayar = { ...C.kat2, tavla: TAVLA };
const T1 = KAT2_MASALAR.find((m) => m.tur === 'tavla')!;
const S2 = KAT2_MASALAR.find((m) => m.alan === 1)!;
const UZAK: [number, number] = [0, -1];

/** `n` adım aynı yönde yürür. */
function yuru(p: [number, number], dx: number, dz: number, acikAlan: number, n = 200, engeller = kat2Engeller([])): [number, number] {
  let [x, z] = p;
  for (let i = 0; i < n; i++) [x, z] = kat2Adim(x, z, dx, dz, acikAlan, engeller);
  return [x, z];
}

function girdi(yer: [number, number], o: Partial<Kat2Girdi> = {}): Kat2Girdi {
  return { x: yer[0], z: yer[1], durdu: true, cuzdan: 0, padsDone: [], tepsiKap: 6, miknatis: 0.5, ...o };
}

function sur(d: Kat2Dunya, sn: number, g: Kat2Girdi, ayar = A, dt = 0.1) {
  const top = { servis: 0, istek: 0, dusen: [] as number[] };
  for (let t = 0; t < sn - 1e-9; t += dt) {
    const r = kat2Tick(d, g, dt, ayar);
    d = r.dunya;
    top.servis += r.olay.servis;
    top.istek += r.olay.istek;
    top.dusen.push(...r.olay.dusen);
  }
  return { d, ...top };
}

describe('salonlar — açık alan padsDone\'dan türer, salon pad\'iyle açılır', () => {
  it('salon pad\'leri sırayla sayılır (tavla köşesi okey salonundan önce açılmaz)', () => {
    expect(kat2AcikAlan([])).toBe(1);
    expect(kat2AcikAlan(['k2salon2'])).toBe(2);
    expect(kat2AcikAlan(['k2salon3'])).toBe(1);
    expect(kat2AcikAlan(['k2salon3', 'k2salon2'])).toBe(3);
  });

  it('salon pad\'i merdiven salonunda, açtığı salonun duvarının önünde; masalara değmez', () => {
    for (const [i, id] of KAT2_SALON_PAD.entries()) {
      const [x, z] = kat2PadYeri(id);
      expect(kat2AlanBul(x, z)).toBe(0);
      expect(Math.sign(x)).toBe(i === 0 ? -1 : 1); // okey salonu solda, tavla köşesi sağda
      expect(z + 0.85).toBeLessThan(-PR); // çerçeve duvarın (z 0) önünde
      // Pad çerçevesi (±0,89 × ±0,85) hiçbir masanın gövdesine değmez.
      for (const m of KAT2_MASALAR) {
        const g = masaGovdesi(m);
        expect(Math.abs(g.c[0] - x) >= g.h[0] + 0.89 || Math.abs(g.c[2] - z) >= g.h[1] + 0.85).toBe(true);
      }
      // Salon kapalıyken pad'in üstüne yürünür (kelepçe onu yerinden oynatmaz).
      expect(kat2Adim(x, z, 0, 0, 1)).toEqual([x, z]);
    }
  });

  it('salon pad\'i durunca dolar, bitince alan açılır ve duvarın yerinden içeri yürünür', () => {
    const ayar: Kat2Ayar = { ...A, padler: [{ id: 'k2salon2', cost: 300, fillRate: 100 }] };
    const yer = kat2PadYeri('k2salon2');
    let d = yeniKat2Dunya([], ayar);
    let pd: string[] = [];
    let bitti: string | null = null;
    for (let t = 0; t < 5 && !bitti; t += 0.1) {
      const r = kat2Tick(d, girdi(yer, { padsDone: pd, cuzdan: 1e6 }), 0.1, ayar);
      d = r.dunya;
      pd = r.padsDone;
      bitti = r.olay.padBitti;
    }
    expect(bitti).toBe('k2salon2');
    expect(kat2AcikAlan(pd)).toBe(2);
    expect(yuru(yer, 0, 0.1, kat2AcikAlan([]))[1]).toBeLessThan(0);
    expect(yuru(yer, 0, 0.1, kat2AcikAlan(pd))[1]).toBeGreaterThan(3);
  });
});

describe('D-191 duvarı: kapalı alanın önünde katı, açılınca kalkar', () => {
  it('kapalı salona hiçbir yerden girilmez', () => {
    expect(yuru([-8.85, -2], 0, 0.1, 1)[1]).toBeLessThan(-PR);
    expect(yuru([8.85, -2], 0, 0.1, 2)[1]).toBeLessThan(-PR); // okey salonu açık, tavla köşesi kapalı
    expect(yuru([-3, 8.7], 0.1, 0, 2)[0]).toBeLessThan(-PR); // okey salonundan tavla köşesine de yok
  });

  it('açık iki alan arasındaki hat her noktasından geçilir (geçit yok, duvar kalktı)', () => {
    for (const x of [-15, -8.85, -4.5, -0.9]) expect(yuru([x, -2], 0, 0.1, 2)[1]).toBeGreaterThan(1.5);
    for (const x of [0.9, 3, 9.75, 15]) expect(yuru([x, -2], 0, 0.1, 3)[1]).toBeGreaterThan(1.5);
    for (const z of [1, 8.7, 16]) expect(yuru([-3, z], 0.1, 0, 3)[0]).toBeGreaterThan(3);
  });

  it('hat yalnız bir yanı açıkken duvar; iki yanı açıkken duvar yok', () => {
    expect(yuru([4.5, -2], 0, 0.1, 2)[1]).toBeLessThan(0);
    expect(yuru([-3, 3], 0.1, 0, 2)[0]).toBeLessThan(0);
    expect(yuru([4.5, -2], 0, 0.1, 3)[1]).toBeGreaterThan(1.5);
    for (const b of KAT2_BOLMELER) {
      expect(kat2DuvarVar(b, 3)).toBe(false);
      expect(kat2DuvarVar(b, 1)).toBe(b.alanlar.includes(0));
    }
  });

  it('rastgele yürüyüş (en büyük adım 0,5): hiçbir adım duvarı delmez, kapalı salona sızmaz', () => {
    let s = 12345;
    const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32);
    for (const acik of [1, 2, 3]) {
      const duvar = kat2Duvarlar(acik);
      let [x, z] = [-8.85, -2];
      for (let i = 0; i < 20_000; i++) {
        const [px, pz] = [x, z];
        const a = rnd() * Math.PI * 2;
        const L = rnd() * 0.5;
        [x, z] = kat2Adim(x, z, Math.cos(a) * L, Math.sin(a) * L, acik);
        expect(kat2AlanBul(x, z)).toBeLessThan(acik);
        expect(hitsSolid(x, z, duvar, PR)).toBe(false);
        // Hattı geçen her adım iki yanı açık (duvarı kalkmış) bir hattan geçer.
        const [a0, a1] = [kat2AlanBul(px, pz), kat2AlanBul(x, z)];
        if (a0 !== a1) expect(Math.max(a0, a1)).toBeLessThan(acik);
      }
    }
  });

  it('bir engelin içinden çıkarken ("içindeyse çık" kuralı) bile duvara girilmez', () => {
    const engel = [{ c: [-4.5, 0, -1] as const, h: [0.5, 0.5] as const }];
    const [x, z] = kat2Adim(-4.5, -0.7, 0, 0.5, 3, engel);
    expect(hitsSolid(x, z, kat2Duvarlar(3), PR)).toBe(false);
    expect(z).toBeLessThan(0);
  });

  it('duvar boyu: 1 alan → iki ön duvar · 2 alan → tavla köşesinin iki duvarı · 3 alan → hiç', () => {
    const toplamBoy = (ds: ReturnType<typeof kat2Duvarlar>) => ds.reduce((a, d) => a + 2 * Math.max(d.h[0], d.h[1]), 0);
    expect(toplamBoy(kat2Duvarlar(1))).toBeCloseTo(34);
    expect(toplamBoy(kat2Duvarlar(2))).toBeCloseTo(34);
    expect(kat2Duvarlar(3)).toHaveLength(0);
  });
});

describe('tavla masası — 2 kişi, kendi sayıları, ücret + kahve tek yığın', () => {
  it('22 masa İD ile; türleri KAT2_MASALAR\'dan; tavlada 2, okeyde 4 kişi', () => {
    const d = yeniKat2Dunya([T1.id], A);
    expect(d.masalar.map((m) => m.id)).toEqual(KAT2_MASALAR.map((m) => m.id));
    expect(d.masalar.filter((m) => m.tur === 'tavla')).toHaveLength(12);
    expect(d.masalar.find((m) => m.id === T1.id)!.durum).toBe('bos');
    expect(KAT2_KISI).toEqual({ okey: 4, tavla: 2 });
  });

  it('grup gelir, tavla süresi kadar oynar, 25 sn\'de 1 fincan ister; yığın = ücret + servis × tavla fiyatı', () => {
    const pd = [OCAK.id, T1.id];
    let d = yeniKat2Dunya(pd, A);
    const onu: [number, number] = [T1.x + TAVLA_ERISIM[0] - 0.2, T1.z]; // oturak yanı (yığından uzak)
    let servis = 0;
    let istek = 0;
    const dusen: number[] = [];
    for (let t = 0; t < A.gelisAralik + A.yurume + TAVLA.oturum + 1; t += 0.1) {
      const r = kat2Tick({ ...d, tepsi: 6 }, girdi(onu, { padsDone: pd }), 0.1, A);
      d = r.dunya;
      servis += r.olay.servis;
      istek += r.olay.istek;
      dusen.push(...r.olay.dusen);
    }
    expect(dusen).toHaveLength(1);
    expect(istek).toBe(3); // 90 sn oyunda 25 sn'de bir, son 12,5 sn'de istenmez
    expect(servis).toBe(istek * TAVLA.istekAdet);
    expect(dusen[0]).toBe(TAVLA.masaUcreti + servis * TAVLA.kahveFiyat);
    expect(d.paralar[0]).toMatchObject({ x: T1.x, z: T1.z + TAVLA_PARA_DZ });
  });

  it('oyun süresi tavla sayısından (okeyinkinden değil); okey salonundaki masa okey sayısıyla', () => {
    const pd = [T1.id, S2.id];
    const r = sur(yeniKat2Dunya(pd, A), A.gelisAralik + A.yurume + TAVLA.oturum + 0.5, girdi(UZAK, { padsDone: pd }));
    expect(r.dusen).toEqual([TAVLA.masaUcreti]); // ocak kapalı → yalnız tavla ücreti; okey hâlâ oyunda
    expect(r.d.masalar.find((m) => m.id === S2.id)!.durum).toBe('oyunda');
    const r2 = sur(r.d, A.oturum - TAVLA.oturum, girdi(UZAK, { padsDone: pd }));
    expect(r2.dusen).toContain(A.masaUcreti);
  });

  it('tavla erişimi masanın yanında (oturak ±x) — uzak köşeden servis yok', () => {
    const pd = [OCAK.id, T1.id];
    let d = sur(yeniKat2Dunya(pd, A), A.gelisAralik + A.yurume + TAVLA.kahveAralik + 0.3, girdi(UZAK, { padsDone: pd })).d;
    expect(d.masalar.find((m) => m.id === T1.id)!.istek).toBe(1);
    d = { ...d, tepsi: 3 };
    const disari = kat2Tick(d, girdi([T1.x, T1.z + TAVLA_ERISIM[1] + 0.3], { padsDone: pd }), 0.1, A);
    expect(disari.olay.servis).toBe(0);
    const yan = kat2Tick(d, girdi([T1.x + TAVLA_ERISIM[0] - 0.1, T1.z], { padsDone: pd }), 0.1, A);
    expect(yan.olay.servis).toBe(1);
  });

  it('tavla sayıları YOKSA masa açık durur ama grup gelmez, para üretmez; zincir denetimi uyarır', () => {
    const { tavla: _tavla, ...okeyAyar } = C.kat2;
    const r = sur(yeniKat2Dunya([OCAK.id, T1.id], okeyAyar), 400, girdi(UZAK, { padsDone: [OCAK.id, T1.id] }), okeyAyar);
    expect(r.dusen).toEqual([]);
    expect(r.istek).toBe(0);
    expect(r.d.masalar.find((m) => m.id === T1.id)!.durum).toBe('bos');
    const salon = [...C.kat2.hazir.map((id) => ({ id, cost: 1, fillRate: 1 })), ...C.kat2.padler.slice(0, 3)];
    const zincir = [...salon, { id: 'k2salon2', cost: 1, fillRate: 1 }, { id: 'k2salon3', cost: 1, fillRate: 1 }, { id: T1.id, cost: 1, fillRate: 1 }];
    expect(kat2ZincirHatasi({ ...okeyAyar, padler: zincir })).toMatch(/tavla/);
    expect(kat2ZincirHatasi({ ...A, padler: zincir })).toBeNull();
  });

  it('açık tavla masası katıdır (ayak izi ±x\'te geniş); kapalısının yerinden geçilir', () => {
    expect(yuru([T1.x - 3, T1.z], 0.1, 0, 3, 80, kat2Engeller([T1.id]))[0]).toBeLessThan(T1.x - TAVLA_YARI[0]);
    expect(yuru([T1.x - 3, T1.z], 0.1, 0, 3, 80, kat2Engeller([]))[0]).toBeGreaterThan(T1.x + TAVLA_YARI[0]);
    expect(yuru([T1.x, T1.z - 2], 0, 0.1, 3, 40, kat2Engeller([T1.id]))[1]).toBeLessThan(T1.z - TAVLA_YARI[1]);
  });
});

describe('pad zinciri — salon önce, masası sonra', () => {
  it('her masanın ve salonun pad yeri var; etiketler türe göre', () => {
    for (const m of KAT2_MASALAR) expect(kat2PadYeri(m.id)).toEqual([m.x, m.z]);
    expect(kat2PadEtiket(T1.id)).toBe('Tavla Masası');
    expect(kat2PadEtiket(S2.id)).toBe('Okey Masası');
    expect(kat2PadEtiket('k2salon2')).toBe('Okey Salonu');
    expect(kat2PadEtiket('k2salon3')).toBe('Tavla Köşesi');
  });

  it('salonu açılmadan masası, okey salonundan önce tavla köşesi zincire giremez', () => {
    const p = (id: string) => ({ id, cost: 1, fillRate: 1 });
    expect(kat2ZincirHatasi({ ...A, padler: [p('k2okey1'), p(S2.id)] })).toMatch(/salonu/);
    expect(kat2ZincirHatasi({ ...A, padler: [p('k2salon3')] })).toMatch(/k2salon2/);
    expect(kat2ZincirHatasi({ ...A, padler: [p('k2salon2'), p('k2salon3'), p(T1.id), p(S2.id)] })).toBeNull();
    expect(kat2ZincirHatasi({ ...A, padler: [p('yok')] })).toMatch(/yeri yok/);
  });
});

describe('tavla masası katıdır (ayak izi masa + iki oturak)', () => {
  it('oturak hizasından masaya yürüyen oyuncu ayak izinin dışında durur', () => {
    const t = KAT2_MASALAR.find((m) => m.tur === 'tavla')!;
    const acik = [...KAT2_SALON_PAD, t.id];
    // Masanın solundan, oturak hizasında sağa doğru yürü.
    let p: [number, number] = [t.x - TAVLA_YARI[0] - 1.2, t.z];
    for (let i = 0; i < 60; i++) p = kat2Adim(p[0], p[1], 0.1, 0, kat2AcikAlan(acik), kat2Engeller(acik));
    expect(p[0]).toBeLessThanOrEqual(t.x - 1.0 - LAYOUT.playerRadius + 1e-6); // oturak (±0,82) + gövde
    expect(TAVLA_YARI[0]).toBeGreaterThanOrEqual(1.0);
  });
});

describe('store — açılmış salona geçitten girilir', () => {
  it('k2salon2 kayıtta → oyuncu okey salonuna yürür; yokken bölmede durur', async () => {
    const { useGame } = await import('../src/game/store');
    const yuruIleri = (pads: string[]) => {
      useGame.getState().hardReset();
      useGame.getState().kat2Ac();
      useGame.setState({ kat: 2, kat2: { acik: true, padsDone: pads }, player: [-8.85, 0.6, -2] as never });
      useGame.getState().setKeyboardInput(0, 1);
      for (let t = 0; t < 2; t += 0.05) useGame.getState().tick(0.05);
      useGame.getState().setKeyboardInput(0, 0);
      return useGame.getState().player[2];
    };
    expect(yuruIleri(['k2salon2'])).toBeGreaterThan(1);
    expect(yuruIleri([])).toBeLessThan(0);
  });
});
