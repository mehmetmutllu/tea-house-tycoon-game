/**
 * D-202 bekçisi — bulaşıkçı yıkama kuralı (`docs/bulasikci-raporu.md`): kapasite dolunca ya da toplanacak kalmayınca gider;
 * TEMİZ bardak 2'ye inince elindekini hemen götürür. Kat 1 (`tick.dishwasherSystem`) ve Kat 2 (`kat2Dongu.bulasikciAdim`)
 * aynı fonksiyonu okur.
 */
import { describe, expect, it } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { yikamayaGit } from '../src/game/rules';
import { KAT2_BULASIKCI_PAD } from '../src/game/kat';
import { kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Girdi } from '../src/game/kat2Dongu';

describe('config = karar D-202 (B: temiz ≤ 2 olunca götür)', () => {
  it('yikamaKurali = { temizEnFazla: 2 }', () => {
    expect(C.dishwasher.yikamaKurali).toEqual({ temizEnFazla: 2 });
  });
});

describe('yikamayaGit', () => {
  it('elinde yoksa gitmez', () => expect(yikamayaGit(0, 8, 5, 0)).toBe(false));
  it('kapasite dolunca gider', () => expect(yikamayaGit(8, 8, 5, 30)).toBe(true));
  it('toplanacak kalmayınca gider', () => expect(yikamayaGit(1, 8, 0, 30)).toBe(true));
  it('temiz bolken dolmadan gitmez (taşıma yükseltmesi anlamlı kalır)', () => expect(yikamayaGit(5, 8, 5, 3)).toBe(false));
  it('temiz 2ye inince elindekini götürür', () => expect(yikamayaGit(1, 8, 5, 2)).toBe(true));
  it('temiz 0da götürür', () => expect(yikamayaGit(3, 8, 5, 0)).toBe(true));
});

describe('Kat 2 bulaşıkçısı aynı kuralı okur', () => {
  it('temiz fincan yokken elinde tek kirli bile olsa yıkamaya yönelir', () => {
    const a = C.kat2 as Kat2Ayar;
    const pads = a.padler.slice(0, a.padler.findIndex((p) => p.id === KAT2_BULASIKCI_PAD) + 1).map((p) => p.id);
    const d0 = yeniKat2Dunya(['k2okey2', 'k2cezve', ...pads], a);
    const kirliMasa = d0.masalar.find((m) => m.durum !== 'kapali')!;
    const ilk = { ...d0, temiz: 0, havuzToplam: 1e9, masalar: d0.masalar.map((m) => (m.id === kirliMasa.id ? { ...m, kirli: 3 } : m)), bulasikci: { x: -10.3, z: -7.6, kirli: 1 } };
    const g: Kat2Girdi = { x: 0, z: -14, durdu: false, cuzdan: 0, tepsiKap: 6 } as Kat2Girdi;
    const { dunya } = kat2Tick(ilk, { ...g, padsDone: ['k2okey2', 'k2cezve', ...pads] } as Kat2Girdi, 0.1, a);
    const b = dunya.bulasikci!;
    // yıkama yeri (−10,3 · BAND.front + 0,6) ön tezgâhta, ev noktasının hemen arkasında (−z yönü)
    expect(b.z).toBeLessThan(-7.6);
  });
});
