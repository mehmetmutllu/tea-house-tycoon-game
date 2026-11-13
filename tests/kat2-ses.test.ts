/**
 * kat2-ses.test.ts — KAT 2 SESLERİNİN BEKÇİSİ (S3 · Ajan C). Ses duyulamaz; doğrulanan şey hangi durum
 * farkının hangi sesi doğurduğu, ortam takırtısının sıklık sınırı, Kat 1'deyken / sessiz kipte / arka
 * planda Kat 2 sesinin ÇALMADIĞI ve her sesin iki adayının çalınabilir olduğu.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { sesMotoruKur, SES_KATALOG, type SesArkaUc } from '../src/game/audio';
import { seslendir, sesSuresi } from '../src/game/audioSynth';
import {
  KAT2_SECIM, KAT2_SES_ADAYLARI, KAT2_SES_KATALOG, MASA_ARALIK, ORTAM_ARALIK, UZAK, yakinlik, type Kat2SesId,
} from '../src/game/audioKat2';
import {
  kat2SesBaslat, kat2SesOlaylari, ortamZamanlayici, yeniBellek, type Kat2CalId, type Kat2SesKesit,
} from '../src/game/kat2Ses';
import { D } from '../src/game/decimal';
import { OCAKLAR } from '../src/game/kat';
import { useGame } from '../src/game/store';

const TABAN: Kat2SesKesit = {
  kat: 2, gecis: false, acik: true, hazirda: false, padSayisi: 3, acikAlan: 1, svToplam: 0, nextId: 10,
  tepsi: 2, birikimToplam: 0, istekToplam: 2, paraIdleri: [5, 6], ocakHazir: [1, 0], kasa: D(0), cuzdan: D(100),
  x: 0, z: 0, oynayan: [],
};
const ile = (y: Partial<Kat2SesKesit>): Kat2SesKesit => ({ ...TABAN, ...y });
const idler = (a: Kat2SesKesit | null, b: Kat2SesKesit) => kat2SesOlaylari(a, b, yeniBellek()).map((e) => e.id);

describe('durum farkı → doğru ses kimliği', () => {
  it('ilk kare sessiz', () => {
    expect(idler(null, TABAN)).toEqual([]);
  });
  const vakalar: [string, Partial<Kat2SesKesit>, Kat2CalId][] = [
    ['para yığını toplandı → Kat 1 coin', { paraIdleri: [6] }, 'coin'],
    ['tepsi azaldı + masa kahve aldı → Kat 1 serve', { tepsi: 1, birikimToplam: 30, istekToplam: 1 }, 'serve'],
    ['tepsi arttı → Kat 1 pour', { tepsi: 3 }, 'pour'],
    ['pad açıldı → Kat 1 padFill', { padSayisi: 4 }, 'padFill'],
    ['açık alan arttı → duvar', { acikAlan: 2, padSayisi: 4 }, 'k2duvar'],
    ['masa Sv toplamı arttı → sv', { svToplam: 1 }, 'k2sv'],
    ['ocak hazır arttı → cezve', { ocakHazir: [2, 0], x: OCAKLAR[0].al[0], z: OCAKLAR[0].al[1] }, 'k2cezve'],
    ['geçiş başladı → merdiven', { gecis: true }, 'k2merdiven'],
  ];
  for (const [ad, fark, id] of vakalar) {
    it(ad, () => {
      expect(idler(TABAN, ile(fark))).toContain(id);
    });
  }
  it('değişiklik yoksa ses yok; azalmalar sessiz', () => {
    expect(idler(TABAN, ile({}))).toEqual([]);
    expect(idler(TABAN, ile({ padSayisi: 2, svToplam: 0, ocakHazir: [0, 0] }))).toEqual([]);
  });
  it('tepsi azaldı ama hiçbir masa almadı → servis değil', () => {
    expect(idler(TABAN, ile({ tepsi: 0 }))).not.toContain('serve');
  });
  it('dünya yeniden kuruldu (nextId geri) → para/servis sesi yok', () => {
    expect(idler(TABAN, ile({ nextId: 1, paraIdleri: [], tepsi: 0, birikimToplam: 9 }))).toEqual([]);
  });
  it('kasa: Kat 1de boşalıp cüzdana geçince çalar; sıfırlamada (cüzdan artmadan) çalmaz', () => {
    const a = ile({ kat: 1, kasa: D(500), cuzdan: D(100) });
    expect(idler(a, ile({ kat: 1, kasa: D(0), cuzdan: D(600) }))).toEqual(['k2kasa']);
    expect(idler(a, ile({ kat: 1, kasa: D(0), cuzdan: D(0) }))).toEqual([]);
  });
  it('yeni kat: geçişle varışta oturumda BİR kez (merdiven açıldıysa ya da yalnız hazır pad varsa)', () => {
    const b = yeniBellek();
    const k1 = ile({ kat: 1, acik: false });
    kat2SesOlaylari(k1, ile({ kat: 1, acik: true }), b);
    const yolda = ile({ kat: 1, gecis: true });
    expect(kat2SesOlaylari(yolda, ile({ kat: 2, gecis: true }), b).map((e) => e.id)).toContain('k2yeniKat');
    expect(kat2SesOlaylari(yolda, ile({ kat: 2, gecis: true }), b).map((e) => e.id)).not.toContain('k2yeniKat');
    // Pad açılmış, merdiven önceki oturumda açılmış → yeni kat anı değil.
    expect(idler(yolda, ile({ kat: 2, gecis: true, hazirda: false }))).not.toContain('k2yeniKat');
    expect(idler(yolda, ile({ kat: 2, gecis: true, hazirda: true }))).toContain('k2yeniKat');
    // Yükleme anı (geçişsiz kat değişimi) sayılmaz.
    expect(idler(ile({ kat: 1 }), ile({ kat: 2, hazirda: true }))).not.toContain('k2yeniKat');
  });
});

describe("Kat 1'deyken Kat 2 dünyasının sesi çalmaz", () => {
  it('olaylar: Kat 2 dünyası değişse de Kat 1de sessiz', () => {
    const a = ile({ kat: 1 });
    const b = ile({ kat: 1, paraIdleri: [], tepsi: 1, birikimToplam: 9, padSayisi: 5, acikAlan: 3, svToplam: 4, ocakHazir: [3, 3] });
    expect(idler(a, b)).toEqual([]);
  });
  it('ortam: Kat 1de ve geçiş sürerken takırtı yok', () => {
    const z = ortamZamanlayici(() => 0);
    const oynayan = [{ id: 'k2okey1', tur: 'okey' as const, x: 0, z: 0 }];
    for (let t = 0; t < 60; t += 0.5) {
      expect(z.adim(t, ile({ kat: 1, oynayan }))).toBeNull();
      expect(z.adim(t, ile({ gecis: true, oynayan }))).toBeNull();
    }
  });
});

describe('ortam takırtısı: sıklık sınırı + yakınlık', () => {
  const masalar = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, tur: (i % 2 ? 'tavla' : 'okey') as 'okey' | 'tavla', x: i * 0.2, z: 0 }));
  it('ardışık iki ortam sesi ≥ ORTAM_ARALIK, aynı masa ≥ MASA_ARALIK[0]', () => {
    let r = 0.37;
    const z = ortamZamanlayici(() => (r = (r * 9301 + 0.4927) % 1));
    const caldi: { t: number; id: string }[] = [];
    for (let i = 0; i <= 3000; i++) {
      const t = i / 30;
      const o = z.adim(t, ile({ oynayan: masalar }));
      if (o) caldi.push({ t, id: o.id });
    }
    expect(caldi.length).toBeGreaterThan(10);
    for (let i = 1; i < caldi.length; i++) expect(caldi[i].t - caldi[i - 1].t).toBeGreaterThanOrEqual(ORTAM_ARALIK - 1e-9);
    expect(caldi.length).toBeLessThanOrEqual(Math.floor(100 / ORTAM_ARALIK) + 1);
    expect(new Set(caldi.map((c) => c.id))).toEqual(new Set(['k2takirti', 'k2zar']));
  });
  it('tek masa: iki ses arası en az MASA_ARALIK[0] (sürekli değil)', () => {
    const z = ortamZamanlayici(() => 0);
    const zamanlar: number[] = [];
    for (let i = 0; i <= 600; i++) {
      const t = i / 10;
      if (z.adim(t, ile({ oynayan: [masalar[0]] }))) zamanlar.push(t);
    }
    expect(zamanlar[0]).toBeGreaterThanOrEqual(MASA_ARALIK[0] - 1e-9); // ilk ses de gecikir
    for (let i = 1; i < zamanlar.length; i++) expect(zamanlar[i] - zamanlar[i - 1]).toBeGreaterThanOrEqual(MASA_ARALIK[0] - 1e-9);
  });
  it('uzak masa duyulmaz, yaklaşınca birikmiş ses patlamaz; yakın masa kısılmadan çalar', () => {
    const z = ortamZamanlayici(() => 0);
    const uzak = [{ id: 'u', tur: 'okey' as const, x: UZAK + 5, z: 0 }];
    for (let t = 0; t < 30; t += 0.1) expect(z.adim(t, ile({ oynayan: uzak }))).toBeNull();
    // Oyuncu yanına geldi: saat uzaktayken de kuruldu, hemen değil bir aralık sonra çalar.
    let ilk = -1;
    for (let t = 30; t < 60 && ilk < 0; t += 0.1) if (z.adim(t, ile({ oynayan: uzak, x: UZAK + 5 }))) ilk = t;
    expect(ilk).toBeGreaterThan(30.05);
    expect(yakinlik(0)).toBe(1);
    expect(yakinlik(UZAK)).toBe(0);
    expect(yakinlik((UZAK + 3) / 2)).toBeGreaterThan(0);
    expect(yakinlik((UZAK + 3) / 2)).toBeLessThan(1);
  });
  it('sıradaki birden çok masadan en yakını çalar', () => {
    const z = ortamZamanlayici(() => 0);
    const iki = [{ id: 'uzakca', tur: 'okey' as const, x: 9, z: 0 }, { id: 'yakin', tur: 'tavla' as const, x: 1, z: 0 }];
    let o = null;
    for (let t = 0; t < 20 && !o; t += 0.1) o = z.adim(t, ile({ oynayan: iki }));
    expect(o).toEqual({ id: 'k2zar', kazanc: 1 });
  });
});

describe('motor: kazanç çarpanı + katalog (Kat 1 davranışı değişmeden)', () => {
  function sahte() {
    const kayit: { id: string; gain: number }[] = [];
    let t = 0;
    const uc: SesArkaUc<Kat2CalId> = {
      simdi: () => t, kilidiAc: () => {}, dosyaCal: () => false,
      sentezCal: (id, _k, _y, gain) => { kayit.push({ id, gain }); },
    };
    return { uc, kayit, ileri: (dt: number) => { t += dt; } };
  }
  it('cal(id, kazanc) seviye × kazanç ile çalar; kazanç 0 hiç çalmaz', () => {
    const s = sahte();
    const m = sesMotoruKur<Kat2CalId>(s.uc, true, 0.8, { ...KAT2_SES_KATALOG } as never);
    m.kilidiAc();
    expect(m.cal('k2takirti', 0.5)).toBe(true);
    expect(s.kayit[0].gain).toBeCloseTo(0.4);
    s.ileri(5);
    expect(m.cal('k2zar', 0)).toBe(false);
    expect(s.kayit).toHaveLength(1);
  });
});

describe('bağlama: store aboneliği (sessiz kip, arka plan, Kat 1)', () => {
  const ilk = useGame.getState();
  beforeEach(() => useGame.setState(ilk, true));

  function kur(opts: { duraklatildi?: () => boolean } = {}) {
    const caldi: Kat2CalId[] = [];
    let t = 0;
    const uc: SesArkaUc<Kat2CalId> = {
      simdi: () => t, kilidiAc: () => {}, dosyaCal: () => false,
      sentezCal: (id) => { caldi.push(id); },
    };
    const katalog = { ...KAT2_SES_KATALOG, coin: SES_KATALOG.coin } as never;
    const motor = sesMotoruKur<Kat2CalId>(uc, true, 1, katalog);
    motor.kilidiAc();
    const coz = kat2SesBaslat({ motor, saat: () => (t += 1), rastgele: () => 0, duraklatildi: opts.duraklatildi });
    return { caldi, coz };
  }
  /** Kat 2 dünyasına bir para yığını koyup sonra topatır (iki store güncellemesi). */
  function paraTopla(kat: 1 | 2, ses = true) {
    const s = useGame.getState();
    const d = s.kat2Dunya;
    useGame.setState({ kat, settings: { ...s.settings, sound: ses }, kat2Dunya: { ...d, paralar: [{ id: 99, x: 0, z: 0, miktar: 5 }], nextId: 100 } });
    useGame.setState({ kat2Dunya: { ...useGame.getState().kat2Dunya, paralar: [] } });
  }

  it('Kat 2de para toplanınca coin çalar', () => {
    const { caldi, coz } = kur();
    paraTopla(2);
    coz();
    expect(caldi).toContain('coin');
  });
  it("Kat 1'deyken çalmaz", () => {
    const { caldi, coz } = kur();
    paraTopla(1);
    coz();
    expect(caldi).toEqual([]);
  });
  it('sessiz kipte çalmaz', () => {
    const { caldi, coz } = kur();
    paraTopla(2, false);
    coz();
    expect(caldi).toEqual([]);
  });
  it('arka planda (duraklatıldı) çalmaz', () => {
    const { caldi, coz } = kur({ duraklatildi: () => true });
    paraTopla(2);
    coz();
    expect(caldi).toEqual([]);
  });
});

describe('katalog: her yeni ses için iki çalınabilir aday', () => {
  const idsiz = Object.keys(KAT2_SES_ADAYLARI) as Kat2SesId[];
  it('sekiz yeni ses; oyuna kullanıcının seçtiği aday bağlı (D-195: takırtı + ilk çıkış Aday 2)', () => {
    expect(idsiz).toHaveLength(8);
    for (const id of idsiz) {
      expect(KAT2_SECIM[id]).toBe(id === 'k2takirti' || id === 'k2yeniKat' ? 1 : 0);
      expect(KAT2_SES_KATALOG[id]).toBe(KAT2_SES_ADAYLARI[id].adaylar[KAT2_SECIM[id]]);
    }
  });
  for (const id of idsiz) {
    it(`${id}: iki aday farklı, sonlu, kırpılmasız, kısa`, () => {
      const [a, b] = KAT2_SES_ADAYLARI[id].adaylar;
      expect(JSON.stringify(a.katmanlar)).not.toBe(JSON.stringify(b.katmanlar));
      for (const aday of [a, b]) {
        const pcm = seslendir(aday.katmanlar);
        let tepe = 0;
        for (const v of pcm) { expect(Number.isFinite(v)).toBe(true); tepe = Math.max(tepe, Math.abs(v)); }
        expect(tepe).toBeGreaterThan(0.005);
        expect(tepe).toBeLessThan(0.5); // kulak yormaz: Kat 1'in en yüksek tepesinin bandında
        expect(sesSuresi(aday.katmanlar)).toBeLessThan(1.5);
        expect(aday.aralik).toBeGreaterThan(0);
      }
    });
  }
});
