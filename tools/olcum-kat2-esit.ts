/**
 * olcum-kat2-esit.ts — "KAT 1'DE OLAN KAT 2'DE DE OLSUN" ölçümü (D-084 varyant kapısı · D-204).
 *
 * Kullanıcı 2026-11-18: "kat1de olan 2de de olsun". Tarama 2026-11-18'in dört kolu (README "Kullanıcı kararı bekleyenler" 1-3):
 *   1) XP: Kat 2 pad'i → `perPad` · masa Sv atlaması → `perUpgrade` · elle kahve → `perTeaServed` · garsonun kahvesi →
 *      `perWaiterServed` · oyuncunun yıkadığı fincan → `perDishWashed` (Kat 1 kuralı birebir; bulaşıkçınınki sayılmaz).
 *   2) Günlük görev + Hedefler: elle servis · garson servisi · para toplama (yığın) · yıkama · ocaktan alma Kat 1 sayaçlarıyla
 *      aynı metriğe sayılır (tost hariç). Arka plan Kat 2 tick'inde yalnız garson sayılır (Kat 1 garsonu da sayılıyor).
 *   3) Çevrimdışı Kat 2 oranı masa Sv çarpanlarını + lavabo L2-L6 / ocak yükseltmesini görür (`kat2EtkinAyar` + Sv).
 *   4) Çevrimdışı "İzle" eki Kat 1 kasa kesintisinden SONRA gösterilen tutardan: ek ≤ (claimMult − 1) × gösterilen.
 *
 * OYUNUN KENDİSİ koşar: bot `useGame` store'unu Kat 2'de sürer (Kat 1 arkada kendi garsonlarıyla işler, D-198 parası
 * cüzdana). Seviye ekranı çıkınca bot ödülü alır (izlemeden). Kollar:
 *   TABAN    — kod olduğu gibi (commit #1).
 *   K1-ESIT  — TABAN + aracın emülasyonu: XP/sayaçlar store durumunun kare farkından (pad · Sv · tepsi · garson tepsisi ·
 *              kirli · yığın), XP `xpBekleyen` yoluyla (oyunun tick dışı XP yolu); çevrimdışı aracın kol formülüyle.
 *   FİNAL    — `ESIT_FINAL=1`: kod uygulandıktan sonra (commit #2) kod olduğu gibi; emülasyon KAPALI. Damga K1-ESIT'e karşı.
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-esit.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-esit.ts > docs/olcum-kat2-esit.txt
 *   OLCUM=tam  ESIT_FINAL=1 npx tsx tools/olcum-kat2-esit.ts > docs/olcum-kat2-esit-final.txt
 * Mutasyon (araç): ESIT_MUT=xpyok (emülasyon XP vermez → varyant damgası kırılır) · ESIT_MUT=izlekes (araç formülü İzle'yi
 * kesmez → "kol: İzle ≤ gösterilen" damgası kırılır).
 */
import { KISA, botDamgasi, damga, damgaOzeti, izOlustur, kipBandi, kisaDeger, seedRandom, takilmaDamgasi, varyantDamgasi } from './olcum-lib';
import {
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
import { useGame, dailyCountersOf, dailyContextOf } from '../src/game/store';
import {
  KAT2_LAVABO_PAD,
  KAT2_MASALAR,
  KAT2_SV_MAX,
  KAT2_YIKAMA_YER,
  OCAK,
  OCAKLAR,
  VARIS,
  KAT2_KISI,
  kat2YolAgi,
  masaErisimde,
  type Kat2MasaYeri,
} from '../src/game/kat';
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
  type Kat2Ayar,
  type Kat2Dunya,
} from '../src/game/kat2Dongu';
import { kat2SvCanli } from '../src/game/kat2Gorev';
import { incomeRate } from '../src/game/rules';
import { collectionMult } from '../src/game/goals';
import { kasaSiniriOlcumden } from '../src/game/kasa';
import { availableTemplates, targetOf } from '../src/game/dailyQuests';
import { THE_SERVICE } from '../src/game/world';
import type { DailyCounters } from '../src/game/dailyQuests';
import type { PadDef } from '../src/config/economy.config';
import type { Vec3 } from '../src/game/types';

kipBandi();

const FINAL = process.env.ESIT_FINAL === '1';
const MUT = process.env.ESIT_MUT ?? '';
const DT = 0.1;
const UFUK = kisaDeger(16 * 3600, 1 * 3600);
const g = () => useGame.getState();
const CFG = C.kat2 as unknown as Kat2Ayar;
const X = C.xp;
const BASLANGIC_SEVIYE = 12;
const xpSeviyeBasi = (lv: number) => Array.from({ length: lv - 1 }, (_, i) => xpForLevel(i + 1)).reduce((a, b) => a + b, 0);

type Sayac = Pick<DailyCounters, 'served' | 'hand' | 'coins' | 'dishes' | 'pickup' | 'waiter'>;
const sifirSayac = (): Sayac => ({ served: 0, hand: 0, coins: 0, dishes: 0, pickup: 0, waiter: 0 });

// ---------------------------------------------------------------------------------------------
// BAŞLANGIÇ — Kat 1 görev hattı sonu (D-201 TUR 2 `kat1Izi(true)` ile aynı) + merdiven açık + Kat 2 varışı.
// Seviye: Kat 1 sonu varsayımı 12 (D-142 notu: 12 sa'te seviye 12) — iki kolda aynı.
// ---------------------------------------------------------------------------------------------
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
    stationLevels: s.stationLevels.map(() => 6),
    lavaboLevel: 6,
    waiterUpgrades: { ...s.waiterUpgrades, tray: C.waiter.trayUpgrades.costs.length, speed: waiterSpeedMaxTier(), dishCarry: dishCarryMaxTier(), dishSpeed: dishSpeedMaxTier() },
    questIndex: C.quests.length,
    questsDone: C.quests.map((q) => q.id),
    xp: xpSeviyeBasi(BASLANGIC_SEVIYE),
    xpBekleyen: 0,
    levelUp: null,
  } as never);
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3 });
  g().setKeyboardInput(0, 0);
}

// ---------------------------------------------------------------------------------------------
// K1-ESIT EMÜLASYONU — bir karenin store farkından Kat 2 olayları (yalnız oyuncu Kat 2'de; bot hep orada).
// ---------------------------------------------------------------------------------------------
interface Fark {
  pad: number;
  sv: number;
  elle: number;
  garson: number;
  yikanan: number;
  alinan: number;
  toplanan: number;
}
function fark(d0: Kat2Dunya, d1: Kat2Dunya, p0: number, p1: number, sv0: Record<string, number>, sv1: Record<string, number>): Fark {
  let sv = 0;
  for (const id of Object.keys(sv1)) sv += Math.max(0, (sv1[id] ?? 1) - (sv0[id] ?? 1));
  const gs = (d: Kat2Dunya) => [d.garson, ...(d.garsonEk ?? [])];
  const g0 = gs(d0);
  const g1 = gs(d1);
  let garson = 0;
  g1.forEach((w, i) => {
    const o = g0[i];
    if (w && o) garson += Math.max(0, o.tepsi - w.tepsi);
  });
  const ids = new Set(d1.paralar.map((p) => p.id));
  return {
    pad: Math.max(0, p1 - p0),
    sv,
    elle: Math.max(0, d0.tepsi - d1.tepsi),
    garson,
    yikanan: Math.max(0, (d0.tepsiKirli ?? 0) - (d1.tepsiKirli ?? 0)),
    alinan: Math.max(0, d1.tepsi - d0.tepsi),
    toplanan: d0.paralar.filter((p) => !ids.has(p.id)).length,
  };
}
const farkXp = (f: Fark) =>
  MUT === 'xpyok' ? 0 : f.pad * X.perPad + f.sv * X.perUpgrade + f.elle * X.perTeaServed + f.garson * X.perWaiterServed + f.yikanan * X.perDishWashed;

// ---------------------------------------------------------------------------------------------
// ÇEVRİMDIŞI — oyunun `onPlanaDon`u (TABAN/FİNAL) ve kolun formülü (K1-ESIT). Araç formülü kol kapalıyken oyunla birebir
// olmalı (damga) — yoksa kolun sayısı formülün değil aracın hatasıdır.
// ---------------------------------------------------------------------------------------------
/** Kol 3: `rules.kat2Oran` + masa Sv çarpanları + etkin ayar (lavabo L2-L6 · ocak). `esit` kapalıyken bugünkü formül. */
function kat2OranKol(padsDone: readonly string[], masaSv: Record<string, number>, yuk: Record<string, number> | undefined, esit: boolean): number {
  const a: Kat2Ayar = esit ? kat2EtkinAyar(CFG, yuk) : CFG;
  const ocak = padsDone.includes(OCAK.id);
  let oran = 0;
  for (const m of KAT2_MASALAR) {
    if (!padsDone.includes(m.id)) continue;
    const t = m.tur === 'tavla' ? a.tavla : a;
    if (!t) continue;
    const sv = esit ? masaSvOku(masaSv, m.id) : 1;
    const kol = a.masaSv?.[m.tur];
    const c = (d?: readonly number[]) => d?.[sv - 1] ?? 1;
    const oturum = t.oturum * c(kol?.oturumCarpan);
    const aralik = t.kahveAralik * c(kol?.kahveAralikCarpan);
    const istek = ocak ? Math.max(0, Math.floor((oturum - a.kahveSabir * 0.5) / aralik)) : 0;
    const lav = a.lavabo && padsDone.includes(KAT2_LAVABO_PAD) ? KAT2_KISI[m.tur] * a.lavabo.ugrama * a.lavabo.ucret : 0;
    oran += (t.masaUcreti * c(kol?.ucretCarpan) + istek * t.istekAdet * t.kahveFiyat * c(kol?.kahveFiyatCarpan) + lav) / (a.gelisAralik * c(kol?.gelisAralikCarpan) + a.yurume + oturum);
  }
  return oran;
}

interface Donus {
  taban: number;
  izle: number;
  /** Yalnız kol formülü: ham Kat 1 · ham Kat 2 · para tavanı · Kat 1 kesinti sınırı (Kat 2'de kapattıysa). */
  ayrinti?: { raw1: number; raw2: number; cap: number; sinir: number | null; oran2Dk: number };
}
function cevrimdisiKol(sn: number, kat: 1 | 2, esit: boolean): Donus {
  const s = g();
  let tip = 0;
  for (let i = 0; i < s.tables; i++) tip += C.tables.tipBase * (s.tableLevels[i] ?? 0);
  const rate = incomeRate(s.tables, s.stationLevels[THE_SERVICE], tip, s.lavaboLevel, collectionMult(s.goalsClaimed ?? []));
  const sure = Math.min(sn, C.offline.baseCapHours * 3600);
  const raw1 = Math.floor(rate * C.offline.rateMult * sure);
  const oran2 = kat2OranKol(s.kat2.padsDone, s.kat2.masaSv ?? {}, s.kat2.yuk, esit);
  const raw2 = Math.floor(oran2 * C.offline.rateMult * sure);
  const pads = C.pads as readonly PadDef[];
  const k2 = C.kat2.padler;
  const next = pads.find((p) => !p.optional && !s.padsDone.includes(p.id)) ?? k2.find((p) => !s.kat2.padsDone.includes(p.id));
  const cap = Math.floor((next ? next.cost : Math.max(...pads.map((p) => p.cost), ...k2.map((p) => p.cost))) * C.offline.capNextPadFrac);
  const raw = raw1 + raw2;
  const kazanc = Math.min(raw, cap);
  const kat1Pay = raw > 0 ? Math.floor((kazanc * raw1) / raw) : 0;
  let cuzdana = kazanc;
  const sinir = kat === 2 ? kasaSiniriOlcumden(s.kasaOlcum, C.kasa) : null;
  if (kat === 2 && kat1Pay > 0) {
    cuzdana = kazanc - kat1Pay + Math.floor(sinir === null ? kat1Pay : Math.min(kat1Pay, sinir.toNumber()));
  }
  const ham = Math.max(0, Math.min(raw * C.rewarded.claimMult, cap) - Math.min(raw, cap));
  const izle = esit && MUT !== 'izlekes' ? Math.min(ham, (C.rewarded.claimMult - 1) * cuzdana) : ham;
  return { taban: cuzdana, izle, ayrinti: { raw1, raw2, cap, sinir: sinir === null ? null : sinir.toNumber(), oran2Dk: oran2 * 60 } };
}

/** Oyunun kendi yolu: sıcak dönüş (`arkaPlanaGec` → `onPlanaDon`). Durum geri yüklenir. */
function cevrimdisiOyun(sn: number, kat: 1 | 2): Donus {
  const yedek = g();
  useGame.setState({ kat, gizlendiAt: Date.now() - sn * 1000, offlineEarned: 0, offlineIzleEki: 0 });
  g().onPlanaDon();
  const r = { taban: g().offlineEarned, izle: g().offlineIzleEki };
  useGame.setState(yedek, true);
  return r;
}

// ---------------------------------------------------------------------------------------------
// BOT — oyuncu Kat 2'de: satın alma (en ucuz açık hedef) > para > servis > yıkama > kahve al > kirli topla > bekle.
// ---------------------------------------------------------------------------------------------
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const YIKAMA: readonly [number, number] = [KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1] + 0.8];
const uz = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

interface Kosu {
  ad: string;
  zincir: number;
  sv: number;
  yuk: number;
  bitis: number;
  sev0: number;
  sev1: number;
  xp: number;
  seviyeOdul: number;
  seviyeSayi: number;
  sayac: Sayac;
  kat2Gelir: number;
  sure: number;
  yol: number;
  itme: number;
  iz: string;
  cevrim: { sn: number; kat: 1 | 2; oyun: Donus; kol: Donus }[];
  gunluk: { id: string; hedef: number; saatte: number }[];
}

function kos(ad: string, emule: boolean): Kosu {
  kur();
  const ZINCIR = C.kat2.padler.map((p) => p.id);
  const sev0 = levelProgress(g().xp).level;
  const xp0 = g().xp;
  const c0 = dailyCountersOf(g());
  const emu = sifirSayac();
  const izT = izOlustur();
  let zincir = NaN, sv = NaN, yuk = NaN;
  let seviyeOdul = 0, seviyeSayi = 0, kat2Gelir = 0, yol = 0, itme = 0, enUzun = 0;
  let t = 0;
  for (; t < UFUK; t += DT) {
    const s = g();
    if (s.levelUp) {
      seviyeOdul += s.levelUp.amount;
      seviyeSayi += 1;
      g().claimLevelUp(false);
    }
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
    if (!Number.isNaN(zincir) && !Number.isNaN(sv) && !Number.isNaN(yuk)) break;

    // Panel alımı (garson hız/tepsi): açık ve paraya yetiyorsa hemen (Kat 1 paneli deseni; yer yok).
    let alindi = false;
    for (const tur of ['garsonHiz', 'garsonTepsi'] as const) {
      const n = kat2YukSiradaki(CFG, padsDone, k2.yuk, tur);
      if (n?.acik && cuzdan >= n.fiyat) alindi = g().kat2GarsonYukAl(tur) || alindi;
    }
    if (alindi) continue;

    // Mekânsal hedefler: sıradaki pad · canlı Sv · ocak · lavabo — en ucuz kalan.
    const adaylar: { kalan: number; yer: readonly [number, number] }[] = [];
    const sp = kat2SiradakiPad(ayar, padsDone);
    if (sp) adaylar.push({ kalan: sp.cost - (d.padFill[sp.id] ?? 0), yer: kat2PadYeri(sp.id) });
    const svT = kat2SvCanliTetik(ayar, padsDone, masaSv, kat2SvCanli(k2, C.kat2Gorevler, CFG))[0];
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
    // Servis/kirli hedefinde erişime girince dur (masa noktası erişim kutusunun içinde).
    const masaHedefi = d.tepsi > 0 && bekleyen.some((m) => masaErisimde(yerOf(m.id), x, z));
    let ix = 0, iz = 0;
    if (hedef && !masaHedefi) {
      const L = uz([x, z], hedef);
      if (L > 0.15) {
        const [ax, az] = ag.nokta(x, z, hedef[0], hedef[1]);
        const la = Math.hypot(ax - x, az - z) || 1;
        const hiz = playerSpeedFor(s.charUpgrades.speed) * reputationCarryMult(levelProgress(s.xp).level);
        const k = Math.min(1, L / (hiz * DT)) / la;
        ix = (ax - x) * k;
        iz = (az - z) * k;
      }
    }
    g().setKeyboardInput(ix, iz);
    const p0 = padsDone.length;
    const l0 = s.lifetime.toNumber();
    g().tick(DT);
    const s1 = g();
    const adim = Math.hypot(s1.player[0] - x, s1.player[2] - z);
    yol += adim;
    itme = Math.hypot(ix, iz) > 0.1 && adim < 1e-4 ? itme + DT : 0;
    enUzun = Math.max(enUzun, itme);
    kat2Gelir += Math.max(0, s1.lifetime.toNumber() - l0);
    if (emule) {
      const f = fark(d, s1.kat2Dunya, p0, s1.kat2.padsDone.length, masaSv, s1.kat2.masaSv ?? {});
      const n = farkXp(f);
      if (n > 0) useGame.setState({ xp: s1.xp + n, xpBekleyen: s1.xpBekleyen + n });
      emu.hand += f.elle;
      emu.waiter += f.garson;
      emu.served += f.elle + f.garson;
      emu.dishes += f.yikanan;
      emu.pickup += f.alinan;
      emu.coins += f.toplanan;
    }
    if (Math.round(t / DT) % 50 === 0) izT.ekle(s1.wallet.toNumber(), s1.kat2.padsDone.length, s1.xp, s1.player[0], s1.player[2]);
  }
  const s = g();
  const c1 = dailyCountersOf(s);
  const sayac = sifirSayac();
  for (const k of Object.keys(sayac) as (keyof Sayac)[]) sayac[k] = c1[k] - c0[k] + emu[k];
  const saat = t / 3600;
  const gunluk = availableTemplates(dailyContextOf(s))
    .filter((q) => q.metric !== 'tost')
    .map((q) => {
      const ham = q.metric === 'earn' ? c1.earn - c0.earn : sayac[q.metric as keyof Sayac];
      return { id: q.id, hedef: targetOf(q, s.tables), saatte: ham / saat };
    });
  const cevrim: Kosu['cevrim'] = [];
  for (const kat of [2, 1] as const) {
    for (const sn of [600, 3600, 8 * 3600]) cevrim.push({ sn, kat, oyun: cevrimdisiOyun(sn, kat), kol: cevrimdisiKol(sn, kat, emule || FINAL) });
  }
  return {
    ad,
    zincir,
    sv,
    yuk,
    bitis: Math.max(zincir, sv, yuk),
    sev0,
    sev1: levelProgress(s.xp).level,
    xp: s.xp - xp0,
    seviyeOdul,
    seviyeSayi,
    sayac,
    kat2Gelir,
    sure: t,
    yol,
    itme: enUzun,
    iz: izT.deger,
    cevrim,
    gunluk,
  };
}

// ---------------------------------------------------------------------------------------------
// ÇALIŞTIR
// ---------------------------------------------------------------------------------------------
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const sa = (sn: number) => (Number.isFinite(sn) ? `${(sn / 3600).toFixed(2)} sa` : 'bitmedi');
const sure = (sn: number) => (sn >= 3600 ? `${sn / 3600} sa` : `${sn / 60} dk`);

const t0 = Date.now();
console.log('=== KAT 1\'DE OLAN KAT 2\'DE DE OLSUN (XP · günlük/Hedefler · çevrimdışı Sv/lavabo · İzle eki) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · dt ${DT} · ufuk ${UFUK / 3600} sa · ${FINAL ? 'FİNAL (kod, emülasyon kapalı)' : 'TABAN + K1-ESIT (emüle)'}${MUT ? ` · MUTASYON ${MUT}` : ''}`);
console.log(`Başlangıç: Kat 1 görev hattı sonu (ocak L6 · lavabo L6 · personel tavan) · karakter tavan · seviye ${BASLANGIC_SEVIYE} · Kat 2 ilk çıkış.`);
console.log(`XP: pad ${X.perPad} · yükseltme ${X.perUpgrade} · elle ${X.perTeaServed} · garson ${X.perWaiterServed} · yıkama ${X.perDishWashed} · görev ${X.perQuest} · seviye ödülü L≥${X.levelRewardFromLevel}: son ${X.levelRewardSec} sn kazancı`);

const kollar: Kosu[] = FINAL ? [kos('FİNAL (kod)', false)] : [kos('TABAN', false), kos('K1-ESIT', true)];
for (const k of kollar) {
  botDamgasi(k.ad, k.yol, k.sure / 60, 30);
  takilmaDamgasi(k.ad, k.itme, 30);
}

console.log('');
console.log('--- §1 İLERLEME — Kat 2 ilk çıkıştan bitişe (zincir + bütün masalar Sv5 + ocak/lavabo/garson yükseltmeleri) ---');
console.log('kol          | zincir biter | KAT 2 BİTER | seviye (baş → son) | XP kazanılan | seviye atlama | seviye ödülü coin | Kat 2 süresince kazanç (iki kat)');
for (const k of kollar) {
  console.log(
    `${k.ad.padEnd(13)}| ${sa(k.zincir).padStart(12)} | ${sa(k.bitis).padStart(11)} | ${`${k.sev0} → ${k.sev1}`.padStart(18)} | ${f0(k.xp).padStart(12)} | ${String(k.seviyeSayi).padStart(13)} | ${f0(k.seviyeOdul).padStart(17)} | ${f0(k.kat2Gelir).padStart(10)}`,
  );
}

console.log('');
console.log('--- §2 GÜNLÜK GÖREV SAYAÇLARI — Kat 2\'de oynanan saat başına (Kat 1 arkada) ---');
console.log('kol          | servis/sa | elle/sa | para/sa | yıkama/sa | ocaktan/sa | garson/sa');
for (const k of kollar) {
  const h = k.sure / 3600;
  const v = k.sayac;
  console.log(`${k.ad.padEnd(13)}| ${f0(v.served / h).padStart(9)} | ${f0(v.hand / h).padStart(7)} | ${f0(v.coins / h).padStart(7)} | ${f0(v.dishes / h).padStart(9)} | ${f0(v.pickup / h).padStart(10)} | ${f0(v.waiter / h).padStart(9)}`);
}
console.log('Görev (hedef, Kat 1 masa sayısına ölçekli) → Kat 2\'de bitme süresi (dk):');
for (const k of kollar) console.log(`${k.ad.padEnd(13)}| ${k.gunluk.map((q) => `${q.id} ${q.hedef}: ${q.saatte > 0 ? f0((60 * q.hedef) / q.saatte) : '∞'}`).join(' · ')}`);
const elmas = (k: Kosu) => {
  const biten = k.gunluk.filter((q) => q.saatte >= q.hedef).length;
  return { biten, n: k.gunluk.length, gun: (C.dailyQuests.diamondsPerDay * biten) / k.gunluk.length };
};
console.log(`💎 akışı — 1 sa Kat 2 oyununda biten görev payı × günlük ${C.dailyQuests.diamondsPerDay} 💎:`);
for (const k of kollar) {
  const e = elmas(k);
  console.log(`${k.ad.padEnd(13)}| ${e.biten}/${e.n} görev 1 sa içinde → beklenen ${f1(e.gun)} 💎/gün`);
}

console.log('');
console.log('--- §3 ÇEVRİMDIŞI DÖNÜŞ — Kat 2 bitmiş (koşunun son durumu); taban = ekranda gösterilen/cüzdana · İzle = ek ---');
console.log('kol          | kapattığı kat | yokluk | oyun taban | oyun İzle eki | kol taban | kol İzle eki | İzle / taban (kol)');
for (const k of kollar) {
  for (const c of k.cevrim) {
    console.log(
      `${k.ad.padEnd(13)}| ${String(c.kat).padStart(13)} | ${sure(c.sn).padStart(6)} | ${f0(c.oyun.taban).padStart(10)} | ${f0(c.oyun.izle).padStart(13)} | ${f0(c.kol.taban).padStart(9)} | ${f0(c.kol.izle).padStart(12)} | ${c.kol.taban > 0 ? `${(c.kol.izle / c.kol.taban).toFixed(2)}×` : '—'}`,
    );
  }
}

console.log('');
console.log('--- §3b ÇEVRİMDIŞI AYRINTI (kol formülü) — ham Kat 1 · ham Kat 2 (rateMult sonrası) · para tavanı · Kat 1 kesinti sınırı ---');
console.log('kol          | kat | yokluk | Kat 2 oran coin/dk (rateMult öncesi) | ham Kat 1 | ham Kat 2 | tavan | Kat 1 sınırı');
for (const k of kollar) {
  for (const c of k.cevrim) {
    const a = c.kol.ayrinti!;
    console.log(`${k.ad.padEnd(13)}| ${String(c.kat).padStart(3)} | ${sure(c.sn).padStart(6)} | ${f0(a.oran2Dk).padStart(36)} | ${f0(a.raw1).padStart(9)} | ${f0(a.raw2).padStart(9)} | ${f0(a.cap).padStart(5)} | ${a.sinir === null ? '—' : f0(a.sinir)}`);
  }
}

// ---- DAMGALAR
const taban = kollar[0];
if (!FINAL) {
  const kol = kollar[1];
  varyantDamgasi('K1-ESIT ilerleme', taban.iz, kol.iz);
  damga('araç çevrimdışı formülü = oyun (TABAN)', taban.cevrim.every((c) => c.oyun.taban === c.kol.taban && c.oyun.izle === c.kol.izle),
    taban.cevrim.filter((c) => c.oyun.taban !== c.kol.taban || c.oyun.izle !== c.kol.izle).map((c) => `${c.kat}/${c.sn}`).join(','));
  damga('kol: İzle ≤ (claimMult − 1) × gösterilen', kol.cevrim.every((c) => c.kol.izle <= (C.rewarded.claimMult - 1) * c.kol.taban + 1e-9));
  damga('kol: XP TABAN\'dan fazla', kol.xp > taban.xp, `${kol.xp} ≤ ${taban.xp}`);
  damga('TABAN: Kat 2 elle servisi günlük sayaca girmiyor (tarama #7)', taban.sayac.hand === 0, `${taban.sayac.hand}`);
} else {
  // commit #1'in tam koşusu (docs/olcum-kat2-esit.txt) K1-ESIT satırları — kod kolu birebir uygulamalı.
  const K = { bitis: Number(process.env.ESIT_K_BITIS ?? NaN), xp: Number(process.env.ESIT_K_XP ?? NaN) };
  const f = kollar[0];
  damga('FİNAL: çevrimdışı oyun = kol formülü (birebir)', f.cevrim.every((c) => c.oyun.taban === c.kol.taban && c.oyun.izle === c.kol.izle),
    f.cevrim.filter((c) => c.oyun.taban !== c.kol.taban || c.oyun.izle !== c.kol.izle).map((c) => `${c.kat}/${c.sn}`).join(','));
  if (Number.isFinite(K.bitis)) damga('FİNAL: Kat 2 süresi = K1-ESIT (± %3)', Math.abs(f.bitis / 3600 - K.bitis) <= 0.03 * K.bitis, sa(f.bitis));
  if (Number.isFinite(K.xp)) damga('FİNAL: XP = K1-ESIT (± %3)', Math.abs(f.xp - K.xp) <= 0.03 * K.xp, f0(f.xp));
  damga('FİNAL: Kat 2 elle servisi günlük sayaca giriyor', f.sayac.hand > 0, `${f.sayac.hand}`);
}
if (!KISA) damga('bütün kollar ufukta bitti', kollar.every((k) => Number.isFinite(k.bitis)), kollar.filter((k) => !Number.isFinite(k.bitis)).map((k) => k.ad).join(','));

console.log('');
console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
damgaOzeti();
