/**
 * kat2-dongu.test.ts — K2-3 BEKÇİSİ: Kat 2'nin okey + Türk kahvesi döngüsü (D-184).
 *
 * Kat 2'nin vaadi "seyrek ama büyük para": dörtlü grup 3 dk oynar, 25 sn'de bir 2 kahve ister,
 * kalkarken masa ücreti + servis edilen kahvenin parası TEK yığın düşer. Kahve kaçarsa ceza yok,
 * yalnız o kahvenin parası yok. Pad'ler tek hat: önceki bitmeden sonraki dolmaz.
 */
import { describe, it, expect } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { OCAK, OKEY_ERISIM, OKEY_YER, OKEY_YARI, PARA_DUSME_DZ, VARIS, kat2Adim, kat2Engeller } from '../src/game/kat';
import {
  kat2PadEtiket,
  kat2PadYeri,
  kat2SiradakiPad,
  kat2Tick,
  yeniKat2Dunya,
  type Kat2Ayar,
  type Kat2Dunya,
  type Kat2Girdi,
} from '../src/game/kat2Dongu';
import Decimal from 'break_infinity.js';
import type { Vec3 } from '../src/game/types';

const A: Kat2Ayar = C.kat2;

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
/** Merdiven salonunun zinciri (4 okey + ocak): K2-3'ün dünyası, okey davranışının bekçisi. */
const HEPSI = A.padler.slice(0, 5).map((p) => p.id);
const M1 = OKEY_YER[0];
const MASA_ONU: [number, number] = [M1.x, M1.z + OKEY_ERISIM - 0.2];
const UZAK: [number, number] = [0, -1]; // hiçbir masaya/ocağa/pada yetişmez

function girdi(yer: [number, number], o: Partial<Kat2Girdi> = {}): Kat2Girdi {
  return { x: yer[0], z: yer[1], durdu: true, cuzdan: 0, padsDone: HEPSI, tepsiKap: 6, miknatis: 0.5, ...o };
}

/** `sn` saniye ilerletir; toplamları döndürür. */
function sur(d: Kat2Dunya, sn: number, g: Kat2Girdi, dt = 0.1) {
  const top = { kazanc: 0, servis: 0, kacan: 0, istek: 0, dusen: [] as number[] };
  for (let t = 0; t < sn - 1e-9; t += dt) {
    const r = kat2Tick(d, g, dt, A);
    d = r.dunya;
    top.kazanc += r.kazanc;
    top.servis += r.olay.servis;
    top.kacan += r.olay.kacan;
    top.istek += r.olay.istek;
    top.dusen.push(...r.olay.dusen);
  }
  return { d, ...top };
}

describe('config — D-184 kolu V4 (3 dk oyun · 25 sn\'de 2 kahve · gelirin %60\'ı kahve)', () => {
  it('seçilen kolun sayıları', () => {
    expect([A.oturum, A.kahveAralik, A.istekAdet, A.kahveFiyat, A.masaUcreti]).toEqual([180, 25, 2, 9, 72]);
    expect([A.gelisAralik, A.yurume, A.kahveSabir, A.demleme, A.ocakKuyruk]).toEqual([15, 5, 25, 4, 4]);
  });

  it('zincir (D-186): ilk masa ocaktan önce → 3 masa → okey salonu → 2 masa → 2. ocak → 4 masa → tavla köşesi → garson → 12 tavla', () => {
    expect(HEPSI).toEqual(['k2okey1', 'k2cezve', 'k2okey2', 'k2okey3', 'k2okey4']);
    expect(A.padler.map((p) => p.id)).toEqual([
      ...HEPSI,
      'k2salon2', 'k2s2okey1', 'k2s2okey2', 'k2cezve2', 'k2s2okey3', 'k2s2okey4', 'k2s2okey5', 'k2s2okey6',
      'k2salon3', 'k2garson', ...Array.from({ length: 12 }, (_, i) => `k2tavla${i + 1}`),
    ]);
    for (let i = 1; i < A.padler.length; i++) expect(A.padler[i].cost).toBeGreaterThan(A.padler[i - 1].cost);
    for (const p of A.padler) {
      expect(p.cost).toBeGreaterThan(0);
      expect(p.cost / p.fillRate).toBeLessThanOrEqual(3.6); // Kat 1'in dolum tavanı
      expect(kat2PadYeri(p.id)).toHaveLength(2);
    }
  });
});

describe('okey masası döngüsü', () => {
  it('grup gelir, oturur, 3 dk oynar, kalkınca masa önüne yığın düşer', () => {
    let d = yeniKat2Dunya(['k2okey1'], A);
    expect(d.masalar[0].durum).toBe('bos');
    expect(d.masalar[1].durum).toBe('kapali');
    let r = sur(d, A.gelisAralik + 0.05, girdi(UZAK, { padsDone: ['k2okey1'] }));
    expect(r.d.masalar[0].durum).toBe('geliyor');
    r = sur(r.d, A.yurume, girdi(UZAK, { padsDone: ['k2okey1'] }));
    expect(r.d.masalar[0].durum).toBe('oyunda');
    d = r.d;
    r = sur(d, A.oturum - 1, girdi(UZAK, { padsDone: ['k2okey1'] }));
    expect(r.dusen).toEqual([]);
    r = sur(r.d, 1.2, girdi(UZAK, { padsDone: ['k2okey1'] }));
    // Ocak kapalı: kahve istenmedi → yığın yalnız masa ücreti.
    expect(r.istek).toBe(0);
    expect(r.dusen).toEqual([A.masaUcreti]);
    expect(r.d.paralar[0]).toMatchObject({ x: M1.x, z: M1.z + PARA_DUSME_DZ, miktar: A.masaUcreti });
    expect(r.d.masalar[0].durum).toBe('bos');
  });

  it('ocak açıkken 25 sn\'de bir 2 fincan istenir; servis edilen her fincan yığına 9 ₺ ekler', () => {
    let d = yeniKat2Dunya(HEPSI, A);
    d = sur(d, A.gelisAralik + A.yurume + 0.1, girdi(UZAK)).d;
    expect(d.masalar[0].durum).toBe('oyunda');
    const r = sur(d, A.kahveAralik + 0.2, girdi(UZAK));
    expect(r.istek).toBe(A.istekAdet * 4); // dört masa aynı anda açık başladı
    expect(r.d.masalar[0].istek).toBe(A.istekAdet);
    // Tepside 2 kahveyle masanın önüne gel → servis.
    const s = kat2Tick({ ...r.d, tepsi: 2 }, girdi(MASA_ONU), 0.1, A);
    expect(s.olay.servis).toBe(2);
    expect(s.dunya.tepsi).toBe(0);
    expect(s.dunya.masalar[0].istek).toBe(0);
    expect(s.dunya.masalar[0].birikim).toBe(2 * A.kahveFiyat);
  });

  it('getirilmeyen kahve 25 sn sonra sessizce düşer (ceza yok, yalnız parası yok)', () => {
    let d = yeniKat2Dunya(['k2okey1', 'k2cezve'], A);
    d = sur(d, A.gelisAralik + A.yurume + A.kahveAralik + 0.3, girdi(UZAK, { padsDone: ['k2okey1', 'k2cezve'] })).d;
    expect(d.masalar[0].istek).toBe(2);
    const r = sur(d, A.kahveSabir + 0.2, girdi(UZAK, { padsDone: ['k2okey1', 'k2cezve'] }));
    expect(r.kacan).toBe(2);
    expect(r.d.masalar[0].istek).toBe(0);
    expect(r.d.masalar[0].birikim).toBe(0);
  });

  it('tam oturum: hep servis edilirse yığın = ücret + servis × fiyat (korunum)', () => {
    let d = yeniKat2Dunya(['k2okey1', 'k2cezve'], A);
    const pd = { padsDone: ['k2okey1', 'k2cezve'] };
    let servis = 0;
    const dusen: number[] = [];
    for (let t = 0; t < A.gelisAralik + A.yurume + A.oturum + 1; t += 0.1) {
      // Hile oyuncu: tepsi hep dolu, masanın önünde.
      const r = kat2Tick({ ...d, tepsi: 6 }, girdi(MASA_ONU, pd), 0.1, A);
      d = r.dunya;
      servis += r.olay.servis;
      dusen.push(...r.olay.dusen);
    }
    expect(dusen).toHaveLength(1);
    expect(servis).toBeGreaterThanOrEqual(12); // ~6 istek × 2 fincan
    expect(dusen[0]).toBe(A.masaUcreti + servis * A.kahveFiyat);
  });
});

describe('cezve ocağı + tepsi', () => {
  it('ocak 4 sn\'de bir fincan pişirir, 4\'te durur; önünde durunca tepsi kapasitesi kadar alınır', () => {
    let d = yeniKat2Dunya(HEPSI, A);
    d = sur(d, A.demleme * 2 + 0.05, girdi(UZAK)).d;
    expect(d.ocaklar[0].hazir).toBe(2);
    expect(d.ocaklar[1].hazir).toBe(0); // 2. ocak bu zincirde kapalı
    d = sur(d, 60, girdi(UZAK)).d;
    expect(d.ocaklar[0].hazir).toBe(A.ocakKuyruk);
    const r = kat2Tick(d, girdi(OCAK.al, { tepsiKap: 3 }), 0.1, A);
    expect(r.dunya.tepsi).toBe(3);
    expect(r.dunya.ocaklar[0].hazir).toBe(A.ocakKuyruk - 3);
  });

  it('ocak açılmadan kahve pişmez ve istenmez', () => {
    const pd = { padsDone: ['k2okey1'] };
    const r = sur(yeniKat2Dunya(['k2okey1'], A), 120, girdi(OCAK.al, pd));
    expect(r.d.ocaklar.map((o) => o.hazir)).toEqual([0, 0]);
    expect(r.d.tepsi).toBe(0);
    expect(r.istek).toBe(0);
  });
});

describe('para yığını', () => {
  it('mıknatıs yarıçapına girince toplanır, dışında yerde kalır', () => {
    const d: Kat2Dunya = { ...yeniKat2Dunya(HEPSI, A), paralar: [{ id: 1, x: 0, z: -3, miktar: 180 }] };
    expect(kat2Tick(d, girdi([0, -6], { miknatis: 2.6 }), 0.1, A).kazanc).toBe(0);
    const r = kat2Tick(d, girdi([0, -5], { miknatis: 2.6 }), 0.1, A);
    expect(r.kazanc).toBe(180);
    expect(r.dunya.paralar).toHaveLength(0);
  });
});

describe('pad zinciri', () => {
  const ilk = A.padler[0];
  const yer = kat2PadYeri(ilk.id);

  it('yalnız SIRADAKİ pad dolar; durunca dolar, yürürken dolmaz', () => {
    const d = yeniKat2Dunya([], A);
    expect(kat2SiradakiPad(A, [])?.id).toBe('k2okey1');
    const yururken = kat2Tick(d, girdi(yer, { padsDone: [], cuzdan: 10_000, durdu: false }), 0.5, A);
    expect(yururken.harcama).toBe(0);
    // Ocak pad'inin yerinde durmak (sıra gelmemişken) hiçbir şey doldurmaz.
    expect(kat2Tick(d, girdi(OCAK.al, { padsDone: [], cuzdan: 10_000 }), 0.5, A).harcama).toBe(0);
    const r = kat2Tick(d, girdi(yer, { padsDone: [], cuzdan: 10_000 }), 0.5, A);
    expect(r.harcama).toBeCloseTo(ilk.fillRate * 0.5);
    expect(r.dunya.padFill[ilk.id]).toBeCloseTo(ilk.fillRate * 0.5);
  });

  it('cüzdan kadar dolar; bitince masa açılır ve zincir ilerler', () => {
    let d = yeniKat2Dunya([], A);
    let pd: string[] = [];
    let harcanan = 0;
    let bitti: string | null = null;
    for (let t = 0; t < 10 && !bitti; t += 0.1) {
      const r = kat2Tick(d, girdi(yer, { padsDone: pd, cuzdan: 1e9 }), 0.1, A);
      d = r.dunya;
      pd = r.padsDone;
      harcanan += r.harcama;
      bitti = r.olay.padBitti;
    }
    expect(bitti).toBe('k2okey1');
    expect(harcanan).toBeCloseTo(ilk.cost);
    expect(pd).toEqual(['k2okey1']);
    expect(d.masalar[0].durum).toBe('bos');
    expect(kat2SiradakiPad(A, pd)?.id).toBe('k2cezve');
    // Yetmeyen cüzdan: ancak cüzdan kadar.
    const az = kat2Tick(yeniKat2Dunya(pd, A), girdi(OCAK.al, { padsDone: pd, cuzdan: 30 }), 1, A);
    expect(az.harcama).toBe(30);
  });

  it('pad çerçevesi etiketten (Kat 1\'in dili): etiket iki pad türünde farklı', () => {
    expect(kat2PadEtiket('k2cezve')).not.toBe(kat2PadEtiket('k2okey1'));
  });
});

describe('Kat 2 yürüyüşü — açık masa katıdır', () => {
  it('açık masanın içinden geçilmez, kapalı masanın yerinden geçilir', () => {
    const bas: [number, number] = [M1.x - OKEY_YARI - 1, M1.z];
    let p = bas;
    for (let i = 0; i < 40; i++) p = kat2Adim(p[0], p[1], 0.1, 0, undefined, kat2Engeller(['k2okey1']));
    expect(p[0]).toBeLessThan(M1.x - OKEY_YARI);
    p = bas;
    for (let i = 0; i < 40; i++) p = kat2Adim(p[0], p[1], 0.1, 0, undefined, kat2Engeller([]));
    expect(p[0]).toBeGreaterThan(M1.x + OKEY_YARI);
  });
});

describe('store — Kat 2 döngüsü oyunun cüzdanına bağlı', () => {
  function kat2de(padsDone: string[], wallet: number): void {
    useGame.getState().hardReset();
    useGame.getState().kat2Ac();
    useGame.setState({
      kat: 2,
      kat2: { acik: true, padsDone },
      kat2Dunya: yeniKat2Dunya(padsDone, A),
      wallet: new Decimal(wallet),
      player: [...VARIS[2]] as Vec3,
    });
  }

  it('Kat 2\'de pad\'de durunca cüzdandan dolar, bitince kayda girer', () => withStorage(() => {
    kat2de([], 10_000);
    const [x, z] = kat2PadYeri('k2okey1');
    useGame.setState({ player: [x, 0.6, z] as Vec3 });
    const l0 = useGame.getState().lifetime;
    const w0 = useGame.getState().wallet;
    for (let t = 0; t < 5; t += 0.1) useGame.getState().tick(0.1);
    const s = useGame.getState();
    expect(s.kat2.padsDone).toEqual(['k2okey1']);
    expect(s.kat2Dunya.masalar[0].durum).toBe('bos');
    // Kat 1 arkada kazanmış olabilir: harcanan = cüzdan farkı + o arada kazanılan (ömür boyu farkı).
    const harcanan = w0.sub(s.wallet).add(s.lifetime.sub(l0)).toNumber();
    expect(harcanan).toBeCloseTo(A.padler[0].cost, 0);
    s.saveNow();
    s.init();
    expect(useGame.getState().kat2.padsDone).toEqual(['k2okey1']);
    expect(useGame.getState().kat2Dunya.masalar[0].durum).toBe('bos');
  }));

  it('Kat 2\'deki yığın toplanınca cüzdana ve ömür boyu kazanca girer', () => {
    kat2de(HEPSI, 0);
    const [x, z] = [VARIS[2][0], VARIS[2][2]];
    useGame.setState({ kat2Dunya: { ...yeniKat2Dunya(HEPSI, A), paralar: [{ id: 7, x, z: z + 0.5, miktar: 180 }] } });
    const w0 = useGame.getState().wallet;
    const l0 = useGame.getState().lifetime;
    useGame.getState().tick(0.05);
    const s = useGame.getState();
    expect(s.kat2Dunya.paralar).toHaveLength(0);
    expect(s.wallet.sub(w0).toNumber()).toBeGreaterThanOrEqual(180);
    expect(s.lifetime.sub(l0).toNumber()).toBeGreaterThanOrEqual(180);
  });

  it('Kat 1\'deyken Kat 2 dünyası da işler (D-185): masalar oynar', () => {
    kat2de(HEPSI, 0);
    useGame.setState({ kat: 1 });
    const d0 = useGame.getState().kat2Dunya;
    for (let t = 0; t < 30; t += 0.1) useGame.getState().tick(0.1);
    const d = useGame.getState().kat2Dunya;
    expect(d).not.toBe(d0);
    expect(d.masalar.some((m) => m.durum === 'geliyor' || m.durum === 'oyunda')).toBe(true);
  });
});
