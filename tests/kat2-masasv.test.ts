/**
 * kat2-masasv.test.ts — S3 BEKÇİSİ: Kat 2 masa seviyesi (Sv1-5) mantığı.
 *
 * Varyant kapısı: kol değerleri config'te YOK (`Kat2Ayar.masaSv` opsiyonel, garson deseni). Bekçiler:
 *  - ayar yokken oyun bugünküyle BİREBİR (tick çıktısı aynı, tetik yok),
 *  - tetik = çizilen dikdörtgen (D-121): içi doldurur, bir milim dışı doldurmaz; Sv5'te tetik yok,
 *  - çerçeve masanın yanında, hiçbir masaya/oturağa/pad'e/öteki çerçeveye/yola değmez, yürüme alanında,
 *  - Sv çarpanları yalnız kendi masasına etki eder,
 *  - kayıt göçü: eski kayıt → bütün masalar Sv1, görev baştan (saveVersion artmaz).
 */
import { describe, it, expect } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { kat2SvAtla } from '../src/game/store';
import { defaultSave, kayitCoz, SAVE_VERSION } from '../src/game/save';
import {
  KAT2_GARSON_PAD,
  KAT2_LAVABO_PAD,
  KAT2_MASALAR,
  KAT2_SALON_PAD,
  KAT2_SV_MAX,
  KOVA,
  OCAKLAR,
  OKEY_YARI,
  TAVLA_YARI,
  VARIS,
  defaultKat2,
  kat2YurumeAlani,
  paraDusmeYeri,
} from '../src/game/kat';
import {
  kat2PadEtiket,
  kat2PadYeri,
  kat2SvTetikleri,
  kat2SvCanliTetik,
  kat2SvHedef,
  kat2Tick,
  masaSvOku,
  yeniKat2Dunya,
  type Kat2Ayar,
  type Kat2Dunya,
  type Kat2Girdi,
  type Kat2SvKol,
} from '../src/game/kat2Dongu';
import { padCercevesi } from '../src/game/markerFrame';
import { LAYOUT } from '../src/game/layout';
import type { Vec3 } from '../src/game/types';

const BIR = [1, 1, 1, 1, 1];
const kol = (o: Partial<Kat2SvKol> = {}): Kat2SvKol => ({
  fiyat: [0, 1_000, 2_000, 3_000, 4_000],
  ucretCarpan: BIR,
  kahveAralikCarpan: BIR,
  gelisAralikCarpan: BIR,
  ...o,
});
// Sv'siz taban: config'te D-195'ten beri `masaSv` var; "ayar yokken birebir" sözleşmesi onsuz ölçülür.
const { masaSv: _cfgSv, ...TEMEL0 } = C.kat2 as Kat2Ayar;
const TEMEL: Kat2Ayar = TEMEL0;
const SV: Kat2Ayar = { ...TEMEL, masaSv: { okey: kol(), tavla: kol({ fiyat: [0, 500, 1_000, 1_500, 2_000] }) } };
const HEPSI: string[] = [...C.kat2.hazir, ...TEMEL.padler.map((p) => p.id)];
const MASALAR = KAT2_MASALAR.map((m) => m.id);
const UZAK: [number, number] = [0, -1];

const girdi = (yer: [number, number], o: Partial<Kat2Girdi> = {}): Kat2Girdi => ({
  x: yer[0], z: yer[1], durdu: true, cuzdan: 0, padsDone: HEPSI, tepsiKap: 6, miknatis: 0.5, ...o,
});

/** Dikdörtgen [x0,x1]×[z0,z1]. */
type Kutu = [number, number, number, number];
const kutu = (x: number, z: number, hw: number, hh: number): Kutu => [x - hw, x + hw, z - hh, z + hh];
const kesisir = (a: Kutu, b: Kutu, pay = 0) => a[0] < b[1] + pay && b[0] < a[1] + pay && a[2] < b[3] + pay && b[2] < a[3] + pay;
const svKutu = (t: { x: number; z: number; w: number; d: number }): Kutu => kutu(t.x, t.z, t.w / 2, t.d / 2);

function surIz(ayar: Kat2Ayar, g: Kat2Girdi, sn: number): string {
  let d: Kat2Dunya = yeniKat2Dunya(g.padsDone, ayar);
  const parca: string[] = [];
  for (let t = 0; t < sn - 1e-9; t += 0.1) {
    const r = kat2Tick(d, g, 0.1, ayar);
    d = r.dunya;
    parca.push(`${r.kazanc}|${r.harcama}|${r.olay.dusen.join(',')}|${r.olay.istek}|${r.olay.kacan}`);
  }
  return parca.join(';') + JSON.stringify(d.masalar);
}

describe('Kat 2 masa Sv — ayar yokken birebir', () => {
  it('ayar.masaSv yokken tetik yok ve girdideki masaSv hiçbir şeyi değiştirmez', () => {
    expect(kat2SvTetikleri(TEMEL, HEPSI, {})).toEqual([]);
    const sv5 = Object.fromEntries(MASALAR.map((id) => [id, 5]));
    expect(surIz(TEMEL, girdi(UZAK, { masaSv: sv5 }), 900)).toBe(surIz(TEMEL, girdi(UZAK), 900));
  });

  it('Sv1 (çarpan 1) ile ayarsız oyun aynı parayı üretir', () => {
    expect(surIz(SV, girdi(UZAK), 900)).toBe(surIz(TEMEL, girdi(UZAK), 900));
  });
});

describe('Kat 2 masa Sv — tetik çerçevesi', () => {
  it('yalnız açık masalarda, Sv < 5 iken; fiyat bir sonraki seviyenin', () => {
    const acik = ['k2okey2', 'k2tavla1'];
    const t = kat2SvTetikleri(SV, acik, { k2tavla1: 3 });
    expect(t.map((x) => x.masaId)).toEqual(acik);
    expect(t[0]).toMatchObject({ id: 'sv:k2okey2', sv: 1, fiyat: 1_000, etiket: 'Sv 1' });
    expect(t[1]).toMatchObject({ id: 'sv:k2tavla1', sv: 3, fiyat: 1_500, etiket: 'Sv 3' });
    expect(kat2SvTetikleri(SV, acik, { k2okey2: KAT2_SV_MAX, k2tavla1: KAT2_SV_MAX })).toEqual([]);
    expect(kat2SvTetikleri(SV, acik, { k2okey2: 9 }).map((x) => x.masaId)).toEqual(['k2tavla1']); // taşan = Sv5
  });

  it('çerçeve hiçbir masaya, oturağa, pad\'e, yığına, öteki çerçeveye ve merdiven yoluna değmez; yürüme alanında', () => {
    const alan = kat2YurumeAlani(3);
    const padIdleri = [...new Set([...HEPSI, ...KAT2_SALON_PAD, KAT2_GARSON_PAD, KAT2_LAVABO_PAD, ...OCAKLAR.map((o) => o.id)])];
    const padKutu = padIdleri.map((id) => {
      const [x, z] = kat2PadYeri(id);
      const c = padCercevesi(kat2PadEtiket(id));
      return { id, k: kutu(x, z, c.hw, c.hh) };
    });
    for (let sv = 1; sv < KAT2_SV_MAX; sv++) {
      const tt = kat2SvTetikleri(SV, MASALAR, Object.fromEntries(MASALAR.map((id) => [id, sv])));
      expect(tt).toHaveLength(MASALAR.length);
      for (const t of tt) {
        const k = svKutu(t);
        const m = KAT2_MASALAR.find((x) => x.id === t.masaId)!;
        // Masanın yanında: z hizası aynı, kenar ayak izine 0,2 boşlukla, uzaklık ≤ 1 br.
        const yari = m.tur === 'tavla' ? TAVLA_YARI : [OKEY_YARI, OKEY_YARI];
        expect(t.z).toBe(m.z);
        const ic = Math.min(Math.abs(k[0] - m.x), Math.abs(k[1] - m.x));
        expect(ic - yari[0]).toBeCloseTo(0.2, 6);
        for (const o of KAT2_MASALAR) {
          const oy = o.tur === 'tavla' ? TAVLA_YARI : [OKEY_YARI, OKEY_YARI];
          expect(kesisir(k, kutu(o.x, o.z, oy[0], oy[1]), 0.15), `${t.id} × masa ${o.id}`).toBe(false);
          const [px, pz] = paraDusmeYeri(o);
          expect(px >= k[0] - 0.3 && px <= k[1] + 0.3 && pz >= k[2] - 0.3 && pz <= k[3] + 0.3, `${t.id} × yığın ${o.id}`).toBe(false);
        }
        for (const p of padKutu) expect(kesisir(k, p.k), `${t.id} × pad ${p.id}`).toBe(false);
        for (const o of tt) if (o !== t) expect(kesisir(k, svKutu(o), 0.3), `${t.id} × ${o.id}`).toBe(false);
        // Merdiven önü yol (kova genişliği) boş kalır.
        expect(k[1] <= KOVA.x0 || k[0] >= KOVA.x1, `${t.id} merdiven yolunda`).toBe(true);
        // Bütün çerçeve tek bir yürüme dikdörtgeninin içinde (duvara gömülmez, oyuncu her yerine basabilir).
        expect(alan.some((a) => k[0] >= a.x0 && k[1] <= a.x1 && k[2] >= a.z0 && k[3] <= a.z1), `${t.id} yürüme alanı dışında`).toBe(true);
        // Kendi alanında (kapalı salonun duvarı arkasında değil).
        expect(m.alan === 0 ? k[3] < 0 : k[2] > 0).toBe(true);
      }
    }
  });

  it('dolum = çizilen dikdörtgen: içinde durunca dolar, bir milim dışında dolmaz, yürürken dolmaz', () => {
    const t = kat2SvTetikleri(SV, HEPSI, {}).find((x) => x.masaId === 'k2okey2')!;
    const d0 = yeniKat2Dunya(HEPSI, SV);
    const kenar: [number, number][] = [
      [t.x + t.w / 2 - 1e-3, t.z],
      [t.x - t.w / 2 + 1e-3, t.z + t.d / 2 - 1e-3],
    ];
    for (const yer of kenar) expect(kat2Tick(d0, girdi(yer, { cuzdan: 1e6 }), 0.1, SV).harcama, `içi ${yer}`).toBeGreaterThan(0);
    const disi: [number, number][] = [
      [t.x + t.w / 2 + 1e-3, t.z],
      [t.x, t.z - t.d / 2 - 1e-3],
    ];
    for (const yer of disi) expect(kat2Tick(d0, girdi(yer, { cuzdan: 1e6 }), 0.1, SV).harcama, `dışı ${yer}`).toBe(0);
    expect(kat2Tick(d0, girdi([t.x, t.z], { cuzdan: 1e6, durdu: false }), 0.1, SV).harcama).toBe(0);
  });

  it('fiyat 3,5 sn\'de akar, dolunca svAtlayan; cüzdan yetmezse dolum yarım kalır ve korunur', () => {
    const t = kat2SvCanliTetik(SV, HEPSI, {})[0];
    let d = yeniKat2Dunya(HEPSI, SV);
    let harcama = 0;
    let atlayan: string[] = [];
    let sure = 0;
    for (; sure < 10 && !atlayan.length; sure += 0.1) {
      const r = kat2Tick(d, girdi([t.x, t.z], { cuzdan: 1e6 }), 0.1, SV);
      d = r.dunya;
      harcama += r.harcama;
      atlayan = r.olay.svAtlayan;
    }
    expect(atlayan).toEqual([t.masaId]);
    expect(harcama).toBeCloseTo(t.fiyat, 6);
    expect(sure).toBeCloseTo(3.5, 1);
    expect(d.padFill[t.id]).toBeUndefined();
    // Cüzdan 300: 300'de durur, çıkınca dolum kalır.
    d = yeniKat2Dunya(HEPSI, SV);
    let cuzdan = 300;
    for (let s = 0; s < 5; s += 0.1) {
      const r = kat2Tick(d, girdi([t.x, t.z], { cuzdan }), 0.1, SV);
      d = r.dunya;
      cuzdan -= r.harcama;
      expect(r.olay.svAtlayan).toEqual([]);
    }
    expect(cuzdan).toBeCloseTo(0, 6);
    d = kat2Tick(d, girdi(UZAK), 0.1, SV).dunya;
    expect(d.padFill[t.id]).toBeCloseTo(300, 6);
  });
});

describe('Kat 2 masa Sv — etkiler yalnız kendi masasında', () => {
  // Ocak kapalı (kahve yok): yığın = ücret × çarpan. Sv3 ücret ×2, geliş ×0,5.
  const AY: Kat2Ayar = {
    ...TEMEL,
    masaSv: { okey: kol({ ucretCarpan: [1, 1.5, 2, 2.5, 3], gelisAralikCarpan: [1, 0.75, 0.5, 0.5, 0.5] }), tavla: kol() },
  };
  const pads = ['k2okey1', 'k2okey2'];
  it('ücret çarpanı yığına, geliş çarpanı bir sonraki gruba', () => {
    let d = yeniKat2Dunya(pads, AY);
    const dusen: Record<string, number[]> = { k2okey1: [], k2okey2: [] };
    const gelis: Record<string, number[]> = { k2okey1: [], k2okey2: [] };
    let t = 0;
    for (; t < 600; t += 0.1) {
      const once = d.masalar.map((m) => m.durum);
      const r = kat2Tick(d, girdi(UZAK, { padsDone: pads, masaSv: { k2okey2: 3 } }), 0.1, AY);
      d = r.dunya;
      r.olay.kalkan.forEach((id, i) => dusen[id].push(r.olay.dusen[i]));
      d.masalar.forEach((m, i) => { if (once[i] === 'bos' && m.durum === 'geliyor' && m.id in gelis) gelis[m.id].push(t); });
    }
    expect(dusen.k2okey1.every((v) => v === TEMEL.masaUcreti)).toBe(true);
    expect(dusen.k2okey2.every((v) => v === TEMEL.masaUcreti * 2)).toBe(true);
    expect(dusen.k2okey2.length).toBeGreaterThan(0);
    // İkinci gelişe kadar geçen: Sv1 oturum + yürüme + geliş · Sv3 geliş yarıya iner (7,5 sn erken).
    const ara = (xs: number[]) => xs[1] - xs[0];
    expect(ara(gelis.k2okey1) - ara(gelis.k2okey2)).toBeCloseTo(TEMEL.gelisAralik * 0.5, 0);
  });

  it('kahve aralığı çarpanı isteği sıklaştırır', () => {
    const KA: Kat2Ayar = { ...TEMEL, masaSv: { okey: kol({ kahveAralikCarpan: [1, 1, 1, 1, 0.5] }), tavla: kol() } };
    const p = ['k2okey2', 'k2cezve'];
    const say = (sv: number) => {
      let d = yeniKat2Dunya(p, KA);
      let istek = 0;
      for (let t = 0; t < 400; t += 0.1) {
        const r = kat2Tick(d, girdi(UZAK, { padsDone: p, masaSv: { k2okey2: sv } }), 0.1, KA);
        d = r.dunya;
        istek += r.olay.istek;
      }
      return istek;
    };
    expect(say(5)).toBeGreaterThan(say(1) * 1.3);
  });
});

describe('Kat 2 masa Sv — store + kayıt', () => {
  it('kat2SvAtla bir artırır, tavanı aşmaz', () => {
    expect(kat2SvAtla(undefined, ['a'])).toEqual({ a: 2 });
    expect(kat2SvAtla({ a: 4, b: 5 }, ['a', 'b'])).toEqual({ a: 5, b: 5 });
    expect(kat2SvAtla({ a: 2 }, ['a', 'a'])).toEqual({ a: 4 });
  });

  it('eski kayıt (masaSv/gorev yok) → bütün masalar Sv1, görev baştan; saveVersion artmadı', () => {
    const eski = { ...defaultSave(), kat2: { acik: true, padsDone: ['k2okey2'] } } as unknown as Record<string, unknown>;
    const { data, red } = kayitCoz(eski);
    expect(red).toEqual([]);
    expect(data.saveVersion).toBe(SAVE_VERSION);
    expect(data.kat2.masaSv).toEqual({});
    expect(data.kat2.gorev).toEqual({ idx: 0, sayac: {} });
    expect(masaSvOku(data.kat2.masaSv, 'k2okey2')).toBe(1);
    expect(defaultKat2()).toEqual({ acik: false, padsDone: [], masaSv: {}, gorev: { idx: 0, sayac: {} } });
  });

  it('bozuk Sv düşer, taşan kırpılır; görev sayaçları korunur', () => {
    const ham = {
      ...defaultSave(),
      kat2: { acik: true, padsDone: [], masaSv: { a: 3, b: 'x', c: -2, d: 9, e: 2.7, f: 1 }, gorev: { idx: 4, sayac: { servis: 12, bozuk: 'x' } } },
    } as unknown as Record<string, unknown>;
    const { data } = kayitCoz(ham);
    expect(data.kat2.masaSv).toEqual({ a: 3, d: KAT2_SV_MAX, e: 2 });
    expect(data.kat2.gorev).toEqual({ idx: 4, sayac: { servis: 12 } });
    expect(kayitCoz({ ...defaultSave(), kat2: { acik: true, padsDone: [], gorev: 7 } } as unknown as Record<string, unknown>).data.kat2.gorev).toEqual({ idx: 0, sayac: {} });
  });

  it('store: masaSv kayda yazılır ve geri yüklenir; Kat 2 tick\'i (ayarsız config) Sv\'ye dokunmaz', () => {
    const g = globalThis as Record<string, unknown>;
    const mem: Record<string, string> = {};
    const orig = g.localStorage;
    g.localStorage = { getItem: (k: string) => (k in mem ? mem[k] : null), setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
    try {
      useGame.getState().hardReset();
      useGame.getState().kat2Ac();
      const k2 = useGame.getState().kat2;
      useGame.setState({ kat: 2, kat2: { ...k2, masaSv: { k2okey2: 3 } }, kat2Dunya: yeniKat2Dunya(k2.padsDone, TEMEL), player: [...VARIS[2]] as Vec3 });
      for (let i = 0; i < 20; i++) useGame.getState().tick(0.1);
      expect(useGame.getState().kat2.masaSv).toEqual({ k2okey2: 3 });
      useGame.getState().saveNow();
      useGame.getState().init();
      expect(useGame.getState().kat2.masaSv).toEqual({ k2okey2: 3 });
    } finally {
      if (orig === undefined) delete g.localStorage;
      else g.localStorage = orig;
    }
  });
});

// LAYOUT kullanımı: oyuncu gövdesi çerçeveye sığar (merkezde durunca hiçbir katıya değmez).
describe('Kat 2 masa Sv — erişim', () => {
  it('çerçevenin merkezi oyuncu gövdesine yer bırakır (masaya en az gövde yarıçapı)', () => {
    for (const t of kat2SvTetikleri(SV, MASALAR, {})) {
      const m = KAT2_MASALAR.find((x) => x.id === t.masaId)!;
      const yari = m.tur === 'tavla' ? TAVLA_YARI[0] : OKEY_YARI;
      expect(Math.abs(t.x - m.x) - yari).toBeGreaterThan(LAYOUT.playerRadius);
    }
  });
});

// S3b / D-195: Kat 1'in kuralları Kat 2'de AYNI (kullanıcı: "kat 2 sistemi ile kat 1 sistemi aynı olacak").
describe('Kat 2 masa Sv — Kat 1 kuralı: tek hedef (D-124) + görev kapısı (D-142)', () => {
  const acikMasalar = HEPSI.filter((id) => MASALAR.includes(id));
  it('aynı anda tek nokta; el değmemişse açılış sırasındaki ilk masa', () => {
    const c = kat2SvCanliTetik(SV, HEPSI, {});
    expect(c.length).toBe(1);
    expect(c[0].masaId).toBe(acikMasalar[0]);
  });
  it('"başladığını bitir": yarım kalan masa (1 < Sv < 5) önce gelir, tavandakiler atlanır', () => {
    const ikinci = acikMasalar[3];
    expect(kat2SvHedef(SV, HEPSI, { [ikinci]: 3 })).toBe(ikinci);
    expect(kat2SvHedef(SV, HEPSI, { [acikMasalar[0]]: 5 })).toBe(acikMasalar[1]);
    const hepsi5 = Object.fromEntries(acikMasalar.map((id) => [id, 5]));
    expect(kat2SvHedef(SV, HEPSI, hepsi5)).toBeNull();
  });
  it('tick yalnız canlı noktayı doldurur: hedef olmayan masanın çerçevesinde durmak para harcamaz', () => {
    const baska = kat2SvTetikleri(SV, HEPSI, {}).find((t) => t.masaId !== acikMasalar[0])!;
    let d = yeniKat2Dunya(HEPSI, SV);
    let harcama = 0;
    for (let i = 0; i < 50; i++) {
      const r = kat2Tick(d, girdi([baska.x, baska.z], { cuzdan: 1e6 }), 0.1, SV);
      d = r.dunya;
      harcama += r.harcama;
    }
    expect(harcama).toBe(0);
  });
  it('görev kapısı kapalıyken (svCanli false) hiçbir nokta dolmaz', () => {
    const t = kat2SvCanliTetik(SV, HEPSI, {})[0];
    let d = yeniKat2Dunya(HEPSI, SV);
    let harcama = 0;
    for (let i = 0; i < 50; i++) {
      const r = kat2Tick(d, girdi([t.x, t.z], { cuzdan: 1e6, svCanli: false }), 0.1, SV);
      d = r.dunya;
      harcama += r.harcama;
    }
    expect(harcama).toBe(0);
    expect(kat2SvCanliTetik(SV, HEPSI, {}, false)).toEqual([]);
  });
});

describe('Kat 2 masa Sv — config = karar (D-195, kol UG/SB3T)', () => {
  it('config değerleri aracın UG/SB3T çıktısıyla aynı', () => {
    const k = (C.kat2 as Kat2Ayar).masaSv!;
    expect(k.okey.fiyat).toEqual([0, 4_300, 5_300, 6_300, 7_300]);
    expect(k.tavla.fiyat).toEqual([0, 2_300, 2_800, 3_300, 3_800]);
    expect(k.okey.ucretCarpan).toEqual([1, 1.634, 2.243, 2.843, 3.443]);
    expect(k.tavla.ucretCarpan).toEqual([1, 1.313, 1.607, 1.895, 2.183]);
    for (const t of [k.okey, k.tavla]) {
      expect(t.gelisAralikCarpan).toEqual([1, 0.75, 0.5, 0.3, 0.15]);
      expect(t.kahveAralikCarpan).toEqual([1, 1, 1, 1, 1]); // kahve kolu ölçümde %2 — bilerek yok
    }
  });
});
