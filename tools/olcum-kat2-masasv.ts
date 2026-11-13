/**
 * olcum-kat2-masasv.ts — S3 ÖLÇÜMÜ: Kat 2 MASA SEVİYESİ (Sv1-5) kolları (yalnız ölçüm, D-084). Kol değerleri
 * config'e YAZILMAZ; `Kat2Ayar.masaSv` araçta kurulur. Oyun mantığı `kat2Dongu.kat2Tick`in kendisi (tetik,
 * dolum, çarpanlar) — araç yalnız botu sürer ve `svAtlayan`ı `masaSv`ye işler (store'un işi).
 *
 * Soru (kullanıcı): "kazandırdığı para ideal şekilde artsın — grup hızı, kahve, masa ücreti; mantıklı
 * kombinasyon ne ise". Kollar Sv'nin NEYİ artırdığıdır:
 *   tek kol  : U yalnız ücret · K yalnız kahve sıklığı · G yalnız geliş (masa boş kalmaz) · O yalnız oyun süresi
 *              (grup daha çabuk kalkar) · F yalnız kahve fiyatı
 *   karışım  : her biri KÂĞIT ÜSTÜNDE aynı tavana normalize (Sv k = taban × (1 + 0,25·(k−1)), Sv5 ×2): ücret,
 *              öteki kaldıraçlar sabit tutulup ÇÖZÜLÜR. Böylece kollar arasındaki fark yalnız "kâğıttaki para
 *              gerçekte gelir mi" farkıdır (taşıma tavanı: kahve kolu servis yükünü artırır).
 * İki deney:
 *   §A PLATO   — bütün masalar Sv k'de (k = 1..5), bot oynar (Sv almaz): gerçek coin/dk, tür başına, servis yükü.
 *   §B İLERLEME — Kat 2 zinciri bitmiş, bütün masalar Sv1, cüzdan 0; bot Sv alır (en ucuzu önce): bitiş süresi,
 *                 en uzun bekleyiş, saatlik gelir. Fiyat eğrileri: SB9 (o anki gelirin 9 dk'sı — D-188/D-192
 *                 kuralı, satın alma başına) · SB3 (aynı kural 3 dk: 88 satın alma var, zincirin 26'sı değil) ·
 *                 SB3T (SB3, tür payına göre: geri ödeme okey = tavla) · GEO (×1,5 geometrik, Sv2 = SB3'ün Sv2'si).
 *
 * Yöntem `olcum-kat2-akis` ile aynı: bitmiş Kat 1 izi kasaya akar (D-185, sınır 20 dk), bot karakter son kademe,
 * Kat 2 garsonu + lavabo config'ten (D-189, D-192). Bot masa gövdelerini yok sayar (akış aracıyla aynı).
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-masasv.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-masasv.ts > docs/olcum-kat2-masasv.txt
 * Mutasyon (doğrulama): SV_MUT=almaz (bot Sv tetiğinde durmaz → §B hiç bitmez) · SV_MUT=carpansiz (çarpanlar
 * kola verilmez → §A plato düzleşir, varyant damgası kırılır).
 */
import { KISA, botDamgasi, damga, damgaOzeti, izOlustur, kipBandi, kisaDeger, korunumDamgasi, seedRandom, takilmaDamgasi, varyantDamgasi, yuzdelik } from './olcum-lib';
import { attractRadiusFor, charMaxTier, economyConfig as C, playerSpeedFor, trayCapacityFor } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { AGIZ, GECIS_SN, KAT2_KISI, KAT2_MASALAR, KAT2_SV_MAX, OCAKLAR, OKEY_ERISIM, TAVLA_ERISIM, VARIS, kat2AcikAlan, kat2Adim, type MasaTuru } from '../src/game/kat';
import { kat2MasaYeri, kat2SvCanliTetik, kat2Tick, yeniKat2Dunya, type Kat2Ayar, type Kat2Dunya, type Kat2SvKol } from '../src/game/kat2Dongu';
import { BAND, LAYOUT } from '../src/game/layout';
import { D } from '../src/game/decimal';
import { kasaBosalt, kasaDolu, kasaSiniri, kasayaAt } from '../src/game/kasa';
import type { Vec3 } from '../src/game/types';

kipBandi();

const MUT = process.env.SV_MUT ?? '';
const DT = 0.1;
const PLATO_ISINMA = kisaDeger(5 * 60, 2 * 60);
const PLATO_SURE = kisaDeger(30 * 60, 5 * 60);
const UFUK = kisaDeger(30 * 3600, 2 * 3600);
const IZ_ISINMA = kisaDeger(5 * 60, 3 * 60);
const IZ_SURE = kisaDeger(60 * 60, 10 * 60);
const KASA_DK = 20; // D-185
const KASA_YER: readonly [number, number] = [-10.8, -9.3]; // D-185 tezgâh ucu

const HIZ = playerSpeedFor(charMaxTier('speed'));
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const MIKNATIS = attractRadiusFor(charMaxTier('magnet'));
const g = () => useGame.getState();
const CFG = C.kat2 as unknown as Kat2Ayar;
const PADS: readonly string[] = [...C.kat2.hazir, ...CFG.padler.map((p) => p.id)];
const MASALAR = KAT2_MASALAR.filter((m) => PADS.includes(m.id));
const N_OKEY = MASALAR.filter((m) => m.tur === 'okey').length;
const N_TAVLA = MASALAR.length - N_OKEY;
const SV = KAT2_SV_MAX;
const SV_SAYI = MASALAR.length * (SV - 1);

// ---------------------------------------------------------------------------------------------
// KÂĞIT ORANI (her istek servis edilir): masa başına coin/dk, Sv çarpanlarıyla. `olcum-kat2-akis`in
// `kat2Oran`ıyla aynı formül + lavabo (kod: `Kat2Ayar.lavabo`, kalkan kişi × uğrama × ücret).
// ---------------------------------------------------------------------------------------------
type Kaldirac = 'ucretCarpan' | 'kahveAralikCarpan' | 'gelisAralikCarpan' | 'kahveFiyatCarpan' | 'oturumCarpan';
const BIR = Array(SV).fill(1) as number[];
const LAV_KISI = (CFG.lavabo?.ugrama ?? 0) * (CFG.lavabo?.ucret ?? 0);
const ayarOf = (tur: MasaTuru) => (tur === 'tavla' ? CFG.tavla! : CFG);

function masaOrani(tur: MasaTuru, kol: Partial<Kat2SvKol> | undefined, sv: number): number {
  const a = ayarOf(tur);
  const c = (k: Kaldirac) => kol?.[k]?.[sv - 1] ?? 1;
  const oturum = a.oturum * c('oturumCarpan');
  const n = Math.max(1, Math.floor((oturum - CFG.kahveSabir * 0.5) / (a.kahveAralik * c('kahveAralikCarpan'))));
  const para = a.masaUcreti * c('ucretCarpan') + n * a.istekAdet * a.kahveFiyat * c('kahveFiyatCarpan') + KAT2_KISI[tur] * LAV_KISI;
  return (para * 60) / (CFG.gelisAralik * c('gelisAralikCarpan') + CFG.yurume + oturum);
}
/** Bütün Kat 2 masalarının kâğıt oranı (coin/dk), her masa `sv`de. */
const katOrani = (kollar: Record<MasaTuru, Partial<Kat2SvKol>>, sv: number) =>
  N_OKEY * masaOrani('okey', kollar.okey, sv) + N_TAVLA * masaOrani('tavla', kollar.tavla, sv);

/** Hedef çarpan (kâğıt): Sv k = taban × (1 + 0,25·(k−1)) → Sv5 ×2. */
const HEDEF = Array.from({ length: SV }, (_, i) => 1 + 0.25 * i);

/** Ücret çarpanını ÇÖZER: öteki kaldıraçlar verili, masa kâğıtta HEDEF'e çıksın (oran ücrette doğrusal). */
function ucretCoz(tur: MasaTuru, sabit: Partial<Record<Kaldirac, number[]>>): number[] {
  const r1 = masaOrani(tur, undefined, 1);
  return HEDEF.map((h, i) => {
    if (i === 0) return 1;
    const r0 = masaOrani(tur, { ...sabit, ucretCarpan: Array(SV).fill(0) }, i + 1);
    const birim = masaOrani(tur, { ...sabit, ucretCarpan: BIR }, i + 1) - r0; // ücret ×1'in payı
    return +Math.max(1, (h * r1 - r0) / birim).toFixed(3); // öteki kaldıraç hedefi aşarsa ücret 1'de kalır
  });
}

interface KolTanim {
  ad: string;
  not: string;
  tur: 'tek' | 'karisim';
  /** Türe göre çarpanlar (fiyat ayrı; `fiyatli` ekler). */
  carp: Record<MasaTuru, Partial<Record<Kaldirac, number[]>>>;
}
const ikisi = (f: (tur: MasaTuru) => Partial<Record<Kaldirac, number[]>>): KolTanim['carp'] => ({ okey: f('okey'), tavla: f('tavla') });
const KAHVE_TEK = [1, 0.8, 0.65, 0.5, 0.4];
const GELIS_TEK = [1, 0.75, 0.5, 0.25, 0.05];
const OTURUM_TEK = [1, 0.85, 0.7, 0.6, 0.5];
const KF_TEK = [1, 1.5, 2, 2.5, 3];
const KAHVE_MIX = [1, 0.9, 0.8, 0.7, 0.6];
const GELIS_MIX = [1, 0.75, 0.5, 0.3, 0.15];
const OTURUM_MIX = [1, 0.92, 0.85, 0.78, 0.72];

const KOLLAR: KolTanim[] = [
  { ad: 'U', tur: 'tek', not: 'yalnız masa ücreti (₺/müşteri), kâğıtta Sv5 ×2', carp: ikisi((t) => ({ ucretCarpan: ucretCoz(t, {}) })) },
  { ad: 'K', tur: 'tek', not: `yalnız kahve sıklığı (aralık ×${KAHVE_TEK.join('/')})`, carp: ikisi(() => ({ kahveAralikCarpan: KAHVE_TEK })) },
  { ad: 'G', tur: 'tek', not: `yalnız geliş (boş kalma ×${GELIS_TEK.join('/')})`, carp: ikisi(() => ({ gelisAralikCarpan: GELIS_TEK })) },
  { ad: 'O', tur: 'tek', not: `yalnız oyun süresi — grup hızı (×${OTURUM_TEK.join('/')})`, carp: ikisi(() => ({ oturumCarpan: OTURUM_TEK })) },
  { ad: 'F', tur: 'tek', not: `yalnız kahve fiyatı (×${KF_TEK.join('/')})`, carp: ikisi(() => ({ kahveFiyatCarpan: KF_TEK })) },
  { ad: 'UK', tur: 'karisim', not: `ücret + kahve sıklığı (×${KAHVE_MIX.join('/')}); ücret çözülür`, carp: ikisi((t) => ({ kahveAralikCarpan: KAHVE_MIX, ucretCarpan: ucretCoz(t, { kahveAralikCarpan: KAHVE_MIX }) })) },
  { ad: 'UG', tur: 'karisim', not: `ücret + geliş (×${GELIS_MIX.join('/')}); ücret çözülür`, carp: ikisi((t) => ({ gelisAralikCarpan: GELIS_MIX, ucretCarpan: ucretCoz(t, { gelisAralikCarpan: GELIS_MIX }) })) },
  {
    ad: 'UKG', tur: 'karisim', not: 'üçlü: ücret + kahve sıklığı + geliş (kullanıcının üç kaldıracı); ücret çözülür',
    carp: ikisi((t) => ({ kahveAralikCarpan: KAHVE_MIX, gelisAralikCarpan: GELIS_MIX, ucretCarpan: ucretCoz(t, { kahveAralikCarpan: KAHVE_MIX, gelisAralikCarpan: GELIS_MIX }) })),
  },
  { ad: 'UF', tur: 'karisim', not: 'ücret + kahve fiyatı (aynı müşteri, aynı taşıma; ₺/müşteri bütünüyle); ikisi aynı çarpan', carp: ikisi((t) => ({ kahveFiyatCarpan: HEDEF, ucretCarpan: ucretCoz(t, { kahveFiyatCarpan: HEDEF }) })) },
  {
    ad: 'UOG', tur: 'karisim', not: `grup hızı: ücret + kısa oyun (×${OTURUM_MIX.join('/')}) + geliş; ücret çözülür`,
    carp: ikisi((t) => ({ oturumCarpan: OTURUM_MIX, gelisAralikCarpan: GELIS_MIX, ucretCarpan: ucretCoz(t, { oturumCarpan: OTURUM_MIX, gelisAralikCarpan: GELIS_MIX }) })),
  },
];

const kolAyar = (k: KolTanim, fiyat: Record<MasaTuru, number[]>): Kat2Ayar => {
  const kur = (tur: MasaTuru): Kat2SvKol => {
    const c = MUT === 'carpansiz' ? {} : k.carp[tur];
    return {
      fiyat: fiyat[tur],
      ucretCarpan: c.ucretCarpan ?? BIR,
      kahveAralikCarpan: c.kahveAralikCarpan ?? BIR,
      gelisAralikCarpan: c.gelisAralikCarpan ?? BIR,
      ...(c.kahveFiyatCarpan ? { kahveFiyatCarpan: c.kahveFiyatCarpan } : {}),
      ...(c.oturumCarpan ? { oturumCarpan: c.oturumCarpan } : {}),
    };
  };
  return { ...CFG, masaSv: { okey: kur('okey'), tavla: kur('tavla') } };
};

// ---------------------------------------------------------------------------------------------
// KAT 1 İZİ (olcum-kat2-akis ile aynı)
// ---------------------------------------------------------------------------------------------
function kat1Izi(): { iz: Float64Array; r1Dk: number } {
  seedRandom(7);
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  g().kat2Ac();
  useGame.setState({ charUpgrades: { ...g().charUpgrades, speed: charMaxTier('speed'), tray: charMaxTier('tray'), magnet: charMaxTier('magnet') } });
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { acik: true, padsDone: [] }, kat2Dunya: yeniKat2Dunya([], CFG) });
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
  return { iz, r1Dk: (iz.reduce((a, b) => a + b, 0) / IZ_SURE) * 60 };
}

// ---------------------------------------------------------------------------------------------
// BOT YOLU (olcum-kat2-akis ile aynı: yalnız merdiven kovası koridoru)
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
// KOŞU — bir bot, bir kol. `alir`: Sv satın alır mı (§B) · `kat1`: Kat 1 izi + kasa inişleri (§B).
// ---------------------------------------------------------------------------------------------
type Is = 'para' | 'servis' | 'ocak' | 'sv' | 'kat1' | 'bos';
interface Olcu {
  sure: number;
  dusen: Record<MasaTuru, number>;
  lav: number;
  istek: number;
  servis: number;
  kacan: number;
  garson: number;
  is: Record<Is, number>;
  yol: number;
  enUzunItme: number;
}
const yeniOlcu = (): Olcu => ({ sure: 0, dusen: { okey: 0, tavla: 0 }, lav: 0, istek: 0, servis: 0, kacan: 0, garson: 0, is: { para: 0, servis: 0, ocak: 0, sv: 0, kat1: 0, bos: 0 }, yol: 0, enUzunItme: 0 });

interface Kosu {
  olcu: Olcu;
  alim: number[]; // her Sv alımının saniyesi
  bitis: number;
  saatlik: number[]; // saat başına toplam gelir (Kat 1 + Kat 2) coin
  iz: string;
}

function kos(ayar: Kat2Ayar, o: { masaSv: Record<string, number>; sure: number; olcBas: number; alir: boolean; iz1?: Float64Array; sinir?: ReturnType<typeof kasaSiniri> }): Kosu {
  let d: Kat2Dunya = yeniKat2Dunya(PADS, ayar);
  const masaSv: Record<string, number> = { ...o.masaSv };
  let cuzdan = 0;
  let kasa = D(0);
  let x = VARIS[2][0];
  let z = VARIS[2][2];
  let kat: 1 | 2 = 2;
  let kat1Kalan = 0;
  let kasaBosaltildi = false;
  let inmeli = false;
  let p1 = 0;
  let itme = 0;
  const olcu = yeniOlcu();
  const alim: number[] = [];
  const saatlik: number[] = [];
  const izT = izOlustur();
  let kat2Kazanc = 0, harcama = 0, kat1Dogrudan = 0, kasaGiren = 0, kasaBosalan = 0, dusenTop = 0;
  const sinir = o.sinir ?? null;
  const kalisSn = 2 * GECIS_SN + (2 * Math.hypot(KASA_YER[0] - VARIS[1][0], KASA_YER[1] - VARIS[1][2])) / HIZ;
  const svBitti = () => alim.length >= SV_SAYI;
  let t = 0;
  for (; t < o.sure && !(o.alir && svBitti()); t += DT) {
    const olc = t >= o.olcBas;
    const h = Math.floor(t / 3600);
    saatlik[h] ??= 0;
    // Kat 1 izi kasaya (Kat 2'deyken) ya da cüzdana (Kat 1'deyken) — §B.
    if (o.iz1 && sinir && !(kat === 2 && kasaDolu(kasa, sinir))) {
      const akis = o.iz1[p1 % o.iz1.length];
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
        saatlik[h] += akis;
      }
    }
    const kaydet = (r: ReturnType<typeof kat2Tick>) => {
      d = r.dunya;
      for (let i = 0; i < r.olay.kalkan.length; i++) {
        const tur = kat2MasaYeri(r.olay.kalkan[i])!.tur;
        if (olc) olcu.dusen[tur] += r.olay.dusen[i];
        dusenTop += r.olay.dusen[i];
      }
      dusenTop += r.olay.lavabo;
      if (olc) {
        olcu.lav += r.olay.lavabo;
        olcu.istek += r.olay.istek;
        olcu.servis += r.olay.servis;
        olcu.kacan += r.olay.kacan;
        olcu.garson += r.olay.garsonServis;
      }
      for (const id of r.olay.svAtlayan) {
        masaSv[id] = Math.min(SV, (masaSv[id] ?? 1) + 1);
        alim.push(t);
      }
    };
    if (kat === 1) {
      kat1Kalan -= DT;
      if (olc) olcu.is.kat1 += DT;
      if (!kasaBosaltildi && kat1Kalan <= kalisSn / 2) {
        const b = kasaBosalt(kasa, D(cuzdan));
        kasaBosalan += b.bosalan.toNumber();
        cuzdan = b.cuzdan.toNumber();
        kasa = b.kasa;
        kasaBosaltildi = true;
      }
      kaydet(kat2Tick(d, { x: 0, z: 400, durdu: true, cuzdan: 0, padsDone: PADS, tepsiKap: TEPSI, miknatis: MIKNATIS, masaSv }, DT, ayar));
      if (kat1Kalan <= 0) {
        kat = 2;
        [x, z] = [VARIS[2][0], VARIS[2][2]];
      }
      continue;
    }

    // Hedef seçimi: Sv (parası yetiyorsa; S3b: oyunun kuralı TEK HEDEF — D-124 karşılığı `kat2SvCanliTetik`) → Kat 1 kasası →
    // yığın → kahve servisi → ocak. Ölçüm Sv evresinde: görev hattı Sv görevinde/bitmiş (D-142 kapısı açık).
    const tetik = o.alir && MUT !== 'almaz' ? kat2SvCanliTetik(ayar, PADS, masaSv) : [];
    const ucuz = tetik.length ? tetik.reduce((a, b) => (a.fiyat - (d.padFill[a.id] ?? 0) <= b.fiyat - (d.padFill[b.id] ?? 0) ? a : b)) : null;
    const kalan = ucuz ? ucuz.fiyat - (d.padFill[ucuz.id] ?? 0) : Infinity;
    const kasaN = kasa.toNumber();
    if (sinir && !inmeli) inmeli = kasaN >= 0.8 * sinir.toNumber() || (cuzdan < kalan && cuzdan + kasaN >= kalan);
    let hedef: readonly [number, number];
    let is: Is;
    if (ucuz && cuzdan >= kalan - 1e-9) {
      hedef = [ucuz.x, ucuz.z];
      is = 'sv';
    } else if (inmeli) {
      hedef = MERDIVEN;
      is = 'kat1';
    } else if (d.paralar.length) {
      hedef = d.paralar.map((p) => [p.x, p.z] as [number, number]).reduce((a, b) => (uz([x, z], a) <= uz([x, z], b) ? a : b));
      is = 'para';
    } else {
      const bekleyen = d.masalar.filter((m) => m.durum === 'oyunda' && m.istek > 0);
      if (d.tepsi > 0 && bekleyen.length) {
        const b = bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c));
        const y = kat2MasaYeri(b.id)!;
        hedef = y.tur === 'tavla' ? [y.x, y.z + TAVLA_ERISIM[1] - 0.3] : [y.x, y.z + OKEY_ERISIM - 0.3];
        is = 'servis';
      } else if (d.tepsi < TEPSI) {
        const hazir = OCAKLAR.filter((oc, i) => d.ocaklar[i].hazir > 0 && PADS.includes(oc.id));
        hedef = (hazir.length ? hazir : OCAKLAR.filter((oc) => PADS.includes(oc.id))).reduce((a, b) => (uz([x, z], a.al) <= uz([x, z], b.al) ? a : b)).al;
        is = 'ocak';
      } else {
        hedef = [x, z];
        is = 'bos'; // tepsi dolu, istek yok: yapacak iş yok
      }
    }
    if (olc) olcu.is[is] += DT;
    const ara = yol(x, z, hedef);
    const dx = ara[0] - x;
    const dz = ara[1] - z;
    const L = Math.hypot(dx, dz);
    let durdu = true;
    if (L > 0.15) {
      durdu = false;
      const kk = Math.min(1, (HIZ * DT) / L);
      const [nx, nz] = kat2Adim(x, z, dx * kk, dz * kk, kat2AcikAlan(PADS));
      const adim = Math.hypot(nx - x, nz - z);
      olcu.yol += adim;
      itme = adim < 1e-4 ? itme + DT : 0;
      olcu.enUzunItme = Math.max(olcu.enUzunItme, itme);
      x = nx;
      z = nz;
    }
    if (inmeli && uz([x, z], MERDIVEN) < 0.3) {
      kat = 1;
      inmeli = false;
      kasaBosaltildi = false;
      kat1Kalan = kalisSn;
    }
    const r = kat2Tick(d, { x, z, durdu, cuzdan, padsDone: PADS, tepsiKap: TEPSI, miknatis: MIKNATIS, masaSv }, DT, ayar);
    kaydet(r);
    cuzdan += r.kazanc - r.harcama;
    harcama += r.harcama;
    kat2Kazanc += r.kazanc;
    saatlik[h] += r.kazanc;
    if (Math.round(t / DT) % 50 === 0) izT.ekle(cuzdan, alim.length, kasaN, x, z, d.tepsi);
  }
  olcu.sure = Math.max(0, t - o.olcBas);
  const yerde = d.paralar.reduce((a, p) => a + p.miktar, 0);
  korunumDamgasi(`Kat 2 coin`, Math.round(dusenTop - kat2Kazanc - yerde));
  korunumDamgasi(`cüzdan coin`, Math.round(kat2Kazanc + kasaBosalan + kat1Dogrudan - harcama - cuzdan));
  if (sinir) korunumDamgasi(`kasa coin`, Math.round(kasaGiren - kasaBosalan - kasa.toNumber()));
  return { olcu, alim, bitis: svBitti() ? t : NaN, saatlik, iz: izT.deger };
}

// ---------------------------------------------------------------------------------------------
// ÇALIŞTIR
// ---------------------------------------------------------------------------------------------
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const sa = (sn: number) => (Number.isFinite(sn) ? `${(sn / 3600).toFixed(2)} sa` : 'bitmedi');
const yuzde = (a: number, b: number) => (b > 0 ? `%${((100 * a) / b).toFixed(0)}` : '—');
const yuvarla = (v: number): number => {
  const adim = v < 1_000 ? 50 : v < 10_000 ? 100 : v < 100_000 ? 500 : 5_000;
  return Math.max(adim, Math.round(v / adim) * adim);
};

const t0 = Date.now();
console.log('=== S3 — KAT 2 MASA SEVİYESİ (Sv1-5): ne artsın, ne kadar tutsun ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · dt ${DT} · plato ${PLATO_ISINMA / 60}+${PLATO_SURE / 60} dk · ilerleme ufku ${UFUK / 3600} sa${MUT ? ` · MUTASYON ${MUT}` : ''}`);
console.log(`Kat 2 zinciri BİTMİŞ (config D-192: ${MASALAR.length} masa = ${N_OKEY} okey + ${N_TAVLA} tavla, 2 ocak, lavabo, garson D-189) · ${SV_SAYI} Sv alımı.`);
console.log(`Bot: hız ${HIZ} · tepsi ${TEPSI} · mıknatıs ${MIKNATIS} · Sv dolumu ${3.5} sn (pad kuralı) · alım sırası: oyunun kuralı TEK HEDEF (D-124 karşılığı, D-195).`);


const { iz: IZ1, r1Dk } = kat1Izi();
const SINIR = kasaSiniri(Math.round(r1Dk), KASA_DK)!;
console.log(`Kat 1 izi: ${r1Dk.toFixed(1)} coin/dk (oyuncusuz) · kasa sınırı ${f0(SINIR.toNumber())}`);
damga('Kat 1 izi akıyor', r1Dk > 10, `${r1Dk.toFixed(1)}`);

const TABAN: Record<MasaTuru, Partial<Kat2SvKol>> = { okey: {}, tavla: {} };
console.log(`Kâğıt taban (Sv1, her istek servis): okey ${f1(masaOrani('okey', undefined, 1))} · tavla ${f1(masaOrani('tavla', undefined, 1))} coin/dk/masa · Kat 2 ${f0(katOrani(TABAN, 1))} coin/dk`);

console.log('');
console.log('--- KOLLAR — çarpanlar (Sv1/Sv2/Sv3/Sv4/Sv5) ve kâğıt oranı (masa başı coin/dk, Sv5/Sv1) ---');
for (const k of KOLLAR) {
  console.log(`${k.ad.padEnd(4)} ${k.tur === 'tek' ? 'tek    ' : 'karışım'} | ${k.not}`);
  for (const tur of ['okey', 'tavla'] as const) {
    const c = k.carp[tur];
    const parca = (Object.keys(c) as Kaldirac[]).map((kk) => `${kk.replace('Carpan', '')} ${c[kk]!.join('/')}`).join(' · ');
    console.log(`       ${tur.padEnd(5)}: ${parca} → kâğıt ×${(masaOrani(tur, c, SV) / masaOrani(tur, undefined, 1)).toFixed(2)}`);
  }
}

// ---- §A PLATO
interface Plato { r: number; tur: Record<MasaTuru, number>; olcu: Olcu; iz: string }
/** Platoda Sv alınmaz: tetik fiyatı erişilmez (fiyat 0 olsaydı çerçeveye basan bot bedava seviye atlardı). */
const ALINMAZ = Array(SV).fill(1e15) as number[];
const platoCalis = (k: KolTanim, sv: number): Plato => {
  const ayar = kolAyar(k, { okey: ALINMAZ, tavla: ALINMAZ });
  const ms = Object.fromEntries(MASALAR.map((m) => [m.id, sv]));
  const r = kos(ayar, { masaSv: ms, sure: PLATO_ISINMA + PLATO_SURE, olcBas: PLATO_ISINMA, alir: false });
  const dk = r.olcu.sure / 60;
  const o = r.olcu;
  damga(`plato ${k.ad} Sv${sv} sabit kaldı`, r.alim.length === 0, `${r.alim.length} alım`);
  botDamgasi(`plato ${k.ad} Sv${sv}`, o.yol, dk, 30);
  takilmaDamgasi(`plato ${k.ad} Sv${sv}`, o.enUzunItme);
  // Lavabo payı türe kişi sayısıyla dağıtılır (tavla 2, okey 4 kişi).
  const lavPay = { okey: (o.lav * N_OKEY * KAT2_KISI.okey) / (N_OKEY * KAT2_KISI.okey + N_TAVLA * KAT2_KISI.tavla), tavla: 0 };
  lavPay.tavla = o.lav - lavPay.okey;
  return {
    r: (o.dusen.okey + o.dusen.tavla + o.lav) / dk,
    tur: { okey: (o.dusen.okey + lavPay.okey) / dk / N_OKEY, tavla: (o.dusen.tavla + lavPay.tavla) / dk / N_TAVLA },
    olcu: o,
    iz: r.iz,
  };
};
const tabanPlato = platoCalis(KOLLAR[0], 1);
const PLATOLAR = new Map<string, Plato[]>();
const SECILI = KISA ? KOLLAR.filter((k) => ['U', 'K', 'UK', 'UF'].includes(k.ad)) : KOLLAR;
for (const k of SECILI) {
  const ps = [tabanPlato];
  for (let sv = 2; sv <= SV; sv++) ps.push(platoCalis(k, sv));
  varyantDamgasi(`plato ${k.ad} Sv5`, tabanPlato.iz, ps[SV - 1].iz);
  PLATOLAR.set(k.ad, ps);
}

console.log('');
console.log('--- §A PLATO — bütün masalar Sv k; GERÇEK coin/dk (Kat 2 + lavabo, bot + garson oynar) ---');
console.log('kol  | Sv1   | Sv2   | Sv3   | Sv4   | Sv5   | Sv5/Sv1 gerçek | kâğıt | gerçekleşen kâğıt payı (Sv5 artışı) | okey/masa Sv1→Sv5 | tavla/masa Sv1→Sv5');
console.log('-'.repeat(150));
for (const k of SECILI) {
  const ps = PLATOLAR.get(k.ad)!;
  const kagit1 = katOrani(TABAN, 1);
  const kagit5 = katOrani(k.carp, SV);
  const gercekArtis = ps[SV - 1].r - ps[0].r;
  console.log(
    `${k.ad.padEnd(4)} | ${ps.map((p) => f0(p.r).padStart(5)).join(' | ')} | ${('×' + (ps[SV - 1].r / ps[0].r).toFixed(2)).padStart(14)} | ×${(kagit5 / kagit1).toFixed(2)} | ${`${f0(gercekArtis)} / ${f0(kagit5 - kagit1)} = ${yuzde(gercekArtis, kagit5 - kagit1)}`.padStart(35)} | ${`${f1(ps[0].tur.okey)} → ${f1(ps[SV - 1].tur.okey)}`.padStart(17)} | ${`${f1(ps[0].tur.tavla)} → ${f1(ps[SV - 1].tur.tavla)}`.padStart(17)}`,
  );
}

console.log('');
console.log('--- §A2 SERVİS YÜKÜ — Sv1 ve Sv5 platosunda: istek/dk · servis % · kaçan/dk · garson payı · bot zamanı (para·servis·ocak·boş) ---');
console.log('kol  | Sv | istek/dk | servis % | kaçan/dk | garson % | bot: para  servis  ocak  boş');
for (const k of SECILI) {
  const ps = PLATOLAR.get(k.ad)!;
  for (const [sv, p] of [[1, ps[0]], [SV, ps[SV - 1]]] as const) {
    if (sv === 1 && k !== SECILI[0]) continue;
    const o = p.olcu;
    const dk = o.sure / 60;
    const top = o.is.para + o.is.servis + o.is.ocak + o.is.bos + o.is.sv + o.is.kat1 || 1;
    console.log(
      `${(sv === 1 ? 'taban' : k.ad).padEnd(5)}| ${sv}  | ${f1(o.istek / dk).padStart(8)} | ${yuzde(o.servis, o.servis + o.kacan).padStart(8)} | ${f1(o.kacan / dk).padStart(8)} | ${yuzde(o.garson, o.servis).padStart(8)} | ${[o.is.para, o.is.servis, o.is.ocak, o.is.bos].map((v) => yuzde(v, top).padStart(5)).join('  ')}`,
    );
  }
}

// ---- §B İLERLEME: fiyat eğrileri (tür başına fiyat[0..4]; fiyat[0] kullanılmaz).
type Egri = 'SB9' | 'SB3' | 'SB3T' | 'GEO';
function fiyatlar(k: KolTanim, e: Egri): Record<MasaTuru, number[]> {
  const R = (sv: number) => r1Dk + katOrani(k.carp, sv); // o anki gelir: Kat 1 + Kat 2 (kâğıt), bütün masalar sv'de
  const sb = (dk: number) => [0, ...[2, 3, 4, 5].map((sv) => yuvarla(dk * R(sv - 1)))];
  if (e === 'SB9') return { okey: sb(9), tavla: sb(9) };
  if (e === 'SB3') return { okey: sb(3), tavla: sb(3) };
  if (e === 'GEO') {
    const p2 = yuvarla(3 * R(1));
    const geo = [0, ...[0, 1, 2, 3].map((i) => yuvarla(p2 * 1.5 ** i))];
    return { okey: geo, tavla: geo };
  }
  // SB3T: aynı toplam, tür payına göre — masanın kendi kâğıt artışıyla orantılı (geri ödeme iki türde eşit).
  const tur = (t: MasaTuru) =>
    [0, ...[2, 3, 4, 5].map((sv) => {
      const art = (tt: MasaTuru) => masaOrani(tt, k.carp[tt], sv) - masaOrani(tt, k.carp[tt], sv - 1);
      const ort = (N_OKEY * art('okey') + N_TAVLA * art('tavla')) / MASALAR.length;
      return yuvarla((3 * R(sv - 1) * art(t)) / (ort || 1));
    })];
  return { okey: tur('okey'), tavla: tur('tavla') };
}
const EGRILER: Egri[] = ['SB9', 'SB3', 'SB3T', 'GEO'];
// D-195 sonrası: karar config'te — damga "config = seçilen kol (UG/SB3T)"; kolların hepsi config'i ezerek ölçülür.
{
  const k = KOLLAR.find((x) => x.ad === 'UG')!;
  const f = fiyatlar(k, 'SB3T');
  const c = (C.kat2 as unknown as Kat2Ayar).masaSv;
  const es = (a: readonly number[] | undefined, b: readonly number[] | undefined) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  const ayni = !!c && (['okey', 'tavla'] as MasaTuru[]).every((t) =>
    es(c[t].fiyat, f[t]) && es(c[t].ucretCarpan, k.carp[t].ucretCarpan) && es(c[t].gelisAralikCarpan, k.carp[t].gelisAralikCarpan));
  damga('config masaSv = karar D-195 (UG/SB3T)', ayni);
}
// KARAR SONRASI: `OLCUM=tam KOL_DOK=UG/SB3T` (fiyat ölçülen gelirden: kisa kipte farklı çıkar!) → seçilen kolun config değerini (Kat2Ayar.masaSv) JSON basar, ölçüm koşmaz.
if (process.env.KOL_DOK) {
  const [kAd, eAd] = process.env.KOL_DOK.split('/');
  const k = KOLLAR.find((x) => x.ad === kAd)!;
  const f = fiyatlar(k, eAd as Egri);
  const kol = (t: MasaTuru) => ({ fiyat: f[t], ucretCarpan: k.carp[t].ucretCarpan ?? BIR, kahveAralikCarpan: k.carp[t].kahveAralikCarpan ?? BIR, gelisAralikCarpan: k.carp[t].gelisAralikCarpan ?? BIR });
  console.log(JSON.stringify({ okey: kol('okey'), tavla: kol('tavla') }));
  process.exit(0);
}
const ILERLEME: { k: KolTanim; e: Egri }[] = KISA
  ? [{ k: KOLLAR.find((x) => x.ad === 'U')!, e: 'SB3' }, { k: KOLLAR.find((x) => x.ad === 'UK')!, e: 'SB3' }]
  : KOLLAR.flatMap((k) => (k.tur === 'tek' ? (['SB9', 'SB3'] as Egri[]) : EGRILER).map((e) => ({ k, e })));

console.log('');
console.log('--- §B FİYAT EĞRİLERİ — Sv2/Sv3/Sv4/Sv5 fiyatı (okey | tavla), satın alma başına ---');
for (const k of SECILI) {
  const satir = EGRILER.map((e) => {
    const f = fiyatlar(k, e);
    return `${e} ${f.okey.slice(1).map(f0).join('/')}${f.okey.join() === f.tavla.join() ? '' : ` | ${f.tavla.slice(1).map(f0).join('/')}`}`;
  });
  console.log(`${k.ad.padEnd(4)} | ${satir.join(' · ')}`);
}

console.log('');
console.log('--- §B2 GERİ ÖDEME — plato ölçüsüyle: Sv k fiyatı / o masanın gerçek coin/dk artışı (dk). Eğri SB3; (T = SB3T) ---');
console.log('kol  | okey Sv2  Sv3  Sv4  Sv5           | tavla Sv2  Sv3  Sv4  Sv5          | Sv başı artış coin/dk/masa (okey · tavla, ort.)');
for (const k of SECILI) {
  const ps = PLATOLAR.get(k.ad)!;
  const f = fiyatlar(k, 'SB3');
  const ft = fiyatlar(k, 'SB3T');
  const geri = (tur: MasaTuru, ff: Record<MasaTuru, number[]>) =>
    [2, 3, 4, 5].map((sv) => {
      const art = ps[sv - 1].tur[tur] - ps[sv - 2].tur[tur];
      return art > 0 ? f0(ff[tur][sv - 1] / art) : '∞';
    });
  const artis = (tur: MasaTuru) => (ps[SV - 1].tur[tur] - ps[0].tur[tur]) / (SV - 1);
  console.log(
    `${k.ad.padEnd(4)} | ${geri('okey', f).map((v) => v.padStart(4)).join(' ')} (T ${geri('okey', ft).join('/')}) | ${geri('tavla', f).map((v) => v.padStart(4)).join(' ')} (T ${geri('tavla', ft).join('/')}) | ${f1(artis('okey'))} · ${f1(artis('tavla'))}`,
  );
}

const ilerleme: { k: KolTanim; e: Egri; r: Kosu; fiyat: Record<MasaTuru, number[]> }[] = [];
for (const { k, e } of ILERLEME) {
  const fiyat = fiyatlar(k, e);
  const r = kos(kolAyar(k, fiyat), { masaSv: {}, sure: UFUK, olcBas: 0, alir: true, iz1: IZ1, sinir: SINIR });
  const sure = Number.isFinite(r.bitis) ? r.bitis : UFUK;
  botDamgasi(`ilerleme ${k.ad}/${e}`, r.olcu.yol, sure / 60, 30);
  takilmaDamgasi(`ilerleme ${k.ad}/${e}`, r.olcu.enUzunItme);
  if (MUT !== 'almaz') damga(`ilerleme ${k.ad}/${e} Sv aldı`, r.alim.length > 0);
  ilerleme.push({ k, e, r, fiyat });
}
if (ilerleme.length > 1) varyantDamgasi('ilerleme kollar', ilerleme[0].r.iz, ilerleme[1].r.iz);

console.log('');
console.log(`--- §B3 İLERLEME — zincir bitmiş, bütün masalar Sv1, cüzdan 0 → ${SV_SAYI} Sv alımı (Kat 1 izi + kasa inişleri dahil) ---`);
console.log('kol/eğri  | toplam fiyat | bitiş     | ilk alım dk | en uzun bekleyiş dk (#) | medyan dk | p90 dk | son saat coin/dk | servis % | bot boş %');
console.log('-'.repeat(140));
for (const { k, e, r, fiyat } of ilerleme) {
  const top = MASALAR.reduce((a, m) => a + fiyat[m.tur].reduce((x, y) => x + y, 0), 0);
  const bek = r.alim.map((a, i) => a - (i ? r.alim[i - 1] : 0));
  const enI = bek.indexOf(Math.max(...bek));
  const o = r.olcu;
  const sonSaat = r.saatlik.length ? r.saatlik[r.saatlik.length - 1] / (((Number.isFinite(r.bitis) ? r.bitis : UFUK) % 3600) / 60 || 60) : NaN;
  const topIs = o.is.para + o.is.servis + o.is.ocak + o.is.bos + o.is.sv + o.is.kat1 || 1;
  console.log(
    `${`${k.ad}/${e}`.padEnd(9)} | ${f0(top).padStart(12)} | ${(Number.isFinite(r.bitis) ? sa(r.bitis) : `bitmedi ${r.alim.length}/${SV_SAYI}`).padEnd(9)} | ${f1((r.alim[0] ?? NaN) / 60).padStart(11)} | ${`${f1(bek[enI] / 60)} (#${enI + 1})`.padStart(23)} | ${f1(yuzdelik(bek, 0.5) / 60).padStart(9)} | ${f1(yuzdelik(bek, 0.9) / 60).padStart(6)} | ${f0(sonSaat).padStart(16)} | ${yuzde(o.servis, o.servis + o.kacan).padStart(8)} | ${yuzde(o.is.bos, topIs).padStart(9)}`,
  );
}

console.log('');
console.log('--- §B4 İLERLEME — saat başına toplam gelir (Kat 1 + Kat 2) coin/dk ---');
for (const { k, e, r } of ilerleme) console.log(`${`${k.ad}/${e}`.padEnd(9)} | ${r.saatlik.map((s) => f0(s / 60)).join(' · ')}`);

console.log('');
console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
damgaOzeti();
