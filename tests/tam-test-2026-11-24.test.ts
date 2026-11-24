import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gorusKuresi } from '../src/components/three/kat2/gorusKure';
import { LIGHTING } from '../src/config/palette';
import { ASFALT, KALDIRIM } from '../src/components/three/streetLook';
import { ARSA } from '../src/components/three/bahceLook';

const oku = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

describe('T1 Kat 2 görünürlük kapısı', () => {
  it('küre gövdeyi ve gölge ucunu kapsar', () => {
    const [bx, by, bz] = LIGHTING.sunPos;
    for (const [boy, yari] of [[1.75, 0.6], [1.4, 1.9]]) {
      const [x, y, z, r] = gorusKuresi(3, -1, 5, boy, yari, LIGHTING.sunPos);
      const icinde = (p: number[]) => Math.hypot(p[0] - x, p[1] - y, p[2] - z) <= r - 0.55; // pay (0,6) küre merkezinin yanlışını örtmesin
      const uc = [3 - (bx / by) * boy, -1, 5 - (bz / by) * boy];
      for (const [cx, cz] of [[3, 5], [uc[0], uc[2]]]) for (const a of [0, 1.57, 3.14, 4.71]) expect(icinde([cx + Math.cos(a) * yari, -1, cz + Math.sin(a) * yari])).toBe(true);
      expect(icinde([3, -1 + boy, 5])).toBe(true);
    }
  });
  it('müşteri gövdesi ve masa kapıdan geçer', () => {
    expect(oku('components/three/kat2/Grup.tsx')).toMatch(/kok\.visible = gorusteMi\([\s\S]*?if \(!g\.kok\.visible\) return;[\s\S]*?mixer\.update\(g\.bekleyenDt\)/);
    expect(oku('components/three/Kat2.tsx')).toMatch(/<GorusKapisi [^>]*>\s*<Dogus/);
  });
});

it('T2 tablet: kenar oku `zoom`a bölünür, ölçek tek kaynaktan', () => {
  expect(oku('components/ui/hud.css')).toMatch(/--hud-olcek: 1\.4;\s*zoom: var\(--hud-olcek\)/);
  expect(oku('components/ui/HUD.tsx')).toContain('p.x.toFixed(0)}px / var(--hud-olcek, 1)');
});

it('T3 Usta/video kartının kapat düğmesi biçimli (tarayıcı varsayılanı değil)', () => {
  const k = /\.usta-x \{[^}]*\}/.exec(oku('components/ui/hud.css'))![0];
  expect(k).toContain('background: var(--oyuk)');
  expect(k).toContain('border-radius: 50%');
});

it('sokak şeritleri bahçe arsasının iki ucunu örter', () => {
  for (const s of [KALDIRIM, ASFALT]) {
    expect(s.x - s.w / 2).toBeLessThanOrEqual(ARSA.minX);
    expect(s.x + s.w / 2).toBeGreaterThanOrEqual(ARSA.maxX);
  }
});
