/**
 * olcum-s5-denge.ts — S5 KAT 2 DENGE ÖLÇÜMÜ (oyun testi 2026-11-20; D-084 varyant kapısı). KOD (src) DEĞİŞMEZ.
 *
 * Sorular (her biri TABAN + kollar, aynı başlangıç — D-205/D-206 aracının `kur()`u: Kat 1 görev hattı sonu, karakter tavanda,
 * seviye 12, Kat 2'ye ilk çıkış; Kat 1 masa senaryosu U0):
 *   G-95  oturan grubun İLK isteği ne zaman? (bugün `kat2.ilkKahve` 0 → hemen) · kol G95-ESKI = D-198 öncesi (ilk istek kahveAralik sonra).
 *   G-96  kahve parası serviste mi kalkışta mı? (bugün `kahveAninda: true` → serviste) · kol G96-KALKIS = kalkışta tek yığın.
 *   G-97  istek sıklığı ↑ fiyat ↓, teorik kahve geliri/dk SABİT: G97-S18 (aralık 25→18) · G97-S12 (25→12). Fiyat = 9 × n25/nA
 *         (okey 4→5→7 istek/oturum) · tavla 3 × n25/nA (5→6→9); n = anında servisle oturumdaki istek sayısı (kural `m.t > sabır/2`).
 *   G-103 bekleyen kahvenin zamanı nereye gidiyor (darboğaz payları) · kol G103-BULASIKSIZ = fincan sınırsız (bulaşık kontrolü).
 *   G-119/122 masa Sv KAPISI. Bugün Sv noktası görev hattının Sv görevinde/hat bitince canlı (D-142 karşılığı, `kat2SvCanli`) ve Sv
 *         görevleri hattın SONUNDA → Sv zincirden sonra. Kollar ARAÇTA emüle edilir (Sv alımı aracın kendi dolumu: kat2Tick'in
 *         Sv dolumu birebir — fiyat/3,5 sn, durunca, çerçevede):
 *           SV-EMU0  emülasyon + BUGÜNKÜ kural (Sv yalnız hat bitince) → emülasyonun doğrulaması (TABAN ±%2).
 *           G119-K2  kullanıcı önerisi: okey salonunda 3 masa (k2s2okey3) → Sv2 · okey salonu dolu (k2s2okey6) → Sv3 ·
 *                    açık masaların yarısı Sv3 → Sv4 · yarısı Sv4 → Sv5. Görev kapısı yok; tek hedef kuralı (D-124) korunur.
 *           G119-K2T aynı, "bütün masalar" = Kat 2'nin bütün masaları (k2tavla12) → Sv3.
 *         Emülasyon kollarında hat = bugünkü hat − Sv görevleri (+ bitmeyen bir bekletme görevi; store'un kendi Sv noktası hiç canlanmaz).
 *         Sv görevlerinin ödülü (2.450) bu kollarda düşmez — karşılaştırma SV-EMU0'a göre okunur.
 *   G-103b kol G103-GARSON = yavaş oyuncu: ilk garson gelince oyuncu kahve/kirli TAŞIMAZ (yalnız para + alım); G-128 sayımı açık
 *         (yoksa k2_kahve40 kilitlenir) → G128-SAY'a göre okunur. §3 "tepside" payı oyuncu + garson tepsisi diye ayrılır.
 *   G-124 Kat 2 yığınlarının oto-toplaması (180 sn, Kat 1 `autoCollectAfter`; S5'te koda girdi). Kollar 20 dk Kat 2 / 10 dk Kat 1
 *         döngüsüyle: G124-ACIK (bugün) · G124-KAPALI (her adım yığın yaşı 0 = S5 öncesi) · G124-KAT2-KAPALI (sürekli Kat 2,
 *         kapalı — bot yığını 180 sn dolmadan topladığından iz TABAN'la aynı çıkmalı; bulgu damgası). Kat 1'de bot yok, oyuncu varışta durur.
 *   DETERMİNİZM (2026-11-20): b8ba9f6a ↔ 5eb3f5c2 farkı RASTGELELİK DEĞİL — kod değişti (S5 YAPI G-110 `kat.OCAK_AL_DZ` 0,6→1,05:
 *         ocak alma noktası kaydı; 4713156 + yalnız o dosya = 5eb3f5c2). Saat ±12 sa / ±3 gün kaydırıldı: iz aynı. Çıktıdaki
 *         "Kod:" satırı ölçülen kodu (HEAD + src farkı) damgalar; iki çıktı yalnız aynı "Kod:" satırıyla karşılaştırılır.
 *   G-123 tavla pad'leri: o andaki coin/dk ve biriktirme dk'sı; >10 dk biriktirme pencereleri (TABAN alım günlüğünden).
 *   G-128 görev 'servis' sayacı bugün yalnız oyuncuyu sayar (`kat2Gorev.kat2GorevArtisi`: servis − garsonServis) · kol G128-SAY =
 *         garsonların servisi de sayılır (araç, aktif görev servis sayacıyken adımın `stats.kat2Garson` artışını sayaca ekler).
 *         KORUNUM = aynı kanca çarpan 0 ile → parmak izi TABAN'la BİREBİR.
 *
 *   S5 İKİNCİ TUR (kullanıcı kararları 2026-11-20; kancalar `kat2Dongu` — config'de yoksa birebir bugünkü):
 *   G96-BULASIK  kahve `ICME` sn içilir, içilip fincan kirlenince parası düşer (her teslim ayrı); masa ücreti kalkışta.
 *   G97-S18-ILK12 S18 + Kat 2'de yalnız 1 masa açıkken aralık 12 sn (`kahveAralikIlk`).
 *   B-96-S18 / B-96-S18-ILK12  birleşimler. §8 MASA DİLİMİ: açık masa sayısına göre kaçan %, bekleme, garson boş / yetişemez payı.
 *   MUT=icme0 (G96 kancası kapalı) · MUT=ilk18 (ILK aralığı 18).
 *
 * Çalıştırma (kol başına alt süreç, PARALEL varsayılan 10):
 *   OLCUM=kisa npx tsx tools/olcum-s5-denge.ts
 *   OLCUM=tam  npx tsx tools/olcum-s5-denge.ts > docs/olcum-s5-denge.txt
 * Mutasyon (araç, MUT=):
 *   say0   — G128-SAY kancası 0 ekler        → "varyant etkili (G128-SAY)" ve "G128-SAY: garson servisi sayaca girdi" kırılır.
 *   cap    — K2 tavanı hep Sv5 (kural yok)   → "G119-K2: Sv3 ilk alımı k2s2okey6'dan sonra" kırılır.
 *   aninda — G96-KALKIS kahveAninda'yı kapatmaz → "G96-KALKIS: servis anında yığın yok" kırılır.
 *   oto    — G124-KAPALI yığın yaşını sıfırlamaz → "G124-KAPALI: Kat 1'deyken Kat 2 oto geliri = 0" kırılır.
 */
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KISA, botDamgasi, damga, damgaOzeti, izOlustur, kipBandi, kisaDeger, seedRandom, takilmaDamgasi, varyantDamgasi } from './olcum-lib';
import {
  attractRadiusFor,
  charMaxTier,
  dishCarryMaxTier,
  dishSpeedMaxTier,
  economyConfig as C,
  levelProgress,
  playerSpeedFor,
  reputationCarryMult,
  trayCapacityFor,
  waiterSpeedMaxTier,
  xpForLevel,
} from '../src/config/economy.config';
import { useGame, tableSoftMaxLevel, goalMetricsOf } from '../src/game/store';
import { KAT2_MASALAR, KAT2_SV_MAX, KAT2_YIKAMA_YER, OCAKLAR, VARIS, kat2YolAgi, masaErisimde, paraDusmeYeri, type Kat2MasaYeri } from '../src/game/kat';
import {
  kat2EtkinAyar,
  kat2LavaboTetik,
  kat2MasaYeri,
  kat2OcakTetik,
  kat2PadYeri,
  kat2SiradakiPad,
  kat2SvCanliTetik,
  kat2SvTetikleri,
  kat2YukSiradaki,
  masaSvOku,
  SV_DOLUM_SN,
  type Kat2Ayar,
  type Kat2SvTetik,
} from '../src/game/kat2Dongu';
import { kat2Gorevleri, kat2SvCanli, type Kat2GorevDef } from '../src/game/kat2Gorev';
import { claimableGoals, goalCategories } from '../src/game/goals';
import { inFrame } from '../src/game/markerFrame';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';

const MUT = process.env.MUT ?? '';
const FINAL = process.env.FINAL === '1'; // S5 final: TABAN = birleşik kod (kararlar uygulandı); yalnız TABAN/KORUNUM anlamlı
const ISCI = process.env.ISCI ?? '';
const DT = 0.1;
const UFUK = kisaDeger(16 * 3600, 1.5 * 3600);
const g = () => useGame.getState();
const CFG = C.kat2 as unknown as Kat2Ayar & Record<string, unknown>;
const BASLANGIC_SEVIYE = 12;
const SERVIS_SV = 6;
const xpSeviyeBasi = (lv: number) => Array.from({ length: lv - 1 }, (_, i) => xpForLevel(i + 1)).reduce((a, b) => a + b, 0);
const KAT = goalCategories();
const sonKademe = (metric: string) => KAT.find((k) => k.metric === metric)!.tiers.at(-1)!;

// ---------------------------------------------------------------------------------------------
// G-97 dozları — anında servisle oturumdaki istek sayısı (kat2Tick kuralı: istek kahveT ≤ 0 ve m.t > sabır/2'de).
// ---------------------------------------------------------------------------------------------
const istekSayisi = (oturum: number, aralik: number, ilk = 0) => {
  let n = 0;
  for (let e = ilk; oturum - e > CFG.kahveSabir * 0.5; e += aralik) n += 1;
  return n;
};
const TAVLA = CFG.tavla as { oturum: number; kahveAralik: number; kahveFiyat: number };
const dozFiyat = (aralik: number) => ({
  okey: (CFG.kahveFiyat * istekSayisi(CFG.oturum, CFG.kahveAralik)) / istekSayisi(CFG.oturum, aralik),
  tavla: (TAVLA.kahveFiyat * istekSayisi(TAVLA.oturum, TAVLA.kahveAralik)) / istekSayisi(TAVLA.oturum, aralik),
});

// ---------------------------------------------------------------------------------------------
// KOLLAR
// ---------------------------------------------------------------------------------------------
type SvKural = 'bugun' | 'k2' | 'k2t';
interface Kol {
  ad: string;
  ayar?: () => void;          // config'e bellekte uygulanan değişiklik (kur'dan önce)
  sv?: SvKural;               // Sv emülasyonu (yoksa store'un kendi Sv'si)
  say?: number;               // G-128 kancası: garson servisinin sayaca giren katsayısı (0 = KORUNUM)
  garsoncu?: boolean;         // G-103: ilk garson (k2garson) gelince oyuncu kahve/kirli TAŞIMAZ (yalnız para + alım)
  ziyaret?: readonly [number, number]; // G-124: döngü — [Kat 2'de sn, Kat 1'de sn] (Kat 1'de oyuncu varışta durur)
  otoKapali?: boolean;        // G-124: Kat 2 yığınlarının oto-toplaması kapalı (her adım yığın yaşı 0 — S5 öncesi)
}
const KOLLAR: Kol[] = [
  { ad: 'TABAN' },
  { ad: 'KORUNUM', say: 0 },
  { ad: 'G95-ESKI', ayar: () => { delete CFG.ilkKahve; } },
  { ad: 'G96-KALKIS', ayar: () => { if (MUT !== 'aninda') CFG.kahveAninda = false; } },
  { ad: 'G97-S18', ayar: () => dozUygula(18) },
  { ad: 'G97-S12', ayar: () => dozUygula(12) },
  { ad: 'G103-BULASIKSIZ', ayar: () => { delete CFG.bulasik; } },
  { ad: 'SV-EMU0', sv: 'bugun' },
  { ad: 'G119-K2', sv: 'k2' },
  { ad: 'G119-K2T', sv: 'k2t' },
  { ad: 'G128-SAY', say: MUT === 'say0' ? 0 : 1 },
  // G-103 yavaş oyuncu: garson gelince oyuncu kahve taşımaz. k2_kahve40 yalnız oyuncu servisini saydığından hat kilitlenmesin
  // diye G-128 sayımı açık (garson servisi de sayar) — karşılaştırma G128-SAY'a göre okunur.
  { ad: 'G103-GARSON', garsoncu: true, say: 1 },
  // G-124: 20 dk Kat 2 / 10 dk Kat 1 döngüsü; oto-toplama açık (bugün, S5 G-124) · kapalı (S5 öncesi) · sürekli Kat 2'de kapalı.
  { ad: 'G124-ACIK', ziyaret: [1200, 600] },
  { ad: 'G124-KAPALI', ziyaret: [1200, 600], otoKapali: MUT !== 'oto' },
  { ad: 'G124-KAT2-KAPALI', otoKapali: true },
  // S5 ikinci tur (kullanıcı kararları 2026-11-20).
  { ad: 'G96-BULASIK', ayar: () => g96() },
  { ad: 'G97-S18-ILK12', ayar: () => { dozUygula(18); ilk12(); } },
  { ad: 'B-96-S18', ayar: () => { g96(); dozUygula(18); } },
  { ad: 'B-96-S18-ILK12', ayar: () => { g96(); dozUygula(18); ilk12(); } },
];
const ICME = Number(process.env.ICME ?? 12);
function g96(): void { if (MUT !== 'icme0') CFG.kahveIcme = ICME; }
function ilk12(): void { CFG.kahveAralikIlk = { masa: 1, aralik: MUT === 'ilk18' ? 18 : 12 }; }
function dozUygula(aralik: number): void {
  const f = dozFiyat(aralik);
  CFG.kahveAralik = aralik;
  CFG.kahveFiyat = f.okey;
  CFG.tavla = { ...TAVLA, kahveAralik: aralik, kahveFiyat: f.tavla };
}
const SUZ_KOL = (process.env.KOLLAR ?? '').split(',').filter(Boolean);
const isler = KOLLAR.filter((k) => !SUZ_KOL.length || SUZ_KOL.includes(k.ad)).map((k) => k.ad);

// ---------------------------------------------------------------------------------------------
// Sv KAPISI (emülasyon)
// ---------------------------------------------------------------------------------------------
const MASA_IDS = new Set(KAT2_MASALAR.map((m) => m.id));
function svTavan(kural: SvKural, padsDone: readonly string[], masaSv: Readonly<Record<string, number>>, hatBitti: boolean): number {
  if (kural === 'bugun') return hatBitti ? KAT2_SV_MAX : 1;
  if (MUT === 'cap') return KAT2_SV_MAX;
  const acik = padsDone.filter((id) => MASA_IDS.has(id));
  const yarisi = (sv: number) => acik.filter((id) => masaSvOku(masaSv, id) >= sv).length * 2 >= acik.length;
  let tavan = 1;
  if (padsDone.includes('k2s2okey3')) tavan = 2;
  if (padsDone.includes(kural === 'k2t' ? 'k2tavla12' : 'k2s2okey6')) tavan = 3;
  if (tavan >= 3 && yarisi(3)) tavan = 4;
  if (tavan >= 4 && yarisi(4)) tavan = 5;
  return tavan;
}
/** D-124 tek hedef, tavanlı: başlanmış (1 < sv < tavan) masa önce, yoksa ilk tavan-altı masa. */
function svHedefEmu(ayar: Kat2Ayar, padsDone: readonly string[], masaSv: Readonly<Record<string, number>>, tavan: number): Kat2SvTetik | null {
  let bos: string | null = null;
  let hedef: string | null = null;
  for (const id of padsDone) {
    if (!MASA_IDS.has(id)) continue;
    const sv = masaSvOku(masaSv, id);
    if (sv >= Math.min(tavan, KAT2_SV_MAX)) continue;
    if (sv > 1) { hedef = id; break; }
    if (bos == null) bos = id;
  }
  const id = hedef ?? bos;
  return id ? kat2SvTetikleri(ayar, padsDone, masaSv).find((t) => t.masaId === id) ?? null : null;
}
const SV_GOREV = (x: Kat2GorevDef) => x.hedef.tip === 'masaSv';
const BEKLE: Kat2GorevDef = { id: 's5_bekle', kicker: '', title: '', hedef: { tip: 'sayac', sayac: 'garson', adet: 1e12 }, reward: 0 } as Kat2GorevDef;
const ORIJINAL_GOREVLER = [...(C.kat2Gorevler as readonly Kat2GorevDef[])];

// ---------------------------------------------------------------------------------------------
// BAŞLANGIÇ — D-205/D-206 aracının kur()'u birebir.
// ---------------------------------------------------------------------------------------------
function topla(): void {
  for (;;) {
    const s = g();
    const ids = claimableGoals(goalMetricsOf(s), s.goalsClaimed);
    if (!ids.length) return;
    let alindi = false;
    for (const id of ids) alindi = g().claimGoal(id) || alindi;
    if (!alindi) return;
  }
}
function kur(): void {
  seedRandom(7);
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  g().kat2Ac();
  const s = g();
  useGame.setState({
    charUpgrades: { ...s.charUpgrades, speed: charMaxTier('speed'), tray: charMaxTier('tray'), magnet: charMaxTier('magnet') },
    stationLevels: s.stationLevels.map(() => SERVIS_SV),
    lavaboLevel: 6,
    tableLevels: s.tableLevels.map(() => 0),
    waiterUpgrades: { ...s.waiterUpgrades, tray: C.waiter.trayUpgrades.costs.length, speed: waiterSpeedMaxTier(), dishCarry: dishCarryMaxTier(), dishSpeed: dishSpeedMaxTier() },
    questIndex: C.quests.length,
    questsDone: C.quests.map((q) => q.id),
    stats: { ...s.stats, teasServed: sonKademe('served'), dishesWashed: sonKademe('dishes') },
    lifetime: D(sonKademe('lifetime')),
    xp: xpSeviyeBasi(BASLANGIC_SEVIYE),
    xpBekleyen: 0,
    levelUp: null,
  } as never);
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3 });
  topla();
  useGame.setState({ xp: xpSeviyeBasi(BASLANGIC_SEVIYE), xpBekleyen: 0, levelUp: null, diamonds: D(100) });
  g().setKeyboardInput(0, 0);
}

// ---------------------------------------------------------------------------------------------
// İŞÇİ
// ---------------------------------------------------------------------------------------------
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const MIKNATIS = attractRadiusFor(charMaxTier('magnet'));
const YIKAMA: readonly [number, number] = [KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1] + 0.8];
const uz = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const PARA_ANAHTAR = new Map<string, string>(KAT2_MASALAR.map((m) => [paraDusmeYeri(m).join(','), m.id]));

interface Alim { t: number; ne: string; fiyat: number; bekleme: number; gelirDk: number }
interface Sonuc {
  kol: string;
  zincir: number; sv: number; yuk: number; bitis: number; hatBitis: number; sure: number;
  kat2Gelir: number; lifetimeArtis: number; gorevOdul: number;
  elle: number; garson: number; toplanan: number; alinan: number;
  servisSure: number; // zincir bitene kadar süre (dk hesaplarının paydası)
  elleZincir: number; toplananZincir: number;
  bekleme: { servisAdet: number; servisToplam: number; kacanAdet: number; kacanToplam: number; integral: number };
  ilkIstek: { n: number; toplam: number; enUzun: number };
  ilkServis: { n: number; toplam: number; enUzun: number };
  pay: { tasima: number; tasimaOyuncu: number; tasimaGarson: number; hazir: number; temizYok: number; pisiyor: number };
  k1: { sn: number; k2oto: number; k1gelir: number; donusYigin: number; donusN: number; k2otoK2de: number };
  elleGarsonSonra: number; garsonSonraSn: number;
  temizSifirSn: number; kirliBlokMasaSn: number; bosMasaSn: number;
  servisYigini: number; kalkisYigini: number; icmeYigini: number; servisAniYigini: number;
  svIlkGorulme: number; svIlkAlim: number; svZincirOncesi: number; svAlim: number; sv3Ilk: number; k2s2okey6At: number; sv2Ilk: number; k2s2okey3At: number;
  alimlar: Alim[];
  gorevler: { id: string; dk: number }[];
  sayEklenen: number;
  dilim: Dilim[];
  ilkMasa: { bosSn: number; sn: number; istekBosSn: number };
  yol: number; itme: number; iz: string;
}

// §8 masa dilimleri (açık masa sayısı).
const DILIMLER: readonly [number, number][] = [[1, 1], [2, 4], [5, 10], [11, 16], [17, 22]];
interface Dilim { sn: number; servis: number; kacan: number; bekToplam: number; garsonSn: number; garsonBosSn: number; yetisemezSn: number; oyuncuBosSn: number; gelir: number }
const yeniDilim = (): Dilim => ({ sn: 0, servis: 0, kacan: 0, bekToplam: 0, garsonSn: 0, garsonBosSn: 0, yetisemezSn: 0, oyuncuBosSn: 0, gelir: 0 });
const dilimNo = (n: number) => DILIMLER.findIndex(([a, b]) => n >= a && n <= b);

function kos(kol: Kol): Sonuc {
  kol.ayar?.();
  const emu = kol.sv;
  const liste = emu ? [...ORIJINAL_GOREVLER.filter((x) => !SV_GOREV(x)), BEKLE] : [...ORIJINAL_GOREVLER];
  (C as unknown as { kat2Gorevler: readonly Kat2GorevDef[] }).kat2Gorevler = liste;
  kur();
  const hat = kat2Gorevleri(C.kat2Gorevler as readonly Kat2GorevDef[], CFG);
  const gercekHatUzun = emu ? hat.length - 1 : hat.length;

  const ZINCIR = C.kat2.padler.map((p) => p.id);
  const izT = izOlustur();
  let zincir = NaN, sv = NaN, yuk = NaN, hatBitis = NaN;
  let kat2Gelir = 0, gorevOdul = 0, yol = 0, itme = 0, enUzun = 0;
  const lt0 = g().lifetime.toNumber();
  const st0 = g().stats as unknown as Record<string, number>;
  const s0e = { elle: st0.kat2Elle ?? 0, garson: st0.kat2Garson ?? 0, para: st0.kat2Para ?? 0, alinan: st0.kat2Alinan ?? 0 };
  let elleZincir = NaN, toplananZincir = NaN;
  const gorevBitis: number[] = [];
  let gorevIdx = g().kat2.gorev?.idx ?? 0;
  for (let i = 0; i < gorevIdx; i++) gorevBitis.push(0);
  const bek = { servisAdet: 0, servisToplam: 0, kacanAdet: 0, kacanToplam: 0, integral: 0 };
  const ilkIstek = { n: 0, toplam: 0, enUzun: 0 };
  const ilkServis = { n: 0, toplam: 0, enUzun: 0 };
  const pay = { tasima: 0, tasimaOyuncu: 0, tasimaGarson: 0, hazir: 0, temizYok: 0, pisiyor: 0 };
  const k1 = { sn: 0, k2oto: 0, k1gelir: 0, donusYigin: 0, donusN: 0, k2otoK2de: 0 };
  let elleGarsonSonra = 0, garsonSonraSn = 0;
  let katSimdi = 2;
  let temizSifirSn = 0, kirliBlokMasaSn = 0, bosMasaSn = 0, servisYigini = 0, kalkisYigini = 0, icmeYigini = 0, servisAniYigini = 0;
  const istekBas = new Map<string, number>();
  const oturdu = new Map<string, number>();
  const ilkIstekBekliyor = new Set<string>();
  const ilkServisBekliyor = new Set<string>();
  let svIlkGorulme = NaN, svIlkAlim = NaN, svZincirOncesi = 0, svAlim = 0, sv3Ilk = NaN, sv2Ilk = NaN, k2s2okey6At = NaN, k2s2okey3At = NaN;
  const alimlar: Alim[] = [];
  let sonAlimT = 0, sonAlimLt = lt0;
  let sayEklenen = 0;
  const svFill = new Map<string, number>();
  const dilim = DILIMLER.map(yeniDilim);
  const ilkMasa = { bosSn: 0, sn: 0, istekBosSn: 0 };

  let t = 0;
  for (; t < UFUK; t += DT) {
    const s = g();
    if (s.levelUp) g().claimLevelUp(false);
    const k2 = s.kat2;
    const padsDone = k2.padsDone;
    const masaSv = k2.masaSv ?? {};
    const ayar = kat2EtkinAyar(CFG, k2.yuk);
    const d = s.kat2Dunya;
    const cuzdan = s.wallet.toNumber();
    const zincirBitti = ZINCIR.every((id) => padsDone.includes(id));
    if (zincirBitti && Number.isNaN(zincir)) {
      zincir = t;
      const st = s.stats as unknown as Record<string, number>;
      elleZincir = (st.kat2Elle ?? 0) - s0e.elle;
      toplananZincir = (st.kat2Para ?? 0) - s0e.para;
    }
    const acikMasa = KAT2_MASALAR.filter((m) => padsDone.includes(m.id));
    const dl = dilim[dilimNo(acikMasa.length)];
    if (zincirBitti && Number.isNaN(sv) && acikMasa.every((m) => masaSvOku(masaSv, m.id) >= KAT2_SV_MAX)) sv = t;
    const yukKalan = (['ocak', 'lavabo', 'garsonHiz', 'garsonTepsi'] as const).filter((tur) => kat2YukSiradaki(CFG, padsDone, k2.yuk, tur));
    if (zincirBitti && Number.isNaN(yuk) && !yukKalan.length) yuk = t;
    if (!Number.isNaN(zincir) && !Number.isNaN(sv) && !Number.isNaN(yuk) && !Number.isNaN(hatBitis)) break;

    if (Math.round(t / DT) % 10 === 0) topla();

    // ---- G-124 ziyaret döngüsü: Kat 2'de z[0] sn, Kat 1'de z[1] sn (Kat 1'de oyuncu varışta durur, bot yok).
    const z0 = kol.ziyaret;
    const katIstek = z0 && (t % (z0[0] + z0[1])) >= z0[0] ? 1 : 2;
    const gecti = katIstek !== katSimdi;
    if (gecti) {
      if (katIstek === 2) { k1.donusYigin += d.paralar.reduce((a, p) => a + p.miktar, 0); k1.donusN += 1; }
      useGame.setState({ kat: katIstek, player: [...VARIS[katIstek]] as Vec3 });
      g().setKeyboardInput(0, 0);
      katSimdi = katIstek;
    }
    const kat1de = katSimdi === 1;

    let alindi = false;
    if (!kat1de) for (const tur of ['garsonHiz', 'garsonTepsi'] as const) {
      const n = kat2YukSiradaki(CFG, padsDone, k2.yuk, tur);
      if (n?.acik && cuzdan >= n.fiyat) {
        const ok = g().kat2GarsonYukAl(tur);
        if (ok) {
          const lt = g().lifetime.toNumber();
          alimlar.push({ t, ne: `garson ${tur}`, fiyat: n.fiyat, bekleme: t - sonAlimT, gelirDk: (lt - sonAlimLt) / Math.max(1e-9, (t - sonAlimT) / 60) });
          sonAlimT = t; sonAlimLt = lt;
        }
        alindi = ok || alindi;
      }
    }
    if (alindi) continue;

    // Sv tetiği: store'un kendisi (bugün) ya da emülasyon.
    const hatBittiEmu = (k2.gorev?.idx ?? 0) >= gercekHatUzun;
    let svT: Kat2SvTetik | null;
    if (emu) svT = svHedefEmu(ayar, padsDone, masaSv, svTavan(emu, padsDone, masaSv, hatBittiEmu));
    else svT = kat2SvCanliTetik(ayar, padsDone, masaSv, kat2SvCanli(k2, C.kat2Gorevler as readonly Kat2GorevDef[], CFG))[0] ?? null;
    if (svT && Number.isNaN(svIlkGorulme)) svIlkGorulme = t;

    const adaylar: { kalan: number; yer: readonly [number, number] }[] = [];
    const sp = kat2SiradakiPad(ayar, padsDone);
    if (sp) adaylar.push({ kalan: sp.cost - (d.padFill[sp.id] ?? 0), yer: kat2PadYeri(sp.id) });
    if (svT) adaylar.push({ kalan: svT.fiyat - (emu ? svFill.get(svT.id) ?? 0 : d.padFill[svT.id] ?? 0), yer: [svT.x, svT.z] });
    for (const tt of [kat2OcakTetik(ayar, padsDone, k2.yuk), kat2LavaboTetik(ayar, padsDone, k2.yuk)]) {
      if (tt) adaylar.push({ kalan: tt.fiyat - (d.padFill[tt.id] ?? 0), yer: [tt.x, tt.z] });
    }
    const ucuz = adaylar.length ? adaylar.reduce((a, b) => (a.kalan <= b.kalan ? a : b)) : null;

    const x = s.player[0];
    const z = s.player[2];
    const ag = kat2YolAgi(padsDone);
    const kirliEl = d.tepsiKirli ?? 0;
    const bekleyen = d.masalar.filter((m) => m.durum === 'oyunda' && m.istek > 0);
    const acikOcak = OCAKLAR.filter((o) => padsDone.includes(o.id));
    const kirliMasa = ayar.bulasik ? d.masalar.filter((m) => (m.kirli ?? 0) > 0) : [];
    const yerOf = (id: string) => kat2MasaYeri(id) as Kat2MasaYeri;
    const masaNok = (id: string) => ag.masaNoktasi(yerOf(id));
    const ocakHedef = () => {
      const hazir = acikOcak.filter((o) => d.ocaklar[OCAKLAR.indexOf(o)].hazir > 0);
      return (hazir.length ? hazir : acikOcak).reduce((a, c) => (uz([x, z], a.al) <= uz([x, z], c.al) ? a : c)).al;
    };
    let hedef: readonly [number, number] | null;
    const kahveYok = !!kol.garsoncu && padsDone.includes('k2garson');
    if (kat1de) hedef = null;
    else if (ucuz && cuzdan >= ucuz.kalan - 1e-9) hedef = ucuz.yer;
    else if (kahveYok) {
      // Yavaş oyuncu: para + alım; elde kalan (garson gelmeden alınmış) kahve/kirli bitirilir, yenisi alınmaz.
      if (d.paralar.length) hedef = d.paralar.map((p) => [p.x, p.z] as [number, number]).reduce((a, c) => (uz([x, z], a) <= uz([x, z], c) ? a : c));
      else if (d.tepsi > 0 && bekleyen.length) hedef = masaNok(bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c)).id);
      else if (kirliEl > 0) hedef = YIKAMA;
      else hedef = null;
    }
    else if (d.paralar.length) hedef = d.paralar.map((p) => [p.x, p.z] as [number, number]).reduce((a, c) => (uz([x, z], a) <= uz([x, z], c) ? a : c));
    else if (d.tepsi > 0 && bekleyen.length) hedef = masaNok(bekleyen.reduce((a, c) => (a.sabir <= c.sabir ? a : c)).id);
    else if (kirliEl > 0 && (d.tepsi === 0 || kirliEl + d.tepsi >= TEPSI)) hedef = YIKAMA;
    else if (d.tepsi + kirliEl < TEPSI && bekleyen.length && acikOcak.length) hedef = ocakHedef();
    else if (kirliMasa.length && d.tepsi + kirliEl < TEPSI) hedef = masaNok(kirliMasa.reduce((a, c) => (uz([x, z], masaNok(a.id)) <= uz([x, z], masaNok(c.id)) ? a : c)).id);
    else if (kirliEl > 0) hedef = YIKAMA;
    else if (d.tepsi < TEPSI && acikOcak.length) hedef = ocakHedef();
    else hedef = null;
    const masaHedefi = d.tepsi > 0 && bekleyen.some((m) => masaErisimde(yerOf(m.id), x, z));
    let ix = 0, iz = 0;
    if (hedef && !masaHedefi) {
      const L = uz([x, z], hedef);
      if (L > 0.15) {
        const [ax, az] = ag.nokta(x, z, hedef[0], hedef[1]);
        const la = Math.hypot(ax - x, az - z) || 1;
        const hiz = playerSpeedFor(s.charUpgrades.speed) * reputationCarryMult(levelProgress(s.xp).level);
        const kk = Math.min(1, L / (hiz * DT)) / la;
        ix = (ax - x) * kk;
        iz = (az - z) * kk;
      }
    }
    g().setKeyboardInput(ix, iz);
    if (!kat1de && dl) {
      if (!hedef) dl.oyuncuBosSn += DT;
      if (acikMasa.length === 1) {
        ilkMasa.sn += DT;
        if (!hedef) ilkMasa.bosSn += DT;
        // Boşuna bekleme: istek yok, elde kahve yok, yerde para yok, alınacak bir şey yok.
        if (!bekleyen.length && !d.paralar.length && !(ucuz && cuzdan >= ucuz.kalan - 1e-9)) ilkMasa.istekBosSn += DT;
      }
    }
    const s0 = g();
    const l0 = s0.lifetime.toNumber();
    const a0 = s0.kat1Akis;
    const masa0 = s0.kat2Dunya.masalar.map((m) => ({ durum: m.durum, istek: m.istek }));
    const pile0 = new Map<string, number>();
    for (const p of s0.kat2Dunya.paralar) pile0.set(`${p.x},${p.z}`, p.miktar);
    const pads0 = s0.kat2.padsDone.length;
    const sv0 = Object.values(s0.kat2.masaSv ?? {}).reduce((a, b) => a + b, 0);
    const yuk0 = Object.values(s0.kat2.yuk ?? {}).reduce((a: number, b) => a + (b as number), 0);
    const gars0 = (s0.stats as unknown as Record<string, number>).kat2Garson ?? 0;
    const elle0 = (s0.stats as unknown as Record<string, number>).kat2Elle ?? 0;
    const yig0 = new Set(s0.kat2Dunya.paralar);
    const idx0 = s0.kat2.gorev?.idx ?? 0;
    let k1Adim = 0;
    g().tick(DT);
    let s1 = g();
    if (kol.otoKapali) for (const p of s1.kat2Dunya.paralar) p.yas = 0;
    {
      // Kat 2'deyken kendiliğinden toplanan: yok olan yığın oyuncunun mıknatısında değilse oto-toplamadır.
      // Kat 1'deyken oyuncu Kat 2'den uzakta: yok olan her yığın oto-toplamadır.
      const yig1 = new Set(s1.kat2Dunya.paralar);
      let oto = 0;
      for (const p of yig0) if (!yig1.has(p) && (kat1de || Math.hypot(s1.player[0] - p.x, s1.player[2] - p.z) > MIKNATIS + 0.05)) oto += p.miktar;
      if (kat1de) {
        let odul = 0;
        for (let i = idx0; i < (s1.kat2.gorev?.idx ?? 0); i++) odul += hat[i]?.reward ?? 0;
        k1Adim = s1.lifetime.toNumber() - l0 - oto - odul;
        k1.sn += DT; k1.k2oto += oto; k1.k1gelir += k1Adim;
      } else k1.k2otoK2de += oto;
    }
    if (padsDone.includes('k2garson')) {
      garsonSonraSn += DT;
      elleGarsonSonra += ((s1.stats as unknown as Record<string, number>).kat2Elle ?? 0) - elle0;
    }

    // ---- Sv EMÜLASYONU: kat2Tick'in Sv dolumu birebir (durunca, çerçevede, fiyat / SV_DOLUM_SN).
    if (emu && svT && !kat1de && Math.hypot(ix, iz) <= 0.1 && inFrame(s1.player[0], s1.player[2], [svT.x, 0, svT.z], { hw: svT.w / 2, hh: svT.d / 2 })) {
      const hizSv = svT.fiyat / (ayar.masaSv?.[svT.tur].dolumSn ?? SV_DOLUM_SN);
      let fill = svFill.get(svT.id) ?? 0;
      const amt = Math.min(hizSv * DT, s1.wallet.toNumber(), svT.fiyat - fill);
      if (amt > 0) {
        fill += amt;
        useGame.setState({ wallet: s1.wallet.sub(amt) });
      }
      if (fill >= svT.fiyat - 1e-9) {
        svFill.delete(svT.id);
        const k = g().kat2;
        useGame.setState({ kat2: { ...k, masaSv: { ...(k.masaSv ?? {}), [svT.masaId]: masaSvOku(k.masaSv ?? {}, svT.masaId) + 1 } } });
      } else svFill.set(svT.id, fill);
      s1 = g();
    }

    // ---- G-128 kancası: aktif görev servis sayacıyken garsonun servisi de sayılır.
    if (kol.say !== undefined) {
      const gi = s1.kat2.gorev?.idx ?? 0;
      const aktif = hat[gi];
      const dg = ((s1.stats as unknown as Record<string, number>).kat2Garson ?? 0) - gars0;
      if (aktif && aktif.hedef.tip === 'sayac' && aktif.hedef.sayac === 'servis' && dg > 0 && s1.kat2.gorev) {
        const ek = dg * kol.say;
        sayEklenen += ek;
        const gk = s1.kat2.gorev;
        useGame.setState({ kat2: { ...s1.kat2, gorev: { ...gk, sayac: { ...gk.sayac, servis: (gk.sayac.servis ?? 0) + ek } } } });
        s1 = g();
      }
    }

    // ---- ÖLÇÜM
    const d1 = s1.kat2Dunya;
    const tt = t + DT;
    const kalkan = new Set<string>();
    const servisli = new Set<string>();
    d1.masalar.forEach((m, i) => {
      const o = masa0[i];
      if (o.durum === 'geliyor' && m.durum === 'oyunda') { oturdu.set(m.id, tt); ilkIstekBekliyor.add(m.id); ilkServisBekliyor.add(m.id); }
      if (o.durum === 'oyunda' && m.durum !== 'oyunda') {
        kalkan.add(m.id);
        if (o.istek > 0) { const b = istekBas.get(m.id) ?? tt; bek.kacanAdet += o.istek; bek.kacanToplam += o.istek * (tt - b); istekBas.delete(m.id); if (dl && !kat1de) dl.kacan += o.istek; }
        ilkIstekBekliyor.delete(m.id); ilkServisBekliyor.delete(m.id);
        return;
      }
      if (m.durum !== 'oyunda') return;
      if (o.istek === 0 && m.istek > 0) {
        istekBas.set(m.id, tt);
        if (ilkIstekBekliyor.has(m.id)) {
          const w = tt - (oturdu.get(m.id) ?? tt);
          ilkIstek.n += 1; ilkIstek.toplam += w; ilkIstek.enUzun = Math.max(ilkIstek.enUzun, w);
          ilkIstekBekliyor.delete(m.id);
        }
      } else if (m.istek < o.istek) {
        const b = istekBas.get(m.id) ?? tt;
        const n = o.istek - m.istek;
        if (m.istek === 0 && m.sabir <= 0) {
          // Aynı adımda kısmi servis + sabır bitişi: servis edilen kısmın parası bu adımda düşebilir → servis adımı.
          servisli.add(m.id);
          bek.kacanAdet += n; bek.kacanToplam += n * (tt - b); if (dl && !kat1de) dl.kacan += n;
        }
        else {
          servisli.add(m.id);
          bek.servisAdet += n; bek.servisToplam += n * (tt - b);
          if (dl && !kat1de) { dl.servis += n; dl.bekToplam += n * (tt - b); }
          if (ilkServisBekliyor.has(m.id)) {
            const w = tt - (oturdu.get(m.id) ?? tt);
            ilkServis.n += 1; ilkServis.toplam += w; ilkServis.enUzun = Math.max(ilkServis.enUzun, w);
            ilkServisBekliyor.delete(m.id);
          }
        }
        if (m.istek === 0) istekBas.delete(m.id);
      }
    });
    // Bekleyen fincan-saniye ve darboğaz payı (arz sırayla dağıtılır: tepside → ocakta hazır → temiz yok / pişiyor).
    let P = 0;
    for (const m of d1.masalar) if (m.durum === 'oyunda') P += m.istek;
    bek.integral += P * DT;
    if (dl && !kat1de) {
      dl.sn += DT;
      const gs = [d1.garson, ...(d1.garsonEk ?? [])].filter((x): x is NonNullable<typeof x> => !!x);
      const bos = gs.filter((x) => x.hedef == null && x.tepsi === 0).length;
      dl.garsonSn += gs.length * DT;
      dl.garsonBosSn += bos * DT;
      const yolda = d1.tepsi + gs.reduce((a, x) => a + x.tepsi, 0);
      if (gs.length && P > yolda && bos === 0) dl.yetisemezSn += DT;
    }
    if (P > 0) {
      const garsonda = [d1.garson, ...(d1.garsonEk ?? [])].reduce((a, gs) => a + (gs?.tepsi ?? 0), 0);
      const hazir = d1.ocaklar.reduce((a, o, k) => a + (s1.kat2.padsDone.includes(OCAKLAR[k].id) ? o.hazir : 0), 0);
      const a0 = Math.min(P, d1.tepsi), a0g = Math.min(P - a0, garsonda), a1 = a0 + a0g, a2 = Math.min(P - a1, hazir), kalan = P - a1 - a2;
      pay.tasima += a1 * DT; pay.tasimaOyuncu += a0 * DT; pay.tasimaGarson += a0g * DT; pay.hazir += a2 * DT;
      if (ayar.bulasik && (d1.temiz ?? 0) <= 0) pay.temizYok += kalan * DT; else pay.pisiyor += kalan * DT;
    }
    if (ayar.bulasik && (d1.temiz ?? 0) <= 0) temizSifirSn += DT;
    for (const m of d1.masalar) {
      if (m.durum !== 'bos') continue;
      bosMasaSn += DT;
      if (ayar.bulasik && (m.kirli ?? 0) > ayar.bulasik.esik) kirliBlokMasaSn += DT;
    }
    // Yığın artışları: kalkışla mı servisle mi?
    for (const p of d1.paralar) {
      const k = `${p.x},${p.z}`;
      const mid = PARA_ANAHTAR.get(k);
      if (!mid) continue;
      if (p.miktar > (pile0.get(k) ?? 0) + 1e-9) {
        if (kalkan.has(mid)) kalkisYigini += 1;
        else { servisYigini += 1; if (servisli.has(mid)) servisAniYigini += 1; else icmeYigini += 1; }
      }
    }

    // Alım günlüğü (pad · Sv · yükseltme).
    const lt1 = s1.lifetime.toNumber();
    const yeniPad = s1.kat2.padsDone.length > pads0 ? s1.kat2.padsDone.at(-1)! : null;
    const sv1 = Object.values(s1.kat2.masaSv ?? {}).reduce((a, b) => a + b, 0);
    const yuk1 = Object.values(s1.kat2.yuk ?? {}).reduce((a: number, b) => a + (b as number), 0);
    const kaydet = (ne: string, fiyat: number) => {
      alimlar.push({ t: tt, ne, fiyat, bekleme: tt - sonAlimT, gelirDk: (lt1 - sonAlimLt) / Math.max(1e-9, (tt - sonAlimT) / 60) });
      sonAlimT = tt; sonAlimLt = lt1;
    };
    if (yeniPad) {
      kaydet(`pad ${yeniPad}`, C.kat2.padler.find((p) => p.id === yeniPad)?.cost ?? 0);
      if (yeniPad === 'k2s2okey6') k2s2okey6At = tt;
      if (yeniPad === 'k2s2okey3') k2s2okey3At = tt;
    }
    if (sv1 > sv0) {
      const id = Object.keys(s1.kat2.masaSv ?? {}).find((k) => masaSvOku(s1.kat2.masaSv ?? {}, k) !== masaSvOku(s0.kat2.masaSv ?? {}, k)) ?? '?';
      const yeniSv = masaSvOku(s1.kat2.masaSv ?? {}, id);
      kaydet(`Sv${yeniSv} ${id}`, svT?.fiyat ?? 0);
      svAlim += 1;
      if (Number.isNaN(svIlkAlim)) svIlkAlim = tt;
      if (Number.isNaN(zincir)) svZincirOncesi += 1;
      if (yeniSv === 3 && Number.isNaN(sv3Ilk)) sv3Ilk = tt;
      if (yeniSv === 2 && Number.isNaN(sv2Ilk)) sv2Ilk = tt;
    }
    if (yuk1 > yuk0) kaydet('ocak/lavabo yük.', 0);

    const idx1 = s1.kat2.gorev?.idx ?? 0;
    for (; gorevIdx < idx1; gorevIdx++) {
      gorevBitis.push(tt);
      gorevOdul += hat[gorevIdx]?.reward ?? 0;
    }
    if (Number.isNaN(hatBitis) && gorevIdx >= gercekHatUzun) hatBitis = tt;
    const adim = gecti ? 0 : Math.hypot(s1.player[0] - x, s1.player[2] - z);
    yol += adim;
    itme = Math.hypot(ix, iz) > 0.1 && adim < 1e-4 ? itme + DT : 0;
    enUzun = Math.max(enUzun, itme);
    const akis = Math.max(0, s1.kat1Akis - a0);
    kat2Gelir += Math.max(0, lt1 - l0 - akis - k1Adim);
    if (dl && !kat1de) dl.gelir += Math.max(0, lt1 - l0 - akis);
    if (Math.round(t / DT) % 50 === 0) izT.ekle(s1.wallet.toNumber(), s1.kat2.padsDone.length, s1.xp, s1.player[0], s1.player[2], sv1);
  }
  topla();
  const s = g();
  const st = s.stats as unknown as Record<string, number>;
  (C as unknown as { kat2Gorevler: readonly Kat2GorevDef[] }).kat2Gorevler = ORIJINAL_GOREVLER;
  const gorevler = hat.slice(0, gercekHatUzun).map((h, i) => {
    const bas = i === 0 ? 0 : gorevBitis[i - 1] ?? NaN;
    return { id: h.id, dk: ((gorevBitis[i] ?? NaN) - bas) / 60 };
  });
  return {
    kol: kol.ad, zincir, sv, yuk, bitis: Math.max(zincir, sv, yuk), hatBitis, sure: t,
    kat2Gelir, lifetimeArtis: s.lifetime.toNumber() - lt0, gorevOdul,
    elle: (st.kat2Elle ?? 0) - s0e.elle, garson: (st.kat2Garson ?? 0) - s0e.garson, toplanan: (st.kat2Para ?? 0) - s0e.para, alinan: (st.kat2Alinan ?? 0) - s0e.alinan,
    servisSure: zincir, elleZincir, toplananZincir,
    bekleme: bek, ilkIstek, ilkServis, pay, k1, elleGarsonSonra, garsonSonraSn, temizSifirSn, kirliBlokMasaSn, bosMasaSn, servisYigini, kalkisYigini, icmeYigini, servisAniYigini,
    svIlkGorulme, svIlkAlim, svZincirOncesi, svAlim, sv3Ilk, k2s2okey6At, sv2Ilk, k2s2okey3At,
    alimlar, gorevler, sayEklenen, dilim, ilkMasa, yol, itme: enUzun, iz: izT.deger,
  };
}

// ---------------------------------------------------------------------------------------------
// ALT SÜREÇ / ORKESTRA
// ---------------------------------------------------------------------------------------------
if (ISCI) {
  const kol = KOLLAR.find((k) => k.ad === ISCI)!;
  const r = kos(kol);
  console.log('@@SONUC ' + JSON.stringify(r));
} else {
  await orkestra();
}

/** Ölçülen kodun kimliği: HEAD + çalışma ağacındaki src/ farkının özeti (paralel ajanlar src'yi değiştirirken iki koşu karşılaştırılabilsin). */
function kodDamgasi(): string {
  try {
    const bas = execSync('git rev-parse --short HEAD').toString().trim();
    const fark = execSync('git diff HEAD -- src').toString();
    const iz = izOlustur();
    for (let i = 0; i < fark.length; i++) iz.ekle(fark.charCodeAt(i) / 1000);
    const dosya = execSync('git diff --name-only HEAD -- src').toString().trim().split(/\r?\n/).filter(Boolean);
    return `${bas}${dosya.length ? ` + src farkı ${iz.deger} (${dosya.map((f) => f.replace('src/', '')).join(', ')})` : ' (src temiz)'}`;
  } catch { return '?'; }
}

function isciKos(is: string): Promise<Sonuc> {
  return new Promise((coz, red) => {
    const p = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url)], { env: { ...process.env, ISCI: is }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (b) => (out += b));
    p.stderr.on('data', (b) => (err += b));
    p.on('close', (code) => {
      const satir = out.split('\n').find((l) => l.startsWith('@@SONUC '));
      if (code !== 0 || !satir) red(new Error(`${is} çıkış ${code}: ${err.slice(-800)}`));
      else coz(JSON.parse(satir.slice(8)));
    });
  });
}

async function orkestra(): Promise<void> {
  kipBandi();
  const kod = kodDamgasi(); // koşu BAŞINDA: alt süreçler bu kodu yükler (paralel ajanlar src'yi koşu sırasında değiştirebilir)
  const t0 = Date.now();
  const PARALEL = Number(process.env.PARALEL ?? 11);
  const sonuc = new Map<string, Sonuc>();
  const kuyruk = [...isler];
  await Promise.all(Array.from({ length: Math.min(PARALEL, kuyruk.length) }, async () => {
    for (let is = kuyruk.shift(); is; is = kuyruk.shift()) {
      try { sonuc.set(is, await isciKos(is)); } catch (e) { damga(`alt süreç (${is})`, false, String((e as Error).message)); }
    }
  }));
  const al = (ad: string) => sonuc.get(ad);
  const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
  const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
  const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');
  const sa = (sn: number) => (Number.isFinite(sn) ? (sn / 3600).toFixed(2) : 'bitmedi');
  const dk = (sn: number) => (Number.isFinite(sn) ? (sn / 60).toFixed(1) : '—');
  const yz = (a: number, b: number) => (b ? `%${((100 * a) / b).toFixed(1)}` : '—');
  const dY = (a: number, b: number) => (Number.isFinite(a) && Number.isFinite(b) && b ? `${(((a - b) / b) * 100).toFixed(1)}%` : '—');
  const ta = al('TABAN');

  console.log('=== S5 KAT 2 DENGE (G-95/96/97 · G-103 · G-119/122 · G-123 · G-128) — varyant kapısı · D-084 ===');
  console.log(`Kod: ${kod}${kod === kodDamgasi() ? '' : ` → koşu sonunda ${kodDamgasi()} (alt süreçler baştakini yükledi)`}`);
  console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · dt ${DT} · ufuk ${UFUK / 3600} sa · ${isler.length} koşu · başlangıç D-205/D-206 kur() (U0)${MUT ? ` · MUTASYON ${MUT}` : ''}`);
  const d18 = dozFiyat(18), d12 = dozFiyat(12);
  console.log(`Bugün: ilkKahve ${CFG.ilkKahve} sn · kahveAninda ${CFG.kahveAninda} · kahveAralik ${CFG.kahveAralik} · sabır ${CFG.kahveSabir} · okey ${CFG.kahveFiyat}/fincan ×${CFG.istekAdet} · tavla ${TAVLA.kahveFiyat} ×1 · masa ücreti okey ${CFG.masaUcreti} tavla ${(CFG.tavla as { masaUcreti: number }).masaUcreti}`);
  console.log(`G-97 dozları (anında servisle istek/oturum okey ${istekSayisi(CFG.oturum, 25)}→${istekSayisi(CFG.oturum, 18)}→${istekSayisi(CFG.oturum, 12)}, tavla ${istekSayisi(TAVLA.oturum, 25)}→${istekSayisi(TAVLA.oturum, 18)}→${istekSayisi(TAVLA.oturum, 12)}): S18 okey ${f2(d18.okey)} tavla ${f2(d18.tavla)} · S12 okey ${f2(d12.okey)} tavla ${f2(d12.tavla)}`);

  console.log('');
  console.log('--- §1 İLERLEME (Kat 2 biter = zincir + bütün masalar Sv5 + yükseltmeler) ---');
  console.log('kol              | zincir sa | KAT 2 BİTER sa | Δ% TABAN | görev hattı sa | Kat 2 coin/dk | servis/dk oyuncu · garson | yığın topla/dk | görev ödülü');
  for (const k of KOLLAR) {
    const r = al(k.ad);
    if (!r) continue;
    const m = r.sure / 60;
    console.log(`${k.ad.padEnd(16)} | ${sa(r.zincir).padStart(9)} | ${sa(r.bitis).padStart(14)} | ${(ta ? dY(r.bitis, ta.bitis) : '—').padStart(8)} | ${sa(r.hatBitis).padStart(14)} | ${f0(r.kat2Gelir / m).padStart(13)} | ${f2(r.elle / m)} · ${f2(r.garson / m)} | ${f2(r.toplanan / m).padStart(6)} | ${f0(r.gorevOdul)}`);
  }

  console.log('');
  console.log('--- §2 TEMPO — istek → servis (G-95/96/97) ---');
  console.log('kol              | oturma→ilk istek sn (ort · en uzun) | oturma→ilk servis sn (ort · en uzun) | bekleme/fincan sn (servis edilen) | kaçan fincan % | servis anında yığın · kalkış yığını | oyuncu servis/dk (zincir boyunca)');
  for (const k of KOLLAR) {
    const r = al(k.ad);
    if (!r) continue;
    const b = r.bekleme;
    console.log(`${k.ad.padEnd(16)} | ${f1(r.ilkIstek.toplam / r.ilkIstek.n).padStart(6)} · ${f1(r.ilkIstek.enUzun).padStart(5)} | ${f1(r.ilkServis.toplam / r.ilkServis.n).padStart(6)} · ${f1(r.ilkServis.enUzun).padStart(5)} | ${f1(b.servisToplam / b.servisAdet).padStart(6)} | ${yz(b.kacanAdet, b.kacanAdet + b.servisAdet).padStart(6)} | ${f0(r.servisYigini)} · ${f0(r.kalkisYigini)} | ${f2(r.elleZincir / (r.zincir / 60))}`);
  }

  console.log('');
  console.log('--- §3 DARBOĞAZ (G-103) — bekleyen kahvenin fincan-saniyesi nerede? (arz sırayla: tepside → ocakta hazır → temiz fincan yok / pişiyor) ---');
  console.log('kol              | taşımada (tepside) = oyuncu + garson | ocakta hazır, alınmadı | temiz fincan yok (bulaşık) | pişiyor (demleme/kuyruk) | temiz=0 süre % | boş masanın kirli-bloklu süresi % | bekleme/fincan sn | kaçan % | oyuncu servis/dk garson sonrası');
  for (const k of KOLLAR) {
    const r = al(k.ad);
    if (!r) continue;
    const p = r.pay, T = p.tasima + p.hazir + p.temizYok + p.pisiyor;
    const b = r.bekleme;
    console.log(`${k.ad.padEnd(16)} | ${yz(p.tasima, T).padStart(6)} = ${yz(p.tasimaOyuncu, T).padStart(6)} + ${yz(p.tasimaGarson, T).padStart(6)} | ${yz(p.hazir, T).padStart(22)} | ${yz(p.temizYok, T).padStart(26)} | ${yz(p.pisiyor, T).padStart(24)} | ${yz(r.temizSifirSn, r.sure).padStart(14)} | ${yz(r.kirliBlokMasaSn, r.bosMasaSn).padStart(6)} | ${f1(b.servisToplam / b.servisAdet).padStart(5)} | ${yz(b.kacanAdet, b.kacanAdet + b.servisAdet).padStart(5)} | ${f2(r.elleGarsonSonra / Math.max(1e-9, r.garsonSonraSn / 60))}`);
  }

  console.log('');
  console.log('--- §4 MASA Sv KAPISI (G-119/G-122) ---');
  console.log('kol              | Sv ilk görülme sa | ilk Sv alımı sa | ilk Sv2 · ilk Sv3 sa | k2s2okey3 · k2s2okey6 sa | zincirden önce Sv alımı / toplam | zincir sa | KAT 2 BİTER sa | Δ% SV-EMU0');
  const e0 = al('SV-EMU0');
  for (const ad of ['TABAN', 'SV-EMU0', 'G119-K2', 'G119-K2T']) {
    const r = al(ad);
    if (!r) continue;
    console.log(`${ad.padEnd(16)} | ${sa(r.svIlkGorulme).padStart(17)} | ${sa(r.svIlkAlim).padStart(15)} | ${sa(r.sv2Ilk)} · ${sa(r.sv3Ilk)} | ${sa(r.k2s2okey3At)} · ${sa(r.k2s2okey6At)} | ${r.svZincirOncesi} / ${r.svAlim} | ${sa(r.zincir)} | ${sa(r.bitis)} | ${e0 ? dY(r.bitis, e0.bitis) : '—'}`);
  }
  for (const ad of ['G119-K2', 'G119-K2T']) {
    const r = al(ad);
    if (!r) continue;
    const ilk = r.alimlar.filter((a) => a.t <= (Number.isFinite(r.zincir) ? r.zincir : Infinity));
    console.log(`  ${ad} zincir boyunca alım sırası: ${ilk.map((a) => a.ne.replace('pad ', '')).join(' · ')}`);
  }

  console.log('');
  console.log('--- §5 BİRİKTİRME PENCERELERİ (G-123) — alımlar arası bekleme; TABAN ---');
  for (const ad of ['TABAN', 'G119-K2']) {
    const r = al(ad);
    if (!r) continue;
    const uzun = r.alimlar.filter((a) => a.bekleme > 600);
    console.log(`${ad}: ${r.alimlar.length} alım · >10 dk biriktirme ${uzun.length} kez (toplam ${dk(uzun.reduce((a, x) => a + x.bekleme, 0))} dk) · en uzun ${dk(Math.max(...r.alimlar.map((a) => a.bekleme)))} dk`);
    if (uzun.length) console.log('   >10 dk: ' + uzun.map((a) => `${a.ne} (${f0(a.fiyat)}) ${dk(a.bekleme)} dk @ ${f0(a.gelirDk)} coin/dk`).join(' · '));
    console.log('   tavla pad\'leri: ' + r.alimlar.filter((a) => a.ne.startsWith('pad k2tavla')).map((a) => `${a.ne.slice(9)} ${f0(a.fiyat)}: ${dk(a.bekleme)} dk @ ${f0(a.gelirDk)}/dk`).join(' · '));
  }

  console.log('');
  console.log('--- §6 GÖREVLER (G-128) — görev süresi dk; sayaç görevleri ve en uzun ---');
  for (const ad of ['TABAN', 'KORUNUM', 'G128-SAY', 'G119-K2']) {
    const r = al(ad);
    if (!r) continue;
    const say = r.gorevler.filter((x) => ['k2_kahve1', 'k2_kahve10', 'k2_kahve40', 'k2_tavlaKahve', 'k2_grup5', 'k2_topla'].includes(x.id));
    const en = r.gorevler.reduce((a, b) => (b.dk > a.dk ? b : a), { id: '—', dk: -1 });
    console.log(`${ad.padEnd(9)} | ${say.map((x) => `${x.id} ${f1(x.dk)}`).join(' · ')} | en uzun ${en.id} ${f1(en.dk)} · >15 dk: ${r.gorevler.filter((x) => x.dk > 15).length} · hat ${sa(r.hatBitis)} sa · sayaca eklenen garson servisi ${f0(r.sayEklenen)}`);
  }
  console.log('');
  console.log('--- §6b G-124 — Kat 2 yığınlarının oto-toplaması (180 sn, Kat 1 kuralı); ziyaret = 20 dk Kat 2 / 10 dk Kat 1 ---');
  console.log("kol              | KAT 2 BİTER sa | Δ% TABAN | Kat 1'deyken coin/dk: toplam = Kat 2 oto + Kat 1 | Kat 2'ye dönüşte yerde bekleyen coin (ort) | Kat 2'deyken oto-toplanan coin/dk");
  for (const ad of ['TABAN', 'G124-ACIK', 'G124-KAPALI', 'G124-KAT2-KAPALI']) {
    const r = al(ad);
    if (!r) continue;
    const m1 = r.k1.sn / 60, m2 = (r.sure - r.k1.sn) / 60;
    console.log(`${ad.padEnd(16)} | ${sa(r.bitis).padStart(14)} | ${(ta ? dY(r.bitis, ta.bitis) : '—').padStart(8)} | ${m1 ? `${f0((r.k1.k2oto + r.k1.k1gelir) / m1)} = ${f0(r.k1.k2oto / m1)} + ${f0(r.k1.k1gelir / m1)}` : '—'} | ${r.k1.donusN ? f0(r.k1.donusYigin / r.k1.donusN) : '—'} | ${f0(r.k1.k2otoK2de / m2)}`);
  }
  if (ta) console.log('TABAN bütün görevler: ' + ta.gorevler.map((x) => `${x.id} ${f1(x.dk)}${x.dk > 15 ? '!' : ''}`).join(' · '));

  console.log('');
  console.log(`--- §8 MASA DİLİMİ (G-97 · G-96) — açık masa sayısına göre; G96 içme ${ICME} sn ---`);
  console.log('kol              | dilim  | süre dk | coin/dk | servis | kaçan % | bekleme/fincan sn | garson boşta % | yetişemez % (bekleyen > yoldaki, boş garson yok) | oyuncu boşta %');
  const yeniKollar = ['TABAN', 'G96-BULASIK', 'G97-S18', 'G97-S18-ILK12', 'B-96-S18', 'B-96-S18-ILK12'];
  for (const ad of yeniKollar) {
    const r = al(ad);
    if (!r) continue;
    r.dilim.forEach((x, i) => {
      const [a, b] = DILIMLER[i];
      console.log(`${ad.padEnd(16)} | ${(a === b ? `${a}` : `${a}-${b}`).padEnd(6)} | ${dk(x.sn).padStart(7)} | ${f0(x.gelir / Math.max(1e-9, x.sn / 60)).padStart(7)} | ${f0(x.servis).padStart(6)} | ${yz(x.kacan, x.kacan + x.servis).padStart(7)} | ${f1(x.bekToplam / x.servis).padStart(6)} | ${(x.garsonSn ? yz(x.garsonBosSn, x.garsonSn) : '—').padStart(6)} | ${yz(x.yetisemezSn, x.sn).padStart(6)} | ${yz(x.oyuncuBosSn, x.sn)}`);
    });
  }
  console.log('ilk masa (yalnız 1 masa açık): kol | süre dk | oyuncu boşta % | boşuna bekleme % (istek yok, yerde para yok, alınacak yok)');
  for (const ad of yeniKollar) {
    const r = al(ad);
    if (r) console.log(`  ${ad.padEnd(16)} | ${dk(r.ilkMasa.sn)} | ${yz(r.ilkMasa.bosSn, r.ilkMasa.sn)} | ${yz(r.ilkMasa.istekBosSn, r.ilkMasa.sn)}`);
  }
  console.log('');
  console.log('--- §9 ÖZET (yeni kollar) ---');
  console.log('kol              | KAT 2 BİTER sa | Δ% TABAN | coin/dk | kaçan % | bekleme sn | servis adımı yığını · kalkış yığını · toplama/dk');
  for (const ad of yeniKollar) {
    const r = al(ad);
    if (!r) continue;
    const b = r.bekleme;
    console.log(`${ad.padEnd(16)} | ${sa(r.bitis).padStart(14)} | ${(ta ? dY(r.bitis, ta.bitis) : '—').padStart(8)} | ${f0(r.kat2Gelir / (r.sure / 60)).padStart(7)} | ${yz(b.kacanAdet, b.kacanAdet + b.servisAdet).padStart(6)} | ${f1(b.servisToplam / b.servisAdet).padStart(5)} | ${f0(r.servisYigini)} · ${f0(r.kalkisYigini)} · ${f2(r.toplanan / (r.sure / 60))}`);
  }

  // ---- DAMGALAR
  for (const r of sonuc.values()) {
    botDamgasi(r.kol, r.yol, r.sure / 60, 30);
    takilmaDamgasi(r.kol, r.itme, 30);
    const b = r.bekleme;
    damga(`${r.kol}: bekleme korunumu (Σ fincan beklemesi = ∫ bekleyen dt, ±%2)`, Math.abs(b.servisToplam + b.kacanToplam - b.integral) <= 0.02 * Math.max(1, b.integral) + 30, `${f0(b.servisToplam + b.kacanToplam)} ≠ ${f0(b.integral)}`);
    if (!KISA) damga(`${r.kol}: ufukta bitti`, Number.isFinite(r.bitis) && Number.isFinite(r.hatBitis), `${r.bitis} · ${r.hatBitis}`);
  }
  const ko = al('KORUNUM');
  if (ko && ta) damga('KORUNUM: G-128 kancası ×0 → parmak izi = TABAN', ko.iz === ta.iz && ko.bitis === ta.bitis, `${ko.iz} ≠ ${ta.iz}`);
  if (ta) for (const k of KOLLAR) {
    if (k.ad === 'TABAN' || k.ad === 'KORUNUM' || k.ad === 'G124-KAT2-KAPALI') continue;
    const r = al(k.ad);
    if (r && (!KISA || !['G119-K2', 'G119-K2T', 'SV-EMU0'].includes(k.ad))) varyantDamgasi(k.ad, ta.iz, r.iz);
  }
  const kal = al('G96-KALKIS');
  if (kal) damga('G96-KALKIS: servis anında yığın yok (kahve parası kalkışta)', kal.servisYigini === 0, `${kal.servisYigini} servis yığını`);
  if (ta && !FINAL) damga('TABAN: kahve parası serviste düşüyor (kahveAninda)', ta.servisYigini > 0, `${ta.servisYigini}`);
  const g96k = al('G96-BULASIK');
  if (g96k) damga('G96-BULASIK: kahve parası kalkıştan önce de düşüyor (içilince)', g96k.icmeYigini > 0, `${g96k.icmeYigini}`);
  if (g96k) damga('G96-BULASIK: düşüşlerin çoğu servis adımı dışında (içilince)', g96k.icmeYigini > g96k.servisAniYigini, `içme ${g96k.icmeYigini} · servis adımı ${g96k.servisAniYigini}`);
  if (ta && !FINAL) damga('TABAN: içme yığını yok (kahve parası servis adımında)', ta.icmeYigini === 0, `${ta.icmeYigini}`);
  if (ta && FINAL) {
    // Birleşik kod (S5 kararları): G-96 para içilince · G-119 K2T kapısı · G-128 garson sayılır.
    damga('FINAL G-96: düşüşlerin çoğu servis adımı dışında (içilince)', ta.icmeYigini > ta.servisAniYigini, `içme ${ta.icmeYigini} · servis adımı ${ta.servisAniYigini}`);
    if (!KISA) damga("FINAL G-119: Sv2 ilk alımı k2s2okey3'ten sonra, zincirden önce", Number.isFinite(ta.sv2Ilk) && ta.sv2Ilk >= ta.k2s2okey3At && ta.sv2Ilk < ta.zincir, `Sv2 ${sa(ta.sv2Ilk)} · okey3 ${sa(ta.k2s2okey3At)} · zincir ${sa(ta.zincir)}`);
    if (!KISA) damga('FINAL G-119: Sv3 ilk alımı bütün masalar açıldıktan sonra', !Number.isFinite(ta.sv3Ilk) || ta.sv3Ilk >= ta.zincir - 1, `Sv3 ${sa(ta.sv3Ilk)} · zincir ${sa(ta.zincir)}`);
    damga('FINAL G-97: 18 sn aralık + ilk masa 12 sn (config)', CFG.kahveAralik === 18 && CFG.kahveAralikIlk?.aralik === 12, `${CFG.kahveAralik} · ${CFG.kahveAralikIlk?.aralik}`);
  }
  const il = al('G97-S18-ILK12'), s18 = al('G97-S18');
  if (il && s18) damga("G97-S18-ILK12: ilk masa evresi S18'den farklı (kanca etkili)", il.iz !== s18.iz, 'iz aynı');
  const say = al('G128-SAY');
  if (say) damga('G128-SAY: garson servisi sayaca girdi', say.sayEklenen > 0, `${say.sayEklenen}`);
  const k2 = al('G119-K2');
  if (k2) {
    damga('G119-K2: Sv3 ilk alımı k2s2okey6\'dan sonra', !Number.isFinite(k2.sv3Ilk) || (Number.isFinite(k2.k2s2okey6At) && k2.sv3Ilk >= k2.k2s2okey6At), `Sv3 ${sa(k2.sv3Ilk)} · okey6 ${sa(k2.k2s2okey6At)}`);
    damga('G119-K2: Sv2 ilk alımı k2s2okey3\'ten sonra', !Number.isFinite(k2.sv2Ilk) || (Number.isFinite(k2.k2s2okey3At) && k2.sv2Ilk >= k2.k2s2okey3At), `Sv2 ${sa(k2.sv2Ilk)} · okey3 ${sa(k2.k2s2okey3At)}`);
    if (!KISA) damga('G119-K2: Sv zincir bitmeden alındı', k2.svZincirOncesi > 0, '0');
  }
  const gk = al('G103-GARSON');
  if (gk) damga('G103-GARSON: garson sonrası oyuncu servisi ≤ %5 (oyuncu kahve taşımadı)', gk.elleGarsonSonra <= 0.05 * Math.max(1, gk.garson), `oyuncu ${gk.elleGarsonSonra} · garson ${gk.garson}`);
  if (ta) damga('TABAN: taşıma payı = oyuncu + garson', Math.abs(ta.pay.tasima - ta.pay.tasimaOyuncu - ta.pay.tasimaGarson) < 1e-6, '');
  const ga = al('G124-ACIK'), gkap = al('G124-KAPALI');
  if (ga) damga("G124-ACIK: Kat 1'deyken Kat 2 oto geliri > 0", ga.k1.k2oto > 0, `${ga.k1.k2oto}`);
  if (gkap) damga("G124-KAPALI: Kat 1'deyken Kat 2 oto geliri = 0", gkap.k1.k2oto === 0, `${gkap.k1.k2oto}`);
  const k2k = al('G124-KAT2-KAPALI');
  if (k2k) damga("G124-KAT2-KAPALI: Kat 2'de oto-toplama yok", k2k.k1.k2otoK2de === 0, `${k2k.k1.k2otoK2de}`);
  // Bulgu damgası: sürekli Kat 2'de oynayan bot her yığını 180 sn dolmadan topluyor → oto-toplama hiç devreye girmez.
  if (k2k && ta) damga("G124-KAT2-KAPALI: sürekli Kat 2'de oto-toplama etkisiz (iz = TABAN)", k2k.iz === ta.iz, `${k2k.iz} ≠ ${ta.iz} — Kat 2'deyken oto ${ta.k1.k2otoK2de}`);
  if (e0 && ta && !KISA) damga('SV-EMU0: emülasyon = TABAN (Kat 2 biter ±%2)', Math.abs(e0.bitis - ta.bitis) <= 0.02 * ta.bitis, `${sa(e0.bitis)} ≠ ${sa(ta.bitis)}`);

  console.log('');
  console.log('--- §7 PARMAK İZLERİ ---');
  for (const r of sonuc.values()) console.log(`${r.kol}: iz ${r.iz} · Kat 2 biter ${f1(r.bitis)} sn · hat ${f1(r.hatBitis)} sn`);
  console.log('');
  console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn duvar saati)`);
  damgaOzeti();
}
