/**
 * olcum-kat2-kasa.ts — K2-4 ÖLÇÜMÜ: Kat 2'deyken Kat 1'in parası (KASA) + çevrimdışı.
 *
 * Soru: D-174 ② "Kat 2'deyken Kat 1 çalışır, kasada birikir, kasa dolunca durur". Bugün Kat 1'in
 * parası 180 sn sonra kendiliğinden cüzdana akıyor (sınırsız). Kasa sınırı kaç dakikalık gelir olsun,
 * taşan ₺ ne olsun, Kat 2 oyuncu yokken dönsün mü, çevrimdışı Kat 2'yi saysın mı?
 *
 * GERÇEK OYUN: `useGame` store'u, bitmiş Kat 1 (bütün pad'ler) + Kat 2 iki durumda ("başı" = okey1 ·
 * "dolu" = 4 okey + ocak). Bot Kat 2'de T dk oynar (açgözlü: yığın → kahve → ocak), merdivene yürüyüp
 * iner, Kat 1'de 1 dk para toplar, merdivenden çıkar; 60 dk. `tick.ts`/`store.ts` DEĞİŞMEZ:
 * kasa MUHASEBEDİR — Kat 2'deyken Kat 1'de kaybolan (oto-toplanan) her para kasaya yazılır, kasanın
 * kolları aynı koşu üstünde paralel tutulur (kasa simülasyonu etkilemez; dünyayı yalnız
 * "Kat 2 arkada döner" kolu değiştirir, o ayrı koşudur).
 *
 *   OLCUM=kisa npx tsx tools/olcum-kat2-kasa.ts
 *   OLCUM=tam  npx tsx tools/olcum-kat2-kasa.ts > docs/olcum-kat2-kasa.txt
 */
import { KISA, botDamgasi, damga, damgaOzeti, kipBandi, kisaDeger, korunumDamgasi, seedRandom, varyantDamgasi } from './olcum-lib';
import { attractRadiusFor, charMaxTier, economyConfig as C, playerSpeedFor, trayCapacityFor } from '../src/config/economy.config';
import { useGame } from '../src/game/store';
import { AGIZ, OCAK, OKEY_ERISIM, OKEY_YER, VARIS, type KatNo } from '../src/game/kat';
import { kat2Tick, yeniKat2Dunya, type Kat2Ayar } from '../src/game/kat2Dongu';
import { computeOfflineEarned, incomeRate } from '../src/game/rules';
import { collectionMult } from '../src/game/goals';
import { THE_SERVICE } from '../src/game/world';
import { BAND, LAYOUT, entranceAt, getPlayerNavGrid, servicePlace } from '../src/game/layout';
import { findNavPath } from '../src/game/nav';
import { D, type Decimal } from '../src/game/decimal';
import { kasaBosalt, kasaSiniri, kasayaAt } from '../src/game/kasa';
import type { Vec3 } from '../src/game/types';

kipBandi();

const DT = 0.1;
const SURE = kisaDeger(60 * 60, 25 * 60);
const ISINMA = kisaDeger(5 * 60, 3 * 60); // Kat 1 boş dükkândan açılır: müşteri dalgası otursun
const KAT1_KALIS = 60;
const T_LISTE = KISA ? [20] : [5, 10, 20];
const SINIR_DK = [null, 10, 20, 40] as const; // null = sınırsız (bugün)
const AYAR: Kat2Ayar = C.kat2 as unknown as Kat2Ayar;
const KAT2_DURUM: Record<string, string[]> = {
  'Kat 2 başı': ['k2okey1'],
  'Kat 2 dolu': ['k2okey1', 'k2cezve', 'k2okey2', 'k2okey3', 'k2okey4'],
};
const DURUMLAR = KISA ? ['Kat 2 dolu'] : Object.keys(KAT2_DURUM);

const HIZ = playerSpeedFor(charMaxTier('speed'));
const TEPSI = trayCapacityFor(charMaxTier('tray'));
const MIKNATIS = attractRadiusFor(charMaxTier('magnet'));
const g = () => useGame.getState();
const UZAK = { x: 0, z: 400 }; // Kat 2 dönerken oyuncu Kat 1'de: hiçbir şeye yetişmez

/** Kasa yeri adayları (Kat 1, 3 alan açık). */
const sp = servicePlace(3);
const giris = entranceAt(3);
const ADAY: { ad: string; yer: [number, number] }[] = [
  { ad: 'merdivenin dibi (ağzın sağı)', yer: [AGIZ.x + 1.2, BAND.front + 0.6] },
  { ad: 'servis tezgâhının ucu', yer: [sp.pickup[0] + 2.2, sp.pickup[2]] },
  { ad: 'giriş kapısının içi', yer: [giris[0] + 1.6, giris[2] - 1.2] },
];
const KASA_YER = ADAY[0].yer;
const KASA_ERISIM = 1.0; // Kat 1 pad/obje erişimiyle aynı dil (yakına yürü, dur gerekmez)

/** Kat 1'in idealize oranı (₺/sn) — çevrimdışının kullandığı formül (`store.cevrimdisiGelir`). */
function kat1Oran(): number {
  const s = g();
  let tip = 0;
  for (let i = 0; i < s.tables; i++) tip += C.tables.tipBase * (s.tableLevels[i] ?? 0);
  return incomeRate(s.tables, s.stationLevels[THE_SERVICE], tip, s.lavaboLevel, collectionMult(s.goalsClaimed ?? []));
}

/** Kat 2'nin idealize oranı (₺/sn): her istek servis edilirse açık masaların döngü geliri. */
function kat2Oran(pads: readonly string[], a: Kat2Ayar = AYAR): number {
  const masa = OKEY_YER.filter((o) => pads.includes(o.id)).length;
  const istek = pads.includes(OCAK.id) ? Math.floor((a.oturum - a.kahveSabir * 0.5) / a.kahveAralik) : 0;
  return (masa * (a.masaUcreti + istek * a.istekAdet * a.kahveFiyat)) / (a.gelisAralik + a.yurume + a.oturum);
}

/**
 * Kat 2'de merdiven kovası ↔ salon arası yol: kova (z < BAND.front) ortasında kuyu var, tek geçit
 * kuyunun solundaki koridor (varış noktasının x'i). Düz çizgi kuyuya/kova duvarına takılır.
 */
const KX = VARIS[2][0];
const KAPI_Z = BAND.front + 0.8;
const kovada = (z: number) => z < BAND.front;
/** Masaların önü/arkası: önde para yığını ve kahve servisi, arkada ocak ve merdiven kapısı. */
const ON_SERIT = OKEY_YER[0].z + OKEY_ERISIM - 0.1; // masanın önünde, gövdeye değmeden erişim içinde
const ARKA_SERIT = OKEY_YER[0].z - OKEY_ERISIM - 1.6;
const GECITLER = [-10.25, 0, 10.25]; // masa sütunlarının arası (okey x = ±7,5 · ±13)
const onde = (z: number) => z > OKEY_YER[0].z;
function seritte(px: number, pz: number, t: readonly [number, number], serit: number): readonly [number, number] {
  if (Math.abs(px - t[0]) <= 0.3) return t;
  return Math.abs(pz - serit) > 0.3 ? [px, serit] : [t[0], serit];
}
function kat2Yol(px: number, pz: number, t: readonly [number, number]): readonly [number, number] {
  if (kovada(pz) || kovada(t[1])) {
    if (kovada(t[1]) === kovada(pz) && Math.abs(pz - t[1]) < 0.3) return t;
    if (Math.abs(px - KX) > 0.3) return kovada(pz) ? [KX, pz] : kat2Yol(px, pz, [KX, KAPI_Z]);
    if (kovada(t[1])) return [KX, t[1]];
    if (pz < KAPI_Z - 0.3) return [KX, KAPI_Z];
  }
  if (onde(pz) === onde(t[1])) return seritte(px, pz, t, onde(pz) ? ON_SERIT : ARKA_SERIT);
  const gx = GECITLER.reduce((a, b) => (Math.abs(b - (px + t[0]) / 2) < Math.abs(a - (px + t[0]) / 2) ? b : a));
  if (Math.abs(px - gx) > 0.3) return seritte(px, pz, [gx, onde(pz) ? ON_SERIT : ARKA_SERIT], onde(pz) ? ON_SERIT : ARKA_SERIT);
  return [gx, onde(pz) ? ARKA_SERIT : ON_SERIT];
}

function bitmisKat1(pads: string[]): void {
  g().hardReset();
  useGame.setState({ padsDone: C.pads.map((p) => p.id) });
  g().saveNow();
  g().init();
  g().kat2Ac();
  // Kat 1'i bitiren oyuncu karakter yükseltmelerini de bitirmiştir (store tepsi/mıknatıs/hızı buradan okur).
  useGame.setState({ charUpgrades: { ...g().charUpgrades, speed: charMaxTier('speed'), tray: charMaxTier('tray'), magnet: charMaxTier('magnet') } });
  const d = yeniKat2Dunya(pads, AYAR);
  // Gerçekte masalar ayrı anlarda açılır: döngüleri eşit aralıkla kaydır (olcum-kat2-dongu deseni).
  const acik = d.masalar.filter((m) => m.durum === 'bos');
  const dongu = AYAR.gelisAralik + AYAR.yurume + AYAR.oturum;
  acik.forEach((m, i) => { m.t = AYAR.gelisAralik + (i * dongu) / acik.length; });
  useGame.setState({ kat: 2, player: [...VARIS[2]] as Vec3, kat2: { acik: true, padsDone: pads }, kat2Dunya: d });
}

/**
 * KALİBRASYON — oyuncu yokken Kat 1'in GERÇEK ₺/dk'sı (oyuncu Kat 2'de, kıpırdamıyor). Kasa sınırı
 * "Kat 1 gelirinin N dakikası" bu orana bağlanır: kasayı dolduran bu akıştır. (`incomeRate` idealize
 * çevrimdışı oranı bunun ~15 katı çıkıyor — §A başlığı; sınır ona bağlansa kasa hiç dolmazdı.)
 */
function kalibre(): number {
  seedRandom(7);
  bitmisKat1(['k2okey1']);
  const isinma = ISINMA, sure = kisaDeger(15 * 60, 5 * 60);
  let once = new Set<number>();
  let uret = 0;
  for (let t = 0; t < isinma + sure; t += DT) {
    g().tick(DT);
    const cs = g().coins;
    if (t >= isinma) for (const c of cs) if (!once.has(c.id)) uret += c.value;
    once = new Set(cs.map((c) => c.id));
  }
  return (uret / sure) * 60;
}

/** Kasa kolu: sınır × taşma kipi. Muhasebe; koşuya dokunmaz. */
interface KasaKol {
  sinirDk: number | null;
  sinir: Decimal | null;
  kasa: Decimal;
  bosalan: Decimal;
  tasan: Decimal;
  tasanAdet: number;
  tasanAdetTepe: number; // 'yerde' kipinde aynı anda yerde bekleyecek en çok sikke
  inisler: number[]; // iniş başına boşalan ₺
  dolmaSn: number[]; // boşaldıktan sonra dolana kadar geçen sn
  bosaldiT: number;
  dolduMu: boolean;
}

interface Sonuc {
  kat1Uretilen: number;
  kat1Dogrudan: number; // Kat 1'deyken cüzdana (oyuncu + oto-toplama)
  kasaAkis: number; // Kat 2'deyken oto-toplanan (bugün doğrudan cüzdana)
  kat1Yerde: number;
  kat2Net: number;
  kat2Bekleyen: number; // koşu sonunda Kat 2'de yerde bekleyen yığın
  kat2Kacan: number;
  kasaVarisSn: number;
  kat1Sn: number;
  kollar: KasaKol[];
  inisSay: number;
  kat1DkOlculen: number; // oyuncu yokken Kat 1 ₺/dk (Kat 2 süresi içinde üretilen)
  yol2: number;
  yol1: number;
  iz: string;
  korunumSapma: number;
}

function kos(durum: string, T: number, kat2Doner: boolean, seed = 1): Sonuc {
  seedRandom(seed);
  const pads = KAT2_DURUM[durum];
  bitmisKat1(pads);
  const kollar: KasaKol[] = SINIR_DK.map((dk) => ({
    sinirDk: dk,
    sinir: dk === null ? null : kasaSiniri(R1_OLC, dk),
    kasa: D(0), bosalan: D(0), tasan: D(0), tasanAdet: 0, tasanAdetTepe: 0, inisler: [], dolmaSn: [], bosaldiT: 0, dolduMu: false,
  }));

  let faz: 'kat2' | 'inis' | 'kat1' | 'cikis' = 'kat2';
  let fazT = 0;
  let olcT = -ISINMA;
  let yol2 = 0, yol1 = 0;
  let kat1Uretilen = 0, kat1Dogrudan = 0, kasaAkis = 0, kat2Net = 0, kat2Kacan = 0;
  let kat1UretKat2de = 0, kat2deSn = 0;
  let inisSay = 0;
  let iz = 0x811c9dc5;
  let onceCoins = new Map<number, number>();
  let baslangicYerde = 0;
  let kasaGitti = false;
  const kasaVarisSn: number[] = [];
  const kara = new Set<number>();
  let takilId = -1, takilT = 0;
  let takilYer: [number, number] = [0, 0];
  let kat1Sn = 0;

  for (let i = 0; olcT < SURE; i++) {
    const s = g();
    const katOnce: KatNo = s.kat;
    const olc = olcT >= 0;
    if (olc && olcT - DT < 0) {
      // ölçüm başlıyor: yerdeki Kat 1 parası başlangıç stoğu (korunum denklemine girer)
      baslangicYerde = s.coins.reduce((a, c) => a + c.value, 0);
      onceCoins = new Map(s.coins.map((c) => [c.id, c.value]));
    }

    // ---- BOT
    let hedef: readonly [number, number] | null = null;
    let it: readonly [number, number] | null = null;
    const px = s.player[0], pz = s.player[2];
    if (!s.katGecis) {
      if (katOnce === 2) {
        if (faz === 'kat2' && fazT >= T * 60) faz = 'inis';
        if (faz === 'cikis') { faz = 'kat2'; fazT = 0; }
        if (faz === 'inis') {
          const z = AGIZ.sahanlik - LAYOUT.playerRadius - 0.1;
          if (Math.abs(px) < 0.3 && Math.abs(pz - z) < 0.3) it = [0, 1];
          else hedef = kat2Yol(px, pz, [0, z]);
        } else {
          const d = s.kat2Dunya;
          if (d.paralar.length) {
            const p = d.paralar.reduce((a, b) => (Math.hypot(a.x - px, a.z - pz) <= Math.hypot(b.x - px, b.z - pz) ? a : b));
            hedef = kat2Yol(px, pz, [p.x, ON_SERIT]);
          } else {
            const bekleyen = d.masalar.map((m, k) => ({ m, yer: OKEY_YER[k] })).filter(({ m }) => m.durum === 'oyunda' && m.istek > 0);
            if (d.tepsi > 0 && bekleyen.length) {
              const b = bekleyen.reduce((a, c) => (a.m.sabir <= c.m.sabir ? a : c));
              hedef = kat2Yol(px, pz, [b.yer.x, ON_SERIT]);
            } else if (pads.includes(OCAK.id)) hedef = kat2Yol(px, pz, OCAK.al);
            else hedef = kat2Yol(px, pz, [OKEY_YER[0].x, ON_SERIT]); // ocak pad'inin üstünde durma (harcar)
          }
        }
      } else {
        if (faz === 'inis') { faz = 'kat1'; fazT = 0; kasaGitti = false; }
        if (faz === 'kat1' && fazT >= KAT1_KALIS) faz = 'cikis';
        if (faz === 'cikis') {
          const z = BAND.front + 0.25;
          if (Math.abs(px) < 0.3 && Math.abs(pz - z) < 0.3) it = [0, -1];
          else hedef = [0, z];
        } else if (!kasaGitti) {
          // "kasaya yürü" kolu: önce kasaya (aday 1, merdiven dibi), sonra yerdeki paraya
          if (Math.hypot(px - KASA_YER[0], pz - KASA_YER[1]) <= KASA_ERISIM) { kasaGitti = true; kasaVarisSn.push(fazT); }
          else hedef = KASA_YER;
        } else {
          const aday = s.coins.filter((c) => !kara.has(c.id));
          if (aday.length) {
            const c = aday.reduce((a, b) => (Math.hypot(a.pos[0] - px, a.pos[2] - pz) <= Math.hypot(b.pos[0] - px, b.pos[2] - pz) ? a : b));
            hedef = [c.pos[0], c.pos[2]];
            // takılma: 1,5 sn yerinden kıpırdamadıysa bu sikkeyi bırak (Kat 1 mobilyası arkasında)
            if (c.id === takilId) { if (Math.hypot(px - takilYer[0], pz - takilYer[1]) < 0.2) { if (fazT - takilT > 1.5) kara.add(c.id); } else { takilT = fazT; takilYer = [px, pz]; } }
            else { takilId = c.id; takilT = fazT; takilYer = [px, pz]; }
          }
        }
      }
    }
    if (hedef && katOnce === 1) {
      // Kat 1 mobilyalı: oyuncu ızgarasında BFS rotası (`getPlayerNavGrid` — sim botları için)
      const yolu = findNavPath(getPlayerNavGrid(s.tables, s.areasOpen), s.player, hedef[0], hedef[1], 0.2);
      if (yolu && yolu.length) hedef = [yolu[0][0], yolu[0][1]];
    }
    if (hedef) {
      const dx = hedef[0] - px, dz = hedef[1] - pz;
      const L = Math.hypot(dx, dz);
      it = L > 0.15 ? [dx / L, dz / L] : [0, 0];
    }
    g().setKeyboardInput(it ? it[0] : 0, it ? it[1] : 0);

    const w0 = s.wallet;
    g().tick(DT);
    let s2 = g();
    // Kat 2 arkada DÖNER kolu: oyuncu Kat 1'deyken Kat 2'nin dünyası da ilerler (oyuncu uzakta).
    if (kat2Doner && katOnce === 1 && s2.kat === 1) {
      const r = kat2Tick(s2.kat2Dunya, { x: UZAK.x, z: UZAK.z, durdu: true, cuzdan: 0, padsDone: s2.kat2.padsDone, tepsiKap: TEPSI, miknatis: MIKNATIS }, DT, AYAR);
      useGame.setState({ kat2Dunya: r.dunya });
      if (olc) { kat2Kacan += r.olay.kacan; }
      s2 = g();
    }

    const yol = Math.hypot(s2.player[0] - px, s2.player[2] - pz);
    if (katOnce === s2.kat && !s.katGecis) {
      if (katOnce === 2) yol2 += yol; else { yol1 += yol; kat1Sn += DT; }
    }
    if (s2.kat === 1 && katOnce === 2) inisSay += olc ? 1 : 0;

    if (olc) {
      // ---- Kat 1 muhasebesi (sikke kimlikleri)
      const simdi = new Map(s2.coins.map((c) => [c.id, c.value]));
      let yeni = 0, giden = 0, gidenAdet = 0;
      for (const [id, v] of simdi) if (!onceCoins.has(id)) yeni += v;
      for (const [id, v] of onceCoins) if (!simdi.has(id)) { giden += v; gidenAdet++; }
      onceCoins = simdi;
      kat1Uretilen += yeni;
      if (katOnce === 2) { kasaAkis += giden; kat1UretKat2de += yeni; kat2deSn += DT; } else kat1Dogrudan += giden;
      // Kat 2'nin net kazancı = cüzdan farkı − Kat 1'den gelen
      kat2Net += s2.wallet.sub(w0).toNumber() - giden;

      // ---- KASA kolları
      const indi = katOnce === 2 && s2.kat === 1;
      for (const k of kollar) {
        if (katOnce === 2 && giden > 0) {
          const r = kasayaAt(k.kasa, giden, k.sinir);
          k.kasa = r.kasa;
          if (r.tasan.gt(0)) {
            k.tasan = k.tasan.add(r.tasan);
            const adet = Math.round((gidenAdet * r.tasan.toNumber()) / giden);
            k.tasanAdet += adet;
            k.tasanAdetTepe = Math.max(k.tasanAdetTepe, k.tasanAdet);
          }
          if (!k.dolduMu && k.sinir && k.kasa.gte(k.sinir)) { k.dolduMu = true; k.dolmaSn.push(olcT - k.bosaldiT); }
        }
        if (indi) {
          const b = kasaBosalt(k.kasa, D(0));
          k.kasa = b.kasa;
          k.bosalan = k.bosalan.add(b.bosalan);
          k.inisler.push(b.bosalan.toNumber());
          k.bosaldiT = olcT;
          k.dolduMu = false;
          k.tasanAdet = 0; // 'yerde' kipinde oyuncu inince yerdekini toplar
        }
      }
      iz = Math.imul(iz ^ (Math.round(kat2Net) * 31 + Math.round(kasaAkis) * 7 + s2.kat2Dunya.paralar.length), 16777619) >>> 0;
    }
    if (!s2.katGecis) fazT += DT;
    olcT += DT;
  }
  g().setKeyboardInput(0, 0);
  const sSon = g();
  const kat1Yerde = sSon.coins.reduce((a, c) => a + c.value, 0);
  const kat2Bekleyen = sSon.kat2Dunya.paralar.reduce((a, p) => a + p.miktar, 0);
  // korunum: başlangıç yerde + üretilen = cüzdana (Kat 1'deyken) + kasaya akan + yerde
  const sapma = Math.round(baslangicYerde + kat1Uretilen - kat1Dogrudan - kasaAkis - kat1Yerde);
  return {
    kat1Uretilen, kat1Dogrudan, kasaAkis, kat1Yerde, kat2Net, kat2Bekleyen, kat2Kacan, kollar, inisSay,
    kasaVarisSn: kasaVarisSn.length ? kasaVarisSn.reduce((a, b) => a + b, 0) / kasaVarisSn.length : NaN, kat1Sn,
    kat1DkOlculen: kat2deSn > 0 ? (kat1UretKat2de / kat2deSn) * 60 : NaN,
    yol2, yol1, iz: iz.toString(16), korunumSapma: sapma,
  };
}

const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('tr-TR') : '—');
const n = (v: Decimal): number => v.toNumber();
const sinirAd = (dk: number | null) => (dk === null ? 'yok (bugün)' : `${dk} dk`);

// ---------------------------------------------------------------------------
console.log('=== K2-4 — KAT 1 KASASI + ÇEVRİMDIŞI (kollar) ===');
console.log(`Kip: ${KISA ? 'kisa' : 'tam'} · senaryo ${SURE / 60} dk (önce ${ISINMA / 60} dk ısınma, Kat 2'de) · dt ${DT} · Kat 1'de kalış ${KAT1_KALIS} sn`);
console.log(`Bot: son kademe hız ${HIZ} · tepsi ${TEPSI} · mıknatıs ${MIKNATIS} · Kat 1 = bütün pad'ler, yükseltmesiz (tests/kat2-altyapi bitmisKat1)`);
bitmisKat1(KAT2_DURUM['Kat 2 dolu']);
const R1 = kat1Oran();
const R1_OLC = Math.round(kalibre());
console.log(`Kat 1 idealize oran (incomeRate, çevrimdışı formülü): ${(R1 * 60).toFixed(1)} ₺/dk`);
console.log(`Kat 1 GERÇEK oran, oyuncu yokken (kalibrasyon ${kisaDeger(15, 5)} dk, tohum 7): ${R1_OLC} ₺/dk → kasa sınırı 10/20/40 dk = ${SINIR_DK.slice(1).map((d) => f0(R1_OLC * (d as number))).join(' / ')} ₺`);
console.log(`Kat 2 idealize oran: başı ${(kat2Oran(KAT2_DURUM['Kat 2 başı']) * 60).toFixed(1)} ₺/dk · dolu ${(kat2Oran(KAT2_DURUM['Kat 2 dolu']) * 60).toFixed(1)} ₺/dk`);
console.log('');

const sonuclar: { durum: string; T: number; doner: boolean; r: Sonuc }[] = [];
for (const durum of DURUMLAR) {
  for (const T of T_LISTE) {
    for (const doner of [false, true]) {
      const r = kos(durum, T, doner);
      const ad = `${durum} T${T} ${doner ? 'döner' : 'donuk'}`;
      botDamgasi(`${ad} Kat 2`, r.yol2, SURE / 60, 30);
      botDamgasi(`${ad} Kat 1`, r.yol1, r.kat1Sn / 60, 30);
      damga(`iniş oldu (${ad})`, r.inisSay >= Math.floor(SURE / ((T + 1.2) * 60)) - 1, `${r.inisSay} iniş`);
      korunumDamgasi(`Kat 1 ₺ ${ad}`, r.korunumSapma);
      for (const k of r.kollar) {
        const s = Math.round(r.kasaAkis - n(k.bosalan) - n(k.kasa) - n(k.tasan));
        korunumDamgasi(`kasa ${sinirAd(k.sinirDk)} ${ad}`, s); // Kat 2'de oto-toplanan = boşalan + kasada + taşan
      }
      sonuclar.push({ durum, T, doner, r });
    }
  }
}
// varyant etkili: döner ↔ donuk aynı dünyayı mı üretti; kasa sınırı kolları bugünden ayrıştı mı
for (const durum of DURUMLAR)
  for (const T of T_LISTE) {
    const a = sonuclar.find((x) => x.durum === durum && x.T === T && !x.doner)!;
    const b = sonuclar.find((x) => x.durum === durum && x.T === T && x.doner)!;
    varyantDamgasi(`Kat 2 döner ${durum} T${T}`, a.r.iz, b.r.iz);
  }
{
  const enUzun = sonuclar.filter((x) => x.T === Math.max(...T_LISTE));
  const kirpan = enUzun.some((x) => n(x.r.kollar[1].tasan) > 0);
  damga('varyant etkili (kasa 10 dk en uzun T\'de taşırdı)', kirpan, 'hiç taşma yok');
}

console.log(`--- A · ${SURE / 60} dk SENARYO: Kat 2'de T dk → in, Kat 1'de ${KAT1_KALIS} sn → çık ---`);
console.log('kazanç = cüzdana giren + koşu sonunda kasada bekleyen (bir sonraki inişte alınır); kasa kolu bugünden YALNIZ taşan ₺ kadar ayrışır.');
console.log('taşan: "kaybolur" kipinde kayıp ₺ · "yerde" kipinde Kat 1 zemininde bekleyen ₺ (sikke tepe = aynı anda yerde en çok sikke; FPS eşiği m.13: ~115).');
console.log('durum       | T  | Kat 2 arkada | kasa sınırı | toplam ₺/dk | Kat 1 ₺/dk | Kat 2 ₺/dk | taşan ₺ | taşan % (Kat 1 kasa akışı) | iniş başı kasa ₺ | iniş başı Kat 1 ₺ | dolma sn | sikke tepe');
console.log('-'.repeat(175));
const dk = SURE / 60;
for (const { durum, T, doner, r } of sonuclar) {
  for (const k of r.kollar) {
    // sınırsız kol = bugün (kasa yok: Kat 2'deyken oto-toplanan doğrudan cüzdana)
    const kat1 = r.kat1Dogrudan + n(k.bosalan) + n(k.kasa);
    const inisKasa = k.inisler.length ? k.inisler.reduce((a, b) => a + b, 0) / k.inisler.length : NaN;
    const inisKat1 = r.inisSay ? (r.kat1Dogrudan + n(k.bosalan)) / r.inisSay : NaN;
    const dolma = k.dolmaSn.length ? k.dolmaSn.reduce((a, b) => a + b, 0) / k.dolmaSn.length : NaN;
    console.log(
      `${durum.padEnd(11)} | ${String(T).padStart(2)} | ${(doner ? 'döner' : 'donuk').padEnd(12)} | ${sinirAd(k.sinirDk).padEnd(11)} | ${f0((kat1 + r.kat2Net) / dk).padStart(11)} | ${f0(kat1 / dk).padStart(10)} | ${f0(r.kat2Net / dk).padStart(10)} | ${f0(n(k.tasan)).padStart(7)} | ${(r.kasaAkis ? `%${((100 * n(k.tasan)) / r.kasaAkis).toFixed(0)}` : '—').padStart(26)} | ${f0(inisKasa).padStart(16)} | ${f0(inisKat1).padStart(17)} | ${f0(dolma).padStart(8)} | ${String(k.tasanAdetTepe).padStart(10)}`,
    );
  }
  console.log(`            ↳ Kat 1 oyuncu yokken ${f0(r.kat1DkOlculen)} ₺/dk · iniş ${r.inisSay} · Kat 1'de kasaya varış ${r.kasaVarisSn.toFixed(1)} sn (aday 1) · Kat 2 yerde bekleyen (son) ${f0(r.kat2Bekleyen)} ₺ · Kat 2 kaçan kahve (arkada) ${r.kat2Kacan} · yol Kat 2 ${f0(r.yol2)} br / Kat 1 ${f0(r.yol1)} br`);
}

// ---------------------------------------------------------------------------
// B · ÇEVRİMDIŞI (analitik — store'un formülü: oran × rateMult × min(süre, tavan saat), PARA tavanı)
console.log('');
console.log(`--- B · ÇEVRİMDIŞI · rateMult ${C.offline.rateMult} · süre tavanı ${C.offline.baseCapHours} sa · para tavanı = sıradaki pad × ${C.offline.capNextPadFrac} ---`);
const K2PADLER = AYAR.padler;
const kat1Pads = C.pads.map((p) => p.id);
const kat2Durumlari = K2PADLER.map((_, i) => K2PADLER.slice(0, i).map((p) => p.id)).concat([K2PADLER.map((p) => p.id)]);
/** Çevrimdışı tutarla sırayla kaç Kat 2 pad'i alınır (cüzdan 0'dan). */
function aldigiPad(tutar: number, pads: string[]): number {
  let kalan = tutar, say = 0;
  for (const p of K2PADLER) {
    if (pads.includes(p.id)) continue;
    if (kalan < p.cost) break;
    kalan -= p.cost;
    say++;
  }
  return say;
}
const k2Tavan = (pads: string[]) => {
  const next = K2PADLER.find((p) => !pads.includes(p.id));
  return Math.floor((next ? next.cost : Math.max(...K2PADLER.map((p) => p.cost))) * C.offline.capNextPadFrac);
};
const capSn = C.offline.baseCapHours * 3600;
const ham = (oran: number, sn: number) => Math.floor(oran * C.offline.rateMult * Math.min(sn, capSn));
type OffKol = { ad: string; f: (pads: string[], sn: number) => number };
const OFF_KOLLAR: OffKol[] = [
  { ad: 'bugün: yalnız Kat 1, Kat 1 tavanı', f: (_p, sn) => computeOfflineEarned(R1, sn, kat1Pads) },
  { ad: 'Kat 2 payı + TEK tavan Kat 1 (en pahalı Kat 1 pad)', f: (p, sn) => Math.min(ham(R1, sn) + ham(kat2Oran(p), sn), computeOfflineEarned(1e12, sn, kat1Pads)) },
  { ad: 'Kat 2 payı + TEK tavan Kat 2 (sıradaki Kat 2 pad)', f: (p, sn) => Math.min(ham(R1, sn) + ham(kat2Oran(p), sn), k2Tavan(p)) },
  { ad: 'yalnız Kat 1, tavan Kat 2 (sıradaki Kat 2 pad)', f: (p, sn) => Math.min(ham(R1, sn), k2Tavan(p)) },
  ...[10, 20, 40].map((dk) => ({ ad: `Kat 1 → kasaya (${dk} dk) · Kat 2 yok`, f: (_p: string[], sn: number) => Math.min(ham(R1, sn), R1_OLC * dk) })),
  ...[10, 20, 40].map((dk) => ({ ad: `Kat 1 → kasaya (${dk} dk) + Kat 2 payı, tavan Kat 2`, f: (p: string[], sn: number) => Math.min(ham(R1, sn), R1_OLC * dk) + Math.min(ham(kat2Oran(p), sn), k2Tavan(p)) })),
];
console.log('kol                                                    | Kat 2 durumu (açık pad)             | 1 sa ₺ | 4 sa ₺ | 8 sa ₺ | 1/4/8 sa alınan Kat 2 pad | ihlal (≥ 2 pad)');
console.log('-'.repeat(160));
const offIzler: string[] = [];
for (const kol of OFF_KOLLAR) {
  let ihlal = 0;
  let izS = '';
  for (const pads of kat2Durumlari) {
    const t = [1, 4, 8].map((h) => kol.f(pads, h * 3600));
    const al = t.map((v) => aldigiPad(v, pads));
    const bitmedi = pads.length < K2PADLER.length;
    const ih = bitmedi ? al.filter((a) => a >= 2).length : 0;
    ihlal += ih;
    izS += t.join(',') + ';';
    console.log(`${kol.ad.padEnd(54)} | ${(pads.length ? pads.join('+') : '(hiç)').padEnd(35)} | ${f0(t[0]).padStart(6)} | ${f0(t[1]).padStart(6)} | ${f0(t[2]).padStart(6)} | ${al.join(' / ').padStart(25)} | ${bitmedi ? ih : '— (bitti)'}`);
  }
  offIzler.push(izS);
  console.log(`  ↳ ${kol.ad}: ihlal ${ihlal} / ${3 * (kat2Durumlari.length - 1)}`);
}
varyantDamgasi('çevrimdışı Kat 2 payı (tavan Kat 2)', offIzler[0], offIzler[2]);
console.log(`not: kol 2 ${offIzler[0] === offIzler[1] ? 'BİREBİR kol 1 (bugün)' : 'bugünden farklı'} — Kat 1'in tavanı (en pahalı Kat 1 pad × ${C.offline.capNextPadFrac}) Kat 2 payını yutuyor.`);

// ---------------------------------------------------------------------------
// C · KASANIN YERİ (aday — yalnız ölçü; Kat 1 varış noktası merdivenin önü)
console.log('');
console.log('--- C · KASA YERİ ADAYLARI (Kat 1, 3 alan açık) · yürüme = varıştan gidiş-dönüş düz çizgi, son kademe hız ---');
const v1 = VARIS[1];
for (const a of ADAY) {
  const d = Math.hypot(a.yer[0] - v1[0], a.yer[1] - v1[2]);
  console.log(`${a.ad.padEnd(30)} | (${a.yer[0].toFixed(1)}, ${a.yer[1].toFixed(1)}) | varıştan ${d.toFixed(1)} br | gidiş-dönüş ${((2 * d) / HIZ).toFixed(1)} sn`);
}
console.log(`(varış ${v1[0]}, ${v1[2].toFixed(1)} · servis alma ${sp.pickup[0].toFixed(1)}, ${sp.pickup[2].toFixed(1)} · giriş ${giris[0]}, ${giris[2]})`);

damgaOzeti();
