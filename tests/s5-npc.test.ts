/**
 * s5-npc.test.ts — S5 NPC bekçisi (oyun testi 2026-11-20).
 *
 * G-100 "gelen müşteri merdiven hizasından alana geçerken kayboluyor": kuyunun DIŞINDA (önü, yanları,
 *   arkası) basamak yüksekliği 0 — eskiden kuyunun önü kuyu dibi sayılıyor, grup zeminin altında yürüyordu.
 * G-99 "çıkan müşteri salonun ortasında yok oluyor": çıkış yolu oturakta başlar, kuyu dibinde biter;
 *   geliş yolunun engel/Sv/kova kurallarına uyar; grup YALNIZ kuyunun içinde, inerken söner.
 * G-100 (devamı): sıradaki grup her Sv'de ve ilk gelişte yolun BAŞINDA belirir (ortada beliren yok).
 * G-109 "kahveci sağa sola yürüsün": usta tezgâhın arkasında setinin iki yanı arasında gidip gelir (`kahveUstaYol`).
 */
import { describe, it, expect } from 'vitest';
import { AGIZ, KAT2_ON_TEZGAH, KAT2_LAVABO_PAD, KAT2_MASALAR, KAT2_SALON_PAD, KOVA, KUYU, OCAKLAR, kat2Engeller, masaGovdesi } from '../src/game/kat';
import { BAND, BAND_SHELL, FLOOR_HALF, type Solid } from '../src/game/layout';
import {
  SONME_SN, GRUP_HIZ, cikisPozu, cikisSuresi, cikisYolu, gelisGecen, gelisHizi, gelisOrani, gerekenOnce, grupYolu,
  merdivenY, oturakYerleri, yolKur, yolNoktasi, type Nokta,
} from '../src/components/three/kat2/yol';
import { kat2SvTetikleri, svCarpan, type Kat2Ayar } from '../src/game/kat2Dongu';
import { economyConfig } from '../src/config/economy.config';
import { kahveBekleyen, ustaFazAdimi, ustaPozu, ustaYolu } from '../src/components/three/kat2/kahveUstaYol';
import { SET_OLCEK } from '../src/components/three/kat2/esyaOlcu';

const AYAR = economyConfig.kat2 as Kat2Ayar;
const HEPSI = [...KAT2_SALON_PAD, ...KAT2_MASALAR.map((m) => m.id), ...OCAKLAR.map((o) => o.id), KAT2_LAVABO_PAD];
const PAY = 0.05;
/** `Grup.tsx`teki `ONCE_EN_COK` (görsel sabit; bileşen dosyasından içe alınamaz — three/React yükler). */
const ONCE_EN_COK = 24;

const icinde = (s: Solid, x: number, z: number) => Math.abs(x - s.c[0]) < s.h[0] - PAY && Math.abs(z - s.c[2]) < s.h[1] - PAY;
const kuyuIcinde = (x: number, z: number) => Math.abs(x) < AGIZ.x && z > AGIZ.arka && z < AGIZ.on;

function ornekle(n: Nokta[]): { x: number; z: number; i: number }[] {
  const out: { x: number; z: number; i: number }[] = [];
  for (let i = 1; i < n.length; i++) {
    const [ax, , az] = n[i - 1];
    const [bx, , bz] = n[i];
    const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1));
    for (let j = 0; j <= k; j++) out.push({ x: ax + ((bx - ax) * j) / k, z: az + ((bz - az) * j) / k, i });
  }
  return out;
}

const ornekler = KAT2_MASALAR.flatMap((m) =>
  [1, 4].flatMap((sv) =>
    oturakYerleri(m.tur, sv).map((o, k) => ({ m, sv, o, k, gel: grupYolu(m, o, k), cik: cikisYolu(m, o, k) })),
  ),
);

describe('G-100 merdivenY: kuyu dışı zemin', () => {
  it('kuyunun önü, yanları ve arkası 0; içi [−3,2, 0]', () => {
    for (let x = -6; x <= 6; x += 0.1) {
      for (let z = AGIZ.arka - 2; z <= AGIZ.on + 4; z += 0.1) {
        const y = merdivenY(x, z);
        if (!kuyuIcinde(x, z)) expect(y, `(${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(0);
        else expect(y >= -3.2 && y <= 0).toBe(true);
      }
    }
  });

  it('her geliş/çıkış yolunda kuyu dışındaki her nokta zeminde', () => {
    for (const { m, k, gel, cik } of ornekler) {
      for (const n of [gel, cik]) {
        const y = yolKur(n);
        const p: Nokta = [0, 0, 0];
        for (let u = 0; u <= 1; u += 0.005) {
          yolNoktasi(y, u, p);
          if (!kuyuIcinde(p[0], p[2])) expect(p[1], `${m.id}#${k} (${p[0].toFixed(2)}, ${p[2].toFixed(2)})`).toBe(0);
        }
      }
    }
  });
});

describe('G-99 çıkış yolu', () => {
  it('oturakta başlar, kuyu dibinde (y < −2,5) biter', () => {
    for (const { m, o, k, cik } of ornekler) {
      const [x0, , z0] = cik[0];
      expect(x0).toBeCloseTo(m.x + o[0], 6);
      expect(z0).toBeCloseTo(m.z + o[1], 6);
      const son = cik[cik.length - 1];
      expect(kuyuIcinde(son[0], son[2]), `${m.id}#${k} kuyuda bitmiyor`).toBe(true);
      expect(son[1], `${m.id}#${k}`).toBeLessThan(-2.5);
    }
  });

  it('başka masanın / ocağın gövdesinden geçmez; kat ve kova sınırında; kuyuya yalnız son bacakta girer', () => {
    const engel = kat2Engeller(HEPSI);
    const ihlal = new Set<string>();
    for (const { m, k, cik } of ornekler) {
      const kendi = masaGovdesi(m);
      const baska = engel.filter((s) => s.c[0] !== kendi.c[0] || s.c[2] !== kendi.c[2]);
      for (const p of ornekle(cik)) {
        if (baska.some((s) => icinde(s, p.x, p.z))) ihlal.add(`${m.id}#${k} engelde`);
        if (Math.abs(p.x) > FLOOR_HALF || p.z > FLOOR_HALF) ihlal.add(`${m.id}#${k} kat dışında`);
        if (p.z < BAND.front && !(p.x > KOVA.x0 && p.x < KOVA.x1)) ihlal.add(`${m.id}#${k} bantta mutfak/lavabo odasına taşıyor`);
        if (p.i < cik.length - 1 && icinde(KUYU, p.x, p.z)) ihlal.add(`${m.id}#${k} kuyuya erken giriyor`);
      }
    }
    expect([...ihlal]).toEqual([]);
  });

  it('hiçbir Sv çerçevesinin içinden geçmez', () => {
    const kol = { fiyat: [0, 1, 2, 3, 4], ucretCarpan: [1, 1, 1, 1, 1], kahveAralikCarpan: [1, 1, 1, 1, 1], gelisAralikCarpan: [1, 1, 1, 1, 1] };
    const tetikler = kat2SvTetikleri({ ...AYAR, masaSv: { okey: kol, tavla: kol } }, HEPSI, {});
    const ihlal: string[] = [];
    for (const { m, k, sv, cik } of ornekler) {
      if (sv !== 1) continue;
      for (const p of ornekle(cik)) {
        const t = tetikler.find((r) => Math.abs(p.x - r.x) < r.w / 2 - PAY && Math.abs(p.z - r.z) < r.d / 2 - PAY);
        if (t) { ihlal.push(`${m.id}#${k} → ${t.id}`); break; }
      }
    }
    expect(ihlal).toEqual([]);
  });

  it('çıkan grup YALNIZ kuyunun içinde, inerken söner; bütün grup `cikisSuresi`nde biter', () => {
    const dt = 1 / 60;
    for (const { m, k, sv, cik } of ornekler) {
      if (sv !== 1) continue;
      const y = yolKur(cik);
      const p: Nokta = [0, 0, 0];
      let goruldu = false;
      for (let t = 0; t < 120; t += dt) {
        const poz = cikisPozu(y.boy, k, t);
        if (!poz) {
          if (goruldu) break;
          continue;
        }
        goruldu = true;
        yolNoktasi(y, poz.u, p);
        if (poz.olcek < 1) {
          expect(kuyuIcinde(p[0], p[2]), `${m.id}#${k} t ${t.toFixed(2)} kuyu dışında sönüyor (${p[0].toFixed(2)}, ${p[2].toFixed(2)})`).toBe(true);
          expect(p[1], `${m.id}#${k} zeminde sönüyor`).toBeLessThan(-2.5);
        }
      }
      expect(goruldu).toBe(true);
      expect(cikisPozu(y.boy, k, k * 0.7 + y.boy / GRUP_HIZ + 1e-6)).toBeNull();
    }
    const boylar = oturakYerleri('okey').map((o, k) => yolKur(cikisYolu(KAT2_MASALAR[0], o, k)).boy);
    expect(cikisSuresi(boylar) + SONME_SN).toBeGreaterThan(5.5 + SONME_SN);
  });
});

describe('G-100 sıradaki grup yolun başında belirir (Sv1..5 + ilk geliş)', () => {
  const dt = 1 / 30;
  /** `Grup.tsx` `useFrame`in geliş kısmı: masa durum zinciri karede yürütülür; ilk görünen u ve gelişin sonu döner. */
  function kos(m: (typeof KAT2_MASALAR)[number], sv: number, ilk: boolean) {
    const oturaklar = oturakYerleri(m.tur, sv);
    const boylar = oturaklar.map((o, k) => yolKur(grupYolu(m, o, k)).boy);
    const once = Math.min(gerekenOnce(boylar, AYAR.yurume), ONCE_EN_COK);
    const bosSure = AYAR.gelisAralik * svCarpan(AYAR.masaSv?.[m.tur]?.gelisAralikCarpan, sv);
    const zincir: [string, number][] = ilk
      ? [['bos', AYAR.ilkGelis ?? AYAR.gelisAralik], ['geliyor', AYAR.yurume]]
      : [['oyunda', AYAR.oturum], ['bos', bosSure], ['geliyor', AYAR.yurume]];
    let hOnce = ilk ? Math.min(once, AYAR.ilkGelis ?? AYAR.gelisAralik) : once;
    const ilkU: (number | null)[] = boylar.map(() => null);
    let sonU: number[] = [];
    let hizEn = 0;
    for (const [durum, sure] of zincir) {
      for (let t = sure; t > -dt / 2; t -= dt) {
        const tt = Math.max(0, t);
        if (durum === 'oyunda') hOnce = once;
        const gecen = gelisGecen(durum, tt, hOnce, AYAR.yurume, bosSure);
        if (gecen == null) continue;
        const hiz = gelisHizi(boylar, AYAR.yurume + hOnce);
        hizEn = Math.max(hizEn, hiz);
        sonU = boylar.map((b, k) => gelisOrani(b, k, gecen, hiz));
        sonU.forEach((u, k) => {
          if (u > 0 && ilkU[k] == null) ilkU[k] = u;
        });
      }
    }
    return { ilkU, sonU, boylar, hizEn };
  }

  for (const ilk of [true, false]) {
    for (const sv of ilk ? [1] : [1, 2, 3, 4, 5]) {
      it(`${ilk ? 'ilk geliş' : `Sv${sv}`}: her üye u ≈ 0'da belirir, geliş bitince oturakta`, () => {
        for (const m of KAT2_MASALAR) {
          const { ilkU, sonU, boylar, hizEn } = kos(m, sv, ilk);
          ilkU.forEach((u, k) => {
            expect(u, `${m.id}#${k} hiç yola çıkmadı`).not.toBeNull();
            // İlk görünen kare yolun en çok bir karelik adımı (dt × hız) kadar ileride olabilir.
            expect(u!, `${m.id}#${k} yolun ${((u ?? 0) * 100).toFixed(1)}%'inde belirdi`).toBeLessThanOrEqual((hizEn * dt) / boylar[k] + 1e-9);
          });
          sonU.forEach((u, k) => expect(u, `${m.id}#${k} oturağa varmadı`).toBeCloseTo(1, 6));
        }
      });
    }
  }
});

describe('G-109 kahve ustası yürür (Kat 1 çaycısının uyarlaması)', () => {
  const T = KAT2_ON_TEZGAH;
  const yollar = OCAKLAR.map((o) => ({ o, y: ustaYolu(o) }));

  it('yol ön tezgâhın ARKASINDA, tezgâh boyunda; ortası eski duruş; komşu ustanın yoluna değmez', () => {
    for (const { o, y } of yollar) {
      for (const [x, z] of [y.a, y.b]) {
        expect(z, `${o.id} tezgâhın önünde`).toBeLessThan(T.z0 - 0.3);
        expect(z, `${o.id} mutfağın arka duvarında`).toBeGreaterThan(BAND_SHELL.back + 0.7);
        expect(x > T.x0 + 0.3 && x < T.x1 - 0.3, `${o.id} tezgâh boyunun dışında (x ${x.toFixed(2)})`).toBe(true);
      }
      expect((y.a[0] + y.b[0]) / 2).toBeCloseTo(o.x + 0.25 * SET_OLCEK, 6);
      expect(y.b[0] - y.a[0], `${o.id} yürüyecek yer yok`).toBeGreaterThan(1.5);
    }
    const sirali = yollar.map((r) => r.y).sort((p, q) => p.a[0] - q.a[0]);
    for (let i = 1; i < sirali.length; i++) expect(sirali[i].a[0] - sirali[i - 1].b[0], 'iki usta iç içe').toBeGreaterThan(1);
  });

  it('yürürken gidiş yönüne, uçta ve yüksüzken tezgâha (+z) bakar', () => {
    const { y } = yollar[0];
    let uc = 0;
    let yuru = 0;
    for (let f = 0; f < Math.PI * 4; f += 0.01) {
      const p = ustaPozu(y, f, true);
      const sonra = ustaPozu(y, f + 0.001, true);
      if (p.duruyor) {
        uc++;
        expect(p.aci).toBe(y.yuz);
      } else {
        yuru++;
        expect(Math.sin(p.aci), `faz ${f.toFixed(2)} geri geri yürüyor`).toBeCloseTo(Math.sign(sonra.x - p.x), 6);
      }
      expect(ustaPozu(y, f, false).aci).toBe(y.yuz);
    }
    expect(uc).toBeGreaterThan(0);
    expect(yuru).toBeGreaterThan(uc);
  });

  it('tempo bekleyen kahveden: yük yokken faz donar, yük arttıkça hızlanır', () => {
    expect(kahveBekleyen([{ istek: 2 }, { istek: 0 }, { istek: 1 }])).toBe(3);
    expect(ustaFazAdimi(1 / 60, 0)).toBe(0);
    expect(ustaFazAdimi(1 / 60, 1)).toBeGreaterThan(0);
    expect(ustaFazAdimi(1 / 60, 4)).toBeGreaterThan(ustaFazAdimi(1 / 60, 1));
  });
});
