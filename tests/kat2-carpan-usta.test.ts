/**
 * kat2-carpan-usta.test.ts — D-206 BEKÇİSİ (kullanıcı 2026-11-19: K2-CARPAN + U-ESIT + B-UCLU; rapor
 * `docs/kat2-carpan-usta-raporu.md`, araç `tools/olcum-kat2-carpan-usta.ts`).
 *
 *  - K2-CARPAN: koleksiyon çarpanı Kat 2'de düşen HER yığına (ücret + kahve + lavabo) biner; görev ödülüne binmez;
 *    store iki `kat2Tick` çağrısında da (Kat 2'de + arka planda) verir; çevrimdışı `kat2Oran` × mult.
 *  - U-ESIT: Usta yalnız açık + Sv5 Kat 2 masasında (`k2:<masaId>`), 25 💎 ya da günün reklam hakkı; Usta masanın
 *    yığını (ücret + kahve) × `kat2UstaCarpan()` (Kat 1 Usta'nın tavandaki masaya kattığı yüzde), lavabo hariç.
 *    Çevrimdışı oran Usta'yı GÖRMEZ (Kat 1'inki de görmüyor — aynı kural).
 *  - B-UCLU: görev hattı raporun bölmesi; ödül %15/50 kuralı.
 *  - Kayıt: D-206 öncesi görev kaydı (`son` yok) kimlikle yeni hatta oturur — ilerleme kaybolmaz, ödül çift ödenmez.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { economyConfig as C, PRODUCTS, tableTip } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { defaultSave, kayitCoz, kayitMetni } from '../src/game/save';
import { KAT2_LAVABO_YER, KAT2_MASALAR, KAT2_SV_MAX, VARIS, paraDusmeYeri } from '../src/game/kat';
import { kat2Tick, kat2UstaNoktalari, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya, type Kat2Girdi } from '../src/game/kat2Dongu';
import { KAT2_GOREV_SIRA_D205, kat2GorevHatasi, kat2GorevKaydiCoz, kat2GorevKaydiYaz, kat2Gorevleri, type Kat2GorevDef } from '../src/game/kat2Gorev';
import { kat2Oran, kat2UstaCarpan, offlineEarnedSplit, stationSoftMaxLevel, tableSoftMaxLevel } from '../src/game/rules';
import { tostShare } from '../src/game/world';
import { D } from '../src/game/decimal';
import { collectionMult } from '../src/game/goals';
import type { Vec3 } from '../src/game/types';
import { S5_EKLENEN, S5_ONCEKI_ODUL, S5_PARCA } from './s5-gorev-bolme';

const AYAR = C.kat2 as unknown as Kat2Ayar;
const G = C.kat2Gorevler as readonly Kat2GorevDef[];
const HAT = kat2Gorevleri(G, AYAR);
const HEPSI: string[] = [...new Set([...C.kat2.hazir, ...AYAR.padler.map((p) => p.id)])];
const UZAK: [number, number] = [0, -1];
const girdi = (o: Partial<Kat2Girdi> = {}): Kat2Girdi => ({ x: UZAK[0], z: UZAK[1], durdu: true, cuzdan: 0, padsDone: HEPSI, tepsiKap: 6, miknatis: 0, ...o });
const anahtar = (x: number, z: number) => `${x},${z}`;

/** Oyuncu uzakta (toplamaz) N sn: her adımın `dusen`/`kalkis`/`lavabo`su + sondaki yığınlar (yer → tutar). */
function sur(o: Partial<Kat2Girdi>, sn = 900) {
  let d: Kat2Dunya = yeniKat2Dunya(HEPSI, AYAR);
  const adim: { dusen: number[]; kalkis: number; lavabo: number }[] = [];
  for (let t = 0; t < sn - 1e-9; t += 0.1) {
    const r = kat2Tick(d, girdi(o), 0.1, AYAR);
    d = r.dunya;
    adim.push({ dusen: [...r.olay.dusen], kalkis: r.olay.kalkis, lavabo: r.olay.lavabo });
  }
  return { adim, yigin: new Map(d.paralar.map((p) => [anahtar(p.x, p.z), p.miktar])) };
}
const goreli = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b));

describe('D-206 K2-CARPAN — Kat 2 yığınlarına koleksiyon çarpanı', () => {
  const taban = sur({});
  const carpan = sur({ gelirCarpan: 1.1 });

  it('her yığın (masa + lavabo) × 1,1; dinamik aynı (kalkış/istek sırası değişmez)', () => {
    expect(taban.yigin.size).toBeGreaterThan(3);
    expect([...carpan.yigin.keys()].sort()).toEqual([...taban.yigin.keys()].sort());
    for (const [k, v] of taban.yigin) expect(goreli(carpan.yigin.get(k)!, v * 1.1), k).toBeLessThan(1e-9);
    expect(taban.adim.map((a) => a.kalkis)).toEqual(carpan.adim.map((a) => a.kalkis));
  });

  it('kahve yığını da çarpılır (kalkışsız adımda düşen = kahve)', () => {
    let kahve = 0;
    taban.adim.forEach((a, i) => {
      if (a.kalkis > 0 || !a.dusen.length) return;
      kahve += 1;
      a.dusen.forEach((v, j) => expect(goreli(carpan.adim[i].dusen[j], v * 1.1)).toBeLessThan(1e-12));
    });
    expect(kahve).toBeGreaterThan(0);
  });

  it('lavabo ücreti de çarpılır', () => {
    const lav0 = taban.adim.reduce((a, x) => a + x.lavabo, 0);
    const lav1 = carpan.adim.reduce((a, x) => a + x.lavabo, 0);
    expect(lav0).toBeGreaterThan(0);
    expect(goreli(lav1, lav0 * 1.1)).toBeLessThan(1e-9);
  });

  it('çarpan yokken (gelirCarpan 1) taban birebir', () => {
    const bir = sur({ gelirCarpan: 1, ustaMasalar: [], ustaCarpan: 1 });
    expect([...bir.yigin.entries()]).toEqual([...taban.yigin.entries()]);
  });

  it('çevrimdışı: kat2Oran(…, mult) = mult × kat2Oran; offlineEarnedSplit mult\'u görür', () => {
    const sv = Object.fromEntries(KAT2_MASALAR.map((m) => [m.id, KAT2_SV_MAX]));
    expect(goreli(kat2Oran(HEPSI, sv, {}, 1.1), 1.1 * kat2Oran(HEPSI, sv, {}))).toBeLessThan(1e-12);
    expect(kat2Oran(HEPSI, sv, {}, 1)).toBe(kat2Oran(HEPSI, sv, {}));
    // Tavanı bağlamayan kısa yokluk: ham Kat 2 payı çarpanla büyür.
    const k2 = { acik: true, padsDone: HEPSI, masaSv: sv, yuk: {} };
    const a = offlineEarnedSplit(0, 60, C.pads.map((p) => p.id), k2).kazanc;
    const b = offlineEarnedSplit(0, 60, C.pads.map((p) => p.id), { ...k2, mult: 1.1 }).kazanc;
    expect(b).toBeGreaterThan(a);
  });
});

describe('D-206 U-ESIT — Kat 2 Usta', () => {
  it('kat2UstaCarpan = Kat 1 Usta\'nın tavandaki masaya kattığı yüzde (config\'ten türer, bugün +%20)', () => {
    const bahsis = tableTip(tableSoftMaxLevel());
    const p = tostShare(stationSoftMaxLevel());
    const fiyat = (1 - p) * PRODUCTS.tea.price + p * PRODUCTS.tost.price;
    expect(kat2UstaCarpan()).toBe(1 + (bahsis * (C.master.tipMult - 1)) / (fiyat + bahsis));
    expect(kat2UstaCarpan()).toBeCloseTo(1.2, 9);
  });

  it('Usta masanın yığını × kat2UstaCarpan; öteki masalar ve lavabo değişmez', () => {
    const taban = sur({});
    const usta = 'k2tavla1';
    const u = sur({ ustaMasalar: [usta], ustaCarpan: kat2UstaCarpan() });
    const yer = KAT2_MASALAR.find((m) => m.id === usta)!;
    const kUsta = anahtar(...paraDusmeYeri(yer));
    for (const [k, v] of taban.yigin) {
      const beklenen = k === kUsta ? v * kat2UstaCarpan() : v;
      expect(goreli(u.yigin.get(k)!, beklenen), k).toBeLessThan(1e-9);
    }
    expect(taban.yigin.get(kUsta)).toBeGreaterThan(0);
    expect(u.yigin.get(anahtar(KAT2_LAVABO_YER[0], KAT2_LAVABO_YER[1]))).toBe(taban.yigin.get(anahtar(KAT2_LAVABO_YER[0], KAT2_LAVABO_YER[1])));
  });

  it('çevrimdışı oran Usta\'yı görmez (Kat 1 kuralı: cevrimdisiGelir tipTotal Usta\'sız)', () => {
    // kat2Oran'ın Usta girdisi yok — imza (padsDone, masaSv, yuk, mult).
    expect(kat2Oran.length).toBeLessThanOrEqual(4);
  });
});

describe('D-206 U-ESIT — store (buyMaster / buyMasterAd / tick)', () => {
  const g = globalThis as Record<string, unknown>;
  let orig: unknown;
  beforeEach(() => {
    const mem: Record<string, string> = {};
    orig = g.localStorage;
    g.localStorage = { getItem: (k: string) => (k in mem ? mem[k] : null), setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
    useGame.getState().hardReset();
  });
  afterEach(() => {
    if (orig === undefined) delete g.localStorage;
    else g.localStorage = orig;
  });
  const masa = 'k2okey2';
  const kur = (sv: number) => {
    useGame.getState().kat2Ac();
    const k2 = useGame.getState().kat2;
    useGame.setState({ diamonds: D(100), kat2: { ...k2, masaSv: { ...k2.masaSv, [masa]: sv } } });
  };

  it('yalnız Sv5 açık masada: Sv4 reddedilir, Sv5\'te 25 💎 düşer, ikinci alım reddedilir', () => {
    kur(KAT2_SV_MAX - 1);
    expect(useGame.getState().kat2.padsDone).toContain(masa);
    expect(useGame.getState().buyMaster(`k2:${masa}`)).toBe(false);
    expect(useGame.getState().diamonds.toNumber()).toBe(100);
    kur(KAT2_SV_MAX);
    expect(useGame.getState().buyMaster(`k2:${masa}`)).toBe(true);
    expect(useGame.getState().diamonds.toNumber()).toBe(100 - C.master.diamondCost);
    expect(useGame.getState().mastersOwned).toContain(`k2:${masa}`);
    expect(useGame.getState().buyMaster(`k2:${masa}`)).toBe(false);
    // Kapalı masa ve uydurma kimlik reddedilir.
    expect(useGame.getState().buyMaster('k2:k2tavla12')).toBe(false);
    expect(useGame.getState().buyMaster('k2:yok')).toBe(false);
  });

  it('reklamla Usta: Sv5\'te günün hakkıyla (💎 düşmez), Sv4\'te değil', () => {
    kur(KAT2_SV_MAX - 1);
    expect(useGame.getState().buyMasterAd(`k2:${masa}`)).toBe(false);
    kur(KAT2_SV_MAX);
    expect(useGame.getState().buyMasterAd(`k2:${masa}`)).toBe(true);
    expect(useGame.getState().diamonds.toNumber()).toBe(100);
    expect(useGame.getState().mastersOwned).toContain(`k2:${masa}`);
  });

  it('Usta noktası: Sv5 + Usta değil masada; alınınca düşer', () => {
    kur(KAT2_SV_MAX);
    const s = useGame.getState();
    expect(kat2UstaNoktalari(s.kat2.padsDone, s.kat2.masaSv, s.mastersOwned).map((n) => n.masaId)).toEqual([masa]);
    s.buyMaster(`k2:${masa}`);
    const s1 = useGame.getState();
    expect(kat2UstaNoktalari(s1.kat2.padsDone, s1.kat2.masaSv, s1.mastersOwned)).toEqual([]);
  });

  it('store tick\'i çarpanı ve Usta\'yı kat2Tick\'e verir (Kat 2\'de ve arka planda)', () => {
    kur(KAT2_SV_MAX);
    const k2 = useGame.getState().kat2;
    const dunya = yeniKat2Dunya(k2.padsDone, AYAR);
    const yigin = (kat: 1 | 2, claimed: string[], usta: string[]) => {
      useGame.setState({ kat, player: kat === 2 ? ([0, 0, -1] as Vec3) : useGame.getState().player, goalsClaimed: claimed, mastersOwned: usta, kat2Dunya: dunya, charUpgrades: { tray: 0, magnet: 0, speed: 0 } });
      for (let i = 0; i < 1500; i++) useGame.getState().tick(0.1);
      return useGame.getState().kat2Dunya.paralar.reduce((a, p) => a + p.miktar, 0);
    };
    for (const kat of [2, 1] as const) {
      const p0 = yigin(kat, [], []);
      const cok = Array.from({ length: 10 }, (_, i) => `h${i}`);
      const p1 = yigin(kat, cok, []);
      expect(p0, `kat ${kat}`).toBeGreaterThan(0);
      expect(collectionMult(cok)).toBeGreaterThan(1);
      expect(goreli(p1, p0 * collectionMult(cok)), `kat ${kat} çarpan`).toBeLessThan(1e-9);
      const p2 = yigin(kat, [], [`k2:${masa}`]);
      expect(p2, `kat ${kat} Usta`).toBeGreaterThan(p0);
    }
  });

  it('görev ödülü çarpılmaz (Kat 1 kuralı): biten görevin ödülü cüzdana aynen', () => {
    useGame.getState().kat2Ac();
    const i = HAT.findIndex((x) => x.id === 'k2_okey1');
    const k2 = useGame.getState().kat2;
    useGame.setState({
      kat: 2, player: [...VARIS[2]] as Vec3, goalsClaimed: ['a', 'b', 'c', 'd', 'e'],
      kat2: { ...k2, padsDone: [...k2.padsDone, 'k2okey1'], gorev: { idx: i, sayac: {} } },
      kat2Dunya: yeniKat2Dunya([...k2.padsDone, 'k2okey1'], AYAR),
    });
    const w0 = useGame.getState().wallet.toNumber();
    useGame.getState().tick(0.01);
    expect(useGame.getState().kat2.gorev?.idx).toBe(i + 1);
    expect(useGame.getState().wallet.toNumber() - w0).toBe(HAT[i].reward);
  });
});

describe('D-206 B-UCLU — görev hattı', () => {
  const ARA: [string, string, string][] = [
    ['k2_s2okey1', 'k2s2okey1', 'k2_s2okey2'],
    ['k2_s2okey4', 'k2s2okey4', 'k2_s2okey6'],
    ['k2_tavla3', 'k2tavla3', 'k2_tavla5'],
    ['k2_tavla5', 'k2tavla5', 'k2_tavla6'],
    ['k2_tavla8', 'k2tavla8', 'k2_tavla10'],
    ['k2_tavla10', 'k2tavla10', 'k2_tavla12'],
  ];
  it('hat = D-205 hattı + raporun altı ara görevi (+ S5 3. tur parçaları), aynı yerlerinde; geçerli', () => {
    const ids = G.map((x) => x.id).filter((id) => !S5_EKLENEN.includes(id));
    expect(ids.filter((id) => !ARA.some((a) => a[0] === id))).toEqual([...KAT2_GOREV_SIRA_D205]);
    for (const [id, , sonraki] of ARA) expect(ids[ids.indexOf(id) + 1], id).toBe(sonraki);
    expect(kat2GorevHatasi(G, AYAR, C.kat2.hazir)).toBeNull();
  });
  it('ara görev ödülü = pad fiyatı × %15, 50\'ye yuvarlı; hedef pad (S5 3. tur: parçalarıyla toplam)', () => {
    for (const [id, pad] of ARA) {
      const g = G.find((x) => x.id === id)!;
      expect(g.hedef).toEqual({ tip: 'pad', id: pad });
      const cost = AYAR.padler.find((p) => p.id === pad)!.cost;
      const toplam = g.reward + (S5_PARCA[id] ?? []).reduce((a, p) => a + G.find((x) => x.id === p)!.reward, 0);
      expect(toplam, id).toBe(Math.round((cost * 0.15) / 50) * 50);
      if (S5_ONCEKI_ODUL[id] !== undefined) expect(toplam, id).toBe(S5_ONCEKI_ODUL[id]);
    }
  });
});

describe('D-206 kayıt uyumu — görev kaydı kimlikle taşınır', () => {
  const eskiIdx = (id: string) => KAT2_GOREV_SIRA_D205.indexOf(id);
  const yeniIdx = (id: string) => HAT.findIndex((x) => x.id === id);

  it('eski kayıt (son yok): aktif görev öncesine eklenen ara görev sıraya girer, ödenmiş görev yeniden açılmaz', () => {
    // D-205'te k2_s2okey2 aktifti → son = k2_grup5 → yeni hat k2_s2okey1'den devam eder.
    expect(kat2GorevKaydiCoz({ idx: eskiIdx('k2_s2okey2'), sayac: {} }, HAT)).toEqual({ idx: yeniIdx('k2_s2okey1'), sayac: {} });
    // S5 3. tur: k2_tavla6'nın ardı artık k2_tavla8_a (GB parçası).
    expect(kat2GorevKaydiCoz({ idx: eskiIdx('k2_tavla12'), sayac: {} }, HAT)).toEqual({ idx: yeniIdx('k2_tavla8_a'), sayac: {} });
  });
  it('eski kayıt: sayaç görevi aynı kalır ve sayacı korunur; bitmiş hat bitmiş kalır; idx 0 → 0', () => {
    expect(kat2GorevKaydiCoz({ idx: eskiIdx('k2_kahve40'), sayac: { servis: 7 } }, HAT)).toEqual({ idx: yeniIdx('k2_kahve40'), sayac: { servis: 7 } });
    expect(kat2GorevKaydiCoz({ idx: KAT2_GOREV_SIRA_D205.length, sayac: {} }, HAT).idx).toBe(HAT.length);
    expect(kat2GorevKaydiCoz({ idx: 0, sayac: { servis: 0 } }, HAT)).toEqual({ idx: 0, sayac: { servis: 0 } });
  });
  it('yeni kayıt (son var) yazılıp okunduğunda aynı idx; araya ileride görev girse de kimlikten bulunur', () => {
    for (let i = 0; i <= HAT.length; i++) {
      const yaz = kat2GorevKaydiYaz({ idx: i, sayac: {} }, HAT);
      expect(kat2GorevKaydiCoz(yaz, HAT).idx).toBe(i);
    }
    const yaz = kat2GorevKaydiYaz({ idx: yeniIdx('k2_cezve2'), sayac: {} }, HAT);
    const ileri = [...HAT.slice(0, 2), { ...HAT[0], id: 'k2_yeni' }, ...HAT.slice(2)];
    expect(kat2GorevKaydiCoz(yaz, ileri).idx).toBe(yeniIdx('k2_cezve2') + 1);
  });
  it('kayitCoz: D-205 diski (saveVersion aynı) açılınca görev kimlikle oturur', () => {
    const eski = { ...defaultSave(), kat2: { acik: true, padsDone: [...C.kat2.hazir], masaSv: {}, yuk: {}, gorev: { idx: eskiIdx('k2_tavla6'), sayac: {} } } } as unknown as Record<string, unknown>;
    const { data, red } = kayitCoz(eski);
    expect(red).toEqual([]);
    expect(data.kat2.gorev).toEqual({ idx: yeniIdx('k2_tavla3_a'), sayac: {} }); // S5 3. tur GB parçası
  });

  describe('store: eski kayıtla açılış', () => {
    const g = globalThis as Record<string, unknown>;
    let orig: unknown;
    let mem: Record<string, string>;
    beforeEach(() => {
      mem = {};
      orig = g.localStorage;
      g.localStorage = { getItem: (k: string) => (k in mem ? mem[k] : null), setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
      useGame.getState().hardReset();
    });
    afterEach(() => {
      if (orig === undefined) delete g.localStorage;
      else g.localStorage = orig;
    });
    /** Diske D-205 biçiminde kayıt: saveNow'un yazdığı kaydın görevinden `son` silinir, idx D-205 sırasına çevrilir. */
    function eskiKayitlaAc(padsDone: string[], eskiAktif: string, cuzdan: number): void {
      useGame.getState().kat2Ac();
      const k2 = useGame.getState().kat2;
      useGame.setState({ wallet: D(cuzdan), kat2: { ...k2, padsDone, gorev: { idx: 0, sayac: {} } } });
      useGame.getState().saveNow();
      for (const k of Object.keys(mem).filter((x) => mem[x].includes('"kat2"'))) {
        const { zarf: _z, ...govde } = JSON.parse(mem[k]);
        void _z;
        expect(typeof govde.kat2.gorev.son).toBe('string');
        govde.kat2.gorev = { idx: eskiIdx(eskiAktif), sayac: {} };
        mem[k] = kayitMetni(govde);
      }
      useGame.getState().init();
    }
    const zincirKadar = (id: string) => [...C.kat2.hazir, ...AYAR.padler.slice(0, AYAR.padler.findIndex((p) => p.id === id) + 1).map((p) => p.id)];

    it('aktif k2_tavla6, tavla3 alınmış: açılışta k2_tavla5_a aktif (tavla2/3 ödülsüz geçilir), cüzdan aynı, tavla5 bitince ödülü bir kez', () => {
      eskiKayitlaAc(zincirKadar('k2tavla3'), 'k2_tavla6', 5_000);
      const s = useGame.getState();
      expect(s.kat2.gorev?.idx).toBe(yeniIdx('k2_tavla5_a'));
      expect(s.wallet.toNumber()).toBe(5_000);
      // tavla5 alınınca ödülü bir kez gelir.
      useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { ...s.kat2, padsDone: zincirKadar('k2tavla5') } });
      const w0 = useGame.getState().wallet.toNumber();
      useGame.getState().tick(0.01);
      // S5 3. tur: tavla4 + tavla5 aynı adımda → iki parça birden, toplam = eski k2_tavla5 ödülü; sırada 4. garson.
      expect(useGame.getState().kat2.gorev?.idx).toBe(yeniIdx('k2_garson4'));
      expect(useGame.getState().wallet.toNumber() - w0).toBe(S5_ONCEKI_ODUL.k2_tavla5);
    });

    it('yeni biçimde kaydedilen kayıt yeniden açılınca idx kaymaz', () => {
      eskiKayitlaAc(zincirKadar('k2salon2'), 'k2_grup5', 0);
      const idx = useGame.getState().kat2.gorev?.idx;
      expect(idx).toBe(yeniIdx('k2_grup5'));
      useGame.getState().saveNow();
      useGame.getState().init();
      expect(useGame.getState().kat2.gorev?.idx).toBe(idx);
    });
  });
});

describe('D-206 Usta noktası yerleşimi (Sv çerçevesi bekçisinin aynı ölçütleri)', () => {
  it('her masanın Usta çerçevesi masaya/yığına/pad\'e/merdiven yoluna değmez, yürüme alanında, kendi salonunda', async () => {
    const { KAT2_GARSON_PAD, KAT2_LAVABO_PAD, KAT2_SALON_PAD, KOVA, OCAKLAR, OKEY_YARI, TAVLA_YARI, kat2YurumeAlani } = await import('../src/game/kat');
    const { kat2PadEtiket, kat2PadYeri } = await import('../src/game/kat2Dongu');
    const { padCercevesi, ustaCercevesi } = await import('../src/game/markerFrame');
    type Kutu = [number, number, number, number];
    const kutu = (x: number, z: number, hw: number, hh: number): Kutu => [x - hw, x + hw, z - hh, z + hh];
    const kesisir = (a: Kutu, b: Kutu, pay = 0) => a[0] < b[1] + pay && b[0] < a[1] + pay && a[2] < b[3] + pay && b[2] < a[3] + pay;
    const alan = kat2YurumeAlani(3);
    const c = ustaCercevesi();
    const masalar = KAT2_MASALAR.map((m) => m.id);
    const noktalar = kat2UstaNoktalari(masalar, Object.fromEntries(masalar.map((id) => [id, KAT2_SV_MAX])), []);
    expect(noktalar).toHaveLength(masalar.length);
    const padIdleri = [...new Set([...HEPSI, ...KAT2_SALON_PAD, KAT2_GARSON_PAD, KAT2_LAVABO_PAD, ...OCAKLAR.map((o) => o.id)])];
    const padKutu = padIdleri.map((id) => {
      const [x, z] = kat2PadYeri(id);
      const pc = padCercevesi(kat2PadEtiket(id));
      return { id, k: kutu(x, z, pc.hw, pc.hh) };
    });
    for (const n of noktalar) {
      const k = kutu(n.x, n.z, c.hw, c.hh);
      const m = KAT2_MASALAR.find((x) => x.id === n.masaId)!;
      for (const o of KAT2_MASALAR) {
        const oy = o.tur === 'tavla' ? TAVLA_YARI : [OKEY_YARI, OKEY_YARI];
        expect(kesisir(k, kutu(o.x, o.z, oy[0], oy[1]), 0.15), `${n.id} × masa ${o.id}`).toBe(false);
        const [px, pz] = paraDusmeYeri(o);
        expect(px >= k[0] - 0.3 && px <= k[1] + 0.3 && pz >= k[2] - 0.3 && pz <= k[3] + 0.3, `${n.id} × yığın ${o.id}`).toBe(false);
      }
      for (const p of padKutu) expect(kesisir(k, p.k), `${n.id} × pad ${p.id}`).toBe(false);
      expect(k[1] <= KOVA.x0 || k[0] >= KOVA.x1, `${n.id} merdiven yolunda`).toBe(true);
      expect(alan.some((a) => k[0] >= a.x0 && k[1] <= a.x1 && k[2] >= a.z0 && k[3] <= a.z1), `${n.id} yürüme alanı dışında`).toBe(true);
      expect(m.alan === 0 ? k[3] < 0 : k[2] > 0).toBe(true);
    }
  });
});
