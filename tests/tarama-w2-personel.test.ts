/**
 * Tarama 2026-11-18 W2 bekçileri (Kat 2):
 *  #1 personel her masaya ulaşır — tek garson her masaya kahveyi, tek bulaşıkçı her masanın kirlisini ≤ 30 sn'de götürür/alır.
 *  #4 yığın listesi sınırlı — kalkış parası aynı noktadaki yığına eklenir (nokta başına tek yığın).
 *  #11 tavla yığını yürünen yerde — oyuncu yığının üstüne yürüyebilir.
 *  oynanış #5 tek tepsi — Kat 1'de taşınan + Kat 2'de taşınan ≤ kapasite.
 */
import { describe, expect, it } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { KAT2_MASALAR, OCAK, kat2Adim, kat2YolAgi, masaErisimde, paraDusmeYeri } from '../src/game/kat';
import { kat2Tick, kat2TepsiBos, kat2TepsiBosalt, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya, type Kat2Girdi } from '../src/game/kat2Dongu';

const A = C.kat2 as unknown as Kat2Ayar;
const HEPSI = [...C.kat2.hazir, ...A.padler.map((p) => p.id)];
const UZAK = { x: 0, z: -1 };
const girdi = (pd: readonly string[], ek: Partial<Kat2Girdi> = {}): Kat2Girdi => ({ ...UZAK, durdu: true, cuzdan: 0, padsDone: pd, tepsiKap: 6, miknatis: 0.5, ...ek });

describe('W2 #1 — tek garson / tek bulaşıkçı her Kat 2 masasına ≤ 30 sn', () => {
  const tekGarson = HEPSI.filter((p) => p !== 'k2garson2' && p !== 'k2garson3' && p !== 'k2bulasikci');
  for (const m of KAT2_MASALAR) {
    it(`garson → ${m.id}`, () => {
      let d: Kat2Dunya = yeniKat2Dunya(tekGarson, A);
      d = {
        ...d,
        garson: { ...d.garson!, tepsi: 1 },
        masalar: d.masalar.map((x) => ({ ...x, durum: x.id === m.id ? ('oyunda' as const) : ('kapali' as const), t: 1e6, istek: x.id === m.id ? 1 : 0, sabir: 1e6, kahveT: 1e6 })),
      };
      let t = 0;
      for (; t <= 30; t += 0.1) {
        const r = kat2Tick(d, girdi(tekGarson), 0.1, A);
        d = r.dunya;
        if (r.olay.garsonServis > 0) break;
      }
      expect(t, `${m.id}: garson @${d.garson!.x.toFixed(2)},${d.garson!.z.toFixed(2)}`).toBeLessThanOrEqual(30);
    });
    it(`bulaşıkçı → ${m.id}`, () => {
      const pd = HEPSI.filter((p) => !p.startsWith('k2garson'));
      let d: Kat2Dunya = yeniKat2Dunya(pd, A);
      d = { ...d, masalar: d.masalar.map((x) => ({ ...x, durum: 'kapali' as const, kirli: x.id === m.id ? 1 : 0 })) };
      let t = 0;
      for (; t <= 30; t += 0.1) {
        d = kat2Tick(d, girdi(pd), 0.1, A).dunya;
        if ((d.masalar.find((x) => x.id === m.id)!.kirli ?? 0) === 0) break;
      }
      expect(t, `${m.id}: bulaşıkçı @${d.bulasikci!.x.toFixed(2)},${d.bulasikci!.z.toFixed(2)}`).toBeLessThanOrEqual(30);
    });
  }

  it('yaklaşma noktası her masanın erişiminde ve ocaktan yürünerek varılır', () => {
    const ag = kat2YolAgi(HEPSI);
    for (const m of KAT2_MASALAR) {
      const [x, z] = ag.masaNoktasi(m);
      expect(masaErisimde(m, x, z), m.id).toBe(true);
      expect(ag.uzunluk(OCAK.al[0], OCAK.al[1], x, z), m.id).toBeLessThan(60);
    }
  });
});

describe('W2 #4 / #11 — para yığınları', () => {
  it('oyuncusuz 1 sa: yığın sayısı ≤ farklı nokta sayısı (masa + lavabo), para kaybolmaz', () => {
    let d = yeniKat2Dunya(HEPSI, A);
    let dusen = 0;
    let lavabo = 0;
    for (let i = 0; i < 36_000; i++) {
      const r = kat2Tick(d, { ...girdi(HEPSI), x: 400, z: 400 }, 0.1, A);
      d = r.dunya;
      dusen += r.olay.dusen.reduce((a, b) => a + b, 0);
      lavabo += r.olay.lavabo;
    }
    const noktalar = new Set(d.paralar.map((p) => `${p.x},${p.z}`));
    expect(d.paralar.length).toBe(noktalar.size);
    expect(d.paralar.length).toBeLessThanOrEqual(KAT2_MASALAR.length + 1);
    expect(d.paralar.reduce((a, p) => a + p.miktar, 0)).toBeCloseTo(dusen + lavabo, 6);
  }, 60_000);

  it('her tavla yığınının üstüne oyuncu yürüyebilir (sıra arasına düşmez)', () => {
    const ag = kat2YolAgi(HEPSI);
    for (const m of KAT2_MASALAR.filter((x) => x.tur === 'tavla')) {
      const [tx, tz] = paraDusmeYeri(m);
      let x = OCAK.al[0];
      let z = OCAK.al[1];
      for (let k = 0; k < 4000; k++) {
        const [wx, wz] = ag.nokta(x, z, tx, tz);
        const L = Math.hypot(wx - x, wz - z);
        if (L < 1e-3) break;
        const s = Math.min(0.05, L) / L;
        [x, z] = kat2Adim(x, z, (wx - x) * s, (wz - z) * s, ag.acikAlan, ag.engeller);
      }
      expect(Math.hypot(x - tx, z - tz), m.id).toBeLessThan(0.3);
    }
  });
});

describe('W2 oynanış #5 — tek tepsi (Kat 1 + Kat 2 ≤ kapasite)', () => {
  const pd = [...C.kat2.hazir];
  const ocakta = (d: Kat2Dunya, ek: Partial<Kat2Girdi>) =>
    kat2Tick({ ...d, ocaklar: d.ocaklar.map((o) => ({ ...o, hazir: 6 })) }, girdi(pd, { x: OCAK.al[0], z: OCAK.al[1], tepsiKap: 4, ...ek }), 0.1, A).dunya;

  it('Kat 1 tepsisi doluyken Kat 2 ocağından kahve alınmaz; kısmen doluyken kalan kadar', () => {
    const d = yeniKat2Dunya(pd, A);
    expect(ocakta(d, { digerTepsi: 4 }).tepsi).toBe(0);
    expect(ocakta(d, { digerTepsi: 1 }).tepsi).toBe(3);
    expect(ocakta(d, {}).tepsi).toBe(4);
  });

  it('Kat 1 tepsisi doluyken Kat 2 masasından kirli alınmaz', () => {
    const m = KAT2_MASALAR.find((x) => pd.includes(x.id))!;
    let d = yeniKat2Dunya(pd, A);
    d = { ...d, masalar: d.masalar.map((x) => ({ ...x, durum: 'kapali' as const, kirli: x.id === m.id ? 3 : 0 })) };
    const yanina = { x: m.x, z: m.z + 1.6, tepsiKap: 4 };
    expect(kat2Tick(d, girdi(pd, { ...yanina, digerTepsi: 4 }), 0.1, A).dunya.tepsiKirli ?? 0).toBe(0);
    expect(kat2Tick(d, girdi(pd, { ...yanina, digerTepsi: 2 }), 0.1, A).dunya.tepsiKirli).toBe(2);
  });

  it('yardımcılar: boş yer ≥ 0; boşaltınca kahve temiz havuza döner', () => {
    expect(kat2TepsiBos(4, 3, { tepsi: 2, tepsiKirli: 0 })).toBe(0);
    expect(kat2TepsiBos(6, 1, { tepsi: 2, tepsiKirli: 1 })).toBe(2);
    const d = { ...yeniKat2Dunya(pd, A), tepsi: 3, temiz: 5 };
    expect(kat2TepsiBosalt(d)).toMatchObject({ tepsi: 0, temiz: 8 });
  });
});
