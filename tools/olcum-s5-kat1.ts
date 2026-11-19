/**
 * olcum-s5-kat1.ts — S5 G-92: Kat 1 TEPSİ yükseltmesinin ilk fiyatı 30 → 25 + "yetmiyorsa göstermeden tamamla" (D-084 varyant kapısı).
 *
 * Kullanıcı (oyun testi 2026-11-20): *"Tepsi yükseltmesinin İLK fiyatı 30 → 25; param her zaman ona yetsin, yetmiyorsa göstermeden
 * tamamlasın."* İki ayrı kaldıraç → ayrı satırlar:
 *   TABAN      bugünkü oyun (q_charTray1 · `character.tray.costs[0]` = 30, panel düğmesi parası yetince alır).
 *   F25        ilk kademe 25.
 *   F25·X80    F25 + görev q_charTray1'deyken cüzdan ≥ %80 × fiyat ise düğme alımı TAMAMLAR (cüzdan sıfırlanır, kalanı bağışlanır).
 *   F25·X60    aynı, eşik %60.
 *
 * İKİ ÖLÇER, aynı kollar:
 *   (1) GERÇEK TICK — oyunun kendi `tick()`i başsız, T9b oyun botu (`tools/olcum-tabela-f4c3.ts`in `decide/steer`ı birebir) görev hattını
 *       sıfırdan oynar. Rastgelelik (müşteri gelişi) var → birden çok tohum. Ölçüt D-079 üçlüsü: ilk alım < 90 sn · GARSONA KADAR
 *       en uzun alım boşluğu ≤ 2 dk · otomasyon (garson pad'i) < 15 dk. Ek: q_charTray1 açıldığı an cüzdan, görevin bekleme süresi.
 *   (2) MODEL — `tools/simulate.ts olcutler()` (D-079'un resmî bekçisi, İDEALİZE profil). Model biriktiren oyuncudur: "%X'te tamamla"
 *       onda fiyat = X × 25 ile birebir aynıdır (oyuncu tam X × fiyat biriktirdiği an alır, cüzdan sıfırlanır).
 *
 * Emülasyon: fiyat `C.character.tray.costs[0]` bellekte değişir (config dosyası değişmez); X kuralı botun panel alım satırında
 * (cüzdan geçici olarak fiyata çekilir, `buyCharUpgrade` kendi yolundan alır → xp/kayıt oyunun kodu).
 *
 * Koşu:  npx tsx tools/olcum-s5-kat1.ts                                   (kısa — yön, rapora girmez)
 *        OLCUM=tam npx tsx tools/olcum-s5-kat1.ts > docs/olcum-s5-kat1.txt
 * Mutasyon (MUT=): x0 — X kuralı hiç uygulanmaz → "varyant etkili (F25·X80/X60)" ya da "X kuralı tetiklendi" kırılır.
 */
import { KISA, botDamgasi, damga, damgaOzeti, izOlustur, kipBandi, kisaDeger, seedRandom, varyantDamgasi } from './olcum-lib';
import { useGame, LAYOUT, servicePlace, visiblePads } from '../src/game/store';
import { questFocusPos, tableUpgradeTarget, gateOf } from '../src/game/rules';
import { getNavGrid } from '../src/game/layout';
import { findNavPath } from '../src/game/nav';
import { economyConfig as C } from '../src/config/economy.config';
import { D } from '../src/game/decimal';
import { olcutler, milestoneTazele, onbellekTemizle } from './simulate';

const MUT = process.env.MUT ?? '';
const DT = 0.1;
const SURE_SN = kisaDeger(20 * 60, 12 * 60);
const TOHUMLAR = KISA ? [1, 2] : [1, 2, 3, 4, 5, 6, 7, 8];
const TRAY = C.character.tray as unknown as { costs: number[] };
const FIYAT0 = TRAY.costs[0];
const Q_TEPSI = C.quests.findIndex((q) => q.id === 'q_charTray1');

interface Kol { ad: string; fiyat: number; x: number | null }
const KOLLAR: Kol[] = [
  { ad: 'TABAN', fiyat: FIYAT0, x: null },
  { ad: 'F25', fiyat: 25, x: null },
  { ad: 'F25·X80', fiyat: 25, x: 0.8 },
  { ad: 'F25·X60', fiyat: 25, x: 0.6 },
  /** Başvuru: "her zaman yetsin" — görev açıldığı an cüzdan (11) fiyatın %44'ü; %40 eşik = görev açılır açılmaz tamamlanır. */
  { ad: 'F25·X40', fiyat: 25, x: 0.4 },
];

// ---------------------------------------------------------------------------------------------
//  BOT — `tools/olcum-tabela-f4c3.ts` decide/steer birebir (T9b oyun botu); tek fark panel alım satırındaki X kuralı.
// ---------------------------------------------------------------------------------------------
type V3 = readonly [number, number, number] | number[];
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[2] - b[2]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S = any;
const seatOf = (n: S) => {
  const t = LAYOUT.tables[n.tableIndex] as S;
  return (t.seats && t.seats[n.seatIndex]) || t.seat;
};

let xKural: number | null = null;
let bagis = 0;
let xTetik = 0;

function panelAl(s: S, stat: string): void {
  if (stat === 'tray' && s.charUpgrades.tray === 0 && xKural != null && MUT !== 'x0') {
    const cost = TRAY.costs[0];
    const w = s.wallet.toNumber();
    if (w < cost && w >= xKural * cost) {
      bagis += cost - w;
      xTetik += 1;
      useGame.setState({ wallet: D(cost) } as never);
      useGame.getState().buyCharUpgrade('tray');
      return;
    }
  }
  s.buyCharUpgrade(stat);
}

function decide(s: S): { pos: V3; why: string; stand: boolean } {
  const q = C.quests[s.questIndex] as S;
  const tgt = q ? q.target : null;
  const p = s.player;
  const place = servicePlace(s.areasOpen);
  const trayN = s.tray + s.trayFood;
  const dirtyN = s.carriedDirty + (s.carriedDirtyFood || 0);
  const waiting = s.npcs.filter((n: S) => n.state === 'waitingForTea');
  const off = [place.pickup[0] - place.station[0], 0, place.pickup[2] - place.station[2]];
  const k = 0.8;
  const dishFront = [place.dish[0] + off[0] * k, 0, place.dish[2] + off[2] * k];
  const pick = [place.station[0] + off[0] * k, 0, place.station[2] + off[2] * k];
  if (tgt && tgt.type === 'charStat') panelAl(s, tgt.stat);
  if (tgt && tgt.type === 'waiterTray') s.buyWaiterTray();
  if (tgt && tgt.type === 'waiterSpeed') s.buyWaiterSpeed();
  let focus: V3 | null = q
    ? questFocusPos(tgt, s.tableLevels, s.tables, s.areasOpen, q.area ?? 0, tableUpgradeTarget(gateOf(s)))
    : null;
  if (tgt && (tgt.type === 'tableLevel' || tgt.type === 'tablesAtLevel')) {
    const lt = tableUpgradeTarget(gateOf(s));
    if (lt != null && LAYOUT.tables[lt]) focus = LAYOUT.tables[lt].upgradeSpot;
  }
  const standTypes = ['pad', 'stationLevel', 'lavaboLevel', 'tableLevel', 'tablesAtLevel'];
  if (focus && standTypes.includes(tgt.type) && trayN === 0 && dirtyN === 0) {
    const gate = {
      padsDone: s.padsDone, tables: s.tables, stationLevel: s.stationLevels[0], lifetime: s.lifetime.toNumber(),
      waiterServed: s.stats.waiterServed, waiterServedByService: s.stats.waiterServedByService, tableLevels: s.tableLevels,
    };
    const pad = visiblePads(s.questIndex, gate as never)[0];
    const cost = tgt.type === 'pad' && pad ? pad.cost : 0;
    if (tgt.type !== 'pad' || s.wallet.toNumber() >= cost) return { pos: focus, why: 'gorev:' + tgt.type, stand: true };
  }
  if (dirtyN > 0 && (trayN === 0 || waiting.length === 0)) return { pos: dishFront, why: 'bulasik-birak', stand: true };
  const ok = waiting.filter((n: S) => (n.product === 'tost' ? s.trayFood > 0 : s.tray > 0));
  if (trayN > 0 && ok.length) {
    const w = ok.slice().sort((a: S, b: S) => dist(seatOf(a), p) - dist(seatOf(b), p))[0];
    return { pos: LAYOUT.tables[w.tableIndex].table, why: 'servis', stand: false };
  }
  if (s.coins.length) {
    const c = s.coins.slice().sort((a: S, b: S) => dist(a.pos, p) - dist(b.pos, p))[0];
    return { pos: c.pos, why: 'para', stand: false };
  }
  if (waiting.length && trayN === 0) return { pos: pick, why: 'cay-al', stand: true };
  if (s.dishes.length && !s.dishwasher && trayN === 0) {
    const d = s.dishes.slice().sort((a: S, b: S) => dist(a.pos, p) - dist(b.pos, p))[0];
    return { pos: LAYOUT.tables[d.tableIndex].table, why: 'kirli-topla', stand: false };
  }
  if (focus) {
    const pos = tgt.type === 'pickupTea' || tgt.type === 'serveTea' ? pick : tgt.type === 'washDish' ? dishFront : focus;
    return { pos, why: 'gorev-bekle:' + tgt.type, stand: true };
  }
  return { pos: pick, why: 'bos', stand: true };
}

function steer(s: S, goal: V3): [number, number] {
  const dd = Math.hypot(goal[0] - s.player[0], goal[2] - s.player[2]);
  if (dd < 1e-6) return [0, 0];
  if (dd < 2.6) return [(goal[0] - s.player[0]) / dd, (goal[2] - s.player[2]) / dd];
  const grid = getNavGrid(s.tables, s.areasOpen);
  const path =
    findNavPath(grid, s.player, goal[0], goal[2], 0.35) ??
    findNavPath(grid, s.player, goal[0], goal[2], 0.9) ??
    findNavPath(grid, s.player, goal[0], goal[2], 1.25);
  let wp: V3 = goal;
  if (path && path.length) {
    for (const pt of path) {
      wp = [pt[0], 0, pt[1]];
      if (Math.hypot(pt[0] - s.player[0], pt[1] - s.player[2]) > 0.45) break;
    }
  }
  const dx = wp[0] - s.player[0];
  const dz = wp[2] - s.player[2];
  const m = Math.hypot(dx, dz);
  return m < 0.2 ? [0, 0] : [dx / m, dz / m];
}

// ---------------------------------------------------------------------------------------------
//  KOŞU
// ---------------------------------------------------------------------------------------------
interface Alim { t: number; ne: string }
interface Sonuc {
  kol: string; tohum: number;
  alimlar: Alim[];
  ilkAlim: number; garson: number; acilisEnUzun: number; acilisEnUzunNe: string; acilisAlim: number;
  tepsiAcildi: number; tepsiCuzdan: number; tepsiAlindi: number; tepsiOncesiCuzdanMin: number;
  bagis: number; xTetik: number; yol: number; iz: string; sonQ: number;
}

function anlik(s: S) {
  return {
    pad: s.padsDone.length,
    st: s.stationLevels.reduce((a: number, b: number) => a + b, 0),
    ch: s.charUpgrades.tray + s.charUpgrades.magnet + s.charUpgrades.speed,
    w: s.waiterUpgrades.tray + s.waiterUpgrades.speed,
    tl: s.tableLevels.reduce((a: number, b: number) => a + b, 0),
    lv: s.lavaboLevel,
    son: s.padsDone[s.padsDone.length - 1] ?? '',
  };
}

function oyna(kol: Kol, tohum: number): Sonuc {
  TRAY.costs[0] = kol.fiyat;
  xKural = kol.x;
  bagis = 0;
  xTetik = 0;
  seedRandom(tohum);
  useGame.getState().hardReset();
  const iz = izOlustur();
  const alimlar: Alim[] = [];
  let dec: ReturnType<typeof decide> | null = null;
  let decT = -1;
  let enD: number | null = null;
  let enT = 0;
  let enKey = '';
  let yol = 0, still = 0, unstick = 0, side = 1;
  let prev: number[] | null = null;
  let tepsiAcildi = NaN, tepsiCuzdan = NaN, tepsiAlindi = NaN, tepsiOncesiCuzdanMin = Infinity;
  const adim = Math.round(SURE_SN / DT);
  for (let i = 0; i < adim; i++) {
    const t = i * DT;
    let s = useGame.getState() as S;
    if (s.levelUp) s.claimLevelUp();
    if (s.questIndex === Q_TEPSI) {
      if (Number.isNaN(tepsiAcildi)) { tepsiAcildi = t; tepsiCuzdan = s.wallet.toNumber(); }
      tepsiOncesiCuzdanMin = Math.min(tepsiOncesiCuzdanMin, s.wallet.toNumber());
    }
    const a0 = anlik(s);
    if (!dec || t - decT > 0.5) {
      dec = decide(s);
      decT = t;
      s = useGame.getState() as S;
    }
    let d = dist(s.player, dec.pos);
    if (enD == null || d < enD - 0.2 || enKey !== dec.why) {
      enD = d; enT = t; enKey = dec.why;
    } else if (t - enT > 25 && d > 0.6) {
      useGame.setState({ player: [dec.pos[0], 0.6, dec.pos[2]] } as never);
      enD = null;
      s = useGame.getState();
      d = 0;
    }
    let inp: [number, number] = [0, 0];
    if (!(dec.stand && d < (dec.why.startsWith('gorev:') ? 0.5 : 0.1))) inp = steer(s, dec.pos);
    if (unstick > 0) {
      unstick -= DT;
      inp = [-inp[1] * side + inp[0] * 0.3, inp[0] * side + inp[1] * 0.3];
    } else if ((inp[0] || inp[1]) && prev && Math.hypot(s.player[0] - prev[0], s.player[2] - prev[2]) < 0.005) {
      if (++still > 5) {
        unstick = 0.6 + Math.random() * 1.2;
        side = Math.random() < 0.5 ? 1 : -1;
        still = 0;
      }
    } else still = 0;
    if (prev) yol += Math.hypot(s.player[0] - prev[0], s.player[2] - prev[2]);
    prev = [...s.player];
    useGame.setState({ inputKeyboard: inp } as never);
    s.tick(DT);
    const s1 = useGame.getState() as S;
    const a1 = anlik(s1);
    const ne: string[] = [];
    if (a1.pad > a0.pad) ne.push(`pad ${a1.son}`);
    if (a1.st > a0.st) ne.push(`ocak L${a1.st}`);
    if (a1.ch > a0.ch) ne.push(`karakter ${s1.charUpgrades.tray}/${s1.charUpgrades.magnet}/${s1.charUpgrades.speed}`);
    if (a1.w > a0.w) ne.push('garson yük.');
    if (a1.tl > a0.tl) ne.push('masa sv');
    if (a1.lv > a0.lv) ne.push(`lavabo L${a1.lv}`);
    for (const n of ne) alimlar.push({ t: t + DT, ne: n });
    if (Number.isNaN(tepsiAlindi) && s1.charUpgrades.tray >= 1) tepsiAlindi = t + DT;
    if (i % 50 === 0) iz.ekle(s1.wallet.toNumber(), s1.padsDone.length, s1.questIndex, s1.player[0], s1.player[2]);
  }
  const s = useGame.getState() as S;
  const garsonAlim = alimlar.find((a) => a.ne === 'pad waiter');
  const garson = garsonAlim ? garsonAlim.t : NaN;
  const acilis = alimlar.map((a, i) => ({ ...a, gap: a.t - (i === 0 ? 0 : alimlar[i - 1].t) })).filter((a) => Number.isFinite(garson) && a.t <= garson);
  const enUzun = acilis.reduce((a, b) => (b.gap > a.gap ? b : a), { t: 0, ne: '—', gap: -Infinity });
  TRAY.costs[0] = FIYAT0;
  return {
    kol: kol.ad, tohum, alimlar,
    ilkAlim: alimlar[0]?.t ?? NaN, garson, acilisEnUzun: enUzun.gap, acilisEnUzunNe: enUzun.ne, acilisAlim: acilis.length,
    tepsiAcildi, tepsiCuzdan, tepsiAlindi, tepsiOncesiCuzdanMin: Number.isFinite(tepsiOncesiCuzdanMin) ? tepsiOncesiCuzdanMin : NaN,
    bagis, xTetik, yol, iz: iz.deger, sonQ: s.questIndex,
  };
}

// ---------------------------------------------------------------------------------------------
//  RAPOR
// ---------------------------------------------------------------------------------------------
kipBandi();
const t0 = Date.now();
const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const dk = (sn: number) => (Number.isFinite(sn) ? (sn / 60).toFixed(2) : '—');
const ort = (xs: number[]) => { const y = xs.filter(Number.isFinite); return y.length ? y.reduce((a, b) => a + b, 0) / y.length : NaN; };
const enb = (xs: number[]) => { const y = xs.filter(Number.isFinite); return y.length ? Math.max(...y) : NaN; };

console.log('=== S5 G-92 · KAT 1 TEPSİ İLK FİYATI + "YETMİYORSA TAMAMLA" (varyant kapısı · D-084) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · gerçek tick dt ${DT} · ${SURE_SN / 60} dk · tohum ${TOHUMLAR.join(',')} · görev q_charTray1 = hat #${Q_TEPSI} (ödülü ${C.quests[Q_TEPSI].reward})${MUT ? ` · MUTASYON ${MUT}` : ''}`);
console.log('D-079 ölçütü: ilk alım < 90 sn · GARSONA KADAR en uzun boşluk ≤ 2 dk · otomasyon (garson) < 15 dk.');

const sonuc: Sonuc[] = [];
for (const kol of KOLLAR) for (const tohum of TOHUMLAR) sonuc.push(oyna(kol, tohum));

console.log('');
console.log('--- §1 GERÇEK TICK (bot, tohum ortalaması · [en kötü tohum]) ---');
console.log('kol      | ilk alım sn | garsona kadar en uzun boşluk dk | garson dk | tepsi görevi açılınca cüzdan (min..maks) | görev bekleme sn (ort · en uzun) | X tetik / bağış');
for (const kol of KOLLAR) {
  const r = sonuc.filter((x) => x.kol === kol.ad);
  const cuz = r.map((x) => x.tepsiCuzdan);
  const bek = r.map((x) => x.tepsiAlindi - x.tepsiAcildi);
  console.log(`${kol.ad.padEnd(8)} | ${f1(ort(r.map((x) => x.ilkAlim))).padStart(6)} [${f1(enb(r.map((x) => x.ilkAlim)))}] | ${dk(ort(r.map((x) => x.acilisEnUzun))).padStart(6)} [${dk(enb(r.map((x) => x.acilisEnUzun)))}] | ${dk(ort(r.map((x) => x.garson))).padStart(6)} [${dk(enb(r.map((x) => x.garson)))}] | ${f1(Math.min(...cuz))}..${f1(Math.max(...cuz))} (fiyat ${kol.fiyat}) | ${f1(ort(bek))} · ${f1(enb(bek))} | ${r.reduce((a, x) => a + x.xTetik, 0)}/${r.length} · ${f1(r.reduce((a, x) => a + x.bagis, 0) / r.length)}`);
}
console.log('');
console.log('Tohum başına (ilk alım sn · en uzun açılış boşluğu dk → alım · garson dk · tepsi açıldı sn @cüzdan → alındı sn):');
for (const r of sonuc) console.log(`  ${r.kol.padEnd(8)} t${r.tohum} | ${f1(r.ilkAlim)} · ${dk(r.acilisEnUzun)} → ${r.acilisEnUzunNe} · ${dk(r.garson)} · ${f1(r.tepsiAcildi)} @${f1(r.tepsiCuzdan)} → ${f1(r.tepsiAlindi)} · iz ${r.iz}`);
console.log('');
console.log('Alım sırası (tohum 1):');
for (const kol of KOLLAR) {
  const r = sonuc.find((x) => x.kol === kol.ad && x.tohum === TOHUMLAR[0])!;
  console.log(`  ${kol.ad.padEnd(8)} ${r.alimlar.filter((a) => !Number.isFinite(r.garson) || a.t <= r.garson + 1).map((a) => `${a.ne}@${a.t.toFixed(0)}`).join(' · ')}`);
}

// (2) MODEL — simulate.ts idealize; X kuralı = fiyat X × 25 (biriktiren oyuncu).
console.log('');
console.log('--- §2 MODEL (simulate.ts olcutler(), İDEALİZE · D-079 resmî bekçisi; "%X\'te tamamla" = fiyat X × 25) ---');
console.log('kol      | model fiyat | ilk alım sn | açılış alım | garsona kadar en uzun dk | garson dk | ŞERİT (Normal) sa');
const model: Record<string, ReturnType<typeof olcutler>> = {};
for (const kol of KOLLAR) {
  TRAY.costs[0] = kol.x != null && MUT !== 'x0' ? kol.x * kol.fiyat : kol.fiyat;
  milestoneTazele();
  onbellekTemizle?.();
  const o = olcutler();
  model[kol.ad] = o;
  console.log(`${kol.ad.padEnd(8)} | ${String(TRAY.costs[0]).padStart(11)} | ${f1(o.ilkAlim ?? NaN).padStart(11)} | ${String(o.acilisAlim).padStart(11)} | ${dk(o.acilisEnUzun).padStart(24)} | ${dk(o.otomasyon ?? NaN).padStart(9)} | ${(Number(o.serit) / 3600).toFixed(2)}`);
}
TRAY.costs[0] = FIYAT0;
milestoneTazele();

// ---- DAMGALAR
for (const r of sonuc) {
  botDamgasi(`${r.kol} t${r.tohum}`, r.yol, SURE_SN / 60, 30);
  damga(`${r.kol} t${r.tohum}: tepsi görevi açıldı ve tepsi alındı`, Number.isFinite(r.tepsiAcildi) && Number.isFinite(r.tepsiAlindi), `${r.tepsiAcildi} · ${r.tepsiAlindi}`);
  if (!KISA) damga(`${r.kol} t${r.tohum}: garson ufukta tutuldu`, Number.isFinite(r.garson), 'garson yok');
}
const izTaban = sonuc.filter((r) => r.kol === 'TABAN').map((r) => r.iz).join('|');
for (const kol of KOLLAR.slice(1)) varyantDamgasi(kol.ad, izTaban, sonuc.filter((r) => r.kol === kol.ad).map((r) => r.iz).join('|'));
const izF25 = sonuc.filter((r) => r.kol === 'F25').map((r) => r.iz).join('|');
for (const kol of KOLLAR.filter((k) => k.x != null)) {
  const r = sonuc.filter((x) => x.kol === kol.ad);
  const n = r.reduce((a, x) => a + x.xTetik, 0);
  console.log(`(X kuralı ${kol.ad}: ${n}/${r.length} tohumda tetiklendi)`);
  damga(`${kol.ad}: X kuralı her tohumda tetiklendi`, n === r.length, `${n}/${r.length}`);
  varyantDamgasi(`${kol.ad} ↔ F25`, izF25, r.map((x) => x.iz).join('|'));
  damga(`${kol.ad}: bağış ≤ (1 − X) × fiyat`, r.every((x) => x.bagis <= (1 - kol.x!) * kol.fiyat + 1e-9), r.map((x) => x.bagis).join(','));
}
console.log('');
console.log(`(süre: ${((Date.now() - t0) / 1000).toFixed(0)} sn duvar saati)`);
damgaOzeti();
