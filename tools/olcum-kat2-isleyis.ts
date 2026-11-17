/**
 * olcum-kat2-isleyis.ts — "KAT 2 İŞLEYİŞİ = KAT 1" ölçümü (yalnız ölçüm, D-084). Kollar config'e YAZILMAZ.
 *
 * Soru (kullanıcı 2026-11-17: "Birinci kat ve ikinci kat işleyiş olarak aynı olsun. Sadece içerik farklı. Neden
 * alışkanlığı değiştiriyoruz?"): Kat 2'de Kat 1'den farklı işleyiş kalmasın.
 *   a) İLK GARSON ERKEN, PAD İLE (Kat 1 `waiter`, 3. adım) — bugün Kat 2'de zincirin 14. adımı.
 *   b) 2. ve 3. garson zincirde PAD (Kat 1 `waiter2`/`waiter3`); D-200'ün panelden 2. garsonu (`garsonSayi`) kalkar.
 *   c) LAVABO SEVİYESİ (Kat 1 `rooms.lavabo` L2-L6: uğrama %30→%55, ücret 18→86).
 *   d) BULAŞIK (Kat 1 bardak döngüsü): fincan havuzu, kirli masa, yıkama yeri, bulaşıkçı PAD'i, boştaki garson kirli taşır.
 *   e) Ocak yükseltmesi 4. okeyden sonra KALIR (D-200, config).
 *
 * §A PLATO — bütün zincir açık (3 garson), Sv1 ve Sv5: bulaşık yok / var × bulaşıkçı. coin/dk · servis % · kirli masa
 *    beklemesi % · temiz fincan yok %. Bulaşığın tavana etkisini gösterir.
 * §B İLERLEME — ilk çıkıştan (D-200 aracıyla aynı bot + Kat 1 izi): zincir (kolun) → Sv → yükseltmeler (ocak + garson
 *    hız/tepsi config'ten · lavabo kolun). Kat 2 süresi · ilk garsona kadar dk · en uzun bekleyiş · servis %.
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-isleyis.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-isleyis.ts > docs/olcum-kat2-isleyis.txt
 * Mutasyon: IS_MUT=garsonyok (garson pad'i açılır ama garson gelmez → G kollarının ilk garson etkisi kaybolur, varyant
 * damgası kırılır) · IS_MUT=yikamaz (leğen hiç temize döndürmez → bulaşık kolları tıkanır, "bulaşık döner" damgası kırılır).
 */
import { KISA, botDamgasi, damga, damgaOzeti, izOlustur, kipBandi, kisaDeger, korunumDamgasi, seedRandom, takilmaDamgasi, varyantDamgasi, yuzdelik } from './olcum-lib';
import { attractRadiusFor, charMaxTier, dishCarryMaxTier, dishSpeedMaxTier, economyConfig as C, playerSpeedFor, trayCapacityFor, waiterSpeedMaxTier } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import {
  KAT2_BULASIKCI_PAD,
  KAT2_GARSON_PAD,
  KAT2_GARSON_PADLER,
  KAT2_LAVABO_PAD,
  KAT2_LAVABO_YUK_YER,
  KAT2_MASALAR,
  KAT2_OCAK_YUK_YER,
  KAT2_SV_MAX,
  KAT2_YIKAMA_YER,
  OCAKLAR,
  OKEY_ERISIM,
  TAVLA_ERISIM,
  VARIS,
  kat2AcikAlan,
  kat2Adim,
} from '../src/game/kat';
import {
  kat2EtkinAyar,
  kat2HavuzHedef,
  kat2MasaYeri,
  kat2PadYeri,
  kat2SvCanliTetik,
  kat2Tick,
  kat2YapiHatasi,
  yeniKat2Dunya,
  type Kat2Ayar,
  type Kat2BulasikAyar,
  type Kat2Dunya,
  type Kat2YukAyar,
  type Kat2YukSeviye,
} from '../src/game/kat2Dongu';
import { BAND } from '../src/game/layout';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';

kipBandi();

const MUT = process.env.IS_MUT ?? '';
const DT = 0.1;
const PLATO_ISINMA = kisaDeger(5 * 60, 2 * 60);
const PLATO_SURE = kisaDeger(30 * 60, 6 * 60);
const UFUK = kisaDeger(16 * 3600, 3 * 3600);
const IZ_ISINMA = kisaDeger(5 * 60, 3 * 60);
const IZ_SURE = kisaDeger(60 * 60, 10 * 60);
const DOLUM_SN = 3.5;

const HIZ = playerSpeedFor(charMaxTier('speed'));
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const MIKNATIS = attractRadiusFor(charMaxTier('magnet'));
const g = () => useGame.getState();
const CFG = C.kat2 as unknown as Kat2Ayar;
const HAZIR: readonly string[] = C.kat2.hazir;
const CFG_YUK = CFG.yukseltme!;
const yuvarla50 = (v: number) => Math.round(v / 50) * 50;

// ---------------------------------------------------------------------------------------------
// KAT 1 SAYILARI (uyarlanır) — bardak döngüsü · bulaşıkçı · lavabo seviyesi.
// ---------------------------------------------------------------------------------------------
const K1_LAV = C.rooms.lavabo;
const BULASIK_K1: Kat2BulasikAyar = {
  havuz: C.cups.poolBase,
  havuzOcakArti: C.cups.poolPerLevel,
  esik: C.cups.dirtyThreshold,
  yikamaYaricap: C.cups.washRadius,
  yikamaSn: MUT === 'yikamaz' ? 1e9 : C.cups.washBatchSec,
  garsonTasima: C.waiter.idleDishCarry,
  bulasikci: { hiz: C.dishwasher.speedUpgrades.speeds[0], tasima: 2 },
};
/** Kat 2'ye özgü havuz: açık masanın kişisi başına 1 fincan (okey 4 · tavla 2) — fincan oyun boyunca masada durur. */
const BULASIK_MASA: Kat2BulasikAyar = { ...BULASIK_K1, havuzKisi: 1 };
const DW_SON = { hiz: C.dishwasher.speedUpgrades.speeds.at(-1)!, tasima: 2 + 2 * C.dishwasher.carryUpgrades.costs.length };

// ---------------------------------------------------------------------------------------------
// KOLLAR — zincir dönüşümü: eski `k2garson` (14. adım) çıkar, garson/bulaşıkçı pad'leri araya girer.
// Araya giren pad'in fiyatı = ardından gelen zincir pad'inin fiyatı × f (Kat 1: waiter ≈ table4 × ½ · waiter2 ≈ zone2 × 1).
// ---------------------------------------------------------------------------------------------
interface Ek {
  id: string;
  sonra: string; // bu pad'den hemen sonra
  f: number;
}
interface LavYuk {
  acan: string[];
  fiyat: number[];
  /** L1-L6 ücret (yoksa Kat 1 `feeByLevel`). Uğrama her zaman Kat 1 eğrisi. */
  ucret?: number[];
}
interface Kol {
  ad: string;
  not: string;
  ekler: Ek[]; // boşsa zincir config'in kendisi (TABAN)
  lavabo?: LavYuk;
  bulasik?: Kat2BulasikAyar;
  /**
   * TUR 2 — FİYAT KAYMASI (D-192 kuralı gerçek Kat 1'le): pad "o anki toplam gelirin ~9 dk'sı", masa Sv "~3 dk'sı" idi ama
   * toplam gelire Kat 1 ~76 coin/dk girmişti. Gerçek Kat 1 (görev hattı sonu) farkı Δ → pad +9Δ, Sv +3Δ; ocak/garson/lavabo
   * yükseltmesi D-200 kuralıyla (açan pad × ½), garson/bulaşıkçı pad'i ardından gelen pad × f — hepsi kaymış fiyattan türer.
   */
  kayma?: boolean;
}
/** Tur 2'de çalışma anında ölçülür: gerçek Kat 1 − eski ölçümlerin Kat 1'i (coin/dk). */
let KAYMA_DK = 0;
const kaymisPadler = (k: Kol) =>
  k.kayma
    ? CFG.padler.map((p) => {
        const cost = p.cost + yuvarla50(9 * KAYMA_DK);
        return { ...p, cost, fillRate: Math.round(cost / DOLUM_SN) };
      })
    : [...CFG.padler];
const [G1, G2, G3] = KAT2_GARSON_PADLER;
function zincirKur(ekler: Ek[], taban: readonly { id: string; cost: number; fillRate: number }[] = CFG.padler): { id: string; cost: number; fillRate: number }[] {
  if (!ekler.length) return [...taban];
  let z = taban.filter((p) => p.id !== KAT2_GARSON_PAD).map((p) => ({ ...p }));
  for (const e of ekler) {
    const i = z.findIndex((p) => p.id === e.sonra);
    if (i < 0) throw new Error(`zincirde yok: ${e.sonra}`);
    const sonraki = z[i + 1] ?? z[i];
    const cost = yuvarla50(sonraki.cost * e.f);
    z = [...z.slice(0, i + 1), { id: e.id, cost, fillRate: Math.round(cost / DOLUM_SN) }, ...z.slice(i + 1)];
  }
  return z;
}
const LAV_ACAN = ['k2salon3', 'k2tavla2', 'k2tavla5', 'k2tavla8', 'k2tavla11'];
const zincirFiyat = (id: string) => CFG.padler.find((p) => p.id === id)!.cost;
const LV_YARIM: LavYuk = { acan: LAV_ACAN, fiyat: LAV_ACAN.map((a) => yuvarla50(zincirFiyat(a) / 2)) };
const LAV_ORAN = zincirFiyat(KAT2_LAVABO_PAD) / C.pads.find((p) => p.id === 'lavabo')!.cost;
/** Ücret Kat 1 eğrisinin YARI hızında büyür (18 → 52): uğrama Kat 1 gibi artar, para yarı güçte. */
const LV_YARIM_UCRET: LavYuk = { ...LV_YARIM, ucret: K1_LAV.feeByLevel.map((f) => Math.round(K1_LAV.feeByLevel[0] + (f - K1_LAV.feeByLevel[0]) / 2)) };
const LV_K1: LavYuk = { acan: LAV_ACAN, fiyat: K1_LAV.upgradeCosts.map((c) => yuvarla50(c * LAV_ORAN)) };

const G_K1: Ek[] = [
  { id: G1, sonra: 'k2okey3', f: 0.5 },
  { id: G2, sonra: 'k2okey4', f: 1 },
  { id: G3, sonra: 'k2s2okey6', f: 1 },
];
const G_UCUZ: Ek[] = G_K1.map((e) => ({ ...e, f: 0.5 }));
const G_ERKEN: Ek[] = [{ id: G1, sonra: 'k2okey1', f: 0.5 }, ...G_K1.slice(1)];
const G_GEC: Ek[] = [G_K1[0], { id: G2, sonra: 'k2s2okey6', f: 1 }, { id: G3, sonra: 'k2salon3', f: 1 }];
const BK: Ek = { id: KAT2_BULASIKCI_PAD, sonra: 'k2s2okey2', f: 0.5 };
const BK_ERKEN: Ek = { id: KAT2_BULASIKCI_PAD, sonra: 'k2okey4', f: 0.5 };

const KOLLAR: Kol[] = [
  { ad: 'TABAN', not: 'bugünkü config (D-200): garson zincirin 14. adımı (tek pad) + 2. garson panelden', ekler: [] },
  { ad: 'G-K1', not: '1. garson 3. okeyden sonra (½) · 2. garson salon kapısından önce (×1) · 3. garson lavabodan önce (×1)', ekler: G_K1 },
  { ad: 'G-UCUZ', not: 'G-K1 yerleri, üç garson da ½', ekler: G_UCUZ },
  { ad: 'G-ERKEN', not: '1. garson 1. okeyden hemen sonra (½), 2-3 G-K1', ekler: G_ERKEN },
  { ad: 'G-GEC', not: '1. garson G-K1 · 2. garson lavabodan önce · 3. garson tavla köşesinden sonra', ekler: G_GEC },
  { ad: 'G+LV½', not: 'G-K1 + lavabo L2-L6 (Kat 1 sayıları), fiyat = açan pad × ½ (D-200 kuralı)', ekler: G_K1, lavabo: LV_YARIM },
  { ad: 'G+LVK1', not: `G-K1 + lavabo L2-L6, fiyat = Kat 1 fiyatı × ${LAV_ORAN.toFixed(2)} (lavabo pad oranı)`, ekler: G_K1, lavabo: LV_K1 },
  { ad: 'G+LVy', not: 'G+LV½, lavabo ücreti Kat 1 eğrisinin yarı hızında (18 → 52)', ekler: G_K1, lavabo: LV_YARIM_UCRET },
  { ad: 'G+LVy+Be4', not: 'G+LVy + bulaşık, eşik 4, masa başına kişi kadar fincan', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: { ...BULASIK_MASA, esik: 4 } },
  { ad: 'G+LVy+Bh', not: 'G+LVy + bulaşık, eşik 4, masa başına kişi × 1,5 fincan', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: { ...BULASIK_MASA, esik: 4, havuzKisi: 1.5 } },
  { ad: 'G+LV+Bk1', not: 'G+LV½ + bulaşık, havuz Kat 1 kuralı (ocak başına 10 + yükseltme başına 2) · bulaşıkçı 2. okey salonu masasından sonra (½), taban', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: BULASIK_K1 },
  { ad: 'G+LV+B', not: 'G+LV+Bk1, havuza masa başına kişi kadar fincan (okey 4 · tavla 2)', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: BULASIK_MASA },
  { ad: 'G+LV+Bson', not: 'G+LV+B, bulaşıkçı Kat 1 son kademe (panel ortak: hız 2,8 · taşıma 8)', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: { ...BULASIK_MASA, bulasikci: DW_SON } },
  { ad: 'G+LV+Berk', not: 'G+LV+Bson, bulaşıkçı merdiven salonu dolunca (4. okeyden sonra, ½)', ekler: [...G_K1, BK_ERKEN], lavabo: LV_YARIM, bulasik: { ...BULASIK_MASA, bulasikci: DW_SON } },
  { ad: 'G+LV+Be4', not: 'G+LV+B, kirli eşiği 4 (masada 4 fincandan fazla kirli = okey masasının kişi sayısı)', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: { ...BULASIK_MASA, esik: 4 } },
  { ad: 'G+LV+B0', not: 'G+LV+B, BULAŞIKÇI YOK (yük oyuncu + boştaki garsonda)', ekler: G_K1, lavabo: LV_YARIM, bulasik: { ...BULASIK_MASA, bulasikci: undefined } },
];

const TUR2 = process.env.IS_TUR === '2';
const BT = (esik: number): Kat2BulasikAyar => ({ ...BULASIK_MASA, esik, teslimdeAl: true });
const KOLLAR2: Kol[] = [
  { ad: 'TABAN', not: 'bugünkü config, GERÇEK Kat 1', ekler: [] },
  { ad: 'Gbug', not: 'G-K1 + LVy + bulaşık eşik 4 (tur 1 önerisi), bugünkü fiyatlar, GERÇEK Kat 1', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: { ...BULASIK_MASA, esik: 4 } },
  { ad: 'K-G', not: 'kayma + G-K1 + LVy, bulaşık yok', ekler: G_K1, lavabo: LV_YARIM_UCRET, kayma: true },
  { ad: 'K-Be4', not: 'kayma + G-K1 + LVy + bulaşık eşik 4 (garson boşu almaz)', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: { ...BULASIK_MASA, esik: 4 }, kayma: true },
  { ad: 'K-Bt2', not: 'kayma + G-K1 + LVy + bulaşık eşik 2 (Kat 1) + garson kahveyi getirirken boşu alır', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: BT(2), kayma: true },
  { ad: 'K-Bt4', not: 'K-Bt2, eşik 4', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: BT(4), kayma: true },
  { ad: 'K-LV½-Bt2', not: 'K-Bt2, lavabo ücreti Kat 1 aynen (18 → 86)', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: BT(2), kayma: true },
];
const PLATOLAR2: Kol[] = [
  { ad: 'bulaşık yok', not: '', ekler: G_K1, lavabo: LV_YARIM_UCRET },
  { ad: 'B eşik 2', not: '', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: BULASIK_MASA },
  { ad: 'B eşik 4', not: '', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: { ...BULASIK_MASA, esik: 4 } },
  { ad: 'B eşik 2 teslim', not: '', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: BT(2) },
  { ad: 'B eşik 4 teslim', not: '', ekler: [...G_K1, BK], lavabo: LV_YARIM_UCRET, bulasik: BT(4) },
];

/** Kolun ayarı: zincir + (yeni kollarda) panelden 2. garson kalkar + bulaşık. Garson sayısını pad'ler verir. */
function kolAyari(k: Kol): { a: Kat2Ayar; lav?: LavYuk } {
  const taban = kaymisPadler(k);
  const padler = zincirKur(k.ekler, taban);
  const fiyatOf = (id: string) => taban.find((p) => p.id === id)!.cost;
  const yarim = (acan: readonly string[]) => acan.map((x) => yuvarla50(fiyatOf(x) / 2));
  // Yeni kollar: panelden 2. garson kalkar; eski garson adımına bağlı ocak alımı onun önceki adımına (tavla köşesi kapısı) geçer.
  let yukseltme: Kat2YukAyar = k.ekler.length
    ? { ...CFG_YUK, ocak: { ...CFG_YUK.ocak, acan: CFG_YUK.ocak.acan.map((x) => (x === KAT2_GARSON_PAD ? 'k2salon3' : x)) }, garsonSayi: { acan: [], fiyat: [] } }
    : CFG_YUK;
  let masaSv = CFG.masaSv;
  let lav = k.lavabo;
  if (k.kayma) {
    yukseltme = {
      ...yukseltme,
      ocak: { ...yukseltme.ocak, fiyat: yarim(yukseltme.ocak.acan) },
      garsonHiz: { ...yukseltme.garsonHiz, fiyat: yarim(yukseltme.garsonHiz.acan) },
      garsonTepsi: { ...yukseltme.garsonTepsi, fiyat: yarim(yukseltme.garsonTepsi.acan) },
    };
    const sv = (f: readonly number[]) => f.map((v, i) => (i ? v + yuvarla50(3 * KAYMA_DK) : v));
    masaSv = CFG.masaSv && { okey: { ...CFG.masaSv.okey, fiyat: sv(CFG.masaSv.okey.fiyat) }, tavla: { ...CFG.masaSv.tavla, fiyat: sv(CFG.masaSv.tavla.fiyat) } };
    if (lav && lav !== LV_K1) lav = { ...lav, fiyat: yarim(lav.acan) };
  }
  const a: Kat2Ayar = { ...CFG, padler, yukseltme, masaSv, bulasik: k.bulasik };
  const h = kat2YapiHatasi(a);
  if (h) throw new Error(`${k.ad}: ${h}`);
  return { a, lav };
}

// ---------------------------------------------------------------------------------------------
// KAT 1 İZİ (D-200 aracıyla aynı) — D-198: Kat 2'deyken Kat 1 parası doğrudan cüzdana.
// ---------------------------------------------------------------------------------------------
function kat1Izi(gorevSonu = false): { iz: Float64Array; r1Dk: number } {
  seedRandom(7);
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  g().kat2Ac();
  useGame.setState({ charUpgrades: { ...g().charUpgrades, speed: charMaxTier('speed'), tray: charMaxTier('tray'), magnet: charMaxTier('magnet') } });
  // TUR 2: merdiveni açan oyuncunun Kat 1'i = görev hattının sonu (ocak L6 · lavabo L6 · garson/bulaşıkçı tavan; masa
  // seviyesi serbest → 0, alt sınır). `tools/olcum-kat1-pasif.ts` D satırı.
  if (gorevSonu) {
    const s = g();
    useGame.setState({
      stationLevels: s.stationLevels.map(() => 6),
      lavaboLevel: 6,
      waiterUpgrades: { ...s.waiterUpgrades, tray: C.waiter.trayUpgrades.costs.length, speed: waiterSpeedMaxTier(), dishCarry: dishCarryMaxTier(), dishSpeed: dishSpeedMaxTier() },
    } as never);
  }
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
// BOT YOLU (D-200 aracıyla aynı: yalnız merdiven kovası koridoru)
// ---------------------------------------------------------------------------------------------
const uz = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const KX = VARIS[2][0];
const KAPI_Z = BAND.front + 0.8;
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
interface Olcu {
  sure: number;
  para: number;
  servis: number;
  kacan: number;
  garson: number;
  kirliBek: number; // masa-sn: boş masa kirli diye grup bekliyor
  masaSn: number; // açık masa-sn
  temizYok: number; // ocak-sn: temiz fincan yok, kuyruk boş
  ocakSn: number;
  yikanan: number; // oyuncunun yıkadığı
  donen: number; // leğenden temize dönen (herkesin)
  botBos: number;
  yol: number;
  enUzunItme: number;
}
const yeniOlcu = (): Olcu => ({ sure: 0, para: 0, servis: 0, kacan: 0, garson: 0, kirliBek: 0, masaSn: 0, temizYok: 0, ocakSn: 0, yikanan: 0, donen: 0, botBos: 0, yol: 0, enUzunItme: 0 });

interface Kosu {
  olcu: Olcu;
  zincirBitis: number;
  svBitis: number;
  yukBitis: number;
  bitis: number;
  ilkGarson: number;
  alimlar: { t: number; ne: string }[];
  saatlik: number[];
  kat1: number;
  iz: string;
}

type Yuk = { tur: 'ocak' | 'ghiz' | 'gtepsi' | 'gsayi' | 'lav'; acan: string; fiyat: number };
const sevOyun = (s: Record<Yuk['tur'], number>): Kat2YukSeviye => ({ ocak: s.ocak, garsonHiz: s.ghiz, garsonTepsi: s.gtepsi, garsonSayi: s.gsayi });

function kos(kol: Kol, o: { plato?: { sv: number }; iz1?: Float64Array; sure: number; olcBas: number }): Kosu {
  const plato = o.plato;
  const { a: A0, lav: LAV } = kolAyari(kol);
  const ZINCIR = A0.padler;
  const TUM = [...HAZIR, ...ZINCIR.map((p) => p.id)];
  const MASALAR = KAT2_MASALAR.filter((m) => TUM.includes(m.id));
  const SV_SAYI = MASALAR.length * (KAT2_SV_MAX - 1);
  let padsDone: string[] = plato ? [...TUM] : [...HAZIR];
  const sev: Record<Yuk['tur'], number> = { ocak: 0, ghiz: 0, gtepsi: 0, gsayi: 0, lav: 0 };
  const YK = A0.yukseltme!;
  const lavAyar = () => (sev.lav > 0 || LAV ? { ugrama: K1_LAV.visitChanceByLevel[sev.lav], ucret: (LAV?.ucret ?? K1_LAV.feeByLevel)[sev.lav] } : A0.lavabo);
  const ayarHesap = (): Kat2Ayar => {
    const a = kat2EtkinAyar(A0, sevOyun(sev));
    const lavabo = lavAyar();
    if (MUT === 'garsonyok') return { ...a, lavabo, garson: undefined };
    return { ...a, lavabo };
  };
  let ayar = ayarHesap();
  let d: Kat2Dunya = yeniKat2Dunya(padsDone, ayar);
  const masaSv: Record<string, number> = plato ? Object.fromEntries(MASALAR.map((m) => [m.id, plato.sv])) : {};
  // Yükseltmeler: ocak (config, mekânsal — oyunun tetiği) · garson hız/tepsi (config, panel) · lavabo (kolun, mekânsal — araç).
  const yukKalan: Yuk[] = plato
    ? []
    : [
        ...YK.ocak.acan.map((acan, i) => ({ tur: 'ocak' as const, acan, fiyat: YK.ocak.fiyat[i] })),
        ...YK.garsonHiz.acan.map((acan, i) => ({ tur: 'ghiz' as const, acan, fiyat: YK.garsonHiz.fiyat[i] })),
        ...YK.garsonTepsi.acan.map((acan, i) => ({ tur: 'gtepsi' as const, acan, fiyat: YK.garsonTepsi.fiyat[i] })),
        ...YK.garsonSayi.acan.map((acan, i) => ({ tur: 'gsayi' as const, acan, fiyat: YK.garsonSayi.fiyat[i] })),
        ...(LAV?.acan ?? []).map((acan, i) => ({ tur: 'lav' as const, acan, fiyat: LAV!.fiyat[i] })),
      ];
  const yukToplam = yukKalan.length;
  if (plato) {
    sev.ocak = YK.ocak.fiyat.length;
    sev.ghiz = YK.garsonHiz.fiyat.length;
    sev.gtepsi = YK.garsonTepsi.fiyat.length;
    sev.gsayi = YK.garsonSayi.fiyat.length;
    sev.lav = LAV ? LAV.fiyat.length : 0;
    ayar = ayarHesap();
    d = yeniKat2Dunya(padsDone, ayar);
  }
  let lavDolum = 0;
  let cuzdan = 0;
  let x = VARIS[2][0];
  let z = VARIS[2][2];
  let p1 = 0;
  let itme = 0;
  const olcu = yeniOlcu();
  const alimlar: Kosu['alimlar'] = [];
  const saatlik: number[] = [];
  const izT = izOlustur();
  let kat2Kazanc = 0, harcama = 0, yukHarcama = 0, kat1 = 0, dusenTop = 0;
  let zincirBitis = plato ? 0 : NaN, svBitis = NaN, yukBitis = yukToplam ? NaN : 0, ilkGarson = NaN;
  let svAlim = 0;
  const yukAlindi = (y: Yuk, t: number) => {
    sev[y.tur] += 1;
    ayar = ayarHesap();
    yukKalan.splice(yukKalan.indexOf(y), 1);
    alimlar.push({ t, ne: `${y.tur}${sev[y.tur]}` });
    if (!yukKalan.length) yukBitis = t;
  };
  let t = 0;
  for (; t < o.sure; t += DT) {
    const olc = t >= o.olcBas;
    const h = Math.floor(t / 3600);
    saatlik[h] ??= 0;
    if (o.iz1) {
      const akis = o.iz1[p1 % o.iz1.length];
      p1++;
      cuzdan += akis;
      kat1 += akis;
      saatlik[h] += akis;
    }
    const zincirBitti = ZINCIR.every((p) => padsDone.includes(p.id));
    if (!plato && zincirBitti && Number.isNaN(zincirBitis)) zincirBitis = t;
    if (Number.isNaN(ilkGarson) && KAT2_GARSON_PADLER.some((id) => padsDone.includes(id))) ilkGarson = t;
    // Her türün yalnız SIRADAKİ alımı (oyun hattı sıralı: `kat2YukSiradaki`).
    const acik = yukKalan.filter((y) => padsDone.includes(y.acan) && yukKalan.find((v) => v.tur === y.tur) === y);
    const sp = ZINCIR.find((p) => !padsDone.includes(p.id));
    const svT = !plato && zincirBitti ? kat2SvCanliTetik(ayar, padsDone, masaSv)[0] : undefined;
    type Aday = { kalan: number; yer: readonly [number, number] | null; yuk?: Yuk };
    const adaylar: Aday[] = [];
    if (sp && !plato) adaylar.push({ kalan: sp.cost - (d.padFill[sp.id] ?? 0), yer: kat2PadYeri(sp.id) });
    if (svT) adaylar.push({ kalan: svT.fiyat - (d.padFill[svT.id] ?? 0), yer: [svT.x, svT.z] });
    const yk = acik.length ? acik.reduce((a, b) => (a.fiyat <= b.fiyat ? a : b)) : undefined;
    if (yk) {
      const yer = yk.tur === 'ocak' ? KAT2_OCAK_YUK_YER : yk.tur === 'lav' ? KAT2_LAVABO_YUK_YER : null;
      const dolu = yk.tur === 'ocak' ? d.padFill['k2ocakYuk'] ?? 0 : yk.tur === 'lav' ? lavDolum : 0;
      adaylar.push({ kalan: yk.fiyat - dolu, yer, yuk: yk });
    }
    const ucuz = adaylar.length ? adaylar.reduce((a, b) => (a.kalan <= b.kalan ? a : b)) : null;
    if (ucuz?.yuk && ucuz.yer === null && cuzdan >= ucuz.kalan) {
      cuzdan -= ucuz.kalan;
      yukHarcama += ucuz.kalan;
      yukAlindi(ucuz.yuk, t);
      continue;
    }

    // Bot hedefi: satın alma > para > servis > yıkama > kahve al > kirli topla > bekle.
    let hedef: readonly [number, number];
    let bos = false;
    const b = ayar.bulasik;
    const kirliEl = d.tepsiKirli ?? 0;
    const bekleyen = d.masalar.filter((m) => m.durum === 'oyunda' && m.istek > 0);
    const acikOcak = OCAKLAR.filter((oc) => padsDone.includes(oc.id));
    const kirliMasa = b ? d.masalar.filter((m) => (m.kirli ?? 0) > 0) : [];
    const masaNok = (id: string): [number, number] => {
      const y = kat2MasaYeri(id)!;
      return y.tur === 'tavla' ? [y.x, y.z + TAVLA_ERISIM[1] - 0.3] : [y.x, y.z + OKEY_ERISIM - 0.3];
    };
    if (ucuz && ucuz.yer && cuzdan >= ucuz.kalan - 1e-9) hedef = ucuz.yer;
    else if (d.paralar.length) hedef = d.paralar.map((p) => [p.x, p.z] as [number, number]).reduce((a, c) => (uz([x, z], a) <= uz([x, z], c) ? a : c));
    else if (d.tepsi > 0 && bekleyen.length) hedef = masaNok(bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c)).id);
    else if (b && kirliEl > 0 && (d.tepsi === 0 || kirliEl + d.tepsi >= TEPSI)) hedef = [KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1] + 0.8];
    else if (d.tepsi + kirliEl < TEPSI && bekleyen.length && acikOcak.length) {
      const hazir = acikOcak.filter((oc) => d.ocaklar[OCAKLAR.indexOf(oc)].hazir > 0);
      hedef = (hazir.length ? hazir : acikOcak).reduce((a, c) => (uz([x, z], a.al) <= uz([x, z], c.al) ? a : c)).al;
    } else if (kirliMasa.length && d.tepsi + kirliEl < TEPSI) hedef = masaNok(kirliMasa.reduce((a, c) => (uz([x, z], masaNok(a.id)) <= uz([x, z], masaNok(c.id)) ? a : c)).id);
    else if (b && kirliEl > 0) hedef = [KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1] + 0.8];
    else if (d.tepsi < TEPSI && acikOcak.length) {
      const hazir = acikOcak.filter((oc) => d.ocaklar[OCAKLAR.indexOf(oc)].hazir > 0);
      hedef = (hazir.length ? hazir : acikOcak).reduce((a, c) => (uz([x, z], a.al) <= uz([x, z], c.al) ? a : c)).al;
    } else {
      hedef = [x, z];
      bos = true;
    }
    if (olc && bos) olcu.botBos += DT;
    const ara = yol(x, z, hedef);
    const dx = ara[0] - x;
    const dz = ara[1] - z;
    const L = Math.hypot(dx, dz);
    let durdu = true;
    if (L > 0.15) {
      durdu = false;
      const kk = Math.min(1, (HIZ * DT) / L);
      const [nx, nz] = kat2Adim(x, z, dx * kk, dz * kk, kat2AcikAlan(padsDone));
      const adim = Math.hypot(nx - x, nz - z);
      olcu.yol += adim;
      itme = adim < 1e-4 ? itme + DT : 0;
      olcu.enUzunItme = Math.max(olcu.enUzunItme, itme);
      x = nx;
      z = nz;
    }
    // Lavabo seviye noktası: durunca pad hızıyla dolar (araç; oyunda tetik uygulamada gelir).
    if (yk && yk.tur === 'lav' && durdu && ucuz?.yuk === yk && uz([x, z], KAT2_LAVABO_YUK_YER) < 0.5) {
      const amt = Math.min((yk.fiyat / DOLUM_SN) * DT, cuzdan, yk.fiyat - lavDolum);
      lavDolum += amt;
      cuzdan -= amt;
      yukHarcama += amt;
      if (lavDolum >= yk.fiyat - 1e-9) {
        lavDolum = 0;
        yukAlindi(yk, t);
      }
    }

    const r = kat2Tick(d, { x, z, durdu, cuzdan, padsDone, tepsiKap: TEPSI, miknatis: MIKNATIS, masaSv, svCanli: !plato && zincirBitti, yuk: sevOyun(sev) }, DT, ayar);
    d = r.dunya;
    for (const id of r.olay.svAtlayan) {
      masaSv[id] = Math.min(KAT2_SV_MAX, (masaSv[id] ?? 1) + 1);
      svAlim++;
      alimlar.push({ t, ne: 'sv' });
      if (svAlim >= SV_SAYI) svBitis = t;
    }
    if (r.padsDone !== padsDone) padsDone = r.padsDone;
    if (r.olay.padBitti) alimlar.push({ t, ne: 'pad' });
    if (r.olay.ocakYuk) {
      const oy = yukKalan.filter((y) => y.tur === 'ocak' && padsDone.includes(y.acan)).reduce((a, c) => (a.fiyat <= c.fiyat ? a : c));
      yukAlindi(oy, t);
    }
    const dusen = r.olay.dusen.reduce((a, c) => a + c, 0) + r.olay.lavabo;
    dusenTop += dusen;
    cuzdan += r.kazanc - r.harcama;
    harcama += r.harcama;
    kat2Kazanc += r.kazanc;
    saatlik[h] += r.kazanc;
    if (olc) {
      olcu.para += dusen;
      olcu.servis += r.olay.servis;
      olcu.kacan += r.olay.kacan;
      olcu.garson += r.olay.garsonServis;
      olcu.yikanan += r.olay.yikanan;
      olcu.donen += r.olay.temizDonen;
      for (const m of d.masalar) {
        if (m.durum === 'kapali') continue;
        olcu.masaSn += DT;
        if (b && m.durum === 'bos' && (m.kirli ?? 0) > b.esik) olcu.kirliBek += DT;
      }
      d.ocaklar.forEach((oc, k) => {
        if (!padsDone.includes(OCAKLAR[k].id)) return;
        olcu.ocakSn += DT;
        if (b && oc.hazir === 0 && (d.temiz ?? 0) === 0) olcu.temizYok += DT;
      });
    }
    if (Math.round(t / DT) % 50 === 0) izT.ekle(cuzdan, padsDone.length, svAlim, x, z, d.tepsi);
    if (!plato && zincirBitti && svAlim >= SV_SAYI && !yukKalan.length) break;
  }
  olcu.sure = Math.max(0, t - o.olcBas);
  const yerde = d.paralar.reduce((a, p) => a + p.miktar, 0);
  korunumDamgasi(`Kat 2 coin ${kol.ad}`, Math.round(dusenTop - kat2Kazanc - yerde));
  korunumDamgasi(`cüzdan coin ${kol.ad}`, Math.round(kat2Kazanc + kat1 - harcama - yukHarcama - cuzdan));
  if (ayar.bulasik) {
    // Fincan korunumu: temiz + ocak + tepsiler + masada (içilen + kirli) + taşınan kirli + leğen = havuz.
    const gs = [d.garson, ...(d.garsonEk ?? [])].filter((v) => v !== null);
    const fincan =
      (d.temiz ?? 0) + d.ocaklar.reduce((a, oc) => a + oc.hazir, 0) + d.tepsi + (d.tepsiKirli ?? 0) + (d.legen ?? 0) +
      gs.reduce((a, w) => a + w!.tepsi + (w!.kirli ?? 0), 0) + (d.bulasikci?.kirli ?? 0) +
      d.masalar.reduce((a, m) => a + (m.ictigi ?? 0) + (m.kirli ?? 0), 0);
    const hedefHavuz = kat2HavuzHedef(ayar.bulasik, padsDone, sev.ocak);
    korunumDamgasi(`fincan ${kol.ad}`, fincan - hedefHavuz);
  }
  const bitis = Math.max(zincirBitis, svBitis, yukBitis);
  return { olcu, zincirBitis, svBitis, yukBitis, bitis, ilkGarson, alimlar, saatlik, kat1, iz: izT.deger };
}

// ---------------------------------------------------------------------------------------------
// ÇALIŞTIR
// ---------------------------------------------------------------------------------------------
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const sa = (sn: number) => (Number.isFinite(sn) ? `${(sn / 3600).toFixed(2)} sa` : 'bitmedi');
const yuzde = (a: number, b: number) => (b > 0 ? `%${((100 * a) / b).toFixed(0)}` : '—');

const t0 = Date.now();
console.log('=== KAT 2 İŞLEYİŞİ = KAT 1 (garson pad · lavabo seviyesi · bulaşık) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · dt ${DT} · plato ${PLATO_ISINMA / 60}+${PLATO_SURE / 60} dk · ilerleme ufku ${UFUK / 3600} sa${MUT ? ` · MUTASYON ${MUT}` : ''}`);
console.log(`Bot: hız ${HIZ} · tepsi ${TEPSI} (kirliyle paylaşımlı) · mıknatıs ${MIKNATIS} · "en ucuz açık hedef önce" · Kat 1 parası doğrudan cüzdana (D-198).`);
console.log(`Bulaşık (Kat 1): havuz ${BULASIK_K1.havuz}/ocak +${BULASIK_K1.havuzOcakArti}/ocak yük. · eşik >${BULASIK_K1.esik} · yıkama r ${BULASIK_K1.yikamaYaricap} · leğen ${C.cups.washBatchSec} sn · boştaki garson ${BULASIK_K1.garsonTasima} · bulaşıkçı taban ${BULASIK_K1.bulasikci!.hiz}/${BULASIK_K1.bulasikci!.tasima} · son ${DW_SON.hiz}/${DW_SON.tasima}`);
console.log(`Lavabo L1-L6 (Kat 1): uğrama ${K1_LAV.visitChanceByLevel.join('/')} · ücret ${K1_LAV.feeByLevel.join('/')} · açan ${LAV_ACAN.join(' → ')}`);
console.log(`  LVy ücret ${LV_YARIM_UCRET.ucret!.join('/')}`);
console.log(`  LV½ fiyat ${LV_YARIM.fiyat.join('/')} · LVK1 fiyat ${LV_K1.fiyat.join('/')}`);
if (!TUR2) for (const k of KOLLAR) console.log(`  ${k.ad.padEnd(10)} ${k.not}${k.ekler.length ? ` — ${k.ekler.map((e) => `${e.id}@${e.sonra}=${zincirKur(k.ekler).find((p) => p.id === e.id)!.cost}`).join(' · ')}` : ''}`);

let { iz: IZ1, r1Dk } = kat1Izi();
console.log(`Kat 1 izi: ${r1Dk.toFixed(1)} coin/dk (pad'ler açık, seviyeler taban — D-192…D-200 ölçümlerinin izi)`);
if (TUR2) {
  const eski = r1Dk;
  ({ iz: IZ1, r1Dk } = kat1Izi(true));
  KAYMA_DK = r1Dk - eski;
  console.log(`TUR 2 · GERÇEK Kat 1 izi (görev hattı sonu): ${r1Dk.toFixed(1)} coin/dk · fark ${KAYMA_DK.toFixed(0)} → pad +${yuvarla50(9 * KAYMA_DK)} · Sv +${yuvarla50(3 * KAYMA_DK)}`);
  for (const k of KOLLAR2) console.log(`  ${k.ad.padEnd(10)} ${k.not}`);
  const ornek = kolAyari(KOLLAR2.find((k) => k.ad === 'K-Bt2')!);
  console.log(`  K-Bt2 zincir: ${ornek.a.padler.map((p) => `${p.id} ${p.cost}`).join(' · ')}`);
  console.log(`  K-Bt2 ocak ${ornek.a.yukseltme!.ocak.fiyat.join('/')} · garson hız ${ornek.a.yukseltme!.garsonHiz.fiyat.join('/')} · tepsi ${ornek.a.yukseltme!.garsonTepsi.fiyat.join('/')} · lavabo ${ornek.lav!.fiyat.join('/')} · okey Sv ${ornek.a.masaSv!.okey.fiyat.join('/')} · tavla Sv ${ornek.a.masaSv!.tavla.fiyat.join('/')}`);
}
damga('Kat 1 izi akıyor', r1Dk > 10, `${r1Dk.toFixed(1)}`);

// ---- §A PLATO
const PLATOLAR: Kol[] = [
  { ad: 'G (bulaşık yok)', not: '', ekler: G_K1, lavabo: LV_YARIM },
  { ad: 'Bk1 taban', not: '', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: BULASIK_K1 },
  { ad: 'B bulaşıkçı yok', not: '', ekler: G_K1, lavabo: LV_YARIM, bulasik: { ...BULASIK_MASA, bulasikci: undefined } },
  { ad: 'B taban', not: '', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: BULASIK_MASA },
  { ad: 'B son kademe', not: '', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: { ...BULASIK_MASA, bulasikci: DW_SON } },
  { ad: 'B eşik 4', not: '', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: { ...BULASIK_MASA, esik: 4 } },
  { ad: 'B eşik 4 h1,5', not: '', ekler: [...G_K1, BK], lavabo: LV_YARIM, bulasik: { ...BULASIK_MASA, esik: 4, havuzKisi: 1.5 } },
];
console.log('');
console.log('--- §A PLATO — bütün zincir açık (3 garson · ocak 6 · garson 4/4 · lavabo L6); GERÇEK Kat 2 coin/dk (masa + lavabo) ---');
console.log('(Bk1 = havuz Kat 1 kuralı · B = + masa başına kişi kadar fincan)');
console.log('kurulum          | Sv | coin/dk | servis % | garson payı | kirli masa bekler % | temiz fincan yok % | oyuncu yıkadı/dk | bot boş %');
const platoIz = new Map<string, string>();
const platoDk = new Map<string, number>();
const platoGarson: number[] = [];
const platoDonen: number[] = [];
for (const sv of [1, KAT2_SV_MAX]) {
  for (const p of TUR2 ? PLATOLAR2 : PLATOLAR) {
    if (KISA && sv === KAT2_SV_MAX && p.ad !== 'G (bulaşık yok)' && p.ad !== 'B taban') continue;
    const r = kos({ ...p, ad: `plato ${p.ad} Sv${sv}` }, { plato: { sv }, sure: PLATO_ISINMA + PLATO_SURE, olcBas: PLATO_ISINMA });
    const o = r.olcu;
    const dk = o.sure / 60;
    botDamgasi(`plato ${p.ad} Sv${sv}`, o.yol, dk, 30);
    takilmaDamgasi(`plato ${p.ad} Sv${sv}`, o.enUzunItme);
    platoIz.set(`${p.ad}/${sv}`, r.iz);
    platoDk.set(`${p.ad}/${sv}`, o.para / dk);
    platoGarson.push(o.garson);
    if (p.bulasik) platoDonen.push(o.donen / Math.max(1, o.servis));
    console.log(
      `${p.ad.padEnd(16)} | ${sv}  | ${f0(o.para / dk).padStart(7)} | ${yuzde(o.servis, o.servis + o.kacan).padStart(8)} | ${yuzde(o.garson, o.servis).padStart(11)} | ${yuzde(o.kirliBek, o.masaSn).padStart(19)} | ${yuzde(o.temizYok, o.ocakSn).padStart(18)} | ${f1(o.yikanan / dk).padStart(16)} | ${yuzde(o.botBos, o.sure).padStart(9)}`,
    );
  }
}
damga('plato: garson servis eder (her kurulum)', platoGarson.every((v) => v > 0), platoGarson.join('/'));
damga('plato: yıkanan fincan temize döner (B kurulumları ≥ %50 servis)', platoDonen.every((v) => v >= 0.5), platoDonen.map((v) => v.toFixed(2)).join('/'));
const [P0, PB] = TUR2 ? ['bulaşık yok', 'B eşik 2 teslim'] : ['G (bulaşık yok)', 'B taban'];
varyantDamgasi('plato bulaşık Sv1', platoIz.get(`${P0}/1`)!, platoIz.get(`${PB}/1`)!);
damga('bulaşık döner (≥ %50 bulaşıksız gelir)', platoDk.get(`${PB}/1`)! >= 0.5 * platoDk.get(`${P0}/1`)!, `${f0(platoDk.get(`${PB}/1`)!)} / ${f0(platoDk.get(`${P0}/1`)!)}`);

// ---- §B İLERLEME
const ILERLEME = TUR2 ? (KISA ? KOLLAR2.filter((k) => ['TABAN', 'K-Bt2'].includes(k.ad)) : KOLLAR2) : KISA ? KOLLAR.filter((k) => ['TABAN', 'G-K1', 'G+LV+B'].includes(k.ad)) : KOLLAR;
const sonuc: { k: Kol; r: Kosu }[] = [];
for (const k of ILERLEME) {
  const r = kos(k, { iz1: IZ1, sure: UFUK, olcBas: 0 });
  const sure = Number.isFinite(r.bitis) ? r.bitis : UFUK;
  botDamgasi(`ilerleme ${k.ad}`, r.olcu.yol, sure / 60, 30);
  takilmaDamgasi(`ilerleme ${k.ad}`, r.olcu.enUzunItme);
  sonuc.push({ k, r });
}
for (const s of sonuc.slice(1)) varyantDamgasi(`ilerleme ${s.k.ad}`, sonuc[0].r.iz, s.r.iz);
damga('ilerleme: garson servis eder (her kol)', sonuc.every((s) => s.r.olcu.garson > 0), sonuc.map((s) => s.r.olcu.garson).join('/'));
damga('ilerleme: yıkanan fincan temize döner (bulaşık kolları ≥ %50 servis)', sonuc.filter((s) => s.k.bulasik).every((s) => s.r.olcu.donen >= 0.5 * s.r.olcu.servis));
const gk1 = sonuc.find((s) => s.k.ad === 'G-K1');
if (gk1) damga('G-K1 ilk garson erken (< 30 dk)', gk1.r.ilkGarson < 30 * 60, f1(gk1.r.ilkGarson / 60));

console.log('');
console.log('--- §B İLERLEME — ilk çıkıştan: zincir → Sv → yükseltmeler (ocak + garson hız/tepsi config · lavabo kolun) ---');
console.log('kol        | zincir pad | ilk garson dk | zincir biter | Sv biter  | yük. biter | KAT 2 BİTER | en uzun bekleyiş dk | medyan dk | servis % | kirli masa % | temiz yok % | son saat Kat 2 coin/dk');
console.log('-'.repeat(190));
for (const { k, r } of sonuc) {
  const ts = [...r.alimlar.map((a) => a.t)].sort((a, b) => a - b);
  const bek = ts.map((v, i) => v - (i ? ts[i - 1] : 0));
  const o = r.olcu;
  const son = r.saatlik.length ? r.saatlik.length - 1 : 0;
  const sonDk = ((Number.isFinite(r.bitis) ? r.bitis : UFUK) - son * 3600) / 60 || 60;
  const sonKat2 = (r.saatlik[son] - r1Dk * sonDk) / sonDk;
  console.log(
    `${k.ad.padEnd(11)}| ${String(zincirKur(k.ekler).length).padStart(10)} | ${f1(r.ilkGarson / 60).padStart(13)} | ${sa(r.zincirBitis).padStart(12)} | ${sa(r.svBitis).padStart(9)} | ${sa(r.yukBitis).padStart(10)} | ${sa(r.bitis).padStart(11)} | ${f1(Math.max(...bek, 0) / 60).padStart(19)} | ${f1(yuzdelik(bek, 0.5) / 60).padStart(9)} | ${yuzde(o.servis, o.servis + o.kacan).padStart(8)} | ${(k.bulasik ? yuzde(o.kirliBek, o.masaSn) : '—').padStart(12)} | ${(k.bulasik ? yuzde(o.temizYok, o.ocakSn) : '—').padStart(11)} | ${f0(sonKat2).padStart(10)}`,
  );
}
console.log('');
console.log('--- §B2 garson / bulaşıkçı / lavabo alım dakikaları ---');
for (const { k, r } of sonuc) {
  const padT = r.alimlar.filter((a) => a.ne === 'pad').map((a) => a.t);
  const zincir = zincirKur(k.ekler);
  const ozel = zincir.map((p, i) => ({ id: p.id, t: padT[i] })).filter((p) => KAT2_GARSON_PADLER.includes(p.id) || p.id === KAT2_BULASIKCI_PAD);
  const lav = r.alimlar.filter((a) => a.ne.startsWith('lav'));
  console.log(`${k.ad.padEnd(11)}| ${ozel.map((p) => `${p.id} ${f0(p.t / 60)}`).join(' · ')}${lav.length ? ` | lavabo ${lav.map((a) => f0(a.t / 60)).join('/')}` : ''}`);
}
console.log('');
console.log('--- §B3 saat başına toplam gelir (Kat 1 + Kat 2) coin/dk ---');
for (const { k, r } of sonuc) console.log(`${k.ad.padEnd(11)}| ${r.saatlik.map((s, i) => f0(s / ((i < r.saatlik.length - 1 ? 3600 : ((Number.isFinite(r.bitis) ? r.bitis : UFUK) - i * 3600) || 3600) / 60))).join(' · ')}`);
damga('Kat 1 parası cüzdana aktı (§B)', sonuc.every((s) => s.r.kat1 > 0));
if (!KISA) damga('bütün kollar ufukta bitti', sonuc.every((s) => Number.isFinite(s.r.bitis)), sonuc.filter((s) => !Number.isFinite(s.r.bitis)).map((s) => s.k.ad).join(','));

console.log('');
console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
damgaOzeti();
