/**
 * Kat 2'nin dışarısı (`kat2/Dis`) Kat 1'in bahçesini "bina tam" (`MAX_AREAS`) hâliyle çizer: Kat 1'in açılmamış
 * alanına dikilen ağaçlar 3,2'den uzun, Kat 2'nin zemininden taşıyordu (kullanıcı 2026-11-17: "mapin ortasında ağaç").
 * Bekçi: o hâlde hiçbir bitki Kat 2'nin kabuğunun (dış duvarlar dahil) içine düşmez.
 */
import { describe, expect, it } from 'vitest';
import { MAX_AREAS } from '../src/config/economy.config';
import { bitkiler } from '../src/components/three/bahceLook';
import { BAND, FLOOR_HALF } from '../src/game/layout';

const M = 0.5; // dış duvar kat kenarının 0,5 dışında (Kat2.Duvarlar)
const icinde = (x: number, z: number) => Math.abs(x) < FLOOR_HALF + M && z > BAND.back - M && z < FLOOR_HALF + M;

describe('Kat 2 dışarısı: bahçe bina tam', () => {
  it('bina tam hâlinde Kat 2 kabuğunun içinde bitki yok', () => {
    const icerde = bitkiler(MAX_AREAS).filter((b) => icinde(b.x, b.z));
    expect(icerde).toEqual([]);
  });
  it('tanık: Kat 1 tek alanken bahçe kabuğun içine bitki diker (binaTam olmasa taşan budur)', () => {
    expect(bitkiler(1).some((b) => icinde(b.x, b.z))).toBe(true);
  });
});
