import { describe, expect, it } from 'vitest';
import { LAYOUT, activeSolids, hitsSolid, oyuncuKatilari } from '../src/game/layout';
import { tableWidth } from '../src/components/three/tableLook';
import { economyConfig } from '../src/config/economy.config';

// Kullanıcı 2026-11-12: "masaların köşelerinden dışarıda kalan bir alan var, oraya çarpıyorum".
// Oyuncunun çarptığı masa kutusu, masanın O SEVİYEDE çizilen tablasıyla aynı olmalı.
describe('masa gövdesi = çizilen tabla (oyuncu)', () => {
  const masaKutusu = (lv: number) =>
    oyuncuKatilari(4, 1, [lv, lv, lv, lv]).find((s) => s.c === LAYOUT.tables[0].table)!;

  it('dörtlü Sv1-3 küçük tabla, Sv4+ büyük tabla', () => {
    for (const lv of [0, 1, 2, 3, 4]) {
      expect(masaKutusu(lv).h[0] * 2).toBeCloseTo(tableWidth(LAYOUT.tables[0].kind, lv), 6);
    }
    expect(masaKutusu(0).h[0]).toBeLessThan(masaKutusu(3).h[0]);
  });

  it('Sv1 masanın eski köşe bölgesi artık serbest, tabla kenarı hâlâ katı', () => {
    const t = LAYOUT.tables[0].table;
    const r = LAYOUT.playerRadius;
    const koseX = t[0] + LAYOUT.tableHalf[0] + r - 0.05; // eski kutunun içi, çizilen tablanın dışı
    const koseZ = t[2] + LAYOUT.tableHalf[1] + r - 0.05;
    const katilar = oyuncuKatilari(1, 1, [0]).filter((s) => s.c === t);
    expect(hitsSolid(koseX, koseZ, katilar, r)).toBe(false);
    expect(hitsSolid(t[0] + 0.3, t[2] + 0.3, katilar, r)).toBe(true);
  });

  it('seviye verilmezse (personel/ölçüm araçları) eski geniş kutu korunur', () => {
    const s = activeSolids(1, 1).find((k) => k.c === LAYOUT.tables[0].table)!;
    expect(s.h).toEqual(LAYOUT.tableHalf);
  });

  it('2. masa açma ücreti 15₺', () => {
    expect(economyConfig.pads.find((p) => p.id === 'table2')!.cost).toBe(15);
  });
});
