/**
 * s5-ux2.test.ts — G-120 (M1 + M2) görev arayüzünün bekçisi + G-128 metni.
 *
 *   M1 · kart: "GÖREV n/N", ilerleme yüzdesi (kelepçeli), ödül, sırada = sonraki 2 (yükseltme işaretli).
 *   M2 · sekme: aktif ÖNCE → sıradaki 3 → tamamlananlar (yeniden eskiye) → günlük EN ALTTA (tek satır).
 *   Kat 1 ve Kat 2 aynı bileşen (HUD her iki bandı `GorevKarti` ile çizer).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { economyConfig } from '../src/config/economy.config';
import { en } from '../src/i18n/en';
import {
  KART_SIRADA,
  SEKME_SIRADA,
  gunlukOzeti,
  kartVerisi,
  kat1Hat,
  kat2Hat,
  sekmeDuzeni,
  siradakiler,
  type HatGorevi,
} from '../src/components/ui/gorevPano';

const g = (id: string, yukseltme = false, reward: number | null = 10): HatGorevi => ({ id, title: id, reward, yukseltme });
const HAT = [g('a'), g('b'), g('c', true), g('d'), g('e'), g('f')];

describe('G-120 M1 · kart verisi', () => {
  it('sıra numarası, toplam, ilerleme yüzdesi ve ödül görevin kendisinden', () => {
    const v = kartVerisi({ id: 'b', cur: 6, total: 10, reward: 1350 }, HAT);
    expect(v.no).toBe(2);
    expect(v.toplam).toBe(6);
    expect(v.yuzde).toBe(60);
    expect(v.cur).toBe(6);
    expect(v.total).toBe(10);
    expect(v.reward).toBe(1350);
  });
  it('sayaç taşarsa çubuk %100\'de kalır; sayaçsız görevde çubuk yok', () => {
    expect(kartVerisi({ id: 'a', cur: 14, total: 10, reward: 1 }, HAT).yuzde).toBe(100);
    expect(kartVerisi({ id: 'a', cur: 14, total: 10, reward: 1 }, HAT).cur).toBe(10);
    const pad = kartVerisi({ id: 'a', cur: null, total: null, reward: 5 }, HAT);
    expect(pad.yuzde).toBeNull();
    expect(pad.cur).toBeNull();
  });
  it('sırada = aktiften SONRAKİ iki adım, yükseltme işaretiyle', () => {
    const v = kartVerisi({ id: 'b', cur: 0, total: 3, reward: 1 }, HAT);
    expect(KART_SIRADA).toBe(2);
    expect(v.sirada.map((x) => x.id)).toEqual(['c', 'd']);
    expect(v.sirada[0].yukseltme).toBe(true);
    expect(kartVerisi({ id: 'f', cur: null, total: null, reward: 1 }, HAT).sirada).toEqual([]);
  });
  it('hatta olmayan görev (geçiş anı) numarasız, sırasız', () => {
    const v = kartVerisi({ id: 'yok', cur: null, total: null, reward: 1 }, HAT);
    expect(v.no).toBeNull();
    expect(v.sirada).toEqual([]);
  });
});

describe('G-120 M2 · sekme düzeni', () => {
  it('aktif önce, sonraki 3, tamamlananlar, günlük EN ALTTA', () => {
    const d = sekmeDuzeni(HAT, 'b', 1);
    expect(d.map((b) => b.tur)).toEqual(['aktif', 'sirada', 'tamamlanan', 'gunluk']);
    const sira = d[1];
    expect(sira.tur === 'sirada' && sira.gorevler.map((x) => x.id)).toEqual(['c', 'd', 'e']);
    expect(SEKME_SIRADA).toBe(3);
  });
  it('tamamlananlar yeniden eskiye; ilk görevde tamamlanan bölümü yok', () => {
    const d = sekmeDuzeni(HAT, 'd', 3);
    const t = d.find((b) => b.tur === 'tamamlanan');
    expect(t && t.tur === 'tamamlanan' && t.gorevler.map((x) => x.id)).toEqual(['c', 'b', 'a']);
    expect(sekmeDuzeni(HAT, 'a', 0).map((b) => b.tur)).toEqual(['aktif', 'sirada', 'gunluk']);
  });
  it('hat sonunda "bitti" önce, günlük yine en altta; son görevde sırada yok', () => {
    expect(sekmeDuzeni(HAT, null, 6).map((b) => b.tur)).toEqual(['bitti', 'tamamlanan', 'gunluk']);
    expect(sekmeDuzeni(HAT, 'f', 5).map((b) => b.tur)).toEqual(['aktif', 'tamamlanan', 'gunluk']);
  });
  it('günlük özeti: kaç görev, kaçı hazır, hepsi alındı mı', () => {
    expect(gunlukOzeti([{ state: 'progress' }, { state: 'claimable' }, { state: 'claimed' }])).toEqual({ toplam: 3, hazir: 1, bitti: false });
    expect(gunlukOzeti([{ state: 'claimed' }, { state: 'claimed' }]).bitti).toBe(true);
    expect(gunlukOzeti([]).bitti).toBe(false);
  });
  it('siradakiler hat dışına taşmaz', () => {
    expect(siradakiler(HAT, 'e', 3).map((x) => x.id)).toEqual(['f']);
  });
});

describe('G-120 · gerçek hatlar', () => {
  it('Kat 1: seviye görevleri yükseltme durağı, pad/sayaç görevleri değil', () => {
    const h = kat1Hat(economyConfig.quests);
    expect(h).toHaveLength(economyConfig.quests.length);
    for (const [i, q] of economyConfig.quests.entries()) {
      const seviye = ['stationLevel', 'tableLevel', 'tablesAtLevel', 'waiterSpeed', 'waiterTray', 'charStat', 'lavaboLevel'].includes(q.target.type);
      expect(h[i].yukseltme, q.id).toBe(seviye);
    }
    expect(h.some((x) => x.yukseltme)).toBe(true);
  });
  it('Kat 2: yalnız masa Sv görevi yükseltme', () => {
    const h = kat2Hat(economyConfig.kat2Gorevler);
    for (const [i, d] of economyConfig.kat2Gorevler.entries()) expect(h[i].yukseltme, d.id).toBe(d.hedef.tip === 'masaSv');
  });
});

describe('G-120 · HUD bağlantısı (Kat 1 = Kat 2 bileşeni)', () => {
  const hud = readFileSync('src/components/ui/HUD.tsx', 'utf8');
  it('iki katın bandı da GorevKarti; sekme sekmeDuzeni ile dizilir', () => {
    expect(hud.match(/<GorevKarti\b/g)?.length).toBe(3); // Kat 2 kutlama · Kat 2 görev · Kat 1 görev
    expect(hud).toMatch(/testid="quest"\s/);
    expect(hud).toMatch(/testid="kat-bandi"\s/);
    expect(hud).toMatch(/const duzen = sekmeDuzeni\(hat, aktifId, hatIdx\)/);
    expect(hud).toMatch(/\{duzen\.map\(bolum\)\}/);
  });
  it('kart üstündekileri (sağ yığın, bildirim, ipucu) kartın boyuyla kaldırır', () => {
    const css = readFileSync('src/components/ui/hud.css', 'utf8');
    expect(css.match(/var\(--bant-ek, 0px\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(readFileSync('src/components/ui/GorevKarti.tsx', 'utf8')).toMatch(/setProperty\('--bant-ek'/);
  });
});

describe('G-128 · kahve görevi metni garsonu da söyler (TR + EN)', () => {
  it('garson tutulduktan SONRAKİ çoklu kahve görevi "Garsonlarınla" der; öncesindeki (garson yokken) demez', () => {
    const hat = economyConfig.kat2Gorevler;
    const garsonIdx = hat.findIndex((d) => d.id === 'k2_garson');
    const coklu = hat
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.hedef.tip === 'sayac' && d.hedef.sayac === 'servis' && d.hedef.adet > 1);
    const sonra = coklu.filter(({ i }) => i > garsonIdx);
    expect(sonra.length).toBeGreaterThan(0);
    for (const { d, i } of coklu) {
      const ister = i > garsonIdx;
      expect(/^Garsonlarınla /.test(d.title), d.id).toBe(ister);
      expect(/with your servers$/.test(en[d.title] ?? ''), d.id).toBe(ister);
    }
  });
});
