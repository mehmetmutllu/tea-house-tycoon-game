/**
 * olcum-kat2-akis.ts — K2-6 ÖLÇÜMÜ: D-191 akışının zinciri (yalnız ölçüm, D-084). Fiyatlar/sıra
 * koda/config'e YAZILMAZ; kollar araçta kurulur.
 *
 * D-191 neyi değiştirdi (geometri kodda, `kat.ts`): düzen N7 · bölme yok (kapalı alanın önünde tam
 * duvar) · 2. ocak bantta (x −13,2) · lavabo bandın sağ köşesinde. Ekonomiye dokunan üçü ÖLÇÜLÜR:
 *   ① kata çıkışta `k2okey2` + `k2cezve` HAZIR (bedava) gelir → zincir 2 pad kısalır,
 *   ② zincire `k2lavabo` girer (2. ocaktan ve okey salonundan sonra, tavla köşesinden önce),
 *   ③ Kat 1'de MERDİVEN PAD'i (Kat 1'in son pad'i bitince) — fiyatı Kat 1'in geliriyle bekleme dakikası.
 * Lavabonun mekaniği açık soru → iki varyant: L0 süs (gelir yok) · L1 Kat 1 gibi (kalkan grubun her
 * kişisi Kat 1 L1 oranıyla uğrar, lavabonun önüne ayrı yığın bırakır; bot o yığını da toplar).
 *
 * Yöntem `olcum-kat2-zincir` (K2-5) ile aynı: bitmiş Kat 1 (yükseltmesiz, karakter son kademe), Kat 1
 * oyuncu yokken gerçek store'da koşturulup İZ'i alınır, iz kasaya akar (D-185, sınır 20 dk); Kat 2
 * `kat2Tick` + bot (masa gövdelerini yok sayar; D-191'de açık alanlar arası duvar yok → düz yürür).
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-akis.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-akis.ts > docs/olcum-kat2-akis.txt
 * Mutasyon (doğrulama): AKIS_MUT=bedavasiz (başlangıç pad'leri verilmez) · AKIS_MUT=lavaboyigin (L1
 * yığını toplanmaz) — iki mutasyon da ilgili satırı tabandan ayırmalı.
 */
import { KISA, botDamgasi, damga, damgaOzeti, izOlustur, kipBandi, kisaDeger, korunumDamgasi, seedRandom, takilmaDamgasi, varyantDamgasi, yuzdelik } from './olcum-lib';
import { attractRadiusFor, charMaxTier, economyConfig as C, playerSpeedFor, trayCapacityFor } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import {
  AGIZ,
  GECIS_SN,
  KAT2_KISI,
  KAT2_LAVABO_PAD,
  KAT2_LAVABO_YER,
  OCAKLAR,
  OKEY_ERISIM,
  TAVLA_ERISIM,
  VARIS,
  kat2AcikAlan,
  kat2Adim,
} from '../src/game/kat';
import { kat2MasaYeri, kat2PadYeri, kat2Tick, kat2ZincirHatasi, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya } from '../src/game/kat2Dongu';
import { incomeRate } from '../src/game/rules';
import { collectionMult } from '../src/game/goals';
import { THE_SERVICE } from '../src/game/world';
import { BAND, LAYOUT } from '../src/game/layout';
import { D, type Decimal } from '../src/game/decimal';
import { kasaBosalt, kasaDolu, kasaSiniri, kasayaAt } from '../src/game/kasa';
import type { Vec3 } from '../src/game/types';

kipBandi();

const MUT = process.env.AKIS_MUT ?? '';
const DT = 0.1;
const UFUK = kisaDeger(10 * 3600, 3 * 3600);
const IZ_ISINMA = kisaDeger(5 * 60, 3 * 60);
const IZ_SURE = kisaDeger(60 * 60, 10 * 60);
const KASA_DK = 20; // D-185
const KASA_YER: readonly [number, number] = [-10.8, -9.3]; // D-185 tezgâh ucu
const UZAK = { x: 0, z: 400 };
const PAD_SN = 3.5;

const HIZ = playerSpeedFor(charMaxTier('speed'));
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const MIKNATIS = attractRadiusFor(charMaxTier('magnet'));
const g = () => useGame.getState();
const CFG = C.kat2 as unknown as Kat2Ayar;
const { garson: _garson, ...CFG_TEMEL } = CFG;

/** Kat 1 lavabosunun L1'i (config `rooms.lavabo`): kişi başı beklenen ₺ = uğrama × ücret. */
const LAV = C.rooms.lavabo;
const LAV_KISI = LAV.visitChanceByLevel[0] * LAV.feeByLevel[0];

// ---------------------------------------------------------------------------------------------
// ZİNCİRLER
// ---------------------------------------------------------------------------------------------
const TAVLALAR = Array.from({ length: 12 }, (_, i) => `k2tavla${i + 1}`);
/** Bugünkü config (D-186 sırası, D-188 fiyatları) — TABAN. */
const BUGUN: readonly string[] = CFG.padler.map((p) => p.id);
const BEDAVA: readonly string[] = ['k2okey2', 'k2cezve'];
/** D-191 sırası: hazır masa + ocak → merdiven salonunun kalanı → okey salonu (2. ocak araya) → lavabo → tavla köşesi + garson. */
const D191: readonly string[] = [
  'k2okey1', 'k2okey3', 'k2okey4', 'k2salon2', 'k2s2okey1', 'k2s2okey2', 'k2cezve2',
  'k2s2okey3', 'k2s2okey4', 'k2s2okey5', 'k2s2okey6', KAT2_LAVABO_PAD, 'k2salon3', 'k2garson', ...TAVLALAR,
];

const yuvarla = (v: number): number => {
  const adim = v < 1_000 ? 50 : v < 10_000 ? 100 : v < 100_000 ? 500 : 5_000;
  return Math.max(adim, Math.round(v / adim) * adim);
};

/** Teorik Kat 2 oranı (₺/dk, her istek servis edilirse) + lavabo L1 varsa onun beklenen payı. */
function kat2Oran(pads: readonly string[], lavabo: boolean): number {
  const kahve = pads.some((id) => OCAKLAR.some((o) => o.id === id));
  const lav = lavabo && pads.includes(KAT2_LAVABO_PAD);
  let r = 0;
  for (const id of pads) {
    const m = kat2MasaYeri(id);
    if (!m) continue;
    const a = m.tur === 'tavla' ? CFG.tavla! : CFG;
    const n = kahve ? Math.max(1, Math.floor((a.oturum - CFG.kahveSabir * 0.5) / a.kahveAralik)) : 0;
    const lavPay = lav ? KAT2_KISI[m.tur] * LAV_KISI : 0;
    r += ((a.masaUcreti + n * a.istekAdet * a.kahveFiyat + lavPay) * 60) / (CFG.gelisAralik + CFG.yurume + a.oturum);
  }
  return r;
}

/** Sabit bekleyiş: pad i = o anki teorik gelirin (Kat 1 + açık Kat 2) N dakikası. */
const sabitBekleyis = (dk: number, r1: number, bas: readonly string[], sira: readonly string[], lavabo: boolean) =>
  sira.map((_, i) => yuvarla(dk * (r1 + kat2Oran([...bas, ...sira.slice(0, i)], lavabo))));

// ---------------------------------------------------------------------------------------------
// KAT 1 İZİ (olcum-kat2-zincir ile aynı)
// ---------------------------------------------------------------------------------------------
function kat1Izi(): { iz: Float64Array; r1Dk: number; r1Ideal: number } {
  seedRandom(7);
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  g().kat2Ac();
  useGame.setState({ charUpgrades: { ...g().charUpgrades, speed: charMaxTier('speed'), tray: charMaxTier('tray'), magnet: charMaxTier('magnet') } });
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { acik: true, padsDone: [] }, kat2Dunya: yeniKat2Dunya([], CFG) });
  const s0 = g();
  let tip = 0;
  for (let i = 0; i < s0.tables; i++) tip += C.tables.tipBase * (s0.tableLevels[i] ?? 0);
  const r1Ideal = incomeRate(s0.tables, s0.stationLevels[THE_SERVICE], tip, s0.lavaboLevel, collectionMult(s0.goalsClaimed ?? [])) * 60;
  g().setKeyboardInput(0, 0);
  const n = Math.round(IZ_SURE / DT);
  const iz = new Float64Array(n);
  let once = new Map<number, number>();
  const nIsinma = Math.round(IZ_ISINMA / DT);
  for (let i = 0; i < nIsinma + n; i++) {
    g().tick(DT);
    useGame.setState({ kasa: D(0) } as never);
    const simdi = new Map(g().coins.map((c) => [c.id, c.value]));
    let giden = 0;
    for (const [id, v] of once) if (!simdi.has(id)) giden += v;
    once = simdi;
    if (i >= nIsinma) iz[i - nIsinma] = giden;
  }
  return { iz, r1Dk: (iz.reduce((a, b) => a + b, 0) / IZ_SURE) * 60, r1Ideal };
}

// ---------------------------------------------------------------------------------------------
// BOT YOLU — D-191: açık alanlar arası duvar yok → düz; yalnız merdiven kovası koridoru.
// ---------------------------------------------------------------------------------------------
const uz = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const KX = VARIS[2][0];
const KAPI_Z = BAND.front + 0.8;
const MERDIVEN: readonly [number, number] = [0, AGIZ.sahanlik - LAYOUT.playerRadius - 0.1];
const kovada = (z: number) => z < BAND.front;
function yol(x: number, z: number, h: readonly [number, number]): readonly [number, number] {
  const ik = kovada(z);
  const hk = kovada(h[1]);
  if (ik && hk) return Math.abs(z - h[1]) < 0.3 ? h : Math.abs(x - KX) > 0.3 ? [KX, z] : [KX, h[1]];
  if (ik) return Math.abs(x - KX) > 0.3 ? [KX, z] : [KX, KAPI_Z];
  if (hk) return Math.abs(x - KX) < 0.3 && z <= KAPI_Z + 0.3 ? [KX, h[1]] : [KX, KAPI_Z];
  return h;
}

// ---------------------------------------------------------------------------------------------
// KOŞU
// ---------------------------------------------------------------------------------------------
interface Kol {
  ad: string;
  not: string;
  bas: readonly string[]; // kata çıkışta hazır pad'ler
  sira: readonly string[];
  fiyat: readonly number[];
  lavabo: boolean; // L1 (Kat 1 gibi gelir) mi
}
interface Sonuc {
  acilis: number[];
  bitis: number;
  inis: number;
  saatlik: { kat1: number; kat2: number; lav: number }[];
  yol: number;
  enUzunItme: number;
  iz: string;
  servis: number;
  kacan: number;
  lavToplam: number;
  ilkServisSn: number; // ilk kahve servisinin dakikası (sn)
  ilkParaSn: number; // Kat 2'den ilk ₺ (sn)
}

function kos(k: Kol, iz1: Float64Array, sinir: Decimal): Sonuc {
  const bas = MUT === 'bedavasiz' ? [] : k.bas;
  const sira = MUT === 'bedavasiz' ? [...k.bas, ...k.sira] : k.sira;
  const fiyat = MUT === 'bedavasiz' ? [...k.bas.map(() => k.fiyat[0]), ...k.fiyat] : k.fiyat;
  const ayar: Kat2Ayar = { ...CFG_TEMEL, padler: sira.map((id, i) => ({ id, cost: fiyat[i], fillRate: Math.round(fiyat[i] / PAD_SN) })) };
  let d: Kat2Dunya = yeniKat2Dunya([...bas], ayar);
  let padsDone: string[] = [...bas];
  let cuzdan = 0;
  let kasa = D(0);
  let x = VARIS[2][0];
  let z = VARIS[2][2];
  let kat: 1 | 2 = 2;
  let kat1Kalan = 0;
  let kasaBosaltildi = false;
  let inmeli = false;
  let p1 = 0;
  let lavYigin = 0;
  const acilis = sira.map(() => NaN);
  const saatlik: Sonuc['saatlik'] = [];
  let inis = 0, yolT = 0, itme = 0, enUzunItme = 0, servis = 0, kacan = 0, lavToplam = 0;
  let ilkServisSn = NaN, ilkParaSn = NaN;
  let kat2Kazanc = 0, harcama = 0, kat1Dogrudan = 0, kasaGiren = 0, kasaBosalan = 0, dusen = 0, lavDusen = 0;
  const izT = izOlustur();
  const kalisSn = 2 * GECIS_SN + (2 * Math.hypot(KASA_YER[0] - VARIS[1][0], KASA_YER[1] - VARIS[1][2])) / HIZ;
  const lavAcik = () => k.lavabo && padsDone.includes(KAT2_LAVABO_PAD);
  const kalkanlar = (ids: readonly string[]) => {
    if (!lavAcik()) return;
    for (const id of ids) {
      const v = KAT2_KISI[kat2MasaYeri(id)!.tur] * LAV_KISI;
      lavYigin += v;
      lavDusen += v;
    }
  };
  let t = 0;
  for (; t < UFUK && padsDone.length < bas.length + sira.length; t += DT) {
    const h = Math.floor(t / 3600);
    if (!saatlik[h]) saatlik[h] = { kat1: 0, kat2: 0, lav: 0 };
    const i0 = padsDone.length - bas.length;
    const sp = ayar.padler[i0];
    const kalan = sp.cost - (d.padFill[sp.id] ?? 0);

    if (!(kat === 2 && kasaDolu(kasa, sinir))) {
      const akis = iz1[p1 % iz1.length];
      p1++;
      if (akis > 0) {
        if (kat === 2) {
          const r = kasayaAt(kasa, akis, sinir);
          kasa = r.kasa;
          kasaGiren += r.giren.toNumber();
        } else {
          cuzdan += akis;
          kat1Dogrudan += akis;
        }
        saatlik[h].kat1 += akis;
      }
    }

    if (kat === 1) {
      kat1Kalan -= DT;
      if (!kasaBosaltildi && kat1Kalan <= kalisSn / 2) {
        const b = kasaBosalt(kasa, D(cuzdan));
        kasaBosalan += b.bosalan.toNumber();
        cuzdan = b.cuzdan.toNumber();
        kasa = b.kasa;
        kasaBosaltildi = true;
      }
      const r = kat2Tick(d, { x: UZAK.x, z: UZAK.z, durdu: true, cuzdan: 0, padsDone, tepsiKap: TEPSI, miknatis: MIKNATIS }, DT, ayar);
      d = r.dunya;
      dusen += r.olay.dusen.reduce((a, b) => a + b, 0);
      kacan += r.olay.kacan;
      kalkanlar(r.olay.kalkan);
      if (kat1Kalan <= 0) {
        kat = 2;
        [x, z] = [VARIS[2][0], VARIS[2][2]];
      }
      continue;
    }

    const kasaN = kasa.toNumber();
    if (!inmeli) inmeli = kasaN >= 0.8 * sinir.toNumber() || (cuzdan < kalan && cuzdan + kasaN >= kalan); // KARMA (K2-5 tabanı)
    const lavHedef = lavYigin > 0.5 && MUT !== 'lavaboyigin';
    let hedef: readonly [number, number];
    if (cuzdan >= kalan - 1e-9) hedef = kat2PadYeri(sp.id);
    else if (inmeli) hedef = MERDIVEN;
    else if (d.paralar.length || lavHedef) {
      const adaylar: [number, number][] = d.paralar.map((p) => [p.x, p.z]);
      if (lavHedef) adaylar.push([KAT2_LAVABO_YER[0], KAT2_LAVABO_YER[1]]);
      hedef = adaylar.reduce((a, b) => (uz([x, z], a) <= uz([x, z], b) ? a : b));
    } else {
      const bekleyen = d.masalar.filter((m) => m.durum === 'oyunda' && m.istek > 0);
      const acikOcak = OCAKLAR.filter((o) => padsDone.includes(o.id));
      if (d.tepsi > 0 && bekleyen.length) {
        const b = bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c));
        const y = kat2MasaYeri(b.id)!;
        hedef = y.tur === 'tavla' ? [y.x, y.z + TAVLA_ERISIM[1] - 0.3] : [y.x, y.z + OKEY_ERISIM - 0.3];
      } else if (acikOcak.length) {
        const hazir = acikOcak.filter((o) => d.ocaklar[OCAKLAR.indexOf(o)].hazir > 0);
        hedef = (hazir.length ? hazir : acikOcak).reduce((a, b) => (uz([x, z], a.al) <= uz([x, z], b.al) ? a : b)).al;
      } else hedef = kat2PadYeri(sp.id);
    }
    const acik = kat2AcikAlan(padsDone);
    const ara = yol(x, z, hedef);
    const dx = ara[0] - x;
    const dz = ara[1] - z;
    const L = Math.hypot(dx, dz);
    let durdu = true;
    if (L > 0.15) {
      durdu = false;
      const kk = Math.min(1, (HIZ * DT) / L);
      const [nx, nz] = kat2Adim(x, z, dx * kk, dz * kk, acik);
      const adim = Math.hypot(nx - x, nz - z);
      yolT += adim;
      itme = adim < 1e-4 ? itme + DT : 0;
      enUzunItme = Math.max(enUzunItme, itme);
      x = nx;
      z = nz;
    }
    if (inmeli && uz([x, z], MERDIVEN) < 0.3) {
      kat = 1;
      inmeli = false;
      kasaBosaltildi = false;
      kat1Kalan = kalisSn;
      inis++;
    }
    // Lavabo yığını: Kat 1'in istif deseni — mıknatıs menzilindeyse toplanır.
    if (lavYigin > 0 && MUT !== 'lavaboyigin' && uz([x, z], KAT2_LAVABO_YER) <= MIKNATIS + 0.5) {
      cuzdan += lavYigin;
      kat2Kazanc += lavYigin;
      lavToplam += lavYigin;
      saatlik[h].lav += lavYigin;
      if (Number.isNaN(ilkParaSn)) ilkParaSn = t;
      lavYigin = 0;
    }

    const r = kat2Tick(d, { x, z, durdu, cuzdan, padsDone, tepsiKap: TEPSI, miknatis: MIKNATIS }, DT, ayar);
    d = r.dunya;
    cuzdan += r.kazanc - r.harcama;
    harcama += r.harcama;
    kat2Kazanc += r.kazanc;
    dusen += r.olay.dusen.reduce((a, b) => a + b, 0);
    servis += r.olay.servis;
    kacan += r.olay.kacan;
    kalkanlar(r.olay.kalkan);
    saatlik[h].kat2 += r.kazanc;
    if (r.olay.servis > 0 && Number.isNaN(ilkServisSn)) ilkServisSn = t;
    if (r.kazanc > 0 && Number.isNaN(ilkParaSn)) ilkParaSn = t;
    if (r.padsDone !== padsDone) padsDone = r.padsDone;
    for (let i = 0; i < padsDone.length - bas.length; i++) if (Number.isNaN(acilis[i])) acilis[i] = t;
    if (Math.round(t / DT) % 50 === 0) izT.ekle(cuzdan, padsDone.length, kasaN, x, z);
  }
  const yerde = d.paralar.reduce((a, p) => a + p.miktar, 0);
  korunumDamgasi(`Kat 2 ₺ ${k.ad}`, Math.round(dusen + lavDusen - kat2Kazanc - yerde - lavYigin));
  korunumDamgasi(`kasa ₺ ${k.ad}`, Math.round(kasaGiren - kasaBosalan - kasa.toNumber()));
  korunumDamgasi(`cüzdan ₺ ${k.ad}`, Math.round(kat2Kazanc + kasaBosalan + kat1Dogrudan - harcama - cuzdan));
  return {
    acilis,
    bitis: padsDone.length === bas.length + sira.length ? t : NaN,
    inis,
    saatlik,
    yol: yolT,
    enUzunItme,
    iz: izT.deger,
    servis,
    kacan,
    lavToplam,
    ilkServisSn,
    ilkParaSn,
  };
}

// ---------------------------------------------------------------------------------------------
// ÇALIŞTIR
// ---------------------------------------------------------------------------------------------
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const dk1 = (sn: number) => (Number.isFinite(sn) ? (sn / 60).toFixed(1) : '—');
const sa = (sn: number) => (Number.isFinite(sn) ? `${(sn / 3600).toFixed(2)} sa` : 'bitmedi');

console.log('=== K2-6 — D-191 AKIŞININ ZİNCİRİ (bedava başlangıç · lavabo pad\'i · merdiven pad\'i) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · ufuk ${UFUK / 3600} sa · dt ${DT}${MUT ? ` · MUTASYON ${MUT}` : ''}`);
console.log(`Geometri (kat.ts, D-191): N7 · duvar yalnız kapalı alanın önünde · 2. ocak bantta x ${OCAKLAR[1].x} · lavabo (${KAT2_LAVABO_YER.join(', ')})`);
console.log(`Bot: hız ${HIZ} · tepsi ${TEPSI} · mıknatıs ${MIKNATIS} · başlangıç cüzdan 0 · Kat 1 bitmiş (yükseltmesiz) · kasa politikası KARMA · garsonsuz.`);
console.log(`Lavabo L1 = Kat 1 L1: uğrama %${LAV.visitChanceByLevel[0] * 100} × ${LAV.feeByLevel[0]} ₺ = ${LAV_KISI.toFixed(1)} ₺/kişi (okey 4 · tavla 2 kişi).`);

const t0 = Date.now();
const { iz: IZ1, r1Dk, r1Ideal } = kat1Izi();
const SINIR = kasaSiniri(Math.round(r1Dk), KASA_DK)!;
console.log(`Kat 1 izi: ${r1Dk.toFixed(1)} ₺/dk (oyuncusuz) · idealize ${f0(r1Ideal)} ₺/dk · kasa sınırı ${f0(SINIR.toNumber())} ₺`);
damga('Kat 1 izi akıyor', r1Dk > 10, `${r1Dk.toFixed(1)} ₺/dk`);

// Yapı bekçisi: D-191 zinciri (bedavalar config'in başına konmuş gibi) oyunun kendi kuralıyla tutarlı mı.
const yapi = kat2ZincirHatasi({ ...CFG, padler: [...BEDAVA, ...D191].map((id) => ({ id, cost: 1, fillRate: 1 })) });
damga('D-191 zinciri yapısı tutarlı (kat2ZincirHatasi)', yapi === null, String(yapi));

const bugunFiyat = CFG.padler.map((p) => p.cost);
const eskiFiyat = (id: string, lav: number) => CFG.padler.find((p) => p.id === id)?.cost ?? lav;
const sb9Bugun = sabitBekleyis(9, r1Dk, [], BUGUN, false);
const lavSb9 = sabitBekleyis(9, r1Dk, BEDAVA, D191, false)[D191.indexOf(KAT2_LAVABO_PAD)];
const KOLLAR: Kol[] = [
  { ad: 'BUGUN', not: 'bugünkü config: D-186 sırası, D-188 fiyatları, bedava yok, lavabo yok (yeni geometride) — TABAN', bas: [], sira: BUGUN, fiyat: bugunFiyat, lavabo: false },
  { ad: 'ESKI-L0', not: 'D-191 sırası; pad fiyatları D-188\'deki gibi kalır, lavabo SB9 yerinde; lavabo süs', bas: BEDAVA, sira: D191, fiyat: D191.map((id) => eskiFiyat(id, lavSb9)), lavabo: false },
  { ad: 'SB9-L0', not: 'D-191 sırası; SB9 yeniden hesap (hazır masa+ocak gelire sayılır); lavabo süs', bas: BEDAVA, sira: D191, fiyat: sabitBekleyis(9, r1Dk, BEDAVA, D191, false), lavabo: false },
  { ad: 'SB9-L1', not: 'D-191 sırası; SB9 yeniden hesap (lavabo geliri dahil); lavabo Kat 1 gibi', bas: BEDAVA, sira: D191, fiyat: sabitBekleyis(9, r1Dk, BEDAVA, D191, true), lavabo: true },
  { ad: 'SB10-L1', not: 'D-191 sırası; SB10; lavabo Kat 1 gibi', bas: BEDAVA, sira: D191, fiyat: sabitBekleyis(10, r1Dk, BEDAVA, D191, true), lavabo: true },
];
const SECILI = KISA ? KOLLAR.filter((k) => ['BUGUN', 'SB9-L0', 'SB9-L1'].includes(k.ad)) : KOLLAR;
damga("BUGUN = config (D-188)", KOLLAR[0].fiyat.every((v, i) => v === CFG.padler[i].cost));
if (!KISA) damga('config = SB9 (D-188, yeni geometride de)', sb9Bugun.every((v, i) => v === bugunFiyat[i]), sb9Bugun.join(','));

const sonuclar: { k: Kol; r: Sonuc }[] = [];
for (const k of SECILI) {
  const r = kos(k, IZ1, SINIR);
  const sure = Number.isFinite(r.bitis) ? r.bitis : UFUK;
  botDamgasi(k.ad, r.yol, sure / 60, 30);
  takilmaDamgasi(k.ad, r.enUzunItme);
  if (sonuclar.length) varyantDamgasi(k.ad, sonuclar[0].r.iz, r.iz);
  sonuclar.push({ k, r });
}

console.log('');
console.log('--- §A KOLLAR — bekleyiş = önceki pad açılışından bu pad açılışına (ilk pad: koşu başından) ---');
console.log('kol      | pad | zincir ₺  | toplam      | ilk servis dk | ilk ₺ dk | ilk pad dk | en uzun bekleyiş (pad)    | medyan dk | iniş | servis | kaçan | lavabo ₺');
console.log('-'.repeat(150));
for (const { k, r } of sonuclar) {
  const bek = r.acilis.map((a, i) => a - (i ? r.acilis[i - 1] : 0)).filter(Number.isFinite);
  const enI = bek.indexOf(Math.max(...bek));
  const top = k.fiyat.reduce((a, b) => a + b, 0);
  console.log(
    `${k.ad.padEnd(8)} | ${String(k.sira.length).padStart(3)} | ${f0(top).padStart(9)} | ${(Number.isFinite(r.bitis) ? sa(r.bitis) : `bitmedi ${r.acilis.filter(Number.isFinite).length}/${k.sira.length}`).padEnd(11)} | ${dk1(r.ilkServisSn).padStart(13)} | ${dk1(r.ilkParaSn).padStart(8)} | ${dk1(r.acilis[0]).padStart(10)} | ${`${dk1(bek[enI])} dk (${k.sira[enI]})`.padEnd(25)} | ${dk1(yuzdelik(bek, 0.5)).padStart(9)} | ${String(r.inis).padStart(4)} | ${String(r.servis).padStart(6)} | ${String(r.kacan).padStart(5)} | ${f0(r.lavToplam).padStart(8)}`,
  );
}
for (const k of SECILI) console.log(`  ${k.ad}: ${k.not}`);

console.log('');
console.log('--- §B PAD × KOL — fiyat ₺ / açılış dakikası ---');
const tumPad = [...new Set([...BUGUN, KAT2_LAVABO_PAD])];
console.log(`pad         | ${sonuclar.map((s) => s.k.ad.padStart(15)).join(' | ')}`);
for (const id of tumPad) {
  const hucre = sonuclar.map(({ k, r }) => {
    if (k.bas.includes(id) && MUT !== 'bedavasiz') return 'hazır'.padStart(15);
    const i = k.sira.indexOf(id);
    return (i < 0 ? '—' : `${f0(k.fiyat[i])} / ${dk1(r.acilis[i])}`).padStart(15);
  });
  console.log(`${id.padEnd(11)} | ${hucre.join(' | ')}`);
}

console.log('');
console.log('--- §C ₺/dk — saat başına: toplam (Kat 1 · Kat 2 · lavabo) ---');
for (const { k, r } of sonuclar) {
  const son = ((Number.isFinite(r.bitis) ? r.bitis : UFUK) % 3600) / 60 || 60;
  const h = r.saatlik.map((s, i) => {
    const m = i === r.saatlik.length - 1 ? son : 60;
    return `${f0((s.kat1 + s.kat2 + s.lav) / m)} (${f0(s.kat1 / m)}·${f0(s.kat2 / m)}·${f0(s.lav / m)})`;
  });
  console.log(`${k.ad.padEnd(8)} | ${h.join(' | ')}`);
}

// ---- §D MERDİVEN PAD'i (Kat 1): fiyat kolları → Kat 1'in geliriyle bekleme (dk). Kat 1 bitmiş, yükseltmesiz.
console.log('');
const sonPad = C.pads[C.pads.length - 1];
console.log(`--- §D MERDİVEN PAD'i — Kat 1'in son pad'i ${sonPad.id} ${f0(sonPad.cost)} ₺ bitince çıkar; bekleme = fiyat / Kat 1 geliri ---`);
console.log('Kat 1 geliri iki uç: aktif oyuncu (idealize, her sikke toplanır) · oyuncusuz (oto-toplanan iz). Bitmiş Kat 1 yükseltmesiz → üst sınır.');
console.log("kol           | fiyat ₺ | aktif bekleme dk | oyuncusuz bekleme dk | Kat 2'nin ilk pad'ine oranı (SB9-L0)");
const sb9l0 = KOLLAR.find((k) => k.ad === 'SB9-L0')!;
const MERDIVEN_KOL: { ad: string; fiyat: number }[] = [
  { ad: 'M-HEMEN', fiyat: 1_000 },
  { ad: 'M-9DK', fiyat: yuvarla(9 * r1Ideal) },
  { ad: 'M-SONPAD', fiyat: sonPad.cost },
  { ad: 'M-15DK', fiyat: yuvarla(15 * r1Ideal) },
  { ad: 'M-2xSONPAD', fiyat: 2 * sonPad.cost },
];
for (const m of MERDIVEN_KOL)
  console.log(`${m.ad.padEnd(13)} | ${f0(m.fiyat).padStart(7)} | ${(m.fiyat / r1Ideal).toFixed(1).padStart(16)} | ${(m.fiyat / r1Dk).toFixed(1).padStart(20)} | ×${(m.fiyat / sb9l0.fiyat[0]).toFixed(1)}`);
console.log("  M-HEMEN: sembolik (Kat 2'nin ilk masası ölçeği) · M-9DK: Kat 2'nin kuralı, oyuncu Kat 1'de → aktif gelirin 9 dk'sı · M-SONPAD: Kat 1'in son pad'iyle aynı ·");
console.log('  M-15DK: aktif gelirin 15 dk\'sı (kat geçişi "büyük an") · M-2xSONPAD: son pad\'in iki katı');

console.log('');
console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
damgaOzeti();
