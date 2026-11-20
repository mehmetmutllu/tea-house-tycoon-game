/**
 * s5-ux.test.ts — S5 UX BEKÇİSİ (Kat 1 eşitliği; denetim `docs/s5-ux-denetim.md`).
 *  - G-124: Kat 2 yığını Kat 1'in `money.autoCollectAfter` süresinde kendiliğinden toplanır (oyuncu nerede olursa
 *    olsun, Kat 1'de de arkada); elle sayacı artmaz; bildirim Kat 1'in toplu oto-toplama bandından geçer.
 *  - G-104: ilk kahve / ilk bulaşık ipucu oyuncunun yaptığından türer, bir kez yapınca kaybolur.
 *  - G-107: "yeni nokta" = sahnenin çizdiği nokta kümesine eklenen anahtar; ilk ölçüm yeni sayılmaz.
 *  - G-94: tanıtım bandı yalnız geçiş biterken, Kat 2'de, kat henüz boşken.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { KAT2_YIKAMA_YER, OCAKLAR, VARIS } from '../src/game/kat';
import { kat2PadYeri, kat2SiradakiPad, kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Girdi } from '../src/game/kat2Dongu';
import {
  KAT2_IPUCU_METIN, KAT2_TANITIM_METIN, kat2IpucuAdimi, kat2IpucuHedefi, kat2NoktaBildirimi, kat2Noktalar, kat2TanitimAni,
  kat2NoktaTepkisi, kat2YeniNoktalar, type Kat2IpucuGirdi,
} from '../src/game/onboarding';
import { en } from '../src/i18n/en';
import type { Vec3 } from '../src/game/types';

const AYAR = C.kat2 as unknown as Kat2Ayar;
const HAZIR: string[] = [...C.kat2.hazir];
const OTO = C.money.autoCollectAfter;
const girdi = (o: Partial<Kat2Girdi> = {}): Kat2Girdi => ({ x: 0, z: -50, durdu: true, cuzdan: 0, padsDone: HAZIR, tepsiKap: 6, miknatis: 0, ...o });

describe('G-124 · Kat 2 oto-toplama (Kat 1 kuralı)', () => {
  it('Kat 1 kuralı açık ve sayısı Kat 1 config\'inden', () => {
    expect(OTO).toBeGreaterThan(0);
  });
  it('yığın otoTopla sn dolunca kendiliğinden toplanır; öncesinde yerinde; elle sayacı artmaz', () => {
    const d = { ...yeniKat2Dunya(HAZIR, AYAR), paralar: [{ id: 900, x: 3, z: 3, miktar: 40 }] };
    let r = kat2Tick(d, girdi({ otoTopla: OTO }), OTO - 0.5, AYAR);
    expect(r.dunya.paralar.some((p) => p.id === 900)).toBe(true);
    expect(r.otoKazanc).toBe(0);
    r = kat2Tick(r.dunya, girdi({ otoTopla: OTO }), 0.5, AYAR);
    expect(r.dunya.paralar.some((p) => p.id === 900)).toBe(false);
    expect(r.otoKazanc).toBe(40);
    expect(r.kazanc).toBe(0);
    expect(r.olay.toplanan).toBe(0);
  });
  it('otoTopla yoksa (eski çağıran / ölçüm) yığın yerde kalır', () => {
    const d = { ...yeniKat2Dunya(HAZIR, AYAR), paralar: [{ id: 901, x: 3, z: 3, miktar: 40 }] };
    const r = kat2Tick(d, girdi(), OTO * 3, AYAR);
    expect(r.dunya.paralar.some((p) => p.id === 901)).toBe(true);
    expect(r.otoKazanc).toBe(0);
  });

  describe('store', () => {
    const ilk = useGame.getState();
    beforeEach(() => useGame.setState(ilk, true));
    for (const kat of [2, 1] as const) {
      it(`Kat ${kat}'deyken: eski yığın cüzdana girer + Kat 1 toplu bildirimi sayar`, () => {
        useGame.getState().kat2Ac();
        const k2 = useGame.getState().kat2;
        const d = yeniKat2Dunya(k2.padsDone, AYAR);
        useGame.setState({
          kat,
          player: (kat === 2 ? [...VARIS[2]] : [...VARIS[1]]) as Vec3,
          kat2Dunya: { ...d, paralar: [{ id: 950, x: 30, z: 30, miktar: 77, yas: OTO - 0.01 }] },
          autoCollectSum: 0,
        });
        const w0 = useGame.getState().wallet.toNumber();
        useGame.getState().tick(0.05);
        const s = useGame.getState();
        expect(s.kat2Dunya.paralar.some((p) => p.id === 950)).toBe(false);
        expect(s.wallet.toNumber() - w0).toBeGreaterThanOrEqual(77);
        expect(s.autoCollectSum).toBeGreaterThanOrEqual(77);
        expect(s.stats.kat2Para ?? 0).toBe(0);
      });
    }
  });
});

describe('G-104 · Kat 2 ilk ipuçları', () => {
  const ocak = OCAKLAR[0].id;
  const g = (o: Partial<Kat2IpucuGirdi> = {}): Kat2IpucuGirdi => ({
    kat: 2, gecis: false, padsDone: [ocak], tepsi: 0, tepsiKirli: 0, alinan: 0, yikanan: 0, ...o,
  });
  it('hiç kahve almadı + ocak açık → kahve ipucu; bir kez alınca / tepside kahve varken yok', () => {
    expect(kat2IpucuAdimi(g())).toBe('k2-kahve');
    expect(kat2IpucuAdimi(g({ alinan: 1 }))).toBeNull();
    expect(kat2IpucuAdimi(g({ tepsi: 1 }))).toBeNull();
    expect(kat2IpucuAdimi(g({ padsDone: [] }))).toBeNull();
  });
  it('elde kirli + hiç yıkamadı → bulaşık ipucu (kahveden önce); bir kez bırakınca yok', () => {
    expect(kat2IpucuAdimi(g({ tepsiKirli: 2 }))).toBe('k2-bulasik');
    expect(kat2IpucuAdimi(g({ tepsiKirli: 2, alinan: 3, yikanan: 1 }))).toBeNull();
  });
  it('Kat 1\'de ve geçişte ipucu yok', () => {
    expect(kat2IpucuAdimi(g({ kat: 1 }))).toBeNull();
    expect(kat2IpucuAdimi(g({ gecis: true }))).toBeNull();
  });
  it('hedefler: ocağın alma noktası · yıkama yeri', () => {
    expect(kat2IpucuHedefi('k2-kahve', [ocak])).toEqual([OCAKLAR[0].al[0], OCAKLAR[0].al[1]]);
    expect(kat2IpucuHedefi('k2-bulasik', [ocak])).toEqual([KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1]]);
  });
});

describe('G-107 · yeni nokta', () => {
  it('sıradaki pad nokta kümesinde; pad açılınca yerine yenisi → yeni nokta onun yeri', () => {
    const k = { padsDone: HAZIR, masaSv: {}, yuk: {}, gorev: { idx: 0, sayac: {} } };
    const n0 = kat2Noktalar(k, AYAR);
    const p0 = kat2SiradakiPad(AYAR, HAZIR)!;
    expect(n0.get(`pad:${p0.id}`)).toEqual(kat2PadYeri(p0.id));
    const k1 = { ...k, padsDone: [...HAZIR, p0.id] };
    const n1 = kat2Noktalar(k1, AYAR);
    const p1 = kat2SiradakiPad(AYAR, k1.padsDone);
    const yeni = kat2YeniNoktalar(new Set(n0.keys()), n1);
    if (p1) expect(yeni).toEqual([{ anahtar: `pad:${p1.id}`, yer: kat2PadYeri(p1.id) }]);
  });
  it('ilk ölçüm ve değişmeyen küme yeni sayılmaz', () => {
    const n = new Map<string, [number, number]>([['pad:a', [1, 2]]]);
    expect(kat2YeniNoktalar(null, n)).toEqual([]);
    expect(kat2YeniNoktalar(new Set(['pad:a']), n)).toEqual([]);
    expect(kat2YeniNoktalar(new Set(['pad:a', 'sv:b']), n)).toEqual([]);
    expect(kat2NoktaTepkisi([])).toBeNull();
  });
  // Kök neden (canlı 2026-11-20, tools/s5-ux-g107.mjs): k2okey4 tek pad'i İKİ nokta açar (sıradaki pad + ocak
  // yükseltmesi); yalnız ilk yeni noktaya bakılınca ocak bildirimi hiç çıkmıyordu.
  it('tek pad iki nokta açınca (k2okey4 → sıradaki pad + ocak) ocak bildirimi yutulmaz, kamera ocağa', () => {
    const i = AYAR.padler.findIndex((p) => p.id === 'k2okey4');
    const once = [...HAZIR, ...AYAR.padler.slice(0, i).map((p) => p.id)];
    const k = { padsDone: once, masaSv: {}, yuk: {}, gorev: { idx: 5, sayac: {} } };
    const n0 = kat2Noktalar(k, AYAR);
    const n1 = kat2Noktalar({ ...k, padsDone: [...once, 'k2okey4'], gorev: { idx: 6, sayac: {} } }, AYAR);
    const yeniler = kat2YeniNoktalar(new Set(n0.keys()), n1);
    expect(yeniler.map((y) => y.anahtar.split(':')[0]).sort()).toEqual(['ocak', 'pad']);
    const t = kat2NoktaTepkisi(yeniler)!;
    expect(t.bildirimler).toEqual([kat2NoktaBildirimi('ocak:k2ocakYuk')]);
    expect(t.yer).toEqual(n1.get(yeniler.find((y) => y.anahtar.startsWith('ocak:'))!.anahtar));
  });
  it('bildirimsiz tek nokta: kamera ona, bant yok', () => {
    expect(kat2NoktaTepkisi([{ anahtar: 'pad:a', yer: [1, 2] }])).toEqual({ yer: [1, 2], bildirimler: [] });
  });
  it('bildirim yalnız görevin söylemediği ocak yükseltmesinde (Kat 1 reveal: görev kapsıyorsa toast yok)', () => {
    expect(kat2NoktaBildirimi('ocak:k2ocakYuk')).toBeTruthy();
    expect(kat2NoktaBildirimi('pad:k2okey1')).toBeNull();
    expect(kat2NoktaBildirimi('sv:k2okey1')).toBeNull();
  });
});

describe('G-94 · tanıtım bandı anı', () => {
  it('geçiş Kat 2\'de biterken ve kat boşken; yükleme / dolu kat / Kat 1 değil', () => {
    expect(kat2TanitimAni({ kat: 2, gecis: true }, { kat: 2, gecis: false, hazirda: true })).toBe(true);
    expect(kat2TanitimAni(null, { kat: 2, gecis: false, hazirda: true })).toBe(false);
    expect(kat2TanitimAni({ kat: 2, gecis: false }, { kat: 2, gecis: false, hazirda: true })).toBe(false);
    expect(kat2TanitimAni({ kat: 2, gecis: true }, { kat: 2, gecis: false, hazirda: false })).toBe(false);
    expect(kat2TanitimAni({ kat: 1, gecis: true }, { kat: 1, gecis: false, hazirda: true })).toBe(false);
  });
});

describe('yeni metinler TR + EN', () => {
  it('sözlükte', () => {
    for (const m of [KAT2_TANITIM_METIN, ...Object.values(KAT2_IPUCU_METIN), kat2NoktaBildirimi('ocak:x')!]) {
      expect(en[m], m).toBeTruthy();
    }
  });
});
