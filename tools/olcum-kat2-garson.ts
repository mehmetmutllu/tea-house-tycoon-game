/**
 * olcum-kat2-garson.ts — S2 ÖLÇÜMÜ (D-186): Kat 2 GARSONUNUN sayıları (hız · tepsi · kaç garson).
 *
 * Soru: tavla köşesi açılınca gelen garson (yalnız kahve, yalnız tavla masalarına) hangi hız/tepsi/
 * sayıyla oynansın? Bütün zincir açık (22 masa · 2 ocak · garson pad'i), son kademe oyuncu OKEYDE
 * kahve taşır, BÜTÜN yığınları toplar (oto-toplayıcı yok). "Garson yok" kolunda oyuncu her şeyi yapar.
 *
 * Bot (`olcum-kat2-tavla.ts` kalıbı, açgözlü): önce en yakın yığın · tepside kahve varsa sabrı en az
 * kalan istek (garson varken yalnız okey) · yoksa en yakın açık ocak (hazırı olan önce). FARK: bot ve
 * garson AYNI yol ağıyla (`kat.kat2YolAgi`) yürür — bölme + geçit + masa/ocak gövdeleri katı; adımı
 * `kat2Adim` atar. Yani K2-3c'nin "masa gövdeleri yok sayıldı" kısaltması burada yok (sayılar daha gerçekçi,
 * K2-3c tablosuyla bire bir karşılaştırılmaz).
 *
 * Hız kolları Kat 1 garsonundan TÜRER (`economyConfig.waiter`): Kat 1'in son kademesi (2,0) ve onun
 * ×1,5'i (3,0 — oyuncunun tabanı 4,5'in hâlâ altında: kısmi yardım, D-014). Tepsi kolları Kat 1'in
 * tabanı (2) ve tavanı (4). Garson sayısı 1 / 2. `economy.config.ts` DEĞİŞMEZ (D-084).
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-garson.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-garson.ts > docs/olcum-kat2-garson.txt
 */
import { KISA, botDamgasi, damga, damgaOzeti, kipBandi, kisaDeger, korunumDamgasi, varyantDamgasi } from './olcum-lib';
import { attractRadiusFor, charMaxTier, economyConfig, playerSpeedFor, trayCapacityFor } from '../src/config/economy.config';
import { KAT2_KISI, KAT2_MASALAR, OCAKLAR, OKEY_YARI, TAVLA_YARI, VARIS, kat2Adim, kat2YolAgi } from '../src/game/kat';
import { LAYOUT } from '../src/game/layout';

const LAYOUT_PR = LAYOUT.playerRadius;
import { kat2MasaYeri, kat2Tick, kat2YapiHatasi, yeniKat2Dunya, type Kat2Ayar, type Kat2GarsonAyar } from '../src/game/kat2Dongu';

kipBandi();

const DT = 0.1;
const SURE = kisaDeger(20 * 60, 6 * 60);
const ISINMA = kisaDeger(4 * 60, 2 * 60);

type Oyuncu = { ad: string; hiz: number; tepsi: number; miknatis: number };
const GUCLU: Oyuncu = { ad: 'son kademe', hiz: playerSpeedFor(charMaxTier('speed')), tepsi: trayCapacityFor(charMaxTier('tray')), miknatis: attractRadiusFor(charMaxTier('magnet')) };
const ZAYIF: Oyuncu = { ad: 'ilk kademe', hiz: playerSpeedFor(0), tepsi: trayCapacityFor(0), miknatis: attractRadiusFor(0) };

const AYAR: Kat2Ayar = economyConfig.kat2;
const PADLER = AYAR.padler.map((p) => p.id);
damga('zincir yapısı tutarlı', kat2YapiHatasi(AYAR) === null, String(kat2YapiHatasi(AYAR)));
damga('tavla sayıları config\'te', !!AYAR.tavla);

// ---- KOLLAR (Kat 1 garsonundan türetilir)
const K1 = economyConfig.waiter;
const K1_HIZ = K1.speedUpgrades.speeds[K1.speedUpgrades.speeds.length - 1];
const HIZLAR = [K1_HIZ, K1_HIZ * 1.5];
const TEPSILER = [K1.trayBase, K1.trayBase + K1.trayUpgrades.costs.length];
type Kol = { ad: string; g: Kat2GarsonAyar | null };
const KOLLAR: Kol[] = [
  { ad: 'yok', g: null },
  ...[1, 2].flatMap((sayi) =>
    HIZLAR.flatMap((hiz) => TEPSILER.map((tepsi) => ({ ad: `H${hiz.toFixed(1)}·T${tepsi}·×${sayi}`, g: { hiz, tepsi, sayi } }))),
  ),
];
const KISA_KOLLAR = ['yok', `H${HIZLAR[0].toFixed(1)}·T${TEPSILER[0]}·×1`, `H${HIZLAR[1].toFixed(1)}·T${TEPSILER[1]}·×2`];

// ---- YAKLAŞMA NOKTALARI (ayak izinin şişkinliğinin hemen dışı, erişimin içi)
const okeyNokta = (x: number, z: number): [number, number] => [x, z + OKEY_YARI + LAYOUT_PR + 0.13];
const tavlaNokta = (x: number, z: number): [number, number] => [x, z + TAVLA_YARI[1] + LAYOUT_PR + 0.13];

interface Sonuc {
  dk: number;
  dkOkey: number;
  dkTavla: number;
  okeyServis: number;
  okeyKacan: number;
  tavlaServis: number;
  tavlaKacan: number;
  garsonServis: number;
  botMesgul: number;
  garsonMesgul: number;
  garsonOcakta: number;
  ocakBos: number;
  ocakDolu: number;
  botYol: number;
  garsonYol: number;
  iz: string;
}

function kos(kol: Kol, o: Oyuncu, ad: string): Sonuc {
  const ayar: Kat2Ayar = kol.g ? { ...AYAR, garson: kol.g } : AYAR;
  const ag = kat2YolAgi(PADLER);
  let d = yeniKat2Dunya(PADLER, ayar);
  // Masalar ayrı anlarda açılır: döngüleri eşit aralıkla kaydır (K2-3 kalıbı).
  const n = d.masalar.length;
  d.masalar.forEach((m, i) => {
    const oturum = m.tur === 'tavla' ? ayar.tavla!.oturum : ayar.oturum;
    m.t = ayar.gelisAralik + (i * (ayar.gelisAralik + ayar.yurume + oturum)) / n;
  });
  let [x, z] = [VARIS[2][0], VARIS[2][2]];
  let kazanc = 0;
  let olcKazanc = 0;
  let uretilen = 0;
  const tur = { okey: 0, tavla: 0 };
  const s = { okeyServis: 0, okeyKacan: 0, tavlaServis: 0, tavlaKacan: 0, garsonServis: 0 };
  let botMesgulT = 0;
  let garsonMesgulT = 0;
  let garsonOcaktaT = 0;
  let ocakBosT = 0;
  let ocakDoluT = 0;
  let botYol = 0;
  let garsonYol = 0;
  let iz = 0x811c9dc5;

  for (let t = 0; t < SURE; t += DT) {
    const olc = t >= ISINMA;
    let hedef: readonly [number, number];
    let ocakta = false;
    if (d.paralar.length) {
      const p = d.paralar.reduce((a, b) => (ag.uzunluk(x, z, a.x, a.z) <= ag.uzunluk(x, z, b.x, b.z) ? a : b));
      hedef = [p.x, p.z];
    } else {
      const bekleyen = d.masalar.filter((m) => m.durum === 'oyunda' && m.istek > 0 && (!kol.g || m.tur === 'okey'));
      if (d.tepsi > 0 && bekleyen.length) {
        const b = bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c));
        const y = kat2MasaYeri(b.id)!;
        hedef = y.tur === 'tavla' ? tavlaNokta(y.x, y.z) : okeyNokta(y.x, y.z);
      } else {
        const sira = OCAKLAR.map((oc, k) => ({ oc, k, L: ag.uzunluk(x, z, oc.al[0], oc.al[1]) + (d.ocaklar[k].hazir > 0 ? 0 : 1000) }));
        const en = sira.reduce((a, b) => (a.L <= b.L ? a : b));
        hedef = en.oc.al;
        ocakta = true;
      }
    }
    let durdu = true;
    if (Math.hypot(hedef[0] - x, hedef[1] - z) > 0.15) {
      const w = ag.nokta(x, z, hedef[0], hedef[1]);
      const L = Math.hypot(w[0] - x, w[1] - z);
      if (L > 1e-6) {
        durdu = false;
        const k = Math.min(1, (o.hiz * DT) / L);
        const [nx, nz] = kat2Adim(x, z, (w[0] - x) * k, (w[1] - z) * k, ag.acikAlan, ag.engeller);
        botYol += Math.hypot(nx - x, nz - z);
        x = nx;
        z = nz;
      }
    }
    if (olc && !(durdu && ocakta)) botMesgulT += DT;

    const onceGs = [d.garson, ...(d.garsonEk ?? [])].filter((g) => g !== null);
    const r = kat2Tick(d, { x, z, durdu, cuzdan: 0, padsDone: PADLER, tepsiKap: o.tepsi, miknatis: o.miknatis }, DT, ayar);
    damga(`kalkış = yığın (${ad})`, r.olay.kalkan.length === r.olay.dusen.length);
    r.olay.dusen.forEach((miktar, i) => {
      uretilen += miktar;
      if (olc) tur[kat2MasaYeri(r.olay.kalkan[i])!.tur] += miktar;
    });
    d = r.dunya;
    const gs = [d.garson, ...(d.garsonEk ?? [])].filter((g) => g !== null);
    gs.forEach((g, i) => {
      if (onceGs[i]) garsonYol += Math.hypot(g.x - onceGs[i]!.x, g.z - onceGs[i]!.z);
    });
    kazanc += r.kazanc;
    if (olc) {
      olcKazanc += r.kazanc;
      s.tavlaServis += r.olay.tavlaServis;
      s.tavlaKacan += r.olay.tavlaKacan;
      s.okeyServis += r.olay.servis - r.olay.tavlaServis;
      s.okeyKacan += r.olay.kacan - r.olay.tavlaKacan;
      s.garsonServis += r.olay.garsonServis;
      if (gs.length) {
        garsonMesgulT += (DT * gs.filter((g) => g.hedef !== null).length) / gs.length;
        garsonOcaktaT +=
          (DT *
            gs.filter((g) => {
              const k = OCAKLAR.findIndex((oc) => oc.id === g.hedef);
              return k >= 0 && d.ocaklar[k].hazir === 0 && Math.hypot(g.x - OCAKLAR[k].al[0], g.z - OCAKLAR[k].al[1]) <= OCAKLAR[k].erisim;
            }).length) /
          gs.length;
      }
      if (d.ocaklar.every((oc) => oc.hazir === 0)) ocakBosT += DT;
      if (d.ocaklar.every((oc) => oc.hazir >= ayar.ocakKuyruk)) ocakDoluT += DT;
    }
    iz = Math.imul(iz ^ (Math.round(kazanc) * 31 + r.olay.servis * 7 + r.olay.istek + r.olay.garsonServis * 13 + Math.round(d.masalar.reduce((a, m) => a + m.birikim, 0))), 16777619) >>> 0;
  }
  const kalan = d.paralar.reduce((a, p) => a + p.miktar, 0);
  korunumDamgasi(`₺ ${ad}`, Math.round(uretilen - kazanc - kalan));
  const sayilan = SURE - ISINMA;
  return {
    dk: (olcKazanc / sayilan) * 60,
    dkOkey: (tur.okey / sayilan) * 60,
    dkTavla: (tur.tavla / sayilan) * 60,
    ...s,
    botMesgul: botMesgulT / sayilan,
    garsonMesgul: garsonMesgulT / sayilan,
    garsonOcakta: garsonOcaktaT / sayilan,
    ocakBos: ocakBosT / sayilan,
    ocakDolu: ocakDoluT / sayilan,
    botYol,
    garsonYol,
    iz: iz.toString(16),
  };
}

const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const pc = (v: number) => (Number.isFinite(v) ? `%${(v * 100).toFixed(0)}` : '—');
const oran = (a: number, b: number) => (a + b ? a / (a + b) : NaN);

/** Teorik kahve talebi (fincan/dk/masa, her istek anında servis edilirse). */
function talep(oturum: number, kahveAralik: number, istekAdet: number): number {
  const n = Math.max(1, Math.floor((oturum - AYAR.kahveSabir * 0.5) / kahveAralik));
  return (n * istekAdet * 60) / (AYAR.gelisAralik + AYAR.yurume + oturum);
}
const okeySay = KAT2_MASALAR.filter((m) => m.tur === 'okey').length;
const tavlaSay = KAT2_MASALAR.filter((m) => m.tur === 'tavla').length;
const T = AYAR.tavla!;

console.log('=== S2 — KAT 2 GARSONU: hız × tepsi × sayı (bütün zincir açık) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · ${SURE / 60} dk koşu, ilk ${ISINMA / 60} dk ısınma sayılmaz · dt ${DT}`);
console.log(`Bot: ${GUCLU.ad} hız ${GUCLU.hiz} · tepsi ${GUCLU.tepsi} · mıknatıs ${GUCLU.miknatis} | ${ZAYIF.ad} hız ${ZAYIF.hiz} · tepsi ${ZAYIF.tepsi} · mıknatıs ${ZAYIF.miknatis}`);
console.log(`Masalar: ${okeySay} okey (${KAT2_KISI.okey} kişi) + ${tavlaSay} tavla (${KAT2_KISI.tavla} kişi) · ocak ${OCAKLAR.length} × ${f1(60 / AYAR.demleme)} fincan/dk (kuyruk ${AYAR.ocakKuyruk})`);
console.log(`Kahve talebi (teorik): okey ${f1(talep(AYAR.oturum, AYAR.kahveAralik, AYAR.istekAdet) * okeySay)} + tavla ${f1(talep(T.oturum, T.kahveAralik, T.istekAdet) * tavlaSay)} fincan/dk · ocak tavanı ${f1((OCAKLAR.length * 60) / AYAR.demleme)}`);
console.log(`Kat 1 garsonu: hız ${K1.speedUpgrades.speeds.join(' → ')} · tepsi ${K1.trayBase} → ${K1.trayBase + K1.trayUpgrades.costs.length} ⇒ kollar hız ${HIZLAR.map(f1).join(' / ')} × tepsi ${TEPSILER.join(' / ')} × garson 1 / 2`);
console.log('Garson yalnız kahve, yalnız tavla; oyuncu garson varken yalnız okeye taşır, bütün yığınları toplar. "yok": oyuncu her şeyi yapar.');
console.log('meşgul (bot) = ocak önünde boş beklemediği süre · garson meşgul = bir hedefe (masa/ocak) gittiği süre · garson ocakta = ocağın önünde kahve beklediği süre');
console.log('₺/dk = oyuncunun TOPLADIĞI · okey/tavla ₺/dk = masalara DÜŞEN (toplanamayan yığın farkı açar) · kaçan = sayılan sürede düşen istek (fincan)');
console.log('ocak boş = iki ocakta da hazır fincan yok (talep > arz) · ocak dolu = iki ocak da kuyrukta dolu (arz boşta)');

for (const o of KISA ? [GUCLU] : [GUCLU, ZAYIF]) {
  console.log('');
  console.log(`--- ${o.ad.toLocaleUpperCase('tr-TR')} OYUNCU ---`);
  console.log('kol          | ₺/dk  | okey ₺/dk | tavla ₺/dk | okey servis % | tavla servis % | kaçan | garson servis | garson meşgul | garson ocakta | ocak boş | ocak dolu | bot meşgul');
  console.log('-'.repeat(170));
  let tabanIz = '';
  const kollar = KISA ? KOLLAR.filter((k) => KISA_KOLLAR.includes(k.ad)) : o === ZAYIF ? KOLLAR.filter((k) => k.ad === 'yok' || k.g?.sayi === 1) : KOLLAR;
  for (const kol of kollar) {
    const ad = `${o.ad} ${kol.ad}`;
    const r = kos(kol, o, ad);
    botDamgasi(ad, r.botYol, SURE / 60, 30);
    if (kol.g) {
      botDamgasi(`garson ${ad}`, r.garsonYol, SURE / 60, 30);
      varyantDamgasi(ad, tabanIz, r.iz);
    } else tabanIz = r.iz;
    const g = !!kol.g;
    console.log(
      `${kol.ad.padEnd(12)} | ${f0(r.dk).padStart(5)} | ${f0(r.dkOkey).padStart(9)} | ${f0(r.dkTavla).padStart(10)} | ${pc(oran(r.okeyServis, r.okeyKacan)).padStart(13)} | ${pc(oran(r.tavlaServis, r.tavlaKacan)).padStart(14)} | ${String(r.okeyKacan + r.tavlaKacan).padStart(5)} | ${(g ? String(r.garsonServis) : '—').padStart(13)} | ${(g ? pc(r.garsonMesgul) : '—').padStart(13)} | ${(g ? pc(r.garsonOcakta) : '—').padStart(13)} | ${pc(r.ocakBos).padStart(8)} | ${pc(r.ocakDolu).padStart(9)} | ${pc(r.botMesgul)}`,
    );
  }
}

damgaOzeti();
