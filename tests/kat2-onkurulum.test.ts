import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ONKURULUM_GECIKME_MS,
  bostaCalistir,
  isitmaDilimi,
  isitmaParcalari,
  kat2ActivityGorunur,
  kat2KatmanKurulsunMu,
} from '../src/components/three/kat2OnKurulum';

/**
 * Bekçi — Kat 2 ön kurulumu (tarama 2026-11-18 #6). Merdiven tamirli oyuncuda Kat 2 Kat 1'deyken arkada
 * kurulur; merdiveni açılmamış oyuncu hiçbir şey kurmaz; oyuncu Kat 2'deyse katman her zaman ağaçtadır.
 */
describe('kat2KatmanKurulsunMu', () => {
  it('merdiven kapalı: Kat 1de hiç kurulmaz (zaman gelse de)', () => {
    expect(kat2KatmanKurulsunMu(1, false, false)).toBe(false);
    expect(kat2KatmanKurulsunMu(1, false, true)).toBe(false);
  });
  it('merdiven tamirli: ön kurulum zamanından önce bekler, sonra Kat 1de kurulur', () => {
    expect(kat2KatmanKurulsunMu(1, true, false)).toBe(false);
    expect(kat2KatmanKurulsunMu(1, true, true)).toBe(true);
  });
  it('Kat 2deyken her durumda kurulu', () => {
    expect(kat2KatmanKurulsunMu(2, true, false)).toBe(true);
    expect(kat2KatmanKurulsunMu(2, true, true)).toBe(true);
    expect(kat2KatmanKurulsunMu(2, false, false)).toBe(true);
  });
});

describe('bostaCalistir', () => {
  afterEach(() => vi.useRealTimers());

  it('gecikmeden önce çalışmaz, sonra bir kez çalışır (requestIdleCallback yoksa doğrudan)', () => {
    vi.useFakeTimers();
    const is = vi.fn();
    bostaCalistir(is);
    vi.advanceTimersByTime(ONKURULUM_GECIKME_MS - 1);
    expect(is).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(is).toHaveBeenCalledTimes(1);
  });

  it('iptal edilince (merdiven yeniden kapandı) çalışmaz', () => {
    vi.useFakeTimers();
    const is = vi.fn();
    const iptal = bostaCalistir(is);
    iptal();
    vi.advanceTimersByTime(ONKURULUM_GECIKME_MS * 3);
    expect(is).not.toHaveBeenCalled();
  });
});

describe('kat2ActivityGorunur', () => {
  it('Kat 1de yalnız ısınana dek görünür (sonra gizli: useFrame/abonelik sökülü), Kat 2de hep görünür', () => {
    expect(kat2ActivityGorunur(1, false)).toBe(true);
    expect(kat2ActivityGorunur(1, true)).toBe(false);
    expect(kat2ActivityGorunur(2, true)).toBe(true);
    expect(kat2ActivityGorunur(2, false)).toBe(true);
  });
});

describe('ısıtma dilimleri', () => {
  it('dilim bütçeyi aşmaz, en az bir parça alır, sona varınca durur', () => {
    const m = [100, 40, 20, 300, 10];
    expect(isitmaDilimi(m, 0, 150)).toEqual({ bas: 0, son: 2 });
    expect(isitmaDilimi(m, 2, 150)).toEqual({ bas: 2, son: 3 });
    expect(isitmaDilimi(m, 3, 150)).toEqual({ bas: 3, son: 4 });
    expect(isitmaDilimi(m, 4, 150)).toEqual({ bas: 4, son: 5 });
  });

  type D = { ad: string; isMesh?: boolean; children: D[]; traverse: (f: (n: D) => void) => void };
  const d = (ad: string, cocuk: D[] = [], isMesh = cocuk.length === 0): D => {
    const n: D = { ad, isMesh, children: cocuk, traverse: (f) => { f(n); for (const c of cocuk) c.traverse(f); } };
    return n;
  };
  it('bütçeyi aşan grup çocuklarına bölünür; her parça mesh kümesini bir kez kapsar', () => {
    const masalar = d('masalar', [d('m1', [d('a'), d('b')]), d('m2', [d('c'), d('e')]), d('m3', [d('f')])]);
    const kok = d('kok', [d('zemin'), masalar, d('duvar', [d('g')])]);
    const p = isitmaParcalari(kok, 2);
    expect(p.map((x) => x.ad)).toEqual(['zemin', 'm1', 'm2', 'm3', 'duvar']);
    let n = 0;
    for (const x of p) x.traverse((o) => { if (o.isMesh) n++; });
    let hepsi = 0;
    kok.traverse((o) => { if (o.isMesh) hepsi++; });
    expect(n).toBe(hepsi);
  });
});
