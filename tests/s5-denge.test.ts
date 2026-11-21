/**
 * s5-denge.test.ts — S5 DENGE BEKÇİSİ (kullanıcı kararları 2026-11-20, `docs/s5-denge-raporu.md` §KARAR).
 *  G-96  kahve içilip fincan kirlenince parası düşer (her teslim ayrı); masa ücreti kalkışta.
 *  G-97  istek aralığı 18 sn, fiyat ölçülü düşük (teorik kahve geliri/dk sabit).
 *  G-119 masa Sv kapısı zincirde (K2T): 3 okey → Sv2, bütün masalar → Sv3, yarısı → Sv4/Sv5; Sv görevleri hattan düşer.
 *  G-129 tavla ikişerli bloklar okey sıralarının hizasında; masa sayısı/sıra aynı.
 * G-128 (garson servisi görev sayacına) `tests/kat2-gorev.test.ts`te.
 */
import { describe, it, expect } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { KAT2_MASALAR, KAT2_SV_MAX, OKEY_ERISIM, PARA_DUSME_DZ, TAVLA_YARI, type Kat2MasaYeri } from '../src/game/kat';
import { FLOOR_HALF } from '../src/game/layout';
import { kat2SvHedef, kat2SvTavan, kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya, type Kat2Girdi } from '../src/game/kat2Dongu';
import { KAT2_GOREV_SIRA_D205, kat2GorevKaydiCoz, kat2Gorevleri, kat2SvCanli } from '../src/game/kat2Gorev';

const K = C.kat2 as unknown as Kat2Ayar;
const MASA = KAT2_MASALAR.find((m) => m.id === 'k2okey2') as Kat2MasaYeri;
const PADS = ['k2okey2', 'k2cezve'];
const ONU: [number, number] = [MASA.x, MASA.z + OKEY_ERISIM - 0.2];
const UZAK: [number, number] = [0, -1];
const girdi = (yer: [number, number], o: Partial<Kat2Girdi> = {}): Kat2Girdi => ({ x: yer[0], z: yer[1], durdu: true, cuzdan: 0, padsDone: PADS, tepsiKap: 6, miknatis: 0, ...o });

/** k2okey2'de oturan, `istek` fincan isteyen grup; tepside `tepsi` kahve. */
function oturan(A: Kat2Ayar, istek: number, tepsi: number, kalan = 60): Kat2Dunya {
  const d = yeniKat2Dunya(PADS, A);
  const m = d.masalar.find((x) => x.id === MASA.id)!;
  Object.assign(m, { durum: 'oyunda', t: kalan, kahveT: 99, istek, sabir: A.kahveSabir, birikim: 0 });
  d.tepsi = tepsi;
  return d;
}
function sur(d: Kat2Dunya, sn: number, g: Kat2Girdi, A: Kat2Ayar, dt = 0.1) {
  const dusen: number[] = [];
  let servis = 0;
  for (let t = 0; t < sn - 1e-9; t += dt) {
    const r = kat2Tick(d, g, dt, A);
    d = r.dunya;
    dusen.push(...r.olay.dusen);
    servis += r.olay.servis;
  }
  return { d, dusen, servis, masa: d.masalar.find((x) => x.id === MASA.id)! };
}

describe('G-96 — kahve parası içilince (fincan kirlenince) düşer', () => {
  const A: Kat2Ayar = { ...K, kahveIcme: 10, kahveAninda: true }; // kahveIcme kahveAninda'yı ezer
  const fiyat = A.kahveFiyat;

  it('servis anında para YOK; içme bitince o kahvenin parası masanın önüne düşer ve fincan kirlenir', () => {
    let r = sur(oturan(A, 2, 2), 0.1, girdi(ONU), A);
    expect(r.servis).toBe(2);
    expect(r.dusen).toEqual([]);
    expect(r.d.paralar).toEqual([]);
    expect(r.masa.kirli ?? 0).toBe(0);
    r = sur(r.d, 9.7, girdi(UZAK), A);
    expect(r.dusen).toEqual([]);
    r = sur(r.d, 0.4, girdi(UZAK), A);
    expect(r.dusen).toHaveLength(1);
    expect(r.dusen[0]).toBeCloseTo(2 * fiyat, 6);
    expect(r.d.paralar[0]).toMatchObject({ x: MASA.x, z: MASA.z + PARA_DUSME_DZ });
    if (A.bulasik) expect([r.masa.kirli, r.masa.ictigi ?? 0]).toEqual([2, 0]);
  });

  it('her teslim ayrı düşüş: önceki kahve içilirken yenisi gelirse öncekinin parası o an düşer', () => {
    let r = sur(oturan(A, 2, 1), 0.1, girdi(ONU), A);
    expect(r.dusen).toEqual([]);
    r = sur(r.d, 3, girdi(UZAK), A);
    r.d.tepsi = 1;
    r = sur(r.d, 0.1, girdi(ONU), A);
    expect(r.dusen).toHaveLength(1);
    expect(r.dusen[0]).toBeCloseTo(fiyat, 6);
    r = sur(r.d, 10.1, girdi(UZAK), A);
    expect(r.dusen).toHaveLength(1);
    expect(r.dusen[0]).toBeCloseTo(fiyat, 6);
  });

  it('kalkışta içilmekte olan kahvenin parası + masa ücreti düşer (para kaybolmaz)', () => {
    let r = sur(oturan(A, 2, 2, 3), 0.1, girdi(ONU), A);
    r = sur(r.d, 3.2, girdi(UZAK), A);
    expect(r.masa.durum).toBe('bos');
    expect(r.dusen.reduce((a, b) => a + b, 0)).toBeCloseTo(2 * fiyat + A.masaUcreti, 6);
    expect(r.d.paralar.reduce((a, p) => a + p.miktar, 0)).toBeCloseTo(2 * fiyat + A.masaUcreti, 6);
  });

  it('kanca yoksa bugünkü: kahveAninda serviste düşer', () => {
    const B: Kat2Ayar = { ...K, kahveIcme: undefined, kahveAninda: true };
    const r = sur(oturan(B, 2, 2), 0.1, girdi(ONU), B);
    expect(r.dusen).toHaveLength(1);
  });
});

describe('G-97 ILK kancası — yalnız 1 masa açıkken kısa aralık', () => {
  const A: Kat2Ayar = { ...K, kahveAralik: 18, kahveAralikIlk: { masa: 1, aralik: 12 } };
  it('tek masa: servisten sonra sonraki istek 12 sn · iki masa: 18 sn', () => {
    const r1 = sur(oturan(A, 2, 2), 0.1, girdi(ONU), A);
    expect(r1.masa.kahveT).toBeCloseTo(12, 6);
    const iki = [...PADS, 'k2okey1'];
    const d = oturan(A, 2, 2);
    const r2 = sur(d, 0.1, girdi(ONU, { padsDone: iki }), A);
    expect(r2.masa.kahveT).toBeCloseTo(18, 6);
  });
});

describe('G-119 K2T — masa Sv kapısı zincirde', () => {
  const zincir = K.padler.map((p) => p.id);
  const kadar = (id: string) => [...(C.kat2.hazir as readonly string[]), ...zincir.slice(0, zincir.indexOf(id) + 1)];
  const masalar = (pads: readonly string[]) => KAT2_MASALAR.filter((m) => pads.includes(m.id)).map((m) => m.id);

  it('config: 3 okey (k2s2okey3) → Sv2 · bütün masalar (son masa pad\'i) → Sv3', () => {
    expect(K.masaSvKapi).toEqual({ sv2Pad: 'k2s2okey3', sv3Pad: 'k2tavla12' });
    const sonMasa = zincir.filter((id) => KAT2_MASALAR.some((m) => m.id === id)).at(-1);
    expect(sonMasa).toBe('k2tavla12');
  });

  it('tavan: Sv1 → Sv2 → Sv3 → yarısı Sv3 ise Sv4 → yarısı Sv4 ise Sv5', () => {
    expect(kat2SvTavan(K, kadar('k2s2okey2'), {})).toBe(1);
    expect(kat2SvTavan(K, kadar('k2s2okey3'), {})).toBe(2);
    expect(kat2SvTavan(K, kadar('k2tavla11'), {})).toBe(2);
    const hepsi = kadar('k2tavla12');
    expect(kat2SvTavan(K, hepsi, {})).toBe(3);
    const ids = masalar(hepsi);
    const sv = (n: number, s: number) => Object.fromEntries(ids.slice(0, n).map((id) => [id, s]));
    expect(kat2SvTavan(K, hepsi, sv(Math.ceil(ids.length / 2) - 1, 3))).toBe(3);
    expect(kat2SvTavan(K, hepsi, sv(Math.ceil(ids.length / 2), 3))).toBe(4);
    expect(kat2SvTavan(K, hepsi, sv(Math.ceil(ids.length / 2), 4))).toBe(KAT2_SV_MAX);
  });

  it('Sv hedefi tavanı aşmaz: 3 okey açıkken bütün açık masalar Sv2 ise hedef yok', () => {
    const p = kadar('k2s2okey3');
    expect(kat2SvHedef(K, p, {})).not.toBeNull();
    expect(kat2SvHedef(K, p, Object.fromEntries(masalar(p).map((id) => [id, 2])))).toBeNull();
  });

  it('görev kapısı yok: KUYRUK Sv görevleri hattan düşer (ara Sv görevleri kalır — S5 3. tur), Sv noktası her an canlı', () => {
    const hat = kat2Gorevleri(C.kat2Gorevler, K);
    expect(hat.filter((g) => g.hedef.tip === 'masaSv').map((g) => g.id)).toEqual(['k2_okeySv3', 'k2_okeySv6']);
    expect(hat.at(-1)!.id).toBe('k2_tavla12');
    expect(hat.length).toBeGreaterThan(0);
    expect(kat2SvCanli({ padsDone: [], gorev: { idx: 0, sayac: {} } } as never, C.kat2Gorevler, K)).toBe(true);
  });

  it('kayıt uyumu: Sv görevinde/sonunda kalmış kayıt bitmiş hatta oturur (ödenmiş görev yeniden açılmaz)', () => {
    const hat = kat2Gorevleri(C.kat2Gorevler, K);
    expect(kat2GorevKaydiCoz({ idx: 22, sayac: {}, son: 'k2_sv2' }, hat).idx).toBe(hat.length);
    expect(kat2GorevKaydiCoz({ idx: 23, sayac: {}, son: 'k2_sv5' }, hat).idx).toBe(hat.length);
    expect(kat2GorevKaydiCoz({ idx: KAT2_GOREV_SIRA_D205.length, sayac: {} }, hat).idx).toBe(hat.length);
    expect(kat2GorevKaydiCoz({ idx: 5, sayac: {}, son: hat[4].id }, hat).idx).toBe(5);
  });
});

describe('G-129 C — tavla ikişerli bloklar okey sıralarıyla aynı hizada', () => {
  const okey = KAT2_MASALAR.filter((m) => m.tur === 'okey' && m.z > 0);
  const tavla = KAT2_MASALAR.filter((m) => m.tur === 'tavla');
  it('masa sayısı ve sıra aynı: 22 = 10 okey + 12 tavla, kimlikler k2tavla1..12', () => {
    expect(KAT2_MASALAR).toHaveLength(22);
    expect(KAT2_MASALAR.filter((m) => m.tur === 'okey')).toHaveLength(10);
    expect(tavla.map((m) => m.id)).toEqual(Array.from({ length: 12 }, (_, i) => `k2tavla${i + 1}`));
  });
  it('her tavla bir okey sırasının ±1,2 hizasında; her sütunda her sırada iki tavla (blok)', () => {
    const sira = [...new Set(okey.map((m) => m.z))].sort((a, b) => a - b);
    expect(sira).toEqual([2.5, 8.5, 14.5]);
    for (const x of [...new Set(tavla.map((m) => m.x))]) {
      const zs = tavla.filter((m) => m.x === x).map((m) => m.z).sort((a, b) => a - b);
      expect(zs).toEqual(sira.flatMap((z) => [z - 1.2, z + 1.2]).map((v) => expect.closeTo(v, 9)));
    }
  });
  it('tavla ayak izleri çakışmaz ve kat içinde kalır', () => {
    for (const a of tavla) {
      expect(a.z + TAVLA_YARI[1]).toBeLessThan(FLOOR_HALF);
      for (const b of tavla) {
        if (a === b || a.x !== b.x) continue;
        expect(Math.abs(a.z - b.z)).toBeGreaterThanOrEqual(2 * TAVLA_YARI[1]);
      }
    }
  });
});
