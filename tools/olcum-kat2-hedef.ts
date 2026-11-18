/**
 * olcum-kat2-hedef.ts — HEDEFLER'İN "MEKÂN" VE "USTA" METRİKLERİ KAT 2'Yİ DE SAYSIN MI? (D-084 varyant kapısı · D-205).
 *
 * Kullanıcı 2026-11-18: "kat1de olan 2de de olsun" + "eklemek mantıklıysa ekle". D-204 Kat 2 servis/yıkama sayaçlarını
 * Hedefler'e ekledi; "Mekân" (`pads`) ve "Usta" (`masterTables`) Kat 1'de kaldı (`docs/kat2-kat1-esit-raporu.md` sonu).
 * Hedef ödülü KALICI gelir çarpanıdır (D-089/D-090: 25 kademe × %0,4) → Kat 1 gelirine biner → ölçülür.
 *
 * Kollar:
 *   TABAN     — kod olduğu gibi (`goalMetricsOf` yalnız Kat 1).
 *   HEDEF-K2  — TABAN + aracın emülasyonu: Mekân += merdiven pad'i (ücretli, Kat 1 `padsDone`unda YOK) + Kat 2'nin ücretli
 *               pad'leri (`kat2.hazir` HARİÇ — Kat 1'in bedava başlangıç masası da sayılmıyor); Usta += Kat 2'de Sv tavanındaki
 *               açık masa (hazır masa dahil — Kat 1'in başlangıç masası da Usta'ya sayılıyor). Bot toplanabilir hedefi hemen
 *               toplar; emülasyonda ödül `claimGoalReward` (oyunun tek karar yeri) + store'un yaptığının aynısı (💎 · XP).
 *   FİNAL     — `HEDEF_FINAL=1`: kod uygulandıktan sonra (commit #2) kod olduğu gibi; emülasyon KAPALI.
 *
 * Başlangıç (iki kolda aynı): D-204 aracıyla aynı Kat 1 görev hattı sonu + karakter tavan + seviye 12 + Kat 2 ilk çıkış.
 * Hedeflerde "Servis · Kazanç · Temizlik" Kat 1 sonunda bitmiş varsayılır (sayaçlar son kademeye konur, iki kolda aynı) —
 * kollar yalnız Mekân/Usta'da ayrışsın. Kat 1 masa seviyesi bilinmiyor → iki senaryo: L0 (alt sınır, D-201 TUR 2) ve
 * L4 (18 masanın hepsi tavanda, üst sınır).
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-hedef.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-hedef.ts > docs/olcum-kat2-hedef.txt
 *   OLCUM=tam  HEDEF_FINAL=1 npx tsx tools/olcum-kat2-hedef.ts > docs/olcum-kat2-hedef-final.txt
 * Mutasyon (araç): HEDEF_MUT=usta (emülasyon Usta'yı saymaz → varyant damgası kırılır) · HEDEF_MUT=hazir (hazır pad'ler de
 * sayılır → "kol formülü: hazır pad sayılmaz" damgası kırılır).
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
import { useGame, goalMetricsOf, tableSoftMaxLevel } from '../src/game/store';
import { KAT2_MASALAR, KAT2_SV_MAX, KAT2_YIKAMA_YER, OCAKLAR, VARIS, kat2YolAgi, masaErisimde, type Kat2MasaYeri } from '../src/game/kat';
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
} from '../src/game/kat2Dongu';
import { kat2SvCanli } from '../src/game/kat2Gorev';
import { claimGoalReward, claimableGoals, collectionMult, goalCategories, type GoalMetrics } from '../src/game/goals';
import { D } from '../src/game/decimal';
import type { Vec3 } from '../src/game/types';

kipBandi();

const FINAL = process.env.HEDEF_FINAL === '1';
const MUT = process.env.HEDEF_MUT ?? '';
const DT = 0.1;
const UFUK = kisaDeger(16 * 3600, 1 * 3600);
const g = () => useGame.getState();
const CFG = C.kat2 as unknown as Kat2Ayar;
const HAZIR: readonly string[] = C.kat2.hazir;
const BASLANGIC_SEVIYE = 12;
const xpSeviyeBasi = (lv: number) => Array.from({ length: lv - 1 }, (_, i) => xpForLevel(i + 1)).reduce((a, b) => a + b, 0);
const KAT = goalCategories();
const sonKademe = (metric: string) => KAT.find((k) => k.metric === metric)!.tiers.at(-1)!;

// ---------------------------------------------------------------------------------------------
// KOL FORMÜLÜ — aracın kendi hesabı (kodun `goalMetricsOf`undan bağımsız; FİNAL'de ikisi birebir olmalı).
// ---------------------------------------------------------------------------------------------
type Durum = ReturnType<typeof g>;
function kolMetrik(s: Durum, esit: boolean): GoalMetrics {
  const m = goalMetricsOf({ stats: s.stats, padsDone: s.padsDone, lifetime: s.lifetime, tableLevels: s.tableLevels, tables: s.tables });
  if (!esit) return m;
  const k2 = s.kat2;
  const ucretli = k2.padsDone.filter((id) => MUT === 'hazir' || !HAZIR.includes(id)).length;
  const usta = MUT === 'usta' ? 0 : KAT2_MASALAR.filter((t) => k2.padsDone.includes(t.id) && masaSvOku(k2.masaSv, t.id) >= KAT2_SV_MAX).length;
  return { ...m, pads: m.pads + (k2.acik ? 1 + ucretli : 0), masterTables: m.masterTables + usta };
}

/** Toplanabilir bütün hedefleri toplar; toplanan kimlikleri döndürür. TABAN/FİNAL: oyunun `claimGoal`u. */
function topla(esit: boolean): string[] {
  const alinan: string[] = [];
  for (;;) {
    const s = g();
    const ids = claimableGoals(esit ? kolMetrik(s, true) : goalMetricsOf(s), s.goalsClaimed);
    if (!ids.length) return alinan;
    for (const id of ids) {
      if (esit) {
        const s1 = g();
        const odul = claimGoalReward(id, kolMetrik(s1, true), s1.goalsClaimed);
        if (!odul) continue;
        useGame.setState({
          goalsClaimed: [...s1.goalsClaimed, id],
          diamonds: s1.diamonds.add(odul.diamonds),
          xp: s1.xp + C.xp.perQuest,
          xpBekleyen: s1.xpBekleyen + C.xp.perQuest,
        });
        alinan.push(id);
      } else if (g().claimGoal(id)) alinan.push(id);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// BAŞLANGIÇ — D-204 aracının `kur()`u + Hedefler (Servis/Kazanç/Temizlik bitmiş) + Kat 1 masa seviyesi senaryosu.
// ---------------------------------------------------------------------------------------------
/** `k1Tavan`: Kat 1'in ilk kaç masası tavan seviyede (kalanı L0). */
function kur(k1Tavan: number, esit: boolean): void {
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
  topla(esit);
  // Başlangıç toplamasının XP'si ölçüme girmesin (iki kolda aynı seviyeden başlansın).
  useGame.setState({ xp: xpSeviyeBasi(BASLANGIC_SEVIYE), xpBekleyen: 0, levelUp: null });
  g().setKeyboardInput(0, 0);
}

// ---------------------------------------------------------------------------------------------
// BOT — D-204 aracının botu birebir: satın alma (en ucuz açık hedef) > para > servis > yıkama > kahve al > kirli topla.
// ---------------------------------------------------------------------------------------------
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const YIKAMA: readonly [number, number] = [KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1] + 0.8];
const uz = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

interface Kosu {
  ad: string;
  k1Tavan: number;
  zincir: number;
  bitis: number;
  sure: number;
  /** Başlangıçta toplanmış kademe sayısı (kategori başına) ve Kat 2 süresince toplananlar (zamanıyla). */
  bas: Record<string, number>;
  kat2de: { id: string; sa: number }[];
  carpan0: number;
  carpan1: number;
  kat1Akis: number;
  kat2Gelir: number;
  metrik: GoalMetrics;
  kodMetrik: GoalMetrics;
  /** Sonda: ücretli Kat 2 pad'i (hazır hariç) · Sv tavanındaki Kat 2 masası — kol formülünden bağımsız sayım. */
  k2Ucretli: number;
  k2Usta: number;
  elmas: number;
  xp: number;
  yol: number;
  itme: number;
  iz: string;
}

function kos(ad: string, k1Tavan: number, esit: boolean): Kosu {
  kur(k1Tavan, esit);
  const ZINCIR = C.kat2.padler.map((p) => p.id);
  const bas: Record<string, number> = {};
  for (const k of KAT) bas[k.id] = g().goalsClaimed.filter((id) => id.startsWith(`${k.id}:`)).length;
  const carpan0 = collectionMult(g().goalsClaimed);
  const elmas0 = g().diamonds.toNumber();
  const xp0 = g().xp;
  const kat2de: Kosu['kat2de'] = [];
  const izT = izOlustur();
  let zincir = NaN, sv = NaN, yuk = NaN;
  let kat1Akis = 0, kat2Gelir = 0, yol = 0, itme = 0, enUzun = 0;
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
    if (zincirBitti && Number.isNaN(zincir)) zincir = t;
    const acikMasa = KAT2_MASALAR.filter((m) => padsDone.includes(m.id));
    if (zincirBitti && Number.isNaN(sv) && acikMasa.every((m) => masaSvOku(masaSv, m.id) >= KAT2_SV_MAX)) sv = t;
    const yukKalan = (['ocak', 'lavabo', 'garsonHiz', 'garsonTepsi'] as const).filter((tur) => kat2YukSiradaki(CFG, padsDone, k2.yuk, tur));
    if (zincirBitti && Number.isNaN(yuk) && !yukKalan.length) yuk = t;
    if (!Number.isNaN(zincir) && !Number.isNaN(sv) && !Number.isNaN(yuk)) break;

    if (Math.round(t / DT) % 10 === 0) for (const id of topla(esit)) kat2de.push({ id, sa: t / 3600 });

    let alindi = false;
    for (const tur of ['garsonHiz', 'garsonTepsi'] as const) {
      const n = kat2YukSiradaki(CFG, padsDone, k2.yuk, tur);
      if (n?.acik && cuzdan >= n.fiyat) alindi = g().kat2GarsonYukAl(tur) || alindi;
    }
    if (alindi) continue;

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
    const l0 = s.lifetime.toNumber();
    const a0 = s.kat1Akis;
    g().tick(DT);
    const s1 = g();
    const adim = Math.hypot(s1.player[0] - x, s1.player[2] - z);
    yol += adim;
    itme = Math.hypot(ix, iz) > 0.1 && adim < 1e-4 ? itme + DT : 0;
    enUzun = Math.max(enUzun, itme);
    const akis = Math.max(0, s1.kat1Akis - a0);
    kat1Akis += akis;
    kat2Gelir += Math.max(0, s1.lifetime.toNumber() - l0 - akis);
    if (Math.round(t / DT) % 50 === 0) izT.ekle(s1.wallet.toNumber(), s1.kat2.padsDone.length, s1.xp, s1.player[0], s1.player[2], collectionMult(s1.goalsClaimed));
  }
  for (const id of topla(esit)) kat2de.push({ id, sa: t / 3600 });
  const s = g();
  return {
    ad,
    k1Tavan,
    zincir,
    bitis: Math.max(zincir, sv, yuk),
    sure: t,
    bas,
    kat2de,
    carpan0,
    carpan1: collectionMult(s.goalsClaimed),
    kat1Akis,
    kat2Gelir,
    metrik: kolMetrik(s, esit || FINAL),
    kodMetrik: goalMetricsOf(s),
    k2Ucretli: C.kat2.padler.filter((p) => s.kat2.padsDone.includes(p.id)).length,
    k2Usta: Object.entries(s.kat2.masaSv ?? {}).filter(([id, v]) => v >= KAT2_SV_MAX && s.kat2.padsDone.includes(id)).length,
    elmas: s.diamonds.toNumber() - elmas0,
    xp: s.xp - xp0,
    yol,
    itme: enUzun,
    iz: izT.deger,
  };
}

// ---------------------------------------------------------------------------------------------
// ÇALIŞTIR
// ---------------------------------------------------------------------------------------------
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const sa = (sn: number) => (Number.isFinite(sn) ? `${(sn / 3600).toFixed(2)} sa` : 'bitmedi');
const yuzde = (m: number) => `+%${((m - 1) * 100).toFixed(1)}`;

/** Kat 1 masa sayısı (bütün pad'ler açıkken) — `kur()` ile ölçülür. */
kur(0, false);
const K1_MASA = g().tables;
const t0 = Date.now();
console.log('=== HEDEFLER: MEKÂN + USTA KAT 2\'Yİ DE SAYSIN (D-205) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · dt ${DT} · ufuk ${UFUK / 3600} sa · ${FINAL ? 'FİNAL (kod, emülasyon kapalı)' : 'TABAN + HEDEF-K2 (emüle)'}${MUT ? ` · MUTASYON ${MUT}` : ''}`);
console.log(`Başlangıç: Kat 1 görev hattı sonu · karakter tavan · seviye ${BASLANGIC_SEVIYE} · Kat 2 ilk çıkış · Servis/Kazanç/Temizlik bitmiş · Kat 1'de tavandaki (L${tableSoftMaxLevel()}) masa sayısı senaryo, kalanı L0.`);
console.log(`Hedef: ${C.goals.categories.length} kategori × kademe · kademe başına kalıcı gelir +%${((C.goals.incomeBonusTotal / KAT.reduce((a, k) => a + k.tiers.length, 0)) * 100).toFixed(2)} · Mekân [${KAT.find((k) => k.id === 'space')!.tiers.join('·')}] · Usta [${KAT.find((k) => k.id === 'master')!.tiers.join('·')}] · Kat 1 pad ${C.pads.length} · Kat 1 masa ${K1_MASA} · Kat 2 masa ${KAT2_MASALAR.length}`);

const SENARYO = [0, Math.round(K1_MASA / 2), K1_MASA];
const kollar: Kosu[] = [];
for (const m of SENARYO) {
  if (FINAL) kollar.push(kos(`FİNAL·U${m}`, m, false));
  else kollar.push(kos(`TABAN·U${m}`, m, false), kos(`HEDEF-K2·U${m}`, m, true));
}
for (const k of kollar) {
  botDamgasi(k.ad, k.yol, k.sure / 60, 30);
  takilmaDamgasi(k.ad, k.itme, 30);
}

console.log('');
console.log('--- §1 İLERLEME — Kat 2 ilk çıkıştan bitişe (zincir + bütün masalar Sv5 + yükseltmeler) ---');
console.log('kol            | zincir biter | KAT 2 BİTER | XP kazanılan | 💎 (hedeflerden) | Kat 1 arka plan coin/dk | Kat 2 coin/dk');
for (const k of kollar) {
  const dk = k.sure / 60;
  console.log(`${k.ad.padEnd(15)}| ${sa(k.zincir).padStart(12)} | ${sa(k.bitis).padStart(11)} | ${f0(k.xp).padStart(12)} | ${f0(k.elmas).padStart(16)} | ${f0(k.kat1Akis / dk).padStart(23)} | ${f0(k.kat2Gelir / dk).padStart(13)}`);
}

console.log('');
console.log('--- §2 HEDEFLER — kategori başına toplanan kademe: başta → Kat 2 sonunda (Kat 2 süresince toplanan, saatiyle) ---');
console.log('kol            | ' + KAT.map((c) => c.name.padEnd(9)).join(' | ') + ' | metrik sonda: Mekân · Usta | kalıcı çarpan baş → son');
for (const k of kollar) {
  const hucre = KAT.map((c) => `${k.bas[c.id]} → ${k.bas[c.id] + k.kat2de.filter((x) => x.id.startsWith(`${c.id}:`)).length}`.padEnd(9)).join(' | ');
  console.log(`${k.ad.padEnd(15)}| ${hucre} | ${`${k.metrik.pads} · ${k.metrik.masterTables}`.padStart(26)} | ${yuzde(k.carpan0)} → ${yuzde(k.carpan1)}`);
}
console.log('Kat 2 süresince toplanan kademeler (kimlik @ saat):');
for (const k of kollar) console.log(`${k.ad.padEnd(15)}| ${k.kat2de.length ? k.kat2de.map((x) => `${x.id} @ ${x.sa.toFixed(2)}`).join(' · ') : '—'}`);

// ---- DAMGALAR
for (const k of kollar) {
  const kat1 = { pads: C.pads.length, usta: k.k1Tavan };
  if (FINAL) {
    damga(`${k.ad}: kod metriği = kol formülü`, k.kodMetrik.pads === k.metrik.pads && k.kodMetrik.masterTables === k.metrik.masterTables,
      `kod ${k.kodMetrik.pads}·${k.kodMetrik.masterTables} ≠ kol ${k.metrik.pads}·${k.metrik.masterTables}`);
  } else if (k.ad.startsWith('TABAN')) {
    damga(`${k.ad}: Mekân/Usta yalnız Kat 1`, k.kodMetrik.pads === kat1.pads && k.kodMetrik.masterTables === kat1.usta, `${k.kodMetrik.pads}·${k.kodMetrik.masterTables}`);
  } else {
    damga(`${k.ad}: kol formülü — merdiven + ücretli Kat 2 pad'i (hazır hariç)`, k.metrik.pads === kat1.pads + 1 + k.k2Ucretli, `${k.metrik.pads} ≠ ${kat1.pads + 1 + k.k2Ucretli}`);
    damga(`${k.ad}: kol formülü — Usta += Sv${KAT2_SV_MAX} Kat 2 masası`, k.metrik.masterTables === kat1.usta + k.k2Usta, `${k.metrik.masterTables} ≠ ${kat1.usta + k.k2Usta}`);
  }
}
if (!FINAL) {
  for (const m of SENARYO) {
    const ta = kollar.find((k) => k.ad === `TABAN·U${m}`)!;
    const kol = kollar.find((k) => k.ad === `HEDEF-K2·U${m}`)!;
    // Kat 1 masaları Usta'yı başta bitirmişse (U20: 20 masa ≥ son kademe) kolun değiştireceği kademe YOK → iz aynı olmalı.
    const ustaDolu = kol.bas.master >= KAT.find((k) => k.id === 'master')!.tiers.length;
    if (!KISA) {
      if (ustaDolu) damga(`HEDEF-K2·U${m}: Usta başta dolu → kol etkisiz`, ta.iz === kol.iz && !kol.kat2de.length, `${kol.kat2de.length} kademe`);
      else varyantDamgasi(`HEDEF-K2·U${m}`, ta.iz, kol.iz);
    }
  }
} else {
  // HEDEF_K="u0:sa,u10:sa,u20:sa" — commit #1 tam koşusunun HEDEF-K2 Kat 2 bitiş saatleri.
  const K = new Map((process.env.HEDEF_K ?? '').split(',').filter(Boolean).map((x) => { const [u, v] = x.split(':'); return [Number(u.slice(1)), Number(v)] as const; }));
  for (const k of kollar) {
    const beklenen = K.get(k.k1Tavan);
    if (beklenen !== undefined) damga(`${k.ad}: Kat 2 süresi = HEDEF-K2 (± %3)`, Math.abs(k.bitis / 3600 - beklenen) <= 0.03 * beklenen, sa(k.bitis));
  }
}
if (!KISA) damga('bütün kollar ufukta bitti', kollar.every((k) => Number.isFinite(k.bitis)), kollar.filter((k) => !Number.isFinite(k.bitis)).map((k) => k.ad).join(','));

console.log('');
console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
damgaOzeti();
