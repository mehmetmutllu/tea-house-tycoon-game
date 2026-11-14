/**
 * kat2-g-turu.test.ts — D-198 BEKÇİSİ: oyun testi 2026-11-14 G2 · G3 · G4 (Kat 2 görsel/yerleşim turu).
 * (G1 Kat 1 parası `kasa-oyun.test.ts`; G5 ölçümü `tools/olcum-kat2-g5.ts`.)
 *
 *  G2 mutfak: ön tezgâh bandın içinde ve KATI — oyuncu kahve alma noktasından tezgâha doğru yürüse de
 *     gövdesi tezgâha girmez; kahve alma noktası erişimde kalır; ocaklar tezgâhın üstünde.
 *  G3 duvar: kameraya bakan bölmeler (z sabit, kapalı alan önde) alçak; yan bölme tam boy.
 *  G4 grup: herkes aynı hızla, sabit aralıkla — yolun ortak kısmında iki üye birbirine binmez.
 *  G5 okey: config = kol G2 — grup oturunca hemen kahve ister, kahve parası teslimde düşer.
 */
import { describe, it, expect } from 'vitest';
import { economyConfig as C } from '../src/config/economy.config';
import { kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya, type Kat2Girdi } from '../src/game/kat2Dongu';
import {
  KAT2_ALANLAR,
  KAT2_BOLMELER,
  KAT2_MASALAR,
  KAT2_ON_TEZGAH,
  OCAK,
  OCAKLAR,
  OKEY_ERISIM,
  OKEY_YER,
  ON_BOLME_H,
  PARA_DUSME_DZ,
  kameraBakanBolme,
  kat2Adim,
  kat2Engeller,
} from '../src/game/kat';
import { BAND, LAYOUT } from '../src/game/layout';
import { GRUP_ARA, GRUP_HIZ, gelisHizi, gelisOrani, grupYolu, oturakYerleri, yolKur, yolNoktasi, type Nokta } from '../src/components/three/kat2/yol';
import { KADEME_MAX, KAT2_MUTFAK_ADIM, kat2MutfakSeviyesi } from '../src/components/three/kitchenLook';

const PR = LAYOUT.playerRadius;

describe('G2 — mutfağın ön tezgâhı', () => {
  it('tezgâh bandın içinde (ön yüzü bant hattında), sol duvardan merdiven kovasına', () => {
    expect(KAT2_ON_TEZGAH.z1).toBe(BAND.front);
    expect(KAT2_ON_TEZGAH.z0).toBeLessThan(BAND.front);
    expect(KAT2_ON_TEZGAH.x1).toBe(BAND.stairs.minX);
  });

  it('ilk ocak açıksa tezgâh katı gövdedir; kapalıyken yok', () => {
    const t = KAT2_ON_TEZGAH;
    const var_ = (pads: string[]) =>
      kat2Engeller(pads).some((s) => Math.abs(s.c[2] - (t.z0 + t.z1) / 2) < 1e-9 && Math.abs(s.h[0] - (t.x1 - t.x0) / 2) < 1e-9);
    expect(var_([OCAK.id])).toBe(true);
    expect(var_([])).toBe(false);
  });

  it('oyuncu tezgâha doğru yürüse de gövdesi tezgâha girmez, kahve alma noktası erişimde kalır', () => {
    const pads = OCAKLAR.map((o) => o.id);
    const eng = kat2Engeller(pads);
    for (const o of OCAKLAR) {
      let [x, z] = o.al;
      for (let i = 0; i < 60; i++) [x, z] = kat2Adim(x, z, 0, -0.1, 1, eng);
      expect(z - PR, o.id).toBeGreaterThanOrEqual(BAND.front - 1e-6);
      expect(Math.hypot(x - o.al[0], z - o.al[1]), o.id).toBeLessThanOrEqual(o.erisim);
      // ocak (kahve seti) tezgâhın üstünde, kendi alma noktasının hizasında
      expect(o.z).toBeGreaterThan(KAT2_ON_TEZGAH.z0);
      expect(o.z).toBeLessThan(KAT2_ON_TEZGAH.z1);
      expect(o.x).toBe(o.al[0]);
    }
  });

  it('mutfak Kat 2 ilerlemesiyle büyür: varışta 1, adımların hepsi bitince Kat 1 mutfağının tepe seviyesi', () => {
    expect(kat2MutfakSeviyesi([])).toBe(1);
    expect(kat2MutfakSeviyesi(['k2okey4'])).toBe(2);
    expect(kat2MutfakSeviyesi([...KAT2_MUTFAK_ADIM])).toBe(Math.min(KADEME_MAX, 1 + KAT2_MUTFAK_ADIM.length));
    expect(1 + KAT2_MUTFAK_ADIM.length).toBeLessThanOrEqual(KADEME_MAX);
  });
});

describe('G3 — kameraya bakan bölme alçak', () => {
  it('z sabit bölmelerin hepsi kameraya bakar ve kapalı (sonraki) alan önde, yan bölme tam boy', () => {
    for (const b of KAT2_BOLMELER) {
      if (!kameraBakanBolme(b)) {
        expect(b.x1).toBe(b.x2);
        continue;
      }
      const [arka, on] = b.alanlar;
      expect(KAT2_ALANLAR[on].z0).toBeGreaterThanOrEqual(b.z1);
      expect(KAT2_ALANLAR[arka].z1).toBeLessThanOrEqual(b.z1);
      expect(on).toBeGreaterThan(arka); // önce arka alan açılır → duvar hep oyuncu ile kamera arasında
    }
    expect(KAT2_BOLMELER.some(kameraBakanBolme)).toBe(true);
  });

  it('alçak bölme oyuncunun yarı boyunun altında (gövde görünür)', () => {
    expect(ON_BOLME_H).toBeLessThanOrEqual(0.6);
    expect(ON_BOLME_H).toBeGreaterThan(0);
  });
});

describe('G4 — grup tek sıra yürür', () => {
  const T = 9;
  const ornek = (yol: ReturnType<typeof yolKur>, u: number): Nokta => {
    const p: Nokta = [0, 0, 0];
    yolNoktasi(yol, u, p);
    return p;
  };

  it('herkes T içinde oturağında; hız ortak ve tabandan düşük değil', () => {
    for (const m of KAT2_MASALAR) {
      const boylar = oturakYerleri(m.tur).map((o, k) => yolKur(grupYolu(m, o, k)).boy);
      const v = gelisHizi(boylar, T);
      expect(v).toBeGreaterThanOrEqual(GRUP_HIZ);
      boylar.forEach((b, k) => expect(gelisOrani(b, k, T, v), `${m.id} ${k}`).toBeCloseTo(1, 6));
    }
  });

  it('yolda (ikisi de yürürken, oturak yaklaşımı hariç) ardışık iki üye arası ≥ 0,8 m', () => {
    let enAz = Infinity;
    for (const m of KAT2_MASALAR) {
      const yollar = oturakYerleri(m.tur).map((o, k) => yolKur(grupYolu(m, o, k)));
      const v = gelisHizi(yollar.map((y) => y.boy), T);
      for (let t = 0; t <= T; t += 0.05) {
        for (let k = 1; k < yollar.length; k++) {
          const a = yollar[k - 1];
          const b = yollar[k];
          const ua = gelisOrani(a.boy, k - 1, t, v);
          const ub = gelisOrani(b.boy, k, t, v);
          // ikisi de yolda ve oturağa son 2,5 m'ye girmemiş (orada her biri kendi oturağına ayrılır)
          if (ub <= 0 || ua >= 1 || (1 - ua) * a.boy < 2.5 || (1 - ub) * b.boy < 2.5) continue;
          const pa = ornek(a, ua);
          const pb = ornek(b, ub);
          enAz = Math.min(enAz, Math.hypot(pa[0] - pb[0], pa[2] - pb[2]));
        }
      }
    }
    expect(enAz).toBeGreaterThanOrEqual(0.8);
    expect(GRUP_ARA * GRUP_HIZ).toBeGreaterThanOrEqual(0.8);
  });
});

describe('G5 — okey masası ilk saniyeden iş verir (config = kol G2)', () => {
  const K: Kat2Ayar = C.kat2;
  const PADS = ['k2okey1', OCAK.id];
  const M1 = OKEY_YER[0];
  const MASA_ONU: [number, number] = [M1.x, M1.z + OKEY_ERISIM - 0.2];
  const UZAK: [number, number] = [0, -1];
  const girdi = (yer: [number, number]): Kat2Girdi => ({ x: yer[0], z: yer[1], durdu: true, cuzdan: 0, padsDone: PADS, tepsiKap: 6, miknatis: 0.5 });
  const sur = (d: Kat2Dunya, sn: number, yer: [number, number], tepsi?: number) => {
    const top = { istek: 0, servis: 0, dusen: [] as number[], kazanc: 0 };
    for (let t = 0; t < sn - 1e-9; t += 0.1) {
      const r = kat2Tick(tepsi === undefined ? d : { ...d, tepsi }, girdi(yer), 0.1, K);
      d = r.dunya;
      top.istek += r.olay.istek;
      top.servis += r.olay.servis;
      top.dusen.push(...r.olay.dusen);
      top.kazanc += r.kazanc;
    }
    return { d, ...top };
  };

  it('ilk grup ilkGelis\'te gelir ve oturduğu an kahve ister', () => {
    let r = sur(yeniKat2Dunya(PADS, K), K.ilkGelis! + 0.1, UZAK);
    expect(r.d.masalar[0].durum).toBe('geliyor');
    r = sur(r.d, K.yurume + 0.2, UZAK);
    expect(r.d.masalar[0].durum).toBe('oyunda');
    expect(r.istek).toBe(K.istekAdet);
  });

  it('teslim edilen kahvenin parası o anda masanın önüne düşer (kalkışı beklemez)', () => {
    const d = sur(yeniKat2Dunya(PADS, K), K.ilkGelis! + K.yurume + 0.3, UZAK).d;
    const s = kat2Tick({ ...d, tepsi: 2 }, { ...girdi(MASA_ONU), miknatis: 0 }, 0.1, K);
    expect(s.olay.servis).toBe(2);
    expect(s.olay.dusen).toEqual([2 * K.kahveFiyat]);
    expect(s.dunya.masalar[0].birikim).toBe(0);
    expect(s.dunya.paralar[0]).toMatchObject({ x: M1.x, z: M1.z + PARA_DUSME_DZ });
  });

  it('tam oturum: birçok küçük para olayı, toplam = ücret + servis × fiyat (korunum)', () => {
    const r = sur(yeniKat2Dunya(PADS, K), K.ilkGelis! + K.yurume + K.oturum + 1, MASA_ONU, 6);
    expect(r.dusen.length).toBeGreaterThanOrEqual(4);
    expect(r.dusen.reduce((a, b) => a + b, 0)).toBe(K.masaUcreti + r.servis * K.kahveFiyat);
    expect(r.dusen.at(-1)).toBe(K.masaUcreti);
  });
});
