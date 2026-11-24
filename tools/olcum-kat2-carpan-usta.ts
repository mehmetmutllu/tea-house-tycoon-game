/**
 * olcum-kat2-carpan-usta.ts — KAT 2'YE HEDEF ÇARPANI + USTA + UZUN GÖREVLERİ BÖLME (D-084 varyant kapısı).
 *
 * Kullanıcı 2026-11-19 üç karara "evet" dedi; formülü sayıları görüp seçecek:
 *   (a) Hedef koleksiyon çarpanı (`collectionMult`, D-090) Kat 2 gelirine de binsin (bugün yalnız Kat 1 ödeme + lavabo).
 *   (b) Usta Kat 2 masalarında da olsun (Sv5'te 25 💎). Kat 2'de bahşiş yok → iki formül.
 *   (c4) Uzun pad görevleri bölünsün (tarama 2026-11-18 · 4-oynanış #7).
 *
 * Kollar (hepsi aynı başlangıç — D-205 aracının `kur()`u; Kat 1 masa senaryosu U0 / U20):
 *   TABAN           kod olduğu gibi (kanca KURULMAZ).
 *   KORUNUM         kanca kurulu ama her çarpan 1 → parmak izi TABAN'la birebir olmalı (emülasyonun doğrulaması).
 *   K2-CARPAN       Kat 2'de düşen her yığın (masa ücreti + kahve + lavabo) × collectionMult. Görev ödülü çarpılmaz (Kat 1 kuralı).
 *   U-UCRET         Usta masanın ÜCRET yığını × master.tipMult (kahve hariç).
 *   U-ESIT          Usta masanın bütün yığını (ücret + kahve) × (1 + p), p = Kat 1'de Usta'nın L-tavan masaya kattığı yüzde.
 *   U-*·DOYGUN      aynı formül, 💎 sınırsız: Sv5'e çıkan her masa anında Usta (üst sınır).
 *   A+U-UCRET/ESIT  K2-CARPAN + Usta formülü birlikte (gerçekçi 💎).
 *   B-TAVLA         k2_tavla12 ikiye: araya k2_tavla9 ('Tavla köşesinde 9 masaya ulaş').
 *   B-HEPSI         dört uzun çok-pad'li görev ikiye: k2_s2okey2 · k2_s2okey6 · k2_tavla6 · k2_tavla12.
 *   B-UCLU          B-HEPSI, ama iki tavla görevi üçe.
 *
 * EMÜLASYON (src'ye dokunmadan): `kat2Tick` dünyayı `{...d0, paralar: d0.paralar.slice()}` ile kopyalar; Array alt sınıfı
 * `slice`/`filter`da korunur (Symbol.species) ve yığın NESNELERİ paylaşılır. Araç `kat2Dunya.paralar`ı `IzliParalar`la, her
 * yığının `miktar`ını erişimciyle sarar → `yiginaEkle`nin her eklemesi (yeni yığın = push, var olan = `miktar +=`) aracın
 * `kanca`sından geçer ve kol çarpanı TAM yaratıldığı yerde uygulanır (commit #2'nin yapacağı yer). Ücret/kahve ayrımı tutardan:
 * ücret birebir `masaUcreti × ucretCarpan[sv]` (kahveAninda → birikim 0), kahve `n × kahveFiyat` (çakışmaz; damgalı).
 * Görev bölme: `C.kat2Gorevler` bellekte değiştirilir (store her karede onu okur), kaynak dosya değişmez.
 *
 * Çalıştırma: araç kendini kol×senaryo başına alt süreçte paralel koşar (`PARALEL`, varsayılan 10).
 *   OLCUM=kisa npx tsx tools/olcum-kat2-carpan-usta.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-carpan-usta.ts > docs/olcum-kat2-carpan-usta.txt
 * Bütçe: USTA_BUTCE (varsayılan 100 💎, bütün kollarda aynı).
 * Mutasyon (araç, MUT=):
 *   carpan1 — K2-CARPAN çarpanı 1'e çakılır      → "varyant etkili (K2-CARPAN)" ve "K2-CARPAN bonusu = Σ ham × (m−1)" kırılır.
 *   kahve   — U-UCRET kahveyi de çarpar           → "U-UCRET bonusu = ½ × Usta masası kalkış ücreti" kırılır.
 *   sv4     — Usta Sv4 masaya da alınır           → "her Usta Sv5 masada" kırılır.
 *   gorev   — B kollarında bölme yapılmaz         → "B-*: hat uzunluğu" kırılır.
 *
 * FİNAL KİPİ (commit #2, D-206 = K2-CARPAN + U-ESIT + B-UCLU kodda): `FINAL=1` — emülasyon KAPALI, kod olduğu gibi.
 *   Tek kol FINAL (U0 / U20): kanca yok, hat config'in kendisi, Usta store'un `buyMaster('k2:<masa>')`ıyla (aynı bot kuralı).
 *   Damgalar: hat = D-205 hattı + B-UCLU · Usta Sv5'te ve alım kabul · kat2UstaCarpan = 1 + ESIT_PCT · kat2Oran(…, mult) =
 *   aracın kopyası × mult (Usta'sız: Kat 1 çevrimdışı oranı da Usta'yı görmez) · parmak izi = emülasyonun A+U-ESIT+B-UCLU kolu
 *   (src değişmeden önce aynı araçla OLCUM=tam ölçüldü — `EMU_IZ`). Commit #2'den sonra öteki kollar ANLAMSIZDIR
 *   (kod zaten çarpanı/Usta'yı taşıyor; kanca üstüne bir kez daha uygular).
 *   FINAL=1 OLCUM=tam npx tsx tools/olcum-kat2-carpan-usta.ts > docs/olcum-kat2-carpan-usta-final.txt
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KISA, botDamgasi, damga, damgaOzeti, izOlustur, kipBandi, kisaDeger, seedRandom, takilmaDamgasi, varyantDamgasi } from './olcum-lib';
import {
  charMaxTier,
  dishCarryMaxTier,
  dishSpeedMaxTier,
  economyConfig as C,
  levelProgress,
  playerSpeedFor,
  reputationCarryMult,
  tableTip,
  trayCapacityFor,
  waiterSpeedMaxTier,
  xpForLevel,
} from '../src/config/economy.config';
import { useGame, tableSoftMaxLevel } from '../src/game/store';
import { KAT2_KISI, KAT2_LAVABO_PAD, KAT2_LAVABO_YER, KAT2_MASALAR, KAT2_SV_MAX, KAT2_YIKAMA_YER, OCAKLAR, VARIS, kat2YolAgi, masaErisimde, paraDusmeYeri, type Kat2MasaYeri } from '../src/game/kat';
import {
  kat2EtkinAyar,
  kat2LavaboTetik,
  kat2MasaYeri,
  kat2OcakTetik,
  kat2PadYeri,
  kat2SiradakiPad,
  kat2SvCanliTetik,
  kat2YukSiradaki,
  masaSvOku,
  svCarpan,
  type Kat2Ayar,
} from '../src/game/kat2Dongu';
import { kat2GorevHatasi, kat2Gorevleri, kat2SvCanli, type Kat2GorevDef } from '../src/game/kat2Gorev';
import { claimableGoals, collectionMult, goalCategories } from '../src/game/goals';
import { goalMetricsOf } from '../src/game/store';
import { kat2Oran, kat2UstaCarpan, incomeRate, offlineEarnedSplit } from '../src/game/rules';
import { THE_SERVICE, tostShare } from '../src/game/world';
import { PRODUCTS } from '../src/config/economy.config';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';

const MUT = process.env.MUT ?? '';
const FINAL = process.env.FINAL === '1';
const ISCI = process.env.ISCI ?? '';
const DT = 0.1;
const UFUK = kisaDeger(16 * 3600, 0.5 * 3600);
const BUTCE = Number(process.env.USTA_BUTCE ?? 100);
const g = () => useGame.getState();
const CFG = C.kat2 as unknown as Kat2Ayar;
const BASLANGIC_SEVIYE = 12;
const xpSeviyeBasi = (lv: number) => Array.from({ length: lv - 1 }, (_, i) => xpForLevel(i + 1)).reduce((a, b) => a + b, 0);
const KAT = goalCategories();
const sonKademe = (metric: string) => KAT.find((k) => k.metric === metric)!.tiers.at(-1)!;
const USTA_FIYAT = C.master.diamondCost;
const GUNLUK = C.dailyQuests.diamondsPerDay;

// ---------------------------------------------------------------------------------------------
// U-ESIT'in yüzdesi — Kat 1'in fiyat + bahşiş yapısından (servis seviyesi kur()'daki gibi tavan).
// p = tableTip(L) × (tipMult − 1) / (ürün fiyatı karışımı(servis) + tableTip(L)) ; L = tableSoftMaxLevel()
// ---------------------------------------------------------------------------------------------
const SERVIS_SV = 6;
const fiyatKarisim = (lv: number) => (1 - tostShare(lv)) * PRODUCTS.tea.price + tostShare(lv) * PRODUCTS.tost.price;
const K1_BAHSIS = tableTip(tableSoftMaxLevel());
const ESIT_PCT = (K1_BAHSIS * (C.master.tipMult - 1)) / (fiyatKarisim(SERVIS_SV) + K1_BAHSIS);

// ---------------------------------------------------------------------------------------------
// GÖREV BÖLME — ödül kuralı config yorumu: referans pad'in ~%15'i, 50'ye yuvarlı.
// ---------------------------------------------------------------------------------------------
const padFiyat = (id: string) => C.kat2.padler.find((p) => p.id === id)!.cost;
const odul = (padId: string) => Math.round((padFiyat(padId) * 0.15) / 50) * 50;
interface Ara { once: string; gorev: Kat2GorevDef }
const ara = (once: string, id: string, kicker: string, title: string, pad: string): Ara =>
  ({ once, gorev: { id, kicker, title, hedef: { tip: 'pad', id: pad }, reward: odul(pad) } });
const ARA_TAVLA: Ara[] = [ara('k2_tavla12', 'k2_tavla9', 'TAVLA KÖŞESİ', 'Tavla köşesinde 9 masaya ulaş', 'k2tavla9')];
/** Dört uzun görev (TABAN tam koşusunda > 15 dk ya da sınırda, çok pad'li): k2_s2okey2 (2 pad) · k2_s2okey6 (4) · k2_tavla6 (5) · k2_tavla12 (6).
 *  k2_tavla1 de 17-18 dk ama TEK pad (salon3'ten sonraki 13.600) — bölünemez. */
const ARA_S2 = ara('k2_s2okey2', 'k2_s2okey1', 'OKEY SALONU', 'Okey salonunda ilk masayı aç', 'k2s2okey1');
const ARA_S4 = ara('k2_s2okey6', 'k2_s2okey4', 'OKEY SALONU', 'Okey salonunda 4 masa aç', 'k2s2okey4');
const ARA_HEPSI: Ara[] = [ARA_S2, ARA_S4, ara('k2_tavla6', 'k2_tavla4', 'TAVLA KÖŞESİ', 'Tavla köşesinde 4 masaya ulaş', 'k2tavla4'), ...ARA_TAVLA];
/** B-UCLU: B-HEPSI'nin tavla görevleri ikiye değil ÜÇE (yarısı hâlâ 15 dk'yı aşıyorsa diye). */
const ARA_UCLU: Ara[] = [
  ARA_S2, ARA_S4,
  ara('k2_tavla6', 'k2_tavla3', 'TAVLA KÖŞESİ', 'Tavla köşesinde 3 masaya ulaş', 'k2tavla3'),
  ara('k2_tavla6', 'k2_tavla5', 'TAVLA KÖŞESİ', 'Tavla köşesinde 5 masaya ulaş', 'k2tavla5'),
  ara('k2_tavla12', 'k2_tavla8', 'TAVLA KÖŞESİ', 'Tavla köşesinde 8 masaya ulaş', 'k2tavla8'),
  ara('k2_tavla12', 'k2_tavla10', 'TAVLA KÖŞESİ', 'Tavla köşesinde 10 masaya ulaş', 'k2tavla10'),
];
function bolunmus(aralar: Ara[]): Kat2GorevDef[] {
  const liste = [...ORIJINAL_GOREVLER];
  for (const a of aralar) liste.splice(liste.findIndex((x) => x.id === a.once), 0, a.gorev);
  return liste;
}
/** D-205 hattı (bölmesiz). Commit #2'den sonra config B-UCLU'yu taşır → ara görevler süzülür (bölme kolları iki kez eklemesin). */
const ARA_IDLER = new Set([...ARA_HEPSI, ...ARA_UCLU].map((a) => a.gorev.id));
const CONFIG_GOREVLER = C.kat2Gorevler as readonly Kat2GorevDef[];
const ORIJINAL_GOREVLER = CONFIG_GOREVLER.filter((x) => !ARA_IDLER.has(x.id));
/** Emülasyonun A+U-ESIT+B-UCLU parmak izi (src değişmeden önce, OLCUM=tam) — FINAL kodu bunu vermeli. */
const EMU_IZ: Record<number, string> = { 0: '8f5788f8', 20: 'ad92f37d' };

// ---------------------------------------------------------------------------------------------
// KOLLAR
// ---------------------------------------------------------------------------------------------
type UstaFormul = 'ucret' | 'esit';
interface Kol { ad: string; kanca: boolean; carpan: boolean; usta: UstaFormul | null; doygun: boolean; bolme: Ara[] | null; final?: boolean }
const FINAL_KOL: Kol = { ad: 'FINAL', kanca: false, carpan: false, usta: 'esit', doygun: false, bolme: null, final: true };
const KOLLAR: Kol[] = FINAL ? [FINAL_KOL] : [
  { ad: 'TABAN', kanca: false, carpan: false, usta: null, doygun: false, bolme: null },
  { ad: 'KORUNUM', kanca: true, carpan: false, usta: null, doygun: false, bolme: null },
  { ad: 'K2-CARPAN', kanca: true, carpan: true, usta: null, doygun: false, bolme: null },
  { ad: 'U-UCRET', kanca: true, carpan: false, usta: 'ucret', doygun: false, bolme: null },
  { ad: 'U-ESIT', kanca: true, carpan: false, usta: 'esit', doygun: false, bolme: null },
  { ad: 'U-UCRET·DOY', kanca: true, carpan: false, usta: 'ucret', doygun: true, bolme: null },
  { ad: 'U-ESIT·DOY', kanca: true, carpan: false, usta: 'esit', doygun: true, bolme: null },
  { ad: 'A+U-UCRET', kanca: true, carpan: true, usta: 'ucret', doygun: false, bolme: null },
  { ad: 'A+U-ESIT', kanca: true, carpan: true, usta: 'esit', doygun: false, bolme: null },
  { ad: 'B-TAVLA', kanca: false, carpan: false, usta: null, doygun: false, bolme: ARA_TAVLA },
  { ad: 'B-HEPSI', kanca: false, carpan: false, usta: null, doygun: false, bolme: ARA_HEPSI },
  { ad: 'B-UCLU', kanca: false, carpan: false, usta: null, doygun: false, bolme: ARA_UCLU },
  /** D-206 kararı (kullanıcı 2026-11-19) — emülasyonla birleşik kol; commit #2'nin kodu bunu BİREBİR vermeli (FINAL kipi). */
  { ad: 'A+U-ESIT+B-UCLU', kanca: true, carpan: true, usta: 'esit', doygun: false, bolme: ARA_UCLU },
];
const K1_MASA = 20;
/** Süzgeç (mutasyon gösterimi / hızlı bakış): `KOLLAR=TABAN,U-UCRET` · `SENARYO=0`. Rapor koşusunda verilmez. */
const SUZ_KOL = (process.env.KOLLAR ?? '').split(',').filter(Boolean);
const SENARYO = process.env.SENARYO ? process.env.SENARYO.split(',').map(Number) : KISA ? [0] : [0, K1_MASA];
/** KORUNUM yalnız U0'da koşar (kanıt için bir senaryo yeter). */
const isler = SENARYO.flatMap((m) => KOLLAR.filter((k) => (k.ad !== 'KORUNUM' || m === 0) && (!SUZ_KOL.length || SUZ_KOL.includes(k.ad))).map((k) => `${k.ad}@${m}`));
/** Kolun etkisi kısa ufukta başlamayabilir (Usta Sv5'te, bölmeler 10.+ görevde) — o kolların "etkili" damgaları yalnız tam koşuda. */
const gecEtkili = (k: Kol) => k.usta !== null || k.bolme !== null;

// ---------------------------------------------------------------------------------------------
// BAŞLANGIÇ — D-205 aracının kur()'u (hedefler artık kodda Kat 2'yi de sayıyor: D-205 #2).
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

function kur(k1Tavan: number): void {
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
    tableLevels: s.tableLevels.map((_, i) => (i < k1Tavan ? tableSoftMaxLevel() : 0)),
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
  useGame.setState({ xp: xpSeviyeBasi(BASLANGIC_SEVIYE), xpBekleyen: 0, levelUp: null, diamonds: D(BUTCE) });
  g().setKeyboardInput(0, 0);
}

// ---------------------------------------------------------------------------------------------
// KANCA — Kat 2 yığınlarına yapılan her ekleme buradan geçer.
// ---------------------------------------------------------------------------------------------
type Para = { id: number; x: number; z: number; miktar: number };
const anahtar = (x: number, z: number) => `${x},${z}`;
const YER_MASA = new Map<string, Kat2MasaYeri>(KAT2_MASALAR.map((m) => [anahtar(...paraDusmeYeri(m)), m]));
const LAVABO_ANAHTAR = anahtar(KAT2_LAVABO_YER[0], KAT2_LAVABO_YER[1]);
const ucretOf = (tur: 'okey' | 'tavla', sv: number) =>
  (tur === 'tavla' ? CFG.tavla!.masaUcreti : CFG.masaUcreti) * svCarpan(CFG.masaSv?.[tur]?.ucretCarpan, sv) + 0;

interface KancaSayac {
  ham: number; sonuc: number; carpanBonus: number; ustaBonus: number;
  hamUcret: number; hamKahve: number; hamLavabo: number; ucretAdet: number; ustaHam: number;
  bilinmeyen: number;
}
let kancaFn: ((x: number, z: number, inc: number) => number) | null = null;

class IzliParalar extends Array<Para> {
  push(...ps: Para[]): number {
    for (const p of ps) super.push(sar(p, kancaFn ? kancaFn(p.x, p.z, p.miktar) : p.miktar));
    return this.length;
  }
}
function sar(p: Para, ilk: number): Para {
  let v = ilk;
  const o = { id: p.id, x: p.x, z: p.z } as Para;
  Object.defineProperty(o, 'miktar', {
    enumerable: true,
    get: () => v,
    set: (nv: number) => { const inc = nv - v; v += kancaFn ? kancaFn(o.x, o.z, inc) : inc; },
  });
  return o;
}
function kancaKur(): void {
  const d = g().kat2Dunya;
  if (d.paralar instanceof IzliParalar) return;
  const yeni = new IzliParalar();
  for (const p of d.paralar) Array.prototype.push.call(yeni, sar(p, p.miktar));
  useGame.setState({ kat2Dunya: { ...d, paralar: yeni } });
}

// ---------------------------------------------------------------------------------------------
// İŞÇİ — bir kol × bir senaryo. D-205 botu birebir (+ Usta alımı + görev süreleri + kanca hesapları).
// ---------------------------------------------------------------------------------------------
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const YIKAMA: readonly [number, number] = [KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1] + 0.8];
const uz = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

interface Sonuc {
  kol: string; k1Tavan: number;
  zincir: number; sv: number; yuk: number; bitis: number; hatBitis: number; sure: number;
  kat1Akis: number; kat2Gelir: number; gorevOdul: number;
  carpan0: number; carpan1: number;
  elmasBas: number; elmasSon: number; elmasHedef: number; elmasGunluk: number;
  usta: { id: string; sa: number; sv: number }[];
  gorevler: { id: string; dk: number; bitti: number }[];
  hatUzunluk: number; hatHatasi: string | null;
  k: KancaSayac;
  ustaUcretBeklenen: number;
  kalkis: number;
  korunumSapma: number;
  oran: { taban: number; kol: number; k1: number; cap: number; tabanKazanc: number; kolKazanc: number; splitKazanc: number };
  oranKodFark: number; hatIdler: string[];
  yol: number; itme: number; iz: string;
}

function kos(kol: Kol, k1Tavan: number): Sonuc {
  // Görev hattı (bellekte) — kur()'dan ÖNCE: kat2Ac görev kaydını hat üstünden hizalar.
  const liste = kol.final ? [...CONFIG_GOREVLER] : kol.bolme && MUT !== 'gorev' ? bolunmus(kol.bolme) : [...ORIJINAL_GOREVLER];
  (C as unknown as { kat2Gorevler: readonly Kat2GorevDef[] }).kat2Gorevler = liste;
  kur(k1Tavan);
  const hat = kat2Gorevleri(C.kat2Gorevler as readonly Kat2GorevDef[], CFG);

  const k: KancaSayac = { ham: 0, sonuc: 0, carpanBonus: 0, ustaBonus: 0, hamUcret: 0, hamKahve: 0, hamLavabo: 0, ucretAdet: 0, ustaHam: 0, bilinmeyen: 0 };
  const ustaSet = new Set<string>();
  const usta: Sonuc['usta'] = [];
  if (kol.kanca) {
    kancaFn = (x, z, inc) => {
      if (inc <= 0) return inc;
      const s = g();
      const m = kol.carpan && MUT !== 'carpan1' ? collectionMult(s.goalsClaimed) : 1;
      const key = anahtar(x, z);
      let u = 1;
      if (key === LAVABO_ANAHTAR) k.hamLavabo += inc;
      else {
        const masa = YER_MASA.get(key);
        if (!masa) k.bilinmeyen += inc;
        else {
          const ucret = Math.abs(inc - ucretOf(masa.tur, masaSvOku(s.kat2.masaSv, masa.id))) < 1e-6;
          if (ucret) { k.hamUcret += inc; k.ucretAdet += 1; } else k.hamKahve += inc;
          if (ustaSet.has(masa.id)) {
            k.ustaHam += inc;
            if (kol.usta === 'ucret') u = ucret || MUT === 'kahve' ? C.master.tipMult : 1;
            else if (kol.usta === 'esit') u = 1 + ESIT_PCT;
          }
        }
      }
      const out = inc * m * u;
      k.ham += inc;
      k.sonuc += out;
      k.carpanBonus += inc * (m - 1);
      k.ustaBonus += inc * m * (u - 1);
      return out;
    };
  } else kancaFn = null;

  const ZINCIR = C.kat2.padler.map((p) => p.id);
  const carpan0 = collectionMult(g().goalsClaimed);
  const elmasBas = g().diamonds.toNumber();
  let elmasHedef = 0, elmasGunluk = 0, gunlukKesir = 0;
  const izT = izOlustur();
  let zincir = NaN, sv = NaN, yuk = NaN, hatBitis = NaN;
  let kat1Akis = 0, kat2Gelir = 0, gorevOdul = 0, yol = 0, itme = 0, enUzun = 0, kalkis = 0, ustaUcretBeklenen = 0;
  let pileTopDegisim = 0, toplananTop = 0;
  const gorevBitis: number[] = [];
  let gorevIdx = g().kat2.gorev?.idx ?? 0;
  for (let i = 0; i < gorevIdx; i++) gorevBitis.push(0);
  let t = 0;
  for (; t < UFUK; t += DT) {
    if (kol.kanca) kancaKur();
    const s = g();
    if (s.levelUp) g().claimLevelUp(false);
    const k2 = s.kat2;
    const padsDone = k2.padsDone;
    const masaSv = k2.masaSv ?? {};
    const ayar = kat2EtkinAyar(CFG, k2.yuk);
    const d = s.kat2Dunya;
    const cuzdan = s.wallet.toNumber();
    const zincirBitti = ZINCIR.every((id) => padsDone.includes(id));
    if (zincirBitti && Number.isNaN(zincir)) zincir = t;
    const acikMasa = KAT2_MASALAR.filter((m) => padsDone.includes(m.id));
    if (zincirBitti && Number.isNaN(sv) && acikMasa.every((m) => masaSvOku(masaSv, m.id) >= KAT2_SV_MAX)) sv = t;
    const yukKalan = (['ocak', 'lavabo', 'garsonHiz', 'garsonTepsi'] as const).filter((tur) => kat2YukSiradaki(CFG, padsDone, k2.yuk, tur));
    if (zincirBitti && Number.isNaN(yuk) && !yukKalan.length) yuk = t;
    if (!Number.isNaN(zincir) && !Number.isNaN(sv) && !Number.isNaN(yuk) && !Number.isNaN(hatBitis)) break;

    if (Math.round(t / DT) % 10 === 0) {
      const e0 = g().diamonds.toNumber();
      topla();
      elmasHedef += g().diamonds.toNumber() - e0;
      // Günlük görev 💎 arzı (10/gün) oranlı — bütün kollarda aynı.
      gunlukKesir += (GUNLUK * DT * 10) / 86400;
      if (gunlukKesir >= 1) {
        const n = Math.floor(gunlukKesir);
        gunlukKesir -= n;
        elmasGunluk += n;
        useGame.setState({ diamonds: g().diamonds.add(n) });
      }
    }

    // USTA — Kat 1 ölçümlerinin deseni (`tools/usta-kollari.ts`): uygun hedef + 💎 yetiyorsa hemen, karede en fazla bir alım.
    if (kol.usta) {
      const svEsik = MUT === 'sv4' ? KAT2_SV_MAX - 1 : KAT2_SV_MAX;
      const uygun = KAT2_MASALAR.filter((m) => padsDone.includes(m.id) && !ustaSet.has(m.id) && masaSvOku(masaSv, m.id) >= svEsik);
      for (const m of kol.doygun ? uygun : uygun.slice(0, 1)) {
        const s1 = g();
        if (!kol.doygun && s1.diamonds.lt(USTA_FIYAT)) break;
        if (kol.final) {
          // Kod yolu: store'un kendi alımı (şartı kendisi denetler; ret = damga).
          const ok = g().buyMaster(`k2:${m.id}`);
          usta.push({ id: m.id, sa: t / 3600, sv: ok ? masaSvOku(masaSv, m.id) : -1 });
          ustaSet.add(m.id);
          continue;
        }
        ustaSet.add(m.id);
        usta.push({ id: m.id, sa: t / 3600, sv: masaSvOku(masaSv, m.id) });
        useGame.setState({
          mastersOwned: [...(s1.mastersOwned ?? []), `k2:${m.id}`],
          diamonds: kol.doygun ? s1.diamonds : s1.diamonds.sub(USTA_FIYAT),
          xp: s1.xp + C.xp.perUpgrade,
          xpBekleyen: s1.xpBekleyen + C.xp.perUpgrade,
        });
      }
    }

    let alindi = false;
    for (const tur of ['garsonHiz', 'garsonTepsi'] as const) {
      const n = kat2YukSiradaki(CFG, padsDone, k2.yuk, tur);
      if (n?.acik && cuzdan >= n.fiyat) alindi = g().kat2GarsonYukAl(tur) || alindi;
    }
    if (alindi) continue;

    const adaylar: { kalan: number; yer: readonly [number, number] }[] = [];
    const sp = kat2SiradakiPad(ayar, padsDone);
    if (sp) adaylar.push({ kalan: sp.cost - (d.padFill[sp.id] ?? 0), yer: kat2PadYeri(sp.id) });
    const svT = kat2SvCanliTetik(ayar, padsDone, masaSv, kat2SvCanli(k2, C.kat2Gorevler as readonly Kat2GorevDef[], CFG))[0];
    if (svT) adaylar.push({ kalan: svT.fiyat - (d.padFill[svT.id] ?? 0), yer: [svT.x, svT.z] });
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
    if (ucuz && cuzdan >= ucuz.kalan - 1e-9) hedef = ucuz.yer;
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
    const s0 = g();
    const l0 = s0.lifetime.toNumber();
    const a0 = s0.kat1Akis;
    const pile0 = s0.kat2Dunya.paralar.reduce((a, p) => a + p.miktar, 0);
    const masa0 = s0.kat2Dunya.masalar.map((m) => m.durum);
    const sv0 = s0.kat2.masaSv;
    const mult0 = collectionMult(s0.goalsClaimed);
    g().tick(DT);
    const s1 = g();
    // Kalkış (kanca'dan BAĞIMSIZ: masa durumu oyunda → değil) — ücret sınıflamasının ve U-UCRET bonusunun denetimi.
    s1.kat2Dunya.masalar.forEach((m, i) => {
      if (masa0[i] === 'oyunda' && m.durum !== 'oyunda') {
        kalkis += 1;
        if (kol.usta === 'ucret' && ustaSet.has(m.id)) {
          const carp = kol.carpan && MUT !== 'carpan1' ? mult0 : 1;
          ustaUcretBeklenen += ucretOf(m.tur, masaSvOku(sv0, m.id)) * carp * (C.master.tipMult - 1);
        }
      }
    });
    const idx1 = s1.kat2.gorev?.idx ?? 0;
    let odulBuKare = 0;
    for (; gorevIdx < idx1; gorevIdx++) {
      gorevBitis.push(t + DT);
      odulBuKare += hat[gorevIdx]?.reward ?? 0;
    }
    gorevOdul += odulBuKare;
    if (Number.isNaN(hatBitis) && gorevIdx >= hat.length) hatBitis = t + DT;
    const adim = Math.hypot(s1.player[0] - x, s1.player[2] - z);
    yol += adim;
    itme = Math.hypot(ix, iz) > 0.1 && adim < 1e-4 ? itme + DT : 0;
    enUzun = Math.max(enUzun, itme);
    const akis = Math.max(0, s1.kat1Akis - a0);
    kat1Akis += akis;
    const k2Lt = s1.lifetime.toNumber() - l0 - akis;
    kat2Gelir += Math.max(0, k2Lt);
    toplananTop += k2Lt - odulBuKare;
    pileTopDegisim += s1.kat2Dunya.paralar.reduce((a, p) => a + p.miktar, 0) - pile0;
    if (Math.round(t / DT) % 50 === 0) izT.ekle(s1.wallet.toNumber(), s1.kat2.padsDone.length, s1.xp, s1.player[0], s1.player[2], collectionMult(s1.goalsClaimed));
  }
  topla();
  const s = g();

  // ÇEVRİMDIŞI — kat2Oran'ın kendisi (taban) ve aynı döngü kol formülüyle (aracın kopyası; çarpan 1'de kat2Oran'a eşit olmalı).
  const son = s.kat2;
  const a = kat2EtkinAyar(CFG, son.yuk);
  const ocak = son.padsDone.includes(OCAKLAR[0].id);
  const m1 = kol.carpan && MUT !== 'carpan1' ? collectionMult(s.goalsClaimed) : 1;
  let oranKol = 0, oranKopya = 0, oranKopyaM = 0;
  const mKodK = collectionMult(s.goalsClaimed);
  for (const m of KAT2_MASALAR) {
    if (!son.padsDone.includes(m.id)) continue;
    const tt = m.tur === 'tavla' ? a.tavla! : a;
    const svm = masaSvOku(son.masaSv, m.id);
    const kl = a.masaSv?.[m.tur];
    const oturum = tt.oturum * svCarpan(kl?.oturumCarpan, svm);
    const istek = ocak ? Math.max(0, Math.floor((oturum - a.kahveSabir * 0.5) / (tt.kahveAralik * svCarpan(kl?.kahveAralikCarpan, svm)))) : 0;
    const lav = a.lavabo && son.padsDone.includes(KAT2_LAVABO_PAD) ? KAT2_KISI[m.tur] * a.lavabo.ugrama * a.lavabo.ucret : 0;
    const ucret = tt.masaUcreti * svCarpan(kl?.ucretCarpan, svm);
    const kahve = istek * tt.istekAdet * tt.kahveFiyat * svCarpan(kl?.kahveFiyatCarpan, svm);
    const dongu = a.gelisAralik * svCarpan(kl?.gelisAralikCarpan, svm) + a.yurume + oturum;
    const u = ustaSet.has(m.id);
    const ucretK = ucret * (u && kol.usta === 'ucret' ? C.master.tipMult : u && kol.usta === 'esit' ? 1 + ESIT_PCT : 1);
    const kahveK = kahve * (u && kol.usta === 'esit' ? 1 + ESIT_PCT : 1);
    oranKopya += (ucret + kahve + lav) / dongu;
    oranKopyaM += ((ucret + kahve + lav) * mKodK) / dongu;
    oranKol += ((ucretK + kahveK + lav) * m1) / dongu;
  }
  const oranTaban = kat2Oran(son.padsDone, son.masaSv, son.yuk);
  const mKod = collectionMult(s.goalsClaimed);
  const oranKod = kat2Oran(son.padsDone, son.masaSv, son.yuk, mKod);
  let tipTotal = 0;
  for (let i = 0; i < s.tables; i++) tipTotal += C.tables.tipBase * (s.tableLevels[i] ?? 0);
  const k1 = incomeRate(s.tables, s.stationLevels[THE_SERVICE], tipTotal, s.lavaboLevel, collectionMult(s.goalsClaimed));
  const sure = Math.min(3600, C.offline.baseCapHours * 3600);
  // Para tavanı `rules.offlineRawCap`in kuralı: sıradaki Kat 1 omurga pad'i → yoksa sıradaki Kat 2 pad'i → yoksa en pahalı pad.
  const sonraki = C.pads.find((p) => !(p as { optional?: boolean }).optional && !s.padsDone.includes(p.id)) ?? C.kat2.padler.find((p) => !son.padsDone.includes(p.id));
  const cap = Math.floor((sonraki ? sonraki.cost : Math.max(...C.pads.map((p) => p.cost), ...C.kat2.padler.map((p) => p.cost))) * C.offline.capNextPadFrac);
  const ham = (o2: number) => Math.floor(k1 * C.offline.rateMult * sure) + Math.floor(o2 * C.offline.rateMult * sure);
  const split = offlineEarnedSplit(k1, 3600, s.padsDone, { acik: true, padsDone: son.padsDone, masaSv: son.masaSv, yuk: son.yuk });

  kancaFn = null;
  (C as unknown as { kat2Gorevler: readonly Kat2GorevDef[] }).kat2Gorevler = ORIJINAL_GOREVLER;
  const gorevler = hat.map((h, i) => {
    const bas = i === 0 ? 0 : gorevBitis[i - 1] ?? NaN;
    const bit = gorevBitis[i] ?? NaN;
    return { id: h.id, dk: (bit - bas) / 60, bitti: bit / 3600 };
  });
  return {
    kol: kol.ad, k1Tavan, zincir, sv, yuk, bitis: Math.max(zincir, sv, yuk), hatBitis, sure: t,
    kat1Akis, kat2Gelir, gorevOdul, carpan0, carpan1: collectionMult(s.goalsClaimed),
    elmasBas, elmasSon: s.diamonds.toNumber(), elmasHedef, elmasGunluk,
    usta, gorevler, hatUzunluk: hat.length, hatHatasi: kat2GorevHatasi(hat, CFG, C.kat2.hazir),
    k, ustaUcretBeklenen, kalkis,
    korunumSapma: kol.kanca ? k.sonuc - (pileTopDegisim + toplananTop) : 0,
    oran: { taban: oranTaban * 60, kol: oranKol * 60, k1: k1 * 60, cap, tabanKazanc: Math.min(ham(oranTaban), cap), kolKazanc: Math.min(ham(oranKol), cap), splitKazanc: split.kazanc },
    yol, itme: enUzun, iz: izT.deger,
    ...(oranKopya && Math.abs(oranKopya - oranTaban) > 1e-9 ? { kopyaHatasi: oranKopya - oranTaban } : {}),
    oranKodFark: oranKod - oranKopyaM,
    hatIdler: hat.map((h) => `${h.id}:${h.reward}`),
  } as Sonuc;
}

// ---------------------------------------------------------------------------------------------
// ALT SÜREÇ / ORKESTRA
// ---------------------------------------------------------------------------------------------
if (ISCI) {
  const [ad, m] = ISCI.split('@');
  const kol = KOLLAR.find((k) => k.ad === ad)!;
  const r = kos(kol, Number(m));
  console.log('@@SONUC ' + JSON.stringify(r));
} else {
  await orkestra();
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
  const t0 = Date.now();
  const PARALEL = Number(process.env.PARALEL ?? 10);
  const sonuc = new Map<string, Sonuc>();
  const kuyruk = [...isler];
  await Promise.all(Array.from({ length: Math.min(PARALEL, kuyruk.length) }, async () => {
    for (let is = kuyruk.shift(); is; is = kuyruk.shift()) {
      try { sonuc.set(is, await isciKos(is)); } catch (e) { damga(`alt süreç (${is})`, false, String((e as Error).message)); }
    }
  }));
  const al = (ad: string, m: number) => sonuc.get(`${ad}@${m}`);

  const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
  const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
  const sa = (sn: number) => (Number.isFinite(sn) ? `${(sn / 3600).toFixed(2)}` : 'bitmedi');
  const dYuzde = (a: number, b: number) => (Number.isFinite(a) && Number.isFinite(b) && b ? `${(((a - b) / b) * 100).toFixed(1)}%` : '—');

  console.log('=== KAT 2: HEDEF ÇARPANI + USTA + GÖREV BÖLME (varyant kapısı · D-084) ===');
  console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · dt ${DT} · ufuk ${UFUK / 3600} sa · ${isler.length} koşu, ${PARALEL} paralel${MUT ? ` · MUTASYON ${MUT}` : ''}`);
  console.log(`Başlangıç: D-205 aracının kur()'u (Kat 1 görev hattı sonu · karakter tavan · seviye ${BASLANGIC_SEVIYE} · Kat 2 ilk çıkış · hedefler Servis/Kazanç/Temizlik/Mekân bitmiş) · Kat 1 masa senaryosu U0 / U${K1_MASA} (L${tableSoftMaxLevel()} masa sayısı).`);
  console.log(`💎: başta ${BUTCE} (bütün kollarda aynı) + Kat 2'de hedeflerden gelen + günlük ${GUNLUK}/gün oranlı · Usta ${USTA_FIYAT} 💎 · Usta uygun: açık masa Sv${KAT2_SV_MAX} · karede ≤1 alım (Kat 1 usta-kollari deseni). DOY = 💎 sınırsız.`);
  console.log(`U-ESIT yüzdesi: Kat 1 L${tableSoftMaxLevel()} masa, servis L${SERVIS_SV}: bahşiş ${K1_BAHSIS} × (${C.master.tipMult} − 1) / (fiyat karışımı ${fiyatKarisim(SERVIS_SV).toFixed(2)} + bahşiş ${K1_BAHSIS}) = +%${(ESIT_PCT * 100).toFixed(1)}`);
  console.log(`U-UCRET: Usta masanın ücret yığını × ${C.master.tipMult} (Sv5 ücret: okey ${ucretOf('okey', 5).toFixed(1)} · tavla ${ucretOf('tavla', 5).toFixed(1)}; kahve hariç).`);

  console.log('');
  console.log('--- §1 İLERLEME — Kat 2 ilk çıkıştan bitişe (zincir + bütün masalar Sv5 + yükseltmeler) ---');
  console.log('kol           @U | zincir sa | KAT 2 BİTER sa | Δ% TABAN | görev hattı biter sa | Kat 2 coin/dk | Kat 1 arka plan coin/dk | çarpan baş → son | görev ödülü');
  for (const m of SENARYO) {
    const ta = al('TABAN', m);
    for (const kol of KOLLAR) {
      const r = al(kol.ad, m);
      if (!r) continue;
      const dk = r.sure / 60;
      console.log(`${kol.ad.padEnd(13)}@${String(m).padEnd(2)}| ${sa(r.zincir).padStart(9)} | ${sa(r.bitis).padStart(14)} | ${(ta ? dYuzde(r.bitis, ta.bitis) : '—').padStart(8)} | ${sa(r.hatBitis).padStart(20)} | ${f0(r.kat2Gelir / dk).padStart(13)} | ${f0(r.kat1Akis / dk).padStart(23)} | +%${((r.carpan0 - 1) * 100).toFixed(1)} → +%${((r.carpan1 - 1) * 100).toFixed(1)} | ${f0(r.gorevOdul).padStart(7)}`);
    }
  }

  console.log('');
  console.log('--- §2 KANCA — Kat 2 yığınlarına düşen para (ham = oyunun bugünkü tutarı; bonus = kolun eklediği) ---');
  console.log('kol           @U | ham ücret | ham kahve | ham lavabo | çarpan bonusu | Usta bonusu | bonus / ham | Usta: adet (ilk sa) · 💎 harcanan / hedef+günlük gelen · sonda kalan');
  for (const m of SENARYO) {
    for (const kol of KOLLAR) {
      const r = al(kol.ad, m);
      if (!r || !kol.kanca) continue;
      const harcanan = r.elmasBas + r.elmasHedef + r.elmasGunluk - r.elmasSon;
      const u = r.usta.length ? `${r.usta.length} (${r.usta[0].sa.toFixed(2)})` : '0';
      console.log(`${kol.ad.padEnd(13)}@${String(m).padEnd(2)}| ${f0(r.k.hamUcret).padStart(9)} | ${f0(r.k.hamKahve).padStart(9)} | ${f0(r.k.hamLavabo).padStart(10)} | ${f0(r.k.carpanBonus).padStart(13)} | ${f0(r.k.ustaBonus).padStart(11)} | ${('%' + f1(((r.k.carpanBonus + r.k.ustaBonus) / r.k.ham) * 100)).padStart(11)} | ${u} · ${f0(kol.doygun ? r.usta.length * USTA_FIYAT : harcanan)}${kol.doygun ? ' (sınırsız)' : ''} / ${f0(r.elmasHedef + r.elmasGunluk)} · ${f0(r.elmasSon)}`);
    }
  }
  console.log('Usta alım hattı (masa @ saat):');
  for (const m of SENARYO) for (const kol of KOLLAR.filter((k) => k.usta && !k.doygun)) {
    const r = al(kol.ad, m);
    if (r) console.log(`${kol.ad.padEnd(13)}@${String(m).padEnd(2)}| ${r.usta.map((x) => `${x.id} @ ${x.sa.toFixed(2)}`).join(' · ') || '—'}`);
  }

  console.log('');
  console.log(`--- §3 ÇEVRİMDIŞI — Kat 2 bitince (bütün masalar Sv5) oran; 1 sa dönüş (rateMult ${C.offline.rateMult}, para tavanı ${f0(al('TABAN', 0)?.oran.cap ?? NaN)}) ---`);
  console.log('kol           @U | Kat 2 oran coin/dk: kat2Oran → kol formülü | Δ% | Kat 1 oran coin/dk | 1 sa ham: taban → kol | 1 sa ödenen (tavanlı): taban → kol');
  for (const m of SENARYO) for (const kol of KOLLAR) {
    const r = al(kol.ad, m);
    if (!r) continue;
    const o = r.oran;
    const hamT = Math.floor(o.k1 / 60 * C.offline.rateMult * 3600) + Math.floor(o.taban / 60 * C.offline.rateMult * 3600);
    const hamK = Math.floor(o.k1 / 60 * C.offline.rateMult * 3600) + Math.floor(o.kol / 60 * C.offline.rateMult * 3600);
    console.log(`${kol.ad.padEnd(13)}@${String(m).padEnd(2)}| ${f0(o.taban).padStart(10)} → ${f0(o.kol).padEnd(28)} | ${dYuzde(o.kol, o.taban).padStart(5)} | ${f0(o.k1).padStart(18)} | ${f0(hamT)} → ${f0(hamK)} | ${f0(o.tabanKazanc)} → ${f0(o.kolKazanc)}`);
  }

  console.log('');
  console.log('--- §4 GÖREVLER — görev başına süre (dk; önceki görev bitince başlar) · 15 dk eşiği ---');
  for (const m of SENARYO) for (const ad of ['TABAN', 'B-TAVLA', 'B-HEPSI', 'B-UCLU', 'FINAL']) {
    const r = al(ad, m);
    if (!r) continue;
    const uzun = r.gorevler.filter((x) => x.dk > 15);
    console.log(`${ad.padEnd(8)}@U${m} · ${r.hatUzunluk} görev · >15 dk: ${uzun.length} · en uzun ${f1(Math.max(...r.gorevler.map((x) => x.dk)))} dk · görev ödülü ${f0(r.gorevOdul)} · Kat 2 biter ${sa(r.bitis)} sa`);
    console.log('   ' + r.gorevler.map((x) => `${x.id} ${f1(x.dk)}${x.dk > 15 ? '!' : ''}`).join(' · '));
  }

  // ---- DAMGALAR
  for (const r of sonuc.values()) {
    const ad = `${r.kol}@U${r.k1Tavan}`;
    botDamgasi(ad, r.yol, r.sure / 60, 30);
    takilmaDamgasi(ad, r.itme, 30);
    const kol = KOLLAR.find((k) => k.ad === r.kol)!;
    if (kol.kanca) {
      damga(`${ad}: kanca korunumu (Σ kanca çıkışı = yığın değişimi + toplanan)`, Math.abs(r.korunumSapma) <= 1e-6 * Math.max(1, r.k.sonuc), `sapma ${r.korunumSapma}`);
      damga(`${ad}: her yığın tanınan bir yerde (masa/lavabo)`, r.k.bilinmeyen === 0, `${r.k.bilinmeyen}`);
      damga(`${ad}: ücret sınıflaması = kalkış sayısı (kancadan bağımsız)`, r.k.ucretAdet === r.kalkis, `${r.k.ucretAdet} ≠ ${r.kalkis}`);
    }
    if (kol.carpan) damga(`${ad}: K2-CARPAN bonusu > 0`, r.k.carpanBonus > 0, `${r.k.carpanBonus}`);
    if (kol.usta) {
      damga(`${ad}: her Usta Sv${KAT2_SV_MAX} masada`, r.usta.every((x) => x.sv >= KAT2_SV_MAX), r.usta.filter((x) => x.sv < KAT2_SV_MAX).map((x) => `${x.id}@Sv${x.sv}`).join(','));
      if (!KISA) damga(`${ad}: en az bir Usta alındı`, r.usta.length > 0, '0 alım');
      if (!kol.doygun) damga(`${ad}: 💎 eksiye düşmedi`, r.elmasSon >= 0, `${r.elmasSon}`);
      if (kol.usta === 'ucret') damga(`${ad}: U-UCRET bonusu = ½ × Usta masası kalkış ücreti`, Math.abs(r.k.ustaBonus - r.ustaUcretBeklenen) <= 1e-6 * Math.max(1, r.ustaUcretBeklenen), `${r.k.ustaBonus.toFixed(2)} ≠ ${r.ustaUcretBeklenen.toFixed(2)}`);
    }
    if (kol.bolme) {
      const beklenen = ORIJINAL_GOREVLER.length + kol.bolme.length;
      damga(`${ad}: hat uzunluğu = ${beklenen}`, r.hatUzunluk === beklenen, `${r.hatUzunluk}`);
    }
    damga(`${ad}: görev hattı geçerli (kat2GorevHatasi)`, r.hatHatasi === null, String(r.hatHatasi));
    damga(`${ad}: çevrimdışı kopya formülü = kat2Oran`, !(r as unknown as { kopyaHatasi?: number }).kopyaHatasi, String((r as unknown as { kopyaHatasi?: number }).kopyaHatasi));
    if (!kol.kanca && !kol.bolme) damga(`${ad}: tavanlı taban hesabı = offlineEarnedSplit`, r.oran.tabanKazanc === r.oran.splitKazanc, `${r.oran.tabanKazanc} ≠ ${r.oran.splitKazanc}`);
    if (!KISA) damga(`${ad}: ufukta bitti (Kat 2 + görev hattı)`, Number.isFinite(r.bitis) && Number.isFinite(r.hatBitis), `${r.bitis} · ${r.hatBitis}`);
  }
  if (FINAL) {
    const beklenenHat = bolunmus(ARA_UCLU).map((h) => `${h.id}:${h.reward}`);
    damga('FINAL: kat2UstaCarpan() = 1 + ESIT_PCT (aracın U-ESIT yüzdesi)', kat2UstaCarpan() === 1 + ESIT_PCT, `${kat2UstaCarpan()} ≠ ${1 + ESIT_PCT}`);
    for (const r of sonuc.values()) {
      const ad = `FINAL@U${r.k1Tavan}`;
      damga(`${ad}: config hattı = D-205 + B-UCLU (kimlik + ödül)`, JSON.stringify(r.hatIdler) === JSON.stringify(beklenenHat), r.hatIdler.join(','));
      damga(`${ad}: buyMaster('k2:…') her alımı kabul etti`, r.usta.every((x) => x.sv >= 0), r.usta.filter((x) => x.sv < 0).map((x) => x.id).join(','));
      damga(`${ad}: kat2Oran(…, mult) = kopya × mult (Usta'sız)`, Math.abs(r.oranKodFark) <= 1e-9, String(r.oranKodFark));
      const emu = EMU_IZ[r.k1Tavan];
      if (!KISA && emu) damga(`${ad}: parmak izi = emülasyon A+U-ESIT+B-UCLU (kod = emülasyon)`, r.iz === emu, `${r.iz} ≠ ${emu}`);
    }
  }
  const ko = al('KORUNUM', 0), ta0 = al('TABAN', 0);
  if (ko && ta0) damga('KORUNUM: kanca kimlik çarpanla parmak izi = TABAN', ko.iz === ta0.iz && ko.bitis === ta0.bitis, `${ko.iz} ≠ ${ta0.iz}`);
  for (const m of SENARYO) {
    const ta = al('TABAN', m);
    if (!ta) continue;
    for (const kol of KOLLAR) {
      if (kol.ad === 'TABAN' || kol.ad === 'KORUNUM') continue;
      const r = al(kol.ad, m);
      if (r && (!KISA || !gecEtkili(kol))) varyantDamgasi(`${kol.ad}@U${m}`, ta.iz, r.iz);
    }
  }

  console.log('');
  console.log('--- §5 PARMAK İZLERİ (emülasyon ↔ kod karşılaştırması: FINAL kipi) ---');
  for (const r of sonuc.values()) console.log(`${r.kol}@U${r.k1Tavan}: iz ${r.iz} · Kat 2 biter ${Number(r.bitis ?? NaN).toFixed(1)} sn · hat biter ${Number(r.hatBitis ?? NaN).toFixed(1)} sn · görev ödülü ${r.gorevOdul} · Usta ${r.usta.map((x) => x.id).join(',')}`);

  console.log('');
  console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn duvar saati)`);
  damgaOzeti();
}
