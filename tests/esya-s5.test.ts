/**
 * esya-s5.test.ts — S5 ESYA bekçisi (oyun testi 2026-11-20):
 *  G-98 para yığını Kat 1 sikkesi boyunda · G-105 pad dolumu çerçeveyi izler, işaret boyu sabit ·
 *  G-126 hazır kahve mangalın iki yanında ikişerli · G-127 leğendeki fincan su yüzünde · G-130 tavla haneleri boyalı.
 * Kareler: `docs/kareler/s5-esya-pano.png` (`node tools/s5-esya-kare.mjs`).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { economyConfig } from '../src/config/economy.config';
import { dolumKesiti, servisCercevesi, masaCercevesi, type Nokta } from '../src/game/markerFrame';
import { CERCEVE, KOSE_R, icCevre } from '../src/components/three/GroundMarker';
import { SIKKE_R, YIGIN_OLCEK, kademe, sikkeYerleri } from '../src/components/three/kat2/Para';
import {
  FINCAN, HANE_KAKMA, HANE_SADE, LEGEN_AGIZ, LEGEN_FINCAN, SET_OLCEK, TEPSI_SUTUN, fincanYerleri, haneYerleri, tepsiAraligi,
} from '../src/components/three/kat2/esyaOlcu';
import { KAT2_ON_TEZGAH, KAT2_YIKAMA_YER, OCAKLAR } from '../src/game/kat';

const oku = (y: string) => readFileSync(new URL(`../${y}`, import.meta.url), 'utf8');
const yorumsuz = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const alan = (n: readonly Nokta[]) =>
  Math.abs(n.reduce((a, [x, y], i) => { const [x2, y2] = n[(i + 1) % n.length]; return a + x * y2 - x2 * y; }, 0)) / 2;
/** Dışbükey, saat yönü tersine çokgenin içinde mi (pay ile). */
const icinde = (c: readonly Nokta[], [px, py]: Nokta, pay = 1e-9) =>
  c.every(([x, y], i) => { const [x2, y2] = c[(i + 1) % c.length]; return (x2 - x) * (py - y) - (y2 - y) * (px - x) >= -pay; });

describe('G-105 · pad dolumu kenarlığın iç çevresini izler, işaret boyu sabit', () => {
  for (const [ad, c] of [['servis', servisCercevesi()], ['masa', masaCercevesi(2)]] as const) {
    const ic = icCevre(2 * c.hw, 2 * c.hh, c.hh * KOSE_R, c.hh * CERCEVE);
    const icHw = c.hw - c.hh * CERCEVE;
    it(`${ad}: tam dolum = iç çevre (kenarla arada boşluk yok)`, () => {
      expect(alan(dolumKesiti(ic, 1))).toBeCloseTo(alan(ic), 9);
      expect(dolumKesiti(ic, 0)).toHaveLength(0);
    });
    it(`${ad}: her kesit iç çevrenin içinde, yarıda iki yan kenara değer, alan tekdüze artar`, () => {
      let onceki = 0;
      for (let p = 0.05; p <= 1.0001; p += 0.05) {
        const k = dolumKesiti(ic, p);
        for (const n of k) expect(icinde(ic, n)).toBe(true);
        const a = alan(k);
        expect(a).toBeGreaterThan(onceki);
        onceki = a;
      }
      const yari = dolumKesiti(ic, 0.5);
      const ys = ic.map(([, y]) => y);
      const [alt, ust] = [Math.min(...ys), Math.max(...ys)];
      expect(Math.max(...yari.map(([, y]) => y))).toBeCloseTo(alt + 0.5 * (ust - alt), 9);
      expect(Math.max(...yari.map(([x]) => x))).toBeCloseTo(icHw, 9);
      expect(Math.min(...yari.map(([x]) => x))).toBeCloseTo(-icHw, 9);
    });
    it(`${ad}: köşede dolum YUVARLAK (alt kenar tam genişlikte değil)`, () => {
      const k = dolumKesiti(ic, 0.03);
      const genis = Math.max(...k.map(([x]) => x)) - Math.min(...k.map(([x]) => x));
      expect(genis).toBeLessThan(2 * icHw - 0.01);
      // Kesit köşe yayının noktalarını taşır (köşeli dikdörtgen 4 köşeli olurdu).
      expect(k.length).toBeGreaterThan(4);
    });
  }
  it('işaret hiçbir karede ölçeklenmez; dolum düz dikdörtgen değil kesit', () => {
    const kod = yorumsuz(oku('src/components/three/GroundMarker.tsx'));
    expect(kod).not.toMatch(/\.scale\.(set|setScalar)\(|\bscale\.y\s*=/);
    expect(kod).not.toMatch(/PULSE_/);
    expect(kod).toMatch(/dolumKesiti\(ic, p\)/);
    expect(kod).toMatch(/icCevre\(w, h, r, k\)/);
    expect(kod).not.toMatch(/planeGeometry/);
  });
});

describe('G-98 · Kat 2 para yığını Kat 1 sikkesi boyunda, tavanı küçük', () => {
  it('sikke = Kat 1 sikkesi (yarıçap 0,22, ölçek 1)', () => {
    expect(oku('src/components/three/Coins.tsx')).toMatch(/new CylinderGeometry\(0\.22, 0\.22/);
    expect(SIKKE_R * YIGIN_OLCEK).toBeCloseTo(0.22, 9);
  });
  it('kademe 1→4: sikke sayısı artar; tavan 3 sütun, boy ≤ 0,35, taban eni ≤ 0,9', () => {
    let onceki = 0;
    for (let k = 1; k <= 4; k++) {
      const y = sikkeYerleri(k);
      expect(y.length).toBeGreaterThan(onceki);
      onceki = y.length;
      const sutun = new Set(y.map(([x, , z]) => `${Math.round(x * 10)},${Math.round(z * 10)}`));
      expect(sutun.size).toBeLessThanOrEqual(3);
      expect((Math.max(...y.map(([, yy]) => yy)) + 0.03) * YIGIN_OLCEK).toBeLessThanOrEqual(0.35);
      const xs = y.map(([x]) => x);
      expect((Math.max(...xs) - Math.min(...xs) + 2 * SIKKE_R) * YIGIN_OLCEK).toBeLessThanOrEqual(0.9);
    }
    expect(kademe(1e9)).toBe(4);
  });
});

describe('G-126 · hazır kahve mangalın iki yanında ikişerli', () => {
  const ayar = economyConfig.kat2;
  const tavan = ayar.ocakKuyruk + ayar.yukseltme.ocak.kuyrukArti * ayar.yukseltme.ocak.fiyat.length;
  const r = 0.062 * FINCAN.s;
  it('kuyruk tavanı yan tepsilere sığar', () => {
    expect(2 * (TEPSI_SUTUN.sol + TEPSI_SUTUN.sag)).toBeGreaterThanOrEqual(tavan);
  });
  it('her sütunda en çok 2 fincan; iki yana dağılır; çakışmaz; tepsi içinde, mangala değmez, tezgâh derinliğinde', () => {
    const y = fincanYerleri(tavan);
    expect(y).toHaveLength(tavan);
    const sutunlar = new Map<number, number>();
    for (const [x] of y) sutunlar.set(Math.round(x * 1000), (sutunlar.get(Math.round(x * 1000)) ?? 0) + 1);
    for (const n of sutunlar.values()) expect(n).toBeLessThanOrEqual(2);
    const sol = y.filter(([x]) => x < 0.25).length;
    expect(Math.abs(sol - (y.length - sol))).toBeLessThanOrEqual(1);
    for (let i = 0; i < y.length; i++)
      for (let j = i + 1; j < y.length; j++) expect(Math.hypot(y[i][0] - y[j][0], y[i][1] - y[j][1])).toBeGreaterThanOrEqual(2 * r);
    const [s0, s1] = tepsiAraligi(-1);
    const [g0, g1] = tepsiAraligi(1);
    const yariD = (KAT2_ON_TEZGAH.z1 - KAT2_ON_TEZGAH.z0) / 2 / SET_OLCEK;
    for (const [x, z] of y) {
      expect((x >= s0 + r && x <= s1 - r) || (x >= g0 + r && x <= g1 - r)).toBe(true);
      expect(x <= -0.25 - r || x >= 0.75 + r).toBe(true); // mangalın en geniş hâli (x 0,25 ± 0,5)
      expect(Math.abs(z) + r).toBeLessThanOrEqual(yariD);
    }
  });
  it('setler tezgâhta kalır ve leğen grubuna (ibrik/süzgeç) değmez', () => {
    const legen: [number, number] = [KAT2_YIKAMA_YER[0] - (0.62 + 0.11) * 1.35, KAT2_YIKAMA_YER[0] + (0.66 + 0.21) * 1.35];
    for (const o of OCAKLAR) {
      const a = o.x + tepsiAraligi(-1)[0] * SET_OLCEK;
      const b = o.x + tepsiAraligi(1)[1] * SET_OLCEK;
      expect(a).toBeGreaterThanOrEqual(KAT2_ON_TEZGAH.x0);
      expect(b).toBeLessThanOrEqual(KAT2_ON_TEZGAH.x1);
      expect(b <= legen[0] || a >= legen[1]).toBe(true);
    }
  });
  it('çizim fincanYerleri’nden okur (tek sıra dizilim yok)', () => {
    const kod = yorumsuz(oku('src/components/three/kat2/Mutfak.tsx'));
    expect(kod).toMatch(/fincanYerleri\(hazir\)\.map/);
    expect(kod).not.toMatch(/i \* FINCAN\.adim/);
  });
});

describe('G-127 · leğendeki kirli fincan bakırın ÜSTÜNDE, su yok', () => {
  it('fincan tabağı bakır kapağın yüzüne oturur (gömülmez, havada durmaz); gövde boyu aynı sabitten', () => {
    expect(LEGEN_FINCAN).toBeCloseTo(LEGEN_AGIZ, 9);
    const kod = yorumsuz(oku('src/components/three/kat2/Bulasik.tsx'));
    expect(kod).toMatch(/y \+ LEGEN_FINCAN/);
    expect(kod).toMatch(/h=\{LEGEN_AGIZ\}/);
    expect(kod).toMatch(/pos=\{\[0, y \+ LEGEN_AGIZ \/ 2, 0\]\}/);
  });
  it('kullanıcı 2026-11-21: leğende su yüzeyi (mavi disk) yok, gövde bakır', () => {
    const kod = yorumsuz(oku('src/components/three/kat2/Bulasik.tsx'));
    const yikamaYeri = kod.slice(kod.indexOf('export function YikamaYeri'), kod.indexOf('export function Kat2Bulasikci'));
    expect(yikamaYeri).not.toMatch(/#8fc9d9|LEGEN_SU/i);
    expect(yikamaYeri).toMatch(/renk="#b87333"/);
    // Leğen + ibrik + süzgeç yalnız bakır/pirinç/ahşap; mavi bir yüzey (yeni su diski) eklenirse burada düşer.
    const renkler = new Set((yikamaYeri.match(/#[0-9a-f]{6}/gi) ?? []).map((r) => r.toLowerCase()));
    expect([...renkler].filter((r) => !['#b87333', '#c98a4b', '#c9a227', '#8a6a4f'].includes(r))).toEqual([]);
  });
});

describe('G-130 · tavla tahtası her seviyede boyalı', () => {
  for (const [ad, d] of [['sade (Sv1)', HANE_SADE], ['kakma (Sv2+)', HANE_KAKMA]] as const) {
    it(`${ad}: 24 üçgen hane, iki renk, uçlar ortaya bakar ve tahtada kalır`, () => {
      const h = haneYerleri(d);
      expect(h).toHaveLength(24);
      expect(new Set(h.map((x) => x.renk)).size).toBe(2);
      expect(d.boy).toBeLessThan(d.kenar);
      for (const x of h) {
        expect(Math.sign(x.yon)).toBe(-Math.sign(x.x));
        expect(Math.abs(x.z) + x.taban / 2).toBeLessThanOrEqual(d.z1 + 1e-9);
        expect(Math.abs(x.z) - x.taban / 2).toBeGreaterThanOrEqual(d.z0 - 1e-9);
      }
    });
  }
  it('Sv1 boyası Sv2+ boyasından farklı; Sv1 de boyalı çizilir; Sv4 cilası korunur (D-195)', () => {
    expect(HANE_SADE.renk).not.toEqual(HANE_KAKMA.renk);
    const kod = yorumsuz(oku('src/components/three/kat2/Esya.tsx'));
    expect(kod).toMatch(/<Haneler d=\{HANE_SADE\} \/>/);
    expect(kod).toMatch(/<Haneler d=\{HANE_KAKMA\} \/>/);
    // D-195: Sv4 koyu cila (masa üstü) korunur; Sv1 kakmasız (sade boya).
    expect(kod).toMatch(/kakma: true, oturak: 'chair_stool', boy: 1\.2, cila: true/);
    expect(kod).toMatch(/\{ kakma: false, oturak: 'chair_stool_wood', boy: 1, cila: false/);
  });
});
