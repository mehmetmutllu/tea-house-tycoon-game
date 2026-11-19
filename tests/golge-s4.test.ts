/**
 * golge-s4.test.ts — GÖLGE MALİYETİ BEKÇİSİ (S4 · tarama 3-performans #1a + #1c).
 *
 * NE İDDİA EDİYOR:
 *   1. Küçük prop'lar (fincan, cezve, pul, ıstaka, bardak, tabak, korkuluk dikmesi, pirinç şerit)
 *      gölge DÖKMEZ; masa, masa ayağı, oturak, duvar, ocak, semaver DÖKER. Ölçüler oyundaki
 *      geometrinin kendisi (kaynak satırı yanında).
 *   2. Kat 2'nin `Kutu`/`Silindir`ı varsayılanı BOYUTTAN alır — yeni bir küçük parça listeye
 *      yazılmadan da gölgesiz doğar. (Kaynak taraması: .tsx vitest'te çizilmiyor.)
 *   3. Zayıf cihazda harita 1024; güçlü ve ölçülmemiş cihaz 2048'i korur; taban daha küçükse
 *      (DEV `?f2golge=512`) büyütülmez.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { golgeVerir, silindirGolgeVerir } from '../src/components/three/golgeKurali';
import { golgeHaritasi, GOLGE_HARITA_ZAYIF } from '../src/game/cihazSinifi';
import { LIGHTING } from '../src/config/palette';

const kutu = (w: number, h: number, d: number) => golgeVerir(w, h, d);
const sil = (r1: number, r2: number, h: number) => silindirGolgeVerir(r1, r2, h);

describe('küçük prop gölge dökmez', () => {
  const kucuk: [string, boolean][] = [
    ['Kat 2 fincan gövdesi (parca.tsx)', sil(0.042, 0.03, 0.06)],
    ['cezve gövdesi (Esya.tsx Cezve)', sil(0.07, 0.095, 0.16)],
    ['cezve sapı (Esya.tsx Cezve)', sil(0.016, 0.016, 0.28)],
    ['tavla pulu (Esya.tsx Pullar)', sil(0.032, 0.032, 0.018)],
    ['pirinç şerit (Esya.tsx Pirinc)', kutu(1.13, 0.06, 0.03)],
    ['korkuluk dikmesi (Kat2.tsx DIKME_GEO)', sil(0.035, 0.035, 0.86)],
    ['korkuluk boğumu (Kat2.tsx DIKME_BOGUM)', sil(0.05, 0.05, 0.14)],
    ['merdiven dikmesi (Kat2.tsx Silindir)', sil(0.035, 0.035, 0.86)],
    ['Kat 1 raf bardağı (maketParts MaketWallShelf)', sil(0.045, 0.062, 0.11)],
    ['hazır çay bardağı (ServicePoint)', sil(0.06, 0.05, 0.16)],
    ['kirli tabak (Player/carriedDirty)', sil(0.075, 0.06, 0.03)],
    ['portmanto askısı (Decor)', kutu(0.22, 0.035, 0.035)],
    ['portmanto direği (Decor)', sil(0.035, 0.035, 1.3)],
    ['merdiven molozu (maketParts)', kutu(0.3, 0.06, 0.22)],
  ];
  it.each(kucuk)('%s → gölge yok', (_ad, verir) => expect(verir).toBe(false));

  const buyuk: [string, boolean][] = [
    ['okey masa ayağı (Esya.tsx CerceveliMasa)', kutu(0.08, 0.73, 0.08)],
    ['okey masa tablası (Esya.tsx CerceveliMasa)', kutu(1.04, 0.1, 1.04)],
    ['masa üst kapağı (ince ama geniş)', kutu(1.16, 0.04, 1.16)],
    ['oturak yedeği (Esya.tsx Oturagi)', sil(0.22, 0.22, 0.45)],
    ['tavla masası yedeği (Esya.tsx TavlaMasa)', kutu(0.9, 0.75, 0.9)],
    ['merdiven babası (Kat2.tsx Baba)', kutu(0.18, 1.12, 0.18)],
    ['duvar paneli', kutu(4, 2.5, 0.06)],
    ['ocak bacası (Esya.tsx CezveOcagi)', sil(0.13, 0.13, 1.0)],
  ];
  it.each(buyuk)('%s → gölge VAR', (_ad, verir) => expect(verir).toBe(true));
});

describe('Kat 2 Kutu/Silindir varsayılanı boyuttan gelir', () => {
  const kaynak = readFileSync(new URL('../src/components/three/kat2/parca.tsx', import.meta.url), 'utf8');
  // Istaka (0,62 × 0,05 × 0,11) boyut kuralının dışında kalır (ne küçük ne ince) — elle kapalı.
  it('ıstaka elle gölgesiz (Esya.tsx OkeyMasa)', () => {
    const esya = readFileSync(new URL('../src/components/three/kat2/Esya.tsx', import.meta.url), 'utf8');
    expect(esya).toMatch(/<Kutu w=\{0\.62\} h=\{0\.05\} d=\{0\.11\}[^>]*golge=\{false\}/);
  });
  it('Kutu', () => expect(kaynak).toMatch(/export function Kutu\([^)]*golge = golgeVerir\(w, h, d\)/));
  it('Silindir', () => expect(kaynak).toMatch(/export function Silindir\([^)]*golge = silindirGolgeVerir\(r1, r2, h\)/));
});

describe('zayıf cihazda gölge haritası 1024', () => {
  it('zayıf → 1024', () => expect(golgeHaritasi('zayif', LIGHTING.shadowMapSize)).toBe(1024));
  it('güçlü → taban (2048)', () => expect(golgeHaritasi('guclu', LIGHTING.shadowMapSize)).toBe(2048));
  it('ölçülmemiş → taban', () => expect(golgeHaritasi('bilinmiyor', LIGHTING.shadowMapSize)).toBe(2048));
  it('küçük taban büyütülmez', () => expect(golgeHaritasi('zayif', 512)).toBe(512));
  it('sabit 1024', () => expect(GOLGE_HARITA_ZAYIF).toBe(1024));
  it('lights.tsx haritayı golgeHaritasi üzerinden alır', () => {
    const k = readFileSync(new URL('../src/components/three/lights.tsx', import.meta.url), 'utf8');
    expect(k).toMatch(/golgeHaritasi\(cihazSinifiOku\(\), LIGHTING\.shadowMapSize\)/);
  });
});
