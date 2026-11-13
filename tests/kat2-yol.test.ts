/**
 * kat2-yol.test.ts — Kat 2 GRUP YÜRÜYÜŞ YOLU bekçisi (D-191 N7, görsel tur).
 *
 * Bütün masalar + iki ocak + lavabo açıkken her masanın her oturağına giden yol: başka masanın /
 * salondaki ocağın gövdesinden geçmez · merdivenden çıktıktan sonra kuyuya girmez · bantta kova
 * duvarlarının (x ±4,6) dışına taşmaz (sol mutfak, sağ lavabo odası) · kat sınırında kalır · oturakta biter.
 */
import { describe, it, expect } from 'vitest';
import { AGIZ, KAT2_LAVABO_PAD, KAT2_MASALAR, KAT2_SALON_PAD, KOVA, KUYU, OCAKLAR, kat2Engeller, masaGovdesi } from '../src/game/kat';
import { BAND, FLOOR_HALF } from '../src/game/layout';
import { grupYolu, oturakYerleri } from '../src/components/three/kat2/yol';
import type { Solid } from '../src/game/layout';
import { kat2SvTetikleri, type Kat2Ayar } from '../src/game/kat2Dongu';
import { economyConfig } from '../src/config/economy.config';

const HEPSI = [...KAT2_SALON_PAD, ...KAT2_MASALAR.map((m) => m.id), ...OCAKLAR.map((o) => o.id), KAT2_LAVABO_PAD];
const PAY = 0.05;

function icinde(s: Solid, x: number, z: number): boolean {
  return Math.abs(x - s.c[0]) < s.h[0] - PAY && Math.abs(z - s.c[2]) < s.h[1] - PAY;
}

/** Yolu 0,1 br adımla örnekler; her örnek hangi bacakta (indeks) olduğuyla döner. */
function ornekle(n: [number, number, number][]): { x: number; z: number; i: number }[] {
  const out: { x: number; z: number; i: number }[] = [];
  for (let i = 1; i < n.length; i++) {
    const [ax, , az] = n[i - 1];
    const [bx, , bz] = n[i];
    const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1));
    for (let j = 0; j <= k; j++) out.push({ x: ax + ((bx - ax) * j) / k, z: az + ((bz - az) * j) / k, i });
  }
  return out;
}

const yollar = KAT2_MASALAR.flatMap((m) => oturakYerleri(m.tur).map((o, k) => ({ m, o, k, n: grupYolu(m, o, k) })));

describe('Kat 2 grup yolu (N7)', () => {
  it('her oturağa bir yol var ve oturakta biter', () => {
    expect(yollar.length).toBeGreaterThan(KAT2_MASALAR.length);
    for (const { m, o, n } of yollar) {
      const son = n[n.length - 1];
      expect(son[0]).toBeCloseTo(m.x + o[0], 6);
      expect(son[2]).toBeCloseTo(m.z + o[1], 6);
    }
  });

  it('başka masanın ve salondaki ocağın gövdesinden geçmez', () => {
    const engel = kat2Engeller(HEPSI);
    for (const { m, n } of yollar) {
      const kendi = masaGovdesi(m);
      for (const p of ornekle(n)) {
        for (const s of engel) {
          if (s.c[0] === kendi.c[0] && s.c[2] === kendi.c[2]) continue;
          expect(icinde(s, p.x, p.z), `${m.id} yolu (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) engelde`).toBe(false);
        }
      }
    }
  });

  it('merdivenden çıktıktan sonra kuyuya girmez, bantta kova duvarları arasında kalır', () => {
    for (const { m, n } of yollar) {
      for (const p of ornekle(n)) {
        expect(Math.abs(p.x) <= FLOOR_HALF && p.z <= FLOOR_HALF, `${m.id} kat dışında`).toBe(true);
        if (p.z < BAND.front) expect(p.x > KOVA.x0 && p.x < KOVA.x1, `${m.id} bantta mutfak/lavabo odasına taşıyor`).toBe(true);
        if (p.i >= 3) expect(icinde(KUYU, p.x, p.z), `${m.id} kuyuya giriyor`).toBe(false);
      }
    }
  });

  it('yol kuyunun yanında korkuluğun dışından geçer', () => {
    for (const { n } of yollar) expect(Math.abs(n[2][0])).toBeGreaterThan(AGIZ.x);
  });
});

describe('Kat 2 grup yolu ↔ Sv çerçevesi (S3)', () => {
  const kol = { fiyat: [0, 1, 2, 3, 4], ucretCarpan: [1, 1, 1, 1, 1], kahveAralikCarpan: [1, 1, 1, 1, 1], gelisAralikCarpan: [1, 1, 1, 1, 1] };
  const ayar: Kat2Ayar = { ...(economyConfig.kat2 as Kat2Ayar), masaSv: { okey: kol, tavla: kol } };
  const tetikler = kat2SvTetikleri(ayar, HEPSI, {});
  it('bütün masaların çerçevesi var', () => {
    expect(tetikler.length).toBe(KAT2_MASALAR.length);
  });
  it('hiçbir grubun yolu bir Sv çerçevesinin içinden geçmez', () => {
    const ihlal: string[] = [];
    for (const { m, k, n } of yollar) {
      for (const p of ornekle(n)) {
        const t = tetikler.find((r) => Math.abs(p.x - r.x) < r.w / 2 - PAY && Math.abs(p.z - r.z) < r.d / 2 - PAY);
        if (t) { ihlal.push(`${m.id}#${k} → ${t.id}`); break; }
      }
    }
    expect(ihlal).toEqual([]);
  });
});
