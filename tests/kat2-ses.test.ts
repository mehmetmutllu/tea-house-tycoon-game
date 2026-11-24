/**
 * kat2-ses.test.ts — KAT 2 SESLERİNİN BEKÇİSİ (S3 · Ajan C). Ses duyulamaz; doğrulanan şey hangi durum
 * farkının hangi sesi doğurduğu, ortam takırtısının sıklık sınırı, Kat 1'deyken / sessiz kipte / arka
 * planda Kat 2 sesinin ÇALMADIĞI ve her sesin iki adayının çalınabilir olduğu.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { sesMotoruKur, SES_KATALOG, type SesArkaUc } from '../src/game/audio';
import { seslendir, sesSuresi } from '../src/game/audioSynth';
import {
  KAT2_SECIM, KAT2_SES_ADAYLARI, KAT2_SES_KATALOG, PARA_ZINCIR, type Kat2SesId,
} from '../src/game/audioKat2';
import {
  kat2SesBaslat, kat2SesOlaylari, paraZinciriEkle, toplananYigin, yeniBellek, type Kat2CalId, type Kat2SesKesit,
} from '../src/game/kat2Ses';
import { OCAKLAR } from '../src/game/kat';
import { yeniKat2Dunya, type Kat2Ayar } from '../src/game/kat2Dongu';
import { economyConfig } from '../src/config/economy.config';
import { useGame } from '../src/game/store';

const TABAN: Kat2SesKesit = {
  kat: 2, gecis: false, acik: true, hazirda: false, padSayisi: 3, acikAlan: 1, svToplam: 0, yukToplam: 0, gorevIdx: 0,
  nextId: 10, tepsi: 2, birikimToplam: 0, istekToplam: 2, paraToplanan: 4, ocakHazir: [1, 0],
  x: 0, z: 0,
};
const ile = (y: Partial<Kat2SesKesit>): Kat2SesKesit => ({ ...TABAN, ...y });
const idler = (a: Kat2SesKesit | null, b: Kat2SesKesit) => kat2SesOlaylari(a, b, yeniBellek()).map((e) => e.id);

describe('durum farkı → doğru ses kimliği', () => {
  it('ilk kare sessiz', () => {
    expect(idler(null, TABAN)).toEqual([]);
  });
  const vakalar: [string, Partial<Kat2SesKesit>, Kat2CalId][] = [
    ['para yığını toplandı → Kat 1 coin', { paraToplanan: 5 }, 'coin'],
    ['tepsi azaldı + masa kahve aldı → Kat 1 serve', { tepsi: 1, birikimToplam: 30, istekToplam: 1 }, 'serve'],
    ['tepsi arttı → Kat 1 pour', { tepsi: 3 }, 'pour'],
    ['pad açıldı → Kat 1 padFill', { padSayisi: 4 }, 'padFill'],
    ['açık alan arttı → duvar', { acikAlan: 2, padSayisi: 4 }, 'k2duvar'],
    ['masa Sv toplamı arttı → sv', { svToplam: 1 }, 'k2sv'],
    ['ocak hazır arttı → cezve', { ocakHazir: [2, 0], x: OCAKLAR[0].al[0], z: OCAKLAR[0].al[1] }, 'k2cezve'],
    ['geçiş başladı → merdiven', { gecis: true }, 'k2merdiven'],
    ['S5: ocak/lavabo yükseltmesi → Kat 1 purchase', { yukToplam: 1 }, 'purchase'],
    ['S5: Kat 2 görevi bitti → Kat 1 quest', { gorevIdx: 1 }, 'quest'],
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
    expect(idler(TABAN, ile({ nextId: 1, paraToplanan: 5, tepsi: 0, birikimToplam: 9 }))).toEqual([]);
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
    const b = ile({ kat: 1, paraToplanan: 9, tepsi: 1, birikimToplam: 9, padSayisi: 5, acikAlan: 3, svToplam: 4, ocakHazir: [3, 3], yukToplam: 2, gorevIdx: 3 });
    expect(idler(a, b)).toEqual([]);
  });
});

describe('G-106 · para zinciri (Kat 1 "tık tık")', () => {
  it('toplanan yığın sayısı: elle toplama sayacının artışı (oto-toplama sessiz); Kat 1de / dünya yeniden kurulunca 0', () => {
    expect(toplananYigin(TABAN, ile({ paraToplanan: 6 }))).toBe(2);
    expect(toplananYigin(TABAN, ile({ paraToplanan: 5 }))).toBe(1);
    expect(toplananYigin(ile({ kat: 1 }), ile({ kat: 1, paraToplanan: 9 }))).toBe(0);
    expect(toplananYigin(TABAN, ile({ nextId: 1, paraToplanan: 9 }))).toBe(0);
  });
  it('bir yığın = adet tık, ilki hemen, aralık sabit; sürerken gelen yığın arkaya eklenir', () => {
    const z = paraZinciriEkle([], 10, 1);
    expect(z).toHaveLength(PARA_ZINCIR.adet);
    expect(z[0]).toBeCloseTo(10);
    for (let i = 1; i < z.length; i++) expect(z[i] - z[i - 1]).toBeCloseTo(PARA_ZINCIR.aralik);
    const iki = paraZinciriEkle(z, 10.05, 1);
    expect(iki).toHaveLength(2 * PARA_ZINCIR.adet);
    expect(iki[PARA_ZINCIR.adet] - z[z.length - 1]).toBeCloseTo(PARA_ZINCIR.aralik);
  });
  it('ritim Kat 1 coin serisiyle uyumlu: kelepçeden uzun, seri penceresinden kısa', () => {
    expect(PARA_ZINCIR.aralik).toBeGreaterThan(SES_KATALOG.coin.aralik);
    expect(PARA_ZINCIR.aralik).toBeLessThan(SES_KATALOG.coin.seri!.pencere);
    expect(PARA_ZINCIR.adet).toBeGreaterThan(1);
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
    const coz = kat2SesBaslat({ motor, saat: () => t, duraklatildi: opts.duraklatildi });
    return { caldi, coz, ileri: (dt: number) => { t += dt; } };
  }
  /** Kat 2 dünyasına bir para yığını koyup sonra oyuncuya topatır (iki store güncellemesi; elle toplama sayacı +1). */
  function paraTopla(kat: 1 | 2, ses = true, elle = true) {
    const s = useGame.getState();
    const d = s.kat2Dunya;
    useGame.setState({ kat, settings: { ...s.settings, sound: ses }, kat2Dunya: { ...d, paralar: [{ id: 99, x: 0, z: 0, miktar: 5 }], nextId: 100 } });
    const st = useGame.getState().stats;
    useGame.setState({
      kat2Dunya: { ...useGame.getState().kat2Dunya, paralar: [] },
      stats: elle ? { ...st, kat2Para: (st.kat2Para ?? 0) + 1 } : st,
    });
  }
  it('G-124: oto-toplanan yığın (elle sayacı artmadan kaybolan) sessiz — Kat 1 kuralı', () => {
    const { caldi, coz } = kur();
    paraTopla(2, true, false);
    coz();
    expect(caldi).not.toContain('coin');
  });

  it('Kat 2de para toplanınca coin çalar', () => {
    const { caldi, coz } = kur();
    paraTopla(2);
    coz();
    expect(caldi).toContain('coin');
  });
  it('G-106: tek yığın, sonraki karelerde adet kadar tık (zincir) çalar', () => {
    const { caldi, coz, ileri } = kur();
    paraTopla(2);
    for (let i = 0; i < 30; i++) {
      ileri(1 / 60);
      useGame.setState({ wallet: useGame.getState().wallet });
      useGame.setState({ nextId: useGame.getState().nextId + 1 });
    }
    coz();
    expect(caldi.filter((id) => id === 'coin')).toHaveLength(PARA_ZINCIR.adet);
  });
  it('G-125: oynayan masalar varken uzun süre ortam sesi (takırtı/zar) ÇALMAZ', () => {
    const { caldi, coz, ileri } = kur();
    const d = yeniKat2Dunya([...economyConfig.kat2.hazir], economyConfig.kat2 as unknown as Kat2Ayar);
    const masalar = d.masalar.map((m) => ({ ...m, durum: 'oyunda' as const }));
    expect(masalar.length).toBeGreaterThan(0);
    useGame.setState({ kat: 2, kat2Dunya: { ...d, masalar } });
    for (let i = 0; i < 600; i++) {
      ileri(0.1);
      useGame.setState({ nextId: useGame.getState().nextId + 1 });
    }
    coz();
    expect(caldi.filter((id) => id === 'k2takirti' || id === 'k2zar')).toEqual([]);
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
  it('yedi yeni ses (D-198: kasa sesi kasayla kalktı); oyuna kullanıcının seçtiği aday bağlı (D-195: takırtı + ilk çıkış Aday 2)', () => {
    expect(idsiz).toHaveLength(7);
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
