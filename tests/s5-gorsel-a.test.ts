/**
 * S5 GÖRSEL-A bekçisi — G-102 C · G-111 · G-114 B · G-115 C (yalnız saf ölçü; çizim kareyle doğrulandı,
 * `docs/kareler/s5-ga-pano.png`).
 */
import { describe, expect, it } from 'vitest';
import { KAT2_ALANLAR, KAT2_ON_TEZGAH as T, KOVA } from '../src/game/kat';
import { BAND, FLOOR_HALF as H } from '../src/game/layout';
import { KAPI_DIREK_H, ON_DUVAR_H, WALL_H } from '../src/components/three/wallOlcu';
import { kat1DuvarParcalari } from '../src/components/three/wallLook';
import { ALT_KAT, DIS_PAY, KUYU_DERIN, MUTFAK_SAG_DUVAR, altKatCamlari, disKenarlar, kenarBoyu, onKenarMi } from '../src/components/three/kat2/yapiOlcu';

describe('G-114 B — ön duvar iki katta da 1,0', () => {
  it('ölçü: 1,0 m; giriş direkleri duvardan yüksek', () => {
    expect(ON_DUVAR_H).toBe(1.0);
    expect(KAPI_DIREK_H).toBeGreaterThan(ON_DUVAR_H);
  });

  it.each([1, 2, 3])('Kat 1 (%i alan): ön hat 1,0, zeminden; yan/arka tam boy kalır', (a) => {
    const p = kat1DuvarParcalari(a);
    const on = p.filter((x) => x.side === 'front');
    expect(on.length).toBeGreaterThan(0);
    for (const x of on) {
      expect(x.y0 ?? 0).toBe(0);
      expect(x.h).toBe(ON_DUVAR_H);
      expect(x.z).toBeCloseTo(H + 0.5, 6);
    }
    expect(p.some((x) => x.side !== 'front' && (x.h ?? WALL_H) === WALL_H)).toBe(true);
  });

  it('Kat 1: ön hatta vitrin açıklığı yok — ön parçalar kapı boşluğu dışında hattı kesintisiz doldurur', () => {
    const on = kat1DuvarParcalari(3).filter((x) => x.side === 'front');
    const top = on.reduce((s, x) => s + x.w, 0);
    const hat = kat1DuvarParcalari(3).length;
    expect(hat).toBeGreaterThan(on.length);
    // 3 alan: cephe 2H + 2·0,5 pay − kapı boşluğu 4,4
    expect(top).toBeCloseTo(2 * H + 1 - 4.4, 6);
  });

  it('Kat 2: yalnız ön (z = +H) dış kenar 1,0; geri kalan dış duvar 3,2', () => {
    const k = disKenarlar(KAT2_ALANLAR);
    const on = k.filter(onKenarMi);
    expect(on.length).toBe(1);
    expect(on[0].a).toBe(-H);
    expect(on[0].b).toBe(H);
    for (const x of k) expect(kenarBoyu(x)).toBe(onKenarMi(x) ? ON_DUVAR_H : WALL_H);
  });
});

describe('G-102 C + G-111 — mutfak | kova duvarı alçak, ucu tezgâhın arkasında', () => {
  it('alçak (1,0) ve kova hattında', () => {
    expect(MUTFAK_SAG_DUVAR.h).toBe(1.0);
    expect(MUTFAK_SAG_DUVAR.x).toBe(KOVA.x0);
  });

  it('tezgâhın ucu duvarın hattında: duvar tezgâhla çakışmaz, arada aralık da kalmaz', () => {
    expect(T.x1).toBe(MUTFAK_SAG_DUVAR.x);
    const [z0, z1] = [MUTFAK_SAG_DUVAR.z0, MUTFAK_SAG_DUVAR.z1];
    const cakisma = Math.min(z1, T.z1) - Math.max(z0, T.z0);
    expect(cakisma).toBeLessThanOrEqual(0);
    expect(T.z0 - z1).toBeLessThan(0.05);
  });

  it('arka uç dış duvarın ekseninde (G-116)', () => {
    expect(MUTFAK_SAG_DUVAR.z0).toBe(BAND.back - DIS_PAY);
  });
});

describe('G-115 C — Kat 2 bina altı', () => {
  it('gövde Kat 2 dış duvar hatlarında, bir kat (3,2) aşağı iner', () => {
    expect(ALT_KAT.x0).toBe(-H - DIS_PAY);
    expect(ALT_KAT.x1).toBe(H + DIS_PAY);
    expect(ALT_KAT.z1).toBe(H + DIS_PAY);
    expect(ALT_KAT.z0).toBe(BAND.back - DIS_PAY);
    expect(ALT_KAT.derin).toBe(KUYU_DERIN);
  });

  it('camlar cephenin içinde ve silmenin altında; sokak Kat 1 kaldırım grisi', () => {
    const c = altKatCamlari();
    expect(c.length).toBeGreaterThan(0);
    for (const g of c) {
      expect(g.x - g.w / 2).toBeGreaterThan(ALT_KAT.x0);
      expect(g.x + g.w / 2).toBeLessThan(ALT_KAT.x1);
      expect(g.y + g.h / 2).toBeLessThan(-ALT_KAT.silme);
      expect(g.y - g.h / 2).toBeGreaterThan(-ALT_KAT.derin);
    }
    expect(ALT_KAT.sokakRenk).toBe('#9e9e9e');
  });
});
