/**
 * s5-denge-4.test.ts — S5 3. TUR BEKÇİSİ (kullanıcı 2026-11-21 "hepsi öneri", `docs/s5-denge-raporu.md` §KARAR üçüncü tur).
 *  GH25  Kat 2 garson hızı ve hız yükseltmesi ×1,25 (3 → 3,75 · 4 → 5).
 *  G4    4. garson pad'i zincirde tavla 5'ten sonra (15.000), 3. garsonun sağında; zincir onu bekler; kendi görevi.
 *  GB    > 20 dk görevler tek pad'lik parçalara bölündü, ödül toplamı korunur.
 *  GB-SV k2_s2okey4 → "3 masa aç" · "3 okey Sv2" · "6 okey Sv2" · "4. masa"; ara Sv görevleri `masaSvKapi` varken hatta.
 *  İçme 12 sn (değişmedi). Kayıt: görev kimlikle oturur, ödül çift ödenmez (saveVersion artmadı).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { kayitMetni } from '../src/game/save';
import { KAT2_GARSON_PADLER, KAT2_GARSON_YERLERI, KAT2_MASALAR, VARIS } from '../src/game/kat';
import { kat2EtkinAyar, kat2PadEtiket, kat2PadYeri, kat2SiradakiPad, kat2SvCanliTetik, kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Girdi } from '../src/game/kat2Dongu';
import {
  KAT2_GOREV_SIRA_D205,
  kat2GorevGorunumu,
  kat2GorevHatasi,
  kat2GorevIlerlet,
  kat2GorevKaydiCoz,
  kat2GorevKaydiYaz,
  kat2Gorevleri,
  kat2PadAdimlari,
  kat2SvCanli,
  type Kat2GorevDef,
  type Kat2GorevOlay,
} from '../src/game/kat2Gorev';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';
import { S5_ONCEKI_ODUL, S5_PARCA, S5_YENI_GOREV } from './s5-gorev-bolme';

const A = C.kat2 as unknown as Kat2Ayar;
const G = C.kat2Gorevler as readonly Kat2GorevDef[];
const HAT = kat2Gorevleri(G, A);
const ZINCIR = A.padler.map((p) => p.id);
const HAZIR = C.kat2.hazir as readonly string[];
const kadar = (id: string) => [...HAZIR, ...ZINCIR.slice(0, ZINCIR.indexOf(id) + 1)];
const hatIdx = (id: string) => HAT.findIndex((g) => g.id === id);
const SIFIR: Kat2GorevOlay = { servis: 0, garsonServis: 0, tavlaServis: 0, kalkis: 0, kazanc: 0 };
const okeyler = (pads: readonly string[]) => KAT2_MASALAR.filter((m) => m.tur === 'okey' && pads.includes(m.id)).map((m) => m.id);
const sv2 = (ids: readonly string[]) => Object.fromEntries(ids.map((id) => [id, 2]));

describe('GH25 — Kat 2 garson hızı ×1,25', () => {
  it('taban 3 → 3,75 · hız yükseltmesi 4 → 5 · oyuncudan yine yavaş', () => {
    expect(A.garson!.hiz).toBeCloseTo(3 * 1.25);
    expect(A.yukseltme!.garsonHiz.deger).toEqual([4 * 1.25]);
    expect(kat2EtkinAyar(A, { garsonHiz: 1 }).garson!.hiz).toBe(5);
    expect(A.yukseltme!.garsonHiz.fiyat).toEqual([6_950]); // fiyat değişmedi
  });
});

describe('G4 — 4. garson', () => {
  it('zincirde tavla 5 ile tavla 6 arasında, 15.000, dolum ~3,5 sn; 3. garsonun sağında', () => {
    const i = ZINCIR.indexOf('k2garson4');
    expect([ZINCIR[i - 1], ZINCIR[i + 1]]).toEqual(['k2tavla5', 'k2tavla6']);
    expect(A.padler[i]).toEqual({ id: 'k2garson4', cost: 15_000, fillRate: Math.round(15_000 / 3.5) });
    expect(KAT2_GARSON_PADLER).toEqual(['k2garson', 'k2garson2', 'k2garson3', 'k2garson4']);
    const [x3, z3] = KAT2_GARSON_YERLERI.k2garson3;
    expect(kat2PadYeri('k2garson4')).toEqual([x3 + 2.2, z3]);
    expect(kat2PadEtiket('k2garson4')).toBe('4. Garson');
  });
  it('zincir onu bekler: tavla 5 alınınca sıradaki pad 4. garson, ardından tavla 6', () => {
    expect(kat2SiradakiPad(A, kadar('k2tavla5'))?.id).toBe('k2garson4');
    expect(kat2SiradakiPad(A, kadar('k2garson4'))?.id).toBe('k2tavla6');
  });
  it('pad alınınca 4. garson evinde (pad yerinde) doğar; pad yoksa 3 garson', () => {
    const say = (pd: string[]) => {
      const g: Kat2Girdi = { x: 0, z: -1, durdu: true, cuzdan: 0, padsDone: pd, tepsiKap: 6, miknatis: 0 };
      const d = kat2Tick(yeniKat2Dunya(pd, A), g, 0.01, A).dunya;
      return [d.garson, ...(d.garsonEk ?? [])].filter((x) => !!x);
    };
    expect(say(kadar('k2tavla5'))).toHaveLength(3);
    const gs = say(kadar('k2garson4'));
    expect(gs).toHaveLength(4);
    expect(Math.hypot(gs[3]!.x - 4.4, gs[3]!.z + 6)).toBeLessThan(0.1);
  });
  it('kendi görevi tavla 5 görevinin ardında: "4. Garsonu tut", ödül pad × %15', () => {
    const i = hatIdx(S5_YENI_GOREV);
    expect(HAT[i - 1].id).toBe('k2_tavla5');
    expect(HAT[i]).toMatchObject({ kicker: 'DÖRDÜNCÜ GARSON', title: '4. Garsonu tut', hedef: { tip: 'pad', id: 'k2garson4' }, reward: 2_250 });
    expect(kat2PadAdimlari(HAT, i, A)).toEqual(['k2garson4']);
  });
});

describe('GB — uzun görevler bölündü, ödül toplamı korunur', () => {
  it('her grup (parçalar + asıl görev) = S5 öncesi ödül; parçalar asıl görevin hemen önünde', () => {
    for (const [asil, parcalar] of Object.entries(S5_PARCA)) {
      const ids = [...parcalar, asil];
      const toplam = ids.reduce((a, id) => a + G.find((g) => g.id === id)!.reward, 0);
      expect(toplam, asil).toBe(S5_ONCEKI_ODUL[asil]);
      const i = hatIdx(asil);
      expect(HAT.slice(i - parcalar.length, i + 1).map((g) => g.id), asil).toEqual(ids);
    }
  });
  it('kahve 40 görevinden sonra her pad görevi tek adım (tek pad)', () => {
    for (let i = hatIdx('k2_kahve40') + 1; i < HAT.length; i++) {
      if (HAT[i].hedef.tip === 'pad') expect(kat2PadAdimlari(HAT, i, A), HAT[i].id).toHaveLength(1);
    }
  });
  it('hat oynanabilir (oyunun ayarıyla: Sv kapısı zincirde)', () => {
    expect(kat2GorevHatasi(G, A, HAZIR)).toBeNull();
  });
});

describe('GB-SV — Seviye ara görevleri hatta (masaSvKapi varken)', () => {
  it('sıra: 3 masa aç → 3 okey Sv2 → 6 okey Sv2 → 4. masa; kuyruk Sv görevleri düşer', () => {
    const i = hatIdx('k2_s2okey4_a');
    expect(HAT.slice(i, i + 4).map((g) => g.id)).toEqual(['k2_s2okey4_a', 'k2_okeySv3', 'k2_okeySv6', 'k2_s2okey4']);
    expect(HAT[i].hedef).toEqual({ tip: 'pad', id: 'k2s2okey3' });
    expect(HAT[i + 1]).toMatchObject({ title: "3 okey masasını Seviye 2'ye çıkar", hedef: { tip: 'masaSv', tur: 'okey', sv: 2, adet: 3 } });
    expect(HAT[i + 2]).toMatchObject({ title: "6 okey masasını Seviye 2'ye çıkar", hedef: { tip: 'masaSv', tur: 'okey', sv: 2, adet: 6 } });
    expect(HAT.at(-1)!.id).toBe('k2_tavla12');
    expect(HAT.some((g) => g.id === 'k2_sv2' || g.id === 'k2_sv5')).toBe(false);
  });
  it('Sv görevi sürerken Sv noktası canlı, ilerleme N/3 · N/6, tamamlanınca ödül bir kez', () => {
    const pads = kadar('k2s2okey3');
    const ok = okeyler(pads);
    expect(ok.length).toBeGreaterThanOrEqual(6);
    const kayit = { idx: hatIdx('k2_okeySv3'), sayac: {} };
    expect(kat2SvCanli({ padsDone: pads, gorev: kayit }, G, A)).toBe(true);
    expect(kat2SvCanliTetik(A, pads, {}, true)).toHaveLength(1);
    expect(kat2GorevGorunumu({ padsDone: pads, masaSv: sv2(ok.slice(0, 2)), gorev: kayit }, G, A)).toMatchObject({ id: 'k2_okeySv3', cur: 2, total: 3 });
    const r = kat2GorevIlerlet(kayit, SIFIR, { padsDone: pads, masaSv: sv2(ok.slice(0, 3)) }, G, A);
    expect(r.biten.map((g) => g.id)).toEqual(['k2_okeySv3']);
    expect(r.odul).toBe(G.find((g) => g.id === 'k2_okeySv3')!.reward);
    const r2 = kat2GorevIlerlet(r.kayit, SIFIR, { padsDone: pads, masaSv: sv2(ok.slice(0, 5)) }, G, A);
    expect(r2.odul).toBe(0);
    expect(kat2GorevGorunumu({ padsDone: pads, masaSv: sv2(ok.slice(0, 5)), gorev: r2.kayit }, G, A)).toMatchObject({ id: 'k2_okeySv6', cur: 5, total: 6 });
  });
});

describe('İçme süresi 12 sn kalır', () => {
  it('kahveIcme 12', () => expect(A.kahveIcme).toBe(12));
});

describe('Kayıt — görev kimlikle oturur, ödül çift ödenmez', () => {
  const coz = (son: string | undefined, idx = 0) => kat2GorevKaydiCoz(son === undefined ? { idx, sayac: {} } : { idx, sayac: {}, son }, HAT);
  it('hattın ortası: son tamamlanan görevin hemen ardındaki (yeni) göreve', () => {
    expect(coz('k2_kahve40').idx).toBe(hatIdx('k2_s2okey4_a'));
    expect(coz('k2_s2okey4').idx).toBe(hatIdx('k2_s2okey6_a'));
    expect(coz('k2_tavla5').idx).toBe(hatIdx('k2_garson4'));
    expect(coz('k2_tavla10').idx).toBe(hatIdx('k2_tavla12_a'));
    // D-205 diski (son yok): aktif k2_s2okey6 → son k2_kahve40.
    expect(coz(undefined, KAT2_GOREV_SIRA_D205.indexOf('k2_s2okey6')).idx).toBe(hatIdx('k2_s2okey4_a'));
  });
  it('hattın sonu: bitmiş hat bitmiş kalır (eski kuyruk Sv görevleri dahil)', () => {
    expect(coz('k2_tavla12').idx).toBe(HAT.length);
    expect(coz('k2_sv5').idx).toBe(HAT.length);
    expect(coz('k2_sv2').idx).toBe(HAT.length);
  });
  it('yaz → oku her idx için aynı', () => {
    for (let i = 0; i <= HAT.length; i++) expect(kat2GorevKaydiCoz(kat2GorevKaydiYaz({ idx: i, sayac: {} }, HAT), HAT).idx).toBe(i);
  });

  describe('store: eski hattın kaydıyla açılış', () => {
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
    /** Diske D-206 hattının kaydı: `son` = eski hatta son tamamlanan görev; yeni hat aynı kimlikle açılmalı. */
    function ac(padsDone: string[], son: string, cuzdan: number): void {
      useGame.getState().kat2Ac();
      const k2 = useGame.getState().kat2;
      useGame.setState({ wallet: D(cuzdan), kat2: { ...k2, padsDone, gorev: { idx: 0, sayac: {} } } });
      useGame.getState().saveNow();
      for (const k of Object.keys(mem).filter((x) => mem[x].includes('"kat2"'))) {
        const { zarf: _z, ...govde } = JSON.parse(mem[k]);
        void _z;
        govde.kat2.gorev = { idx: 99, sayac: {}, son };
        mem[k] = kayitMetni(govde);
      }
      useGame.getState().init();
    }

    it('eski k2_s2okey4 tamam + okey 5 alınmış: açılışta k2_s2okey6 aktif, ara parça ödülsüz geçilir, cüzdan aynı', () => {
      ac(kadar('k2s2okey5'), 'k2_s2okey4', 3_000);
      const s = useGame.getState();
      expect(s.kat2.gorev?.idx).toBe(hatIdx('k2_s2okey6'));
      expect(s.wallet.toNumber()).toBe(3_000);
    });
    it('eski k2_kahve40 tamam, okey3 alınmış: Sv görevinde açılır; Sv2 × 3 olunca ödülü bir kez', () => {
      const pads = kadar('k2s2okey3');
      ac(pads, 'k2_kahve40', 1_000);
      let s = useGame.getState();
      expect(s.kat2.gorev?.idx).toBe(hatIdx('k2_okeySv3'));
      expect(s.wallet.toNumber()).toBe(1_000);
      useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { ...s.kat2, masaSv: sv2(okeyler(pads).slice(0, 3)) } });
      const w0 = useGame.getState().wallet.toNumber();
      useGame.getState().tick(0.01);
      s = useGame.getState();
      expect(s.kat2.gorev?.idx).toBe(hatIdx('k2_okeySv6'));
      expect(s.wallet.toNumber() - w0).toBe(G.find((x) => x.id === 'k2_okeySv3')!.reward);
      useGame.getState().tick(0.01);
      expect(useGame.getState().wallet.toNumber() - w0).toBe(G.find((x) => x.id === 'k2_okeySv3')!.reward);
    });
    it('eski hat bitmiş (4. garsonsuz zincir): hat bitmiş kalır, ödül yok, sıradaki pad 4. garson', () => {
      const eski = [...HAZIR, ...ZINCIR.filter((id) => id !== 'k2garson4')];
      ac(eski, 'k2_tavla12', 2_000);
      const s = useGame.getState();
      expect(s.kat2.gorev?.idx).toBe(HAT.length);
      expect(s.wallet.toNumber()).toBe(2_000);
      expect(kat2SiradakiPad(A, s.kat2.padsDone)?.id).toBe('k2garson4');
    });
  });
});
