/**
 * s5-yapi.test.ts — S5 YAPI bekçisi (oyun testi 2026-11-20): G-101 kuyu kabuğu · G-110 ocak pad'i tezgâhın önünde ·
 * G-113 mutfak gövdeleri önden yüklenir · G-116 dış kenar hat başına tek parça + bölme uçları duvara uzar ·
 * G-117 lavabo merdivenin toz dönüşümüyle açılır · G-118 lavabo levhası klozet · G-121 bütün bölmeler alçak.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AGIZ, KAT2_ALANLAR, KAT2_BOLMELER, KAT2_ON_TEZGAH, OCAKLAR, ON_BOLME_H } from '../src/game/kat';
import { FLOOR_HALF as H } from '../src/game/layout';
import { padCercevesi } from '../src/game/markerFrame';
import { kat2PadEtiket, kat2PadYeri } from '../src/game/kat2Dongu';
import { BOLME_YARI, DIS_PAY, KUYU_YANAK, bolmeCizimi, disKenarlar, kuyuBasamakYariEn } from '../src/components/three/kat2/yapiOlcu';
import { KADEME_MERDIVENI, KITCHEN_UNITS, adaModeli, mutfakGovdeleri, uniteModeli } from '../src/components/three/kitchenLook';

const oku = (f: string) => readFileSync(path.resolve(__dirname, '..', f), 'utf8');

describe('S5 YAPI', () => {
  it('G-101: basamak kova yanağının iç yüzüne kadar (arada yarık yok)', () => {
    expect(kuyuBasamakYariEn(AGIZ.x)).toBeGreaterThanOrEqual(AGIZ.x - KUYU_YANAK / 2);
    expect(oku('src/components/three/Kat2.tsx')).toMatch(/AGIZ\.arka - KUYU_PERDE \/ 2/);
  });

  it('G-110: ocak açma pad çerçevesi tezgâhın önünde', () => {
    for (const o of OCAKLAR) {
      const [, z] = kat2PadYeri(o.id);
      expect(z - padCercevesi(kat2PadEtiket(o.id)).hh, o.id).toBeGreaterThanOrEqual(KAT2_ON_TEZGAH.z1);
    }
  });

  it('G-113: her seviyenin her gövdesi önden yükleme listesinde', () => {
    const l = new Set(mutfakGovdeleri());
    for (let L = 1; L <= KADEME_MERDIVENI.length; L++) {
      KITCHEN_UNITS.forEach((u, i) => expect(l.has(uniteModeli(u, i, L)), `${u.key} L${L}`).toBe(true));
      for (const s of [0, 1]) {
        const m = adaModeli(s, L);
        if (m) expect(l.has(m)).toBe(true);
      }
    }
    expect(oku('src/components/three/Kitchen.tsx')).toMatch(/mutfakGovdeleri\(\)\)[\s\S]{0,80}useGLTF\.preload/);
  });

  it('G-116: dış kenarlar hat başına tek parça (üst üste binme yok)', () => {
    const k = disKenarlar(KAT2_ALANLAR);
    for (let i = 0; i < k.length; i++)
      for (let j = i + 1; j < k.length; j++)
        if (k[i].yon === k[j].yon && k[i].c === k[j].c) expect(k[i].b < k[j].a || k[j].b < k[i].a).toBe(true);
  });

  it('G-116: bölme ucu dış duvarın eksenine, iç ucu dik bölmenin öbür yüzüne uzar', () => {
    for (const b of KAT2_BOLMELER) {
      const c = bolmeCizimi(b);
      const uclar = c.yatay ? [Math.min(b.x1, b.x2), Math.max(b.x1, b.x2)] : [Math.min(b.z1, b.z2), Math.max(b.z1, b.z2)];
      for (const [u, d] of [[uclar[0], c.a], [uclar[1], c.b]]) {
        const bek = Math.abs(u) === H ? DIS_PAY : BOLME_YARI;
        expect(Math.abs(d - u)).toBeCloseTo(bek, 9);
      }
    }
  });

  it('G-121: bütün bölmeler alçak', () => {
    for (const b of KAT2_BOLMELER) expect(bolmeCizimi(b).h).toBeLessThanOrEqual(ON_BOLME_H);
  });

  it('G-117: lavabo ve merdiven aynı toz dönüşümü', () => {
    expect(oku('src/components/three/Kat2.tsx')).toMatch(/<TozDonusumu[\s\S]{0,120}<LavaboTadilat/);
    expect(oku('src/components/three/kat2/MerdivenDonusum.tsx')).toMatch(/<TozDonusumu/);
  });

  it('G-118: lavabo levhası klozet (damla konisi yok)', () => {
    const s = oku('src/components/three/maketParts.tsx');
    expect(s).toMatch(/simge === 'lavabo' && <KlozetSimge/);
  });
});
