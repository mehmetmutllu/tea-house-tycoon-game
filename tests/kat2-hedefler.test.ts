/**
 * kat2-hedefler.test.ts — D-205 BEKÇİSİ: Hedefler'in "Mekân" ve "Usta" metrikleri + KÜNYE Kat 2'yi de sayar
 * (kullanıcı 2026-11-18: "kat1de olan 2de de olsun" + "eklemek mantıklıysa ekle"). Ölçüm: `docs/kat2-hedefler-raporu.md`.
 *
 * 1) Mekân: merdiven pad'i (ücretli; Kat 1 `padsDone`unda yok) + Kat 2'nin ücretli pad'leri; `kat2.hazir` sayılmaz
 *    (Kat 1'in bedava başlangıç masası da sayılmıyor). Kat 2 kapalıyken 0.
 * 2) Usta: Sv tavanındaki AÇIK Kat 2 masası (hazır masa dahil); store'un `claimGoal`u bunu görür.
 * 3) KÜNYE: Kat 2 açıksa Kat 2 satırları (servis · yıkama · açılan nokta) TR+EN; Hedefler paneli `kat2`yi geçirir.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { economyConfig as C } from '../src/config/economy.config';
import { goalMetricsOf, kat2AcilanPad, kat2UstaMasa, tableSoftMaxLevel, useGame } from '../src/game/store';
import { D } from '../src/game/decimal';
import { defaultStats } from '../src/game/save';
import { KAT2_MASALAR, KAT2_SV_MAX } from '../src/game/kat';
import { goalCategories } from '../src/game/goals';
import { en } from '../src/i18n/en';
import { seedRandom } from '../tools/olcum-lib';

const HAZIR: readonly string[] = C.kat2.hazir;
const UCRETLI = C.kat2.padler.map((p) => p.id);
const HAZIR_MASA = KAT2_MASALAR.find((m) => HAZIR.includes(m.id))!;
const UCRETLI_MASA = KAT2_MASALAR.filter((m) => UCRETLI.includes(m.id));
const bos = { stats: defaultStats(), padsDone: [] as string[], lifetime: D(0), tableLevels: [] as number[], tables: 0 };
const kat2 = (padsDone: string[], masaSv: Record<string, number> = {}, acik = true) => ({ acik, padsDone, masaSv });

describe('1 · Mekân — merdiven + ücretli Kat 2 pad\'i, hazır hariç', () => {
  it('Kat 2 kapalı → 0; yalnız açık (hazırlar) → 1 (merdiven)', () => {
    expect(kat2AcilanPad(undefined)).toBe(0);
    expect(kat2AcilanPad(kat2([], {}, false))).toBe(0);
    expect(kat2AcilanPad(kat2([...HAZIR]))).toBe(1);
  });

  it('ücretli pad sayılır, hazır sayılmaz; goalMetricsOf Kat 1 pad\'ine ekler', () => {
    const pads = [...HAZIR, ...UCRETLI.slice(0, 5)];
    expect(kat2AcilanPad(kat2(pads))).toBe(6);
    const k1 = C.pads.slice(0, 7).map((p) => p.id);
    expect(goalMetricsOf({ ...bos, padsDone: k1, kat2: kat2(pads) }).pads).toBe(7 + 6);
    expect(goalMetricsOf({ ...bos, padsDone: k1 }).pads).toBe(7);
  });

  it('bütün Kat 2 açık → Kat 1 pad + 1 + ücretli zincir', () => {
    const m = goalMetricsOf({ ...bos, padsDone: C.pads.map((p) => p.id), kat2: kat2([...HAZIR, ...UCRETLI]) });
    expect(m.pads).toBe(C.pads.length + 1 + UCRETLI.length);
  });
});

describe('2 · Usta — Sv tavanındaki açık Kat 2 masası', () => {
  it('Sv5 sayılır, Sv4 sayılmaz, açık olmayan masa sayılmaz, hazır masa sayılır', () => {
    const [a, b, c] = UCRETLI_MASA;
    const sv = { [a.id]: KAT2_SV_MAX, [b.id]: KAT2_SV_MAX - 1, [c.id]: KAT2_SV_MAX, [HAZIR_MASA.id]: KAT2_SV_MAX };
    expect(kat2UstaMasa(kat2([...HAZIR, a.id, b.id], sv))).toBe(2);
    expect(kat2UstaMasa(kat2([...HAZIR, a.id, b.id], sv, false))).toBe(0);
  });

  it('goalMetricsOf Kat 1 tavan masasına ekler', () => {
    const [a] = UCRETLI_MASA;
    const m = goalMetricsOf({
      ...bos,
      tableLevels: [tableSoftMaxLevel(), tableSoftMaxLevel(), 0],
      tables: 3,
      kat2: kat2([...HAZIR, a.id], { [a.id]: KAT2_SV_MAX }),
    });
    expect(m.masterTables).toBe(3);
  });

  it('oyunda: yalnız Kat 2 masası Sv5 iken "Usta" 1. kademe toplanır', () => {
    const mem: Record<string, string> = {};
    const gl = globalThis as Record<string, unknown>;
    const orig = gl.localStorage;
    gl.localStorage = { getItem: (k: string) => (k in mem ? mem[k] : null), setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
    const rnd = Math.random;
    seedRandom(5);
    try {
      const g = () => useGame.getState();
      g().hardReset();
      g().kat2Ac();
      const usta = goalCategories().find((k) => k.metric === 'masterTables')!;
      expect(g().claimGoal(`${usta.id}:0`)).toBe(false);
      useGame.setState({ kat2: { ...g().kat2, masaSv: { ...g().kat2.masaSv, [HAZIR_MASA.id]: KAT2_SV_MAX } } });
      expect(g().claimGoal(`${usta.id}:0`)).toBe(true);
    } finally {
      Math.random = rnd;
      if (orig === undefined) delete gl.localStorage; else gl.localStorage = orig;
    }
  });
});

describe('3 · KÜNYE + Hedefler paneli', () => {
  const HUD = readFileSync('src/components/ui/HUD.tsx', 'utf8');
  const SATIRLAR = ['Kat 2 · servis edilen kahve', 'Kat 2 · yıkanan fincan', 'Kat 2 · açılan nokta'];

  it('Kat 2 satırları KÜNYE içinde, Kat 2 açıkken, TR+EN', () => {
    const k = HUD.slice(HUD.indexOf('data-testid="kunye"'), HUD.indexOf('<PlayGamesBolumu'));
    expect(k).toMatch(/kat2Kayit\.acik &&/);
    for (const s of SATIRLAR) {
      expect(k).toContain(`t('${s}')`);
      expect(en[s]).toBeTruthy();
    }
    expect(k).toMatch(/kat2AcilanPad\(kat2Kayit\)/);
    expect(k).toMatch(/stats\.kat2Elle.*stats\.kat2Garson/);
    expect(k).toMatch(/stats\.kat2Yikanan/);
  });

  it('Hedefler paneli goalMetricsOf\'a kat2\'yi geçirir', () => {
    expect(HUD).toMatch(/goalMetricsOf\(\{[^}]*\bkat2\b[^}]*\}\)/);
  });
});
