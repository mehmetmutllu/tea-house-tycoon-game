/**
 * S5 GORSEL-B bekçisi — G-112 (Kat 1 mutfak zemini = Kat 2 mutfağının koyu kahve-krem daması) ve
 * G-124 (Kat 2'de kendiliğinden toplanan yığın oyuncuya uçmaz, "+X" yazmaz). G-127 (bakır leğen) `esya-s5.test.ts`te.
 * Notlar: `docs/sprintler/s5-gb-notlar.md`.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { ZEMIN_NATIVE, ZEMIN_TEMALARI, temaNative, zeminEsleme } from '../src/components/three/kitchenLook';
import { otoToplandi } from '../src/components/three/kat2/Para';
import { kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Girdi, type ParaYigini } from '../src/game/kat2Dongu';
import { defaultSave, loadSave, SAVE_VERSION } from '../src/game/save';

const oku = (y: string) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const yorumsuz = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('G-112 · Kat 1 mutfağının ücretsiz zemini = Kat 2 mutfağı', () => {
  const kat2Zemin = /const KAT2_ZEMIN = '(\w+)'/.exec(oku('src/components/three/kat2/Mutfak.tsx'))?.[1] ?? '';

  it('ücretsiz tema (klasik) Kat 2 mutfağının gözlerini kullanır; siyah-beyaz değil', () => {
    const k = ZEMIN_TEMALARI.klasik;
    const k2 = ZEMIN_TEMALARI[kat2Zemin];
    expect(k2).toBeDefined();
    expect([k.koyu, k.acik]).toEqual([k2.koyu, k2.acik]);
    expect(k.swatch).toEqual(['#6b5d53', '#e8ceb4']);
    expect(temaNative('klasik')).toBe(false); // paketin siyah-beyazı değil → göz taşınır
    expect(zeminEsleme('klasik')).toEqual([[ZEMIN_NATIVE.koyu, k.koyu], [ZEMIN_NATIVE.acik, k.acik]]);
  });

  it('varsayılan kayıt ve mağazanın ücretsiz teması aynı kimlik; satılan tema ondan ayrı görünür', () => {
    const ucretsiz = C.cosmetics.kitchenThemes.find((t) => t.cost === 0)!;
    expect(defaultSave().kitchenTheme).toBe(ucretsiz.id);
    expect(ucretsiz.id).toBe('klasik');
    for (const t of C.cosmetics.kitchenThemes) expect(ZEMIN_TEMALARI[t.id], t.id).toBeDefined();
    const kahve = ZEMIN_TEMALARI.kahve;
    expect([kahve.koyu, kahve.acik]).not.toEqual([ZEMIN_TEMALARI.klasik.koyu, ZEMIN_TEMALARI.klasik.acik]);
    // Eski siyah-beyaz kaybolmadı: paketin doğal hâli olarak tanımlı (mağazaya konması ayrı karar).
    expect(temaNative('siyahBeyaz')).toBe(true);
  });

  it('mağaza küçük resmi temanın gözleriyle çizilir (klasik artık "doğal" sayılmaz)', () => {
    const kod = yorumsuz(oku('tools/kucuk-resim.tsx'));
    expect(kod).toMatch(/temaNative\(temaId\) \? undefined : zeminEsleme\(temaId\)/);
    expect(kod).not.toMatch(/temaId === 'klasik'/);
  });

  it('eski kayıt: "klasik" kalır (göç yok), satın alınmış Kahve Dama korunur', () => {
    const KEY = 'kiraathane.save';
    const mem: Record<string, string> = {
      [KEY]: JSON.stringify({ ...defaultSave(), kitchenTheme: 'kahve', ownedCosmetics: ['kitchen:kahve'], wallet: '777', lastSaved: Date.now() }),
    };
    const g = globalThis as Record<string, unknown>;
    const orig = g.localStorage;
    g.localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
    try {
      const s = loadSave();
      expect(s.saveVersion).toBe(SAVE_VERSION);
      expect(s.kitchenTheme).toBe('kahve');
      expect(s.ownedCosmetics).toContain('kitchen:kahve');
      expect(s.wallet).toBe('777');
      mem[KEY] = JSON.stringify({ ...defaultSave(), kitchenTheme: 'klasik', lastSaved: Date.now() });
      expect(loadSave().kitchenTheme).toBe('klasik');
    } finally {
      if (orig === undefined) delete g.localStorage; else g.localStorage = orig;
    }
  });
});

describe('G-124 · oto-toplanan yığın uçmaz; elle toplanan uçar', () => {
  const AYAR = C.kat2 as unknown as Kat2Ayar;
  const HAZIR: string[] = [...C.kat2.hazir];
  const OTO = C.money.autoCollectAfter;
  const M = 2.6;
  const girdi = (o: Partial<Kat2Girdi> = {}): Kat2Girdi => ({ x: 0, z: -50, durdu: true, cuzdan: 0, padsDone: HAZIR, tepsiKap: 6, miknatis: M, otoTopla: OTO, ...o });

  it('kat2Dongu ile sözleşme: oto çıkan yığının son yaşı ≥ otoTopla → otoToplandi', () => {
    const y: ParaYigini = { id: 900, x: 3, z: 3, miktar: 40 };
    const r = kat2Tick({ ...yeniKat2Dunya(HAZIR, AYAR), paralar: [y] }, girdi(), OTO + 0.1, AYAR);
    expect(r.dunya.paralar).toHaveLength(0);
    expect(r.otoKazanc).toBe(40);
    // Döngü yığın nesnesini yerinde günceller: bileşenin tuttuğu referans son yaşı görür.
    expect(otoToplandi(y, [0, 0, -50], M, OTO)).toBe(true);
    // Oyuncu mıknatısın hemen dışında beklerken oto toplandıysa uzaklık karar veremez; yaş verir.
    const yakin: ParaYigini = { id: 902, x: 3, z: 3, miktar: 40 };
    const r2 = kat2Tick({ ...yeniKat2Dunya(HAZIR, AYAR), paralar: [yakin] }, girdi({ x: 3 + M + 0.5, z: 3 }), OTO + 0.1, AYAR);
    expect(r2.otoKazanc).toBe(40);
    expect(otoToplandi(yakin, [3 + M + 0.5, 0, 3], M, OTO)).toBe(true);
  });

  it('elle toplama (oyuncu mıknatıs yarıçapında) → otoToplandi değil', () => {
    const y: ParaYigini = { id: 901, x: 3, z: 3, miktar: 40, yas: OTO - 5 };
    const r = kat2Tick({ ...yeniKat2Dunya(HAZIR, AYAR), paralar: [y] }, girdi({ x: 3.5, z: 3.2 }), 1, AYAR);
    expect(r.kazanc).toBe(40);
    expect(r.otoKazanc).toBe(0);
    expect(otoToplandi(y, [3.5, 0, 3.2], M, OTO)).toBe(false);
    // Tick ile efekt arasında birkaç adım yürümüş oyuncu yine elle sayılır.
    expect(otoToplandi(y, [3 + M + 0.6, 0, 3], M, OTO)).toBe(false);
  });

  it('yaş bayatsa (nesne kopyalanmış) yedek: oyuncu uzaktaysa oto', () => {
    expect(otoToplandi({ x: 3, z: 3, yas: 0 }, [20, 0, 20], M, OTO)).toBe(true);
  });

  it('Para.tsx: oto dalı uçuş ve yazıdan ÖNCE ayrılır (sönen yığın), elle dalı uçar', () => {
    const kod = yorumsuz(oku('src/components/three/kat2/Para.tsx'));
    const dal = /if \(otoToplandi\(p, pl, miknatis, economyConfig\.money\.autoCollectAfter\)\) \{([\s\S]*?)\}\s*toplam \+= p\.miktar;\s*ucuslar\.current\.push/.exec(kod);
    expect(dal).not.toBeNull();
    expect(dal![1]).toMatch(/continue;/);
    expect(dal![1]).not.toMatch(/ucuslar|setYazilar|toplam/);
    expect(kod).toMatch(/<SonenYigin /);
  });
});
